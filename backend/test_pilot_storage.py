import sqlite3
from datetime import datetime, timedelta, timezone
from pathlib import Path

import pytest

from pilot_store import INVENTORY_HANDOFF_CORRECTION_SOURCE, PilotStore


def make_store(tmp_path: Path, **kwargs) -> PilotStore:
    return PilotStore(tmp_path / "pilot-test.db", **kwargs).connect()


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
        cas_number = "123-45-5"
        store.upsert_dictionary_entry(
            cas_number,
            name_en="Custom Buffer",
            name_zh="自訂緩衝液",
            notes="pilot entry",
        )
        store.upsert_alias("Buffer X", "en", cas_number, status="approved")
        store.upsert_reference_link(
            cas_number,
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
        links = store.list_reference_links(cas_number)

        assert manual is not None
        assert manual["cas_number"] == cas_number
        assert manual_admin["status"] == "approved"
        assert alias is not None
        assert alias["cas_number"] == cas_number
        assert links[0]["label"] == "Internal SDS"
    finally:
        store.close()


def test_pilot_store_rejects_invalid_manual_dictionary_writes(tmp_path):
    store = make_store(tmp_path)
    try:
        with pytest.raises(ValueError, match="valid CAS"):
            store.upsert_dictionary_entry(
                "123-45-6",
                name_en="Invalid checksum",
                name_zh="\u932f\u8aa4",
                status="approved",
            )

        with pytest.raises(ValueError, match="name_zh"):
            store.upsert_dictionary_entry(
                "123-45-5",
                name_en="English Display",
                name_zh="English Display",
                status="approved",
            )

        with pytest.raises(ValueError, match="manual entry status"):
            store.upsert_dictionary_entry(
                "123-45-5",
                name_en="Review Buffer",
                name_zh="\u5be9\u6838",
                status="draft",
            )
    finally:
        store.close()


def test_pilot_store_rejects_invalid_alias_and_reference_writes(tmp_path):
    store = make_store(tmp_path)
    try:
        with pytest.raises(ValueError, match="valid CAS"):
            store.upsert_alias("Bad CAS Alias", "en", "123-45-6", status="approved")

        with pytest.raises(ValueError, match="alias status"):
            store.upsert_alias("Bad Status", "en", "123-45-5", status="draft")

        with pytest.raises(ValueError, match="reference link URL"):
            store.upsert_reference_link(
                "123-45-5",
                label="Unsafe link",
                url="javascript:alert(1)",
                link_type="sds",
                status="active",
            )
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


def test_pilot_triage_prioritizes_manual_review_before_candidate_intake(tmp_path):
    store = make_store(tmp_path)
    try:
        store.upsert_dictionary_entry(
            "555-55-5",
            name_en="Review Buffer",
            name_zh="\u5be9\u6838\u7de9\u885d\u6db2",
            status="pending",
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
                "name_zh": "\u84bd\u9190",
                "approved_for_public_use": False,
            },
        )

        triage = store.get_dictionary_summary()["pilotTriage"]
        focus_order = [item["key"] for item in triage["recommendedFocus"]]
        assert focus_order[:3] == [
            "manual_review",
            "candidate_found",
            "missing_chinese_names",
        ]
        assert triage["dataQualityWorkflow"]["primaryStage"]["key"] == "manual_review"
        workflow_by_key = {
            item["key"]: item for item in triage["dataQualityWorkflow"]["stages"]
        }
        assert workflow_by_key["manual_review"]["count"] == 1
        assert workflow_by_key["candidate_found"]["count"] == 1
        assert workflow_by_key["missing_chinese_names"]["count"] == 1
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
                "777-77-5",
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
        migrated = store.get_manual_entry_by_cas("777-77-5")

        assert migrated is not None
        assert migrated["status"] == "approved"
        assert store.get_dictionary_summary()["approvedManualEntryCount"] == 1
    finally:
        store.close()


