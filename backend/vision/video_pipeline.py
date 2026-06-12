"""
Real-video pipeline: continuous YOLOv8 inference in a background thread.
Results are put into a thread-safe queue consumed by the broadcast loop.
"""

import threading
import queue
import time
import cv2
import numpy as np
from ultralytics import YOLO
from constants import density_color

# ── Zone layout for 640×480 video frame ───────────────────────────────────────
# Each zone covers a pixel rectangle and carries a realistic m² estimate.
# The frame is divided so detections map naturally to station layout zones.
#
#  y=0   ┌──────────────────────────────────────────┐
#        │  CONC (top strip — concourse/entry area)  │
#  y=120 ├──────────────────┬───────────────────────┤
#        │ FOB1 (left FOB)  │  FOB2 (right FOB)     │
#  y=210 ├──────────────────┴───────────────────────┤
#        │  P1 (near/foreground platform section)    │
#  y=300 ├───────────────────────────────────────────┤
#        │  P2 (mid platform section)                │
#  y=390 ├───────────────────────────────────────────┤
#        │  P3 (far/background platform section)     │
#  y=480 └───────────────────────────────────────────┘

DENSITY_MULTIPLIER = 1.0  # raw count / zone area — no artificial inflation

_ACTIVE_ZONES = [
    {"id": "CONC", "x1": 0,   "y1": 0,   "x2": 640, "y2": 120, "area_m2": 60.0},
    {"id": "FOB1", "x1": 0,   "y1": 120, "x2": 320, "y2": 210, "area_m2": 15.0},
    {"id": "FOB2", "x1": 320, "y1": 120, "x2": 640, "y2": 210, "area_m2": 15.0},
    {"id": "P1",   "x1": 0,   "y1": 210, "x2": 640, "y2": 300, "area_m2": 40.0},
    {"id": "P2",   "x1": 0,   "y1": 300, "x2": 640, "y2": 390, "area_m2": 40.0},
    {"id": "P3",   "x1": 0,   "y1": 390, "x2": 640, "y2": 480, "area_m2": 40.0},
]

# Zones not directly visible in video — carry background safe values
_PASSIVE_ZONES = ["GATE_A", "GATE_B", "GATE_C", "P4", "P5", "P6"]

_ZONE_NAMES = {
    "CONC":   "Main Concourse",
    "FOB1":   "Foot Over Bridge 1",
    "FOB2":   "Foot Over Bridge 2",
    "GATE_A": "Gate A", "GATE_B": "Gate B", "GATE_C": "Gate C",
    **{f"P{i}": f"Platform {i}" for i in range(1, 7)},
}


def _make_state(zone_id: str, density: float, count: int) -> dict:
    return {
        "density": round(density, 2),
        "count": count,
        "color": density_color(density),
        "name": _ZONE_NAMES.get(zone_id, zone_id),
        "flow_vector": {"dx": 0.0, "dy": 0.0, "magnitude": 0.0},
    }


class VideoPipeline:
    """
    Runs YOLOv8n person detection on a looping video file in a daemon thread.
    Call get_states() from the async broadcast loop to get the latest frame result.
    """

    def __init__(self, video_path: str, fps_target: int = 5):
        self.video_path = video_path
        self._fps_target = fps_target
        self._queue: queue.Queue[dict] = queue.Queue(maxsize=3)
        self._running = False
        self._model: YOLO | None = None
        self._ema: dict[str, float] = {}
        self._thread: threading.Thread | None = None
        self._elapsed = 0.0
        self._start_time = 0.0

    def start(self):
        self._running = True
        self._start_time = time.monotonic()
        self._thread = threading.Thread(target=self._run, daemon=True)
        self._thread.start()

    def stop(self):
        self._running = False

    def elapsed(self) -> float:
        return time.monotonic() - self._start_time

    def get_states(self) -> dict | None:
        """Non-blocking: return latest zone states or None if no new frame."""
        try:
            return self._queue.get_nowait()
        except queue.Empty:
            return None

    def _run(self):
        self._model = YOLO("yolov8n.pt")

        cap = cv2.VideoCapture(self.video_path)
        if not cap.isOpened():
            return

        source_fps = cap.get(cv2.CAP_PROP_FPS) or 25.0
        skip = max(1, int(source_fps / self._fps_target))
        frame_idx = 0
        interval = 1.0 / self._fps_target

        while self._running:
            t0 = time.monotonic()
            ret, frame = cap.read()
            if not ret:
                cap.set(cv2.CAP_PROP_POS_FRAMES, 0)
                frame_idx = 0
                continue

            if frame_idx % skip == 0:
                frame = cv2.resize(frame, (640, 480))
                states = self._infer(frame)
                try:
                    self._queue.put_nowait(states)
                except queue.Full:
                    pass  # consumer is lagging — drop frame

            frame_idx += 1
            drift = time.monotonic() - t0
            time.sleep(max(0.0, interval - drift))

        cap.release()

    def _infer(self, frame: np.ndarray) -> dict:
        results = self._model.track(frame, persist=True, classes=[0], verbose=False, conf=0.15, max_det=500)

        counts: dict[str, int] = {z["id"]: 0 for z in _ACTIVE_ZONES}
        if results and results[0].boxes is not None:
            boxes = results[0].boxes.xywh.cpu().numpy()
            for box in boxes:
                cx, cy = float(box[0]), float(box[1])
                for z in _ACTIVE_ZONES:
                    if z["x1"] <= cx < z["x2"] and z["y1"] <= cy < z["y2"]:
                        counts[z["id"]] += 1
                        break

        states = {}
        EMA_ALPHA = 0.35

        for z in _ACTIVE_ZONES:
            zid = z["id"]
            raw = counts[zid] * DENSITY_MULTIPLIER / z["area_m2"]
            prev = self._ema.get(zid, raw)
            smooth = EMA_ALPHA * raw + (1 - EMA_ALPHA) * prev
            self._ema[zid] = smooth
            states[zid] = _make_state(zid, smooth, counts[zid])

        # Passive zones: slight background noise
        for zid in _PASSIVE_ZONES:
            prev = self._ema.get(zid, 0.4)
            states[zid] = _make_state(zid, prev, 0)

        return states
