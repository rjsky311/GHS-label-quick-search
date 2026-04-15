"""
Tests for name search functionality:
- resolve_name_to_cas() helper
- Reverse dictionaries (EN_TO_CAS, ZH_TO_CAS)
- Alias dictionaries (ALIASES_ZH, ALIASES_EN)
- /api/search-by-name/{query} endpoint (local dictionary only, no network)
- /api/search/{query} auto-detect (local only tests)
"""
import pytest
from httpx import AsyncClient, ASGITransport
from server import (
    app,
    resolve_name_to_cas,
    _classification_signature,
    _report_rank_key,
)
from chemical_dict import EN_TO_CAS, ZH_TO_CAS, CAS_TO_EN, CAS_TO_ZH, ALIASES_ZH, ALIASES_EN


# ─── Unit tests: resolve_name_to_cas ───────────────────────

class TestResolveNameToCas:
    """Test the resolve_name_to_cas helper function."""

    def test_exact_english_name(self):
        """'Ethanol' is stored exactly in CAS_TO_EN."""
        assert resolve_name_to_cas("Ethanol") == "64-17-5"

    def test_exact_english_lowercase(self):
        assert resolve_name_to_cas("ethanol") == "64-17-5"

    def test_exact_english_uppercase(self):
        assert resolve_name_to_cas("ETHANOL") == "64-17-5"

    def test_exact_chinese_name(self):
        assert resolve_name_to_cas("乙醇") == "64-17-5"

    def test_methanol_resolves(self):
        """'Methanol' is stored as 'Methyl alcohol (Methanol)' in CAS_TO_EN.
        The word-boundary match should find it."""
        result = resolve_name_to_cas("Methanol")
        assert result == "67-56-1"

    def test_methanol_chinese(self):
        assert resolve_name_to_cas("甲醇") == "67-56-1"

    def test_unknown_name_returns_none(self):
        assert resolve_name_to_cas("Unobtainium") is None

    def test_empty_string_returns_none(self):
        assert resolve_name_to_cas("") is None

    def test_whitespace_only_returns_none(self):
        assert resolve_name_to_cas("   ") is None

    def test_chinese_unknown_returns_none(self):
        assert resolve_name_to_cas("不存在的化學物") is None

    def test_strips_whitespace(self):
        assert resolve_name_to_cas("  Ethanol  ") == "64-17-5"

    def test_acetone(self):
        """Check a common chemical."""
        result = resolve_name_to_cas("Acetone")
        assert result is not None  # Should find it in dictionary

    def test_cas_like_input_returns_none(self):
        """CAS-like input (digits and hyphens) won't be found by name."""
        assert resolve_name_to_cas("999-99-9") is None


# ─── Unit tests: reverse dictionaries ─────────────────────

class TestReverseDictionaries:
    """Test that reverse dictionaries are correctly built."""

    def test_en_to_cas_has_entries(self):
        assert len(EN_TO_CAS) > 0

    def test_en_to_cas_includes_aliases(self):
        """EN_TO_CAS should include merged English aliases."""
        assert len(EN_TO_CAS) >= len(CAS_TO_EN)  # At least as many entries (aliases add more)

    def test_zh_to_cas_has_entries(self):
        assert len(ZH_TO_CAS) > 0

    def test_en_to_cas_ethanol(self):
        assert EN_TO_CAS.get("ethanol") == "64-17-5"

    def test_zh_to_cas_ethanol(self):
        assert ZH_TO_CAS.get("乙醇") == "64-17-5"

    def test_en_to_cas_keys_are_lowercase(self):
        for key in list(EN_TO_CAS.keys())[:100]:
            assert key == key.lower(), f"Key '{key}' is not lowercase"

    def test_roundtrip_en(self):
        """CAS_TO_EN → EN_TO_CAS → should get back same CAS."""
        cas = "64-17-5"
        en_name = CAS_TO_EN[cas]
        assert EN_TO_CAS[en_name.lower()] == cas

    def test_roundtrip_zh(self):
        """CAS_TO_ZH → ZH_TO_CAS → should get back same CAS."""
        cas = "64-17-5"
        zh_name = CAS_TO_ZH[cas]
        assert ZH_TO_CAS[zh_name] == cas


# ─── Integration tests: /api/search-by-name (no network needed) ──

