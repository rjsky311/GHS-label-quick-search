import {
  LABEL_STOCK_PRESETS,
  isFullPagePrimaryStockId,
} from "@/constants/labelStocks";
import {
  PRINT_READINESS_STATE,
  evaluatePrintReadiness,
} from "@/utils/printFitEngine";
import { resolvePrintOutputKindFromLayout } from "@/utils/printContentPolicy";
import {
  getPrintOutputIdForLayout,
  getSmallLabelContinuationPolicy,
  requiresSmallLabelRecovery,
} from "@/utils/printOutputContract";
import { splitCompactPictograms } from "@/utils/printRenderHelpers";

export const PRINT_OUTPUT_PLAN_STATE = Object.freeze({
  PENDING_SELECTION: "pending_selection",
  READY: "ready",
  READY_WITH_NOTICE: "ready_with_notice",
  READY_WITH_CONTINUATION: "ready_with_continuation",
  RECOMMEND_FULL_PAGE: "recommend_full_page",
  MISSING_REQUIRED_PROFILE: "missing_required_profile",
  MISSING_HAZARD_DATA: "missing_hazard_data",
  INVALID_STOCK: "invalid_stock",
  SMALL_LABEL_CONTINUATION_LIMIT: "small_label_continuation_limit",
});

export const PRINT_OUTPUT_KIND = Object.freeze({
  COMPLETE_PRIMARY: "complete_primary",
  SUPPLEMENTAL: "supplemental",
  QUICK_ID: "quick_id",
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

const isSmallSupplementalStock = (layout = {}) =>
  layout.outputRole === "supplemental" ||
  layout.size === "small" ||
  (layout.widthMm < 80 && layout.heightMm < 50);

const getSmallLabelContinuationIssue = (readiness, layout = {}) => {
  const outputId = getPrintOutputIdForLayout(layout, layout.template);
  const policy = getSmallLabelContinuationPolicy(outputId);
  if (!policy) return null;

  const overLimitItems = (readiness.contents || [])
    .map((content, index) => {
      const pages = splitCompactPictograms(
        content.pictograms || [],
        layout,
        layout.template,
      );
      return {
        index,
        cas: content.cas,
        pageCount: pages.length,
      };
    })
    .filter((item) => requiresSmallLabelRecovery(outputId, item.pageCount));

  if (overLimitItems.length === 0) return null;

  return {
    type: "small-label-continuation-limit",
    outputId,
    maxLabels: policy.maxLabels,
    pageCount: Math.max(...overLimitItems.map((item) => item.pageCount)),
    items: overLimitItems,
  };
};

export function buildPrintOutputPlan({
  selectedForLabel = [],
  layout,
  customGHSSettings = {},
  customLabelFields = {},
  resolvedLabProfile = {},
  locale,
} = {}) {
  const readiness = evaluatePrintReadiness({
    selectedForLabel,
    layout,
    customGHSSettings,
    customLabelFields,
    resolvedLabProfile,
    locale,
  });
  const outputKind = resolvePrintOutputKindFromLayout(layout);
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
  const smallLabelContinuationIssue = getSmallLabelContinuationIssue(
    readiness,
    layout || {},
  );

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
    readiness.state === PRINT_READINESS_STATE.BLOCKED_INVALID ||
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

  if (smallLabelContinuationIssue) {
    issues.push(smallLabelContinuationIssue);
    return {
      state: PRINT_OUTPUT_PLAN_STATE.SMALL_LABEL_CONTINUATION_LIMIT,
      canPrint: false,
      outputKind,
      readiness,
      issues,
      recoveryActions: ["use-english-only", "use-complete-label"],
      recommendedFullPageStockId,
      recommendedFullPagePatch,
    };
  }

  if (readiness.state === PRINT_READINESS_STATE.NEEDS_CONTINUATION) {
    return {
      state: PRINT_OUTPUT_PLAN_STATE.READY_WITH_CONTINUATION,
      canPrint: true,
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
