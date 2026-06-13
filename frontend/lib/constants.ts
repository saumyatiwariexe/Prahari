// New Delhi Railway Station (NDLS) — Feb 15 2025 incident zones
export const ZONE_META: Record<string, { label: string; shortLabel: string }> = {
  CONC:   { label: "Main Concourse (NDLS)",       shortLabel: "Concourse" },
  GATE_A: { label: "Ajmeri Gate Entry",            shortLabel: "Ajmeri Gt" },
  GATE_B: { label: "Paharganj Gate Entry",         shortLabel: "Paharganj" },
  GATE_C: { label: "FOB-1 Exit Corridor",          shortLabel: "FOB-1 Exit" },
  FOB1:   { label: "FOB-3 Stairway (Pf 14/15) ⚠", shortLabel: "FOB-3 ⚠" },   // CRUSH LOCATION
  FOB2:   { label: "FOB-2 Stairway (Pf 12/13)",   shortLabel: "FOB-2" },
  P1:     { label: "Platform 12 — Prayagraj Spl",  shortLabel: "Pf 12" },
  P2:     { label: "Platform 13 — Swatantrata Exp",shortLabel: "Pf 13" },
  P3:     { label: "Platform 14 — Prayagraj Exp",  shortLabel: "Pf 14" },
  P4:     { label: "Platform 15 — Rajdhani",       shortLabel: "Pf 15" },
  P5:     { label: "Platform 16 — Prayagraj Spl",  shortLabel: "Pf 16" },
  P6:     { label: "Platform 11",                  shortLabel: "Pf 11" },
};

export const COLOR_MAP: Record<string, string> = {
  green:    "rgba(0,200,76,0.08)",
  amber:    "rgba(232,160,0,0.12)",
  red:      "rgba(232,32,32,0.18)",
  critical: "rgba(232,32,32,0.35)",
};

export const BORDER_MAP: Record<string, string> = {
  green:    "#00C84C",
  amber:    "#E8A000",
  red:      "#E82020",
  critical: "#FF2020",
};

export const TEXT_MAP: Record<string, string> = {
  green:    "text-green-400",
  amber:    "text-amber-400",
  red:      "text-red-400",
  critical: "text-red-500",
};

export const LEVEL_COLORS: Record<number, string> = {
  1: "#00C84C",
  2: "#E8A000",
  3: "#E82020",
};

export const WS_URL  = process.env.NEXT_PUBLIC_WS_URL  ?? "ws://localhost:8000/ws/live";
export const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";
