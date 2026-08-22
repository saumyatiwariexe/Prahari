"""
Graded intervention decision engine.
L1 (PA/signage — zero physical force) fires immediately, framed as a duty officer's
existing authority executed faster than manual relay. L2 (escalator/gate — mechanical
actions) and L3 (platform closure) always require an explicit operator confirm; neither
ever auto-fires.
"""
import time
from constants import (
    L1_TRIGGER_DENSITY, L2_TRIGGER_DENSITY, L3_TRIGGER_DENSITY,
    PRE_WARN_DENSITY, FAILSAFE_DENSITY, L2_COUNTDOWN_SECONDS,
)
from decision.interventions import (
    Intervention, Level,
    L1_ACTIONS, L2_ACTIONS, L3_ACTIONS,
    PRE_WARN_ACTIONS, SOS_ACTIONS,
)


class DecisionEngine:
    def __init__(self, max_level: int = 5):
        self._max_level = max_level             # cap — levels above this are skipped
        self._fired: set[str] = set()           # zone+level keys already actioned
        self._staged: dict[str, dict] = {}      # L2/L3 interventions pending
        self._pre_warn_zones: set[str] = set()  # zones where PRE_WARN already fired

    def set_max_level(self, max_level: int) -> None:
        self._max_level = max_level

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
            key_l1       = f"{zone_id}_L1"
            key_l2       = f"{zone_id}_L2"
            key_l3       = f"{zone_id}_L3"
            key_pre_warn = f"{zone_id}_PRE_WARN"
            key_sos      = f"{zone_id}_SOS"

            # L1: fires immediately, once per zone session — informational only
            if (self._max_level >= 1
                    and density >= L1_TRIGGER_DENSITY
                    and key_l1 not in self._fired):
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
            if (self._max_level >= 2
                    and density >= L2_TRIGGER_DENSITY
                    and key_l2 not in self._fired
                    and key_l2 not in self._staged):
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
            if (self._max_level >= 3
                    and pred_90 >= L3_TRIGGER_DENSITY
                    and key_l3 not in self._fired
                    and key_l3 not in self._staged):
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

            # PRE_WARN: auto-fire standby alert when density hits pre-warn threshold
            if (self._max_level >= 4
                    and density >= PRE_WARN_DENSITY
                    and key_pre_warn not in self._fired):
                if zone_id in PRE_WARN_ACTIONS:
                    label, msg = PRE_WARN_ACTIONS[zone_id]
                    iv = Intervention(
                        zone=zone_id,
                        level=Level.PRE_WARN,
                        trigger=f"Density {density:.1f}/m² — pre-warn threshold crossed",
                        action=f"{label}: {msg}",
                        status="fired",
                        response_time_ms=(time.perf_counter() - t_start) * 1000,
                    )
                    self._fired.add(key_pre_warn)
                    self._pre_warn_zones.add(zone_id)
                    new_interventions.append(iv)

            # SOS: auto-fire full emergency dispatch only AFTER pre-warn has already fired for this zone
            if (self._max_level >= 5
                    and density >= FAILSAFE_DENSITY
                    and zone_id in self._pre_warn_zones
                    and key_sos not in self._fired):
                if zone_id in SOS_ACTIONS:
                    label, msg = SOS_ACTIONS[zone_id]
                    iv = Intervention(
                        zone=zone_id,
                        level=Level.SOS,
                        trigger=f"Density {density:.1f}/m² — LETHAL threshold. Emergency dispatch.",
                        action=f"{label}: {msg}",
                        status="fired",
                        response_time_ms=(time.perf_counter() - t_start) * 1000,
                    )
                    self._fired.add(key_sos)
                    new_interventions.append(iv)

        # L2 items never auto-execute — countdown_remaining counts elapsed time pending
        # (capped) purely as an urgency indicator for the operator. Only confirm()/cancel()
        # resolve a staged L2 item.
        now = time.time()
        for key, entry in list(self._staged.items()):
            if "_L2" in key:
                elapsed = now - entry["staged_at"]
                entry["iv"].countdown_remaining = min(L2_COUNTDOWN_SECONDS, int(elapsed))

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
        self._pre_warn_zones.clear()
