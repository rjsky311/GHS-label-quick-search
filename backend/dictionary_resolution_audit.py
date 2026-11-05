"""Check what the site shows for every CAS the dictionary can lead to.

Run before a release that touches lookup, the dictionary or labels:

    python scripts/audit_dictionary_resolution.py OUT_DIR

It runs the site's own search against PubChem, so it cannot disagree with the
site about which record a CAS uses. Only reads PubChem. Resumes from OUT_DIR.

A row needs a person when hazard data is shown and either:

- the record does not list the CAS: the depositors may have linked the wrong
  compound (activated carbon to methane), or
- the report behind the main classification names something the record does not
  list: it may be about another substance (glucose oxidase's H334 on D-glucose).

Wrong reports among the other classifications are counted, not flagged: a label
carries the main one unless the user picks another.

Reviewed rows live in reviewed_cas_resolutions.py when the record was wrong, and
in dictionary_audit_reviewed.py when the record is right despite what this flags.
It also compares common reagents with what was reviewed, because PubChem's data
changes over time.

Exit code 0 means nothing new needs a person.
"""

from __future__ import annotations

import argparse
import asyncio
import json
import logging
import re
import sys
from pathlib import Path
from typing import Any, Dict, Iterable, List, Optional

import httpx

from chemical_dict import ALIASES_EN, ALIASES_ZH, CAS_TO_EN, EN_TO_CAS, ZH_TO_CAS
from dictionary_audit_reviewed import COMMON_REAGENTS, REVIEWED_AUDIT_ROWS
from reviewed_cas_resolutions import REVIEWED_CAS_RESOLUTIONS
from substance_scope_notes import SUBSTANCE_SCOPE_NOTES

ROWS_FILENAME = "rows.jsonl"
REPORT_FILENAME = "report.json"

_EC_NUMBER_RE = re.compile(r"\b(\d{3}-\d{3}-\d)\b")
_REPORT_NAME_SUFFIX_RE = re.compile(r"\s*(\(EC: [^)]*\)|- FY\d{4}.*|…%|\.\.\. ?%)\s*$")
_NON_ALNUM_RE = re.compile(r"[^a-z0-9]+")
_HAZARD_CODE_RE = re.compile(r"H\d{3}[a-zA-Z]*")


def dictionary_cas_numbers() -> List[str]:
    """Every CAS a name, an alias or a scope note can lead to."""
    return sorted(
        set(CAS_TO_EN)
        | set(EN_TO_CAS.values())
        | set(ZH_TO_CAS.values())
        | set(ALIASES_EN.values())
        | set(ALIASES_ZH.values())
        | set(SUBSTANCE_SCOPE_NOTES)
    )


def normalize_name(name: Optional[str]) -> str:
    return _NON_ALNUM_RE.sub("", (name or "").lower())


def hazard_reports(ghs_data: Dict[str, Any]) -> List[Dict[str, Any]]:
    """Source, name and H codes of each report behind a PubChem record's GHS data."""
    record = (ghs_data or {}).get("Record") or {}
    references = {ref.get("ReferenceNumber"): ref for ref in record.get("Reference") or []}
    reports: List[Dict[str, Any]] = []

    def walk(section: Dict[str, Any], inside: bool) -> None:
        inside = inside or section.get("TOCHeading") == "GHS Classification"
        for child in section.get("Section") or []:
            walk(child, inside)
        if not inside:
            return
        for info in section.get("Information") or []:
            if info.get("Name") != "GHS Hazard Statements":
                continue
            reference = references.get(info.get("ReferenceNumber"), {})
            markups = (info.get("Value") or {}).get("StringWithMarkup") or []
            text = " ".join(markup.get("String", "") for markup in markups)
            reports.append(
                {
                    "source": reference.get("SourceName"),
                    "name": reference.get("Name"),
                    "codes": sorted(set(_HAZARD_CODE_RE.findall(text))),
                }
            )

    walk(record, False)
    return reports


def main_report_names(reports: List[Dict[str, Any]], hazards: Iterable[str]) -> List[Optional[str]]:
    """Names of the reports the main classification can have come from.

    The parser does not keep a report's name, so this matches on H codes. When
    none matches, every report counts, which can only flag more.
    """
    shown = set(hazards)
    matching = [report["name"] for report in reports if set(report["codes"]) == shown]
    return matching or [report["name"] for report in reports]


