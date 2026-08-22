"use client";
import { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Play, Video, Plane, Wifi, WifiOff, RefreshCw } from "lucide-react";
import { useLiveData } from "@/lib/websocket";
import { API_URL, BORDER_MAP } from "@/lib/constants";
import { useStationConfig } from "@/lib/config-context";
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
import type { GateState, Intervention } from "@/lib/types";

type View = "dashboard" | "split";

const SYSTEM_STATUS_META: Record<string, { color: string; label: string }> = {
  normal:     { color: "#29FF8C", label: "NORMAL" },
  monitoring: { color: "#16A35C", label: "MONITORING" },
  active:     { color: "#FFB020", label: "ACTIVE" },
  critical:   { color: "#FF3B3B", label: "CRITICAL" },
};

const DEMO_LEVELS = [
  { level: 1, label: "L1",   color: "#29FF8C" },
  { level: 2, label: "L2",   color: "#FFB020" },
  { level: 3, label: "L3",   color: "#FF3B3B" },
  { level: 4, label: "PRE",  color: "#FF7A1A" },
  { level: 5, label: "SOS",  color: "#FF1A1A" },
];

export default function Home() {
  const { config } = useStationConfig();
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
  const [demoMaxLevel, setDemoMaxLevel] = useState(5);
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
        title: isL3 ? "CRITICAL — Confirm Required" : "RPF Dispatch Requested",
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

  const _clearVisualState = () => {
    setSosOverlayDismissed(false);
    setPaMessage(null);
    setPhoneNotif(null);
    paShownIds.current.clear();
    phoneShownIds.current.clear();
  };

  // Actually fire the demo scenario
  const launchDemo = (level = demoMaxLevel) =>
    fetch(`${API_URL}/demo/start?max_level=${level}`, { method: "POST" })
      .then(() => { setDemoStarted(true); _clearVisualState(); })
      .catch(() => {});

  const setLevel = (level: number) => {
    setDemoMaxLevel(level);
    _clearVisualState();
    if (demoStarted) {
      fetch(`${API_URL}/demo/set_level/${level}`, { method: "POST" }).catch(() => {});
    }
  };

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
  const elapsed           = data?.elapsed ?? 0;
  const sc                = SYSTEM_STATUS_META[status];

  const gateStates: Record<string, GateState> = { GATE_A: "open", GATE_B: "open", GATE_C: "open" };
  for (const iv of allInterventions) {
    if (iv.status === "cancelled") continue;
    if (iv.level === 3 && iv.status === "confirmed") {
      if (iv.zone === "FOB1") gateStates["GATE_B"] = "closed";
      if (iv.zone === "CONC") { gateStates["GATE_A"] = gateStates["GATE_B"] = gateStates["GATE_C"] = "closed"; }
    } else if (iv.level === 2 && (iv.status === "staged" || iv.status === "confirmed")) {
      if (iv.zone === "FOB1" && gateStates["GATE_B"] === "open") gateStates["GATE_B"] = "restricted";
      if (iv.zone === "FOB2" && gateStates["GATE_A"] === "open") gateStates["GATE_A"] = "restricted";
      if (iv.zone === "GATE_B" && gateStates["GATE_B"] === "open") gateStates["GATE_B"] = "restricted";
    }
  }
  const esc1Reversed = allInterventions.some(iv => iv.level === 2 && iv.zone === "P3" && iv.status !== "cancelled");
  const esc2Reversed = allInterventions.some(iv => iv.level === 2 && iv.zone === "P4" && iv.status !== "cancelled");
  const rpfActive    = allInterventions.some(iv => iv.level === 2 && iv.zone === "CONC" && iv.status !== "cancelled");
  const hasCritical  = Object.values(zones).some(z => z.color === "critical");

  const preWarnIv  = allInterventions.find(iv => iv.level === 4 && iv.status === "fired");
  const sosIv      = allInterventions.find(iv => iv.level === 5 && iv.status === "fired");
  const preWarnActive = !!preWarnIv && !sosIv;
  const sosActive     = !!sosIv && !sosOverlayDismissed;

  return (
    <>
      {/* Below the desktop breakpoint the console locks rather than rendering a
          squeezed, unreadable scope — see .desktop-lock in globals.css. */}
      <div className="desktop-lock scope" style={{
        position: "fixed", inset: 0, background: "var(--bg)", zIndex: 200,
        flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 14, padding: 24,
      }}>
        <SentinelMark />
        <div style={{ fontSize: 13, color: "var(--text)", letterSpacing: "0.14em" }}>PRAHARI</div>
        <div style={{ fontSize: 11, color: "var(--text-dim)", letterSpacing: "0.06em", textAlign: "center", maxWidth: 280, lineHeight: 1.6 }}>
          This console is instrumentation for a control-room display — open it on a desktop or laptop-class screen (≥1024px).
        </div>
      </div>

    <div className="app-shell h-screen w-screen flex flex-col overflow-hidden" style={{ background: "var(--bg)" }}>

      {/* ── Header ── */}
      <header className="scope" style={{
        background: "var(--panel-2)",
        borderBottom: "1px solid var(--hair)",
        height: 44,
        display: "flex", alignItems: "center",
        padding: "0 12px", gap: 12, flexShrink: 0,
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <SentinelMark />
          <span style={{ fontSize: 13, color: "var(--text)", letterSpacing: "0.14em" }}>PRAHARI</span>
          <span style={{ fontSize: 10, color: "var(--text-faint)" }}>v2.0</span>
        </div>

        <div className="station-ident" style={{ display: "flex", alignItems: "center", gap: 12, minWidth: 0 }}>
          <Divider />
          <span style={{ fontSize: 11, color: "var(--text-dim)", letterSpacing: "0.08em", whiteSpace: "nowrap" }}>
            NDT-CENTRAL / NEW DELHI TERMINAL
          </span>
        </div>

        {/* View tabs — COMPARISON only in scenario mode */}
        <div style={{ display: "flex", gap: 3, marginLeft: 6 }}>
          {(["dashboard", ...(liveMode === "scenario" ? ["split"] : [])] as View[]).map(v => (
            <button key={v} className="btn-seg" onClick={() => setView(v)} style={{
              height: 26, padding: "0 10px", fontSize: 10,
              background: view === v ? "var(--hair)" : "transparent",
              color: view === v ? "var(--text)" : "var(--text-faint)",
              border: `1px solid ${view === v ? "var(--hair)" : "transparent"}`,
              letterSpacing: "0.1em",
            }}>
              {v === "dashboard" ? "TRACK VIEW" : "COMPARISON"}
            </button>
          ))}
        </div>

        {/* Demo level toggle — only in scenario mode */}
        {liveMode === "scenario" && (
          <>
            <Divider />
            <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
              <span style={{ fontSize: 9, color: "var(--text-faint)", letterSpacing: "0.1em" }}>MAX LEVEL</span>
              {DEMO_LEVELS.map(({ level, label, color }) => {
                const sel = demoMaxLevel === level;
                return (
                  <button key={level} className="btn-seg" onClick={() => setLevel(level)} style={{
                    height: 22, padding: "0 7px", fontSize: 9,
                    background: sel ? color : "transparent",
                    color: sel ? "#04120B" : "var(--text-faint)",
                    border: `1px solid ${sel ? color : "var(--hair)"}`,
                    letterSpacing: "0.06em",
                    fontWeight: sel ? 700 : 400,
                  }}>
                    {label}
                  </button>
                );
              })}
            </div>
          </>
        )}

        <div style={{ flex: 1 }} />

        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <motion.div
            style={{ width: 7, height: 7, borderRadius: "50%", background: sc.color }}
            animate={{ opacity: [1, 0.3, 1] }}
            transition={{ duration: 1, repeat: Infinity }}
          />
          <span style={{ fontSize: 11, color: sc.color, letterSpacing: "0.1em" }}>{sc.label}</span>
        </div>

        <Divider />

        <span style={{ fontSize: 11, color: "var(--text-faint)" }}>
          T+<span style={{ color: "var(--text-mute)" }}>{Math.floor(elapsed)}s</span>
        </span>

        <span style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 11, color: connected ? "var(--sweep)" : "var(--red)" }}>
          {connected ? <Wifi size={12} strokeWidth={1.75} /> : <WifiOff size={12} strokeWidth={1.75} />}
          {connected ? "CONN" : "DISC"}
        </span>

        <span style={{ fontSize: 12, color: "var(--text-dim)", minWidth: 58, textAlign: "right" }}>
          {clock}
        </span>

        <Divider />

        {/* Mode buttons */}
        <div style={{ display: "flex", gap: 4 }}>
          {([
            { key: "scenario", label: "DEMO",   Icon: Play,  active: "#29FF8C" },
            { key: "platform", label: "PLATFM", Icon: Video, active: "#FFB020" },
            { key: "aerial",   label: "AERIAL", Icon: Plane, active: "#FFB020" },
          ] as const).map(({ key, label, Icon, active }) => (
            <button key={key} className="btn-seg"
              onClick={() => key === "scenario" ? selectDemo() : startLive(key)}
              style={{
                display: "flex", alignItems: "center", gap: 6,
                height: 28, padding: "0 10px", fontSize: 10,
                background: liveMode === key ? `${active}18` : "transparent",
                color: liveMode === key ? active : "var(--text-faint)",
                border: `1px solid ${liveMode === key ? active : "var(--hair)"}`,
                letterSpacing: "0.08em",
              }}>
              <Icon size={11} strokeWidth={1.75} /> {label}
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
              style={{ flex: 1, minHeight: 0, height: "100%", display: "grid", gridTemplateColumns: "1fr 300px", gap: 6 }}>

              {/* Left column */}
              <div style={{ display: "flex", flexDirection: "column", gap: 6, minHeight: 0 }}>

                {liveMode === "scenario" ? (
                  <>
                    {/* Approach scope */}
                    <div className="panel" style={{ flex: 1, minHeight: 0, display: "flex", flexDirection: "column", position: "relative" }}>
                      <div className="panel-title" style={{ display: "flex", alignItems: "center" }}>
                        <span>NEW DELHI RAILWAY STATION — NDLS · FEB 15 2025</span>
                        <span style={{ marginLeft: 10, color: "var(--text-faint)" }}>SCENARIO REPLAY</span>
                        {data?.crowdguard?.predictions && (
                          <span style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 4, color: "var(--text-faint)" }}>
                            <RefreshCw size={9} strokeWidth={1.75} /> +90s FORECAST
                          </span>
                        )}
                      </div>
                      <div className="scrollbar-thin" style={{ flex: 1, minHeight: 0, padding: 10, overflowY: "auto", display: "flex", alignItems: "center", justifyContent: "center" }}>
                        <div style={{ width: "100%", maxWidth: 640 }}>
                          <StationMap
                            zones={zones}
                            predictions={data?.crowdguard?.predictions}
                            showPredictions
                            gateStates={gateStates}
                            esc1Reversed={esc1Reversed}
                            esc2Reversed={esc2Reversed}
                          />
                        </div>
                      </div>

                      {/* Demo: not yet started overlay */}
                      <AnimatePresence>
                        {!demoStarted && (
                          <motion.div
                            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                            style={{
                              position: "absolute", inset: 0,
                              background: "rgba(4,7,10,0.88)",
                              display: "flex", flexDirection: "column",
                              alignItems: "center", justifyContent: "center", gap: 12,
                              zIndex: 5,
                            }}
                          >
                            <div className="scope" style={{ fontSize: 10, color: "var(--text-faint)", letterSpacing: "0.12em" }}>
                              SCENARIO MODE — READY
                            </div>
                            <div style={{ display: "flex", gap: 5 }}>
                              {DEMO_LEVELS.map(({ level, label, color }) => (
                                <div key={level} className="scope" style={{
                                  fontSize: 9, padding: "3px 8px",
                                  color: demoMaxLevel >= level ? color : "var(--text-faint)",
                                  border: `1px solid ${demoMaxLevel >= level ? color : "var(--hair)"}`,
                                  background: demoMaxLevel >= level ? `${color}12` : "transparent",
                                }}>
                                  {label}
                                </div>
                              ))}
                            </div>
                            <button
                              className="btn-seg scope"
                              onClick={() => launchDemo()}
                              style={{
                                display: "flex", alignItems: "center", gap: 8,
                                padding: "10px 28px", fontSize: 13,
                                background: "rgba(41,255,140,0.12)",
                                color: "var(--sweep)",
                                border: "1px solid var(--sweep)",
                                letterSpacing: "0.14em",
                              }}
                            >
                              <Play size={14} strokeWidth={1.75} /> START DEMO
                            </button>
                            <div className="scope" style={{ fontSize: 9, color: "var(--text-faint)", letterSpacing: "0.08em" }}>
                              NEW DELHI TERMINAL — INCIDENT RECREATION 2025
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>

                    {/* Zone density chart */}
                    <div className="panel" style={{ flexShrink: 0, overflow: "hidden" }}>
                      <div className="panel-title">ZONE DENSITY MATRIX — 30s ROLLING</div>
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

                <div className="panel" style={{ flex: 1, minHeight: 0, display: "flex", flexDirection: "column", overflow: "hidden" }}>
                  <InterventionFeed
                    interventions={allInterventions}
                    staged={data?.staged}
                    onConfirm={confirm}
                    onCancel={cancel}
                  />
                </div>

                {data?.crowdguard?.predictions && (
                  <div className="panel" style={{ flexShrink: 0, overflow: "hidden" }}>
                    <div className="panel-title">DENSITY FORECAST — T+30/60/90s</div>
                    <div style={{ padding: "3px 0" }}>
                      {["FOB1", "P3", "GATE_B"].map(z => {
                        const pred = data.crowdguard.predictions[z];
                        if (!pred) return null;
                        return (
                          <div key={z} className="scope" style={{
                            display: "flex", alignItems: "center",
                            padding: "4px 10px", borderBottom: "1px solid var(--hair-dim)",
                            fontSize: 11,
                          }}>
                            <span style={{ color: "var(--text-mute)", width: 44 }}>
                              {config?.zones.find((zc) => zc.id === z)?.short_label}
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
    </>
  );
}

function Divider() {
  return <div style={{ width: 1, height: 18, background: "var(--hair)", flexShrink: 0 }} />;
}

/** A radar contact standing in for a watchman's mark — Prahari means sentinel. */
function SentinelMark() {
  return (
    <svg width={22} height={22} viewBox="0 0 22 22" style={{ flexShrink: 0 }}>
      <rect x={0.5} y={0.5} width={21} height={21} fill="var(--panel)" stroke="var(--sweep)" strokeWidth={1} />
      <circle cx={11} cy={11} r={6.5} fill="none" stroke="var(--sweep)" strokeWidth={1} opacity={0.5} />
      <circle cx={11} cy={11} r={2} fill="var(--sweep)" />
    </svg>
  );
}