async def test_search_by_name_ethanol():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        response = await ac.get("/api/search-by-name/ethanol")
    assert response.status_code == 200
    data = response.json()
    assert "results" in data
    cas_numbers = [r["cas_number"] for r in data["results"]]
    assert "64-17-5" in cas_numbers


async def test_search_by_name_chinese():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        response = await ac.get("/api/search-by-name/%E4%B9%99%E9%86%87")  # 乙醇
    assert response.status_code == 200
    data = response.json()
    cas_numbers = [r["cas_number"] for r in data["results"]]
    assert "64-17-5" in cas_numbers


async def test_search_by_name_short_query_returns_empty():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        response = await ac.get("/api/search-by-name/a")
    assert response.status_code == 200
    data = response.json()
    assert data["results"] == []


async def test_search_by_name_max_20_results():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        response = await ac.get("/api/search-by-name/acid")
    assert response.status_code == 200
    data = response.json()
    assert len(data["results"]) <= 20


async def test_search_by_name_unknown_returns_empty():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        response = await ac.get("/api/search-by-name/xyznotfound")
    assert response.status_code == 200
    data = response.json()
    assert data["results"] == []


async def test_search_by_name_result_has_all_fields():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        response = await ac.get("/api/search-by-name/ethanol")
    data = response.json()
    for r in data["results"]:
        assert "cas_number" in r
        assert "name_en" in r
        assert "name_zh" in r


async def test_search_by_name_methanol_returns_results():
    """Searching 'methanol' should return the chemical even though
    it's stored as 'Methyl alcohol (Methanol)' in CAS_TO_EN."""
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        response = await ac.get("/api/search-by-name/methanol")
    assert response.status_code == 200
    data = response.json()
    cas_numbers = [r["cas_number"] for r in data["results"]]
    assert "67-56-1" in cas_numbers


async def test_search_single_unknown_name_returns_not_found():
    """/api/search/Unobtainium returns found=false."""
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        response = await ac.get("/api/search/Unobtainium")
    assert response.status_code == 200
    data = response.json()
    assert data["found"] is False
    assert "error" in data


# ─── Unit tests: alias dictionaries ──────────────────────

class TestAliasDictionaries:
    """Test that alias dictionaries are correctly defined and merged."""

    def test_aliases_zh_has_entries(self):
        assert len(ALIASES_ZH) > 0

    def test_aliases_en_has_entries(self):
        assert len(ALIASES_EN) > 0

    def test_aliases_zh_merged_into_zh_to_cas(self):
        """All Chinese aliases should be findable in ZH_TO_CAS."""
        for alias, cas in ALIASES_ZH.items():
            assert alias in ZH_TO_CAS, f"Alias '{alias}' not found in ZH_TO_CAS"

    def test_aliases_en_merged_into_en_to_cas(self):
        """All English aliases (lowercase) should be findable in EN_TO_CAS."""
        for alias, cas in ALIASES_EN.items():
            key = alias.lower()
            assert key in EN_TO_CAS, f"Alias '{alias}' not found in EN_TO_CAS"

    def test_alias_does_not_overwrite_formal_name(self):
        """If a formal name exists in ZH_TO_CAS, alias should not overwrite it."""
        # 乙醇 is a formal name in CAS_TO_ZH for 64-17-5
        assert ZH_TO_CAS["乙醇"] == "64-17-5"
        # 酒精 is an alias for 64-17-5 — should also resolve to 64-17-5
        assert ZH_TO_CAS["酒精"] == "64-17-5"

    def test_common_zh_aliases_resolve(self):
        """Common Chinese aliases should resolve to correct CAS numbers."""
        assert ZH_TO_CAS.get("酒精") == "64-17-5"      # Ethanol
        assert ZH_TO_CAS.get("漂白水") == "7681-52-9"   # NaClO
        assert ZH_TO_CAS.get("雙氧水") == "7722-84-1"   # H2O2
        assert ZH_TO_CAS.get("燒鹼") == "1310-73-2"     # NaOH
        assert ZH_TO_CAS.get("小蘇打") == "144-55-8"     # NaHCO3

    def test_common_en_aliases_resolve(self):
        """Common English aliases should resolve to correct CAS numbers."""
        assert EN_TO_CAS.get("bleach") == "7681-52-9"
        assert EN_TO_CAS.get("baking soda") == "144-55-8"
        assert EN_TO_CAS.get("caustic soda") == "1310-73-2"
        assert EN_TO_CAS.get("lye") == "1310-73-2"
        assert EN_TO_CAS.get("dmso") == "67-68-5"

    def test_alias_cas_numbers_are_valid_format(self):
        """All CAS numbers in aliases should have valid format (XX-XX-X)."""
        import re
        cas_pattern = re.compile(r'^\d{2,7}-\d{2}-\d$')
        for alias, cas in ALIASES_ZH.items():
            assert cas_pattern.match(cas), f"Invalid CAS '{cas}' for alias '{alias}'"
        for alias, cas in ALIASES_EN.items():
            assert cas_pattern.match(cas), f"Invalid CAS '{cas}' for alias '{alias}'"


