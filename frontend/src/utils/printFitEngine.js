import {
  PRINT_LABEL_ELEMENT_STATUS,
  buildPrintLabelContent,
  buildPrintLabelContents,
  countResponsibleProfileFields,
  hasResponsibleProfile,
} from "@/utils/printContentModel";
import {
  PRINT_HAZARD_TEXT_MODE,
  resolvePrintContentPolicy,
  shouldUseHazardCodesOnly,
} from "@/utils/printContentPolicy";
import {
  isFullPagePrimaryStockId,
  resolvePrintLayoutConfig,
} from "@/constants/labelStocks";
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

const clampAutoFitLevel = (value) =>
  Math.max(0, Math.min(4, Math.trunc(Number(value) || 0)));

const scaleFiniteLimit = (value, factor, minimum = 1) =>
  Number.isFinite(value)
    ? Math.max(minimum, Math.floor(value * factor))
    : value;

const applyContinuationAutoFitCapacity = (capacity, layout = {}) => {
  const level = clampAutoFitLevel(layout.autoFitLevel);
  if (level <= 0) return capacity;

  // Auto-fit reduces font size and padding. Its planning capacity must grow
  // with that rendered space; shrinking these limits creates false
  // continuations where labels split despite large blank areas.
  const scales = {
    1: {
      split: 1.08,
      first: 1.08,
      continuation: 1.1,
      text: 1.12,
      mixed: 1.08,
    },
    2: {
      split: 1.18,
      first: 1.18,
      continuation: 1.22,
      text: 1.26,
      mixed: 1.18,
    },
    3: {
      split: 1.28,
      first: 1.28,
      continuation: 1.34,
      text: 1.42,
      mixed: 1.28,
    },
    4: {
      split: 1.38,
      first: 1.38,
      continuation: 1.46,
      text: 1.6,
      mixed: 1.38,
    },
  };
  const scale = scales[level] || scales[1];

  return {
    ...capacity,
    splitStatementCount: scaleFiniteLimit(
      capacity.splitStatementCount,
      scale.split,
      12,
    ),
    splitTextWeight: scaleFiniteLimit(capacity.splitTextWeight, scale.text, 1800),
    splitLineUnits: scaleFiniteLimit(capacity.splitLineUnits, scale.split, 24),
    pageStatementCount: scaleFiniteLimit(
      capacity.pageStatementCount,
      scale.first,
      10,
    ),
    pageTextWeight: scaleFiniteLimit(capacity.pageTextWeight, scale.text, 1600),
    pageLineUnits: scaleFiniteLimit(capacity.pageLineUnits, scale.first, 24),
    firstPageStatementCount: scaleFiniteLimit(
      capacity.firstPageStatementCount,
      scale.first,
      12,
    ),
    firstPageTextWeight: scaleFiniteLimit(
      capacity.firstPageTextWeight,
      scale.text,
      1800,
    ),
    firstPageLineUnits: scaleFiniteLimit(
      capacity.firstPageLineUnits,
      scale.first,
      24,
    ),
    continuationPageStatementCount: scaleFiniteLimit(
      capacity.continuationPageStatementCount,
      scale.continuation,
      14,
    ),
    continuationPageTextWeight: scaleFiniteLimit(
      capacity.continuationPageTextWeight,
      scale.text,
      1900,
    ),
    continuationPageLineUnits: scaleFiniteLimit(
      capacity.continuationPageLineUnits,
      scale.continuation,
      28,
    ),
    precautionOnlyStatementCount: scaleFiniteLimit(
      capacity.precautionOnlyStatementCount,
      scale.continuation,
      12,
    ),
    precautionOnlyTextWeight: scaleFiniteLimit(
      capacity.precautionOnlyTextWeight,
      scale.text,
      1500,
    ),
    precautionOnlyLineUnits: scaleFiniteLimit(
      capacity.precautionOnlyLineUnits,
      scale.continuation,
      28,
    ),
    mixedPrecautionStatementCount: scaleFiniteLimit(
      capacity.mixedPrecautionStatementCount,
      scale.mixed,
      10,
    ),
    mixedPrecautionTextWeight: scaleFiniteLimit(
      capacity.mixedPrecautionTextWeight,
      scale.text,
      1300,
    ),
    separatePrecautionsAfterHazardCount: scaleFiniteLimit(
      capacity.separatePrecautionsAfterHazardCount,
      scale.mixed,
      8,
    ),
    separatePrecautionsAfterHazardTextWeight: scaleFiniteLimit(
      capacity.separatePrecautionsAfterHazardTextWeight,
      scale.text,
      1300,
    ),
  };
};

