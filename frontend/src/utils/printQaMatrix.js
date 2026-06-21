import { resolvePrintLayoutConfig } from "@/constants/labelStocks";
import {
  PRINT_OUTPUT_KIND,
  PRINT_OUTPUT_PLAN_STATE,
  buildPrintOutputPlan,
} from "@/utils/printOutputPlanner";
import {
  PRINT_CONTENT_ROLE,
  PRINT_HAZARD_TEXT_MODE,
  PRINT_PRECAUTION_TEXT_MODE,
} from "@/utils/printContentPolicy";
import {
  buildPrintDocument,
  buildPrintPreviewDocument,
} from "@/utils/printLabels";
import { buildPreparedSolutionItem } from "@/utils/preparedSolution";

export const PRINT_QA_PICTOGRAMS = Object.freeze([
  "GHS04",
  "GHS05",
  "GHS06",
  "GHS07",
]);

export const PRINT_QA_PROFILE = Object.freeze({
  organization: "Laboratory Safety Office",
  phone: "+886-2-2368-0000",
  address: "12 Safety Archive Rd., Taipei",
});

export const PRINT_QA_CASE_FIELDS = Object.freeze({
  batchNumber: "CASE-2026-0007",
});

export const PRINT_QA_HYDROCHLORIC_ACID = Object.freeze({
  cas_number: "7647-01-0",
  name_en: "Hydrochloric Acid",
  name_zh: "鹽酸",
  cid: 313,
  ghs_pictograms: PRINT_QA_PICTOGRAMS.map((code) => ({ code })),
  signal_word: "Danger",
  signal_word_zh: "危險",
  hazard_statements: [
    {
      code: "H280",
      text_en: "Contains gas under pressure; may explode if heated.",
      text_zh: "內含高壓氣體；遇熱可能爆炸",
    },
    {
      code: "H290",
      text_en: "May be corrosive to metals.",
      text_zh: "可能腐蝕金屬",
    },
    {
      code: "H314",
      text_en: "Causes severe skin burns and eye damage.",
      text_zh: "造成嚴重皮膚灼傷和眼睛損傷",
    },
    {
      code: "H318",
      text_en: "Causes serious eye damage.",
      text_zh: "造成嚴重眼睛損傷",
    },
    {
      code: "H331",
      text_en: "Toxic if inhaled.",
      text_zh: "吸入有毒",
    },
    {
      code: "H335",
      text_en: "May cause respiratory irritation.",
      text_zh: "可能造成呼吸道刺激",
    },
  ],
  precautionary_statements: [
    {
      code: "P234",
      text_en: "Keep only in original packaging.",
      text_zh: "僅保存在原容器中。",
    },
    {
      code: "P260",
      text_en: "Do not breathe dust, fume, gas, mist, vapours or spray.",
      text_zh: "切勿吸入粉塵、煙霧、氣體、霧滴、蒸氣或噴霧。",
    },
    {
      code: "P261",
      text_en: "Avoid breathing dust, fume, gas, mist, vapours or spray.",
      text_zh: "避免吸入粉塵、煙霧、氣體、霧滴、蒸氣或噴霧。",
    },
    {
      code: "P264",
      text_en: "Wash hands thoroughly after handling.",
      text_zh: "操作後徹底清洗雙手。",
    },
    {
      code: "P264+P265",
      text_en: "Wash all exposed body parts thoroughly after handling.",
      text_zh: "操作後徹底清洗所有接觸部位。",
    },
    {
      code: "P271",
      text_en: "Use only outdoors or in a well-ventilated area.",
      text_zh: "僅於室外或通風良好處使用。",
    },
    {
      code: "P280",
      text_en: "Wear protective gloves, protective clothing, eye protection and face protection.",
      text_zh: "佩戴防護手套、防護衣物、護眼用具及護面用具。",
    },
    {
      code: "P301+P330+P331",
      text_en: "IF SWALLOWED: Rinse mouth. Do NOT induce vomiting.",
      text_zh: "若吞食：漱口。請勿催吐。",
    },
    {
      code: "P302+P361+P354",
      text_en:
        "IF ON SKIN: Take off immediately all contaminated clothing and rinse skin with water for several minutes.",
      text_zh:
        "若皮膚接觸：立即脫除所有受污染衣物，並以清水沖洗皮膚數分鐘。",
    },
    {
      code: "P304+P340",
      text_en: "IF INHALED: Remove person to fresh air and keep comfortable for breathing.",
      text_zh: "若吸入：將患者移至空氣新鮮處，保持呼吸舒適的姿勢休息。",
    },
    {
      code: "P305+P354+P338",
      text_en:
        "IF IN EYES: Immediately rinse with water for several minutes. Remove contact lenses if present and easy to do; continue rinsing.",
      text_zh:
        "若進入眼睛：立即以清水沖洗數分鐘。如配戴隱形眼鏡且可輕易取出，請取出後繼續沖洗。",
    },
    {
      code: "P316",
      text_en: "Get emergency medical help immediately.",
      text_zh: "立即取得緊急醫療協助。",
    },
    {
      code: "P317",
      text_en: "Get emergency medical help.",
      text_zh: "立即尋求緊急醫療協助。",
    },
    {
      code: "P319",
      text_en: "Get medical help if you feel unwell.",
      text_zh: "如感不適，請取得醫療協助。",
    },
    {
      code: "P321",
      text_en: "Specific treatment (see on this label).",
      text_zh: "需要進行特定治療（見本標示上的說明）。",
    },
    {
      code: "P363",
      text_en: "Wash contaminated clothing before reuse.",
      text_zh: "清洗受污染的衣物後方可重新使用。",
    },
    {
      code: "P390",
      text_en: "Absorb spillage to prevent material damage.",
      text_zh: "吸收溢出物，防止材料損壞。",
    },
    {
      code: "P403+P233",
      text_en: "Store in a well-ventilated place. Keep container tightly closed.",
      text_zh: "儲存於通風良好處。保持容器密閉。",
    },
    {
      code: "P405",
      text_en: "Store locked up.",
      text_zh: "存放於加鎖處。",
    },
    {
      code: "P406",
      text_en: "Store in a corrosion-resistant container with a resistant inner liner.",
      text_zh: "儲存於耐腐蝕容器中，容器內襯需耐腐蝕。",
    },
    {
      code: "P410+P403",
      text_en: "Protect from sunlight. Store in a well-ventilated place.",
      text_zh: "防止陽光照射。儲存於通風良好處。",
    },
    {
      code: "P501",
      text_en: "Dispose of contents and container in accordance with local regulations",
      text_zh: "依照地方、區域、國家及國際法規處置內容物及容器。",
    },
  ],
});

export const PRINT_QA_AMINOBIPHENYL = Object.freeze({
  cas_number: "90-41-5",
  name_en: "2-Aminobiphenyl",
  name_zh: "2-胺基聯苯",
  cid: 7015,
  ghs_pictograms: [{ code: "GHS07" }, { code: "GHS08" }],
  signal_word: "Warning",
  signal_word_zh: "警告",
  hazard_statements: [
    {
      code: "H302",
      text_en: "Harmful if swallowed.",
      text_zh: "吞食有害",
    },
    {
      code: "H351",
      text_en: "Suspected of causing cancer.",
      text_zh: "懷疑會致癌",
    },
    {
      code: "H412",
      text_en: "Harmful to aquatic life with long lasting effects.",
      text_zh: "對水生生物有害並具有長期持續影響",
    },
  ],
  precautionary_statements: [
    {
      code: "P203",
      text_en: "Obtain, read, and follow all safety instructions before use.",
      text_zh: "使用前取得、閱讀並遵循所有安全指示。",
    },
    {
      code: "P264",
      text_en: "Wash hands thoroughly after handling.",
      text_zh: "操作後徹底清洗雙手。",
    },
    {
      code: "P270",
      text_en: "Do not eat, drink or smoke when using this product.",
      text_zh: "使用本品時勿飲食或吸菸。",
    },
    {
      code: "P273",
      text_en: "Avoid release to the environment.",
      text_zh: "避免排放至環境。",
    },
    {
      code: "P280",
      text_en:
        "Wear protective gloves, protective clothing, eye protection, face protection.",
      text_zh: "佩戴防護手套、防護衣物、護眼用具及護面用具。",
    },
    {
      code: "P301+P317",
      text_en: "IF SWALLOWED: Get medical help.",
      text_zh: "若吞食：取得醫療協助。",
    },
    {
      code: "P318",
      text_en: "If exposed or concerned, get medical advice.",
      text_zh: "如暴露或有疑慮，請諮詢醫師。",
    },
    { code: "P330", text_en: "Rinse mouth.", text_zh: "漱口。" },
    { code: "P405", text_en: "Store locked up.", text_zh: "存放於加鎖處。" },
    {
      code: "P501",
      text_en:
        "Dispose of contents and container in accordance with local regulations.",
      text_zh: "依照地方、區域、國家及國際法規處置內容物及容器。",
    },
  ],
});

export const PRINT_QA_ETHANOL = Object.freeze({
  cas_number: "64-17-5",
  name_en: "Ethanol",
  name_zh: "乙醇",
  cid: 702,
  ghs_pictograms: [{ code: "GHS02" }, { code: "GHS07" }],
  signal_word: "Danger",
  signal_word_zh: "危險",
  hazard_statements: [
    {
      code: "H225",
      text_en: "Highly flammable liquid and vapour",
      text_zh: "高度易燃液體和蒸氣",
    },
    {
      code: "H319",
      text_en: "Causes serious eye irritation",
      text_zh: "造成嚴重眼睛刺激",
    },
  ],
  precautionary_statements: [
    {
      code: "P210",
      text_en: "Keep away from heat, hot surfaces, sparks, open flames and other ignition sources",
      text_zh: "遠離熱源、火花、明火及其他著火源",
    },
    {
      code: "P280",
      text_en: "Wear protective gloves and eye protection",
      text_zh: "佩戴防護手套與護眼用具",
    },
  ],
});

export const PRINT_QA_SODIUM_HYDROXIDE = Object.freeze({
  cas_number: "1310-73-2",
  name_en: "Sodium Hydroxide",
  name_zh: "氫氧化鈉",
  cid: 14798,
  ghs_pictograms: [{ code: "GHS05" }, { code: "GHS07" }],
  signal_word: "Danger",
  signal_word_zh: "危險",
  hazard_statements: [
    {
      code: "H290",
      text_en: "May be corrosive to metals",
      text_zh: "可能腐蝕金屬",
    },
    {
      code: "H314",
      text_en: "Causes severe skin burns and eye damage",
      text_zh: "造成嚴重皮膚灼傷和眼睛損傷",
    },
    {
      code: "H315",
      text_en: "Causes skin irritation",
      text_zh: "造成皮膚刺激",
    },
    {
      code: "H319",
      text_en: "Causes serious eye irritation",
      text_zh: "造成嚴重眼睛刺激",
    },
    {
      code: "H335",
      text_en: "May cause respiratory irritation",
      text_zh: "可能造成呼吸道刺激",
    },
  ],
  precautionary_statements: [
    {
      code: "P260",
      text_en: "Do not breathe dust or mist",
      text_zh: "切勿吸入粉塵或霧滴",
    },
    {
      code: "P280",
      text_en: "Wear protective gloves, protective clothing and eye protection",
      text_zh: "佩戴防護手套、防護衣物與護眼用具",
    },
    {
      code: "P303+P361+P353",
      text_en: "IF ON SKIN: take off contaminated clothing and rinse skin with water",
      text_zh: "如皮膚接觸：立即脫除受污染衣物並以清水沖洗皮膚",
    },
  ],
});

export const PRINT_QA_METHANOL = Object.freeze({
  cas_number: "67-56-1",
  name_en: "Methanol",
  name_zh: "甲醇",
  cid: 887,
  ghs_pictograms: [{ code: "GHS02" }, { code: "GHS06" }, { code: "GHS08" }],
  signal_word: "Danger",
  signal_word_zh: "危險",
  hazard_statements: [
    {
      code: "H225",
      text_en: "Highly flammable liquid and vapour",
      text_zh: "高度易燃液體和蒸氣",
    },
    {
      code: "H301",
      text_en: "Toxic if swallowed",
      text_zh: "吞食有毒",
    },
    {
      code: "H311",
      text_en: "Toxic in contact with skin",
      text_zh: "皮膚接觸有毒",
    },
    {
      code: "H331",
      text_en: "Toxic if inhaled",
      text_zh: "吸入有毒",
    },
    {
      code: "H370",
      text_en: "Causes damage to organs",
      text_zh: "會對器官造成傷害",
    },
  ],
  precautionary_statements: [
    {
      code: "P210",
      text_en: "Keep away from heat, sparks, open flames and hot surfaces",
      text_zh: "遠離熱源、火花、明火與高溫表面",
    },
    {
      code: "P260",
      text_en: "Do not breathe vapours",
      text_zh: "切勿吸入蒸氣",
    },
    {
      code: "P280",
      text_en: "Wear protective gloves and eye protection",
      text_zh: "佩戴防護手套與護眼用具",
    },
  ],
});

