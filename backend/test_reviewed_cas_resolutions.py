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


def _ghs_record(record_number):
    """Sodium chloride's shape: a dye's CLP report beside the salt's own ECHA report."""

    def report(reference, pictogram, statement):
        return [
            {
                "Name": "Pictogram(s)",
                "ReferenceNumber": reference,
                "Value": {
                    "StringWithMarkup": [
                        {"String": " ", "Markup": [{"Type": "Icon", "URL": f"https://x/{pictogram}.svg"}]}
                    ]
                },
            },
            {
                "Name": "GHS Hazard Statements",
                "ReferenceNumber": reference,
                "Value": {"StringWithMarkup": [{"String": statement}]},
            },
        ]

    return {
        "Record": {
            "RecordNumber": record_number,
            "Reference": [
                {"ReferenceNumber": 97, "Name": "product-by-process definition polyazodyestuff obtained by coupling..."},
                {"ReferenceNumber": 52, "Name": "Sodium chloride (EC: 231-598-3)"},
            ],
            "Section": [
                {
                    "TOCHeading": "Safety and Hazards",
                    "Section": [
                        {
                            "TOCHeading": "Hazards Identification",
                            "Section": [
                                {
                                    "TOCHeading": "GHS Classification",
                                    "Information": [
                                        *report(97, "GHS05", "H318: Causes serious eye damage"),
                                        *report(52, "GHS07", "H319 (10.8%): Causes serious eye irritation"),
                                    ],
                                }
                            ],
                        }
                    ],
                }
            ],
        }
    }


def _codes(reports):
    return [[item["code"] for item in report["hazard_statements"]] for report in reports]


def test_the_site_does_not_offer_a_report_about_another_substance():
    reports = srv.extract_all_ghs_classifications(_ghs_record(5234))

    assert _codes(reports) == [["H319"]]
    assert [pictogram["code"] for pictogram in reports[0]["pictograms"]] == ["GHS07"]


def test_the_same_report_name_stays_on_any_other_record():
    assert _codes(srv.extract_all_ghs_classifications(_ghs_record(1))) == [["H318"], ["H319"]]

