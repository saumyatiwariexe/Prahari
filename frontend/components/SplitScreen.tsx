"use client";
import { motion, AnimatePresence } from "framer-motion";
import type { LiveUpdate } from "@/lib/types";
import StationMap from "./StationMap";

interface Props { data: LiveUpdate | null }

const M: React.CSSProperties = { fontFamily: "'Share Tech Mono', monospace" };

export default function SplitScreen({ data }: Props) {
  if (!data) {
    return (
      <div style={{ ...M, color: "#2C4060", fontSize: 11, letterSpacing: "0.1em",
        display: "flex", alignItems: "center", justifyContent: "center", height: "100%" }}>
        AWAITING SCENARIO DATA...
      </div>
    );
  }

  const { elapsed } = data;
  const cgL1Fired     = data.crowdguard.l1_fired;
  const crushOccurred = data.human.crush_occurred;
  const humanResponded = data.human.human_responded;

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", gap: 6 }}>

      <div style={{ flex: 1, minHeight: 0, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6 }}>

        {/* Human-operated */}
        <div style={{
          display: "flex", flexDirection: "column",
          background: "#080C14",
          border: `1px solid ${crushOccurred ? "#E82020" : "#142035"}`,
          position: "relative",
        }}>
          <div style={{
            ...M,
            display: "flex", alignItems: "center", gap: 8,
            padding: "5px 10px", borderBottom: "1px solid #1A0808",
            background: "#0C0808", flexShrink: 0,
          }}>
            <motion.div
              animate={{ opacity: [1, 0.3, 1] }}
              transition={{ duration: 0.9, repeat: Infinity }}
              style={{ width: 7, height: 7, borderRadius: "50%", background: "#E82020" }}
            />
            <span style={{ fontSize: 11, color: "#E82020", letterSpacing: "0.12em" }}>
              HUMAN-OPERATED STATION
            </span>
            <span style={{ fontSize: 10, color: "#2C4060", marginLeft: "auto" }}>CURRENT SYSTEM</span>
          </div>

          <div className="scrollbar-thin" style={{ flex: 1, padding: 6, position: "relative", minHeight: 0, overflowY: "auto" }}>
            <StationMap zones={data.human.zones} compact />

            {!crushOccurred && !humanResponded && elapsed > 30 && (
              <div style={{ position: "absolute", bottom: 14, left: 0, right: 0,
                display: "flex", justifyContent: "center", pointerEvents: "none" }}>
                <motion.div
                  animate={{ opacity: [0.5, 1, 0.5] }}
                  transition={{ duration: 1.5, repeat: Infinity }}
                  style={{
                    ...M,
                    background: "#080C14", border: "1px solid #1A3050",
                    padding: "3px 12px", fontSize: 10, color: "#4A6A84", letterSpacing: "0.1em",
                  }}>
                  ⏳ AWAITING OPERATOR RESPONSE
                </motion.div>
              </div>
            )}

            <AnimatePresence>
              {crushOccurred && (
                <motion.div
                  initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                  style={{
                    position: "absolute", inset: 0,
                    background: "rgba(180,0,0,0.5)",
                    display: "flex", alignItems: "center", justifyContent: "center",
                  }}>
                  <motion.div
                    animate={{ scale: [1, 1.03, 1] }}
                    transition={{ duration: 0.6, repeat: Infinity }}
                    style={{ textAlign: "center", ...M }}>
                    <div style={{ fontSize: 36, marginBottom: 6 }}>⚠</div>
                    <div style={{ color: "#FF4040", fontSize: 18, fontWeight: "bold", letterSpacing: "0.2em" }}>
                      CRUSH EVENT
                    </div>
                    <div style={{ color: "#E87070", fontSize: 11, marginTop: 4, letterSpacing: "0.1em" }}>
                      FOB-3 STAIRWAY (PF 14/15) — 18 DEAD · 15 INJURED
                    </div>
                    <div style={{ color: "#994040", fontSize: 10, marginTop: 6, letterSpacing: "0.08em" }}>
                      NDLS · FEB 15 2025 · 20:48 IST
                    </div>
                    {humanResponded && (
                      <div style={{ color: "#8A4040", fontSize: 10, marginTop: 10,
                        borderTop: "1px solid #5A1010", paddingTop: 8, letterSpacing: "0.08em" }}>
                        FIRE TENDERS ARRIVED +112 MIN AFTER INCIDENT
                      </div>
                    )}
                  </motion.div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>

        {/* Prahari autonomous */}
        <div style={{
          display: "flex", flexDirection: "column",
          background: "#080C14",
          border: `1px solid ${cgL1Fired ? "#00C84C" : "#142035"}`,
          position: "relative",
        }}>
          <div style={{
            ...M,
            display: "flex", alignItems: "center", gap: 8,
            padding: "5px 10px", borderBottom: "1px solid #001A08",
            background: "#06100A", flexShrink: 0,
          }}>
            <motion.div
              animate={{ opacity: [1, 0.4, 1] }}
              transition={{ duration: 1.2, repeat: Infinity }}
              style={{ width: 7, height: 7, borderRadius: "50%", background: "#00C84C" }}
            />
            <span style={{ fontSize: 11, color: "#00C84C", letterSpacing: "0.12em" }}>
              PRAHARI — AUTONOMOUS AI
            </span>
            <span style={{ fontSize: 10, color: "#2C4060", marginLeft: "auto" }}>AI-OPERATED</span>
          </div>

          <div className="scrollbar-thin" style={{ flex: 1, padding: 6, position: "relative", minHeight: 0, overflowY: "auto" }}>
            <StationMap
              zones={data.crowdguard.zones}
              predictions={data.crowdguard.predictions}
              showPredictions compact
            />

            <AnimatePresence>
              {cgL1Fired && (
                <motion.div
                  initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
                  style={{ position: "absolute", bottom: 10, left: 0, right: 0,
                    display: "flex", justifyContent: "center" }}>
                  <div style={{
                    ...M,
                    background: "#001A08", border: "1px solid #00C84C",
                    padding: "4px 14px", fontSize: 10, color: "#00C84C", letterSpacing: "0.12em",
                  }}>
                    ✓ L1 ALERT · FOB-3 SEALED · CROWD DIVERTED
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            <AnimatePresence>
              {cgL1Fired && elapsed > 150 && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                  style={{
                    position: "absolute", top: 8, right: 8,
                    ...M,
                    background: "#001A08", border: "1px solid #00C84C",
                    padding: "3px 10px", fontSize: 10, color: "#00C84C", letterSpacing: "0.1em",
                  }}>
                  INCIDENT AVERTED
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>

      {/* Comparison stat bar */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6, flexShrink: 0 }}>
        <StatBar
          label="HUMAN RESPONSE TIME"
          value={humanResponded ? "4m 12s" : "——"}
          outcome={crushOccurred ? "CRUSH OCCURRED" : "MONITORING..."}
          valueColor="#E82020"
          outcomeColor={crushOccurred ? "#E82020" : "#2C4060"}
        />
        <StatBar
          label="PRAHARI RESPONSE"
          value={cgL1Fired ? "2.3s" : "——"}
          outcome={cgL1Fired && elapsed > 150 ? "CRUSH PREVENTED" : "MONITORING..."}
          valueColor="#00C84C"
          outcomeColor={cgL1Fired && elapsed > 150 ? "#00C84C" : "#2C4060"}
        />
      </div>
    </div>
  );
}

function StatBar({ label, value, outcome, valueColor, outcomeColor }: {
  label: string; value: string; outcome: string;
  valueColor: string; outcomeColor: string;
}) {
  return (
    <div style={{
      ...M,
      background: "#080C14", border: "1px solid #142035",
      padding: "8px 12px",
      display: "flex", alignItems: "center", justifyContent: "space-between",
    }}>
      <div>
        <div style={{ color: "#2C4060", fontSize: 9, letterSpacing: "0.1em", marginBottom: 3 }}>{label}</div>
        <div style={{ color: valueColor, fontSize: 22, fontWeight: "bold" }}>{value}</div>
      </div>
      <div style={{ color: outcomeColor, fontSize: 10, letterSpacing: "0.08em" }}>{outcome}</div>
    </div>
  );
}
