import pytest

from api_models import (
    DictionaryCorrectionRequestPayload,
    DictionaryManualEntryPayload,
)
from api_validation import has_valid_cas_checksum, normalize_valid_cas


def test_normalize_valid_cas_requires_checksum():
    assert normalize_valid_cas(" CAS 64-17-5 ") == "64-17-5"
    assert normalize_valid_cas("64175") == "64-17-5"
    assert normalize_valid_cas("64-17-6") == ""
    assert has_valid_cas_checksum("64-17-5") is True
    assert has_valid_cas_checksum("64-17-6") is False


def test_admin_payloads_reject_checksum_invalid_cas_numbers():
    with pytest.raises(ValueError):
        DictionaryManualEntryPayload(cas_number="64-17-6")

    with pytest.raises(ValueError):
        DictionaryCorrectionRequestPayload(
            issue_type="missing-chinese-name",
            cas_number="64-17-6",
        )


def test_correction_candidate_cas_must_be_valid_when_present():
    with pytest.raises(ValueError):
        DictionaryCorrectionRequestPayload(
            issue_type="missing-chinese-name",
            candidate={"cas_number": "64-17-6", "name_en": "Bad CAS"},
        )
