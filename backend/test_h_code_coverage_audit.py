from h_code_coverage_audit import (
    audit_h_code_coverage,
    normalize_results_payload,
    parse_cas_values,
)


def test_audit_h_code_coverage_flags_dictionary_and_payload_gaps():
    payload = [
        {
            "cas_number": "67-56-1",
            "found": True,
            "hazard_statements": [
                {
                    "code": "H225",
                    "text_en": "Highly flammable liquid and vapor.",
                    "text_zh": "高度易燃液體和蒸氣",
                },
                {
                    "code": "H999",
                    "text_en": "Future hazard wording.",
                    "text_zh": "尚無完整文字 - 使用前請核對 SDS。",
                },
            ],
            "other_classifications": [
                {
                    "source": "alternate",
                    "hazard_statements": [
                        {
                            "code": "H888",
                            "text_en": "Alternate hazard wording.",
                            "text_zh": "尚無完整文字 - 使用前請核對 SDS。",
                        }
                    ],
                }
            ],
        }
    ]

    report = audit_h_code_coverage(
        payload,
        chinese_texts={"H225": "高度易燃液體和蒸氣"},
    )

    assert report["summary"]["resultCount"] == 1
    assert report["summary"]["foundResultCount"] == 1
    assert report["summary"]["uniqueHCodeCount"] == 3
    assert report["summary"]["missingChineseCount"] == 2
    assert report["summary"]["placeholderPayloadCount"] == 2
    assert report["summary"]["missingPayloadTextCount"] == 0
    assert report["summary"]["blockedForCompleteLabels"] is True
    assert report["uniqueCodes"] == ["H225", "H888", "H999"]
    assert report["missingChineseCodes"] == ["H888", "H999"]
    assert report["coveredCodes"] == ["H225"]
    assert report["placeholderPayload"] == [
        {
            "casNumber": "67-56-1",
            "scope": "primary",
            "code": "H999",
            "fields": ["text_zh"],
        },
        {
            "casNumber": "67-56-1",
            "scope": "other_classifications[0]",
            "code": "H888",
            "fields": ["text_zh"],
        },
    ]
    assert report["missingPayloadText"] == []


def test_audit_h_code_coverage_blocks_missing_payload_text_fields():
    payload = [
        {
            "cas_number": "64-17-5",
            "found": True,
            "hazard_statements": [{"code": "H225"}],
            "other_classifications": [],
        }
    ]

    report = audit_h_code_coverage(
        payload,
        chinese_texts={"H225": "高度易燃液體和蒸氣"},
    )

    assert report["summary"]["missingChineseCount"] == 0
    assert report["summary"]["missingPayloadTextCount"] == 1
    assert report["summary"]["blockedForCompleteLabels"] is True
    assert report["missingPayloadText"] == [
        {
            "casNumber": "64-17-5",
            "scope": "primary",
            "code": "H225",
            "fields": ["text_en", "text_zh"],
        }
    ]


def test_audit_h_code_coverage_passes_when_all_observed_codes_have_wording():
    payload = [
        {
            "cas_number": "67-56-1",
            "found": True,
            "hazard_statements": [
                {
                    "code": "H225",
                    "text_en": "Highly flammable liquid and vapor.",
                    "text_zh": "高度易燃液體和蒸氣",
                }
            ],
            "other_classifications": [
                {
                    "hazard_statements": [
                        {
                            "code": "H360Fd",
                            "text_en": "May damage fertility. Suspected of damaging the unborn child.",
                            "text_zh": "可能損害生育能力，懷疑會損害胎兒",
                        }
                    ]
                }
            ],
        }
    ]

    report = audit_h_code_coverage(
        payload,
        chinese_texts={
            "H225": "高度易燃液體和蒸氣",
            "H360Fd": "可能損害生育能力，懷疑會損害胎兒",
        },
    )

    assert report["summary"]["blockedForCompleteLabels"] is False
    assert report["missingChineseCodes"] == []
    assert report["placeholderPayload"] == []


def test_audit_h_code_coverage_blocks_renamed_hazard_statement_field():
    payload = [
        {
            "cas_number": "64-17-5",
            "found": True,
            "hazardStatements": [
                {
                    "code": "H225",
                    "text_en": "Highly flammable liquid and vapor.",
                    "text_zh": "高度易燃液體和蒸氣",
                }
            ],
        }
    ]

    report = audit_h_code_coverage(
        payload,
        chinese_texts={"H225": "高度易燃液體和蒸氣"},
        min_unique_code_count=1,
    )

    assert report["summary"]["payloadShapeGapCount"] == 1
    assert report["payloadShapeGaps"] == [
        {
            "casNumber": "64-17-5",
            "scope": "primary",
            "missingField": "hazard_statements",
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
    assert parse_cas_values(["67-56-1, 75-21-8", "7647-01-0"]) == [
        "67-56-1",
        "75-21-8",
        "7647-01-0",
    ]
