import { resolvePrintLayoutConfig } from "@/constants/labelStocks";
import {
  PRINT_OUTPUT_KIND,
  PRINT_OUTPUT_PLAN_STATE,
  buildPrintOutputPlan,
} from "@/utils/printOutputPlanner";
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
  organization: "Demo Safety Lab",
  phone: "02-1234-5678",
  address: "1 Lab Road, Taipei",
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
  signal_word_zh: "Danger ZH",
  hazard_statements: [
    {
      code: "H280",
      text_en:
        "H280 (24.3%): Contains gas under pressure; may explode if heated [Warning Gases under pressure]",
      text_zh: "內含高壓氣體；遇熱可能爆炸",
    },
    {
      code: "H290",
      text_en: "H290 (22.8%): May be corrosive to metals [Warning Corrosive to Metals]",
      text_zh: "可能腐蝕金屬",
    },
    {
      code: "H314",
      text_en:
        "H314 (99.9%): Causes severe skin burns and eye damage [Danger Skin corrosion/irritation]",
      text_zh: "造成嚴重皮膚灼傷和眼睛損傷",
    },
    {
      code: "H318",
      text_en: "H318 (20%): Causes serious eye damage [Danger Serious eye damage/eye irritation]",
      text_zh: "造成嚴重眼睛損傷",
    },
    {
      code: "H331",
      text_en: "H331 (49.4%): Toxic if inhaled [Danger Acute toxicity, inhalation]",
      text_zh: "吸入有毒",
    },
    {
      code: "H335",
      text_en:
        "H335 (59%): May cause respiratory irritation [Warning Specific target organ toxicity, single exposure; Respiratory tract irritation]",
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
      text_en: "P302+P361+P354",
      text_zh: "P302+P361+P354",
    },
    {
      code: "P304+P340",
      text_en: "IF INHALED: Remove person to fresh air and keep comfortable for breathing.",
      text_zh: "若吸入：將患者移至空氣新鮮處，保持呼吸舒適的姿勢休息。",
    },
    {
      code: "P305+P354+P338",
      text_en: "P305+P354+P338",
      text_zh: "P305+P354+P338",
    },
    {
      code: "P316",
      text_en: "P316",
      text_zh: "P316",
    },
    {
      code: "P317",
      text_en: "Get emergency medical help.",
      text_zh: "立即尋求緊急醫療協助。",
    },
    {
      code: "P319",
      text_en: "P319",
      text_zh: "P319",
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

export const PRINT_QA_ETHANOL = Object.freeze({
  cas_number: "64-17-5",
  name_en: "Ethanol",
  name_zh: "乙醇",
  cid: 702,
  ghs_pictograms: [{ code: "GHS02" }, { code: "GHS07" }],
  signal_word: "Danger",
  signal_word_zh: "Danger ZH",
  hazard_statements: [
    {
      code: "H225",
      text_en: "Highly flammable liquid and vapour",
      text_zh: "Highly flammable liquid and vapour ZH",
    },
    {
      code: "H319",
      text_en: "Causes serious eye irritation",
      text_zh: "Causes serious eye irritation ZH",
    },
  ],
  precautionary_statements: [
    {
      code: "P210",
      text_en: "Keep away from heat, hot surfaces, sparks, open flames and other ignition sources",
      text_zh: "Keep away from ignition sources ZH",
    },
    {
      code: "P280",
      text_en: "Wear protective gloves and eye protection",
      text_zh: "Wear protective gloves and eye protection ZH",
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
  signal_word_zh: "Danger ZH",
  hazard_statements: [
    {
      code: "H290",
      text_en: "May be corrosive to metals",
      text_zh: "May be corrosive to metals ZH",
    },
    {
      code: "H314",
      text_en: "Causes severe skin burns and eye damage",
      text_zh: "Causes severe skin burns and eye damage ZH",
    },
    {
      code: "H315",
      text_en: "Causes skin irritation",
      text_zh: "Causes skin irritation ZH",
    },
    {
      code: "H319",
      text_en: "Causes serious eye irritation",
      text_zh: "Causes serious eye irritation ZH",
    },
    {
      code: "H335",
      text_en: "May cause respiratory irritation",
      text_zh: "May cause respiratory irritation ZH",
    },
  ],
  precautionary_statements: [
    {
      code: "P260",
      text_en: "Do not breathe dust or mist",
      text_zh: "Do not breathe dust or mist ZH",
    },
    {
      code: "P280",
      text_en: "Wear protective gloves, protective clothing and eye protection",
      text_zh: "Wear protective gloves and eye protection ZH",
    },
    {
      code: "P303+P361+P353",
      text_en: "IF ON SKIN: take off contaminated clothing and rinse skin with water",
      text_zh: "IF ON SKIN ZH",
    },
  ],
});

export const PRINT_QA_METHANOL = Object.freeze({
  cas_number: "67-56-1",
  name_en: "Methanol",
  name_zh: "Methanol ZH",
  cid: 887,
  ghs_pictograms: [{ code: "GHS02" }, { code: "GHS06" }, { code: "GHS08" }],
  signal_word: "Danger",
  signal_word_zh: "Danger ZH",
  hazard_statements: [
    {
      code: "H225",
      text_en: "Highly flammable liquid and vapour",
      text_zh: "Highly flammable liquid and vapour ZH",
    },
    {
      code: "H301",
      text_en: "Toxic if swallowed",
      text_zh: "Toxic if swallowed ZH",
    },
    {
      code: "H311",
      text_en: "Toxic in contact with skin",
      text_zh: "Toxic in contact with skin ZH",
    },
    {
      code: "H331",
      text_en: "Toxic if inhaled",
      text_zh: "Toxic if inhaled ZH",
    },
    {
      code: "H370",
      text_en: "Causes damage to organs",
      text_zh: "Causes damage to organs ZH",
    },
  ],
  precautionary_statements: [
    {
      code: "P210",
      text_en: "Keep away from heat, sparks, open flames and hot surfaces",
      text_zh: "Keep away from ignition sources ZH",
    },
    {
      code: "P260",
      text_en: "Do not breathe vapours",
      text_zh: "Do not breathe vapours ZH",
    },
    {
      code: "P280",
      text_en: "Wear protective gloves and eye protection",
      text_zh: "Wear protective gloves and eye protection ZH",
    },
  ],
});

export const PRINT_QA_FORMALDEHYDE = Object.freeze({
  cas_number: "50-00-0",
  name_en: "Formaldehyde",
  name_zh: "Formaldehyde ZH",
  cid: 712,
  ghs_pictograms: [
    { code: "GHS05" },
    { code: "GHS06" },
    { code: "GHS07" },
    { code: "GHS08" },
  ],
  signal_word: "Danger",
  signal_word_zh: "Danger ZH",
  hazard_statements: [
    {
      code: "H301",
      text_en:
        "Toxic if swallowed. Acute toxicity statement retained for complete shipped-container labelling.",
      text_zh:
        "Toxic if swallowed ZH. Acute toxicity statement retained for complete shipped-container labelling.",
    },
    {
      code: "H311",
      text_en:
        "Toxic in contact with skin. Avoid direct handling during transfer, sampling, and waste collection.",
      text_zh:
        "Toxic in contact with skin ZH. Avoid direct handling during transfer, sampling, and waste collection.",
    },
    {
      code: "H314",
      text_en:
        "Causes severe skin burns and eye damage. Immediate emergency response and eyewash access are required.",
      text_zh:
        "Causes severe skin burns and eye damage ZH. Immediate emergency response and eyewash access are required.",
    },
    {
      code: "H317",
      text_en:
        "May cause an allergic skin reaction after repeated or prolonged laboratory exposure.",
      text_zh:
        "May cause an allergic skin reaction ZH after repeated or prolonged laboratory exposure.",
    },
    {
      code: "H318",
      text_en:
        "Causes serious eye damage. Use splash protection whenever opening the container or preparing dilutions.",
      text_zh:
        "Causes serious eye damage ZH. Use splash protection whenever opening the container or preparing dilutions.",
    },
    {
      code: "H330",
      text_en:
        "Fatal if inhaled. Vapour exposure can occur during dispensing, spill response, and open-vessel work.",
      text_zh:
        "Fatal if inhaled ZH. Vapour exposure can occur during dispensing, spill response, and open-vessel work.",
    },
    {
      code: "H341",
      text_en:
        "Suspected of causing genetic defects. Obtain special instructions before use and keep exposure records.",
      text_zh:
        "Suspected of causing genetic defects ZH. Obtain special instructions before use and keep exposure records.",
    },
    {
      code: "H350",
      text_en:
        "May cause cancer. Use only in controlled areas with documented training and exposure controls.",
      text_zh:
        "May cause cancer ZH. Use only in controlled areas with documented training and exposure controls.",
    },
    {
      code: "H370",
      text_en:
        "Causes damage to organs. Do not use this label without a complete responsible-party profile.",
      text_zh:
        "Causes damage to organs ZH. Do not use this label without a complete responsible-party profile.",
    },
    {
      code: "H372",
      text_en:
        "Causes damage to organs through prolonged or repeated exposure during routine laboratory handling.",
      text_zh:
        "Causes damage to organs through prolonged or repeated exposure ZH during routine laboratory handling.",
    },
  ],
  precautionary_statements: [
    {
      code: "P201",
      text_en:
        "Obtain special instructions before use and verify the current SDS before preparing a working container.",
      text_zh:
        "Obtain special instructions before use ZH and verify the current SDS before preparing a working container.",
    },
    {
      code: "P202",
      text_en:
        "Do not handle until all safety precautions have been read, understood, and communicated to the operator.",
      text_zh:
        "Do not handle until all safety precautions have been read ZH and communicated to the operator.",
    },
    {
      code: "P260",
      text_en:
        "Do not breathe dust, fume, gas, mist, vapours or spray generated during transfer or spill cleanup.",
      text_zh:
        "Do not breathe vapours ZH generated during transfer or spill cleanup.",
    },
    {
      code: "P264",
      text_en:
        "Wash hands and all potentially exposed skin thoroughly after handling and before leaving the work area.",
      text_zh:
        "Wash hands and all potentially exposed skin ZH thoroughly after handling.",
    },
    {
      code: "P270",
      text_en:
        "Do not eat, drink or smoke when using this product or while contaminated gloves are present.",
      text_zh:
        "Do not eat, drink or smoke ZH when using this product.",
    },
    {
      code: "P271",
      text_en:
        "Use only outdoors or in a well-ventilated area with verified local exhaust ventilation.",
      text_zh:
        "Use only outdoors or in a well-ventilated area ZH with verified local exhaust ventilation.",
    },
    {
      code: "P280",
      text_en:
        "Wear protective gloves, protective clothing, eye protection and face protection during dispensing.",
      text_zh:
        "Wear protective gloves and eye protection ZH during dispensing.",
    },
    {
      code: "P301+P310",
      text_en:
        "IF SWALLOWED: Immediately call a POISON CENTER or doctor and keep the product container available.",
      text_zh:
        "IF SWALLOWED ZH: Immediately call a POISON CENTER or doctor.",
    },
    {
      code: "P303+P361+P353",
      text_en:
        "IF ON SKIN or hair: Take off immediately all contaminated clothing. Rinse skin with water.",
      text_zh:
        "IF ON SKIN or hair ZH: Take off immediately all contaminated clothing.",
    },
    {
      code: "P304+P340",
      text_en:
        "IF INHALED: Remove person to fresh air and keep comfortable for breathing while awaiting help.",
      text_zh:
        "IF INHALED ZH: Remove person to fresh air and keep comfortable for breathing.",
    },
    {
      code: "P305+P351+P338",
      text_en:
        "IF IN EYES: Rinse cautiously with water for several minutes and remove contact lenses if easy to do.",
      text_zh:
        "IF IN EYES ZH: Rinse cautiously with water for several minutes.",
    },
    {
      code: "P308+P313",
      text_en:
        "If exposed or concerned: Get medical advice and bring SDS or container label information.",
      text_zh:
        "If exposed or concerned ZH: Get medical advice and bring SDS or container label information.",
    },
    {
      code: "P403+P233",
      text_en:
        "Store in a well-ventilated place. Keep container tightly closed and segregated from incompatibles.",
      text_zh:
        "Store in a well-ventilated place ZH. Keep container tightly closed.",
    },
    {
      code: "P405",
      text_en:
        "Store locked up with access limited to trained personnel and documented inventory controls.",
      text_zh:
        "Store locked up ZH with access limited to trained personnel.",
    },
    {
      code: "P501",
      text_en:
        "Dispose of contents and container in accordance with local, regional, national and international regulations.",
      text_zh:
        "Dispose of contents and container ZH in accordance with local regulations.",
    },
  ],
});

export const PRINT_QA_HYDROGEN_PEROXIDE = Object.freeze({
  cas_number: "7722-84-1",
  name_en: "Hydrogen Peroxide",
  name_zh: "Hydrogen Peroxide ZH",
  cid: 784,
  ghs_pictograms: [{ code: "GHS03" }, { code: "GHS05" }, { code: "GHS07" }],
  signal_word: "Danger",
  signal_word_zh: "Danger ZH",
  hazard_statements: [
    {
      code: "H271",
      text_en: "May cause fire or explosion; strong oxidizer",
      text_zh: "May cause fire or explosion ZH",
    },
    {
      code: "H302",
      text_en: "Harmful if swallowed",
      text_zh: "Harmful if swallowed ZH",
    },
    {
      code: "H314",
      text_en: "Causes severe skin burns and eye damage",
      text_zh: "Causes severe skin burns and eye damage ZH",
    },
  ],
  precautionary_statements: [
    {
      code: "P220",
      text_en: "Keep away from clothing and other combustible materials",
      text_zh: "Keep away from combustible materials ZH",
    },
    {
      code: "P280",
      text_en: "Wear protective gloves and eye protection",
      text_zh: "Wear protective gloves and eye protection ZH",
    },
  ],
});

export const PRINT_QA_LONG_NAME_CORROSIVE = Object.freeze({
  cas_number: "QA-LONG-001",
  name_en:
    "N,N-Dimethyl-2-hydroxyethylammonium chloride concentrated laboratory solution",
  name_zh: "Long Name Corrosive Solution ZH",
  cid: 0,
  ghs_pictograms: [{ code: "GHS05" }, { code: "GHS07" }],
  signal_word: "Warning",
  signal_word_zh: "Warning ZH",
  hazard_statements: [
    {
      code: "H315",
      text_en: "Causes skin irritation",
      text_zh: "Causes skin irritation ZH",
    },
    {
      code: "H319",
      text_en: "Causes serious eye irritation",
      text_zh: "Causes serious eye irritation ZH",
    },
  ],
  precautionary_statements: [
    {
      code: "P264",
      text_en: "Wash hands thoroughly after handling",
      text_zh: "Wash hands after handling ZH",
    },
    {
      code: "P280",
      text_en: "Wear protective gloves and eye protection",
      text_zh: "Wear protective gloves and eye protection ZH",
    },
  ],
});

export const PRINT_QA_PREPARED_HYDROCHLORIC_ACID = Object.freeze(
  buildPreparedSolutionItem(
    { ...PRINT_QA_HYDROCHLORIC_ACID, found: true },
    {
      concentration: "1 M",
      solvent: "Water",
      preparedBy: "QA Analyst",
      preparedDate: "2026-05-12",
      expiryDate: "2026-06-12",
    },
  ),
);

export const PRINT_QA_CHEMICALS = Object.freeze({
  hydrochloricAcid: PRINT_QA_HYDROCHLORIC_ACID,
  ethanol: PRINT_QA_ETHANOL,
  sodiumHydroxide: PRINT_QA_SODIUM_HYDROXIDE,
  methanol: PRINT_QA_METHANOL,
  formaldehyde: PRINT_QA_FORMALDEHYDE,
  hydrogenPeroxide: PRINT_QA_HYDROGEN_PEROXIDE,
  longNameCorrosive: PRINT_QA_LONG_NAME_CORROSIVE,
  preparedHydrochloricAcid: PRINT_QA_PREPARED_HYDROCHLORIC_ACID,
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
    },
  },
  {
    id: "a4-primary-zh-bw",
    label: "A4 complete primary Chinese B/W",
    locale: "zh-TW",
    labelConfig: {
      labelPurpose: "shipping",
      template: "full",
      stockPreset: "a4-primary",
      nameDisplay: "zh",
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
    },
  },
  {
    id: "formaldehyde-a4-primary-continuation",
    label: "Formaldehyde A4 complete primary continuation",
    chemicalId: "formaldehyde",
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
      productionExpectedIdentityTexts: ["Formaldehyde", "甲醛", "50-00-0"],
      productionExpectedRequiredIdentityTexts: ["Formaldehyde", "甲醛"],
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
      preparedIdentityTexts: [
        "1 M",
        "Water",
        "QA Analyst",
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
  const completePrimary = expected.labelKind === "complete-primary";

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

  return {
    any: uniqueTexts([...allNames, chemical.cas_number]),
    required: completePrimary ? allNames : [],
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

const buildPreview = ({
  chemical,
  labelConfig,
  customLabelFields = {},
  labProfile,
  previewZoom = "fit",
}) =>
  buildPrintPreviewDocument(
    [chemical],
    labelConfig,
    {},
    customLabelFields,
    { [chemical.cas_number]: 1 },
    labProfile,
    { mode: "label", previewZoom },
  );

const buildDocument = ({
  chemical,
  labelConfig,
  customLabelFields = {},
  labProfile,
}) =>
  buildPrintDocument(
    [chemical],
    labelConfig,
    {},
    customLabelFields,
    { [chemical.cas_number]: 1 },
    labProfile,
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
  const expectedPictograms =
    testCase.expected?.pictogramCodes ||
    getChemicalPictogramCodes(selectedChemical);
  const layout = resolvePrintLayoutConfig(testCase.labelConfig);
  const plan = buildPrintOutputPlan({
    selectedForLabel: [selectedChemical],
    layout,
    customLabelFields: testCase.customLabelFields,
    resolvedLabProfile: labProfile,
    locale: testCase.locale,
  });
  const fitPreview = buildPreview({
    chemical: selectedChemical,
    labelConfig: testCase.labelConfig,
    customLabelFields: testCase.customLabelFields,
    labProfile,
    previewZoom: "fit",
  });
  const inspectPreview = buildPreview({
    chemical: selectedChemical,
    labelConfig: testCase.labelConfig,
    customLabelFields: testCase.customLabelFields,
    labProfile,
    previewZoom: "inspect",
  });
  const printDocument = buildDocument({
    chemical: selectedChemical,
    labelConfig: testCase.labelConfig,
    customLabelFields: testCase.customLabelFields,
    labProfile,
  });
  const fragmentHtml = fitPreview?.fragmentHtml || "";
  const printHtml = printDocument?.pagesHtml || "";
  const printPictogramCodes = extractPictogramCodes(printHtml);
  const pictogramCodes = extractPictogramCodes(fragmentHtml);
  const expected = testCase.expected || {};
  const expectedHasSignalWord = Boolean(
    selectedChemical.signal_word || selectedChemical.signal_word_zh,
  );
  const identityTextExpectation = resolveIdentityTextExpectation(
    selectedChemical,
    testCase.labelConfig,
    expected,
  );
  const actual = {
    canPrint: plan.canPrint,
    planState: plan.state,
    outputKind: plan.outputKind,
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
    checks.push(["printTotalLabels", actual.printTotalLabels === 1]);
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
  if (config.labelPurpose === "quickId") return "vial";
  if (config.labelPurpose === "qrSupplement") return "qrSupplement";
  if (
    config.stockPreset === "medium-bottle" ||
    config.stockPreset === "avery-5163" ||
    config.stockPreset === "avery-5164" ||
    config.stockPreset === "medium-rack"
  ) {
    return "bottle";
  }
  return "mainContainer";
};

const buildProductionBrowserQaCase = (testCase, caseResult) => ({
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
  expectedBlockedTextPatterns:
    caseResult.expected.canPrint === false
      ? ["continuation", "too dense", "larger", "complete primary", "A4", "續頁", "過密", "更大", "完整主標"]
      : [],
  expectedLabelKind: caseResult.handoffExpectation.labelKind,
  expectedStockPreset: caseResult.handoffExpectation.stockPreset,
  expectedTemplate: caseResult.handoffExpectation.template,
  expectedPictograms: caseResult.handoffExpectation.pictogramCodes,
  expectedHasQr: caseResult.handoffExpectation.hasQr,
  expectedHasSignalWord: Boolean(caseResult.chemical.hasSignalWord),
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
    (caseResult.handoffExpectation.labelKind === "complete-primary"
      ? 18
      : caseResult.handoffExpectation.labelKind === "qr-supplement"
        ? 18
        : caseResult.handoffExpectation.labelKind === "quick-id"
          ? 26
          : 24),
  expectedMinQrSidePx: caseResult.handoffExpectation.hasQr ? 30 : 0,
  expectedCasNumbers: caseResult.handoffExpectation.casNumbers,
  expectedLabelWidthMm: caseResult.handoffExpectation.labelWidthMm,
  expectedLabelHeightMm: caseResult.handoffExpectation.labelHeightMm,
  expectedPageSize: caseResult.handoffExpectation.pageSize,
  expectedColorMode: caseResult.handoffExpectation.colorMode,
  expectedNameDisplay: caseResult.handoffExpectation.nameDisplay,
  expectedRequiredIdentityText:
    caseResult.handoffExpectation.requiredIdentityText || "",
  expectedMinTotalLabels:
    caseResult.expected.minPrintTotalLabels ||
    caseResult.expected.printTotalLabels ||
    1,
  expectedMinTotalPages:
    caseResult.expected.minPrintTotalPages ||
    caseResult.expected.minPrintTotalLabels ||
    caseResult.expected.printTotalLabels ||
    1,
  customLabelFields: testCase.customLabelFields || {},
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
    ...(Object.entries(testCase.customLabelFields || {}).map(([key, value]) => ({
      action: "setCustomField",
      key,
      value,
      testId: `custom-label-field-${key}`,
    }))),
    { action: "clickPrint" },
    { action: "assertQaStatus", elementId: "ghs-print-qa-status" },
  ],
});

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
