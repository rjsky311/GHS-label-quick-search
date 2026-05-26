from __future__ import annotations

import json
import re
import urllib.error
import urllib.parse
import urllib.request
from datetime import datetime, timezone
from typing import Any, Callable, Iterable, Optional

from chemical_dict import CAS_TO_EN, CAS_TO_ZH, EN_TO_CAS, ZH_TO_CAS
from pilot_store import PilotStore

DRY_RUN_SOURCE = "candidate-discovery-dry-run"
SUPPORTED_CANDIDATE_ISSUES = {"missing-chinese-name", "unresolved-search"}
SUPPORTED_CANDIDATE_SOURCES = ("manual", "local", "wikidata")
DEFAULT_SOURCE_ORDER = ("manual", "local")
_CJK_RE = re.compile(r"[\u4e00-\u9fff]")
_CAS_RE = re.compile(r"\b\d{2,7}-\d{2}-\d\b")
_UNSAFE_TEXT_RE = re.compile(r"\x00")


def utc_now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def has_cjk(value: Optional[str]) -> bool:
    return bool(value and _CJK_RE.search(value))


def normalize_cas(value: Optional[str]) -> str:
    text = (value or "").strip()
    match = _CAS_RE.search(text)
    return match.group(0) if match else text


def first_cas_from_text(*values: Optional[str]) -> str:
    for value in values:
        match = _CAS_RE.search(value or "")
        if match:
            return match.group(0)
    return ""


def resolve_local_cas_from_name(*values: Optional[str]) -> str:
    for value in values:
        text = clean_text(value, max_length=240)
        if not text:
            continue
        zh_match = ZH_TO_CAS.get(text)
        if zh_match:
            return zh_match
        en_match = EN_TO_CAS.get(text.lower())
        if en_match:
            return en_match
    return ""


def clean_text(value: Optional[str], *, max_length: int = 1000) -> str:
    return _UNSAFE_TEXT_RE.sub("", (value or "").strip())[:max_length]


def normalize_wikidata_item_url(value: str) -> str:
    text = clean_text(value, max_length=2048)
    parsed = urllib.parse.urlparse(text)
    if parsed.netloc != "www.wikidata.org":
        return text
    item_id = parsed.path.rstrip("/").split("/")[-1]
    if not re.fullmatch(r"Q\d+", item_id or ""):
        return text
    return f"https://www.wikidata.org/wiki/{item_id}"


def build_candidate_bundle(
    *,
    candidate_type: str,
    cas_number: str = "",
    name_en: str = "",
    name_zh: str = "",
    query_text: str = "",
    evidence_type: str,
    evidence_url: str = "",
    review_notes: str = "",
    source: str = DRY_RUN_SOURCE,
) -> dict[str, Any]:
    bundle = {
        "schema_version": 1,
        "review_required": True,
        "approved_for_public_use": False,
        "public_data_changed": False,
        "source": clean_text(source, max_length=80),
        "candidate_type": clean_text(candidate_type, max_length=80),
        "issue_type": clean_text(candidate_type, max_length=80),
        "evidence_type": clean_text(evidence_type, max_length=160),
        "review_notes": clean_text(
            review_notes
            or "Dry-run candidate only; verify against SDS, supplier label, or authoritative local source before approval.",
            max_length=1000,
        ),
    }
    optional_fields = {
        "cas_number": clean_text(normalize_cas(cas_number), max_length=32),
        "name_en": clean_text(name_en, max_length=240),
        "name_zh": clean_text(name_zh, max_length=240),
        "query_text": clean_text(query_text, max_length=240),
        "evidence_url": clean_text(evidence_url, max_length=2048),
    }
    for key, value in optional_fields.items():
        if value:
            bundle[key] = value
    return bundle


def _dedupe_candidates(candidates: Iterable[dict[str, Any]]) -> list[dict[str, Any]]:
    seen: set[tuple[str, str]] = set()
    result: list[dict[str, Any]] = []
    for candidate in candidates:
        key = (
            candidate.get("name_zh", ""),
            candidate.get("evidence_url") or candidate.get("evidence_type", ""),
        )
        if key in seen:
            continue
        seen.add(key)
        result.append(candidate)
    return result


