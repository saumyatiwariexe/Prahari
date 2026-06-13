"use client";
import { motion, AnimatePresence } from "framer-motion";
import type { LiveUpdate } from "@/lib/types";
import StationMap from "./StationMap";

interface Props { data: LiveUpdate | null }

export default function SplitScreen({ data }: Props) {
  if (!data) {
    return (
      <div style={{
        color: "#475569", fontSize: 14,
        display: "flex", alignItems: "center", justifyContent: "center", height: "100%",
      }}>
        Waiting for scenario data…
      </div>
    );
  }

  const { elapsed } = data;
  const cgL1Fired    = data.crowdguard.l1_fired;
  const crushOccurred = data.human.crush_occurred;
  const humanResponded = data.human.human_responded;

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", gap: 8 }}>

      {/* ── Panels ── */}
      <div style={{ flex: 1, minHeight: 0, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>

        {/* Left: Human-operated */}
        <div style={{
          display: "flex", flexDirection: "column",
          background: "#0D1117",
          border: `1px solid ${crushOccurred ? "#EF4444" : "#21262D"}`,
          borderRadius: 8,
          overflow: "hidden", position: "relative",
        }}>
          <div style={{
            display: "flex", alignItems: "center", gap: 8,
            padding: "10px 14px", borderBottom: "1px solid #21262D",
            background: "#161B22", flexShrink: 0,
          }}>
            <motion.div
              animate={{ opacity: [1, 0.3, 1] }}
              transition={{ duration: 0.9, repeat: Infinity }}
              style={{ width: 8, height: 8, borderRadius: "50%", background: "#EF4444" }}
            />
            <span style={{ fontSize: 13, fontWeight: 700, color: "#EF4444" }}>
              Human-Operated
            </span>
            <span style={{ fontSize: 12, color: "#475569", marginLeft: "auto" }}>
              Current System
            </span>
          </div>

          <div style={{ flex: 1, padding: 10, position: "relative", minHeight: 0 }}>
            <StationMap zones={data.human.zones} compact />

            {/* Awaiting operator */}
            {!crushOccurred && !humanResponded && elapsed > 30 && (
              <div style={{
                position: "absolute", bottom: 16, left: 0, right: 0,
                display: "flex", justifyContent: "center", pointerEvents: "none",
              }}>
                <motion.div
                  animate={{ opacity: [0.5, 1, 0.5] }}
                  transition={{ duration: 1.5, repeat: Infinity }}
                  style={{
                    background: "#161B22", border: "1px solid #21262D",
                    padding: "6px 14px", borderRadius: 6,
                    fontSize: 12, color: "#64748B",
                  }}
                >
                  Awaiting operator response…
                </motion.div>
              </div>
            )}

            {/* CRUSH EVENT overlay */}
            <AnimatePresence>
              {crushOccurred && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  style={{
                    position: "absolute", inset: 0,
                    background: "rgba(180,0,0,0.5)",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    borderRadius: 6,
                  }}
                >
                  <motion.div
                    animate={{ scale: [1, 1.03, 1] }}
                    transition={{ duration: 0.6, repeat: Infinity }}
                    style={{ textAlign: "center" }}
                  >
                    <div style={{ fontSize: 40, marginBottom: 8 }}>⚠</div>
                    <div style={{ color: "#FF4040", fontSize: 22, fontWeight: 800, letterSpacing: "0.05em" }}>
                      CRUSH EVENT
                    </div>
                    <div style={{ color: "#E87070", fontSize: 13, marginTop: 6 }}>
                      FOB-1 density critical — response delayed
                    </div>
                    {humanResponded && (
                      <div style={{
                        color: "#9A5050", fontSize: 12, marginTop: 12,
                        borderTop: "1px solid #5A1010", paddingTop: 10,
                      }}>
                        Operator responded at 4m 12s — Too late
                      </div>
                    )}
                  </motion.div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>

        {/* Right: Prahari autonomous */}
        <div style={{
          display: "flex", flexDirection: "column",
          background: "#0D1117",
          border: `1px solid ${cgL1Fired ? "#22C55E" : "#21262D"}`,
          borderRadius: 8,
          overflow: "hidden", position: "relative",
        }}>
          <div style={{
            display: "flex", alignItems: "center", gap: 8,
            padding: "10px 14px", borderBottom: "1px solid #21262D",
            background: "#161B22", flexShrink: 0,
          }}>
            <motion.div
              animate={{ opacity: [1, 0.4, 1] }}
              transition={{ duration: 1.2, repeat: Infinity }}
              style={{ width: 8, height: 8, borderRadius: "50%", background: "#22C55E" }}
            />
            <span style={{ fontSize: 13, fontWeight: 700, color: "#22C55E" }}>
              Prahari — Autonomous
            </span>
            <span style={{ fontSize: 12, color: "#475569", marginLeft: "auto" }}>
              AI-Operated
            </span>
          </div>

          <div style={{ flex: 1, padding: 10, position: "relative", minHeight: 0 }}>
            <StationMap
              zones={data.crowdguard.zones}
              predictions={data.crowdguard.predictions}
              showPredictions compact
            />

            {/* L1 fired badge */}
            <AnimatePresence>
              {cgL1Fired && (
                <motion.div
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  style={{
                    position: "absolute", bottom: 12, left: 0, right: 0,
                    display: "flex", justifyContent: "center",
                  }}
                >
                  <div style={{
                    background: "rgba(34,197,94,0.1)", border: "1px solid #22C55E",
                    padding: "6px 16px", borderRadius: 6,
                    fontSize: 13, fontWeight: 600, color: "#22C55E",
                  }}>
                    L1 fired · PA-01 issued · 2.3s response
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Incident averted */}
            <AnimatePresence>
              {cgL1Fired && elapsed > 150 && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  style={{
                    position: "absolute", top: 10, right: 10,
                    background: "rgba(34,197,94,0.1)", border: "1px solid #22C55E",
                    padding: "4px 10px", borderRadius: 4,
                    fontSize: 12, fontWeight: 600, color: "#22C55E",
                  }}
                >
                  Incident Averted
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>

      {/* ── Comparison bar ── */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, flexShrink: 0 }}>
        <StatCard
          label="Human Response Time"
          value={humanResponded ? "4m 12s" : "——"}
          outcome={crushOccurred ? "Crush Occurred" : "Monitoring…"}
          valueColor="#EF4444"
          outcomeOk={!crushOccurred}
        />
        <StatCard
          label="Prahari Response"
          value={cgL1Fired ? "2.3s" : "——"}
          outcome={cgL1Fired && elapsed > 150 ? "Crush Prevented" : "Monitoring…"}
          valueColor="#22C55E"
          outcomeOk={cgL1Fired && elapsed > 150}
        />
      </div>
    </div>
  );
}

function StatCard({ label, value, outcome, valueColor, outcomeOk }: {
  label: string; value: string; outcome: string;
  valueColor: string; outcomeOk: boolean;
}) {
  return (
    <div style={{
      background: "#161B22", border: "1px solid #21262D",
      borderRadius: 8, padding: "12px 16px",
      display: "flex", alignItems: "center", justifyContent: "space-between",
    }}>
      <div>
        <div style={{ fontSize: 12, color: "#64748B", marginBottom: 4 }}>{label}</div>
        <div style={{
          fontSize: 24, fontWeight: 800, color: valueColor,
          fontFamily: "JetBrains Mono, monospace",
        }}>
          {value}
        </div>
      </div>
      <div style={{
        fontSize: 13, fontWeight: 600,
        color: outcomeOk ? "#22C55E" : value === "——" ? "#475569" : "#EF4444",
      }}>
        {outcome}
      </div>
    </div>
  );
}
