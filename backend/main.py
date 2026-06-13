"""
Prahari — FastAPI backend

Two operating modes:
  scenario  — scripted keyframe demo (default); runs the CrowdGuard vs. Human comparison
  video     — real YOLOv8 inference on uploaded footage; decision engine fires on live density

WebSocket /ws/live  → 200ms broadcast of zone states, predictions, interventions
REST       /demo/*  → start / reset scenario
REST       /live/*  → start / stop real-video mode
REST       /intervention/* → confirm / cancel staged interventions
"""

import asyncio
import time
from contextlib import asynccontextmanager
from pathlib import Path
from typing import Literal

from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from constants import WEBSOCKET_INTERVAL_MS, ZONES
from decision.engine import DecisionEngine
from prediction.extrapolator import Extrapolator
from vision.video_pipeline import VideoPipeline
from demo.scenario_runner import ScenarioRunner, get_frame, L1_FIRE_TIME, CRUSH_TIME_HUMAN, HUMAN_RESPONSE_TIME

# ── Video file paths ─────────────────────────────────────────────────────────
_VIDEO_DIR = Path(__file__).parent.parent / "data" / "videos"
_VIDEO_MAP = {
    "platform": str(_VIDEO_DIR / "stock-footage-busy-and-crowded-platform-at-dadar-railway-station-in-mumbai-india-mar.webm"),
    "aerial":   str(_VIDEO_DIR / "stock-footage-india-sep-aerial-view-of-crowded-railway-station-with-arriving-train.webm"),
}

# ── Global state ─────────────────────────────────────────────────────────────
mode: Literal["scenario", "video"] = "scenario"
pipeline: VideoPipeline | None = None

engine_cg    = DecisionEngine()
engine_human = DecisionEngine()
extrapolator = Extrapolator()
scenario     = ScenarioRunner(speed=2.0)

all_interventions: list[dict] = []
connections:       list[WebSocket] = []

# Rolling density history for the extrapolator (30 frames ≈ 6 seconds at 5fps)
_MAX_HIST = 30
_density_hist: dict[str, list[float]] = {z: [] for z in ZONES}



def _update_hist(zone_states: dict):
    for zid, state in zone_states.items():
        buf = _density_hist.get(zid, [])
        buf.append(state["density"])
        _density_hist[zid] = buf[-_MAX_HIST:]


def _sync_log_statuses(engine):
    """Propagate auto-confirmed L2 statuses back into the all_interventions log dicts."""
    staged_ids = {entry["iv"].id for entry in engine._staged.values()}
    for iv_dict in all_interventions:
        if iv_dict["status"] == "staged" and iv_dict["id"] not in staged_ids:
            iv_dict["status"] = "confirmed"


# ── App setup ────────────────────────────────────────────────────────────────
@asynccontextmanager
async def lifespan(app: FastAPI):
    asyncio.create_task(broadcast_loop())
    yield

app = FastAPI(lifespan=lifespan)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# Serve uploaded video files for the browser video player
if _VIDEO_DIR.exists():
    app.mount("/videos", StaticFiles(directory=str(_VIDEO_DIR)), name="videos")


# ── WebSocket ────────────────────────────────────────────────────────────────
@app.websocket("/ws/live")
async def websocket_live(ws: WebSocket):
    await ws.accept()
    connections.append(ws)
    try:
        while True:
            await asyncio.sleep(1)
    except WebSocketDisconnect:
        if ws in connections:
            connections.remove(ws)


# ── Scenario (demo comparison) endpoints ─────────────────────────────────────
@app.post("/demo/start")
async def demo_start(speed: float = 2.0):
    global mode, pipeline
    if pipeline:
        pipeline.stop()
        pipeline = None
    mode = "scenario"
    scenario._speed = speed
    scenario.reset()
    engine_cg.reset()
    engine_human.reset()
    all_interventions.clear()
    for buf in _density_hist.values():
        buf.clear()
    return {"status": "started", "mode": "scenario", "speed": speed}


@app.post("/demo/reset")
async def demo_reset():
    global mode
    mode = "scenario"
    scenario.reset()
    engine_cg.reset()
    engine_human.reset()
    all_interventions.clear()
    for buf in _density_hist.values():
        buf.clear()
    return {"status": "reset"}


# ── Live video endpoints ──────────────────────────────────────────────────────
@app.post("/live/start")
async def live_start(source: str = "platform"):
    """Switch to real-video mode. source: 'platform' or 'aerial'."""
    global mode, pipeline

    video_path = _VIDEO_MAP.get(source)
    if not video_path or not Path(video_path).exists():
        return {"status": "error", "detail": f"Video not found: {source}. Available: {list(_VIDEO_MAP.keys())}"}

    if pipeline:
        pipeline.stop()

    engine_cg.reset()
    engine_human.reset()
    all_interventions.clear()
    for buf in _density_hist.values():
        buf.clear()

    pipeline = VideoPipeline(video_path)  # fps_target auto: 5 (CUDA) or 2 (CPU SAHI)
    pipeline.start()
    mode = "video"
    return {"status": "started", "mode": "video", "source": source}


