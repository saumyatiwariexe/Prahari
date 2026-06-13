"use client";
import { useRef, useEffect, useState } from "react";
import { motion } from "framer-motion";
import type { PersonBbox, ZoneState } from "@/lib/types";
import { BORDER_MAP } from "@/lib/constants";

interface Props {
  videoSrc: string;
  persons: PersonBbox[];
  zones: Record<string, ZoneState>;
  loading: boolean;
  source: "platform" | "aerial";
}

const M: React.CSSProperties = { fontFamily: "'Share Tech Mono', monospace" };

const LERP = 0.42; // per-frame lerp speed — at 60fps, box reaches target in ~5 frames (~80ms)

/** Centroid distance between two boxes (normalized coords) */
function centDist(a: PersonBbox, b: PersonBbox) {
  return Math.hypot((a.x1+a.x2)/2-(b.x1+b.x2)/2, (a.y1+a.y2)/2-(b.y1+b.y2)/2);
}

/** Greedy centroid matching: pair each target box to the nearest current box */
function matchLerp(curr: PersonBbox[], target: PersonBbox[], t: number): PersonBbox[] {
  if (curr.length === 0) return target;
  if (t >= 1) return target;
  const used = new Set<number>();
  return target.map(tp => {
    let bestDist = 0.35, bestIdx = -1;
    curr.forEach((cp, i) => {
      if (used.has(i)) return;
      const d = centDist(tp, cp);
      if (d < bestDist) { bestDist = d; bestIdx = i; }
    });
    if (bestIdx === -1) return tp;
    used.add(bestIdx);
    const cp = curr[bestIdx];
    return {
      x1: cp.x1 + (tp.x1 - cp.x1) * t,
      y1: cp.y1 + (tp.y1 - cp.y1) * t,
      x2: cp.x2 + (tp.x2 - cp.x2) * t,
      y2: cp.y2 + (tp.y2 - cp.y2) * t,
    };
  });
}

