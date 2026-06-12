"""
Rule-based crowd flow predictor.
Extrapolates per-zone density 30 / 60 / 90 seconds ahead using recent trend + convergence detection.
"""
from constants import PREDICTION_INTERVALS, density_color, ZONES

CONVERGENT_PAIRS = [
    ("P3", "FOB1"),
    ("P4", "FOB1"),
    ("P2", "FOB2"),
    ("P5", "FOB2"),
    ("FOB1", "CONC"),
    ("FOB2", "CONC"),
]


class Extrapolator:
    def predict(self, zone_states: dict, density_histories: dict[str, list[float]]) -> dict:
        predictions: dict[str, dict] = {}
        rates = self._compute_rates(density_histories)

        for zone_id in ZONES:
            current = zone_states.get(zone_id, {}).get("density", 0.0)
            rate = rates.get(zone_id, 0.0)
            convergence_boost = self._convergence_boost(zone_id, rates)

            zone_pred: dict[str, dict] = {}
            for t in PREDICTION_INTERVALS:
                predicted = max(0.0, current + rate * t + convergence_boost * (t / 90))
                zone_pred[f"t{t}"] = {
                    "density": round(predicted, 2),
                    "color": density_color(predicted),
                }
            predictions[zone_id] = zone_pred

        return predictions

    def _compute_rates(self, histories: dict[str, list[float]]) -> dict[str, float]:
        rates = {}
        for zone_id, hist in histories.items():
            if len(hist) < 4:
                rates[zone_id] = 0.0
                continue
            recent = sum(hist[-3:]) / 3
            older = sum(hist[:3]) / 3
            # rate per second — history window is ~15 ticks at 0.5s = 7.5s
            rates[zone_id] = (recent - older) / 7.5
        return rates

    def _convergence_boost(self, zone_id: str, rates: dict[str, float]) -> float:
        """Extra density boost when upstream zones are feeding into this zone."""
        boost = 0.0
        for src, dst in CONVERGENT_PAIRS:
            if dst == zone_id and rates.get(src, 0.0) > 0.1:
                boost += rates[src] * 0.5
        return boost