export const PRINT_QA_FORMALDEHYDE = Object.freeze({
  cas_number: "50-00-0",
  name_en: "Formaldehyde",
  name_zh: "甲醛",
  cid: 712,
  ghs_pictograms: [
    { code: "GHS05" },
    { code: "GHS06" },
    { code: "GHS07" },
    { code: "GHS08" },
  ],
  signal_word: "Danger",
  signal_word_zh: "危險",
  hazard_statements: [
    {
      code: "H301",
      text_en:
        "Toxic if swallowed. Include the full acute toxicity statement on the complete shipped-container label.",
      text_zh:
        "吞食有毒。完整主要容器標籤需保留急性毒性說明。",
    },
    {
      code: "H311",
      text_en:
        "Toxic in contact with skin. Avoid direct handling during transfer, sampling, and waste collection.",
      text_zh:
        "皮膚接觸有毒。轉移、取樣與廢棄物收集時應避免直接接觸。",
    },
    {
      code: "H314",
      text_en:
        "Causes severe skin burns and eye damage. Immediate emergency response and eyewash access are required.",
      text_zh:
        "造成嚴重皮膚灼傷和眼睛損傷。需備妥緊急應變與洗眼設備。",
    },
    {
      code: "H317",
      text_en:
        "May cause an allergic skin reaction after repeated or prolonged laboratory exposure.",
      text_zh:
        "反覆或長時間暴露可能造成皮膚過敏反應。",
    },
    {
      code: "H318",
      text_en:
        "Causes serious eye damage. Use splash protection whenever opening the container or preparing dilutions.",
      text_zh:
        "造成嚴重眼睛損傷。開啟容器或配製稀釋液時需使用防濺保護。",
    },
    {
      code: "H330",
      text_en:
        "Fatal if inhaled. Vapour exposure can occur during dispensing, spill response, and open-vessel work.",
      text_zh:
        "吸入致命。分裝、洩漏處理與開放容器作業時可能暴露於蒸氣。",
    },
    {
      code: "H341",
      text_en:
        "Suspected of causing genetic defects. Obtain special instructions before use and keep exposure records.",
      text_zh:
        "懷疑會造成遺傳性缺陷。使用前取得特別指示並保存暴露紀錄。",
    },
    {
      code: "H350",
      text_en:
        "May cause cancer. Use only in controlled areas with documented training and exposure controls.",
      text_zh:
        "可能致癌。僅於受控區域並具備訓練與暴露控制紀錄時使用。",
    },
    {
      code: "H370",
      text_en:
        "Causes damage to organs. Do not use this label without a complete responsible-party profile.",
      text_zh:
        "會對器官造成傷害。未填寫完整負責單位資訊時，不應使用此主標籤。",
    },
    {
      code: "H372",
      text_en:
        "Causes damage to organs through prolonged or repeated exposure during routine laboratory handling.",
      text_zh:
        "日常實驗室操作中，長期或反覆暴露會對器官造成傷害。",
    },
  ],
  precautionary_statements: [
    {
      code: "P201",
      text_en:
        "Obtain special instructions before use and verify the current SDS before preparing a working container.",
      text_zh:
        "使用前取得特別指示，並在配製工作容器前核對最新版 SDS。",
    },
    {
      code: "P202",
      text_en:
        "Do not handle until all safety precautions have been read, understood, and communicated to the operator.",
      text_zh:
        "所有安全預防措施完成閱讀、理解並傳達給操作者前，不得操作。",
    },
    {
      code: "P260",
      text_en:
        "Do not breathe dust, fume, gas, mist, vapours or spray generated during transfer or spill cleanup.",
      text_zh:
        "切勿吸入轉移或洩漏清理過程產生的粉塵、煙霧、氣體、霧滴、蒸氣或噴霧。",
    },
    {
      code: "P264",
      text_en:
        "Wash hands and all potentially exposed skin thoroughly after handling and before leaving the work area.",
      text_zh:
        "操作後及離開工作區前，徹底清洗雙手與所有可能暴露的皮膚。",
    },
    {
      code: "P270",
      text_en:
        "Do not eat, drink or smoke when using this product or while contaminated gloves are present.",
      text_zh:
        "使用本品或接觸受污染手套時，勿飲食或吸煙。",
    },
    {
      code: "P271",
      text_en:
        "Use only outdoors or in a well-ventilated area with verified local exhaust ventilation.",
      text_zh:
        "僅於室外或通風良好且局部排氣已確認有效的區域使用。",
    },
    {
      code: "P280",
      text_en:
        "Wear protective gloves, protective clothing, eye protection and face protection during dispensing.",
      text_zh:
        "分裝時佩戴防護手套、防護衣物、護眼用具與面部防護。",
    },
    {
      code: "P301+P310",
      text_en:
        "IF SWALLOWED: Immediately call a POISON CENTER or doctor and keep the product container available.",
      text_zh:
        "若吞食：立即聯絡毒物諮詢中心或醫師，並保留產品容器供查閱。",
    },
    {
      code: "P303+P361+P353",
      text_en:
        "IF ON SKIN or hair: Take off immediately all contaminated clothing. Rinse skin with water.",
      text_zh:
        "若接觸皮膚或頭髮：立即脫除所有受污染衣物，並以清水沖洗皮膚。",
    },
    {
      code: "P304+P340",
      text_en:
        "IF INHALED: Remove person to fresh air and keep comfortable for breathing while awaiting help.",
      text_zh:
        "若吸入：將人員移至空氣新鮮處，保持呼吸舒適並等待協助。",
    },
    {
      code: "P305+P351+P338",
      text_en:
        "IF IN EYES: Rinse cautiously with water for several minutes and remove contact lenses if easy to do.",
      text_zh:
        "若進入眼睛：以清水小心沖洗數分鐘；若可輕易取出隱形眼鏡，請先取出。",
    },
    {
      code: "P308+P313",
      text_en:
        "If exposed or concerned: Get medical advice and bring SDS or container label information.",
      text_zh:
        "如暴露或有疑慮：尋求醫療建議，並攜帶 SDS 或容器標籤資訊。",
    },
    {
      code: "P403+P233",
      text_en:
        "Store in a well-ventilated place. Keep container tightly closed and segregated from incompatibles.",
      text_zh:
        "儲存於通風良好處，保持容器密閉並與不相容物隔離。",
    },
    {
      code: "P405",
      text_en:
        "Store locked up with access limited to trained personnel and documented inventory controls.",
      text_zh:
        "加鎖存放，僅限受訓人員取用，並保留盤點管制紀錄。",
    },
    {
      code: "P501",
      text_en:
        "Dispose of contents and container in accordance with local, regional, national and international regulations.",
      text_zh:
        "依照地方、區域、國家及國際法規處置內容物與容器。",
    },
  ],
});

export const PRINT_QA_ETHYLENE_OXIDE = Object.freeze({
  cas_number: "75-21-8",
  name_en: "Ethylene Oxide",
  name_zh: "",
  cid: 6354,
  ghs_pictograms: [
    { code: "GHS02" },
    { code: "GHS04" },
    { code: "GHS05" },
    { code: "GHS06" },
    { code: "GHS07" },
    { code: "GHS08" },
  ],
  signal_word: "Danger",
  signal_word_zh: "危險",
  hazard_statements: [
    {
      code: "H220",
      text_en: "Extremely flammable gas.",
      text_zh: "極易燃氣體。",
    },
    {
      code: "H230",
      text_en: "May react explosively even in the absence of air.",
      text_zh: "即使沒有空氣也可能爆炸性反應。",
    },
    {
      code: "H280",
      text_en: "Contains gas under pressure; may explode if heated.",
      text_zh: "內含加壓氣體；遇熱可能爆炸。",
    },
    {
      code: "H301",
      text_en: "Toxic if swallowed.",
      text_zh: "吞食有毒。",
    },
    {
      code: "H302",
      text_en: "Harmful if swallowed.",
      text_zh: "吞食有害。",
    },
    {
      code: "H314",
      text_en: "Causes severe skin burns and eye damage.",
      text_zh: "造成嚴重皮膚灼傷和眼睛損傷。",
    },
    {
      code: "H315",
      text_en: "Causes skin irritation.",
      text_zh: "造成皮膚刺激。",
    },
    {
      code: "H318",
      text_en: "Causes serious eye damage.",
      text_zh: "造成嚴重眼睛損傷。",
    },
    {
      code: "H319",
      text_en: "Causes serious eye irritation.",
      text_zh: "造成嚴重眼睛刺激。",
    },
    {
      code: "H331",
      text_en: "Toxic if inhaled.",
      text_zh: "吸入有毒。",
    },
    {
      code: "H335",
      text_en: "May cause respiratory irritation.",
      text_zh: "可能造成呼吸道刺激。",
    },
    {
      code: "H336",
      text_en: "May cause drowsiness or dizziness.",
      text_zh: "可能造成嗜睡或暈眩。",
    },
    {
      code: "H340",
      text_en: "May cause genetic defects.",
      text_zh: "可能造成遺傳性缺陷。",
    },
    {
      code: "H350",
      text_en: "May cause cancer.",
      text_zh: "可能致癌。",
    },
    {
      code: "H360",
      text_en: "May damage fertility or the unborn child.",
      text_zh: "可能損害生育能力或胎兒。",
    },
    {
      code: "H372",
      text_en:
        "Causes damage to organs through prolonged or repeated exposure.",
      text_zh: "長期或反覆暴露會對器官造成損害。",
    },
  ],
  precautionary_statements: [
    {
      code: "P201",
      text_en: "Obtain special instructions before use.",
      text_zh: "使用前取得特別指示。",
    },
    {
      code: "P202",
      text_en:
        "Do not handle until all safety precautions have been read and understood.",
      text_zh: "在閱讀並瞭解所有安全預防措施前，切勿操作。",
    },
    {
      code: "P210",
      text_en:
        "Keep away from heat, hot surfaces, sparks, open flames, and other ignition sources.",
      text_zh: "遠離熱源、高溫表面、火花、明火及其他引火源。",
    },
    {
      code: "P211",
      text_en: "Do not spray on an open flame or other ignition source.",
      text_zh: "切勿噴灑於明火或其他引火源。",
    },
    {
      code: "P220",
      text_en: "Keep away from clothing, combustible materials, and incompatible chemicals.",
      text_zh: "遠離衣物、可燃材料及不相容化學品。",
    },
    {
      code: "P233",
      text_en: "Keep container tightly closed between controlled transfers.",
      text_zh: "受控轉移以外時間，請保持容器密閉。",
    },
    {
      code: "P240",
      text_en: "Ground and bond container and receiving equipment before transfer.",
      text_zh: "轉移前將容器與接收設備接地並等電位連接。",
    },
    {
      code: "P241",
      text_en: "Use explosion-proof electrical, ventilating, and lighting equipment.",
      text_zh: "使用防爆電氣、通風與照明設備。",
    },
    {
      code: "P242",
      text_en: "Use non-sparking tools for connection, sampling, and maintenance.",
      text_zh: "連接、取樣與維護時使用不產生火花的工具。",
    },
    {
      code: "P243",
      text_en: "Take action to prevent static discharges.",
      text_zh: "採取措施防止靜電放電。",
    },
    {
      code: "P260",
      text_en: "Do not breathe gas, vapors, mist, or spray.",
      text_zh: "切勿吸入氣體、蒸氣、霧滴或噴霧。",
    },
    {
      code: "P264",
      text_en: "Wash hands and exposed skin thoroughly after handling.",
      text_zh: "操作後徹底清洗雙手與暴露皮膚。",
    },
    {
      code: "P270",
      text_en: "Do not eat, drink, or smoke when using this product.",
      text_zh: "使用本品時勿飲食或吸菸。",
    },
    {
      code: "P271",
      text_en: "Use only outdoors or in a verified well-ventilated area.",
      text_zh: "僅於室外或已確認通風良好處使用。",
    },
    {
      code: "P280",
      text_en: "Wear protective gloves, protective clothing, and eye or face protection.",
      text_zh: "佩戴防護手套、防護衣物及護眼或護面用具。",
    },
    {
      code: "P284",
      text_en: "Wear respiratory protection when ventilation controls are insufficient.",
      text_zh: "通風控制不足時，請佩戴呼吸防護具。",
    },
    {
      code: "P301+P316",
      text_en: "IF SWALLOWED: Get emergency medical help immediately.",
      text_zh: "若吞食：立即取得緊急醫療協助。",
    },
    {
      code: "P302+P352",
      text_en: "IF ON SKIN: Wash with plenty of water.",
      text_zh: "若皮膚接觸：以大量清水沖洗。",
    },
    {
      code: "P304+P340",
      text_en:
        "IF INHALED: Remove person to fresh air and keep comfortable for breathing.",
      text_zh: "若吸入：將人員移至空氣新鮮處，保持呼吸舒適。",
    },
    {
      code: "P305+P351+P338",
      text_en:
        "IF IN EYES: Rinse cautiously with water for several minutes. Remove contact lenses if present and easy to do; continue rinsing.",
      text_zh:
        "若進入眼睛：以清水小心沖洗數分鐘。如配戴隱形眼鏡且可輕易取出，請取出後繼續沖洗。",
    },
    {
      code: "P308+P313",
      text_en: "If exposed or concerned: Get medical advice or attention.",
      text_zh: "如暴露或有疑慮：尋求醫療建議或照護。",
    },
    {
      code: "P312",
      text_en: "Call a poison center or doctor if you feel unwell.",
      text_zh: "如感不適，請聯絡毒物諮詢中心或醫師。",
    },
    {
      code: "P321",
      text_en: "Specific treatment is listed in the SDS and site emergency procedure.",
      text_zh: "特定處置請參照 SDS 與現場緊急程序。",
    },
    {
      code: "P330",
      text_en: "Rinse mouth.",
      text_zh: "漱口。",
    },
    {
      code: "P333+P317",
      text_en: "If skin irritation or rash occurs: Get medical help.",
      text_zh: "如發生皮膚刺激或皮疹：取得醫療協助。",
    },
    {
      code: "P337+P317",
      text_en: "If eye irritation persists: Get medical help.",
      text_zh: "如眼睛刺激持續：取得醫療協助。",
    },
    {
      code: "P362+P364",
      text_en: "Take off contaminated clothing and wash it before reuse.",
      text_zh: "脫除受污染衣物，重新使用前先清洗。",
    },
    {
      code: "P370+P376",
      text_en:
        "In case of fire: Stop leak if safe to do so and keep cylinders cool from a protected position.",
      text_zh: "發生火災時：如安全可行，停止洩漏並在受保護位置冷卻鋼瓶。",
    },
    {
      code: "P377",
      text_en:
        "Leaking gas fire: Do not extinguish unless leak can be stopped safely.",
      text_zh: "漏氣著火：除非能安全停止洩漏，否則不要滅火。",
    },
    {
      code: "P381",
      text_en: "In case of leakage, eliminate all ignition sources.",
      text_zh: "發生洩漏時，排除所有引火源。",
    },
    {
      code: "P403",
      text_en: "Store in a well-ventilated place.",
      text_zh: "儲存於通風良好處。",
    },
    {
      code: "P403+P233",
      text_en: "Store in a well-ventilated place. Keep container tightly closed.",
      text_zh: "儲存於通風良好處，保持容器密閉。",
    },
    {
      code: "P405",
      text_en: "Store locked up with access limited to authorized personnel.",
      text_zh: "加鎖存放，僅限授權人員取用。",
    },
    {
      code: "P410+P403",
      text_en: "Protect from sunlight. Store in a well-ventilated place.",
      text_zh: "避免日照，儲存於通風良好處。",
    },
    {
      code: "P501",
      text_en:
        "Dispose of contents and container in accordance with approved hazardous waste procedures.",
      text_zh: "依核准的有害廢棄物程序處置內容物與容器。",
    },
    {
      code: "P502",
      text_en: "Refer to manufacturer or supplier for recovery or recycling information.",
      text_zh: "回收或再利用資訊請洽製造商或供應商。",
    },
  ],
});

