const pictograms = (...codes) => codes.map((code) => ({ code }));

const hp = (code, text_en, text_zh = "") => ({ code, text_en, text_zh });

const statements = (prefix, count, text) => {
  const sourceTexts = Array.isArray(text) ? text : [text];
  return Array.from({ length: count }, (_, index) => ({
    code:
      typeof sourceTexts[index % sourceTexts.length] === "object"
        ? sourceTexts[index % sourceTexts.length].code || `${prefix}${300 + index}`
        : `${prefix}${300 + index}`,
    text_en:
      typeof sourceTexts[index % sourceTexts.length] === "object"
        ? sourceTexts[index % sourceTexts.length].text_en ||
          sourceTexts[index % sourceTexts.length].text ||
          ""
        : sourceTexts[index % sourceTexts.length] ||
          sourceTexts[sourceTexts.length - 1] ||
          "",
    text_zh:
      typeof sourceTexts[index % sourceTexts.length] === "object"
        ? sourceTexts[index % sourceTexts.length].text_zh || ""
        : "",
  }));
};

const DEFAULT_HAZARD_TEXTS = [
  hp("H315", "Causes skin irritation.", "造成皮膚刺激。"),
  hp("H319", "Causes serious eye irritation.", "造成嚴重眼睛刺激。"),
  hp("H335", "May cause respiratory irritation.", "可能造成呼吸道刺激。"),
  hp(
    "H412",
    "Harmful to aquatic life with long lasting effects.",
    "對水生生物有害並具有長期持續影響。",
  ),
];

const DEFAULT_PRECAUTION_TEXTS = [
  hp("P261", "Avoid breathing vapors, mist, or spray.", "避免吸入蒸氣、霧滴或噴霧。"),
  hp("P264", "Wash hands thoroughly after handling.", "操作後徹底清洗雙手。"),
  hp(
    "P280",
    "Wear protective gloves and eye protection.",
    "佩戴防護手套與護眼用具。",
  ),
  hp(
    "P501",
    "Dispose of contents and container in accordance with local regulations.",
    "依照地方、區域、國家及國際法規處置內容物及容器。",
  ),
];

const FORMALDEHYDE_HAZARDS = [
  hp("H301", "Toxic if swallowed.", "吞食有毒。"),
  hp("H311", "Toxic in contact with skin.", "皮膚接觸有毒。"),
  hp("H314", "Causes severe skin burns and eye damage.", "造成嚴重皮膚灼傷和眼睛損傷。"),
  hp("H317", "May cause an allergic skin reaction.", "可能造成皮膚過敏反應。"),
  hp("H331", "Toxic if inhaled.", "吸入有毒。"),
  hp("H335", "May cause respiratory irritation.", "可能造成呼吸道刺激。"),
  hp("H341", "Suspected of causing genetic defects.", "懷疑造成遺傳性缺陷。"),
  hp("H350", "May cause cancer.", "可能致癌。"),
];

const FORMALDEHYDE_PRECAUTIONS = [
  hp("P201", "Obtain special instructions before use.", "使用前取得特別指示。"),
  hp("P202", "Do not handle until all safety precautions have been read and understood.", "在閱讀並瞭解所有安全預防措施前，切勿操作。"),
  hp("P260", "Do not breathe vapors, mist, or spray.", "切勿吸入蒸氣、霧滴或噴霧。"),
  hp("P264", "Wash hands and exposed skin thoroughly after handling.", "操作後徹底清洗雙手與暴露皮膚。"),
  hp("P270", "Do not eat, drink, or smoke when using this product.", "使用本品時勿飲食或吸菸。"),
  hp("P271", "Use only outdoors or in a well-ventilated area.", "僅於室外或通風良好處使用。"),
  hp("P280", "Wear protective gloves, protective clothing, eye protection, and face protection.", "佩戴防護手套、防護衣物、護眼用具及護面用具。"),
  hp("P301+P310", "IF SWALLOWED: Immediately call a poison center or physician.", "若吞食：立即致電毒物中心或醫師。"),
  hp("P303+P361+P353", "IF ON SKIN: Take off immediately all contaminated clothing and rinse skin with water.", "若皮膚接觸：立即脫除所有受污染衣物並以水沖洗。"),
  hp("P304+P340", "IF INHALED: Remove person to fresh air and keep comfortable for breathing.", "若吸入：將人員移至空氣新鮮處，保持呼吸舒適。"),
  hp("P305+P351+P338", "IF IN EYES: Rinse cautiously with water for several minutes.", "若進入眼睛：以清水小心沖洗數分鐘。"),
  hp("P308+P313", "IF exposed or concerned: Get medical advice or attention.", "如暴露或有疑慮：尋求醫療建議或照護。"),
];

const SULFURIC_ACID_HAZARDS = [
  hp("H290", "May be corrosive to metals.", "可能腐蝕金屬。"),
  hp("H314", "Causes severe skin burns and eye damage.", "造成嚴重皮膚灼傷和眼睛損傷。"),
  hp("H318", "Causes serious eye damage.", "造成嚴重眼睛損傷。"),
  hp("H335", "May cause respiratory irritation.", "可能造成呼吸道刺激。"),
  hp("H402", "Harmful to aquatic life.", "對水生生物有害。"),
  hp("H412", "Harmful to aquatic life with long lasting effects.", "對水生生物有害並具有長期持續影響。"),
];

