# PRAHARI — Selection Video Script v3
## FAR AWAY Hackathon 2026 | Runtime: ~4:45 | Submission Cut

> **Tone:** Calm. Certain. Never a pitch. The facts speak — you just deliver them cleanly.
> Every number on screen is real. Every claim is provable. Nothing is inflated.
> The video has one job: make a judge feel the problem before they understand the solution.

---

## SCENE 1 — THE NIGHT
**[0:00 – 0:42]**

**[BLACK SCREEN. No music. Complete silence.]**

**[TEXT — white, mono font, slow fade in, one line at a time:]**

> *February 15th, 2025.*
> *New Delhi Railway Station.*
> *8:15 PM.*

**[Hold 2 seconds. Silence.]*

**VO** *(quiet, no affect)*:

> "A train was moved. Last minute.
> Platform 12 to Platform 16.
> An announcement went out. Then another — contradicting the first.
> Fifty thousand people heard two different things."

**[Beat.]*

> "And they all ran toward the same stairway."

**[SCREEN: slow B-roll of crowded station platform — no audio, no captions, just the image.]*

**VO:**

> "Foot Over Bridge 3. Fifteen feet wide.
> Into which the entire crowd poured at once."

**[MUSIC: single low cello note. Barely audible.]*

**VO** *(slower)*:

> "In ninety seconds — it was over."

**[SCREEN: TEXT, red, large, centered — hold 3 full seconds.]*

> **18 PEOPLE DIED.**
> **15 WERE INJURED.**
> **The youngest victim was seven years old.**

**[Silence. Hold. Nothing.]*

---

## SCENE 2 — THE PATTERN
**[0:42 – 1:12]**

**[MUSIC: returns slowly. More urgent. Tempo begins to build.]*

**VO:**

> "Before you call this a tragedy — understand that this is a pattern."

**[SCREEN: text lines appear one at a time, left-aligned:]**

> *Jan 29, 2025 — Maha Kumbh, Prayagraj — 30 dead.*
> *Jan 2025 — Tirupati Temple, Andhra Pradesh — 6 dead.*
> *2017 — Elphinstone Road Station, Mumbai — 23 dead.*
> *2001–2022 — India — 3,074 deaths. 145 every year.*

**VO:**

> "One hundred and forty-five Indians.
> Every. Single. Year.
> Not from earthquakes. Not from floods.
> From crowds — at stations, temples, events —
> places they went to by choice.
> Places that were supposed to be safe."

**[Beat.]*

> "In 2025 alone — 120 people died from stampedes in India.
> The Seoul Itaewon crush killed 159 people in 2022.
> A South Korean court convicted police officers for it — calling it
> a man-made disaster that could have been prevented."

**[TEXT ON SCREEN:]**

> *Man-made. Preventable.*

**VO:**

> "Man-made. Preventable.
> So why does it keep happening?"

---

## SCENE 3 — THE REAL PROBLEM
**[1:12 – 1:48]**

**[MUSIC: drops to a slow, low pulse. Suspense.]*

**VO:**

> "Researchers at Northeastern University found something that should have changed everything."

**[SCREEN: simple graphic — crowd density wave building over time with an 8–15 min window highlighted before the red line]*

> "A crowd crush doesn't appear from nowhere.
> It telegraphs itself — eight to fifteen minutes before it turns lethal.
> The density builds. Flow patterns change. Convergence starts.
> The signal is visible."

**[TEXT ON SCREEN:]**

> *Warning window: 8 to 15 minutes.*

**VO:**

> "So why don't we catch it?"

**[MUSIC: pulse intensifies.]*

> "Because catching it requires a human to —
> notice it on a screen.
> Call a supervisor.
> Wait for approval.
> Dispatch staff.
> And act."

**[TEXT ON SCREEN — building one line at a time:]**

> *Notice → Call → Approve → Dispatch → Act*

**VO** *(slower, deliberate)*:

> "That chain takes four minutes.
> A crush forms in ninety seconds."

**[MUSIC: stops. Dead silence.]*

**[TEXT ON SCREEN — large, red:]**

> **4 minutes vs. 90 seconds.**
> **The math doesn't work.**

---

## SCENE 4 — WHAT WAS TRIED
**[1:48 – 2:18]**

**[MUSIC: slow return. Almost mournful.]*

**VO:**

> "India tried."

**[SCREEN: footage / images of Kumbh command centre, screens, operators]*

> "The 2025 Maha Kumbh deployed the largest crowd monitoring operation in human history.
> Three thousand cameras. Eighteen hundred of them AI-enabled.
> Four command centres. Four hundred trained operators — around the clock."