export const PRINT_QA_BROMOTHIOPHENE = Object.freeze({
  cas_number: "1003-09-4",
  name_en: "2-Bromothiophene",
  name_zh: "2-溴噻吩",
  cid: 13787,
  ghs_pictograms: [
    { code: "GHS02" },
    { code: "GHS05" },
    { code: "GHS06" },
    { code: "GHS07" },
  ],
  signal_word: "Danger",
  signal_word_zh: "危險",
  hazard_statements: [
    {
      code: "H226",
      text_en:
        "Flammable liquid and vapor. Keep away from heat, sparks, open flames, and incompatible oxidizing materials.",
      text_zh:
        "易燃液體和蒸氣。請遠離熱源、火花、明火及不相容的氧化性材料。",
    },
    {
      code: "H300",
      text_en:
        "Fatal if swallowed. Do not eat, drink, or smoke when using this product.",
      text_zh: "吞食致命。使用本品時勿飲食或吸菸。",
    },
    {
      code: "H301",
      text_en:
        "Toxic if swallowed. Use documented controls for transfer, storage, and disposal.",
      text_zh: "吞食有毒。轉移、儲存與廢棄時請使用有紀錄的控制程序。",
    },
    {
      code: "H310",
      text_en:
        "Fatal in contact with skin. Wear compatible gloves and protective clothing during handling.",
      text_zh: "皮膚接觸致命。操作時請穿戴相容手套與防護衣物。",
    },
    {
      code: "H315",
      text_en:
        "Causes skin irritation. Wash exposed skin thoroughly after handling.",
      text_zh: "造成皮膚刺激。操作後請徹底清洗暴露皮膚。",
    },
    {
      code: "H318",
      text_en:
        "Causes serious eye damage. Keep emergency eyewash access available before use.",
      text_zh: "造成嚴重眼睛損傷。使用前請確認可立即使用緊急洗眼設備。",
    },
    {
      code: "H319",
      text_en:
        "Causes serious eye irritation. Avoid splashes, aerosols, and direct eye exposure.",
      text_zh: "造成嚴重眼睛刺激。避免噴濺、氣膠及眼睛直接暴露。",
    },
    {
      code: "H330",
      text_en:
        "Fatal if inhaled. Use only with verified ventilation and respiratory protection when required.",
      text_zh: "吸入致命。僅在已確認通風並依需要配戴呼吸防護時使用。",
    },
  ],
  precautionary_statements: [
    {
      code: "P210",
      text_en:
        "Keep away from heat, sparks, open flames, hot surfaces, and other ignition sources. Verify the bench, transfer line, and waste container are free of ignition hazards before opening.",
      text_zh:
        "遠離熱源、火花、明火、高溫表面及其他引火源。開封前確認檯面、轉移管線與廢液容器沒有引火風險。",
    },
    {
      code: "P233",
      text_en:
        "Keep container tightly closed when not in active use. Return the closure promptly after sampling, transfer, or label verification.",
      text_zh:
        "非操作期間保持容器密閉。取樣、轉移或核對標籤後，請立即復原瓶蓋或密封件。",
    },
    {
      code: "P240",
      text_en:
        "Ground and bond container and receiving equipment before transfer. Use the same verified bonding path for dispensing, weighing, and waste consolidation.",
      text_zh:
        "轉移前將容器與接收設備接地並等電位連接。分裝、秤量與廢液彙整時使用同一套已確認的接地路徑。",
    },
    {
      code: "P241",
      text_en:
        "Use explosion-proof electrical, ventilating, and lighting equipment. Keep ordinary switches, hot plates, and non-rated instruments outside the handling zone.",
      text_zh:
        "使用防爆電氣、通風與照明設備。一般開關、加熱板與非防爆儀器應遠離操作區。",
    },
    {
      code: "P242",
      text_en:
        "Use non-sparking tools for transfer and cleanup. Keep dedicated spatulas, spill tools, and absorbents available before beginning the task.",
      text_zh:
        "轉移與清理時使用不產生火花的工具。操作前備妥專用刮勺、洩漏處理工具與吸附材。",
    },
    {
      code: "P243",
      text_en:
        "Take action to prevent static discharges. Control clothing, containers, and low-humidity work conditions during dispensing.",
      text_zh:
        "採取措施防止靜電放電。分裝時控制衣物、容器與低濕度工作條件。",
    },
    {
      code: "P260",
      text_en:
        "Do not breathe vapors, mist, or spray. Keep containers inside the hood sash line until sealed and wiped down.",
      text_zh:
        "切勿吸入蒸氣、霧滴或噴霧。容器密封並擦拭前，請保持在排氣櫃拉門內側。",
    },
    {
      code: "P262",
      text_en:
        "Do not get in eyes, on skin, or on clothing. Plan pour paths and container supports to prevent splashes during transfer.",
      text_zh:
        "避免接觸眼睛、皮膚或衣物。轉移前規劃倒液路徑與容器支撐，避免噴濺。",
    },
    {
      code: "P264",
      text_en:
        "Wash hands and exposed skin thoroughly after handling. Remove residue from reusable tools before they leave the controlled area.",
      text_zh:
        "操作後徹底清洗雙手與暴露皮膚。可重複使用工具離開管制區前，請先去除殘留物。",
    },
    {
      code: "P264+P265",
      text_en:
        "Wash all exposed body parts thoroughly after handling. Confirm sleeves, cuffs, and glove edges have not retained liquid contamination.",
      text_zh:
        "操作後徹底清洗所有暴露部位。確認袖口、袖緣與手套邊緣未殘留液體污染。",
    },
    {
      code: "P270",
      text_en:
        "Do not eat, drink, or smoke when using this product. Keep personal items and open containers outside the chemical handling area.",
      text_zh:
        "使用本品時勿飲食或吸菸。個人物品與開放容器請放在化學操作區外。",
    },
    {
      code: "P271",
      text_en:
        "Use only outdoors or in a well-ventilated area. For indoor work, verify hood airflow and keep the sash positioned for splash protection.",
      text_zh:
        "僅於室外或通風良好處使用。室內操作時確認排氣櫃風量，並將拉門維持在防噴濺位置。",
    },
    {
      code: "P280",
      text_en:
        "Wear compatible protective gloves, protective clothing, and eye or face protection. Select glove material against the SDS compatibility table and expected contact time.",
      text_zh:
        "佩戴相容防護手套、防護衣物及護眼或護面用具。依 SDS 相容性表與預期接觸時間選擇手套材質。",
    },
    {
      code: "P284",
      text_en:
        "Wear respiratory protection when ventilation controls are insufficient. Follow the site respiratory protection program and cartridge change schedule.",
      text_zh:
        "通風控制不足時，請佩戴呼吸防護具。依現場呼吸防護計畫與濾罐更換時程執行。",
    },
    {
      code: "P301+P316",
      text_en:
        "IF SWALLOWED: Get emergency medical help immediately. Provide the product label, SDS, exposure amount, and time of exposure to responders.",
      text_zh:
        "若吞食：立即取得緊急醫療協助。向應變人員提供產品標籤、SDS、暴露量與暴露時間。",
    },
    {
      code: "P302+P352",
      text_en:
        "IF ON SKIN: Wash with plenty of water. Continue rinsing while contaminated clothing, gloves, and jewelry are removed.",
      text_zh:
        "若皮膚接觸：以大量清水沖洗。移除受污染衣物、手套與飾品時持續沖洗。",
    },
    {
      code: "P303+P361+P353",
      text_en:
        "IF ON SKIN (or hair): Take off immediately all contaminated clothing. Rinse skin with water and isolate clothing for hazardous decontamination.",
      text_zh:
        "若皮膚或頭髮接觸：立即脫除所有受污染衣物，以水沖洗皮膚，並將衣物隔離待有害物去污。",
    },
    {
      code: "P304+P340",
      text_en:
        "IF INHALED: Remove person to fresh air and keep comfortable for breathing. Do not allow the exposed person to return to the work area without medical clearance.",
      text_zh:
        "若吸入：將人員移至空氣新鮮處，保持呼吸舒適。未經醫療確認前，不得讓暴露者返回工作區。",
    },
    {
      code: "P305+P351+P338",
      text_en:
        "IF IN EYES: Rinse cautiously with water for several minutes. Remove contact lenses if present and easy to do; continue rinsing and keep eyewash access clear for responders.",
      text_zh:
        "若進入眼睛：以清水小心沖洗數分鐘。如配戴隱形眼鏡且可輕易取出，請取出後繼續沖洗，並保持洗眼設備通道暢通。",
    },
    {
      code: "P316",
      text_en:
        "Get emergency medical help immediately. Share the route of exposure, duration, and first-aid steps already completed.",
      text_zh:
        "立即取得緊急醫療協助。提供暴露途徑、暴露時間與已完成的急救步驟。",
    },
    {
      code: "P317",
      text_en:
        "Get medical help if symptoms occur or exposure is suspected. Retain the container, SDS, and incident notes for follow-up review.",
      text_zh:
        "如出現症狀或懷疑暴露，請取得醫療協助。保留容器、SDS 與事件紀錄供後續檢視。",
    },
    {
      code: "P320",
      text_en:
        "Specific treatment is urgent; see SDS and workplace medical protocol. Contact the designated emergency coordinator while first aid continues.",
      text_zh:
        "需立即進行特定處置；請參照 SDS 與工作場所醫療程序。急救持續時聯絡指定緊急協調人。",
    },
    {
      code: "P321",
      text_en:
        "Specific treatment is listed in the SDS and site emergency procedure. Keep the current revision of both documents available at the bench.",
      text_zh:
        "特定處置請參照 SDS 與現場緊急程序。請在操作檯備妥兩份文件的最新版。",
    },
    {
      code: "P330",
      text_en:
        "Rinse mouth. Do not induce vomiting unless instructed by medical personnel or poison center guidance.",
      text_zh: "漱口。除非醫療人員或毒物諮詢指示，勿催吐。",
    },
    {
      code: "P332+P317",
      text_en:
        "If skin irritation occurs: Get medical help. Record glove type, contact duration, and decontamination steps.",
      text_zh:
        "如發生皮膚刺激：取得醫療協助。記錄手套類型、接觸時間與去污步驟。",
    },
    {
      code: "P337+P317",
      text_en:
        "If eye irritation persists: Get medical help. Continue monitoring after rinsing and provide exposure details to responders.",
      text_zh:
        "如眼睛刺激持續：取得醫療協助。沖洗後持續觀察，並向應變人員提供暴露細節。",
    },
    {
      code: "P361+P364",
      text_en:
        "Take off immediately all contaminated clothing and wash it before reuse. Bag clothing separately until the decontamination route is confirmed.",
      text_zh:
        "立即脫除所有受污染衣物，重新使用前先清洗。在確認去污方式前，請將衣物分開裝袋。",
    },
    {
      code: "P370+P378",
      text_en:
        "In case of fire: Use alcohol-resistant foam, dry chemical, or carbon dioxide to extinguish. Cool exposed containers from a protected position.",
      text_zh:
        "發生火災時：使用抗醇泡沫、乾粉或二氧化碳滅火。從受保護位置冷卻受熱容器。",
    },
    {
      code: "P403+P233",
      text_en:
        "Store in a well-ventilated place. Keep container tightly closed and segregated from oxidizers, acids, and ignition sources.",
      text_zh:
        "儲存於通風良好處，保持容器密閉，並與氧化劑、酸類及引火源隔離。",
    },
    {
      code: "P405",
      text_en:
        "Store locked up with restricted access. Maintain inventory records, owner information, and inspection dates with the storage location.",
      text_zh:
        "加鎖存放並限制取用。儲存位置需保留盤點紀錄、負責人資訊與檢查日期。",
    },
    {
      code: "P501",
      text_en:
        "Dispose of contents and container according to approved hazardous waste procedures. Keep incompatibles separated in labeled secondary containment until pickup.",
      text_zh:
        "依核准的有害廢棄物程序處置內容物與容器。清運前以標示清楚的二次盛裝分開不相容物。",
    },
  ],
});

export const PRINT_QA_HYDROGEN_PEROXIDE = Object.freeze({
  cas_number: "7722-84-1",
  name_en: "Hydrogen Peroxide",
  name_zh: "過氧化氫",
  cid: 784,
  ghs_pictograms: [{ code: "GHS03" }, { code: "GHS05" }, { code: "GHS07" }],
  signal_word: "Danger",
  signal_word_zh: "危險",
  hazard_statements: [
    {
      code: "H271",
      text_en: "May cause fire or explosion; strong oxidizer",
      text_zh: "可能引起火災或爆炸；強氧化劑",
    },
    {
      code: "H302",
      text_en: "Harmful if swallowed",
      text_zh: "吞食有害",
    },
    {
      code: "H314",
      text_en: "Causes severe skin burns and eye damage",
      text_zh: "造成嚴重皮膚灼傷和眼睛損傷",
    },
  ],
  precautionary_statements: [
    {
      code: "P220",
      text_en: "Keep away from clothing and other combustible materials",
      text_zh: "遠離衣物及其他可燃材料",
    },
    {
      code: "P280",
      text_en: "Wear protective gloves and eye protection",
      text_zh: "佩戴防護手套與護眼用具",
    },
  ],
});

export const PRINT_QA_NITROGEN = Object.freeze({
  cas_number: "7727-37-9",
  name_en: "Nitrogen",
  name_zh: "氮氣",
  cid: 947,
  ghs_pictograms: [{ code: "GHS04" }],
  signal_word: "Warning",
  signal_word_zh: "警告",
  hazard_statements: [
    {
      code: "H280",
      text_en: "Contains gas under pressure; may explode if heated",
      text_zh: "內含高壓氣體；遇熱可能爆炸",
    },
    {
      code: "H281",
      text_en: "Contains refrigerated gas; may cause cryogenic burns or injury",
      text_zh: "內含冷凍氣體；可能造成低溫灼傷或傷害",
    },
  ],
  precautionary_statements: [
    {
      code: "P403",
      text_en: "Store in a well-ventilated place",
      text_zh: "儲存於通風良好處",
    },
  ],
});

export const PRINT_QA_ZINC_OXIDE = Object.freeze({
  cas_number: "1314-13-2",
  name_en: "Zinc Oxide",
  name_zh: "氧化鋅",
  cid: 14806,
  ghs_pictograms: [{ code: "GHS09" }],
  signal_word: "Warning",
  signal_word_zh: "警告",
  hazard_statements: [
    {
      code: "H400",
      text_en: "Very toxic to aquatic life",
      text_zh: "對水生生物毒性非常大",
    },
    {
      code: "H410",
      text_en: "Very toxic to aquatic life with long lasting effects",
      text_zh: "對水生生物毒性非常大並具有長期持續影響",
    },
  ],
  precautionary_statements: [
    {
      code: "P273",
      text_en: "Avoid release to the environment",
      text_zh: "避免排放至環境",
    },
    {
      code: "P391",
      text_en: "Collect spillage",
      text_zh: "收集溢漏物",
    },
  ],
});

