"use client";
import { motion } from "framer-motion";
import type { ZoneState, ZonePrediction } from "@/lib/types";
import { BORDER_MAP, COLOR_MAP, ZONE_META } from "@/lib/constants";
import type { GateState } from "./GateStatusOverlay";

interface Props {
  zones: Record<string, ZoneState>;
  predictions?: Record<string, ZonePrediction>;
  showPredictions?: boolean;
  compact?: boolean;
  gateStates?: Record<string, GateState>;
  esc1Reversed?: boolean;
  esc2Reversed?: boolean;
}

const PLATFORMS = ["P1", "P2", "P3", "P4", "P5", "P6"];

export default function StationMap({ zones, predictions, showPredictions, compact, gateStates = {}, esc1Reversed, esc2Reversed }: Props) {
  const platforms = compact ? PLATFORMS.slice(0, 5) : PLATFORMS;

  return (
    // Natural height — parent container handles scroll
    <div style={{ display: "flex", flexDirection: "column", gap: 6, width: "100%" }}>

      {/* ── CONCOURSE ── always full width */}
      <ZoneCard
        id="CONC"
        state={zones["CONC"]}
        pred={showPredictions ? predictions?.["CONC"] : undefined}
        small={compact}
      />

      {/* ── Full layout: Gates row + FOB row ── */}
      {!compact && (
        <>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 6 }}>
            <ZoneCard id="GATE_B" state={zones["GATE_B"]} small gateState={gateStates["GATE_B"]} />
            <ZoneCard id="GATE_A" state={zones["GATE_A"]} small gateState={gateStates["GATE_A"]} />
            <ZoneCard id="GATE_C" state={zones["GATE_C"]} small gateState={gateStates["GATE_C"]} />
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6 }}>
            <ZoneCard id="FOB1" state={zones["FOB1"]}
              pred={showPredictions ? predictions?.["FOB1"] : undefined}
              escLabel={esc1Reversed ? "↓ Exit Only" : undefined} />
            <ZoneCard id="FOB2" state={zones["FOB2"]}
              pred={showPredictions ? predictions?.["FOB2"] : undefined}
              escLabel={esc2Reversed ? "↓ Exit Only" : undefined} />
          </div>
        </>
      )}

      {/* ── Compact layout: GATE_B + FOBs ── */}
      {compact && (
        <>
          <ZoneCard id="GATE_B" state={zones["GATE_B"]} small gateState={gateStates["GATE_B"]} />
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6 }}>
            <ZoneCard id="FOB1" state={zones["FOB1"]} small
              pred={showPredictions ? predictions?.["FOB1"] : undefined} />
            <ZoneCard id="FOB2" state={zones["FOB2"]} small />
          </div>
        </>
      )}

      {/* ── Platforms ── */}
      <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
        {platforms.map(id => (
          <PlatformRow
            key={id} id={id}
            state={zones[id]}
            pred={showPredictions ? predictions?.[id] : undefined}
          />
        ))}
      </div>
    </div>
  );
}