const SULFURIC_ACID_PRECAUTIONS = [
  hp("P234", "Keep only in original packaging.", "僅保存在原容器中。"),
  hp("P260", "Do not breathe mist, vapors, or spray.", "切勿吸入霧滴、蒸氣或噴霧。"),
  hp("P264", "Wash hands and exposed skin thoroughly after handling.", "操作後徹底清洗雙手與暴露皮膚。"),
  hp("P280", "Wear protective gloves, protective clothing, eye protection, and face protection.", "佩戴防護手套、防護衣物、護眼用具及護面用具。"),
  hp("P301+P330+P331", "IF SWALLOWED: Rinse mouth. Do NOT induce vomiting.", "若吞食：漱口。請勿催吐。"),
  hp("P303+P361+P353", "IF ON SKIN: Take off immediately all contaminated clothing and rinse skin with water.", "若皮膚接觸：立即脫除所有受污染衣物並以水沖洗。"),
  hp("P304+P340", "IF INHALED: Remove person to fresh air and keep comfortable for breathing.", "若吸入：將人員移至空氣新鮮處，保持呼吸舒適。"),
  hp("P305+P351+P338", "IF IN EYES: Rinse cautiously with water for several minutes.", "若進入眼睛：以清水小心沖洗數分鐘。"),
];

const ETHANOL_HAZARDS = [
  hp("H225", "Highly flammable liquid and vapor.", "高度易燃液體和蒸氣。"),
  hp("H319", "Causes serious eye irritation.", "造成嚴重眼睛刺激。"),
];

const ETHANOL_PRECAUTIONS = [
  hp("P210", "Keep away from heat, hot surfaces, sparks, open flames, and other ignition sources.", "遠離熱源、高溫表面、火花、明火及其他引火源。"),
  hp("P280", "Wear protective gloves and eye protection.", "佩戴防護手套與護眼用具。"),
];

const ACETALDEHYDE_HAZARDS = [
  hp("H224", "Extremely flammable liquid and vapor.", "極易燃液體和蒸氣。"),
  hp("H319", "Causes serious eye irritation.", "造成嚴重眼睛刺激。"),
  hp("H335", "May cause respiratory irritation.", "可能造成呼吸道刺激。"),
  hp("H351", "Suspected of causing cancer.", "懷疑會致癌。"),
];

const ACETALDEHYDE_PRECAUTIONS = [
  hp("P210", "Keep away from heat, sparks, open flames, and hot surfaces.", "遠離熱源、火花、明火及高溫表面。"),
  hp("P261", "Avoid breathing vapors or spray.", "避免吸入蒸氣或噴霧。"),
  hp("P305+P351+P338", "IF IN EYES: Rinse cautiously with water for several minutes.", "若進入眼睛：以清水小心沖洗數分鐘。"),
  hp("P403+P235", "Store in a well-ventilated place. Keep cool.", "儲存於通風良好處。保持低溫。"),
];

const HYDROGEN_PEROXIDE_HAZARDS = [
  hp("H271", "May cause fire or explosion; strong oxidizer.", "可能引起火災或爆炸；強氧化劑。"),
  hp("H302", "Harmful if swallowed.", "吞食有害。"),
  hp("H314", "Causes severe skin burns and eye damage.", "造成嚴重皮膚灼傷和眼睛損傷。"),
  hp("H335", "May cause respiratory irritation.", "可能造成呼吸道刺激。"),
];

const HYDROGEN_PEROXIDE_PRECAUTIONS = [
  hp("P220", "Keep away from clothing and other combustible materials.", "遠離衣物及其他可燃材料。"),
  hp("P280", "Wear protective gloves, protective clothing, and eye protection.", "佩戴防護手套、防護衣物與護眼用具。"),
  hp("P305+P351+P338", "IF IN EYES: Rinse cautiously with water for several minutes.", "若進入眼睛：以清水小心沖洗數分鐘。"),
  hp("P370+P378", "In case of fire: Use appropriate media to extinguish.", "發生火災時：使用適當滅火介質滅火。"),
];

const METHANOL_HAZARDS = [
  hp("H225", "Highly flammable liquid and vapor.", "高度易燃液體和蒸氣。"),
  hp("H301", "Toxic if swallowed.", "吞食有毒。"),
  hp("H311", "Toxic in contact with skin.", "皮膚接觸有毒。"),
  hp("H331", "Toxic if inhaled.", "吸入有毒。"),
];

const METHANOL_PRECAUTIONS = [
  hp("P210", "Keep away from heat, sparks, open flames, and hot surfaces.", "遠離熱源、火花、明火及高溫表面。"),
  hp("P260", "Do not breathe vapors or spray.", "切勿吸入蒸氣或噴霧。"),
  hp("P280", "Wear protective gloves, protective clothing, and eye protection.", "佩戴防護手套、防護衣物與護眼用具。"),
  hp("P301+P310", "IF SWALLOWED: Immediately call a poison center or physician.", "若吞食：立即致電毒物中心或醫師。"),
];

