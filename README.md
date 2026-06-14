# Prahari — Autonomous Crowd Safety for Indian Railways

> **Predict crowd crush formation 90 seconds before it becomes lethal. Respond without waiting for a human.**

Built for **FAR AWAY Hackathon 2026** · Railways Theme · Team CrowdGuard

---

## The Problem

**18 people died at New Delhi Railway Station on February 15, 2025.**

The station had 200+ cameras and a manned control room. The crowd crush was visible for minutes before it turned lethal. The operators were too slow — not because they were negligent, but because the human decision loop is structurally broken:

| Stage | Time |
|---|---|
| Operator notices anomaly | ~2 min |
| Decision escalated to supervisor | ~1 min |
| Supervisor authorizes response | ~1 min |
| **Total: Human decision loop** | **4+ minutes** |
| **Crowd crush formation window** | **90 seconds** |

The gap is not a training problem. It's a physics problem. Crowd crushes compress faster than human chains can respond.

**Scale of the problem:**
- 145+ stampede deaths per year in India (NCRB, 2019–2024 average)
- 120 deaths in 2025 alone — highest single-year total since 2011 Allahabad tragedy
- Kumbh 2025: 30 deaths despite 400 dedicated operators and ₹150B infrastructure spend
- Seoul Itaewon, 2022: 159 deaths — same pattern, different country

Existing solutions (CCTV dashboards, occupancy counters, manual radio protocols) detect crowds. They do not decide. The fatal gap is between detection and action.

---

## The Solution

**Prahari** replaces the human reaction bottleneck with a **graded autonomous response engine** — five escalation levels that fire in under 3 seconds, calibrated to the severity and certainty of the threat:

| Level | Trigger | Response | Latency | Authority |
|---|---|---|---|---|
| **L1 — Autonomous** | Density ≥ 5/m² | PA announcement · Escalator direction reversal · Dynamic signage | **< 3 seconds** | Automatic |
| **L2 — Assisted Auto** | Density ≥ 6/m² | Gate throttling — auto-executes in 10s with cancel window | 10 seconds | Operator can cancel |
| **L3 — Human Confirm** | Predicted ≥ 7.5/m² in 90s | Platform closure — requires one-tap human confirm | Human-controlled | Supervisor required |
| **L4 — PRE-WARN** | Density ≥ 7.0/m² | Standby alert to RPF · Police · Fire Brigade · Ambulance | **< 3 seconds** | Automatic |
| **L5 — SOS Failsafe** | Density ≥ 8.0/m² + PRE-WARN already fired | Full emergency dispatch — RPF deployed, 100/101/108 called | **< 3 seconds** | Automatic (requires L4 first) |

**Key guarantee:** L5 (SOS) cannot fire unless L4 (PRE-WARN) has already been triggered for the same zone in the current incident. No cold SOS dispatch.

**Prediction:** The system forecasts crowd density 90 seconds ahead using crowd flow vector extrapolation — not just detecting what's happening now, but computing what will happen if the flow pattern continues.

---

## Live Demo

> **Split-screen comparison:** Human-operated station vs. Prahari side-by-side on identical input.

The demo runs a scripted recreation of the FOB-3 stairway crowd surge scenario (NDLS, Feb 15 2025, 18:00–20:48 IST).

- **Human side:** 4 minutes 12 seconds to first response. Crush event occurs at T+180s.
- **Prahari side:** L1 fires at T+2.3s. Crowd diverted. Crush prevented.

```
http://localhost:3000
```

Click **▶ START DEMO** → switch to **Split Screen** view.

Use the **MAX LEVEL** toggle to demonstrate individual escalation levels for judges:
- `L1` — shows only autonomous PA/escalator
- `L2` — shows gate throttling countdown
- `L3` — shows human-confirm platform closure
- `PRE` — shows standby alert to all emergency services
- `SOS` — shows full emergency dispatch overlay

---

## Tech Stack

| Layer | Technology | Why |
|---|---|---|
| **Person Detection** | YOLOv8m (Ultralytics) | Best accuracy/speed tradeoff for dense crowds |
| **Tiled Inference** | SAHI (192px tiles, 30% overlap) | Detects ~109 persons per frame vs ~10 with plain YOLO on aerial footage |
| **Object Tracking** | ByteTrack (built into Ultralytics) | Persistent IDs across frames for flow vector computation |
| **Flow Prediction** | Rule-based crowd flow extrapolation | 90-second density forecast, convergence detection |
| **Decision Engine** | Custom 5-level graded intervention engine | Sequential escalation with PRE-WARN → SOS guarantee |
| **Backend** | FastAPI + WebSocket (Python) | 200ms broadcast loop, dual-engine (CrowdGuard vs Human) |
| **Frontend** | Next.js 14 + Framer Motion | Real-time split-screen dashboard, intervention feed |
| **Charts** | Recharts | Live density charts per zone |

