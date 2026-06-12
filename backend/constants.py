DENSITY_SAFE = 3.0
DENSITY_WARNING = 5.0
DENSITY_CRITICAL = 6.0
DENSITY_LETHAL = 8.0

L1_TRIGGER_DENSITY = 5.0
L2_TRIGGER_DENSITY = 6.0
L3_TRIGGER_DENSITY = 7.5

L2_COUNTDOWN_SECONDS = 10
PREDICTION_HORIZON_SECONDS = 90
PREDICTION_INTERVALS = [30, 60, 90]
WEBSOCKET_INTERVAL_MS = 200
SCENARIO_TICK_MS = 500

ZONES = {
    "CONC":   {"name": "Main Concourse",     "area_m2": 1200},
    "GATE_A": {"name": "Gate A",             "area_m2": 60},
    "GATE_B": {"name": "Gate B",             "area_m2": 60},
    "GATE_C": {"name": "Gate C",             "area_m2": 60},
    "FOB1":   {"name": "Foot Over Bridge 1", "area_m2": 80},
    "FOB2":   {"name": "Foot Over Bridge 2", "area_m2": 80},
    "P1":     {"name": "Platform 1",         "area_m2": 500},
    "P2":     {"name": "Platform 2",         "area_m2": 500},
    "P3":     {"name": "Platform 3",         "area_m2": 500},
    "P4":     {"name": "Platform 4",         "area_m2": 500},
    "P5":     {"name": "Platform 5",         "area_m2": 500},
    "P6":     {"name": "Platform 6",         "area_m2": 500},
}

def density_color(density: float) -> str:
    if density < DENSITY_SAFE:
        return "green"
    if density < DENSITY_WARNING:
        return "amber"
    if density < DENSITY_CRITICAL:
        return "red"
    return "critical"