# ─── Unit tests: resolve_name_to_cas with aliases ────────

class TestResolveNameToCasAliases:
    """Test that resolve_name_to_cas works with aliases."""

    def test_chinese_alias_alcohol(self):
        """酒精 (alcohol) should resolve to ethanol."""
        assert resolve_name_to_cas("酒精") == "64-17-5"

    def test_chinese_alias_bleach(self):
        """漂白水 should resolve to sodium hypochlorite."""
        assert resolve_name_to_cas("漂白水") == "7681-52-9"

    def test_chinese_alias_hydrogen_peroxide(self):
        """雙氧水 should resolve to H2O2."""
        assert resolve_name_to_cas("雙氧水") == "7722-84-1"

    def test_chinese_alias_caustic_soda(self):
        """燒鹼 should resolve to NaOH."""
        assert resolve_name_to_cas("燒鹼") == "1310-73-2"

    def test_chinese_alias_formalin(self):
        """福馬林 should resolve to formaldehyde."""
        assert resolve_name_to_cas("福馬林") == "50-00-0"

    def test_chinese_alias_nail_polish_remover(self):
        """去光水 should resolve to acetone."""
        assert resolve_name_to_cas("去光水") == "67-64-1"

    def test_english_alias_bleach(self):
        assert resolve_name_to_cas("bleach") == "7681-52-9"

    def test_english_alias_baking_soda(self):
        assert resolve_name_to_cas("baking soda") == "144-55-8"

    def test_english_alias_lye(self):
        assert resolve_name_to_cas("lye") == "1310-73-2"

    def test_english_alias_dmso(self):
        assert resolve_name_to_cas("DMSO") == "67-68-5"

    def test_english_alias_rubbing_alcohol(self):
        assert resolve_name_to_cas("rubbing alcohol") == "67-63-0"

    def test_english_alias_dry_ice(self):
        assert resolve_name_to_cas("dry ice") == "124-38-9"

    def test_formal_name_still_works(self):
        """Formal names should still resolve correctly (not broken by aliases)."""
        assert resolve_name_to_cas("乙醇") == "64-17-5"
        assert resolve_name_to_cas("Ethanol") == "64-17-5"
        assert resolve_name_to_cas("甲醇") == "67-56-1"


# ─── Integration tests: /api/search-by-name with aliases ──

async def test_search_by_name_chinese_alias():
    """Searching '酒精' should find ethanol (64-17-5)."""
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        response = await ac.get("/api/search-by-name/%E9%85%92%E7%B2%BE")  # 酒精
    assert response.status_code == 200
    data = response.json()
    cas_numbers = [r["cas_number"] for r in data["results"]]
    assert "64-17-5" in cas_numbers


async def test_search_by_name_english_alias():
    """Searching 'bleach' should find sodium hypochlorite (7681-52-9)."""
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        response = await ac.get("/api/search-by-name/bleach")
    assert response.status_code == 200
    data = response.json()
    cas_numbers = [r["cas_number"] for r in data["results"]]
    assert "7681-52-9" in cas_numbers


async def test_search_by_name_alias_has_alias_field():
    """Alias matches should include an 'alias' field."""
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        response = await ac.get("/api/search-by-name/bleach")
    assert response.status_code == 200
    data = response.json()
    # Find the sodium hypochlorite result
    match = next((r for r in data["results"] if r["cas_number"] == "7681-52-9"), None)
    assert match is not None
    assert "alias" in match


