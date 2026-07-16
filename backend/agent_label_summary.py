from typing import Dict, List, Literal, Optional
from urllib.parse import quote

from pydantic import BaseModel, Field, model_serializer

from api_models import ChemicalResult, GHSReport
from api_validation import _is_safe_reference_url
from export_helpers import _has_cjk_text


SCHEMA_VERSION = "agent_label_summary.v0"
DEFAULT_LOOKUP_BASE_URL = "https://ghs-frontend.zeabur.app"

GHS_PICTOGRAM_LABELS: Dict[str, Dict[str, str]] = {
    "GHS01": {"name_en": "Explosive", "name_zh": "爆炸物"},
    "GHS02": {"name_en": "Flammable", "name_zh": "易燃物"},
    "GHS03": {"name_en": "Oxidizer", "name_zh": "氧化劑"},
    "GHS04": {"name_en": "Compressed Gas", "name_zh": "壓縮氣體"},
    "GHS05": {"name_en": "Corrosive", "name_zh": "腐蝕性"},
    "GHS06": {"name_en": "Toxic", "name_zh": "劇毒"},
    "GHS07": {"name_en": "Irritant", "name_zh": "刺激性/有害"},
    "GHS08": {"name_en": "Health Hazard", "name_zh": "健康危害"},
    "GHS09": {"name_en": "Environmental Hazard", "name_zh": "環境危害"},
}


class AgentGhsPictogram(BaseModel):
    code: str
    name_en: Optional[str] = None
    name_zh: Optional[str] = None
    asset_path: Optional[str] = None


class AgentGhsStatement(BaseModel):
    code: Optional[str] = None
    text: str
    # The public parser keeps bilingual statement text in these explicit
    # fields.  Keep them optional so older records that only have ``text``
    # remain byte-for-byte compatible when serialized.
    text_en: Optional[str] = None
    text_zh: Optional[str] = None

    @model_serializer(mode="plain")
    def _serialize_statement(self):
        payload = {"code": self.code, "text": self.text}
        if self.text_en is not None:
            payload["text_en"] = self.text_en
        if self.text_zh is not None:
            payload["text_zh"] = self.text_zh
        return payload


class AgentClassificationSource(BaseModel):
    source: Optional[str] = None
    report_count: Optional[str] = None


class AgentClassificationSummary(BaseModel):
    pictogram_codes: List[str] = Field(default_factory=list)
    hazard_statement_codes: List[str] = Field(default_factory=list)
    signal_word: Optional[str] = None
    source: Optional[str] = None
    report_count: Optional[str] = None


class AgentReferenceLink(BaseModel):
    label: str
    url: str
    link_type: str = "reference"
    source: str = "public"


class AgentQrTarget(BaseModel):
    url: str
    target_type: Literal["ghs-lookup"] = "ghs-lookup"
    source: Literal["ghs-label-quick-search"] = "ghs-label-quick-search"
    label: Literal["GHS Label Quick Search"] = "GHS Label Quick Search"


class AgentUpstreamState(BaseModel):
    retrieved_at: Optional[str] = None
    cache_hit: bool = False
    upstream_error: bool = False
    retry_guidance: Optional[str] = None


class AgentAuthorityBoundary(BaseModel):
    status: Literal["reference_draft"] = "reference_draft"
    final_authorities: List[str] = Field(
        default_factory=lambda: ["sds", "supplier_label", "local_regulations"]
    )
    not_authorized_for: List[str] = Field(
        default_factory=lambda: [
            "compliance_approval",
            "storage_advice",
            "disposal_advice",
            "ppe_advice",
            "transport_advice",
            "waste_advice",
            "hazard_reclassification",
            "public_data_write",
        ]
    )


class AgentLabelSummaryV0(BaseModel):
    schema_version: Literal["agent_label_summary.v0"] = SCHEMA_VERSION
    cas_number: str
    cid: Optional[int] = None
    name_en: Optional[str] = None
    name_zh: Optional[str] = None
    found: bool = False
    ghs_pictograms: List[AgentGhsPictogram] = Field(default_factory=list)
    hazard_statements: List[AgentGhsStatement] = Field(default_factory=list)
    precautionary_statements: List[AgentGhsStatement] = Field(default_factory=list)
    signal_word: Optional[str] = None
    signal_word_zh: Optional[str] = None
    primary_source: Optional[AgentClassificationSource] = None
    alternate_classifications: List[AgentClassificationSummary] = Field(default_factory=list)
    reference_links: List[AgentReferenceLink] = Field(default_factory=list)
    qr_target: Optional[AgentQrTarget] = None
    upstream: AgentUpstreamState = Field(default_factory=AgentUpstreamState)
    review_flags: List[str] = Field(default_factory=list)
    authority_boundary: AgentAuthorityBoundary = Field(default_factory=AgentAuthorityBoundary)


def _trusted_chinese_name(value: Optional[str]) -> Optional[str]:
    text = str(value or "").strip()
    if not text or not _has_cjk_text(text):
        return None
    return text


def _statement_items(items: List[Dict[str, str]]) -> List[AgentGhsStatement]:
    statements: List[AgentGhsStatement] = []
    for item in items or []:
        code = str(item.get("code") or "").strip() or None
        text_en = str(item.get("text_en") or "").strip() or None
        text_zh = str(item.get("text_zh") or "").strip() or None
        legacy_text = str(item.get("text") or "").strip()
        text = text_en or legacy_text or text_zh or ""
        if not text and code:
            text = code
        if text:
            statements.append(
                AgentGhsStatement(
                    code=code,
                    text=text,
                    text_en=text_en,
                    text_zh=text_zh,
                )
            )
    return statements