def _local_dictionary_candidate(
    *,
    cas_number: str,
    name_en: str = "",
    query_text: str = "",
) -> Optional[dict[str, Any]]:
    name_zh = CAS_TO_ZH.get(cas_number, "")
    if not has_cjk(name_zh):
        return None
    return build_candidate_bundle(
        candidate_type="missing-chinese-name",
        cas_number=cas_number,
        name_en=name_en or CAS_TO_EN.get(cas_number, ""),
        name_zh=name_zh,
        query_text=query_text,
        evidence_type="Local seed dictionary",
        review_notes=(
            "Existing local seed dictionary candidate. Treat as current project baseline, "
            "but verify source evidence before creating or approving a manual entry."
        ),
        source=DRY_RUN_SOURCE,
    )


def _approved_manual_candidate(
    store: Optional[PilotStore],
    *,
    cas_number: str,
    name_en: str = "",
    query_text: str = "",
) -> Optional[dict[str, Any]]:
    if store is None or not cas_number:
        return None
    record = store.get_manual_entry_by_cas(cas_number)
    if not record or not has_cjk(record.get("name_zh")):
        return None
    return build_candidate_bundle(
        candidate_type="missing-chinese-name",
        cas_number=cas_number,
        name_en=name_en or record.get("name_en") or CAS_TO_EN.get(cas_number, ""),
        name_zh=record.get("name_zh") or "",
        query_text=query_text,
        evidence_type="Approved manual dictionary entry",
        review_notes=(
            "Approved manual dictionary entry already exists. If a correction request still "
            "reports a missing Chinese name, inspect whether public lookup is using the same CAS."
        ),
        source=DRY_RUN_SOURCE,
    )


def fetch_wikidata_chinese_name_candidates(
    cas_number: str,
    *,
    timeout: float = 12,
    opener: Optional[Callable[[urllib.request.Request, float], bytes]] = None,
) -> list[dict[str, str]]:
    cas_number = normalize_cas(cas_number)
    if not cas_number:
        return []
    query = f"""
SELECT ?item ?itemLabel ?zhLabel WHERE {{
  ?item wdt:P231 "{cas_number}".
  OPTIONAL {{
    ?item rdfs:label ?zhLabel.
    FILTER(LANG(?zhLabel) IN ("zh", "zh-tw", "zh-hant"))
  }}
  SERVICE wikibase:label {{ bd:serviceParam wikibase:language "en". }}
}}
LIMIT 20
"""
    params = urllib.parse.urlencode(
        {
            "query": query,
            "format": "json",
        }
    )
    request = urllib.request.Request(
        f"https://query.wikidata.org/sparql?{params}",
        headers={
            "accept": "application/sparql-results+json",
            "user-agent": "GHS-label-quick-search candidate-discovery dry-run",
        },
    )
    fetch = opener or (lambda req, wait: urllib.request.urlopen(req, timeout=wait).read())
    try:
        payload = json.loads(fetch(request, timeout).decode("utf-8"))
    except (urllib.error.URLError, TimeoutError, json.JSONDecodeError):
        return []

    candidates: list[dict[str, str]] = []
    for binding in payload.get("results", {}).get("bindings", []):
        name_zh = binding.get("zhLabel", {}).get("value", "")
        if not has_cjk(name_zh):
            continue
        item_url = normalize_wikidata_item_url(binding.get("item", {}).get("value", ""))
        name_en = binding.get("itemLabel", {}).get("value", "")
        lang = binding.get("zhLabel", {}).get("xml:lang", "zh")
        candidates.append(
            {
                "name_zh": name_zh,
                "name_en": name_en,
                "evidence_url": item_url,
                "evidence_type": f"Wikidata {lang} label",
            }
        )
    return candidates


