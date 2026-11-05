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

COMMON_REAGENTS: Dict[str, CommonReagent] = {
    "10025-87-3": {"name": "Phosphorus oxychloride", "cid": 24813, "pictograms": ["GHS05", "GHS06", "GHS07", "GHS08"]},
    "10034-85-2": {"name": "Hydriodic acid", "cid": 24841, "pictograms": ["GHS04", "GHS05", "GHS06"]},
    "10035-10-6": {"name": "Hydrogen bromide", "cid": 260, "pictograms": ["GHS04", "GHS05", "GHS06", "GHS07"]},
    "10101-63-0": {"name": "Lead(II) iodide", "cid": 24931, "pictograms": ["GHS07", "GHS08", "GHS09"]},
    "10294-33-4": {"name": "Boron tribromide", "cid": 25134, "pictograms": ["GHS05", "GHS06"]},
    "10294-70-9": {"name": "Tin (II) iodide", "cid": 25138, "pictograms": []},
    "108-88-3": {"name": "Toluene", "cid": 1140, "pictograms": ["GHS02", "GHS07", "GHS08"]},
    "108-90-7": {"name": "Chlorobenzene", "cid": 7964, "pictograms": ["GHS02", "GHS07", "GHS09"]},
    "109-63-7": {"name": "Boron trifluoride diethyl etherate", "cid": 8000, "pictograms": []},
    "109-72-8": {"name": "n-Butyllithium", "cid": 53627823, "pictograms": ["GHS02", "GHS05", "GHS07"]},
    "109-99-9": {"name": "Tetrahydrofuran (THF)", "cid": 8028, "pictograms": ["GHS02", "GHS07", "GHS08"]},
    "110-54-3": {"name": "Hexane", "cid": 8058, "pictograms": ["GHS02", "GHS07", "GHS08", "GHS09"]},
    "110-86-1": {"name": "Pyridine", "cid": 1049, "pictograms": ["GHS02", "GHS07"]},
    "112926-00-8": {"name": "Silica gel 60", "cid": 24261, "pictograms": ["GHS07"]},
    "1191-15-7": {"name": "Diisobutylaluminum hydride (DIBAL-H)", "cid": 14487, "pictograms": ["GHS02", "GHS05"]},
    "121-44-8": {"name": "Triethylamine", "cid": 8471, "pictograms": ["GHS02", "GHS05", "GHS06", "GHS07"]},
    "128-08-5": {"name": "N-Bromosuccinimide (NBS)", "cid": 67184, "pictograms": ["GHS03", "GHS05", "GHS07", "GHS08", "GHS09"]},
    "1310-58-3": {"name": "Potassium hydroxide", "cid": 14797, "pictograms": ["GHS05", "GHS07"]},
    "1310-73-2": {"name": "Sodium hydroxide", "cid": 14798, "pictograms": ["GHS05", "GHS07"]},
    "1330-20-7": {"name": "Xylenes", "cid": 6850715, "pictograms": ["GHS02", "GHS07"]},
    "1336-21-6": {"name": "Ammonium hydroxide (Aqua Ammonia)", "cid": 14923, "pictograms": ["GHS05", "GHS07", "GHS09"]},
    "141-78-6": {"name": "Ethyl acetate", "cid": 8857, "pictograms": ["GHS02", "GHS07"]},
    "14221-01-3": {"name": "Tetrakis(triphenylphosphine)palladium(0)", "cid": 11979704, "pictograms": ["GHS07"]},
    "143-33-9": {"name": "Sodium cyanide", "cid": 8929, "pictograms": ["GHS05", "GHS06", "GHS07", "GHS08", "GHS09"]},
    "144-55-8": {"name": "Sodium hydrogen carbonate", "cid": 516892, "pictograms": []},
    "16853-85-3": {"name": "Lithium aluminum hydride (LAH)", "cid": 28112, "pictograms": ["GHS02", "GHS05"]},
    "16940-66-2": {"name": "Sodium borohydride", "cid": 4311764, "pictograms": ["GHS02", "GHS05", "GHS06", "GHS07", "GHS08"]},
    "20816-12-0": {"name": "Osmium tetroxide", "cid": 30318, "pictograms": ["GHS05", "GHS06", "GHS08"]},
    "25322-68-3": {"name": "Poly(ethylene glycol) (PEG)", "cid": None, "pictograms": []},
    "25895-60-7": {"name": "Sodium cyanoborohydride", "cid": 5003444, "pictograms": ["GHS02", "GHS05", "GHS06", "GHS09"]},
    "26628-22-8": {"name": "Sodium azide", "cid": 33557, "pictograms": ["GHS06", "GHS08", "GHS09"]},
    "30525-89-4": {"name": "Paraformaldehyde", "cid": None, "pictograms": []},
    "3375-31-3": {"name": "Palladium(II) acetate", "cid": 167845, "pictograms": ["GHS05", "GHS07", "GHS09"]},
    "497-19-8": {"name": "Sodium carbonate", "cid": 10340, "pictograms": ["GHS07"]},
    "50-00-0": {"name": "Formaldehyde", "cid": 712, "pictograms": ["GHS05", "GHS06", "GHS07", "GHS08"]},
    "50-99-7": {"name": "D-Glucose (Dextrose)", "cid": 107526, "pictograms": []},
    "584-08-7": {"name": "Potassium carbonate", "cid": 11430, "pictograms": ["GHS07"]},
    "60-29-7": {"name": "Ethyl ether", "cid": 3283, "pictograms": ["GHS02", "GHS07"]},
    "64-17-5": {"name": "Ethanol", "cid": 702, "pictograms": ["GHS02", "GHS07"]},
    "64-18-6": {"name": "Formic acid", "cid": 284, "pictograms": ["GHS02", "GHS05", "GHS06", "GHS07"]},
    "64-19-7": {"name": "Acetic acid (Glacial)", "cid": 176, "pictograms": ["GHS02", "GHS05"]},
    "67-56-1": {"name": "Methyl alcohol (Methanol)", "cid": 887, "pictograms": ["GHS02", "GHS06", "GHS08"]},
    "67-64-1": {"name": "Acetone", "cid": 180, "pictograms": ["GHS02", "GHS07"]},
    "67-66-3": {"name": "Chloroform", "cid": 6212, "pictograms": ["GHS06", "GHS07", "GHS08"]},
    "67-68-5": {"name": "Dimethyl sulfoxide (DMSO)", "cid": 679, "pictograms": ["GHS07"]},
    "68-12-2": {"name": "N,N-Dimethylformamide (DMF)", "cid": 6228, "pictograms": ["GHS02", "GHS07", "GHS08"]},
    "70693-62-8": {"name": "Potassium peroxymonosulfate (Oxone)", "cid": 15793144, "pictograms": ["GHS03", "GHS05", "GHS07"]},
    "71-43-2": {"name": "Benzene", "cid": 241, "pictograms": ["GHS02", "GHS07", "GHS08"]},
    "7440-05-3": {"name": "Palladium (Metal)", "cid": 23938, "pictograms": ["GHS02", "GHS07"]},
    "7440-23-5": {"name": "Sodium", "cid": 5360545, "pictograms": ["GHS02", "GHS05"]},
    "7440-44-0": {"name": "Active charcoal (Activated carbon)", "cid": 5462310, "pictograms": ["GHS07"]},
    "7446-70-0": {"name": "Aluminum chloride", "cid": 24012, "pictograms": ["GHS05"]},
    "75-05-8": {"name": "Acetonitrile", "cid": 6342, "pictograms": ["GHS02", "GHS07"]},
    "75-09-2": {"name": "Dichloromethane", "cid": 6344, "pictograms": ["GHS07", "GHS08"]},
    "7550-45-0": {"name": "Titanium tetrachloride", "cid": 24193, "pictograms": ["GHS05", "GHS06", "GHS07", "GHS08"]},
    "76-05-1": {"name": "Trifluoroacetic acid (TFA)", "cid": 6422, "pictograms": ["GHS05", "GHS07"]},
    "7631-86-9": {"name": "Silicon dioxide", "cid": 24261, "pictograms": ["GHS07"]},
    "7632-00-0": {"name": "Sodium nitrite", "cid": 23668193, "pictograms": ["GHS03", "GHS06", "GHS07", "GHS09"]},
    "7646-69-7": {"name": "Sodium hydride", "cid": 24758, "pictograms": []},
    "7647-01-0": {"name": "Hydrogen chloride", "cid": 313, "pictograms": ["GHS04", "GHS05", "GHS06", "GHS07"]},
    "7647-14-5": {"name": "Sodium chloride", "cid": 5234, "pictograms": ["GHS07"]},
    "7664-38-2": {"name": "Phosphoric acid", "cid": 1004, "pictograms": ["GHS05", "GHS07"]},
    "7664-39-3": {"name": "Hydrofluoric Acid", "cid": 14917, "pictograms": ["GHS05", "GHS06"]},
    "7664-41-7": {"name": "Ammonia", "cid": 222, "pictograms": ["GHS04", "GHS05", "GHS06", "GHS07", "GHS09"]},
    "7664-93-9": {"name": "Sulfuric acid", "cid": 1118, "pictograms": ["GHS05"]},
    "7681-52-9": {"name": "Sodium hypochlorite", "cid": 23665760, "pictograms": ["GHS05", "GHS07", "GHS09"]},
    "7681-65-4": {"name": "Copper(I) iodide (CuI)", "cid": 6432705, "pictograms": []},
    "7697-37-2": {"name": "Nitric acid", "cid": 944, "pictograms": ["GHS03", "GHS05", "GHS06"]},
    "7704-34-9": {"name": "Sulfur powder", "cid": 5362487, "pictograms": ["GHS07"]},
    "7719-09-7": {"name": "Thionyl chloride", "cid": 24386, "pictograms": ["GHS05", "GHS06", "GHS07"]},
    "7722-64-7": {"name": "Potassium permanganate", "cid": 516875, "pictograms": ["GHS03", "GHS05", "GHS07", "GHS08", "GHS09"]},
    "7722-84-1": {"name": "Hydrogen peroxide", "cid": 784, "pictograms": ["GHS03", "GHS05", "GHS07"]},
    "7726-95-6": {"name": "Bromine", "cid": 24408, "pictograms": ["GHS05", "GHS06", "GHS09"]},
    "7758-99-8": {"name": "Copper(II) sulfate pentahydrate", "cid": 24463, "pictograms": ["GHS07", "GHS09"]},
    "7761-88-8": {"name": "Silver nitrate", "cid": 24470, "pictograms": ["GHS03", "GHS05", "GHS08", "GHS09"]},
    "7789-17-5": {"name": "Cesium iodide", "cid": 24601, "pictograms": ["GHS07", "GHS09"]},
    "79-37-8": {"name": "Oxalyl chloride", "cid": 65578, "pictograms": ["GHS02", "GHS05", "GHS06", "GHS07"]},
    "8006-64-2": {"name": "Turpentine oil", "cid": None, "pictograms": []},
    "865-47-4": {"name": "Potassium tert-butoxide", "cid": 23665647, "pictograms": []},
    "9003-39-8": {"name": "Polyvinylpyrrolidone (PVP)", "cid": None, "pictograms": []},
    "917-54-4": {"name": "Methyllithium", "cid": 2724049, "pictograms": []},
    "937-14-4": {"name": "3-Chloroperbenzoic acid (mCPBA)", "cid": 70297, "pictograms": ["GHS02", "GHS03", "GHS05", "GHS07"]},
}
