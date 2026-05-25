import json
from typing import Any, Dict, List, Optional

from pydantic import BaseModel, Field, field_validator

from export_helpers import _has_cjk_text
from pilot_store import APPROVED_ALIAS_STATUS, APPROVED_MANUAL_ENTRY_STATUS
from api_validation import (
    ALLOWED_ALIAS_LOCALES,
    ALLOWED_ALIAS_STATUSES,
    ALLOWED_CORRECTION_REQUEST_STATUSES,
    ALLOWED_CORRECTION_REQUEST_TYPES,
    ALLOWED_MANUAL_ENTRY_STATUSES,
    ALLOWED_REFERENCE_STATUSES,
    DEFAULT_MISS_QUERY_RETENTION_DAYS,
    MAX_ADMIN_CAS_LENGTH,
    MAX_ADMIN_NAME_LENGTH,
    MAX_ADMIN_NOTES_LENGTH,
    MAX_ADMIN_SOURCE_LENGTH,
    MAX_ALIAS_TEXT_LENGTH,
    MAX_CORRECTION_CONTEXT_CHARS,
    MAX_CORRECTION_SOURCE_LENGTH,
    MAX_CORRECTION_TEXT_LENGTH,
    MAX_EXPORT_ROWS,
    MAX_MISS_CONTEXT_ITEMS,
    MAX_MISS_CONTEXT_JSON_CHARS,
    MAX_MISS_ENDPOINT_LENGTH,
    MAX_MISS_QUERY_KIND_LENGTH,
    MAX_MISS_QUERY_LENGTH,
    MAX_REFERENCE_PRIORITY,
    MAX_WORKSPACE_DOCUMENT_JSON_CHARS,
    MISS_QUERY_STATUSES,
    REFERENCE_LINK_TYPES,
    _is_safe_reference_url,
    _sanitize_correction_candidate_payload,
    _sanitize_dictionary_miss_context,
    normalize_cas,
)


class CASQuery(BaseModel):
    cas_numbers: List[str] = Field(..., max_length=100)


class GHSReport(BaseModel):
    """Single GHS classification report."""

    pictograms: List[Dict[str, Any]] = []
    hazard_statements: List[Dict[str, str]] = []
    precautionary_statements: List[Dict[str, str]] = []
    signal_word: Optional[str] = None
    signal_word_zh: Optional[str] = None
    source: Optional[str] = None
    report_count: Optional[str] = None


class ChemicalResult(BaseModel):
    cas_number: str
    cid: Optional[int] = None
    name_en: Optional[str] = None
    name_zh: Optional[str] = None
    ghs_pictograms: List[Dict[str, Any]] = []
    hazard_statements: List[Dict[str, str]] = []
    precautionary_statements: List[Dict[str, str]] = []
    signal_word: Optional[str] = None
    signal_word_zh: Optional[str] = None
    other_classifications: List[GHSReport] = []
    has_multiple_classifications: bool = False
    found: bool = False
    error: Optional[str] = None
    upstream_error: bool = False
    primary_source: Optional[str] = None
    primary_report_count: Optional[str] = None
    retrieved_at: Optional[str] = None
    cache_hit: bool = False
    reference_links: List[Dict[str, Any]] = []


class ExportRequest(BaseModel):
    results: List[Dict[str, Any]] = Field(..., max_length=MAX_EXPORT_ROWS)
    format: str = "xlsx"


class WorkspaceDocumentPayload(BaseModel):
    payload: Any

    @field_validator("payload")
    @classmethod
    def payload_must_stay_bounded(cls, value: Any) -> Any:
        encoded = json.dumps(value, ensure_ascii=False, sort_keys=True)
        if len(encoded) > MAX_WORKSPACE_DOCUMENT_JSON_CHARS:
            raise ValueError("workspace document payload is too large")
        return value


