import json

from httpx import ASGITransport, AsyncClient

import server
from api_models import ChemicalResult, GHSReport
from api_validation import MAX_PUBLIC_SEARCH_QUERY_LENGTH
from agent_label_summary import (
    AgentLabelSummaryV0,
    build_agent_label_summary_v0,
)


def test_agent_label_summary_v0_maps_public_lookup_fields():
    result = ChemicalResult(
        cas_number="64-17-5",
        cid=702,
        name_en="Ethanol",
        name_zh="乙醇",
        found=True,
        ghs_pictograms=[
            {"code": "GHS02", "name": "Flammable", "name_zh": "易燃物"},
        ],
        hazard_statements=[
            {"code": "H225", "text": "Highly flammable liquid and vapor."},
        ],
        precautionary_statements=[
            {"code": "P210", "text": "Keep away from heat."},
        ],
        signal_word="Danger",
        signal_word_zh="危險",
        primary_source="ECHA C&L Notifications Summary",
        primary_report_count="236",
        retrieved_at="2026-06-28T00:00:00Z",
        cache_hit=True,
        reference_links=[
            {
                "label": "Supplier SDS",
                "url": "https://example.com/sds",
                "link_type": "sds",
                "source": "manual",
                "priority": 5,
            },
            {
                "label": "Unsafe",
                "url": "javascript:alert(1)",
                "link_type": "reference",
                "source": "manual",
            },
        ],
    )

    summary = build_agent_label_summary_v0(
        result,
        lookup_base_url="https://ghs-frontend.zeabur.app",
    ).model_dump()

    assert summary["schema_version"] == "agent_label_summary.v0"
    assert summary["cas_number"] == "64-17-5"
    assert summary["cid"] == 702
    assert summary["name_en"] == "Ethanol"
    assert summary["name_zh"] == "乙醇"
    assert summary["found"] is True
    assert summary["ghs_pictograms"] == [
        {
            "code": "GHS02",
            "name_en": "Flammable",
            "name_zh": "易燃物",
            "asset_path": "/ghs/GHS02.svg",
        }
    ]
    assert summary["hazard_statements"] == [
        {"code": "H225", "text": "Highly flammable liquid and vapor."}
    ]
    assert summary["precautionary_statements"] == [
        {"code": "P210", "text": "Keep away from heat."}
    ]
    assert summary["primary_source"] == {
        "source": "ECHA C&L Notifications Summary",
        "report_count": "236",
    }
    assert summary["reference_links"] == [
        {
            "label": "Supplier SDS",
            "url": "https://example.com/sds",
            "link_type": "sds",
            "source": "manual",
        }
    ]
    assert summary["qr_target"] == {
        "url": "https://ghs-frontend.zeabur.app/?cas=64-17-5",
        "target_type": "ghs-lookup",
        "source": "ghs-label-quick-search",
        "label": "GHS Label Quick Search",
    }
    assert summary["upstream"] == {
        "retrieved_at": "2026-06-28T00:00:00Z",
        "cache_hit": True,
        "upstream_error": False,
        "retry_guidance": None,
    }
    assert summary["review_flags"] == []
    assert summary["authority_boundary"]["status"] == "reference_draft"
    assert "sds" in summary["authority_boundary"]["final_authorities"]
    assert "compliance_approval" in summary["authority_boundary"]["not_authorized_for"]


def test_agent_label_summary_v0_flags_text_only_and_excludes_unapproved_fields():
    result = ChemicalResult.model_validate(
        {
            "cas_number": "107-18-6",
            "name_en": "Allyl alcohol",
            "name_zh": "Allyl alcohol",
            "found": True,
            "ghs_pictograms": [],
            "hazard_statements": [{"code": "H301", "text": "Toxic if swallowed."}],
            "precautionary_statements": [],
            "signal_word": "Danger",
            "has_multiple_classifications": True,
            "other_classifications": [
                {
                    "pictograms": [{"code": "GHS06", "name_zh": "劇毒"}],
                    "hazard_statements": [{"code": "H301", "text": "Toxic if swallowed."}],
                    "signal_word": "Danger",
                    "source": "Alternate report",
                    "report_count": "12",
                }
            ],
            "candidate": {"name_zh": "候選中文名"},
            "manual_entry": {"status": "approved"},
            "approval_status": "approved",
        }
    )

    payload = build_agent_label_summary_v0(result).model_dump()

    assert payload["name_zh"] is None
    assert payload["ghs_pictograms"] == []
    assert payload["review_flags"] == [
        "text_only_ghs_without_pictograms",
        "multiple_classifications",
        "missing_trusted_chinese_name",
    ]
    assert payload["alternate_classifications"] == [
        {
            "pictogram_codes": ["GHS06"],
            "hazard_statement_codes": ["H301"],
            "signal_word": "Danger",
            "source": "Alternate report",
            "report_count": "12",
        }
    ]

    serialized = json.dumps(
        {
            "payload": payload,
            "schema": AgentLabelSummaryV0.model_json_schema(),
        },
        ensure_ascii=False,
        sort_keys=True,
    )
    forbidden_keys = {
        '"candidate"',
        '"manual_entry"',
        '"approval_status"',
        '"approved"',
        '"correction_request"',
    }
    for key in forbidden_keys:
        assert key not in serialized


