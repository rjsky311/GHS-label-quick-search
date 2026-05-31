import {
  inspectPrintContentFit,
} from "@/utils/printFitEngine";
import { inspectPrintLayoutDocument } from "@/utils/printLayoutInspection";
import {
  MAX_CONTINUATION_TIGHTNESS_LEVEL,
  clampAutoFitLevel,
  clampContinuationTightnessLevel,
  isFullPagePrimaryLayout,
} from "@/utils/printDocumentLayoutHelpers";

export const AUTO_FIT_RETRY_ISSUE_TYPES = new Set([
  "label-overflow",
  "compliance-core-overflow",
  "compliance-alert-overflow",
  "compliance-statements-overflow",
  "compliance-hazards-overflow",
  "compliance-precautions-overflow",
  "compliance-pictograms-overflow",
  "compliance-footer-clipped",
  "cas-overflow",
  "cas-chip-overflow",
  "cas-value-overflow",
  "case-chip-overflow",
  "case-value-overflow",
  "support-chip-overflow",
  "custom-fields-overflow",
  "name-section-overflow",
  "standard-rail-overflow",
  "standard-main-overflow",
  "standard-hazard-board-overflow",
  "hazard-list-overflow",
  "hazard-summary-overflow",
  "hazard-code-list-overflow",
  "signal-overflow",
  "qr-panel-overflow",
  "qr-caption-overflow",
  "statement-code-overflow",
  "content-text-too-dense",
  "supplemental-content-too-dense",
]);

export const CONTINUATION_TIGHTENING_ISSUE_TYPES = new Set([
  "label-overflow",
  "compliance-core-overflow",
  "compliance-statements-overflow",
  "compliance-hazards-overflow",
  "compliance-precautions-overflow",
  "compliance-footer-clipped",
  "statement-code-overflow",
]);

export function collectPrintPreflightIssues(
  documentBundle,
  iframeDoc,
  imageLoadIssues = [],
) {
  return [
    ...inspectPrintContentFit(documentBundle.model),
    ...inspectPrintLayoutDocument(iframeDoc),
    ...imageLoadIssues,
  ];
}

export const hasRequiredImageFailure = (preflightIssues = []) =>
  preflightIssues.some((issue) => issue?.type === "required-image-failed");

export const shouldRetryWithAutoFit = (preflightIssues = [], layout = {}) =>
  clampAutoFitLevel(layout.autoFitLevel) < 4 &&
  preflightIssues.some((issue) =>
    AUTO_FIT_RETRY_ISSUE_TYPES.has(issue?.type),
  ) &&
  !hasRequiredImageFailure(preflightIssues);

export const shouldRetryWithContinuationTightening = (
  preflightIssues = [],
  layout = {},
) =>
  isFullPagePrimaryLayout(layout) &&
  preflightIssues.some((issue) =>
    CONTINUATION_TIGHTENING_ISSUE_TYPES.has(issue?.type),
  ) &&
  !hasRequiredImageFailure(preflightIssues);

export function getContinuationRetryIssueCasNumbers(
  documentBundle,
  preflightIssues = [],
) {
  const labels = documentBundle?.model?.expandedLabels || [];
  return [
    ...new Set(
      preflightIssues
        .filter((issue) => CONTINUATION_TIGHTENING_ISSUE_TYPES.has(issue?.type))
        .map((issue) => {
          const index = Number(issue?.index);
          if (!Number.isInteger(index) || index < 0 || index >= labels.length) {
            return "";
          }
          const label = labels[index];
          const sourceChemical = label?.sourceChemical || label;
          return sourceChemical?.cas_number || "";
        })
        .filter(Boolean),
    ),
  ];
}

export function getChemicalContinuationTightnessLevel(chemical) {
  return clampContinuationTightnessLevel(
    chemical?.__printLayoutOverride?.__continuationTightnessLevel ??
      chemical?.__printLayoutOverride?.continuationTightnessLevel,
  );
}

export function applyTargetedContinuationTightness(
  selectedForLabel,
  issueCasNumbers,
  nextContinuationTightnessLevel,
) {
  const issueCasSet = new Set(issueCasNumbers || []);
  if (!issueCasSet.size) return selectedForLabel;

  return selectedForLabel.map((chemical) => {
    if (!issueCasSet.has(chemical?.cas_number)) return chemical;
    const existingOverride = chemical.__printLayoutOverride || {};
    return {
      ...chemical,
      __printLayoutOverride: {
        ...existingOverride,
        __continuationTightnessLevel: nextContinuationTightnessLevel,
        continuationTightnessLevel: nextContinuationTightnessLevel,
      },
    };
  });
}

export function getContinuationTighteningRetry(
  documentBundle,
  preflightIssues = [],
  selectedForLabel = [],
) {
  if (
    !shouldRetryWithContinuationTightening(
      preflightIssues,
      documentBundle?.model?.layout,
    )
  ) {
    return null;
  }

  const issueCasNumbers = getContinuationRetryIssueCasNumbers(
    documentBundle,
    preflightIssues,
  );
  const currentContinuationTightnessLevel = issueCasNumbers.length
    ? Math.max(
        0,
        ...selectedForLabel
          .filter((chemical) => issueCasNumbers.includes(chemical?.cas_number))
          .map(getChemicalContinuationTightnessLevel),
      )
    : clampContinuationTightnessLevel(
        documentBundle.model.layout.continuationTightnessLevel,
      );
  const nextContinuationTightnessLevel =
    currentContinuationTightnessLevel + 1;

  if (nextContinuationTightnessLevel > MAX_CONTINUATION_TIGHTNESS_LEVEL) {
    return null;
  }

  return {
    issueCasNumbers,
    nextContinuationTightnessLevel,
    targeted: issueCasNumbers.length > 0,
  };
}

export function resolvePrintPreflightRetry({
  documentBundle,
  preflightIssues = [],
  selectedForLabel = [],
  labelConfig = {},
}) {
  const layout = documentBundle?.model?.layout || {};
  if (shouldRetryWithAutoFit(preflightIssues, layout)) {
    const nextAutoFitLevel = clampAutoFitLevel(layout.autoFitLevel) + 1;
    return {
      type: "auto-fit",
      eventName: "print_autofit_retry",
      selectedForLabel,
      labelConfig: {
        ...labelConfig,
        autoFitLevel: nextAutoFitLevel,
      },
      meta: {
        nextAutoFitLevel,
      },
    };
  }

  const continuationRetry = getContinuationTighteningRetry(
    documentBundle,
    preflightIssues,
    selectedForLabel,
  );
  if (!continuationRetry) return null;

  const {
    issueCasNumbers,
    nextContinuationTightnessLevel,
    targeted,
  } = continuationRetry;

  return {
    type: "continuation-tightening",
    eventName: "print_continuation_tightening_retry",
    selectedForLabel: targeted
      ? applyTargetedContinuationTightness(
          selectedForLabel,
          issueCasNumbers,
          nextContinuationTightnessLevel,
        )
      : selectedForLabel,
    labelConfig: targeted
      ? {
          ...labelConfig,
          autoFitLevel: layout.autoFitLevel,
        }
      : {
          ...labelConfig,
          autoFitLevel: layout.autoFitLevel,
          __continuationTightnessLevel: nextContinuationTightnessLevel,
        },
    meta: {
      issueCasNumbers,
      nextContinuationTightnessLevel,
      targeted,
    },
  };
}
