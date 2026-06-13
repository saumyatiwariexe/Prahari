"use client";
import type { ZoneState } from "@/lib/types";
import { BORDER_MAP, ZONE_META } from "@/lib/constants";

interface Props {
  zones: Record<string, ZoneState>;
  historyMap: Record<string, number[]>;
}

const TRACKED = ["CONC", "FOB1", "FOB2", "P1", "P2", "P3", "P4"];
const STATUS_LABEL: Record<string, string> = {
  green: "CLR", amber: "CAU", red: "DGR", critical: "CRT",
};

export default function ZoneChart({ zones, historyMap }: Props) {
  return (
    <div>
      {/* Column header */}
      <div style={{
        display: "flex", alignItems: "center",
        padding: "3px 10px",
        fontFamily: "'Share Tech Mono', monospace",
        fontSize: 9, color: "#2C4060", letterSpacing: "0.1em",
        borderBottom: "1px solid #0A1525",
      }}>
        <span style={{ width: 56 }}>ZONE</span>
        <span style={{ width: 72, textAlign: "right" }}>DENSITY</span>
        <span style={{ width: 38, textAlign: "right" }}>PRS</span>
        <span style={{ flex: 1, textAlign: "center" }}>TREND</span>
        <span style={{ width: 28, textAlign: "right" }}>STS</span>
      </div>

      {TRACKED.map(zid => {
        const state = zones[zid];
        if (!state) return null;
        return (
          <ZoneRow
            key={zid}
            label={ZONE_META[zid]?.shortLabel ?? zid}
            state={state}
            history={historyMap[zid] ?? []}
          />
        );
      })}
    </div>
  );
}

function ZoneRow({ label, state, history }: { label: string; state: ZoneState; history: number[] }) {
  const color  = BORDER_MAP[state.color];
  const status = STATUS_LABEL[state.color] ?? "---";
  const isCrit = state.color === "critical";

  const W = 76, H = 14;
  const max = Math.max(...history, 1);
  const pts = history.slice(-20).map((v, i, arr) => {
    const x = (i / Math.max(arr.length - 1, 1)) * W;
    const y = H - (v / max) * H;
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  }).join(" ");

  return (
    <div style={{
      display: "flex", alignItems: "center",
      padding: "4px 10px",
      borderBottom: "1px solid #0A1525",
      background: isCrit ? "rgba(232,32,32,0.07)" : "transparent",
      fontFamily: "'Share Tech Mono', monospace",
      fontSize: 11,
    }}>
      <span style={{ color, width: 56, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
        {label}
      </span>
      <span style={{ color, width: 72, textAlign: "right", fontWeight: "bold" }}>
        {state.density.toFixed(2)}/m²
      </span>
      <span style={{ color: "#4A6A84", width: 38, textAlign: "right" }}>
        {state.count}
      </span>
      <div style={{ flex: 1, display: "flex", justifyContent: "center" }}>
        {history.length >= 2 ? (
          <svg width={W} height={H} style={{ overflow: "visible" }}>
            <polyline points={pts} fill="none" stroke={color} strokeWidth={1.2} opacity={0.75} />
            {history.length > 0 && (
              <circle cx={W} cy={H - (history[history.length - 1] / max) * H} r={1.5} fill={color} />
            )}
          </svg>
        ) : (
          <span style={{ color: "#2C4060" }}>——</span>
        )}
      </div>
      <span style={{ color, width: 28, textAlign: "right", letterSpacing: "0.05em" }}>
        {status}
      </span>
    </div>
  );
}
