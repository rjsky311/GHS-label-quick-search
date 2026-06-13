import { useState } from "react";
import { Bookmark, Check, LayoutPanelTop, Plus, X } from "lucide-react";
import { toast } from "sonner";
import { getOptionLabel } from "@/components/label-print/labelPrintModalHelpers";
import { getLocalizedNames } from "@/utils/ghsText";

export default function SavedPrintControls({
  t,
  tx,
  printTemplates = [],
  templateOptions = [],
  visibleRecentPrints = [],
  currentLocale,
  formatPrintTimestamp,
  onLoadTemplate,
  onDeleteTemplate,
  onSaveTemplate,
  onLoadRecentPrint,
  onClearRecentPrints,
}) {
  const [showSaveInput, setShowSaveInput] = useState(false);
  const [templateName, setTemplateName] = useState("");

  const saveTemplate = () => {
    if (!templateName.trim()) {
      toast.error(t("label.templateNameRequired"));
      return;
    }

    const success = onSaveTemplate?.(templateName.trim());
    if (success) {
      toast.success(
        t("label.saveTemplateSuccess", {
          name: templateName.trim(),
        }),
      );
      setTemplateName("");
      setShowSaveInput(false);
    }
  };

  return (
    <details
      className="rounded-md border border-slate-200 bg-white p-3"
      data-testid="saved-print-controls"
    >
      <summary className="flex cursor-pointer list-none items-center gap-2 text-sm font-medium text-slate-800">
        <Bookmark className="h-4 w-4 text-blue-600" />
        {tx("label.savedPrintControlsTitle", "Saved jobs and presets")}
      </summary>
      <div className="mt-4 space-y-4">
        <section className="rounded-lg border border-slate-200 bg-slate-50 p-4">
          <div className="flex items-center gap-2 text-sm font-medium text-slate-700">
            <Bookmark className="h-4 w-4 text-blue-600" />
            {t("label.quickTemplates")}
          </div>
          <div className="mt-3">
            {printTemplates.length === 0 && !showSaveInput ? (
              <p className="text-xs text-slate-500">{t("label.noTemplates")}</p>
            ) : (
              <div className="flex flex-wrap gap-2">
                {printTemplates.map((template) => (
                  <div
                    key={template.id}
                    className="group flex items-center gap-1 rounded-md border border-slate-200 bg-slate-50 px-3 py-1.5 text-sm text-slate-700 transition-colors hover:border-blue-300 hover:bg-blue-50"
                  >
                    <button
                      type="button"
                      onClick={() => {
                        onLoadTemplate?.(template);
                        toast.success(
                          t("label.loadTemplateSuccess", {
                            name: template.name,
                          }),
                        );
                      }}
                    >
                      {template.name}
                    </button>
                    <button
                      type="button"
                      onClick={(event) => {
                        event.stopPropagation();
                        if (
                          window.confirm(
                            t("label.deleteTemplateConfirm", {
                              name: template.name,
                            }),
                          )
                        ) {
                          onDeleteTemplate?.(template.id);
                          toast.success(t("label.deleteTemplateSuccess"));
                        }
                      }}
                      className="ml-1 text-slate-400 opacity-0 transition-opacity hover:text-red-600 group-hover:opacity-100"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="mt-3">
            {!showSaveInput ? (
              printTemplates.length < 10 ? (
                <button
                  type="button"
                  onClick={() => setShowSaveInput(true)}
                  className="flex items-center gap-1 text-xs font-medium text-blue-700 transition-colors hover:text-blue-800"
                >
                  <Plus className="h-3 w-3" /> {t("label.saveCurrentBtn")}
                </button>
              ) : (
                <p className="text-xs text-amber-500">
                  {t("label.templateLimitHint")}
                </p>
              )
            ) : (
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={templateName}
                  onChange={(event) =>
                    setTemplateName(event.target.value.slice(0, 30))
                  }
                  placeholder={t("label.templateNamePlaceholder")}
                  className="flex-1 rounded-md border border-slate-300 bg-white px-2 py-1 text-sm text-slate-900 placeholder:text-slate-400 focus:border-blue-500 focus:outline-none"
                  autoFocus
                  onKeyDown={(event) => {
                    if (event.key === "Enter" && templateName.trim()) {
                      saveTemplate();
                    }

                    if (event.key === "Escape") {
                      event.stopPropagation();
                      setTemplateName("");
                      setShowSaveInput(false);
                    }
                  }}
                />
                <button
                  type="button"
                  onClick={saveTemplate}
                  aria-label={t("label.saveCurrentBtn")}
                  className="notebook-control notebook-control-primary flex h-8 min-h-8 w-8 items-center justify-center p-1.5 transition-colors"
                >
                  <Check className="h-3.5 w-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setTemplateName("");
                    setShowSaveInput(false);
                  }}
                  aria-label={t("label.cancel")}
                  className="notebook-control notebook-control-secondary flex h-8 min-h-8 w-8 items-center justify-center p-1.5 transition-colors"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            )}
          </div>
        </section>

        <section className="rounded-lg border border-slate-200 bg-white p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-sm font-medium text-slate-700">
              <LayoutPanelTop className="h-4 w-4 text-blue-600" />
              {tx("label.recentPrintsTitle", "Recent print queue")}
            </div>
            {visibleRecentPrints.length > 0 &&
              typeof onClearRecentPrints === "function" && (
                <button
                  type="button"
                  onClick={onClearRecentPrints}
                  className="text-xs text-slate-500 transition-colors hover:text-slate-900"
                >
                  {tx("label.recentPrintsClear", "Clear")}
                </button>
              )}
          </div>
          {visibleRecentPrints.length === 0 ? (
            <p className="mt-3 text-xs text-slate-500">
              {tx(
                "label.recentPrintsEmpty",
                "Recent print jobs will appear here so you can reload a label set in one click.",
              )}
            </p>
          ) : (
            <div className="mt-3 grid gap-2">
              {visibleRecentPrints.map((job) => {
                const firstItem = job.items?.[0];
                const remaining = Math.max(
                  0,
                  (job.totalChemicals || job.items?.length || 1) - 1,
                );
                const primaryLabel =
                  (firstItem &&
                    getLocalizedNames(firstItem, currentLocale).primary) ||
                  firstItem?.cas_number ||
                  tx("label.recentPrintUnknown", "Saved job");
                const templateLabel = getOptionLabel(
                  templateOptions,
                  job.labelConfig?.template,
                  t,
                  job.labelConfig?.template || "standard",
                );

                return (
                  <div
                    key={job.id}
                    className="flex items-center justify-between gap-3 rounded-md border border-slate-200 bg-slate-50 px-3 py-2"
                  >
                    <div className="min-w-0">
                      <div className="truncate text-sm font-medium text-slate-900">
                        {primaryLabel}
                        {remaining > 0 ? ` +${remaining}` : ""}
                      </div>
                      <div className="mt-1 flex flex-wrap gap-2 text-xs text-slate-500">
                        <span>{formatPrintTimestamp(job.createdAt)}</span>
                        <span>
                          {tx("label.recentPrintLabels", "{{count}} labels", {
                            count: job.totalLabels || 0,
                          })}
                        </span>
                        <span>{templateLabel}</span>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => onLoadRecentPrint?.(job)}
                      className="rounded-md bg-blue-50 px-3 py-1.5 text-xs font-medium text-blue-700 transition-colors hover:bg-blue-100"
                    >
                      {tx("label.recentPrintLoad", "Load")}
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </section>
      </div>
    </details>
  );
}
