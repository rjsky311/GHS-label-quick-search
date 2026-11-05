import dictionary_resolution_audit as audit
from chemical_dict import CAS_TO_EN
from dictionary_audit_reviewed import COMMON_REAGENTS, REVIEWED_AUDIT_ROWS


def _row(**fields):
    row = {
        "cas": "64-19-7",
        "name_en": "Acetic acid",
        "cid": 176,
        "title": "Acetic Acid",
        "pictograms": ["GHS02", "GHS05"],
        "hazards": ["H226", "H314"],
        "synonyms": ["Acetic acid", "64-19-7", "ethanoic acid", "EC 200-580-7"],
        "reports": [{"source": "ECHA", "name": "Acetic acid (EC: 200-580-7)", "codes": ["H226", "H314"]}],
    }
    row.update(fields)
    return row


def test_every_cas_a_name_can_lead_to_is_audited():
    cases = audit.dictionary_cas_numbers()
    assert set(CAS_TO_EN) <= set(cases)
    # Only the alias tables lead to these. The first full run missed them.
    assert {"75-09-2", "7664-39-3", "50-00-0"} <= set(cases)


def test_hazard_reports_reads_only_the_ghs_section():
    payload = {
        "Record": {
            "Reference": [
                {"ReferenceNumber": 1, "SourceName": "ECHA", "Name": "Acetic acid (EC: 200-580-7)"},
                {"ReferenceNumber": 2, "SourceName": "Other", "Name": "Not a hazard report"},
            ],
            "Section": [
                {
                    "TOCHeading": "Safety and Hazards",
                    "Section": [
                        {
                            "TOCHeading": "GHS Classification",
                            "Information": [
                                {"Name": "Pictogram(s)", "ReferenceNumber": 2},
                                {
                                    "Name": "GHS Hazard Statements",
                                    "ReferenceNumber": 1,
                                    "Value": {
                                        "StringWithMarkup": [
                                            {"String": "H226 (99%): Flammable"},
                                            {"String": "H314: Burns"},
                                        ]
                                    },
                                },
                            ],
                        },
                        {
                            "TOCHeading": "Something else",
                            "Information": [{"Name": "GHS Hazard Statements", "ReferenceNumber": 2}],
                        },
                    ],
                }
            ],
        }
    }

    assert audit.hazard_reports(payload) == [
        {"source": "ECHA", "name": "Acetic acid (EC: 200-580-7)", "codes": ["H226", "H314"]}
    ]
    assert audit.hazard_reports({}) == []


def test_main_report_is_found_by_its_hazard_codes():
    reports = [
        {"source": "CLP", "name": "first", "codes": ["H318"]},
        {"source": "ECHA", "name": "second", "codes": ["H319"]},
    ]

    assert audit.main_report_names(reports, ["H319"]) == ["second"]
    assert audit.main_report_names(reports, ["H400"]) == ["first", "second"]


def test_a_report_is_on_record_by_ec_number_or_name():
    synonyms = ["Ethylene glycol", "EC 203-473-3", "ethanediol"]

    assert audit.report_is_on_record("Ethane-1,2-diol (EC: 203-473-3)", synonyms, "Ethylene Glycol")
    assert audit.report_is_on_record("ethanediol; not a listed name", synonyms, None)
    assert audit.report_is_on_record("Ethylene glycol - FY2014 (Revised classification)", synonyms, None)
    assert audit.report_is_on_record("ethylene glycol … %", synonyms, None)
    assert audit.report_is_on_record(None, synonyms, None)
    assert not audit.report_is_on_record("Oxidase, glucose (EC: 232-601-0)", synonyms, "Ethylene Glycol")


def test_clean_row_needs_nobody():
    assert audit.review_reasons(_row()) == []


def test_record_that_does_not_list_the_cas_needs_a_person():
    """Activated carbon on the methane record."""
    reasons = audit.review_reasons(_row(cas="7440-44-0", cid=297, title="Methane"))

    assert len(reasons) == 1
    assert "does not list this CAS" in reasons[0]


def test_main_report_about_another_substance_needs_a_person():
    """Glucose oxidase's H334 on D-glucose."""
    reasons = audit.review_reasons(
        _row(
            hazards=["H334"],
            reports=[
                {"source": "ECHA", "name": "Acetic acid (EC: 200-580-7)", "codes": ["H226", "H314"]},
                {"source": "ECHA", "name": "Oxidase, glucose (EC: 232-601-0)", "codes": ["H334"]},
            ],
        )
    )

    assert len(reasons) == 1
    assert "Oxidase, glucose" in reasons[0]


def test_wrong_report_outside_the_main_classification_is_counted_not_flagged():
    """Sodium chloride's record holds an azo dye's H318, but the label shows H319."""
    row = _row(
        hazards=["H226", "H314"],
        reports=[
            {"source": "ECHA", "name": "Acetic acid (EC: 200-580-7)", "codes": ["H226", "H314"]},
            {"source": "CLP", "name": "polyazodyestuff", "codes": ["H318"]},
        ],
    )

    assert audit.review_reasons(row) == []
    assert audit.other_reports_off_record(row) == ["polyazodyestuff"]


def test_row_without_hazard_data_cannot_mislead():
    assert audit.review_reasons(_row(pictograms=[], hazards=[], synonyms=[])) == []


def test_upstream_failure_needs_a_rerun():
    assert audit.review_reasons({"cas": "64-19-7", "upstream_error": True}) == ["PubChem did not answer; run again"]


def test_report_separates_new_rows_from_reviewed_ones(monkeypatch):
    monkeypatch.setattr(audit, "COMMON_REAGENTS", {})
    monkeypatch.setattr(audit, "REVIEWED_AUDIT_ROWS", {"7440-44-0": {"cid": 297, "note": "looked at it"}})
    rows = [
        _row(),
        _row(cas="7440-44-0", cid=297, title="Methane"),
        _row(cas="7782-42-5", cid=297, title="Methane"),
    ]

    report = audit.build_report(rows)

    assert [item["cas"] for item in report["needsPerson"]] == ["7782-42-5"]
    assert [item["cas"] for item in report["reviewed"]] == ["7440-44-0"]
    assert report["staleReviewedRows"] == []
    assert not audit.report_passes(report)


def test_reviewed_row_goes_stale_when_the_site_moves_to_another_record(monkeypatch):
    monkeypatch.setattr(audit, "COMMON_REAGENTS", {})
    monkeypatch.setattr(audit, "REVIEWED_AUDIT_ROWS", {"7440-44-0": {"cid": 297, "note": "looked at it"}})

    report = audit.build_report([_row(cas="7440-44-0", cid=5462310, synonyms=["7440-44-0"])])

    assert report["staleReviewedRows"] == ["7440-44-0"]
    assert not audit.report_passes(report)


def test_common_reagent_that_changed_needs_a_look(monkeypatch):
    monkeypatch.setattr(audit, "REVIEWED_AUDIT_ROWS", {})
    monkeypatch.setattr(
        audit,
        "COMMON_REAGENTS",
        {"64-19-7": {"name": "Acetic acid", "cid": 176, "pictograms": ["GHS05"]}},
    )

    report = audit.build_report([_row()])

    assert [item["cas"] for item in report["commonReagentChanges"]] == ["64-19-7"]
    assert not audit.report_passes(report)


def test_reviewed_entries_are_complete():
    for cas, row in REVIEWED_AUDIT_ROWS.items():
        assert row["note"], cas
    for cas, row in COMMON_REAGENTS.items():
        assert row["name"], cas
        assert row["pictograms"] == sorted(row["pictograms"]), cas