const MAX_CONTINUATION_TIGHTNESS_LEVEL = 8;

const clampContinuationTightnessLevel = (value) =>
  Math.max(
    0,
    Math.min(
      MAX_CONTINUATION_TIGHTNESS_LEVEL,
      Math.trunc(Number(value) || 0),
    ),
  );

const applyContinuationTightnessCapacity = (capacity, layout = {}) => {
  const level = clampContinuationTightnessLevel(
    layout.continuationTightnessLevel,
  );
  if (level <= 0) return capacity;

  const scales = {
    1: { split: 0.88, page: 0.9, text: 0.9, mixed: 0.9 },
    2: { split: 0.74, page: 0.78, text: 0.78, mixed: 0.8 },
    3: { split: 0.62, page: 0.66, text: 0.68, mixed: 0.7 },
    4: { split: 0.52, page: 0.58, text: 0.6, mixed: 0.62 },
    5: { split: 0.44, page: 0.5, text: 0.52, mixed: 0.54 },
    6: { split: 0.36, page: 0.42, text: 0.45, mixed: 0.48 },
    7: { split: 0.3, page: 0.35, text: 0.38, mixed: 0.42 },
    8: { split: 0.24, page: 0.3, text: 0.32, mixed: 0.36 },
  };
  const scale = scales[level] || scales[1];
  const minSplitStatements = level >= 7 ? 6 : level >= 5 ? 8 : 12;
  const minPageStatements = level >= 7 ? 4 : level >= 5 ? 6 : 12;
  const minContinuationStatements = level >= 7 ? 4 : level >= 5 ? 6 : 14;
  const minSplitLineUnits = level >= 7 ? 10 : level >= 5 ? 16 : 24;
  const minPageLineUnits = level >= 7 ? 10 : level >= 5 ? 16 : 24;
  const minContinuationLineUnits = level >= 7 ? 10 : level >= 5 ? 16 : 28;

  return {
    ...capacity,
    splitStatementCount: scaleFiniteLimit(
      capacity.splitStatementCount,
      scale.split,
      minSplitStatements,
    ),
    splitTextWeight: scaleFiniteLimit(capacity.splitTextWeight, scale.text, 1800),
    splitLineUnits: scaleFiniteLimit(
      capacity.splitLineUnits,
      scale.split,
      minSplitLineUnits,
    ),
    firstPageStatementCount: scaleFiniteLimit(
      capacity.firstPageStatementCount,
      scale.page,
      minPageStatements,
    ),
    firstPageTextWeight: scaleFiniteLimit(
      capacity.firstPageTextWeight,
      scale.text,
      1800,
    ),
    firstPageLineUnits: scaleFiniteLimit(
      capacity.firstPageLineUnits,
      scale.page,
      minPageLineUnits,
    ),
    continuationPageStatementCount: scaleFiniteLimit(
      capacity.continuationPageStatementCount,
      scale.page,
      minContinuationStatements,
    ),
    continuationPageTextWeight: scaleFiniteLimit(
      capacity.continuationPageTextWeight,
      scale.text,
      1900,
    ),
    continuationPageLineUnits: scaleFiniteLimit(
      capacity.continuationPageLineUnits,
      scale.page,
      minContinuationLineUnits,
    ),
    precautionOnlyStatementCount: scaleFiniteLimit(
      capacity.precautionOnlyStatementCount,
      scale.page,
      minPageStatements,
    ),
    precautionOnlyTextWeight: scaleFiniteLimit(
      capacity.precautionOnlyTextWeight,
      scale.text,
      1500,
    ),
    precautionOnlyLineUnits: scaleFiniteLimit(
      capacity.precautionOnlyLineUnits,
      scale.page,
      minContinuationLineUnits,
    ),
    mixedPrecautionStatementCount: scaleFiniteLimit(
      capacity.mixedPrecautionStatementCount,
      scale.mixed,
      10,
    ),
    mixedPrecautionTextWeight: scaleFiniteLimit(
      capacity.mixedPrecautionTextWeight,
      scale.text,
      1300,
    ),
  };
};

