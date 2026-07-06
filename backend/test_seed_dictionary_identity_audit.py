import csv
import json
import subprocess
import sys

import pytest

from chemical_dict import CAS_TO_EN
from seed_dictionary_identity_audit import (
    AUDIT_SOURCE,
    PubChemRateLimiter,
    audit_seed_dictionary,
    audit_seed_entry,
    normalize_identity_name,
)
from seed_dictionary_identity_exemptions import (
    REVIEWED_IDENTITY_EXEMPTION_CATEGORIES,
    REVIEWED_IDENTITY_EXEMPTIONS,
)


class FakeResponse:
    def __init__(self, status_code=200, payload=None, json_error=None):
        self.status_code = status_code
        self._payload = payload or {}
        self._json_error = json_error

    def json(self):
        if self._json_error:
            raise self._json_error
        return self._payload


class FakePubChemClient:
    def __init__(self, records):
        self.records = records
        self.calls = []

    def get(self, url, **_kwargs):
        self.calls.append(url)
        if "/substance/xref/rn/" in url:
            cas = self._cas_from_url(url)
            return self._xref_response(self.records.get(cas, {}), "substance")
        if "/compound/xref/rn/" in url:
            cas = self._cas_from_url(url)
            return self._xref_response(self.records.get(cas, {}), "compound")
        if "/property/Title/" in url:
            cid = self._cid_from_url(url)
            record = self._record_by_cid(cid)
            return FakeResponse(
                200,
                {
                    "PropertyTable": {
                        "Properties": [
                            {"CID": cid, "Title": record.get("title", "")}
                        ]
                    }
                },
            )
        if "/synonyms/" in url:
            cid = self._cid_from_url(url)
            record = self._record_by_cid(cid)
            return FakeResponse(
                200,
                {
                    "InformationList": {
                        "Information": [
                            {"CID": cid, "Synonym": record.get("synonyms", [])}
                        ]
                    }
                },
            )
        raise AssertionError(f"Unexpected URL: {url}")

    def _xref_response(self, record, source):
        status = record.get(f"{source}_status", 200)
        if status != 200:
            return FakeResponse(status, {"Fault": {"Code": "PUGREST.NotFound"}})
        if record.get(f"{source}_json_error"):
            return FakeResponse(200, json_error=ValueError("bad json"))
        cids = record.get(f"{source}_cids", [])
        if source == "substance":
            return FakeResponse(
                200,
                {
                    "InformationList": {
                        "Information": [
                            {"SID": index + 1, "CID": [cid]}
                            for index, cid in enumerate(cids)
                        ]
                    }
                },
            )
        return FakeResponse(200, {"IdentifierList": {"CID": cids}})

    def _cas_from_url(self, url):
        return url.split("/rn/", 1)[1].split("/", 1)[0]

    def _cid_from_url(self, url):
        return int(url.split("/cid/", 1)[1].split("/", 1)[0])

    def _record_by_cid(self, cid):
        for record in self.records.values():
            if cid == record.get("cid"):
                return record
        raise AssertionError(f"Unknown CID: {cid}")


def audit_entry(cas, name, records, reviewed_exemptions=None):
    return audit_seed_entry(
        cas,
        name,
        client=FakePubChemClient(records),
        reviewed_exemptions=reviewed_exemptions,
        rate_limit_seconds=0,
        sleeper=lambda _seconds: None,
    )


def test_normalize_identity_name_removes_parenthetical_alias_suffix_and_punctuation():
    assert normalize_identity_name("N-Methyliminodiacetic acid (MIDA)") == (
        "nmethyliminodiaceticacid"
    )
    assert normalize_identity_name(" Tin(IV) chloride ") == "tinivchloride"


def test_reviewed_identity_exemption_list_matches_current_seed_names():
    assert len(REVIEWED_IDENTITY_EXEMPTIONS) == 70
    allowed_categories = set(REVIEWED_IDENTITY_EXEMPTION_CATEGORIES)
    for cas_number, exemption in REVIEWED_IDENTITY_EXEMPTIONS.items():
        assert exemption["dictionary_name_en"] == CAS_TO_EN[cas_number]
        assert exemption["reason_category"] in allowed_categories
        assert exemption["note"].strip()
        assert exemption["reviewed_at"] == "2026-07-06"
    assert (
        REVIEWED_IDENTITY_EXEMPTIONS["77657-78-4"]["reason_category"]
        == "insufficient_evidence_deferred"
    )


