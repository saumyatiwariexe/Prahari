"use client";
import { useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import type { Intervention } from "@/lib/types";
import { LEVEL_COLORS, ZONE_META } from "@/lib/constants";

const LEVEL_LABEL: Record<number, string> = { 1: "L1 AUTO", 2: "L2 STAGED", 3: "L3 CONFIRM" };
const LEVEL_ICON: Record<number, string> = { 1: "🟢", 2: "🟡", 3: "🔴" };

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
      <div className="px-3 py-2 border-b border-border flex items-center justify-between">
        <span className="text-xs font-semibold text-slate-400 tracking-widest uppercase">
          Intervention Feed
        </span>
        <span className="text-xs text-slate-500 font-mono">{interventions.length} actions</span>
      </div>

      {/* Staged cards */}
      {staged && staged.length > 0 && (
        <div className="p-2 space-y-2 border-b border-border">
          {staged.map((iv) => (
            <InterventionCard key={iv.id} iv={iv} onConfirm={onConfirm} onCancel={onCancel} />
          ))}
        </div>
      )}

      {/* Log */}
      <div className="flex-1 overflow-y-auto p-2 space-y-1 scrollbar-thin">
        <div ref={topRef} />
        <AnimatePresence initial={false}>
          {interventions.map((iv) => (
            <motion.div
              key={iv.id}
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.25 }}
              className="rounded-md border border-border bg-surface p-2"
            >
              <div className="flex items-center gap-2 mb-0.5">
                <span className="text-xs">{LEVEL_ICON[iv.level]}</span>
                <span
                  className="text-xs font-bold font-mono tracking-wide"
                  style={{ color: LEVEL_COLORS[iv.level] }}
                >
                  {LEVEL_LABEL[iv.level]}
                </span>
                <span className="text-xs text-slate-500 ml-auto font-mono">{iv.timestamp}</span>
              </div>
              <div className="text-xs text-slate-300 leading-relaxed">
                <span className="text-slate-500">Zone: </span>
                {ZONE_META[iv.zone]?.shortLabel ?? iv.zone}
                {" · "}
                <span className="text-slate-400">{iv.action.split(":")[0]}</span>
              </div>
              {iv.response_time_ms > 0 && (
                <div className="text-xs text-slate-600 font-mono mt-0.5">
                  Response: {iv.response_time_ms.toFixed(0)} ms
                </div>
              )}
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </div>
  );
}

function InterventionCard({
  iv, onConfirm, onCancel,
}: {
  iv: Intervention;
  onConfirm?: (id: string) => void;
  onCancel?: (id: string) => void;
}) {
  const isL2 = iv.level === 2;
  const progress = isL2 && iv.countdown_remaining != null
    ? (iv.countdown_remaining / 10) * 100
    : 0;

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.97 }}
      animate={{ opacity: 1, scale: 1 }}
      className="rounded-lg border p-3"
      style={{ borderColor: LEVEL_COLORS[iv.level] + "80" }}
    >
      <div className="flex items-center gap-2 mb-1">
        <span className="text-xs font-bold font-mono" style={{ color: LEVEL_COLORS[iv.level] }}>
          ⚠ LEVEL {iv.level} — {LEVEL_LABEL[iv.level]}
        </span>
      </div>
      <div className="text-xs text-slate-300 mb-1">
        <span className="text-slate-500">Zone: </span>{ZONE_META[iv.zone]?.label ?? iv.zone}
      </div>
      <div className="text-xs text-slate-400 mb-2 leading-relaxed">{iv.action}</div>

      {isL2 && iv.countdown_remaining != null && (
        <div className="mb-2">
          <div className="flex justify-between text-xs text-slate-500 mb-1">
            <span>Auto-executing in</span>
            <span className="font-mono text-amber-400">{iv.countdown_remaining}s</span>
          </div>
          <div className="h-1 bg-slate-700 rounded-full overflow-hidden">
            <motion.div
              className="h-full bg-amber-400 rounded-full"
              style={{ width: `${progress}%` }}
              transition={{ duration: 0.5 }}
            />
          </div>
        </div>
      )}

      <div className="flex gap-2">
        <button
          onClick={() => onCancel?.(iv.id)}
          className="flex-1 text-xs py-1 rounded border border-slate-600 text-slate-400 hover:bg-slate-700 transition-colors"
        >
          Cancel
        </button>
        <button
          onClick={() => onConfirm?.(iv.id)}
          className="flex-1 text-xs py-1 rounded font-semibold transition-colors"
          style={{ background: LEVEL_COLORS[iv.level] + "20", color: LEVEL_COLORS[iv.level], border: `1px solid ${LEVEL_COLORS[iv.level]}` }}
        >
          Confirm Now
        </button>
      </div>
    </motion.div>
  );
}