@app.post("/live/stop")
async def live_stop():
    global mode, pipeline
    if pipeline:
        pipeline.stop()
        pipeline = None
    mode = "scenario"
    return {"status": "stopped"}


@app.get("/live/sources")
async def live_sources():
    return {name: Path(p).exists() for name, p in _VIDEO_MAP.items()}


# ── Intervention endpoints ────────────────────────────────────────────────────
@app.post("/intervention/{iv_id}/confirm")
async def confirm(iv_id: str):
    ok = engine_cg.confirm(iv_id) or engine_human.confirm(iv_id)
    if ok:
        for iv_dict in all_interventions:
            if iv_dict["id"] == iv_id:
                iv_dict["status"] = "confirmed"
                break
    return {"status": "confirmed" if ok else "not_found"}


@app.post("/intervention/{iv_id}/cancel")
async def cancel(iv_id: str):
    ok = engine_cg.cancel(iv_id) or engine_human.cancel(iv_id)
    if ok:
        for iv_dict in all_interventions:
            if iv_dict["id"] == iv_id:
                iv_dict["status"] = "cancelled"
                break
    return {"status": "cancelled" if ok else "not_found"}


# ── Broadcast loop ────────────────────────────────────────────────────────────
async def broadcast_loop():
    while True:
        await asyncio.sleep(WEBSOCKET_INTERVAL_MS / 1000)

        if mode == "video" and pipeline is not None:
            # Real video: get latest YOLOv8 zone states (always the most recent frame)
            zone_cg = pipeline.get_states()
            if zone_cg is None:
                continue  # pipeline not warmed up yet (model still loading)

            zone_human = zone_cg   # no scripted human-side in live mode
            elapsed = pipeline.elapsed()

            _update_hist(zone_cg)
            predictions = extrapolator.predict(zone_cg, _density_hist)

            new_cg = engine_cg.evaluate(zone_cg, predictions)
            for iv in new_cg:
                all_interventions.insert(0, {**iv.to_dict(), "side": "crowdguard"})
            _sync_log_statuses(engine_cg)

            payload = {
                "elapsed": round(elapsed, 1),
                "crowdguard": {
                    "zones": zone_cg,
                    "predictions": predictions,
                    "l1_fired": any(iv["level"] == 1 for iv in all_interventions),
                },
                "human": {
                    "zones": zone_cg,
                    "crush_occurred": False,
                    "human_responded": False,
                },
                "interventions": all_interventions[:40],
                "staged": [iv.to_dict() for iv in engine_cg.get_staged()],
                "system_status": _system_status(zone_cg),
            }

        else:
            # Scenario mode (scripted demo comparison)
            elapsed = scenario.elapsed()
            zone_cg    = get_frame(elapsed, mode="crowdguard")
            zone_human = get_frame(elapsed, mode="human")

            _update_hist(zone_cg)
            predictions = extrapolator.predict(zone_cg, _density_hist)

            new_cg    = engine_cg.evaluate(zone_cg, predictions)
            new_human = engine_human.evaluate(zone_human, {}) if elapsed >= HUMAN_RESPONSE_TIME else []

            for iv in new_cg:
                all_interventions.insert(0, {**iv.to_dict(), "side": "crowdguard"})
            for iv in new_human:
                all_interventions.insert(0, {**iv.to_dict(), "side": "human"})
            _sync_log_statuses(engine_cg)

            payload = {
                "elapsed": round(elapsed, 1),
                "crowdguard": {
                    "zones": zone_cg,
                    "predictions": predictions,
                    "l1_fired": elapsed >= L1_FIRE_TIME,
                },
                "human": {
                    "zones": zone_human,
                    "crush_occurred": elapsed >= CRUSH_TIME_HUMAN,
                    "human_responded": elapsed >= HUMAN_RESPONSE_TIME,
                },
                "interventions": all_interventions[:40],
                "staged": [iv.to_dict() for iv in engine_cg.get_staged()],
                "system_status": _system_status(zone_cg),
            }

        dead = []
        for ws in connections:
            try:
                await ws.send_json(payload)
            except Exception:
                dead.append(ws)
        for ws in dead:
            if ws in connections:
                connections.remove(ws)


def _system_status(zones: dict) -> str:
    if not zones:
        return "normal"
    max_d = max(z["density"] for z in zones.values())
    if max_d >= 6.0:
        return "critical"
    if max_d >= 5.0:
        return "active"
    if max_d >= 3.0:
        return "monitoring"
    return "normal"