def report_is_on_record(report_name: Optional[str], synonyms: Iterable[str], title: Optional[str]) -> bool:
    """True if the record lists the report's EC number or its name."""
    if not report_name:
        return True
    listed = {normalize_name(item) for item in synonyms}
    listed.add(normalize_name(title))
    for ec_number in _EC_NUMBER_RE.findall(report_name):
        if normalize_name(ec_number) in listed or normalize_name(f"EC {ec_number}") in listed:
            return True
    name = _REPORT_NAME_SUFFIX_RE.sub("", report_name).strip()
    if normalize_name(name) in listed:
        return True
    # "ethanediol; ethylene glycol" lists names one by one.
    return any(normalize_name(part) in listed for part in name.split(";") if part.strip())


def review_reasons(row: Dict[str, Any]) -> List[str]:
    """Why a row needs a person, on the data the site would show."""
    if row.get("upstream_error"):
        return ["PubChem did not answer; run again"]
    if not (row.get("pictograms") or row.get("hazards")):
        return []
    reasons: List[str] = []
    synonyms = row.get("synonyms") or []
    if row["cas"] not in synonyms:
        reasons.append(f"record {row['cid']} ({row.get('title')}) does not list this CAS")
    synonyms_and_title = (synonyms, row.get("title"))
    reports = row.get("reports") or []
    off_record = [
        name
        for name in main_report_names(reports, row.get("hazards") or [])
        if not report_is_on_record(name, *synonyms_and_title)
    ]
    # Several reports can match, and one on the record is enough.
    if off_record and len(off_record) == len(main_report_names(reports, row.get("hazards") or [])):
        reasons.append("the main classification's report names something else: " + "; ".join(off_record[:3]))
    return reasons


def other_reports_off_record(row: Dict[str, Any]) -> List[str]:
    """Reports not behind the main classification that name something else."""
    main = set(main_report_names(row.get("reports") or [], row.get("hazards") or []))
    return [
        report["name"]
        for report in row.get("reports") or []
        if report["name"] not in main
        and not report_is_on_record(report["name"], row.get("synonyms") or [], row.get("title"))
    ]


def build_report(rows: Iterable[Dict[str, Any]]) -> Dict[str, Any]:
    by_cas = {row["cas"]: row for row in rows}
    needs_person = []
    reviewed = []
    for cas, row in sorted(by_cas.items()):
        reasons = review_reasons(row)
        if not reasons:
            continue
        item = {
            "cas": cas,
            "name": row.get("name_en"),
            "cid": row.get("cid"),
            "pictograms": row.get("pictograms"),
            "reasons": reasons,
        }
        accepted = REVIEWED_AUDIT_ROWS.get(cas)
        if accepted and accepted["cid"] == row.get("cid"):
            reviewed.append({**item, "note": accepted["note"]})
        else:
            needs_person.append(item)

    reagent_changes = []
    for cas, expected in sorted(COMMON_REAGENTS.items()):
        row = by_cas.get(cas, {})
        shown = {"cid": row.get("cid"), "pictograms": row.get("pictograms")}
        if shown != {"cid": expected["cid"], "pictograms": expected["pictograms"]}:
            reagent_changes.append({"cas": cas, "name": expected["name"], "reviewed": expected, "now": shown})

    stale = sorted(
        cas
        for cas, accepted in REVIEWED_AUDIT_ROWS.items()
        if by_cas.get(cas, {}).get("cid") != accepted["cid"]
    )
    return {
        "total": len(by_cas),
        "withHazardData": sum(1 for row in by_cas.values() if row.get("pictograms") or row.get("hazards")),
        "reviewedResolutions": len(REVIEWED_CAS_RESOLUTIONS),
        "rowsWithOtherReportsOffRecord": sum(1 for row in by_cas.values() if other_reports_off_record(row)),
        "needsPerson": needs_person,
        "reviewed": reviewed,
        "commonReagentChanges": reagent_changes,
        "staleReviewedRows": stale,
    }


def report_passes(report: Dict[str, Any]) -> bool:
    return not (report["needsPerson"] or report["commonReagentChanges"] or report["staleReviewedRows"])


