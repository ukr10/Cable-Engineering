import asyncio
from main import calculate_single_cable, CableInput


def test_recommend_runs_and_formulas():
    # Large load to force multiple runs
    cable = CableInput(cable_number="TST-1", load_kw=2000, voltage=415, pf=0.9, efficiency=0.95, length=100, runs=1)
    result = asyncio.run(calculate_single_cable(cable, catalog_name='default', standard='IEC'))
    assert result.recommended_runs is not None
    assert result.formulas is not None
    assert 'vd' in result.formulas
    assert result.selected_size > 0


def test_select_small_conductor():
    # Small derated current should pick a single conductor
    from main import select_cable_size
    size_str, size_mm2, ampacity, res, runs, cores = select_cable_size(10, catalog_name='default', grouping=1.0, temp_factor=1.0)
    assert runs == 1 or runs is None
    assert cores is not None
    assert size_mm2 > 0