const HAZARD_LIBRARY = {
  H224: hp("H224", "Extremely flammable liquid and vapor.", "極易燃液體和蒸氣。"),
  H225: hp("H225", "Highly flammable liquid and vapor.", "高度易燃液體和蒸氣。"),
  H226: hp("H226", "Flammable liquid and vapor.", "易燃液體和蒸氣。"),
  H301: hp("H301", "Toxic if swallowed.", "吞食有毒。"),
  H302: hp("H302", "Harmful if swallowed.", "吞食有害。"),
  H304: hp("H304", "May be fatal if swallowed and enters airways.", "吞食並進入呼吸道可能致命。"),
  H311: hp("H311", "Toxic in contact with skin.", "皮膚接觸有毒。"),
  H312: hp("H312", "Harmful in contact with skin.", "皮膚接觸有害。"),
  H314: hp("H314", "Causes severe skin burns and eye damage.", "造成嚴重皮膚灼傷和眼睛損傷。"),
  H315: hp("H315", "Causes skin irritation.", "造成皮膚刺激。"),
  H317: hp("H317", "May cause an allergic skin reaction.", "可能造成皮膚過敏反應。"),
  H318: hp("H318", "Causes serious eye damage.", "造成嚴重眼睛損傷。"),
  H319: hp("H319", "Causes serious eye irritation.", "造成嚴重眼睛刺激。"),
  H330: hp("H330", "Fatal if inhaled.", "吸入致命。"),
  H331: hp("H331", "Toxic if inhaled.", "吸入有毒。"),
  H332: hp("H332", "Harmful if inhaled.", "吸入有害。"),
  H335: hp("H335", "May cause respiratory irritation.", "可能造成呼吸道刺激。"),
  H336: hp("H336", "May cause drowsiness or dizziness.", "可能造成嗜睡或暈眩。"),
  H340: hp("H340", "May cause genetic defects.", "可能造成遺傳性缺陷。"),
  H341: hp("H341", "Suspected of causing genetic defects.", "懷疑造成遺傳性缺陷。"),
  H350: hp("H350", "May cause cancer.", "可能致癌。"),
  H351: hp("H351", "Suspected of causing cancer.", "懷疑會致癌。"),
  H360: hp("H360", "May damage fertility or the unborn child.", "可能損害生育能力或胎兒。"),
  H360D: hp("H360D", "May damage the unborn child.", "可能損害胎兒。"),
  H361: hp("H361", "Suspected of damaging fertility or the unborn child.", "懷疑損害生育能力或胎兒。"),
  H361d: hp("H361d", "Suspected of damaging the unborn child.", "懷疑損害胎兒。"),
  H361f: hp("H361f", "Suspected of damaging fertility.", "懷疑損害生育能力。"),
  H372: hp("H372", "Causes damage to organs through prolonged or repeated exposure.", "長期或反覆暴露會對器官造成損害。"),
  H373: hp("H373", "May cause damage to organs through prolonged or repeated exposure.", "長期或反覆暴露可能對器官造成損害。"),
  H400: hp("H400", "Very toxic to aquatic life.", "對水生生物毒性非常大。"),
  H410: hp("H410", "Very toxic to aquatic life with long lasting effects.", "對水生生物毒性非常大並具有長期持續影響。"),
  H411: hp("H411", "Toxic to aquatic life with long lasting effects.", "對水生生物有毒並具有長期持續影響。"),
  H412: hp("H412", "Harmful to aquatic life with long lasting effects.", "對水生生物有害並具有長期持續影響。"),
};

const PRECAUTION_LIBRARY = {
  P201: hp("P201", "Obtain special instructions before use.", "使用前取得特別指示。"),
  P202: hp("P202", "Do not handle until all safety precautions have been read and understood.", "在閱讀並瞭解所有安全預防措施前，切勿操作。"),
  P210: hp("P210", "Keep away from heat, hot surfaces, sparks, open flames, and other ignition sources.", "遠離熱源、高溫表面、火花、明火及其他引火源。"),
  P233: hp("P233", "Keep container tightly closed.", "保持容器密閉。"),
  P240: hp("P240", "Ground and bond container and receiving equipment.", "將容器和接收設備接地並等電位連接。"),
  P260: hp("P260", "Do not breathe dust, fume, gas, mist, vapors, or spray.", "切勿吸入粉塵、煙霧、氣體、霧滴、蒸氣或噴霧。"),
  P261: hp("P261", "Avoid breathing vapors, mist, or spray.", "避免吸入蒸氣、霧滴或噴霧。"),
  P264: hp("P264", "Wash hands and exposed skin thoroughly after handling.", "操作後徹底清洗雙手與暴露皮膚。"),
  P270: hp("P270", "Do not eat, drink, or smoke when using this product.", "使用本品時勿飲食或吸菸。"),
  P271: hp("P271", "Use only outdoors or in a well-ventilated area.", "僅於室外或通風良好處使用。"),
  P273: hp("P273", "Avoid release to the environment.", "避免排放至環境。"),
  P280: hp("P280", "Wear protective gloves, protective clothing, and eye protection.", "佩戴防護手套、防護衣物與護眼用具。"),
  "P301+P310": hp("P301+P310", "IF SWALLOWED: Immediately call a poison center or physician.", "若吞食：立即致電毒物中心或醫師。"),
  "P301+P330+P331": hp("P301+P330+P331", "IF SWALLOWED: Rinse mouth. Do NOT induce vomiting.", "若吞食：漱口。請勿催吐。"),
  P331: hp("P331", "Do NOT induce vomiting.", "請勿催吐。"),
  "P303+P361+P353": hp("P303+P361+P353", "IF ON SKIN: Take off immediately all contaminated clothing and rinse skin with water.", "若皮膚接觸：立即脫除受污染衣物並以水沖洗。"),
  "P304+P340": hp("P304+P340", "IF INHALED: Remove person to fresh air and keep comfortable for breathing.", "若吸入：將患者移至空氣新鮮處，保持呼吸舒適。"),
  "P305+P351+P338": hp("P305+P351+P338", "IF IN EYES: Rinse cautiously with water for several minutes.", "若進入眼睛：以清水小心沖洗數分鐘。"),
  "P308+P313": hp("P308+P313", "IF exposed or concerned: Get medical advice or attention.", "如暴露或擔心：尋求醫療建議或照護。"),
  "P337+P317": hp("P337+P317", "If eye irritation persists: Get medical help.", "如眼睛刺激持續：取得醫療協助。"),
  P391: hp("P391", "Collect spillage.", "收集溢出物。"),
  "P403+P233": hp("P403+P233", "Store in a well-ventilated place. Keep container tightly closed.", "儲存於通風良好處。保持容器密閉。"),
  "P403+P235": hp("P403+P235", "Store in a well-ventilated place. Keep cool.", "儲存於通風良好處。保持低溫。"),
  P405: hp("P405", "Store locked up.", "存放於加鎖處。"),
  P501: hp("P501", "Dispose of contents and container in accordance with local regulations.", "依照地方、區域、國家及國際法規處置內容物及容器。"),
};

