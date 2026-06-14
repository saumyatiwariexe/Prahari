"use client";
import { useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import type { Intervention } from "@/lib/types";

const M: React.CSSProperties = { fontFamily: "'Share Tech Mono', monospace" };

const SERVICES = [
  { label: "RPF",            detail: "Railway Protection Force deployed" },
  { label: "POLICE 100",     detail: "Delhi Police Emergency Control notified" },
  { label: "FIRE 101",       detail: "Delhi Fire Service dispatched" },
  { label: "AMBULANCE 108",  detail: "National Emergency Ambulance dispatched" },
];

interface Props {
  active: boolean;
  sosIntervention?: Intervention;
  onDismiss?: () => void;
}

export default function EmergencyOverlay({ active, sosIntervention, onDismiss }: Props) {
  // Auto-dismiss after 10s so it doesn't block the rest of the demo
  useEffect(() => {
    if (!active) return;
    const t = setTimeout(() => onDismiss?.(), 10000);
    return () => clearTimeout(t);
  }, [active, onDismiss]);

  return (
    <AnimatePresence>
      {active && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.25 }}
          style={{
            position: "fixed", inset: 0, zIndex: 100,
            background: "rgba(6,4,4,0.92)",
            display: "flex", alignItems: "center", justifyContent: "center",
          }}
        >
          {/* Pulsing border */}
          <motion.div
            style={{
              position: "absolute", inset: 0,
              border: "3px solid #FF1A1A",
              pointerEvents: "none",
            }}
            animate={{ opacity: [1, 0.2, 1] }}
            transition={{ duration: 0.6, repeat: Infinity }}
          />

          <div style={{
            ...M,
            width: 520, maxWidth: "calc(100vw - 40px)",
            background: "#0A0404",
            border: "1px solid #FF1A1A",
            padding: "28px 32px",
          }}>
            {/* Header */}
            <motion.div
              animate={{ opacity: [1, 0.4, 1] }}
              transition={{ duration: 0.8, repeat: Infinity }}
              style={{
                fontSize: 11, color: "#FF1A1A", letterSpacing: "0.2em",
                marginBottom: 6,
              }}
            >
              ⚠ FAILSAFE ACTIVATED ⚠
            </motion.div>

            <div style={{
              fontSize: 24, fontWeight: 700, color: "#FF4040",
              letterSpacing: "0.1em", marginBottom: 4,
            }}>
              EMERGENCY DISPATCH
            </div>

            {/* Zone + density */}
            {sosIntervention && (
              <div style={{ fontSize: 11, color: "#8AB4D4", marginBottom: 20, lineHeight: 1.6 }}>
                <span style={{ color: "#FF6B00" }}>ZONE:</span>{" "}
                {sosIntervention.zone}
                {"  "}
                <span style={{ color: "#FF6B00" }}>TRIGGER:</span>{" "}
                {sosIntervention.trigger}
              </div>
            )}

            {/* Divider */}
            <div style={{ height: 1, background: "#2A0808", marginBottom: 20 }} />

            {/* Services */}
            <div style={{ display: "flex", flexDirection: "column", gap: 12, marginBottom: 24 }}>
              {SERVICES.map((svc, i) => (
                <motion.div
                  key={svc.label}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.12, duration: 0.2 }}
                  style={{
                    display: "flex", alignItems: "center", gap: 12,
                    padding: "8px 12px",
                    background: "rgba(255,26,26,0.06)",
                    border: "1px solid #2A0808",
                  }}
                >
                  <motion.div
                    animate={{ opacity: [1, 0.4, 1] }}
                    transition={{ duration: 1.2, repeat: Infinity, delay: i * 0.3 }}
                    style={{
                      width: 8, height: 8, borderRadius: "50%",
                      background: "#FF1A1A", flexShrink: 0,
                    }}
                  />
                  <span style={{ fontSize: 12, color: "#FF4040", letterSpacing: "0.12em", width: 130 }}>
                    {svc.label}
                  </span>
                  <span style={{ fontSize: 10, color: "#6A3030", letterSpacing: "0.04em" }}>
                    {svc.detail}
                  </span>
                  <span style={{ marginLeft: "auto", fontSize: 10, color: "#00C84C", letterSpacing: "0.08em" }}>
                    ✓ SENT
                  </span>
                </motion.div>
              ))}
            </div>

            {/* Dismiss */}
            <button
              onClick={onDismiss}
              style={{
                ...M,
                width: "100%", padding: "8px 0", fontSize: 11, cursor: "pointer",
                background: "transparent", color: "#4A2020",
                border: "1px solid #2A0808", letterSpacing: "0.1em",
              }}
            >
              ACKNOWLEDGE — DISMISS OVERLAY
            </button>

            <div style={{
              marginTop: 12, fontSize: 9, color: "#2A0808",
              letterSpacing: "0.08em", textAlign: "center",
            }}>
              [SIMULATED] — DEMO ENVIRONMENT — NOT CONNECTED TO LIVE SERVICES
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