def test_legacy_invalid_manual_entry_is_filtered_from_public_lookup(tmp_path):
    store = make_store(tmp_path)
    try:
        conn = store._require_conn()
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
              status,
              updated_at
            )
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (
                "123-45-6",
                "Legacy Invalid CAS",
                "舊資料",
                "legacy invalid cas",
                "舊資料",
                "legacyinvalidcas",
                "舊資料",
                "legacy row bypassed current validators",
                "manual",
                "approved",
                "2026-05-21T00:00:00+00:00",
            ),
        )
        conn.commit()

        assert store.get_manual_entry_by_cas("123-45-6") is None
        assert store.get_manual_entry_by_name("Legacy Invalid CAS", "en") is None
        assert (
            store.get_manual_entry_by_cas(
                "123-45-6",
                include_unapproved=True,
            )["name_en"]
            == "Legacy Invalid CAS"
        )
    finally:
        store.close()


def test_legacy_fake_chinese_name_is_removed_from_public_manual_entry(tmp_path):
    store = make_store(tmp_path)
    try:
        conn = store._require_conn()
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
              status,
              updated_at
            )
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (
                "123-45-5",
                "Legacy Fake Chinese",
                "Legacy Fake Chinese",
                "legacy fake chinese",
                "Legacy Fake Chinese",
                "legacyfakechinese",
                "LegacyFakeChinese",
                "legacy row bypassed current validators",
                "manual",
                "approved",
                "2026-05-21T00:00:00+00:00",
            ),
        )
        conn.commit()

        public_entry = store.get_manual_entry_by_cas("123-45-5")
        admin_entry = store.get_manual_entry_by_cas(
            "123-45-5",
            include_unapproved=True,
        )

        assert public_entry is not None
        assert public_entry["name_en"] == "Legacy Fake Chinese"
        assert public_entry["name_zh"] is None
        assert admin_entry["name_zh"] == "Legacy Fake Chinese"
    finally:
        store.close()


