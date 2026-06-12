"""
Computes per-zone density (persons/m²) and flow vectors from raw person counts.
"""
from collections import deque
from constants import ZONES, density_color

HISTORY_LEN = 15


class ZoneTracker:
    def __init__(self):
        self._history: dict[str, deque[float]] = {
            z: deque(maxlen=HISTORY_LEN) for z in ZONES
        }

    def update(self, counts: dict[str, int]) -> dict:
        """
        Accepts raw person counts per zone.
        Returns zone state dict ready for broadcast.
        """
        zone_states = {}

        for zone_id, count in counts.items():
            area = ZONES[zone_id]["area_m2"]
            density = count / area
            self._history[zone_id].append(density)

            flow = self._flow_vector(zone_id)
            zone_states[zone_id] = {
                "density": round(density, 2),
                "count": count,
                "color": density_color(density),
                "name": ZONES[zone_id]["name"],
                "flow_vector": flow,
            }

        return zone_states

    def _flow_vector(self, zone_id: str) -> dict:
        hist = list(self._history[zone_id])
        if len(hist) < 3:
            return {"dx": 0.0, "dy": 0.0, "magnitude": 0.0}

        recent = sum(hist[-3:]) / 3
        older = sum(hist[:3]) / 3
        delta = recent - older
        magnitude = min(abs(delta) / 2.0, 1.0)

        # dy encodes increasing (crowd moving in) vs decreasing (crowd dispersing)
        dy = 1.0 if delta > 0 else -1.0
        return {"dx": 0.0, "dy": round(dy * magnitude, 3), "magnitude": round(magnitude, 3)}

    def density_history(self, zone_id: str) -> list[float]:
        return list(self._history[zone_id])
