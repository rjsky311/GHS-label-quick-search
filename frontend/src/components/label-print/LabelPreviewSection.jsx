import { ChevronLeft, ChevronRight } from "lucide-react";

export default function LabelPreviewSection({
  activePreviewPageIndex,
  hasMultiplePreviewPages,
  labelFragmentPreviewHeight,
  labelPreviewBundle,
  previewFitLabel,
  previewNavigationCount,
  previewPageLabel,
  previewPagePositionLabel,
  previewPhysicalSizeLabel,
  previewScaleLabel,
  previewZoomMode,
  setPreviewZoomMode,
  tx,
  updatePreviewPageIndex,
}) {
  const previewZoomOptions = [
    {
      value: "fit",
      label: tx("label.previewZoomFit", "Fit"),
    },
    {
      value: "inspect",
      label: tx("label.previewZoomInspect", "Inspect"),
    },
  ];

  const previewInspectionItems = [
    {
      label: tx("label.previewFitStatus", "View"),
      value: previewFitLabel,
    },
    {
      label: tx("label.previewPhysicalSize", "Label size"),
      value: previewPhysicalSizeLabel,
    },
    {
      label: tx("label.previewScale", "Preview scale"),
      value: previewScaleLabel,
    },
    {
      label: tx("label.previewPaper", "Sheet"),
      value: previewPageLabel,
    },
  ];

  return (
    <section
      className="rounded-lg border border-slate-200 bg-white p-3"
      data-testid="primary-label-preview-section"
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div className="text-sm font-medium text-slate-800">
            {tx("label.previewLabelTitle", "Label preview")}
          </div>
          <p className="mt-1 text-xs leading-5 text-slate-500">
            {tx(
              "label.previewInspectionHint",
              "Fit shows the whole label first; inspect mode enlarges details for checking before printing.",
            )}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {hasMultiplePreviewPages && (
            <div
              className="inline-flex items-center gap-1 rounded-md border border-slate-200 bg-slate-50 p-1"
              data-testid="preview-page-controls"
              aria-label={tx("label.previewPageControls", "Preview pages")}
            >
              <button
                type="button"
                onClick={() => updatePreviewPageIndex(activePreviewPageIndex - 1)}
                disabled={activePreviewPageIndex <= 0}
                className="flex h-7 w-7 items-center justify-center rounded bg-white text-slate-600 shadow-sm ring-1 ring-slate-200 transition-colors hover:text-blue-700 disabled:cursor-not-allowed disabled:opacity-40"
                aria-label={tx("label.previewPreviousPage", "Previous preview page")}
                data-testid="preview-page-prev"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <span className="min-w-16 px-2 text-center text-xs font-semibold text-slate-700">
                {previewPagePositionLabel}
              </span>
              <button
                type="button"
                onClick={() => updatePreviewPageIndex(activePreviewPageIndex + 1)}
                disabled={activePreviewPageIndex >= previewNavigationCount - 1}
                className="flex h-7 w-7 items-center justify-center rounded bg-white text-slate-600 shadow-sm ring-1 ring-slate-200 transition-colors hover:text-blue-700 disabled:cursor-not-allowed disabled:opacity-40"
                aria-label={tx("label.previewNextPage", "Next preview page")}
                data-testid="preview-page-next"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          )}
          <div
            className="inline-flex rounded-md border border-slate-200 bg-slate-50 p-1"
            data-testid="preview-zoom-controls"
          >
            {previewZoomOptions.map((option) => (
              <button
                key={option.value}
                type="button"
                aria-pressed={previewZoomMode === option.value}
                onClick={() => setPreviewZoomMode(option.value)}
                className={`rounded px-2.5 py-1 text-xs font-medium transition-colors ${
                  previewZoomMode === option.value
                    ? "bg-white text-blue-700 shadow-sm ring-1 ring-blue-200"
                    : "text-slate-600 hover:bg-white"
                }`}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="sr-only">
        {tx(
          "label.previewRealFragmentHint",
          "This preview now reuses the same HTML fragment that gets written into the print document.",
        )}
      </div>

      <div className="mt-3 overflow-hidden rounded-lg border border-slate-200 bg-white shadow-inner">
        {labelPreviewBundle ? (
          <iframe
            title={tx("label.previewLabelTitle", "Label preview")}
            srcDoc={labelPreviewBundle.html}
            data-testid="label-fragment-preview"
            data-preview-mode={previewZoomMode}
            className="w-full bg-white"
            style={{ height: labelFragmentPreviewHeight }}
          />
        ) : (
          <div className="flex h-72 items-center justify-center px-4 text-sm text-slate-500">
            {tx(
              "label.previewFocusEmptyBody",
              "Select at least one chemical to preview real content density.",
            )}
          </div>
        )}
      </div>

      <div
        className="mt-3 grid gap-2 text-xs sm:grid-cols-2"
        data-testid="preview-inspection-strip"
      >
        {previewInspectionItems.map((item) => (
          <div
            key={item.label}
            className="rounded-md border border-slate-200 bg-slate-50 px-2.5 py-2"
          >
            <div className="font-semibold uppercase text-slate-500">
              {item.label}
            </div>
            <div className="mt-0.5 font-medium text-slate-800">
              {item.value}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
