"""
Graded autonomous intervention decision engine.
L1 fires immediately. L2 has a cancel window. L3 requires explicit confirm.
Gate closure (L3) NEVER auto-fires.
"""
import time
from constants import L1_TRIGGER_DENSITY, L2_TRIGGER_DENSITY, L3_TRIGGER_DENSITY, L2_COUNTDOWN_SECONDS
from decision.interventions import Intervention, Level, L1_ACTIONS, L2_ACTIONS, L3_ACTIONS


class DecisionEngine:
    def __init__(self):
        self._fired: set[str] = set()        # zone+level keys already actioned
        self._staged: dict[str, dict] = {}   # L2/L3 interventions pending

    def evaluate(self, zone_states: dict, predictions: dict) -> list[Intervention]:
        """
        Evaluate current + predicted zone states.
        Returns list of new interventions to broadcast.
        """
        new_interventions: list[Intervention] = []
        t_start = time.perf_counter()

        for zone_id, state in zone_states.items():
            density = state["density"]
            pred_90 = predictions.get(zone_id, {}).get("t90", {}).get("density", 0.0)
            key_l1 = f"{zone_id}_L1"
            key_l2 = f"{zone_id}_L2"
            key_l3 = f"{zone_id}_L3"

            # L1: fire autonomously, once per zone session
            if density >= L1_TRIGGER_DENSITY and key_l1 not in self._fired:
                if zone_id in L1_ACTIONS:
                    action_label, action_msg = L1_ACTIONS[zone_id]
                    iv = Intervention(
                        zone=zone_id,
                        level=Level.L1,
                        trigger=f"Density {density:.1f}/m² crossed L1 threshold",
                        action=f"{action_label}: \"{action_msg}\"",
                        status="fired",
                        response_time_ms=(time.perf_counter() - t_start) * 1000,
                    )
                    self._fired.add(key_l1)
                    new_interventions.append(iv)

            # L2: stage when density crosses L2 threshold
            if density >= L2_TRIGGER_DENSITY and key_l2 not in self._fired and key_l2 not in self._staged:
                if zone_id in L2_ACTIONS:
                    iv = Intervention(
                        zone=zone_id,
                        level=Level.L2,
                        trigger=f"Density {density:.1f}/m² — L2 threshold crossed",
                        action=L2_ACTIONS[zone_id],
                        status="staged",
                        countdown_remaining=L2_COUNTDOWN_SECONDS,
                    )
                    self._staged[key_l2] = {"iv": iv, "staged_at": time.time()}
                    new_interventions.append(iv)

            # L3: stage when predicted density in 90s is lethal
            if pred_90 >= L3_TRIGGER_DENSITY and key_l3 not in self._fired and key_l3 not in self._staged:
                if zone_id in L3_ACTIONS:
                    iv = Intervention(
                        zone=zone_id,
                        level=Level.L3,
                        trigger=f"Predicted density {pred_90:.1f}/m² in 90s — critical forecast",
                        action=L3_ACTIONS[zone_id],
                        status="pending_confirm",
                    )
                    self._staged[key_l3] = {"iv": iv, "staged_at": time.time()}
                    new_interventions.append(iv)

        # Auto-execute L2 after countdown
        now = time.time()
        for key, entry in list(self._staged.items()):
            if "_L2" in key:
                elapsed = now - entry["staged_at"]
                remaining = max(0, L2_COUNTDOWN_SECONDS - int(elapsed))
                entry["iv"].countdown_remaining = remaining
                if elapsed >= L2_COUNTDOWN_SECONDS:
                    entry["iv"].status = "confirmed"
                    self._fired.add(key)
                    del self._staged[key]

        return new_interventions

    def confirm(self, intervention_id: str):
        for key, entry in list(self._staged.items()):
            if entry["iv"].id == intervention_id:
                entry["iv"].status = "confirmed"
                self._fired.add(key)
                del self._staged[key]
                return True
        return False

    def cancel(self, intervention_id: str):
        for key, entry in list(self._staged.items()):
            if entry["iv"].id == intervention_id:
                entry["iv"].status = "cancelled"
                self._fired.add(key)
                del self._staged[key]
                return True
        return False

    def get_staged(self) -> list[Intervention]:
        return [entry["iv"] for entry in self._staged.values()]

    def reset(self):
        self._fired.clear()
        self._staged.clear()
