import { CalendarDays, Settings2 } from "lucide-react";
import {
  ConfigButtonGrid,
} from "@/components/label-print/LabelPrintConfigControls";
import SavedPrintControls from "@/components/label-print/SavedPrintControls";
import {
  ORIENTATION_OPTIONS,
  SIZE_OPTIONS,
  TEMPLATE_OPTIONS,
} from "@/components/label-print/labelPrintModalOptions";

function NumberField({ field, onChange }) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs text-[hsl(var(--notebook-muted-ink))]">
        {field.label}
      </span>
      <input
        type="number"
        value={field.value}
        min={field.min}
        max={field.max}
        step={field.step}
        onChange={(event) => onChange(field, event.target.value)}
        className="w-full rounded-md border border-[hsl(var(--notebook-rule))] bg-white px-3 py-2 text-sm text-[hsl(var(--notebook-ink))] focus:border-[hsl(var(--notebook-action-border))] focus:outline-none"
      />
    </label>
  );
}

function AdvancedLayoutControls({
  labelConfig,
  layoutProfile,
  updateLayoutConfig,
  t,
  tx,
}) {
  const customStockFields = [
    {
      key: "labelWidthMm",
      label: tx("label.customStockWidth", "Label width (mm)"),
      value: layoutProfile.widthMm,
      min: 24,
      max: 200,
      step: 0.5,
    },
    {
      key: "labelHeightMm",
      label: tx("label.customStockHeight", "Label height (mm)"),
      value: layoutProfile.heightMm,
      min: 18,
      max: 260,
      step: 0.5,
    },
    {
      key: "columns",
      label: tx("label.customStockColumns", "Columns"),
      value: layoutProfile.columns,
      min: 1,
      max: 6,
      step: 1,
    },
    {
      key: "rows",
      label: tx("label.customStockRows", "Rows"),
      value: layoutProfile.rows,
      min: 1,
      max: 12,
      step: 1,
    },
  ];

  const calibrationFields = [
    {
      key: "pagePaddingMm",
      label: tx("label.pagePadding", "Page padding (mm)"),
      value: layoutProfile.pagePaddingMm,
      min: 0,
      max: 20,
      step: 0.5,
    },
    {
      key: "columnGapMm",
      label: tx("label.columnGap", "Column gap (mm)"),
      value: layoutProfile.columnGapMm,
      min: 0,
      max: 20,
      step: 0.5,
    },
    {
      key: "rowGapMm",
      label: tx("label.rowGap", "Row gap (mm)"),
      value: layoutProfile.rowGapMm,
      min: 0,
      max: 20,
      step: 0.5,
    },
    {
      key: "offsetXmm",
      label: tx("label.offsetX", "Offset X (mm)"),
      value: layoutProfile.offsetXmm,
      min: -10,
      max: 10,
      step: 0.5,
    },
    {
      key: "offsetYmm",
      label: tx("label.offsetY", "Offset Y (mm)"),
      value: layoutProfile.offsetYmm,
      min: -10,
      max: 10,
      step: 0.5,
    },
  ];

  return (
    <details
      className="notebook-print-settings-section rounded-md p-3"
      data-testid="advanced-layout-controls"
    >
      <summary className="flex cursor-pointer list-none items-center gap-2 text-sm font-medium text-[hsl(var(--notebook-ink))]">
        <Settings2 className="h-4 w-4 text-[hsl(var(--notebook-action))]" />
        {tx("label.advancedLayoutTitle", "Advanced layout controls")}
      </summary>
      <p className="mt-2 text-xs text-[hsl(var(--notebook-muted-ink))]">
        {tx(
          "label.advancedLayoutHint",
          "Use these only when the core purpose and stock preset need extra tuning.",
        )}
      </p>
      <div className="mt-4 space-y-5">
        <div className="grid gap-5 xl:grid-cols-2">
          <section className="space-y-3">
            <h3 className="text-sm font-medium text-[hsl(var(--notebook-ink))]">
              {t("label.labelSize")}
            </h3>
            <p className="text-xs text-[hsl(var(--notebook-muted-ink))]">
              {tx(
                "label.densityHint",
                "This controls content density, not the physical stock dimensions.",
              )}
            </p>
            <ConfigButtonGrid
              options={SIZE_OPTIONS}
              value={labelConfig.size}
              onSelect={(size) => updateLayoutConfig({ size })}
              t={t}
            />
          </section>

          <section className="space-y-3">
            <h3 className="text-sm font-medium text-[hsl(var(--notebook-ink))]">
              {t("label.orientation")}
            </h3>
            <ConfigButtonGrid
              options={ORIENTATION_OPTIONS}
              value={labelConfig.orientation}
              onSelect={(orientation) => updateLayoutConfig({ orientation })}
              t={t}
            />
          </section>
        </div>

        <section
          className="notebook-print-stage-fact rounded-md p-3"
          data-testid="custom-stock-size-controls"
        >
          <div className="flex items-center justify-between gap-3">
            <div>
              <h3 className="text-sm font-medium text-[hsl(var(--notebook-ink))]">
                {tx("label.customStockSizeTitle", "Custom stock size")}
              </h3>
              <p className="mt-1 text-xs text-[hsl(var(--notebook-muted-ink))]">
                {tx(
                  "label.customStockSizeHint",
                  "Enter the real label size only when the curated presets do not match your label roll or sheet.",
                )}
              </p>
            </div>
            <span className="notebook-print-stage-fact rounded-full px-2 py-1 text-xs text-[hsl(var(--notebook-muted-ink))]">
              {tx("label.stockPresetCustom", "Custom tuning")}
            </span>
          </div>
          <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            {customStockFields.map((field) => (
              <NumberField
                key={field.key}
                field={field}
                onChange={(item, value) =>
                  updateLayoutConfig({
                    [item.key]: value === "" ? item.min : Number(value),
                  })
                }
              />
            ))}
          </div>
        </section>

        <section className="notebook-print-stage-fact rounded-md p-3">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h3 className="text-sm font-medium text-[hsl(var(--notebook-ink))]">
                {tx("label.calibrationTitle", "Fine-tune layout")}
              </h3>
              <p className="mt-1 text-xs text-[hsl(var(--notebook-muted-ink))]">
                {tx(
                  "label.calibrationHint",
                  "These values stage stock-specific tuning in the config so the parent can persist or reuse them.",
                )}
              </p>
            </div>
            <span className="notebook-print-stage-fact rounded-full px-2 py-1 text-xs text-[hsl(var(--notebook-muted-ink))]">
              {layoutProfile.widthMm} x {layoutProfile.heightMm} mm
            </span>
          </div>

          <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {calibrationFields.map((field) => (
              <NumberField
                key={field.key}
                field={field}
                onChange={(item, value) =>
                  updateLayoutConfig({
                    [item.key]: value === "" ? 0 : Number(value),
                  })
                }
              />
            ))}
          </div>
        </section>
      </div>
    </details>
  );
}

