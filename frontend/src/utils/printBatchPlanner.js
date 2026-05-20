import { resolvePrintLayoutConfig } from "@/constants/labelStocks";
import { buildPrintLabelContent } from "@/utils/printContentModel";
import {
  PRINT_READINESS_STATE,
  estimatePrintContentTextWeight,
  evaluatePrintReadiness,
  getMaxSupplementalPictogramCount,
} from "@/utils/printFitEngine";
import { resolveTrustedChineseName } from "@/utils/ghsText";

export const BATCH_PRINT_PURPOSE = Object.freeze({
  QUICK_ID: "quick_id",
  SUPPLEMENTAL: "supplemental",
  COMPLETE: "complete",
});

export const BATCH_PRINT_ITEM_CATEGORY = Object.freeze({
  READY: "ready",
  READY_TIGHT: "ready-tight",
  REDUCED_PURPOSE: "reduced-purpose",
  SAME_STOCK_CONTINUATION: "same-stock-continuation",
  EXCLUDED_DATA: "excluded-data",
  EXCLUDED_FIT: "excluded-fit",
});

export const BATCH_PRINT_REPRESENTATIVE = Object.freeze({
  FIRST: "first",
  WORST_FIT: "worstFit",
  LONGEST_NAME: "longestName",
  MOST_PICTOGRAMS: "mostPictograms",
  DENSEST_TEXT: "densestText",
  EXCLUDED: "excluded",
});

export const BATCH_PRINT_SCOPE = Object.freeze({
  READY_ONLY: "ready-only",
  READY_AND_ACKNOWLEDGED: "ready-and-acknowledged",
});

const CATEGORY_ORDER = Object.values(BATCH_PRINT_ITEM_CATEGORY);

const PURPOSE_PATCHES = {
  [BATCH_PRINT_PURPOSE.QUICK_ID]: {
    labelPurpose: "quickId",
    template: "icon",
  },
  [BATCH_PRINT_PURPOSE.SUPPLEMENTAL]: {
    labelPurpose: "qrSupplement",
    template: "qrcode",
  },
  [BATCH_PRINT_PURPOSE.COMPLETE]: {
    labelPurpose: "shipping",
    template: "full",
  },
};

const PRINTABLE_CATEGORIES = new Set([
  BATCH_PRINT_ITEM_CATEGORY.READY,
  BATCH_PRINT_ITEM_CATEGORY.READY_TIGHT,
  BATCH_PRINT_ITEM_CATEGORY.SAME_STOCK_CONTINUATION,
]);

const ACKNOWLEDGED_CATEGORIES = new Set([
  BATCH_PRINT_ITEM_CATEGORY.REDUCED_PURPOSE,
]);

const EXCLUDED_CATEGORIES = new Set([
  BATCH_PRINT_ITEM_CATEGORY.EXCLUDED_DATA,
  BATCH_PRINT_ITEM_CATEGORY.EXCLUDED_FIT,
]);

const resolvePurposeFromLayout = (layout = {}) => {
  if (layout.labelPurpose === "quickId" || layout.template === "icon") {
    return BATCH_PRINT_PURPOSE.QUICK_ID;
  }
  if (layout.labelPurpose === "qrSupplement" || layout.template === "qrcode") {
    return BATCH_PRINT_PURPOSE.SUPPLEMENTAL;
  }
  if (layout.template === "full") return BATCH_PRINT_PURPOSE.COMPLETE;
  return BATCH_PRINT_PURPOSE.SUPPLEMENTAL;
};

const normalizePurpose = (purpose, layout) =>
  Object.values(BATCH_PRINT_PURPOSE).includes(purpose)
    ? purpose
    : resolvePurposeFromLayout(layout);

const normalizeLayoutInput = (layout = {}) => {
  const stockPreset = layout.stockPreset || layout.stockId || layout.stock?.id;
  return {
    ...layout,
    stockPreset,
    labelWidthMm: layout.labelWidthMm ?? layout.widthMm,
    labelHeightMm: layout.labelHeightMm ?? layout.heightMm,
  };
};