async def test_search_by_name_dmso_alias():
    """Searching 'dmso' should find DMSO (67-68-5)."""
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        response = await ac.get("/api/search-by-name/dmso")
    assert response.status_code == 200
    data = response.json()
    cas_numbers = [r["cas_number"] for r in data["results"]]
    assert "67-68-5" in cas_numbers


async def test_search_by_name_lye_alias():
    """Searching 'lye' should find NaOH (1310-73-2)."""
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        response = await ac.get("/api/search-by-name/lye")
    assert response.status_code == 200
    data = response.json()
    cas_numbers = [r["cas_number"] for r in data["results"]]
    assert "1310-73-2" in cas_numbers


# ─── GHS classification dedup / ranking ─────────────────────

def _pic(code):
    return {"code": code}


def _hz(code, text="x"):
    return {"code": code, "text_en": text, "text_zh": text}


class TestClassificationSignature:
    """Dedup must collapse only truly identical reports."""

    def test_same_pictograms_but_different_h_codes_produce_different_signatures(self):
        """Regression: previously deduped on pictogram set only, silently
        losing a materially different classification."""
        a = {
            "pictograms": [_pic("GHS02"), _pic("GHS07")],
            "hazard_statements": [_hz("H225"), _hz("H319")],
            "signal_word": "Danger",
            "source": "ECHA C&L Notifications Summary",
        }
        b = {
            "pictograms": [_pic("GHS02"), _pic("GHS07")],
            "hazard_statements": [_hz("H225"), _hz("H336")],
            "signal_word": "Danger",
            "source": "ECHA C&L Notifications Summary",
        }
        assert _classification_signature(a) != _classification_signature(b)

    def test_different_signal_word_produces_different_signature(self):
        a = {
            "pictograms": [_pic("GHS07")],
            "hazard_statements": [_hz("H319")],
            "signal_word": "Danger",
            "source": "ECHA",
        }
        b = {**a, "signal_word": "Warning"}
        assert _classification_signature(a) != _classification_signature(b)

    def test_different_source_produces_different_signature(self):
        a = {
            "pictograms": [_pic("GHS07")],
            "hazard_statements": [_hz("H319")],
            "signal_word": "Warning",
            "source": "ECHA C&L",
        }
        b = {**a, "source": "Other vendor SDS"}
        assert _classification_signature(a) != _classification_signature(b)

    def test_identical_reports_produce_equal_signatures(self):
        a = {
            "pictograms": [_pic("GHS07"), _pic("GHS02")],
            "hazard_statements": [_hz("H319"), _hz("H225")],
            "signal_word": "Danger",
            "source": "ECHA C&L Notifications Summary",
        }
        b = {
            "pictograms": [_pic("GHS02"), _pic("GHS07")],  # reversed order
            "hazard_statements": [_hz("H225"), _hz("H319")],  # reversed order
            "signal_word": "Danger",
            "source": "ECHA C&L Notifications Summary",
        }
        assert _classification_signature(a) == _classification_signature(b)


class TestReportRankKey:
    """Primary classification selection must be deterministic and prefer
    the most-reported / most-complete classification."""

    def test_higher_report_count_ranks_first(self):
        a = {"report_count": "120", "source": "ECHA", "hazard_statements": [_hz("H1")]}
        b = {"report_count": "3", "source": "ECHA", "hazard_statements": [_hz("H1")]}
        # Ascending sort; lower tuple wins → a should rank before b
        assert _report_rank_key(a, 0) < _report_rank_key(b, 1)

    def test_echa_source_bonus_when_count_equal(self):
        a = {"report_count": "10", "source": "Other", "hazard_statements": [_hz("H1")]}
        b = {"report_count": "10", "source": "ECHA C&L Notifications", "hazard_statements": [_hz("H1")]}
        assert _report_rank_key(b, 1) < _report_rank_key(a, 0)

    def test_more_hazards_wins_on_tie(self):
        a = {"report_count": None, "source": "ECHA", "hazard_statements": [_hz("H1"), _hz("H2")]}
        b = {"report_count": None, "source": "ECHA", "hazard_statements": [_hz("H1")]}
        assert _report_rank_key(a, 0) < _report_rank_key(b, 1)

    def test_source_order_is_stable_tiebreaker(self):
        a = {"report_count": None, "source": "ECHA", "hazard_statements": [_hz("H1")]}
        b = {"report_count": None, "source": "ECHA", "hazard_statements": [_hz("H1")]}
        assert _report_rank_key(a, 0) < _report_rank_key(b, 1)

    def test_non_numeric_report_count_treated_as_zero(self):
        a = {"report_count": "not-a-number", "source": "ECHA", "hazard_statements": []}
        b = {"report_count": None, "source": "ECHA", "hazard_statements": []}
        # Both should produce the same count component; only source_index differs
        assert _report_rank_key(a, 0) < _report_rank_key(b, 1)


