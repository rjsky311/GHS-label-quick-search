import {
  AlertTriangle,
  CheckCircle2,
  ClipboardList,
  LayoutPanelTop,
  Lightbulb,
} from "lucide-react";
import { READINESS_TONE_CLASSES } from "@/components/label-print/labelPrintModalHelpers";

export default function PreviewDiagnosticsPanel({
  isPreviewChecklistReady,
  layoutProfile,
  outputChecklistBadge,
  outputChecklistHint,
  outputChecklistItems,
  outputChecklistTitle,
  plannedPrintPageCount,
  sheetPreviewBundle,
  sheetPreviewHeight,
  t,
  tx,
  visiblePreviewRisks,
}) {
  return (
    <>
      <details
        className="notebook-panel rounded-md p-3"
        data-testid="preview-diagnostics"
      >
        <summary className="flex cursor-pointer list-none items-center justify-between gap-3 text-sm font-semibold text-[hsl(var(--notebook-ink))]">
          <span className="flex items-center gap-2">
            <ClipboardList className="h-4 w-4 text-[hsl(var(--notebook-action))]" />
            {tx("label.previewDiagnosticsTitle", "Output checks")}
          </span>
          <span className="notebook-chip rounded-full px-2 py-1 text-xs font-medium">
            {outputChecklistBadge}
          </span>
        </summary>

        <div className="mt-3 space-y-3">
          <section
            className="notebook-note rounded-md p-3"
            data-testid="required-output-checklist"
          >
            <div className="flex items-center justify-between gap-3">
              <div>
                <div className="text-sm font-semibold text-[hsl(var(--notebook-ink))]">
                  {outputChecklistTitle}
                </div>
                <div className="mt-1 text-xs leading-5 text-[hsl(var(--notebook-muted-ink))]">
                  {outputChecklistHint}
                </div>
              </div>
              <span className="notebook-chip shrink-0 rounded-full px-2 py-1 text-xs font-medium">
                {outputChecklistBadge}
              </span>
            </div>
            <div className="mt-3 grid grid-cols-2 gap-2">
              {outputChecklistItems.map((item) => (
                <div
                  key={item.key}
                  className={`rounded-md border px-3 py-2 ${READINESS_TONE_CLASSES[item.tone]}`}
                  data-testid={`required-output-${item.key}`}
                >
                  <div className="text-xs font-medium">{item.label}</div>
                  <div className="mt-1 text-sm font-semibold">{item.value}</div>
                  {item.description && (
                    <div className="mt-1 text-xs leading-4 opacity-80">
                      {item.description}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </section>

          <section className="rounded-md border border-[hsl(var(--notebook-border)/0.62)] bg-[hsl(var(--notebook-surface)/0.44)] p-3">
            <div className="flex items-center gap-2 text-sm font-semibold text-[hsl(var(--notebook-ink))]">
              {isPreviewChecklistReady ? (
                <CheckCircle2 className="h-4 w-4 text-emerald-600" />
              ) : (
                <AlertTriangle className="h-4 w-4 text-amber-400" />
              )}
              {tx("label.previewChecklistTitle", "Preview checklist")}
            </div>
            <div className="mt-3 space-y-2 text-sm text-[hsl(var(--notebook-ink))]">
              {visiblePreviewRisks.map((risk) => (
                <div
                  key={risk}
                  className="rounded-md bg-[hsl(var(--notebook-surface-raised)/0.75)] px-3 py-2 ring-1 ring-[hsl(var(--notebook-border)/0.54)]"
                >
                  {risk}
                </div>
              ))}
            </div>
          </section>

          <section className="rounded-md bg-amber-50 p-3 text-sm text-amber-900">
            <div className="flex items-start gap-2">
              <Lightbulb className="mt-0.5 h-4 w-4 shrink-0 text-amber-400" />
              <span>{t("label.previewHint")}</span>
            </div>
          </section>
        </div>
      </details>

      <details
        className="notebook-panel rounded-md p-3"
        data-testid="preview-sheet-layout"
      >
        <summary className="flex cursor-pointer list-none items-center justify-between gap-3 text-sm font-semibold text-[hsl(var(--notebook-ink))]">
          <span className="flex items-center gap-2">
            <LayoutPanelTop className="h-4 w-4 text-[hsl(var(--notebook-action))]" />
            {tx("label.previewSheetTitle", "Sheet layout")}
          </span>
          <span className="notebook-chip rounded-full px-2 py-1 text-xs font-medium">
            {layoutProfile.columns} x {layoutProfile.rows}
          </span>
        </summary>

        <div className="mt-3 flex flex-wrap gap-2 text-xs text-[hsl(var(--notebook-muted-ink))]">
          <span className="notebook-chip rounded-full px-2 py-1">
            {layoutProfile.widthMm} x {layoutProfile.heightMm} mm
          </span>
          <span className="notebook-chip rounded-full px-2 py-1">
            {tx("label.previewPerPage", "{{count}}/page", {
              count: layoutProfile.perPage,
            })}
          </span>
          {plannedPrintPageCount > 0 && (
            <span className="notebook-chip rounded-full px-2 py-1">
              {tx("label.previewPageCount", "{{count}} page(s)", {
                count: plannedPrintPageCount,
              })}
            </span>
          )}
        </div>

        <div className="mt-4 overflow-auto rounded-md border border-[hsl(var(--notebook-border)/0.72)] bg-white shadow-inner">
          {sheetPreviewBundle ? (
            <iframe
              title={tx("label.previewSheetTitle", "Sheet layout")}
              srcDoc={sheetPreviewBundle.html}
              data-testid="label-sheet-preview"
              className="w-full bg-white"
              style={{ height: sheetPreviewHeight }}
            />
          ) : (
            <div className="flex h-60 items-center justify-center px-4 text-sm text-slate-500">
              {tx(
                "label.previewFocusEmptyBody",
                "Select at least one chemical to preview real content density.",
              )}
            </div>
          )}
        </div>

        <details
          className="notebook-note mt-3 rounded-md px-3 py-2 text-xs"
          data-testid="preview-sheet-layout-metrics"
        >
          <summary className="cursor-pointer list-none font-medium text-[hsl(var(--notebook-ink))]">
            {tx("label.previewSheetMetricsTitle", "Alignment details")}
          </summary>
          <div className="mt-3 grid grid-cols-2 gap-2 text-[hsl(var(--notebook-muted-ink))]">
            <div className="rounded-md bg-[hsl(var(--notebook-surface)/0.52)] px-3 py-2 ring-1 ring-[hsl(var(--notebook-border)/0.5)]">
              {tx("label.previewPadding", "Padding")}:{" "}
              {layoutProfile.pagePaddingMm} mm
            </div>
            <div className="rounded-md bg-[hsl(var(--notebook-surface)/0.52)] px-3 py-2 ring-1 ring-[hsl(var(--notebook-border)/0.5)]">
              {tx("label.previewGap", "Gap")}: {layoutProfile.columnGapMm}/
              {layoutProfile.rowGapMm} mm
            </div>
            <div className="rounded-md bg-[hsl(var(--notebook-surface)/0.52)] px-3 py-2 ring-1 ring-[hsl(var(--notebook-border)/0.5)]">
              {tx("label.previewOffsetX", "Offset X")}:{" "}
              {layoutProfile.offsetXmm} mm
            </div>
            <div className="rounded-md bg-[hsl(var(--notebook-surface)/0.52)] px-3 py-2 ring-1 ring-[hsl(var(--notebook-border)/0.5)]">
              {tx("label.previewOffsetY", "Offset Y")}:{" "}
              {layoutProfile.offsetYmm} mm
            </div>
          </div>
        </details>
      </details>
    </>
  );
}
