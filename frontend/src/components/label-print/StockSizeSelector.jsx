import { StockChoiceButton } from "@/components/label-print/LabelPrintConfigControls";

export default function StockSizeSelector({
  applyStockPreset,
  currentStockName,
  currentStockOrientation,
  currentStockRole,
  labelPurpose,
  layoutProfile,
  primaryStockChoices,
  secondaryStockChoices,
  selectableStockCount,
  t,
  tx,
}) {
  const renderStockChoiceButton = (preset) => (
    <StockChoiceButton
      key={preset.id}
      preset={preset}
      selected={layoutProfile.stockPreset === preset.id}
      onSelect={applyStockPreset}
      labelPurpose={labelPurpose}
      t={t}
      tx={tx}
    />
  );

  return (
    <>
      <div
        className="notebook-print-stage-section mt-3 rounded-md p-3"
        data-testid="selected-stock-summary"
      >
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="text-xs font-semibold uppercase tracking-normal text-[hsl(var(--notebook-muted-ink))]">
              {tx("label.outputStockTitle", "Target size")}
            </div>
            <div className="notebook-tone-ink mt-1 text-base font-semibold">
              {currentStockName}
            </div>
            <p className="notebook-tone-muted mt-1 text-xs leading-5">
              {tx(
                "label.selectedStockSummary",
                "{{width}} x {{height}} mm · {{perPage}}/page · {{orientation}}",
                {
                  width: layoutProfile.widthMm,
                  height: layoutProfile.heightMm,
                  perPage: layoutProfile.perPage,
                  orientation: currentStockOrientation,
                },
              )}
            </p>
          </div>
          <span className="notebook-print-stage-fact shrink-0 rounded-full px-2 py-1 text-xs font-medium">
            {currentStockRole}
          </span>
        </div>
      </div>

      <details
        className="notebook-print-stage-section mt-3 rounded-md p-3"
        data-testid="stock-size-picker"
      >
        <summary className="flex cursor-pointer list-none items-center justify-between gap-3 text-sm font-medium text-[hsl(var(--notebook-ink))]">
          <span>{tx("label.changeStockTitle", "Change target size")}</span>
          <span className="notebook-print-stage-fact rounded-full px-2 py-1 text-xs text-[hsl(var(--notebook-muted-ink))]">
            {selectableStockCount}
          </span>
        </summary>
        <p className="mt-2 text-xs leading-5 text-[hsl(var(--notebook-muted-ink))]">
          {tx(
            "label.changeStockHint",
            "Use this only when the physical paper or label roll is different. The preview and planner will update immediately.",
          )}
        </p>
        <div className="mt-3 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {primaryStockChoices.map(renderStockChoiceButton)}
        </div>
        {secondaryStockChoices.length > 0 && (
          <details
            className="notebook-print-stage-section mt-3 rounded-md p-3"
            data-testid="secondary-output-size-controls"
          >
            <summary className="flex cursor-pointer list-none items-center justify-between gap-3 text-sm font-medium text-[hsl(var(--notebook-ink))]">
              <span>
                {tx("label.moreStockChoicesTitle", "More common stock sizes")}
              </span>
              <span className="notebook-print-stage-fact rounded-full px-2 py-1 text-xs text-[hsl(var(--notebook-muted-ink))]">
                {secondaryStockChoices.length}
              </span>
            </summary>
            <p className="mt-2 text-xs leading-5 text-[hsl(var(--notebook-muted-ink))]">
              {tx(
                "label.moreStockChoicesHint",
                "Use these when your printer stock matches them. The same planner and preview checks still apply.",
              )}
            </p>
            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              {secondaryStockChoices.map(renderStockChoiceButton)}
            </div>
          </details>
        )}
      </details>
    </>
  );
}
