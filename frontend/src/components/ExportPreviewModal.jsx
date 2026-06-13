import { useCallback, useEffect, useMemo, useState } from "react";
import { Download, FileSpreadsheet, FileText, Info, X } from "lucide-react";
import { useTranslation } from "react-i18next";
import useFocusTrap from "@/hooks/useFocusTrap";
import {
  EXPORT_SCOPE_KEYS,
  buildExportPreview,
  getExportScopeOptions,
} from "@/utils/exportRows";
import {
  modalViewportBodyClassName,
  modalViewportFooterClassName,
  modalViewportOverlayClassName,
  modalViewportPanelClassName,
} from "@/components/ui/modalViewport";

const FORMAT_OPTIONS = [
  { value: "xlsx", icon: FileSpreadsheet, labelKey: "exportPreview.xlsx" },
  { value: "csv", icon: FileText, labelKey: "exportPreview.csv" },
];

export default function ExportPreviewModal({
  results,
  allResults,
  initialFormat = "xlsx",
  onClose,
  onConfirm,
}) {
  const { t } = useTranslation();
  const [format, setFormat] = useState(initialFormat);
  const [selectedScope, setSelectedScope] = useState(EXPORT_SCOPE_KEYS.VISIBLE);
  const [submitting, setSubmitting] = useState(false);
  const handleClose = useCallback(() => {
    if (!submitting) {
      onClose();
    }
  }, [onClose, submitting]);
  const dialogRef = useFocusTrap(handleClose);
  const scopeOptions = useMemo(
    () =>
      getExportScopeOptions({
        allResults,
        visibleResults: results,
      }),
    [allResults, results],
  );
  const selectedScopeOption =
    scopeOptions.find((option) => option.key === selectedScope) ||
    scopeOptions.find((option) => option.key === EXPORT_SCOPE_KEYS.VISIBLE) ||
    scopeOptions[0];
  const scopedResults = useMemo(
    () => selectedScopeOption?.results || [],
    [selectedScopeOption],
  );
  const sourceTotalCount =
    Array.isArray(allResults) && allResults.length > 0
      ? allResults.length
      : Array.isArray(results)
        ? results.length
        : 0;
  const visibleCount = Array.isArray(results) ? results.length : 0;

  useEffect(() => {
    setFormat(initialFormat);
  }, [initialFormat]);

  useEffect(() => {
    if (!scopeOptions.some((option) => option.key === selectedScope)) {
      setSelectedScope(EXPORT_SCOPE_KEYS.VISIBLE);
    }
  }, [scopeOptions, selectedScope]);

  const preview = useMemo(
    () => buildExportPreview(scopedResults, { t, maxRows: 5 }),
    [scopedResults, t]
  );
  const exportSummary = preview.summary || {
    found: 0,
    ready: 0,
    needsReview: 0,
    unresolved: 0,
  };

  const handleConfirm = async () => {
    setSubmitting(true);
    let completed = false;
    try {
      await onConfirm(format, scopedResults, {
        scopeKey: selectedScopeOption.key,
        scopeLabel: t(selectedScopeOption.labelKey),
        count: scopedResults.length,
        totalCount: sourceTotalCount,
        visibleCount,
      });
      completed = true;
    } finally {
      setSubmitting(false);
    }
    if (completed) {
      onClose();
    }
  };

  return (
    <div
      className={modalViewportOverlayClassName("z-50")}
      onClick={handleClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="export-preview-title"
      data-testid="export-preview-modal"
    >
      <div
        ref={dialogRef}
        tabIndex={-1}
        className={modalViewportPanelClassName("max-w-5xl bg-white")}
        data-testid="export-preview-panel"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-start justify-between border-b border-slate-200 p-6">
          <div>
            <h2 id="export-preview-title" className="text-xl font-semibold text-slate-950">
              {t("exportPreview.title")}
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              {t("exportPreview.subtitle", {
                format: format.toUpperCase(),
                scope: t(selectedScopeOption.labelKey),
                count: preview.totalRows,
              })}
            </p>
          </div>
          <button
            type="button"
            onClick={handleClose}
            disabled={submitting}
            className="text-slate-400 hover:text-slate-700 disabled:cursor-not-allowed disabled:opacity-50"
            data-testid="export-preview-close"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        <div
          className={modalViewportBodyClassName("space-y-5 p-6")}
          data-testid="export-preview-body"
        >
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
            <div className="rounded-md border border-slate-200 bg-slate-50 p-3">
              <div className="text-xs font-medium uppercase tracking-[0.14em] text-slate-500">
                {t("exportPreview.scopeLabel")}
              </div>
              <div
                className="mt-1 text-sm font-semibold text-slate-950"
                data-testid="export-preview-scope-value"
              >
                {t("exportPreview.scopeValue", {
                  scope: t(selectedScopeOption.labelKey),
                  count: preview.totalRows,
                })}
              </div>
            </div>
            <div className="rounded-md border border-slate-200 bg-slate-50 p-3">
              <div className="text-xs font-medium uppercase tracking-[0.14em] text-slate-500">
                {t("exportPreview.readyLabel")}
              </div>
              <div
                className="mt-1 text-sm font-semibold text-emerald-800"
                data-testid="export-preview-summary-ready"
              >
                {t("exportPreview.readyCount", { count: exportSummary.ready })}
              </div>
            </div>
            <div className="rounded-md border border-amber-200 bg-amber-50 p-3">
              <div className="text-xs font-medium uppercase tracking-[0.14em] text-amber-700">
                {t("exportPreview.reviewLabel")}
              </div>
              <div
                className="mt-1 text-sm font-semibold text-amber-950"
                data-testid="export-preview-summary-review"
              >
                {t("exportPreview.reviewCount", {
                  count: exportSummary.needsReview,
                })}
              </div>
            </div>
            <div className="rounded-md border border-slate-200 bg-white p-3">
              <div className="text-xs font-medium uppercase tracking-[0.14em] text-slate-500">
                {t("exportPreview.unresolvedLabel")}
              </div>
              <div
                className="mt-1 text-sm font-semibold text-slate-950"
                data-testid="export-preview-summary-unresolved"
              >
                {t("exportPreview.unresolvedCount", {
                  count: exportSummary.unresolved,
                })}
              </div>
            </div>
            <div className="rounded-md border border-slate-200 bg-slate-50 p-3">
              <div className="text-xs font-medium uppercase tracking-[0.14em] text-slate-500">
                {t("exportPreview.columnsLabel")}
              </div>
              <div className="mt-1 text-sm font-semibold text-slate-950">
                {t("exportPreview.columnCount", { count: preview.headers.length })}
              </div>
            </div>
          </div>

          <div>
            <div className="mb-2 text-sm font-medium text-slate-700">
              {t("exportPreview.scopePicker")}
            </div>
            <div className="grid gap-2 md:grid-cols-5">
              {scopeOptions.map((option) => {
                const selected = option.key === selectedScope;
                const count = option.results.length;
                return (
                  <button
                    key={option.key}
                    type="button"
                    onClick={() => setSelectedScope(option.key)}
                    className={`notebook-control px-3 py-2 text-left text-sm transition-colors ${
                      selected
                        ? "notebook-control-primary"
                        : "notebook-control-secondary"
                    }`}
                    data-testid={`export-preview-scope-${option.key}`}
                  >
                    <span className="block font-semibold">
                      {t(option.labelKey)}
                    </span>
                    <span className="mt-1 block text-xs text-slate-500">
                      {t(option.bodyKey, { count })}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          <div>
            <div className="mb-2 text-sm font-medium text-slate-700">
              {t("exportPreview.format")}
            </div>
            <div className="flex flex-wrap gap-2">
              {FORMAT_OPTIONS.map(({ value, icon: Icon, labelKey }) => {
                const selected = format === value;
                return (
                  <button
                    key={value}
                    type="button"
                    onClick={() => setFormat(value)}
                    className={`notebook-control inline-flex items-center gap-2 px-3 py-2 text-sm font-medium transition-colors ${
                      selected
                        ? "notebook-control-primary"
                        : "notebook-control-secondary"
                    }`}
                    data-testid={`export-preview-format-${value}`}
                  >
                    <Icon className="h-4 w-4" />
                    {t(labelKey)}
                  </button>
                );
              })}
            </div>
            {format === "xlsx" ? (
              <div
                className="mt-3 rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-950"
                data-testid="export-preview-workbook-layout"
              >
                <div className="font-semibold">
                  {t("exportPreview.workbookLayoutTitle")}
                </div>
                <div className="mt-1 text-xs leading-5 text-emerald-900">
                  {t("exportPreview.workbookLayoutBody")}
                </div>
              </div>
            ) : null}
            <div
              className="mt-3 rounded-md border border-sky-200 bg-sky-50 px-3 py-2 text-sm text-sky-950"
              data-testid="export-preview-review-action-columns"
            >
              <div className="font-semibold">
                {t("exportPreview.reviewActionColumnsTitle")}
              </div>
              <div className="mt-1 text-xs leading-5 text-sky-900">
                {t("exportPreview.reviewActionColumnsBody")}
              </div>
            </div>
          </div>

          <div className="overflow-hidden rounded-md border border-slate-200">
            <div className="flex items-center justify-between border-b border-slate-200 bg-slate-50 px-4 py-3">
              <div className="text-sm font-medium text-slate-800">
                {t("exportPreview.previewRows", { count: preview.previewRows })}
              </div>
              {preview.hiddenRows > 0 ? (
                <div className="text-xs text-slate-500">
                  {t("exportPreview.hiddenRows", { count: preview.hiddenRows })}
                </div>
              ) : null}
            </div>

            {preview.rows.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-slate-200 text-left text-sm">
                  <thead className="bg-white">
                    <tr>
                      {preview.headers.map((header) => (
                        <th
                          key={header}
                          scope="col"
                          className="whitespace-nowrap px-4 py-3 text-xs font-semibold uppercase tracking-[0.08em] text-slate-500"
                        >
                          {header}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 bg-white">
                    {preview.rows.map((row) => (
                      <tr key={row.id} data-testid="export-preview-row">
                        {row.cells.map((cell, index) => (
                          <td
                            key={`${row.id}-${preview.headers[index]}`}
                            className="max-w-[18rem] px-4 py-3 align-top text-slate-700"
                          >
                            <span className="line-clamp-2 break-words">{cell}</span>
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="px-4 py-8 text-center text-sm text-slate-500">
                {t("exportPreview.noRows")}
              </div>
            )}
          </div>

          <div
            className="notebook-note flex items-start gap-2 rounded-md p-3 text-sm"
            data-testid="export-preview-safety-note"
          >
            <Info className="mt-0.5 h-4 w-4 shrink-0 text-[hsl(var(--notebook-action))]" />
            <span>{t("exportPreview.safetyNote")}</span>
          </div>
        </div>

        <div
          className={modalViewportFooterClassName(
            "flex flex-col justify-end gap-3 p-6 sm:flex-row",
          )}
          data-testid="export-preview-footer"
        >
          <button
            type="button"
            onClick={handleClose}
            disabled={submitting}
            className="notebook-control notebook-control-secondary w-full justify-center px-4 py-2 transition-colors disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto"
            data-testid="export-preview-cancel"
          >
            {t("exportPreview.cancel")}
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            disabled={submitting || preview.totalRows === 0}
            className="notebook-control notebook-control-primary inline-flex w-full items-center justify-center gap-2 px-4 py-2 font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto"
            data-testid="export-preview-confirm"
          >
            <Download className="h-4 w-4" />
            {t("exportPreview.download", { format: format.toUpperCase() })}
          </button>
        </div>
      </div>
    </div>
  );
}
