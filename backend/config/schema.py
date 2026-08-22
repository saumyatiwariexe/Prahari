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
