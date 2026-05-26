import sqlite3
from pathlib import Path

from pilot_store import PilotStore


def make_store(tmp_path: Path) -> PilotStore:
    return PilotStore(tmp_path / "pilot-test.db").connect()


def test_workspace_document_roundtrip(tmp_path):
    store = make_store(tmp_path)
    try:
        assert store.get_document("lab_profile") is None

        saved = store.put_document(
            "lab_profile",
            {
                "organization": "Materials Lab",
                "phone": "02-1234",
                "address": "Taipei",
            },
        )

        loaded = store.get_document("lab_profile")
        assert loaded is not None
        assert loaded["payload"]["organization"] == "Materials Lab"
        assert loaded["updatedAt"] == saved["updatedAt"]
    finally:
        store.close()


def test_dictionary_entry_alias_and_reference_roundtrip(tmp_path):
    store = make_store(tmp_path)
    try:
        store.upsert_dictionary_entry(
            "123-45-6",
            name_en="Custom Buffer",
            name_zh="自訂緩衝液",
            notes="pilot entry",
        )
        store.upsert_alias("Buffer X", "en", "123-45-6", status="approved")
        store.upsert_reference_link(
            "123-45-6",
            label="Internal SDS",
            url="https://lab.example/internal-sds",
            link_type="sds",
            priority=5,
        )

        manual = store.get_manual_entry_by_name("Custom Buffer", "en")
        manual_admin = store.get_manual_entry_by_name(
            "Custom Buffer",
            "en",
            include_unapproved=True,
        )
        alias = store.get_alias_exact("buffer x", "en")
        links = store.list_reference_links("123-45-6")

        assert manual is not None
        assert manual["cas_number"] == "123-45-6"
        assert manual_admin["status"] == "approved"
        assert alias is not None
        assert alias["cas_number"] == "123-45-6"
        assert links[0]["label"] == "Internal SDS"
    finally:
        store.close()


def test_pending_dictionary_entry_is_kept_out_of_default_lookup(tmp_path):
    store = make_store(tmp_path)
    try:
        store.upsert_dictionary_entry(
            "555-55-5",
            name_en="Review Buffer",
            name_zh="\u5be9\u6838\u7de9\u885d\u6db2",
            status="pending",
        )

        assert store.get_manual_entry_by_name("Review Buffer", "en") is None
        assert (
            store.get_manual_entry_by_name(
                "Review Buffer",
                "en",
                include_unapproved=True,
            )["status"]
            == "pending"
        )
        assert store.get_dictionary_summary()["pendingManualEntryCount"] == 1
    finally:
        store.close()