def test_rate_limiter_sleeps_only_for_remaining_request_start_interval():
    moments = iter([0.0, 0.10, 0.55])
    sleeps = []
    limiter = PubChemRateLimiter(
        0.25,
        monotonic=lambda: next(moments),
        sleeper=sleeps.append,
    )

    limiter.wait()
    limiter.wait()
    limiter.wait()

    assert sleeps == [pytest.approx(0.15)]


def test_audit_entry_classifies_title_match():
    result = audit_entry(
        "64-17-5",
        "Ethanol",
        {
            "64-17-5": {
                "cid": 702,
                "substance_cids": [702, 702, 702],
                "title": "Ethanol",
                "synonyms": ["Ethyl alcohol"],
            }
        },
    )

    assert result["status"] == "title_match"
    assert result["cid"] == 702
    assert result["cidVoteRatio"] == pytest.approx(1.0)
    assert result["review_required"] is False
    assert result["public_data_changed"] is False


def test_audit_entry_classifies_synonym_match_when_title_differs():
    result = audit_entry(
        "7646-78-8",
        "Tin(IV) chloride",
        {
            "7646-78-8": {
                "cid": 24287,
                "substance_cids": [24287, 24287],
                "title": "Tin tetrachloride",
                "synonyms": ["Tin(IV) chloride", "Stannic chloride"],
            }
        },
    )

    assert result["status"] == "synonym_match"
    assert result["matchedSynonym"] == "Tin(IV) chloride"


def test_audit_entry_classifies_mismatch_without_writing_public_data():
    result = audit_entry(
        "4408-64-4",
        "Cerium(IV) sulfate hydrate",
        {
            "4408-64-4": {
                "cid": 20441,
                "substance_cids": [20441, 20441, 999],
                "title": "N-Methyliminodiacetic acid",
                "synonyms": ["MIDA"],
            }
        },
    )

    assert result["status"] == "mismatch"
    assert result["cid"] == 20441
    assert result["cidVoteRatio"] == pytest.approx(2 / 3)
    assert result["dictionaryNameEn"] == "Cerium(IV) sulfate hydrate"
    assert result["pubchemTitle"] == "N-Methyliminodiacetic acid"
    assert result["review_required"] is True
    assert result["public_data_changed"] is False


def test_audit_entry_reclassifies_mismatch_when_reviewed_exemption_matches_name():
    result = audit_entry(
        "102-54-5",
        "Ferrocene",
        {
            "102-54-5": {
                "cid": 7611,
                "substance_cids": [7611, 7611],
                "title": "Bis(eta-cyclopentadienyl) iron",
                "synonyms": [],
            }
        },
        reviewed_exemptions={
            "102-54-5": {
                "dictionary_name_en": "Ferrocene",
                "reason_category": "naming_style",
                "note": "PubChem title uses a systematic organometallic name.",
                "reviewed_at": "2026-07-06",
            }
        },
    )

    assert result["status"] == "reviewed_exemption"
    assert result["rawStatus"] == "mismatch"
    assert result["pubchemTitle"] == "Bis(eta-cyclopentadienyl) iron"
    assert result["reviewedExemption"]["reason_category"] == "naming_style"
    assert result["review_required"] is False
    assert result["public_data_changed"] is False


def test_audit_entry_invalidates_reviewed_exemption_when_dictionary_name_changes():
    result = audit_entry(
        "102-54-5",
        "Ferrocene, changed",
        {
            "102-54-5": {
                "cid": 7611,
                "substance_cids": [7611],
                "title": "Bis(eta-cyclopentadienyl) iron",
                "synonyms": [],
            }
        },
        reviewed_exemptions={
            "102-54-5": {
                "dictionary_name_en": "Ferrocene",
                "reason_category": "naming_style",
                "note": "PubChem title uses a systematic organometallic name.",
                "reviewed_at": "2026-07-06",
            }
        },
    )

    assert result["status"] == "mismatch"
    assert "reviewedExemption" not in result
    assert result["review_required"] is True