def test_agent_label_summary_v0_preserves_bilingual_hazard_and_precaution_text():
    result = ChemicalResult(
        cas_number="7647-01-0",
        name_en="Hydrochloric acid",
        name_zh="鹽酸",
        found=True,
        ghs_pictograms=[{"code": "GHS05"}],
        hazard_statements=[
            {
                "code": "H314",
                "text_en": "Causes severe skin burns and eye damage.",
                "text_zh": "造成嚴重皮膚灼傷和眼睛損傷。",
            }
        ],
        precautionary_statements=[
            {
                "code": "P280",
                "text_en": "Wear protective gloves.",
                "text_zh": "戴防護手套。",
            }
        ],
        signal_word="Danger",
        signal_word_zh="危險",
    )

    payload = build_agent_label_summary_v0(result).model_dump()

    assert payload["hazard_statements"] == [
        {
            "code": "H314",
            "text": "Causes severe skin burns and eye damage.",
            "text_en": "Causes severe skin burns and eye damage.",
            "text_zh": "造成嚴重皮膚灼傷和眼睛損傷。",
        }
    ]
    assert payload["precautionary_statements"] == [
        {
            "code": "P280",
            "text": "Wear protective gloves.",
            "text_en": "Wear protective gloves.",
            "text_zh": "戴防護手套。",
        }
    ]


def test_agent_label_summary_v0_flags_upstream_retry_and_no_ghs_states():
    upstream_retry = build_agent_label_summary_v0(
        ChemicalResult(
            cas_number="777-77-7",
            name_en="Temporary PubChem outage",
            found=False,
            upstream_error=True,
        )
    ).model_dump()

    assert upstream_retry["review_flags"] == ["upstream_retry_needed", "not_found"]
    assert upstream_retry["upstream"]["upstream_error"] is True
    assert upstream_retry["upstream"]["retry_guidance"] == "retry_upstream_lookup"

    no_ghs = build_agent_label_summary_v0(
        ChemicalResult(
            cas_number="7732-18-5",
            name_en="Water",
            name_zh="水",
            found=True,
        )
    ).model_dump()

    assert no_ghs["review_flags"] == ["no_ghs_classification"]
    assert no_ghs["ghs_pictograms"] == []
    assert no_ghs["hazard_statements"] == []


def test_agent_label_summary_v0_schema_declares_boundary_and_read_only_contract():
    schema = AgentLabelSummaryV0.model_json_schema()

    assert schema["properties"]["schema_version"]["const"] == "agent_label_summary.v0"
    assert "authority_boundary" in schema["properties"]
    assert "qr_target" in schema["properties"]
    assert "upstream" in schema["properties"]
    assert "review_flags" in schema["properties"]
    assert "reference_links" in schema["properties"]
    assert "candidate" not in schema["properties"]
    assert "manual_entry" not in schema["properties"]


async def test_agent_label_summary_endpoint_returns_read_only_summary(monkeypatch):
    async def fake_search_chemical(cas_number, _http_client):
        return ChemicalResult(
            cas_number=cas_number,
            cid=702,
            name_en="Ethanol",
            name_zh="乙醇",
            found=True,
            ghs_pictograms=[
                {"code": "GHS02", "name": "Flammable", "name_zh": "易燃物"},
            ],
            hazard_statements=[
                {"code": "H225", "text": "Highly flammable liquid and vapor."},
            ],
            signal_word="Danger",
            primary_source="ECHA C&L Notifications Summary",
            primary_report_count="236",
            reference_links=[
                {
                    "label": "Supplier SDS",
                    "url": "https://example.com/sds",
                    "link_type": "sds",
                    "source": "manual",
                }
            ],
        )

    monkeypatch.setattr(server, "search_chemical", fake_search_chemical)

    transport = ASGITransport(app=server.app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        response = await ac.get("/api/agent/label-summary", params={"q": "64-17-5"})

    assert response.status_code == 200
    body = response.json()
    assert body["schema_version"] == "agent_label_summary.v0"
    assert body["cas_number"] == "64-17-5"
    assert body["ghs_pictograms"][0]["asset_path"] == "/ghs/GHS02.svg"
    assert body["primary_source"]["source"] == "ECHA C&L Notifications Summary"
    assert body["qr_target"]["target_type"] == "ghs-lookup"
    assert body["authority_boundary"]["status"] == "reference_draft"
    assert "candidate" not in body
    assert "manual_entry" not in body


async def test_agent_label_summary_endpoint_rejects_blank_and_overlong_queries():
    transport = ASGITransport(app=server.app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        blank_response = await ac.get(
            "/api/agent/label-summary",
            params={"q": "   "},
        )
        overlong_response = await ac.get(
            "/api/agent/label-summary",
            params={"q": "x" * (MAX_PUBLIC_SEARCH_QUERY_LENGTH + 1)},
        )

    assert blank_response.status_code == 400
    assert overlong_response.status_code == 422


def test_agent_label_summary_endpoint_is_visible_in_openapi():
    server.app.openapi_schema = None
    schema = server.app.openapi()

    route = schema["paths"]["/api/agent/label-summary"]["get"]
    response_schema = route["responses"]["200"]["content"]["application/json"]["schema"]
    assert response_schema["$ref"].endswith("/AgentLabelSummaryV0")

    model_schema = schema["components"]["schemas"]["AgentLabelSummaryV0"]
    assert model_schema["properties"]["schema_version"]["const"] == (
        "agent_label_summary.v0"
    )
    assert "authority_boundary" in model_schema["properties"]
    assert "qr_target" in model_schema["properties"]
    assert "candidate" not in model_schema["properties"]
