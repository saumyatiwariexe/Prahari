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
    # l2_trigger must stay >= l1_trigger per ThresholdConfig.check_ordering (Task 2),
    # so it's raised too — the test only asserts on L1 firing, so this is neutral.
    raised.thresholds.l2_trigger = 25.0
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
    engine.evaluate({"FOB1": {"density": 6.5}}, {})

    # countdown_remaining tracks elapsed time since staging, capped at the
    # configured seconds (see evaluate()'s finalize loop) — right after staging,
    # elapsed is ~0 regardless of the cap, so that instant can't distinguish a
    # configured cap of 3 from the old hardcoded default of 10. Advance the
    # recorded staged_at to simulate 5 elapsed seconds (> configured cap of 3,
    # < old hardcoded default of 10) and re-run evaluate() so the real capping
    # logic executes against genuinely elapsed time: a config-driven cap of 3
    # caps the result at 3, while a hardcoded cap of 10 would leave it at 5.
    engine._staged["FOB1_L2"]["staged_at"] -= 5
    engine.evaluate({}, {})

    l2 = [iv for iv in engine.get_staged() if iv.level.name == "L2"]
    assert l2[0].countdown_remaining == 3