def _code(item: Any) -> str:
    return item["code"] if isinstance(item, dict) else item.code


async def _fetch_synonyms(srv: Any, cid: int, client: httpx.AsyncClient) -> List[str]:
    url = f"https://pubchem.ncbi.nlm.nih.gov/rest/pug/compound/cid/{cid}/synonyms/JSON"
    status, data = await srv.pubchem_get_json(client, url, timeout=20.0)
    if status != 200 or not data:
        return []
    information = data.get("InformationList", {}).get("Information", [{}])
    return information[0].get("Synonym", []) if information else []


async def audit_row(srv: Any, cas: str, client: httpx.AsyncClient) -> Dict[str, Any]:
    result = await srv.search_chemical(cas, client)
    row: Dict[str, Any] = {
        "cas": cas,
        "name_en": result.name_en,
        "name_zh": result.name_zh,
        "cid": result.cid,
        "found": result.found,
        "upstream_error": result.upstream_error,
        "pictograms": sorted(_code(p) for p in result.ghs_pictograms or []),
        "hazards": sorted(_code(h) for h in result.hazard_statements or []),
        "signal": result.signal_word,
        "primary_source": result.primary_source,
        "primary_report_count": result.primary_report_count,
        "other_reports": [
            {"pictograms": sorted(_code(p) for p in o.pictograms or []), "hazards": sorted(_code(h) for h in o.hazard_statements or [])}
            for o in result.other_classifications or []
        ],
    }
    if result.cid and (row["pictograms"] or row["hazards"]):
        ghs_data, _hit, _retrieved = await srv.get_ghs_classification(result.cid, client)
        row["title"] = (ghs_data.get("Record") or {}).get("RecordTitle")
        row["reports"] = hazard_reports(ghs_data)
        row["synonyms"] = await _fetch_synonyms(srv, result.cid, client)
    return row


async def run(out_dir: Path, concurrency: int) -> None:
    import server as srv  # Imported here: it reads the environment on import.

    out_dir.mkdir(parents=True, exist_ok=True)
    rows_path = out_dir / ROWS_FILENAME
    done: Dict[str, Dict[str, Any]] = {}
    if rows_path.exists():
        for line in rows_path.read_text(encoding="utf-8").splitlines():
            row = json.loads(line)
            if not row.get("upstream_error"):
                done[row["cas"]] = row

    gate = asyncio.Semaphore(concurrency)
    todo = [cas for cas in dictionary_cas_numbers() if cas not in done]
    print(f"to run {len(todo)}", flush=True)
    async with httpx.AsyncClient(headers={"User-Agent": "ghs-label-dictionary-audit"}) as client:

        async def one(cas: str) -> None:
            async with gate:
                try:
                    row = await audit_row(srv, cas, client)
                except srv.PubChemError:
                    row = {"cas": cas, "upstream_error": True}
            done[cas] = row
            with rows_path.open("a", encoding="utf-8") as handle:
                handle.write(json.dumps(row, ensure_ascii=False) + "\n")

        await asyncio.gather(*(one(cas) for cas in todo))


def main(argv: Optional[List[str]] = None) -> int:
    parser = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    parser.add_argument("out_dir", type=Path)
    parser.add_argument("--concurrency", type=int, default=2)
    parser.add_argument("--report-only", action="store_true", help="Rebuild the report from existing rows.")
    args = parser.parse_args(argv)
    logging.disable(logging.WARNING)

    if not args.report_only:
        asyncio.run(run(args.out_dir, args.concurrency))

    rows = [
        json.loads(line)
        for line in (args.out_dir / ROWS_FILENAME).read_text(encoding="utf-8").splitlines()
    ]
    report = build_report(rows)
    (args.out_dir / REPORT_FILENAME).write_text(
        json.dumps(report, ensure_ascii=False, indent=2), encoding="utf-8"
    )
    print(
        f"{report['total']} rows, {report['withHazardData']} with hazard data, "
        f"{len(report['needsPerson'])} need a person, "
        f"{len(report['commonReagentChanges'])} common reagents changed, "
        f"{len(report['staleReviewedRows'])} stale reviewed rows"
    )
    return 0 if report_passes(report) else 1


if __name__ == "__main__":
    sys.exit(main())
