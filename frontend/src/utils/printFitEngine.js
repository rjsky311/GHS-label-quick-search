import {
  PRINT_LABEL_ELEMENT_STATUS,
  buildPrintLabelContents,
  countResponsibleProfileFields,
  hasResponsibleProfile,
} from "@/utils/printContentModel";
import { isFullPagePrimaryStockId } from "@/constants/labelStocks";
import {
  resolveEffectiveLabelContentLocale,
  resolveEffectiveLabelNameDisplay,
  getLocalizedStatementText,
  shouldRenderBilingualLabelText,
} from "@/utils/ghsText";

export const PRINT_READINESS_STATE = Object.freeze({
  PENDING_SELECTION: "pending_selection",
  READY_COMPLETE: "ready_complete",
  NEEDS_PROFILE: "needs_profile",
  TOO_DENSE_AUTO_UPGRADE: "too_dense_auto_upgrade",
  NEEDS_CONTINUATION: "needs_continuation",
  SUPPLEMENTAL_ONLY: "supplemental_only",
  BLOCKED_INVALID: "blocked_invalid",
});

export const PRINT_RECOMMENDED_ACTION = Object.freeze({
  PRINT: "print",
  USE_A4_PRIMARY: "use_a4_primary",
  USE_FULL_PAGE_PRIMARY: "use_full_page_primary",
  ADD_PROFILE: "add_profile",
  CREATE_CONTINUATION: "create_continuation",
  REVIEW_SUPPLEMENTAL: "review_supplemental",
  SELECT_LABELS: "select_labels",
});

export const getMaxCompleteStatementCount = (layout) => {
  let maxStatements;
  if (layout.widthMm >= 170 && layout.heightMm >= 200) maxStatements = 36;
  else if (layout.size === "large") maxStatements = 18;
  else if (layout.size === "medium") maxStatements = 10;
  else maxStatements = 6;

  if (
    layout.nameDisplay === "both" &&
    !(layout.widthMm >= 170 && layout.heightMm >= 200)
  ) {
    return Math.max(4, Math.floor(maxStatements * 0.72));
  }

  return maxStatements;
};

const metricNumber = (value, fallback = 0) => {
  const parsed = Number.parseFloat(String(value ?? ""));
  return Number.isFinite(parsed) ? parsed : fallback;
};

const layoutAreaMm = (layout = {}) =>
  Math.max(1, (layout.widthMm || 0) * (layout.heightMm || 0));

const isFullPageLikeLayout = (layout = {}) =>
  isFullPagePrimaryStockId(layout.stockId) ||
  isFullPagePrimaryStockId(layout.stockPreset) ||
  (layout.widthMm >= 170 && layout.heightMm >= 200);

const legacyCompleteTextWeight = (layout = {}) => {
  const area = layoutAreaMm(layout);
  if (isFullPageLikeLayout(layout) || area >= 34000) return 2600;
  if (layout.size === "large" || area >= 10000) return 980;
  if (layout.size === "medium" || area >= 4200) return 520;
  return 280;
};

