"use client";
import { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useLiveData } from "@/lib/websocket";
import { API_URL, ZONE_META, TEXT_MAP, BORDER_MAP } from "@/lib/constants";
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
  normal: "text-green-400",
  monitoring: "text-blue-400",
  active: "text-amber-400",
  critical: "text-red-400",
};

export default function Home() {
  const { data, connected } = useLiveData();
  const [view, setView] = useState<View>("dashboard");
  const [historyMap, setHistoryMap] = useState<Record<string, number[]>>({});
  const [clock, setClock] = useState("");

  // Animation state
  const [paMessage, setPaMessage] = useState<{ message: string; zone: string } | null>(null);
  const [phoneNotif, setPhoneNotif] = useState<{ title: string; body: string; level: string } | null>(null);
  const paShownIds = useRef<Set<string>>(new Set());
  const phoneShownIds = useRef<Set<string>>(new Set());

  // Rolling density history for sparklines
  useEffect(() => {
    if (!data?.crowdguard.zones) return;
    setHistoryMap((prev) => {
      const next = { ...prev };
      for (const [zoneId, state] of Object.entries(data.crowdguard.zones)) {
        const arr = next[zoneId] ?? [];
        next[zoneId] = [...arr, state.density].slice(-30);
      }
      return next;
    });
  }, [data]);

  // PA announcement — show once per L1 intervention that has a quoted message
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

  // Phone notification — fire on first L2 RPF or L3 event
  useEffect(() => {
    const ivs = data?.interventions;
    if (!ivs) return;
    for (const iv of ivs) {
      const isRpf = iv.level === 2 && iv.action.toLowerCase().includes("rpf");
      const isL3 = iv.level === 3;
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

  // Clock
  useEffect(() => {
    const tick = () => setClock(new Date().toLocaleTimeString("en-IN", { hour12: false }));
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, []);

  const [liveMode, setLiveMode] = useState<"scenario" | "platform" | "aerial">("scenario");

  const startDemo = () =>
    fetch(`${API_URL}/demo/start`, { method: "POST" })
      .then(() => setLiveMode("scenario"))
      .catch(() => {});

  const startLive = (source: "platform" | "aerial") =>
    fetch(`${API_URL}/live/start?source=${source}`, { method: "POST" })
      .then(() => { setLiveMode(source); paShownIds.current.clear(); phoneShownIds.current.clear(); })
      .catch(() => {});

  const confirm = (id: string) =>
    fetch(`${API_URL}/intervention/${id}/confirm`, { method: "POST" }).catch(() => {});

  const cancel = (id: string) =>
    fetch(`${API_URL}/intervention/${id}/cancel`, { method: "POST" }).catch(() => {});

  const dismissPA = useCallback(() => setPaMessage(null), []);
  const dismissPhone = useCallback(() => setPhoneNotif(null), []);

  const zones = data?.crowdguard.zones ?? {};
  const status = data?.system_status ?? "normal";
  const allInterventions: Intervention[] = data?.interventions ?? [];

  // --- Derive animation states from intervention history ---

  // Gate states: L2 confirmed/staged → restricted; L3 confirmed → closed
  const gateStates: Record<string, GateState> = { GATE_A: "open", GATE_B: "open", GATE_C: "open" };
  for (const iv of allInterventions) {
    if (iv.status === "cancelled") continue;
    if (iv.level === 3 && iv.status === "confirmed") {
      if (iv.zone === "FOB1") gateStates["GATE_B"] = "closed";
      if (iv.zone === "CONC") {
        gateStates["GATE_A"] = "closed";
        gateStates["GATE_B"] = "closed";
        gateStates["GATE_C"] = "closed";
      }
    } else if (iv.level === 2 && (iv.status === "staged" || iv.status === "confirmed")) {
      if (iv.zone === "FOB1" && gateStates["GATE_B"] === "open") gateStates["GATE_B"] = "restricted";
      if (iv.zone === "FOB2" && gateStates["GATE_A"] === "open") gateStates["GATE_A"] = "restricted";
    }
  }

  // Escalator reversed when L1 fires for P3 (ESC-1) or P4 (ESC-2)
  const esc1Reversed = allInterventions.some(
    (iv) => iv.level === 1 && iv.zone === "P3" && iv.status !== "cancelled"
  );
  const esc2Reversed = allInterventions.some(
    (iv) => iv.level === 1 && iv.zone === "P4" && iv.status !== "cancelled"
  );

  // RPF alert: any L2 CONC intervention that isn't cancelled
  const rpfActive = allInterventions.some(
    (iv) => iv.level === 2 && iv.zone === "CONC" && iv.status !== "cancelled"
  );

  // Critical density in any zone → video player highlights
  const hasCritical = Object.values(zones).some((z) => z.color === "critical");

  return (
    <div className="h-screen w-screen flex flex-col bg-[#0D1117] overflow-hidden">
      {/* Top bar */}
      <header className="flex items-center px-4 py-2 border-b border-[#21262D] gap-4 shrink-0">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded bg-blue-600 flex items-center justify-center text-xs font-bold">CG</div>
          <span className="text-sm font-bold tracking-tight text-white">CrowdGuard</span>
          <span className="text-xs text-slate-500 border border-[#21262D] rounded px-2 py-0.5">
            Simulation Environment
          </span>
        </div>

        <nav className="flex gap-1 ml-4">
          {(["dashboard", "split"] as View[]).map((v) => (
            <button
              key={v}
              onClick={() => setView(v)}
              className={`px-3 py-1 rounded text-xs font-medium transition-colors ${
                view === v
                  ? "bg-blue-600 text-white"
                  : "text-slate-400 hover:text-white hover:bg-[#21262D]"
              }`}
            >
              {v === "dashboard" ? "Dashboard" : "Split Screen Demo"}
            </button>
          ))}
        </nav>

        <div className="ml-auto flex items-center gap-4">
          <div className="flex items-center gap-1.5">
            <motion.div
              className={`w-2 h-2 rounded-full ${
                status === "critical" ? "bg-red-500" :
                status === "active" ? "bg-amber-400" : "bg-green-400"
              }`}
              animate={{ opacity: [1, 0.4, 1] }}
              transition={{ duration: 1.2, repeat: Infinity }}
            />
            <span className={`text-xs font-mono font-semibold ${STATUS_COLOR[status]}`}>
              {status.toUpperCase()}
            </span>
          </div>

          <div className={`text-xs font-mono ${connected ? "text-green-500" : "text-red-500"}`}>
            {connected ? "● LIVE" : "○ CONNECTING"}
          </div>

          <span className="text-xs text-slate-500 font-mono">{clock}</span>

          <div className="flex items-center gap-1">
            <button
              onClick={startDemo}
              className={`px-3 py-1 text-xs font-semibold rounded transition-colors ${
                liveMode === "scenario" ? "bg-blue-600 text-white" : "bg-[#21262D] text-slate-300 hover:bg-blue-700 hover:text-white"
              }`}
            >
              ▶ Demo
            </button>
            <button
              onClick={() => startLive("platform")}
              className={`px-3 py-1 text-xs font-semibold rounded transition-colors ${
                liveMode === "platform" ? "bg-red-700 text-white" : "bg-[#21262D] text-slate-300 hover:bg-red-800 hover:text-white"
              }`}
              title="Live: Dadar Platform footage"
            >
              📹 Platform
            </button>
            <button
              onClick={() => startLive("aerial")}
              className={`px-3 py-1 text-xs font-semibold rounded transition-colors ${
                liveMode === "aerial" ? "bg-red-700 text-white" : "bg-[#21262D] text-slate-300 hover:bg-red-800 hover:text-white"
              }`}
              title="Live: Aerial station footage"
            >
              📹 Aerial
            </button>
          </div>
        </div>
      </header>

      {/* Body */}
      <main className="flex-1 min-h-0 p-3">
        <AnimatePresence mode="wait">
          {view === "dashboard" ? (
            <motion.div
              key="dashboard"
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="h-full grid grid-cols-[1fr_300px] gap-3"
            >
              {/* Left: map + charts */}
              <div className="flex flex-col gap-3 min-h-0">
                <div className="flex-1 rounded-xl border border-[#21262D] bg-[#161B22] p-3 min-h-0">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-semibold text-slate-400 tracking-widest uppercase">
                      New Delhi Terminal [Model] — Live View
                    </span>
                    {data?.crowdguard.predictions && (
                      <span className="text-xs text-blue-400 font-mono">⟳ Predicting +90s</span>
                    )}
                  </div>
                  <div className="h-[calc(100%-28px)]">
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

                <div className="rounded-xl border border-[#21262D] bg-[#161B22] p-3 shrink-0">
                  <span className="text-xs font-semibold text-slate-400 tracking-widest uppercase block mb-2">
                    Zone Density — Last 30 Ticks
                  </span>
                  <ZoneChart zones={zones} historyMap={historyMap} />
                </div>
              </div>

              {/* Right: feed + stats */}
              <div className="flex flex-col gap-3 min-h-0">
                <div className="rounded-xl border border-[#21262D] bg-[#161B22] p-3 shrink-0">
                  <span className="text-xs font-semibold text-slate-400 tracking-widest uppercase block mb-2">
                    Critical Zones
                  </span>
                  <div className="space-y-1">
                    {["FOB1", "FOB2", "P3", "GATE_B"].map((z) => {
                      const s = zones[z];
                      if (!s) return null;
                      return (
                        <div key={z} className="flex items-center justify-between text-xs">
                          <span className="text-slate-400">{ZONE_META[z]?.shortLabel}</span>
                          <span className={`font-mono font-semibold ${TEXT_MAP[s.color]}`}>
                            {s.density.toFixed(1)}/m²
                          </span>
                          <span className="text-slate-600">{s.count} persons</span>
                        </div>
                      );
                    })}
                  </div>
                </div>

                <div className="flex-1 rounded-xl border border-[#21262D] bg-[#161B22] min-h-0 overflow-hidden">
                  <InterventionFeed
                    interventions={allInterventions}
                    staged={data?.staged}
                    onConfirm={confirm}
                    onCancel={cancel}
                  />
                </div>

                {data?.crowdguard.predictions && (
                  <div className="rounded-xl border border-[#21262D] bg-[#161B22] p-3 shrink-0">
                    <span className="text-xs font-semibold text-slate-400 tracking-widest uppercase block mb-2">
                      90s Forecast — High Risk Zones
                    </span>
                    {["FOB1", "P3", "GATE_B"].map((z) => {
                      const pred = data.crowdguard.predictions[z];
                      if (!pred) return null;
                      return (
                        <div key={z} className="flex items-center justify-between text-xs mb-1">
                          <span className="text-slate-500">{ZONE_META[z]?.shortLabel}</span>
                          <div className="flex gap-2 font-mono">
                            {[pred.t30, pred.t60, pred.t90].map((p, i) => (
                              <span key={i} style={{ color: BORDER_MAP[p.color] }}>
                                +{[30, 60, 90][i]}s:{p.density.toFixed(1)}
                              </span>
                            ))}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </motion.div>
          ) : (
            <motion.div
              key="split"
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="h-full"
            >
              <SplitScreen data={data} />
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* Animation overlay layer */}
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

      {/* SVG defs (arrowhead marker — referenced by StationMap) */}
      <svg width="0" height="0" style={{ position: "absolute" }}>
        <defs>
          <marker id="arrowhead" markerWidth="6" markerHeight="6" refX="3" refY="3" orient="auto">
            <path d="M0,0 L0,6 L6,3 z" fill="#3B82F6" />
          </marker>
        </defs>
      </svg>
    </div>
  );
}
