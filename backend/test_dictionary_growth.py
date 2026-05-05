import pytest
from httpx import ASGITransport, AsyncClient

import server
from pilot_store import PilotStore

ADMIN_HEADERS = {"x-ghs-admin-key": "test-admin"}


@pytest.fixture()
def temp_store(tmp_path, monkeypatch):
    store = PilotStore(tmp_path / "dictionary-growth.db").connect()
    monkeypatch.setattr(server, "pilot_store", store)
    monkeypatch.setattr(server, "ADMIN_API_TOKEN", "test-admin")
    monkeypatch.setattr(server, "CAPTURE_DICTIONARY_MISSES", True)
    yield store
    store.close()


def test_manual_entry_and_approved_alias_resolve_name(temp_store):
    temp_store.upsert_dictionary_entry(
        "123-45-6",
        name_en="Custom Buffer",
        name_zh="Custom Buffer ZH",
    )
    temp_store.upsert_alias("Buffer X", "en", "123-45-6", status="approved")

    assert server.resolve_name_to_cas("Custom Buffer") == "123-45-6"
    assert server.resolve_name_to_cas("buffer x") == "123-45-6"
    assert server.resolve_name_to_cas("Custom Buffer ZH") == "123-45-6"


async def test_search_by_name_logs_autocomplete_miss(temp_store):
    transport = ASGITransport(app=server.app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        response = await ac.get("/api/search-by-name/qqqqnotfound")

    assert response.status_code == 200
    payload = response.json()
    assert payload["results"] == []

    misses = temp_store.list_miss_queries(limit=5)
    assert misses[0]["endpoint"] == "search_by_name"
    assert misses[0]["query_text"] == "qqqqnotfound"


async def test_get_compound_name_captures_pending_alias_candidates(monkeypatch, temp_store):
    async def fake_pubchem_get_json(_http_client, url, **_kwargs):
        if "property/IUPACName,Title" in url:
            return 200, {
                "PropertyTable": {
                    "Properties": [{"Title": "Acetone"}]
                }
            }
        if "synonyms/JSON" in url:
            return 200, {
                "InformationList": {
                    "Information": [
                        {
                            "Synonym": [
                                "Acetone",
                                "Dimethyl ketone",
                                "Acetone Alias",
                            ]
                        }
                    ]
                }
            }
        if "description/JSON" in url:
            return 200, {"InformationList": {"Information": []}}
        return 404, None

    monkeypatch.setattr(server, "pubchem_get_json", fake_pubchem_get_json)

    name_en, name_zh = await server.get_compound_name(
        180,
        http_client=None,
        cas_number="67-64-1",
    )

    assert name_en == "Acetone"
    assert name_zh
    pending_aliases = temp_store.list_aliases(status="pending")
    assert any(alias["alias_text"] == "Dimethyl ketone" for alias in pending_aliases)


async def test_search_chemical_merges_manual_reference_links(monkeypatch, temp_store):
    temp_store.upsert_reference_link(
        "64-17-5",
        label="Internal SDS",
        url="https://lab.example/sds/64-17-5",
        link_type="sds",
        priority=1,
    )

    async def fake_get_cid_from_cas(_cas_number, _http_client):
        return 702

    async def fake_get_compound_name(_cid, _http_client, known_zh=None, cas_number=None):
        return "Ethanol", known_zh or "Ethanol ZH"

    async def fake_get_ghs_classification(_cid, _http_client):
        return {}, False, "2026-04-18T00:00:00+00:00"

    monkeypatch.setattr(server, "get_cid_from_cas", fake_get_cid_from_cas)
    monkeypatch.setattr(server, "get_compound_name", fake_get_compound_name)
    monkeypatch.setattr(server, "get_ghs_classification", fake_get_ghs_classification)

    result = await server.search_chemical("64-17-5", http_client=None)

    assert result.found is True
    assert result.reference_links[0]["label"] == "Internal SDS"
    assert any(link["label"] == "ECHA Substance Search" for link in result.reference_links)
    assert any(link["label"] == "NIOSH Pocket Guide" for link in result.reference_links)


async def test_dictionary_admin_endpoints_roundtrip(temp_store):
    transport = ASGITransport(app=server.app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        response = await ac.post(
            "/api/dictionary/manual-entries",
            json={
                "cas_number": "321-54-7",
                "name_en": "Pilot Solvent",
                "name_zh": "Pilot Solvent ZH",
                "notes": "seeded from admin panel",
            },
            headers=ADMIN_HEADERS,
        )
        assert response.status_code == 200
        assert response.json()["record"]["cas_number"] == "321-54-7"

        response = await ac.post(
            "/api/dictionary/aliases",
            json={
                "alias_text": "pilot solvent x",
                "locale": "en",
                "cas_number": "321-54-7",
                "status": "approved",
            },
            headers=ADMIN_HEADERS,
        )
        assert response.status_code == 200
        assert response.json()["record"]["cas_number"] == "321-54-7"

        response = await ac.post(
            "/api/dictionary/reference-links",
            json={
                "cas_number": "321-54-7",
                "label": "Vendor SDS",
                "url": "https://vendor.example/sds",
                "link_type": "sds",
                "priority": 5,
            },
            headers=ADMIN_HEADERS,
        )
        assert response.status_code == 200
        assert response.json()["record"]["label"] == "Vendor SDS"

        entries = await ac.get("/api/dictionary/manual-entries", headers=ADMIN_HEADERS)
        aliases = await ac.get("/api/dictionary/aliases?status=approved", headers=ADMIN_HEADERS)
        links = await ac.get(
            "/api/dictionary/reference-links?cas_number=321-54-7",
            headers=ADMIN_HEADERS,
        )

    assert entries.status_code == 200
    assert any(item["cas_number"] == "321-54-7" for item in entries.json()["items"])
    assert aliases.status_code == 200
    assert any(item["alias_text"] == "pilot solvent x" for item in aliases.json()["items"])
    assert links.status_code == 200
    assert links.json()["items"][0]["label"] == "Vendor SDS"


async def test_dictionary_admin_endpoints_require_admin_key(temp_store):
    transport = ASGITransport(app=server.app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        missing = await ac.get("/api/dictionary/manual-entries")
        denied = await ac.get(
            "/api/dictionary/manual-entries",
            headers={"x-ghs-admin-key": "wrong-key"},
        )

    assert missing.status_code == 401
    assert denied.status_code == 403


async def test_workspace_endpoints_support_print_persistence_docs(temp_store):
    recent_job = {
        "schemaVersion": 1,
        "id": "print-1",
        "createdAt": "2026-04-18T00:00:00+00:00",
        "items": [
            {
                "cas_number": "64-17-5",
                "name_en": "Ethanol",
                "name_zh": "Ethanol",
                "cid": 702,
                "found": True,
                "signal_word": "Warning",
                "signal_word_zh": "Warning",
                "ghs_pictograms": [],
                "hazard_statements": [],
                "precautionary_statements": [],
                "customNote": "",
                "isPreparedSolution": False,
            }
        ],
        "labelConfig": {
            "template": "standard",
            "size": "medium",
            "orientation": "portrait",
        },
        "customLabelFields": {
            "date": "2026-04-18",
            "batchNumber": "B-1",
        },
        "labProfile": {
            "organization": "Materials Lab",
            "phone": "02-1234",
            "address": "Taipei",
        },
        "labelQuantities": {
            "64-17-5": 1,
        },
        "totalChemicals": 1,
        "totalLabels": 1,
    }
    custom_fields = {
        "date": "2026-04-18",
        "batchNumber": "B-1",
    }

    transport = ASGITransport(app=server.app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        recent_put = await ac.put(
            "/api/workspace/print_recents",
            json={"payload": [recent_job]},
            headers=ADMIN_HEADERS,
        )
        fields_put = await ac.put(
            "/api/workspace/print_custom_label_fields",
            json={"payload": custom_fields},
            headers=ADMIN_HEADERS,
        )
        recent_get = await ac.get("/api/workspace/print_recents", headers=ADMIN_HEADERS)
        fields_get = await ac.get(
            "/api/workspace/print_custom_label_fields",
            headers=ADMIN_HEADERS,
        )

    assert recent_put.status_code == 200
    assert recent_put.json()["payload"][0]["id"] == "print-1"
    assert fields_put.status_code == 200
    assert fields_put.json()["payload"]["batchNumber"] == "B-1"
    assert recent_get.status_code == 200
    assert recent_get.json()["payload"][0]["items"][0]["cas_number"] == "64-17-5"
    assert fields_get.status_code == 200
    assert fields_get.json()["payload"]["date"] == "2026-04-18"
