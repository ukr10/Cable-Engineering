from io import BytesIO
from openpyxl import Workbook
from main import parse_excel_cables, calculate_single_cable


def test_bulk_import_and_calculate():
    wb = Workbook()
    ws = wb.active
    headers = ['cable_number', 'description', 'load_kw', 'voltage', 'pf', 'efficiency', 'length', 'runs', 'cores']
    ws.append(headers)
    ws.append(['I-001', 'Integration Test', 100, 415, 0.9, 0.95, 50, 1, 3])
    bio = BytesIO()
    wb.save(bio)
    bio.seek(0)
    cables, errors = parse_excel_cables(bio.read())
    assert len(errors) == 0
    assert len(cables) == 1
    res = calculate_single_cable(cables[0])
    # calculate_single_cable is async in the app; use its coroutine
    import asyncio
    result = asyncio.run(res)
    assert result.flc > 0
    assert result.formulas is not None
    assert 'vd' in result.formulas


def test_catalog_resistance_and_reactance_used():
    # Add a temporary catalog with known R and X
    cat = [{ 'size_mm2': 50, 'ampacity_air': 125, 'resistance_per_m': 0.000387, 'reactance_per_m': 0.0001, 'cores': 3 }]
    from main import CATALOG_STORE, calculate_single_cable, CableInput
    CATALOG_STORE['tmpcat'] = cat
    cable = CableInput(cable_number='CT-1', load_kw=100, voltage=415, pf=0.9, efficiency=0.95, length=100, runs=1)
    import asyncio
    res = asyncio.run(calculate_single_cable(cable, catalog_name='tmpcat'))
    assert res.resistance_per_m == 0.000387
    assert res.formulas is not None
    assert 'vd' in res.formulas