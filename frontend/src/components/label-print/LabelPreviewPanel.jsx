import { AlertTriangle, FileText } from "lucide-react";
import LabelPreviewSection from "@/components/label-print/LabelPreviewSection";
import PreviewDiagnosticsPanel from "@/components/label-print/PreviewDiagnosticsPanel";
import { PrintOutcomeSummary } from "@/components/label-print/LabelPrintOutcomeSections";

export default function LabelPreviewPanel({
  activeBatchPreviewItem,
  activePreviewPageIndex,
  canUseFullPagePrimary,
  currentStockName,
  handleFocusResponsibleProfile,
  handleUseFullPagePrimary,
  hasMultiplePreviewPages,
  hasPreviewWarnings,
  isPrintFitBlocked,
  isProfileBlocked,
  labelFragmentPreviewHeight,
  labelPreviewBundle,
  layoutProfile,
  onUseSupplementalLabel,
  outputChecklistBadge,
  outputChecklistHint,
  outputChecklistItems,
  outputChecklistTitle,
  outputOutcomeBody,
  outputOutcomeTitle,
  outputOutcomeTone,
  outputRoleSummary,
  pictogramSummary,
  plannedPrintPageCount,
  previewChem,
  previewContextOutputSummary,
  previewFitLabel,
  previewNavigationCount,
  previewPageLabel,
  previewPagePositionLabel,
  previewPhysicalSizeLabel,
  previewScaleLabel,
  previewZoomMode,
  primaryPreviewRisk,
  readyPreviewMessage,
  setPreviewZoomMode,
  sheetPreviewBundle,
  sheetPreviewHeight,
  shouldShowPreviewOutcomeSummary,
  statementSummary,
  stockPresetDisplay,
  t,
  tx,
  updatePreviewPageIndex,
  useFullPagePrimaryLabel,
  visiblePreviewRisks,
}) {
  return (
    <aside className="order-first border-t border-slate-200 bg-slate-50/70 lg:order-none lg:min-h-0 lg:overflow-y-auto lg:border-l lg:border-t-0">
      <div
        className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm"
        data-testid="label-preview-panel"
      >
        <div className="border-b border-slate-200 px-4 py-3">
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="text-xs font-semibold uppercase text-slate-500">
                {tx("label.previewTitle", "Live preview")}
              </div>
              <h3 className="mt-1 text-base font-semibold text-slate-950">
                {activeBatchPreviewItem
                  ? tx(
                      "label.previewFocusBatchRepresentative",
                      "Previewing a batch representative",
                    )
                  : previewChem
                    ? tx(
                        "label.previewFocusFilled",
                        "Previewing the first selected label",
                      )
                    : tx(
                        "label.previewFocusEmptyTitle",
                        "No chemical selected yet",
                      )}
              </h3>
              <p className="mt-1 text-xs text-slate-600">
                {activeBatchPreviewItem
                  ? tx(
                      "label.previewFocusBatchBody",
                      "The preview follows the selected representative item, while the sheet view shows the current selected batch print scope.",
                    )
                  : previewChem
                    ? tx(
                        "label.previewFocusBody",
                        "This is the label fragment that will be printed.",
                      )
                    : tx(
                        "label.previewFocusEmptyBody",
                        "Select at least one chemical to preview real content density.",
                      )}
              </p>
            </div>
            <span className="rounded-full bg-slate-100 px-2 py-1 text-xs text-slate-600">
              {layoutProfile.stockPreset === "custom"
                ? tx("label.stockPresetCustom", "Custom tuning")
                : stockPresetDisplay.name || layoutProfile.stockPresetName}
            </span>
          </div>

          <div
            className="mt-3 grid gap-2 text-xs sm:grid-cols-3"
            data-testid="preview-context-strip"
          >
            {[
              {
                key: "role",
                label: tx("label.previewContextOutput", "Output"),
                value: previewContextOutputSummary,
              },
              {
                key: "icons",
                label: tx("label.previewContextIcons", "GHS icons"),
                value: pictogramSummary,
              },
              {
                key: "stock",
                label: tx("label.previewContextStock", "Stock"),
                value: currentStockName,
              },
            ].map((item) => (
              <div
                key={item.key}
                className="min-w-0 rounded-md border border-slate-200 bg-slate-50 px-2.5 py-2"
                data-testid={`preview-context-${item.key}`}
              >
                <div className="font-semibold uppercase text-slate-500">
                  {item.label}
                </div>
                <div className="mt-0.5 min-w-0 break-words font-medium leading-5 text-slate-800">
                  {item.value}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="space-y-4 px-4 py-4">
          {shouldShowPreviewOutcomeSummary && (
            <PrintOutcomeSummary
              outputOutcomeTone={outputOutcomeTone}
              outputOutcomeTitle={outputOutcomeTitle}
              outputOutcomeBody={outputOutcomeBody}
              isProfileBlocked={isProfileBlocked}
              currentStockName={currentStockName}
              outputRoleSummary={outputRoleSummary}
              pictogramSummary={pictogramSummary}
              statementSummary={statementSummary}
              onFocusResponsibleProfile={handleFocusResponsibleProfile}
              onUseSupplementalLabel={onUseSupplementalLabel}
              tx={tx}
            />
          )}

          <LabelPreviewSection
            activePreviewPageIndex={activePreviewPageIndex}
            hasMultiplePreviewPages={hasMultiplePreviewPages}
            labelFragmentPreviewHeight={labelFragmentPreviewHeight}
            labelPreviewBundle={labelPreviewBundle}
            previewFitLabel={previewFitLabel}
            previewNavigationCount={previewNavigationCount}
            previewPageLabel={previewPageLabel}
            previewPagePositionLabel={previewPagePositionLabel}
            previewPhysicalSizeLabel={previewPhysicalSizeLabel}
            previewScaleLabel={previewScaleLabel}
            previewZoomMode={previewZoomMode}
            setPreviewZoomMode={setPreviewZoomMode}
            tx={tx}
            updatePreviewPageIndex={updatePreviewPageIndex}
          />

          {previewChem && hasPreviewWarnings && primaryPreviewRisk && (
            <section
              className={`rounded-lg border p-3 text-sm ${
                isPrintFitBlocked
                  ? "border-red-200 bg-red-50 text-red-900"
                  : "border-amber-200 bg-amber-50 text-amber-900"
              }`}
              data-testid="preview-warning-banner"
            >
              <div className="flex items-start gap-2">
                <AlertTriangle
                  className={`mt-0.5 h-4 w-4 shrink-0 ${
                    isPrintFitBlocked ? "text-red-600" : "text-amber-500"
                  }`}
                />
                <div>
                  <div className="font-semibold">
                    {isPrintFitBlocked
                      ? tx("label.previewBlockingTitle", "Printing blocked")
                      : tx("label.previewReviewTitle", "Review before printing")}
                  </div>
                  <div className="mt-1 leading-5">{primaryPreviewRisk}</div>
                  {canUseFullPagePrimary && (
                    <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-center">
                      <button
                        type="button"
                        onClick={handleUseFullPagePrimary}
                        className="inline-flex items-center justify-center gap-2 rounded-md bg-blue-700 px-3 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-800"
                        data-testid="use-full-page-primary-banner"
                      >
                        <FileText className="h-4 w-4" />
                        {useFullPagePrimaryLabel}
                      </button>
                      <span className="text-xs leading-5 text-red-800">
                        {tx(
                          "label.useFullPagePrimaryHint",
                          "Keeps all pictograms and complete statements on a complete full-page primary label.",
                        )}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            </section>
          )}

          <PreviewDiagnosticsPanel
            isPreviewChecklistReady={visiblePreviewRisks[0] === readyPreviewMessage}
            layoutProfile={layoutProfile}
            outputChecklistBadge={outputChecklistBadge}
            outputChecklistHint={outputChecklistHint}
            outputChecklistItems={outputChecklistItems}
            outputChecklistTitle={outputChecklistTitle}
            plannedPrintPageCount={plannedPrintPageCount}
            sheetPreviewBundle={sheetPreviewBundle}
            sheetPreviewHeight={sheetPreviewHeight}
            t={t}
            tx={tx}
            visiblePreviewRisks={visiblePreviewRisks}
          />
        </div>
      </div>
    </aside>
  );
}
