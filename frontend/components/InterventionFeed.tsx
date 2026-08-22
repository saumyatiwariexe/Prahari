"use client";
import { useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { TriangleAlert } from "lucide-react";
import type { Intervention } from "@/lib/types";
import { LEVEL_COLORS, ZONE_META } from "@/lib/constants";

const LEVEL_TAG: Record<number, string> = {
  1: "L1 AUTO",
  2: "L2 STAGED",
  3: "L3 CONFIRM",
  4: "PRE-WARN",
  5: "SOS",
};

const STATUS_META: Record<string, { label: string; color: string }> = {
  fired:           { label: "FIRED",    color: "var(--sweep)" },
  staged:          { label: "PENDING",  color: "var(--amber)" },
  pending_confirm: { label: "AWAITING", color: "var(--red)" },
  confirmed:       { label: "EXEC",     color: "var(--text-mute)" },
  cancelled:       { label: "CANCL",    color: "var(--text-faint)" },
};

interface Props {
  interventions: Intervention[];
  staged?: Intervention[];
  onConfirm?: (id: string) => void;
  onCancel?: (id: string) => void;
}

export default function InterventionFeed({ interventions, staged, onConfirm, onCancel }: Props) {
  const bottomRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [interventions.length]);

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
      <div className="panel-title" style={{ display: "flex", alignItems: "center", flexShrink: 0 }}>
        <span>CONTACT LOG</span>
        <span style={{ marginLeft: "auto", color: "var(--text-faint)" }}>{interventions.length} EVT</span>
      </div>

      {staged && staged.length > 0 && (
        <div style={{ borderBottom: "1px solid var(--hair-dim)", flexShrink: 0 }}>
          {staged.map(iv => (
            <StagedCard key={iv.id} iv={iv} onConfirm={onConfirm} onCancel={onCancel} />
          ))}
        </div>
      )}

      <div className="flex-1 overflow-y-auto scrollbar-thin" style={{ minHeight: 0 }}>
        <AnimatePresence initial={false}>
          {interventions.map(iv => <LogRow key={iv.id} iv={iv} />)}
        </AnimatePresence>
        <div ref={bottomRef} />
        {interventions.length === 0 && (
          <div className="scope" style={{ padding: "16px 12px", fontSize: 10, color: "var(--text-faint)", letterSpacing: "0.1em" }}>
            NO CONTACTS LOGGED
          </div>
        )}
      </div>
    </div>
  );
}

function LogRow({ iv }: { iv: Intervention }) {
  const levelColor = LEVEL_COLORS[iv.level];
  const sMeta      = STATUS_META[iv.status] ?? { label: iv.status.toUpperCase(), color: "var(--text-mute)" };
  const zone       = ZONE_META[iv.zone]?.shortLabel ?? iv.zone;
  const isDimmed   = iv.status === "confirmed" || iv.status === "cancelled";

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: isDimmed ? 0.4 : 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.15 }}
      className="scope"
      style={{
        borderBottom: "1px solid var(--hair-dim)",
        padding: "6px 12px",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 7, marginBottom: 2 }}>
        <span style={{ width: 5, height: 5, borderRadius: "50%", background: isDimmed ? "var(--text-faint)" : levelColor, flexShrink: 0 }} />
        <span style={{ fontSize: 10, color: isDimmed ? "var(--text-faint)" : levelColor, letterSpacing: "0.08em" }}>
          {LEVEL_TAG[iv.level]}
        </span>
        <span style={{ fontSize: 9, color: sMeta.color, letterSpacing: "0.06em" }}>
          {sMeta.label}
        </span>
        <span style={{ fontSize: 9, color: "var(--text-faint)", marginLeft: "auto" }}>{iv.timestamp}</span>
      </div>
      <div style={{ fontSize: 10, color: isDimmed ? "var(--text-faint)" : "var(--text-dim)", letterSpacing: "0.02em", paddingLeft: 12 }}>
        <span style={{ color: isDimmed ? "var(--text-faint)" : "var(--text-mute)" }}>{zone} · </span>
        {iv.action.split(":")[0]}
      </div>
      {iv.response_time_ms > 0 && (
        <div style={{ fontSize: 9, color: "var(--text-faint)", marginTop: 1, paddingLeft: 12 }}>
          RSP {iv.response_time_ms.toFixed(0)}ms
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
  // countdown_remaining counts elapsed pending time (capped at 10s) as an urgency
  // indicator — L2 always waits for an explicit operator confirm, it never auto-fires.
  const pct   = isL2 && iv.countdown_remaining != null ? (iv.countdown_remaining / 10) * 100 : 0;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="scope"
      style={{
        borderBottom: "1px solid var(--hair-dim)",
        padding: "9px 12px",
        background: `${color}0C`,
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 4 }}>
        <TriangleAlert size={12} color={color} strokeWidth={1.75} />
        <span style={{ fontSize: 10, fontWeight: 700, color, letterSpacing: "0.1em" }}>
          {LEVEL_TAG[iv.level]} — {ZONE_META[iv.zone]?.shortLabel ?? iv.zone}
        </span>
      </div>
      <div style={{ fontSize: 10, color: "var(--text-dim)", marginBottom: 7, lineHeight: 1.4, paddingLeft: 18 }}>
        {iv.action}
      </div>

      {isL2 && iv.countdown_remaining != null && (
        <div style={{ marginBottom: 8 }}>
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 9, color: "var(--text-mute)", marginBottom: 3 }}>
            <span>AWAITING CONFIRM</span>
            <span style={{ color: "var(--amber)" }}>{iv.countdown_remaining}s</span>
          </div>
          <div style={{ height: 3, background: "var(--hair)" }}>
            <motion.div style={{ height: "100%", background: "var(--amber)", width: `${pct}%` }}
              transition={{ duration: 0.5 }} />
          </div>
        </div>
      )}

      <div style={{ display: "flex", gap: 6 }}>
        <button onClick={() => onCancel?.(iv.id)} style={{
          flex: 1, padding: "6px 0", fontSize: 10, cursor: "pointer",
          background: "transparent", color: "var(--text-mute)",
          border: "1px solid var(--hair)", letterSpacing: "0.08em",
        }}>
          CANCEL
        </button>
        <button onClick={() => onConfirm?.(iv.id)} style={{
          flex: 1, padding: "6px 0", fontSize: 10, cursor: "pointer",
          background: `${color}18`, color,
          border: `1px solid ${color}`, letterSpacing: "0.08em",
        }}>
          CONFIRM
        </button>
      </div>
    </motion.div>
  );
}
