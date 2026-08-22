# Onboarding: No-Code Station Configuration — Design

**Status:** Approved for planning
**Date:** 2026-08-22
**Owner:** Team CrowdGuard (Prahari), FAR AWAY 2026

## 1. Problem

Prahari's MVP hardcodes every fact about the station it monitors across three
places, in two languages:

- `backend/constants.py` — `ZONES` (id/name/area_m2), all density thresholds
  (`DENSITY_SAFE`…`FAILSAFE_DENSITY`, `L1_TRIGGER_DENSITY`…`L3_TRIGGER_DENSITY`,
  `PRE_WARN_DENSITY`, `L2_COUNTDOWN_SECONDS`).
- `backend/vision/zone_map.py` — pixel-rectangle zone geometry
  (`ZONE_BOUNDS_FULL`) used by the scenario/detector path.
- `backend/vision/video_pipeline.py` — a **second, independent** hardcoded
  pixel-rectangle zone geometry (`_ACTIVE_ZONES`, `_SINGLE_ACTIVE_ZONES`) with
  its own `area_m2` values, used by the live SAHI video-inference path. This
  set already disagrees with `constants.py` (e.g. `CONC` area is 1200 m² in
  `constants.py` vs. 60 m² in `video_pipeline.py`) — a pre-existing
  inconsistency, not something this design introduces.
- `frontend/lib/constants.ts` — `ZONE_META` (label/shortLabel) and
  `DENSITY_THRESHOLDS`, duplicated by hand from the backend values.
- `backend/decision/interventions.py` — per-zone action *message text* for
  L1/L2/L3/PRE_WARN/SOS, keyed by zone id.

Onboarding a new station today means editing all of the above by hand, in
sync, without validation. That's the "onboarding" flow this feature replaces
with a live, validated, no-code UI — while the shipped NDLS demo keeps
working unchanged as the default configuration.

## 2. Goals / Non-goals

**Goals** (from the four named config targets):
- **Thresholds** — every density trigger point + `L2_COUNTDOWN_SECONDS`,
  editable, validated, hot-applied.
- **Labels** — zone display name/shortLabel, editable, hot-applied.
- **Categories** — a user-managed list of zone categories (label/color),
  assignable per zone.
- **Views** — dashboard widget visibility toggles, plus named presets of
  that toggle set that can be saved/applied/deleted.

Plus, per explicit sign-off, a stretch capability beyond the four named
items:
- **Zone geometry** — a visual, drag-to-draw calibration tool that edits
  the pixel rectangles currently split across `zone_map.py` and
  `video_pipeline.py`, unifying them into one config-driven source.

**Non-goals** (explicitly out of scope this round):
- Per-zone **action message text** (`L1_ACTIONS`/`L2_ACTIONS`/`L3_ACTIONS`/
  `PRE_WARN_ACTIONS`/`SOS_ACTIONS` copy) stays hardcoded for the existing
  NDLS zones. Newly added zones get a generic templated fallback message
  (see §5.3) rather than custom copy — authoring custom per-zone intervention
  scripts is a larger, separate feature.
- The scripted demo timeline (`backend/demo/scenario_runner.py` keyframes)
  stays hardcoded to the NDLS "FOB-3 Event" narrative. It is a fixed
  historical reenactment for judges, not something a real deployer configures.
  New zones added via onboarding will not appear in the scenario replay; they
  work in **live video mode** and in the decision engine generally.
- Multi-station / multi-tenant profiles, auth, and a database. Single
  station, single JSON config file, matching current single-process
  deployment.
- Changing the L3-always-confirms and SOS-requires-prior-PRE_WARN safety
  rules, or making them configurable. These stay hardcoded per
  `AGENT_RULES.md`.

## 3. Architecture

A new backend subsystem, `backend/config/`, becomes the single source of
truth for everything in Goals above. It replaces the relevant parts of
`constants.py`, `zone_map.py`, and `video_pipeline.py`'s hardcoded zone
lists; `frontend/lib/constants.ts`'s content maps (`ZONE_META`,
`DENSITY_THRESHOLDS`) are replaced by data fetched from this store.

```
backend/config/
  schema.py    Pydantic models (see §4)
  store.py     load / validate / get / update / reset / persist
  defaults.py  the seeded NDLS config (today's hardcoded values, verbatim)
  station.config.json   <- runtime state, git-ignored, seeded from defaults.py on first run
```

