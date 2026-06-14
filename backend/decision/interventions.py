"""
Intervention definitions for L1 / L2 / L3 response levels.
"""
from dataclasses import dataclass, field
from enum import IntEnum
import time
import uuid


class Level(IntEnum):
    L1       = 1
    L2       = 2
    L3       = 3
    PRE_WARN = 4   # standby alert — authorities placed on standby
    SOS      = 5   # full emergency dispatch — all services activated


@dataclass
class Intervention:
    zone: str
    level: Level
    trigger: str
    action: str
    id: str = field(default_factory=lambda: str(uuid.uuid4())[:8])
    timestamp: str = field(default_factory=lambda: _now())
    status: str = "fired"
    response_time_ms: float = 0.0
    countdown_remaining: int | None = None

    def to_dict(self) -> dict:
        return {
            "id": self.id,
            "zone": self.zone,
            "level": int(self.level),
            "trigger": self.trigger,
            "action": self.action,
            "timestamp": self.timestamp,
            "status": self.status,
            "response_time_ms": round(self.response_time_ms, 1),
            "countdown_remaining": self.countdown_remaining,
        }


def _now() -> str:
    import datetime
    return datetime.datetime.now().strftime("%H:%M:%S")


L1_ACTIONS = {
    "FOB1": ("PA-01 Issued",
             "Foot Over Bridge 1 is experiencing heavy congestion. "
             "Passengers please use Foot Over Bridge 2 as alternate route."),
    "FOB2": ("PA-02 Issued",
             "Please proceed via Gate A for Platform access. "
             "Foot Over Bridge 2 operating at reduced capacity."),
    "P3":   ("ESC-1 Direction",
             "Escalator 1 set to EXIT ONLY — crowd flow management active."),
    "P4":   ("ESC-2 Direction",
             "Escalator 2 set to EXIT ONLY — crowd flow management active."),
    "CONC": ("PA-03 Issued",
             "Main Concourse is crowded. Passengers please spread to all available gates."),
    "GATE_B": ("GATE_B Flow",
               "Gate B temporarily operating at 50% throughput to regulate concourse density."),
}

L2_ACTIONS = {
    "FOB1": "Gate B throughput reduction to 50%. Auto-executing in 10 seconds.",
    "FOB2": "Gate A throughput reduction to 50%. Auto-executing in 10 seconds.",
    "CONC": "RPF deployment to Main Concourse requested. Auto-notifying in 10 seconds.",
}

L3_ACTIONS = {
    "FOB1": "Platform 3 & 4 closure recommended. Requires confirmation.",
    "CONC": "Station entry suspension recommended. Requires confirmation.",
}

PRE_WARN_ACTIONS = {
    "FOB1": (
        "STANDBY ALERT",
        "Density critical at FOB-3 stairway. RPF, Police, Fire Brigade & Ambulance "
        "placed on standby. Prepare emergency response teams."
    ),
    "CONC": (
        "STANDBY ALERT",
        "Density critical at Main Concourse. RPF, Police, Fire Brigade & Ambulance "
        "placed on standby. Prepare emergency response teams."
    ),
}

SOS_ACTIONS = {
    "FOB1": (
        "EMERGENCY DISPATCH",
        "CRUSH IMMINENT — FOB-3 Stairway (Pf 14/15). "
        "RPF deployed. Police 100 called. Fire Brigade 101 dispatched. Ambulance 108 requested."
    ),
    "CONC": (
        "EMERGENCY DISPATCH",
        "CRUSH IMMINENT — Main Concourse (NDLS). "
        "RPF deployed. Police 100 called. Fire Brigade 101 dispatched. Ambulance 108 requested."
    ),
}