def test_dictionary_entry_status_migration_defaults_legacy_rows(tmp_path):
    db_path = tmp_path / "legacy-pilot.db"
    conn = sqlite3.connect(db_path)
    try:
        conn.execute(
            """
            CREATE TABLE dictionary_entries (
              cas_number TEXT PRIMARY KEY,
              name_en TEXT,
              name_zh TEXT,
              name_en_norm TEXT,
              name_zh_norm TEXT,
              name_en_compact TEXT,
              name_zh_compact TEXT,
              notes TEXT,
              source TEXT NOT NULL DEFAULT 'manual',
              updated_at TEXT NOT NULL
            )
            """
        )
        conn.execute(
            """
            INSERT INTO dictionary_entries(
              cas_number,
              name_en,
              name_zh,
              name_en_norm,
              name_zh_norm,
              name_en_compact,
              name_zh_compact,
              notes,
              source,
              updated_at
            )
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (
                "777-77-7",
                "Legacy Buffer",
                "\u820a\u7de9\u885d\u6db2",
                "legacy buffer",
                "\u820a\u7de9\u885d\u6db2",
                "legacybuffer",
                "\u820a\u7de9\u885d\u6db2",
                "legacy row",
                "manual",
                "2026-05-21T00:00:00+00:00",
            ),
        )
        conn.commit()
    finally:
        conn.close()

    store = PilotStore(db_path).connect()
    try:
        migrated = store.get_manual_entry_by_cas("777-77-7")

        assert migrated is not None
        assert migrated["status"] == "approved"
        assert store.get_dictionary_summary()["approvedManualEntryCount"] == 1
    finally:
        store.close()


def test_miss_query_aggregates_hits(tmp_path):
    store = make_store(tmp_path)
    try:
        store.record_miss_query("mystery solvent", "name", "search_single")
        store.record_miss_query("Mystery Solvent", "name", "search_single")

        misses = store.list_miss_queries(limit=5)
        assert len(misses) == 1
        assert misses[0]["hit_count"] == 2
        assert misses[0]["query_kind"] == "name"
    finally:
        store.close()


def test_correction_request_roundtrip_and_summary(tmp_path):
    store = make_store(tmp_path)
    try:
        record = store.record_correction_request(
            issue_type="missing-chinese-name",
            cas_number="107-18-6",
            chemical_name="Allyl Alcohol",
            current_output="Chinese name is missing.",
            expected_output="Review a Traditional Chinese name before approval.",
            evidence_url="https://example.com/sds",
            evidence_type="Supplier SDS",
            local_context="Submitted from detail modal.",
            candidate={"name_zh": "candidate only"},
        )

        assert record["issue_type"] == "missing-chinese-name"
        assert record["cas_number"] == "107-18-6"
        assert record["status"] == "open"
        assert record["candidate"] == {"name_zh": "candidate only"}

        summary = store.get_dictionary_summary()
        assert summary["correctionRequestCount"] == 1
        assert summary["openCorrectionRequestCount"] == 1
        assert summary["correctionRequestStatusCounts"]["open"] == 1
        assert summary["pilotTriage"]["openWorkItemCount"] == 1
        assert summary["pilotTriage"]["attentionSignalCount"] == 2
        assert summary["pilotTriage"]["attentionCounts"]["openCorrectionRequests"] == 1
        assert summary["pilotTriage"]["attentionCounts"]["missingChineseNameReports"] == 1
        assert summary["pilotTriage"]["recommendedFocus"][0]["key"] == "correction_intake"
        assert summary["pilotTriage"]["recommendedFocus"][0]["targetKey"] == "correction_requests"
        assert (
            summary["pilotTriage"]["recommendedFocus"][0]["targetLabel"]
            == "Correction requests"
        )
        assert summary["convertedCorrectionCandidateCount"] == 0
        assert summary["topCorrectionRequests"][0]["localContextRedacted"] is True

        updated = store.update_correction_request_status(
            record["id"],
            status="candidate_found",
            review_notes="Candidate needs source evidence.",
            candidate={"name_zh": "reviewed candidate"},
        )
        assert updated["status"] == "candidate_found"
        assert updated["review_notes"] == "Candidate needs source evidence."
        assert updated["candidate"] == {"name_zh": "reviewed candidate"}

        converted = store.update_correction_request_status(
            record["id"],
            status="candidate_found",
            candidate={
                "name_zh": "reviewed candidate",
                "converted_to_manual_entry": True,
                "manual_entry_status": "pending",
                "public_data_changed": False,
            },
        )
        assert converted["candidate"]["converted_to_manual_entry"] is True
        summary = store.get_dictionary_summary()
        assert summary["convertedCorrectionCandidateCount"] == 1
        assert (
            summary["pilotTriage"]["attentionCounts"][
                "candidateFoundAwaitingManualReview"
            ]
            == 0
        )
        assert summary["pilotTriage"]["attentionCounts"]["manualEntriesInReview"] == 0
        assert summary["convertedCorrectionCandidates"][0]["id"] == record["id"]
        assert summary["convertedCorrectionCandidates"][0]["localContextRedacted"] is True
        assert (
            summary["convertedCorrectionCandidates"][0]["candidate"][
                "manual_entry_status"
            ]
            == "pending"
        )
        assert summary["topCorrectionRequests"] == []

        listed = store.list_correction_requests(statuses=("candidate_found",))
        assert [item["id"] for item in listed] == [record["id"]]
    finally:
        store.close()


def test_pilot_triage_keeps_roster_data_quality_queues_separate(tmp_path):
    store = make_store(tmp_path)
    try:
        store.record_correction_request(
            issue_type="missing-chinese-name",
            cas_number="90-41-5",
            chemical_name="2-Aminobiphenyl",
            current_output="English name only.",
            expected_output="Needs reviewed Traditional Chinese name.",
        )
        store.record_correction_request(
            issue_type="no-ghs-data",
            cas_number="57-13-6",
            chemical_name="Urea",
            current_output="No GHS pictograms or statements.",
            expected_output="Keep as no-GHS review item, not no-hazard.",
        )
        store.record_correction_request(
            issue_type="source-conflict",
            cas_number="100-00-5",
            chemical_name="4-Nitrochlorobenzene",
            current_output="PubChem/ECHA classifications differ.",
            expected_output="Review source conflict before changing public data.",
        )
        store.record_correction_request(
            issue_type="missing-chinese-name",
            cas_number="84-65-1",
            chemical_name="Anthraquinone",
            current_output="Candidate found, not approved.",
            expected_output="Convert only through manual dictionary review.",
            status="candidate_found",
            candidate={
                "cas_number": "84-65-1",
                "name_en": "Anthraquinone",
                "name_zh": "review-only candidate",
                "approved_for_public_use": False,
            },
        )
        store.record_miss_query("unknown roster additive", "name", "batch_search")
        store.record_miss_query("9999-99-9", "cas", "batch_search")

        summary = store.get_dictionary_summary()
        triage = summary["pilotTriage"]
        counts = triage["attentionCounts"]

        assert triage["openWorkItemCount"] == 6
        assert triage["attentionSignalCount"] == 11
        assert triage["primaryQueueItemCounts"] == {
            "openCorrectionRequests": 4,
            "unresolvedSearches": 2,
            "manualEntriesInReview": 0,
            "aliasesInReview": 0,
            "staleMissQueryRows": 0,
            "inactiveReferenceLinks": 0,
        }
        assert counts["openCorrectionRequests"] == 4
        assert counts["candidateFoundAwaitingManualReview"] == 1
        assert counts["missingChineseNameReports"] == 2
        assert counts["noGhsReports"] == 1
        assert counts["sourceConflictReports"] == 1
        assert counts["unresolvedSearches"] == 2

        focus_by_key = {item["key"]: item for item in triage["recommendedFocus"]}
        assert focus_by_key["correction_intake"]["targetKey"] == "correction_requests"
        assert focus_by_key["candidate_found"]["targetKey"] == "converted_candidates"
        assert focus_by_key["unresolved_searches"]["targetKey"] == "miss_queries"
        assert focus_by_key["missing_chinese_names"]["targetKey"] == "correction_requests"
        assert focus_by_key["no_ghs_gaps"]["targetKey"] == "correction_requests"
        assert focus_by_key["source_conflicts"]["targetKey"] == "correction_requests"
        assert focus_by_key["missing_chinese_names"]["count"] == 2
        assert focus_by_key["no_ghs_gaps"]["count"] == 1
        assert focus_by_key["source_conflicts"]["count"] == 1
    finally:
        store.close()


def test_dictionary_export_redacts_correction_context_by_default(tmp_path):
    store = make_store(tmp_path)
    try:
        store.record_correction_request(
            issue_type="unresolved-search",
            query_text="unknown solvent",
            local_context="Submitted from a lab workstation.",
        )

        default_snapshot = store.export_dictionary_snapshot()
        assert default_snapshot["correctionRequestExportScope"] == {
            "contextIncluded": False,
            "limit": 500,
        }
        assert default_snapshot["correctionRequests"][0]["localContextRedacted"] is True
        assert "local_context" not in default_snapshot["correctionRequests"][0]

        raw_snapshot = store.export_dictionary_snapshot(
            include_correction_context=True,
        )
        assert raw_snapshot["correctionRequestExportScope"]["contextIncluded"] is True
        assert (
            raw_snapshot["correctionRequests"][0]["local_context"]
            == "Submitted from a lab workstation."
        )
    finally:
        store.close()