const unique = (values) => Array.from(new Set(values.filter(Boolean)));

const pictogramsForHazards = (hazardCodes) =>
  unique([
    hazardCodes.some((code) => ["H224", "H225", "H226"].includes(code)) &&
      "GHS02",
    hazardCodes.some((code) => ["H314", "H318"].includes(code)) && "GHS05",
    hazardCodes.some((code) =>
      ["H300", "H301", "H310", "H311", "H330", "H331"].includes(code),
    ) && "GHS06",
    hazardCodes.some((code) =>
      [
        "H304",
        "H340",
        "H341",
        "H350",
        "H351",
        "H360",
        "H360D",
        "H361",
        "H361d",
        "H361f",
        "H372",
        "H373",
      ].includes(code),
    ) && "GHS08",
    hazardCodes.some((code) => ["H400", "H410", "H411", "H412"].includes(code)) &&
      "GHS09",
    hazardCodes.some((code) =>
      ["H302", "H312", "H315", "H317", "H319", "H332", "H335", "H336"].includes(
        code,
      ),
    ) && "GHS07",
  ]);

const precautionsForHazards = (hazardCodes) => {
  const codes = [];
  if (hazardCodes.some((code) => ["H224", "H225", "H226"].includes(code))) {
    codes.push("P210", "P233", "P240", "P403+P235");
  }
  if (hazardCodes.some((code) => ["H314", "H318"].includes(code))) {
    codes.push("P260", "P280", "P301+P330+P331", "P305+P351+P338");
  }
  if (hazardCodes.some((code) => ["H301", "H311", "H330", "H331"].includes(code))) {
    codes.push("P260", "P270", "P280", "P301+P310", "P304+P340");
  }
  if (hazardCodes.includes("H304")) {
    codes.push("P301+P310", "P331", "P405");
  }
  if (
    hazardCodes.some((code) =>
      ["H340", "H341", "H350", "H351", "H360", "H360D", "H361", "H361d", "H361f", "H372", "H373"].includes(code),
    )
  ) {
    codes.push("P201", "P202", "P260", "P280", "P308+P313", "P405");
  }
  if (hazardCodes.some((code) => ["H315", "H317", "H319", "H335", "H336"].includes(code))) {
    codes.push("P261", "P264", "P271", "P280", "P337+P317");
  }
  if (hazardCodes.some((code) => ["H400", "H410", "H411", "H412"].includes(code))) {
    codes.push("P273", "P391", "P501");
  }
  if (!codes.length) codes.push("P264", "P280", "P501");
  return unique(codes)
    .filter((code) => PRECAUTION_LIBRARY[code])
    .map((code) => PRECAUTION_LIBRARY[code]);
};

const buildHazardProfile = (hazardCodes, { signal = "Danger" } = {}) => ({
  signal,
  pictogramCodes: pictogramsForHazards(hazardCodes),
  hazards: hazardCodes.map((code) => HAZARD_LIBRARY[code] || hp(code, code, code)),
  precautions: precautionsForHazards(hazardCodes),
});

