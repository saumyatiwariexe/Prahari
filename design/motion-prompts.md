# Prahari — Motion Graphic Prompts

Paste each scene prompt into Claude (or any AI tool). Fonts: Space Grotesk + Inter + Space Mono.
Canvas: 1920×1080. Background: #080C14.

---

## Scene 1 — Cold Open (0:00–0:22)

```
Create a minimal motion graphic. 1920×1080, dark background #080C14.

A single number fades in at center:
  18
  font: Space Grotesk 700, size 120px, color white #C8D8E8, letter-spacing -0.02em

Below it, 0.6s later, staggered fade-up:
  "people died"
  font: Space Grotesk 300, size 28px, color #8AB4D4, letter-spacing 0.08em

Below that, 0.4s later:
  "New Delhi Railway Station · February 15, 2025"
  font: Inter 400, size 14px, color #4A6A84, letter-spacing 0.06em

Bottom-left corner, very small:
  "200+ cameras were watching."
  font: Space Mono 400, size 11px, color #1A3050

A thin 1px horizontal rule #142035 slides in from left to right below "people died", duration 800ms.

Hold 3s. Then the number pulses once (scale 1→1.02→1, 400ms), and the entire composition fades to black over 600ms.
```

---

## Scene 2 — The Gap (0:22–0:50)

```
Create a split timeline motion graphic. 1920×1080, background #080C14.

Two vertical tracks side by side, separated by a 1px center line #142035:

LEFT TRACK — label "CRUSH FORMATION" in Space Grotesk 500, 10px, #4A6A84, letter-spacing 0.14em
  Timeline bar, color #E82020, animates from 0% to 100% width over 1.5s
  At 100%: overlay text "90 SECONDS" in Space Grotesk 700, 48px, #FF4040

RIGHT TRACK — label "HUMAN DECISION LOOP" same style
  Timeline bar, color #8AB4D4 at 20% opacity, animates slowly
  At 90s mark: a red X appears. Bar is only at 35%.
  Below the bar: four rows stagger in (each 200ms apart):
    "Operator notices" — Space Mono 11px #4A6A84
    "Escalated to supervisor" — same
    "Supervisor authorizes" — same
    "Response dispatched" — same, color #E82020
  Total label beneath: "4 MINUTES 12 SECONDS" Space Grotesk 700 48px #E82020

Bottom center: thin label fades in last:
  "By the time humans respond, it is already too late."
  Inter 400, 15px, #4A6A84, max-width 600px centered
```

---

## Scene 3 — System Title Card (0:50–1:08)

```
Create a minimal product intro card. 1920×1080, background #080C14.

Center composition:

Step 1 (0ms): small label fades in
  "INTRODUCING"
  Space Grotesk 500, 11px, #4A6A84, letter-spacing 0.22em

Step 2 (400ms): wordmark scales in from 0.92 → 1.0
  "PRAHARI"
  Space Grotesk 700, 88px, color #C8D8E8, letter-spacing -0.03em

Step 3 (700ms): thin green underline draws left to right
  width: 360px, height: 2px, color: #00C84C, duration: 500ms

Step 4 (900ms): tagline fades up
  "Autonomous crowd safety for Indian Railways"
  Inter 300, 18px, color #8AB4D4, letter-spacing 0.02em

Step 5 (1400ms): three small chips appear in a row below (stagger 120ms each):
  chip style: border 1px solid #142035, padding 4px 12px, border-radius 2px, background transparent
  "YOLOv8"  · text Space Grotesk 500, 11px, #4A6A84
  "FastAPI"
  "Next.js"

Background: single very faint grid pattern — 80px cells, lines at 1px #0E1E30, opacity 0.4
```

---

## Scene 4 — 5-Level Response Engine (1:08–1:45)

