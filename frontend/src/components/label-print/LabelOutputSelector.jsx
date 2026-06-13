import { PRINT_TARGET_OPTIONS } from "@/components/label-print/labelPrintModalOptions";

export default function LabelOutputSelector({
  currentStockName,
  onSelectPrintTarget,
  printTarget,
  tx,
}) {
  return (
    <div>
      <div className="flex items-center justify-between gap-3">
        <div>
          <h3 className="text-sm font-medium text-slate-800">
            {tx("label.simplifiedOutputTitle", "Choose label output")}
          </h3>
          <p className="mt-1 text-xs text-slate-500">
            {tx(
              "label.simplifiedOutputHint",
              "Choose one output type. Small labels aim for one label and stop at two instead of dropping CAS, names, QR, or GHS pictograms.",
            )}
          </p>
        </div>
        <span className="rounded-full bg-slate-100 px-2 py-1 text-xs text-slate-600">
          {currentStockName}
        </span>
      </div>
      <div className="mt-4">
        <div className="text-xs font-semibold text-slate-500">
          {tx("label.simplifiedOutputType", "Output type")}
        </div>
        <div
          className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-2"
          data-testid="output-goal-controls"
        >
          {PRINT_TARGET_OPTIONS.map((option) => {
            const Icon = option.icon;
            const selected = printTarget === option.value;
            const optionLabel = tx(option.labelKey, option.fallbackLabel);
            const optionDescription = tx(
              option.descKey,
              option.fallbackDesc || "",
            );

            return (
              <button
                key={option.value}
                type="button"
                onClick={() => onSelectPrintTarget(option.value)}
                aria-pressed={selected}
                aria-label={`${optionLabel}. ${optionDescription}`}
                title={optionDescription}
                data-testid={`label-purpose-${option.value}`}
                className={`min-h-12 w-full min-w-0 overflow-hidden rounded-md border p-2.5 text-left transition-colors ${
                  selected
                    ? "border-blue-500 bg-blue-50 text-blue-900"
                    : "border-slate-200 bg-white text-slate-700 hover:border-blue-300 hover:bg-blue-50"
                }`}
              >
                <div className="flex min-w-0 items-center gap-2">
                  <span className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-white/70 text-current ring-1 ring-current/10">
                    <Icon className="h-4 w-4 shrink-0" />
                  </span>
                  <span className="min-w-0 whitespace-normal break-words text-sm font-semibold leading-5">
                    {optionLabel}
                  </span>
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