export function resolveBatchPurposeLayout(
  layout = {},
  purpose = BATCH_PRINT_PURPOSE.SUPPLEMENTAL,
  { autoFitLevel } = {},
) {
  const normalizedPurpose = normalizePurpose(purpose, layout);
  return resolvePrintLayoutConfig({
    ...normalizeLayoutInput(layout),
    ...PURPOSE_PATCHES[normalizedPurpose],
    autoFitLevel: autoFitLevel ?? layout.autoFitLevel ?? 0,
  });
}

const hasHazardContent = (content) =>
  Boolean(
    content?.counts?.pictograms ||
      content?.counts?.hazardStatements ||
      content?.counts?.precautionaryStatements ||
      content?.signalWord,
  );

const hasHazardText = (content) =>
  Boolean(
    content?.counts?.hazardStatements ||
      content?.counts?.precautionaryStatements,
  );

const identityText = (content = {}) =>
  [
    content.identity,
    content.effectiveChemical?.name_en,
    resolveTrustedChineseName(content.effectiveChemical),
    content.effectiveChemical?.name,
    content.cas,
  ]
    .map((value) => String(value || "").trim())
    .find(Boolean) || "";

const buildReason = (type, details = {}) => ({ type, ...details });

const dataIssueForContent = (content, purpose) => {
  const chemical = content.effectiveChemical || {};

  if (chemical.upstream_error) {
    return buildReason("upstream-error");
  }

  if (!hasHazardContent(content)) {
    return buildReason("missing-hazard-data");
  }

  if (
    purpose === BATCH_PRINT_PURPOSE.QUICK_ID &&
    content.counts.pictograms === 0 &&
    hasHazardText(content)
  ) {
    return buildReason("text-only-ghs-needs-hazard-text");
  }

  return null;
};

const readinessIsPrintableForPurpose = (readiness, purpose) => {
  if (purpose === BATCH_PRINT_PURPOSE.COMPLETE) {
    return readiness.state === PRINT_READINESS_STATE.READY_COMPLETE;
  }
  return (
    readiness.state === PRINT_READINESS_STATE.SUPPLEMENTAL_ONLY &&
    readiness.canPrint
  );
};

const evaluateItemAtFitLevel = ({
  chemical,
  layout,
  purpose,
  autoFitLevel,
  customGHSSettings,
  customLabelFields,
  resolvedLabProfile,
  locale,
}) => {
  const resolvedLayout = resolveBatchPurposeLayout(layout, purpose, {
    autoFitLevel,
  });
  const readiness = evaluatePrintReadiness({
    selectedForLabel: [chemical],
    layout: resolvedLayout,
    customGHSSettings,
    customLabelFields,
    resolvedLabProfile,
    locale,
  });

  return { layout: resolvedLayout, readiness, autoFitLevel };
};

const evaluateItemWithAutoFit = ({
  chemical,
  layout,
  purpose,
  maxAutoFitLevel,
  customGHSSettings,
  customLabelFields,
  resolvedLabProfile,
  locale,
}) => {
  const attempts = [];
  for (let autoFitLevel = 0; autoFitLevel <= maxAutoFitLevel; autoFitLevel += 1) {
    const attempt = evaluateItemAtFitLevel({
      chemical,
      layout,
      purpose,
      autoFitLevel,
      customGHSSettings,
      customLabelFields,
      resolvedLabProfile,
      locale,
    });
    attempts.push(attempt);
    if (readinessIsPrintableForPurpose(attempt.readiness, purpose)) {
      return { ...attempt, attempts };
    }
  }
  return { ...attempts[attempts.length - 1], attempts };
};

const highestPressure = (
  readiness = {},
  content = {},
  layout = {},
  locale = "zh",
) => {
  const textWeight = estimatePrintContentTextWeight(
    content,
    layout,
    locale,
  );
  const maxTextWeight = Math.max(1, readiness.maxTextWeight || 1);
  const maxStatements = Math.max(1, readiness.maxStatements || 1);
  const maxPictograms = Math.max(1, getMaxSupplementalPictogramCount(layout));

  return Math.max(
    textWeight / maxTextWeight,
    (content.counts?.statements || 0) / maxStatements,
    (content.counts?.pictograms || 0) / maxPictograms,
  );
};

