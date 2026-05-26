import json
import subprocess
import sys
from pathlib import Path

from candidate_discovery import (
    build_candidate_bundle,
    discover_candidates_for_item,
    discover_candidates_from_correction_requests,
    fetch_wikidata_chinese_name_candidates,
    normalize_wikidata_item_url,
    resolve_local_cas_from_name,
)
from pilot_store import PilotStore


def make_store(tmp_path: Path) -> PilotStore:
    return PilotStore(tmp_path / "candidate-discovery.db").connect()


def test_candidate_bundle_is_review_only():
    bundle = build_candidate_bundle(
        candidate_type="missing-chinese-name",
        cas_number=" 62-53-3 ",
        name_en="Aniline",
        name_zh="\u82ef\u80fa",
        evidence_type="Local seed dictionary",
        evidence_url="https://example.com/source",
    )

    assert bundle["schema_version"] == 1
    assert bundle["review_required"] is True
    assert bundle["approved_for_public_use"] is False
    assert bundle["public_data_changed"] is False
    assert bundle["cas_number"] == "62-53-3"
    assert bundle["name_zh"] == "\u82ef\u80fa"


def test_discovers_local_dictionary_chinese_name_candidate(tmp_path):
    store = make_store(tmp_path)
    try:
        result = discover_candidates_for_item(
            cas_number="62-53-3",
            name_en="Aniline",
            store=store,
            sources=("local",),
        )

        assert result["status"] == "candidate_found"
        assert result["candidateCount"] == 1
        assert result["candidates"][0]["name_zh"] == "\u82ef\u80fa"
        assert result["suggestedAdminUpdate"]["status"] == "candidate_found"
    finally:
        store.close()


def test_resolves_local_name_to_cas_for_unresolved_search_candidate(tmp_path):
    store = make_store(tmp_path)
    try:
        result = discover_candidates_for_item(
            query_text="Aniline",
            store=store,
            sources=("local",),
        )

        assert result["casNumber"] == "62-53-3"
        assert result["candidateCount"] == 1
        assert result["candidates"][0]["query_text"] == "Aniline"
        assert result["candidates"][0]["name_zh"] == "\u82ef\u80fa"
    finally:
        store.close()


def test_resolves_local_chinese_name_to_cas():
    assert resolve_local_cas_from_name("\u82ef\u80fa") == "62-53-3"


def test_cli_supports_query_only_discovery(tmp_path):
    completed = subprocess.run(
        [
            sys.executable,
            "scripts/discover_candidates.py",
            "--db-path",
            str(tmp_path / "pilot.db"),
            "--query",
            "Aniline",
            "--sources",
            "local",
        ],
        cwd=Path(__file__).parent,
        check=True,
        capture_output=True,
        text=True,
    )
    payload = json.loads(completed.stdout)

    assert payload["dryRun"] is True
    assert payload["items"][0]["casNumber"] == "62-53-3"
    assert payload["items"][0]["candidates"][0]["name_zh"] == "\u82ef\u80fa"


def test_discovers_approved_manual_candidate_but_ignores_pending(tmp_path):
    store = make_store(tmp_path)
    try:
        store.upsert_dictionary_entry(
            "123-45-6",
            name_en="Reviewed Solvent",
            name_zh="\u5be9\u6838\u6eb6\u5291",
            status="approved",
        )
        store.upsert_dictionary_entry(
            "234-56-7",
            name_en="Pending Solvent",
            name_zh="\u5f85\u5be9\u6eb6\u5291",
            status="pending",
        )

        approved = discover_candidates_for_item(
            cas_number="123-45-6",
            store=store,
            sources=("manual",),
        )
        pending = discover_candidates_for_item(
            cas_number="234-56-7",
            store=store,
            sources=("manual",),
        )

        assert approved["candidateCount"] == 1
        assert approved["candidates"][0]["evidence_type"] == "Approved manual dictionary entry"
        assert pending["candidateCount"] == 0
    finally:
        store.close()