class DictionaryMissQueryPayload(BaseModel):
    query: str = Field(..., min_length=1, max_length=MAX_MISS_QUERY_LENGTH)
    query_kind: str = Field(
        "name",
        min_length=1,
        max_length=MAX_MISS_QUERY_KIND_LENGTH,
        pattern=r"^[A-Za-z0-9_.:-]+$",
    )
    endpoint: str = Field(
        "frontend",
        min_length=1,
        max_length=MAX_MISS_ENDPOINT_LENGTH,
        pattern=r"^[A-Za-z0-9_.:-]+$",
    )
    context: Dict[str, Any] = Field(
        default_factory=dict,
        max_length=MAX_MISS_CONTEXT_ITEMS,
    )

    @field_validator("query")
    @classmethod
    def query_must_not_be_blank(cls, value: str) -> str:
        value = value.strip()
        if not value:
            raise ValueError("query must not be blank")
        return value

    @field_validator("context")
    @classmethod
    def context_must_stay_small(cls, value: Dict[str, Any]) -> Dict[str, Any]:
        encoded = json.dumps(value or {}, ensure_ascii=False, sort_keys=True)
        if len(encoded) > MAX_MISS_CONTEXT_JSON_CHARS:
            raise ValueError("context payload is too large")
        return _sanitize_dictionary_miss_context(value)


class DictionaryMissQueryResolutionPayload(BaseModel):
    resolution_status: str = Field(..., min_length=1, max_length=40)
    resolved_cas: Optional[str] = Field(default=None, max_length=MAX_ADMIN_CAS_LENGTH)

    @field_validator("resolution_status")
    @classmethod
    def status_must_be_supported(cls, value: str) -> str:
        normalized = str(value or "").strip().lower()
        if normalized not in MISS_QUERY_STATUSES:
            raise ValueError(
                "resolution_status must be open, needs_evidence, resolved, or ignored"
            )
        return normalized

    @field_validator("resolved_cas")
    @classmethod
    def resolved_cas_is_trimmed(cls, value: Optional[str]) -> Optional[str]:
        if value is None:
            return None
        normalized = normalize_cas(value)
        return normalized or None


class DictionaryMissQueryRetentionPayload(BaseModel):
    retention_days: int = Field(
        DEFAULT_MISS_QUERY_RETENTION_DAYS,
        ge=1,
        le=365,
    )


class DictionaryCorrectionRequestPayload(BaseModel):
    issue_type: str = Field(..., min_length=1, max_length=80)
    cas_number: Optional[str] = Field(default=None, max_length=MAX_ADMIN_CAS_LENGTH)
    chemical_name: Optional[str] = Field(default=None, max_length=MAX_ADMIN_NAME_LENGTH)
    query_text: Optional[str] = Field(default=None, max_length=MAX_ADMIN_NAME_LENGTH)
    current_output: Optional[str] = Field(
        default=None,
        max_length=MAX_CORRECTION_TEXT_LENGTH,
    )
    expected_output: Optional[str] = Field(
        default=None,
        max_length=MAX_CORRECTION_TEXT_LENGTH,
    )
    evidence_url: Optional[str] = Field(default=None, max_length=2048)
    evidence_type: Optional[str] = Field(default=None, max_length=160)
    local_context: Optional[str] = Field(
        default=None,
        max_length=MAX_CORRECTION_CONTEXT_CHARS,
    )
    candidate: Dict[str, Any] = Field(default_factory=dict)
    source: str = Field(default="public", max_length=MAX_CORRECTION_SOURCE_LENGTH)

    @field_validator("issue_type")
    @classmethod
    def issue_type_must_be_supported(cls, value: str) -> str:
        normalized = str(value or "").strip().lower()
        if normalized not in ALLOWED_CORRECTION_REQUEST_TYPES:
            raise ValueError("unsupported correction request type")
        return normalized

    @field_validator(
        "chemical_name",
        "query_text",
        "current_output",
        "expected_output",
        "evidence_type",
        "local_context",
        mode="before",
    )
    @classmethod
    def optional_text_is_trimmed(cls, value: Any) -> Optional[str]:
        if value is None:
            return None
        text = str(value).strip()
        return text or None

    @field_validator("cas_number")
    @classmethod
    def correction_cas_is_trimmed(cls, value: Optional[str]) -> Optional[str]:
        if value is None:
            return None
        normalized = normalize_cas(value)
        return normalized or None

    @field_validator("evidence_url")
    @classmethod
    def correction_evidence_url_must_be_safe(cls, value: Optional[str]) -> Optional[str]:
        if value is None:
            return None
        normalized = value.strip()
        if not normalized:
            return None
        if not _is_safe_reference_url(normalized):
            raise ValueError("evidence URL must use http or https")
        return normalized

    @field_validator("source")
    @classmethod
    def correction_source_defaults_to_public(cls, value: str) -> str:
        value = (value or "").strip()
        return value or "public"

    @field_validator("candidate")
    @classmethod
    def correction_candidate_must_stay_small(cls, value: Dict[str, Any]) -> Dict[str, Any]:
        return _sanitize_correction_candidate_payload(value)


