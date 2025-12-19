import asyncio
from main import download_catalog_template, download_import_template


def test_catalog_template_download():
    resp = asyncio.run(download_catalog_template())
    assert hasattr(resp, 'media_type')
    mt = getattr(resp, 'media_type')
    assert mt and mt.startswith('application/vnd.openxmlformats')
    # ensure content-disposition exists
    assert 'Content-Disposition' in getattr(resp, 'headers')


def test_import_template_download():
    resp = asyncio.run(download_import_template())
    assert hasattr(resp, 'media_type')
    mt = getattr(resp, 'media_type')
    assert mt and mt.startswith('application/vnd.openxmlformats')
    assert 'Content-Disposition' in getattr(resp, 'headers')
