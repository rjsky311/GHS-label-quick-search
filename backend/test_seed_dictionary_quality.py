from api_validation import is_valid_cas
from chemical_dict import (
    ALIASES_EN,
    ALIASES_ZH,
    CAS_TO_EN,
    CAS_TO_ZH,
    CHEMICAL_NAMES_ZH_EXPANDED,
)


def test_all_seed_cas_keys_pass_checksum_validation():
    # Seed entries with an invalid CAS checksum are unreachable at runtime:
    # CAS search rejects them before lookup and name search filters them out,
    # so they silently become "not found" coverage gaps.
    invalid_zh = [cas for cas in CAS_TO_ZH if not is_valid_cas(cas)]
    invalid_en = [cas for cas in CAS_TO_EN if not is_valid_cas(cas)]
    assert not invalid_zh
    assert not invalid_en


def test_all_seed_alias_targets_pass_checksum_validation():
    invalid_targets = [
        (alias, cas)
        for alias, cas in [*ALIASES_ZH.items(), *ALIASES_EN.items()]
        if not is_valid_cas(cas)
    ]
    assert not invalid_targets


def test_seed_cas_dictionaries_cover_the_same_cas_keys():
    assert set(CAS_TO_ZH) == set(CAS_TO_EN)


def test_tetrachloropalladate_is_not_mislabelled_as_platinate():
    # 10025-98-6 is potassium tetrachloropalladate(II); the former seed entry
    # (invalid CAS 10025-98-7) carried the platinate names by mistake.
    assert CAS_TO_ZH["10025-98-6"] == "四氯鈀酸鉀"
    assert CAS_TO_EN["10025-98-6"] == "Potassium tetrachloropalladate(II)"
    assert CAS_TO_ZH["10025-99-7"] == "四氯鉑酸鉀"


def test_mida_and_dithiolanethione_are_not_swapped_with_other_identities():
    # PubChem-verified on 2026-07-05: 4408-64-4 is N-methyliminodiacetic acid
    # (CID 20441) and 822-38-8 is 1,3-dithiolane-2-thione (CID 13196). Former
    # seed rows carried cerium(IV) sulfate hydrate and MIDA names respectively,
    # which displayed wrong identities over correct PubChem hazard data.
    assert CAS_TO_EN["4408-64-4"] == "N-Methyliminodiacetic acid"
    assert CAS_TO_ZH["4408-64-4"] == "N-甲基亞胺二醋酸"
    assert CAS_TO_EN["822-38-8"] == "1,3-Dithiolane-2-thione"
    assert CAS_TO_ZH["822-38-8"] == "1,3-二硫雜環戊烷-2-硫酮"
    # Cerium(IV) sulfate hydrate keeps exactly one catalog-verified CAS entry.
    cerium_cas = [
        cas
        for cas, name in CAS_TO_EN.items()
        if name == "Cerium(IV) sulfate hydrate"
    ]
    assert cerium_cas == ["123333-60-8"]


def test_cerium_iii_hydrate_chinese_names_include_cerium():
    assert CAS_TO_EN["10294-41-4"] == "Cerium(III) nitrate hexahydrate"
    assert CAS_TO_ZH["10294-41-4"] == "硝酸鈰(III)六水合物"
    assert (
        CHEMICAL_NAMES_ZH_EXPANDED["cerium(iii) nitrate hexahydrate"]
        == "硝酸鈰(III)六水合物"
    )

    assert CAS_TO_EN["18618-55-8"] == "Cerium(III) chloride heptahydrate"
    assert CAS_TO_ZH["18618-55-8"] == "氯化鈰(III)七水合物"
    assert (
        CHEMICAL_NAMES_ZH_EXPANDED["cerium(iii) chloride heptahydrate"]
        == "氯化鈰(III)七水合物"
    )


def test_known_suspect_cas_identity_is_not_published_as_hydrazine():
    assert CAS_TO_EN["865-49-6"] == "Chloroform-d"
    assert CAS_TO_ZH["865-49-6"] == "氘代氯仿"
    assert (
        "hydrazine monohydrate (note: cas 865-49-6 is typically chloroform-d)"
        not in CHEMICAL_NAMES_ZH_EXPANDED
    )


def test_seed_dictionary_does_not_publish_self_disqualifying_cas_notes():
    disallowed_fragments = (
        "typically Chloroform-d",
        "CAS 865-49-6 is typically",
        "此 CAS 通常指氘代氯仿",
    )
    values = [
        *CAS_TO_EN.values(),
        *CAS_TO_ZH.values(),
        *CHEMICAL_NAMES_ZH_EXPANDED.keys(),
        *CHEMICAL_NAMES_ZH_EXPANDED.values(),
    ]

    assert not [
        value
        for value in values
        if any(fragment in value for fragment in disallowed_fragments)
    ]