function CustomFieldsControls({
  customLabelFields,
  onCustomLabelFieldsChange,
  t,
}) {
  return (
    <details
      className="notebook-print-settings-section rounded-md p-3"
      data-testid="advanced-custom-fields"
    >
      <summary className="flex cursor-pointer list-none items-center gap-2 text-sm font-medium text-[hsl(var(--notebook-ink))]">
        <CalendarDays className="h-4 w-4 text-[hsl(var(--notebook-action))]" />
        {t("label.customFields")}
      </summary>
      <div className="mt-3 grid gap-2">
        {[
          {
            key: "date",
            labelKey: "label.printDate",
            placeholderKey: "label.printDatePlaceholder",
          },
          {
            key: "batchNumber",
            labelKey: "label.batchNumber",
            placeholderKey: "label.batchNumberPlaceholder",
          },
        ].map((field) => (
          <div
            key={field.key}
            className="grid gap-1 sm:grid-cols-[6rem_minmax(0,1fr)] sm:items-center"
          >
            <label className="text-xs text-[hsl(var(--notebook-muted-ink))]">
              {t(field.labelKey)}
            </label>
            <input
              type="text"
              data-testid={`custom-label-field-${field.key}`}
              value={customLabelFields[field.key]}
              onChange={(event) =>
                onCustomLabelFieldsChange({
                  ...customLabelFields,
                  [field.key]: event.target.value,
                })
              }
              placeholder={t(field.placeholderKey)}
              className="rounded-md border border-[hsl(var(--notebook-rule))] bg-white px-3 py-2 text-sm text-[hsl(var(--notebook-ink))] placeholder:text-slate-400 focus:border-[hsl(var(--notebook-action-border))] focus:outline-none"
            />
          </div>
        ))}
      </div>
      <p className="mt-3 text-xs text-[hsl(var(--notebook-muted-ink))]">
        {t("label.customFieldsHint")}
      </p>
    </details>
  );
}

