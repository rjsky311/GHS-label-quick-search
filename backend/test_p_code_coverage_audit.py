from p_code_coverage_audit import (
    audit_p_code_coverage,
    normalize_results_payload,
    parse_cas_values,
)


def test_audit_p_code_coverage_flags_dictionary_and_payload_gaps():
    payload = [
        {
            "cas_number": "111-11-1",
            "found": True,
            "precautionary_statements": [
                {
                    "code": "P210",
                    "text_en": "Keep away from heat.",
                    "text_zh": "遠離熱源。",
                },
                {
                    "code": "P999",
                    "text_en": "P999",
                    "text_zh": "P999",
                },
            ],
            "other_classifications": [
                {
                    "source": "alternate",
                    "precautionary_statements": [
                        {
                            "code": "P888",
                            "text_en": "P888",
                            "text_zh": "Reviewed Chinese wording.",
                        }
                    ],
                }
            ],
        }
    ]

    report = audit_p_code_coverage(
        payload,
        english_texts={"P210": "Keep away from heat."},
        chinese_texts={
            "P210": "遠離熱源。",
            "P888": "Reviewed Chinese wording.",
        },
    )

    assert report["summary"]["resultCount"] == 1
    assert report["summary"]["foundResultCount"] == 1
    assert report["summary"]["uniquePCodeCount"] == 3
    assert report["summary"]["missingEnglishCount"] == 2
    assert report["summary"]["missingChineseCount"] == 1
    assert report["summary"]["codeOnlyPayloadCount"] == 2
    assert report["summary"]["missingPayloadTextCount"] == 0
    assert report["summary"]["blockedForCompleteLabels"] is True
    assert report["uniqueCodes"] == ["P210", "P888", "P999"]
    assert report["missingEnglishCodes"] == ["P888", "P999"]
    assert report["missingChineseCodes"] == ["P999"]
    assert report["coveredCodes"] == ["P210"]
    assert report["codeOnlyPayload"] == [
        {
            "casNumber": "111-11-1",
            "scope": "primary",
            "code": "P999",
            "fields": ["text_en", "text_zh"],
        },
        {
            "casNumber": "111-11-1",
            "scope": "other_classifications[0]",
            "code": "P888",
            "fields": ["text_en"],
        },
    ]
    assert report["missingPayloadText"] == []


def test_audit_p_code_coverage_blocks_missing_payload_text_fields():
    payload = [
        {
            "cas_number": "64-17-5",
            "found": True,
            "precautionary_statements": [{"code": "P210"}],
            "other_classifications": [],
        }
    ]

    report = audit_p_code_coverage(
        payload,
        english_texts={"P210": "Keep away from heat."},
        chinese_texts={"P210": "遠離熱源。"},
    )

    assert report["summary"]["missingEnglishCount"] == 0
    assert report["summary"]["missingChineseCount"] == 0
    assert report["summary"]["missingPayloadTextCount"] == 1
    assert report["summary"]["blockedForCompleteLabels"] is True
    assert report["missingPayloadText"] == [
        {
            "casNumber": "64-17-5",
            "scope": "primary",
            "code": "P210",
            "fields": ["text_en", "text_zh"],
        }
    ]


def test_audit_p_code_coverage_passes_when_all_observed_codes_have_wording():
    payload = [
        {
            "cas_number": "64-17-5",
            "found": True,
            "precautionary_statements": [
                {
                    "code": "P210",
                    "text_en": "Keep away from heat.",
                    "text_zh": "遠離熱源。",
                }
            ],
            "other_classifications": [],
        }
    ]

    report = audit_p_code_coverage(
        payload,
        english_texts={"P210": "Keep away from heat."},
        chinese_texts={"P210": "遠離熱源。"},
    )

    assert report["summary"]["blockedForCompleteLabels"] is False
    assert report["missingEnglishCodes"] == []
    assert report["missingChineseCodes"] == []
    assert report["codeOnlyPayload"] == []


def test_audit_p_code_coverage_blocks_found_result_with_no_p_codes():
    payload = [
        {
            "cas_number": "64-17-5",
            "found": True,
            "ghs_pictograms": [{"code": "GHS02"}],
            "hazard_statements": [{"code": "H225", "text_en": "Flammable."}],
            "precautionary_statements": [],
            "other_classifications": [],
        }
    ]

    report = audit_p_code_coverage(
        payload,
        english_texts={},
        chinese_texts={},
        min_unique_code_count=1,
    )

    assert report["summary"]["foundResultCount"] == 1
    assert report["summary"]["uniquePCodeCount"] == 0
    assert report["summary"]["coverageFloorGap"] is True
    assert report["summary"]["blockedForCompleteLabels"] is True


def test_audit_p_code_coverage_blocks_renamed_precautionary_statement_field():
    payload = [
        {
            "cas_number": "64-17-5",
            "found": True,
            "precautionaryStatements": [
                {"code": "P210", "text_en": "Keep away from heat.", "text_zh": "遠離熱源。"}
            ],
        }
    ]

    report = audit_p_code_coverage(
        payload,
        english_texts={"P210": "Keep away from heat."},
        chinese_texts={"P210": "遠離熱源。"},
        min_unique_code_count=1,
    )

    assert report["summary"]["payloadShapeGapCount"] == 1
    assert report["payloadShapeGaps"] == [
        {
            "casNumber": "64-17-5",
            "scope": "primary",
            "missingField": "precautionary_statements",
        }
    ]
    assert report["summary"]["blockedForCompleteLabels"] is True


def test_normalize_results_payload_accepts_common_api_shapes():
    single = {"cas_number": "64-17-5", "found": True}
    batch = [single, {"cas_number": "7647-01-0", "found": True}]
    wrapped = {"results": batch}

    assert normalize_results_payload(single) == [single]
    assert normalize_results_payload(batch) == batch
    assert normalize_results_payload(wrapped) == batch


def test_parse_cas_values_accepts_commas_and_repeated_arguments():
    assert parse_cas_values(["64-17-5, 7647-01-0", "50-00-0"]) == [
        "64-17-5",
        "7647-01-0",
        "50-00-0",
    ]
