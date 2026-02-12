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
from server import app, resolve_name_to_cas
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
