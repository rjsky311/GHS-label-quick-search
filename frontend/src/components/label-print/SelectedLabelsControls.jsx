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
      className="rounded-lg border border-slate-200 bg-white p-4"
      data-testid="selected-labels-controls"
    >
      <summary className="flex cursor-pointer list-none items-center justify-between gap-3">
        <span className="flex min-w-0 items-center gap-2">
          <Tag className="h-4 w-4 shrink-0 text-blue-600" />
          <span className="min-w-0">
            <span className="block text-sm font-medium text-slate-800">
              {tx("label.selectedCount", "{{count}} chemical(s) selected", {
                count: selectedForLabel.length,
              })}
            </span>
            <span className="mt-0.5 block text-xs text-slate-500">
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
        <span className="shrink-0 rounded-full bg-slate-100 px-2 py-1 text-xs font-semibold text-slate-600">
          {hasContinuationExpansion
            ? tx("label.totalOutputLabels", "{{count}} output label(s)", {
                count: plannedPrintLabelCount,
              })
            : tx("label.totalLabels", "{{count}} label(s) total", {
                count: plannedPrintLabelCount,
              })}
        </span>
      </summary>

      <div className="mt-3 max-h-64 space-y-2 overflow-y-auto border-t border-slate-100 pt-3">
        {selectedForLabel.length === 0 ? (
          <p className="rounded-md bg-slate-50 px-4 py-6 text-center text-slate-500">
            {t("label.noneSelected")}
          </p>
        ) : (
          selectedForLabel.map((chem, index) => {
            const quantity = labelQuantities?.[chem.cas_number] || 1;
            const derivedPreparedName = chem.isPreparedSolution
              ? formatPreparedDisplayName(chem)
              : null;
            const localizedNames = getLocalizedNames(chem, currentLocale);
            const preparedExpiryBadge = chem.isPreparedSolution
              ? getPreparedExpiryBadge(chem.preparedSolution?.expiryDate)
              : null;

            return (
              <div
                key={`${chem.cas_number}-${index}`}
                className={`flex items-start justify-between gap-3 rounded-xl border p-3 ${
                  chem.isPreparedSolution
                    ? "border-blue-200 bg-blue-50"
                    : "border-slate-200 bg-slate-50"
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
                      className="font-mono text-sm text-blue-700"
                      data-testid="selected-label-cas"
                    >
                      {chem.cas_number}
                    </span>
                    <span className="truncate text-sm text-slate-900">
                      {localizedNames.primary}
                    </span>
                    {localizedNames.secondary && !chem.isPreparedSolution && (
                      <span className="truncate text-xs text-slate-500">
                        {localizedNames.secondary}
                      </span>
                    )}
                    {(chem.ghs_pictograms?.length || 0) > 0 && (
                      <span className="text-xs text-slate-500">
                        {t("label.pictogramCount", {
                          count: chem.ghs_pictograms.length,
                        })}
                      </span>
                    )}
                    {chem.isPreparedSolution && (
                      <span className="rounded bg-blue-100 px-1.5 py-0.5 text-xs font-medium text-blue-700">
                        {t("print.preparedShort")}
                      </span>
                    )}
                  </div>

                  {chem.isPreparedSolution && derivedPreparedName && (
                    <div
                      className="text-sm text-blue-700"
                      data-testid={`selected-prepared-display-${chem.cas_number}`}
                    >
                      {derivedPreparedName}
                    </div>
                  )}

                  {chem.isPreparedSolution && chem.preparedSolution && (
                    <div
                      className="text-xs text-blue-700"
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
                        className="flex flex-wrap gap-x-3 text-xs text-blue-600"
                        data-testid={`selected-prepared-operational-${chem.cas_number}`}
                      >
                        {chem.preparedSolution.preparedBy && (
                          <span>
                            <span className="text-blue-500">
                              {t("prepared.preparedByShort")}:{" "}
                            </span>
                            {chem.preparedSolution.preparedBy}
                          </span>
                        )}
                        {chem.preparedSolution.preparedDate && (
                          <span>
                            <span className="text-blue-500">
                              {t("prepared.preparedDateShort")}:{" "}
                            </span>
                            {chem.preparedSolution.preparedDate}
                          </span>
                        )}
                        {chem.preparedSolution.expiryDate && (
                          <span>
                            <span className="text-blue-500">
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
                      className="flex h-6 w-6 items-center justify-center rounded border border-slate-300 bg-white text-xs text-slate-700 transition-colors hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-30"
                    >
                      -
                    </button>
                    <span
                      className="w-6 text-center text-sm text-slate-900"
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
                      className="flex h-6 w-6 items-center justify-center rounded border border-slate-300 bg-white text-xs text-slate-700 transition-colors hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-30"
                    >
                      +
                    </button>
                  </div>
                  <button
                    type="button"
                    onClick={() => onToggleSelectForLabel(chem)}
                    className="px-2 text-slate-400 transition-colors hover:text-red-600"
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
