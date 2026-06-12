"use client";
import { useRef, useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

interface Props {
  critical: boolean;
  videoSrc?: string;
}

export default function VideoPlayer({ critical, videoSrc = "/videos/platform.webm" }: Props) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [hasVideo, setHasVideo] = useState(false);
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;
    const onCanPlay = () => setHasVideo(true);
    const onError = () => setHasVideo(false);
    v.addEventListener("canplay", onCanPlay);
    v.addEventListener("error", onError);
    v.load();
    return () => {
      v.removeEventListener("canplay", onCanPlay);
      v.removeEventListener("error", onError);
    };
  }, [videoSrc]);

  useEffect(() => {
    if (!videoRef.current || !hasVideo) return;
    videoRef.current.playbackRate = critical ? 1.4 : 1.0;
  }, [critical, hasVideo]);

  return (
    <motion.div
      className="fixed bottom-4 left-4 z-40 cursor-pointer"
      animate={{ width: expanded ? 320 : 208 }}
      transition={{ type: "spring", stiffness: 160, damping: 20 }}
      onClick={() => setExpanded((e) => !e)}
    >
      <div
        className="relative rounded-xl overflow-hidden bg-[#0d1117] shadow-2xl"
        style={{ border: critical ? "2px solid #EF4444" : "1px solid #374151" }}
      >
        {/* Critical pulse border */}
        <AnimatePresence>
          {critical && (
            <motion.div
              className="absolute inset-0 rounded-xl border-2 border-red-500 pointer-events-none z-10"
              animate={{ opacity: [1, 0.2, 1] }}
              transition={{ duration: 0.7, repeat: Infinity }}
            />
          )}
        </AnimatePresence>

        {/* Header */}
        <div className="flex items-center gap-2 px-2 py-1.5 bg-black/50 border-b border-white/10">
          <motion.div
            className={`w-2 h-2 rounded-full ${hasVideo ? "bg-red-500" : "bg-slate-600"}`}
            animate={hasVideo ? { opacity: [1, 0.3, 1] } : {}}
            transition={{ duration: 1, repeat: Infinity }}
          />
          <span className="text-[10px] text-slate-400 font-mono">LIVE CCTV · FOB-3</span>
          {critical && (
            <motion.span
              className="ml-auto text-[9px] font-bold text-red-400"
              animate={{ opacity: [1, 0.3, 1] }}
              transition={{ duration: 0.5, repeat: Infinity }}
            >
              ⚠ HIGH DENSITY
            </motion.span>
          )}
        </div>

        {/* Video or crowd simulation */}
        <div className="relative" style={{ aspectRatio: "16/9" }}>
          <video
            ref={videoRef}
            src={videoSrc}
            autoPlay loop muted playsInline
            className={`w-full h-full object-cover ${hasVideo ? "block" : "hidden"}`}
          />

          {!hasVideo && (
            <div className="absolute inset-0 bg-[#0d1117]">
              {/* Simulated crowd dots */}
              {Array.from({ length: 35 }).map((_, i) => (
                <motion.div
                  key={i}
                  className={`absolute w-1.5 h-1.5 rounded-full ${critical ? "bg-red-500" : "bg-slate-500"}`}
                  style={{ left: `${8 + (i * 27) % 84}%`, top: `${10 + (i * 19) % 80}%` }}
                  animate={{
                    x: [(i % 3 - 1) * 6, (i % 3 - 1) * -6],
                    y: [(i % 2 - 0.5) * 4, (i % 2 - 0.5) * -4],
                  }}
                  transition={{ duration: 1.2 + (i % 4) * 0.3, repeat: Infinity, repeatType: "reverse" }}
                />
              ))}
              <div className="absolute inset-0 flex items-end justify-center pb-1">
                <span className="text-[8px] text-slate-600 bg-black/60 px-1.5 py-0.5 rounded">
                  Place platform.webm in /public/videos/
                </span>
              </div>
            </div>
          )}

          {critical && (
            <div className="absolute top-1 right-1 bg-red-900/80 border border-red-500 rounded px-1.5 py-0.5">
              <span className="text-[9px] font-bold text-red-300">CRITICAL</span>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-2 py-1 bg-black/30 flex items-center justify-between">
          <span className="text-[9px] text-slate-500">{expanded ? "Click to collapse" : "Click to expand"}</span>
          <span className="text-[9px] text-slate-600">PIP</span>
        </div>
      </div>
    </motion.div>
  );
}