async def test_search_chemical_both_distinct_reports_survive_dedup(monkeypatch):
    """End-to-end: two reports with identical pictograms but different
    H-codes must BOTH survive (regression against the old pic-set-only
    dedup), and the higher report_count must become primary."""
    import server as srv

    fake_reports = [
        {
            "pictograms": [_pic("GHS02"), _pic("GHS07")],
            "hazard_statements": [_hz("H225"), _hz("H319")],
            "signal_word": "Danger",
            "signal_word_zh": "危險",
            "source": "ECHA C&L Notifications Summary",
            "report_count": "5",
        },
        {
            "pictograms": [_pic("GHS02"), _pic("GHS07")],
            "hazard_statements": [_hz("H225"), _hz("H336")],
            "signal_word": "Danger",
            "signal_word_zh": "危險",
            "source": "ECHA C&L Notifications Summary",
            "report_count": "120",
        },
    ]

    async def fake_get_cid(*_args, **_kwargs):
        return 702

    async def fake_get_name(*_args, **_kwargs):
        return ("Ethanol", "乙醇")

    async def fake_get_ghs(*_args, **_kwargs):
        return {}

    monkeypatch.setattr(srv, "get_cid_from_cas", fake_get_cid)
    monkeypatch.setattr(srv, "get_compound_name", fake_get_name)
    monkeypatch.setattr(srv, "get_ghs_classification", fake_get_ghs)
    monkeypatch.setattr(srv, "extract_all_ghs_classifications", lambda _: fake_reports)

    class _NullClient:
        async def get(self, *_a, **_k):  # pragma: no cover - unused
            raise RuntimeError("http should not be called")

    result = await srv.search_chemical("64-17-5", _NullClient())

    # Both distinct reports must survive dedup
    assert result.has_multiple_classifications is True
    assert len(result.other_classifications) == 1

    primary_h_codes = sorted(h["code"] for h in result.hazard_statements)
    other_h_codes = sorted(h["code"] for h in result.other_classifications[0].hazard_statements)
    assert {tuple(primary_h_codes), tuple(other_h_codes)} == {
        ("H225", "H319"),
        ("H225", "H336"),
    }

    # Specifically: report_count=120 (the H336 one) must be primary
    primary_has_h336 = any(h["code"] == "H336" for h in result.hazard_statements)
    assert primary_has_h336, "Higher report_count must be chosen as primary"


# ─── Export endpoint safety ─────────────────────────────────

from server import spreadsheet_safe, MAX_EXPORT_ROWS


class TestSpreadsheetSafe:
    """spreadsheet_safe() neutralizes CSV/XLSX formula injection."""

    def test_none_becomes_empty_string(self):
        assert spreadsheet_safe(None) == ""

    def test_plain_text_unchanged(self):
        assert spreadsheet_safe("Ethanol") == "Ethanol"
        assert spreadsheet_safe("64-17-5") == "64-17-5"  # leading digit is safe

    def test_equals_prefix_is_neutralized(self):
        assert spreadsheet_safe('=HYPERLINK("http://bad","click")') == "'=HYPERLINK(\"http://bad\",\"click\")"

    def test_plus_prefix_is_neutralized(self):
        assert spreadsheet_safe("+cmd|calc") == "'+cmd|calc"

    def test_minus_prefix_is_neutralized(self):
        # A minus sign in front is a formula trigger too
        assert spreadsheet_safe("-1+1") == "'-1+1"

    def test_at_prefix_is_neutralized(self):
        assert spreadsheet_safe("@SUM(A1:A10)") == "'@SUM(A1:A10)"

    def test_tab_prefix_is_neutralized(self):
        assert spreadsheet_safe("\tmalicious") == "'\tmalicious"

    def test_non_string_values_coerced(self):
        assert spreadsheet_safe(42) == "42"
        assert spreadsheet_safe(True) == "True"


