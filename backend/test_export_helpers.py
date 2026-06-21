from export_helpers import _build_export_pilot_summary, build_export_data_row


def test_text_only_ghs_export_row_is_not_printable():
    row = build_export_data_row(
        {
            "cas_number": "100-00-5",
            "name_en": "Text-only GHS sample",
            "name_zh": "文字型 GHS 樣品",
            "found": True,
            "ghs_pictograms": [],
            "hazard_statements": [
                {"code": "H302", "text_en": "Harmful if swallowed."},
            ],
            "precautionary_statements": [
                {"code": "P264", "text_en": "Wash hands thoroughly after handling."},
            ],
            "signal_word": "Warning",
        }
    )

    printable_index = 8
    needs_review_index = 9
    review_reasons_index = 10
    primary_action_index = 12
    assert row[printable_index] == "No"
    assert row[needs_review_index] == "Yes"
    assert "GHS pictogram gap" in row[review_reasons_index]
    assert row[primary_action_index] == "Review pictogram evidence"


def test_text_only_ghs_pilot_summary_excludes_printable_rows():
    summary_rows = _build_export_pilot_summary(
        [
            {
                "cas_number": "100-00-5",
                "name_en": "Text-only GHS sample",
                "found": True,
                "ghs_pictograms": [],
                "hazard_statements": [
                    {"code": "H302", "text_en": "Harmful if swallowed."},
                ],
                "signal_word": "Warning",
            }
        ]
    )
    values = {metric: value for metric, value, _description in summary_rows}

    assert values["Printable rows"] == 0
    assert values["Needs review rows"] == 1
    assert values["Text-only GHS without pictograms"] == 1