export const PRINT_QA_BORIC_ACID = Object.freeze({
  cas_number: "10043-35-3",
  name_en: "Boric Acid",
  name_zh: "硼酸",
  cid: 7628,
  ghs_pictograms: [{ code: "GHS08" }],
  signal_word: "Danger",
  signal_word_zh: "危險",
  hazard_statements: [
    {
      code: "H360",
      text_en: "May damage fertility or the unborn child",
      text_zh: "可能對生育能力或胎兒造成傷害",
    },
  ],
  precautionary_statements: [
    {
      code: "P201",
      text_en: "Obtain special instructions before use",
      text_zh: "使用前取得特別指示",
    },
    {
      code: "P280",
      text_en: "Wear protective gloves and eye protection",
      text_zh: "佩戴防護手套與護眼用具",
    },
    {
      code: "P308+P313",
      text_en: "If exposed or concerned: get medical advice",
      text_zh: "如暴露或有疑慮：尋求醫療建議",
    },
  ],
});

export const PRINT_QA_LONG_NAME_CORROSIVE = Object.freeze({
  cas_number: "QA-LONG-001",
  name_en:
    "N,N-Dimethyl-2-hydroxyethylammonium chloride concentrated laboratory solution",
  name_zh: "長名腐蝕性溶液",
  cid: 0,
  ghs_pictograms: [{ code: "GHS05" }, { code: "GHS07" }],
  signal_word: "Warning",
  signal_word_zh: "警告",
  hazard_statements: [
    {
      code: "H315",
      text_en: "Causes skin irritation",
      text_zh: "造成皮膚刺激",
    },
    {
      code: "H319",
      text_en: "Causes serious eye irritation",
      text_zh: "造成嚴重眼睛刺激",
    },
  ],
  precautionary_statements: [
    {
      code: "P264",
      text_en: "Wash hands thoroughly after handling",
      text_zh: "操作後徹底清洗雙手",
    },
    {
      code: "P280",
      text_en: "Wear protective gloves and eye protection",
      text_zh: "佩戴防護手套與護眼用具",
    },
  ],
});

export const PRINT_QA_NINE_PICTOGRAM_STRESS = Object.freeze({
  cas_number: "QA-PICTO-009",
  name_en: "Nine-pictogram compact layout stress chemical",
  name_zh: "九圖示小標籤壓力測試",
  cid: 0,
  ghs_pictograms: [
    { code: "GHS01" },
    { code: "GHS02" },
    { code: "GHS03" },
    { code: "GHS04" },
    { code: "GHS05" },
    { code: "GHS06" },
    { code: "GHS07" },
    { code: "GHS08" },
    { code: "GHS09" },
  ],
  signal_word: "Danger",
  signal_word_zh: "危險",
  hazard_statements: [
    {
      code: "H999",
      text_en: "Synthetic QA hazard statement for compact pictogram layout.",
      text_zh: "小標籤圖示排版壓力測試用危害說明。",
    },
  ],
  precautionary_statements: [],
});

export const PRINT_QA_PREPARED_HYDROCHLORIC_ACID = Object.freeze(
  buildPreparedSolutionItem(
    { ...PRINT_QA_HYDROCHLORIC_ACID, found: true },
    {
      concentration: "1 M",
      solvent: "Water",
      preparedBy: "Lab Safety Office",
      preparedDate: "2026-05-12",
      expiryDate: "2026-06-12",
    },
  ),
);

export const PRINT_QA_CHEMICALS = Object.freeze({
  hydrochloricAcid: PRINT_QA_HYDROCHLORIC_ACID,
  aminobiphenyl: PRINT_QA_AMINOBIPHENYL,
  ethanol: PRINT_QA_ETHANOL,
  sodiumHydroxide: PRINT_QA_SODIUM_HYDROXIDE,
  methanol: PRINT_QA_METHANOL,
  formaldehyde: PRINT_QA_FORMALDEHYDE,
  ethyleneOxide: PRINT_QA_ETHYLENE_OXIDE,
  bromothiophene: PRINT_QA_BROMOTHIOPHENE,
  hydrogenPeroxide: PRINT_QA_HYDROGEN_PEROXIDE,
  nitrogen: PRINT_QA_NITROGEN,
  zincOxide: PRINT_QA_ZINC_OXIDE,
  boricAcid: PRINT_QA_BORIC_ACID,
  longNameCorrosive: PRINT_QA_LONG_NAME_CORROSIVE,
  ninePictogramStress: PRINT_QA_NINE_PICTOGRAM_STRESS,
  preparedHydrochloricAcid: PRINT_QA_PREPARED_HYDROCHLORIC_ACID,
});

export const PRINT_QA_CHEMICAL_COVERAGE = Object.freeze({
  hydrochloricAcid: {
    source: "production",
    riskTags: ["dense-hp", "multi-pictogram", "corrosive", "compressed-gas"],
    rationale:
      "Dense common acid used to prove complete-primary continuation, compact routing, and four-pictogram layouts.",
  },
  aminobiphenyl: {
    source: "production",
    riskTags: ["batch-print", "container-front", "warning-signal", "large-primary"],
    rationale:
      "Production batch-print item that previously looked visually sparse but still blocked Large Container Front handoff with label/standard-grid overflow.",
  },
  ethanol: {
    source: "production",
    riskTags: ["flammable", "lower-density", "common-lab-solvent"],
    rationale:
      "Common flammable solvent used to prove sparse supplemental and quick-ID paths stay readable.",
  },
  sodiumHydroxide: {
    source: "production",
    riskTags: ["corrosive", "qr-supplement", "bilingual"],
    rationale:
      "Common corrosive base used to prove QR supplemental output preserves corrosive identity and pictograms.",
  },
  methanol: {
    source: "production",
    riskTags: ["flammable", "acute-toxic", "health-hazard", "bw-mode"],
    rationale:
      "Compact B/W case with GHS02, GHS06, and GHS08 to catch health-hazard and monochrome regressions.",
  },
  formaldehyde: {
    source: "production",
    riskTags: ["dense-hp", "former-continuation", "health-hazard"],
    rationale:
      "Dense complete-primary case that now verifies A4 can fit more content after layout compaction.",
  },
  ethyleneOxide: {
    source: "production",
    riskTags: ["dense-hp", "continuation", "multi-page", "six-pictogram"],
    rationale:
      "Production dense gas case that still requires complete-primary continuation and six single-row pictograms.",
  },
  bromothiophene: {
    source: "production-regression",
    riskTags: ["moderate-hp", "continuation-packing", "space-utilization"],
    rationale:
      "A4 complete-primary continuation regression for moderate H/P cases that need two safe pages, with the final page kept useful instead of sparse.",
  },
  hydrogenPeroxide: {
    source: "production",
    riskTags: ["oxidizer", "qr-supplement", "english-mode"],
    rationale:
      "Oxidizer case used to keep GHS03 and English QR supplemental output covered.",
  },
  nitrogen: {
    source: "production",
    riskTags: ["single-pictogram", "compressed-gas", "sparse-layout"],
    rationale:
      "Single GHS04 compressed-gas case used to prove sparse compact labels do not overfit dense-chemical assumptions.",
  },
  zincOxide: {
    source: "production",
    riskTags: ["single-pictogram", "environmental", "qr-supplement"],
    rationale:
      "Single GHS09 environmental case used to prove environmental pictograms and QR layout are not omitted.",
  },
  boricAcid: {
    source: "production",
    riskTags: ["single-pictogram", "health-hazard", "supplemental"],
    rationale:
      "Single GHS08 health-hazard case used to prove reproductive-health statements fit a normal bottle label.",
  },
  longNameCorrosive: {
    source: "local-fixture",
    riskTags: ["long-name", "identity-density", "compact-autofit"],
    rationale:
      "Synthetic long-name fixture used to prove identity shrink rules keep CAS/name visible on compact output.",
  },
  ninePictogramStress: {
    source: "local-fixture",
    riskTags: ["nine-pictogram", "compact-grid", "small-label-pressure"],
    rationale:
      "Synthetic nine-pictogram fixture used to prove compact labels reflow the hazard band instead of shrinking identity text.",
  },
  preparedHydrochloricAcid: {
    source: "local-derived",
    riskTags: ["prepared-solution", "operational-identity", "preset-reuse"],
    rationale:
      "Derived prepared-solution item used to prove concentration, solvent, and operational metadata survive print paths.",
  },
});

const getChemicalPictogramCodes = (chemical = {}) =>
  (chemical.ghs_pictograms || [])
    .map((pictogram) => pictogram?.code)
    .filter(Boolean);