const SPARSE_HAZARD_PROFILE_BY_CAS = {
  "67-64-1": buildHazardProfile(["H225", "H319", "H336"], { signal: "Danger" }),
  "108-88-3": buildHazardProfile(["H225", "H304", "H315", "H336", "H361d", "H373"]),
  "78-93-3": buildHazardProfile(["H225", "H319", "H335", "H336"], { signal: "Danger" }),
  "141-78-6": buildHazardProfile(["H225", "H315", "H319", "H336"], { signal: "Danger" }),
  "109-99-9": buildHazardProfile(["H225", "H319", "H335"]),
  "75-05-8": buildHazardProfile(["H225", "H302", "H312", "H319", "H332"]),
  "110-54-3": buildHazardProfile(["H225", "H304", "H315", "H336", "H361f", "H373", "H411"]),
  "108-95-2": buildHazardProfile(["H301", "H311", "H314", "H331", "H341", "H373"]),
  "108-10-1": buildHazardProfile(["H225", "H319", "H332", "H335"]),
  "123-86-4": buildHazardProfile(["H226", "H336"], { signal: "Warning" }),
  "71-36-3": buildHazardProfile(["H226", "H302", "H315", "H318", "H335", "H336"]),
  "67-63-0": buildHazardProfile(["H225", "H319", "H336"], { signal: "Danger" }),
  "100-41-4": buildHazardProfile(["H225", "H304", "H332", "H373"]),
  "95-47-6": buildHazardProfile(["H226", "H312", "H315", "H332"], { signal: "Warning" }),
  "106-42-3": buildHazardProfile(["H226", "H312", "H315", "H332"], { signal: "Warning" }),
  "79-20-9": buildHazardProfile(["H225", "H319", "H335", "H336"], { signal: "Danger" }),
  "110-82-7": buildHazardProfile(["H225", "H304", "H315", "H336", "H410"]),
  "142-82-5": buildHazardProfile(["H225", "H304", "H315", "H336", "H410"]),
  "75-09-2": buildHazardProfile(["H315", "H319", "H336", "H351"], { signal: "Warning" }),
  "67-66-3": buildHazardProfile(["H302", "H315", "H319", "H331", "H351", "H361d", "H372"]),
  "127-18-4": buildHazardProfile(["H315", "H319", "H351", "H411"], { signal: "Warning" }),
  "56-23-5": buildHazardProfile(["H301", "H311", "H331", "H351", "H372", "H412"]),
  "108-05-4": buildHazardProfile(["H225", "H332", "H335", "H351"]),
  "107-13-1": buildHazardProfile(["H225", "H301", "H311", "H331", "H350", "H411"]),
  "79-10-7": buildHazardProfile(["H226", "H302", "H312", "H314", "H332", "H400"]),
  "79-06-1": buildHazardProfile(["H301", "H312", "H315", "H317", "H319", "H340", "H350", "H361", "H372"]),
  "98-01-1": buildHazardProfile(["H226", "H301", "H312", "H315", "H319", "H331", "H351"]),
  "100-00-5": buildHazardProfile(["H301", "H311", "H331", "H373", "H410"]),
  "106-46-7": buildHazardProfile(["H302", "H315", "H319", "H351", "H410"], { signal: "Warning" }),
  "88-06-2": buildHazardProfile(["H301", "H311", "H315", "H319", "H410"]),
  "75-15-0": buildHazardProfile(["H225", "H361", "H372"]),
  "110-86-1": buildHazardProfile(["H225", "H302", "H312", "H315", "H319", "H332"]),
  "109-89-7": buildHazardProfile(["H225", "H302", "H314", "H332"]),
  "121-44-8": buildHazardProfile(["H225", "H302", "H314", "H332"]),
  "64-19-7": buildHazardProfile(["H226", "H314"], { signal: "Danger" }),
  "108-24-7": buildHazardProfile(["H226", "H302", "H314", "H332"]),
  "100-66-3": buildHazardProfile(["H226", "H315", "H319"], { signal: "Warning" }),
  "111-76-2": buildHazardProfile(["H302", "H312", "H315", "H319", "H332"], { signal: "Warning" }),
  "872-50-4": buildHazardProfile(["H315", "H319", "H335", "H360D"], { signal: "Danger" }),
};

const makeChemical = ({
  cas,
  name,
  zh,
  signal = "Danger",
  pictogramCodes = ["GHS07"],
  hazardCount = 1,
  precautionCount = 0,
  hazardText = DEFAULT_HAZARD_TEXTS,
  precautionText = DEFAULT_PRECAUTION_TEXTS,
  upstreamError = false,
  noGhs = false,
} = {}) => ({
  cas_number: cas,
  name_en: name,
  name_zh: zh || "",
  ghs_pictograms: noGhs ? [] : pictograms(...pictogramCodes),
  hazard_statements: noGhs ? [] : statements("H", hazardCount, hazardText),
  precautionary_statements: noGhs
    ? []
    : statements("P", precautionCount, precautionText),
  signal_word: noGhs ? "" : signal,
  upstream_error: upstreamError,
});

