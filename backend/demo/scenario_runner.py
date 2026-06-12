"""
Pre-scripted "FOB-3 Event" demo scenario.
Generates realistic zone density sequences for CrowdGuard and Human-Operated timelines.
Run with a video file for real YOLOv8 inference, or use scenario mode for guaranteed demo stability.
Prahari — Autonomous Station Safety System.
"""
import math
import time
from constants import ZONES, density_color

# Keyframes: {time_seconds: {zone_id: density_persons_per_m2}}
# Inspired by the New Delhi Feb 2025 crowd surge pattern.
_KF_CROWDGUARD = {
    0:   {"CONC": 2.0, "GATE_A": 1.2, "GATE_B": 2.5, "GATE_C": 1.0,
          "FOB1": 2.2, "FOB2": 1.5,
          "P1": 1.5, "P2": 1.8, "P3": 1.6, "P4": 1.4, "P5": 1.3, "P6": 1.0},

    30:  {"CONC": 2.8, "GATE_A": 1.5, "GATE_B": 4.0, "GATE_C": 1.2,
          "FOB1": 3.5, "FOB2": 1.8,
          "P1": 1.5, "P2": 2.5, "P3": 3.8, "P4": 2.2, "P5": 1.5, "P6": 1.0},

    60:  {"CONC": 3.5, "GATE_A": 1.8, "GATE_B": 4.8, "GATE_C": 1.5,
          "FOB1": 5.2, "FOB2": 2.2,
          "P1": 1.5, "P2": 3.0, "P3": 4.8, "P4": 3.0, "P5": 1.8, "P6": 1.0},

    # t=90 — L1 fires (CrowdGuard intervenes)
    90:  {"CONC": 3.8, "GATE_A": 2.0, "GATE_B": 5.0, "GATE_C": 1.8,
          "FOB1": 5.8, "FOB2": 2.5,
          "P1": 1.5, "P2": 3.2, "P3": 5.2, "P4": 3.5, "P5": 2.0, "P6": 1.0},

    # Post-L1: PA redirects crowd — density falls
    120: {"CONC": 3.2, "GATE_A": 2.5, "GATE_B": 3.8, "GATE_C": 2.5,
          "FOB1": 4.2, "FOB2": 3.0,
          "P1": 1.8, "P2": 2.8, "P3": 3.8, "P4": 2.8, "P5": 2.2, "P6": 1.2},

    150: {"CONC": 2.5, "GATE_A": 2.0, "GATE_B": 2.8, "GATE_C": 2.0,
          "FOB1": 3.0, "FOB2": 2.5,
          "P1": 1.8, "P2": 2.2, "P3": 2.8, "P4": 2.2, "P5": 2.0, "P6": 1.5},

    210: {"CONC": 2.0, "GATE_A": 1.5, "GATE_B": 2.0, "GATE_C": 1.5,
          "FOB1": 2.0, "FOB2": 2.0,
          "P1": 1.5, "P2": 1.8, "P3": 2.0, "P4": 1.8, "P5": 1.8, "P6": 1.5},
}

# Human-operated: no intervention until t=252 (too late — crush at t=188)
_KF_HUMAN = {
    0:   _KF_CROWDGUARD[0].copy(),
    30:  _KF_CROWDGUARD[30].copy(),
    60:  _KF_CROWDGUARD[60].copy(),
    90:  _KF_CROWDGUARD[90].copy(),

    120: {"CONC": 4.5, "GATE_A": 2.0, "GATE_B": 6.0, "GATE_C": 1.8,
          "FOB1": 7.0, "FOB2": 2.8,
          "P1": 1.5, "P2": 3.8, "P3": 6.5, "P4": 4.2, "P5": 2.2, "P6": 1.0},

    # CRUSH at t=188
    188: {"CONC": 5.5, "GATE_A": 2.5, "GATE_B": 7.0, "GATE_C": 2.0,
          "FOB1": 9.5, "FOB2": 3.0,
          "P1": 1.5, "P2": 4.5, "P3": 8.0, "P4": 5.0, "P5": 2.5, "P6": 1.0},

    # Human finally reacts at t=252 — too late
    252: {"CONC": 5.0, "GATE_A": 2.0, "GATE_B": 6.0, "GATE_C": 2.0,
          "FOB1": 8.5, "FOB2": 3.0,
          "P1": 1.5, "P2": 4.0, "P3": 7.0, "P4": 4.5, "P5": 2.5, "P6": 1.0},

    300: {"CONC": 4.0, "GATE_A": 1.8, "GATE_B": 4.5, "GATE_C": 1.8,
          "FOB1": 6.0, "FOB2": 2.5,
          "P1": 1.5, "P2": 3.0, "P3": 5.5, "P4": 3.5, "P5": 2.0, "P6": 1.0},
}

