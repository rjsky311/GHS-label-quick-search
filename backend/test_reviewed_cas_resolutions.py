import pytest

import server as srv
from chemical_dict import CAS_TO_EN
from reviewed_cas_resolutions import REVIEWED_CAS_RESOLUTIONS


@pytest.fixture(autouse=True)
def _clear_caches():
    srv.cid_cache.clear()
    srv.cid_candidates.clear()
    srv.ghs_cache.clear()
    yield
    srv.cid_cache.clear()
    srv.cid_candidates.clear()
    srv.ghs_cache.clear()


@pytest.mark.parametrize("cas,row", sorted(REVIEWED_CAS_RESOLUTIONS.items()))
def test_row_still_describes_the_dictionary_entry(cas, row):
    """A row goes stale if the dictionary renames the CAS; review it again then."""
    assert srv.is_valid_cas(cas)
    assert CAS_TO_EN.get(cas) == row["dictionary_name_en"]
    assert row["note"]
    assert row["reviewed_at"]


async def test_reviewed_record_wins_over_the_majority_of_records(monkeypatch):
    async def _no_network(*_a, **_k):
        raise AssertionError("a reviewed CAS should not ask PubChem for its record")

    monkeypatch.setattr(srv, "pubchem_get_json", _no_network)

    assert await srv.get_cid_from_cas("7704-34-9", None) == 5362487


async def test_reviewed_absence_shows_the_dictionary_name_and_no_hazards(monkeypatch):
    """Polyethylene must not borrow ethylene's flammable gas pictograms."""

    async def _no_network(*_a, **_k):
        raise AssertionError("a CAS reviewed as having no record should not ask PubChem")

    monkeypatch.setattr(srv, "pubchem_get_json", _no_network)

    result = await srv.search_chemical("9002-88-4", None)

    assert result.found is True
    assert result.cid is None
    assert result.name_en == "Poly(ethylene)"
    assert result.ghs_pictograms == []
    assert result.hazard_statements == []
    assert result.error
    assert result.upstream_error is False


async def test_a_reviewed_record_still_gets_its_hazards_from_pubchem(monkeypatch):
    seen = []
    payload = {"Record": {"RecordTitle": "Sulfur", "Section": []}}

    async def _fake_get_json(_client, url, **_k):
        seen.append(url)
        return 200, payload

    monkeypatch.setattr(srv, "pubchem_get_json", _fake_get_json)

    result = await srv.search_chemical("7704-34-9", None)

    assert result.cid == 5362487
    assert any("/compound/5362487/" in url for url in seen)
    assert not any("/compound/402/" in url for url in seen)