class DictionaryCorrectionRequestStatusPayload(BaseModel):
    status: str = Field(..., min_length=1, max_length=40)
    review_notes: Optional[str] = Field(default=None, max_length=MAX_ADMIN_NOTES_LENGTH)
    candidate: Optional[Dict[str, Any]] = None

    @field_validator("status")
    @classmethod
    def correction_status_must_be_supported(cls, value: str) -> str:
        normalized = str(value or "").strip().lower()
        if normalized not in ALLOWED_CORRECTION_REQUEST_STATUSES:
            raise ValueError(
                "correction request status must be open, candidate_found, approved, rejected, or ignored"
            )
        return normalized

    @field_validator("review_notes")
    @classmethod
    def correction_review_notes_are_trimmed(cls, value: Optional[str]) -> Optional[str]:
        if value is None:
            return None
        text = str(value).strip()
        return text or None

    @field_validator("candidate")
    @classmethod
    def correction_status_candidate_must_stay_small(
        cls,
        value: Optional[Dict[str, Any]],
    ) -> Optional[Dict[str, Any]]:
        if value is None:
            return None
        return _sanitize_correction_candidate_payload(
            value,
            allow_manual_review_metadata=True,
        )


class DictionaryManualEntryPayload(BaseModel):
    cas_number: str = Field(..., min_length=1, max_length=MAX_ADMIN_CAS_LENGTH)
    name_en: Optional[str] = Field(default=None, max_length=MAX_ADMIN_NAME_LENGTH)
    name_zh: Optional[str] = Field(default=None, max_length=MAX_ADMIN_NAME_LENGTH)
    notes: str = Field(default="", max_length=MAX_ADMIN_NOTES_LENGTH)
    source: str = Field(default="manual", max_length=MAX_ADMIN_SOURCE_LENGTH)
    status: str = Field(default=APPROVED_MANUAL_ENTRY_STATUS, max_length=40)

    @field_validator("cas_number")
    @classmethod
    def cas_number_must_not_be_blank(cls, value: str) -> str:
        value = value.strip()
        if not value:
            raise ValueError("cas_number must not be blank")
        return value

    @field_validator("name_en", "name_zh")
    @classmethod
    def optional_names_are_trimmed(cls, value: Optional[str]) -> Optional[str]:
        if value is None:
            return None
        value = value.strip()
        return value or None

    @field_validator("name_zh")
    @classmethod
    def chinese_name_must_contain_cjk(cls, value: Optional[str]) -> Optional[str]:
        if value is not None and not _has_cjk_text(value):
            raise ValueError("name_zh must contain Chinese/CJK characters")
        return value

    @field_validator("notes")
    @classmethod
    def notes_are_trimmed(cls, value: str) -> str:
        return (value or "").strip()

    @field_validator("source")
    @classmethod
    def source_defaults_to_manual(cls, value: str) -> str:
        value = (value or "").strip()
        return value or "manual"

    @field_validator("status")
    @classmethod
    def status_must_be_supported(cls, value: str) -> str:
        normalized = str(value or "").strip().lower()
        if normalized not in ALLOWED_MANUAL_ENTRY_STATUSES:
            raise ValueError(
                "manual entry status must be approved, pending, needs_evidence, or rejected"
            )
        return normalized


