"use client";
import { motion, AnimatePresence } from "framer-motion";

interface Props {
  active: boolean;
  boothId: string;
  distance?: string;
}

export default function RPFAlert({ active, boothId, distance = "120m" }: Props) {
  return (
    <AnimatePresence>
      {active && (
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.8 }}
          transition={{ duration: 0.3 }}
          className="fixed bottom-20 right-4 w-52 pointer-events-none z-50"
        >
          <div className="relative bg-[#0d0a00]/95 border border-red-700 rounded-xl p-4 shadow-2xl shadow-red-900/40">
            {/* Sonar rings */}
            <div className="relative w-16 h-16 mx-auto mb-3">
              {[0, 1, 2, 3].map((i) => (
                <motion.div
                  key={i}
                  className="absolute inset-0 rounded-full border-2 border-red-500"
                  initial={{ scale: 0.3, opacity: 0.9 }}
                  animate={{ scale: 2.5 + i * 0.5, opacity: 0 }}
                  transition={{
                    duration: 1.6,
                    repeat: Infinity,
                    delay: i * 0.35,
                    ease: "easeOut",
                  }}
                />
              ))}
              {/* Center icon */}
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="w-10 h-10 rounded-full bg-red-900/80 border-2 border-red-500 flex items-center justify-center">
                  <span className="text-xl">🚨</span>
                </div>
              </div>
            </div>

            <div className="text-center">
              <div className="text-xs font-bold text-red-400 tracking-widest mb-1">RPF DISPATCH</div>
              <div className="text-sm font-bold text-white mb-1">{boothId}</div>
              <div className="text-xs text-slate-400">Nearest booth · {distance}</div>
              <div className="mt-2 text-[10px] text-red-300 bg-red-950/50 rounded px-2 py-1">
                L2 · Auto-issued by CrowdGuard
              </div>
            </div>

            {/* Pulsing border */}
            <motion.div
              className="absolute inset-0 rounded-xl border-2 border-red-500"
              animate={{ opacity: [1, 0.2, 1] }}
              transition={{ duration: 1, repeat: Infinity }}
            />
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