```
Create an animated escalation table. 1920×1080, background #080C14.

Title at top (y=120):
  "GRADED AUTONOMOUS RESPONSE"
  Space Grotesk 600, 22px, #C8D8E8, letter-spacing 0.06em

Five rows animate in with 150ms stagger, each row sliding from x=-20 to x=0, fading in:

Row structure (full-width, height 76px, border-bottom 1px solid #0E1E30):
  Left: colored level badge (pill, 2px border-radius)
    · L1  — background #00C84C14, border #00C84C, text "L1 AUTO"     Space Grotesk 700 11px #00C84C
    · L2  — background #E8A00014, border #E8A000, text "L2 STAGED"   Space Grotesk 700 11px #E8A000  
    · PRE — background #FF6B0014, border #FF6B00, text "PRE-WARN"    Space Grotesk 700 11px #FF6B00
    · L3  — background #E8202014, border #E82020, text "L3 CONFIRM"  Space Grotesk 700 11px #E82020
    · SOS — background #FF1A1A14, border #FF1A1A, text "SOS"         Space Grotesk 700 11px #FF1A1A

  Center: trigger + action
    density threshold — Space Mono 400 13px level-color
    action description — Inter 400 14px #8AB4D4

  Right: latency badge
    · L1 "< 3s" — #00C84C
    · L2 "10s"  — #E8A000
    · PRE "< 3s" — #FF6B00
    · L3 "Human" — #E82020
    · SOS "< 3s" — #FF1A1A
    font: Space Grotesk 700, 24px

Content:
  L1  | ≥ 5/m²  | PA announcement · escalator direction · signage reversal | < 3s
  L2  | ≥ 6/m²  | Gate throttling — 10s auto-execute with cancel window     | 10s
  PRE | ≥ 7/m²  | Standby alert — RPF · Police · Fire Brigade · Ambulance   | < 3s
  L3  | ≥ 7.5/m²| Platform closure — one-tap human confirm required          | Human
  SOS | ≥ 8/m²  | Emergency dispatch — RPF deployed, 100/101/108 called      | < 3s

After all rows appear, a thin green horizontal bar pulses briefly along the L1 row.
```

---

## Scene 5 — SAHI Detection Comparison (1:45–2:05)

```
Create a before/after detection comparison card. 1920×1080, background #080C14.

Two panels side by side (900px each, 24px gap):

LEFT PANEL — label "PLAIN YOLO" #4A6A84 Space Grotesk 500 11px letter-spacing 0.14em
  Dark rectangle (aerial crowd footage placeholder) 900×500px, border 1px #142035
  10 small white dots scattered loosely — each dot 8px circle, color #C8D8E8 opacity 0.6
  Counter animates up: "10 persons detected"
    Space Grotesk 600, 28px, #E82020

RIGHT PANEL — label "YOLO + SAHI TILED" #00C84C same style
  Same dark rectangle
  109 small white dots packed more densely — animate in as a cluster over 800ms
  Counter animates up 0→109: "109 persons detected"
    Space Grotesk 600, 28px, #00C84C

Below both panels, centered:
  "SAHI: 192px tiles · 30% overlap · 10× more accurate in dense crowds"
  Space Mono 400, 12px, #4A6A84

Top right of right panel: small chip
  "+990%" Space Grotesk 700 16px #00C84C
  border 1px #00C84C, padding 4px 10px
```

---

## Scene 6 — Split Screen Demo Card (2:05–2:30)

