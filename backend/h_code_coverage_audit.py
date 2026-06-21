from __future__ import annotations

from typing import Any, Iterable

from h_code_translations import H_CODE_MISSING_TEXT_ZH, H_CODE_TRANSLATIONS


def parse_cas_values(values: list[str]) -> list[str]:
    parsed: list[str] = []
    for value in values:
        for part in str(value or "").replace("\n", ",").split(","):
            text = part.strip()
            if text:
                parsed.append(text)
    return parsed


def normalize_results_payload(payload: Any) -> list[dict[str, Any]]:
    if isinstance(payload, list):
        return [item for item in payload if isinstance(item, dict)]
    if isinstance(payload, dict):
        results = payload.get("results")
        if isinstance(results, list):
            return [item for item in results if isinstance(item, dict)]
        if "cas_number" in payload or "casNumber" in payload:
            return [payload]
    raise ValueError("Expected a ChemicalResult object, a list, or an object with results.")


def is_placeholder_wording(value: Any) -> bool:
    return str(value or "").strip() == H_CODE_MISSING_TEXT_ZH


def _dictionary_has_wording(code: str, dictionary: dict[str, str]) -> bool:
    return code in dictionary and bool(str(dictionary.get(code) or "").strip())


def _iter_statement_scopes(
    result: dict[str, Any],
) -> Iterable[tuple[str, list[dict[str, Any]]]]:
    yield "primary", result.get("hazard_statements") or []
    for index, classification in enumerate(result.get("other_classifications") or []):
        yield (
            f"other_classifications[{index}]",
            classification.get("hazard_statements") or [],
        )


def audit_h_code_coverage(
    results: list[dict[str, Any]],
    *,
    chinese_texts: dict[str, str] | None = None,
    min_unique_code_count: int = 0,
) -> dict[str, Any]:
    chinese_dictionary = chinese_texts if chinese_texts is not None else H_CODE_TRANSLATIONS

    found_count = 0
    seen_codes: set[str] = set()
    placeholder_payload_gaps: list[dict[str, Any]] = []
    missing_payload_text_gaps: list[dict[str, Any]] = []
    payload_shape_gaps: list[dict[str, Any]] = []

    for result in results:
        if result.get("found"):
            found_count += 1
        cas_number = str(result.get("cas_number") or result.get("casNumber") or "").strip()
        if result.get("found") and "hazard_statements" not in result:
            payload_shape_gaps.append(
                {
                    "casNumber": cas_number,
                    "scope": "primary",
                    "missingField": "hazard_statements",
                }
            )
        for index, classification in enumerate(result.get("other_classifications") or []):
            if isinstance(classification, dict) and "hazard_statements" not in classification:
                payload_shape_gaps.append(
                    {
                        "casNumber": cas_number,
                        "scope": f"other_classifications[{index}]",
                        "missingField": "hazard_statements",
                    }
                )

        for scope, statements in _iter_statement_scopes(result):
            for statement in statements:
                code = str(statement.get("code") or "").strip()
                if not code:
                    continue
                seen_codes.add(code)
                placeholder_fields = [
                    field
                    for field in ("text_zh",)
                    if is_placeholder_wording(statement.get(field))
                ]
                missing_text_fields = [
                    field
                    for field in ("text_en", "text_zh")
                    if not str(statement.get(field) or "").strip()
                ]
                if placeholder_fields:
                    placeholder_payload_gaps.append(
                        {
                            "casNumber": cas_number,
                            "scope": scope,
                            "code": code,
                            "fields": placeholder_fields,
                        }
                    )
                if missing_text_fields:
                    missing_payload_text_gaps.append(
                        {
                            "casNumber": cas_number,
                            "scope": scope,
                            "code": code,
                            "fields": missing_text_fields,
                        }
                    )

    unique_codes = sorted(seen_codes)
    missing_chinese = [
        code for code in unique_codes if not _dictionary_has_wording(code, chinese_dictionary)
    ]
    covered_codes = [code for code in unique_codes if code not in missing_chinese]
    coverage_floor_gap = found_count > 0 and len(unique_codes) < max(0, int(min_unique_code_count))
    blocked = bool(
        missing_chinese
        or placeholder_payload_gaps
        or missing_payload_text_gaps
        or payload_shape_gaps
        or coverage_floor_gap
    )

    return {
        "summary": {
            "resultCount": len(results),
            "foundResultCount": found_count,
            "uniqueHCodeCount": len(unique_codes),
            "missingChineseCount": len(missing_chinese),
            "placeholderPayloadCount": len(placeholder_payload_gaps),
            "missingPayloadTextCount": len(missing_payload_text_gaps),
            "payloadShapeGapCount": len(payload_shape_gaps),
            "coverageFloorGap": coverage_floor_gap,
            "minUniqueHCodeCount": max(0, int(min_unique_code_count)),
            "blockedForCompleteLabels": blocked,
        },
        "uniqueCodes": unique_codes,
        "coveredCodes": covered_codes,
        "missingChineseCodes": missing_chinese,
        "placeholderPayload": placeholder_payload_gaps,
        "missingPayloadText": missing_payload_text_gaps,
        "payloadShapeGaps": payload_shape_gaps,
    }
