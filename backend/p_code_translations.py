# -*- coding: utf-8 -*-
"""
GHS Precautionary Statement (P-code) translations: code → Traditional Chinese.

Covers single codes (P210, P233, ...) and common combined codes
(P301+P310, P303+P361+P353, ...).

Combined codes are stored with the `+` connector exactly as PubChem
returns them, not split into individual statements.

Source: UN GHS Rev.8 (2019), Taiwan CNS 15030 series.
"""

P_CODE_TRANSLATIONS: dict[str, str] = {

    # ─── General (P100 series) ────────────────────────────────────────────────
    "P101": "如就醫，攜帶產品容器或標示。",
    "P102": "置於孩童無法取得之處。",
    "P103": "使用前閱讀標示。",

    # ─── Prevention (P200 series) ─────────────────────────────────────────────
    "P201": "使用前取得特殊指示。",
    "P202": "在閱讀及瞭解所有安全措施前，切勿操作。",
    "P210": "遠離熱源、熱表面、火花、明火及其他點火源。禁止吸煙。",
    "P211": "勿對火焰或其他點火源噴灑。",
    "P212": "避免密閉加熱，避免減少衝擊或摩擦。",
    "P220": "遠離衣物及其他可燃性材料。",
    "P221": "採取預防措施，防止與可燃性物質混合。",
    "P222": "切勿接觸空氣。",
    "P223": "切勿接觸水。",
    "P230": "以……保持濕潤。",
    "P231": "在惰性氣體中操作及儲存。",
    "P232": "防止受潮。",
    "P233": "保持容器密閉。",
    "P234": "僅保存於原容器中。",
    "P235": "置於陰涼通風處。",
    "P240": "對容器及接收設備接地及等電位連接。",
    "P241": "使用防爆型電氣、通風、照明及其他設備。",
    "P242": "僅使用不產生火花的工具。",
    "P243": "採取措施防止靜電放電。",
    "P244": "防止閥門及配件接觸油脂。",
    "P250": "避免研磨、衝擊、摩擦。",
    "P251": "即使在使用後亦不得鑽孔、燃燒或焚燒。",
    "P260": "勿吸入粉塵、煙霧、氣體、霧滴、蒸氣或噴霧。",
    "P261": "避免吸入粉塵、煙霧、氣體、霧滴、蒸氣或噴霧。",
    "P262": "避免接觸眼睛、皮膚或衣物。",
    "P263": "懷孕期間及哺乳期間避免接觸。",
    "P264": "操作後徹底清洗雙手。",
    "P265": "操作後徹底清洗接觸部位。",
    "P270": "使用本品時勿飲食或吸煙。",
    "P271": "僅於室外或通風良好處使用。",
    "P272": "受污染的工作服不得帶出工作場所。",
    "P273": "避免排放至環境。",
    "P280": "佩戴防護手套、防護衣物、護眼用具及護面用具。",
    "P281": "使用規定的個人防護設備。",
    "P282": "佩戴抗冷手套及護面用具或護眼用具。",
    "P283": "佩戴耐火或阻燃的服裝。",
    "P284": "在通風不足時佩戴呼吸保護裝置。",
    "P285": "在通風不足時佩戴呼吸保護裝置。",

    # ─── Response (P300 series) ───────────────────────────────────────────────
    "P301": "若吞食：",
    "P302": "若皮膚接觸：",
    "P303": "若皮膚（或頭髮）接觸：",
    "P304": "若吸入：",
    "P305": "若眼睛接觸：",
    "P306": "若皮膚或頭髮接觸後：立即以大量水清洗所有受污染的衣物。",
    "P307": "若接觸：",
    "P308": "若曾接觸或有疑慮：",
    "P310": "立即聯絡中毒控制中心或醫師。",
    "P311": "聯絡中毒控制中心或醫師。",
    "P312": "若感到不適，聯絡中毒控制中心或醫師。",
    "P313": "諮詢醫師。",
    "P314": "若感到不適，諮詢醫師。",
    "P315": "立即諮詢醫師。",
    "P317": "立即諮詢醫師。",
    "P320": "需要立即進行特定治療（見本標示上的……）。",
    "P321": "需要進行特定治療（見本標示上的……）。",
    "P322": "需要進行特定措施（見本標示上的……）。",
    "P330": "漱口。",
    "P331": "請勿催吐。",
    "P332": "若皮膚過敏：",
    "P333": "若皮膚過敏或出現皮疹：",
    "P334": "浸入冷水中或以濕繃帶包紮。",
    "P335": "用刷子輕輕拂去皮膚上的粒子。",
    "P336": "以溫水解凍已凍傷的部位，切勿摩擦受影響的部位。",
    "P337": "若眼睛不適持續：",
    "P338": "如配戴隱形眼鏡且可輕易取出，請取出隱形眼鏡，繼續沖洗。",
    "P340": "將患者移至空氣新鮮處，保持呼吸舒適的姿勢休息。",
    "P341": "若呼吸困難，將患者移至空氣新鮮處，保持呼吸舒適的姿勢休息。",
    "P342": "若有呼吸系統症狀：",
    "P350": "以肥皂和大量清水輕柔清洗。",
    "P351": "以清水小心沖洗數分鐘。",
    "P352": "以大量肥皂和清水清洗。",
    "P353": "以水沖洗皮膚（沐浴）。",
    "P360": "在就醫前立即以大量清水沖洗受污染的衣物和皮膚。",
    "P361": "立即脫除所有受污染的衣物。",
    "P362": "脫除受污染的衣物。",
    "P363": "清洗後，受污染的衣物在重新使用前應先清洗。",
    "P364": "清洗後，應在重新使用前再清洗。",
    "P370": "火災時：",
    "P371": "大火及大量物質時：",
    "P372": "有爆炸危險。",
    "P373": "火焰到達爆炸物時，切勿滅火。",
    "P374": "在正常預防措施距離下滅火。",
    "P375": "因爆炸危險，在遠距離滅火。",
    "P376": "若安全可行，設法堵住洩漏。",
    "P377": "閥門漏氣起火：若安全可行，設法堵住洩漏；否則讓其燃燒直至燃料耗盡。",
    "P378": "使用……滅火。",
    "P380": "疏散區域。",
    "P381": "若安全可行，消除所有點火源。",
    "P390": "吸收溢出物，防止材料損壞。",
    "P391": "收集洩漏物。",

    # ─── Storage (P400 series) ────────────────────────────────────────────────
    "P401": "依照……儲存。",
    "P402": "儲存於乾燥處。",
    "P403": "儲存於通風良好處。",
    "P404": "儲存於密閉容器中。",
    "P405": "存放於加鎖處。",
    "P406": "儲存於耐腐蝕/……內襯容器中。",
    "P407": "在垛/棧板之間保持空氣間隙。",
    "P410": "防止陽光照射。",
    "P411": "儲存於不超過……°C的溫度。",
    "P412": "不得暴露於超過50°C的溫度。",
    "P413": "以……kg以上的大量儲存時，儲存於不超過……°C的溫度。",
    "P420": "遠離其他材料分開存放。",
    "P422": "在……中儲存。",

    # ─── Disposal (P500 series) ───────────────────────────────────────────────
    "P501": "依照地方、區域、國家及國際法規處置內容物及容器。",
    "P502": "參閱製造商或供應商的有關回收及再生利用資訊。",

    # ─── Common combined codes ────────────────────────────────────────────────

    # P264 + P265
    "P264+P265": "操作後徹底清洗所有接觸部位。",

    # P301 combinations
    "P301+P310":      "若吞食：立即聯絡中毒控制中心或醫師。",
    "P301+P312":      "若吞食且感到不適：聯絡中毒控制中心或醫師。",
    "P301+P330+P331": "若吞食：漱口。請勿催吐。",

    # P302 combinations
    "P302+P334":      "若皮膚接觸：浸入冷水中或以濕繃帶包紮。",
    "P302+P350":      "若皮膚接觸：以肥皂和大量清水輕柔清洗。",
    "P302+P352":      "若皮膚接觸：以大量肥皂和清水清洗。",
    "P302+P352+P333+P313": "若皮膚接觸：以大量肥皂和清水清洗。若皮膚過敏或出現皮疹：諮詢醫師。",

    # P303 combinations
    "P303+P361+P353": "若皮膚（或頭髮）接觸：立即脫除所有受污染的衣物，以水沖洗皮膚（沐浴）。",

    # P304 combinations
    "P304+P312":      "若吸入且感到不適：聯絡中毒控制中心或醫師。",
    "P304+P340":      "若吸入：將患者移至空氣新鮮處，保持呼吸舒適的姿勢休息。",
    "P304+P341":      "若吸入：若呼吸困難，將患者移至空氣新鮮處，保持呼吸舒適的姿勢休息。",

    # P305 combinations
    "P305+P351+P338": "若眼睛接觸：以清水小心沖洗數分鐘。如配戴隱形眼鏡且可輕易取出，請取出隱形眼鏡，繼續沖洗。",

    # P306 combinations
    "P306+P360":      "若皮膚或頭髮接觸後：在就醫前立即以大量清水沖洗受污染的衣物和皮膚。",

    # P307+P311
    "P307+P311":      "若接觸：聯絡中毒控制中心或醫師。",

    # P308 combinations
    "P308+P311":      "若曾接觸或有疑慮：聯絡中毒控制中心或醫師。",
    "P308+P313":      "若曾接觸或有疑慮：諮詢醫師。",

    # P332 combinations
    "P332+P313":      "若皮膚過敏：諮詢醫師。",

    # P333 combinations
    "P333+P313":      "若皮膚過敏或出現皮疹：諮詢醫師。",

    # P335+P334
    "P335+P334":      "用刷子輕輕拂去皮膚上的粒子，浸入冷水中或以濕繃帶包紮。",

    # P337 combinations
    "P337+P313":      "若眼睛不適持續：諮詢醫師。",
    "P337+P317":      "若眼睛不適持續：立即諮詢醫師。",

    # P342 combinations
    "P342+P311":      "若有呼吸系統症狀：聯絡中毒控制中心或醫師。",

    # P361+P364
    "P361+P364":      "立即脫除所有受污染的衣物，並在重新使用前先清洗。",

    # P362+P364
    "P362+P364":      "脫除受污染的衣物，並在重新使用前先清洗。",

    # P370 combinations
    "P370+P376":      "火災時：若安全可行，設法堵住洩漏。",
    "P370+P378":      "火災時：使用……滅火。",
    "P370+P380":      "火災時：疏散區域。",
    "P370+P380+P375": "火災時：疏散區域，因爆炸危險，在遠距離滅火。",

    # P371 combinations
    "P371+P380+P375": "大火及大量物質時：疏散區域，因爆炸危險，在遠距離滅火。",

    # P403 combinations
    "P403+P233":      "儲存於通風良好處，保持容器密閉。",
    "P403+P235":      "儲存於通風良好的陰涼處。",

    # P410 combinations
    "P410+P403":      "防止陽光照射，儲存於通風良好處。",
    "P410+P412":      "防止陽光照射，不得暴露於超過50°C的溫度。",

}

