from openpyxl import Workbook
from main import parse_catalog_excel


def test_parse_catalog_with_pairs_and_materials():
    wb = Workbook()
    ws = wb.active
    ws.append(['size_mm2', 'cores', 'ampacity_air', 'resistance_ohm_per_km', 'pairs', 'paralleled_count', 'conductor_material', 'insulation', 'sheath', 'formation'])
    ws.append([25, 3, 80, 0.727, 1, None, 'Cu', 'XLPE', 'PVC', '3C'])
    bio = None
    from io import BytesIO
    bio = BytesIO()
    wb.save(bio)
    bio.seek(0)
    catalog, errors = parse_catalog_excel(bio.read())
    assert len(errors) == 0
    assert len(catalog) == 1
    entry = catalog[0]
    assert entry.get('size_mm2') == 25
    assert entry.get('pairs') == 1
    assert entry.get('conductor_material') == 'Cu'
    assert entry.get('insulation') == 'XLPE'