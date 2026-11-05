"""CAS numbers whose PubChem records do not lead to the right hazard data.

PubChem hangs compound records on a CAS through its depositors. For most
substances the majority is right, but not always: the CAS of polyethylene leads
to ethylene, and activated carbon to methane, and both then show that gas's
hazards. No rule on votes or formulas can tell these apart, so each one was
looked up by hand and is written down here.

A row says which record the site uses for that CAS:

- `cid` is a PubChem compound. Its hazard data stays PubChem's. This file never
  holds a classification.
- `cid` is None when PubChem has no record of the substance itself. The site
  then shows the dictionary name and "no GHS data, check the SDS".

A row applies only while the dictionary still has the same name for that CAS,
which test_reviewed_cas_resolutions.py checks.
"""

from __future__ import annotations

from typing import Any, Dict, Optional, Tuple, TypedDict


class ReviewedCasResolution(TypedDict):
    dictionary_name_en: str
    cid: Optional[int]
    note: str
    reviewed_at: str


def _row(name: str, cid: Optional[int], note: str) -> ReviewedCasResolution:
    return {
        "dictionary_name_en": name,
        "cid": cid,
        "note": note,
        "reviewed_at": "2026-11-05",
    }


REVIEWED_CAS_RESOLUTIONS: Dict[str, ReviewedCasResolution] = {
    # Records exist for the substance itself, but most depositors point elsewhere.
    "1330-20-7": _row(
        "Xylenes",
        6850715,
        "Most records say m-xylene (7929). 6850715 is the mixed-isomer record, ECHA EC 905-215-1.",
    ),
    "70693-62-8": _row(
        "Potassium peroxymonosulfate (Oxone)",
        15793144,
        "The triple salt, ECHA EC 274-778-7. Other records of this CAS are partial formulas without data.",
    ),
    "7440-44-0": _row(
        "Active charcoal (Activated carbon)",
        5462310,
        "653 of 665 records say methane (297). PubChem's name lookup and ECHA EC 231-153-3 say carbon.",
    ),
    "7782-42-5": _row(
        "Graphite, amorphous",
        5462310,
        "169 of 176 records say methane (297). PubChem's name lookup says carbon.",
    ),
    "7704-34-9": _row(
        "Sulfur powder",
        5362487,
        "845 of 875 records say hydrogen sulfide (402). 5362487 is sulfur, CLP and ECHA EC 231-722-6.",
    ),
    # Polymers: every record with hazard data is the monomer or a small molecule.
    "24937-79-9": _row(
        "Poly(vinylidene fluoride) (PVDF)", None, "Records lead to the vinylidene fluoride monomer (6369)."
    ),
    "24991-55-7": _row(
        "Poly(ethylene glycol) dimethyl ether", None, "Records lead to 1,2-dimethoxyethane (8071)."
    ),
    "25067-59-8": _row(
        "Poly(9-vinylcarbazole)", None, "Records lead to the N-vinylcarbazole monomer (15143)."
    ),
    "25322-68-3": _row(
        "Poly(ethylene glycol) (PEG)", None, "Records lead to ethylene glycol (174) and short glycols."
    ),
    "30525-89-4": _row(
        "Paraformaldehyde", None, "Records lead to formaldehyde (712), whose gas and solution hazards differ."
    ),
    "54193-36-1": _row(
        "Poly(methacrylic acid, sodium salt)", None, "Records lead to the sodium methacrylate monomer (3255932)."
    ),
    "66796-30-3": _row(
        "Perfluorosulfonic acid-PTFE copolymer", None, "The one record leads to an unrelated thiazole amine (723330)."
    ),
    "9002-83-9": _row(
        "Halocarbon Oil 700", None, "Records lead to the chlorotrifluoroethylene monomer (6594)."
    ),
    "9002-88-4": _row("Poly(ethylene)", None, "Records lead to the ethylene monomer (6325)."),
    "9002-89-5": _row("Poly(vinyl alcohol)", None, "Records lead to the vinyl alcohol monomer (11199)."),
    "9002-97-5": _row(
        "Poly(sodium vinylsulfonate)", None, "Records lead to the sodium vinylsulfonate monomer (3270262)."
    ),
    "9003-39-8": _row(
        "Polyvinylpyrrolidone (PVP)", None, "Records lead to the N-vinyl-2-pyrrolidone monomer (6917)."
    ),
    "9011-14-7": _row(
        "Poly(methyl methacrylate) (PMMA)", None, "Records lead to the methyl methacrylate monomer (6658)."
    ),
    "9037-24-5": _row(
        "Ion-exchange resin", None, "All 21 records lead to 2-bromoethyl methyl ether (80972)."
    ),
    # Mixtures and natural products: records lead to an unrelated compound.
    "8002-74-2": _row("Paraffin wax", None, "Records lead to the drug propafenone (4932)."),
    "8006-64-2": _row("Turpentine oil", None, "All 4 records lead to triethyl citrate (6506)."),
    "8009-03-8": _row("Petrolatum", None, "All 4 records lead to 2,3,3-trimethylbenzoindolenine (170530)."),
    "8032-32-4": _row("Petroleum ether", None, "Records lead to an unrelated hydrazide (48418096)."),
    "84787-70-2": _row("Sandalwood oil", None, "All 20 records lead to biphenyl-4,4'-dicarboxylic acid (13084)."),
}


# Reports PubChem files on a compound that are about another substance. The site
# would offer them as a classification of that compound, so they are dropped before
# classifications are built. This removes data and never adds any. Each was read
# one by one; a value is how the report's name starts. Grades, forms, solutions and
# labelled versions of the substance stay, and are listed in
# dictionary_audit_reviewed.REVIEWED_OTHER_REPORTS.
FOREIGN_GHS_REPORTS: Dict[int, Tuple[str, ...]] = {
    # Sodium chloride: CLP 611-142-00-3 is a polyazo dye made with it.
    5234: ("product-by-process definition polyazodyestuff",),
    # Isopropanol: CLP 607-403-00-6 is a reaction mass. Its own entry is 603-117-00-0.
    3776: ("reaction mass of:",),
    # Methyl salicylate: EC 289-888-0 is an extract of wintergreen.
    4133: ("Gaultheria procumbens, ext.",),
    # Disilver oxide: EC 628-958-0 is mostly silver(II) oxide, a different oxide.
    9794626: ("SILVER OXIDE (PREDOM. SILVER(II) OXIDE)",),
}


def foreign_report_numbers(record: Any) -> Tuple[Any, ...]:
    """Reference numbers of the reports on a PUG View record that are about something else."""
    number = record.get("RecordNumber")
    names = FOREIGN_GHS_REPORTS.get(number) if isinstance(number, int) else None
    references = record.get("Reference")
    if not names or not isinstance(references, list):
        return ()
    return tuple(
        reference.get("ReferenceNumber")
        for reference in references
        if isinstance(reference, dict)
        and isinstance(reference.get("Name"), str)
        and reference["Name"].startswith(names)
    )
