"use client";
import { motion, AnimatePresence } from "framer-motion";
import type { Intervention } from "@/lib/types";

const M: React.CSSProperties = { fontFamily: "'Share Tech Mono', monospace" };

interface Props {
  active: boolean;
  intervention?: Intervention;
}

export default function PreWarnBanner({ active, intervention }: Props) {
  return (
    <AnimatePresence>
      {active && (
        <motion.div
          initial={{ y: -60, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: -60, opacity: 0 }}
          transition={{ type: "spring", stiffness: 260, damping: 24 }}
          style={{
            ...M,
            position: "fixed", top: 44, left: 0, right: 0, zIndex: 90,
            background: "rgba(255,107,0,0.12)",
            borderBottom: "1px solid #FF6B00",
            padding: "7px 16px",
            display: "flex", alignItems: "center", gap: 10,
          }}
        >
          <motion.span
            style={{ fontSize: 12, color: "#FF6B00" }}
            animate={{ opacity: [1, 0.3, 1] }}
            transition={{ duration: 0.7, repeat: Infinity }}
          >
            ⚠
          </motion.span>
          <span style={{ fontSize: 11, color: "#FF8C33", letterSpacing: "0.12em" }}>
            PRE-WARN ACTIVE
          </span>
          <span style={{ fontSize: 10, color: "#A06030", letterSpacing: "0.06em" }}>
            {intervention
              ? `Zone: ${intervention.zone} — Emergency services on standby`
              : "Emergency services on standby"}
          </span>
          <span style={{ marginLeft: "auto", fontSize: 9, color: "#6B4020", letterSpacing: "0.08em" }}>
            [SIMULATED]
          </span>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