def test_fetches_wikidata_candidates_from_mock_response():
    payload = {
        "results": {
            "bindings": [
                {
                    "item": {"value": "https://www.wikidata.org/wiki/Q153"},
                    "itemLabel": {"value": "Ethanol"},
                    "zhLabel": {"value": "\u4e59\u9187", "xml:lang": "zh"},
                },
                {
                    "item": {"value": "https://www.wikidata.org/wiki/Q999"},
                    "itemLabel": {"value": "English only"},
                    "zhLabel": {"value": "English only", "xml:lang": "en"},
                },
            ]
        }
    }

    def fake_opener(request, timeout):
        assert "query.wikidata.org" in request.full_url
        assert timeout == 12
        return json.dumps(payload).encode("utf-8")

    candidates = fetch_wikidata_chinese_name_candidates(
        "64-17-5",
        opener=fake_opener,
    )

    assert candidates == [
        {
            "name_zh": "\u4e59\u9187",
            "name_en": "Ethanol",
            "evidence_url": "https://www.wikidata.org/wiki/Q153",
            "evidence_type": "Wikidata zh label",
        }
    ]


def test_wikidata_candidates_are_deduped_by_item_url(tmp_path):
    payload = {
        "results": {
            "bindings": [
                {
                    "item": {"value": "http://www.wikidata.org/entity/Q153"},
                    "itemLabel": {"value": "Ethanol"},
                    "zhLabel": {"value": "\u4e59\u9187", "xml:lang": "zh"},
                },
                {
                    "item": {"value": "http://www.wikidata.org/entity/Q153"},
                    "itemLabel": {"value": "Ethanol"},
                    "zhLabel": {"value": "\u4e59\u9187", "xml:lang": "zh-hant"},
                },
            ]
        }
    }

    def fake_opener(request, timeout):
        return json.dumps(payload).encode("utf-8")

    store = make_store(tmp_path)
    try:
        result = discover_candidates_for_item(
            cas_number="64-17-5",
            store=store,
            sources=("wikidata",),
            wikidata_opener=fake_opener,
        )

        assert result["candidateCount"] == 1
        assert result["candidates"][0]["evidence_url"] == "https://www.wikidata.org/wiki/Q153"
    finally:
        store.close()


def test_normalizes_wikidata_entity_url_to_https_wiki_page():
    assert (
        normalize_wikidata_item_url("http://www.wikidata.org/entity/Q153")
        == "https://www.wikidata.org/wiki/Q153"
    )


def test_discovers_candidates_from_correction_requests_without_writes(tmp_path):
    store = make_store(tmp_path)
    try:
        request = store.record_correction_request(
            issue_type="missing-chinese-name",
            cas_number="62-53-3",
            chemical_name="Aniline",
            current_output="Chinese name is missing.",
            expected_output="Review Chinese name.",
        )
        ignored = store.record_correction_request(
            issue_type="source-conflict",
            cas_number="7647-01-0",
        )

        report = discover_candidates_from_correction_requests(
            store,
            sources=("local",),
        )
        still_open = store._fetch_correction_request_by_id(request["id"])

        assert report["dryRun"] is True
        assert report["publicDataChanged"] is False
        assert report["summary"]["checked"] == 1
        assert report["summary"]["candidateCount"] == 1
        assert report["summary"]["itemsWithCandidates"] == 1
        assert report["summary"]["itemsWithoutCandidates"] == 0
        assert report["summary"]["statusCounts"] == {"candidate_found": 1}
        assert report["summary"]["evidenceTypeCounts"] == {"Local seed dictionary": 1}
        assert report["items"][0]["requestId"] == request["id"]
        assert report["items"][0]["suggestedAdminUpdate"]["candidate"]["name_zh"] == "\u82ef\u80fa"
        assert report["skipped"] == [{"id": ignored["id"], "reason": "unsupported_issue_type"}]
        assert still_open["status"] == "open"
        assert still_open["candidate"] == {}
    finally:
        store.close()