const batchChemicalSamples = [
  ["67-64-1", "Acetone", "丙酮"],
  ["108-88-3", "Toluene", "甲苯"],
  ["78-93-3", "Methyl Ethyl Ketone", "甲基乙基酮"],
  ["141-78-6", "Ethyl Acetate", "乙酸乙酯"],
  ["109-99-9", "Tetrahydrofuran", "四氫呋喃"],
  ["75-05-8", "Acetonitrile", "乙腈"],
  ["110-54-3", "n-Hexane", "正己烷"],
  ["108-95-2", "Phenol", "苯酚"],
  ["108-10-1", "Methyl Isobutyl Ketone", "甲基異丁基酮"],
  ["123-86-4", "Butyl Acetate", "乙酸丁酯"],
  ["71-36-3", "1-Butanol", "1-丁醇"],
  ["67-63-0", "Isopropanol", "異丙醇"],
  ["100-41-4", "Ethylbenzene", "乙苯"],
  ["95-47-6", "o-Xylene", "鄰二甲苯"],
  ["106-42-3", "p-Xylene", "對二甲苯"],
  ["79-20-9", "Methyl Acetate", "乙酸甲酯"],
  ["110-82-7", "Cyclohexane", "環己烷"],
  ["142-82-5", "Heptane", "庚烷"],
  ["75-09-2", "Dichloromethane", "二氯甲烷"],
  ["67-66-3", "Chloroform", "氯仿"],
  ["127-18-4", "Tetrachloroethylene", "四氯乙烯"],
  ["56-23-5", "Carbon Tetrachloride", "四氯化碳"],
  ["108-05-4", "Vinyl Acetate", "乙酸乙烯酯"],
  ["107-13-1", "Acrylonitrile", "丙烯腈"],
  ["79-10-7", "Acrylic Acid", "丙烯酸"],
  ["79-06-1", "Acrylamide", "丙烯醯胺"],
  ["98-01-1", "Furfural", "糠醛"],
  ["100-00-5", "p-Nitrochlorobenzene", "對硝基氯苯"],
  ["106-46-7", "p-Dichlorobenzene", "對二氯苯"],
  ["88-06-2", "2,4,6-Trichlorophenol", "2,4,6-三氯酚"],
  ["75-15-0", "Carbon Disulfide", "二硫化碳"],
  ["110-86-1", "Pyridine", "吡啶"],
  ["109-89-7", "Diethylamine", "二乙胺"],
  ["121-44-8", "Triethylamine", "三乙胺"],
  ["64-19-7", "Acetic Acid", "乙酸"],
  ["108-24-7", "Acetic Anhydride", "乙酸酐"],
  ["100-66-3", "Anisole", "苯甲醚"],
  ["111-76-2", "2-Butoxyethanol", "2-丁氧基乙醇"],
  ["872-50-4", "N-Methyl-2-pyrrolidone", "N-甲基-2-吡咯烷酮"],
];

const SPARSE_HAZARD_PROFILES = [
  {
    signal: "Danger",
    pictogramCodes: ["GHS02", "GHS07"],
    hazards: [
      hp("H225", "Highly flammable liquid and vapor.", "高度易燃液體和蒸氣。"),
      hp("H319", "Causes serious eye irritation.", "造成嚴重眼睛刺激。"),
    ],
    precautions: [
      hp(
        "P210",
        "Keep away from heat, hot surfaces, sparks, open flames, and other ignition sources.",
        "遠離熱源、熱表面、火花、明火及其他點火源。",
      ),
      hp("P280", "Wear protective gloves and eye protection.", "佩戴防護手套與護眼用具。"),
    ],
  },
  {
    signal: "Warning",
    pictogramCodes: ["GHS07"],
    hazards: [
      hp("H315", "Causes skin irritation.", "造成皮膚刺激。"),
      hp("H319", "Causes serious eye irritation.", "造成嚴重眼睛刺激。"),
    ],
    precautions: [
      hp("P264", "Wash hands thoroughly after handling.", "操作後徹底清洗雙手。"),
      hp(
        "P305+P351+P338",
        "IF IN EYES: Rinse cautiously with water for several minutes.",
        "若眼睛接觸：以清水小心沖洗數分鐘。",
      ),
    ],
  },
  {
    signal: "Danger",
    pictogramCodes: ["GHS05", "GHS07"],
    hazards: [
      hp("H314", "Causes severe skin burns and eye damage.", "造成嚴重皮膚灼傷和眼睛損傷。"),
      hp("H335", "May cause respiratory irritation.", "可能造成呼吸道刺激。"),
    ],
    precautions: [
      hp("P260", "Do not breathe mist, vapors, or spray.", "切勿吸入霧滴、蒸氣或噴霧。"),
      hp(
        "P280",
        "Wear protective gloves, protective clothing, eye protection, and face protection.",
        "佩戴防護手套、防護衣物、護眼用具及護面用具。",
      ),
    ],
  },
  {
    signal: "Danger",
    pictogramCodes: ["GHS02", "GHS08"],
    hazards: [
      hp("H225", "Highly flammable liquid and vapor.", "高度易燃液體和蒸氣。"),
      hp("H351", "Suspected of causing cancer.", "懷疑會致癌。"),
    ],
    precautions: [
      hp("P201", "Obtain special instructions before use.", "使用前取得特別指示。"),
      hp("P308+P313", "IF exposed or concerned: Get medical advice.", "如暴露或擔心：諮詢醫師。"),
    ],
  },
  {
    signal: "Danger",
    pictogramCodes: ["GHS06", "GHS08"],
    hazards: [
      hp("H301", "Toxic if swallowed.", "吞食有毒。"),
      hp("H331", "Toxic if inhaled.", "吸入有毒。"),
    ],
    precautions: [
      hp("P261", "Avoid breathing vapors, mist, or spray.", "避免吸入蒸氣、霧滴或噴霧。"),
      hp("P301+P310", "IF SWALLOWED: Immediately call a poison center or physician.", "若吞食：立即致電毒物中心或醫師。"),
    ],
  },
  {
    signal: "Warning",
    pictogramCodes: ["GHS07", "GHS09"],
    hazards: [
      hp(
        "H412",
        "Harmful to aquatic life with long lasting effects.",
        "對水生生物有害並具有長期持續影響。",
      ),
    ],
    precautions: [
      hp("P273", "Avoid release to the environment.", "避免排放至環境。"),
      hp(
        "P501",
        "Dispose of contents and container in accordance with local regulations.",
        "依照地方、區域、國家及國際法規處置內容物及容器。",
      ),
    ],
  },
];

