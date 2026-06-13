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
  const platforms = compact ? PLATFORMS.slice(0, 3) : PLATFORMS;

  return (
    <div className="flex flex-col gap-2 h-full w-full">
      {/* ── CONCOURSE ── */}
      <ZoneCard
        id="CONC"
        state={zones["CONC"]}
        pred={showPredictions ? predictions?.["CONC"] : undefined}
      />

      {/* ── FOB + Gate row ── */}
      {!compact && (
        <div className="grid grid-cols-4 gap-2">
          <ZoneCard id="GATE_A" state={zones["GATE_A"]} small
            gateState={gateStates["GATE_A"]} />
          <ZoneCard id="FOB1"   state={zones["FOB1"]}
            pred={showPredictions ? predictions?.["FOB1"] : undefined}
            escLabel={esc1Reversed ? "↓ Exit Only" : undefined} />
          <ZoneCard id="FOB2"   state={zones["FOB2"]}
            pred={showPredictions ? predictions?.["FOB2"] : undefined}
            escLabel={esc2Reversed ? "↓ Exit Only" : undefined} />
          <ZoneCard id="GATE_C" state={zones["GATE_C"]} small
            gateState={gateStates["GATE_C"]} />
        </div>
      )}

      {compact && (
        <div className="grid grid-cols-2 gap-2">
          <ZoneCard id="FOB1" state={zones["FOB1"]} />
          <ZoneCard id="FOB2" state={zones["FOB2"]} />
        </div>
      )}

      {/* ── Platforms ── */}
      <div className="flex flex-col gap-1.5 flex-1">
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

// ── Zone card (box style — for CONC, FOBs, Gates) ─────────────────────────────
function ZoneCard({ id, state, pred, small, gateState, escLabel }: {
  id: string;
  state?: ZoneState;
  pred?: ZonePrediction;
  small?: boolean;
  gateState?: GateState;
  escLabel?: string;
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
        padding: small ? "8px 10px" : "10px 14px",
        position: "relative",
        overflow: "hidden",
      }}
      animate={isCrit ? { borderColor: [accent, "#21262D", accent] } : {}}
      transition={{ duration: 0.8, repeat: Infinity }}
    >
      {/* Top row: label + density */}
      <div className="flex items-start justify-between gap-2">
        <div>
          <div style={{
            fontSize: small ? 11 : 12,
            fontWeight: 600,
            color: "#64748B",
            textTransform: "uppercase",
            letterSpacing: "0.06em",
            marginBottom: 2,
          }}>
            {ZONE_META[id]?.shortLabel ?? id}
          </div>
          {!small && state && (
            <div style={{ fontSize: 28, fontWeight: 800, color: accent, lineHeight: 1 }}>
              {density.toFixed(1)}
              <span style={{ fontSize: 13, fontWeight: 500, color: "#475569", marginLeft: 2 }}>
                /m²
              </span>
            </div>
          )}
          {small && state && (
            <div style={{ fontSize: 16, fontWeight: 700, color: accent }}>
              {density.toFixed(1)}/m²
            </div>
          )}
        </div>

        <div style={{ textAlign: "right" }}>
          {state && !small && (
            <div style={{ fontSize: 13, color: "#94A3B8" }}>
              {state.count} <span style={{ fontSize: 11, color: "#475569" }}>persons</span>
            </div>
          )}
          {escLabel && (
            <div style={{
              fontSize: 11, color: "#F59E0B",
              background: "rgba(245,158,11,0.1)",
              padding: "1px 6px", borderRadius: 3, marginTop: 4,
            }}>
              {escLabel}
            </div>
          )}
          {gateState && gateState !== "open" && (
            <div style={{
              fontSize: 11,
              color: gateState === "closed" ? "#EF4444" : "#F59E0B",
              fontWeight: 600,
            }}>
              {gateState.toUpperCase()}
            </div>
          )}
          {/* t+90 prediction */}
          {pred && (
            <div style={{ fontSize: 11, color: BORDER_MAP[pred.t90.color], marginTop: 4 }}>
              +90s: {pred.t90.density.toFixed(1)}
            </div>
          )}
        </div>
      </div>

      {/* Density bar */}
      {!small && (
        <div style={{
          height: 4, background: "#21262D",
          borderRadius: 2, marginTop: 8, overflow: "hidden",
        }}>
          <motion.div
            style={{ height: "100%", background: accent, borderRadius: 2 }}
            initial={{ width: 0 }}
            animate={{ width: `${pct}%` }}
            transition={{ duration: 0.4 }}
          />
        </div>
      )}
    </motion.div>
  );
}

// ── Platform row (horizontal, compact) ────────────────────────────────────────
function PlatformRow({ id, state, pred }: {
  id: string; state?: ZoneState; pred?: ZonePrediction;
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
        padding: "8px 14px",
        display: "flex",
        alignItems: "center",
        gap: 12,
        flex: 1,
      }}
      animate={isCrit ? { borderColor: [accent, "#21262D", accent] } : {}}
      transition={{ duration: 0.8, repeat: Infinity }}
    >
      {/* Zone label */}
      <div style={{
        fontSize: 12, fontWeight: 600, color: "#64748B",
        textTransform: "uppercase", letterSpacing: "0.06em",
        width: 76, flexShrink: 0,
      }}>
        {ZONE_META[id]?.shortLabel ?? id}
      </div>

      {/* Density value */}
      <div style={{ fontSize: 20, fontWeight: 800, color: accent, width: 80, flexShrink: 0 }}>
        {density.toFixed(2)}
        <span style={{ fontSize: 11, color: "#475569", fontWeight: 400 }}>/m²</span>
      </div>

      {/* Count */}
      {state && (
        <div style={{ fontSize: 13, color: "#94A3B8", width: 80, flexShrink: 0 }}>
          {state.count} <span style={{ color: "#475569", fontSize: 11 }}>prs</span>
        </div>
      )}

      {/* Bar */}
      <div style={{
        flex: 1, height: 6, background: "#21262D",
        borderRadius: 3, overflow: "hidden",
      }}>
        <motion.div
          style={{ height: "100%", background: accent, borderRadius: 3 }}
          initial={{ width: 0 }}
          animate={{ width: `${pct}%` }}
          transition={{ duration: 0.4 }}
        />
      </div>

      {/* Prediction */}
      {pred && (
        <div style={{
          fontSize: 11, color: BORDER_MAP[pred.t90.color],
          flexShrink: 0, fontFamily: "JetBrains Mono, monospace",
        }}>
          +90s {pred.t90.density.toFixed(1)}
        </div>
      )}
    </motion.div>
  );
}