# ─── English P-code texts (UN GHS Rev.8 / Rev.10) ────────────────────────────

P_CODE_TEXTS_EN: dict[str, str] = {

    # ─── General (P100 series) ────────────────────────────────────────────────
    "P101": "If medical advice is needed, have product container or label at hand.",
    "P102": "Keep out of reach of children.",
    "P103": "Read label before use.",

    # ─── Prevention (P200 series) ─────────────────────────────────────────────
    "P201": "Obtain special instructions before use.",
    "P202": "Do not handle until all safety precautions have been read and understood.",
    "P210": "Keep away from heat, hot surfaces, sparks, open flames and other ignition sources. No smoking.",
    "P211": "Do not spray on an open flame or other ignition source.",
    "P212": "Avoid heating under confinement or reduction of the headspace.",
    "P220": "Keep away from clothing and other combustible materials.",
    "P221": "Take precautionary measures against mixing with combustibles.",
    "P222": "Do not allow contact with air.",
    "P223": "Do not allow contact with water.",
    "P230": "Keep wetted with ...",
    "P231": "Handle and store contents under inert gas.",
    "P232": "Protect from moisture.",
    "P233": "Keep container tightly closed.",
    "P234": "Keep only in original packaging.",
    "P235": "Keep cool.",
    "P240": "Ground and bond container and receiving equipment.",
    "P241": "Use explosion-proof electrical, ventilating, lighting and other equipment.",
    "P242": "Use non-sparking tools.",
    "P243": "Take action to prevent static discharges.",
    "P244": "Keep valves and fittings free from oil and grease.",
    "P250": "Do not subject to grinding, shock, friction.",
    "P251": "Do not pierce, burn, or incinerate, even after use.",
    "P260": "Do not breathe dust, fume, gas, mist, vapours, spray.",
    "P261": "Avoid breathing dust, fume, gas, mist, vapours, spray.",
    "P262": "Do not get in eyes, on skin, or on clothing.",
    "P263": "Avoid contact during pregnancy and while nursing.",
    "P264": "Wash hands thoroughly after handling.",
    "P265": "Wash affected body parts thoroughly after handling.",
    "P270": "Do not eat, drink or smoke when using this product.",
    "P271": "Use only outdoors or in a well-ventilated area.",
    "P272": "Contaminated work clothing should not be allowed out of the workplace.",
    "P273": "Avoid release to the environment.",
    "P280": "Wear protective gloves, protective clothing, eye protection, face protection.",
    "P281": "Use personal protective equipment as required.",
    "P282": "Wear cold-insulating gloves and either face shield or eye protection.",
    "P283": "Wear fire-resistant or flame-retardant clothing.",
    "P284": "In case of inadequate ventilation wear respiratory protection.",
    "P285": "In case of inadequate ventilation wear respiratory protection.",

    # ─── Response (P300 series) ───────────────────────────────────────────────
    "P301": "IF SWALLOWED:",
    "P302": "IF ON SKIN:",
    "P303": "IF ON SKIN (or hair):",
    "P304": "IF INHALED:",
    "P305": "IF IN EYES:",
    "P306": "IF ON SKIN OR HAIR: Immediately rinse contaminated clothing and skin with water.",
    "P307": "IF exposed:",
    "P308": "IF exposed or concerned:",
    "P310": "Immediately call a POISON CENTER or doctor.",
    "P311": "Call a POISON CENTER or doctor.",
    "P312": "Call a POISON CENTER or doctor if you feel unwell.",
    "P313": "Get medical advice.",
    "P314": "Get medical advice if you feel unwell.",
    "P315": "Get immediate medical advice.",
    "P317": "Get emergency medical help.",
    "P320": "Specific treatment is urgent (see ... on this label).",
    "P321": "Specific treatment (see ... on this label).",
    "P322": "Specific measures (see ... on this label).",
    "P330": "Rinse mouth.",
    "P331": "Do NOT induce vomiting.",
    "P332": "If skin irritation occurs:",
    "P333": "If skin irritation or rash occurs:",
    "P334": "Immerse in cool water or wrap in wet bandages.",
    "P335": "Brush off loose particles from skin.",
    "P336": "Thaw frosted parts with lukewarm water. Do not rub affected area.",
    "P337": "If eye irritation persists:",
    "P338": "Remove contact lenses, if present and easy to do. Continue rinsing.",
    "P340": "Remove person to fresh air and keep comfortable for breathing.",
    "P341": "If breathing is difficult, remove person to fresh air and keep comfortable for breathing.",
    "P342": "If experiencing respiratory symptoms:",
    "P350": "Gently wash with plenty of soap and water.",
    "P351": "Rinse cautiously with water for several minutes.",
    "P352": "Wash with plenty of water.",
    "P353": "Rinse skin with water or shower.",
    "P360": "Rinse immediately contaminated clothing and skin with plenty of water before removing clothes.",
    "P361": "Take off immediately all contaminated clothing.",
    "P362": "Take off contaminated clothing.",
    "P363": "Wash contaminated clothing before reuse.",
    "P364": "And wash it before reuse.",
    "P370": "In case of fire:",
    "P371": "In case of major fire and large quantities:",
    "P372": "Explosion risk.",
    "P373": "DO NOT fight fire when fire reaches explosives.",
    "P374": "Fight fire with normal precautions from a reasonable distance.",
    "P375": "Fight fire remotely due to the risk of explosion.",
    "P376": "Stop leak if safe to do so.",
    "P377": "Leaking gas fire: Do not extinguish, unless leak can be stopped safely.",
    "P378": "Use ... for extinction.",
    "P380": "Evacuate area.",
    "P381": "In case of leakage, eliminate all ignition sources.",
    "P390": "Absorb spillage to prevent material damage.",
    "P391": "Collect spillage.",

    # ─── Storage (P400 series) ────────────────────────────────────────────────
    "P401": "Store in accordance with ...",
    "P402": "Store in a dry place.",
    "P403": "Store in a well-ventilated place.",
    "P404": "Store in a closed container.",
    "P405": "Store locked up.",
    "P406": "Store in a corrosion-resistant container with a resistant inner liner.",
    "P407": "Maintain air gap between stacks or pallets.",
    "P410": "Protect from sunlight.",
    "P411": "Store at temperatures not exceeding ... °C.",
    "P412": "Do not expose to temperatures exceeding 50 °C.",
    "P413": "Store bulk masses greater than ... kg at temperatures not exceeding ... °C.",
    "P420": "Store away from other materials.",
    "P422": "Store contents under ...",

    # ─── Disposal (P500 series) ───────────────────────────────────────────────
    "P501": "Dispose of contents and container in accordance with local regulations.",
    "P502": "Refer to manufacturer or supplier for information on recovery or recycling.",

    # ─── Common combined codes ────────────────────────────────────────────────

    # P264 + P265
    "P264+P265": "Wash all exposed body parts thoroughly after handling.",

    # P301 combinations
    "P301+P310":      "IF SWALLOWED: Immediately call a POISON CENTER or doctor.",
    "P301+P312":      "IF SWALLOWED: Call a POISON CENTER or doctor if you feel unwell.",
    "P301+P330+P331": "IF SWALLOWED: Rinse mouth. Do NOT induce vomiting.",

    # P302 combinations
    "P302+P334":      "IF ON SKIN: Immerse in cool water or wrap in wet bandages.",
    "P302+P350":      "IF ON SKIN: Gently wash with plenty of soap and water.",
    "P302+P352":      "IF ON SKIN: Wash with plenty of water.",
    "P302+P352+P333+P313": "IF ON SKIN: Wash with plenty of water. If skin irritation or rash occurs: Get medical advice.",

    # P303 combinations
    "P303+P361+P353": "IF ON SKIN (or hair): Take off immediately all contaminated clothing. Rinse skin with water or shower.",

    # P304 combinations
    "P304+P312":      "IF INHALED: Call a POISON CENTER or doctor if you feel unwell.",
    "P304+P340":      "IF INHALED: Remove person to fresh air and keep comfortable for breathing.",
    "P304+P341":      "IF INHALED: If breathing is difficult, remove person to fresh air and keep comfortable for breathing.",

    # P305 combinations
    "P305+P351+P338": "IF IN EYES: Rinse cautiously with water for several minutes. Remove contact lenses, if present and easy to do. Continue rinsing.",

    # P306 combinations
    "P306+P360":      "IF ON SKIN OR HAIR: Rinse immediately contaminated clothing and skin with plenty of water before removing clothes.",

    # P307+P311
    "P307+P311":      "IF exposed: Call a POISON CENTER or doctor.",

    # P308 combinations
    "P308+P311":      "IF exposed or concerned: Call a POISON CENTER or doctor.",
    "P308+P313":      "IF exposed or concerned: Get medical advice.",

    # P332 combinations
    "P332+P313":      "If skin irritation occurs: Get medical advice.",

    # P333 combinations
    "P333+P313":      "If skin irritation or rash occurs: Get medical advice.",

    # P335+P334
    "P335+P334":      "Brush off loose particles from skin. Immerse in cool water or wrap in wet bandages.",

    # P337 combinations
    "P337+P313":      "If eye irritation persists: Get medical advice.",
    "P337+P317":      "If eye irritation persists: Get emergency medical help.",

    # P342 combinations
    "P342+P311":      "If experiencing respiratory symptoms: Call a POISON CENTER or doctor.",

    # P361+P364
    "P361+P364":      "Take off immediately all contaminated clothing and wash it before reuse.",

    # P362+P364
    "P362+P364":      "Take off contaminated clothing and wash it before reuse.",

    # P370 combinations
    "P370+P376":      "In case of fire: Stop leak if safe to do so.",
    "P370+P378":      "In case of fire: Use ... for extinction.",
    "P370+P380":      "In case of fire: Evacuate area.",
    "P370+P380+P375": "In case of fire: Evacuate area. Fight fire remotely due to the risk of explosion.",

    # P371 combinations
    "P371+P380+P375": "In case of major fire and large quantities: Evacuate area. Fight fire remotely due to the risk of explosion.",

    # P403 combinations
    "P403+P233":      "Store in a well-ventilated place. Keep container tightly closed.",
    "P403+P235":      "Store in a well-ventilated place. Keep cool.",

    # P410 combinations
    "P410+P403":      "Protect from sunlight. Store in a well-ventilated place.",
    "P410+P412":      "Protect from sunlight. Do not expose to temperatures exceeding 50 °C.",

}
