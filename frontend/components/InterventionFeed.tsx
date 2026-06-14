"use client";
import { useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import type { Intervention } from "@/lib/types";
import { LEVEL_COLORS, ZONE_META } from "@/lib/constants";

const M: React.CSSProperties = { fontFamily: "'Share Tech Mono', monospace" };

const LEVEL_TAG: Record<number, string> = {
  1: "L1-AUTO",
  2: "L2-STAGED",
  3: "L3-CONFIRM",
  4: "PRE-WARN",
  5: "SOS",
};

const STATUS_META: Record<string, { label: string; color: string }> = {
  fired:           { label: "FIRED",     color: "#00C84C" },
  staged:          { label: "PENDING",   color: "#E8A000" },
  pending_confirm: { label: "AWAITING",  color: "#E82020" },
  confirmed:       { label: "EXEC",      color: "#4A6A84" },
  cancelled:       { label: "CANCL",     color: "#2C4060" },
};

interface Props {
  interventions: Intervention[];
  staged?: Intervention[];
  onConfirm?: (id: string) => void;
  onCancel?: (id: string) => void;
}

export default function InterventionFeed({ interventions, staged, onConfirm, onCancel }: Props) {
  const topRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    topRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [interventions.length]);

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
      {/* Panel header */}
      <div className="panel-header" style={{ display: "flex", alignItems: "center", flexShrink: 0 }}>
        <span>▌ INTERVENTION LOG</span>
        <span style={{ marginLeft: "auto", color: "#1A3050" }}>{interventions.length} EVT</span>
      </div>

      {/* Staged action cards */}
      {staged && staged.length > 0 && (
        <div style={{ borderBottom: "1px solid #0E1E30", flexShrink: 0 }}>
          {staged.map(iv => (
            <StagedCard key={iv.id} iv={iv} onConfirm={onConfirm} onCancel={onCancel} />
          ))}
        </div>
      )}

      {/* Log */}
      <div className="flex-1 overflow-y-auto scrollbar-thin" style={{ minHeight: 0 }}>
        <div ref={topRef} />
        <AnimatePresence initial={false}>
          {interventions.map(iv => <LogCard key={iv.id} iv={iv} />)}
        </AnimatePresence>
        {interventions.length === 0 && (
          <div style={{ ...M, padding: "16px 10px", fontSize: 10, color: "#2C4060", letterSpacing: "0.1em" }}>
            NO EVENTS RECORDED
          </div>
        )}
      </div>
    </div>
  );
}

function LogCard({ iv }: { iv: Intervention }) {
  const levelColor  = LEVEL_COLORS[iv.level];
  const sMeta       = STATUS_META[iv.status] ?? { label: iv.status.toUpperCase(), color: "#4A6A84" };
  const zone        = ZONE_META[iv.zone]?.shortLabel ?? iv.zone;
  const isDimmed    = iv.status === "confirmed" || iv.status === "cancelled";

  return (
    <motion.div
      initial={{ opacity: 0, x: -6 }}
      animate={{ opacity: isDimmed ? 0.45 : 1, x: 0 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.15 }}
      style={{
        ...M,
        borderBottom: "1px solid #0A1525",
        borderLeft: `3px solid ${isDimmed ? "#142035" : levelColor}`,
        padding: "5px 10px",
        background: isDimmed ? "transparent" : "rgba(26,144,255,0.03)",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 2 }}>
        <span style={{ fontSize: 10, color: isDimmed ? "#2C4060" : levelColor, letterSpacing: "0.08em" }}>
          {LEVEL_TAG[iv.level]}
        </span>
        <span style={{ fontSize: 9, color: sMeta.color, letterSpacing: "0.06em" }}>
          [{sMeta.label}]
        </span>
        <span style={{ fontSize: 9, color: "#1A3050", marginLeft: "auto" }}>{iv.timestamp}</span>
      </div>
      <div style={{ fontSize: 10, color: isDimmed ? "#2C4060" : "#8AB4D4", letterSpacing: "0.04em" }}>
        <span style={{ color: isDimmed ? "#1A3050" : "#4A6A84" }}>{zone} · </span>
        {iv.action.split(":")[0]}
      </div>
      {iv.response_time_ms > 0 && (
        <div style={{ fontSize: 9, color: "#1A3050", marginTop: 1 }}>
          RSP: {iv.response_time_ms.toFixed(0)}ms
        </div>
      )}
    </motion.div>
  );
}

function StagedCard({ iv, onConfirm, onCancel }: {
  iv: Intervention;
  onConfirm?: (id: string) => void;
  onCancel?: (id: string) => void;
}) {
  const color = LEVEL_COLORS[iv.level];
  const isL2  = iv.level === 2;
  const pct   = isL2 && iv.countdown_remaining != null ? (iv.countdown_remaining / 10) * 100 : 0;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      style={{
        ...M,
        borderBottom: "1px solid #0E1E30",
        borderLeft: `3px solid ${color}`,
        padding: "8px 10px",
        background: `${color}08`,
      }}
    >
      <div style={{ fontSize: 10, fontWeight: 700, color, letterSpacing: "0.1em", marginBottom: 3 }}>
        ⚠ {LEVEL_TAG[iv.level]} — {ZONE_META[iv.zone]?.shortLabel ?? iv.zone}
      </div>
      <div style={{ fontSize: 10, color: "#8AB4D4", marginBottom: 6, lineHeight: 1.4 }}>
        {iv.action}
      </div>

      {isL2 && iv.countdown_remaining != null && (
        <div style={{ marginBottom: 7 }}>
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 9, color: "#4A6A84", marginBottom: 3 }}>
            <span>AUTO-EXEC IN</span>
            <span style={{ color: "#E8A000" }}>{iv.countdown_remaining}s</span>
          </div>
          <div style={{ height: 3, background: "#0E1E30" }}>
            <motion.div style={{ height: "100%", background: "#E8A000", width: `${pct}%` }}
              transition={{ duration: 0.5 }} />
          </div>
        </div>
      )}

      <div style={{ display: "flex", gap: 6 }}>
        <button onClick={() => onCancel?.(iv.id)} style={{
          ...M,
          flex: 1, padding: "5px 0", fontSize: 10, cursor: "pointer",
          background: "transparent", color: "#4A6A84",
          border: "1px solid #142035", letterSpacing: "0.08em",
        }}>
          CANCEL
        </button>
        <button onClick={() => onConfirm?.(iv.id)} style={{
          ...M,
          flex: 1, padding: "5px 0", fontSize: 10, cursor: "pointer",
          background: `${color}18`, color,
          border: `1px solid ${color}`, letterSpacing: "0.08em",
        }}>
          CONFIRM
        </button>
      </div>
    </motion.div>
  );
}
