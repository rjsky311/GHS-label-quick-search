"""Hydrogen chloride vs. hydrochloric acid, ammonia vs. ammonia water,
formaldehyde vs. formalin: names and scope notes.

PubChem's GHS data for CAS 7647-01-0 is the hydrogen chloride
classification, which includes the gas (GHS04). The app used to call it
"鹽酸 / Hydrochloric acid", so a bottle of the aqueous acid got a gas
cylinder pictogram under the acid's name.
"""

from httpx import ASGITransport, AsyncClient

import server as srv
from api_models import ChemicalResult
from chemical_dict import CAS_TO_EN, CAS_TO_ZH, EN_TO_CAS, ZH_TO_CAS
from substance_scope_notes import SUBSTANCE_SCOPE_NOTES, get_substance_scope_notes


def _hcl_ghs_data():
    """PubChem-shaped GHS payload: the hydrogen chloride classification."""
    return {
        "Record": {
            "RecordTitle": "Hydrochloric Acid",
            "Section": [{
                "TOCHeading": "Safety and Hazards",
                "Section": [{
                    "TOCHeading": "Hazards Identification",
                    "Section": [{
                        "TOCHeading": "GHS Classification",
                        "Information": [
                            {
                                "Name": "Pictogram(s)",
                                "Value": {"StringWithMarkup": [{"Markup": [
                                    {"Type": "Icon", "URL": f"https://example.com/{code}.svg"}
                                    for code in ("GHS04", "GHS05", "GHS06", "GHS07")
                                ]}]},
                            },
                            {"Name": "Signal", "Value": {"StringWithMarkup": [{"String": "Danger"}]}},
                            {
                                "Name": "GHS Hazard Statements",
                                "Value": {"StringWithMarkup": [
                                    {"String": "H280: Contains gas under pressure; may explode if heated"},
                                    {"String": "H314: Causes severe skin burns and eye damage"},
                                    {"String": "H331: Toxic if inhaled"},
                                ]},
                            },
                        ],
                    }],
                }],
            }],
        }
    }


class _NullClient:
    async def get(self, *_a, **_k):  # pragma: no cover - must not be called
        raise RuntimeError("http should not be called")


def test_7647_01_0_is_named_hydrogen_chloride():
    assert CAS_TO_EN["7647-01-0"] == "Hydrogen chloride"
    assert CAS_TO_ZH["7647-01-0"] == "氯化氫"


def test_hydrochloric_acid_names_still_find_7647_01_0():
    assert ZH_TO_CAS["鹽酸"] == "7647-01-0"
    assert ZH_TO_CAS["氯化氫"] == "7647-01-0"
    assert EN_TO_CAS["hydrochloric acid"] == "7647-01-0"
    assert EN_TO_CAS["hydrogen chloride"] == "7647-01-0"
    assert srv.resolve_name_to_cas("鹽酸") == "7647-01-0"
    assert srv.resolve_name_to_cas("Hydrochloric acid") == "7647-01-0"


def test_ammonia_entry_no_longer_says_ammonia_water():
    assert CAS_TO_ZH["7664-41-7"] == "氨"
    assert "氨水" not in CAS_TO_ZH["7664-41-7"]
    assert ZH_TO_CAS["氨水"] == "1336-21-6"


def test_hydrogen_chloride_note_states_scope_solution_label_and_sources():
    [note] = get_substance_scope_notes("7647-01-0")
    assert "hydrogen chloride" in note["text_en"].lower()
    assert "gas" in note["text_en"]
    for fragment in ("GHS05", "GHS07", "H290", "H314", "H335", "SDS"):
        assert fragment in note["text_en"]
        assert fragment in note["text_zh"]
    assert "氯化氫" in note["text_zh"] and "鹽酸" in note["text_zh"]
    # Non-PubChem wording must cite where it comes from.
    assert "017-002-01-X" in note["source"]
    assert "supplier SDS" in note["source"]


def test_every_scope_note_carries_bilingual_text_and_a_source():
    for cas_number, notes in SUBSTANCE_SCOPE_NOTES.items():
        assert notes, cas_number
        for note in notes:
            assert note["code"] and note["text_en"] and note["text_zh"], cas_number
            assert note["source"], cas_number


