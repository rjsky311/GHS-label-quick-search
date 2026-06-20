from __future__ import annotations

from typing import Any, Iterable

from p_code_translations import P_CODE_TEXTS_EN, P_CODE_TRANSLATIONS


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


def is_code_only_wording(code: str, value: Any) -> bool:
    text = str(value or "").strip()
    return bool(code) and text == code


def _dictionary_has_wording(code: str, dictionary: dict[str, str]) -> bool:
    return code in dictionary and not is_code_only_wording(code, dictionary.get(code))


def _iter_statement_scopes(
    result: dict[str, Any],
) -> Iterable[tuple[str, list[dict[str, Any]]]]:
    yield "primary", result.get("precautionary_statements") or []
    for index, classification in enumerate(result.get("other_classifications") or []):
        yield (
            f"other_classifications[{index}]",
            classification.get("precautionary_statements") or [],
        )


def audit_p_code_coverage(
    results: list[dict[str, Any]],
    *,
    english_texts: dict[str, str] | None = None,
    chinese_texts: dict[str, str] | None = None,
) -> dict[str, Any]:
    english_dictionary = english_texts if english_texts is not None else P_CODE_TEXTS_EN
    chinese_dictionary = chinese_texts if chinese_texts is not None else P_CODE_TRANSLATIONS

    found_count = 0
    seen_codes: set[str] = set()
    code_payload_gaps: list[dict[str, Any]] = []

    for result in results:
        if result.get("found"):
            found_count += 1
        cas_number = str(result.get("cas_number") or result.get("casNumber") or "").strip()

        for scope, statements in _iter_statement_scopes(result):
            for statement in statements:
                code = str(statement.get("code") or "").strip()
                if not code:
                    continue
                seen_codes.add(code)
                code_only_fields = [
                    field
                    for field in ("text_en", "text_zh")
                    if is_code_only_wording(code, statement.get(field))
                ]
                if code_only_fields:
                    code_payload_gaps.append(
                        {
                            "casNumber": cas_number,
                            "scope": scope,
                            "code": code,
                            "fields": code_only_fields,
                        }
                    )

    unique_codes = sorted(seen_codes)
    missing_english = [
        code for code in unique_codes if not _dictionary_has_wording(code, english_dictionary)
    ]
    missing_chinese = [
        code for code in unique_codes if not _dictionary_has_wording(code, chinese_dictionary)
    ]
    covered_codes = [
        code
        for code in unique_codes
        if code not in missing_english and code not in missing_chinese
    ]
    blocked = bool(missing_english or missing_chinese or code_payload_gaps)

    return {
        "summary": {
            "resultCount": len(results),
            "foundResultCount": found_count,
            "uniquePCodeCount": len(unique_codes),
            "missingEnglishCount": len(missing_english),
            "missingChineseCount": len(missing_chinese),
            "codeOnlyPayloadCount": len(code_payload_gaps),
            "blockedForCompleteLabels": blocked,
        },
        "uniqueCodes": unique_codes,
        "coveredCodes": covered_codes,
        "missingEnglishCodes": missing_english,
        "missingChineseCodes": missing_chinese,
        "codeOnlyPayload": code_payload_gaps,
    }
