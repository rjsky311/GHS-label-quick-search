"""A name only resolves when it names that compound.

The resolver used to fall back to word-boundary and prefix matches, so "HCl"
returned Tris HCl and "dichloromethane" a palladium complex. People print
labels from the result, so a partial match must never resolve on its own.
"""

import pytest
from httpx import ASGITransport, AsyncClient

import h_code_translations as h_codes
import p_code_translations as p_codes
import server as srv


@pytest.mark.parametrize(
    "query, cas",
    [
        ("HCl", "7647-01-0"),
        ("hydrochloric acid", "7647-01-0"),
        ("dichloromethane", "75-09-2"),
        ("methylene chloride", "75-09-2"),
        ("CH2Cl2", "75-09-2"),
        ("DCM", "75-09-2"),
        ("isopropanol", "67-63-0"),
        ("2-propanol", "67-63-0"),
        ("isopropyl alcohol", "67-63-0"),
        ("1-butanol", "71-36-3"),
        ("n-butanol", "71-36-3"),
        ("tert-butanol", "75-65-0"),
        ("t-butanol", "75-65-0"),
        ("n-hexane", "110-54-3"),
        ("hexane", "110-54-3"),
        ("heptane", "142-82-5"),
        ("diethyl ether", "60-29-7"),
        ("dimethylformamide", "68-12-2"),
        ("sodium bicarbonate", "144-55-8"),
        ("butyllithium", "109-72-8"),
        ("n-BuLi", "109-72-8"),
        ("acetyl chloride", "75-36-5"),
        ("formaldehyde", "50-00-0"),
        ("hydrazine", "302-01-2"),
        ("hydrofluoric acid", "7664-39-3"),
        ("HF", "7664-39-3"),
        ("hydrobromic acid", "10035-10-6"),
        ("HBr", "10035-10-6"),
        ("H2SO4", "7664-93-9"),
        ("HNO3", "7697-37-2"),
        ("NaOH", "1310-73-2"),
        ("KOH", "1310-58-3"),
        ("H2O2", "7722-84-1"),
        ("NH3", "7664-41-7"),
        ("MeOH", "67-56-1"),
        ("EtOH", "64-17-5"),
        ("CHCl3", "67-66-3"),
        ("EtOAc", "141-78-6"),
        ("MeCN", "75-05-8"),
        ("DIPEA", "7087-68-5"),
        ("NaH", "7646-69-7"),
        ("NaBH4", "16940-66-2"),
        ("AcOH", "64-19-7"),
        ("Ac2O", "108-24-7"),
        ("lead", "7439-92-1"),
        ("gold", "7440-57-5"),
        ("cobalt", "7440-48-4"),
        ("methane", "74-82-8"),
        ("ethylene", "74-85-1"),
        ("copper", "7440-50-8"),
        ("zinc", "7440-66-6"),
        ("oxygen", "7782-44-7"),
        ("carbon dioxide", "124-38-9"),
        ("palladium", "7440-05-3"),
        ("glycerin", "56-81-5"),
        ("methanol", "67-56-1"),
        ("THF", "109-99-9"),
        ("乙酸", "64-19-7"),
        ("己烷", "110-54-3"),
        ("甲醛", "50-00-0"),
        ("氫氟酸", "7664-39-3"),
        ("氟化氫", "7664-39-3"),
        ("氫溴酸", "10035-10-6"),
        ("丁基鋰", "109-72-8"),
        ("溴", "7726-95-6"),
        ("二甲胺", "124-40-3"),
        ("酒精", "64-17-5"),
        ("鉛", "7439-92-1"),
        ("銀", "7440-22-4"),
        ("丙烷", "74-98-6"),
    ],
)
def test_common_names_resolve_to_that_compound(query, cas):
    assert srv.resolve_name_to_cas(query) == cas


def test_bleach_alias_still_resolves():
    assert srv.resolve_name_to_cas("漂白水") == srv.resolve_name_to_cas("bleach")
    assert srv.resolve_name_to_cas("bleach")


@pytest.mark.parametrize(
    "query",
    [
        "tris",
        "chloride",
        "acid",
        "sodium chlor",
        "pallad",
        "methyl",
        "tetra",
        "poly",
        "氯化",
        # Parentheses that describe a form, not a synonym.
        "metal",
        "red",
        "glacial",
        "mixed isomers",
        "冠醚",
        "乾燥劑",
        "緩衝液",
        "金屬",
    ],
)
def test_partial_names_do_not_resolve(query):
    assert srv.resolve_name_to_cas(query) is None


async def test_partial_names_stay_available_as_suggestions():
    transport = ASGITransport(app=srv.app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        response = await ac.get("/api/search-by-name/tris")
    assert response.status_code == 200
    assert response.json()["results"]


@pytest.mark.parametrize(
    "code, zh, en",
    [
        ("P265", "勿觸摸眼睛。", "Do not touch eyes."),
        ("P306", "若沾到衣物：", "IF ON CLOTHING:"),
        ("P317", "尋求醫療協助。", "Get medical help."),
        ("P420", "分開存放。", "Store separately."),
        ("P337+P317", "若眼睛刺激持續：尋求醫療協助。", "If eye irritation persists: Get medical help."),
    ],
)
def test_corrected_precautionary_wording(code, zh, en):
    assert p_codes.P_CODE_TRANSLATIONS[code] == zh
    assert p_codes.P_CODE_TEXTS_EN[code] == en


@pytest.mark.parametrize(
    "code",
    [
        "P236",
        "P231+P232",
        "P235+P410",
        "P309",
        "P323",
        "P302+P335+P334",
        "P309+P311",
        "P370+P372+P380+P373",
        "P402+P404",
        "P411+P235",
        "P503",
    ],
)
def test_current_precautionary_codes_have_both_languages(code):
    assert p_codes.P_CODE_TRANSLATIONS[code]
    assert p_codes.P_CODE_TEXTS_EN[code]


def test_corrected_hazard_wording():
    assert "氣喘" in h_codes.H_CODE_TRANSLATIONS["H334"]
    assert h_codes.H_CODE_TRANSLATIONS["H222"] == "極易燃氣膠"
    for code in ("H206", "H207", "H208", "H209", "H232", "H282", "H283", "H284"):
        assert h_codes.H_CODE_TRANSLATIONS[code]
