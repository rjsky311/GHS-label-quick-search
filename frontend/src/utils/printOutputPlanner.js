import {
  LABEL_STOCK_PRESETS,
  isFullPagePrimaryStockId,
} from "@/constants/labelStocks";
import {
  PRINT_READINESS_STATE,
  evaluatePrintReadiness,
} from "@/utils/printFitEngine";

export const PRINT_OUTPUT_PLAN_STATE = Object.freeze({
  PENDING_SELECTION: "pending_selection",
  READY: "ready",
  READY_WITH_NOTICE: "ready_with_notice",
  RECOMMEND_FULL_PAGE: "recommend_full_page",
  MISSING_REQUIRED_PROFILE: "missing_required_profile",
  MISSING_HAZARD_DATA: "missing_hazard_data",
  INVALID_STOCK: "invalid_stock",
});

export const PRINT_OUTPUT_KIND = Object.freeze({
  COMPLETE_PRIMARY: "complete_primary",
  SUPPLEMENTAL: "supplemental",
  QR_SUPPLEMENT: "qr_supplement",
});

const FULL_PAGE_STOCK_BY_ID = LABEL_STOCK_PRESETS.reduce((acc, preset) => {
  if (isFullPagePrimaryStockId(preset.id)) acc[preset.id] = preset;
  return acc;
}, {});

export function getPreferredFullPageStockId(locale = "", pageSize = "") {
  if (pageSize === "Letter") return "letter-primary";
  if (pageSize === "A4") return "a4-primary";

  const normalizedLocale = String(locale || "").toLowerCase();
  if (
    normalizedLocale.startsWith("en") ||
    normalizedLocale.includes("us") ||
    normalizedLocale.includes("ca")
  ) {
    return "letter-primary";
  }

  return "a4-primary";
}

export function getFullPageStockPreset(stockId = "a4-primary") {
  return FULL_PAGE_STOCK_BY_ID[stockId] || FULL_PAGE_STOCK_BY_ID["a4-primary"];
}

export function buildFullPagePrimaryPatch({
  locale,
  pageSize,
  stockId,
} = {}) {
  const preferredStockId =
    stockId || getPreferredFullPageStockId(locale, pageSize);
  const preset = getFullPageStockPreset(preferredStockId);

  return {
    labelPurpose: "shipping",
    template: "full",
    stockPreset: preset.id,
    size: preset.size,
    orientation: preset.orientation,
    pageSize: preset.pageSize || (preset.id === "letter-primary" ? "Letter" : "A4"),
    columns: preset.columns,
    rows: preset.rows,
    perPage: preset.columns * preset.rows,
    labelWidthMm: preset.labelWidthMm,
    labelHeightMm: preset.labelHeightMm,
    pagePaddingMm: preset.pagePaddingMm,
    columnGapMm: preset.columnGapMm,
    rowGapMm: preset.rowGapMm,
    offsetXmm: preset.offsetXmm,
    offsetYmm: preset.offsetYmm,
  };
}

const hasHazardContent = (readiness) =>
  readiness.contents.some(
    (content) =>
      content.counts.pictograms > 0 ||
      content.counts.hazardStatements > 0 ||
      content.counts.precautionaryStatements > 0 ||
      Boolean(content.signalWord),
  );

const hasUpstreamError = (readiness) =>
  readiness.contents.some((content) => content.effectiveChemical?.upstream_error);

const resolveOutputKind = (layout = {}) => {
  if (layout.labelPurpose === "qrSupplement" || layout.template === "qrcode") {
    return PRINT_OUTPUT_KIND.QR_SUPPLEMENT;
  }

  if (layout.labelPurpose !== "shipping" || layout.template !== "full") {
    return PRINT_OUTPUT_KIND.SUPPLEMENTAL;
  }

  return PRINT_OUTPUT_KIND.COMPLETE_PRIMARY;
};

const isSmallSupplementalStock = (layout = {}) =>
  layout.outputRole === "supplemental" ||
  layout.size === "small" ||
  (layout.widthMm < 80 && layout.heightMm < 50);

export function buildPrintOutputPlan({
  selectedForLabel = [],
  layout,
  customGHSSettings = {},
  resolvedLabProfile = {},
  locale,
} = {}) {
  const readiness = evaluatePrintReadiness({
    selectedForLabel,
    layout,
    customGHSSettings,
    resolvedLabProfile,
  });
  const outputKind = resolveOutputKind(layout);
  const recommendedFullPageStockId = getPreferredFullPageStockId(
    locale,
    layout?.stock?.pageSize,
  );
  const recommendedFullPagePatch = buildFullPagePrimaryPatch({
    locale,
    pageSize: layout?.pageSize,
    stockId: recommendedFullPageStockId,
  });
  const issues = [...(readiness.issues || [])];

  if (readiness.state === PRINT_READINESS_STATE.PENDING_SELECTION) {
    return {
      state: PRINT_OUTPUT_PLAN_STATE.PENDING_SELECTION,
      canPrint: false,
      outputKind,
      readiness,
      issues,
      recommendedFullPageStockId,
      recommendedFullPagePatch,
    };
  }

  if (!hasHazardContent(readiness)) {
    if (hasUpstreamError(readiness)) {
      issues.push({ type: "upstream-error" });
    }
    issues.push({ type: "missing-hazard-data" });
    return {
      state: PRINT_OUTPUT_PLAN_STATE.MISSING_HAZARD_DATA,
      canPrint: false,
      outputKind,
      readiness,
      issues,
      recommendedFullPageStockId,
      recommendedFullPagePatch,
    };
  }

  if (readiness.state === PRINT_READINESS_STATE.NEEDS_PROFILE) {
    return {
      state: PRINT_OUTPUT_PLAN_STATE.MISSING_REQUIRED_PROFILE,
      canPrint: false,
      outputKind,
      readiness,
      issues,
      recommendedFullPageStockId,
      recommendedFullPagePatch,
    };
  }

  if (
    readiness.state === PRINT_READINESS_STATE.TOO_DENSE_AUTO_UPGRADE ||
    (outputKind === PRINT_OUTPUT_KIND.COMPLETE_PRIMARY &&
      isSmallSupplementalStock(layout))
  ) {
    return {
      state: PRINT_OUTPUT_PLAN_STATE.RECOMMEND_FULL_PAGE,
      canPrint: false,
      outputKind,
      readiness,
      issues,
      recommendedFullPageStockId,
      recommendedFullPagePatch,
    };
  }

  if (readiness.state === PRINT_READINESS_STATE.NEEDS_CONTINUATION) {
    return {
      state: PRINT_OUTPUT_PLAN_STATE.INVALID_STOCK,
      canPrint: false,
      outputKind,
      readiness,
      issues,
      recommendedFullPageStockId,
      recommendedFullPagePatch,
    };
  }

  if (readiness.state === PRINT_READINESS_STATE.SUPPLEMENTAL_ONLY) {
    return {
      state: PRINT_OUTPUT_PLAN_STATE.READY_WITH_NOTICE,
      canPrint: true,
      outputKind,
      readiness,
      issues,
      recommendedFullPageStockId,
      recommendedFullPagePatch,
    };
  }

  return {
    state: PRINT_OUTPUT_PLAN_STATE.READY,
    canPrint: readiness.canPrint,
    outputKind,
    readiness,
    issues,
    recommendedFullPageStockId,
    recommendedFullPagePatch,
  };
}
