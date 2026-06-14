DENSITY_SAFE = 3.0
DENSITY_WARNING = 5.0
DENSITY_CRITICAL = 6.0
DENSITY_LETHAL = 8.0

L1_TRIGGER_DENSITY       = 5.0
L2_TRIGGER_DENSITY       = 6.0
L3_TRIGGER_DENSITY       = 7.5   # predicted 90s ahead
PRE_WARN_DENSITY         = 7.0   # standby alert to authorities
FAILSAFE_DENSITY         = 8.0   # full emergency dispatch (SOS)

L2_COUNTDOWN_SECONDS = 10
PREDICTION_HORIZON_SECONDS = 90
PREDICTION_INTERVALS = [30, 60, 90]
WEBSOCKET_INTERVAL_MS = 200
SCENARIO_TICK_MS = 500

ZONES = {
    # New Delhi Railway Station (NDLS) — Feb 15 2025 incident layout
    "CONC":   {"name": "Main Concourse (NDLS)",         "area_m2": 1200},
    "GATE_A": {"name": "Ajmeri Gate Entry",              "area_m2": 60},
    "GATE_B": {"name": "Paharganj Gate Entry",           "area_m2": 60},
    "GATE_C": {"name": "FOB-1 Exit Corridor",            "area_m2": 60},
    "FOB1":   {"name": "FOB-3 Stairway (Pf 14/15)",     "area_m2": 80},   # ← CRUSH LOCATION
    "FOB2":   {"name": "FOB-2 Stairway (Pf 12/13)",     "area_m2": 80},
    "P1":     {"name": "Platform 12 — Prayagraj Spl",   "area_m2": 500},  # original platform, crowd fled from here
    "P2":     {"name": "Platform 13 — Swatantrata Exp", "area_m2": 500},  # delayed
    "P3":     {"name": "Platform 14 — Prayagraj Exp",   "area_m2": 500},  # fed FOB-3 crush
    "P4":     {"name": "Platform 15 — Rajdhani",        "area_m2": 500},  # delayed, blocked passage
    "P5":     {"name": "Platform 16 — Prayagraj Spl",   "area_m2": 500},  # last-minute move destination
    "P6":     {"name": "Platform 11",                   "area_m2": 500},
}

def density_color(density: float) -> str:
    if density < DENSITY_SAFE:
        return "green"
    if density < DENSITY_WARNING:
        return "amber"
    if density < DENSITY_CRITICAL:
        return "red"
    return "critical"