export const PRINT_QA_MATRIX = Object.freeze([
  {
    id: "a4-primary",
    label: "A4 complete primary",
    locale: "zh-TW",
    labelConfig: {
      labelPurpose: "shipping",
      template: "full",
      stockPreset: "a4-primary",
      nameDisplay: "both",
      colorMode: "color",
    },
    expected: {
      canPrint: true,
      outputKind: PRINT_OUTPUT_KIND.COMPLETE_PRIMARY,
      labelKind: "complete-primary",
      stockPreset: "a4-primary",
      template: "full",
      hasQr: false,
      hasFullPagePictograms: true,
      hasSummaries: false,
      planState: PRINT_OUTPUT_PLAN_STATE.READY,
      printTotalLabels: 1,
      contentPolicy: {
        role: PRINT_CONTENT_ROLE.COMPLETE_PRIMARY,
        hazardTextMode: PRINT_HAZARD_TEXT_MODE.FULL_HP,
        precautionTextMode: PRINT_PRECAUTION_TEXT_MODE.FULL_TEXT,
      },
    },
  },
  {
    id: "aminobiphenyl-a4-primary",
    label: "2-Aminobiphenyl A4 complete primary regression",
    chemicalId: "aminobiphenyl",
    locale: "zh-TW",
    labelConfig: {
      labelPurpose: "shipping",
      template: "full",
      stockPreset: "a4-primary",
      nameDisplay: "both",
      colorMode: "color",
    },
    expected: {
      canPrint: true,
      outputKind: PRINT_OUTPUT_KIND.COMPLETE_PRIMARY,
      labelKind: "complete-primary",
      stockPreset: "a4-primary",
      template: "full",
      hasFullPagePictograms: true,
      hasSummaries: false,
      planState: PRINT_OUTPUT_PLAN_STATE.READY,
      printTotalLabels: 1,
      productionExpectedRequiredIdentityTexts: ["2-Aminobiphenyl", "90-41-5"],
      contentPolicy: {
        role: PRINT_CONTENT_ROLE.COMPLETE_PRIMARY,
        hazardTextMode: PRINT_HAZARD_TEXT_MODE.FULL_HP,
        precautionTextMode: PRINT_PRECAUTION_TEXT_MODE.FULL_TEXT,
      },
    },
  },
  {
    id: "a4-primary-profile-blocked",
    label: "A4 complete primary blocked without responsible profile",
    locale: "zh-TW",
    labProfile: {
      organization: "",
      phone: "",
      address: "",
    },
    productionResponsibleProfile: {
      organization: "",
      phone: "",
      address: "",
    },
    labelConfig: {
      labelPurpose: "shipping",
      template: "full",
      stockPreset: "a4-primary",
      nameDisplay: "both",
      colorMode: "color",
    },
    expected: {
      canPrint: false,
      planState: PRINT_OUTPUT_PLAN_STATE.MISSING_REQUIRED_PROFILE,
      outputKind: PRINT_OUTPUT_KIND.COMPLETE_PRIMARY,
      labelKind: "complete-primary",
      stockPreset: "a4-primary",
      template: "full",
      hasQr: false,
      hasFullPagePictograms: true,
      recoveryKind: "profile",
      printTotalLabels: 1,
      blockedTextPatterns: [
        "profile",
        "lab",
        "supplier",
        "A4",
        "實驗室",
        "供應商",
      ],
      contentPolicy: {
        role: PRINT_CONTENT_ROLE.COMPLETE_PRIMARY,
        hazardTextMode: PRINT_HAZARD_TEXT_MODE.FULL_HP,
        precautionTextMode: PRINT_PRECAUTION_TEXT_MODE.FULL_TEXT,
      },
    },
  },
  {
    id: "letter-primary",
    label: "Letter complete primary",
    locale: "en-US",
    labelConfig: {
      labelPurpose: "shipping",
      template: "full",
      stockPreset: "letter-primary",
      nameDisplay: "both",
      colorMode: "color",
    },
    expected: {
      canPrint: true,
      outputKind: PRINT_OUTPUT_KIND.COMPLETE_PRIMARY,
      labelKind: "complete-primary",
      stockPreset: "letter-primary",
      template: "full",
      hasQr: false,
      hasFullPagePictograms: true,
      hasSummaries: false,
      planState: PRINT_OUTPUT_PLAN_STATE.READY,
      printTotalLabels: 1,
    },
  },
  {
    id: "a4-primary-zh-bw",
    label: "A4 complete primary bilingual B/W",
    locale: "zh-TW",
    labelConfig: {
      labelPurpose: "shipping",
      template: "full",
      stockPreset: "a4-primary",
      nameDisplay: "both",
      colorMode: "bw",
    },
    expected: {
      canPrint: true,
      outputKind: PRINT_OUTPUT_KIND.COMPLETE_PRIMARY,
      labelKind: "complete-primary",
      stockPreset: "a4-primary",
      template: "full",
      hasQr: false,
      hasFullPagePictograms: true,
      hasSummaries: false,
      planState: PRINT_OUTPUT_PLAN_STATE.READY,
      printTotalLabels: 1,
    },
  },
  {
    id: "letter-primary-en-bw",
    label: "Letter complete primary English B/W",
    locale: "en-US",
    labelConfig: {
      labelPurpose: "shipping",
      template: "full",
      stockPreset: "letter-primary",
      nameDisplay: "en",
      colorMode: "bw",
    },
    expected: {
      canPrint: true,
      outputKind: PRINT_OUTPUT_KIND.COMPLETE_PRIMARY,
      labelKind: "complete-primary",
      stockPreset: "letter-primary",
      template: "full",
      hasQr: false,
      hasFullPagePictograms: true,
      hasSummaries: false,
      planState: PRINT_OUTPUT_PLAN_STATE.READY,
      printTotalLabels: 1,
    },
  },
  {
    id: "ethylene-oxide-a4-primary-continuation",
    label: "Ethylene oxide A4 complete primary continuation",
    chemicalId: "ethyleneOxide",
    locale: "en-US",
    labelConfig: {
      labelPurpose: "shipping",
      template: "full",
      stockPreset: "a4-primary",
      nameDisplay: "both",
      colorMode: "color",
    },
    expected: {
      canPrint: true,
      planState: PRINT_OUTPUT_PLAN_STATE.READY_WITH_CONTINUATION,
      outputKind: PRINT_OUTPUT_KIND.COMPLETE_PRIMARY,
      labelKind: "complete-primary",
      stockPreset: "a4-primary",
      template: "full",
      hasQr: false,
      hasFullPagePictograms: true,
      hasSummaries: false,
      minPrintTotalLabels: 2,
      maxPrintTotalLabels: 3,
      contentPolicy: {
        role: PRINT_CONTENT_ROLE.COMPLETE_PRIMARY,
        hazardTextMode: PRINT_HAZARD_TEXT_MODE.FULL_HP_CONTINUATION,
        precautionTextMode: PRINT_PRECAUTION_TEXT_MODE.FULL_TEXT,
      },
      productionExpectedIdentityTexts: ["Ethylene Oxide", "75-21-8"],
      productionExpectedRequiredIdentityTexts: ["Ethylene Oxide"],
    },
  },
  {
    id: "bromothiophene-a4-primary-packing-regression",
    label: "2-Bromothiophene A4 packing regression",
    chemicalId: "bromothiophene",
    locale: "zh-TW",
    labelConfig: {
      labelPurpose: "shipping",
      template: "full",
      stockPreset: "a4-primary",
      nameDisplay: "both",
      colorMode: "color",
    },
    expected: {
      canPrint: true,
      planState: PRINT_OUTPUT_PLAN_STATE.READY_WITH_CONTINUATION,
      outputKind: PRINT_OUTPUT_KIND.COMPLETE_PRIMARY,
      labelKind: "complete-primary",
      stockPreset: "a4-primary",
      template: "full",
      hasQr: false,
      hasFullPagePictograms: true,
      hasSummaries: false,
      printTotalLabels: 2,
      contentPolicy: {
        role: PRINT_CONTENT_ROLE.COMPLETE_PRIMARY,
        hazardTextMode: PRINT_HAZARD_TEXT_MODE.FULL_HP_CONTINUATION,
        precautionTextMode: PRINT_PRECAUTION_TEXT_MODE.FULL_TEXT,
      },
      productionExpectedIdentityTexts: ["2-Bromothiophene", "1003-09-4"],
      productionExpectedRequiredIdentityTexts: ["2-Bromothiophene"],
    },
  },
  {
    id: "bottle-supplemental",
    label: "Bottle supplemental",
    locale: "zh-TW",
    labelConfig: {
      labelPurpose: "shipping",
      template: "standard",
      stockPreset: "medium-bottle",
      nameDisplay: "both",
      colorMode: "color",
    },
    expected: {
      canPrint: true,
      outputKind: PRINT_OUTPUT_KIND.SUPPLEMENTAL,
      labelKind: "supplemental",
      stockPreset: "medium-bottle",
      template: "standard",
      hasQr: false,
      hasFullPagePictograms: false,
      minPreviewScale: 1,
      contentPolicy: {
        role: PRINT_CONTENT_ROLE.CONTAINER_FRONT,
        hazardTextMode: PRINT_HAZARD_TEXT_MODE.H_CODES_ONLY,
        precautionTextMode: PRINT_PRECAUTION_TEXT_MODE.OMITTED,
      },
    },
  },
  {
    id: "bottle-supplemental-with-case",
    label: "Bottle supplemental with case identity",
    locale: "zh-TW",
    customLabelFields: PRINT_QA_CASE_FIELDS,
    labelConfig: {
      labelPurpose: "shipping",
      template: "standard",
      stockPreset: "medium-bottle",
      nameDisplay: "both",
      colorMode: "color",
    },
    expected: {
      canPrint: true,
      outputKind: PRINT_OUTPUT_KIND.SUPPLEMENTAL,
      labelKind: "supplemental",
      stockPreset: "medium-bottle",
      template: "standard",
      hasQr: false,
      hasFullPagePictograms: false,
      minPreviewScale: 1,
      requiredIdentityText: PRINT_QA_CASE_FIELDS.batchNumber,
    },
  },
  {
    id: "large-primary-front-label",
    label: "Large primary front label",
    locale: "zh-TW",
    labelConfig: {
      labelPurpose: "shipping",
      template: "standard",
      stockPreset: "large-primary",
      nameDisplay: "both",
      colorMode: "color",
    },
    expected: {
      canPrint: true,
      outputKind: PRINT_OUTPUT_KIND.SUPPLEMENTAL,
      labelKind: "supplemental",
      stockPreset: "large-primary",
      template: "standard",
      hasQr: false,
      hasFullPagePictograms: false,
      minPreviewScale: 0.75,
      minProductionPictogramSidePx: 78,
      contentPolicy: {
        role: PRINT_CONTENT_ROLE.CONTAINER_FRONT,
        hazardTextMode: PRINT_HAZARD_TEXT_MODE.H_CODES_ONLY,
        precautionTextMode: PRINT_PRECAUTION_TEXT_MODE.OMITTED,
      },
    },
  },
  {
    id: "large-primary-front-warning-batch-item",
    label: "Large primary front label warning batch item",
    chemicalId: "aminobiphenyl",
    locale: "zh-TW",
    labelConfig: {
      labelPurpose: "shipping",
      template: "standard",
      stockPreset: "large-primary",
      nameDisplay: "both",
      colorMode: "color",
    },
    expected: {
      canPrint: true,
      outputKind: PRINT_OUTPUT_KIND.SUPPLEMENTAL,
      labelKind: "supplemental",
      stockPreset: "large-primary",
      template: "standard",
      hasQr: false,
      hasFullPagePictograms: false,
      minPreviewScale: 0.75,
      minProductionPictogramSidePx: 78,
      contentPolicy: {
        role: PRINT_CONTENT_ROLE.CONTAINER_FRONT,
        hazardTextMode: PRINT_HAZARD_TEXT_MODE.H_CODES_ONLY,
        precautionTextMode: PRINT_PRECAUTION_TEXT_MODE.OMITTED,
      },
      productionExpectedIdentityTexts: ["2-Aminobiphenyl", "2-胺基聯苯", "90-41-5"],
      productionExpectedRequiredIdentityTexts: ["2-Aminobiphenyl", "90-41-5"],
    },
  },
  {
    id: "avery-5163-bottle-supplemental",
    label: "Letter 2 x 4 bottle supplemental",
    locale: "en-US",
    labelConfig: {
      labelPurpose: "shipping",
      template: "standard",
      stockPreset: "avery-5163",
      nameDisplay: "en",
      colorMode: "color",
    },
    expected: {
      canPrint: true,
      outputKind: PRINT_OUTPUT_KIND.SUPPLEMENTAL,
      labelKind: "supplemental",
      stockPreset: "avery-5163",
      template: "standard",
      hasQr: false,
      hasFullPagePictograms: false,
    },
  },
  {
    id: "avery-5164-large-supplemental",
    label: "Letter large supplemental",
    locale: "en-US",
    labelConfig: {
      labelPurpose: "shipping",
      template: "standard",
      stockPreset: "avery-5164",
      nameDisplay: "both",
      colorMode: "color",
    },
    expected: {
      canPrint: true,
      outputKind: PRINT_OUTPUT_KIND.SUPPLEMENTAL,
      labelKind: "supplemental",
      stockPreset: "avery-5164",
      template: "standard",
      hasQr: false,
      hasFullPagePictograms: false,
    },
  },
  {
    id: "rack-landscape-supplemental",
    label: "Rack landscape supplemental",
    locale: "zh-TW",
    labelConfig: {
      labelPurpose: "shipping",
      template: "standard",
      stockPreset: "medium-rack",
      nameDisplay: "both",
      colorMode: "color",
    },
    expected: {
      canPrint: true,
      outputKind: PRINT_OUTPUT_KIND.SUPPLEMENTAL,
      labelKind: "supplemental",
      stockPreset: "medium-rack",
      template: "standard",
      hasQr: false,
      hasFullPagePictograms: false,
      minPreviewScale: 1,
    },
  },
  {
    id: "tube-vial-quick-id",
    label: "Tube/vial quick-ID",
    locale: "zh-TW",
    labelConfig: {
      labelPurpose: "quickId",
      template: "icon",
      stockPreset: "small-strip",
      nameDisplay: "both",
      colorMode: "color",
    },
    expected: {
      canPrint: true,
      outputKind: PRINT_OUTPUT_KIND.QUICK_ID,
      labelKind: "quick-id",
      stockPreset: "small-strip",
      template: "icon",
      hasQr: false,
      hasFullPagePictograms: false,
      minPreviewScale: 1.4,
      contentPolicy: {
        role: PRINT_CONTENT_ROLE.QUICK_ID,
        hazardTextMode: PRINT_HAZARD_TEXT_MODE.OMITTED,
        precautionTextMode: PRINT_PRECAUTION_TEXT_MODE.OMITTED,
      },
    },
  },
  {
    id: "tube-vial-quick-id-with-case",
    label: "Tube/vial quick-ID with case identity",
    locale: "zh-TW",
    customLabelFields: PRINT_QA_CASE_FIELDS,
    labelConfig: {
      labelPurpose: "quickId",
      template: "icon",
      stockPreset: "small-strip",
      nameDisplay: "both",
      colorMode: "color",
    },
    expected: {
      canPrint: true,
      outputKind: PRINT_OUTPUT_KIND.QUICK_ID,
      labelKind: "quick-id",
      stockPreset: "small-strip",
      template: "icon",
      hasQr: false,
      hasFullPagePictograms: false,
      minPreviewScale: 1.4,
      requiredIdentityText: PRINT_QA_CASE_FIELDS.batchNumber,
    },
  },
  {
    id: "nine-pictogram-tube-quick-id",
    label: "Nine-pictogram tube quick-ID",
    chemicalId: "ninePictogramStress",
    locale: "zh-TW",
    labelConfig: {
      labelPurpose: "quickId",
      template: "icon",
      stockPreset: "small-strip",
      nameDisplay: "both",
      colorMode: "color",
    },
    expected: {
      canPrint: true,
      outputKind: PRINT_OUTPUT_KIND.QUICK_ID,
      labelKind: "quick-id",
      stockPreset: "small-strip",
      template: "icon",
      hasQr: false,
      hasFullPagePictograms: false,
      minPreviewScale: 1.4,
    },
  },
  {
    id: "brother-62mm-quick-id",
    label: "Brother 62 mm quick-ID",
    locale: "zh-TW",
    labelConfig: {
      labelPurpose: "quickId",
      template: "icon",
      stockPreset: "brother-62mm-continuous",
      nameDisplay: "both",
      colorMode: "color",
    },
    expected: {
      canPrint: true,
      outputKind: PRINT_OUTPUT_KIND.QUICK_ID,
      labelKind: "quick-id",
      stockPreset: "brother-62mm-continuous",
      template: "icon",
      hasQr: false,
      hasFullPagePictograms: false,
      minPreviewScale: 1.4,
    },
  },
  {
    id: "small-rack-quick-id",
    label: "Bench rack quick-ID",
    locale: "zh-TW",
    labelConfig: {
      labelPurpose: "quickId",
      template: "icon",
      stockPreset: "small-rack",
      nameDisplay: "both",
      colorMode: "color",
    },
    expected: {
      canPrint: true,
      outputKind: PRINT_OUTPUT_KIND.QUICK_ID,
      labelKind: "quick-id",
      stockPreset: "small-rack",
      template: "icon",
      hasQr: false,
      hasFullPagePictograms: false,
      minPreviewScale: 1.4,
    },
  },
  {
    id: "medium-rack-quick-id",
    label: "Rack landscape quick-ID",
    locale: "zh-TW",
    labelConfig: {
      labelPurpose: "quickId",
      template: "icon",
      stockPreset: "medium-rack",
      nameDisplay: "both",
      colorMode: "color",
    },
    expected: {
      canPrint: true,
      outputKind: PRINT_OUTPUT_KIND.QUICK_ID,
      labelKind: "quick-id",
      stockPreset: "medium-rack",
      template: "icon",
      hasQr: false,
      hasFullPagePictograms: false,
      minPreviewScale: 1.2,
    },
  },
  {
    id: "qr-supplement",
    label: "QR supplement",
    locale: "zh-TW",
    labelConfig: {
      labelPurpose: "qrSupplement",
      template: "qrcode",
      stockPreset: "small-strip",
      nameDisplay: "both",
      colorMode: "color",
    },
    expected: {
      canPrint: true,
      outputKind: PRINT_OUTPUT_KIND.QR_SUPPLEMENT,
      labelKind: "qr-supplement",
      stockPreset: "small-strip",
      template: "qrcode",
      hasQr: true,
      hasFullPagePictograms: false,
      minPreviewScale: 1.4,
      contentPolicy: {
        role: PRINT_CONTENT_ROLE.QR_SUPPLEMENT,
        hazardTextMode: PRINT_HAZARD_TEXT_MODE.QR_REFERENCE,
        precautionTextMode: PRINT_PRECAUTION_TEXT_MODE.OMITTED,
      },
    },
  },
  {
    id: "brother-62mm-qr-supplement",
    label: "Brother 62 mm QR supplement",
    locale: "zh-TW",
    labelConfig: {
      labelPurpose: "qrSupplement",
      template: "qrcode",
      stockPreset: "brother-62mm-continuous",
      nameDisplay: "both",
      colorMode: "color",
    },
    expected: {
      canPrint: true,
      outputKind: PRINT_OUTPUT_KIND.QR_SUPPLEMENT,
      labelKind: "qr-supplement",
      stockPreset: "brother-62mm-continuous",
      template: "qrcode",
      hasQr: true,
      hasFullPagePictograms: false,
      minPreviewScale: 1.4,
    },
  },
  {
    id: "nine-pictogram-brother-62mm-qr-supplement",
    label: "Nine-pictogram Brother 62 mm QR supplement",
    chemicalId: "ninePictogramStress",
    locale: "zh-TW",
    labelConfig: {
      labelPurpose: "qrSupplement",
      template: "qrcode",
      stockPreset: "brother-62mm-continuous",
      nameDisplay: "both",
      colorMode: "color",
    },
    expected: {
      canPrint: true,
      outputKind: PRINT_OUTPUT_KIND.QR_SUPPLEMENT,
      labelKind: "qr-supplement",
      stockPreset: "brother-62mm-continuous",
      template: "qrcode",
      hasQr: true,
      hasFullPagePictograms: false,
      minPreviewScale: 1.4,
    },
  },
  {
    id: "small-rack-qr-supplement",
    label: "Bench rack QR supplement",
    locale: "zh-TW",
    labelConfig: {
      labelPurpose: "qrSupplement",
      template: "qrcode",
      stockPreset: "small-rack",
      nameDisplay: "both",
      colorMode: "color",
    },
    expected: {
      canPrint: true,
      outputKind: PRINT_OUTPUT_KIND.QR_SUPPLEMENT,
      labelKind: "qr-supplement",
      stockPreset: "small-rack",
      template: "qrcode",
      hasQr: true,
      hasFullPagePictograms: false,
      minPreviewScale: 1.4,
    },
  },
  {
    id: "medium-rack-qr-supplement",
    label: "Rack landscape QR supplement",
    locale: "zh-TW",
    labelConfig: {
      labelPurpose: "qrSupplement",
      template: "qrcode",
      stockPreset: "medium-rack",
      nameDisplay: "both",
      colorMode: "color",
    },
    expected: {
      canPrint: true,
      outputKind: PRINT_OUTPUT_KIND.QR_SUPPLEMENT,
      labelKind: "qr-supplement",
      stockPreset: "medium-rack",
      template: "qrcode",
      hasQr: true,
      hasFullPagePictograms: false,
      minPreviewScale: 1.2,
    },
  },
  {
    id: "custom-tiny-complete-primary-blocked",
    label: "Custom tiny complete-primary blocked",
    locale: "zh-TW",
    productionHandoff: false,
    labelConfig: {
      labelPurpose: "shipping",
      template: "full",
      stockPreset: "custom",
      labelWidthMm: 45,
      labelHeightMm: 28,
      nameDisplay: "zh",
      colorMode: "color",
    },
    expected: {
      canPrint: false,
      planState: PRINT_OUTPUT_PLAN_STATE.RECOMMEND_FULL_PAGE,
      outputKind: PRINT_OUTPUT_KIND.COMPLETE_PRIMARY,
      labelKind: "complete-primary",
      stockPreset: "custom",
      template: "full",
      hasQr: false,
      hasFullPagePictograms: false,
      contentPolicy: {
        role: PRINT_CONTENT_ROLE.COMPLETE_PRIMARY,
        hazardTextMode: PRINT_HAZARD_TEXT_MODE.FULL_HP,
        precautionTextMode: PRINT_PRECAUTION_TEXT_MODE.FULL_TEXT,
      },
    },
  },
  {
    id: "custom-tiny-supplemental",
    label: "Custom tiny supplemental",
    locale: "zh-TW",
    productionHandoff: false,
    labelConfig: {
      labelPurpose: "shipping",
      template: "standard",
      stockPreset: "custom",
      labelWidthMm: 45,
      labelHeightMm: 28,
      nameDisplay: "both",
      colorMode: "color",
    },
    expected: {
      canPrint: true,
      outputKind: PRINT_OUTPUT_KIND.SUPPLEMENTAL,
      labelKind: "supplemental",
      stockPreset: "custom",
      template: "standard",
      hasQr: false,
      hasFullPagePictograms: false,
      minPreviewScale: 1.4,
      contentPolicy: {
        role: PRINT_CONTENT_ROLE.CONTAINER_FRONT,
        hazardTextMode: PRINT_HAZARD_TEXT_MODE.H_CODES_ONLY,
        precautionTextMode: PRINT_PRECAUTION_TEXT_MODE.OMITTED,
      },
    },
  },
  {
    id: "ethanol-bottle-supplemental",
    label: "Ethanol bottle supplemental",
    chemicalId: "ethanol",
    locale: "zh-TW",
    labelConfig: {
      labelPurpose: "shipping",
      template: "standard",
      stockPreset: "medium-bottle",
      nameDisplay: "both",
      colorMode: "color",
    },
    expected: {
      canPrint: true,
      outputKind: PRINT_OUTPUT_KIND.SUPPLEMENTAL,
      labelKind: "supplemental",
      stockPreset: "medium-bottle",
      template: "standard",
      hasQr: false,
      hasFullPagePictograms: false,
      hasSummaries: false,
    },
  },
  {
    id: "ethanol-tube-quick-id",
    label: "Ethanol tube quick-ID",
    chemicalId: "ethanol",
    locale: "en-US",
    labelConfig: {
      labelPurpose: "quickId",
      template: "icon",
      stockPreset: "small-strip",
      nameDisplay: "en",
      colorMode: "bw",
    },
    expected: {
      canPrint: true,
      outputKind: PRINT_OUTPUT_KIND.QUICK_ID,
      labelKind: "quick-id",
      stockPreset: "small-strip",
      template: "icon",
      hasQr: false,
      hasFullPagePictograms: false,
      minPreviewScale: 1.4,
    },
  },
  {
    id: "sodium-hydroxide-qr-supplement",
    label: "Sodium hydroxide QR supplement",
    chemicalId: "sodiumHydroxide",
    locale: "zh-TW",
    labelConfig: {
      labelPurpose: "qrSupplement",
      template: "qrcode",
      stockPreset: "small-strip",
      nameDisplay: "both",
      colorMode: "color",
    },
    expected: {
      canPrint: true,
      outputKind: PRINT_OUTPUT_KIND.QR_SUPPLEMENT,
      labelKind: "qr-supplement",
      stockPreset: "small-strip",
      template: "qrcode",
      hasQr: true,
      hasFullPagePictograms: false,
      minPreviewScale: 1.4,
    },
  },
  {
    id: "methanol-brother-quick-id-bw",
    label: "Methanol Brother 62 mm quick-ID B/W",
    chemicalId: "methanol",
    locale: "en-US",
    labelConfig: {
      labelPurpose: "quickId",
      template: "icon",
      stockPreset: "brother-62mm-continuous",
      nameDisplay: "en",
      colorMode: "bw",
    },
    expected: {
      canPrint: true,
      outputKind: PRINT_OUTPUT_KIND.QUICK_ID,
      labelKind: "quick-id",
      stockPreset: "brother-62mm-continuous",
      template: "icon",
      hasQr: false,
      hasFullPagePictograms: false,
      minPreviewScale: 1.4,
    },
  },
  {
    id: "hydrogen-peroxide-qr-supplement-en",
    label: "Hydrogen peroxide QR supplement English",
    chemicalId: "hydrogenPeroxide",
    locale: "en-US",
    labelConfig: {
      labelPurpose: "qrSupplement",
      template: "qrcode",
      stockPreset: "small-strip",
      nameDisplay: "en",
      colorMode: "color",
    },
    expected: {
      canPrint: true,
      outputKind: PRINT_OUTPUT_KIND.QR_SUPPLEMENT,
      labelKind: "qr-supplement",
      stockPreset: "small-strip",
      template: "qrcode",
      hasQr: true,
      hasFullPagePictograms: false,
      minPreviewScale: 1.4,
    },
  },
  {
    id: "nitrogen-tube-quick-id-single-pictogram",
    label: "Nitrogen tube quick-ID single pictogram",
    chemicalId: "nitrogen",
    locale: "en-US",
    labelConfig: {
      labelPurpose: "quickId",
      template: "icon",
      stockPreset: "small-strip",
      nameDisplay: "en",
      colorMode: "color",
    },
    expected: {
      canPrint: true,
      outputKind: PRINT_OUTPUT_KIND.QUICK_ID,
      labelKind: "quick-id",
      stockPreset: "small-strip",
      template: "icon",
      hasQr: false,
      hasFullPagePictograms: false,
      minPreviewScale: 1.4,
    },
  },
  {
    id: "zinc-oxide-small-qr-environmental",
    label: "Zinc oxide QR supplement environmental",
    chemicalId: "zincOxide",
    locale: "en-US",
    labelConfig: {
      labelPurpose: "qrSupplement",
      template: "qrcode",
      stockPreset: "small-strip",
      nameDisplay: "en",
      colorMode: "color",
    },
    expected: {
      canPrint: true,
      outputKind: PRINT_OUTPUT_KIND.QR_SUPPLEMENT,
      labelKind: "qr-supplement",
      stockPreset: "small-strip",
      template: "qrcode",
      hasQr: true,
      hasFullPagePictograms: false,
      minPreviewScale: 1.4,
    },
  },
  {
    id: "boric-acid-bottle-supplemental-health",
    label: "Boric acid bottle supplemental health hazard",
    chemicalId: "boricAcid",
    locale: "en-US",
    labelConfig: {
      labelPurpose: "shipping",
      template: "standard",
      stockPreset: "medium-bottle",
      nameDisplay: "en",
      colorMode: "color",
    },
    expected: {
      canPrint: true,
      outputKind: PRINT_OUTPUT_KIND.SUPPLEMENTAL,
      labelKind: "supplemental",
      stockPreset: "medium-bottle",
      template: "standard",
      hasQr: false,
      hasFullPagePictograms: false,
      hasSummaries: false,
    },
  },
  {
    id: "prepared-a4-primary",
    label: "Prepared HCl A4 complete primary",
    chemicalId: "preparedHydrochloricAcid",
    productionHandoff: false,
    locale: "zh-TW",
    labelConfig: {
      labelPurpose: "shipping",
      template: "full",
      stockPreset: "a4-primary",
      nameDisplay: "both",
      colorMode: "color",
    },
    expected: {
      canPrint: true,
      outputKind: PRINT_OUTPUT_KIND.COMPLETE_PRIMARY,
      labelKind: "complete-primary",
      stockPreset: "a4-primary",
      template: "full",
      hasQr: false,
      hasFullPagePictograms: true,
      hasSummaries: false,
      planState: PRINT_OUTPUT_PLAN_STATE.READY,
      printTotalLabels: 1,
      preparedIdentityTexts: [
        "1 M",
        "Water",
        "Lab Safety Office",
        "2026-05-12",
        "2026-06-12",
      ],
    },
  },
  {
    id: "prepared-bottle-supplemental",
    label: "Prepared HCl bottle supplemental",
    chemicalId: "preparedHydrochloricAcid",
    productionHandoff: false,
    locale: "zh-TW",
    labelConfig: {
      labelPurpose: "shipping",
      template: "standard",
      stockPreset: "medium-bottle",
      nameDisplay: "both",
      colorMode: "color",
    },
    expected: {
      canPrint: true,
      outputKind: PRINT_OUTPUT_KIND.SUPPLEMENTAL,
      labelKind: "supplemental",
      stockPreset: "medium-bottle",
      template: "standard",
      hasQr: false,
      hasFullPagePictograms: false,
      minPreviewScale: 1,
      preparedIdentityTexts: ["1 M", "Water"],
    },
  },
  {
    id: "prepared-tube-quick-id",
    label: "Prepared HCl tube quick-ID",
    chemicalId: "preparedHydrochloricAcid",
    productionHandoff: false,
    locale: "zh-TW",
    labelConfig: {
      labelPurpose: "quickId",
      template: "icon",
      stockPreset: "small-strip",
      nameDisplay: "both",
      colorMode: "color",
    },
    expected: {
      canPrint: true,
      outputKind: PRINT_OUTPUT_KIND.QUICK_ID,
      labelKind: "quick-id",
      stockPreset: "small-strip",
      template: "icon",
      hasQr: false,
      hasFullPagePictograms: false,
      minPreviewScale: 1.4,
      preparedIdentityTexts: ["1 M", "Water"],
    },
  },
  {
    id: "long-name-bottle-supplemental",
    label: "Long-name bottle supplemental",
    chemicalId: "longNameCorrosive",
    locale: "en-US",
    labelConfig: {
      labelPurpose: "shipping",
      template: "standard",
      stockPreset: "medium-bottle",
      nameDisplay: "en",
      colorMode: "color",
    },
    expected: {
      canPrint: true,
      outputKind: PRINT_OUTPUT_KIND.SUPPLEMENTAL,
      labelKind: "supplemental",
      stockPreset: "medium-bottle",
      template: "standard",
      hasQr: false,
      hasFullPagePictograms: false,
    },
  },
  {
    id: "long-name-tube-quick-id",
    label: "Long-name tube quick-ID",
    chemicalId: "longNameCorrosive",
    locale: "en-US",
    labelConfig: {
      labelPurpose: "quickId",
      template: "icon",
      stockPreset: "small-strip",
      nameDisplay: "both",
      colorMode: "color",
    },
    expected: {
      canPrint: true,
      outputKind: PRINT_OUTPUT_KIND.QUICK_ID,
      labelKind: "quick-id",
      stockPreset: "small-strip",
      template: "icon",
      hasQr: false,
      hasFullPagePictograms: false,
      minPreviewScale: 1.4,
      identityDensityClass: "identity-density-high",
    },
  },
]);