export default function VideoTrackingView({ videoSrc, persons, zones, loading, source }: Props) {
  const videoRef      = useRef<HTMLVideoElement>(null);
  const canvasRef     = useRef<HTMLCanvasElement>(null);
  const rafRef        = useRef<number>(0);
  const personsRef    = useRef<PersonBbox[]>([]); // raw latest from backend
  const animRef       = useRef<PersonBbox[]>([]); // smoothly animated positions
  const targetRef     = useRef<PersonBbox[]>([]); // target for current lerp step
  const [hasVideo, setHasVideo] = useState(false);

  // Track raw backend persons (for count display)
  personsRef.current = persons;

  // When backend delivers new positions, update lerp target
  useEffect(() => {
    targetRef.current = persons;
  }, [persons]);

  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;
    setHasVideo(false);
    const onCanPlay = () => setHasVideo(true);
    const onError   = () => setHasVideo(false);
    v.addEventListener("canplay", onCanPlay);
    v.addEventListener("error", onError);
    v.load();
    // Fallback: poll readyState in case canplay fires before listener attached
    const poll = setInterval(() => {
      if (v.readyState >= 3) { setHasVideo(true); clearInterval(poll); }
    }, 200);
    return () => {
      v.removeEventListener("canplay", onCanPlay);
      v.removeEventListener("error", onError);
      clearInterval(poll);
    };
  }, [videoSrc]);

  // RAF loop: always running — mirrors video to canvas, overlays bboxes when available
  useEffect(() => {
    cancelAnimationFrame(rafRef.current);
    const draw = () => {
      const canvas = canvasRef.current;
      const video  = videoRef.current;
      if (!canvas || !video || video.readyState < 2) {
        rafRef.current = requestAnimationFrame(draw);
        return;
      }
      const W = canvas.width;
      const H = canvas.height;
      const ctx = canvas.getContext("2d");
      if (!ctx) { rafRef.current = requestAnimationFrame(draw); return; }

      ctx.drawImage(video, 0, 0, W, H);

      // Subtle green scan-line tint
      ctx.fillStyle = "rgba(0,200,76,0.03)";
      ctx.fillRect(0, 0, W, H);

      // Lerp animated positions toward latest targets each frame
      animRef.current = matchLerp(animRef.current, targetRef.current, LERP);

      // Draw person bboxes — OpenCV style
      ctx.lineWidth = 1.5;
      animRef.current.forEach((p, i) => {
        const x = p.x1 * W;
        const y = p.y1 * H;
        const w = (p.x2 - p.x1) * W;
        const h = (p.y2 - p.y1) * H;

        // Box
        ctx.strokeStyle = "#00C84C";
        ctx.strokeRect(x, y, w, h);

        // Corner ticks (OpenCV aesthetic)
        const tk = Math.min(8, w * 0.25, h * 0.25);
        ctx.fillStyle = "#00C84C";
        [[x,y],[x+w,y],[x,y+h],[x+w,y+h]].forEach(([cx,cy]) => {
          ctx.fillRect(cx - 1, cy - 1, 2, 2);
        });
        ctx.beginPath();
        // TL
        ctx.moveTo(x, y + tk); ctx.lineTo(x, y); ctx.lineTo(x + tk, y);
        // TR
        ctx.moveTo(x + w - tk, y); ctx.lineTo(x + w, y); ctx.lineTo(x + w, y + tk);
        // BL
        ctx.moveTo(x, y + h - tk); ctx.lineTo(x, y + h); ctx.lineTo(x + tk, y + h);
        // BR
        ctx.moveTo(x + w - tk, y + h); ctx.lineTo(x + w, y + h); ctx.lineTo(x + w, y + h - tk);
        ctx.strokeStyle = "#00FF5A";
        ctx.lineWidth = 1;
        ctx.stroke();

        // ID label
        if (w > 20) {
          ctx.fillStyle = "rgba(0,200,76,0.85)";
          ctx.fillRect(x, y - 13, 28, 12);
          ctx.fillStyle = "#000";
          ctx.font = "bold 8px monospace";
          ctx.fillText(`P${i + 1}`, x + 3, y - 3);
        }
      });

      // Count overlay (top-left)
      const label = `${personsRef.current.length} PERSONS`;
      ctx.fillStyle = "rgba(0,0,0,0.65)";
      ctx.fillRect(6, 6, label.length * 6.5 + 10, 18);
      ctx.fillStyle = "#00C84C";
      ctx.font = "bold 10px monospace";
      ctx.fillText(label, 11, 19);

      rafRef.current = requestAnimationFrame(draw);
    };
    rafRef.current = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(rafRef.current);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const p1 = zones["P1"];
  const density = p1?.density ?? 0;
  const color   = BORDER_MAP[p1?.color ?? "green"];
  const count   = p1?.count ?? 0;

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", minHeight: 0 }}>
      {/* Split panels */}
      <div style={{ flex: 1, minHeight: 0, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 4 }}>

        {/* Left: Raw feed */}
        <div style={{ display: "flex", flexDirection: "column", minHeight: 0 }}>
          <div style={{
            ...M, fontSize: 9, color: "#2C4060", letterSpacing: "0.12em",
            padding: "3px 8px", background: "#080C14", borderBottom: "1px solid #0E1E30",
            flexShrink: 0,
          }}>
            ▌ RAW CCTV — {source === "aerial" ? "AERIAL VIEW" : "PLATFORM CAM"}
          </div>
          <div style={{ flex: 1, minHeight: 0, position: "relative", background: "#06080E" }}>
            {/* Always rendered — display:none prevents canplay in some browsers */}
            <video
              ref={videoRef}
              src={videoSrc}
              autoPlay loop muted playsInline
              style={{ width: "100%", height: "100%", objectFit: "cover", position: "absolute", inset: 0 }}
            />
            {/* Overlay hides black frame until playback confirmed */}
            {!hasVideo && (
              <div style={{
                position: "absolute", inset: 0, background: "#06080E", zIndex: 2,
                display: "flex", alignItems: "center", justifyContent: "center",
              }}>
                <motion.div
                  animate={{ opacity: [0.4, 1, 0.4] }}
                  transition={{ duration: 1.4, repeat: Infinity }}
                  style={{ ...M, fontSize: 10, color: "#1A3050", letterSpacing: "0.1em" }}
                >
                  LOADING FEED...
                </motion.div>
              </div>
            )}
            {/* LIVE badge */}
            <div style={{
              position: "absolute", top: 8, left: 8,
              display: "flex", alignItems: "center", gap: 5,
            }}>
              <motion.div
                style={{ width: 6, height: 6, borderRadius: "50%", background: "#E82020" }}
                animate={{ opacity: [1, 0.2, 1] }}
                transition={{ duration: 1, repeat: Infinity }}
              />
              <span style={{ ...M, fontSize: 9, color: "#E82020", letterSpacing: "0.1em" }}>LIVE</span>
            </div>
          </div>
        </div>

        {/* Right: AI Tracking */}
        <div style={{ display: "flex", flexDirection: "column", minHeight: 0 }}>
          <div style={{
            ...M, fontSize: 9, letterSpacing: "0.12em",
            padding: "3px 8px", background: "#06100A", borderBottom: "1px solid #00C84C20",
            flexShrink: 0, display: "flex", alignItems: "center", gap: 8,
          }}>
            <span style={{ color: "#00C84C60" }}>▌ AI TRACKING — YOLOv8m + SAHI</span>
            <span style={{ marginLeft: "auto", color: "#00C84C40" }}>{persons.length} DET</span>
          </div>
          <div style={{ flex: 1, minHeight: 0, position: "relative", background: "#030806" }}>
            {/* Canvas always rendered so RAF can draw as soon as video is ready */}
            <canvas
              ref={canvasRef}
              width={640} height={480}
              style={{ width: "100%", height: "100%", display: "block" }}
            />

            {/* Loading overlay while pipeline warms up */}
            {loading && (
              <div style={{
                position: "absolute", inset: 0, background: "rgba(3,8,6,0.85)",
                display: "flex", flexDirection: "column",
                alignItems: "center", justifyContent: "center", gap: 10,
              }}>
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ duration: 1.2, repeat: Infinity, ease: "linear" }}
                  style={{
                    width: 22, height: 22,
                    border: "2px solid #0A2010",
                    borderTop: "2px solid #00C84C",
                    borderRadius: "50%",
                  }}
                />
                <span style={{ ...M, fontSize: 10, color: "#00C84C80", letterSpacing: "0.12em" }}>
                  LOADING MODEL...
                </span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Stats bar */}
      <div style={{
        flexShrink: 0,
        display: "flex", alignItems: "center", gap: 0,
        background: "#080C14", borderTop: "1px solid #0E1E30",
        ...M, fontSize: 10,
      }}>
        <StatCell label="PERSONS" value={String(count)} color={color} />
        <StatCell label="DENSITY" value={`${density.toFixed(2)}/m²`} color={color} />
        <StatCell label="STATUS" value={p1?.color?.toUpperCase() ?? "—"} color={color} />
        <StatCell label="SOURCE" value={source.toUpperCase()} color="#4A6A84" />
        <StatCell label="MODEL" value="YOLOv8m" color="#2C4060" />
      </div>
    </div>
  );
}

function StatCell({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div style={{
      padding: "5px 14px", borderRight: "1px solid #0E1E30",
      display: "flex", flexDirection: "column", gap: 2,
    }}>
      <span style={{ fontSize: 8, color: "#1A3050", letterSpacing: "0.1em" }}>{label}</span>
      <span style={{ fontSize: 12, color, letterSpacing: "0.06em" }}>{value}</span>
    </div>
  );
}
