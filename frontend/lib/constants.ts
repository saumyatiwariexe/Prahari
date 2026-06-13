export const ZONE_META: Record<string, { label: string; shortLabel: string }> = {
  CONC:   { label: "Main Concourse",     shortLabel: "Concourse" },
  GATE_A: { label: "Gate A",             shortLabel: "Gate A" },
  GATE_B: { label: "Gate B",             shortLabel: "Gate B" },
  GATE_C: { label: "Gate C",             shortLabel: "Gate C" },
  FOB1:   { label: "Foot Over Bridge 1", shortLabel: "FOB 1" },
  FOB2:   { label: "Foot Over Bridge 2", shortLabel: "FOB 2" },
  P1:     { label: "Platform 1",         shortLabel: "Platform 1" },
  P2:     { label: "Platform 2",         shortLabel: "Platform 2" },
  P3:     { label: "Platform 3",         shortLabel: "Platform 3" },
  P4:     { label: "Platform 4",         shortLabel: "Platform 4" },
  P5:     { label: "Platform 5",         shortLabel: "Platform 5" },
  P6:     { label: "Platform 6",         shortLabel: "Platform 6" },
};

export const COLOR_MAP: Record<string, string> = {
  green:    "rgba(34,197,94,0.15)",
  amber:    "rgba(245,158,11,0.20)",
  red:      "rgba(239,68,68,0.25)",
  critical: "rgba(220,38,38,0.40)",
};

export const BORDER_MAP: Record<string, string> = {
  green:    "#22C55E",
  amber:    "#F59E0B",
  red:      "#EF4444",
  critical: "#DC2626",
};

export const TEXT_MAP: Record<string, string> = {
  green:    "text-green-400",
  amber:    "text-amber-400",
  red:      "text-red-400",
  critical: "text-red-500",
};

export const LEVEL_COLORS: Record<number, string> = {
  1: "#22C55E",
  2: "#F59E0B",
  3: "#EF4444",
};

export const WS_URL  = process.env.NEXT_PUBLIC_WS_URL  ?? "ws://localhost:8000/ws/live";
export const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";