**[Beat.]*

> "A stampede killed thirty people on January 29th anyway."

**[TEXT ON SCREEN:]**

> *400 humans. 3,000 cameras. 30 dead.*

**VO:**

> "The Delhi High Court ordered Indian Railways to find solutions.
> Sixty high-traffic stations are being upgraded right now.
> Indian Railways is spending one hundred and fifty billion rupees on AI cameras."

**[TEXT ON SCREEN:]**

> *₹150,000,000,000 — being spent.*
> *On cameras that watch.*
> *Not cameras that act.*

**VO:**

> "Every deployed system in the world — Thales, Network Rail, AECOM, Kumbh ICCC —
> does the same thing.
> It sees the problem.
> It alerts a human.
> And waits."

---

## SCENE 5 — WHAT PRAHARI IS
**[2:18 – 3:00]**

**[MUSIC: shifts. Still tense — but now building forward.]*

**[SCREEN: Prahari dashboard fades in — station map, zones lighting up, intervention feed visible.]*

**VO:**

> "We asked a different question.
> What if the system didn't wait?"

**[TEXT ON SCREEN:]**

> **PRAHARI** — *Sanskrit for Sentinel*

**VO:**

> "Prahari is a prediction-first, action-capable crowd safety system.
> It runs on the cameras already installed.
> And instead of alerting a human — it responds."

---

**[SCREEN: split — left side shows raw video feed, right side shows YOLOv8 bounding boxes on every person.]*

**VO** *(calm, factual)*:

> "The vision layer uses YOLOv8 — the industry standard for real-time object detection.
> 95.3% crowd detection accuracy. 28 frames per second.
> But standard detection misses people in dense crowds — bodies overlapping, partial views.
> So we run SAHI — Slicing Aided Hyper Inference —
> which cuts the frame into 192-pixel tiles, runs inference on each, then stitches them back.
> Where plain detection finds 10 people in a dense scene —
> SAHI finds 109."

**[TEXT ON SCREEN:]**

> *YOLO detection: ~10 persons*
> *SAHI-enhanced: ~109 persons*
> *Same frame. Same model. Smarter input.*

---

**[SCREEN: density graph rising, prediction curve appearing 90 seconds ahead.]*

**VO:**

> 

"Every zone's density history feeds a prediction engine.
> Using flow vector modelling and sequence extrapolation,
> Prahari forecasts where the crowd is heading — ninety seconds before it gets there.
> That forecast is the intervention window."

**[TEXT ON SCREEN:]**

> *Detection → Density mapping → 90s prediction → Autonomous response*

---

**[SCREEN: intervention feed with L1 / L2 / L3 / PRE-WARN / SOS entries cascading in.]*

**VO:**

> "The decision engine has five levels of response — each with a different authority.
> Level 1 fires immediately, no human required — PA announcements, escalator direction, signage.
> Level 2 auto-executes with a ten-second cancel window — gate throttle, RPF dispatch.
> Level 3 is staged for human confirmation — platform closure — one tap, pre-filled.
> And if the crowd still does not slow —"

**[Beat.]*

> "— two more levels activate that have never existed in any deployed system."

---

## SCENE 6 — THE DEMO
**[3:00 – 4:10]**

**[SCREEN: full dashboard — demo starts. Station map, intervention feed, both scenario panels.]*

**VO:**

> "This is the New Delhi station layout.
> The same crowd data. The same timeline from that night.
> Left — human operated. Right — Prahari.
> Watch."

---

**[T+0:21 — FOB1 crosses 5.0/m²]*

**[Intervention feed: L1-AUTO · FOB1 · PA-01 ISSUED]*
**[PA banner slides in across screen.]*

**VO:**

> "Twenty-one seconds. Density crosses five persons per square metre.
> PA announcement fires — automatically.
> Response time: 2.3 seconds.
> The human operator is still watching."

---

**[T+0:26 — FOB1 crosses 6.0/m²]*

**[L2 staged card appears. Countdown: 10... 9...]*

**VO:**

> "Six persons per square metre — Level 2 stages.
> Gate B throughput reduced. Auto-executes in ten seconds.
> Nobody cancels. The restriction executes."

---

**[T~0:45 — FOB1 prediction crosses 7.5/m² in 90s]*

**[L3 pending-confirm card appears. Phone notification pops.]*

**VO:**

> "The prediction engine sees where this is heading.
> Level 3 staged — platform closure. Pre-filled. Waiting for one tap.
> The decision is already made. A human just has to confirm it."

