"use client";
import { motion } from "framer-motion";
import type { ZoneState, ZonePrediction } from "@/lib/types";
import { COLOR_MAP, BORDER_MAP, ZONE_META } from "@/lib/constants";
import EscalatorIndicator from "./EscalatorIndicator";
import GateStatusOverlay from "./GateStatusOverlay";
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

const ZONE_RECTS: Record<string, { x: number; y: number; w: number; h: number; rx?: number }> = {
  CONC:   { x: 0,   y: 0,   w: 900, h: 90  },
  GATE_A: { x: 60,  y: 12,  w: 90,  h: 66, rx: 6 },
  GATE_B: { x: 405, y: 12,  w: 90,  h: 66, rx: 6 },
  GATE_C: { x: 750, y: 12,  w: 90,  h: 66, rx: 6 },
  FOB1:   { x: 10,  y: 98,  w: 430, h: 36, rx: 4 },
  FOB2:   { x: 460, y: 98,  w: 430, h: 36, rx: 4 },
  P1:     { x: 10,  y: 142, w: 875, h: 58, rx: 4 },
  P2:     { x: 10,  y: 208, w: 875, h: 58, rx: 4 },
  P3:     { x: 10,  y: 274, w: 875, h: 58, rx: 4 },
  P4:     { x: 10,  y: 340, w: 875, h: 58, rx: 4 },
  P5:     { x: 10,  y: 406, w: 875, h: 58, rx: 4 },
  P6:     { x: 10,  y: 472, w: 875, h: 58, rx: 4 },
};

export default function StationMap({
  zones, predictions, showPredictions, compact,
  gateStates = {}, esc1Reversed = false, esc2Reversed = false,
}: Props) {
  const vbH = compact ? 400 : 540;

  return (
    <div className="w-full h-full relative">
      <svg
        viewBox={`0 0 900 ${vbH}`}
        className="w-full h-full"
        style={{ background: "transparent" }}
      >
        {/* Grid lines */}
        {[142, 208, 274, 340, 406, 472].map((y) => (
          <line key={y} x1="0" y1={y} x2="900" y2={y} stroke="#21262D" strokeWidth="1" />
        ))}

        {/* Zone rectangles */}
        {Object.entries(ZONE_RECTS).map(([zoneId, rect]) => {
          if (compact && ["GATE_A","GATE_B","GATE_C"].includes(zoneId)) return null;
          const state = zones[zoneId];
          const color = state?.color ?? "green";
          const isCritical = color === "critical";

          return (
            <motion.g key={zoneId}>
              <motion.rect
                x={rect.x} y={rect.y} width={rect.w} height={rect.h}
                rx={rect.rx ?? 0}
                fill={COLOR_MAP[color]}
                stroke={BORDER_MAP[color]}
                strokeWidth={isCritical ? 2 : 1}
                animate={isCritical ? { strokeOpacity: [1, 0.3, 1] } : {}}
                transition={isCritical ? { duration: 0.8, repeat: Infinity } : {}}
              />

              {/* Zone label */}
              <text
                x={rect.x + rect.w / 2}
                y={rect.y + rect.h / 2 - 6}
                textAnchor="middle"
                fill="#94A3B8"
                fontSize={zoneId.startsWith("P") ? 11 : 10}
                fontFamily="Inter, sans-serif"
              >
                {ZONE_META[zoneId]?.shortLabel ?? zoneId}
              </text>

              {/* Density value */}
              {state && (
                <text
                  x={rect.x + rect.w / 2}
                  y={rect.y + rect.h / 2 + 10}
                  textAnchor="middle"
                  fill={BORDER_MAP[color]}
                  fontSize={zoneId.startsWith("P") ? 13 : 11}
                  fontWeight="600"
                  fontFamily="JetBrains Mono, monospace"
                >
                  {state.density.toFixed(1)}/m²
                </text>
              )}

              {/* Prediction ghost (t+90) */}
              {showPredictions && predictions?.[zoneId] && (
                <rect
                  x={rect.x + 2} y={rect.y + 2}
                  width={rect.w - 4} height={rect.h - 4}
                  rx={rect.rx ?? 0}
                  fill="none"
                  stroke={BORDER_MAP[predictions[zoneId].t90.color]}
                  strokeWidth={1.5}
                  strokeDasharray="6 3"
                  opacity={0.5}
                />
              )}

              {/* Flow vector arrow */}
              {state?.flow_vector?.magnitude > 0.2 && (
                <FlowArrow
                  cx={rect.x + rect.w / 2}
                  cy={rect.y + rect.h / 2}
                  dx={state.flow_vector.dx}
                  dy={state.flow_vector.dy}
                  magnitude={state.flow_vector.magnitude}
                />
              )}
            </motion.g>
          );
        })}

        {/* Gate closure bars (L3 confirm / L2 throughput restriction) */}
        {Object.keys(gateStates).length > 0 && (
          <GateStatusOverlay gateStates={gateStates} />
        )}

        {/* Escalator indicators — inside FOB zones, only in full dashboard view */}
        {!compact && (
          <>
            <EscalatorIndicator id="ESC-1" reversed={esc1Reversed} x={160} y={102} />
            <EscalatorIndicator id="ESC-2" reversed={esc2Reversed} x={640} y={102} />
          </>
        )}

        {/* Station label */}
        <text x="450" y="82" textAnchor="middle" fill="#475569" fontSize="9" fontFamily="Inter">
          MAIN CONCOURSE — SIMULATION ENVIRONMENT
        </text>

        {/* Track lines below platforms */}
        {[200, 266, 332, 398, 464, 530].map((y, i) => (
          <line key={i} x1="10" y1={y} x2="890" y2={y}
            stroke="#1E293B" strokeWidth="3" strokeDasharray="20 8" opacity={0.6} />
        ))}
      </svg>
    </div>
  );
}

function FlowArrow({ cx, cy, dx, dy, magnitude }: {
  cx: number; cy: number; dx: number; dy: number; magnitude: number;
}) {
  const len = magnitude * 18;
  const ex = cx + dx * len;
  const ey = cy + dy * len;
  return (
    <motion.line
      x1={cx} y1={cy} x2={ex} y2={ey}
      stroke="#3B82F6"
      strokeWidth={2}
      strokeLinecap="round"
      markerEnd="url(#arrowhead)"
      animate={{ opacity: [0.5, 1, 0.5] }}
      transition={{ duration: 1.2, repeat: Infinity }}
    />
  );
}
