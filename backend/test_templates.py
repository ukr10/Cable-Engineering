import io
from starlette.testclient import TestClient
from main import app


client = TestClient(app)


def test_catalog_template_download():
    r = client.get('/api/v1/catalogs/template')
    assert r.status_code == 200
    assert 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' in r.headers.get('content-type', '')


def test_import_template_download():
    r = client.get('/api/v1/import/template')
    assert r.status_code == 200
    assert 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' in r.headers.get('content-type', '')