const LABEL_KIND_CLASSES = Object.freeze({
  "complete-primary": "label-kind-complete-primary",
  supplemental: "label-kind-supplemental",
  "quick-id": "label-kind-quick-id",
  "qr-supplement": "label-kind-qr-supplement",
});

const extractPictogramCodes = (fragmentHtml = "") => [
  ...new Set(
    [...fragmentHtml.matchAll(/alt="(GHS\d{2})"/g)].map((match) => match[1]),
  ),
];

const extractModelPictogramCodes = (model = {}) => [
  ...new Set(
    (model.expandedLabels || []).flatMap((label) =>
      label.continuation?.pictograms
        ? label.continuation.pictograms.map((pictogram) => pictogram.code)
        : (label.ghs_pictograms || []).map((pictogram) => pictogram.code),
    ),
  ),
];

const includesEvery = (actual = [], expected = []) =>
  expected.every((item) => actual.includes(item));

const hasActualQrImage = (fragmentHtml = "") =>
  /<img[^>]+class="[^"]*\bqrcode-img\b/.test(fragmentHtml);

const hasSummaries = (fragmentHtml = "") =>
  fragmentHtml.includes("hazard-more") ||
  fragmentHtml.includes("precaution-more") ||
  fragmentHtml.includes("more-pics");

const hasSignalWordElement = (fragmentHtml = "") =>
  /class="[^"]*\bsignal\b/.test(fragmentHtml);

const sameMembers = (left = [], right = []) => {
  const leftSet = new Set(left);
  const rightSet = new Set(right);
  return (
    leftSet.size === rightSet.size &&
    [...leftSet].every((item) => rightSet.has(item))
  );
};

const hasAnyText = (html = "", candidates = []) =>
  candidates.length === 0 ||
  candidates.some((candidate) => html.includes(candidate));

const uniqueTexts = (texts = []) =>
  [...new Set(texts.filter(Boolean))];

const resolveIdentityTextExpectation = (chemical = {}, labelConfig = {}, expected = {}) => {
  const english = chemical.name_en || chemical.name;
  const chinese = chemical.name_zh || chemical.name;
  const allNames = uniqueTexts([chinese, english, chemical.name]);
  const requiresSmallLabelCompleteIdentity = [
    "quick-id",
    "qr-supplement",
  ].includes(expected.labelKind);

  if (requiresSmallLabelCompleteIdentity) {
    return {
      any: uniqueTexts([...allNames, chemical.cas_number]),
      required: allNames,
      forbidden: [],
    };
  }

  if (labelConfig.nameDisplay === "en") {
    return {
      any: uniqueTexts([english, chemical.cas_number]),
      required: uniqueTexts([english]),
      forbidden: chinese && chinese !== english ? [chinese] : [],
    };
  }

  if (labelConfig.nameDisplay === "zh") {
    return {
      any: uniqueTexts([chinese, chemical.cas_number]),
      required: uniqueTexts([chinese]),
      forbidden: english && english !== chinese ? [english] : [],
    };
  }

  if (expected.labelKind === "complete-primary") {
    return {
      any: uniqueTexts([...allNames, chemical.cas_number]),
      required: allNames,
      forbidden: [],
    };
  }

  return {
    any: uniqueTexts([...allNames, chemical.cas_number]),
    required: [],
    forbidden: [],
  };
};