@pytest.mark.parametrize(
    ("pubchem_title", "synonyms", "expected_status"),
    [
        ("Ferrocene", [], "title_match"),
        ("Bis(eta-cyclopentadienyl) iron", ["Ferrocene"], "synonym_match"),
    ],
)
def test_audit_entry_keeps_match_categories_even_when_exemption_exists(
    pubchem_title,
    synonyms,
    expected_status,
):
    result = audit_entry(
        "102-54-5",
        "Ferrocene",
        {
            "102-54-5": {
                "cid": 7611,
                "substance_cids": [7611],
                "title": pubchem_title,
                "synonyms": synonyms,
            }
        },
        reviewed_exemptions={
            "102-54-5": {
                "dictionary_name_en": "Ferrocene",
                "reason_category": "naming_style",
                "note": "PubChem title uses a systematic organometallic name.",
                "reviewed_at": "2026-07-06",
            }
        },
    )

    assert result["status"] == expected_status
    assert "rawStatus" not in result
    assert "reviewedExemption" not in result


def test_audit_entry_falls_back_to_compound_xref_when_substance_has_no_cids():
    result = audit_entry(
        "50-00-0",
        "Formaldehyde",
        {
            "50-00-0": {
                "cid": 712,
                "substance_cids": [],
                "compound_cids": [712],
                "title": "Formaldehyde",
                "synonyms": [],
            }
        },
    )

    assert result["status"] == "title_match"
    assert result["cidSource"] == "compound_xref_rn"


def test_audit_entry_reports_no_record_for_missing_rn():
    result = audit_entry(
        "999-99-9",
        "Local-only compound",
        {
            "999-99-9": {
                "substance_status": 404,
                "compound_status": 404,
            }
        },
    )

    assert result["status"] == "no_record"
    assert result["cid"] is None
    assert result["review_required"] is False


def test_audit_entry_reports_upstream_error_for_transient_failures():
    result = audit_seed_entry(
        "64-17-5",
        "Ethanol",
        client=FakePubChemClient({"64-17-5": {"substance_status": 503}}),
        rate_limit_seconds=0,
        max_retries=1,
        sleeper=lambda _seconds: None,
    )

    assert result["status"] == "upstream_error"
    assert "HTTP 503" in result["error"]
    assert result["review_required"] is False


def test_checkpoint_resume_skips_completed_items_but_retries_upstream_errors(tmp_path):
    checkpoint = tmp_path / "checkpoint.json"
    checkpoint.write_text(
        json.dumps(
            {
                "schemaVersion": 1,
                "source": AUDIT_SOURCE,
                "completed": {
                    "64-17-5": {
                        "cas_number": "64-17-5",
                        "dictionaryNameEn": "Ethanol",
                        "status": "title_match",
                    },
                    "67-56-1": {
                        "cas_number": "67-56-1",
                        "dictionaryNameEn": "Methanol",
                        "status": "upstream_error",
                    },
                },
            }
        ),
        encoding="utf-8",
    )
    client = FakePubChemClient(
        {
            "67-56-1": {
                "cid": 887,
                "substance_cids": [887, 887],
                "title": "Methanol",
                "synonyms": [],
            }
        }
    )

    report = audit_seed_dictionary(
        entries={"64-17-5": "Ethanol", "67-56-1": "Methanol"},
        client=client,
        checkpoint_path=checkpoint,
        rate_limit_seconds=0,
        sleeper=lambda _seconds: None,
    )

    assert not any("/rn/64-17-5/" in call for call in client.calls)
    assert any("/rn/67-56-1/" in call for call in client.calls)
    assert report["summary"]["title_match"] == 2
    saved_checkpoint = json.loads(checkpoint.read_text(encoding="utf-8"))
    assert saved_checkpoint["completed"]["67-56-1"]["status"] == "title_match"


