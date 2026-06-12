"use client";
import { useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";

interface Props {
  message: string | null;
  zone: string;
  onDismiss: () => void;
}

export default function PAAnnouncementBanner({ message, zone, onDismiss }: Props) {
  useEffect(() => {
    if (!message) return;
    const t = setTimeout(onDismiss, 7000);
    return () => clearTimeout(t);
  }, [message, onDismiss]);

  return (
    <AnimatePresence>
      {message && (
        <motion.div
          initial={{ y: 100, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 100, opacity: 0 }}
          transition={{ type: "spring", damping: 20, stiffness: 200 }}
          className="fixed bottom-0 left-0 right-0 z-50 pointer-events-none"
        >
          <div className="mx-4 mb-3 rounded-xl border border-amber-500/60 bg-[#1a1400]/95 backdrop-blur-sm px-5 py-3 shadow-2xl shadow-amber-900/30">
            <div className="flex items-center gap-4">
              {/* Speaker icon with sound waves */}
              <div className="relative shrink-0 w-10 h-10 flex items-center justify-center">
                <span className="text-2xl z-10">📢</span>
                {[1, 2, 3].map((i) => (
                  <motion.div
                    key={i}
                    className="absolute inset-0 rounded-full border border-amber-400"
                    initial={{ scale: 0.6, opacity: 0.8 }}
                    animate={{ scale: 1.5 + i * 0.3, opacity: 0 }}
                    transition={{ duration: 1.2, repeat: Infinity, delay: i * 0.25, ease: "easeOut" }}
                  />
                ))}
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-0.5">
                  <span className="text-xs font-bold text-amber-400 tracking-widest uppercase">
                    PA ANNOUNCEMENT
                  </span>
                  <span className="text-xs text-slate-500 border border-slate-700 rounded px-1.5">{zone}</span>
                  <span className="ml-auto text-xs text-slate-500">Auto-issued by Prahari · L1</span>
                </div>
                {/* Scrolling ticker */}
                <div className="overflow-hidden">
                  <motion.p
                    initial={{ x: "100%" }}
                    animate={{ x: "-100%" }}
                    transition={{ duration: 10, ease: "linear" }}
                    className="text-sm text-amber-100 whitespace-nowrap font-medium"
                  >
                    {message}
                  </motion.p>
                </div>
              </div>

              {/* Level badge */}
              <div className="shrink-0 bg-green-900/60 border border-green-600 rounded-lg px-2 py-1 text-center">
                <div className="text-xs font-bold text-green-400">L1</div>
                <div className="text-[10px] text-green-500">AUTO</div>
              </div>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