const rendererTextCapacity = (layout = {}, { complete = false } = {}) => {
  const area = layoutAreaMm(layout);
  const typography = layout.typography || {};
  const isFullPage = isFullPageLikeLayout(layout);
  const statementPx = complete
    ? metricNumber(
        isFullPage
          ? typography.complianceStatementSize
          : typography.hazardSize,
        isFullPage ? 7 : 8,
      )
    : metricNumber(typography.hazardSize || typography.fontSize, 8);
  const lineHeight = complete
    ? metricNumber(
        isFullPage ? typography.complianceLineHeight : "1.1",
        1.1,
      )
    : 1.08;
  const columns = complete
    ? Math.max(1, metricNumber(typography.complianceColumns, 1))
    : 1;
  const paddingMm = metricNumber(layout.label?.padding, 2.5);
  const pictogramMm = complete
    ? metricNumber(typography.compliancePictogramSize, 18)
    : metricNumber(
        layout.template === "qrcode"
          ? typography.qrPictogramSize
          : typography.standardPictogramSize || typography.imgSize,
        10,
      );
  const qrReserveMm =
    layout.template === "qrcode" ? metricNumber(typography.qrBox, 18) : 0;
  const railReserveMm =
    layout.template === "standard"
      ? metricNumber(typography.standardRailColumn, 0)
      : 0;

  const edgeReserve = paddingMm * (layout.widthMm + layout.heightMm);
  const mediaReserve =
    qrReserveMm * qrReserveMm * 0.55 +
    pictogramMm * pictogramMm * (complete ? 0.35 : 0.18) +
    railReserveMm * (layout.heightMm || 0) * 0.24;
  const usableArea = Math.max(area * 0.28, area - edgeReserve - mediaReserve);
  const densityFactor = complete
    ? isFullPage
      ? 0.22
      : 0.58
    : layout.template === "icon"
      ? 0.58
      : layout.template === "qrcode"
        ? 0.44
        : 0.5;

  return Math.round(
    (usableArea / Math.max(4.5, statementPx * lineHeight)) *
      densityFactor *
      columns,
  );
};

export const getMaxCompleteTextWeight = (layout = {}) => {
  const isFullPage = isFullPageLikeLayout(layout);
  let maxTextWeight = Math.round(
    legacyCompleteTextWeight(layout) * 0.58 +
      rendererTextCapacity(layout, { complete: true }) * 0.42,
  );

  if (layout.nameDisplay === "both" && !isFullPage) {
    return Math.max(220, Math.floor(maxTextWeight * 0.82));
  }

  return maxTextWeight;
};

export const getMaxSupplementalTextWeight = (layout = {}) => {
  const budgets = layout.templateBudgets || {};
  const standardBudget = budgets.standard || {};
  const qrBudget = budgets.qrcode || {};
  const typography = layout.typography || {};
  const renderedSlots =
    layout.template === "qrcode"
      ? qrBudget.hazardTeasers || 1
      : layout.template === "icon"
        ? 0
        : (standardBudget.primaryHazards || 1) +
          (standardBudget.precautions || 0) * 0.35;
  const rendererCapacity = rendererTextCapacity(layout, { complete: false });
  const slotCapacity = 120 + renderedSlots * 58;
  const pictogramCapacity =
    (standardBudget.pictograms || qrBudget.pictograms || 2) * 28;
  const renderedPictogramMm = metricNumber(
    layout.template === "qrcode"
      ? typography.qrPictogramSize
      : typography.standardPictogramSize || typography.imgSize,
    8,
  );
  const rendererFloor =
    layout.template === "qrcode"
      ? Math.round(140 + renderedPictogramMm * 7)
      : layout.template === "icon"
        ? Math.round(130 + renderedPictogramMm * 5)
        : Math.round(140 + renderedSlots * 38 + renderedPictogramMm * 2);
  const baseCapacity = Math.round(
    rendererCapacity * 0.55 + slotCapacity * 0.35 + pictogramCapacity * 0.1,
  );
  const maxCapacity = Math.max(rendererFloor, baseCapacity);

  if (layout.nameDisplay === "both") {
    return Math.max(rendererFloor, Math.floor(maxCapacity * 0.9));
  }
  return Math.max(rendererFloor, maxCapacity);
};

const stringLength = (value) => String(value || "").trim().length;

const joinUniqueText = (...parts) => {
  const seen = new Set();
  return parts
    .map((part) => String(part || "").trim())
    .filter((part) => {
      if (!part || seen.has(part)) return false;
      seen.add(part);
      return true;
    })
    .join(" / ");
};

const getRenderedStatementText = (statement, layout = {}, locale = "zh") => {
  if (shouldRenderBilingualLabelText(layout, locale)) {
    return joinUniqueText(
      getLocalizedStatementText(statement, "zh"),
      getLocalizedStatementText(statement, "en"),
    );
  }

  return getLocalizedStatementText(
    statement,
    resolveEffectiveLabelContentLocale(layout, locale),
  );
};

