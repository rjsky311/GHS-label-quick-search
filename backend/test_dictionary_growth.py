import pytest
from httpx import ASGITransport, AsyncClient

import server
from pilot_store import PilotStore


@pytest.fixture()
def temp_store(tmp_path, monkeypatch):
    store = PilotStore(tmp_path / "dictionary-growth.db").connect()
    monkeypatch.setattr(server, "pilot_store", store)
    yield store
    store.close()


def test_manual_entry_and_approved_alias_resolve_name(temp_store):
    temp_store.upsert_dictionary_entry(
        "123-45-6",
        name_en="Custom Buffer",
        name_zh="自訂緩衝液",
    )
    temp_store.upsert_alias("Buffer X", "en", "123-45-6", status="approved")

    assert server.resolve_name_to_cas("Custom Buffer") == "123-45-6"
    assert server.resolve_name_to_cas("buffer x") == "123-45-6"
    assert server.resolve_name_to_cas("自訂緩衝液") == "123-45-6"


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
                                "丙酮",
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
    assert name_zh == "丙酮"
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
        return "Ethanol", known_zh or "乙醇"

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
