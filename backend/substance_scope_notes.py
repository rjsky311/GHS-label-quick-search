"""Scope notes for CAS numbers whose everyday name and GHS data cover
different things.

A scope note tells the user which substance the displayed GHS
classification actually describes. It is a reminder, not a
classification: it never adds, removes, or changes pictograms, signal
words, or H/P statements. The classification shown stays the PubChem
result. Each note carries its own source so its wording can be checked.

Keep this list short and only for cases where a common lab name points
at a classification for a different physical form (gas vs. solution,
anhydrous vs. aqueous, stabilised product vs. pure substance).
"""

from typing import Dict, List

SubstanceScopeNote = Dict[str, str]

SUBSTANCE_SCOPE_NOTES: Dict[str, List[SubstanceScopeNote]] = {
    # Hydrogen chloride vs. hydrochloric acid. PubChem's GHS data for
    # 7647-01-0 is the hydrogen chloride classification, which includes the
    # compressed gas (GHS04, H280) and gas inhalation toxicity. Lab users
    # mostly hold the aqueous acid. The solution's classification is cited
    # here as a reminder only; it is NOT printed as label data.
    "7647-01-0": [
        {
            "code": "hydrogen-chloride-includes-gas",
            "text_en": (
                "This GHS classification is for hydrogen chloride (CAS "
                "7647-01-0), including the gas, so it can show gas-only "
                "hazards such as GHS04. Hydrochloric acid solution supplier "
                "labels are usually GHS05 and GHS07 (H290, H314, H335). "
                "The SDS of the bottle in hand governs."
            ),
            "text_zh": (
                "此 GHS 分類是氯化氫（CAS 7647-01-0，含氣體）的分類，"
                "可能出現 GHS04 等只適用於氣體的危害。鹽酸水溶液的供應商"
                "標籤通常是 GHS05、GHS07（H290、H314、H335）。"
                "以手上那瓶的安全資料表（SDS）為準。"
            ),
            "source": (
                "Hydrochloric acid solution: CLP Annex VI index "
                "017-002-01-X (H314, H335); H290 from supplier SDS."
            ),
        }
    ],
    # Ammonia (anhydrous gas) vs. ammonia water. The local dictionary used
    # to show "氨 (氨水)" for 7664-41-7, which read as the aqueous solution.
    "7664-41-7": [
        {
            "code": "ammonia-anhydrous-not-solution",
            "text_en": (
                "This entry is ammonia (anhydrous, CAS 7664-41-7). Ammonia "
                "water (ammonium hydroxide solution) is CAS 1336-21-6; "
                "check the SDS of the bottle in hand."
            ),
            "text_zh": (
                "此條目是氨（無水，CAS 7664-41-7）。氨水（氫氧化銨水溶液）"
                "的 CAS 是 1336-21-6；以手上那瓶的安全資料表（SDS）為準。"
            ),
            "source": "Identity note; CAS 1336-21-6 is ammonium hydroxide (ammonia solution).",
        }
    ],
    # Formaldehyde vs. formalin. The classification for 50-00-0 covers
    # formaldehyde solutions, but laboratory formalin is commonly
    # stabilised with methanol, whose hazards are not in that
    # classification.
    "50-00-0": [
        {
            "code": "formalin-methanol-stabiliser",
            "text_en": (
                "Formalin (formaldehyde solution) is often stabilised with "
                "methanol; this classification does not add methanol's "
                "hazards. Check the SDS of the bottle in hand."
            ),
            "text_zh": (
                "福馬林（甲醛水溶液）常加甲醇當安定劑；此分類不含甲醇的"
                "危害。以手上那瓶的安全資料表（SDS）為準。"
            ),
            "source": "Supplier SDS for methanol-stabilised formaldehyde solutions.",
        }
    ],
}


def get_substance_scope_notes(cas_number: str) -> List[SubstanceScopeNote]:
    """Return copies of the scope notes for a CAS number (empty if none)."""
    key = (cas_number or "").strip()
    return [dict(note) for note in SUBSTANCE_SCOPE_NOTES.get(key, [])]
