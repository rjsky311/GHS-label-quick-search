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
        className="mt-3 rounded-md border border-blue-100 bg-blue-50/70 p-3"
        data-testid="selected-stock-summary"
      >
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="text-xs font-semibold text-blue-700">
              {tx("label.outputStockTitle", "Target size")}
            </div>
            <div className="mt-1 text-base font-semibold text-slate-900">
              {currentStockName}
            </div>
            <p className="mt-1 text-xs leading-5 text-slate-600">
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
          <span className="shrink-0 rounded-full bg-white/80 px-2 py-1 text-xs font-medium text-blue-700 ring-1 ring-blue-100">
            {currentStockRole}
          </span>
        </div>
      </div>

      <details
        className="mt-3 rounded-md border border-slate-200 bg-slate-50/80 p-3"
        data-testid="stock-size-picker"
      >
        <summary className="flex cursor-pointer list-none items-center justify-between gap-3 text-sm font-medium text-slate-700">
          <span>{tx("label.changeStockTitle", "Change target size")}</span>
          <span className="rounded-full bg-white px-2 py-1 text-xs text-slate-500 ring-1 ring-slate-200">
            {selectableStockCount}
          </span>
        </summary>
        <p className="mt-2 text-xs leading-5 text-slate-500">
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
            className="mt-3 rounded-md border border-slate-200 bg-white p-3"
            data-testid="secondary-output-size-controls"
          >
            <summary className="flex cursor-pointer list-none items-center justify-between gap-3 text-sm font-medium text-slate-700">
              <span>
                {tx("label.moreStockChoicesTitle", "More common stock sizes")}
              </span>
              <span className="rounded-full bg-slate-50 px-2 py-1 text-xs text-slate-500 ring-1 ring-slate-200">
                {secondaryStockChoices.length}
              </span>
            </summary>
            <p className="mt-2 text-xs leading-5 text-slate-500">
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
