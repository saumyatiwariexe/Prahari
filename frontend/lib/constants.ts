// New Delhi Railway Station (NDLS) — Feb 15 2025 incident zones
export const ZONE_META: Record<string, { label: string; shortLabel: string }> = {
  CONC:   { label: "Main Concourse (NDLS)",       shortLabel: "Concourse" },
  GATE_A: { label: "Ajmeri Gate Entry",            shortLabel: "Ajmeri Gt" },
  GATE_B: { label: "Paharganj Gate Entry",         shortLabel: "Paharganj" },
  GATE_C: { label: "FOB-1 Exit Corridor",          shortLabel: "FOB-1 Exit" },
  FOB1:   { label: "FOB-3 Stairway (Pf 14/15)",   shortLabel: "FOB-3" },   // CRUSH LOCATION — Feb 15 2025
  FOB2:   { label: "FOB-2 Stairway (Pf 12/13)",   shortLabel: "FOB-2" },
  P1:     { label: "Platform 12 — Prayagraj Spl",  shortLabel: "Pf 12" },
  P2:     { label: "Platform 13 — Swatantrata Exp",shortLabel: "Pf 13" },
  P3:     { label: "Platform 14 — Prayagraj Exp",  shortLabel: "Pf 14" },
  P4:     { label: "Platform 15 — Rajdhani",       shortLabel: "Pf 15" },
  P5:     { label: "Platform 16 — Prayagraj Spl",  shortLabel: "Pf 16" },
  P6:     { label: "Platform 11",                  shortLabel: "Pf 11" },
};

export const COLOR_MAP: Record<string, string> = {
  green:    "rgba(41,255,140,0.08)",
  amber:    "rgba(255,176,32,0.12)",
  red:      "rgba(255,59,59,0.18)",
  critical: "rgba(255,26,26,0.32)",
};

export const BORDER_MAP: Record<string, string> = {
  green:    "#29FF8C",
  amber:    "#FFB020",
  red:      "#FF3B3B",
  critical: "#FF1A1A",
};

export const TEXT_MAP: Record<string, string> = {
  green:    "text-green-400",
  amber:    "text-amber-400",
  red:      "text-red-400",
  critical: "text-red-500",
};

export const LEVEL_COLORS: Record<number, string> = {
  1: "#29FF8C",
  2: "#FFB020",
  3: "#FF3B3B",
  4: "#FF7A1A",  // PRE_WARN — deep orange
  5: "#FF1A1A",  // SOS — full emergency red
};

// Density thresholds that gate each escalation level (README "Density Thresholds Reference").
// Doubles as the approach-scope's range-ring scale — closer to center = more severe.
export const DENSITY_THRESHOLDS = [
  { value: 5.0, level: "L1",  label: "L1 · AUTO" },
  { value: 6.0, level: "L2",  label: "L2 · STAGED" },
  { value: 7.0, level: "PRE", label: "PRE-WARN" },
  { value: 7.5, level: "L3",  label: "L3 · CONFIRM" },
  { value: 8.0, level: "SOS", label: "SOS" },
] as const;

export const WS_URL  = process.env.NEXT_PUBLIC_WS_URL  ?? "ws://localhost:8000/ws/live";
export const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";
