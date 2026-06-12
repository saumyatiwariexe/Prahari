"use client";
import { useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";

interface Props {
  notification: { title: string; body: string; level: string } | null;
  onDismiss: () => void;
}

export default function PhoneNotification({ notification, onDismiss }: Props) {
  useEffect(() => {
    if (!notification) return;
    const t = setTimeout(onDismiss, 9000);
    return () => clearTimeout(t);
  }, [notification, onDismiss]);

  const levelColor =
    notification?.level === "L3" ? "#EF4444" :
    notification?.level === "L2" ? "#F59E0B" : "#22C55E";

  return (
    <AnimatePresence>
      {notification && (
        <motion.div
          initial={{ y: 200, x: 40, opacity: 0 }}
          animate={{ y: 0, x: 0, opacity: 1 }}
          exit={{ y: 200, opacity: 0 }}
          transition={{ type: "spring", damping: 18, stiffness: 180 }}
          className="fixed bottom-24 right-4 z-50 pointer-events-none"
        >
          {/* Phone frame */}
          <div className="relative w-52 bg-[#0f0f0f] rounded-[28px] border-4 border-[#222] shadow-2xl shadow-black/60 overflow-hidden p-1">
            {/* Screen */}
            <div className="rounded-[22px] bg-[#1a1a2e] overflow-hidden">
              {/* Lock screen top */}
              <div className="h-6 flex items-center justify-between px-4 bg-black/30">
                <span className="text-[9px] text-white/70">9:41</span>
                <div className="flex items-center gap-1">
                  <span className="text-[9px] text-white/70">▐▐▐</span>
                  <span className="text-[9px] text-white/70">WiFi</span>
                  <span className="text-[9px] text-white/70">🔋</span>
                </div>
              </div>

              {/* Notification card */}
              <motion.div
                initial={{ y: -20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.2 }}
                className="mx-2 my-3 rounded-xl bg-[#1e1e3f]/90 backdrop-blur-sm border overflow-hidden"
                style={{ borderColor: levelColor + "60" }}
              >
                {/* App header */}
                <div className="flex items-center gap-2 px-3 py-2 border-b border-white/10">
                  <div
                    className="w-5 h-5 rounded-md flex items-center justify-center text-[10px] font-bold"
                    style={{ backgroundColor: levelColor + "30", color: levelColor }}
                  >
                    CG
                  </div>
                  <span className="text-[10px] font-semibold text-white">CrowdGuard</span>
                  <span className="ml-auto text-[9px] text-white/40">now</span>
                </div>

                <div className="px-3 py-2">
                  <p className="text-[11px] font-bold text-white mb-0.5">{notification.title}</p>
                  <p className="text-[10px] text-white/70 leading-relaxed">{notification.body}</p>

                  {/* Level badge */}
                  <div
                    className="mt-2 inline-block rounded px-2 py-0.5 text-[9px] font-bold"
                    style={{ backgroundColor: levelColor + "20", color: levelColor }}
                  >
                    {notification.level} ALERT
                  </div>
                </div>
              </motion.div>

              {/* Swipe hint */}
              <div className="pb-3 flex justify-center">
                <div className="w-16 h-1 rounded-full bg-white/20" />
              </div>
            </div>

            {/* Home indicator notch */}
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-16 h-5 bg-[#0f0f0f] rounded-b-2xl" />
          </div>

          {/* Screen glow */}
          <motion.div
            className="absolute inset-0 rounded-[28px]"
            style={{ boxShadow: `0 0 30px 4px ${levelColor}40` }}
            animate={{ opacity: [0.6, 1, 0.6] }}
            transition={{ duration: 1.5, repeat: Infinity }}
          />
        </motion.div>
      )}
    </AnimatePresence>
  );
}
