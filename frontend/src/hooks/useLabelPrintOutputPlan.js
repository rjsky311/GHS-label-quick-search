import { useMemo } from "react";
import {
  PRINT_OUTPUT_KIND,
  PRINT_OUTPUT_PLAN_STATE,
  buildPrintOutputPlan,
} from "@/utils/printOutputPlanner";
import {
  BATCH_PRINT_ITEM_CATEGORY,
  BATCH_PRINT_PURPOSE,
  buildBatchPrintableItems,
  buildBatchPrintPlan,
} from "@/utils/printBatchPlanner";

/**
 * Owns the print-plan derivation shared by the modal's readiness summary,
 * preview state, and batch handoff. Keeping this graph in one hook prevents
 * the modal from accidentally deriving a second, divergent output contract.
 */
export default function useLabelPrintOutputPlan({
  selectedForLabel,
  layout,
  customGHSSettings,
  customLabelFields,
  resolvedLabProfile,
  locale,
  labelPurpose,
  batchIncludeReducedPurpose,
}) {
  const outputPlan = useMemo(
    () =>
      buildPrintOutputPlan({
        selectedForLabel,
        layout,
        customGHSSettings,
        customLabelFields,
        resolvedLabProfile,
        locale,
      }),
    [
      selectedForLabel,
      layout,
      customGHSSettings,
      customLabelFields,
      resolvedLabProfile,
      locale,
    ],
  );
  const batchPrintPurpose =
    outputPlan.outputKind === PRINT_OUTPUT_KIND.COMPLETE_PRIMARY
      ? BATCH_PRINT_PURPOSE.COMPLETE
      : outputPlan.outputKind === PRINT_OUTPUT_KIND.QUICK_ID
        ? BATCH_PRINT_PURPOSE.QUICK_ID
        : BATCH_PRINT_PURPOSE.SUPPLEMENTAL;
  const batchPrintPlan = useMemo(
    () =>
      buildBatchPrintPlan({
        selectedForLabel,
        layout,
        purpose: batchPrintPurpose,
        customGHSSettings,
        customLabelFields,
        resolvedLabProfile,
        locale,
      }),
    [
      selectedForLabel,
      layout,
      batchPrintPurpose,
      customGHSSettings,
      customLabelFields,
      resolvedLabProfile,
      locale,
    ],
  );
  const hasBatchPrintPlan = selectedForLabel.length > 1;
  const batchReducedPurposeItems = hasBatchPrintPlan
    ? batchPrintPlan.items.filter(
        (item) => item.category === BATCH_PRINT_ITEM_CATEGORY.REDUCED_PURPOSE,
      )
    : [];
  const batchSelectedPrintItems = hasBatchPrintPlan
    ? buildBatchPrintableItems(batchPrintPlan, {
        includeReducedPurpose: batchIncludeReducedPurpose,
        includeContinuation: true,
      })
    : [];
  const canPrintBatchSelectedScope =
    hasBatchPrintPlan && batchSelectedPrintItems.length > 0;
  const batchAcknowledgedPrintCount = Math.max(
    0,
    batchSelectedPrintItems.length - batchPrintPlan.summary.printableByDefault,
  );
  const outputPlanState = outputPlan.state;
  const outputPlanHasUpstreamError = outputPlan.issues.some(
    (issue) => issue.type === "upstream-error",
  );
  const isQrSupplementOutput =
    labelPurpose === "qrSupplement" ||
    outputPlan.outputKind === PRINT_OUTPUT_KIND.QR_SUPPLEMENT;
  const isQuickIdOutput =
    labelPurpose === "quickId" ||
    outputPlan.outputKind === PRINT_OUTPUT_KIND.QUICK_ID;
  const isSmallLabelIdentityLocked = isQrSupplementOutput || isQuickIdOutput;
  const isSmallLabelContinuationBlocked =
    outputPlanState === PRINT_OUTPUT_PLAN_STATE.SMALL_LABEL_CONTINUATION_LIMIT;
  const smallLabelContinuationIssue = outputPlan.issues.find(
    (issue) => issue.type === "small-label-continuation-limit",
  );

  return {
    outputPlan,
    outputPlanState,
    outputPlanHasUpstreamError,
    batchPrintPurpose,
    batchPrintPlan,
    hasBatchPrintPlan,
    batchReducedPurposeItems,
    batchSelectedPrintItems,
    canPrintBatchSelectedScope,
    batchAcknowledgedPrintCount,
    isQrSupplementOutput,
    isQuickIdOutput,
    isSmallLabelIdentityLocked,
    isSmallLabelContinuationBlocked,
    smallLabelContinuationIssue,
    smallLabelContinuationPageCount: smallLabelContinuationIssue?.pageCount || 3,
    smallLabelContinuationMaxLabels: smallLabelContinuationIssue?.maxLabels || 2,
  };
}
