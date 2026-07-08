import { PRINT_TARGET_OPTIONS } from "@/components/label-print/labelPrintModalOptions";

export default function LabelOutputSelector({
  currentStockName,
  onSelectPrintTarget,
  printTarget,
  tx,
}) {
  const selectedOption =
    PRINT_TARGET_OPTIONS.find((option) => option.value === printTarget) ||
    PRINT_TARGET_OPTIONS[0];
  const selectedLabel = tx(
    selectedOption.labelKey,
    selectedOption.fallbackLabel,
  );
  const selectedDescription = tx(
    selectedOption.descKey,
    selectedOption.fallbackDesc || "",
  );

  return (
    <div
      className="notebook-print-control-section rounded-md p-4"
      data-testid="label-output-selector"
    >
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="notebook-kicker mt-0">
            {tx("label.simplifiedOutputType", "Output type")}
          </p>
          <h3 className="font-[var(--font-display)] text-lg font-black text-[hsl(var(--notebook-ink))]">
            {tx("label.simplifiedOutputTitle", "Choose label output")}
          </h3>
          <p className="mt-1 text-xs leading-5 text-[hsl(var(--notebook-muted-ink))]">
            {tx(
              "label.simplifiedOutputHint",
              "Choose one output type. Small labels aim for one label and stop at two instead of dropping CAS, names, QR, or GHS pictograms.",
            )}
          </p>
        </div>
        <span className="notebook-status-chip shrink-0 rounded px-2 py-1 text-xs font-medium">
          {currentStockName}
        </span>
      </div>
      <div className="mt-4">
        <div className="font-mono text-xs font-semibold uppercase text-[hsl(var(--notebook-muted-ink))]">
          {tx("label.simplifiedOutputType", "Output type")}
        </div>
        <div
          className="notebook-output-list mt-2 grid grid-cols-1 gap-2 pt-3"
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
            const optionContent = tx(
              option.contentKey,
              option.fallbackContent || "",
            );
            const optionRule = tx(option.ruleKey, option.fallbackRule || "");

            return (
              <button
                key={option.value}
                type="button"
                onClick={() => onSelectPrintTarget(option.value)}
                aria-pressed={selected}
                aria-label={`${optionLabel}. ${optionDescription}`}
                title={optionDescription}
                data-testid={`label-purpose-${option.value}`}
                className={`notebook-control notebook-output-option min-h-[5.75rem] w-full min-w-0 overflow-hidden rounded-md p-3 pb-4 text-left transition-colors ${
                  selected
                    ? "notebook-control-primary notebook-output-option-selected"
                    : "notebook-control-secondary"
                }`}
              >
                <div className="flex min-w-0 items-center gap-2">
                  <span className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-[hsl(var(--notebook-surface))] text-[hsl(var(--notebook-action))] ring-1 ring-current/10">
                    <Icon className="h-4 w-4 shrink-0" />
                  </span>
                  <span className="min-w-0 whitespace-normal break-words font-[var(--font-display)] text-base font-black leading-5">
                    {optionLabel}
                  </span>
                </div>
                <div className="mt-2 grid gap-1.5 text-xs leading-4">
                  <span
                    className={
                      selected
                        ? "notebook-output-option-selected-copy"
                        : "text-[hsl(var(--notebook-muted-ink))]"
                    }
                  >
                    {optionContent}
                  </span>
                  <span
                    className={`notebook-status-chip inline-flex w-fit max-w-full rounded px-2 py-0.5 font-medium ${
                      selected ? "notebook-output-option-selected-chip" : ""
                    }`}
                  >
                    {optionRule}
                  </span>
                </div>
              </button>
            );
          })}
        </div>
      </div>
      <div
        className="mt-3 hidden border-t border-[hsl(var(--notebook-rule)/0.58)] px-1 pt-3 text-xs leading-5 sm:block"
        data-testid="selected-output-note"
      >
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
          <span className="font-semibold text-[hsl(var(--notebook-action))]">
            {tx("label.selectedOutputNoteTitle", "Selected output")}
          </span>
          <span className="font-medium text-[hsl(var(--notebook-ink))]">
            {selectedLabel}
          </span>
          <span className="notebook-status-chip rounded px-2 py-0.5">
            {currentStockName}
          </span>
        </div>
        <p className="mt-1 text-[hsl(var(--notebook-muted-ink))]">
          {selectedDescription}
        </p>
      </div>
    </div>
  );
}
