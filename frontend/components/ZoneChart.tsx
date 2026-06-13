"use client";
import type { ZoneState } from "@/lib/types";
import { BORDER_MAP, ZONE_META } from "@/lib/constants";

interface Props {
  zones: Record<string, ZoneState>;
  historyMap: Record<string, number[]>;
}

const TRACKED = ["CONC", "FOB1", "FOB2", "P1", "P2", "P3", "P4"];
const STATUS_LABEL: Record<string, string> = {
  green: "OK", amber: "WARN", red: "HIGH", critical: "CRIT",
};

export default function ZoneChart({ zones, historyMap }: Props) {
  return (
    <div style={{ padding: "6px 0" }}>
      {TRACKED.map(zoneId => {
        const state = zones[zoneId];
        if (!state) return null;
        return (
          <ZoneRow
            key={zoneId}
            id={zoneId}
            state={state}
            history={historyMap[zoneId] ?? []}
          />
        );
      })}
    </div>
  );
}

function ZoneRow({ id, state, history }: { id: string; state: ZoneState; history: number[] }) {
  const color  = BORDER_MAP[state.color];
  const label  = ZONE_META[id]?.shortLabel ?? id;
  const status = STATUS_LABEL[state.color] ?? "---";
  const isCrit = state.color === "critical";

  const W = 72, H = 18;
  const max = Math.max(...history, 1);
  const pts = history.slice(-20).map((v, i, arr) => {
    const x = (i / Math.max(arr.length - 1, 1)) * W;
    const y = H - (v / max) * H;
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  }).join(" ");

  return (
    <div style={{
      display: "flex", alignItems: "center",
      padding: "5px 12px",
      borderBottom: "1px solid #21262D",
      background: isCrit ? "rgba(220,38,38,0.08)" : "transparent",
      gap: 10,
    }}>
      {/* Zone label */}
      <span style={{
        fontSize: 12, fontWeight: 600, color,
        width: 72, flexShrink: 0,
        overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
      }}>
        {label}
      </span>

      {/* Density */}
      <span style={{
        fontSize: 13, fontWeight: 700, color,
        width: 72, flexShrink: 0, textAlign: "right",
        fontFamily: "JetBrains Mono, monospace",
      }}>
        {state.density.toFixed(2)}
      </span>

      {/* Count */}
      <span style={{
        fontSize: 12, color: "#64748B",
        width: 40, flexShrink: 0, textAlign: "right",
      }}>
        {state.count}
      </span>

      {/* Sparkline */}
      <div style={{ flex: 1, display: "flex", alignItems: "center" }}>
        {history.length >= 2 ? (
          <svg width={W} height={H} style={{ overflow: "visible", display: "block" }}>
            <polyline
              points={pts}
              fill="none"
              stroke={color}
              strokeWidth={1.5}
              opacity={0.7}
            />
            {history.length > 0 && (
              <circle
                cx={W}
                cy={H - (history[history.length - 1] / max) * H}
                r={2}
                fill={color}
              />
            )}
          </svg>
        ) : (
          <div style={{ fontSize: 11, color: "#334155" }}>—</div>
        )}
      </div>

      {/* Status badge */}
      <span style={{
        fontSize: 11, fontWeight: 700, color,
        width: 32, flexShrink: 0, textAlign: "right",
        letterSpacing: "0.04em",
      }}>
        {status}
      </span>
    </div>
  );
}
