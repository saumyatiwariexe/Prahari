"use client";
import { motion, AnimatePresence } from "framer-motion";
import type { LiveUpdate } from "@/lib/types";
import StationMap from "./StationMap";

interface Props {
  data: LiveUpdate | null;
}

export default function SplitScreen({ data }: Props) {
  if (!data) {
    return (
      <div className="flex h-full items-center justify-center text-slate-500 text-sm">
        Connecting to scenario...
      </div>
    );
  }

  const elapsed = data.elapsed;
  const cgL1Fired = data.crowdguard.l1_fired;
  const crushOccurred = data.human.crush_occurred;
  const humanResponded = data.human.human_responded;

  const cgResponseSec = cgL1Fired ? 2.3 : null;
  const humanResponseSec = humanResponded ? 252 : null;

  return (
    <div className="flex flex-col h-full gap-2">
      {/* Panels */}
      <div className="grid grid-cols-2 gap-3 flex-1 min-h-0">
        {/* Left — Human Operated */}
        <div className="flex flex-col rounded-xl border border-border bg-surface overflow-hidden relative">
          <div className="flex items-center gap-2 px-3 py-2 border-b border-border bg-[#1a0a0a]">
            <span className="w-2 h-2 rounded-full bg-red-500" />
            <span className="text-xs font-semibold text-red-400">HUMAN-OPERATED STATION</span>
            <span className="ml-auto text-xs text-slate-500">Current system</span>
          </div>
          <div className="flex-1 p-2 relative">
            <StationMap zones={data.human.zones} compact />

            {/* Awaiting operator overlay */}
            {!crushOccurred && !humanResponded && elapsed > 30 && (
              <div className="absolute inset-0 flex items-end justify-center pb-6 pointer-events-none">
                <motion.div
                  animate={{ opacity: [0.6, 1, 0.6] }}
                  transition={{ duration: 1.5, repeat: Infinity }}
                  className="bg-slate-900/80 border border-slate-600 rounded-lg px-3 py-1.5 text-xs text-slate-400"
                >
                  ⏳ Awaiting operator response...
                </motion.div>
              </div>
            )}

            {/* CRUSH alert */}
            <AnimatePresence>
              {crushOccurred && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="absolute inset-0 flex items-center justify-center"
                  style={{ background: "rgba(127,0,0,0.55)" }}
                >
                  <motion.div
                    animate={{ scale: [1, 1.04, 1] }}
                    transition={{ duration: 0.6, repeat: Infinity }}
                    className="text-center"
                  >
                    <div className="text-4xl mb-2">⚠️</div>
                    <div className="text-red-300 font-bold text-lg">CRUSH EVENT</div>
                    <div className="text-red-400 text-xs mt-1">FOB-1 density: critical</div>
                    {humanResponded && (
                      <div className="text-slate-300 text-xs mt-3 border-t border-red-800 pt-2">
                        Operator responded at 4m 12s — too late
                      </div>
                    )}
                  </motion.div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>

        {/* Right — CrowdGuard */}
        <div className="flex flex-col rounded-xl border border-green-900/60 bg-surface overflow-hidden relative">
          <div className="flex items-center gap-2 px-3 py-2 border-b border-green-900/60 bg-[#0a1a0a]">
            <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
            <span className="text-xs font-semibold text-green-400">CROWDGUARD — AUTONOMOUS</span>
            <span className="ml-auto text-xs text-slate-500">Simulation</span>
          </div>
          <div className="flex-1 p-2 relative">
            <StationMap zones={data.crowdguard.zones}
              predictions={data.crowdguard.predictions}
              showPredictions compact />

            {/* L1 fired badge */}
            <AnimatePresence>
              {cgL1Fired && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="absolute bottom-4 left-0 right-0 flex justify-center"
                >
                  <div className="bg-green-950 border border-green-600 rounded-lg px-3 py-1.5 text-xs text-green-300 font-mono">
                    ✅ L1 FIRED · PA-01 Issued · {cgResponseSec?.toFixed(1)}s response
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Averted */}
            <AnimatePresence>
              {cgL1Fired && elapsed > 150 && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="absolute top-3 right-3"
                >
                  <div className="bg-green-900/80 border border-green-500 rounded-lg px-2 py-1 text-xs text-green-300 font-semibold">
                    INCIDENT AVERTED
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>

      {/* Bottom comparison bar */}
      <div className="grid grid-cols-2 gap-3">
        <StatBar
          label="Human Response Time"
          value={humanResponded ? "4 min 12 sec" : "—"}
          outcome={crushOccurred ? "CRUSH OCCURRED" : "Monitoring..."}
          outcomeColor={crushOccurred ? "text-red-400" : "text-slate-500"}
          valueColor="text-red-400"
        />
        <StatBar
          label="CrowdGuard Response"
          value={cgL1Fired ? "2.3 seconds" : "—"}
          outcome={cgL1Fired && elapsed > 150 ? "CRUSH PREVENTED" : "Active monitoring"}
          outcomeColor={cgL1Fired && elapsed > 150 ? "text-green-400" : "text-slate-400"}
          valueColor="text-green-400"
        />
      </div>
    </div>
  );
}

function StatBar({ label, value, outcome, outcomeColor, valueColor }: {
  label: string; value: string; outcome: string;
  outcomeColor: string; valueColor: string;
}) {
  return (
    <div className="rounded-lg border border-border bg-surface px-4 py-2 flex items-center justify-between">
      <div>
        <div className="text-xs text-slate-500">{label}</div>
        <div className={`text-lg font-bold font-mono ${valueColor}`}>{value}</div>
      </div>
      <div className={`text-sm font-semibold ${outcomeColor}`}>{outcome}</div>
    </div>
  );
}