const getRenderedIdentityText = (chemical = {}, layout = {}, locale = "zh") => {
  const nameDisplay = resolveEffectiveLabelNameDisplay(layout, locale);
  if (nameDisplay === "both") {
    return joinUniqueText(chemical.name_en || chemical.name, chemical.name_zh);
  }
  if (nameDisplay === "en") {
    return chemical.name_en || chemical.name || chemical.name_zh || "";
  }
  if (nameDisplay === "zh") {
    return chemical.name_zh || chemical.name_en || chemical.name || "";
  }
  return chemical.name_zh || chemical.name_en || chemical.name || "";
};

const statementTextWeight = (
  statements,
  layout = {},
  { codeOnly = false, locale = "zh" } = {},
) =>
  statements.reduce(
    (total, statement) =>
      total +
      stringLength(statement?.code) * 2 +
      (codeOnly
        ? 0
        : stringLength(getRenderedStatementText(statement, layout, locale))),
    0,
  );

const identityTextWeight = (content, layout = {}, locale = "zh") =>
  stringLength(
    getRenderedIdentityText(content.effectiveChemical, layout, locale),
  ) * 1.4 +
  stringLength(content.cas) * 1.1 +
  stringLength(content.signalWord) * 2;

export const estimatePrintContentTextWeight = (
  content,
  layout = {},
  locale = "zh",
) => {
  const statementWeight = statementTextWeight(
    [
      ...(content.hazardStatements || []),
      ...(content.precautionaryStatements || []),
    ],
    layout,
    { locale },
  );

  const pictogramReserve = (content.counts?.pictograms || 0) * 26;

  return Math.round(
    statementWeight +
      identityTextWeight(content, layout, locale) +
      pictogramReserve,
  );
};

const estimateSupplementalPrintContentTextWeight = (
  content,
  layout = {},
  locale = "zh",
) => {
  const budgets = layout.templateBudgets || {};
  const hazards = content.hazardStatements || [];
  const precautions = content.precautionaryStatements || [];
  const pictogramReserve = (content.counts?.pictograms || 0) * 26;

  if (layout.template === "icon") {
    return Math.round(
      identityTextWeight(content, layout, locale) + pictogramReserve,
    );
  }

  if (layout.template === "qrcode") {
    const hazardTeasers = budgets.qrcode?.hazardTeasers || 1;
    const compactQrCodeOnly =
      layout.formFactor === "strip" ||
      layout.size === "small" ||
      layout.heightMm <= 32;
    return Math.round(
      identityTextWeight(content, layout, locale) +
        statementTextWeight(hazards.slice(0, hazardTeasers), layout, {
          locale,
          codeOnly: compactQrCodeOnly,
        }) +
        pictogramReserve,
    );
  }

  const standardBudget = budgets.standard || {};
  const renderedHazards = hazards.slice(0, standardBudget.primaryHazards || 1);
  const renderedPrecautions = precautions.slice(
    0,
    standardBudget.precautions || 0,
  );
  const compactStandardHazards =
    layout.labelPurpose === "shipping" &&
    layout.template === "standard" &&
    layout.formFactor === "bottle";

  return Math.round(
    identityTextWeight(content, layout, locale) +
      statementTextWeight(renderedHazards, layout, {
        codeOnly: compactStandardHazards,
        locale,
      }) +
      statementTextWeight(renderedPrecautions, layout, {
        codeOnly: true,
        locale,
      }) +
      pictogramReserve,
  );
};

const isCompletePrimaryLayout = (layout = {}) =>
  layout.labelPurpose === "shipping" && layout.template === "full";

const isFullPagePrimaryLayout = (layout = {}) =>
  isFullPagePrimaryStockId(layout.stockId) ||
  isFullPagePrimaryStockId(layout.stockPreset) ||
  (layout.widthMm >= 170 && layout.heightMm >= 200);

