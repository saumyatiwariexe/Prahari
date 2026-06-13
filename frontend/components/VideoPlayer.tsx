"use client";
import { useRef, useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import type { PersonBbox } from "@/lib/types";

interface Props {
  critical: boolean;
  videoSrc?: string;
  persons?: PersonBbox[];
  showTracking?: boolean;
}

const M: React.CSSProperties = { fontFamily: "'Share Tech Mono', monospace" };

export default function VideoPlayer({
  critical,
  videoSrc = "/videos/platform.webm",
  persons = [],
  showTracking = false,
}: Props) {
  const videoRef   = useRef<HTMLVideoElement>(null);
  const canvasRef  = useRef<HTMLCanvasElement>(null);
  const rafRef     = useRef<number>(0);
  const [hasVideo, setHasVideo] = useState(false);
  const [hidden, setHidden]     = useState(false);

  // Load video
  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;
    const onCanPlay = () => setHasVideo(true);
    const onError   = () => setHasVideo(false);
    v.addEventListener("canplay", onCanPlay);
    v.addEventListener("error", onError);
    v.load();
    return () => {
      v.removeEventListener("canplay", onCanPlay);
      v.removeEventListener("error", onError);
    };
  }, [videoSrc]);

  // Playback speed
  useEffect(() => {
    if (!videoRef.current || !hasVideo) return;
    videoRef.current.playbackRate = critical ? 1.4 : 1.0;
  }, [critical, hasVideo]);

  // RAF loop: mirror video to canvas + draw bboxes
  useEffect(() => {
    if (!showTracking) {
      cancelAnimationFrame(rafRef.current);
      return;
    }
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

      // Subtle green tint for AI view
      ctx.fillStyle = "rgba(0,200,76,0.04)";
      ctx.fillRect(0, 0, W, H);

      // Draw person bounding boxes
      ctx.lineWidth = 1.2;
      for (const p of persons) {
        const x = p.x1 * W;
        const y = p.y1 * H;
        const w = (p.x2 - p.x1) * W;
        const h = (p.y2 - p.y1) * H;
        ctx.strokeStyle = "#00C84C";
        ctx.strokeRect(x, y, w, h);
        // Small corner marks
        ctx.fillStyle = "#00C84C";
        ctx.fillRect(x, y, 3, 1);
        ctx.fillRect(x, y, 1, 3);
        ctx.fillRect(x + w - 3, y, 3, 1);
        ctx.fillRect(x + w - 1, y, 1, 3);
      }

      // Person count overlay
      if (persons.length > 0) {
        ctx.fillStyle = "rgba(0,200,76,0.8)";
        ctx.fillRect(4, 4, 56, 14);
        ctx.fillStyle = "#000";
        ctx.font = "bold 8px monospace";
        ctx.fillText(`${persons.length} PERSONS`, 7, 14);
      }

      rafRef.current = requestAnimationFrame(draw);
    };
    rafRef.current = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(rafRef.current);
  }, [showTracking, persons]);

  if (hidden) {
    return (
      <button
        onClick={() => setHidden(false)}
        style={{
          ...M,
          position: "fixed", bottom: 16, left: 16, zIndex: 40,
          height: 26, padding: "0 12px", fontSize: 10,
          background: "#080C14", color: "#4A6A84",
          border: "1px solid #142035", cursor: "pointer", letterSpacing: "0.08em",
        }}
      >
        SHOW CCTV
      </button>
    );
  }

  const trackingWidth = 480;
  const normalWidth   = 220;
  const widgetWidth   = showTracking ? trackingWidth : normalWidth;

  return (
    <motion.div
      style={{ position: "fixed", bottom: 16, left: 16, zIndex: 40 }}
      animate={{ width: widgetWidth }}
      transition={{ type: "spring", stiffness: 180, damping: 22 }}
    >
      <div style={{
        background: "#06080E",
        border: critical
          ? "1px solid #E82020"
          : showTracking ? "1px solid #00C84C40" : "1px solid #142035",
        overflow: "hidden",
        position: "relative",
      }}>
        {/* Critical pulse */}
        <AnimatePresence>
          {critical && (
            <motion.div
              style={{
                position: "absolute", inset: 0,
                border: "1px solid #E82020", pointerEvents: "none", zIndex: 10,
              }}
              animate={{ opacity: [1, 0.2, 1] }}
              transition={{ duration: 0.7, repeat: Infinity }}
            />
          )}
        </AnimatePresence>

        {/* Header */}
        <div style={{
          ...M,
          display: "flex", alignItems: "center", gap: 6,
          padding: "4px 8px",
          background: "#080C14", borderBottom: "1px solid #0E1E30",
        }}>
          <motion.div
            style={{
              width: 6, height: 6, borderRadius: "50%",
              background: hasVideo ? "#E82020" : "#2C4060",
            }}
            animate={hasVideo ? { opacity: [1, 0.3, 1] } : {}}
            transition={{ duration: 1, repeat: Infinity }}
          />
          <span style={{ fontSize: 10, color: "#4A6A84", letterSpacing: "0.1em" }}>
            {showTracking ? "CCTV · AI TRACK" : "LIVE CCTV"}
          </span>
          {critical && (
            <motion.span
              style={{ fontSize: 9, color: "#E82020", letterSpacing: "0.06em" }}
              animate={{ opacity: [1, 0.3, 1] }}
              transition={{ duration: 0.5, repeat: Infinity }}
            >
              ⚠ HIGH DENSITY
            </motion.span>
          )}
          <button
            onClick={() => setHidden(true)}
            style={{
              ...M, marginLeft: "auto",
              background: "none", border: "none", cursor: "pointer",
              fontSize: 10, color: "#2C4060", padding: "0 2px",
            }}
          >
            ✕
          </button>
        </div>

        {/* Body */}
        {showTracking ? (
          // Split view: raw | tracking
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 0 }}>
            {/* Left: raw video */}
            <div style={{ position: "relative" }}>
              <div style={{
                ...M,
                fontSize: 8, color: "#2C4060", letterSpacing: "0.1em",
                padding: "2px 6px", background: "#080C14",
                borderBottom: "1px solid #0E1E30", borderRight: "1px solid #0E1E30",
              }}>
                RAW FEED
              </div>
              <div style={{ position: "relative", aspectRatio: "16/9" }}>
                <video
                  ref={videoRef}
                  src={videoSrc}
                  autoPlay loop muted playsInline
                  style={{
                    width: "100%", height: "100%", objectFit: "cover",
                    display: hasVideo ? "block" : "none",
                    borderRight: "1px solid #0E1E30",
                  }}
                />
                {!hasVideo && <PlaceholderDots critical={critical} />}
              </div>
            </div>

            {/* Right: tracking canvas */}
            <div style={{ position: "relative" }}>
              <div style={{
                ...M,
                fontSize: 8, color: "#00C84C60", letterSpacing: "0.1em",
                padding: "2px 6px", background: "#06100A",
                borderBottom: "1px solid #00C84C20",
              }}>
                AI TRACKING
              </div>
              <div style={{ position: "relative", aspectRatio: "16/9" }}>
                {hasVideo ? (
                  <canvas
                    ref={canvasRef}
                    width={240} height={135}
                    style={{ width: "100%", height: "100%", display: "block" }}
                  />
                ) : (
                  <PlaceholderDots critical={false} />
                )}
              </div>
            </div>
          </div>
        ) : (
          // Normal single video view
          <div style={{ position: "relative", aspectRatio: "16/9" }}>
            <video
              ref={videoRef}
              src={videoSrc}
              autoPlay loop muted playsInline
              style={{
                width: "100%", height: "100%", objectFit: "cover",
                display: hasVideo ? "block" : "none",
              }}
            />
            {!hasVideo && <PlaceholderDots critical={critical} />}
            {critical && (
              <div style={{
                position: "absolute", top: 4, right: 4,
                background: "rgba(232,32,32,0.8)", border: "1px solid #E82020",
                padding: "1px 6px",
              }}>
                <span style={{ ...M, fontSize: 9, color: "#FFB0B0" }}>CRITICAL</span>
              </div>
            )}
          </div>
        )}

        {/* Footer */}
        <div style={{
          ...M,
          padding: "3px 8px",
          background: "#080C14", borderTop: "1px solid #0E1E30",
          display: "flex", alignItems: "center", justifyContent: "space-between",
        }}>
          <span style={{ fontSize: 9, color: "#2C4060", letterSpacing: "0.06em" }}>
            {showTracking ? `${persons.length} DETECTED` : "FOB-3 · PIP"}
          </span>
          <span style={{ fontSize: 9, color: "#1A3050" }}>
            {showTracking ? "YOLO+SAHI" : "CCTV"}
          </span>
        </div>
      </div>
    </motion.div>
  );
}

function PlaceholderDots({ critical }: { critical: boolean }) {
  return (
    <div style={{
      position: "absolute", inset: 0,
      background: "#06080E",
      display: "flex", alignItems: "center", justifyContent: "center",
    }}>
      <span style={{
        fontFamily: "'Share Tech Mono', monospace",
        fontSize: 9, color: "#1A3050", letterSpacing: "0.08em",
      }}>
        NO SIGNAL
      </span>
    </div>
  );
}