### Expansion Technology (Production Path)

| Layer | Technology |
|---|---|
| Camera integration | ONVIF — works with any IP camera already installed at stations |
| Edge inference | NVIDIA Jetson AGX Orin — 275 TOPS, runs YOLOv8 + SAHI locally |
| Railway integration | CRIS API + NTES — live train schedule → density prediction context |
| Station infrastructure | SCADA + BMS — direct gate, escalator, signage control |
| Passenger systems | IRCTC — push notification to ticket holders in affected zones |
| Emergency dispatch | Police 100 / Fire 101 / Ambulance 108 — validated SMS + CAD APIs |

---

## Project Structure

```
prahari/
├── backend/
│   ├── main.py              # FastAPI + WebSocket server, dual-engine broadcast
│   ├── constants.py         # All density thresholds (single source of truth)
│   ├── requirements.txt
│   ├── vision/
│   │   ├── detector.py      # YOLOv8 + SAHI inference
│   │   ├── tracker.py       # ByteTrack wrapper
│   │   ├── zone_map.py      # Zone geometry → density computation
│   │   └── video_pipeline.py
│   ├── prediction/
│   │   └── extrapolator.py  # 90s crowd flow forecasting
│   ├── decision/
│   │   ├── engine.py        # 5-level graded intervention engine
│   │   └── interventions.py # Level definitions, action strings
│   └── demo/
│       └── scenario_runner.py  # Scripted FOB-3 keyframe scenario
├── frontend/
│   ├── app/
│   │   ├── page.tsx         # Main dashboard, demo controls
│   │   └── layout.tsx
│   ├── components/
│   │   ├── SplitScreen.tsx      # Human vs Prahari comparison panel
│   │   ├── InterventionFeed.tsx # Chronological event log
│   │   ├── StationMap.tsx       # Zone density heatmap
│   │   ├── ZoneChart.tsx        # Live density chart
│   │   ├── EmergencyOverlay.tsx # SOS full-screen dispatch UI
│   │   ├── PreWarnBanner.tsx    # PRE-WARN amber banner
│   │   ├── RPFAlert.tsx         # RPF notification card
│   │   └── PAAnnouncementBanner.tsx
│   └── lib/
│       ├── websocket.ts     # WebSocket client, reconnect logic
│       ├── types.ts         # LiveUpdate, Intervention types
│       └── constants.ts     # Level colors, zone metadata
├── data/
│   └── videos/              # Stock footage for video pipeline mode
├── PRD.md                   # Full product requirements
├── APP_FLOW.md              # System architecture and data flow
└── DEMO_SCRIPT_V3.md        # Submission video script
```

---

## Setup

### Prerequisites
- Python 3.10+
- Node.js 18+

### 1. Backend

```bash
cd backend
pip install -r requirements.txt
uvicorn main:app --host 0.0.0.0 --port 8000
```

The YOLOv8 model (`yolov8m.pt`) downloads automatically on first run via `ultralytics` if not present.

### 2. Frontend

```bash
cd frontend
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

### 3. Start the demo

Click **▶ START DEMO** in the top bar. Switch to **Split Screen Demo** tab.

The demo runs at 2× speed — the full 5-minute scenario completes in ~2.5 minutes.

To start programmatically:
```bash
curl -X POST "http://localhost:8000/demo/start"
```

To run a specific level only:
```bash
curl -X POST "http://localhost:8000/demo/set_level/4"  # PRE-WARN and below
```

---

## Density Thresholds Reference

```
5.0 /m²  → L1 AUTO     PA, escalator reversal
6.0 /m²  → L2 STAGED   Gate throttle (10s cancel)
7.0 /m²  → PRE-WARN    Standby alert (RPF/Police/Fire/Ambulance)
7.5 /m²  → L3 CONFIRM  Platform closure (human required)
8.0 /m²  → SOS         Emergency dispatch (requires PRE-WARN first)
```

---

## Data & Simulation Disclaimer

**This is a proof-of-concept demonstration. It is not connected to, endorsed by, or deployed at any railway station.**

- The demo scenario is a scripted simulation of crowd density patterns — not live camera data
- Video pipeline mode uses publicly available stock footage
- Person detection models were validated against the **ShanghaiTech Part A crowd density dataset** (1,198 images, 330K annotations); not trained on live Indian Railways footage
- All statistics cited (death tolls, response times) are sourced from NCRB reports, official post-incident investigations, and published news records
- Emergency service dispatch shown in the SOS overlay is **simulated** — no real calls or messages are sent

---

*Prahari — Predict. Respond. Prevent.*
