"use client";
import { LineChart, Line, ResponsiveContainer, Tooltip } from "recharts";
import type { ZoneState } from "@/lib/types";
import { BORDER_MAP, ZONE_META } from "@/lib/constants";
import { useEffect, useRef } from "react";

interface ZoneSparkProps {
  zoneId: string;
  history: number[];
  color: string;
}

function ZoneSparkline({ zoneId, history, color }: ZoneSparkProps) {
  const data = history.map((d, i) => ({ t: i, v: d }));
  return (
    <div className="flex items-center gap-2 px-2 py-1 rounded border border-border bg-surface">
      <span className="text-xs text-slate-400 font-mono w-10 shrink-0">
        {ZONE_META[zoneId]?.shortLabel ?? zoneId}
      </span>
      <span className="text-xs font-mono font-semibold w-12" style={{ color: BORDER_MAP[color] }}>
        {(history[history.length - 1] ?? 0).toFixed(1)}/m²
      </span>
      <div className="flex-1 h-6">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data}>
            <Line type="monotone" dataKey="v" stroke={BORDER_MAP[color]}
              dot={false} strokeWidth={1.5} isAnimationActive={false} />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

interface Props {
  zones: Record<string, ZoneState>;
  historyMap: Record<string, number[]>;
}

const PRIORITY_ZONES = ["FOB1", "FOB2", "P3", "P4", "CONC", "GATE_B"];

export default function ZoneChart({ zones, historyMap }: Props) {
  return (
    <div className="space-y-1">
      {PRIORITY_ZONES.map((zoneId) => {
        const state = zones[zoneId];
        const hist = historyMap[zoneId] ?? [];
        if (!state) return null;
        return (
          <ZoneSparkline key={zoneId} zoneId={zoneId}
            history={hist} color={state.color} />
        );
      })}
    </div>
  );
}