- `store.py` holds the current `StationConfig` as an in-memory singleton.
  `GET /config` reads it; `PUT /config` validates the incoming document,
  writes it to `station.config.json` (temp-file-then-rename, so a crash
  mid-write can't corrupt the file), swaps the in-memory singleton, and
  returns the accepted config.
- Any code that today does `from constants import ZONES` / thresholds, or
  reads `zone_map.ZONE_BOUNDS_FULL` / `video_pipeline._ACTIVE_ZONES`, is
  changed to call `config_store.get()` at the point of use (not at import
  time), so a config change takes effect on the next tick without a process
  restart.
- `constants.py` is trimmed to the handful of values that are *not*
  station-specific config (`WEBSOCKET_INTERVAL_MS`, `SCENARIO_TICK_MS`,
  `PREDICTION_HORIZON_SECONDS`, `PREDICTION_INTERVALS`) — those stay as
  real Python constants.

**Why a JSON file + REST + hot-swap, and not the alternatives considered:**
- *Env/YAML file + manual restart* is simpler to build but fails the
  "no-code" bar — it's still hand-editing a file with no in-UI validation
  or live feedback, which is exactly today's pain point.
- *Multi-tenant DB with switchable station profiles* is more powerful (it
  would suit the PRD's metro/event-venue expansion story) but is scope this
  single-station hackathon demo doesn't need. Noted as a natural future
  extension, not built now (YAGNI).

## 4. Data model (`schema.py`)

```python
class ZoneConfig(BaseModel):
    id: str                      # stable key, e.g. "FOB1"
    label: str
    short_label: str
    category_id: str             # references CategoryConfig.id
    area_m2: float
    bounds: ZoneBounds | None    # x1,y1,x2,y2 in the calibration frame's pixel space; None until calibrated

class CategoryConfig(BaseModel):
    id: str
    label: str
    color: str                   # hex, used for map styling

class ThresholdConfig(BaseModel):
    density_safe: float
    density_warning: float
    density_critical: float
    density_lethal: float
    l1_trigger: float
    l2_trigger: float
    l3_trigger: float            # predicted-90s threshold
    pre_warn_trigger: float
    failsafe_trigger: float      # SOS
    l2_countdown_seconds: int

class ViewConfig(BaseModel):
    show_zone_chart: bool
    show_prediction_overlay: bool
    show_flow_vectors: bool
    show_critical_zones_panel: bool
    zone_display_order: list[str]

class PresetConfig(BaseModel):
    name: str
    view: ViewConfig

class StationConfig(BaseModel):
    zones: list[ZoneConfig]
    categories: list[CategoryConfig]
    thresholds: ThresholdConfig
    view: ViewConfig              # currently-active view
    presets: list[PresetConfig]
    video_width: int
    video_height: int
    version: int                  # bumped on every accepted PUT, used for WS change detection
```

**Validation enforced on `PUT /config`** (rejected with 422 + field-level
errors otherwise):
- `density_safe < density_warning < density_critical < density_lethal`.
- `l1_trigger <= l2_trigger`, `pre_warn_trigger <= failsafe_trigger`
  (mirrors today's fixed ordering — keeps the escalation ladder sane).
- Every `ZoneConfig.category_id` must reference an existing `CategoryConfig`.
- `zone_display_order` must be a permutation of the current zone ids.
- Zone ids are unique, non-empty, and immutable after creation (renaming a
  zone's `id` is not supported — delete/recreate — because it's the join key
  used throughout the decision engine and intervention log).

## 5. Backend changes

### 5.1 New REST endpoints (`main.py`)
- `GET /config` → current `StationConfig`.
- `PUT /config` → validate, persist, hot-swap, broadcast (see §5.4).
- `POST /config/reset` → restore `defaults.py`'s NDLS config verbatim. This
  is the demo's safety net — "put it back to the working state" is always
  one click away.
- `GET /config/calibration-frame` *(Phase 2, §7)* → a single JPEG frame
  (base64) for the zone-drawing canvas, grabbed from the currently
  configured video source via the existing `VideoPipeline`/OpenCV read path.

### 5.2 Consuming code becomes config-driven
`decision/engine.py`, `main.py` (`_system_status`, `_do_reset`), `vision/
detector.py`, `vision/tracker.py`, `vision/zone_map.py`, and `vision/
video_pipeline.py` switch their threshold/zone lookups from
`constants`/hardcoded-dict imports to `config_store.get()`. `zone_map.py`'s
`ZONE_BOUNDS_FULL` and `video_pipeline.py`'s `_ACTIVE_ZONES`/
`_SINGLE_ACTIVE_ZONES` are both replaced by `ZoneConfig.bounds` from the
same store — this is the fix for the pre-existing duplication noted in §1.
Until a zone has been calibrated (`bounds is None`), it's simply excluded
from pixel-to-zone mapping (contributes 0 detections) but still participates
in the decision engine, config UI, and (in scenario mode, if it happens to
be one of the scripted NDLS zones) the demo timeline.

### 5.3 Generic fallback action text
`L1_ACTIONS`/`L2_ACTIONS`/`L3_ACTIONS`/`PRE_WARN_ACTIONS`/`SOS_ACTIONS`
stay as explicit per-zone dictionaries (§2 non-goals). `engine.py`'s
`if zone_id in L1_ACTIONS:` guards are changed to fall through to a
generic templated message built from the zone's configured `label` when
no explicit entry exists, e.g.:

```
f"{zone.label} is experiencing heavy congestion. Passengers please use an alternate route."
```

so a zone added purely through the no-code UI still produces real,
functioning interventions — it just gets generic copy instead of
hand-authored copy, same as every other config-driven behavior for that
zone.

### 5.4 Hot-reload / live broadcast
`StationConfig.version` is included in every `/ws/live` broadcast tick.
The frontend's `ConfigProvider` compares it to the version it last fetched
and calls `GET /config` again on mismatch — piggybacking on the existing
200ms broadcast loop rather than adding a second push channel.

## 6. Frontend changes

- `frontend/lib/config-context.tsx` — `ConfigProvider` fetches `GET /config`
  on mount, exposes it via `useStationConfig()`, and refetches on `version`
  mismatch from the WS payload (§5.4).
- `StationMap`, `ZoneChart`, `InterventionFeed`, `PreWarnBanner`,
  `RPFAlert`, etc. switch from importing `ZONE_META`/`DENSITY_THRESHOLDS`
  to reading them from `useStationConfig()`. `COLOR_MAP`/`BORDER_MAP`/
  `TEXT_MAP`/`LEVEL_COLORS` in `constants.ts` stay static — they map a
  color *name* to CSS, not station content.
- `page.tsx` reads `view.show_*` flags from config to conditionally render
  dashboard widgets.
- **Settings slide-over** (new `SettingsPanel.tsx`, opened from a gear icon
  in the header), four tabs, each a thin form over `PUT /config`:
  - **Zones** — list with add/remove/edit (label, shortLabel, category,
    area_m2); a "Calibrate boundaries" button per zone opens the canvas
    below *(Phase 2, §7 — the Zones tab itself ships in Phase 1; this one
    button and its canvas are the Phase 2 addition)*.
  - **Zone calibration canvas** *(Phase 2, §7)* (new `ZoneCalibrator.tsx`) — fetches
    `GET /config/calibration-frame`, renders it on a `<canvas>`, overlays
    existing zone rectangles as draggable/resizable boxes (react-konva or
    plain canvas pointer-event math — implementation detail for the plan),
    and on save writes the new `bounds` back into that zone's `ZoneConfig`
    via the Zones tab's pending edit, submitted together with the rest of
    the form.
  - **Thresholds** — numeric inputs for every `ThresholdConfig` field, a
    live color-swatch preview per band, client-side mirrors of the
    ordering validation in §4 for immediate feedback before hitting the API.
  - **Categories** — add/edit/remove category (label, color).
  - **Views** — checkboxes for each `show_*` flag; "Save as preset" /
    preset dropdown to apply or delete a saved `PresetConfig`.
  - Every tab has a persistent "Reset to NDLS defaults" action
    (`POST /config/reset`).

## 7. Phasing

**Phase 1 — ships first, is the complete answer to the four named targets:**
config store (schema/store/defaults), `GET`/`PUT`/`POST reset` endpoints,
all consuming-code wiring for thresholds + zone metadata + categories,
`ConfigProvider` + hot-reload, and the Zones/Thresholds/Categories/Views
tabs. In Phase 1 the Zones tab manages label/shortLabel/category/area_m2
and add/remove only — `bounds` is not exposed in the UI at all; new zones
are simply created with `bounds: null` (§5.2 — they contribute 0 detections
until calibrated). Editing `bounds` is exclusively a Phase 2 capability via
the calibration canvas, not a raw-number fallback in Phase 1.

**Phase 2 — additive, isolated:** the visual calibration canvas and the
`GET /config/calibration-frame` endpoint. It only touches `ZoneConfig.bounds`
and the `video_pipeline.py`/`zone_map.py` consolidation — nothing in Phase 1
depends on it existing. If time runs out, Phase 1 ships alone and the MVP
is strictly better off (configurable, still fully working) with geometry
calibration left as a documented follow-up.

## 8. Testing

- **Backend unit tests** (`backend/config/test_store.py` or similar):
  round-trip a `StationConfig` through save/load; reject each validation
  rule in §4 individually; confirm `POST /config/reset` produces a config
  byte-equal to `defaults.py`.
- **Regression pass:** run the existing scenario demo (`POST /demo/start`)
  and split-screen view end-to-end after the wiring change, confirming
  timings/thresholds/labels are visually unchanged from before this
  feature — this is the "keep the existing MVP working" check.
- **Manual exercise of the new capability:** edit a threshold in the
  Settings panel and watch a live-video-mode zone's color band change
  without a page reload; add a new zone with a generic label and category,
  confirm it appears on the map and produces a generic-copy L1 intervention
  when density crosses its threshold; save and re-apply a view preset;
  (Phase 2) calibrate a zone's rectangle and confirm detections start
  mapping to it.

## 9. Safety guardrails (unchanged, enforced in code not config)

- L3 interventions always require explicit human confirm — never
  auto-fire, regardless of configured thresholds.
- SOS (`FAILSAFE_DENSITY`) can never fire for a zone that hasn't already
  had a PRE_WARN fire for that same zone in the current session
  (`engine.py`'s `_pre_warn_zones` check). This logic is not exposed as a
  config field.
- `PUT /config` is validated server-side regardless of what the UI allows,
  so a malformed request (e.g. via curl) can't put the engine in an
  inconsistent state.