const buildContentOptions = (model) => ({
  customGHSSettings: model.customGHSSettings,
  resolvedLabProfile: model.resolvedLabProfile,
  layout: model.layout,
});

const inspectSupplementalContentFitForContents = (
  contents,
  layout = {},
  locale = "zh",
) => {
  const maxTextWeight = getMaxSupplementalTextWeight(layout);
  return contents.flatMap((content) => {
    const textWeight = estimateSupplementalPrintContentTextWeight(
      content,
      layout,
      locale,
    );

    if (textWeight <= maxTextWeight) return [];

    return [
      {
        type: "supplemental-content-too-dense",
        index: content.index,
        textWeight,
        maxTextWeight,
      },
    ];
  });
};

export function inspectPrintContentFit(model) {
  if (!model?.expandedLabels?.length) return [];
  const { layout } = model;
  const locale = model.locale || "zh";
  const contents = buildPrintLabelContents(
    model.expandedLabels,
    buildContentOptions(model),
  );
  if (!isCompletePrimaryLayout(layout)) {
    return inspectSupplementalContentFitForContents(contents, layout, locale);
  }

  const maxStatements = getMaxCompleteStatementCount(layout);
  const maxTextWeight = getMaxCompleteTextWeight(layout);
  return contents.flatMap((content) => {
    const issues = [];
    if (content.counts.statements > maxStatements) {
      issues.push({
        type: "content-too-dense",
        index: content.index,
        statementCount: content.counts.statements,
        maxStatements,
      });
    }

    const textWeight = estimatePrintContentTextWeight(content, layout, locale);
    if (textWeight > maxTextWeight) {
      issues.push({
        type: "content-text-too-dense",
        index: content.index,
        textWeight,
        maxTextWeight,
      });
    }

    return issues;
  });
}

const summarizeElements = (
  contents,
  resolvedLabProfile,
  isCompletePrimary,
) => {
  const totals = contents.reduce(
    (acc, content) => {
      acc.pictograms.expected += content.counts.pictograms;
      acc.pictograms.present += content.counts.pictograms;
      acc.hazardStatements.expected += content.counts.hazardStatements;
      acc.hazardStatements.present += content.counts.hazardStatements;
      acc.precautionaryStatements.expected +=
        content.counts.precautionaryStatements;
      acc.precautionaryStatements.present +=
        content.counts.precautionaryStatements;
      if (
        content.elementStatus.signalWord === PRINT_LABEL_ELEMENT_STATUS.PRESENT
      ) {
        acc.signalWord.present += 1;
      }
      acc.signalWord.expected += 1;
      return acc;
    },
    {
      pictograms: { expected: 0, present: 0 },
      hazardStatements: { expected: 0, present: 0 },
      precautionaryStatements: { expected: 0, present: 0 },
      signalWord: { expected: 0, present: 0 },
    },
  );

  return {
    ...totals,
    responsibleProfile: {
      expected: contents.length > 0 && isCompletePrimary ? 3 : 0,
      present:
        contents.length > 0 && isCompletePrimary
          ? countResponsibleProfileFields(resolvedLabProfile)
          : 0,
    },
  };
};

