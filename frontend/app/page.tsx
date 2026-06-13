"use client";
import { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useLiveData } from "@/lib/websocket";
import { API_URL, ZONE_META, BORDER_MAP } from "@/lib/constants";
import StationMap from "@/components/StationMap";
import InterventionFeed from "@/components/InterventionFeed";
import ZoneChart from "@/components/ZoneChart";
import SplitScreen from "@/components/SplitScreen";
import PAAnnouncementBanner from "@/components/PAAnnouncementBanner";
import PhoneNotification from "@/components/PhoneNotification";
import RPFAlert from "@/components/RPFAlert";
import VideoPlayer from "@/components/VideoPlayer";
import type { GateState } from "@/components/GateStatusOverlay";
import type { Intervention } from "@/lib/types";

type View = "dashboard" | "split";

const STATUS_COLOR: Record<string, string> = {
  normal:     "#22C55E",
  monitoring: "#3B82F6",
  active:     "#F59E0B",
  critical:   "#EF4444",
};
const STATUS_LABEL: Record<string, string> = {
  normal: "Normal", monitoring: "Monitoring", active: "Active", critical: "Critical",
};

export default function Home() {
  const { data, connected } = useLiveData();
  const [view, setView]     = useState<View>("dashboard");
  const [historyMap, setHistoryMap] = useState<Record<string, number[]>>({});
  const [clock, setClock]   = useState("");
  const [liveMode, setLiveMode] = useState<"scenario" | "platform" | "aerial">("scenario");

  const [paMessage, setPaMessage]   = useState<{ message: string; zone: string } | null>(null);
  const [phoneNotif, setPhoneNotif] = useState<{ title: string; body: string; level: string } | null>(null);
  const paShownIds    = useRef<Set<string>>(new Set());
  const phoneShownIds = useRef<Set<string>>(new Set());

  // Rolling density history for sparklines
  useEffect(() => {
    if (!data?.crowdguard.zones) return;
    setHistoryMap(prev => {
      const next = { ...prev };
      for (const [zoneId, state] of Object.entries(data.crowdguard.zones)) {
        const arr = next[zoneId] ?? [];
        next[zoneId] = [...arr, state.density].slice(-30);
      }
      return next;
    });
  }, [data]);

  // PA banner — fire once per L1 intervention
  useEffect(() => {
    const ivs = data?.interventions;
    if (!ivs) return;
    for (const iv of ivs) {
      if (iv.level !== 1) continue;
      if (paShownIds.current.has(iv.id)) continue;
      const colonIdx = iv.action.indexOf(': "');
      const msg = colonIdx >= 0 ? iv.action.slice(colonIdx + 3).replace(/"$/, "") : iv.action;
      setPaMessage({ message: msg, zone: iv.zone });
      paShownIds.current.add(iv.id);
      break;
    }
  }, [data?.interventions]);

  // Phone notification — L2 RPF or L3
  useEffect(() => {
    const ivs = data?.interventions;
    if (!ivs) return;
    for (const iv of ivs) {
      const isRpf = iv.level === 2 && iv.action.toLowerCase().includes("rpf");
      const isL3  = iv.level === 3;
      if (!isRpf && !isL3) continue;
      if (phoneShownIds.current.has(iv.id)) continue;
      setPhoneNotif({
        title: isL3 ? "CRITICAL — Confirm Required" : "RPF Dispatch Sent",
        body:  isL3
          ? `${iv.zone}: ${iv.action.split(".")[0]}`
          : `Booth-3 notified for ${iv.zone}. ${iv.action.split(".")[0]}`,
        level: `L${iv.level}`,
      });
      phoneShownIds.current.add(iv.id);
      break;
    }
  }, [data?.interventions]);

  // Clock
  useEffect(() => {
    const tick = () => setClock(new Date().toLocaleTimeString("en-IN", { hour12: false }));
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, []);

  const startDemo = () =>
    fetch(`${API_URL}/demo/start`, { method: "POST" })
      .then(() => setLiveMode("scenario")).catch(() => {});

  const startLive = (source: "platform" | "aerial") =>
    fetch(`${API_URL}/live/start?source=${source}`, { method: "POST" })
      .then(() => {
        setLiveMode(source);
        paShownIds.current.clear();
        phoneShownIds.current.clear();
      }).catch(() => {});

  const confirm = (id: string) =>
    fetch(`${API_URL}/intervention/${id}/confirm`, { method: "POST" }).catch(() => {});
  const cancel  = (id: string) =>
    fetch(`${API_URL}/intervention/${id}/cancel`,  { method: "POST" }).catch(() => {});

  const dismissPA    = useCallback(() => setPaMessage(null),  []);
  const dismissPhone = useCallback(() => setPhoneNotif(null), []);

  const zones            = data?.crowdguard.zones ?? {};
  const status           = data?.system_status ?? "normal";
  const allInterventions: Intervention[] = data?.interventions ?? [];
  const elapsed          = data?.elapsed ?? 0;
  const statusColor      = STATUS_COLOR[status];

  // Derive gate & escalator states
  const gateStates: Record<string, GateState> = {
    GATE_A: "open", GATE_B: "open", GATE_C: "open",
  };
  for (const iv of allInterventions) {
    if (iv.status === "cancelled") continue;
    if (iv.level === 3 && iv.status === "confirmed") {
      if (iv.zone === "FOB1") gateStates["GATE_B"] = "closed";
      if (iv.zone === "CONC") {
        gateStates["GATE_A"] = gateStates["GATE_B"] = gateStates["GATE_C"] = "closed";
      }
    } else if (iv.level === 2 && (iv.status === "staged" || iv.status === "confirmed")) {
      if (iv.zone === "FOB1" && gateStates["GATE_B"] === "open") gateStates["GATE_B"] = "restricted";
      if (iv.zone === "FOB2" && gateStates["GATE_A"] === "open") gateStates["GATE_A"] = "restricted";
    }
  }

  const esc1Reversed = allInterventions.some(
    iv => iv.level === 1 && iv.zone === "P3" && iv.status !== "cancelled"
  );
  const esc2Reversed = allInterventions.some(
    iv => iv.level === 1 && iv.zone === "P4" && iv.status !== "cancelled"
  );
  const rpfActive  = allInterventions.some(
    iv => iv.level === 2 && iv.zone === "CONC" && iv.status !== "cancelled"
  );
  const hasCritical = Object.values(zones).some(z => z.color === "critical");

  return (
    <div className="h-screen w-screen flex flex-col overflow-hidden" style={{ background: "#0D1117" }}>

      {/* ── Header ── */}
      <header style={{
        background: "#161B22",
        borderBottom: "1px solid #21262D",
        height: 52,
        display: "flex",
        alignItems: "center",
        padding: "0 16px",
        gap: 16,
        flexShrink: 0,
      }}>
        {/* Wordmark */}
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{
            width: 28, height: 28,
            background: "#3B82F6",
            borderRadius: 6,
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 11, fontWeight: 800, color: "#fff",
          }}>
            P
          </div>
          <div>
            <div style={{ fontSize: 14, fontWeight: 700, color: "#E2E8F0", lineHeight: 1 }}>
              Prahari
            </div>
            <div style={{ fontSize: 11, color: "#475569", lineHeight: 1, marginTop: 1 }}>
              NDT · New Delhi Terminal
            </div>
          </div>
        </div>

        {/* View tabs */}
        <div style={{ display: "flex", gap: 4, marginLeft: 8 }}>
          {(["dashboard", "split"] as View[]).map(v => (
            <button key={v} onClick={() => setView(v)}
              style={{
                height: 32, padding: "0 14px", fontSize: 13, fontWeight: 500,
                background: view === v ? "#21262D" : "transparent",
                color: view === v ? "#E2E8F0" : "#64748B",
                border: `1px solid ${view === v ? "#30363D" : "transparent"}`,
                borderRadius: 6, cursor: "pointer",
              }}>
              {v === "dashboard" ? "Dashboard" : "Comparison"}
            </button>
          ))}
        </div>

        {/* Spacer */}
        <div style={{ flex: 1 }} />

        {/* Status dot + label */}
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <motion.div
            style={{ width: 8, height: 8, borderRadius: "50%", background: statusColor }}
            animate={{ opacity: [1, 0.3, 1] }}
            transition={{ duration: 1, repeat: Infinity }}
          />
          <span style={{ fontSize: 13, color: statusColor, fontWeight: 500 }}>
            {STATUS_LABEL[status]}
          </span>
        </div>

        <div style={{ width: 1, height: 20, background: "#21262D" }} />

        {/* Elapsed */}
        <span style={{ fontSize: 12, color: "#64748B", fontFamily: "JetBrains Mono, monospace" }}>
          T+{Math.floor(elapsed)}s
        </span>

        {/* Connection */}
        <span style={{ fontSize: 13, color: connected ? "#22C55E" : "#EF4444", fontWeight: 500 }}>
          {connected ? "Live" : "Disconnected"}
        </span>

        {/* Clock */}
        <span style={{
          fontSize: 13, color: "#94A3B8", minWidth: 64, textAlign: "right",
          fontFamily: "JetBrains Mono, monospace",
        }}>
          {clock}
        </span>

        <div style={{ width: 1, height: 20, background: "#21262D" }} />

        {/* Mode buttons */}
        <div style={{ display: "flex", gap: 6 }}>
          <ModeBtn
            label="Demo"
            active={liveMode === "scenario"}
            activeColor="#22C55E"
            onClick={startDemo}
          />
          <ModeBtn
            label="Platform Cam"
            active={liveMode === "platform"}
            activeColor="#F59E0B"
            onClick={() => startLive("platform")}
          />
          <ModeBtn
            label="Aerial Cam"
            active={liveMode === "aerial"}
            activeColor="#F59E0B"
            onClick={() => startLive("aerial")}
          />
        </div>
      </header>

      {/* ── Body ── */}
      <main style={{ flex: 1, minHeight: 0, padding: 10, display: "flex" }}>
        <AnimatePresence mode="wait">
          {view === "dashboard" ? (
            <motion.div key="dashboard"
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              style={{
                flex: 1, display: "grid",
                gridTemplateColumns: "1fr 300px",
                gap: 10,
              }}>

              {/* ── Left column ── */}
              <div style={{ display: "flex", flexDirection: "column", gap: 10, minHeight: 0 }}>

                {/* Zone map */}
                <div style={{
                  flex: 1, minHeight: 0,
                  background: "#161B22",
                  border: "1px solid #21262D",
                  borderRadius: 8,
                  display: "flex", flexDirection: "column", overflow: "hidden",
                }}>
                  <PanelHeader
                    title="Station Map"
                    right={data?.crowdguard.predictions ? "+90s forecast active" : undefined}
                  />
                  <div style={{ flex: 1, minHeight: 0, padding: 10 }}>
                    <StationMap
                      zones={zones}
                      predictions={data?.crowdguard.predictions}
                      showPredictions
                      gateStates={gateStates}
                      esc1Reversed={esc1Reversed}
                      esc2Reversed={esc2Reversed}
                    />
                  </div>
                </div>

                {/* Zone density table */}
                <div style={{
                  background: "#161B22",
                  border: "1px solid #21262D",
                  borderRadius: 8,
                  flexShrink: 0,
                  overflow: "hidden",
                }}>
                  <PanelHeader title="Zone Density — 30s Rolling" />
                  <ZoneChart zones={zones} historyMap={historyMap} />
                </div>
              </div>

              {/* ── Right column ── */}
              <div style={{ display: "flex", flexDirection: "column", gap: 10, minHeight: 0 }}>

                {/* Intervention feed */}
                <div style={{
                  flex: 1, minHeight: 0,
                  background: "#161B22",
                  border: "1px solid #21262D",
                  borderRadius: 8,
                  display: "flex", flexDirection: "column", overflow: "hidden",
                }}>
                  <InterventionFeed
                    interventions={allInterventions}
                    staged={data?.staged}
                    onConfirm={confirm}
                    onCancel={cancel}
                  />
                </div>

                {/* Density forecast */}
                {data?.crowdguard.predictions && (
                  <div style={{
                    background: "#161B22",
                    border: "1px solid #21262D",
                    borderRadius: 8,
                    flexShrink: 0,
                    overflow: "hidden",
                  }}>
                    <PanelHeader title="Density Forecast" />
                    <div style={{ padding: "6px 0" }}>
                      {["FOB1", "P3", "GATE_B"].map(z => {
                        const pred = data.crowdguard.predictions[z];
                        if (!pred) return null;
                        return (
                          <div key={z} style={{
                            display: "flex", alignItems: "center",
                            padding: "6px 14px", borderBottom: "1px solid #21262D",
                            gap: 8,
                          }}>
                            <span style={{ fontSize: 12, fontWeight: 600, color: "#64748B", width: 52 }}>
                              {ZONE_META[z]?.shortLabel}
                            </span>
                            {[pred.t30, pred.t60, pred.t90].map((p, i) => (
                              <span key={i} style={{
                                fontSize: 12, color: BORDER_MAP[p.color],
                                fontFamily: "JetBrains Mono, monospace",
                              }}>
                                +{[30, 60, 90][i]}s: {p.density.toFixed(1)}
                              </span>
                            ))}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            </motion.div>
          ) : (
            <motion.div key="split"
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              style={{ flex: 1 }}>
              <SplitScreen data={data} />
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* Animation overlays */}
      <PAAnnouncementBanner
        message={paMessage?.message ?? null}
        zone={paMessage?.zone ?? ""}
        onDismiss={dismissPA}
      />
      <PhoneNotification notification={phoneNotif} onDismiss={dismissPhone} />
      <RPFAlert active={rpfActive} boothId="BOOTH-3" distance="120m" />
      <VideoPlayer
        critical={hasCritical}
        videoSrc={liveMode === "aerial" ? "/videos/aerial.webm" : "/videos/platform.webm"}
      />
    </div>
  );
}

function PanelHeader({ title, right }: { title: string; right?: string }) {
  return (
    <div style={{
      padding: "8px 12px",
      borderBottom: "1px solid #21262D",
      display: "flex", alignItems: "center",
      flexShrink: 0,
    }}>
      <span style={{ fontSize: 13, fontWeight: 600, color: "#94A3B8" }}>{title}</span>
      {right && (
        <span style={{ fontSize: 11, color: "#3B82F6", marginLeft: "auto" }}>{right}</span>
      )}
    </div>
  );
}

function ModeBtn({ label, active, activeColor, onClick }: {
  label: string; active: boolean; activeColor: string; onClick: () => void;
}) {
  return (
    <button onClick={onClick} style={{
      height: 32, padding: "0 12px", fontSize: 13, fontWeight: active ? 600 : 400,
      background: active ? `${activeColor}18` : "transparent",
      color: active ? activeColor : "#64748B",
      border: `1px solid ${active ? activeColor : "#21262D"}`,
      borderRadius: 6, cursor: "pointer",
      transition: "all 0.15s",
    }}>
      {label}
    </button>
  );
}