---

**[T~1:00 — FOB1 crosses 7.0/m²]*

**[Amber PRE-WARN banner slides in from top.]*

**[MUSIC: intensifies.]*

**VO:**

> "Seven persons per square metre.
> The interventions are running. The crowd is not slowing.
> So Prahari activates something no system has ever had —
> a pre-warning."

**[TEXT ON SCREEN — amber:]**

> *⚠ PRE-WARN ACTIVE — FOB-3 — Emergency services on standby*

**VO:**

> "Four emergency services — simultaneously — placed on standby.
> RPF. Police. Fire Brigade. Ambulance.
> Not dispatched yet. Staged.
> Ready to move the moment the next threshold is crossed.
> Because when the SOS fires — there will be no time to make phone calls."

---

**[T~1:15 — FOB1 crosses 8.0/m²]*

**[MUSIC cuts. Complete silence.]*

**[SCREEN: full-screen red emergency overlay erupts. Four rows light up one by one.]*

```
  ● RPF               →  DEPLOYED         ✓ SENT
  ● POLICE 100        →  CALLED           ✓ SENT
  ● FIRE BRIGADE 101  →  DISPATCHED       ✓ SENT
  ● AMBULANCE 108     →  REQUESTED        ✓ SENT
```

**VO** *(slower. One breath per line)*:

> "Eight persons per square metre.
> Lethal density.
> The failsafe fires."

**[Single low pulse with each row.]*

**VO:**

> "All four services dispatched — autonomously — in under three seconds.
> Not because someone pressed a button.
> Because the system was built to ensure that no human latency
> stands between a crowd at lethal density
> and the people who can save them."

**[Beat. Long pause.]*

> "On February 15th, 2025 —
> that call was never made.
> Because no one in that control room
> had a button for this."

---

**[SCREEN: bottom comparison bar appears.]*

```
  HUMAN RESPONSE    →   4 min 12 sec    →   CRUSH OCCURRED
  PRAHARI           →   2.3 seconds     →   EMERGENCY SERVICES STAGED
```

**VO:**

> "Same station. Same night. Different outcome."

---

## SCENE 7 — HOW WE SCALE
**[4:10 – 4:35]**

**[MUSIC: clean, forward. Purposeful.]*

**[SCREEN: architecture diagram — camera → edge device → backend → dashboard → emergency APIs.]*

**VO:**

> "Prahari is a prototype.
> But it was designed from day one to plug into what already exists."

**[TEXT ON SCREEN — building as VO speaks:]**

> *Cameras → ONVIF protocol → any existing CCTV network*

**VO:**

> "Every CCTV camera installed under RailTel's ₹150 billion programme
> supports ONVIF — the open standard for camera integration.
> Prahari connects through that. No new hardware needed at the lens."

**[TEXT ON SCREEN:]**

> *Edge processing → NVIDIA Jetson AGX Orin — on-site inference, under 3ms latency*

**VO:**

> "Inference runs on an edge device at the station — not the cloud.
> Local. Fast. No internet dependency. No single point of failure."

**[TEXT ON SCREEN:]**

> *PA + signage → CRIS API → Indian Railways Digital Display System*
> *Gate + escalator control → SCADA integration*

**VO:**

> "PA announcements and platform signage connect through CRIS —
> the Indian Railways Centre for Railway Information Systems —
> the same API that powers displays at every A1 station today.
> Gate and escalator control integrates with existing SCADA systems
> already installed at large stations."

**[TEXT ON SCREEN:]**

> *Crowd prediction → IRCTC booking data → pre-event density forecast*

**VO:**

> "And before a train even arrives —
> IRCTC booking data tells us which platforms will fill, and when.
> Prahari starts predicting two hours before the crowd forms."

**[TEXT ON SCREEN:]**

> *SOS dispatch → Police 100 / Fire 101 / Ambulance 108 → existing digital dispatch APIs*

**VO:**

> "The emergency dispatch APIs for Police 100, Fire 101, and Ambulance 108
> already exist as digital systems in all major Indian cities.
> Prahari calls them the same way a human operator would —
> except it never freezes. Never hesitates. Never waits for approval."

---

## SCENE 8 — CLOSE
**[4:35 – 4:50]**

**[MUSIC: single cello returns. Not mourning this time. Resolved.]*

**[SCREEN: fades to black. Text only. One line at a time. Slow.]*

> *The cameras are already there.*
> *The money is already flowing.*
> *The APIs already exist.*

**[Beat.]*

> *All of it watching.*
> *None of it acting.*

