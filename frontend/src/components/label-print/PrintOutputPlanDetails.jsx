import { ClipboardList, FileText } from "lucide-react";
import BatchFitReport from "@/components/label-print/BatchFitReport";
import { READINESS_TONE_CLASSES } from "@/components/label-print/labelPrintModalHelpers";

export default function PrintOutputPlanDetails({
  activeBatchPreviewItem,
  batchIncludeReducedPurpose,
  batchItemsNeedingReview,
  batchPreviewItemIndex,
  batchPreviewRepresentative,
  batchPrintPlan,
  batchPrintPurposeLabel,
  batchReducedPurposeItems,
  batchRepresentativeOptions,
  batchSelectedPrintItems,
  batchUnselectedReviewCount,
  canUseFullPagePrimary,
  currentStockName,
  decisionSummaryItems,
  handleExportBatchReviewList,
  handleUseFullPagePrimary,
  outputPlanBody,
  outputPlanTitle,
  outputPlanTone,
  outputRoleSummary,
  recoveryRoute,
  setBatchIncludeReducedPurpose,
  setBatchPreviewItemIndex,
  setBatchPreviewRepresentative,
  shouldOpenOutputPlanDetails,
  tx,
  useFullPagePrimaryLabel,
}) {
  return (
    <details
      open={shouldOpenOutputPlanDetails}
      className={`rounded-md border p-3 ${
        READINESS_TONE_CLASSES[outputPlanTone] ||
        READINESS_TONE_CLASSES.neutral
      }`}
      data-testid="print-output-plan"
    >
      <summary className="flex cursor-pointer list-none items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-normal opacity-80">
            <ClipboardList className="h-4 w-4 shrink-0" />
            {tx("label.outputPlanDetailsTitle", "Why this output was chosen")}
          </div>
          <div className="mt-1 text-sm font-semibold">{outputPlanTitle}</div>
        </div>
        <span className="shrink-0 rounded-full bg-white/70 px-2 py-1 text-xs font-medium ring-1 ring-current/10">
          {outputRoleSummary}
        </span>
      </summary>
      <div className="mt-3 flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="mt-1 text-xs leading-5 opacity-90">{outputPlanBody}</p>
        </div>
        {canUseFullPagePrimary && (
          <button
            type="button"
            onClick={handleUseFullPagePrimary}
            className="inline-flex shrink-0 items-center justify-center gap-2 rounded-md bg-blue-700 px-3 py-2 text-xs font-medium text-white transition-colors hover:bg-blue-800"
            data-testid="use-full-page-primary-plan"
          >
            <FileText className="h-4 w-4" />
            {useFullPagePrimaryLabel}
          </button>
        )}
      </div>
      {recoveryRoute && (
        <div
          className={`mt-3 rounded-md border px-3 py-2 ${
            READINESS_TONE_CLASSES[recoveryRoute.tone] ||
            READINESS_TONE_CLASSES.neutral
          }`}
          data-testid="print-recovery-route"
          data-recovery-kind={recoveryRoute.kind}
          data-current-stock={recoveryRoute.currentStock}
          data-target-stock={recoveryRoute.targetStock}
        >
          <div className="text-xs font-semibold uppercase tracking-normal opacity-80">
            {recoveryRoute.label}
          </div>
          <div className="mt-1 text-sm font-semibold">{recoveryRoute.value}</div>
          <p className="mt-1 text-xs leading-5 opacity-90">
            {recoveryRoute.description}
          </p>
        </div>
      )}
      <div
        className="mt-3 grid gap-2 sm:grid-cols-3"
        data-testid="print-decision-summary"
      >
        {decisionSummaryItems.map((item) => (
          <div
            key={item.key}
            className={`rounded-md border px-3 py-2 ${
              READINESS_TONE_CLASSES[item.tone] ||
              READINESS_TONE_CLASSES.neutral
            }`}
            data-testid={`print-decision-${item.key}`}
          >
            <div className="text-xs font-medium opacity-80">{item.label}</div>
            <div className="mt-1 text-sm font-semibold">{item.value}</div>
          </div>
        ))}
      </div>
      <BatchFitReport
        activeBatchPreviewItem={activeBatchPreviewItem}
        batchIncludeReducedPurpose={batchIncludeReducedPurpose}
        batchItemsNeedingReview={batchItemsNeedingReview}
        batchPreviewItemIndex={batchPreviewItemIndex}
        batchPreviewRepresentative={batchPreviewRepresentative}
        batchPrintPlan={batchPrintPlan}
        batchPrintPurposeLabel={batchPrintPurposeLabel}
        batchReducedPurposeItems={batchReducedPurposeItems}
        batchRepresentativeOptions={batchRepresentativeOptions}
        batchSelectedPrintItems={batchSelectedPrintItems}
        batchUnselectedReviewCount={batchUnselectedReviewCount}
        currentStockName={currentStockName}
        handleExportBatchReviewList={handleExportBatchReviewList}
        setBatchIncludeReducedPurpose={setBatchIncludeReducedPurpose}
        setBatchPreviewItemIndex={setBatchPreviewItemIndex}
        setBatchPreviewRepresentative={setBatchPreviewRepresentative}
        tx={tx}
      />
    </details>
  );
}
