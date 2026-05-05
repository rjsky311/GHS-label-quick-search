import { useCallback, useEffect, useMemo, useState } from "react";
import { Download, FileSpreadsheet, FileText, Info, X } from "lucide-react";
import { useTranslation } from "react-i18next";
import useFocusTrap from "@/hooks/useFocusTrap";
import { buildExportPreview } from "@/utils/exportData";

const FORMAT_OPTIONS = [
  { value: "xlsx", icon: FileSpreadsheet, labelKey: "exportPreview.xlsx" },
  { value: "csv", icon: FileText, labelKey: "exportPreview.csv" },
];

export default function ExportPreviewModal({
  results,
  initialFormat = "xlsx",
  onClose,
  onConfirm,
}) {
  const { t } = useTranslation();
  const [format, setFormat] = useState(initialFormat);
  const [submitting, setSubmitting] = useState(false);
  const handleClose = useCallback(() => {
    if (!submitting) {
      onClose();
    }
  }, [onClose, submitting]);
  const dialogRef = useFocusTrap(handleClose);
  const foundCount = results.filter((result) => result.found).length;

  useEffect(() => {
    setFormat(initialFormat);
  }, [initialFormat]);

  const preview = useMemo(
    () => buildExportPreview(results, { t, maxRows: 5 }),
    [results, t]
  );

  const handleConfirm = async () => {
    setSubmitting(true);
    let completed = false;
    try {
      await onConfirm(format);
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
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      onClick={handleClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="export-preview-title"
      data-testid="export-preview-modal"
    >
      <div
        ref={dialogRef}
        tabIndex={-1}
        className="max-h-[90vh] w-full max-w-5xl overflow-y-auto rounded-lg bg-white shadow-2xl outline-none"
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

        <div className="space-y-5 p-6">
          <div className="grid gap-3 md:grid-cols-3">
            <div className="rounded-md border border-slate-200 bg-slate-50 p-3">
              <div className="text-xs font-medium uppercase tracking-[0.14em] text-slate-500">
                {t("exportPreview.scopeLabel")}
              </div>
              <div className="mt-1 text-sm font-semibold text-slate-950">
                {t("exportPreview.scopeValue", { count: preview.totalRows })}
              </div>
            </div>
            <div className="rounded-md border border-slate-200 bg-slate-50 p-3">
              <div className="text-xs font-medium uppercase tracking-[0.14em] text-slate-500">
                {t("exportPreview.foundLabel")}
              </div>
              <div className="mt-1 text-sm font-semibold text-slate-950">
                {t("exportPreview.foundCount", { count: foundCount })}
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
                    className={`inline-flex items-center gap-2 rounded-md border px-3 py-2 text-sm font-medium transition-colors ${
                      selected
                        ? "border-blue-700 bg-blue-50 text-blue-800"
                        : "border-slate-300 bg-white text-slate-700 hover:bg-slate-50"
                    }`}
                    data-testid={`export-preview-format-${value}`}
                  >
                    <Icon className="h-4 w-4" />
                    {t(labelKey)}
                  </button>
                );
              })}
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

          <div className="flex items-start gap-2 rounded-md border border-blue-200 bg-blue-50 p-3 text-sm text-blue-900">
            <Info className="mt-0.5 h-4 w-4 shrink-0 text-blue-700" />
            <span>{t("exportPreview.safetyNote")}</span>
          </div>
        </div>

        <div className="flex flex-wrap justify-end gap-3 border-t border-slate-200 p-6">
          <button
            type="button"
            onClick={handleClose}
            disabled={submitting}
            className="rounded-md border border-slate-300 bg-white px-4 py-2 text-slate-700 transition-colors hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
            data-testid="export-preview-cancel"
          >
            {t("exportPreview.cancel")}
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            disabled={submitting || preview.totalRows === 0}
            className="inline-flex items-center gap-2 rounded-md bg-blue-700 px-4 py-2 font-medium text-white transition-colors hover:bg-blue-800 disabled:cursor-not-allowed disabled:opacity-50"
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
