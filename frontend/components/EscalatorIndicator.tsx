"use client";
import { motion, AnimatePresence } from "framer-motion";

interface Props {
  id: string;
  reversed: boolean;
  x: number;
  y: number;
}

export default function EscalatorIndicator({ id, reversed, x, y }: Props) {
  const color = reversed ? "#F59E0B" : "#22C55E";

  return (
    <g>
      {/* Body */}
      <rect x={x} y={y} width={70} height={18} rx={3}
        fill="#0F172A" stroke={color} strokeWidth={1.5} />

      {/* Static step lines */}
      {[8, 20, 32, 44, 56].map((ox, i) => (
        <line key={i}
          x1={x + ox} y1={y + 5}
          x2={x + ox - 4} y2={y + 13}
          stroke={color} strokeWidth={1.5} strokeLinecap="round" opacity={0.7}
        />
      ))}

      {/* Moving dot — direction indicator */}
      <motion.circle
        cx={x + 35} cy={y + 9} r={3}
        fill={color}
        animate={{ x: reversed ? [-10, 10] : [10, -10], opacity: [0.9, 0.2, 0.9] }}
        transition={{ duration: 0.7, repeat: Infinity, ease: "easeInOut" }}
      />

      {/* Direction label */}
      <AnimatePresence mode="wait">
        <motion.text
          key={reversed ? "rev" : "fwd"}
          initial={{ opacity: 0, y: -3 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.25 }}
          x={x + 35} y={y + 30}
          textAnchor="middle"
          fill={color}
          fontSize={7}
          fontWeight="700"
          fontFamily="JetBrains Mono, monospace"
        >
          {id} {reversed ? "↓ EXIT ONLY" : "↑ NORMAL"}
        </motion.text>
      </AnimatePresence>

      {/* Reversed warning ring */}
      <AnimatePresence>
        {reversed && (
          <motion.rect
            key="rring"
            initial={{ opacity: 0 }}
            animate={{ opacity: [0.9, 0.3, 0.9] }}
            exit={{ opacity: 0 }}
            transition={{ duration: 1, repeat: Infinity }}
            x={x - 2} y={y - 2} width={74} height={22} rx={4}
            fill="none" stroke="#F59E0B" strokeWidth={1.5} strokeDasharray="4 2"
          />
        )}
      </AnimatePresence>
    </g>
  );
}
