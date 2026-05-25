import { FileSpreadsheet } from "lucide-react";
import {
  BATCH_CATEGORY_TONE,
  READINESS_TONE_CLASSES,
  getBatchCategoryLabel,
  getBatchReasonLabel,
  getBatchRepresentativeLabel,
} from "@/components/label-print/labelPrintModalHelpers";
import { BATCH_PRINT_ITEM_CATEGORY } from "@/utils/printBatchPlanner";

export default function BatchFitReport({
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
  currentStockName,
  handleExportBatchReviewList,
  setBatchIncludeReducedPurpose,
  setBatchPreviewItemIndex,
  setBatchPreviewRepresentative,
  tx,
}) {
  if (!batchPrintPlan) return null;

  const countItems = [
    {
      key: "ready",
      label: tx("label.batchReady", "Ready"),
      value:
        batchPrintPlan.summary.counts[BATCH_PRINT_ITEM_CATEGORY.READY] +
        batchPrintPlan.summary.counts[BATCH_PRINT_ITEM_CATEGORY.READY_TIGHT],
      tone: "ready",
    },
    {
      key: "review",
      label: tx("label.batchReview", "Needs review"),
      value: batchPrintPlan.summary.requiresAcknowledgement,
      tone: batchPrintPlan.summary.requiresAcknowledgement > 0 ? "caution" : "neutral",
    },
    {
      key: "excluded",
      label: tx("label.batchExcluded", "Excluded"),
      value: batchPrintPlan.summary.excluded,
      tone: batchPrintPlan.summary.excluded > 0 ? "danger" : "neutral",
    },
  ];

  return (
    <div
      className="mt-3 rounded-md border border-slate-200 bg-white/80 p-3"
      data-testid="batch-fit-report"
    >
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <div className="text-xs font-semibold uppercase tracking-normal text-slate-500">
            {tx("label.batchFitReportTitle", "Batch fit report")}
          </div>
          <p className="mt-1 text-xs leading-5 text-slate-600">
            {tx(
              "label.batchFitReportBody",
              "One fixed stock is kept for this batch. Ready labels can print now; review or excluded labels stay visible before handoff.",
            )}
          </p>
        </div>
        <span
          className="shrink-0 rounded-full bg-slate-100 px-2 py-1 text-xs font-medium text-slate-700"
          data-testid="batch-fit-stock-purpose"
        >
          {batchPrintPurposeLabel} · {currentStockName}
        </span>
      </div>
      <div className="mt-3 grid gap-2 sm:grid-cols-3">
        {countItems.map((item) => (
          <div
            key={item.key}
            className={`rounded-md border px-3 py-2 ${
              READINESS_TONE_CLASSES[item.tone] ||
              READINESS_TONE_CLASSES.neutral
            }`}
            data-testid={`batch-fit-${item.key}`}
          >
            <div className="text-xs font-medium opacity-80">{item.label}</div>
            <div className="mt-1 text-lg font-semibold">{item.value}</div>
          </div>
        ))}
      </div>
      {batchPrintPlan.representatives.worstFit && (
        <p
          className="mt-2 text-xs leading-5 text-slate-500"
          data-testid="batch-fit-worst"
        >
          {tx("label.batchWorstFit", "Highest pressure")}:{" "}
          {batchPrintPlan.representatives.worstFit.identity}
        </p>
      )}
      {batchRepresentativeOptions.length > 0 && (
        <div
          className="mt-3 rounded-md border border-slate-200 bg-slate-50 p-2"
          data-testid="batch-preview-selector"
        >
          <div className="text-xs font-semibold uppercase tracking-normal text-slate-500">
            {tx("label.batchPreviewSelectorTitle", "Representative preview")}
          </div>
          <div className="mt-2 flex flex-wrap gap-2">
            {batchRepresentativeOptions.map((representative) => {
              const rep = batchPrintPlan.representatives[representative];
              const isActive =
                batchPreviewItemIndex === null &&
                batchPreviewRepresentative === representative;
              return (
                <button
                  key={representative}
                  type="button"
                  onClick={() => {
                    setBatchPreviewRepresentative(representative);
                    setBatchPreviewItemIndex(null);
                  }}
                  className={`rounded-md border px-2.5 py-1.5 text-xs font-medium transition-colors ${
                    isActive
                      ? "border-blue-300 bg-blue-50 text-blue-800"
                      : "border-slate-200 bg-white text-slate-600 hover:border-blue-200 hover:text-blue-700"
                  }`}
                  data-testid={`batch-preview-rep-${representative}`}
                >
                  {getBatchRepresentativeLabel(representative, tx)}
                  {rep?.identity ? (
                    <span className="ml-1 text-slate-400">
                      #{rep.index + 1}
                    </span>
                  ) : null}
                </button>
              );
            })}
          </div>
          {activeBatchPreviewItem && (
            <div
              className={`mt-2 rounded-md border px-3 py-2 text-xs ${
                READINESS_TONE_CLASSES[
                  BATCH_CATEGORY_TONE[activeBatchPreviewItem.category] ||
                    "neutral"
                ]
              }`}
              data-testid="batch-active-preview-summary"
            >
              <div className="font-semibold">
                {activeBatchPreviewItem.identity ||
                  activeBatchPreviewItem.cas ||
                  tx("label.batchUnnamedItem", "Selected item")}
              </div>
              <div className="mt-1 leading-5">
                {getBatchCategoryLabel(activeBatchPreviewItem.category, tx)}
                {activeBatchPreviewItem.reason
                  ? ` · ${getBatchReasonLabel(activeBatchPreviewItem.reason, tx)}`
                  : ""}
              </div>
            </div>
          )}
        </div>
      )}
      {batchReducedPurposeItems.length > 0 && (
        <div
          className="mt-3 rounded-md border border-amber-200 bg-amber-50/70 p-3"
          data-testid="batch-print-scope-controls"
        >
          <div className="text-xs font-semibold uppercase tracking-normal text-amber-800">
            {tx("label.batchPrintScopeTitle", "Print scope")}
          </div>
          <p className="mt-1 text-xs leading-5 text-amber-900/80">
            {tx(
              "label.batchPrintScopeBody",
              "Ready labels and required extra labels are included by default. Add compact fallback labels only if that is acceptable for this batch.",
            )}
          </p>
          <div className="mt-3 grid gap-2">
            <label className="flex items-start gap-2 rounded-md border border-amber-200 bg-white/80 px-3 py-2 text-xs text-slate-700">
              <input
                type="checkbox"
                className="mt-0.5 h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                checked={batchIncludeReducedPurpose}
                onChange={(event) =>
                  setBatchIncludeReducedPurpose(event.target.checked)
                }
                data-testid="batch-include-reduced-purpose"
              />
              <span>
                <span className="font-semibold text-slate-900">
                  {tx(
                    "label.batchIncludeReducedPurpose",
                    "Include compact fallback labels",
                  )}
                </span>
                <span className="ml-1 text-slate-500">
                  ({batchReducedPurposeItems.length})
                </span>
                <span className="block leading-5 text-slate-500">
                  {tx(
                    "label.batchIncludeReducedPurposeHint",
                    "These keep identity and pictograms on the chosen stock, but they are not complete A4/Letter labels.",
                  )}
                </span>
              </span>
            </label>
          </div>
          <div
            className="mt-2 rounded-md bg-white/70 px-3 py-2 text-xs font-medium text-amber-900"
            data-testid="batch-print-scope-summary"
          >
            {tx(
              "label.batchPrintScopeSummary",
              "{{count}} item(s) will print as {{purpose}} on {{stock}}; {{excluded}} excluded; {{review}} review item(s) not selected.",
              {
                count: batchSelectedPrintItems.length,
                purpose: batchPrintPurposeLabel,
                stock: currentStockName,
                excluded: batchPrintPlan.summary.excluded,
                review: batchUnselectedReviewCount,
              },
            )}
          </div>
        </div>
      )}
      {batchItemsNeedingReview.length > 0 && (
        <details
          className="mt-3 rounded-md border border-slate-200 bg-white p-2"
          data-testid="batch-review-list"
        >
          <summary className="flex cursor-pointer list-none items-center justify-between gap-3 text-xs font-semibold text-slate-700">
            <span>
              {tx(
                "label.batchReviewListTitle",
                "Items needing review or exclusion",
              )}
            </span>
            <span className="rounded-full bg-slate-100 px-2 py-1 text-slate-600">
              {batchItemsNeedingReview.length}
            </span>
          </summary>
          <div className="mt-3 flex flex-col gap-2">
            {batchItemsNeedingReview.slice(0, 12).map((item) => (
              <div
                key={`${item.index}-${item.cas}`}
                className="grid gap-2 rounded-md border border-slate-200 bg-slate-50 p-2 text-xs sm:grid-cols-[minmax(0,1fr)_auto]"
                data-testid={`batch-review-item-${item.index}`}
              >
                <div className="min-w-0">
                  <div className="truncate font-semibold text-slate-800">
                    #{item.index + 1} {item.identity || item.cas}
                  </div>
                  <div className="mt-1 leading-5 text-slate-600">
                    {getBatchCategoryLabel(item.category, tx)} ·{" "}
                    {getBatchReasonLabel(item.reason, tx)}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setBatchPreviewItemIndex(item.index)}
                  className="inline-flex items-center justify-center rounded-md border border-slate-300 bg-white px-2.5 py-1.5 font-medium text-slate-700 transition-colors hover:border-blue-200 hover:text-blue-700"
                  data-testid={`batch-review-preview-${item.index}`}
                >
                  {tx("label.batchPreviewItemAction", "Preview")}
                </button>
              </div>
            ))}
            {batchItemsNeedingReview.length > 12 && (
              <div className="rounded-md bg-slate-50 px-3 py-2 text-xs text-slate-500">
                {tx(
                  "label.batchReviewListMore",
                  "{{count}} more item(s) in the exported review list",
                  { count: batchItemsNeedingReview.length - 12 },
                )}
              </div>
            )}
            <button
              type="button"
              onClick={handleExportBatchReviewList}
              className="inline-flex w-fit items-center gap-2 rounded-md border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-700 transition-colors hover:border-blue-200 hover:text-blue-700"
              data-testid="batch-export-review-list"
            >
              <FileSpreadsheet className="h-4 w-4" />
              {tx("label.batchExportReviewList", "Export review list")}
            </button>
          </div>
        </details>
      )}
    </div>
  );
}
