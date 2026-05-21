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