const hasEveryText = (html = "", candidates = []) =>
  candidates.every((candidate) => html.includes(candidate));

const hasNoText = (html = "", candidates = []) =>
  candidates.every((candidate) => !html.includes(candidate));

const hasFullPagePictogramSize = (html = "") => {
  if (!html.includes("label-full-page-primary")) return false;
  const sizeMatches = [...html.matchAll(/width:\s*([0-9.]+)mm/g)].map((match) =>
    Number.parseFloat(match[1]),
  );
  return sizeMatches.some((size) => size >= 28 && size <= 30);
};

const resolveIdentityDensityClass = (fragmentHtml = "") => {
  if (fragmentHtml.includes("identity-density-high")) {
    return "identity-density-high";
  }
  if (fragmentHtml.includes("identity-density-medium")) {
    return "identity-density-medium";
  }
  return "";
};

const resolveLabelKind = (fragmentHtml = "") => {
  const found = Object.entries(LABEL_KIND_CLASSES).find(([, className]) =>
    fragmentHtml.includes(className),
  );
  return found?.[0] || "unknown";
};

const CSS_MM_TO_PX = 96 / 25.4;
const VISUAL_SIZE_TOLERANCE = 0.86;

const cssLengthToPx = (value, fallbackPx = 0) => {
  if (typeof value === "number") return value;
  const source = String(value || "").trim();
  if (!source) return fallbackPx;
  const numeric = Number.parseFloat(source);
  if (!Number.isFinite(numeric)) return fallbackPx;
  if (source.endsWith("mm")) return numeric * CSS_MM_TO_PX;
  return numeric;
};

const cssLengthToMm = (value, fallbackMm = 0) => {
  if (typeof value === "number") return value;
  const source = String(value || "").trim();
  if (!source) return fallbackMm;
  const numeric = Number.parseFloat(source);
  if (!Number.isFinite(numeric)) return fallbackMm;
  if (source.endsWith("px")) return numeric / CSS_MM_TO_PX;
  return numeric;
};

const floorVisualPx = (value) =>
  Math.max(0, Math.floor(Number(value || 0) * VISUAL_SIZE_TOLERANCE));

const resolvePrintPictogramMetric = (layout = {}, labelKind = "") => {
  const typography = layout.typography || {};
  if (labelKind === "complete-primary") {
    return typography.compliancePictogramSize || typography.imgSize;
  }
  if (labelKind === "quick-id") {
    return typography.iconPictogramSize || typography.imgSize;
  }
  if (labelKind === "qr-supplement") {
    return typography.qrPictogramSize || typography.imgSize;
  }
  return typography.standardPictogramSize || typography.imgSize;
};

const buildStockFitContract = ({ layout = {}, labelKind = "", expected = {} }) => {
  const typography = layout.typography || {};
  const pictogramPx = cssLengthToPx(resolvePrintPictogramMetric(layout, labelKind));
  const qrBoxMm = cssLengthToMm(typography.qrBox);
  const qrInsetMm = layout.formFactor === "strip" ? 2 : 3;
  const qrImagePx = Math.max(0, (qrBoxMm - qrInsetMm) * CSS_MM_TO_PX);
  const defaultPreviewMin =
    labelKind === "quick-id"
      ? 26
      : labelKind === "qr-supplement"
        ? 18
        : labelKind === "complete-primary"
          ? 15
          : 20;

  return {
    stockPreset: layout.stockId || layout.stockPreset,
    stockFamily: layout.formFactor || "",
    labelKind,
    labelWidthMm: layout.widthMm,
    labelHeightMm: layout.heightMm,
    template: layout.template,
    expectedPrintMinPictogramSidePx: floorVisualPx(pictogramPx),
    expectedPrintMinQrSidePx:
      labelKind === "qr-supplement" || labelKind === "complete-primary"
        ? floorVisualPx(qrImagePx)
        : 0,
    expectedPreviewMinPictogramSidePx:
      expected.minProductionPictogramSidePx || defaultPreviewMin,
    expectedPreviewMinQrSidePx:
      labelKind === "qr-supplement"
        ? 30
        : labelKind === "complete-primary"
          ? defaultPreviewMin
          : 0,
    requiresSupportChip: Boolean(expected.requiredIdentityText),
  };
};

const buildPreview = ({
  chemical,
  labelConfig,
  customLabelFields = {},
  labProfile,
  previewZoom = "fit",
  locale,
}) =>
  buildPrintPreviewDocument(
    [chemical],
    labelConfig,
    {},
    customLabelFields,
    { [chemical.cas_number]: 1 },
    labProfile,
    { mode: "label", previewZoom, locale },
  );

const buildDocument = ({
  chemical,
  labelConfig,
  customLabelFields = {},
  labProfile,
  locale,
}) =>
  buildPrintDocument(
    [chemical],
    labelConfig,
    {},
    customLabelFields,
    { [chemical.cas_number]: 1 },
    labProfile,
    { locale },
  );

export function resolvePrintQaCaseChemical(
  testCase = {},
  chemicals = PRINT_QA_CHEMICALS,
) {
  return (
    chemicals[testCase.chemicalId] ||
    chemicals.hydrochloricAcid ||
    PRINT_QA_HYDROCHLORIC_ACID
  );
}

export function buildPrintQaCaseResult({
  testCase,
  chemical,
  chemicals = PRINT_QA_CHEMICALS,
  labProfile = PRINT_QA_PROFILE,
} = {}) {
  const selectedChemical =
    chemical || resolvePrintQaCaseChemical(testCase, chemicals);
  const caseLabProfile = testCase.labProfile ?? labProfile;
  const expectedPictograms =
    testCase.expected?.pictogramCodes ||
    getChemicalPictogramCodes(selectedChemical);
  const layout = resolvePrintLayoutConfig(testCase.labelConfig);
  const plan = buildPrintOutputPlan({
    selectedForLabel: [selectedChemical],
    layout,
    customLabelFields: testCase.customLabelFields,
    resolvedLabProfile: caseLabProfile,
    locale: testCase.locale,
  });
  const fitPreview = buildPreview({
    chemical: selectedChemical,
    labelConfig: testCase.labelConfig,
    customLabelFields: testCase.customLabelFields,
    labProfile: caseLabProfile,
    previewZoom: "fit",
    locale: testCase.locale,
  });
  const inspectPreview = buildPreview({
    chemical: selectedChemical,
    labelConfig: testCase.labelConfig,
    customLabelFields: testCase.customLabelFields,
    labProfile: caseLabProfile,
    previewZoom: "inspect",
    locale: testCase.locale,
  });
  const printDocument = buildDocument({
    chemical: selectedChemical,
    labelConfig: testCase.labelConfig,
    customLabelFields: testCase.customLabelFields,
    labProfile: caseLabProfile,
    locale: testCase.locale,
  });
  const fragmentHtml = fitPreview?.fragmentHtml || "";
  const printHtml = printDocument?.pagesHtml || "";
  const printPictogramCodes = extractPictogramCodes(printHtml);
  const pictogramCodes =
    extractModelPictogramCodes(fitPreview?.model).length > 0
      ? extractModelPictogramCodes(fitPreview?.model)
      : extractPictogramCodes(fragmentHtml);
  const expected = {
    ...(testCase.expected || {}),
  };
  if (expected.labelKind === "complete-primary") {
    expected.hasQr = true;
  }
  if (["quick-id", "qr-supplement"].includes(expected.labelKind)) {
    expected.requiredIdentityText = "";
    expected.preparedIdentityTexts = [];
  }
  const contentPolicy =
    plan.readiness?.contentPolicy || fitPreview?.model?.contentPolicy || {};
  const expectedHasSignalWord =
    !["quick-id", "qr-supplement"].includes(expected.labelKind) &&
    Boolean(selectedChemical.signal_word || selectedChemical.signal_word_zh);
  const identityTextExpectation = resolveIdentityTextExpectation(
    selectedChemical,
    testCase.labelConfig,
    expected,
  );
  const printLayout = printDocument?.model?.layout || {};
  const stockFit = buildStockFitContract({
    layout: printLayout,
    labelKind: expected.labelKind || resolveLabelKind(fragmentHtml),
    expected,
  });
  const actual = {
    canPrint: plan.canPrint,
    planState: plan.state,
    outputKind: plan.outputKind,
    contentPolicy: {
      role: contentPolicy.role,
      hazardTextMode: contentPolicy.hazardTextMode,
      precautionTextMode: contentPolicy.precautionTextMode,
      detailSource: contentPolicy.detailSource,
      languageMode: contentPolicy.language?.mode,
      effectiveNameDisplay: contentPolicy.language?.effectiveNameDisplay,
      rendersBilingualStatements:
        contentPolicy.language?.rendersBilingualStatements,
    },
    labelKind: resolveLabelKind(fragmentHtml),
    stockPreset: fitPreview?.model?.layout?.stockPreset,
    template: fitPreview?.model?.layout?.template,
    autoFitLevel: fitPreview?.model?.layout?.autoFitLevel || 0,
    previewZoom: fitPreview?.previewMetrics?.previewZoom,
    inspectPreviewZoom: inspectPreview?.previewMetrics?.previewZoom,
    inspectStartsAtLeft: Boolean(
      inspectPreview?.html?.includes(
        "body.preview-zoom-inspect .preview-shell",
      ),
    ),
    labelPreviewScale: fitPreview?.previewMetrics?.labelPreviewScale,
    pictogramCodes,
    printPictogramCodes,
    previewPrintPictogramParity: sameMembers(
      pictogramCodes,
      printPictogramCodes,
    ),
    hasExactPictogramSet: sameMembers(pictogramCodes, expectedPictograms),
    printHasExactPictogramSet: sameMembers(
      printPictogramCodes,
      expectedPictograms,
    ),
    hasEveryPictogram: includesEvery(pictogramCodes, expectedPictograms),
    printHasEveryPictogram: includesEvery(
      printPictogramCodes,
      expectedPictograms,
    ),
    hasQr: hasActualQrImage(fragmentHtml),
    printHasQr: hasActualQrImage(printHtml),
    hasCas: selectedChemical.cas_number
      ? fragmentHtml.includes(selectedChemical.cas_number)
      : true,
    printHasCas: selectedChemical.cas_number
      ? printHtml.includes(selectedChemical.cas_number)
      : true,
    hasSummaries: hasSummaries(fragmentHtml),
    printHasSummaries: hasSummaries(printHtml),
    hasSignalWord: hasSignalWordElement(fragmentHtml),
    printHasSignalWord: hasSignalWordElement(printHtml),
    hasIconPictogramClass: fragmentHtml.includes("pictograms-icon"),
    printHasRequiredPictogramImages:
      expectedPictograms.length === 0 ||
      printHtml.includes('data-required-print-image="ghs-pictogram"'),
    hasSupportChip:
      fragmentHtml.includes('class="support-chips"') ||
      fragmentHtml.includes("support-chip-batch") ||
      fragmentHtml.includes("meta-chip-batch"),
    printHasSupportChip:
      printHtml.includes('class="support-chips"') ||
      printHtml.includes("support-chip-batch") ||
      printHtml.includes("meta-chip-batch"),
    hasRequiredIdentityText: expected.requiredIdentityText
      ? fragmentHtml.includes(expected.requiredIdentityText)
      : true,
    printHasRequiredIdentityText: expected.requiredIdentityText
      ? printHtml.includes(expected.requiredIdentityText)
      : true,
    hasPreparedIdentityTexts: hasEveryText(
      fragmentHtml,
      expected.preparedIdentityTexts || [],
    ),
    printHasPreparedIdentityTexts: hasEveryText(
      printHtml,
      expected.preparedIdentityTexts || [],
    ),
    hasAnyIdentityText: hasAnyText(fragmentHtml, identityTextExpectation.any),
    printHasAnyIdentityText: hasAnyText(printHtml, identityTextExpectation.any),
    hasRequiredIdentityTexts: hasEveryText(
      fragmentHtml,
      identityTextExpectation.required,
    ),
    printHasRequiredIdentityTexts: hasEveryText(
      printHtml,
      identityTextExpectation.required,
    ),
    hasNoForbiddenIdentityText: hasNoText(
      fragmentHtml,
      identityTextExpectation.forbidden,
    ),
    printHasNoForbiddenIdentityText: hasNoText(
      printHtml,
      identityTextExpectation.forbidden,
    ),
    printLabelKind: resolveLabelKind(printHtml),
    printTemplate: printDocument?.model?.layout?.template,
    printStockPreset: printDocument?.model?.layout?.stockPreset,
    printAutoFitLevel: printDocument?.model?.layout?.autoFitLevel || 0,
    printTotalLabels: printDocument?.model?.expandedLabels?.length || 0,
    identityDensityClass: resolveIdentityDensityClass(fragmentHtml),
    stockFit,
    hasFullPagePictograms:
      fragmentHtml.includes("label-full-page-primary") &&
      hasFullPagePictogramSize(fitPreview?.html || ""),
  };

  const checks = [
    ["canPrint", actual.canPrint === expected.canPrint],
    ["outputKind", actual.outputKind === expected.outputKind],
    ["labelKind", actual.labelKind === expected.labelKind],
    ["stockPreset", actual.stockPreset === expected.stockPreset],
    ["template", actual.template === expected.template],
    ["previewZoom", actual.previewZoom === "fit"],
    ["inspectPreviewZoom", actual.inspectPreviewZoom === "inspect"],
    ["inspectStartsAtLeft", actual.inspectStartsAtLeft],
    [
      "previewScale",
      actual.labelPreviewScale > 0 && actual.labelPreviewScale <= 2.2,
    ],
    ["pictograms", actual.hasEveryPictogram],
    ["printPictograms", actual.printHasEveryPictogram],
    ["exactPictograms", actual.hasExactPictogramSet],
    ["printExactPictograms", actual.printHasExactPictogramSet],
    ["previewPrintPictogramParity", actual.previewPrintPictogramParity],
    ["casVisible", actual.hasCas],
    ["printCasVisible", actual.printHasCas],
    ["identityTextVisible", actual.hasAnyIdentityText],
    ["printIdentityTextVisible", actual.printHasAnyIdentityText],
    ["requiredIdentityTexts", actual.hasRequiredIdentityTexts],
    ["printRequiredIdentityTexts", actual.printHasRequiredIdentityTexts],
    ["noForbiddenIdentityText", actual.hasNoForbiddenIdentityText],
    ["printNoForbiddenIdentityText", actual.printHasNoForbiddenIdentityText],
    ["printRequiredImages", actual.printHasRequiredPictogramImages],
    ["qrState", actual.hasQr === expected.hasQr],
    ["printQrState", actual.printHasQr === expected.hasQr],
    ["printLabelKind", actual.printLabelKind === expected.labelKind],
    ["printTemplate", actual.printTemplate === expected.template],
    ["printStockPreset", actual.printStockPreset === expected.stockPreset],
    ["printAutoFitLevel", actual.printAutoFitLevel === actual.autoFitLevel],
  ];

  if (Number.isFinite(expected.minPrintTotalLabels)) {
    checks.push([
      "printTotalLabels",
      actual.printTotalLabels >= expected.minPrintTotalLabels,
    ]);
  } else if (Number.isFinite(expected.printTotalLabels)) {
    checks.push([
      "printTotalLabels",
      actual.printTotalLabels === expected.printTotalLabels,
    ]);
  } else {
    const allowsSameStockContinuation = ["quick-id", "qr-supplement"].includes(
      expected.labelKind,
    );
    checks.push([
      "printTotalLabels",
      allowsSameStockContinuation
        ? actual.printTotalLabels >= 1
        : actual.printTotalLabels === 1,
    ]);
  }

  if (Number.isFinite(expected.maxPrintTotalLabels)) {
    checks.push([
      "maxPrintTotalLabels",
      actual.printTotalLabels <= expected.maxPrintTotalLabels,
    ]);
  }

  if (expected.planState) {
    checks.push(["planState", actual.planState === expected.planState]);
  }

  if (expectedHasSignalWord) {
    checks.push(["signalWordVisible", actual.hasSignalWord]);
    checks.push(["printSignalWordVisible", actual.printHasSignalWord]);
  }

  if (Number.isFinite(expected.minPreviewScale)) {
    checks.push([
      "minimumPreviewScale",
      actual.labelPreviewScale >= expected.minPreviewScale,
    ]);
  }

  if (typeof expected.hasSummaries === "boolean") {
    checks.push(["summaryState", actual.hasSummaries === expected.hasSummaries]);
    checks.push([
      "printSummaryState",
      actual.printHasSummaries === expected.hasSummaries,
    ]);
  }

  if (typeof expected.hasFullPagePictograms === "boolean") {
    checks.push([
      "fullPagePictogramSize",
      actual.hasFullPagePictograms === expected.hasFullPagePictograms,
    ]);
  }

  if (expected.contentPolicy) {
    Object.entries(expected.contentPolicy).forEach(([key, value]) => {
      checks.push([
        `contentPolicy.${key}`,
        actual.contentPolicy?.[key] === value,
      ]);
    });
  }

  if (expected.identityDensityClass) {
    checks.push([
      "identityDensityClass",
      actual.identityDensityClass === expected.identityDensityClass,
    ]);
  }

  if (expected.requiredIdentityText) {
    checks.push(["requiredIdentityText", actual.hasRequiredIdentityText]);
    checks.push([
      "printRequiredIdentityText",
      actual.printHasRequiredIdentityText,
    ]);
    checks.push(["supportChip", actual.hasSupportChip]);
    checks.push(["printSupportChip", actual.printHasSupportChip]);
  }

  if ((expected.preparedIdentityTexts || []).length > 0) {
    checks.push(["preparedIdentityTexts", actual.hasPreparedIdentityTexts]);
    checks.push([
      "printPreparedIdentityTexts",
      actual.printHasPreparedIdentityTexts,
    ]);
  }

  const failures = checks
    .filter(([, passed]) => !passed)
    .map(([name]) => name);

  return {
    id: testCase.id,
    label: testCase.label,
    chemical: {
      id: testCase.chemicalId || "hydrochloricAcid",
      cas: selectedChemical.cas_number,
      name: selectedChemical.name_en || selectedChemical.name_zh,
      expectedPictograms,
      expectedIdentityTexts: identityTextExpectation.any,
      expectedRequiredIdentityTexts: identityTextExpectation.required,
      expectedForbiddenIdentityTexts: identityTextExpectation.forbidden,
      hasSignalWord: Boolean(
        selectedChemical.signal_word || selectedChemical.signal_word_zh,
      ),
    },
    locale: testCase.locale,
    expected,
    actual,
    handoffExpectation: {
      status: expected.canPrint === false ? "blocked" : "qa_handoff",
      labelKind: actual.labelKind,
      pictogramCodes: actual.pictogramCodes,
      hasQr: actual.hasQr,
      template: actual.template,
      stockPreset: actual.stockPreset,
      casNumbers: selectedChemical.cas_number ? [selectedChemical.cas_number] : [],
      labelWidthMm: printDocument?.model?.layout?.widthMm,
      labelHeightMm: printDocument?.model?.layout?.heightMm,
      pageSize: printDocument?.model?.layout?.pageSize,
      colorMode: printDocument?.model?.layout?.colorMode,
      nameDisplay: printDocument?.model?.layout?.nameDisplay,
      autoFitLevel: printDocument?.model?.layout?.autoFitLevel || 0,
      requiredIdentityText: expected.requiredIdentityText || "",
      recoveryKind: expected.recoveryKind || "",
      expectedPrintMinPictogramSidePx:
        stockFit.expectedPrintMinPictogramSidePx,
      expectedPrintMinQrSidePx: stockFit.expectedPrintMinQrSidePx,
      stockFit,
      totalLabels: printDocument?.model?.expandedLabels?.length || 0,
      totalPages: printDocument?.model?.totalPages || 0,
    },
    passed: failures.length === 0,
    failures,
  };
}