def discover_candidates_for_item(
    *,
    cas_number: str = "",
    name_en: str = "",
    query_text: str = "",
    store: Optional[PilotStore] = None,
    sources: Iterable[str] = DEFAULT_SOURCE_ORDER,
    wikidata_opener: Optional[Callable[[urllib.request.Request, float], bytes]] = None,
) -> dict[str, Any]:
    normalized_sources = tuple(source.strip().lower() for source in sources if source.strip())
    normalized_cas = normalize_cas(cas_number) or first_cas_from_text(query_text, name_en)
    if not normalized_cas and "local" in normalized_sources:
        normalized_cas = resolve_local_cas_from_name(name_en, query_text)
    candidates: list[dict[str, Any]] = []

    if "manual" in normalized_sources:
        candidate = _approved_manual_candidate(
            store,
            cas_number=normalized_cas,
            name_en=name_en,
            query_text=query_text,
        )
        if candidate:
            candidates.append(candidate)

    if "local" in normalized_sources:
        candidate = _local_dictionary_candidate(
            cas_number=normalized_cas,
            name_en=name_en,
            query_text=query_text,
        )
        if candidate:
            candidates.append(candidate)

    if "wikidata" in normalized_sources and normalized_cas:
        for item in fetch_wikidata_chinese_name_candidates(
            normalized_cas,
            opener=wikidata_opener,
        ):
            candidates.append(
                build_candidate_bundle(
                    candidate_type="missing-chinese-name",
                    cas_number=normalized_cas,
                    name_en=name_en or item.get("name_en", ""),
                    name_zh=item.get("name_zh", ""),
                    query_text=query_text,
                    evidence_type=item.get("evidence_type", "Wikidata label"),
                    evidence_url=item.get("evidence_url", ""),
                    review_notes=(
                        "Wikidata candidate only. Verify against SDS, supplier label, "
                        "or authoritative local source before approval."
                    ),
                    source=DRY_RUN_SOURCE,
                )
            )

    candidates = _dedupe_candidates(candidates)
    return {
        "casNumber": normalized_cas,
        "nameEn": clean_text(name_en, max_length=240),
        "queryText": clean_text(query_text, max_length=240),
        "status": "candidate_found" if candidates else "no_candidate",
        "candidateCount": len(candidates),
        "candidates": candidates,
        "suggestedAdminUpdate": (
            {"status": "candidate_found", "candidate": candidates[0]}
            if candidates
            else None
        ),
    }


def discover_candidates_from_correction_requests(
    store: PilotStore,
    *,
    statuses: Iterable[str] = ("open", "candidate_found"),
    sources: Iterable[str] = DEFAULT_SOURCE_ORDER,
    limit: int = 100,
    wikidata_opener: Optional[Callable[[urllib.request.Request, float], bytes]] = None,
) -> dict[str, Any]:
    requests = store.list_correction_requests(
        statuses=statuses,
        include_context=True,
        limit=limit,
    )
    items: list[dict[str, Any]] = []
    skipped: list[dict[str, Any]] = []
    for request in requests:
        issue_type = request.get("issueType") or request.get("issue_type") or ""
        if issue_type not in SUPPORTED_CANDIDATE_ISSUES:
            skipped.append({"id": request.get("id"), "reason": "unsupported_issue_type"})
            continue
        cas_number = request.get("casNumber") or first_cas_from_text(
            request.get("queryText"),
            request.get("chemicalName"),
            request.get("currentOutput"),
            request.get("expectedOutput"),
        )
        discovery = discover_candidates_for_item(
            cas_number=cas_number,
            name_en=request.get("chemicalName") or "",
            query_text=request.get("queryText") or "",
            store=store,
            sources=sources,
            wikidata_opener=wikidata_opener,
        )
        items.append(
            {
                "requestId": request.get("id"),
                "issueType": issue_type,
                "requestStatus": request.get("status"),
                **discovery,
            }
        )

    return build_discovery_report(items, skipped=skipped, sources=sources)


def build_discovery_report(
    items: list[dict[str, Any]],
    *,
    skipped: Optional[list[dict[str, Any]]] = None,
    sources: Iterable[str] = DEFAULT_SOURCE_ORDER,
) -> dict[str, Any]:
    candidate_count = sum(int(item.get("candidateCount") or 0) for item in items)
    status_counts: dict[str, int] = {}
    evidence_type_counts: dict[str, int] = {}
    for item in items:
        status = clean_text(str(item.get("status") or "unknown"), max_length=80)
        status_counts[status] = status_counts.get(status, 0) + 1
        for candidate in item.get("candidates") or []:
            evidence_type = clean_text(
                str(candidate.get("evidence_type") or "unknown"),
                max_length=160,
            )
            evidence_type_counts[evidence_type] = (
                evidence_type_counts.get(evidence_type, 0) + 1
            )
    return {
        "ok": True,
        "dryRun": True,
        "reviewRequired": True,
        "publicDataChanged": False,
        "generatedAt": utc_now_iso(),
        "sourceOrder": list(sources),
        "summary": {
            "checked": len(items),
            "candidateCount": candidate_count,
            "itemsWithCandidates": sum(1 for item in items if item.get("candidateCount")),
            "itemsWithoutCandidates": sum(
                1 for item in items if not item.get("candidateCount")
            ),
            "statusCounts": status_counts,
            "evidenceTypeCounts": evidence_type_counts,
            "skipped": len(skipped or []),
        },
        "items": items,
        "skipped": skipped or [],
    }