export const getCompletePrimaryContinuationCapacity = (layout = {}) => {
  const fullPageLike =
    isFullPagePrimaryStockId(layout.stockId) ||
    isFullPagePrimaryStockId(layout.stockPreset) ||
    (layout.widthMm >= 170 && layout.heightMm >= 200);

  if (!fullPageLike) {
    return {
      splitStatementCount: Infinity,
      splitTextWeight: Infinity,
      pageStatementCount: Infinity,
      pageTextWeight: Infinity,
    };
  }

  const isLetter =
    layout.stockId === "letter-primary" ||
    layout.stockPreset === "letter-primary" ||
    layout.pageSize === "Letter";

  if (isLetter) {
    return applyContinuationTightnessCapacity(applyContinuationAutoFitCapacity({
      splitStatementCount: 44,
      splitTextWeight: 11000,
      splitLineUnits: 64,
      pageStatementCount: 32,
      pageTextWeight: 3150,
      pageLineUnits: 64,
      firstPageStatementCount: 42,
      firstPageTextWeight: 7000,
      firstPageLineUnits: 64,
      continuationPageStatementCount: 66,
      continuationPageTextWeight: 9000,
      continuationPageLineUnits: 82,
      hazardOnlyStatementCount: 16,
      hazardOnlyTextWeight: 1850,
      precautionOnlyStatementCount: 30,
      precautionOnlyTextWeight: 2900,
      precautionOnlyLineUnits: 82,
      mixedPrecautionStatementCount: 30,
      mixedPrecautionTextWeight: 2350,
      separatePrecautionsAfterHazardCount: 18,
      separatePrecautionsAfterHazardTextWeight: 2600,
    }, layout), layout);
  }

  return applyContinuationTightnessCapacity(applyContinuationAutoFitCapacity({
    splitStatementCount: 48,
    splitTextWeight: 12000,
    splitLineUnits: 72,
    pageStatementCount: 34,
    pageTextWeight: 3400,
    pageLineUnits: 72,
    firstPageStatementCount: 48,
    firstPageTextWeight: 8000,
    firstPageLineUnits: 72,
    continuationPageStatementCount: 72,
    continuationPageTextWeight: 10000,
    continuationPageLineUnits: 90,
    hazardOnlyStatementCount: 17,
    hazardOnlyTextWeight: 2000,
    precautionOnlyStatementCount: 32,
    precautionOnlyTextWeight: 3200,
    precautionOnlyLineUnits: 90,
    mixedPrecautionStatementCount: 32,
    mixedPrecautionTextWeight: 2600,
    separatePrecautionsAfterHazardCount: 20,
    separatePrecautionsAfterHazardTextWeight: 2900,
  }, layout), layout);
};

export const getMaxCompleteStatementCount = (layout) => {
  let maxStatements;
  if (layout.widthMm >= 170 && layout.heightMm >= 200) {
    maxStatements = getCompletePrimaryContinuationCapacity(layout)
      .splitStatementCount;
  } else if (layout.size === "large") maxStatements = 18;
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

  if (isFullPage) {
    return Math.max(
      maxTextWeight,
      getCompletePrimaryContinuationCapacity(layout).splitTextWeight,
    );
  }

  if (layout.nameDisplay === "both" && !isFullPage) {
    return Math.max(220, Math.floor(maxTextWeight * 0.82));
  }

  return maxTextWeight;
};

const getStatementLineCharacters = (layout = {}) =>
  isFullPageLikeLayout(layout) ? 135 : 92;

export const getMaxCompleteLineUnits = (layout = {}) => {
  if (isFullPageLikeLayout(layout)) {
    return (
      getCompletePrimaryContinuationCapacity(layout).firstPageLineUnits ||
      getCompletePrimaryContinuationCapacity(layout).pageLineUnits ||
      Infinity
    );
  }
  if (layout.size === "large") return 32;
  if (layout.size === "medium") return 20;
  return 12;
};

