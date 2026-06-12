# Prahari
**Predict crowd crush formation 90 seconds before it becomes lethal. Respond autonomously.**

Built for FAR AWAY 2026 | Railways Theme

---

## The Problem

On February 15, 2025, 18 people died at New Delhi Railway Station. The system in place: 200+ cameras, human operators in a control room. They saw the crowd building. They were too slow.

The problem is not the cameras. It's the 4-minute human decision loop.

A crowd crush can form in **90 seconds**. The human decision chain takes **4+ minutes**.

## The Solution

Prahari replaces human reaction time with **graded autonomous response**:

| Level | Trigger | Action | Latency |
|---|---|---|---|
| L1 — Autonomous | Density ≥ 5/m² | PA announcement, escalator direction, signage | **< 3 seconds** |
| L2 — Assisted | Density ≥ 6/m² | Gate reduction — 10s cancel window | 10 seconds |
| L3 — Human Confirm | Predicted density ≥ 7.5/m² in 90s | Platform closure — one-tap confirm | Human-controlled |

The system **predicts** dangerous formations 90 seconds ahead using crowd flow vector extrapolation — not just detecting what's happening, but forecasting what will happen.

## Demo

> Split-screen view: Human-operated station vs. Prahari side-by-side on identical input.
> Human response: 4 minutes 12 seconds. Prahari: 2.3 seconds.
> On the left — crush occurs. On the right — averted.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Person Detection | YOLOv8n (Ultralytics) — 95.3% accuracy, 28 FPS |
| Object Tracking | ByteTrack (built into Ultralytics) |
| Prediction | Rule-based crowd flow extrapolation with convergence detection |
| Backend | FastAPI + WebSocket (Python) |
| Frontend | Next.js 14 + TailwindCSS + Framer Motion |
| Charts | Recharts |

---

## Setup

### Prerequisites
- Python 3.10+
- Node.js 18+

### Backend

```bash
cd backend
pip install -r requirements.txt
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

### Frontend

```bash
cd frontend
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

### Start the demo

Click **▶ Start Demo** in the top bar, or:

```bash
curl -X POST http://localhost:8000/demo/start
```

Switch to **Split Screen Demo** view to see the autonomous vs. human comparison.

---

## Project Structure

```
prahari/
├── backend/
│   ├── main.py              # FastAPI + WebSocket server
│   ├── constants.py         # All thresholds (single source of truth)
│   ├── vision/              # YOLOv8 inference + zone tracking
│   ├── prediction/          # Flow extrapolation (90s forecasting)
│   ├── decision/            # Graded intervention engine (L1/L2/L3)
│   └── demo/                # Pre-scripted FOB-3 Event scenario
└── frontend/
    ├── app/                 # Next.js App Router
    ├── components/          # StationMap, SplitScreen, InterventionFeed
    └── lib/                 # WebSocket client, types, constants
```

---

## Disclaimer

This is a proof-of-concept demonstration built for FAR AWAY Hackathon 2026. It is not connected to, endorsed by, or deployed at any railway station. The scenario runs on a simulation environment representing a generic major railway terminal. Video processing, when enabled, uses publicly available crowd density research datasets.

---

*Prahari — Predict. Respond. Prevent.*