const metricsForItem = (content, readiness, layout, locale) => {
  const textWeight = estimatePrintContentTextWeight(content, layout, locale);
  return {
    identityLength: identityText(content).length,
    pictogramCount: content.counts?.pictograms || 0,
    statementCount: content.counts?.statements || 0,
    textWeight,
    fitPressure: highestPressure(readiness, content, layout, locale),
  };
};

const reasonsFromReadiness = (readiness = {}) =>
  (readiness.issues || []).map((issue) =>
    buildReason(issue.type || "print-readiness-issue", issue),
  );

const firstReasonOfType = (reasons, type) =>
  reasons.find((reason) => reason.type === type);

const profileMissingReason = (readiness) =>
  firstReasonOfType(reasonsFromReadiness(readiness), "responsible-profile-missing");

const classifyAs = ({
  category,
  reason,
  item,
  preferredPurpose,
  alternatePurpose = null,
  effectivePurpose = preferredPurpose,
  continuation = false,
}) => ({
  ...item,
  category,
  reason: reason || null,
  reasons: reason ? [reason] : [],
  preferredPurpose,
  effectivePurpose,
  alternatePurpose,
  continuation,
  includedByDefault: PRINTABLE_CATEGORIES.has(category),
  requiresAcknowledgement: ACKNOWLEDGED_CATEGORIES.has(category),
  excluded: EXCLUDED_CATEGORIES.has(category),
});

const printMetaForItem = (item) => ({
  category: item.category,
  preferredPurpose: item.preferredPurpose,
  effectivePurpose: item.effectivePurpose,
  alternatePurpose: item.alternatePurpose,
  reasonType: item.reason?.type || "",
});

const withBatchPrintMetadata = (item, layoutOverride = item.layout) => ({
  ...item.chemical,
  __batchPrintItem: printMetaForItem(item),
  __printLayoutOverride: layoutOverride || item.layout || null,
});

export function buildBatchPrintableItems(
  plan,
  {
    includeReducedPurpose = false,
    includeContinuation = false,
    scope = BATCH_PRINT_SCOPE.READY_ONLY,
  } = {},
) {
  if (!plan?.items?.length) return [];

  const includeAcknowledged =
    scope === BATCH_PRINT_SCOPE.READY_AND_ACKNOWLEDGED;

  return plan.items.flatMap((item) => {
    if (item.includedByDefault) {
      return [withBatchPrintMetadata(item)];
    }

    if (
      item.category === BATCH_PRINT_ITEM_CATEGORY.REDUCED_PURPOSE &&
      (includeAcknowledged || includeReducedPurpose) &&
      item.alternateAttempt?.layout
    ) {
      return [withBatchPrintMetadata(item, item.alternateAttempt.layout)];
    }

    if (
      item.category === BATCH_PRINT_ITEM_CATEGORY.SAME_STOCK_CONTINUATION &&
      (includeAcknowledged || includeContinuation)
    ) {
      return [withBatchPrintMetadata(item)];
    }

    return [];
  });
}

const buildBaseItem = ({
  chemical,
  index,
  content,
  layout,
  readiness,
  autoFitLevel,
  locale,
}) => ({
  index,
  chemical,
  cas: content.cas || chemical.cas_number || "",
  identity: identityText(content),
  layout,
  readiness,
  autoFitLevel,
  tightened: autoFitLevel > 0,
  metrics: metricsForItem(content, readiness, layout, locale),
});

const classifyPrintableAttempt = ({
  baseItem,
  purpose,
  autoFitLevel,
}) =>
  classifyAs({
    category:
      autoFitLevel > 0
        ? BATCH_PRINT_ITEM_CATEGORY.READY_TIGHT
        : BATCH_PRINT_ITEM_CATEGORY.READY,
    item: baseItem,
    preferredPurpose: purpose,
  });

const evaluateAlternatePurpose = (options, alternatePurpose) => {
  const attempt = evaluateItemWithAutoFit({
    ...options,
    purpose: alternatePurpose,
  });
  return readinessIsPrintableForPurpose(attempt.readiness, alternatePurpose)
    ? attempt
    : null;
};

