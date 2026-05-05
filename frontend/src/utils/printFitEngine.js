import {
  PRINT_LABEL_ELEMENT_STATUS,
  buildPrintLabelContents,
  countResponsibleProfileFields,
  hasResponsibleProfile,
} from "@/utils/printContentModel";
import { isFullPagePrimaryStockId } from "@/constants/labelStocks";

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
  if (layout.widthMm >= 170 && layout.heightMm >= 200) return 36;
  if (layout.size === "large") return 18;
  if (layout.size === "medium") return 10;
  return 6;
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

export function inspectPrintContentFit(model) {
  if (!model?.expandedLabels?.length) return [];
  const { layout } = model;
  if (!isCompletePrimaryLayout(layout)) {
    return [];
  }

  const maxStatements = getMaxCompleteStatementCount(layout);
  return buildPrintLabelContents(model.expandedLabels, buildContentOptions(model))
    .filter((content) => content.counts.statements > maxStatements)
    .map((content) => ({
      type: "content-too-dense",
      index: content.index,
      statementCount: content.counts.statements,
      maxStatements,
    }));
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
} = {}) {
  const contents = buildPrintLabelContents(selectedForLabel, {
    customGHSSettings,
    resolvedLabProfile,
    layout,
  });
  const hasProfile = hasResponsibleProfile(resolvedLabProfile);
  const maxStatements = getMaxCompleteStatementCount(layout || {});
  const maxStatementCount = contents.reduce(
    (max, content) => Math.max(max, content.counts.statements),
    0,
  );
  const isCompletePrimary = isCompletePrimaryLayout(layout);
  const isDense = isCompletePrimary && maxStatementCount > maxStatements;
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
      issues: [],
    };
  }

  const issues = [];
  if (isDense) {
    issues.push({
      type: "content-too-dense",
      statementCount: maxStatementCount,
      maxStatements,
    });
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
    issues,
  };
}