export function evaluatePrintReadiness({
  selectedForLabel = [],
  layout,
  customGHSSettings = {},
  resolvedLabProfile = {},
  locale = "zh",
} = {}) {
  const contents = buildPrintLabelContents(selectedForLabel, {
    customGHSSettings,
    resolvedLabProfile,
    layout,
  });
  const hasProfile = hasResponsibleProfile(resolvedLabProfile);
  const maxStatements = getMaxCompleteStatementCount(layout || {});
  const maxTextWeight = getMaxCompleteTextWeight(layout || {});
  const maxStatementCount = contents.reduce(
    (max, content) => Math.max(max, content.counts.statements),
    0,
  );
  const maxTextWeightScore = contents.reduce(
    (max, content) =>
      Math.max(
        max,
        estimatePrintContentTextWeight(content, layout || {}, locale),
      ),
    0,
  );
  const isCompletePrimary = isCompletePrimaryLayout(layout);
  const isDense =
    isCompletePrimary &&
    (maxStatementCount > maxStatements || maxTextWeightScore > maxTextWeight);
  const supplementalFitIssues = isCompletePrimary
    ? []
    : inspectSupplementalContentFitForContents(contents, layout || {}, locale);
  const isSupplementalDense = supplementalFitIssues.length > 0;
  const isFullPagePrimary = isFullPagePrimaryLayout(layout);
  const elementSummary = summarizeElements(
    contents,
    resolvedLabProfile,
    isCompletePrimary,
  );

  if (contents.length === 0) {
    return {
      state: PRINT_READINESS_STATE.PENDING_SELECTION,
      canPrint: false,
      recommendedAction: PRINT_RECOMMENDED_ACTION.SELECT_LABELS,
      contents,
      elementSummary,
      maxStatements,
      maxStatementCount,
      maxTextWeight,
      maxTextWeightScore,
      issues: [],
    };
  }

  const issues = [...supplementalFitIssues];
  if (isDense) {
    if (maxStatementCount > maxStatements) {
      issues.push({
        type: "content-too-dense",
        statementCount: maxStatementCount,
        maxStatements,
      });
    }
    if (maxTextWeightScore > maxTextWeight) {
      issues.push({
        type: "content-text-too-dense",
        textWeight: maxTextWeightScore,
        maxTextWeight,
      });
    }
  }
  if (isCompletePrimary && !hasProfile) {
    issues.push({ type: "responsible-profile-missing" });
  }

  if (isDense && !isFullPagePrimary) {
    return {
      state: PRINT_READINESS_STATE.TOO_DENSE_AUTO_UPGRADE,
      canPrint: false,
      recommendedAction: PRINT_RECOMMENDED_ACTION.USE_FULL_PAGE_PRIMARY,
      contents,
      elementSummary,
      maxStatements,
      maxStatementCount,
      maxTextWeight,
      maxTextWeightScore,
      issues,
    };
  }

  if (isDense && isFullPagePrimary) {
    return {
      state: PRINT_READINESS_STATE.NEEDS_CONTINUATION,
      canPrint: false,
      recommendedAction: PRINT_RECOMMENDED_ACTION.CREATE_CONTINUATION,
      contents,
      elementSummary,
      maxStatements,
      maxStatementCount,
      maxTextWeight,
      maxTextWeightScore,
      issues,
    };
  }

  if (isSupplementalDense) {
    return {
      state: PRINT_READINESS_STATE.BLOCKED_INVALID,
      canPrint: false,
      recommendedAction: PRINT_RECOMMENDED_ACTION.USE_FULL_PAGE_PRIMARY,
      contents,
      elementSummary,
      maxStatements,
      maxStatementCount,
      maxTextWeight,
      maxTextWeightScore,
      issues,
    };
  }

  if (!isCompletePrimary) {
    return {
      state: PRINT_READINESS_STATE.SUPPLEMENTAL_ONLY,
      canPrint: true,
      recommendedAction: PRINT_RECOMMENDED_ACTION.REVIEW_SUPPLEMENTAL,
      contents,
      elementSummary,
      maxStatements,
      maxStatementCount,
      maxTextWeight,
      maxTextWeightScore,
      issues,
    };
  }

  if (!hasProfile) {
    return {
      state: PRINT_READINESS_STATE.NEEDS_PROFILE,
      canPrint: false,
      recommendedAction: PRINT_RECOMMENDED_ACTION.ADD_PROFILE,
      contents,
      elementSummary,
      maxStatements,
      maxStatementCount,
      maxTextWeight,
      maxTextWeightScore,
      issues,
    };
  }

  return {
    state: PRINT_READINESS_STATE.READY_COMPLETE,
    canPrint: true,
    recommendedAction: PRINT_RECOMMENDED_ACTION.PRINT,
    contents,
    elementSummary,
    maxStatements,
    maxStatementCount,
    maxTextWeight,
    maxTextWeightScore,
    issues,
  };
}