def test_chemical_result_attaches_notes_without_changing_ghs_data():
    result = ChemicalResult(
        cas_number="7647-01-0",
        found=True,
        ghs_pictograms=[{"code": "GHS04"}, {"code": "GHS05"}],
        hazard_statements=[{"code": "H280", "text_en": "gas"}],
        signal_word="Danger",
    )
    assert [note["code"] for note in result.substance_notes] == [
        "hydrogen-chloride-includes-gas"
    ]
    assert [p["code"] for p in result.ghs_pictograms] == ["GHS04", "GHS05"]
    assert [h["code"] for h in result.hazard_statements] == ["H280"]
    assert result.signal_word == "Danger"


def test_chemical_result_has_no_notes_for_ordinary_cas_and_notes_are_copies():
    assert ChemicalResult(cas_number="64-17-5", found=True).substance_notes == []
    first = ChemicalResult(cas_number="7647-01-0").substance_notes
    first[0]["text_en"] = "changed"
    assert get_substance_scope_notes("7647-01-0")[0]["text_en"] != "changed"


def test_upstream_error_result_still_carries_the_note():
    result = ChemicalResult(cas_number="7647-01-0", found=False, upstream_error=True)
    assert result.substance_notes


def test_formalin_alias_and_note():
    assert ZH_TO_CAS["福馬林"] == "50-00-0"
    assert EN_TO_CAS["formalin"] == "50-00-0"
    [note] = get_substance_scope_notes("50-00-0")
    assert "methanol" in note["text_en"]
    assert "甲醇" in note["text_zh"]


async def test_search_for_7647_01_0_names_hydrogen_chloride_and_keeps_pubchem_pictograms(monkeypatch):
    async def fake_get_cid(*_args, **_kwargs):
        return 313

    async def fake_get_ghs(*_args, **_kwargs):
        return (_hcl_ghs_data(), False, "2026-11-04T00:00:00+00:00")

    async def fail_get_name(*_args, **_kwargs):  # pragma: no cover
        raise AssertionError("dictionary has both names; no PubChem name call")

    monkeypatch.setattr(srv, "get_cid_from_cas", fake_get_cid)
    monkeypatch.setattr(srv, "get_ghs_classification", fake_get_ghs)
    monkeypatch.setattr(srv, "get_compound_name", fail_get_name)

    result = await srv.search_chemical("7647-01-0", _NullClient())

    assert result.found is True
    assert result.name_en == "Hydrogen chloride"
    assert result.name_zh == "氯化氫"
    # The PubChem classification is shown as-is: nothing hidden or swapped.
    assert [p["code"] for p in result.ghs_pictograms] == [
        "GHS04",
        "GHS05",
        "GHS06",
        "GHS07",
    ]
    assert [note["code"] for note in result.substance_notes] == [
        "hydrogen-chloride-includes-gas"
    ]


async def test_search_single_for_hydrochloric_acid_returns_the_scope_note(monkeypatch):
    async def fake_search_chemical(cas_number, _http_client):
        return srv.ChemicalResult(
            cas_number=cas_number,
            found=True,
            name_en=CAS_TO_EN.get(cas_number),
            name_zh=CAS_TO_ZH.get(cas_number),
        )

    monkeypatch.setattr(srv, "search_chemical", fake_search_chemical)

    transport = ASGITransport(app=srv.app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        for query in ("hydrochloric acid", "鹽酸"):
            response = await ac.get("/api/search-single", params={"q": query})
            assert response.status_code == 200
            body = response.json()
            assert body["cas_number"] == "7647-01-0"
            assert body["name_en"] == "Hydrogen chloride"
            assert body["name_zh"] == "氯化氫"
            assert body["substance_notes"][0]["code"] == "hydrogen-chloride-includes-gas"


def test_agent_label_summary_flags_the_scope_note():
    from agent_label_summary import build_agent_label_summary_v0

    payload = build_agent_label_summary_v0(
        ChemicalResult(
            cas_number="7647-01-0",
            name_en="Hydrogen chloride",
            name_zh="氯化氫",
            found=True,
            ghs_pictograms=[{"code": "GHS04"}],
        )
    ).model_dump()
    assert "substance_scope_note" in payload["review_flags"]
    assert payload["substance_notes"][0]["code"] == "hydrogen-chloride-includes-gas"
    assert "017-002-01-X" in payload["substance_notes"][0]["source"]

    ordinary = build_agent_label_summary_v0(
        ChemicalResult(cas_number="64-17-5", name_en="Ethanol", name_zh="乙醇", found=True)
    ).model_dump()
    assert "substance_scope_note" not in ordinary["review_flags"]
    assert ordinary["substance_notes"] == []