// ── Zone card ─────────────────────────────────────────────────────────────────
function ZoneCard({ id, state, pred, small, gateState, escLabel }: {
  id: string; state?: ZoneState; pred?: ZonePrediction;
  small?: boolean; gateState?: GateState; escLabel?: string;
}) {
  const color   = state?.color ?? "green";
  const accent  = BORDER_MAP[color];
  const bg      = COLOR_MAP[color];
  const density = state?.density ?? 0;
  const isCrit  = color === "critical";
  const pct     = Math.min((density / 9) * 100, 100);

  return (
    <motion.div
      style={{
        background: bg,
        border: `1px solid ${isCrit ? accent : "#21262D"}`,
        borderLeft: `3px solid ${accent}`,
        borderRadius: 6,
        padding: small ? "7px 10px" : "10px 14px",
        position: "relative",
        overflow: "hidden",
      }}
      animate={isCrit ? { borderColor: [accent, "#21262D", accent] } : {}}
      transition={{ duration: 0.8, repeat: Infinity }}
    >
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 8 }}>
        <div style={{ minWidth: 0 }}>
          <div style={{
            fontSize: 10, fontWeight: 600, color: "#64748B",
            textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 2,
            overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
          }}>
            {ZONE_META[id]?.shortLabel ?? id}
          </div>
          {state && (
            <div style={{ fontSize: small ? 14 : 24, fontWeight: 800, color: accent, lineHeight: 1 }}>
              {density.toFixed(1)}
              <span style={{ fontSize: 10, fontWeight: 500, color: "#475569", marginLeft: 2 }}>/m²</span>
            </div>
          )}
        </div>

        <div style={{ textAlign: "right", flexShrink: 0 }}>
          {state && !small && (
            <div style={{ fontSize: 11, color: "#94A3B8" }}>
              {state.count.toLocaleString()}
              <span style={{ fontSize: 10, color: "#475569", marginLeft: 3 }}>prs</span>
            </div>
          )}
          {escLabel && (
            <div style={{ fontSize: 10, color: "#F59E0B", background: "rgba(245,158,11,0.1)", padding: "1px 5px", borderRadius: 3, marginTop: 2 }}>
              {escLabel}
            </div>
          )}
          {gateState && gateState !== "open" && (
            <div style={{ fontSize: 10, color: gateState === "closed" ? "#EF4444" : "#F59E0B", fontWeight: 600 }}>
              {gateState.toUpperCase()}
            </div>
          )}
          {pred && (
            <div style={{ fontSize: 10, color: BORDER_MAP[pred.t90.color], marginTop: 2 }}>
              +90s: {pred.t90.density.toFixed(1)}
            </div>
          )}
        </div>
      </div>

      {!small && (
        <div style={{ height: 3, background: "#21262D", borderRadius: 2, marginTop: 7, overflow: "hidden" }}>
          <motion.div
            style={{ height: "100%", background: accent, borderRadius: 2 }}
            animate={{ width: `${pct}%` }}
            transition={{ duration: 0.4 }}
          />
        </div>
      )}
    </motion.div>
  );
}

// ── Platform row ──────────────────────────────────────────────────────────────
function PlatformRow({ id, state, pred }: { id: string; state?: ZoneState; pred?: ZonePrediction }) {
  const color   = state?.color ?? "green";
  const accent  = BORDER_MAP[color];
  const bg      = COLOR_MAP[color];
  const density = state?.density ?? 0;
  const isCrit  = color === "critical";
  const pct     = Math.min((density / 9) * 100, 100);

  return (
    <motion.div
      style={{
        background: bg,
        border: `1px solid ${isCrit ? accent : "#21262D"}`,
        borderLeft: `3px solid ${accent}`,
        borderRadius: 6,
        padding: "6px 12px",
        display: "flex",
        alignItems: "center",
        gap: 8,
      }}
      animate={isCrit ? { borderColor: [accent, "#21262D", accent] } : {}}
      transition={{ duration: 0.8, repeat: Infinity }}
    >
      <div style={{ fontSize: 10, fontWeight: 600, color: "#64748B", textTransform: "uppercase", letterSpacing: "0.05em", width: 44, flexShrink: 0 }}>
        {ZONE_META[id]?.shortLabel ?? id}
      </div>
      <div style={{ fontSize: 16, fontWeight: 800, color: accent, width: 64, flexShrink: 0 }}>
        {density.toFixed(2)}
        <span style={{ fontSize: 9, color: "#475569", fontWeight: 400 }}>/m²</span>
      </div>
      {state && (
        <div style={{ fontSize: 11, color: "#94A3B8", width: 52, flexShrink: 0 }}>
          {state.count} <span style={{ color: "#475569", fontSize: 10 }}>prs</span>
        </div>
      )}
      <div style={{ flex: 1, height: 5, background: "#21262D", borderRadius: 3, overflow: "hidden" }}>
        <motion.div
          style={{ height: "100%", background: accent, borderRadius: 3 }}
          animate={{ width: `${pct}%` }}
          transition={{ duration: 0.4 }}
        />
      </div>
      {pred && (
        <div style={{ fontSize: 10, color: BORDER_MAP[pred.t90.color], flexShrink: 0 }}>
          +90s {pred.t90.density.toFixed(1)}
        </div>
      )}
    </motion.div>
  );
}