```
Create a split comparison result card. 1920×1080, background #080C14.

Two panels (880px each, 32px gap):

LEFT — "HUMAN-OPERATED" Space Grotesk 500 11px #E82020 letter-spacing 0.14em
  Panel border: 1px solid #E82020, background #0C0808
  Center content:
    Large number: "4m 12s" Space Grotesk 700 72px #E82020
    Below: "First response time" Inter 400 14px #4A6A84
    Below (with 400ms delay): red warning block fades in
      "CRUSH EVENT" Space Grotesk 700 18px #FF4040, background #E8202018, padding 8px 20px
      "FOB-3 Stairway · 18 dead · 15 injured" Inter 400 13px #8A4040 below it

RIGHT — "PRAHARI — AUTONOMOUS AI" Space Grotesk 500 11px #00C84C same style  
  Panel border: 1px solid #00C84C, background #06100A
  Center content:
    Large number: "2.3s" Space Grotesk 700 72px #00C84C (count up from 0)
    Below: "Autonomous response" Inter 400 14px #4A6A84
    Below (400ms delay): green success block
      "CRUSH PREVENTED" Space Grotesk 700 18px #00C84C, background #00C84C18, padding 8px 20px
      "FOB-3 sealed · Crowd diverted · 0 casualties" Inter 400 13px #2A6A44 below it

Bottom center: thin label
  "Identical input. The only difference is the decision loop."
  Inter 300 italic 15px #4A6A84
```

---

## Scene 7 — Expansion Stack (2:30–2:50)

```
Create a minimal tech stack flow. 1920×1080, background #080C14.

Title (top):
  "PRODUCTION PATH"
  Space Grotesk 600 20px #C8D8E8 letter-spacing 0.08em

Six cards in a 3-column grid (2 rows), stagger in 120ms each:
  Card style: border 1px solid #142035, background #0C1220, padding 20px 24px, border-radius 2px

  Row 1:
    [ONVIF]        "Any IP camera already installed" — #4A6A84 Inter 14px
    [Jetson AGX]   "275 TOPS edge inference" — same
    [CRIS + NTES]  "Live train schedule context" — same

  Row 2:
    [SCADA + BMS]  "Direct gate & escalator control" — same
    [IRCTC]        "Push alerts to ticketed passengers" — same
    [100 · 101 · 108] "Emergency dispatch APIs" color #E82020

  Card header: Space Grotesk 600 14px #C8D8E8
  Card body: Inter 400 13px #4A6A84

At the end, a thin horizontal arrow slides across connecting all 6 cards, color #142035.
```

---

## Scene 8 — Close (2:50–3:00)

```
Create a minimal closing card. 1920×1080, background #080C14.

Center, staggered:

Step 1: small label
  "FAR AWAY 2026 · RAILWAYS THEME"
  Space Grotesk 500 10px #1A3050 letter-spacing 0.2em

Step 2 (300ms later): main line fades up
  "Prahari is what makes them act."
  Space Grotesk 300 italic 40px #C8D8E8 max-width 700px centered

Step 3 (700ms): thin underline draws under main line
  width 400px, 1px, #00C84C, left-to-right 600ms

Step 4 (1000ms): three small green dots pulse in horizontally (stagger 150ms)
  each 6px circle color #00C84C

Background has a very slow (8s) radial pulse from center: 
  a circle expands from radius 0 to 600px, stroke #0E1E30 1px, opacity fades 1→0 over 8s, loops.

Hold 4s. Fade to black.
```

---

## Color Quick Reference

| Token     | Hex       | Use                          |
|-----------|-----------|------------------------------|
| bg.base   | `#080C14` | All scene backgrounds        |
| text.1    | `#C8D8E8` | Primary headings             |
| text.2    | `#8AB4D4` | Body / secondary text        |
| text.dim  | `#4A6A84` | Labels, captions             |
| l1.green  | `#00C84C` | Safe / Prahari / confirmed   |
| l2.amber  | `#E8A000` | Warning / L2 staged          |
| l3.red    | `#E82020` | Danger / human failure       |
| pre.orange| `#FF6B00` | PRE-WARN standby             |
| sos.red   | `#FF1A1A` | SOS / critical               |
| border    | `#142035` | All panel borders            |

## Font Stacks

```css
/* Headings / UI */
font-family: 'Space Grotesk', -apple-system, sans-serif;

/* Body copy */
font-family: 'Inter', -apple-system, sans-serif;

/* Data / terminal */
font-family: 'Space Mono', 'Courier New', monospace;
```
