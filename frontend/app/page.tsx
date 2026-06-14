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
import VideoTrackingView from "@/components/VideoTrackingView";
import EmergencyOverlay from "@/components/EmergencyOverlay";
import PreWarnBanner from "@/components/PreWarnBanner";
import type { GateState } from "@/components/GateStatusOverlay";
import type { Intervention } from "@/lib/types";

type View = "dashboard" | "split";

const SCADA_STATUS: Record<string, { color: string; label: string }> = {
  normal:     { color: "#00C84C", label: "NORMAL" },
  monitoring: { color: "#1A90FF", label: "MONITORING" },
  active:     { color: "#E8A000", label: "ACTIVE" },
  critical:   { color: "#E82020", label: "CRITICAL" },
};

const M: React.CSSProperties = { fontFamily: "'Share Tech Mono', monospace" };

export default function Home() {
  const { data, connected } = useLiveData();
  const [view, setView]       = useState<View>("dashboard");
  const [historyMap, setHistoryMap] = useState<Record<string, number[]>>({});
  const [clock, setClock]     = useState("");
  const [liveMode, setLiveMode] = useState<"scenario" | "platform" | "aerial">("scenario");
  const [demoStarted, setDemoStarted] = useState(false);
  const [videoLoading, setVideoLoading] = useState(false);
  const lastDataTime = useRef<number>(Date.now());

  const [paMessage, setPaMessage]   = useState<{ message: string; zone: string } | null>(null);
  const [phoneNotif, setPhoneNotif] = useState<{ title: string; body: string; level: string } | null>(null);
  const [sosOverlayDismissed, setSosOverlayDismissed] = useState(false);
  const paShownIds    = useRef<Set<string>>(new Set());
  const phoneShownIds = useRef<Set<string>>(new Set());

  useEffect(() => {
    if (!data?.crowdguard?.zones) return;
    setHistoryMap(prev => {
      const next = { ...prev };
      for (const [zid, state] of Object.entries(data.crowdguard.zones)) {
        const arr = next[zid] ?? [];
        next[zid] = [...arr, state.density].slice(-30);
      }
      return next;
    });
  }, [data]);

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
        body: isL3
          ? `${iv.zone}: ${iv.action.split(".")[0]}`
          : `Booth-3 notified for ${iv.zone}. ${iv.action.split(".")[0]}`,
        level: `L${iv.level}`,
      });
      phoneShownIds.current.add(iv.id);
      break;
    }
  }, [data?.interventions]);

  useEffect(() => {
    const tick = () => setClock(new Date().toLocaleTimeString("en-IN", { hour12: false }));
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, []);

  // Track data freshness: when video mode and data stops for >2s, show loading
  useEffect(() => {
    if (data) {
      lastDataTime.current = Date.now();
      if (videoLoading && data.video_ready) setVideoLoading(false);
    }
  }, [data, videoLoading]);

  useEffect(() => {
    if (liveMode === "scenario") return;
    const id = setInterval(() => {
      if (Date.now() - lastDataTime.current > 2000) setVideoLoading(true);
    }, 500);
    return () => clearInterval(id);
  }, [liveMode]);

  // Force back to dashboard view when switching away from scenario (no comparison tab in video mode)
  useEffect(() => {
    if (liveMode !== "scenario") setView("dashboard");
  }, [liveMode]);

  // Select demo mode without starting — shows START overlay
  const selectDemo = () => {
    setLiveMode("scenario");
    setDemoStarted(false);
    setVideoLoading(false);
  };

  // Actually fire the demo scenario
  const launchDemo = () =>
    fetch(`${API_URL}/demo/start`, { method: "POST" })
      .then(() => {
        setDemoStarted(true);
        setSosOverlayDismissed(false);
        paShownIds.current.clear();
        phoneShownIds.current.clear();
      })
      .catch(() => {});

  const startLive = (source: "platform" | "aerial") =>
    fetch(`${API_URL}/live/start?source=${source}`, { method: "POST" })
      .then(() => {
        setLiveMode(source);
        setVideoLoading(true);
        lastDataTime.current = Date.now();
        paShownIds.current.clear();
        phoneShownIds.current.clear();
      })
      .catch(() => {});

  const confirm = (id: string) =>
    fetch(`${API_URL}/intervention/${id}/confirm`, { method: "POST" }).catch(() => {});
  const cancel  = (id: string) =>
    fetch(`${API_URL}/intervention/${id}/cancel`,  { method: "POST" }).catch(() => {});

  const dismissPA    = useCallback(() => setPaMessage(null),  []);
  const dismissPhone = useCallback(() => setPhoneNotif(null), []);

  const zones            = data?.crowdguard?.zones ?? {};
  const status           = data?.system_status ?? "normal";
  const allInterventions: Intervention[] = data?.interventions ?? [];
  const elapsed          = data?.elapsed ?? 0;
  const sc               = SCADA_STATUS[status];

  const gateStates: Record<string, GateState> = { GATE_A: "open", GATE_B: "open", GATE_C: "open" };
  for (const iv of allInterventions) {
    if (iv.status === "cancelled") continue;
    if (iv.level === 3 && iv.status === "confirmed") {
      if (iv.zone === "FOB1") gateStates["GATE_B"] = "closed";
      if (iv.zone === "CONC") { gateStates["GATE_A"] = gateStates["GATE_B"] = gateStates["GATE_C"] = "closed"; }
    } else if (iv.level === 2 && (iv.status === "staged" || iv.status === "confirmed")) {
      if (iv.zone === "FOB1" && gateStates["GATE_B"] === "open") gateStates["GATE_B"] = "restricted";
      if (iv.zone === "FOB2" && gateStates["GATE_A"] === "open") gateStates["GATE_A"] = "restricted";
    }
  }
  const esc1Reversed = allInterventions.some(iv => iv.level === 1 && iv.zone === "P3" && iv.status !== "cancelled");
  const esc2Reversed = allInterventions.some(iv => iv.level === 1 && iv.zone === "P4" && iv.status !== "cancelled");
  const rpfActive    = allInterventions.some(iv => iv.level === 2 && iv.zone === "CONC" && iv.status !== "cancelled");
  const hasCritical  = Object.values(zones).some(z => z.color === "critical");

  const preWarnIv  = allInterventions.find(iv => iv.level === 4 && iv.status === "fired");
  const sosIv      = allInterventions.find(iv => iv.level === 5 && iv.status === "fired");
  const preWarnActive = !!preWarnIv && !sosIv;
  const sosActive     = !!sosIv && !sosOverlayDismissed;

  return (
    <div className="h-screen w-screen flex flex-col overflow-hidden" style={{ background: "#06080E" }}>

      {/* ── Header ── */}
      <header style={{
        ...M,
        background: "#080C14",
        borderBottom: "1px solid #142035",
        height: 44,
        display: "flex", alignItems: "center",
        padding: "0 12px", gap: 12, flexShrink: 0,
      }}>
        {/* Logo + ident */}
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <div style={{
            width: 26, height: 26, background: "#1A90FF",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 10, fontWeight: 700, color: "#fff", letterSpacing: "0.05em",
          }}>ATC</div>
          <span style={{ fontSize: 13, color: "#C8E4FF", letterSpacing: "0.14em" }}>PRAHARI</span>
          <span style={{ fontSize: 10, color: "#2C4060" }}>v2.0</span>
        </div>

        <Divider />

        <span style={{ fontSize: 11, color: "#8AB4D4", letterSpacing: "0.08em" }}>
          NDT-CENTRAL / NEW DELHI TERMINAL
        </span>

        {/* View tabs — COMPARISON only in scenario mode */}
        <div style={{ display: "flex", gap: 3, marginLeft: 6 }}>
          {(["dashboard", ...(liveMode === "scenario" ? ["split"] : [])] as View[]).map(v => (
            <button key={v} onClick={() => setView(v)} style={{
              ...M,
              height: 26, padding: "0 10px", fontSize: 10,
              background: view === v ? "#142035" : "transparent",
              color: view === v ? "#C8E4FF" : "#2C4060",
              border: `1px solid ${view === v ? "#1A3A58" : "transparent"}`,
              cursor: "pointer", letterSpacing: "0.1em",
            }}>
              {v === "dashboard" ? "TRACK VIEW" : "COMPARISON"}
            </button>
          ))}
        </div>

        <div style={{ flex: 1 }} />

        {/* System status */}
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <motion.div
            style={{ width: 7, height: 7, borderRadius: "50%", background: sc.color }}
            animate={{ opacity: [1, 0.3, 1] }}
            transition={{ duration: 1, repeat: Infinity }}
          />
          <span style={{ fontSize: 11, color: sc.color, letterSpacing: "0.1em" }}>{sc.label}</span>
        </div>

        <Divider />

        <span style={{ fontSize: 11, color: "#2C4060" }}>
          T+<span style={{ color: "#4A6A84" }}>{Math.floor(elapsed)}s</span>
        </span>

        <span style={{ fontSize: 11, color: connected ? "#00C84C" : "#E82020" }}>
          {connected ? "● CONN" : "○ DISC"}
        </span>

        <span style={{ fontSize: 12, color: "#8AB4D4", minWidth: 58, textAlign: "right" }}>
          {clock}
        </span>

        <Divider />

        {/* Mode buttons */}
        <div style={{ display: "flex", gap: 4 }}>
          {([
            { key: "scenario", label: "▶ DEMO",   active: "#00C84C" },
            { key: "platform", label: "◉ PLATFM", active: "#E8A000" },
            { key: "aerial",   label: "◉ AERIAL", active: "#E8A000" },
          ] as const).map(({ key, label, active }) => (
            <button key={key}
              onClick={() => key === "scenario" ? selectDemo() : startLive(key)}
              style={{
                ...M,
                height: 28, padding: "0 10px", fontSize: 10,
                background: liveMode === key ? `${active}15` : "transparent",
                color: liveMode === key ? active : "#2C4060",
                border: `1px solid ${liveMode === key ? active : "#142035"}`,
                cursor: "pointer", letterSpacing: "0.08em",
              }}>
              {label}
            </button>
          ))}
        </div>
      </header>

      {/* ── Body ── */}
      <main style={{ flex: 1, minHeight: 0, padding: 6, display: "flex" }}>
        <AnimatePresence mode="wait">
          {view === "dashboard" ? (
            <motion.div key="dashboard"
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              style={{ flex: 1, minHeight: 0, height: "100%", display: "grid", gridTemplateColumns: "1fr 270px", gap: 6 }}>

              {/* Left column */}
              <div style={{ display: "flex", flexDirection: "column", gap: 6, minHeight: 0 }}>

                {liveMode === "scenario" ? (
                  <>
                    {/* Station map panel */}
                    <div className="panel" style={{ flex: 1, minHeight: 0, display: "flex", flexDirection: "column", position: "relative" }}>
                      <div className="panel-header" style={{ display: "flex", alignItems: "center" }}>
                        <span>▌ NEW DELHI RAILWAY STATION — NDLS · FEB 15 2025</span>
                        {data?.crowdguard?.predictions && (
                          <span style={{ marginLeft: "auto", color: "#1A3A58" }}>⟳ +90s FORECAST</span>
                        )}
                      </div>
                      <div className="scrollbar-thin" style={{ flex: 1, minHeight: 0, padding: 6, overflowY: "auto" }}>
                        <StationMap
                          zones={zones}
                          predictions={data?.crowdguard?.predictions}
                          showPredictions
                          gateStates={gateStates}
                          esc1Reversed={esc1Reversed}
                          esc2Reversed={esc2Reversed}
                        />
                      </div>

                      {/* Demo: not yet started overlay */}
                      <AnimatePresence>
                        {!demoStarted && (
                          <motion.div
                            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                            style={{
                              position: "absolute", inset: 0,
                              background: "rgba(6,8,14,0.82)",
                              display: "flex", flexDirection: "column",
                              alignItems: "center", justifyContent: "center", gap: 12,
                              zIndex: 5,
                            }}
                          >
                            <div style={{ ...M, fontSize: 10, color: "#2C4060", letterSpacing: "0.12em" }}>
                              SCENARIO MODE — READY
                            </div>
                            <button
                              onClick={launchDemo}
                              style={{
                                ...M,
                                padding: "10px 28px", fontSize: 13, cursor: "pointer",
                                background: "rgba(0,200,76,0.12)",
                                color: "#00C84C",
                                border: "1px solid #00C84C",
                                letterSpacing: "0.14em",
                              }}
                            >
                              ▶ START DEMO
                            </button>
                            <div style={{ ...M, fontSize: 9, color: "#1A3050", letterSpacing: "0.08em" }}>
                              NEW DELHI TERMINAL — INCIDENT RECREATION 2025
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>

                    {/* Zone density chart */}
                    <div className="panel" style={{ flexShrink: 0, overflow: "hidden" }}>
                      <div className="panel-header">▌ ZONE DENSITY MATRIX — 30s ROLLING</div>
                      <ZoneChart zones={zones} historyMap={historyMap} />
                    </div>
                  </>
                ) : (
                  /* Video mode: full tracking split view */
                  <div className="panel" style={{ flex: 1, minHeight: 0, display: "flex", flexDirection: "column", overflow: "hidden" }}>
                    <VideoTrackingView
                      videoSrc={liveMode === "aerial" ? "/videos/aerial.webm" : "/videos/platform.webm"}
                      persons={data?.persons ?? []}
                      zones={zones}
                      loading={videoLoading}
                      source={liveMode}
                    />
                  </div>
                )}
              </div>

              {/* Right column */}
              <div style={{ display: "flex", flexDirection: "column", gap: 6, minHeight: 0 }}>

                {/* Intervention feed */}
                <div className="panel" style={{ flex: 1, minHeight: 0, display: "flex", flexDirection: "column", overflow: "hidden" }}>
                  <InterventionFeed
                    interventions={allInterventions}
                    staged={data?.staged}
                    onConfirm={confirm}
                    onCancel={cancel}
                  />
                </div>

                {/* Density forecast */}
                {data?.crowdguard?.predictions && (
                  <div className="panel" style={{ flexShrink: 0, overflow: "hidden" }}>
                    <div className="panel-header">▌ DENSITY FORECAST — T+30/60/90s</div>
                    <div style={{ padding: "3px 0" }}>
                      {["FOB1", "P3", "GATE_B"].map(z => {
                        const pred = data.crowdguard.predictions[z];
                        if (!pred) return null;
                        return (
                          <div key={z} style={{
                            display: "flex", alignItems: "center",
                            padding: "4px 10px", borderBottom: "1px solid #0A1525",
                            ...M, fontSize: 11,
                          }}>
                            <span style={{ color: "#4A6A84", width: 44 }}>
                              {ZONE_META[z]?.shortLabel}
                            </span>
                            {[pred.t30, pred.t60, pred.t90].map((p, i) => (
                              <span key={i} style={{ color: BORDER_MAP[p.color], width: 58, textAlign: "right" }}>
                                +{[30, 60, 90][i]}s:{p.density.toFixed(1)}
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
              style={{ flex: 1, minHeight: 0, height: "100%" }}>
              <SplitScreen data={data} />
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      <PAAnnouncementBanner message={paMessage?.message ?? null} zone={paMessage?.zone ?? ""} onDismiss={dismissPA} />
      <PhoneNotification notification={phoneNotif} onDismiss={dismissPhone} />
      <RPFAlert active={rpfActive} boothId="BOOTH-3" distance="120m" />
      <PreWarnBanner active={preWarnActive} intervention={preWarnIv} />
      <EmergencyOverlay
        active={sosActive}
        sosIntervention={sosIv}
        onDismiss={() => setSosOverlayDismissed(true)}
      />
      {/* Floating CCTV widget — only in scenario mode; platform/aerial uses the main split view */}
      {liveMode === "scenario" && (
        <VideoPlayer
          critical={hasCritical}
          videoSrc="/videos/platform.webm"
          persons={[]}
          showTracking={false}
        />
      )}
    </div>
  );
}

function Divider() {
  return <div style={{ width: 1, height: 18, background: "#142035", flexShrink: 0 }} />;
}