function classifyBatchItem({
  chemical,
  index,
  layout,
  purpose,
  maxAutoFitLevel,
  customGHSSettings,
  customLabelFields,
  resolvedLabProfile,
  locale,
}) {
  const firstLayout = resolveBatchPurposeLayout(layout, purpose, {
    autoFitLevel: 0,
  });
  const content = buildPrintLabelContent(chemical, {
    customGHSSettings,
    resolvedLabProfile,
    layout: firstLayout,
    locale,
  });
  const dataIssue = dataIssueForContent(content, purpose);

  const commonEvalOptions = {
    chemical,
    layout,
    maxAutoFitLevel,
    customGHSSettings,
    customLabelFields,
    resolvedLabProfile,
    locale,
  };
  const attempt = evaluateItemWithAutoFit({
    ...commonEvalOptions,
    purpose,
  });
  const baseItem = buildBaseItem({
    chemical,
    index,
    content,
    layout: attempt.layout,
    readiness: attempt.readiness,
    autoFitLevel: attempt.autoFitLevel,
    locale,
  });

  if (dataIssue) {
    return classifyAs({
      category: BATCH_PRINT_ITEM_CATEGORY.EXCLUDED_DATA,
      reason: dataIssue,
      item: baseItem,
      preferredPurpose: purpose,
    });
  }

  if (readinessIsPrintableForPurpose(attempt.readiness, purpose)) {
    return classifyPrintableAttempt({
      baseItem,
      purpose,
      autoFitLevel: attempt.autoFitLevel,
    });
  }

  if (purpose === BATCH_PRINT_PURPOSE.COMPLETE) {
    const missingProfile = profileMissingReason(attempt.readiness);
    if (missingProfile) {
      return classifyAs({
        category: BATCH_PRINT_ITEM_CATEGORY.EXCLUDED_DATA,
        reason: missingProfile,
        item: baseItem,
        preferredPurpose: purpose,
      });
    }

    if (attempt.readiness.state === PRINT_READINESS_STATE.NEEDS_CONTINUATION) {
      return classifyAs({
        category: BATCH_PRINT_ITEM_CATEGORY.SAME_STOCK_CONTINUATION,
        reason: buildReason("complete-content-needs-continuation"),
        item: baseItem,
        preferredPurpose: purpose,
        continuation: true,
      });
    }

    const supplementalAttempt = evaluateAlternatePurpose(
      commonEvalOptions,
      BATCH_PRINT_PURPOSE.SUPPLEMENTAL,
    );
    if (supplementalAttempt) {
      return classifyAs({
        category: BATCH_PRINT_ITEM_CATEGORY.REDUCED_PURPOSE,
        reason: buildReason("complete-content-too-dense-for-stock"),
        item: {
          ...baseItem,
          alternateAttempt: supplementalAttempt,
        },
        preferredPurpose: purpose,
        alternatePurpose: BATCH_PRINT_PURPOSE.SUPPLEMENTAL,
        effectivePurpose: BATCH_PRINT_PURPOSE.SUPPLEMENTAL,
      });
    }

    const quickIdAttempt = evaluateAlternatePurpose(
      commonEvalOptions,
      BATCH_PRINT_PURPOSE.QUICK_ID,
    );
    if (quickIdAttempt) {
      return classifyAs({
        category: BATCH_PRINT_ITEM_CATEGORY.REDUCED_PURPOSE,
        reason: buildReason("complete-content-too-dense-for-stock"),
        item: {
          ...baseItem,
          alternateAttempt: quickIdAttempt,
        },
        preferredPurpose: purpose,
        alternatePurpose: BATCH_PRINT_PURPOSE.QUICK_ID,
        effectivePurpose: BATCH_PRINT_PURPOSE.QUICK_ID,
      });
    }
  }

  if (purpose === BATCH_PRINT_PURPOSE.SUPPLEMENTAL) {
    const quickIdAttempt = evaluateAlternatePurpose(
      commonEvalOptions,
      BATCH_PRINT_PURPOSE.QUICK_ID,
    );
    if (quickIdAttempt) {
      return classifyAs({
        category: BATCH_PRINT_ITEM_CATEGORY.REDUCED_PURPOSE,
        reason: buildReason("supplemental-content-too-dense-for-stock"),
        item: {
          ...baseItem,
          alternateAttempt: quickIdAttempt,
        },
        preferredPurpose: purpose,
        alternatePurpose: BATCH_PRINT_PURPOSE.QUICK_ID,
        effectivePurpose: BATCH_PRINT_PURPOSE.QUICK_ID,
      });
    }
  }

  return classifyAs({
    category: BATCH_PRINT_ITEM_CATEGORY.EXCLUDED_FIT,
    reason:
      reasonsFromReadiness(attempt.readiness)[0] ||
      buildReason("critical-content-does-not-fit-stock"),
    item: baseItem,
    preferredPurpose: purpose,
  });
}

