import { useState } from "react";
import { Bookmark, Check, LayoutPanelTop, Plus, X } from "@/components/icons";
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
      className="notebook-print-stage-section rounded-md p-3"
      data-testid="saved-print-controls"
    >
      <summary className="notebook-tone-ink flex cursor-pointer list-none items-center gap-2 text-sm font-medium">
        <Bookmark className="h-4 w-4 notebook-tone-action" />
        {tx("label.savedPrintControlsTitle", "Saved jobs and presets")}
      </summary>
      <div className="mt-4 space-y-4">
        <section className="notebook-print-stage-section rounded-md p-4">
          <div className="notebook-tone-ink flex items-center gap-2 text-sm font-medium">
            <Bookmark className="h-4 w-4 notebook-tone-action" />
            {t("label.quickTemplates")}
          </div>
          <div className="mt-3">
            {printTemplates.length === 0 && !showSaveInput ? (
              <p className="notebook-tone-muted text-xs">{t("label.noTemplates")}</p>
            ) : (
              <div className="flex flex-wrap gap-2">
                {printTemplates.map((template) => (
                  <div
                    key={template.id}
                    className="group flex items-center gap-1 rounded-md border border-[hsl(var(--notebook-rule)/0.7)] bg-[hsl(var(--notebook-surface)/0.58)] px-3 py-1.5 text-sm notebook-tone-muted transition-colors hover:border-[hsl(var(--notebook-action-border)/0.54)] hover:bg-[hsl(var(--notebook-action-soft)/0.58)] hover:text-[hsl(var(--notebook-action))]"
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
                      className="ml-1 text-[hsl(var(--notebook-muted-ink)/0.74)] opacity-0 transition-opacity hover:text-[hsl(var(--notebook-danger))] group-hover:opacity-100"
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
                  className="flex items-center gap-1 text-xs font-medium notebook-tone-action transition-colors hover:text-[hsl(var(--notebook-action-border))]"
                >
                  <Plus className="h-3 w-3" /> {t("label.saveCurrentBtn")}
                </button>
              ) : (
                <p className="text-xs notebook-tone-warning">
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
                  className="notebook-field min-h-8 flex-1 rounded-md px-2 py-1 text-sm"
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

        <section className="notebook-print-stage-section rounded-md p-4">
          <div className="flex items-center justify-between">
            <div className="notebook-tone-ink flex items-center gap-2 text-sm font-medium">
              <LayoutPanelTop className="h-4 w-4 notebook-tone-action" />
              {tx("label.recentPrintsTitle", "Recent print queue")}
            </div>
            {visibleRecentPrints.length > 0 &&
              typeof onClearRecentPrints === "function" && (
                <button
                  type="button"
                  onClick={onClearRecentPrints}
                  className="notebook-tone-muted text-xs transition-colors hover:text-[hsl(var(--notebook-ink))]"
                >
                  {tx("label.recentPrintsClear", "Clear")}
                </button>
              )}
          </div>
          {visibleRecentPrints.length === 0 ? (
            <p className="notebook-tone-muted mt-3 text-xs">
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
                    className="flex items-center justify-between gap-3 rounded-md border border-[hsl(var(--notebook-rule)/0.7)] bg-[hsl(var(--notebook-surface)/0.58)] px-3 py-2"
                  >
                    <div className="min-w-0">
                      <div className="truncate text-sm font-medium notebook-tone-ink">
                        {primaryLabel}
                        {remaining > 0 ? ` +${remaining}` : ""}
                      </div>
                      <div className="notebook-tone-muted mt-1 flex flex-wrap gap-2 text-xs">
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
                      className="rounded-md bg-[hsl(var(--notebook-action-soft)/0.62)] px-3 py-1.5 text-xs font-medium notebook-tone-action transition-colors hover:bg-[hsl(var(--notebook-action-soft))]"
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