def test_audit_writes_review_only_report_and_mismatch_csv(tmp_path):
    report = audit_seed_dictionary(
        entries={"4408-64-4": "Cerium(IV) sulfate hydrate"},
        client=FakePubChemClient(
            {
                "4408-64-4": {
                    "cid": 20441,
                    "substance_cids": [20441],
                    "title": "N-Methyliminodiacetic acid",
                    "synonyms": [],
                }
            }
        ),
        output_dir=tmp_path,
        rate_limit_seconds=0,
        sleeper=lambda _seconds: None,
    )

    report_path = tmp_path / "seed-dictionary-identity-audit.json"
    mismatch_path = tmp_path / "seed-dictionary-identity-mismatches.csv"
    assert report_path.exists()
    assert mismatch_path.exists()
    assert report["summary"]["mismatch"] == 1
    assert report["actionQueue"][0]["review_required"] is True
    assert report["actionQueue"][0]["public_data_changed"] is False

    stored = json.loads(report_path.read_text(encoding="utf-8"))
    assert stored["source"] == AUDIT_SOURCE
    assert stored["reviewOnly"] is True
    assert stored["outputFiles"]["report"].endswith("seed-dictionary-identity-audit.json")
    with mismatch_path.open(encoding="utf-8-sig", newline="") as handle:
        rows = list(csv.DictReader(handle))
    assert rows[0]["cas_number"] == "4408-64-4"
    assert rows[0]["pubchemTitle"] == "N-Methyliminodiacetic acid"


def test_audit_writes_reviewed_exemptions_without_action_queue_noise(tmp_path):
    report = audit_seed_dictionary(
        entries={
            "102-54-5": "Ferrocene",
            "4408-64-4": "Cerium(IV) sulfate hydrate",
        },
        client=FakePubChemClient(
            {
                "102-54-5": {
                    "cid": 7611,
                    "substance_cids": [7611],
                    "title": "Bis(eta-cyclopentadienyl) iron",
                    "synonyms": [],
                },
                "4408-64-4": {
                    "cid": 20441,
                    "substance_cids": [20441],
                    "title": "N-Methyliminodiacetic acid",
                    "synonyms": [],
                },
            }
        ),
        reviewed_exemptions={
            "102-54-5": {
                "dictionary_name_en": "Ferrocene",
                "reason_category": "naming_style",
                "note": "PubChem title uses a systematic organometallic name.",
                "reviewed_at": "2026-07-06",
            }
        },
        output_dir=tmp_path,
        rate_limit_seconds=0,
        sleeper=lambda _seconds: None,
    )

    mismatch_path = tmp_path / "seed-dictionary-identity-mismatches.csv"
    reviewed_path = tmp_path / "seed-dictionary-identity-reviewed-exemptions.csv"
    assert reviewed_path.exists()
    assert report["summary"]["reviewed_exemption"] == 1
    assert report["summary"]["mismatch"] == 1
    assert [item["cas_number"] for item in report["actionQueue"]] == ["4408-64-4"]

    stored = json.loads(
        (tmp_path / "seed-dictionary-identity-audit.json").read_text(encoding="utf-8")
    )
    assert stored["details"]["reviewed_exemption"][0]["cas_number"] == "102-54-5"
    assert stored["outputFiles"]["reviewedExemptionsCsv"].endswith(
        "seed-dictionary-identity-reviewed-exemptions.csv"
    )

    with mismatch_path.open(encoding="utf-8-sig", newline="") as handle:
        mismatch_rows = list(csv.DictReader(handle))
    assert [row["cas_number"] for row in mismatch_rows] == ["4408-64-4"]

    with reviewed_path.open(encoding="utf-8-sig", newline="") as handle:
        reviewed_rows = list(csv.DictReader(handle))
    assert reviewed_rows[0]["cas_number"] == "102-54-5"
    assert reviewed_rows[0]["reason_category"] == "naming_style"


def test_cli_help_is_available_without_network():
    result = subprocess.run(
        [sys.executable, "scripts/audit_seed_dictionary_identity.py", "--help"],
        cwd=".",
        check=False,
        capture_output=True,
        text=True,
    )

    assert result.returncode == 0
    assert "Seed dictionary identity audit" in result.stdout
    assert "--checkpoint" in result.stdout
    assert "--output-dir" in result.stdout