const PRODUCTION_FRONTEND_URL = "https://ghs-frontend.zeabur.app/";

const resolveProductionTargetValue = (testCase = {}) => {
  const config = testCase.labelConfig || {};
  if (config.labelPurpose === "quickId") return "quickId";
  if (config.labelPurpose === "qrSupplement") return "qrSupplement";
  return "complete";
};

const buildProductionBrowserQaCase = (testCase, caseResult) => {
  const activeCustomLabelFields = caseResult.handoffExpectation.requiredIdentityText
    ? testCase.customLabelFields || {}
    : {};
  const expectedMinTotalLabels =
    caseResult.expected.minPrintTotalLabels ||
    caseResult.handoffExpectation.totalLabels ||
    caseResult.expected.printTotalLabels ||
    1;
  const expectedMinTotalPages =
    caseResult.expected.minPrintTotalPages ||
    caseResult.expected.minPrintTotalLabels ||
    caseResult.handoffExpectation.totalPages ||
    1;

  return {
  id: testCase.id,
  label: testCase.label,
  searchTerm: caseResult.chemical.cas,
  targetUrl: PRODUCTION_FRONTEND_URL,
  qaHandoffUrl: `${PRODUCTION_FRONTEND_URL}?qaPrintHandoff=1`,
  targetOption: resolveProductionTargetValue(testCase),
  stockPreset: caseResult.handoffExpectation.stockPreset,
  expectedCanPrint: caseResult.expected.canPrint !== false,
  expectedPrintButtonEnabled: caseResult.expected.canPrint !== false,
  expectedStatus: caseResult.handoffExpectation.status,
  expectedPlanState: caseResult.actual.planState,
  expectedRecoveryKind: caseResult.handoffExpectation.recoveryKind || "",
  expectedBlockedTextPatterns:
    caseResult.expected.canPrint === false
      ? caseResult.expected.blockedTextPatterns || [
          "continuation",
          "too dense",
          "larger",
          "complete primary",
          "A4",
          "續頁",
          "過密",
          "更大",
          "完整主標",
        ]
      : [],
  expectedLabelKind: caseResult.handoffExpectation.labelKind,
  expectedStockPreset: caseResult.handoffExpectation.stockPreset,
  expectedTemplate: caseResult.handoffExpectation.template,
  expectedPictograms: caseResult.handoffExpectation.pictogramCodes,
  expectedHasQr: caseResult.handoffExpectation.hasQr,
  expectedHasSignalWord: !["quick-id", "qr-supplement"].includes(
    caseResult.handoffExpectation.labelKind,
  ) && Boolean(caseResult.chemical.hasSignalWord),
  expectedIdentityTexts:
    caseResult.expected.productionExpectedIdentityTexts ||
    caseResult.chemical.expectedIdentityTexts ||
    [],
  expectedRequiredIdentityTexts:
    caseResult.expected.productionExpectedRequiredIdentityTexts ||
    caseResult.chemical.expectedRequiredIdentityTexts ||
    [],
  expectedForbiddenIdentityTexts:
    caseResult.expected.productionExpectedForbiddenIdentityTexts ||
    caseResult.chemical.expectedForbiddenIdentityTexts ||
    [],
  expectedMinPictogramSidePx:
    caseResult.expected.minProductionPictogramSidePx ??
    caseResult.handoffExpectation.stockFit?.expectedPreviewMinPictogramSidePx ??
    20,
  expectedMinQrSidePx:
    caseResult.handoffExpectation.stockFit?.expectedPreviewMinQrSidePx ??
    (caseResult.handoffExpectation.hasQr ? 30 : 0),
  expectedPrintMinPictogramSidePx:
    caseResult.handoffExpectation.expectedPrintMinPictogramSidePx || 0,
  expectedPrintMinQrSidePx:
    caseResult.handoffExpectation.expectedPrintMinQrSidePx || 0,
  stockFit: caseResult.handoffExpectation.stockFit || null,
  expectedCasNumbers: caseResult.handoffExpectation.casNumbers,
  expectedLabelWidthMm: caseResult.handoffExpectation.labelWidthMm,
  expectedLabelHeightMm: caseResult.handoffExpectation.labelHeightMm,
  expectedPageSize: caseResult.handoffExpectation.pageSize,
  expectedColorMode: caseResult.handoffExpectation.colorMode,
  expectedNameDisplay: caseResult.handoffExpectation.nameDisplay,
  expectedRequiredIdentityText:
    caseResult.handoffExpectation.requiredIdentityText || "",
  expectedMinTotalLabels,
  expectedMinTotalPages,
  customLabelFields: activeCustomLabelFields,
  responsibleProfile:
    testCase.productionResponsibleProfile ?? testCase.labProfile ?? null,
  mustContainCas: Boolean(caseResult.chemical.cas),
  selectors: {
    searchInputPlaceholder: "例如: 64-17-5 或 Ethanol 或 乙醇",
    firstResultCheckbox: 'input[type="checkbox"]',
    printAllButtonTestId: "print-all-with-ghs-btn",
    targetButtonName: resolveProductionTargetValue(testCase),
    stockPickerTestId: "stock-size-picker",
    stockButtonTestId: `primary-output-size-${caseResult.handoffExpectation.stockPreset}`,
    advancedOptionsTestId: "advanced-print-options",
    customFieldPrefixTestId: "custom-label-field-",
    printButtonTestId: "print-label-action",
    qaStatusElementId: "ghs-print-qa-status",
  },
  steps: [
    { action: "open", url: `${PRODUCTION_FRONTEND_URL}?qaPrintHandoff=1` },
    { action: "search", value: caseResult.chemical.cas },
    { action: "selectFirstResult" },
    { action: "openPrintModal" },
    { action: "selectTarget", value: resolveProductionTargetValue(testCase) },
    {
      action: "selectStock",
      value: caseResult.handoffExpectation.stockPreset,
    },
    ...(Object.entries(activeCustomLabelFields).map(([key, value]) => ({
      action: "setCustomField",
      key,
      value,
      testId: `custom-label-field-${key}`,
    }))),
    { action: "clickPrint" },
    { action: "assertQaStatus", elementId: "ghs-print-qa-status" },
  ],
  };
};

export function buildPrintQaMatrixReport({
  chemical,
  chemicals = PRINT_QA_CHEMICALS,
  labProfile = PRINT_QA_PROFILE,
  matrix = PRINT_QA_MATRIX,
  generatedAt = new Date().toISOString(),
} = {}) {
  const cases = matrix.map((testCase) =>
    buildPrintQaCaseResult({ testCase, chemical, chemicals, labProfile }),
  );
  const testCaseById = new Map(matrix.map((testCase) => [testCase.id, testCase]));
  const failedCases = cases.filter((testCase) => !testCase.passed);
  const reportChemicals = [
    ...new Map(
      cases.map((testCase) => [
        testCase.chemical.id,
        {
          id: testCase.chemical.id,
          cas: testCase.chemical.cas,
          name: testCase.chemical.name,
          expectedPictograms: testCase.chemical.expectedPictograms,
          coverage: PRINT_QA_CHEMICAL_COVERAGE[testCase.chemical.id] || null,
        },
      ]),
    ).values(),
  ];

  return {
    schemaVersion: 1,
    generatedAt,
    chemical: {
      cas:
        chemical?.cas_number ||
        PRINT_QA_CHEMICALS.hydrochloricAcid.cas_number,
      name:
        chemical?.name_en ||
        chemical?.name ||
        chemical?.name_zh ||
        PRINT_QA_CHEMICALS.hydrochloricAcid.name_en,
      expectedPictograms:
        chemical && getChemicalPictogramCodes(chemical).length > 0
          ? getChemicalPictogramCodes(chemical)
          : PRINT_QA_PICTOGRAMS,
    },
    chemicals: reportChemicals,
    summary: {
      total: cases.length,
      passed: cases.length - failedCases.length,
      failed: failedCases.length,
    },
    productionBrowserQa: {
      targetUrl: PRODUCTION_FRONTEND_URL,
      qaHandoffUrl: `${PRODUCTION_FRONTEND_URL}?qaPrintHandoff=1`,
      requiredStatusElement: "ghs-print-qa-status",
      responsibleProfile: labProfile,
      requiredAttributes: [
        "data-status",
        "data-label-kind",
        "data-pictograms",
        "data-has-qr",
        "data-cas-numbers",
        "data-has-cas",
        "data-label-width-mm",
        "data-label-height-mm",
        "data-page-size",
        "data-color-mode",
        "data-name-display",
        "data-template",
        "data-stock-preset",
        "data-total-labels",
        "data-total-pages",
        "data-issue-types",
        "data-support-chips",
      ],
      cases: cases
        .filter((caseResult) => {
          const sourceCase = testCaseById.get(caseResult.id) || {};
          return sourceCase.productionHandoff !== false;
        })
        .map((caseResult) =>
          buildProductionBrowserQaCase(
            testCaseById.get(caseResult.id) || {},
            caseResult,
          ),
        ),
    },
    cases,
  };
}
