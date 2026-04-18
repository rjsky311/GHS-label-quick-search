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
        alias = store.get_alias_exact("buffer x", "en")
        links = store.list_reference_links("123-45-6")

        assert manual is not None
        assert manual["cas_number"] == "123-45-6"
        assert alias is not None
        assert alias["cas_number"] == "123-45-6"
        assert links[0]["label"] == "Internal SDS"
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
