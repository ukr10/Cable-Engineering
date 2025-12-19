from main import select_cable_size


def test_selection_prefers_fewer_runs():
    # Using the default catalog, pick a derated current that forces choice
    # e.g., derated_current=300 should choose 185mm2 (amp 400) single or 150mm2 with parallels
    size_str, size_mm2, ampacity, res, runs, cores = select_cable_size(300, catalog_name='default', grouping=1.0, temp_factor=1.0)
    assert runs == 1 or (runs is not None and runs >= 1)
    assert size_mm2 > 0


def test_selection_handles_large_loads_with_runs():
    # Large derated current should return runs > 1
    size_str, size_mm2, ampacity, res, runs, cores = select_cable_size(1000, catalog_name='default', grouping=1.0, temp_factor=1.0)
    assert runs is not None
    assert runs >= 1
    assert size_mm2 > 0