const sparseChemicals = batchChemicalSamples.map(([cas, name, zh], index) =>
  {
    const profile =
      SPARSE_HAZARD_PROFILE_BY_CAS[cas] ||
      SPARSE_HAZARD_PROFILES[index % SPARSE_HAZARD_PROFILES.length];
    return makeChemical({
      cas,
      name,
      zh,
      pictogramCodes: profile.pictogramCodes,
      hazardCount: profile.hazards.length,
      precautionCount: profile.precautions.length,
      signal: profile.signal,
      hazardText: profile.hazards,
      precautionText: profile.precautions,
    });
  },
);

export const batchPrintMixedFixture50 = [
  makeChemical({
    cas: "7647-01-0",
    name: "Hydrochloric Acid",
    zh: "鹽酸",
    pictogramCodes: ["GHS04", "GHS05", "GHS06", "GHS07"],
    hazardCount: 6,
    precautionCount: 22,
    hazardText: [
      hp("H280", "Contains gas under pressure; may explode if heated.", "內含高壓氣體；遇熱可能爆炸。"),
      hp("H290", "May be corrosive to metals.", "可能腐蝕金屬。"),
      hp("H314", "Causes severe skin burns and eye damage.", "造成嚴重皮膚灼傷和眼睛損傷。"),
      hp("H318", "Causes serious eye damage.", "造成嚴重眼睛損傷。"),
      hp("H331", "Toxic if inhaled.", "吸入有毒。"),
      hp("H335", "May cause respiratory irritation.", "可能造成呼吸道刺激。"),
    ],
    precautionText: [
      hp("P234", "Keep only in original packaging.", "僅保存在原容器中。"),
      hp("P260", "Do not breathe gas, mist, vapors, or spray.", "切勿吸入氣體、霧滴、蒸氣或噴霧。"),
      hp("P271", "Use only outdoors or in a well-ventilated area.", "僅於室外或通風良好處使用。"),
      hp("P280", "Wear protective gloves, protective clothing, eye protection, and face protection.", "佩戴防護手套、防護衣物、護眼用具及護面用具。"),
      hp("P301+P330+P331", "IF SWALLOWED: Rinse mouth. Do NOT induce vomiting.", "若吞食：漱口。請勿催吐。"),
      hp("P303+P361+P353", "IF ON SKIN: Take off immediately all contaminated clothing and rinse skin with water.", "若皮膚接觸：立即脫除受污染衣物並以清水沖洗皮膚。"),
      hp("P304+P340", "IF INHALED: Remove person to fresh air and keep comfortable for breathing.", "若吸入：將患者移至空氣新鮮處，保持呼吸舒適。"),
      hp("P305+P351+P338", "IF IN EYES: Rinse cautiously with water for several minutes.", "若眼睛接觸：以清水小心沖洗數分鐘。"),
      hp("P310", "Immediately call a poison center or physician.", "立即致電毒物中心或醫師。"),
      hp("P363", "Wash contaminated clothing before reuse.", "受污染衣物重新使用前需清洗。"),
      hp("P390", "Absorb spillage to prevent material damage.", "吸收溢出物以防止材料損壞。"),
      hp("P403+P233", "Store in a well-ventilated place. Keep container tightly closed.", "儲存於通風良好處。保持容器密閉。"),
      hp("P405", "Store locked up.", "存放於加鎖處。"),
      hp("P406", "Store in a corrosion-resistant container with a resistant inner liner.", "儲存於耐腐蝕容器中，容器內襯需耐腐蝕。"),
      hp("P410+P403", "Protect from sunlight. Store in a well-ventilated place.", "防止陽光照射。儲存於通風良好處。"),
      hp("P501", "Dispose of contents and container according to local regulations.", "依照當地法規處置內容物及容器。"),
      hp("P220", "Keep away from incompatible metals.", "遠離不相容金屬。"),
      hp("P264", "Wash hands thoroughly after handling.", "操作後徹底清洗雙手。"),
      hp("P270", "Do not eat, drink, or smoke when using this product.", "使用本品時勿飲食或吸菸。"),
      hp("P284", "Wear respiratory protection if ventilation is inadequate.", "通風不足時佩戴呼吸防護具。"),
      hp("P321", "Specific treatment is urgent after exposure.", "暴露後需立即進行特定處置。"),
      hp("P502", "Refer to manufacturer or supplier for recovery or recycling information.", "回收或再利用資訊請洽製造商或供應商。"),
    ],
  }),
  makeChemical({
    cas: "64-17-5",
    name: "Ethanol",
    pictogramCodes: ["GHS02", "GHS07"],
    hazardCount: ETHANOL_HAZARDS.length,
    precautionCount: ETHANOL_PRECAUTIONS.length,
    hazardText: ETHANOL_HAZARDS,
    precautionText: ETHANOL_PRECAUTIONS,
    signal: "Warning",
  }),
  makeChemical({
    cas: "57-13-6",
    name: "Urea",
    noGhs: true,
  }),
  makeChemical({
    cas: "9999-99-9",
    name: "Pending Supplier Verification Item",
    upstreamError: true,
    noGhs: true,
  }),
  makeChemical({
    cas: "7782-44-7",
    name: "Oxygen, Compressed",
    zh: "壓縮氧氣",
    pictogramCodes: ["GHS03", "GHS04"],
    hazardCount: 2,
    precautionCount: 4,
    signal: "Danger",
    hazardText: [
      hp("H270", "May cause or intensify fire; oxidizer.", "可能導致或加劇燃燒；氧化劑。"),
      hp("H280", "Contains gas under pressure; may explode if heated.", "內含高壓氣體；遇熱可能爆炸。"),
    ],
    precautionText: [
      hp("P220", "Keep away from clothing and other combustible materials.", "遠離衣物及其他可燃材料。"),
      hp("P244", "Keep valves and fittings free from oil and grease.", "保持閥門及接頭不受油脂污染。"),
      hp("P370+P376", "In case of fire: Stop leak if safe to do so.", "火災時：在安全情況下停止洩漏。"),
      hp("P410+P403", "Protect from sunlight. Store in a well-ventilated place.", "防止陽光照射。儲存於通風良好處。"),
    ],
  }),
  makeChemical({
    cas: "79-21-0",
    name: "Peracetic Acid Solution",
    zh: "過氧乙酸溶液",
    pictogramCodes: ["GHS02", "GHS03", "GHS05", "GHS07", "GHS09"],
    hazardCount: 5,
    precautionCount: 5,
    hazardText: [
      hp("H226", "Flammable liquid and vapor.", "易燃液體和蒸氣。"),
      hp("H242", "Heating may cause a fire.", "加熱可能引起火災。"),
      hp("H314", "Causes severe skin burns and eye damage.", "造成嚴重皮膚灼傷和眼睛損傷。"),
      hp("H335", "May cause respiratory irritation.", "可能造成呼吸道刺激。"),
      hp("H410", "Very toxic to aquatic life with long lasting effects.", "對水生生物毒性非常大並具有長期持續影響。"),
    ],
    precautionText: [
      hp("P210", "Keep away from heat, sparks, open flames, and hot surfaces.", "遠離熱源、火花、明火及熱表面。"),
      hp("P220", "Keep away from clothing and other combustible materials.", "遠離衣物及其他可燃材料。"),
      hp("P260", "Do not breathe mist, vapors, or spray.", "切勿吸入霧滴、蒸氣或噴霧。"),
      hp("P280", "Wear protective gloves, protective clothing, eye protection, and face protection.", "佩戴防護手套、防護衣物、護眼用具及護面用具。"),
      hp("P273", "Avoid release to the environment.", "避免排放至環境。"),
    ],
  }),
  makeChemical({
    cas: "50-00-0",
    name: "Formaldehyde Solution, Stabilized",
    zh: "穩定化甲醛溶液",
    pictogramCodes: ["GHS05", "GHS06", "GHS07", "GHS08"],
    hazardCount: FORMALDEHYDE_HAZARDS.length,
    precautionCount: FORMALDEHYDE_PRECAUTIONS.length,
    hazardText: FORMALDEHYDE_HAZARDS,
    precautionText: FORMALDEHYDE_PRECAUTIONS,
  }),
  makeChemical({
    cas: "7664-93-9",
    name: "Sulfuric Acid Concentrated Stock",
    pictogramCodes: ["GHS03", "GHS05", "GHS07", "GHS08"],
    hazardCount: SULFURIC_ACID_HAZARDS.length,
    precautionCount: SULFURIC_ACID_PRECAUTIONS.length,
    hazardText: SULFURIC_ACID_HAZARDS,
    precautionText: SULFURIC_ACID_PRECAUTIONS,
  }),
  makeChemical({
    cas: "75-07-0",
    name: "Acetaldehyde",
    pictogramCodes: ["GHS02", "GHS07", "GHS08"],
    hazardCount: ACETALDEHYDE_HAZARDS.length,
    precautionCount: ACETALDEHYDE_PRECAUTIONS.length,
    hazardText: ACETALDEHYDE_HAZARDS,
    precautionText: ACETALDEHYDE_PRECAUTIONS,
  }),
  makeChemical({
    cas: "7722-84-1",
    name: "Hydrogen Peroxide",
    pictogramCodes: ["GHS03", "GHS05", "GHS07"],
    hazardCount: HYDROGEN_PEROXIDE_HAZARDS.length,
    precautionCount: HYDROGEN_PEROXIDE_PRECAUTIONS.length,
    hazardText: HYDROGEN_PEROXIDE_HAZARDS,
    precautionText: HYDROGEN_PEROXIDE_PRECAUTIONS,
  }),
  makeChemical({
    cas: "67-56-1",
    name: "Methanol",
    pictogramCodes: ["GHS02", "GHS06", "GHS08"],
    hazardCount: METHANOL_HAZARDS.length,
    precautionCount: METHANOL_PRECAUTIONS.length,
    hazardText: METHANOL_HAZARDS,
    precautionText: METHANOL_PRECAUTIONS,
  }),
  ...sparseChemicals,
];
