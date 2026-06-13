"use client";
import { useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import type { Intervention } from "@/lib/types";
import { LEVEL_COLORS, ZONE_META } from "@/lib/constants";

const LEVEL_LABEL: Record<number, string> = { 1: "L1 — AUTO", 2: "L2 — STAGED", 3: "L3 — CONFIRM" };

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
    <div className="flex flex-col h-full">
      {/* Header */}
      <div style={{
        padding: "10px 14px",
        borderBottom: "1px solid #21262D",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        flexShrink: 0,
      }}>
        <span style={{ fontSize: 13, fontWeight: 600, color: "#94A3B8" }}>
          Intervention Log
        </span>
        <span style={{
          fontSize: 12, color: "#475569",
          fontFamily: "JetBrains Mono, monospace",
        }}>
          {interventions.length} events
        </span>
      </div>

      {/* Staged cards */}
      {staged && staged.length > 0 && (
        <div style={{ padding: "8px", borderBottom: "1px solid #21262D", flexShrink: 0 }}>
          {staged.map(iv => (
            <StagedCard key={iv.id} iv={iv} onConfirm={onConfirm} onCancel={onCancel} />
          ))}
        </div>
      )}

      {/* Log list */}
      <div className="flex-1 overflow-y-auto scrollbar-thin" style={{ padding: "8px", display: "flex", flexDirection: "column", gap: 6 }}>
        <div ref={topRef} />
        <AnimatePresence initial={false}>
          {interventions.map(iv => (
            <LogCard key={iv.id} iv={iv} />
          ))}
        </AnimatePresence>
        {interventions.length === 0 && (
          <div style={{ padding: 24, textAlign: "center", color: "#475569", fontSize: 13 }}>
            No interventions yet
          </div>
        )}
      </div>
    </div>
  );
}

const STATUS_META: Record<string, { label: string; color: string }> = {
  fired:           { label: "Fired",     color: "#22C55E" },
  staged:          { label: "Pending",   color: "#F59E0B" },
  pending_confirm: { label: "Awaiting",  color: "#EF4444" },
  confirmed:       { label: "Confirmed", color: "#475569" },
  cancelled:       { label: "Cancelled", color: "#334155" },
};

function LogCard({ iv }: { iv: Intervention }) {
  const accentColor = LEVEL_COLORS[iv.level];
  const zone        = ZONE_META[iv.zone]?.shortLabel ?? iv.zone;
  const statusMeta  = STATUS_META[iv.status] ?? { label: iv.status, color: "#475569" };
  const isDimmed    = iv.status === "confirmed" || iv.status === "cancelled";

  return (
    <motion.div
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.2 }}
      style={{
        background: "#161B22",
        border: "1px solid #21262D",
        borderLeft: `3px solid ${isDimmed ? "#21262D" : accentColor}`,
        borderRadius: 6,
        padding: "10px 12px",
        opacity: isDimmed ? 0.55 : 1,
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
        <span style={{
          fontSize: 12, fontWeight: 700,
          color: isDimmed ? "#475569" : accentColor,
          textTransform: "uppercase", letterSpacing: "0.04em",
        }}>
          {LEVEL_LABEL[iv.level]}
        </span>
        <span style={{
          fontSize: 11, fontWeight: 600, color: statusMeta.color,
          textTransform: "uppercase", letterSpacing: "0.04em",
        }}>
          {statusMeta.label}
        </span>
        <span style={{
          fontSize: 11, color: "#475569",
          fontFamily: "JetBrains Mono, monospace",
          marginLeft: "auto",
        }}>
          {iv.timestamp}
        </span>
      </div>
      <div style={{ fontSize: 13, color: isDimmed ? "#475569" : "#94A3B8" }}>
        <span style={{ color: "#475569" }}>Zone: </span>
        <span style={{ fontWeight: 500 }}>{zone}</span>
        {" · "}
        <span style={{ color: "#475569" }}>{iv.action.split(":")[0]}</span>
      </div>
      {iv.response_time_ms > 0 && (
        <div style={{
          fontSize: 11, color: "#334155", marginTop: 3,
          fontFamily: "JetBrains Mono, monospace",
        }}>
          {iv.response_time_ms.toFixed(0)} ms
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
  const pct   = isL2 && iv.countdown_remaining != null
    ? (iv.countdown_remaining / 10) * 100 : 0;

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.97 }}
      animate={{ opacity: 1, scale: 1 }}
      style={{
        background: "#161B22",
        border: `1px solid ${color}40`,
        borderRadius: 8,
        padding: "12px 14px",
        marginBottom: 4,
      }}
    >
      <div style={{ fontSize: 13, fontWeight: 700, color, marginBottom: 4 }}>
        ⚠ Level {iv.level} — {LEVEL_LABEL[iv.level]}
      </div>
      <div style={{ fontSize: 13, color: "#94A3B8", marginBottom: 8, lineHeight: 1.5 }}>
        {iv.action}
      </div>

      {isL2 && iv.countdown_remaining != null && (
        <div style={{ marginBottom: 10 }}>
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, color: "#64748B", marginBottom: 4 }}>
            <span>Auto-executing in</span>
            <span style={{ color: "#F59E0B", fontFamily: "JetBrains Mono, monospace" }}>
              {iv.countdown_remaining}s
            </span>
          </div>
          <div style={{ height: 4, background: "#21262D", borderRadius: 2, overflow: "hidden" }}>
            <motion.div
              style={{ height: "100%", background: "#F59E0B", borderRadius: 2, width: `${pct}%` }}
              transition={{ duration: 0.5 }}
            />
          </div>
        </div>
      )}

      <div style={{ display: "flex", gap: 8 }}>
        <button
          onClick={() => onCancel?.(iv.id)}
          style={{
            flex: 1, padding: "8px", fontSize: 13, fontWeight: 600,
            background: "transparent", color: "#64748B",
            border: "1px solid #21262D", borderRadius: 6, cursor: "pointer",
          }}
        >
          Cancel
        </button>
        <button
          onClick={() => onConfirm?.(iv.id)}
          style={{
            flex: 1, padding: "8px", fontSize: 13, fontWeight: 600,
            background: `${color}20`, color,
            border: `1px solid ${color}`, borderRadius: 6, cursor: "pointer",
          }}
        >
          Confirm Now
        </button>
      </div>
    </motion.div>
  );
}