export const estimatePrintContentLineUnits = (
  content,
  layout = {},
  locale = "zh",
) => {
  const lineCharacters = getStatementLineCharacters(layout);
  return [
    ...(content.hazardStatements || []),
    ...(content.precautionaryStatements || []),
  ].reduce((total, statement) => {
    const codeLength = stringLength(statement?.code);
    const codePenalty = codeLength > 10 ? 0.45 : codeLength > 7 ? 0.25 : 0;
    const textLength = stringLength(
      getRenderedStatementText(statement, layout, locale),
    );
    return (
      total +
      Math.max(1, Math.ceil(textLength / lineCharacters) + codePenalty)
    );
  }, 0);
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
        ? Math.round(180 + renderedPictogramMm * 6)
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

export const getMaxSupplementalPictogramCount = (layout = {}) => {
  const area = layoutAreaMm(layout);
  const isStrip = layout.formFactor === "strip" || layout.heightMm <= 32;

  if (layout.template === "qrcode" || layout.template === "icon") {
    return 99;
  }

  if (isStrip || layout.size === "small") return 4;
  return layout.size === "large" || area >= 9000 ? 6 : 4;
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

const customIdentityFields = (customLabelFields = {}) =>
  [
    customLabelFields.batchNumber,
    customLabelFields.date,
  ]
    .map((value) => String(value || "").trim())
    .filter(Boolean);

const customIdentityTextWeight = (customLabelFields = {}) =>
  customIdentityFields(customLabelFields).reduce(
    (total, value) => total + stringLength(value) * 2.2,
    0,
  );

const getMaxCustomIdentityLength = (layout = {}) => {
  if (layout.formFactor === "strip" || layout.heightMm <= 32) return 22;
  if (layout.size === "small" || layout.widthMm < 80) return 28;
  if (layout.size === "medium" || layout.widthMm < 120) return 40;
  return 64;
};

const inspectCustomIdentityFields = (
  customLabelFields = {},
  layout = {},
  index = 0,
) => {
  const maxLength = getMaxCustomIdentityLength(layout);
  return customIdentityFields(customLabelFields).flatMap((value) =>
    stringLength(value) > maxLength
      ? [
          {
            type: "custom-identity-too-long-for-stock",
            index,
            valueLength: stringLength(value),
            maxLength,
          },
        ]
      : [],
  );
};

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
  customLabelFields = {},
) => {
  const budgets = layout.templateBudgets || {};
  const hazards = content.hazardStatements || [];
  const precautions = content.precautionaryStatements || [];
  const pictogramCount = content.counts?.pictograms || 0;
  const pictogramReserveCount =
    layout.template === "qrcode"
      ? Math.min(pictogramCount, 2)
      : layout.template === "icon"
        ? Math.min(pictogramCount, 4)
        : pictogramCount;
  const pictogramReserve = pictogramReserveCount * 26;

  if (layout.template === "icon") {
    return Math.round(
      identityTextWeight(content, layout, locale) +
        customIdentityTextWeight(customLabelFields) +
        pictogramReserve,
    );
  }

  if (layout.template === "qrcode") {
    const hazardTeasers = budgets.qrcode?.hazardTeasers || 1;
    const compactQrCodeOnly =
      layout.formFactor === "strip" ||
      layout.size === "small" ||
      layout.heightMm <= 32;
    if (compactQrCodeOnly) {
      return Math.round(
        identityTextWeight(content, layout, locale) +
          customIdentityTextWeight(customLabelFields) +
          pictogramReserve,
      );
    }
    return Math.round(
      identityTextWeight(content, layout, locale) +
        customIdentityTextWeight(customLabelFields) +
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
  const hazardCodeOnly =
    content.policy?.hazardTextMode === PRINT_HAZARD_TEXT_MODE.H_CODES_ONLY ||
    shouldUseHazardCodesOnly(layout);

  return Math.round(
    identityTextWeight(content, layout, locale) +
      customIdentityTextWeight(customLabelFields) +
      statementTextWeight(renderedHazards, layout, {
        codeOnly: hazardCodeOnly,
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
  locale: model.locale || "zh",
});

const getEffectiveLabelLayoutForContentFit = (chemical, layout = {}) => {
  const override =
    chemical?.__printLayoutOverride ||
    chemical?.sourceChemical?.__printLayoutOverride ||
    null;

  if (!override) return layout;

  return resolvePrintLayoutConfig({
    ...layout,
    ...override,
    template: override.template || layout.template,
  });
};

const inspectSupplementalContentFitForContents = (
  contents,
  layout = {},
  locale = "zh",
  customLabelFields = {},
) => {
  const maxTextWeight = getMaxSupplementalTextWeight(layout);
  const maxPictograms = getMaxSupplementalPictogramCount(layout);
  return contents.flatMap((content) => {
    const issues = [
      ...inspectCustomIdentityFields(customLabelFields, layout, content.index),
    ];
    if ((content.counts?.pictograms || 0) > maxPictograms) {
      issues.push({
        type: "too-many-pictograms-for-stock",
        index: content.index,
        pictogramCount: content.counts.pictograms,
        maxPictograms,
      });
    }

    const textWeight = estimateSupplementalPrintContentTextWeight(
      content,
      layout,
      locale,
      customLabelFields,
    );

    if (textWeight <= maxTextWeight) return issues;

    return [
      ...issues,
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
  const contentOptions = buildContentOptions(model);
  const sheetIssues = [];
  const page = layout?.page || {};
  const gridWidthMm = Number(page.gridWidthMm || 0);
  const gridHeightMm = Number(page.gridHeightMm || 0);
  const contentWidthMm = Number(page.contentWidthMm || 0);
  const contentHeightMm = Number(page.contentHeightMm || 0);
  if (gridWidthMm > 0 && contentWidthMm > 0 && gridWidthMm > contentWidthMm + 0.2) {
    sheetIssues.push({
      type: "sheet-grid-width-overflow",
      gridWidthMm,
      contentWidthMm,
    });
  }
  if (gridHeightMm > 0 && contentHeightMm > 0 && gridHeightMm > contentHeightMm + 0.2) {
    sheetIssues.push({
      type: "sheet-grid-height-overflow",
      gridHeightMm,
      contentHeightMm,
    });
  }

  const labelIssues = model.expandedLabels.flatMap((chemical, index) => {
    const labelLayout = getEffectiveLabelLayoutForContentFit(chemical, layout);
    const content = {
      index,
      ...buildPrintLabelContent(chemical, {
        ...contentOptions,
        layout: labelLayout,
      }),
    };

    if (!isCompletePrimaryLayout(labelLayout)) {
      return inspectSupplementalContentFitForContents(
        [content],
        labelLayout,
        locale,
        model.customLabelFields,
      );
    }

    const maxStatements = getMaxCompleteStatementCount(labelLayout);
    const maxTextWeight = getMaxCompleteTextWeight(labelLayout);
    const issues = [];
    if (content.counts.statements > maxStatements) {
      issues.push({
        type: "content-too-dense",
        index: content.index,
        statementCount: content.counts.statements,
        maxStatements,
      });
    }

    const textWeight = estimatePrintContentTextWeight(
      content,
      labelLayout,
      locale,
    );
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

  return [...sheetIssues, ...labelIssues];
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
  customLabelFields = {},
  resolvedLabProfile = {},
  locale = "zh",
} = {}) {
  const contents = buildPrintLabelContents(selectedForLabel, {
    customGHSSettings,
    resolvedLabProfile,
    layout,
    locale,
  });
  const hasProfile = hasResponsibleProfile(resolvedLabProfile);
  const maxStatements = getMaxCompleteStatementCount(layout || {});
  const maxTextWeight = getMaxCompleteTextWeight(layout || {});
  const maxLineUnits = getMaxCompleteLineUnits(layout || {});
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
  const maxLineUnitsScore = contents.reduce(
    (max, content) =>
      Math.max(max, estimatePrintContentLineUnits(content, layout || {}, locale)),
    0,
  );
  const isCompletePrimary = isCompletePrimaryLayout(layout);
  const isDense =
    isCompletePrimary &&
    (maxStatementCount > maxStatements ||
      maxTextWeightScore > maxTextWeight ||
      maxLineUnitsScore > maxLineUnits);
  const supplementalFitIssues = isCompletePrimary
    ? []
    : inspectSupplementalContentFitForContents(
        contents,
        layout || {},
        locale,
        customLabelFields,
      );
  const isSupplementalDense = supplementalFitIssues.length > 0;
  const isFullPagePrimary = isFullPagePrimaryLayout(layout);
  const elementSummary = summarizeElements(
    contents,
    resolvedLabProfile,
    isCompletePrimary,
  );
  const contentPolicy = resolvePrintContentPolicy(layout || {}, {
    locale,
    continuation: isDense && isFullPagePrimary,
  });

  if (contents.length === 0) {
    return {
      state: PRINT_READINESS_STATE.PENDING_SELECTION,
      canPrint: false,
      recommendedAction: PRINT_RECOMMENDED_ACTION.SELECT_LABELS,
      contents,
      contentPolicy,
      elementSummary,
      maxStatements,
      maxStatementCount,
      maxTextWeight,
      maxTextWeightScore,
      maxLineUnits,
      maxLineUnitsScore,
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
    if (maxLineUnitsScore > maxLineUnits) {
      issues.push({
        type: "content-line-too-dense",
        lineUnits: maxLineUnitsScore,
        maxLineUnits,
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
      contentPolicy,
      elementSummary,
      maxStatements,
      maxStatementCount,
      maxTextWeight,
      maxTextWeightScore,
      maxLineUnits,
      maxLineUnitsScore,
      issues,
    };
  }

  if (isSupplementalDense) {
    return {
      state: PRINT_READINESS_STATE.BLOCKED_INVALID,
      canPrint: false,
      recommendedAction: PRINT_RECOMMENDED_ACTION.USE_FULL_PAGE_PRIMARY,
      contents,
      contentPolicy,
      elementSummary,
      maxStatements,
      maxStatementCount,
      maxTextWeight,
      maxTextWeightScore,
      maxLineUnits,
      maxLineUnitsScore,
      issues,
    };
  }

  if (!isCompletePrimary) {
    return {
      state: PRINT_READINESS_STATE.SUPPLEMENTAL_ONLY,
      canPrint: true,
      recommendedAction: PRINT_RECOMMENDED_ACTION.REVIEW_SUPPLEMENTAL,
      contents,
      contentPolicy,
      elementSummary,
      maxStatements,
      maxStatementCount,
      maxTextWeight,
      maxTextWeightScore,
      maxLineUnits,
      maxLineUnitsScore,
      issues,
    };
  }

  if (!hasProfile) {
    return {
      state: PRINT_READINESS_STATE.NEEDS_PROFILE,
      canPrint: false,
      recommendedAction: PRINT_RECOMMENDED_ACTION.ADD_PROFILE,
      contents,
      contentPolicy,
      elementSummary,
      maxStatements,
      maxStatementCount,
      maxTextWeight,
      maxTextWeightScore,
      maxLineUnits,
      maxLineUnitsScore,
      issues,
    };
  }

  if (isDense && isFullPagePrimary) {
    return {
      state: PRINT_READINESS_STATE.NEEDS_CONTINUATION,
      canPrint: false,
      recommendedAction: PRINT_RECOMMENDED_ACTION.CREATE_CONTINUATION,
      contents,
      contentPolicy,
      elementSummary,
      maxStatements,
      maxStatementCount,
      maxTextWeight,
      maxTextWeightScore,
      maxLineUnits,
      maxLineUnitsScore,
      issues,
    };
  }

  return {
    state: PRINT_READINESS_STATE.READY_COMPLETE,
    canPrint: true,
    recommendedAction: PRINT_RECOMMENDED_ACTION.PRINT,
    contents,
    contentPolicy,
    elementSummary,
    maxStatements,
    maxStatementCount,
    maxTextWeight,
    maxTextWeightScore,
    maxLineUnits,
    maxLineUnitsScore,
    issues,
  };
}
