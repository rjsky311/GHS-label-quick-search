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
  plannedPrintLabelCount,
  plannedPrintPageCount,
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
      className="mt-3 rounded-md border border-[hsl(var(--notebook-rule)/0.7)] bg-[hsl(var(--notebook-surface)/0.68)] p-3 text-[hsl(var(--notebook-ink))]"
      data-testid="batch-fit-report"
    >
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <div className="text-xs font-semibold uppercase tracking-normal text-[hsl(var(--notebook-muted-ink))]">
            {tx("label.batchFitReportTitle", "Batch fit report")}
          </div>
          <p className="mt-1 text-xs leading-5 text-[hsl(var(--notebook-muted-ink))]">
            {tx(
              "label.batchFitReportBody",
              "One fixed stock is kept for this batch. Ready labels can print now; review or excluded labels stay visible before handoff.",
            )}
          </p>
        </div>
        <span
          className="shrink-0 rounded-full bg-[hsl(var(--notebook-surface)/0.72)] px-2 py-1 text-xs font-medium text-[hsl(var(--notebook-muted-ink))] ring-1 ring-[hsl(var(--notebook-border)/0.38)]"
          data-testid="batch-fit-stock-purpose"
        >
          {batchPrintPurposeLabel} / {currentStockName}
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
      {batchSelectedPrintItems.length > 0 && (
        <div
          className="mt-3 grid gap-2 rounded-md border border-[hsl(var(--notebook-action-border)/0.28)] bg-[hsl(var(--notebook-action-soft)/0.62)] p-2 text-xs text-[hsl(var(--notebook-ink))] sm:grid-cols-3"
          data-testid="batch-output-contract"
          data-selected-items={batchSelectedPrintItems.length}
          data-output-labels={plannedPrintLabelCount}
          data-output-pages={plannedPrintPageCount}
        >
          <div className="rounded-md bg-[hsl(var(--notebook-surface)/0.76)] px-3 py-2 ring-1 ring-[hsl(var(--notebook-action-border)/0.18)]">
            <div className="font-medium opacity-70">
              {tx("label.batchOutputSelected", "Selected to print")}
            </div>
            <div className="mt-0.5 font-semibold">
              {tx("label.batchOutputSelectedValue", "{{count}} item(s)", {
                count: batchSelectedPrintItems.length,
              })}
            </div>
          </div>
          <div className="rounded-md bg-[hsl(var(--notebook-surface)/0.76)] px-3 py-2 ring-1 ring-[hsl(var(--notebook-action-border)/0.18)]">
            <div className="font-medium opacity-70">
              {tx("label.batchOutputPhysical", "Physical output")}
            </div>
            <div className="mt-0.5 font-semibold">
              {tx(
                "label.batchOutputPhysicalValue",
                "{{labels}} label(s) / {{pages}} page(s)",
                {
                  labels: plannedPrintLabelCount,
                  pages: plannedPrintPageCount,
                },
              )}
            </div>
          </div>
          <div className="rounded-md bg-[hsl(var(--notebook-surface)/0.76)] px-3 py-2 ring-1 ring-[hsl(var(--notebook-action-border)/0.18)]">
            <div className="font-medium opacity-70">
              {tx("label.batchOutputStock", "Fixed stock")}
            </div>
            <div className="mt-0.5 font-semibold">
              {batchPrintPurposeLabel} / {currentStockName}
            </div>
          </div>
        </div>
      )}
      {batchPrintPlan.representatives.worstFit && (
        <p
          className="mt-2 text-xs leading-5 text-[hsl(var(--notebook-muted-ink))]"
          data-testid="batch-fit-worst"
        >
          {tx("label.batchWorstFit", "Highest pressure")}:{" "}
          {batchPrintPlan.representatives.worstFit.identity}
        </p>
      )}
      {batchRepresentativeOptions.length > 0 && (
        <div
          className="mt-3 rounded-md border border-[hsl(var(--notebook-rule)/0.7)] bg-[hsl(var(--notebook-surface)/0.58)] p-2"
          data-testid="batch-preview-selector"
        >
          <div className="text-xs font-semibold uppercase tracking-normal text-[hsl(var(--notebook-muted-ink))]">
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
                      ? "border-[hsl(var(--notebook-action-border)/0.72)] bg-[hsl(var(--notebook-action-soft)/0.78)] text-[hsl(var(--notebook-action))]"
                      : "border-[hsl(var(--notebook-border)/0.5)] bg-[hsl(var(--notebook-surface-raised)/0.86)] text-[hsl(var(--notebook-muted-ink))] hover:border-[hsl(var(--notebook-action-border)/0.52)] hover:text-[hsl(var(--notebook-action))]"
                  }`}
                  data-testid={`batch-preview-rep-${representative}`}
                >
                  {getBatchRepresentativeLabel(representative, tx)}
                  {rep?.identity ? (
                    <span className="ml-1 text-[hsl(var(--notebook-muted-ink)/0.74)]">
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
                  ? ` / ${getBatchReasonLabel(activeBatchPreviewItem.reason, tx)}`
                  : ""}
              </div>
            </div>
          )}
        </div>
      )}
      {batchReducedPurposeItems.length > 0 && (
        <div
          className="mt-3 rounded-md border border-[hsl(var(--notebook-warning)/0.42)] bg-[hsl(var(--notebook-warning-soft)/0.68)] p-3"
          data-testid="batch-print-scope-controls"
        >
          <div className="text-xs font-semibold uppercase tracking-normal text-[hsl(var(--notebook-warning))]">
            {tx("label.batchPrintScopeTitle", "Print scope")}
          </div>
          <p className="mt-1 text-xs leading-5 text-[hsl(var(--notebook-ink))]">
            {tx(
              "label.batchPrintScopeBody",
              "Ready labels and required extra labels are included by default. Add compact fallback labels only if that is acceptable for this batch.",
            )}
          </p>
          <div className="mt-3 grid gap-2">
            <label className="flex items-start gap-2 rounded-md border border-[hsl(var(--notebook-warning)/0.34)] bg-[hsl(var(--notebook-surface)/0.76)] px-3 py-2 text-xs text-[hsl(var(--notebook-ink))]">
              <input
                type="checkbox"
                className="mt-0.5 h-4 w-4 rounded border-[hsl(var(--notebook-border))] text-[hsl(var(--notebook-action))] focus:ring-[hsl(var(--notebook-action-border))]"
                checked={batchIncludeReducedPurpose}
                onChange={(event) =>
                  setBatchIncludeReducedPurpose(event.target.checked)
                }
                data-testid="batch-include-reduced-purpose"
              />
              <span>
                <span className="font-semibold text-[hsl(var(--notebook-ink))]">
                  {tx(
                    "label.batchIncludeReducedPurpose",
                    "Include compact fallback labels",
                  )}
                </span>
                <span className="ml-1 text-[hsl(var(--notebook-muted-ink))]">
                  ({batchReducedPurposeItems.length})
                </span>
                <span className="block leading-5 text-[hsl(var(--notebook-muted-ink))]">
                  {tx(
                    "label.batchIncludeReducedPurposeHint",
                    "These keep identity and pictograms on the chosen stock, but they are not complete A4/Letter labels.",
                  )}
                </span>
              </span>
            </label>
          </div>
          <div
            className="mt-2 rounded-md bg-[hsl(var(--notebook-surface)/0.72)] px-3 py-2 text-xs font-medium text-[hsl(var(--notebook-warning))]"
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
          className="mt-3 rounded-md border border-[hsl(var(--notebook-rule)/0.7)] bg-[hsl(var(--notebook-surface)/0.68)] p-2"
          data-testid="batch-review-list"
        >
          <summary className="flex cursor-pointer list-none items-center justify-between gap-3 text-xs font-semibold text-[hsl(var(--notebook-ink))]">
            <span>
              {tx(
                "label.batchReviewListTitle",
                "Items needing review or exclusion",
              )}
            </span>
            <span className="rounded-full bg-[hsl(var(--notebook-surface)/0.72)] px-2 py-1 text-[hsl(var(--notebook-muted-ink))] ring-1 ring-[hsl(var(--notebook-border)/0.38)]">
              {batchItemsNeedingReview.length}
            </span>
          </summary>
          <div className="mt-3 flex flex-col gap-2">
            {batchItemsNeedingReview.slice(0, 12).map((item) => (
              <div
                key={`${item.index}-${item.cas}`}
                className="grid gap-2 rounded-md border border-[hsl(var(--notebook-rule)/0.64)] bg-[hsl(var(--notebook-surface)/0.58)] p-2 text-xs sm:grid-cols-[minmax(0,1fr)_auto]"
                data-testid={`batch-review-item-${item.index}`}
              >
                <div className="min-w-0">
                  <div className="truncate font-semibold text-[hsl(var(--notebook-ink))]">
                    #{item.index + 1} {item.identity || item.cas}
                  </div>
                  <div className="mt-1 leading-5 text-[hsl(var(--notebook-muted-ink))]">
                    {getBatchCategoryLabel(item.category, tx)} /{" "}
                    {getBatchReasonLabel(item.reason, tx)}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setBatchPreviewItemIndex(item.index)}
                  className="inline-flex items-center justify-center rounded-md border border-[hsl(var(--notebook-border)/0.58)] bg-[hsl(var(--notebook-surface-raised)/0.86)] px-2.5 py-1.5 font-medium text-[hsl(var(--notebook-muted-ink))] transition-colors hover:border-[hsl(var(--notebook-action-border)/0.52)] hover:text-[hsl(var(--notebook-action))]"
                  data-testid={`batch-review-preview-${item.index}`}
                >
                  {tx("label.batchPreviewItemAction", "Preview")}
                </button>
              </div>
            ))}
            {batchItemsNeedingReview.length > 12 && (
              <div className="rounded-md bg-[hsl(var(--notebook-surface)/0.58)] px-3 py-2 text-xs text-[hsl(var(--notebook-muted-ink))]">
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
              className="inline-flex w-fit items-center gap-2 rounded-md border border-[hsl(var(--notebook-border)/0.58)] bg-[hsl(var(--notebook-surface-raised)/0.86)] px-3 py-2 text-xs font-semibold text-[hsl(var(--notebook-muted-ink))] transition-colors hover:border-[hsl(var(--notebook-action-border)/0.52)] hover:text-[hsl(var(--notebook-action))]"
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
