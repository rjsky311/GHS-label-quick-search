import { Check } from "lucide-react";
import {
  FULL_PAGE_PRIMARY_STOCK_IDS,
  getLabelStockPresetDisplay,
} from "@/constants/labelStocks";
import { ORIENTATION_OPTIONS } from "@/components/label-print/labelPrintModalOptions";

export function ConfigButtonGrid({
  options,
  value,
  onSelect,
  t,
}) {
  return (
    <div className="grid grid-cols-2 gap-3">
      {options.map((option) => {
        const Icon = option.icon;
        const selected = value === option.value;

        return (
          <button
            key={option.value}
            type="button"
            onClick={() => onSelect(option.value)}
            data-testid={`label-config-option-${option.value}`}
            className={`notebook-control rounded-md p-3 text-left transition-colors ${
              selected
                ? "notebook-control-primary"
                : "notebook-control-secondary"
            }`}
          >
            <div className="flex items-center gap-2">
              <span
                className="inline-flex h-6 w-8 shrink-0 items-center justify-center text-current"
                data-testid="label-config-icon-slot"
              >
                {Icon ? (
                  <Icon className="h-4 w-4 shrink-0" />
                ) : (
                  <span className="text-xs font-semibold">
                    {option.iconLabel}
                  </span>
                )}
              </span>
              <span className="min-w-0 font-medium">{t(option.labelKey)}</span>
            </div>
            {option.descKey && (
              <div className="mt-1 text-xs leading-5 text-[hsl(var(--notebook-muted-ink))]">
                {t(option.descKey)}
              </div>
            )}
            {option.tipKey && (
              <div className="mt-1 text-xs leading-5 text-[hsl(var(--notebook-muted-ink))]">
                {t(option.tipKey)}
              </div>
            )}
          </button>
        );
      })}
    </div>
  );
}

export function StockChoiceButton({
  preset,
  selected,
  onSelect,
  labelPurpose,
  t,
  tx,
}) {
  const display = getLabelStockPresetDisplay(preset, t);
  const isFullPage = FULL_PAGE_PRIMARY_STOCK_IDS.includes(preset.id);

  return (
    <button
      type="button"
      onClick={() => onSelect(preset)}
      aria-pressed={selected}
      data-testid={`primary-output-size-${preset.id}`}
      className={`notebook-control rounded-md p-3 text-left transition-colors ${
        selected
          ? "notebook-control-primary"
          : "notebook-control-secondary"
      }`}
    >
      <div className="flex items-center justify-between gap-2">
        <span className="font-medium">{display.name}</span>
        {selected && <Check className="h-4 w-4" />}
      </div>
      <div className="mt-1 text-xs leading-5 text-[hsl(var(--notebook-muted-ink))]">
        {preset.labelWidthMm} x {preset.labelHeightMm} mm /{" "}
        {tx("label.previewPerPage", "{{count}}/page", {
          count: preset.perPage,
        })}
      </div>
      <div className="mt-2 flex flex-wrap gap-1.5 text-[11px] text-[hsl(var(--notebook-muted-ink))]">
        <span className="notebook-chip rounded-full px-2 py-0.5">
          {preset.pageSize || "A4"}
        </span>
        <span className="notebook-chip rounded-full px-2 py-0.5">
          {t(
            ORIENTATION_OPTIONS.find(
              (item) => item.value === preset.orientation,
            )?.labelKey || "label.portrait",
          )}
        </span>
        <span className="notebook-chip rounded-full px-2 py-0.5">
          {isFullPage
            ? tx("label.completePrimaryStock", "complete")
            : labelPurpose === "shipping"
              ? tx("label.containerStock", "container")
              : tx("label.supplementalStock", "supplemental")}
        </span>
      </div>
    </button>
  );
}