async def test_export_csv_neutralizes_formula_injection():
    """Malicious `=...` value in a result field must be prefixed with
    an apostrophe in the CSV output."""
    transport = ASGITransport(app=app)
    payload = {
        "results": [
            {
                "cas_number": "64-17-5",
                "name_en": '=HYPERLINK("http://bad","click")',
                "name_zh": "乙醇",
                "ghs_pictograms": [],
                "hazard_statements": [],
            }
        ]
    }
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        response = await ac.post("/api/export/csv", json=payload)
    assert response.status_code == 200
    # Body is UTF-8 with BOM. The neutralized cell must start with an
    # apostrophe before the formula trigger, so the spreadsheet reads
    # the value as literal text.
    body = response.content.decode("utf-8-sig")
    assert "'=HYPERLINK" in body
    # There must be NO formula-triggering cell: every `=...` occurrence
    # must be preceded by the neutralizing apostrophe.
    assert ",=HYPERLINK" not in body
    assert '"=HYPERLINK' not in body


async def test_export_xlsx_neutralizes_formula_injection():
    """Same regression for the XLSX endpoint."""
    from io import BytesIO
    from openpyxl import load_workbook

    transport = ASGITransport(app=app)
    payload = {
        "results": [
            {
                "cas_number": "64-17-5",
                "name_en": "=1+1",
                "name_zh": "+test",
                "ghs_pictograms": [],
                "hazard_statements": [],
            }
        ]
    }
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        response = await ac.post("/api/export/xlsx", json=payload)
    assert response.status_code == 200

    wb = load_workbook(BytesIO(response.content))
    ws = wb.active
    # Row 2 is the first data row. Columns: 1=CAS, 2=en, 3=zh ...
    assert ws.cell(row=2, column=2).value == "'=1+1"
    assert ws.cell(row=2, column=3).value == "'+test"


async def test_export_rejects_payload_exceeding_max_rows():
    """Payload with > MAX_EXPORT_ROWS items must be rejected with 422."""
    transport = ASGITransport(app=app)
    oversized = [
        {"cas_number": f"000-00-{i}", "name_en": "x", "name_zh": "x",
         "ghs_pictograms": [], "hazard_statements": []}
        for i in range(MAX_EXPORT_ROWS + 1)
    ]
    payload = {"results": oversized}
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        response = await ac.post("/api/export/csv", json=payload)
    assert response.status_code == 422


async def test_export_accepts_payload_at_max_rows():
    """MAX_EXPORT_ROWS items exactly must still succeed (inclusive limit)."""
    transport = ASGITransport(app=app)
    payload = {
        "results": [
            {"cas_number": f"000-00-{i}", "name_en": "x", "name_zh": "x",
             "ghs_pictograms": [], "hazard_statements": []}
            for i in range(MAX_EXPORT_ROWS)
        ]
    }
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        response = await ac.post("/api/export/csv", json=payload)
    assert response.status_code == 200


# ─── PubChem retry / backoff ────────────────────────────────

import httpx as _httpx_for_tests
from server import PubChemError, pubchem_get_json


class _FakeResponse:
    def __init__(self, status_code, json_body=None, headers=None):
        self.status_code = status_code
        self._json = json_body if json_body is not None else {}
        self.headers = headers or {}

    def json(self):
        return self._json


class _ScriptedClient:
    """Scripted httpx replacement. Each `get` call pops the next entry
    from `.script`. Entries may be:
        - a _FakeResponse to return
        - an Exception instance to raise
    """

    def __init__(self, script):
        self.script = list(script)
        self.calls = 0

    async def get(self, url, timeout=None):
        self.calls += 1
        item = self.script.pop(0)
        if isinstance(item, Exception):
            raise item
        return item


@pytest.fixture(autouse=True)
def _fast_pubchem_sleep(monkeypatch):
    """Keep retry tests quick: replace asyncio.sleep with a no-op."""
    import asyncio as _a
    import server as _srv

    async def _no_sleep(_delay):
        return None

    monkeypatch.setattr(_srv.asyncio, "sleep", _no_sleep)
    yield


async def test_pubchem_get_json_returns_200_without_retry():
    client = _ScriptedClient([_FakeResponse(200, {"ok": True})])
    status, data = await pubchem_get_json(client, "https://x/", timeout=1.0)
    assert status == 200
    assert data == {"ok": True}
    assert client.calls == 1


