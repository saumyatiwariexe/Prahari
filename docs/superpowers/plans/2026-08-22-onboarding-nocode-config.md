# No-Code Station Configuration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace Prahari's hardcoded station config (thresholds, zone labels/categories, dashboard widget visibility, and — in Phase 2 — zone pixel geometry) with a validated, hot-reloadable JSON config store and a no-code Settings panel, while the shipped NDLS demo keeps working unchanged.

**Architecture:** A new `backend/config/` subsystem (Pydantic schema + a JSON-file-backed `ConfigStore` singleton) becomes the single source of truth. Backend consumers (`decision/engine.py`, `vision/*`, `prediction/extrapolator.py`, `demo/scenario_runner.py`, `main.py`) read from it per-call instead of importing `constants.py` at module load, so edits take effect without a restart. The frontend mirrors this with a `ConfigProvider` React context fetching `GET /config` and refetching when the WebSocket broadcast's `config_version` field changes. A slide-over `SettingsPanel` (Zones / Thresholds / Categories / Views tabs) is the no-code editing surface.

**Tech Stack:** FastAPI + Pydantic v2 (already installed — v2.13.4 / fastapi 0.136.3) on the backend; pytest + httpx added for testing (currently no test infra exists in this repo). Next.js 14 + React context on the frontend; no new frontend dependency (no test runner exists there either — frontend tasks are verified manually against the running dev server, matching this project's existing convention of zero frontend tests).

**Spec:** [docs/superpowers/specs/2026-08-22-onboarding-nocode-config-design.md](../specs/2026-08-22-onboarding-nocode-config-design.md)

## Global Constraints

- L3 interventions always require explicit human confirm; SOS can never fire for a zone without a prior PRE_WARN on that same zone. Both rules stay hardcoded in `decision/engine.py` — never exposed as config fields (spec §9).
- `PUT /config` is validated server-side (Pydantic) regardless of what the UI sends.
- Zone ids are unique, non-empty, and immutable after creation — renaming means delete + recreate (spec §4).
- Per-zone intervention message copy (`L1_ACTIONS` etc. in `decision/interventions.py`) and the scripted demo timeline (`demo/scenario_runner.py` keyframes) stay hardcoded — out of scope (spec §2 non-goals). New zones get a generic templated fallback message instead of custom copy.
- `ZoneConfig.area_m2` (true physical zone area) and `camera_area_m2` (live single-camera pipeline's visible-crop area) are different physical quantities and must never be unified into one field (spec §5.2).
- Always use "graded autonomous response," never "fully autonomous" — copy in any new UI must follow this (PRD §15.5).

---

## File Structure

**Backend — new:**
- `backend/config/__init__.py` — empty, marks package
- `backend/config/schema.py` — Pydantic models (`ZoneBounds`, `ZoneConfig`, `CategoryConfig`, `ThresholdConfig`, `ViewConfig`, `PresetConfig`, `StationConfigInput`, `StationConfig`)
- `backend/config/defaults.py` — `DEFAULT_CONFIG: StationConfig`, seeded from today's NDLS values
- `backend/config/store.py` — `ConfigStore` class + module-level `config_store` singleton
- `backend/tests/__init__.py`
- `backend/tests/test_config_schema.py`
- `backend/tests/test_config_store.py`
- `backend/tests/test_config_api.py`
- `backend/tests/test_engine_config.py`
- `backend/tests/test_vision_config.py`
- `backend/tests/test_scenario_config.py`

**Backend — modified:**
- `backend/requirements.txt` (+ `pytest`, `httpx`)
- `backend/constants.py` (trimmed to non-station constants)
- `backend/main.py` (config endpoints, config-driven `_system_status`, `config_version` in broadcast payload)
- `backend/decision/engine.py` (config-driven thresholds, generic fallback action text)
- `backend/vision/tracker.py`, `backend/vision/detector.py` (config-driven zone list / density_color)
- `backend/vision/video_pipeline.py` (config-driven labels/density_color in Phase 1; `camera_area_m2` + `bounds` in Phase 2)
- `backend/vision/zone_map.py` (Phase 2: config-driven `bounds`)
- `backend/prediction/extrapolator.py` (config-driven zone list / density_color)
- `backend/demo/scenario_runner.py` (config-driven label/area/density_color with fallback for deleted zones)
- `.gitignore` (+ `backend/config/station.config.json`)

**Frontend — new:**
- `frontend/lib/config-context.tsx` — `ConfigProvider` + `useStationConfig()`
- `frontend/components/SettingsPanel.tsx` — slide-over shell + tab nav
- `frontend/components/settings/ThresholdsTab.tsx`
- `frontend/components/settings/CategoriesTab.tsx`
- `frontend/components/settings/ZonesTab.tsx`
- `frontend/components/settings/ViewsTab.tsx`
- `frontend/components/settings/ZoneCalibrator.tsx` (Phase 2)

**Frontend — modified:**
- `frontend/lib/types.ts` (+ config types, + `config_version` on `LiveUpdate`)
- `frontend/lib/constants.ts` (trimmed to CSS color maps + `WS_URL`/`API_URL`)
- `frontend/app/layout.tsx` (wrap `children` in `ConfigProvider`)
- `frontend/app/page.tsx` (gear icon + `SettingsPanel` mount, conditional widget rendering, config-version-triggered refetch)
- `frontend/components/StationMap.tsx`, `ZoneChart.tsx`, `InterventionFeed.tsx` (consume `useStationConfig()`)

---

## Phase 1 — Backend

### Task 1: Config schema + test scaffolding

**Files:**
- Create: `backend/config/__init__.py`
- Create: `backend/config/schema.py`
- Modify: `backend/requirements.txt`
- Create: `backend/tests/__init__.py`
- Test: `backend/tests/test_config_schema.py`

**Interfaces:**
- Produces: `ZoneBounds(x1, y1, x2, y2)`, `ZoneConfig(id, label, short_label, category_id, area_m2, camera_area_m2, bounds)`, `CategoryConfig(id, label, color)`, `ThresholdConfig(density_safe, density_warning, density_critical, l1_trigger, l2_trigger, l3_trigger, pre_warn_trigger, failsafe_trigger, l2_countdown_seconds)`, `ViewConfig(show_zone_chart, show_prediction_overlay, show_flow_vectors, show_critical_zones_panel, zone_display_order)`, `PresetConfig(name, view)`, `StationConfigInput(zones, categories, thresholds, view, presets, video_width, video_height)` with methods `.zone_by_id(id) -> ZoneConfig | None` and `.density_color(density: float) -> str`, `StationConfig(StationConfigInput)` adding `version: int`.

- [ ] **Step 1: Add test dependencies**

Modify `backend/requirements.txt`, append:
```
pytest>=7.4.0
httpx>=0.24.0
```

Run: `cd backend && ./venv/Scripts/python.exe -m pip install pytest httpx`
Expected: both install successfully (pydantic/fastapi already present — verified installed: pydantic 2.13.4, fastapi 0.136.3).

- [ ] **Step 2: Create the package and test scaffold**

Create `backend/config/__init__.py` (empty file).
Create `backend/tests/__init__.py` (empty file).

- [ ] **Step 3: Write the failing test**

Create `backend/tests/test_config_schema.py`:
```python
import pytest
from pydantic import ValidationError

from config.schema import (
    ZoneBounds, ZoneConfig, CategoryConfig, ThresholdConfig,
    ViewConfig, PresetConfig, StationConfigInput, StationConfig,
)


def _thresholds(**overrides):
    base = dict(
        density_safe=3.0, density_warning=5.0, density_critical=6.0,
        l1_trigger=5.0, l2_trigger=6.0, l3_trigger=7.5,
        pre_warn_trigger=7.0, failsafe_trigger=8.0, l2_countdown_seconds=10,
    )
    base.update(overrides)
    return ThresholdConfig(**base)


def _minimal_config(**overrides) -> dict:
    base = dict(
        zones=[
            ZoneConfig(id="CONC", label="Main Concourse", short_label="Concourse",
                       category_id="concourse", area_m2=1200.0),
            ZoneConfig(id="P1", label="Platform 1", short_label="Pf 1",
                       category_id="platform", area_m2=500.0),
        ],
        categories=[
            CategoryConfig(id="concourse", label="Concourse", color="#3B82F6"),
            CategoryConfig(id="platform", label="Platform", color="#22D3EE"),
        ],
        thresholds=_thresholds(),
        view=ViewConfig(zone_display_order=["CONC", "P1"]),
        presets=[],
    )
    base.update(overrides)
    return base


def test_valid_config_round_trips():
    cfg = StationConfig(**_minimal_config(), version=1)
    assert cfg.zone_by_id("P1").label == "Platform 1"
    assert cfg.zone_by_id("MISSING") is None


def test_density_color_matches_existing_thresholds():
    cfg = StationConfig(**_minimal_config(), version=1)
    assert cfg.density_color(2.9) == "green"
    assert cfg.density_color(4.9) == "amber"
    assert cfg.density_color(5.9) == "red"
    assert cfg.density_color(6.0) == "critical"


def test_threshold_ordering_rejected():
    with pytest.raises(ValidationError):
        _thresholds(density_safe=6.0, density_warning=5.0)


def test_l1_must_not_exceed_l2():
    with pytest.raises(ValidationError):
        _thresholds(l1_trigger=6.5, l2_trigger=6.0)


def test_unknown_category_rejected():
    bad = _minimal_config()
    bad["zones"][1] = ZoneConfig(id="P1", label="Platform 1", short_label="Pf 1",
                                  category_id="does-not-exist", area_m2=500.0)
    with pytest.raises(ValidationError):
        StationConfigInput(**bad)


def test_duplicate_zone_ids_rejected():
    bad = _minimal_config()
    bad["zones"][1] = ZoneConfig(id="CONC", label="Dup", short_label="Dup",
                                  category_id="platform", area_m2=1.0)
    with pytest.raises(ValidationError):
        StationConfigInput(**bad)


def test_zone_display_order_must_be_permutation():
    bad = _minimal_config()
    bad["view"] = ViewConfig(zone_display_order=["CONC"])  # missing P1
    with pytest.raises(ValidationError):
        StationConfigInput(**bad)
```

- [ ] **Step 4: Run test to verify it fails**

Run: `cd backend && ./venv/Scripts/python.exe -m pytest tests/test_config_schema.py -v`
Expected: FAIL with `ModuleNotFoundError: No module named 'config'` (schema.py doesn't exist yet).

- [ ] **Step 5: Write the schema**

Create `backend/config/schema.py`:
```python
"""
Station configuration schema — the no-code-configurable surface for zones,
thresholds, categories, and dashboard views. See
docs/superpowers/specs/2026-08-22-onboarding-nocode-config-design.md.
"""
from __future__ import annotations
from pydantic import BaseModel, model_validator


class ZoneBounds(BaseModel):
    x1: int
    y1: int
    x2: int
    y2: int


class ZoneConfig(BaseModel):
    id: str
    label: str
    short_label: str
    category_id: str
    area_m2: float
    camera_area_m2: float | None = None
    bounds: ZoneBounds | None = None


class CategoryConfig(BaseModel):
    id: str
    label: str
    color: str


class ThresholdConfig(BaseModel):
    density_safe: float
    density_warning: float
    density_critical: float
    l1_trigger: float
    l2_trigger: float
    l3_trigger: float
    pre_warn_trigger: float
    failsafe_trigger: float
    l2_countdown_seconds: int

    @model_validator(mode="after")
    def check_ordering(self) -> "ThresholdConfig":
        if not (self.density_safe < self.density_warning < self.density_critical):
            raise ValueError(
                "density thresholds must be strictly increasing: "
                "density_safe < density_warning < density_critical"
            )
        if self.l1_trigger > self.l2_trigger:
            raise ValueError("l1_trigger must be <= l2_trigger")
        if self.pre_warn_trigger > self.failsafe_trigger:
            raise ValueError("pre_warn_trigger must be <= failsafe_trigger")
        return self


class ViewConfig(BaseModel):
    show_zone_chart: bool = True
    show_prediction_overlay: bool = True
    show_flow_vectors: bool = True
    show_critical_zones_panel: bool = True
    zone_display_order: list[str]


class PresetConfig(BaseModel):
    name: str
    view: ViewConfig


class StationConfigInput(BaseModel):
    zones: list[ZoneConfig]
    categories: list[CategoryConfig]
    thresholds: ThresholdConfig
    view: ViewConfig
    presets: list[PresetConfig] = []
    video_width: int = 640
    video_height: int = 480

    @model_validator(mode="after")
    def check_refs(self) -> "StationConfigInput":
        zone_ids = [z.id for z in self.zones]
        if len(zone_ids) != len(set(zone_ids)):
            raise ValueError("zone ids must be unique")
        category_ids = {c.id for c in self.categories}
        for z in self.zones:
            if z.category_id not in category_ids:
                raise ValueError(
                    f"zone '{z.id}' references unknown category_id '{z.category_id}'"
                )
        if sorted(self.view.zone_display_order) != sorted(zone_ids):
            raise ValueError("view.zone_display_order must be a permutation of zone ids")
        return self

    def zone_by_id(self, zone_id: str) -> ZoneConfig | None:
        for z in self.zones:
            if z.id == zone_id:
                return z
        return None

    def density_color(self, density: float) -> str:
        t = self.thresholds
        if density < t.density_safe:
            return "green"
        if density < t.density_warning:
            return "amber"
        if density < t.density_critical:
            return "red"
        return "critical"


class StationConfig(StationConfigInput):
    version: int = 1
```

- [ ] **Step 6: Run test to verify it passes**

Run: `cd backend && ./venv/Scripts/python.exe -m pytest tests/test_config_schema.py -v`
Expected: 7 passed.

- [ ] **Step 7: Commit**

```bash
git add backend/config/__init__.py backend/config/schema.py backend/tests/__init__.py backend/tests/test_config_schema.py backend/requirements.txt
git commit -m "feat(config): add station config Pydantic schema"
```

---

### Task 2: Seeded NDLS defaults

**Files:**
- Create: `backend/config/defaults.py`
- Test: `backend/tests/test_config_schema.py` (append)

**Interfaces:**
- Consumes: `config.schema.{ZoneConfig, CategoryConfig, ThresholdConfig, ViewConfig, StationConfig}` (Task 1)
- Produces: `DEFAULT_CONFIG: StationConfig` — a valid instance covering all 12 today's NDLS zones, 4 categories, today's thresholds, `version=1`. Later tasks import this as the fallback source of truth.

- [ ] **Step 1: Write the failing test**

Append to `backend/tests/test_config_schema.py`:
```python
from config.defaults import DEFAULT_CONFIG

EXPECTED_ZONE_IDS = {
    "CONC", "GATE_A", "GATE_B", "GATE_C", "FOB1", "FOB2",
    "P1", "P2", "P3", "P4", "P5", "P6",
}


def test_default_config_covers_all_ndls_zones():
    assert {z.id for z in DEFAULT_CONFIG.zones} == EXPECTED_ZONE_IDS


def test_default_config_thresholds_match_todays_constants():
    t = DEFAULT_CONFIG.thresholds
    assert (t.density_safe, t.density_warning, t.density_critical) == (3.0, 5.0, 6.0)
    assert (t.l1_trigger, t.l2_trigger, t.l3_trigger) == (5.0, 6.0, 7.5)
    assert (t.pre_warn_trigger, t.failsafe_trigger, t.l2_countdown_seconds) == (7.0, 8.0, 10)


def test_default_config_is_internally_valid():
    # StationConfig's own validators already ran at construction; this just
    # re-confirms the object is what it claims to be.
    assert DEFAULT_CONFIG.zone_by_id("FOB1").area_m2 == 80.0
    assert DEFAULT_CONFIG.zone_by_id("FOB1").category_id == "fob"
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd backend && ./venv/Scripts/python.exe -m pytest tests/test_config_schema.py -v`
Expected: FAIL — `ModuleNotFoundError: No module named 'config.defaults'`.

- [ ] **Step 3: Write the defaults**

Create `backend/config/defaults.py` — values taken verbatim from today's `constants.py` `ZONES`/thresholds and `frontend/lib/constants.ts` `ZONE_META`:
```python
"""
The NDLS Feb-15-2025 station layout, as a StationConfig. This is what
ships out of the box and what "Reset to NDLS defaults" restores — it must
reproduce today's hardcoded constants.py / constants.ts values exactly.
"""
from config.schema import (
    ZoneConfig, CategoryConfig, ThresholdConfig, ViewConfig, StationConfig,
)

_CATEGORIES = [
    CategoryConfig(id="concourse", label="Concourse", color="#3B82F6"),
    CategoryConfig(id="gate", label="Gate", color="#A78BFA"),
    CategoryConfig(id="fob", label="Foot Over Bridge", color="#FB923C"),
    CategoryConfig(id="platform", label="Platform", color="#22D3EE"),
]

_ZONES = [
    ZoneConfig(id="CONC", label="Main Concourse (NDLS)", short_label="Concourse",
               category_id="concourse", area_m2=1200.0),
    ZoneConfig(id="GATE_A", label="Ajmeri Gate Entry", short_label="Ajmeri Gt",
               category_id="gate", area_m2=60.0),
    ZoneConfig(id="GATE_B", label="Paharganj Gate Entry", short_label="Paharganj",
               category_id="gate", area_m2=60.0),
    ZoneConfig(id="GATE_C", label="FOB-1 Exit Corridor", short_label="FOB-1 Exit",
               category_id="gate", area_m2=60.0),
    ZoneConfig(id="FOB1", label="FOB-3 Stairway (Pf 14/15)", short_label="FOB-3",
               category_id="fob", area_m2=80.0),
    ZoneConfig(id="FOB2", label="FOB-2 Stairway (Pf 12/13)", short_label="FOB-2",
               category_id="fob", area_m2=80.0),
    ZoneConfig(id="P1", label="Platform 12 — Prayagraj Spl", short_label="Pf 12",
               category_id="platform", area_m2=500.0),
    ZoneConfig(id="P2", label="Platform 13 — Swatantrata Exp", short_label="Pf 13",
               category_id="platform", area_m2=500.0),
    ZoneConfig(id="P3", label="Platform 14 — Prayagraj Exp", short_label="Pf 14",
               category_id="platform", area_m2=500.0),
    ZoneConfig(id="P4", label="Platform 15 — Rajdhani", short_label="Pf 15",
               category_id="platform", area_m2=500.0),
    ZoneConfig(id="P5", label="Platform 16 — Prayagraj Spl", short_label="Pf 16",
               category_id="platform", area_m2=500.0),
    ZoneConfig(id="P6", label="Platform 11", short_label="Pf 11",
               category_id="platform", area_m2=500.0),
]

_THRESHOLDS = ThresholdConfig(
    density_safe=3.0, density_warning=5.0, density_critical=6.0,
    l1_trigger=5.0, l2_trigger=6.0, l3_trigger=7.5,
    pre_warn_trigger=7.0, failsafe_trigger=8.0, l2_countdown_seconds=10,
)

_VIEW = ViewConfig(zone_display_order=[z.id for z in _ZONES])

DEFAULT_CONFIG = StationConfig(
    zones=_ZONES,
    categories=_CATEGORIES,
    thresholds=_THRESHOLDS,
    view=_VIEW,
    presets=[],
    video_width=640,
    video_height=480,
    version=1,
)
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd backend && ./venv/Scripts/python.exe -m pytest tests/test_config_schema.py -v`
Expected: 10 passed.

- [ ] **Step 5: Commit**

```bash
git add backend/config/defaults.py backend/tests/test_config_schema.py
git commit -m "feat(config): seed default config from today's NDLS constants"
```

---

### Task 3: ConfigStore (load / get / update / reset / persist)

**Files:**
- Create: `backend/config/store.py`
- Test: `backend/tests/test_config_store.py`
- Modify: `.gitignore`

**Interfaces:**
- Consumes: `config.schema.{StationConfig, StationConfigInput}`, `config.defaults.DEFAULT_CONFIG` (Tasks 1–2)
- Produces: `class ConfigStore(path: Path)` with `.get() -> StationConfig`, `.update(data: StationConfigInput) -> StationConfig`, `.reset() -> StationConfig`; module-level singleton `config_store = ConfigStore(Path(__file__).parent / "station.config.json")`. Later tasks import `from config.store import config_store`.

- [ ] **Step 1: Write the failing test**

Create `backend/tests/test_config_store.py`:
```python
import json
import pytest
from pydantic import ValidationError

from config.store import ConfigStore
from config.schema import StationConfigInput
from config.defaults import DEFAULT_CONFIG


@pytest.fixture
def store(tmp_path):
    return ConfigStore(tmp_path / "station.config.json")


def test_first_load_seeds_defaults_and_writes_file(store, tmp_path):
    cfg = store.get()
    assert cfg.zones == DEFAULT_CONFIG.zones
    assert (tmp_path / "station.config.json").exists()


def test_update_persists_and_bumps_version(store, tmp_path):
    original = store.get()
    changed_input = StationConfigInput(
        **{**original.model_dump(exclude={"version"}),
           "thresholds": {**original.thresholds.model_dump(), "density_safe": 2.0}},
    )
    updated = store.update(changed_input)
    assert updated.version == original.version + 1
    assert updated.thresholds.density_safe == 2.0

    on_disk = json.loads((tmp_path / "station.config.json").read_text())
    assert on_disk["thresholds"]["density_safe"] == 2.0
    assert on_disk["version"] == updated.version


def test_update_rejects_invalid_threshold_ordering(store):
    original = store.get()
    bad_input = StationConfigInput(
        **{**original.model_dump(exclude={"version"}),
           "thresholds": {**original.thresholds.model_dump(), "density_safe": 99.0}},
    )
    with pytest.raises(ValidationError):
        store.update(bad_input)


def test_reset_restores_defaults_and_bumps_version(store):
    original = store.get()
    changed_input = StationConfigInput(
        **{**original.model_dump(exclude={"version"}),
           "thresholds": {**original.thresholds.model_dump(), "density_safe": 2.0}},
    )
    store.update(changed_input)

    restored = store.reset()
    assert restored.zones == DEFAULT_CONFIG.zones
    assert restored.thresholds == DEFAULT_CONFIG.thresholds
    assert restored.version == 3  # 1 (seed) -> 2 (update) -> 3 (reset)


def test_reload_from_existing_file_does_not_reseed(tmp_path):
    store_a = ConfigStore(tmp_path / "station.config.json")
    changed_input = StationConfigInput(
        **{**store_a.get().model_dump(exclude={"version"}),
           "thresholds": {**store_a.get().thresholds.model_dump(), "density_safe": 2.0}},
    )
    store_a.update(changed_input)

    store_b = ConfigStore(tmp_path / "station.config.json")
    assert store_b.get().thresholds.density_safe == 2.0
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd backend && ./venv/Scripts/python.exe -m pytest tests/test_config_store.py -v`
Expected: FAIL — `ModuleNotFoundError: No module named 'config.store'`.

- [ ] **Step 3: Write the store**

Create `backend/config/store.py`:
```python
"""
Loads/persists the running StationConfig. A single process-wide instance
(`config_store` below) is what every consuming module reads from — see
docs/superpowers/specs/2026-08-22-onboarding-nocode-config-design.md §5.2.
"""
import os
import tempfile
from pathlib import Path

from config.defaults import DEFAULT_CONFIG
from config.schema import StationConfig, StationConfigInput


class ConfigStore:
    def __init__(self, path: Path):
        self._path = path
        self._current = self._load_or_seed()

    def get(self) -> StationConfig:
        return self._current

    def update(self, data: StationConfigInput) -> StationConfig:
        # exclude={"version"} is a no-op for a bare StationConfigInput (it has no
        # such field) and strips a stale one if a full StationConfig was passed in
        # (e.g. a caller did `cfg = config_store.get(); cfg.thresholds.x = 1;
        # config_store.update(cfg)`) — without this, **dump would collide with
        # the explicit version= kwarg below and raise a TypeError.
        updated = StationConfig(
            **data.model_dump(exclude={"version"}), version=self._current.version + 1
        )
        self._save(updated)
        self._current = updated
        return updated

    def reset(self) -> StationConfig:
        restored = StationConfig(
            **DEFAULT_CONFIG.model_dump(exclude={"version"}),
            version=self._current.version + 1,
        )
        self._save(restored)
        self._current = restored
        return restored

    def _load_or_seed(self) -> StationConfig:
        if self._path.exists():
            return StationConfig.model_validate_json(self._path.read_text())
        self._save(DEFAULT_CONFIG)
        return DEFAULT_CONFIG

    def _save(self, config: StationConfig) -> None:
        self._path.parent.mkdir(parents=True, exist_ok=True)
        fd, tmp_path = tempfile.mkstemp(dir=self._path.parent, suffix=".tmp")
        try:
            with os.fdopen(fd, "w") as f:
                f.write(config.model_dump_json(indent=2))
            os.replace(tmp_path, self._path)
        except Exception:
            os.unlink(tmp_path)
            raise


config_store = ConfigStore(Path(__file__).parent / "station.config.json")
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd backend && ./venv/Scripts/python.exe -m pytest tests/test_config_store.py -v`
Expected: 5 passed.

- [ ] **Step 5: Gitignore the runtime config file**

Modify `.gitignore`, add under the `# Python` section:
```
backend/config/station.config.json
```

- [ ] **Step 6: Commit**

```bash
git add backend/config/store.py backend/tests/test_config_store.py .gitignore
git commit -m "feat(config): add ConfigStore with atomic persistence and reset"
```

---

### Task 4: REST endpoints — `GET/PUT /config`, `POST /config/reset`

**Files:**
- Modify: `backend/main.py`
- Test: `backend/tests/test_config_api.py`

**Interfaces:**
- Consumes: `config.store.config_store`, `config.schema.StationConfigInput` (Tasks 1–3)
- Produces: `GET /config -> StationConfig JSON`, `PUT /config` (body: `StationConfigInput`) `-> StationConfig JSON` or 422, `POST /config/reset -> StationConfig JSON`.

- [ ] **Step 1: Write the failing test**

Create `backend/tests/test_config_api.py`:
```python
from fastapi.testclient import TestClient
from main import app

client = TestClient(app)


def test_get_config_returns_default_zones():
    res = client.get("/config")
    assert res.status_code == 200
    body = res.json()
    assert len(body["zones"]) == 12
    assert body["thresholds"]["l1_trigger"] == 5.0


def test_put_config_updates_and_bumps_version():
    current = client.get("/config").json()
    current["thresholds"]["density_safe"] = 2.5
    current.pop("version")

    res = client.put("/config", json=current)
    assert res.status_code == 200
    body = res.json()
    assert body["thresholds"]["density_safe"] == 2.5
    assert body["version"] == 2

    # Reset back so other tests in this module see a clean default state.
    client.post("/config/reset")


def test_put_config_rejects_bad_ordering_with_422():
    current = client.get("/config").json()
    current["thresholds"]["density_safe"] = 999.0
    current.pop("version")

    res = client.put("/config", json=current)
    assert res.status_code == 422


def test_reset_restores_defaults():
    current = client.get("/config").json()
    current["thresholds"]["density_safe"] = 2.5
    current.pop("version")
    client.put("/config", json=current)

    res = client.post("/config/reset")
    assert res.status_code == 200
    assert res.json()["thresholds"]["density_safe"] == 3.0
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd backend && ./venv/Scripts/python.exe -m pytest tests/test_config_api.py -v`
Expected: FAIL — 404 on `/config` (route doesn't exist yet).

- [ ] **Step 3: Add the endpoints**

Modify `backend/main.py`. Add to the imports (near the top, after the existing `from decision.engine import DecisionEngine` line):
```python
from config.store import config_store
from config.schema import StationConfigInput
```

Add a new section after the `# ── Intervention endpoints ──` block (after `cancel()`, before `# ── Broadcast loop ──`):
```python
# ── Station configuration endpoints ───────────────────────────────────────────
@app.get("/config")
async def get_config():
    return config_store.get()


@app.put("/config")
async def update_config(body: StationConfigInput):
    return config_store.update(body)


@app.post("/config/reset")
async def reset_config():
    return config_store.reset()
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd backend && ./venv/Scripts/python.exe -m pytest tests/test_config_api.py -v`
Expected: 4 passed.

- [ ] **Step 5: Commit**

```bash
git add backend/main.py backend/tests/test_config_api.py
git commit -m "feat(config): expose GET/PUT /config and POST /config/reset"
```

---

### Task 5: Wire the decision engine to config-driven thresholds + fallback action text

**Files:**
- Modify: `backend/decision/engine.py`
- Test: `backend/tests/test_engine_config.py`

**Interfaces:**
- Consumes: `config.store.config_store` (Task 3), `decision.interventions.{Intervention, Level, L1_ACTIONS, L2_ACTIONS, L3_ACTIONS, PRE_WARN_ACTIONS, SOS_ACTIONS}` (existing)
- Produces: `DecisionEngine.evaluate()` unchanged signature; now reads `config_store.get().thresholds` per call instead of the module-level `constants` import, and fires a generic fallback intervention for any zone not present in the `*_ACTIONS` dicts.

- [ ] **Step 1: Write the failing test**

Create `backend/tests/test_engine_config.py`:
```python
import pytest
from decision.engine import DecisionEngine
from config.store import config_store
from config.schema import ZoneConfig


@pytest.fixture(autouse=True)
def restore_config():
    yield
    config_store.reset()


def test_l1_fires_at_configured_threshold_not_hardcoded_one():
    original = config_store.get()
    lowered = original.model_copy(deep=True)
    lowered.thresholds.l1_trigger = 1.0
    config_store.update(lowered)

    engine = DecisionEngine()
    fired = engine.evaluate({"FOB1": {"density": 1.5}}, {})
    assert any(iv.level.name == "L1" for iv in fired)


def test_l1_does_not_fire_below_configured_threshold():
    original = config_store.get()
    raised = original.model_copy(deep=True)
    raised.thresholds.l1_trigger = 20.0
    config_store.update(raised)

    engine = DecisionEngine()
    fired = engine.evaluate({"FOB1": {"density": 15.0}}, {})
    assert not any(iv.level.name == "L1" for iv in fired)


def test_new_zone_without_custom_copy_gets_generic_fallback_l1_message():
    original = config_store.get()
    with_new_zone = original.model_copy(deep=True)
    with_new_zone.zones.append(
        ZoneConfig(id="TEST_ZONE", label="Test Waiting Hall", short_label="Test",
                   category_id="concourse", area_m2=100.0)
    )
    with_new_zone.view.zone_display_order.append("TEST_ZONE")
    config_store.update(with_new_zone)

    engine = DecisionEngine()
    fired = engine.evaluate({"TEST_ZONE": {"density": 5.5}}, {})
    l1 = [iv for iv in fired if iv.level.name == "L1"]
    assert len(l1) == 1
    assert "Test Waiting Hall" in l1[0].action


def test_l2_countdown_uses_configured_seconds():
    original = config_store.get()
    changed = original.model_copy(deep=True)
    changed.thresholds.l2_countdown_seconds = 3
    config_store.update(changed)

    engine = DecisionEngine()
    fired = engine.evaluate({"FOB1": {"density": 6.5}}, {})
    l2 = [iv for iv in fired if iv.level.name == "L2"]
    assert l2[0].countdown_remaining == 3
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd backend && ./venv/Scripts/python.exe -m pytest tests/test_engine_config.py -v`
Expected: FAIL — engine still uses hardcoded `L1_TRIGGER_DENSITY` etc., so the lowered/raised-threshold tests and the fallback-message test fail.

- [ ] **Step 3: Rewrite `evaluate()` to read config and fall back to generic copy**

Modify `backend/decision/engine.py`. Replace the top import block:
```python
import time
from constants import (
    L1_TRIGGER_DENSITY, L2_TRIGGER_DENSITY, L3_TRIGGER_DENSITY,
    PRE_WARN_DENSITY, FAILSAFE_DENSITY, L2_COUNTDOWN_SECONDS,
)
from decision.interventions import (
    Intervention, Level,
    L1_ACTIONS, L2_ACTIONS, L3_ACTIONS,
    PRE_WARN_ACTIONS, SOS_ACTIONS,
)
```
with:
```python
import time
from config.store import config_store
from decision.interventions import (
    Intervention, Level,
    L1_ACTIONS, L2_ACTIONS, L3_ACTIONS,
    PRE_WARN_ACTIONS, SOS_ACTIONS,
)


def _zone_label(config, zone_id: str) -> str:
    zone = config.zone_by_id(zone_id)
    return zone.label if zone else zone_id
```

Replace the body of `evaluate()` — at the top, read config once per call:
```python
    def evaluate(self, zone_states: dict, predictions: dict) -> list[Intervention]:
        """
        Evaluate current + predicted zone states.
        Returns list of new interventions to broadcast.
        """
        config = config_store.get()
        t = config.thresholds
        new_interventions: list[Intervention] = []
        t_start = time.perf_counter()

        for zone_id, state in zone_states.items():
            density = state["density"]
            pred_90 = predictions.get(zone_id, {}).get("t90", {}).get("density", 0.0)
            key_l1       = f"{zone_id}_L1"
            key_l2       = f"{zone_id}_L2"
            key_l3       = f"{zone_id}_L3"
            key_pre_warn = f"{zone_id}_PRE_WARN"
            key_sos      = f"{zone_id}_SOS"

            # L1: fires immediately, once per zone session — informational only
            if (self._max_level >= 1
                    and density >= t.l1_trigger
                    and key_l1 not in self._fired):
                if zone_id in L1_ACTIONS:
                    action_label, action_msg = L1_ACTIONS[zone_id]
                else:
                    label = _zone_label(config, zone_id)
                    action_label, action_msg = (
                        "PA Alert",
                        f"{label} is experiencing heavy congestion. "
                        "Passengers please use an alternate route.",
                    )
                iv = Intervention(
                    zone=zone_id,
                    level=Level.L1,
                    trigger=f"Density {density:.1f}/m² crossed L1 threshold",
                    action=f"{action_label}: \"{action_msg}\"",
                    status="fired",
                    response_time_ms=(time.perf_counter() - t_start) * 1000,
                )
                self._fired.add(key_l1)
                new_interventions.append(iv)

            # L2: stage when density crosses L2 threshold
            if (self._max_level >= 2
                    and density >= t.l2_trigger
                    and key_l2 not in self._fired
                    and key_l2 not in self._staged):
                if zone_id in L2_ACTIONS:
                    action = L2_ACTIONS[zone_id]
                else:
                    label = _zone_label(config, zone_id)
                    action = f"{label} congestion reduction measures staged — requires operator confirmation."
                iv = Intervention(
                    zone=zone_id,
                    level=Level.L2,
                    trigger=f"Density {density:.1f}/m² — L2 threshold crossed",
                    action=action,
                    status="staged",
                    countdown_remaining=t.l2_countdown_seconds,
                )
                self._staged[key_l2] = {"iv": iv, "staged_at": time.time()}
                new_interventions.append(iv)

            # L3: stage when predicted density in 90s is lethal
            if (self._max_level >= 3
                    and pred_90 >= t.l3_trigger
                    and key_l3 not in self._fired
                    and key_l3 not in self._staged):
                if zone_id in L3_ACTIONS:
                    action = L3_ACTIONS[zone_id]
                else:
                    label = _zone_label(config, zone_id)
                    action = f"{label} closure recommended. Requires confirmation."
                iv = Intervention(
                    zone=zone_id,
                    level=Level.L3,
                    trigger=f"Predicted density {pred_90:.1f}/m² in 90s — critical forecast",
                    action=action,
                    status="pending_confirm",
                )
                self._staged[key_l3] = {"iv": iv, "staged_at": time.time()}
                new_interventions.append(iv)

            # PRE_WARN: auto-fire standby alert when density hits pre-warn threshold
            if (self._max_level >= 4
                    and density >= t.pre_warn_trigger
                    and key_pre_warn not in self._fired):
                if zone_id in PRE_WARN_ACTIONS:
                    label_tag, msg = PRE_WARN_ACTIONS[zone_id]
                else:
                    zone_label = _zone_label(config, zone_id)
                    label_tag, msg = (
                        "STANDBY ALERT",
                        f"Density critical at {zone_label}. RPF, Police, Fire Brigade & Ambulance "
                        "placed on standby. Prepare emergency response teams.",
                    )
                iv = Intervention(
                    zone=zone_id,
                    level=Level.PRE_WARN,
                    trigger=f"Density {density:.1f}/m² — pre-warn threshold crossed",
                    action=f"{label_tag}: {msg}",
                    status="fired",
                    response_time_ms=(time.perf_counter() - t_start) * 1000,
                )
                self._fired.add(key_pre_warn)
                self._pre_warn_zones.add(zone_id)
                new_interventions.append(iv)

            # SOS: auto-fire full emergency dispatch only AFTER pre-warn has already fired for this zone
            if (self._max_level >= 5
                    and density >= t.failsafe_trigger
                    and zone_id in self._pre_warn_zones
                    and key_sos not in self._fired):
                if zone_id in SOS_ACTIONS:
                    label_tag, msg = SOS_ACTIONS[zone_id]
                else:
                    zone_label = _zone_label(config, zone_id)
                    label_tag, msg = (
                        "EMERGENCY DISPATCH",
                        f"CRUSH IMMINENT — {zone_label}. RPF deployed. Police 100 called. "
                        "Fire Brigade 101 dispatched. Ambulance 108 requested.",
                    )
                iv = Intervention(
                    zone=zone_id,
                    level=Level.SOS,
                    trigger=f"Density {density:.1f}/m² — LETHAL threshold, PRE-WARN already active for this zone. Emergency dispatch.",
                    action=f"{label_tag}: {msg}",
                    status="fired",
                    response_time_ms=(time.perf_counter() - t_start) * 1000,
                )
                self._fired.add(key_sos)
                new_interventions.append(iv)

        # L2 items never auto-execute — countdown_remaining counts elapsed time pending
        # (capped) purely as an urgency indicator for the operator. Only confirm()/cancel()
        # resolve a staged L2 item.
        now = time.time()
        for key, entry in list(self._staged.items()):
            if "_L2" in key:
                elapsed = now - entry["staged_at"]
                entry["iv"].countdown_remaining = min(t.l2_countdown_seconds, int(elapsed))

        return new_interventions
```

The `confirm()`, `cancel()`, `get_staged()`, and `reset()` methods are unchanged.

- [ ] **Step 4: Run test to verify it passes**

Run: `cd backend && ./venv/Scripts/python.exe -m pytest tests/test_engine_config.py -v`
Expected: 4 passed.

- [ ] **Step 5: Run the full backend test suite so far**

Run: `cd backend && ./venv/Scripts/python.exe -m pytest tests/ -v`
Expected: all tests across Tasks 1–5 pass (schema, store, api, engine).

- [ ] **Step 6: Commit**

```bash
git add backend/decision/engine.py backend/tests/test_engine_config.py
git commit -m "feat(config): wire decision engine to config-driven thresholds"
```

---

### Task 6: Wire tracker / detector / extrapolator read-paths

**Files:**
- Modify: `backend/vision/tracker.py`
- Modify: `backend/vision/detector.py`
- Modify: `backend/prediction/extrapolator.py`
- Test: `backend/tests/test_vision_config.py`

**Interfaces:**
- Consumes: `config.store.config_store` (Task 3)
- Produces: `ZoneTracker.update(counts)` and `detect_frame(frame)` / `Extrapolator.predict(...)` unchanged signatures, now iterating configured zone ids and reading `area_m2`/`density_color` from config instead of `constants.ZONES`/`constants.density_color`.

- [ ] **Step 1: Write the failing test**

Create `backend/tests/test_vision_config.py`:
```python
import pytest
from vision.tracker import ZoneTracker
from config.store import config_store
from config.schema import ZoneConfig
from prediction.extrapolator import Extrapolator


@pytest.fixture(autouse=True)
def restore_config():
    yield
    config_store.reset()


def test_tracker_uses_configured_area_for_density():
    original = config_store.get()
    changed = original.model_copy(deep=True)
    changed.zone_by_id("FOB1").area_m2 = 10.0  # was 80.0
    config_store.update(changed)

    tracker = ZoneTracker()
    states = tracker.update({"FOB1": 50})
    assert states["FOB1"]["density"] == 5.0  # 50 / 10.0, not 50 / 80.0


def test_tracker_new_zone_is_supported_without_preseeding():
    original = config_store.get()
    with_new_zone = original.model_copy(deep=True)
    with_new_zone.zones.append(
        ZoneConfig(id="TEST_ZONE", label="Test", short_label="Test",
                   category_id="concourse", area_m2=50.0)
    )
    with_new_zone.view.zone_display_order.append("TEST_ZONE")
    config_store.update(with_new_zone)

    tracker = ZoneTracker()
    states = tracker.update({"TEST_ZONE": 25})
    assert states["TEST_ZONE"]["density"] == 0.5


def test_extrapolator_iterates_configured_zones_only():
    original = config_store.get()
    trimmed = original.model_copy(deep=True)
    trimmed.zones = [z for z in trimmed.zones if z.id in ("CONC", "FOB1")]
    trimmed.categories = original.categories
    trimmed.view.zone_display_order = ["CONC", "FOB1"]
    config_store.update(trimmed)

    predictions = Extrapolator().predict({"CONC": {"density": 4.0}, "FOB1": {"density": 5.0}}, {})
    assert set(predictions.keys()) == {"CONC", "FOB1"}
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd backend && ./venv/Scripts/python.exe -m pytest tests/test_vision_config.py -v`
Expected: FAIL — both modules still read the hardcoded `constants.ZONES`.

- [ ] **Step 3: Rewire `tracker.py`**

Modify `backend/vision/tracker.py`. Replace:
```python
from collections import deque
from constants import ZONES, density_color

HISTORY_LEN = 15


class ZoneTracker:
    def __init__(self):
        self._history: dict[str, deque[float]] = {
            z: deque(maxlen=HISTORY_LEN) for z in ZONES
        }

    def update(self, counts: dict[str, int]) -> dict:
        """
        Accepts raw person counts per zone.
        Returns zone state dict ready for broadcast.
        """
        zone_states = {}

        for zone_id, count in counts.items():
            area = ZONES[zone_id]["area_m2"]
            density = count / area
            self._history[zone_id].append(density)

            flow = self._flow_vector(zone_id)
            zone_states[zone_id] = {
                "density": round(density, 2),
                "count": count,
                "color": density_color(density),
                "name": ZONES[zone_id]["name"],
                "flow_vector": flow,
            }

        return zone_states
```
with:
```python
from collections import deque
from config.store import config_store

HISTORY_LEN = 15


class ZoneTracker:
    def __init__(self):
        self._history: dict[str, deque[float]] = {}

    def update(self, counts: dict[str, int]) -> dict:
        """
        Accepts raw person counts per zone.
        Returns zone state dict ready for broadcast.
        """
        config = config_store.get()
        zone_states = {}

        for zone_id, count in counts.items():
            zone = config.zone_by_id(zone_id)
            area = zone.area_m2 if zone else 1.0
            density = count / area
            self._history.setdefault(zone_id, deque(maxlen=HISTORY_LEN)).append(density)

            flow = self._flow_vector(zone_id)
            zone_states[zone_id] = {
                "density": round(density, 2),
                "count": count,
                "color": config.density_color(density),
                "name": zone.label if zone else zone_id,
                "flow_vector": flow,
            }

        return zone_states
```

- [ ] **Step 4: Rewire `detector.py`**

Modify `backend/vision/detector.py`. Replace:
```python
from vision.zone_map import point_to_zone
from constants import ZONES
```
with:
```python
from vision.zone_map import point_to_zone
from config.store import config_store
```
and replace:
```python
    zone_counts: dict[str, int] = {z: 0 for z in ZONES}
```
with:
```python
    zone_counts: dict[str, int] = {z.id: 0 for z in config_store.get().zones}
```

- [ ] **Step 5: Rewire `extrapolator.py`**

Modify `backend/prediction/extrapolator.py`. Replace:
```python
from constants import PREDICTION_INTERVALS, density_color, ZONES
```
with:
```python
from constants import PREDICTION_INTERVALS
from config.store import config_store
```
and replace the body of `predict()`:
```python
    def predict(self, zone_states: dict, density_histories: dict[str, list[float]]) -> dict:
        predictions: dict[str, dict] = {}
        rates = self._compute_rates(density_histories)
        config = config_store.get()

        for zone_id in (z.id for z in config.zones):
            current = zone_states.get(zone_id, {}).get("density", 0.0)
            rate = rates.get(zone_id, 0.0)
            convergence_boost = self._convergence_boost(zone_id, rates)

            zone_pred: dict[str, dict] = {}
            for t in PREDICTION_INTERVALS:
                raw_pred = current + rate * t + convergence_boost * (t / 90)
                # Hard cap: never predict more than current + 5.0 (physical max realistic growth)
                predicted = max(0.0, min(current + 5.0, raw_pred))
                zone_pred[f"t{t}"] = {
                    "density": round(predicted, 2),
                    "color": config.density_color(predicted),
                }
            predictions[zone_id] = zone_pred

        return predictions
```

- [ ] **Step 6: Run test to verify it passes**

Run: `cd backend && ./venv/Scripts/python.exe -m pytest tests/test_vision_config.py -v`
Expected: 3 passed.

- [ ] **Step 7: Commit**

```bash
git add backend/vision/tracker.py backend/vision/detector.py backend/prediction/extrapolator.py backend/tests/test_vision_config.py
git commit -m "feat(config): wire tracker/detector/extrapolator to config-driven zones"
```

---

### Task 7: Wire `video_pipeline.py` labels/colors (area_m2 and pixel bounds stay deferred to Phase 2)

**Files:**
- Modify: `backend/vision/video_pipeline.py`

**Interfaces:**
- Consumes: `config.store.config_store` (Task 3)
- Produces: `_make_state()` and `VideoPipeline` unchanged public interface; `_ZONE_NAMES` dict removed, `density_color` import removed. `_ACTIVE_ZONES`/`_SINGLE_ACTIVE_ZONES`/`_PASSIVE_ZONES` (pixel bounds *and* their `area_m2`, per spec §5.2 — a different quantity from `ZoneConfig.area_m2`) are untouched here; that consolidation is Task 16 (Phase 2).

- [ ] **Step 1: Replace the hardcoded name table and density_color import**

Modify `backend/vision/video_pipeline.py`. Replace:
```python
from constants import density_color
```
with:
```python
from config.store import config_store
```

Delete the `_ZONE_NAMES` dict (lines 58–64):
```python
_ZONE_NAMES = {
    "CONC":   "Main Concourse",
    "FOB1":   "Foot Over Bridge 1",
    "FOB2":   "Foot Over Bridge 2",
    "GATE_A": "Gate A", "GATE_B": "Gate B", "GATE_C": "Gate C",
    **{f"P{i}": f"Platform {i}" for i in range(1, 7)},
}
```

Replace `_make_state`:
```python
def _make_state(zone_id: str, density: float, count: int) -> dict:
    return {
        "density": round(density, 2),
        "count": count,
        "color": density_color(density),
        "name": _ZONE_NAMES.get(zone_id, zone_id),
        "flow_vector": {"dx": 0.0, "dy": 0.0, "magnitude": 0.0},
    }
```
with:
```python
def _make_state(zone_id: str, density: float, count: int) -> dict:
    config = config_store.get()
    zone = config.zone_by_id(zone_id)
    return {
        "density": round(density, 2),
        "count": count,
        "color": config.density_color(density),
        "name": zone.label if zone else zone_id,
        "flow_vector": {"dx": 0.0, "dy": 0.0, "magnitude": 0.0},
    }
```

This is a labels/colors-only change — `_ACTIVE_ZONES`, `_SINGLE_ACTIVE_ZONES`, `_PASSIVE_ZONES`, and `_counts_to_states`'s `z["area_m2"]` lookups are all untouched, so live-video density numbers are bit-for-bit unchanged from today.

- [ ] **Step 2: Manual verification (no existing test harness covers the video pipeline's threaded inference loop)**

Run: `cd backend && ./venv/Scripts/python.exe -c "from vision.video_pipeline import _make_state; print(_make_state('FOB1', 5.5, 20))"`
Expected: a dict with `"name": "FOB-3 Stairway (Pf 14/15)"` (today's configured label for FOB1) and `"color": "critical"` (5.5 is above today's default `density_critical=6.0`? No — 5.5 < 6.0, so expected color is `"red"`; density 5.5 falls in the `[density_warning=5.0, density_critical=6.0)` band). Re-run mentally against `config.density_color`: confirm output is `"color": "red"`.

- [ ] **Step 3: Commit**

```bash
git add backend/vision/video_pipeline.py
git commit -m "feat(config): wire video_pipeline labels/colors to config store"
```

---

### Task 8: Wire `main.py` system status + broadcast version, and `scenario_runner.py`; trim `constants.py`; full regression checkpoint

**Files:**
- Modify: `backend/main.py`
- Modify: `backend/demo/scenario_runner.py`
- Modify: `backend/constants.py`
- Test: `backend/tests/test_scenario_config.py`

**Interfaces:**
- Consumes: `config.store.config_store` (Task 3)
- Produces: `get_frame(elapsed, mode)` unchanged signature, now config-driven with a fallback for any keyframe zone id that's been deleted from config; `_system_status(zones)` unchanged signature, now config-driven; broadcast payload gains `"config_version": int`.

- [ ] **Step 1: Write the failing test**

Create `backend/tests/test_scenario_config.py`:
```python
import pytest
from demo.scenario_runner import get_frame
from config.store import config_store


@pytest.fixture(autouse=True)
def restore_config():
    yield
    config_store.reset()


def test_get_frame_uses_configured_label():
    original = config_store.get()
    relabeled = original.model_copy(deep=True)
    relabeled.zone_by_id("FOB1").label = "Renamed Stairway"
    config_store.update(relabeled)

    frame = get_frame(0.0, mode="crowdguard")
    assert frame["FOB1"]["name"] == "Renamed Stairway"


def test_get_frame_falls_back_gracefully_if_scenario_zone_deleted():
    original = config_store.get()
    without_p6 = original.model_copy(deep=True)
    without_p6.zones = [z for z in without_p6.zones if z.id != "P6"]
    without_p6.view.zone_display_order = [
        zid for zid in without_p6.view.zone_display_order if zid != "P6"
    ]
    config_store.update(without_p6)

    frame = get_frame(0.0, mode="crowdguard")
    assert frame["P6"]["name"] == "P6"
    assert frame["P6"]["count"] >= 0
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd backend && ./venv/Scripts/python.exe -m pytest tests/test_scenario_config.py -v`
Expected: FAIL — `scenario_runner.get_frame` still reads `constants.ZONES` and would `KeyError` on a deleted zone rather than falling back.

- [ ] **Step 3: Rewire `scenario_runner.py`**

Modify `backend/demo/scenario_runner.py`. Replace:
```python
import time
from constants import ZONES, density_color
```
with:
```python
import time
from config.store import config_store
```

Replace `get_frame`:
```python
def get_frame(elapsed: float, mode: str = "crowdguard") -> dict:
    kf = _KF_CROWDGUARD if mode == "crowdguard" else _KF_HUMAN
    densities = _interpolate(kf, elapsed)
    zones = {}
    for zone_id, density in densities.items():
        zones[zone_id] = {
            "density": density,
            "count": int(density * ZONES[zone_id]["area_m2"]),
            "color": density_color(density),
            "name": ZONES[zone_id]["name"],
            "flow_vector": _flow_for(zone_id, density, elapsed),
        }
    return zones
```
with:
```python
def get_frame(elapsed: float, mode: str = "crowdguard") -> dict:
    kf = _KF_CROWDGUARD if mode == "crowdguard" else _KF_HUMAN
    densities = _interpolate(kf, elapsed)
    config = config_store.get()
    zones = {}
    for zone_id, density in densities.items():
        zone = config.zone_by_id(zone_id)
        # Fallback keeps the scripted NDLS replay running even if this zone
        # id was deleted from config — see spec §2 non-goals: the scenario
        # timeline is a fixed historical reenactment, not user-configured.
        area = zone.area_m2 if zone else 100.0
        name = zone.label if zone else zone_id
        zones[zone_id] = {
            "density": density,
            "count": int(density * area),
            "color": config.density_color(density),
            "name": name,
            "flow_vector": _flow_for(zone_id, density, elapsed),
        }
    return zones
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd backend && ./venv/Scripts/python.exe -m pytest tests/test_scenario_config.py -v`
Expected: 2 passed.

- [ ] **Step 5: Wire `main.py`'s system status and broadcast version**

Modify `backend/main.py`. Replace:
```python
from constants import WEBSOCKET_INTERVAL_MS, ZONES
```
with:
```python
from constants import WEBSOCKET_INTERVAL_MS
from config.store import config_store
```

Replace the `_density_hist` init:
```python
_density_hist: dict[str, list[float]] = {z: [] for z in ZONES}
```
with:
```python
_density_hist: dict[str, list[float]] = {}
```
(`_update_hist` already does `_density_hist.get(zid, [])` with a `[]` fallback, so new zone ids populate lazily — no pre-seeding needed.)

In `_broadcast_tick()`, add `"config_version": config_store.get().version` to both `payload` dict literals (the `mode == "video"` branch and the scenario-mode `else` branch) — e.g. the video branch becomes:
```python
        payload = {
            "elapsed": round(elapsed, 1),
            "config_version": config_store.get().version,
            "crowdguard": {
```
and identically for the scenario-mode branch's `payload = {...}`.

Replace `_system_status`:
```python
def _system_status(zones: dict) -> str:
    if not zones:
        return "normal"
    max_d = max(z["density"] for z in zones.values())
    if max_d >= 6.0:
        return "critical"
    if max_d >= 5.0:
        return "active"
    if max_d >= 3.0:
        return "monitoring"
    return "normal"
```
with:
```python
def _system_status(zones: dict) -> str:
    if not zones:
        return "normal"
    t = config_store.get().thresholds
    max_d = max(z["density"] for z in zones.values())
    if max_d >= t.density_critical:
        return "critical"
    if max_d >= t.l1_trigger:
        return "active"
    if max_d >= t.density_warning:
        return "monitoring"
    return "normal"
```

- [ ] **Step 6: Trim `constants.py` to non-station values**

Modify `backend/constants.py` — replace the entire file with only the values that are not station-specific config (still real Python constants, per spec §3):
```python
PREDICTION_HORIZON_SECONDS = 90
PREDICTION_INTERVALS = [30, 60, 90]
WEBSOCKET_INTERVAL_MS = 200
SCENARIO_TICK_MS = 500
```

- [ ] **Step 7: Run the full backend test suite**

Run: `cd backend && ./venv/Scripts/python.exe -m pytest tests/ -v`
Expected: all tests pass (nothing should import the removed `constants.ZONES`/`constants.density_color`/threshold names anymore — this is the checkpoint that catches any missed call site).

- [ ] **Step 8: Manual regression pass — the demo must still work end to end**

Run: `cd backend && ./venv/Scripts/python.exe -m uvicorn main:app --reload` (leave running)
In a second terminal: `curl -X POST http://localhost:8000/demo/start` then `curl http://localhost:8000/demo/status` (if present) or open `ws://localhost:8000/ws/live` via the frontend dev server (Task 14's checkpoint does the full browser pass — this step just confirms the backend doesn't crash and `/demo/start` + a few broadcast ticks succeed without exceptions in the server log).
Expected: no `KeyError`/`ImportError`/`AttributeError` in the server log; `/config` still returns the 12 default zones.

- [ ] **Step 9: Commit**

```bash
git add backend/main.py backend/demo/scenario_runner.py backend/constants.py backend/tests/test_scenario_config.py
git commit -m "feat(config): wire main.py + scenario_runner to config, trim constants.py"
```

---

## Phase 1 — Frontend

### Task 9: `ConfigProvider` + `useStationConfig()`

**Files:**
- Modify: `frontend/lib/types.ts`
- Create: `frontend/lib/config-context.tsx`
- Modify: `frontend/app/layout.tsx`

**Interfaces:**
- Consumes: `API_URL` from `frontend/lib/constants.ts` (existing)
- Produces: `ConfigProvider({ children })` (client component), `useStationConfig() -> { config: StationConfig | null; loading: boolean; refresh: () => Promise<void> }`. Later tasks (10, 13–16) import `useStationConfig` from `@/lib/config-context`.

- [ ] **Step 1: Add config types**

Modify `frontend/lib/types.ts`, append at the end:
```typescript
export interface ZoneBounds { x1: number; y1: number; x2: number; y2: number; }

export interface ZoneConfig {
  id: string;
  label: string;
  short_label: string;
  category_id: string;
  area_m2: number;
  camera_area_m2: number | null;
  bounds: ZoneBounds | null;
}

export interface CategoryConfig { id: string; label: string; color: string; }

export interface ThresholdConfig {
  density_safe: number;
  density_warning: number;
  density_critical: number;
  l1_trigger: number;
  l2_trigger: number;
  l3_trigger: number;
  pre_warn_trigger: number;
  failsafe_trigger: number;
  l2_countdown_seconds: number;
}

export interface ViewConfig {
  show_zone_chart: boolean;
  show_prediction_overlay: boolean;
  show_flow_vectors: boolean;
  show_critical_zones_panel: boolean;
  zone_display_order: string[];
}

export interface PresetConfig { name: string; view: ViewConfig; }

export interface StationConfig {
  zones: ZoneConfig[];
  categories: CategoryConfig[];
  thresholds: ThresholdConfig;
  view: ViewConfig;
  presets: PresetConfig[];
  video_width: number;
  video_height: number;
  version: number;
}
```

Also add `config_version?: number;` as a new field on the existing `LiveUpdate` interface (alongside `elapsed: number;`).

- [ ] **Step 2: Write the context**

Create `frontend/lib/config-context.tsx`:
```tsx
"use client";
import { createContext, useCallback, useContext, useEffect, useState } from "react";
import { API_URL } from "./constants";
import type { StationConfig } from "./types";

interface ConfigContextValue {
  config: StationConfig | null;
  loading: boolean;
  refresh: () => Promise<void>;
}

const ConfigContext = createContext<ConfigContextValue | null>(null);

export function ConfigProvider({ children }: { children: React.ReactNode }) {
  const [config, setConfig] = useState<StationConfig | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    const res = await fetch(`${API_URL}/config`);
    const data: StationConfig = await res.json();
    setConfig(data);
    setLoading(false);
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return (
    <ConfigContext.Provider value={{ config, loading, refresh }}>
      {children}
    </ConfigContext.Provider>
  );
}

export function useStationConfig(): ConfigContextValue {
  const ctx = useContext(ConfigContext);
  if (!ctx) throw new Error("useStationConfig must be used within a ConfigProvider");
  return ctx;
}
```

- [ ] **Step 3: Wrap the app in the provider**

Modify `frontend/app/layout.tsx`. Add the import:
```typescript
import { ConfigProvider } from "@/lib/config-context";
```
Wrap `{children}` inside `<body>`:
```tsx
      <body className="h-screen w-screen overflow-hidden" style={{ background: "#04070A" }}>
        {/* ...existing comment block unchanged... */}
        <ConfigProvider>{children}</ConfigProvider>
      </body>
```

- [ ] **Step 4: Manual verification**

Run: `cd frontend && npm run dev`
In the browser dev console on `http://localhost:3000`, confirm a network request to `GET http://localhost:8000/config` fires on page load and returns the 12-zone default config (requires the backend from Task 8 running).
Expected: 200 response with `zones.length === 12`, no console errors about missing `ConfigProvider`.

- [ ] **Step 5: Commit**

```bash
git add frontend/lib/types.ts frontend/lib/config-context.tsx frontend/app/layout.tsx
git commit -m "feat(config): add ConfigProvider fetching station config"
```

---

### Task 10: Wire `StationMap`, `ZoneChart`, `InterventionFeed`, `page.tsx` to config; trim `constants.ts`

**Files:**
- Modify: `frontend/lib/constants.ts`
- Modify: `frontend/components/StationMap.tsx`
- Modify: `frontend/components/ZoneChart.tsx`
- Modify: `frontend/components/InterventionFeed.tsx`
- Modify: `frontend/app/page.tsx`

**Interfaces:**
- Consumes: `useStationConfig()` (Task 9)
- Produces: no prop/signature changes to these components from their existing callers' point of view; `ZONE_META` and `DENSITY_THRESHOLDS` are removed from `constants.ts` (anything still needing zone labels reads them from config).

- [ ] **Step 1: Trim `constants.ts`**

Modify `frontend/lib/constants.ts`. Delete the `ZONE_META` and `DENSITY_THRESHOLDS` exports (lines 1–15 and 46–54). The file keeps `COLOR_MAP`, `BORDER_MAP`, `TEXT_MAP`, `LEVEL_COLORS`, `WS_URL`, `API_URL` — these map a color *name* or *level number* to CSS/labels, not station content, so they stay static per spec §6.

- [ ] **Step 2: Wire `InterventionFeed.tsx`**

Modify `frontend/components/InterventionFeed.tsx`. Replace:
```typescript
import { LEVEL_COLORS, ZONE_META } from "@/lib/constants";
```
with:
```typescript
import { LEVEL_COLORS } from "@/lib/constants";
import { useStationConfig } from "@/lib/config-context";
```
Add inside `export default function InterventionFeed(...)`, as the first line of the function body:
```typescript
  const { config } = useStationConfig();
  const shortLabel = (zoneId: string) =>
    config?.zones.find((z) => z.id === zoneId)?.short_label ?? zoneId;
```
Replace both occurrences of `ZONE_META[iv.zone]?.shortLabel ?? iv.zone` with `shortLabel(iv.zone)`.

(`StagedCard` and any other sub-component in this file that also references `ZONE_META` should receive `shortLabel` as a prop or call `useStationConfig()` itself — check the rest of the file below line 50 for additional `ZONE_META` usages beyond the two already found and apply the same substitution.)

- [ ] **Step 3: Wire `ZoneChart.tsx`**

Modify `frontend/components/ZoneChart.tsx`. Replace:
```typescript
import { BORDER_MAP, ZONE_META } from "@/lib/constants";
```
with:
```typescript
import { BORDER_MAP } from "@/lib/constants";
import { useStationConfig } from "@/lib/config-context";
```
Inside `export default function ZoneChart({ zones, historyMap }: Props)`, add:
```typescript
  const { config } = useStationConfig();
```
Replace:
```typescript
            label={ZONE_META[zid]?.shortLabel ?? zid}
```
with:
```typescript
            label={config?.zones.find((z) => z.id === zid)?.short_label ?? zid}
```

- [ ] **Step 4: Wire `StationMap.tsx`**

Modify `frontend/components/StationMap.tsx`. This component also has a fixed `BEARINGS`/`FULL_ORDER` layout — new zones need a bearing or they won't render (a real gap, not just a label swap). Replace:
```typescript
import { BORDER_MAP, ZONE_META, DENSITY_THRESHOLDS } from "@/lib/constants";
```
with:
```typescript
import { BORDER_MAP } from "@/lib/constants";
import { useStationConfig } from "@/lib/config-context";
```

Keep `BEARINGS` and `COMPACT_ORDER` exactly as they are (today's curated layout, unchanged). Replace `FULL_ORDER`'s fixed array and add a bearing fallback for any zone id not in `BEARINGS` — insert after the `BEARINGS` const:
```typescript
// Any zone id not in BEARINGS (i.e. one added through the no-code config UI)
// gets placed in the unused 220°-310° arc between P6 and GATE_B, spread
// evenly across however many such "extra" zones currently exist.
const EXTRA_ARC_START = 220, EXTRA_ARC_END = 310;
function bearingFor(id: string, extras: string[]): number {
  const fixed = BEARINGS[id];
  if (fixed !== undefined) return fixed;
  const idx = extras.indexOf(id);
  if (extras.length <= 1) return (EXTRA_ARC_START + EXTRA_ARC_END) / 2;
  return EXTRA_ARC_START + (idx / (extras.length - 1)) * (EXTRA_ARC_END - EXTRA_ARC_START);
}
```
Delete the old `const FULL_ORDER = [...]` line. Inside `export default function StationMap(...)`, add at the top of the function body:
```typescript
  const { config } = useStationConfig();
  const zoneIds = Object.keys(zones);
  const configuredOrder = (config?.view.zone_display_order ?? zoneIds).filter((id) => id !== "CONC");
  const extras = configuredOrder.filter((id) => BEARINGS[id] === undefined);
```
Replace:
```typescript
  const order = compact ? COMPACT_ORDER : FULL_ORDER;
```
with:
```typescript
  const order = compact ? COMPACT_ORDER.filter((id) => zoneIds.includes(id)) : configuredOrder;
```
Replace every `const bearing = BEARINGS[id];` (there are two — in the predicted-trajectory-vectors block and the contacts block) with:
```typescript
          const bearing = bearingFor(id, extras);
```
Replace the range-ring and threshold-label blocks that map `DENSITY_THRESHOLDS`:
```typescript
        {DENSITY_THRESHOLDS.map((t) => (
          <circle key={t.value} cx={CX} cy={CY} r={densityToRadius(t.value)}
            fill="none" stroke="var(--hair)" strokeWidth={1} />
        ))}
```
and
```typescript
        {!compact && DENSITY_THRESHOLDS.map((t) => {
          const r = densityToRadius(t.value);
          return (
            <text key={t.value} x={CX - r - 6} y={CY + 3} textAnchor="end"
              className="scope" fontSize={9} fill="var(--text-faint)" letterSpacing="0.05em">
              {t.value.toFixed(1)}
            </text>
          );
        })}
```
with a config-derived threshold list computed once near the top of the function body:
```typescript
  const t = config?.thresholds;
  const ringValues = t
    ? [t.l1_trigger, t.l2_trigger, t.pre_warn_trigger, t.l3_trigger, t.failsafe_trigger]
    : [5.0, 6.0, 7.0, 7.5, 8.0];
```
and using `ringValues.map((v) => (...))` / `ringValues.map((v) => { const r = densityToRadius(v); ... {v.toFixed(1)} ...})` in place of the two `DENSITY_THRESHOLDS.map` blocks (same JSX shape, `t.value` becomes `v`).
Replace the remaining `ZONE_META[id]?.shortLabel ?? id` with `config?.zones.find((z) => z.id === id)?.short_label ?? id`.

- [ ] **Step 5: Wire `page.tsx`'s zone label usage**

Modify `frontend/app/page.tsx`. Replace:
```typescript
import { API_URL, ZONE_META, BORDER_MAP } from "@/lib/constants";
```
with:
```typescript
import { API_URL, BORDER_MAP } from "@/lib/constants";
import { useStationConfig } from "@/lib/config-context";
```
Inside `export default function Home()`, add near the other top-of-component hooks:
```typescript
  const { config } = useStationConfig();
```
Replace `{ZONE_META[z]?.shortLabel}` with `{config?.zones.find((zc) => zc.id === z)?.short_label}`.

- [ ] **Step 6: Manual verification**

Run: `cd frontend && npm run build` (TypeScript type-check + production build — the fastest way to catch a missed `ZONE_META`/`DENSITY_THRESHOLDS` reference without a test runner).
Expected: build succeeds with no type errors.

Then `npm run dev`, open the dashboard, and confirm zone labels/short labels and the five range-ring values on the station map still render exactly as before (NDLS defaults are unchanged, so this is a pure regression check — nothing should look different yet).

- [ ] **Step 7: Commit**

```bash
git add frontend/lib/constants.ts frontend/components/StationMap.tsx frontend/components/ZoneChart.tsx frontend/components/InterventionFeed.tsx frontend/app/page.tsx
git commit -m "feat(config): wire dashboard components to station config context"
```

---

### Task 11: Settings panel shell + Thresholds tab

**Files:**
- Create: `frontend/components/SettingsPanel.tsx`
- Create: `frontend/components/settings/ThresholdsTab.tsx`
- Modify: `frontend/app/page.tsx`

**Interfaces:**
- Consumes: `useStationConfig()` (Task 9), `API_URL` (existing)
- Produces: `SettingsPanel({ open, onClose }: { open: boolean; onClose: () => void })`, mounted from `page.tsx`; internally renders tab nav + the active tab component. `ThresholdsTab` takes no props (reads/writes via `useStationConfig()`).

- [ ] **Step 1: Write the settings panel shell**

Create `frontend/components/SettingsPanel.tsx`:
```tsx
"use client";
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X } from "lucide-react";
import ThresholdsTab from "./settings/ThresholdsTab";
import CategoriesTab from "./settings/CategoriesTab";
import ZonesTab from "./settings/ZonesTab";
import ViewsTab from "./settings/ViewsTab";

type Tab = "zones" | "thresholds" | "categories" | "views";

const TABS: { id: Tab; label: string }[] = [
  { id: "zones", label: "ZONES" },
  { id: "thresholds", label: "THRESHOLDS" },
  { id: "categories", label: "CATEGORIES" },
  { id: "views", label: "VIEWS" },
];

export default function SettingsPanel({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [tab, setTab] = useState<Tab>("thresholds");

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={onClose}
            style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", zIndex: 40 }}
          />
          <motion.div
            initial={{ x: "100%" }} animate={{ x: 0 }} exit={{ x: "100%" }}
            transition={{ type: "spring", damping: 28, stiffness: 260 }}
            style={{
              position: "fixed", top: 0, right: 0, bottom: 0, width: 420, maxWidth: "100%",
              background: "var(--bg, #04070A)", borderLeft: "1px solid var(--hair, #21262D)",
              zIndex: 41, display: "flex", flexDirection: "column",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", padding: "14px 16px", borderBottom: "1px solid var(--hair-dim, #21262D)" }}>
              <span className="scope" style={{ fontSize: 12, letterSpacing: "0.1em", color: "var(--text-dim, #94A3B8)" }}>
                STATION CONFIGURATION
              </span>
              <button onClick={onClose} style={{ marginLeft: "auto", background: "none", border: "none", cursor: "pointer" }}>
                <X size={18} color="var(--text-dim, #94A3B8)" />
              </button>
            </div>

            <div style={{ display: "flex", borderBottom: "1px solid var(--hair-dim, #21262D)" }}>
              {TABS.map((tb) => (
                <button
                  key={tb.id}
                  onClick={() => setTab(tb.id)}
                  className="scope"
                  style={{
                    flex: 1, padding: "10px 4px", fontSize: 10, letterSpacing: "0.06em",
                    background: "none", border: "none", cursor: "pointer",
                    color: tab === tb.id ? "var(--sweep, #29FF8C)" : "var(--text-faint, #64748B)",
                    borderBottom: tab === tb.id ? "2px solid var(--sweep, #29FF8C)" : "2px solid transparent",
                  }}
                >
                  {tb.label}
                </button>
              ))}
            </div>

            <div style={{ flex: 1, overflowY: "auto", padding: 16 }}>
              {tab === "zones" && <ZonesTab />}
              {tab === "thresholds" && <ThresholdsTab />}
              {tab === "categories" && <CategoriesTab />}
              {tab === "views" && <ViewsTab />}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
```

- [ ] **Step 2: Write the Thresholds tab**

Create `frontend/components/settings/ThresholdsTab.tsx`:
```tsx
"use client";
import { useState, useEffect } from "react";
import { useStationConfig } from "@/lib/config-context";
import { API_URL } from "@/lib/constants";
import type { ThresholdConfig } from "@/lib/types";

const FIELDS: { key: keyof ThresholdConfig; label: string }[] = [
  { key: "density_safe", label: "Safe (green) below" },
  { key: "density_warning", label: "Warning (amber) below" },
  { key: "density_critical", label: "Critical (red) below" },
  { key: "l1_trigger", label: "L1 auto-fire at" },
  { key: "l2_trigger", label: "L2 stage at" },
  { key: "pre_warn_trigger", label: "PRE-WARN at" },
  { key: "l3_trigger", label: "L3 stage (predicted t+90s) at" },
  { key: "failsafe_trigger", label: "SOS at" },
  { key: "l2_countdown_seconds", label: "L2 elapsed-urgency window (s)" },
];

export default function ThresholdsTab() {
  const { config, refresh } = useStationConfig();
  const [draft, setDraft] = useState<ThresholdConfig | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (config && !draft) setDraft(config.thresholds);
  }, [config, draft]);

  if (!config || !draft) return <p style={{ color: "var(--text-faint)", fontSize: 12 }}>Loading…</p>;

  const clientOrderingOk =
    draft.density_safe < draft.density_warning &&
    draft.density_warning < draft.density_critical &&
    draft.l1_trigger <= draft.l2_trigger &&
    draft.pre_warn_trigger <= draft.failsafe_trigger;

  async function save() {
    if (!draft) return;
    setSaving(true);
    setError(null);
    const res = await fetch(`${API_URL}/config`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...config, thresholds: draft }),
    });
    setSaving(false);
    if (!res.ok) {
      const body = await res.json().catch(() => null);
      setError(body?.detail ? JSON.stringify(body.detail) : `Save failed (${res.status})`);
      return;
    }
    await refresh();
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      {FIELDS.map(({ key, label }) => (
        <label key={key} style={{ display: "flex", flexDirection: "column", gap: 3, fontSize: 11, color: "var(--text-dim)" }}>
          {label}
          <input
            type="number" step="0.1"
            value={draft[key]}
            onChange={(e) => setDraft({ ...draft, [key]: Number(e.target.value) })}
            style={{ background: "var(--surface, #161B22)", border: "1px solid var(--hair, #21262D)", color: "var(--text-primary, #F1F5F9)", padding: "6px 8px", fontSize: 13 }}
          />
        </label>
      ))}
      {!clientOrderingOk && (
        <p style={{ color: "var(--red, #FF3B3B)", fontSize: 11 }}>
          Thresholds must increase: safe &lt; warning &lt; critical, L1 ≤ L2, PRE-WARN ≤ SOS.
        </p>
      )}
      {error && <p style={{ color: "var(--red, #FF3B3B)", fontSize: 11 }}>{error}</p>}
      <button
        onClick={save}
        disabled={!clientOrderingOk || saving}
        style={{
          marginTop: 8, padding: "8px 12px", background: "var(--sweep, #29FF8C)", color: "#04070A",
          border: "none", fontWeight: 700, fontSize: 12, cursor: clientOrderingOk ? "pointer" : "not-allowed",
          opacity: clientOrderingOk ? 1 : 0.5,
        }}
      >
        {saving ? "SAVING…" : "SAVE THRESHOLDS"}
      </button>
    </div>
  );
}
```

- [ ] **Step 3: Mount the panel from `page.tsx`**

Modify `frontend/app/page.tsx`. Add the import:
```typescript
import { Settings } from "lucide-react";
import SettingsPanel from "@/components/SettingsPanel";
```
Add state near the other `useState` declarations in `Home()`:
```typescript
  const [settingsOpen, setSettingsOpen] = useState(false);
```
In the header JSX (near the existing nav buttons), add a gear icon button:
```tsx
              <button onClick={() => setSettingsOpen(true)} title="Station configuration" style={{ background: "none", border: "none", cursor: "pointer" }}>
                <Settings size={16} color="var(--text-dim)" />
              </button>
```
Near the end of the component's returned JSX (as a sibling to the main content, so it overlays regardless of `view`), add:
```tsx
      <SettingsPanel open={settingsOpen} onClose={() => setSettingsOpen(false)} />
```

`CategoriesTab`, `ZonesTab`, and `ViewsTab` are imported by `SettingsPanel.tsx` already (Step 1) but don't exist yet — Tasks 12–14 create them. The build will fail until then; that's expected and resolved by the next task.

- [ ] **Step 4: Stub the remaining tabs so the build is green after this task**

Create placeholder-free minimal versions that will be replaced in Tasks 12–14 — write them as genuinely functional (not TODO stubs) but minimal, so this task's build passes and each subsequent task only adds capability rather than un-stubbing dead code:

Create `frontend/components/settings/CategoriesTab.tsx`:
```tsx
"use client";
import { useStationConfig } from "@/lib/config-context";

export default function CategoriesTab() {
  const { config } = useStationConfig();
  return (
    <div style={{ fontSize: 12, color: "var(--text-dim)" }}>
      {config?.categories.map((c) => (
        <div key={c.id} style={{ display: "flex", alignItems: "center", gap: 8, padding: "4px 0" }}>
          <span style={{ width: 10, height: 10, background: c.color, display: "inline-block" }} />
          {c.label}
        </div>
      ))}
    </div>
  );
}
```

Create `frontend/components/settings/ZonesTab.tsx`:
```tsx
"use client";
import { useStationConfig } from "@/lib/config-context";

export default function ZonesTab() {
  const { config } = useStationConfig();
  return (
    <div style={{ fontSize: 12, color: "var(--text-dim)" }}>
      {config?.zones.map((z) => (
        <div key={z.id} style={{ padding: "4px 0" }}>{z.label} ({z.short_label})</div>
      ))}
    </div>
  );
}
```

Create `frontend/components/settings/ViewsTab.tsx`:
```tsx
"use client";
import { useStationConfig } from "@/lib/config-context";

export default function ViewsTab() {
  const { config } = useStationConfig();
  return <div style={{ fontSize: 12, color: "var(--text-dim)" }}>{config ? "Views loaded." : "Loading…"}</div>;
}
```

- [ ] **Step 5: Manual verification**

Run: `cd frontend && npm run build`
Expected: succeeds.

Run: `npm run dev`, open the dashboard, click the gear icon, confirm the slide-over opens with 4 tabs, the Thresholds tab shows today's 9 default values, editing one and clicking "SAVE THRESHOLDS" succeeds (network tab shows `PUT /config` → 200), and after saving, the station map's range rings / L1 firing point reflect the new value on the next broadcast tick (may take up to 200ms).

- [ ] **Step 6: Commit**

```bash
git add frontend/components/SettingsPanel.tsx frontend/components/settings/ frontend/app/page.tsx
git commit -m "feat(config): add settings slide-over shell with Thresholds tab"
```

---

### Task 12: Categories tab (add / edit / remove)

**Files:**
- Modify: `frontend/components/settings/CategoriesTab.tsx`

**Interfaces:**
- Consumes: `useStationConfig()` (Task 9)
- Produces: full CRUD UI for `CategoryConfig`, replacing Task 11's read-only stub.

- [ ] **Step 1: Write the full Categories tab**

Modify `frontend/components/settings/CategoriesTab.tsx`:
```tsx
"use client";
import { useState } from "react";
import { useStationConfig } from "@/lib/config-context";
import { API_URL } from "@/lib/constants";
import type { CategoryConfig } from "@/lib/types";

export default function CategoriesTab() {
  const { config, refresh } = useStationConfig();
  const [error, setError] = useState<string | null>(null);
  const [newId, setNewId] = useState("");

  if (!config) return <p style={{ color: "var(--text-faint)", fontSize: 12 }}>Loading…</p>;

  async function save(categories: CategoryConfig[]) {
    setError(null);
    const res = await fetch(`${API_URL}/config`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...config, categories }),
    });
    if (!res.ok) {
      const body = await res.json().catch(() => null);
      setError(body?.detail ? JSON.stringify(body.detail) : `Save failed (${res.status})`);
      return;
    }
    await refresh();
  }

  function update(id: string, patch: Partial<CategoryConfig>) {
    save(config!.categories.map((c) => (c.id === id ? { ...c, ...patch } : c)));
  }

  function remove(id: string) {
    const inUse = config!.zones.some((z) => z.category_id === id);
    if (inUse) {
      setError(`Category "${id}" is used by at least one zone — reassign those zones first.`);
      return;
    }
    save(config!.categories.filter((c) => c.id !== id));
  }

  function add() {
    const id = newId.trim();
    if (!id || config!.categories.some((c) => c.id === id)) {
      setError("Category id must be non-empty and unique.");
      return;
    }
    save([...config!.categories, { id, label: id, color: "#94A3B8" }]);
    setNewId("");
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      {config.categories.map((c) => (
        <div key={c.id} style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <input
            type="color" value={c.color}
            onChange={(e) => update(c.id, { color: e.target.value })}
            style={{ width: 24, height: 24, padding: 0, border: "none", background: "none" }}
          />
          <input
            value={c.label}
            onChange={(e) => update(c.id, { label: e.target.value })}
            style={{ flex: 1, background: "var(--surface, #161B22)", border: "1px solid var(--hair, #21262D)", color: "var(--text-primary, #F1F5F9)", padding: "5px 8px", fontSize: 12 }}
          />
          <button onClick={() => remove(c.id)} style={{ background: "none", border: "none", color: "var(--red, #FF3B3B)", cursor: "pointer", fontSize: 11 }}>
            REMOVE
          </button>
        </div>
      ))}
      <div style={{ display: "flex", gap: 6, marginTop: 8 }}>
        <input
          placeholder="new category id"
          value={newId}
          onChange={(e) => setNewId(e.target.value)}
          style={{ flex: 1, background: "var(--surface, #161B22)", border: "1px solid var(--hair, #21262D)", color: "var(--text-primary, #F1F5F9)", padding: "5px 8px", fontSize: 12 }}
        />
        <button onClick={add} style={{ padding: "5px 10px", background: "var(--sweep, #29FF8C)", color: "#04070A", border: "none", fontWeight: 700, fontSize: 11, cursor: "pointer" }}>
          ADD
        </button>
      </div>
      {error && <p style={{ color: "var(--red, #FF3B3B)", fontSize: 11 }}>{error}</p>}
    </div>
  );
}
```

- [ ] **Step 2: Manual verification**

Run: `cd frontend && npm run build && npm run dev`
In the browser: open Settings → Categories, add a category, edit its color/label, confirm it appears in the Zones tab's category dropdown (Task 13) once that exists, and confirm removing a category that's still assigned to a zone shows the in-use error instead of a 422 round-trip.

- [ ] **Step 3: Commit**

```bash
git add frontend/components/settings/CategoriesTab.tsx
git commit -m "feat(config): add Categories tab CRUD"
```

---

### Task 13: Zones tab (metadata CRUD — no pixel bounds, per Phase 1 scope)

**Files:**
- Modify: `frontend/components/settings/ZonesTab.tsx`

**Interfaces:**
- Consumes: `useStationConfig()` (Task 9)
- Produces: add/remove/edit UI for `label`, `short_label`, `category_id`, `area_m2`. New zones are created with `bounds: null` and no pixel geometry — see Task 5's engine test confirming a zone with no `L1_ACTIONS` entry still produces a working (generic-copy) intervention, and Task 6 confirming `ZoneTracker`/`detect_frame` handle a config-only zone with no pre-seeded history.

- [ ] **Step 1: Write the full Zones tab**

Modify `frontend/components/settings/ZonesTab.tsx`:
```tsx
"use client";
import { useState } from "react";
import { useStationConfig } from "@/lib/config-context";
import { API_URL } from "@/lib/constants";
import type { ZoneConfig } from "@/lib/types";

export default function ZonesTab() {
  const { config, refresh } = useStationConfig();
  const [error, setError] = useState<string | null>(null);
  const [newId, setNewId] = useState("");

  if (!config) return <p style={{ color: "var(--text-faint)", fontSize: 12 }}>Loading…</p>;

  async function save(zones: ZoneConfig[], displayOrder?: string[]) {
    setError(null);
    const view = displayOrder ? { ...config!.view, zone_display_order: displayOrder } : config!.view;
    const res = await fetch(`${API_URL}/config`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...config, zones, view }),
    });
    if (!res.ok) {
      const body = await res.json().catch(() => null);
      setError(body?.detail ? JSON.stringify(body.detail) : `Save failed (${res.status})`);
      return;
    }
    await refresh();
  }

  function update(id: string, patch: Partial<ZoneConfig>) {
    save(config!.zones.map((z) => (z.id === id ? { ...z, ...patch } : z)));
  }

  function remove(id: string) {
    save(
      config!.zones.filter((z) => z.id !== id),
      config!.view.zone_display_order.filter((zid) => zid !== id)
    );
  }

  function add() {
    const id = newId.trim().toUpperCase().replace(/\s+/g, "_");
    if (!id || config!.zones.some((z) => z.id === id)) {
      setError("Zone id must be non-empty and unique.");
      return;
    }
    if (config!.categories.length === 0) {
      setError("Add a category first — every zone needs one.");
      return;
    }
    const zone: ZoneConfig = {
      id, label: id, short_label: id,
      category_id: config!.categories[0].id, area_m2: 100.0,
      camera_area_m2: null, bounds: null,
    };
    save([...config!.zones, zone], [...config!.view.zone_display_order, id]);
    setNewId("");
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      {config.zones.map((z) => (
        <div key={z.id} style={{ border: "1px solid var(--hair-dim, #21262D)", padding: 8, display: "flex", flexDirection: "column", gap: 6 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span className="scope" style={{ fontSize: 10, color: "var(--text-faint)", letterSpacing: "0.06em" }}>{z.id}</span>
            <button onClick={() => remove(z.id)} style={{ background: "none", border: "none", color: "var(--red, #FF3B3B)", cursor: "pointer", fontSize: 10 }}>
              REMOVE
            </button>
          </div>
          <input
            value={z.label} placeholder="label"
            onChange={(e) => update(z.id, { label: e.target.value })}
            style={{ background: "var(--surface, #161B22)", border: "1px solid var(--hair, #21262D)", color: "var(--text-primary, #F1F5F9)", padding: "5px 8px", fontSize: 12 }}
          />
          <input
            value={z.short_label} placeholder="short label"
            onChange={(e) => update(z.id, { short_label: e.target.value })}
            style={{ background: "var(--surface, #161B22)", border: "1px solid var(--hair, #21262D)", color: "var(--text-primary, #F1F5F9)", padding: "5px 8px", fontSize: 12 }}
          />
          <div style={{ display: "flex", gap: 6 }}>
            <select
              value={z.category_id}
              onChange={(e) => update(z.id, { category_id: e.target.value })}
              style={{ flex: 1, background: "var(--surface, #161B22)", border: "1px solid var(--hair, #21262D)", color: "var(--text-primary, #F1F5F9)", padding: "5px 8px", fontSize: 12 }}
            >
              {config.categories.map((c) => (
                <option key={c.id} value={c.id}>{c.label}</option>
              ))}
            </select>
            <input
              type="number" value={z.area_m2} placeholder="area (m²)"
              onChange={(e) => update(z.id, { area_m2: Number(e.target.value) })}
              style={{ width: 90, background: "var(--surface, #161B22)", border: "1px solid var(--hair, #21262D)", color: "var(--text-primary, #F1F5F9)", padding: "5px 8px", fontSize: 12 }}
            />
          </div>
          {!z.bounds && (
            <p style={{ fontSize: 10, color: "var(--text-faint)" }}>
              Not calibrated for live video — appears on the map and fires interventions in scenario/live modes using density, but contributes no person detections until calibrated.
            </p>
          )}
        </div>
      ))}
      <div style={{ display: "flex", gap: 6 }}>
        <input
          placeholder="new zone id"
          value={newId}
          onChange={(e) => setNewId(e.target.value)}
          style={{ flex: 1, background: "var(--surface, #161B22)", border: "1px solid var(--hair, #21262D)", color: "var(--text-primary, #F1F5F9)", padding: "5px 8px", fontSize: 12 }}
        />
        <button onClick={add} style={{ padding: "5px 10px", background: "var(--sweep, #29FF8C)", color: "#04070A", border: "none", fontWeight: 700, fontSize: 11, cursor: "pointer" }}>
          ADD ZONE
        </button>
      </div>
      {error && <p style={{ color: "var(--red, #FF3B3B)", fontSize: 11 }}>{error}</p>}
    </div>
  );
}
```

- [ ] **Step 2: Manual verification**

Run: `cd frontend && npm run build && npm run dev`
In the browser: open Settings → Zones, add a new zone (e.g. "WAITING_HALL"), confirm it appears in the ZoneChart (Task 10 wiring) with its label, and — with the backend's scenario mode running — confirm no crash occurs (the new zone simply shows 0 density, since scripted keyframes don't reference it; Task 8's fallback prevents a crash for the reverse case of a *deleted* NDLS zone, not a new one, which is a non-issue since `get_frame` only iterates keyframe zone ids). Remove a category that's in use and confirm the friendly in-use error appears instead of a raw 422.

- [ ] **Step 3: Commit**

```bash
git add frontend/components/settings/ZonesTab.tsx
git commit -m "feat(config): add Zones tab CRUD (metadata only, no pixel bounds)"
```

---

### Task 14: Views tab (widget toggles + presets) + wire `page.tsx` conditional rendering + Phase 1 regression checkpoint

**Files:**
- Modify: `frontend/components/settings/ViewsTab.tsx`
- Modify: `frontend/app/page.tsx`

**Interfaces:**
- Consumes: `useStationConfig()` (Task 9)
- Produces: full CRUD for `ViewConfig` toggles + `PresetConfig` save/apply/delete; `page.tsx` reads `config.view.show_*` to conditionally render `ZoneChart`, the prediction overlay, flow vectors, and the critical-zones panel.

- [ ] **Step 1: Write the full Views tab**

Modify `frontend/components/settings/ViewsTab.tsx`:
```tsx
"use client";
import { useState } from "react";
import { useStationConfig } from "@/lib/config-context";
import { API_URL } from "@/lib/constants";
import type { ViewConfig } from "@/lib/types";

const TOGGLES: { key: keyof ViewConfig; label: string }[] = [
  { key: "show_zone_chart", label: "Zone density chart" },
  { key: "show_prediction_overlay", label: "90s prediction overlay" },
  { key: "show_flow_vectors", label: "Flow vector arrows" },
  { key: "show_critical_zones_panel", label: "Critical zones panel" },
];

export default function ViewsTab() {
  const { config, refresh } = useStationConfig();
  const [error, setError] = useState<string | null>(null);
  const [presetName, setPresetName] = useState("");

  if (!config) return <p style={{ color: "var(--text-faint)", fontSize: 12 }}>Loading…</p>;

  async function put(body: object) {
    setError(null);
    const res = await fetch(`${API_URL}/config`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      const errBody = await res.json().catch(() => null);
      setError(errBody?.detail ? JSON.stringify(errBody.detail) : `Save failed (${res.status})`);
      return;
    }
    await refresh();
  }

  function toggle(key: keyof ViewConfig) {
    put({ ...config, view: { ...config!.view, [key]: !config!.view[key] } });
  }

  function savePreset() {
    const name = presetName.trim();
    if (!name) { setError("Preset name required."); return; }
    const presets = [...config!.presets.filter((p) => p.name !== name), { name, view: config!.view }];
    put({ ...config, presets });
    setPresetName("");
  }

  function applyPreset(name: string) {
    const preset = config!.presets.find((p) => p.name === name);
    if (!preset) return;
    put({ ...config, view: preset.view });
  }

  function deletePreset(name: string) {
    put({ ...config, presets: config!.presets.filter((p) => p.name !== name) });
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {TOGGLES.map(({ key, label }) => (
          <label key={key} style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12, color: "var(--text-dim)" }}>
            <input type="checkbox" checked={Boolean(config.view[key])} onChange={() => toggle(key)} />
            {label}
          </label>
        ))}
      </div>

      <div>
        <p className="scope" style={{ fontSize: 10, color: "var(--text-faint)", letterSpacing: "0.06em", marginBottom: 6 }}>PRESETS</p>
        {config.presets.map((p) => (
          <div key={p.name} style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 4 }}>
            <span style={{ flex: 1, fontSize: 12, color: "var(--text-dim)" }}>{p.name}</span>
            <button onClick={() => applyPreset(p.name)} style={{ fontSize: 10, background: "none", border: "1px solid var(--hair, #21262D)", color: "var(--sweep, #29FF8C)", cursor: "pointer", padding: "3px 6px" }}>APPLY</button>
            <button onClick={() => deletePreset(p.name)} style={{ fontSize: 10, background: "none", border: "none", color: "var(--red, #FF3B3B)", cursor: "pointer" }}>DELETE</button>
          </div>
        ))}
        <div style={{ display: "flex", gap: 6, marginTop: 6 }}>
          <input
            placeholder="save current toggles as…"
            value={presetName}
            onChange={(e) => setPresetName(e.target.value)}
            style={{ flex: 1, background: "var(--surface, #161B22)", border: "1px solid var(--hair, #21262D)", color: "var(--text-primary, #F1F5F9)", padding: "5px 8px", fontSize: 12 }}
          />
          <button onClick={savePreset} style={{ padding: "5px 10px", background: "var(--sweep, #29FF8C)", color: "#04070A", border: "none", fontWeight: 700, fontSize: 11, cursor: "pointer" }}>
            SAVE
          </button>
        </div>
      </div>

      {error && <p style={{ color: "var(--red, #FF3B3B)", fontSize: 11 }}>{error}</p>}
    </div>
  );
}
```

- [ ] **Step 2: Gate dashboard widgets on `view.show_*`**

Modify `frontend/app/page.tsx`. Using the `config` value already read in Task 10 Step 5, wrap the existing `<ZoneChart .../>` render with `{config?.view.show_zone_chart !== false && (...)}`, the prediction-overlay-related JSX with `{config?.view.show_prediction_overlay !== false && (...)}`, the flow-vector prop passed into `<StationMap showPredictions={...} />`-adjacent rendering with the `show_flow_vectors` flag, and the critical-zones panel block with `show_critical_zones_panel`. (Use `!== false` rather than a truthy check so the dashboard renders everything by default before the config has loaded, matching today's always-on behavior.)

- [ ] **Step 3: Run the full backend test suite one more time (sanity — no backend files changed in this task, but confirms nothing regressed since Task 8)**

Run: `cd backend && ./venv/Scripts/python.exe -m pytest tests/ -v`
Expected: all pass.

- [ ] **Step 4: Phase 1 regression checkpoint — full manual pass**

Run: `cd backend && ./venv/Scripts/python.exe -m uvicorn main:app --reload` and, in a second terminal, `cd frontend && npm run dev`.

In the browser:
1. Dashboard loads with all 12 default zones, unchanged labels, unchanged range rings — confirms Task 8–10 didn't regress the default demo.
2. Click "▶ Start Demo" (scenario mode) and let it run past t=75s — confirm L1 still auto-fires with the original NDLS PA copy (from `L1_ACTIONS`, not the generic fallback, since FOB1/CONC still have custom entries).
3. Open Settings, lower `l1_trigger` to something that fires immediately in scenario mode at t=0 — confirm the intervention feed shows a new L1 entry within ~1 second, without restarting the demo.
4. Add a new zone via the Zones tab, confirm it shows up in the ZoneChart and (via the bearing fallback) on the StationMap.
5. Toggle "Zone density chart" off in Views — confirm it disappears from the dashboard immediately; toggle back on.
6. Save a preset, change a toggle, apply the preset back, confirm it restores.
7. Click "Reset to NDLS defaults" is not yet wired (that's Task 15 if scoped, or can be added here) — for this checkpoint, call `curl -X POST http://localhost:8000/config/reset` directly and confirm the dashboard picks up the restored defaults within one broadcast tick after clicking the gear icon closed/reopened (or after any settings tab triggers a `refresh()`).

Expected: all seven checks pass with no console errors and no backend exceptions in the server log.

- [ ] **Step 5: Commit**

```bash
git add frontend/components/settings/ViewsTab.tsx frontend/app/page.tsx
git commit -m "feat(config): add Views tab with presets, gate dashboard widgets on view config"
```

---

## Phase 2 — Zone geometry calibration (additive; skip if time-constrained, Phase 1 ships standalone)

### Task 15: `GET /config/calibration-frame` + wire "Reset to NDLS defaults" button

**Files:**
- Modify: `backend/main.py`
- Create: `frontend/components/settings/ResetButton.tsx`
- Modify: `frontend/components/SettingsPanel.tsx`

**Interfaces:**
- Produces: `GET /config/calibration-frame -> { image_base64: str }` — a single JPEG frame from the currently configured video source, base64-encoded.

- [ ] **Step 1: Add the calibration-frame endpoint**

Modify `backend/main.py`. Add near the config endpoints from Task 4:
```python
import base64
import cv2

@app.get("/config/calibration-frame")
async def calibration_frame(source: str = "platform"):
    video_path = _VIDEO_MAP.get(source)
    if not video_path or not Path(video_path).exists():
        return {"status": "error", "detail": f"Video not found: {source}"}
    cap = cv2.VideoCapture(video_path)
    ok, frame = cap.read()
    cap.release()
    if not ok:
        return {"status": "error", "detail": "Could not read a frame from the video source"}
    frame = cv2.resize(frame, (config_store.get().video_width, config_store.get().video_height))
    ok, buf = cv2.imencode(".jpg", frame)
    if not ok:
        return {"status": "error", "detail": "Could not encode frame"}
    return {"image_base64": base64.b64encode(buf).decode("ascii")}
```

- [ ] **Step 2: Manual verification**

Run: `cd backend && ./venv/Scripts/python.exe -m uvicorn main:app --reload`, then `curl http://localhost:8000/config/calibration-frame`.
Expected: JSON with a non-empty `image_base64` string.

- [ ] **Step 3: Add the "Reset to NDLS defaults" button to the settings panel**

Create `frontend/components/settings/ResetButton.tsx`:
```tsx
"use client";
import { useState } from "react";
import { useStationConfig } from "@/lib/config-context";
import { API_URL } from "@/lib/constants";

export default function ResetButton() {
  const { refresh } = useStationConfig();
  const [confirming, setConfirming] = useState(false);

  async function reset() {
    await fetch(`${API_URL}/config/reset`, { method: "POST" });
    await refresh();
    setConfirming(false);
  }

  if (!confirming) {
    return (
      <button onClick={() => setConfirming(true)} style={{ fontSize: 10, background: "none", border: "1px solid var(--hair, #21262D)", color: "var(--text-faint, #64748B)", cursor: "pointer", padding: "4px 8px" }}>
        RESET TO NDLS DEFAULTS
      </button>
    );
  }
  return (
    <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
      <span style={{ fontSize: 10, color: "var(--red, #FF3B3B)" }}>Discard all config changes?</span>
      <button onClick={reset} style={{ fontSize: 10, background: "var(--red, #FF3B3B)", color: "#04070A", border: "none", cursor: "pointer", padding: "4px 8px" }}>CONFIRM</button>
      <button onClick={() => setConfirming(false)} style={{ fontSize: 10, background: "none", border: "none", color: "var(--text-faint, #64748B)", cursor: "pointer" }}>CANCEL</button>
    </div>
  );
}
```

Modify `frontend/components/SettingsPanel.tsx` — add the import `import ResetButton from "./settings/ResetButton";` and render `<ResetButton />` at the bottom of the header div (after the `X` close button, or as a new row below the tab bar).

- [ ] **Step 4: Manual verification**

In the browser, open Settings, click "RESET TO NDLS DEFAULTS", confirm, and verify all tabs revert to the seeded 12-zone config.

- [ ] **Step 5: Commit**

```bash
git add backend/main.py frontend/components/settings/ResetButton.tsx frontend/components/SettingsPanel.tsx
git commit -m "feat(config): add calibration-frame endpoint and Reset to NDLS defaults button"
```

---

### Task 16: Unify pixel geometry into `ZoneConfig.bounds` (backend)

**Files:**
- Modify: `backend/vision/zone_map.py`
- Modify: `backend/vision/video_pipeline.py`
- Modify: `backend/config/defaults.py`
- Test: `backend/tests/test_vision_config.py` (append)

**Interfaces:**
- Produces: `point_to_zone(cx, cy)` unchanged signature, now reading `config_store.get().zones[*].bounds` instead of the hardcoded `ZONE_BOUNDS_FULL`. `VideoPipeline` reads each active zone's `bounds` (falling back to its existing hardcoded rectangle when `bounds is None`, so live-video mode is unchanged until a zone is explicitly calibrated) and `camera_area_m2` (same fallback pattern for `area_m2`).

- [ ] **Step 1: Seed today's pixel bounds into `defaults.py`**

Modify `backend/config/defaults.py`. Add `bounds=ZoneBounds(...)` to each of the 12 `ZoneConfig` entries using today's `ZONE_BOUNDS_FULL` values from `backend/vision/zone_map.py` (import `ZoneBounds` from `config.schema`), e.g.:
```python
    ZoneConfig(id="CONC", label="Main Concourse (NDLS)", short_label="Concourse",
               category_id="concourse", area_m2=1200.0,
               bounds=ZoneBounds(x1=0, y1=0, x2=640, y2=60)),
```
Repeat for all 12 zones using the exact `x1,y1,x2,y2` values already present in `ZONE_BOUNDS_FULL` (`backend/vision/zone_map.py` lines 31–44). Also set `camera_area_m2` for the 6 zones present in `video_pipeline.py`'s `_ACTIVE_ZONES` to their existing hardcoded values (CONC=60.0, FOB1=15.0, FOB2=15.0, P1=40.0, P2=40.0, P3=40.0) — the other 6 zones (`GATE_A/B/C`, `P4/P5/P6`) are `video_pipeline.py`'s `_PASSIVE_ZONES` and keep `camera_area_m2=None`.

- [ ] **Step 2: Write the failing test**

Append to `backend/tests/test_vision_config.py`:
```python
from vision.zone_map import point_to_zone


def test_point_to_zone_reads_configured_bounds():
    original = config_store.get()
    resized = original.model_copy(deep=True)
    resized.zone_by_id("CONC").bounds.y2 = 480  # cover the whole frame
    config_store.update(resized)

    assert point_to_zone(320, 400) == "CONC"  # would have been P2/P3 under default bounds


def test_point_to_zone_skips_uncalibrated_zone():
    original = config_store.get()
    uncalibrated = original.model_copy(deep=True)
    uncalibrated.zone_by_id("P6").bounds = None
    config_store.update(uncalibrated)

    # A point that only ever matched P6 under default bounds now matches nothing new;
    # point_to_zone must not raise even though P6.bounds is None.
    assert point_to_zone(-100, -100) is None
```

- [ ] **Step 3: Run test to verify it fails**

Run: `cd backend && ./venv/Scripts/python.exe -m pytest tests/test_vision_config.py -v`
Expected: FAIL — `zone_map.py` still reads the hardcoded `ZONE_BOUNDS_FULL`.

- [ ] **Step 4: Rewire `zone_map.py`**

Modify `backend/vision/zone_map.py`. Replace the whole file body below the module docstring and `ZoneBounds` dataclass (keep `ZoneBounds`, `VIDEO_WIDTH`, `VIDEO_HEIGHT` — those stay as fallback constants) — delete `ZONE_BOUNDS`, `ZONE_BOUNDS_FULL`, and rewrite `point_to_zone`:
```python
from config.store import config_store


def point_to_zone(cx: float, cy: float) -> Optional[str]:
    """Return zone_id for a person centroid (cx, cy). Last matching zone wins (most specific)."""
    result = None
    for zone in config_store.get().zones:
        b = zone.bounds
        if b is None:
            continue
        if b.x1 <= cx < b.x2 and b.y1 <= cy < b.y2:
            result = zone.id
    return result
```
(Keep the existing `from dataclasses import dataclass` / `from typing import Optional` imports and the `ZoneBounds` dataclass at the top of the file — note this is the *existing* `zone_map.ZoneBounds` dataclass, distinct from `config.schema.ZoneBounds` [a Pydantic model]; `point_to_zone` now reads the Pydantic one via `config_store`, so the dataclass in `zone_map.py` becomes dead and should be deleted along with `VIDEO_WIDTH`/`VIDEO_HEIGHT` if nothing else in the codebase imports them — grep first: `grep -rn "zone_map import" backend/` and `grep -rn "VIDEO_WIDTH\|VIDEO_HEIGHT" backend/` before deleting, keep whatever still has a caller.)

- [ ] **Step 5: Rewire `video_pipeline.py`'s geometry with a fallback**

Modify `backend/vision/video_pipeline.py`. In `VideoPipeline.__init__`, after `self._active_zones = ... ; self._passive_zones = ...`, add a step that overlays any configured `bounds`/`camera_area_m2` on top of the hardcoded defaults:
```python
        config = config_store.get()
        self._active_zones = [
            {
                **z,
                "x1": (cfg_zone.bounds.x1 if cfg_zone and cfg_zone.bounds else z["x1"]),
                "y1": (cfg_zone.bounds.y1 if cfg_zone and cfg_zone.bounds else z["y1"]),
                "x2": (cfg_zone.bounds.x2 if cfg_zone and cfg_zone.bounds else z["x2"]),
                "y2": (cfg_zone.bounds.y2 if cfg_zone and cfg_zone.bounds else z["y2"]),
                "area_m2": (cfg_zone.camera_area_m2 if cfg_zone and cfg_zone.camera_area_m2 else z["area_m2"]),
            }
            for z in self._active_zones
            for cfg_zone in [config.zone_by_id(z["id"])]
        ]
```
(placed immediately after the existing `self._active_zones = _SINGLE_ACTIVE_ZONES if single_zone else _ACTIVE_ZONES` / `self._passive_zones = ...` lines, before `self.video_path = video_path`). Add `from config.store import config_store` to the imports at the top of the file (it isn't there yet in Phase 1 — Task 7 imported it into `_make_state` at module scope already, so this is likely already present; verify and skip if so).

This means: until a zone is calibrated (`bounds is None`, `camera_area_m2 is None`), `VideoPipeline` behaves exactly as it does today (falls through to the hardcoded `z["x1"]` etc.); once calibrated via Task 18's UI, the configured values take over.

- [ ] **Step 6: Run test to verify it passes**

Run: `cd backend && ./venv/Scripts/python.exe -m pytest tests/ -v`
Expected: all pass, including the two new `zone_map` tests.

- [ ] **Step 7: Commit**

```bash
git add backend/vision/zone_map.py backend/vision/video_pipeline.py backend/config/defaults.py backend/tests/test_vision_config.py
git commit -m "feat(config): unify zone pixel geometry into ZoneConfig.bounds/camera_area_m2"
```

---

### Task 17: `ZoneCalibrator` canvas component

**Files:**
- Create: `frontend/components/settings/ZoneCalibrator.tsx`

**Interfaces:**
- Consumes: `GET /config/calibration-frame` (Task 15), `useStationConfig()` (Task 9)
- Produces: `ZoneCalibrator({ zoneId, onClose }: { zoneId: string; onClose: () => void })` — draws the calibration frame, overlays the zone's current rectangle (or lets the user drag out a new one if `bounds` is `null`), and on save calls `PUT /config` with the updated `bounds` for that zone only.

- [ ] **Step 1: Write the calibrator**

Create `frontend/components/settings/ZoneCalibrator.tsx`:
```tsx
"use client";
import { useEffect, useRef, useState } from "react";
import { useStationConfig } from "@/lib/config-context";
import { API_URL } from "@/lib/constants";
import type { ZoneBounds } from "@/lib/types";

export default function ZoneCalibrator({ zoneId, onClose }: { zoneId: string; onClose: () => void }) {
  const { config, refresh } = useStationConfig();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [frame, setFrame] = useState<HTMLImageElement | null>(null);
  const [rect, setRect] = useState<ZoneBounds | null>(
    config?.zones.find((z) => z.id === zoneId)?.bounds ?? null
  );
  const [dragStart, setDragStart] = useState<{ x: number; y: number } | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch(`${API_URL}/config/calibration-frame`)
      .then((r) => r.json())
      .then((data) => {
        if (!data.image_base64) { setError(data.detail ?? "Could not load frame"); return; }
        const img = new Image();
        img.onload = () => setFrame(img);
        img.src = `data:image/jpeg;base64,${data.image_base64}`;
      });
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !frame) return;
    canvas.width = frame.width;
    canvas.height = frame.height;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.drawImage(frame, 0, 0);
    if (rect) {
      ctx.strokeStyle = "#29FF8C";
      ctx.lineWidth = 2;
      ctx.strokeRect(rect.x1, rect.y1, rect.x2 - rect.x1, rect.y2 - rect.y1);
    }
  }, [frame, rect]);

  function toCanvasCoords(e: React.MouseEvent<HTMLCanvasElement>) {
    const canvas = canvasRef.current!;
    const scale = canvas.width / canvas.getBoundingClientRect().width;
    const bounds = canvas.getBoundingClientRect();
    return {
      x: Math.round((e.clientX - bounds.left) * scale),
      y: Math.round((e.clientY - bounds.top) * scale),
    };
  }

  function onMouseDown(e: React.MouseEvent<HTMLCanvasElement>) {
    setDragStart(toCanvasCoords(e));
  }
  function onMouseMove(e: React.MouseEvent<HTMLCanvasElement>) {
    if (!dragStart) return;
    const p = toCanvasCoords(e);
    setRect({
      x1: Math.min(dragStart.x, p.x), y1: Math.min(dragStart.y, p.y),
      x2: Math.max(dragStart.x, p.x), y2: Math.max(dragStart.y, p.y),
    });
  }
  function onMouseUp() {
    setDragStart(null);
  }

  async function save() {
    if (!rect || !config) return;
    setError(null);
    const zones = config.zones.map((z) => (z.id === zoneId ? { ...z, bounds: rect } : z));
    const res = await fetch(`${API_URL}/config`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...config, zones }),
    });
    if (!res.ok) {
      const body = await res.json().catch(() => null);
      setError(body?.detail ? JSON.stringify(body.detail) : `Save failed (${res.status})`);
      return;
    }
    await refresh();
    onClose();
  }

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.85)", zIndex: 50, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 12 }}>
      <p style={{ color: "var(--text-dim, #94A3B8)", fontSize: 12 }}>
        Drag a rectangle over the frame for zone <strong>{zoneId}</strong>.
      </p>
      {!frame && !error && <p style={{ color: "var(--text-faint)" }}>Loading calibration frame…</p>}
      {error && <p style={{ color: "var(--red, #FF3B3B)" }}>{error}</p>}
      {frame && (
        <canvas
          ref={canvasRef}
          onMouseDown={onMouseDown}
          onMouseMove={onMouseMove}
          onMouseUp={onMouseUp}
          style={{ maxWidth: "80vw", maxHeight: "70vh", cursor: "crosshair", border: "1px solid var(--hair, #21262D)" }}
        />
      )}
      <div style={{ display: "flex", gap: 8 }}>
        <button onClick={save} disabled={!rect} style={{ padding: "8px 14px", background: "var(--sweep, #29FF8C)", color: "#04070A", border: "none", fontWeight: 700, cursor: rect ? "pointer" : "not-allowed", opacity: rect ? 1 : 0.5 }}>
          SAVE BOUNDARY
        </button>
        <button onClick={onClose} style={{ padding: "8px 14px", background: "none", border: "1px solid var(--hair, #21262D)", color: "var(--text-dim, #94A3B8)", cursor: "pointer" }}>
          CANCEL
        </button>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Manual verification**

Run: `cd frontend && npm run build`
Expected: succeeds (confirms `ZoneBounds` type from Task 9 matches usage here).

- [ ] **Step 3: Commit**

```bash
git add frontend/components/settings/ZoneCalibrator.tsx
git commit -m "feat(config): add drag-to-draw zone boundary calibration canvas"
```

---

### Task 18: Wire "Calibrate boundaries" into the Zones tab + Phase 2 regression checkpoint

**Files:**
- Modify: `frontend/components/settings/ZonesTab.tsx`

**Interfaces:**
- Consumes: `ZoneCalibrator` (Task 17)

- [ ] **Step 1: Add the calibrate button and modal mount**

Modify `frontend/components/settings/ZonesTab.tsx`. Add the import `import ZoneCalibrator from "./ZoneCalibrator";` and state `const [calibrating, setCalibrating] = useState<string | null>(null);` inside `ZonesTab`. Replace the "Not calibrated…" hint block with a button:
```tsx
          <button
            onClick={() => setCalibrating(z.id)}
            style={{ fontSize: 10, alignSelf: "flex-start", background: "none", border: "1px solid var(--hair, #21262D)", color: "var(--sweep, #29FF8C)", cursor: "pointer", padding: "4px 8px" }}
          >
            {z.bounds ? "RECALIBRATE BOUNDARIES" : "CALIBRATE BOUNDARIES"}
          </button>
```
At the end of the component's returned JSX (as a sibling, so it overlays), add:
```tsx
      {calibrating && (
        <ZoneCalibrator zoneId={calibrating} onClose={() => setCalibrating(null)} />
      )}
```

- [ ] **Step 2: Phase 2 regression checkpoint**

Run backend + frontend dev servers as in Task 14 Step 4. In the browser: switch to live-video mode (`platform` or `aerial` source), open Settings → Zones → Calibrate boundaries for `P1`, drag a rectangle over a visibly crowded region of the frame, save, and confirm `P1`'s density in the ZoneChart changes to reflect detections now landing inside the newly drawn box (compare against its value just before saving). Confirm scenario mode (unrelated to the calibrated live-video zone) still runs unaffected.

- [ ] **Step 3: Commit**

```bash
git add frontend/components/settings/ZonesTab.tsx
git commit -m "feat(config): wire zone boundary calibration into Zones tab"
```

---

## Self-Review Notes

**Spec coverage:** Thresholds (Tasks 1, 5, 6, 8, 11), Labels (Tasks 2, 5–10, 13), Categories (Tasks 1–2, 12–13), Views incl. presets (Task 14), Zone geometry calibration (Tasks 15–18), safety guardrails preserved verbatim in `engine.py` (Task 5 keeps L3-confirm and SOS-requires-PRE_WARN logic untouched — only thresholds/copy changed), `area_m2` vs `camera_area_m2` distinction honored (Tasks 6 vs. 7/16), generic fallback action text (Task 5), reset-to-defaults safety net (Tasks 3–4, 15), regression checkpoints after each phase (Tasks 8, 14, 18).

**Known Phase 1 limitation, stated explicitly (not a placeholder — a real, documented scope boundary):** a zone added via the Zones tab before Phase 2 is calibrated contributes no live-video person detections and doesn't appear in the scripted demo timeline; it does appear on the dashboard, in the decision engine, and fires generic-copy interventions once its configured threshold is crossed in scenario mode's fallback path or live mode after calibration.
