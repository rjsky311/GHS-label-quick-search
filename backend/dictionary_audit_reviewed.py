"""What a person already looked at in dictionary_resolution_audit.py.

REVIEWED_AUDIT_ROWS: the audit flags these, and the record is right anyway. A row
applies only while the site still uses that CID for the CAS.

COMMON_REAGENTS: what the site showed for common reagents when last reviewed. A
difference is not an error, since PubChem's data changes. It means look again.
"""

from __future__ import annotations

from typing import Dict, List, Optional, TypedDict


class ReviewedAuditRow(TypedDict):
    cid: Optional[int]
    note: str


class CommonReagent(TypedDict):
    name: str
    cid: Optional[int]
    pictograms: List[str]


_CAS_OMITTED = "The record is this substance. PubChem's synonyms leave out the CAS."
_HYDRATE = "The record is this substance as a hydrate or salt form, and PubChem's synonyms leave out the CAS."
_OTHER_WORDS = "The report names this substance in other words."
_EC_ONLY = "ECHA lists the report by EC number only, so its name cannot be compared. It is on this record."

REVIEWED_AUDIT_ROWS: Dict[str, ReviewedAuditRow] = {
    # The record does not list the CAS.
    "10031-22-8": {"cid": 24831, "note": _CAS_OMITTED},
    "10101-63-0": {"cid": 24931, "note": _CAS_OMITTED},
    "12069-69-1": {"cid": 156614043, "note": "The mixed carbonate-hydroxide record, EU CLP entry. Keeps GHS07, GHS09."},
    "1330-20-7": {"cid": 6850715, "note": "The mixed-isomer record, chosen in reviewed_cas_resolutions.py."},
    "13462-88-9": {"cid": 278492, "note": _CAS_OMITTED},
    "14459-95-1": {"cid": 9605257, "note": _HYDRATE},
    "14898-67-0": {"cid": 6093376, "note": _HYDRATE},
    "14965-49-2": {"cid": 519034, "note": _CAS_OMITTED},
    "15694-70-9": {"cid": 27506, "note": "Nickel formate; holds the EU carcinogen classification for this salt."},
    "16774-21-3": {"cid": 180504, "note": _CAS_OMITTED},
    "16961-25-4": {"cid": 44134746, "note": _HYDRATE},
    "17476-04-9": {"cid": 6328594, "note": _CAS_OMITTED},
    "20667-12-3": {"cid": 9794626, "note": _CAS_OMITTED},
    "207683-19-0": {"cid": 16211346, "note": _HYDRATE},
    "25429-23-6": {"cid": 10897, "note": "The CAS is the mixed isomers; the record does not fix the geometry."},
    "27610-45-3": {"cid": 237873, "note": _HYDRATE},
    "32993-05-8": {"cid": 10887092, "note": _CAS_OMITTED},
    "51364-51-3": {"cid": 9832798, "note": _CAS_OMITTED},
    "51429-74-4": {"cid": 16211564, "note": _HYDRATE},
    "530-59-6": {"cid": 637775, "note": _CAS_OMITTED},
    "70693-62-8": {"cid": 15793144, "note": "The triple salt, chosen in reviewed_cas_resolutions.py."},
    "7789-78-8": {"cid": 3033859, "note": _CAS_OMITTED},
    "941689-36-7": {"cid": 7019830, "note": "ECHA names the (5S) form, which is this lysine derivative."},
    # The main classification's report does not use a name the record lists.
    "100-53-8": {"cid": 7509, "note": _OTHER_WORDS},
    "10025-69-1": {"cid": 43835034, "note": _OTHER_WORDS},
    "10101-41-4": {"cid": 24928, "note": _OTHER_WORDS},
    "10125-13-0": {"cid": 16219111, "note": _OTHER_WORDS},
    "10213-79-3": {"cid": 61495, "note": _OTHER_WORDS},
    "104-81-4": {"cid": 7721, "note": _OTHER_WORDS},
    "110046-60-1": {"cid": 11065610, "note": _EC_ONLY},
    "13209-15-9": {"cid": 83234, "note": _OTHER_WORDS},
    "135999-16-5": {"cid": 15073622, "note": _EC_ONLY},
    "14901-07-6": {"cid": 26955, "note": _OTHER_WORDS},
    "15629-92-2": {"cid": 2724937, "note": _OTHER_WORDS},
    "161265-03-8": {"cid": 636044, "note": _OTHER_WORDS},
    "1676-73-9": {"cid": 122337, "note": _OTHER_WORDS},
    "17201-43-3": {"cid": 86996, "note": _OTHER_WORDS},
    "29858-07-9": {"cid": 9903262, "note": _OTHER_WORDS},
    "30562-09-5": {"cid": 6436668, "note": _OTHER_WORDS},
    "3460-24-0": {"cid": 2724603, "note": _EC_ONLY},
    "34699-28-0": {"cid": 24882208, "note": _EC_ONLY},
    "41492-05-1": {"cid": 521059, "note": _OTHER_WORDS},
    "42366-72-3": {"cid": 16212085, "note": _OTHER_WORDS},
    "459-46-1": {"cid": 68021, "note": _OTHER_WORDS},
    "564483-18-7": {"cid": 11155794, "note": _OTHER_WORDS},
    "623-24-5": {"cid": 69335, "note": _OTHER_WORDS},
    "77-54-3": {"cid": 13918856, "note": _OTHER_WORDS},
    "865-48-5": {"cid": 45051916, "note": _OTHER_WORDS},
    "90076-65-6": {"cid": 87103854, "note": _OTHER_WORDS},
    "95464-05-4": {"cid": 51341998, "note": _OTHER_WORDS},
    "98327-87-8": {"cid": 634876, "note": _OTHER_WORDS},
    # No report's H codes match the main classification exactly.
    "1336-21-6": {"cid": 14923, "note": "Ammonia solution; the reports name it as ammonia ...%."},
}

COMMON_REAGENTS: Dict[str, CommonReagent] = {}