def _pictogram_items(items: List[Dict[str, object]]) -> List[AgentGhsPictogram]:
    pictograms: List[AgentGhsPictogram] = []
    for item in items or []:
        code = str(item.get("code") or "").strip().upper()
        if not code:
            continue
        labels = GHS_PICTOGRAM_LABELS.get(code, {})
        name_en = str(item.get("name_en") or item.get("name") or labels.get("name_en") or "").strip()
        name_zh = str(item.get("name_zh") or labels.get("name_zh") or "").strip()
        pictograms.append(
            AgentGhsPictogram(
                code=code,
                name_en=name_en or None,
                name_zh=name_zh or None,
                asset_path=f"/ghs/{code}.svg" if code in GHS_PICTOGRAM_LABELS else None,
            )
        )
    return pictograms


def _alternate_summary(report: GHSReport) -> AgentClassificationSummary:
    pictogram_codes = [
        pictogram.code
        for pictogram in _pictogram_items(report.pictograms)
        if pictogram.code
    ]
    hazard_statement_codes = [
        statement.code
        for statement in _statement_items(report.hazard_statements)
        if statement.code
    ]
    return AgentClassificationSummary(
        pictogram_codes=pictogram_codes,
        hazard_statement_codes=hazard_statement_codes,
        signal_word=report.signal_word,
        source=report.source,
        report_count=report.report_count,
    )


def _reference_link_items(items: List[Dict[str, object]]) -> List[AgentReferenceLink]:
    links: List[AgentReferenceLink] = []
    for item in items or []:
        url = str(item.get("url") or "").strip()
        label = str(item.get("label") or "").strip()
        if not url or not label or not _is_safe_reference_url(url):
            continue
        links.append(
            AgentReferenceLink(
                label=label,
                url=url,
                link_type=str(item.get("link_type") or "reference").strip() or "reference",
                source=str(item.get("source") or "public").strip() or "public",
            )
        )
    return links


def _qr_target(cas_number: str, lookup_base_url: str) -> Optional[AgentQrTarget]:
    base_url = str(lookup_base_url or DEFAULT_LOOKUP_BASE_URL).strip().rstrip("/")
    if not base_url:
        base_url = DEFAULT_LOOKUP_BASE_URL
    url = f"{base_url}/?cas={quote(cas_number, safe='')}"
    if not _is_safe_reference_url(url):
        return None
    return AgentQrTarget(url=url)


def _review_flags(
    *,
    result: ChemicalResult,
    trusted_name_zh: Optional[str],
    pictograms: List[AgentGhsPictogram],
    hazard_statements: List[AgentGhsStatement],
    precautionary_statements: List[AgentGhsStatement],
) -> List[str]:
    flags: List[str] = []
    has_text = bool(hazard_statements or precautionary_statements or result.signal_word)
    has_primary_pictograms = bool(pictograms)
    has_alternate_data = any(
        report.pictograms or report.hazard_statements or report.signal_word
        for report in result.other_classifications
    )

    if result.upstream_error:
        flags.append("upstream_retry_needed")
    if not result.found:
        flags.append("not_found")
    elif has_text and not has_primary_pictograms:
        flags.append("text_only_ghs_without_pictograms")
    elif not has_text and not has_primary_pictograms and not has_alternate_data:
        flags.append("no_ghs_classification")

    if result.has_multiple_classifications:
        flags.append("multiple_classifications")
    if result.found and result.name_en and not trusted_name_zh:
        flags.append("missing_trusted_chinese_name")
    return flags


def build_agent_label_summary_v0(
    result: ChemicalResult,
    *,
    lookup_base_url: str = DEFAULT_LOOKUP_BASE_URL,
) -> AgentLabelSummaryV0:
    trusted_name_zh = _trusted_chinese_name(result.name_zh)
    pictograms = _pictogram_items(result.ghs_pictograms)
    hazard_statements = _statement_items(result.hazard_statements)
    precautionary_statements = _statement_items(result.precautionary_statements)
    primary_source = None
    if result.primary_source or result.primary_report_count:
        primary_source = AgentClassificationSource(
            source=result.primary_source,
            report_count=result.primary_report_count,
        )
    upstream = AgentUpstreamState(
        retrieved_at=result.retrieved_at,
        cache_hit=result.cache_hit,
        upstream_error=result.upstream_error,
        retry_guidance="retry_upstream_lookup" if result.upstream_error else None,
    )

    return AgentLabelSummaryV0(
        cas_number=result.cas_number,
        cid=result.cid,
        name_en=result.name_en,
        name_zh=trusted_name_zh,
        found=result.found,
        ghs_pictograms=pictograms,
        hazard_statements=hazard_statements,
        precautionary_statements=precautionary_statements,
        signal_word=result.signal_word,
        signal_word_zh=result.signal_word_zh,
        primary_source=primary_source,
        alternate_classifications=[
            _alternate_summary(report) for report in result.other_classifications
        ],
        reference_links=_reference_link_items(result.reference_links),
        qr_target=_qr_target(result.cas_number, lookup_base_url),
        upstream=upstream,
        review_flags=_review_flags(
            result=result,
            trusted_name_zh=trusted_name_zh,
            pictograms=pictograms,
            hazard_statements=hazard_statements,
            precautionary_statements=precautionary_statements,
        ),
    )
