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
    # ThresholdConfig validates ordering eagerly (on construction, via its
    # model_validator — see test_config_schema.py's convention), so the
    # ValidationError fires while building StationConfigInput itself, before
    # store.update() is ever called. Both are wrapped so the test verifies
    # what it claims: invalid threshold ordering never makes it into the store.
    with pytest.raises(ValidationError):
        bad_input = StationConfigInput(
            **{**original.model_dump(exclude={"version"}),
               "thresholds": {**original.thresholds.model_dump(), "density_safe": 99.0}},
        )
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
