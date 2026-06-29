import { Tag, X } from "lucide-react";
import { getPreparedExpiryBadge } from "@/components/label-print/labelPrintModalHelpers";
import { getLocalizedNames } from "@/utils/ghsText";
import { formatPreparedDisplayName } from "@/utils/preparedSolution";

export default function SelectedLabelsControls({
  currentLocale,
  hasContinuationExpansion,
  labelQuantities,
  onLabelQuantitiesChange,
  onToggleSelectForLabel,
  plannedPrintLabelCount,
  plannedPrintPageCount,
  selectedForLabel,
  t,
  totalLabels,
  tx,
}) {
  return (
    <details
      className="notebook-print-note-section rounded-md p-3"
      data-testid="selected-labels-controls"
    >
      <summary className="flex cursor-pointer list-none items-center justify-between gap-3">
        <span className="flex min-w-0 items-center gap-2">
          <Tag className="h-4 w-4 shrink-0 text-[hsl(var(--notebook-action))]" />
          <span className="min-w-0">
            <span className="block text-sm font-medium text-[hsl(var(--notebook-ink))]">
              {tx("label.selectedCount", "{{count}} chemical(s) selected", {
                count: selectedForLabel.length,
              })}
            </span>
            <span className="mt-0.5 block text-xs text-[hsl(var(--notebook-muted-ink))]">
              {plannedPrintPageCount > 0
                ? hasContinuationExpansion
                  ? tx(
                      "label.selectedLabelsContinuationSummary",
                      "{{sourceLabels}} selected label(s) expands to {{labels}} extra label(s), about {{pages}} page(s).",
                      {
                        sourceLabels: totalLabels,
                        labels: plannedPrintLabelCount,
                        pages: plannedPrintPageCount,
                      },
                    )
                  : tx(
                      "label.selectedLabelsWithPagesSummary",
                      "{{labels}} label(s), about {{pages}} page(s). Adjust copies only when needed.",
                      {
                        labels: plannedPrintLabelCount,
                        pages: plannedPrintPageCount,
                      },
                    )
                : tx(
                    "label.selectedLabelsSummary",
                    "Adjust quantities only when you need multiple copies.",
                  )}
            </span>
          </span>
        </span>
        <span className="notebook-print-stage-fact shrink-0 rounded-full px-2 py-1 text-xs font-semibold text-[hsl(var(--notebook-muted-ink))]">
          {hasContinuationExpansion
            ? tx("label.totalOutputLabels", "{{count}} output label(s)", {
                count: plannedPrintLabelCount,
              })
            : tx("label.totalLabels", "{{count}} label(s) total", {
                count: plannedPrintLabelCount,
              })}
        </span>
      </summary>

      <div className="mt-3 max-h-64 space-y-2 overflow-y-auto border-t border-[hsl(var(--notebook-rule)/0.48)] pt-3">
        {selectedForLabel.length === 0 ? (
          <p className="notebook-print-stage-fact rounded-md px-4 py-6 text-center text-[hsl(var(--notebook-muted-ink))]">
            {t("label.noneSelected")}
          </p>
        ) : (
          selectedForLabel.map((chem, index) => {
            const quantity = labelQuantities?.[chem.cas_number] || 1;
            const derivedPreparedName = chem.isPreparedSolution
              ? formatPreparedDisplayName(chem, { locale: currentLocale })
              : null;
            const localizedNames = getLocalizedNames(chem, currentLocale);
            const preparedExpiryBadge = chem.isPreparedSolution
              ? getPreparedExpiryBadge(chem.preparedSolution?.expiryDate)
              : null;

            return (
              <div
                key={`${chem.cas_number}-${index}`}
                className={`flex items-start justify-between gap-3 rounded-md border p-3 ${
                  chem.isPreparedSolution
                    ? "border-[hsl(var(--notebook-action-border)/0.42)] bg-[hsl(var(--notebook-action-soft)/0.42)]"
                    : "notebook-print-stage-fact"
                }`}
                data-testid={
                  chem.isPreparedSolution
                    ? `selected-prepared-${chem.cas_number}`
                    : undefined
                }
              >
                <div className="min-w-0 flex-1 space-y-1">
	                  <div className="flex flex-wrap items-center gap-2">
	                    <span
	                      className="font-mono text-sm text-[hsl(var(--notebook-action))]"
	                      data-testid="selected-label-cas"
	                    >
	                      {chem.cas_number}
	                    </span>
	                    <span className="truncate text-sm text-[hsl(var(--notebook-ink))]">
	                      {localizedNames.primary}
	                    </span>
	                    {localizedNames.secondary && !chem.isPreparedSolution && (
	                      <span className="truncate text-xs text-[hsl(var(--notebook-muted-ink))]">
	                        {localizedNames.secondary}
	                      </span>
	                    )}
	                    {(chem.ghs_pictograms?.length || 0) > 0 && (
	                      <span className="text-xs text-[hsl(var(--notebook-muted-ink))]">
	                        {t("label.pictogramCount", {
	                          count: chem.ghs_pictograms.length,
	                        })}
	                      </span>
	                    )}
	                    {chem.isPreparedSolution && (
	                      <span className="rounded bg-[hsl(var(--notebook-action-soft)/0.72)] px-1.5 py-0.5 text-xs font-medium text-[hsl(var(--notebook-action))]">
	                        {t("print.preparedShort")}
	                      </span>
	                    )}
                  </div>

	                  {chem.isPreparedSolution && derivedPreparedName && (
	                    <div
	                      className="text-sm text-[hsl(var(--notebook-action))]"
	                      data-testid={`selected-prepared-display-${chem.cas_number}`}
	                    >
                      {derivedPreparedName}
                    </div>
                  )}

                  {chem.isPreparedSolution && chem.preparedSolution && (
	                    <div
	                      className="text-xs text-[hsl(var(--notebook-action))]"
	                      data-testid={`selected-prepared-meta-${chem.cas_number}`}
	                    >
                      {t("prepared.labelMeta", {
                        concentration: chem.preparedSolution.concentration || "",
                        solvent: chem.preparedSolution.solvent || "",
                      })}
                    </div>
                  )}

                  {chem.isPreparedSolution &&
                    chem.preparedSolution &&
                    (chem.preparedSolution.preparedBy ||
                      chem.preparedSolution.preparedDate ||
                      chem.preparedSolution.expiryDate) && (
	                      <div
	                        className="flex flex-wrap gap-x-3 text-xs text-[hsl(var(--notebook-action))]"
	                        data-testid={`selected-prepared-operational-${chem.cas_number}`}
	                      >
	                        {chem.preparedSolution.preparedBy && (
	                          <span>
	                            <span className="opacity-75">
	                              {t("prepared.preparedByShort")}:{" "}
	                            </span>
                            {chem.preparedSolution.preparedBy}
                          </span>
                        )}
	                        {chem.preparedSolution.preparedDate && (
	                          <span>
	                            <span className="opacity-75">
	                              {t("prepared.preparedDateShort")}:{" "}
	                            </span>
                            {chem.preparedSolution.preparedDate}
                          </span>
                        )}
	                        {chem.preparedSolution.expiryDate && (
	                          <span>
	                            <span className="opacity-75">
	                              {t("prepared.expiryDateShort")}:{" "}
	                            </span>
                            {chem.preparedSolution.expiryDate}
                          </span>
                        )}
                        {preparedExpiryBadge && (
                          <span
                            className={`rounded-full border px-2 py-0.5 font-medium ${preparedExpiryBadge.className}`}
                            data-testid={`selected-prepared-expiry-status-${chem.cas_number}`}
                          >
                            {t(preparedExpiryBadge.labelKey)}
                          </span>
                        )}
                      </div>
                    )}
                </div>

                <div className="flex items-center gap-2">
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => {
                        if (quantity > 1) {
                          onLabelQuantitiesChange({
                            ...labelQuantities,
                            [chem.cas_number]: quantity - 1,
                          });
                        }
                      }}
	                      disabled={quantity <= 1}
	                      className="notebook-control notebook-control-utility flex h-6 w-6 items-center justify-center px-0 text-xs transition-colors disabled:cursor-not-allowed disabled:opacity-30"
	                    >
	                      -
	                    </button>
	                    <span
	                      className="w-6 text-center text-sm text-[hsl(var(--notebook-ink))]"
	                      data-testid="selected-label-quantity"
	                    >
                      {quantity}
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        if (quantity < 20) {
                          onLabelQuantitiesChange({
                            ...labelQuantities,
                            [chem.cas_number]: quantity + 1,
                          });
                        }
                      }}
	                      disabled={quantity >= 20}
	                      className="notebook-control notebook-control-utility flex h-6 w-6 items-center justify-center px-0 text-xs transition-colors disabled:cursor-not-allowed disabled:opacity-30"
	                    >
	                      +
	                    </button>
                  </div>
	                  <button
	                    type="button"
	                    onClick={() => onToggleSelectForLabel(chem)}
	                    className="px-2 text-[hsl(var(--notebook-muted-ink))] transition-colors hover:text-[hsl(var(--notebook-danger))]"
	                    data-testid="selected-label-remove"
	                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>
    </details>
  );
}
