import { resolvePrintLayoutConfig } from "@/constants/labelStocks";
import {
  PRINT_OUTPUT_KIND,
  buildPrintOutputPlan,
} from "@/utils/printOutputPlanner";
import { buildPrintPreviewDocument } from "@/utils/printLabels";

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

export const PRINT_QA_HYDROCHLORIC_ACID = Object.freeze({
  cas_number: "7647-01-0",
  name_en: "Hydrochloric Acid",
  name_zh: "Hydrochloric Acid ZH",
  cid: 313,
  ghs_pictograms: PRINT_QA_PICTOGRAMS.map((code) => ({ code })),
  signal_word: "Danger",
  signal_word_zh: "Danger ZH",
  hazard_statements: [
    {
      code: "H280",
      text_en: "Contains gas under pressure; may explode if heated",
      text_zh: "Contains gas under pressure ZH",
    },
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
      code: "H318",
      text_en: "Causes serious eye damage",
      text_zh: "Causes serious eye damage ZH",
    },
    {
      code: "H331",
      text_en: "Toxic if inhaled",
      text_zh: "Toxic if inhaled ZH",
    },
    {
      code: "H335",
      text_en: "May cause respiratory irritation",
      text_zh: "May cause respiratory irritation ZH",
    },
  ],
  precautionary_statements: [
    {
      code: "P234",
      text_en: "Keep only in original packaging",
      text_zh: "Keep only in original packaging ZH",
    },
    {
      code: "P260",
      text_en: "Do not breathe dust, fume, gas, mist, vapours or spray",
      text_zh: "Do not breathe dust, fume, gas, mist, vapours or spray ZH",
    },
    {
      code: "P280",
      text_en: "Wear protective gloves, eye protection and face protection",
      text_zh: "Wear protective gloves, eye protection and face protection ZH",
    },
    {
      code: "P301+P330+P331",
      text_en: "IF SWALLOWED: rinse mouth. Do NOT induce vomiting.",
      text_zh: "IF SWALLOWED ZH",
    },
    {
      code: "P304+P340",
      text_en: "IF INHALED: remove person to fresh air",
      text_zh: "IF INHALED ZH",
    },
    {
      code: "P305+P351+P338",
      text_en: "IF IN EYES: rinse cautiously with water",
      text_zh: "IF IN EYES ZH",
    },
    {
      code: "P403+P233",
      text_en: "Store in a well-ventilated place. Keep container tightly closed.",
      text_zh: "Store in a well-ventilated place ZH",
    },
    {
      code: "P501",
      text_en: "Dispose of contents and container in accordance with local regulations",
      text_zh: "Dispose of contents ZH",
    },
  ],
});

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

const resolveLabelKind = (fragmentHtml = "") => {
  const found = Object.entries(LABEL_KIND_CLASSES).find(([, className]) =>
    fragmentHtml.includes(className),
  );
  return found?.[0] || "unknown";
};

const buildPreview = ({
  chemical,
  labelConfig,
  labProfile,
  previewZoom = "fit",
}) =>
  buildPrintPreviewDocument(
    [chemical],
    labelConfig,
    {},
    {},
    { [chemical.cas_number]: 1 },
    labProfile,
    { mode: "label", previewZoom },
  );

export function buildPrintQaCaseResult({
  testCase,
  chemical = PRINT_QA_HYDROCHLORIC_ACID,
  labProfile = PRINT_QA_PROFILE,
  expectedPictograms = PRINT_QA_PICTOGRAMS,
} = {}) {
  const layout = resolvePrintLayoutConfig(testCase.labelConfig);
  const plan = buildPrintOutputPlan({
    selectedForLabel: [chemical],
    layout,
    resolvedLabProfile: labProfile,
    locale: testCase.locale,
  });
  const fitPreview = buildPreview({
    chemical,
    labelConfig: testCase.labelConfig,
    labProfile,
    previewZoom: "fit",
  });
  const inspectPreview = buildPreview({
    chemical,
    labelConfig: testCase.labelConfig,
    labProfile,
    previewZoom: "inspect",
  });
  const fragmentHtml = fitPreview?.fragmentHtml || "";
  const pictogramCodes = extractPictogramCodes(fragmentHtml);
  const actual = {
    canPrint: plan.canPrint,
    outputKind: plan.outputKind,
    labelKind: resolveLabelKind(fragmentHtml),
    stockPreset: fitPreview?.model?.layout?.stockPreset,
    template: fitPreview?.model?.layout?.template,
    previewZoom: fitPreview?.previewMetrics?.previewZoom,
    inspectPreviewZoom: inspectPreview?.previewMetrics?.previewZoom,
    inspectStartsAtLeft: Boolean(
      inspectPreview?.html?.includes(
        "body.preview-zoom-inspect .preview-shell",
      ),
    ),
    labelPreviewScale: fitPreview?.previewMetrics?.labelPreviewScale,
    pictogramCodes,
    hasEveryPictogram: includesEvery(pictogramCodes, expectedPictograms),
    hasQr: hasActualQrImage(fragmentHtml),
    hasSummaries: hasSummaries(fragmentHtml),
    hasIconPictogramClass: fragmentHtml.includes("pictograms-icon"),
    hasFullPagePictograms: Boolean(
      fitPreview?.html?.includes("width: 28mm") &&
        fitPreview?.html?.includes("height: 28mm"),
    ),
  };

  const expected = testCase.expected || {};
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
    ["qrState", actual.hasQr === expected.hasQr],
  ];

  if (Number.isFinite(expected.minPreviewScale)) {
    checks.push([
      "minimumPreviewScale",
      actual.labelPreviewScale >= expected.minPreviewScale,
    ]);
  }

  if (typeof expected.hasSummaries === "boolean") {
    checks.push(["summaryState", actual.hasSummaries === expected.hasSummaries]);
  }

  if (typeof expected.hasFullPagePictograms === "boolean") {
    checks.push([
      "fullPagePictogramSize",
      actual.hasFullPagePictograms === expected.hasFullPagePictograms,
    ]);
  }

  const failures = checks
    .filter(([, passed]) => !passed)
    .map(([name]) => name);

  return {
    id: testCase.id,
    label: testCase.label,
    locale: testCase.locale,
    expected,
    actual,
    handoffExpectation: {
      status: "qa_handoff",
      labelKind: actual.labelKind,
      pictogramCodes: actual.pictogramCodes,
      hasQr: actual.hasQr,
      template: actual.template,
      stockPreset: actual.stockPreset,
    },
    passed: failures.length === 0,
    failures,
  };
}

export function buildPrintQaMatrixReport({
  chemical = PRINT_QA_HYDROCHLORIC_ACID,
  labProfile = PRINT_QA_PROFILE,
  matrix = PRINT_QA_MATRIX,
  generatedAt = new Date().toISOString(),
} = {}) {
  const cases = matrix.map((testCase) =>
    buildPrintQaCaseResult({ testCase, chemical, labProfile }),
  );
  const failedCases = cases.filter((testCase) => !testCase.passed);

  return {
    schemaVersion: 1,
    generatedAt,
    chemical: {
      cas: chemical.cas_number,
      name: chemical.name_en || chemical.name || chemical.name_zh,
      expectedPictograms: PRINT_QA_PICTOGRAMS,
    },
    summary: {
      total: cases.length,
      passed: cases.length - failedCases.length,
      failed: failedCases.length,
    },
    cases,
  };
}
