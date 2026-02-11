"""
Tests for name search functionality:
- resolve_name_to_cas() helper
- Reverse dictionaries (EN_TO_CAS, ZH_TO_CAS)
- /api/search-by-name/{query} endpoint (local dictionary only, no network)
- /api/search/{query} auto-detect (local only tests)
"""
import pytest
from httpx import AsyncClient, ASGITransport
from server import app, resolve_name_to_cas
from chemical_dict import EN_TO_CAS, ZH_TO_CAS, CAS_TO_EN, CAS_TO_ZH


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

    def test_en_to_cas_may_have_fewer_due_to_duplicates(self):
        """Some English names appear for multiple CAS numbers, so EN_TO_CAS <= CAS_TO_EN."""
        assert len(EN_TO_CAS) <= len(CAS_TO_EN)
        assert len(EN_TO_CAS) >= len(CAS_TO_EN) - 20  # At most 20 duplicates expected

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