class DictionaryAliasPayload(BaseModel):
    alias_text: str = Field(..., min_length=1, max_length=MAX_ALIAS_TEXT_LENGTH)
    locale: str = Field(..., min_length=1, max_length=8)
    cas_number: str = Field(..., min_length=1, max_length=MAX_ADMIN_CAS_LENGTH)
    source: str = Field(default="manual", max_length=MAX_ADMIN_SOURCE_LENGTH)
    confidence: float = Field(default=1.0, ge=0, le=1)
    status: str = Field(default=APPROVED_ALIAS_STATUS, max_length=40)
    notes: str = Field(default="", max_length=MAX_ADMIN_NOTES_LENGTH)

    @field_validator("alias_text", "cas_number")
    @classmethod
    def required_text_must_not_be_blank(cls, value: str) -> str:
        value = value.strip()
        if not value:
            raise ValueError("field must not be blank")
        return value

    @field_validator("locale")
    @classmethod
    def locale_must_be_supported(cls, value: str) -> str:
        normalized = str(value or "").strip().lower()
        if normalized not in ALLOWED_ALIAS_LOCALES:
            raise ValueError("alias locale must be en or zh")
        return normalized

    @field_validator("status")
    @classmethod
    def status_must_be_supported(cls, value: str) -> str:
        normalized = str(value or "").strip().lower()
        if normalized not in ALLOWED_ALIAS_STATUSES:
            raise ValueError("alias status must be approved, pending, needs_evidence, or rejected")
        return normalized

    @field_validator("source")
    @classmethod
    def alias_source_defaults_to_manual(cls, value: str) -> str:
        value = (value or "").strip()
        return value or "manual"

    @field_validator("notes")
    @classmethod
    def alias_notes_are_trimmed(cls, value: str) -> str:
        return (value or "").strip()


class DictionaryReferenceLinkPayload(BaseModel):
    cas_number: str = Field(..., min_length=1, max_length=MAX_ADMIN_CAS_LENGTH)
    label: str = Field(..., max_length=160)
    url: str = Field(..., max_length=2048)
    link_type: str = "reference"
    source: str = Field(default="manual", max_length=80)
    priority: int = Field(default=50, ge=0, le=MAX_REFERENCE_PRIORITY)
    status: str = Field(default="active", max_length=40)
    cid: Optional[int] = None

    @field_validator("cas_number", "label")
    @classmethod
    def required_reference_text_must_not_be_blank(cls, value: str) -> str:
        value = value.strip()
        if not value:
            raise ValueError("field must not be blank")
        return value

    @field_validator("url")
    @classmethod
    def url_must_be_http_or_https(cls, value: str) -> str:
        value = value.strip()
        if not _is_safe_reference_url(value):
            raise ValueError("reference link URL must use http or https")
        return value

    @field_validator("link_type")
    @classmethod
    def link_type_must_be_known(cls, value: str) -> str:
        normalized = str(value or "").strip().lower()
        if normalized not in REFERENCE_LINK_TYPES:
            raise ValueError("reference link type must be sds, regulatory, occupational, or reference")
        return normalized

    @field_validator("source")
    @classmethod
    def reference_source_defaults_to_manual(cls, value: str) -> str:
        value = (value or "").strip()
        return value or "manual"

    @field_validator("status")
    @classmethod
    def reference_status_must_be_supported(cls, value: str) -> str:
        normalized = str(value or "").strip().lower()
        if normalized not in ALLOWED_REFERENCE_STATUSES:
            raise ValueError("reference link status must be active or inactive")
        return normalized