const emptyCounts = () =>
  CATEGORY_ORDER.reduce((acc, category) => {
    acc[category] = 0;
    return acc;
  }, {});

const summarizeItems = (items) => {
  const counts = emptyCounts();
  items.forEach((item) => {
    counts[item.category] += 1;
  });

  const printableByDefault = items.filter((item) => item.includedByDefault);
  const requiresAcknowledgement = items.filter(
    (item) => item.requiresAcknowledgement,
  );
  const excluded = items.filter((item) => item.excluded);

  return {
    total: items.length,
    counts,
    printableByDefault: printableByDefault.length,
    requiresAcknowledgement: requiresAcknowledgement.length,
    excluded: excluded.length,
    canPrintDefaultScope: printableByDefault.length > 0,
  };
};

const selectMax = (items, metricName) =>
  items.reduce((selected, item) => {
    if (!selected) return item;
    return item.metrics[metricName] > selected.metrics[metricName]
      ? item
      : selected;
  }, null);

const representativeView = (item) =>
  item
    ? {
        index: item.index,
        cas: item.cas,
        identity: item.identity,
        category: item.category,
        preferredPurpose: item.preferredPurpose,
        effectivePurpose: item.effectivePurpose,
        metrics: item.metrics,
        reason: item.reason,
      }
    : null;

const buildRepresentatives = (items) => {
  const nonExcluded = items.filter((item) => !item.excluded);
  const candidateItems = nonExcluded.length ? nonExcluded : items;
  const excludedItems = items.filter((item) => item.excluded);

  return {
    [BATCH_PRINT_REPRESENTATIVE.FIRST]: representativeView(candidateItems[0]),
    [BATCH_PRINT_REPRESENTATIVE.WORST_FIT]: representativeView(
      selectMax(candidateItems, "fitPressure"),
    ),
    [BATCH_PRINT_REPRESENTATIVE.LONGEST_NAME]: representativeView(
      selectMax(candidateItems, "identityLength"),
    ),
    [BATCH_PRINT_REPRESENTATIVE.MOST_PICTOGRAMS]: representativeView(
      selectMax(candidateItems, "pictogramCount"),
    ),
    [BATCH_PRINT_REPRESENTATIVE.DENSEST_TEXT]: representativeView(
      selectMax(candidateItems, "textWeight"),
    ),
    [BATCH_PRINT_REPRESENTATIVE.EXCLUDED]: representativeView(excludedItems[0]),
  };
};

export function buildBatchPrintPlan({
  selectedForLabel = [],
  layout = {},
  purpose,
  maxAutoFitLevel = 2,
  customGHSSettings = {},
  customLabelFields = {},
  resolvedLabProfile = {},
  locale = "zh",
} = {}) {
  const selectedPurpose = normalizePurpose(purpose, layout);
  const fixedLayout = resolveBatchPurposeLayout(layout, selectedPurpose, {
    autoFitLevel: 0,
  });
  const items = selectedForLabel.map((chemical, index) =>
    classifyBatchItem({
      chemical,
      index,
      layout: fixedLayout,
      purpose: selectedPurpose,
      maxAutoFitLevel,
      customGHSSettings,
      customLabelFields,
      resolvedLabProfile,
      locale,
    }),
  );

  return {
    purpose: selectedPurpose,
    stockPreset: fixedLayout.stockPreset,
    stockId: fixedLayout.stockId,
    layout: fixedLayout,
    items,
    summary: summarizeItems(items),
    representatives: buildRepresentatives(items),
  };
}
