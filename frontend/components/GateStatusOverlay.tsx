"use client";
import { motion, AnimatePresence } from "framer-motion";

export type GateState = "open" | "restricted" | "closed";

interface GateProps {
  x: number;
  y: number;
  w: number;
  h: number;
  state: GateState;
}

function Gate({ x, y, w, h, state }: GateProps) {
  const barW = Math.floor(w * 0.38);
  const gap = w - 2 * barW - 4;
  const halfGap = gap / 2;

  const color = state === "closed" ? "#EF4444" : state === "restricted" ? "#F59E0B" : "#22C55E";

  // CSS translateX offset: positive = right (left bar), negative = left (right bar)
  const offset =
    state === "closed" ? halfGap + 3 :
    state === "restricted" ? halfGap * 0.45 : 0;

  return (
    <g>
      {/* Left gate bar — translates RIGHT when closing */}
      <motion.rect
        x={x + 2} y={y + 6}
        width={barW} height={h - 12}
        rx={3}
        fill={color + "40"}
        stroke={color}
        strokeWidth={2}
        animate={{ x: offset }}
        transition={{ type: "spring", stiffness: 90, damping: 16 }}
      />
      {/* Right gate bar — translates LEFT when closing */}
      <motion.rect
        x={x + w - barW - 2} y={y + 6}
        width={barW} height={h - 12}
        rx={3}
        fill={color + "40"}
        stroke={color}
        strokeWidth={2}
        animate={{ x: -offset }}
        transition={{ type: "spring", stiffness: 90, damping: 16 }}
      />

      {/* Status label */}
      <AnimatePresence>
        {state !== "open" && (
          <motion.text
            key={state}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            x={x + w / 2} y={y + h / 2 + 4}
            textAnchor="middle"
            fill={color}
            fontSize={9}
            fontWeight="800"
            fontFamily="JetBrains Mono, monospace"
          >
            {state === "closed" ? "CLOSED" : "50%"}
          </motion.text>
        )}
      </AnimatePresence>

      {/* Pulsing border on closed */}
      <AnimatePresence>
        {state === "closed" && (
          <motion.rect
            key="cpulse"
            initial={{ opacity: 0.9 }}
            animate={{ opacity: [0.9, 0.15, 0.9] }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.8, repeat: Infinity }}
            x={x} y={y} width={w} height={h} rx={6}
            fill="none" stroke="#EF4444" strokeWidth={2}
          />
        )}
      </AnimatePresence>
    </g>
  );
}

const GATE_DEFS: Array<{ id: string; x: number; y: number; w: number; h: number }> = [
  { id: "GATE_A", x: 60,  y: 12, w: 90, h: 66 },
  { id: "GATE_B", x: 405, y: 12, w: 90, h: 66 },
  { id: "GATE_C", x: 750, y: 12, w: 90, h: 66 },
];

export default function GateStatusOverlay({ gateStates }: { gateStates: Record<string, GateState> }) {
  return (
    <>
      {GATE_DEFS.map(({ id, ...r }) => (
        <Gate key={id} {...r} state={gateStates[id] ?? "open"} />
      ))}
    </>
  );
}
