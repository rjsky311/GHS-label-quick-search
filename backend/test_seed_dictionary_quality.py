from chemical_dict import CAS_TO_EN, CAS_TO_ZH, CHEMICAL_NAMES_ZH_EXPANDED


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