CRUSH_TIME_HUMAN = 188      # seconds — when crush occurs in human-operated timeline
HUMAN_RESPONSE_TIME = 252   # seconds — when human finally intervenes
L1_FIRE_TIME = 90           # seconds — when CrowdGuard L1 fires
SCENARIO_DURATION = 300     # seconds


def _interpolate(kf: dict, t: float) -> dict[str, float]:
    """Linear interpolation between keyframes."""
    times = sorted(kf.keys())
    if t <= times[0]:
        return kf[times[0]].copy()
    if t >= times[-1]:
        return kf[times[-1]].copy()

    for i in range(len(times) - 1):
        t0, t1 = times[i], times[i + 1]
        if t0 <= t <= t1:
            alpha = (t - t0) / (t1 - t0)
            result = {}
            for zone in kf[t0]:
                v0 = kf[t0][zone]
                v1 = kf[t1][zone]
                # Smooth with ease-in-out
                smooth = alpha * alpha * (3 - 2 * alpha)
                result[zone] = round(v0 + (v1 - v0) * smooth, 2)
            return result
    return kf[times[-1]].copy()


def get_frame(elapsed: float, mode: str = "crowdguard") -> dict:
    """
    Returns zone state dict at a given elapsed time (seconds).
    mode: 'crowdguard' | 'human'
    """
    kf = _KF_CROWDGUARD if mode == "crowdguard" else _KF_HUMAN
    densities = _interpolate(kf, elapsed)

    zones = {}
    for zone_id, density in densities.items():
        zones[zone_id] = {
            "density": density,
            "count": int(density * ZONES[zone_id]["area_m2"]),
            "color": density_color(density),
            "name": ZONES[zone_id]["name"],
            "flow_vector": _flow_for(zone_id, density, elapsed),
        }
    return zones


def _flow_for(zone_id: str, density: float, t: float) -> dict:
    """Approximate flow vector based on scenario phase."""
    # Surge phase: crowd moving toward FOB1
    if 30 < t < 90 and zone_id in ("P3", "P4", "GATE_B"):
        return {"dx": 0.0, "dy": -0.8, "magnitude": 0.8}
    if 30 < t < 90 and zone_id in ("FOB1",):
        return {"dx": 0.0, "dy": -0.6, "magnitude": min(density / 6.0, 1.0)}
    # Post-intervention: crowd dispersing
    if t > 90 and zone_id in ("FOB1", "P3"):
        return {"dx": 0.3, "dy": 0.5, "magnitude": 0.4}
    return {"dx": 0.0, "dy": 0.0, "magnitude": 0.0}


class ScenarioRunner:
    def __init__(self, speed: float = 1.0):
        self._start: float | None = None
        self._speed = speed

    def elapsed(self) -> float:
        if self._start is None:
            self._start = time.time()
        return (time.time() - self._start) * self._speed

    def reset(self):
        self._start = None

    def is_crush_time(self) -> bool:
        return self.elapsed() >= CRUSH_TIME_HUMAN

    def is_complete(self) -> bool:
        return self.elapsed() >= SCENARIO_DURATION