**[Long beat. Final line fades in — white, larger.]*

> *Prahari is what makes them act.*

**[Hold 2 seconds.]*

**[TITLE CARD — clean white on black:]**

> **PRAHARI**
> *Predict. Respond. Prevent.*

**[Underneath — small, mono font:]**

> *YOLOv8 · SAHI · FastAPI · Next.js · WebSocket · NVIDIA Jetson*
> *Indian Railways · RailTel · CRIS · IRCTC · ONVIF*
> *FAR AWAY Hackathon 2026 — Railways Theme*+

**[FADE OUT. Silence.]*

---

## DIRECTOR NOTES

### Music arc
| Timestamp | State |
|---|---|
| 0:00–0:42 | Complete silence |
| 0:42–1:12 | Single cello. Low, slow. |
| 1:12–1:48 | Low electronic pulse. Building tension. |
| 1:48–2:18 | Mournful undertone. Almost resigned. |
| 2:18–3:00 | Shifts forward. Purpose enters the sound. |
| 3:00–3:50 | Tension climbs steadily. Urgency without drama. |
| 3:50 (SOS fires) | **CUT TO SILENCE.** Hard cut. No fade. |
| 3:51–4:10 | Single low pulse — one beat per service row lighting up. |
| 4:10–4:35 | Clean, forward, architectural. Not triumphant — confident. |
| 4:35–4:50 | Cello returns. Single note. Resolves. |

---

### Screen content by scene
| Scene | What to show |
|---|---|
| 1 | Real photos / B-roll of NDLS, news headlines, police tape |
| 2 | Text cards only — let the numbers land without distraction |
| 3 | Simple animated timeline / crowd density wave graphic |
| 4 | Kumbh command centre footage, Prahari competitor system screenshots |
| 5 | Split: raw video feed + YOLO tracking overlay; density graph; intervention feed |
| 6 | **Live Prahari demo — run the actual dashboard, record screen** |
| 7 | Architecture diagram (clean, minimal — not a slide, not a whiteboard) |
| 8 | Text only. Black background. Nothing else. |

---

### Critical delivery instructions

**Lines that require a pause after them — do not rush:**
- *"In ninety seconds — it was over."* → hold 1.5s
- *"The youngest victim was seven years old."* → hold 3s
- *"The math doesn't work."* → hold 2s
- *"And waits."* → hold 1.5s before cutting to Scene 5
- *"Because no one in that control room had a button for this."* → hold 2s
- *"Same station. Same night. Different outcome."* → hold 2.5s, then cut to Scene 7

**What not to say:**
- Never say "our AI" or "our algorithm" — say "the system"
- Never say "we built" — say "Prahari does"
- Do not explain SAHI technically in the VO — the text card does that
- Do not say "tech stack" — describe each component by what it does, not what it's called
- Do not end on statistics — end on the single human idea: *makes them act*

**On the tech stack section (Scene 5):**
The goal is not to impress judges with names. It is to make them believe this is real and deployable.
Every component mentioned must be shown visually at the same moment it is spoken.
Speed matters: Scene 5 should feel like a fast-moving architecture walkthrough, not a lecture.
Keep it under 45 seconds of screen time even if it covers 6 components.

**On the failsafe (Scene 6 — SOS moment):**
The silence when the SOS fires is the emotional peak of the entire video.
Do not break it with music immediately.
Let the four service rows light up in silence, one by one, with a single pulse each.
The weight of that moment — four emergency services dispatched without anyone pressing a button — must land before the VO continues.
This is the scene that no competing team will have. Let it breathe.

**On Scene 7 (scaling):**
This is the technical credibility scene. Judges who get to this scene are already sold on the idea —
now they need to believe it can be real.
Speak faster here than in earlier scenes. This is not emotional — it is factual.
The architecture diagram should be on screen the entire time, highlighting each component as it's mentioned.

---

### What the video must prove to selection judges

| Question a judge will ask | Where it is answered |
|---|---|
| Is the problem real and urgent? | Scenes 1–2 |
| Has anyone tried to solve it before? | Scene 4 |
| Why does the existing approach fail? | Scene 3 |
| What does Prahari actually do differently? | Scene 5 |
| Does it work — can we see it? | Scene 6 |
| Is there a safety net if the crowd doesn't respond? | Scene 6 (PRE-WARN + SOS) |
| What's the tech and is it real? | Scene 5 + title card |
| Can this actually be deployed at a railway station? | Scene 7 |
| Why this team, why now? | Closing text: the cameras exist, the money flows, Prahari makes them act |