export default function LabelAdvancedPrintOptions({
  labelConfig,
  layoutProfile,
  customLabelFields,
  printTemplates,
  visibleRecentPrints,
  currentLocale,
  formatPrintTimestamp,
  updateLayoutConfig,
  onCustomLabelFieldsChange,
  onLoadTemplate,
  onDeleteTemplate,
  onSaveTemplate,
  onLoadRecentPrint,
  onClearRecentPrints,
  t,
  tx,
}) {
  return (
    <details
      className="notebook-print-note-section rounded-md p-3"
      data-testid="advanced-print-options"
    >
      <summary className="flex cursor-pointer list-none items-start justify-between gap-3">
        <span className="flex min-w-0 items-center gap-2">
          <Settings2 className="mt-0.5 h-4 w-4 shrink-0 text-[hsl(var(--notebook-action))]" />
          <span className="min-w-0">
            <span className="block text-sm font-semibold text-[hsl(var(--notebook-ink))]">
              {tx("label.advancedPrintOptionsTitle", "Advanced print options")}
            </span>
            <span className="mt-0.5 block text-xs leading-5 text-[hsl(var(--notebook-muted-ink))]">
              {tx(
                "label.advancedPrintOptionsSummary",
                "Calibration, saved jobs, and optional fields.",
              )}
            </span>
          </span>
        </span>
      </summary>
      <p className="mt-3 text-xs leading-5 text-[hsl(var(--notebook-muted-ink))]">
        {tx(
          "label.advancedPrintOptionsHint",
          "Density, calibration, custom fields, and saved jobs are kept here so the main workflow stays focused on choosing and printing the right label.",
        )}
      </p>
      <div className="mt-4 space-y-3">
        <AdvancedLayoutControls
          labelConfig={labelConfig}
          layoutProfile={layoutProfile}
          updateLayoutConfig={updateLayoutConfig}
          t={t}
          tx={tx}
        />
        <CustomFieldsControls
          customLabelFields={customLabelFields}
          onCustomLabelFieldsChange={onCustomLabelFieldsChange}
          t={t}
        />
        <SavedPrintControls
          t={t}
          tx={tx}
          printTemplates={printTemplates}
          templateOptions={TEMPLATE_OPTIONS}
          visibleRecentPrints={visibleRecentPrints}
          currentLocale={currentLocale}
          formatPrintTimestamp={formatPrintTimestamp}
          onLoadTemplate={onLoadTemplate}
          onDeleteTemplate={onDeleteTemplate}
          onSaveTemplate={onSaveTemplate}
          onLoadRecentPrint={onLoadRecentPrint}
          onClearRecentPrints={onClearRecentPrints}
        />
      </div>
    </details>
  );
}