async def test_pubchem_get_json_returns_404_without_retry():
    client = _ScriptedClient([_FakeResponse(404)])
    status, data = await pubchem_get_json(client, "https://x/", timeout=1.0)
    assert status == 404
    assert data is None
    assert client.calls == 1  # 404 must NOT trigger retries


async def test_pubchem_get_json_retries_503_then_succeeds():
    client = _ScriptedClient([
        _FakeResponse(503),
        _FakeResponse(200, {"ok": True}),
    ])
    status, data = await pubchem_get_json(client, "https://x/", timeout=1.0, retries=2)
    assert status == 200
    assert data == {"ok": True}
    assert client.calls == 2


async def test_pubchem_get_json_retries_429_with_retry_after():
    client = _ScriptedClient([
        _FakeResponse(429, headers={"Retry-After": "1"}),
        _FakeResponse(200, {"ok": True}),
    ])
    status, data = await pubchem_get_json(client, "https://x/", timeout=1.0, retries=2)
    assert status == 200
    assert client.calls == 2


async def test_pubchem_get_json_raises_after_exhausted_retries_on_5xx():
    client = _ScriptedClient([
        _FakeResponse(503),
        _FakeResponse(502),
        _FakeResponse(500),
    ])
    with pytest.raises(PubChemError):
        await pubchem_get_json(client, "https://x/", timeout=1.0, retries=2)


async def test_pubchem_get_json_raises_on_timeout_exhausted():
    timeout_exc = _httpx_for_tests.TimeoutException("read timeout")
    client = _ScriptedClient([timeout_exc, timeout_exc, timeout_exc])
    with pytest.raises(PubChemError):
        await pubchem_get_json(client, "https://x/", timeout=1.0, retries=2)


async def test_pubchem_get_json_timeout_then_success():
    client = _ScriptedClient([
        _httpx_for_tests.TimeoutException("slow"),
        _FakeResponse(200, {"ok": True}),
    ])
    status, data = await pubchem_get_json(client, "https://x/", timeout=1.0, retries=2)
    assert status == 200
    assert client.calls == 2


async def test_pubchem_get_json_returns_none_for_non_transient_4xx():
    client = _ScriptedClient([_FakeResponse(400)])
    status, data = await pubchem_get_json(client, "https://x/", timeout=1.0)
    assert status == 400
    assert data is None
    assert client.calls == 1  # 400 is not retriable


async def test_search_chemical_surfaces_upstream_error_on_ghs_outage(monkeypatch):
    """A 429/5xx storm on the GHS endpoint must produce
    found=False, upstream_error=True — never a found=True result with
    empty hazard data."""
    import server as srv

    async def fake_get_cid(*_a, **_k):
        return 702  # pretend CID lookup worked

    async def fake_get_name(*_a, **_k):
        return ("Ethanol", "乙醇")

    async def fake_ghs_raise(*_a, **_k):
        raise PubChemError("all retries exhausted")

    monkeypatch.setattr(srv, "get_cid_from_cas", fake_get_cid)
    monkeypatch.setattr(srv, "get_compound_name", fake_get_name)
    monkeypatch.setattr(srv, "get_ghs_classification", fake_ghs_raise)

    class _NullClient:
        async def get(self, *_a, **_k):
            raise RuntimeError("should not be called")

    result = await srv.search_chemical("64-17-5", _NullClient())
    assert result.found is False
    assert result.upstream_error is True
    assert result.ghs_pictograms == []
    assert result.hazard_statements == []
    assert "PubChem 暫時無法回應" in (result.error or "")


async def test_search_chemical_surfaces_upstream_error_on_cid_outage(monkeypatch):
    """When all CID lookup methods transient-fail, surface upstream_error."""
    import server as srv

    async def fake_cid_raise(*_a, **_k):
        raise PubChemError("all CID methods failed")

    monkeypatch.setattr(srv, "get_cid_from_cas", fake_cid_raise)

    class _NullClient:
        async def get(self, *_a, **_k):
            raise RuntimeError("should not be called")

    result = await srv.search_chemical("64-17-5", _NullClient())
    assert result.found is False
    assert result.upstream_error is True
    assert "PubChem 暫時無法回應" in (result.error or "")
