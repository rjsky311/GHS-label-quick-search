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
        className="rounded-lg border border-slate-200 bg-white p-4"
        data-testid="preview-diagnostics"
      >
        <summary className="flex cursor-pointer list-none items-center justify-between gap-3 text-sm font-medium text-slate-800">
          <span className="flex items-center gap-2">
            <ClipboardList className="h-4 w-4 text-blue-600" />
            {tx("label.previewDiagnosticsTitle", "Output checks")}
          </span>
          <span className="rounded-full bg-slate-100 px-2 py-1 text-xs text-slate-600">
            {outputChecklistBadge}
          </span>
        </summary>

        <div className="mt-3 space-y-3">
          <section
            className="rounded-lg border border-slate-200 bg-white p-3"
            data-testid="required-output-checklist"
          >
            <div className="flex items-center justify-between gap-3">
              <div>
                <div className="text-sm font-medium text-slate-800">
                  {outputChecklistTitle}
                </div>
                <div className="mt-1 text-xs leading-5 text-slate-500">
                  {outputChecklistHint}
                </div>
              </div>
              <span className="rounded-full bg-slate-100 px-2 py-1 text-xs text-slate-600">
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

          <section className="rounded-lg border border-slate-200 bg-white p-4">
            <div className="flex items-center gap-2 text-sm font-medium text-slate-800">
              {isPreviewChecklistReady ? (
                <CheckCircle2 className="h-4 w-4 text-emerald-600" />
              ) : (
                <AlertTriangle className="h-4 w-4 text-amber-400" />
              )}
              {tx("label.previewChecklistTitle", "Preview checklist")}
            </div>
            <div className="mt-3 space-y-2 text-sm text-slate-700">
              {visiblePreviewRisks.map((risk) => (
                <div
                  key={risk}
                  className="rounded-md bg-slate-50 px-3 py-2 ring-1 ring-slate-200"
                >
                  {risk}
                </div>
              ))}
            </div>
          </section>

          <section className="rounded-lg bg-amber-50 p-4 text-sm text-amber-900">
            <div className="flex items-start gap-2">
              <Lightbulb className="mt-0.5 h-4 w-4 shrink-0 text-amber-400" />
              <span>{t("label.previewHint")}</span>
            </div>
          </section>
        </div>
      </details>

      <details className="rounded-lg border border-slate-200 bg-white p-4">
        <summary className="flex cursor-pointer list-none items-center justify-between gap-3 text-sm font-medium text-slate-800">
          <span className="flex items-center gap-2">
            <LayoutPanelTop className="h-4 w-4 text-blue-600" />
            {tx("label.previewSheetTitle", "Sheet layout")}
          </span>
          <span className="rounded-full bg-slate-100 px-2 py-1 text-xs text-slate-600">
            {layoutProfile.columns} x {layoutProfile.rows}
          </span>
        </summary>

        <div className="mt-3 flex flex-wrap gap-2 text-xs text-slate-400">
          <span>
            {layoutProfile.widthMm} x {layoutProfile.heightMm} mm
          </span>
          <span>
            {tx("label.previewPerPage", "{{count}}/page", {
              count: layoutProfile.perPage,
            })}
          </span>
          {plannedPrintPageCount > 0 && (
            <span>
              {tx("label.previewPageCount", "{{count}} page(s)", {
                count: plannedPrintPageCount,
              })}
            </span>
          )}
        </div>

        <div className="mt-4 overflow-auto rounded-lg border border-slate-200 bg-white shadow-inner">
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

        <div className="mt-3 grid grid-cols-2 gap-2 text-xs text-slate-600">
          <div className="rounded-md bg-slate-50 px-3 py-2 ring-1 ring-slate-200">
            {tx("label.previewPadding", "Padding")}:{" "}
            {layoutProfile.pagePaddingMm} mm
          </div>
          <div className="rounded-md bg-slate-50 px-3 py-2 ring-1 ring-slate-200">
            {tx("label.previewGap", "Gap")}: {layoutProfile.columnGapMm}/
            {layoutProfile.rowGapMm} mm
          </div>
          <div className="rounded-md bg-slate-50 px-3 py-2 ring-1 ring-slate-200">
            {tx("label.previewOffsetX", "Offset X")}: {layoutProfile.offsetXmm}{" "}
            mm
          </div>
          <div className="rounded-md bg-slate-50 px-3 py-2 ring-1 ring-slate-200">
            {tx("label.previewOffsetY", "Offset Y")}: {layoutProfile.offsetYmm}{" "}
            mm
          </div>
        </div>
      </details>
    </>
  );
}