def test_public_manual_and_alias_lists_filter_legacy_unsafe_rows(tmp_path):
    store = make_store(tmp_path)
    try:
        conn = store._require_conn()
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
              status,
              updated_at
            )
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (
                "123-45-6",
                "Legacy Invalid CAS",
                "舊資料",
                "legacy invalid cas",
                "舊資料",
                "legacyinvalidcas",
                "舊資料",
                "legacy row bypassed current validators",
                "manual",
                "approved",
                "2026-05-21T00:00:00+00:00",
            ),
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
              status,
              updated_at
            )
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (
                "123-45-5",
                "Legacy Fake Chinese",
                "Legacy Fake Chinese",
                "legacy fake chinese",
                "Legacy Fake Chinese",
                "legacyfakechinese",
                "LegacyFakeChinese",
                "legacy row bypassed current validators",
                "manual",
                "approved",
                "2026-05-21T00:00:00+00:00",
            ),
        )
        conn.execute(
            """
            INSERT INTO dictionary_aliases(
              alias_text,
              alias_norm,
              locale,
              cas_number,
              source,
              confidence,
              status,
              notes,
              first_seen_at,
              last_seen_at,
              hit_count
            )
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (
                "Bad Legacy Alias",
                "badlegacyalias",
                "en",
                "123-45-6",
                "manual",
                1.0,
                "approved",
                "legacy alias bypassed current validators",
                "2026-05-21T00:00:00+00:00",
                "2026-05-21T00:00:00+00:00",
                1,
            ),
        )
        conn.commit()

        raw_entries = store.list_manual_entries(status="approved")
        public_entries = store.list_manual_entries(
            status="approved",
            public_only=True,
        )
        raw_aliases = store.list_aliases(status="approved", locale="en")
        public_aliases = store.list_aliases(
            status="approved",
            locale="en",
            public_only=True,
        )

        assert any(entry["cas_number"] == "123-45-6" for entry in raw_entries)
        assert all(entry["cas_number"] != "123-45-6" for entry in public_entries)
        fake_entry = next(
            entry for entry in public_entries if entry["cas_number"] == "123-45-5"
        )
        assert fake_entry["name_zh"] is None
        assert any(alias["cas_number"] == "123-45-6" for alias in raw_aliases)
        assert all(alias["cas_number"] != "123-45-6" for alias in public_aliases)
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
        assert summary["pilotTriage"]["recommendedFocus"][0]["key"] == (
            "missing_chinese_names"
        )
        assert summary["pilotTriage"]["recommendedFocus"][0]["targetKey"] == "correction_requests"
        assert (
            summary["pilotTriage"]["recommendedFocus"][0]["targetLabel"]
            == "Correction requests"
        )
        workflow = summary["pilotTriage"]["dataQualityWorkflow"]
        assert workflow["primaryStage"]["key"] == "missing_chinese_names"
        workflow_by_key = {item["key"]: item for item in workflow["stages"]}
        assert workflow_by_key["missing_chinese_names"]["count"] == 1
        assert workflow_by_key["missing_chinese_names"]["targetKey"] == (
            "correction_requests"
        )
        assert workflow_by_key["candidate_found"]["count"] == 0
        assert workflow_by_key["manual_review"]["count"] == 0
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


def test_inventory_handoff_request_requires_approved_manual_entry_before_approval(tmp_path):
    store = make_store(tmp_path)
    try:
        record = store.record_correction_request(
            issue_type="missing-chinese-name",
            cas_number="7783-46-2",
            chemical_name="Lead fluoride",
            current_output="Seed dictionary has no trusted Chinese name.",
            expected_output="Inventory candidate: 氟化鉛",
            source=INVENTORY_HANDOFF_CORRECTION_SOURCE,
            status="candidate_found",
            candidate={
                "cas_number": "7783-46-2",
                "name_en": "Lead fluoride",
                "name_zh": "氟化鉛",
            },
        )

        with pytest.raises(ValueError, match="approved manual entry"):
            store.update_correction_request_status(record["id"], status="approved")

        with pytest.raises(ValueError, match="approved manual entry"):
            store.update_correction_request_status(
                record["id"],
                status="approved",
                candidate={
                    **record["candidate"],
                    "converted_to_manual_entry": True,
                    "manual_entry_status": "pending",
                },
            )

        with pytest.raises(ValueError, match="approved manual entry"):
            store.update_correction_request_status(
                record["id"],
                status="approved",
                candidate={
                    **record["candidate"],
                    "converted_to_manual_entry": True,
                    "manual_entry_status": "approved",
                },
            )

        store.update_correction_request_status(
            record["id"],
            status="candidate_found",
            candidate={
                **record["candidate"],
                "converted_to_manual_entry": True,
                "manual_entry_status": "pending",
            },
        )

        store.upsert_dictionary_entry(
            "7783-46-2",
            name_en="Lead fluoride",
            name_zh="不同審核名稱",
            source="correction-request",
            status="approved",
        )
        with pytest.raises(ValueError, match="approved manual entry"):
            store.update_correction_request_status(
                record["id"],
                status="approved",
                candidate={
                    **record["candidate"],
                    "converted_to_manual_entry": True,
                    "manual_entry_status": "approved",
                },
            )

        store.upsert_dictionary_entry(
            "7783-46-2",
            name_en="Lead fluoride",
            name_zh=record["candidate"]["name_zh"],
            source="correction-request",
            status="approved",
        )
        synced = store._fetch_correction_request_by_id(record["id"])
        assert synced["candidate"]["manual_entry_status"] == "approved"

        approved = store.update_correction_request_status(record["id"], status="approved")
        assert approved["status"] == "approved"

        public_record = store.record_correction_request(
            issue_type="source-conflict",
            cas_number="67-64-1",
            chemical_name="Acetone",
            current_output="Public report differs from local SDS.",
            expected_output="Reviewed by maintainer.",
            source="public",
        )
        public_approved = store.update_correction_request_status(
            public_record["id"],
            status="approved",
        )
        assert public_approved["status"] == "approved"
    finally:
        store.close()


def test_inventory_handoff_request_cannot_be_created_as_approved_without_manual_review(tmp_path):
    store = make_store(tmp_path)
    try:
        with pytest.raises(ValueError, match="approved manual entry"):
            store.record_correction_request(
                issue_type="missing-chinese-name",
                cas_number="7783-46-2",
                chemical_name="Lead fluoride",
                current_output="Seed dictionary has no trusted Chinese name.",
                expected_output="Inventory candidate: 氟化鉛",
                source=INVENTORY_HANDOFF_CORRECTION_SOURCE,
                status="approved",
                candidate={"name_zh": "氟化鉛"},
            )
    finally:
        store.close()


def test_correction_request_deduplicates_open_matching_reports(tmp_path):
    store = make_store(tmp_path)
    try:
        first = store.record_correction_request(
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
        duplicate = store.record_correction_request(
            issue_type="missing-chinese-name",
            cas_number="107-18-6",
            chemical_name="Allyl Alcohol",
            current_output="Chinese name is missing.",
            expected_output="Review a Traditional Chinese name before approval.",
            evidence_url="https://example.com/sds",
            evidence_type="Supplier SDS",
            local_context="Submitted again from row action.",
            candidate={"name_zh": "candidate only"},
        )

        assert duplicate["id"] == first["id"]
        assert duplicate["duplicateCount"] == 2
        assert duplicate["localContext"] == "Submitted from detail modal."

        listed = store.list_correction_requests(limit=5)
        assert len(listed) == 1
        assert listed[0]["duplicateCount"] == 2
        summary = store.get_dictionary_summary()
        assert summary["correctionRequestCount"] == 1
        assert summary["correctionRequestReportCount"] == 2
        assert summary["openCorrectionRequestCount"] == 1
        assert summary["openCorrectionRequestReportCount"] == 2
        assert summary["correctionRequestStatusCounts"]["open"] == 1
        assert summary["correctionRequestReportStatusCounts"]["open"] == 2
        assert summary["pilotTriage"]["attentionCounts"]["openCorrectionRequests"] == 1
        assert summary["pilotTriage"]["attentionReportCounts"][
            "openCorrectionReports"
        ] == 2
        assert summary["pilotTriage"]["attentionReportCounts"][
            "duplicateCorrectionReports"
        ] == 1
        assert summary["pilotTriage"]["signals"]["hasDuplicateCorrectionReports"] is True
    finally:
        store.close()


def test_pending_review_queues_enforce_row_limits_and_retention(tmp_path):
    store = make_store(
        tmp_path,
        max_pending_alias_rows=2,
        max_open_correction_rows=2,
    )
    try:
        store.capture_alias_candidates(
            "64-17-5",
            ["Ethanol alias one", "Ethanol alias two"],
        )
        assert len(store.list_aliases(status="pending")) == 2
        approved_alias = store.upsert_alias(
            "Ethanol approved alias",
            "en",
            "64-17-5",
            status="approved",
        )
        assert approved_alias["status"] == "approved"

        with pytest.raises(ValueError, match="pending alias quota"):
            store.capture_alias_candidates(
                "64-17-5",
                ["Ethanol alias three"],
            )

        store.record_correction_request(
            issue_type="missing-chinese-name",
            query_text="correction-one",
        )
        store.record_correction_request(
            issue_type="missing-chinese-name",
            query_text="correction-two",
        )
        approved_correction = store.record_correction_request(
            issue_type="missing-chinese-name",
            query_text="correction-approved",
            status="approved",
        )
        assert approved_correction["status"] == "approved"
        with pytest.raises(ValueError, match="correction request quota"):
            store.record_correction_request(
                issue_type="missing-chinese-name",
                query_text="correction-three",
            )

        old_timestamp = (
            datetime.now(timezone.utc) - timedelta(days=120)
        ).isoformat()
        connection = store._require_conn()
        connection.execute(
            "UPDATE dictionary_aliases SET last_seen_at = ?",
            (old_timestamp,),
        )
        connection.execute(
            "UPDATE dictionary_correction_requests SET updated_at = ?",
            (old_timestamp,),
        )
        connection.commit()

        purged = store.purge_stale_review_rows(
            retention_days=90,
            now=datetime.now(timezone.utc),
        )
        assert purged["deletedAliasCount"] == 2
        assert purged["deletedCorrectionCount"] == 2
        assert store.list_aliases(status="pending") == []
        assert store.list_correction_requests(statuses=("open",)) == []
        assert [item["alias_text"] for item in store.list_aliases(status="approved")] == [
            "Ethanol approved alias"
        ]
        assert [
            item["query_text"]
            for item in store.list_correction_requests(statuses=("approved",))
        ] == ["correction-approved"]
    finally:
        store.close()


def test_correction_review_lists_apply_conversion_filter_and_limit_in_sql(tmp_path):
    store = make_store(tmp_path)
    statements: list[str] = []
    try:
        for index in range(5):
            store.record_correction_request(
                issue_type="missing-chinese-name",
                cas_number=f"{100 + index:03d}-45-5",
                chemical_name=f"Chemical {index}",
                current_output="English name only.",
                expected_output="Needs review.",
                status="candidate_found",
                candidate={
                    "name_zh": f"候選 {index}",
                    "converted_to_manual_entry": index < 3,
                },
            )

        connection = store._require_conn()
        connection.set_trace_callback(statements.append)
        visible = store.list_correction_requests(
            limit=2,
            statuses=("candidate_found",),
            exclude_converted_manual_entries=True,
        )
        converted = store.list_converted_correction_candidates(limit=2)
        connection.set_trace_callback(None)

        assert [item["candidate"]["name_zh"] for item in visible] == [
            "候選 4",
            "候選 3",
        ]
        assert len(converted) == 2
        review_sql = "\n".join(statements)
        assert "json_extract(candidate_json, '$.converted_to_manual_entry')" in review_sql
        assert "LIMIT 2" in review_sql
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
        focus_order = [item["key"] for item in triage["recommendedFocus"]]
        assert focus_order[:3] == [
            "candidate_found",
            "missing_chinese_names",
            "correction_intake",
        ]
        assert focus_by_key["correction_intake"]["targetKey"] == "correction_requests"
        assert focus_by_key["candidate_found"]["targetKey"] == "converted_candidates"
        assert focus_by_key["unresolved_searches"]["targetKey"] == "miss_queries"
        assert focus_by_key["missing_chinese_names"]["targetKey"] == "correction_requests"
        assert focus_by_key["no_ghs_gaps"]["targetKey"] == "correction_requests"
        assert focus_by_key["source_conflicts"]["targetKey"] == "correction_requests"
        assert focus_by_key["missing_chinese_names"]["count"] == 2
        assert focus_by_key["no_ghs_gaps"]["count"] == 1
        assert focus_by_key["source_conflicts"]["count"] == 1
        workflow = triage["dataQualityWorkflow"]
        workflow_by_key = {item["key"]: item for item in workflow["stages"]}
        assert workflow["primaryStage"]["key"] == "candidate_found"
        assert workflow_by_key["candidate_found"]["count"] == 1
        assert workflow_by_key["missing_chinese_names"]["count"] == 2
        assert workflow_by_key["unresolved_searches"]["count"] == 2
    finally:
        store.close()


def test_inventory_handoff_requests_surface_as_admin_triage_focus(tmp_path):
    store = make_store(tmp_path)
    try:
        store.record_correction_request(
            issue_type="missing-chinese-name",
            cas_number="84-65-1",
            chemical_name="Anthraquinone",
            current_output="Seed dictionary has no trusted Traditional Chinese name.",
            expected_output="Inventory candidate: 蒽醌",
            source=INVENTORY_HANDOFF_CORRECTION_SOURCE,
        )
        store.record_correction_request(
            issue_type="unresolved-search",
            query_text="inventory row with unknown CAS",
            current_output="Workbook row could not be resolved.",
            expected_output="Needs maintainer review before import.",
            source=INVENTORY_HANDOFF_CORRECTION_SOURCE,
        )
        store.record_correction_request(
            issue_type="source-conflict",
            cas_number="67-64-1",
            chemical_name="Acetone",
            current_output="Public report differs from local SDS.",
            expected_output="Review source conflict separately.",
            source="public",
        )

        summary = store.get_dictionary_summary()
        triage = summary["pilotTriage"]
        counts = triage["attentionCounts"]
        focus_by_key = {item["key"]: item for item in triage["recommendedFocus"]}

        assert counts["openCorrectionRequests"] == 3
        assert counts["inventoryHandoffRequests"] == 2
        assert triage["primaryQueueItemCounts"]["openCorrectionRequests"] == 3
        assert summary["correctionRequestSourceCounts"] == {
            INVENTORY_HANDOFF_CORRECTION_SOURCE: 2,
            "public": 1,
        }
        assert summary["inventoryHandoffCorrectionRequests"][0]["source"] == (
            INVENTORY_HANDOFF_CORRECTION_SOURCE
        )
        assert len(summary["inventoryHandoffCorrectionRequests"]) == 2
        assert triage["correctionSourceCounts"][INVENTORY_HANDOFF_CORRECTION_SOURCE] == 2
        assert triage["inventoryHandoffIssueTypeCounts"]["missing-chinese-name"] == 1
        assert triage["inventoryHandoffIssueTypeCounts"]["unresolved-search"] == 1
        assert focus_by_key["inventory_handoff"]["targetKey"] == "inventory_handoff"
        assert focus_by_key["inventory_handoff"]["count"] == 2
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
