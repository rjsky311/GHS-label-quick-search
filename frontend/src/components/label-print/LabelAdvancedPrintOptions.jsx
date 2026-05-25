import { CalendarDays, FileText, Settings2 } from "lucide-react";
import {
  ConfigButtonGrid,
} from "@/components/label-print/LabelPrintConfigControls";
import SavedPrintControls from "@/components/label-print/SavedPrintControls";
import {
  ORIENTATION_OPTIONS,
  SIZE_OPTIONS,
  TEMPLATE_OPTIONS,
} from "@/components/label-print/labelPrintModalOptions";

function TemplateOverrideControls({ labelConfig, updateVisualConfig, t, tx }) {
  return (
    <details
      className="rounded-md border border-slate-200 bg-white p-3"
      data-testid="advanced-template-controls"
    >
      <summary className="flex cursor-pointer list-none items-center gap-2 text-sm font-medium text-slate-800">
        <FileText className="h-4 w-4 text-blue-600" />
        {tx("label.templateOverrideTitle", "Template override")}
      </summary>
      <p className="mt-2 text-xs text-slate-500">
        {tx(
          "label.templateOverrideHint",
          "Purpose presets choose the recommended template automatically; override only for a special label job.",
        )}
      </p>
      <div className="mt-3 grid gap-3 md:grid-cols-2">
        {TEMPLATE_OPTIONS.map((template) => {
          const Icon = template.icon;
          const selected = labelConfig.template === template.value;

          return (
            <button
              key={template.value}
              type="button"
              onClick={() => updateVisualConfig({ template: template.value })}
              className={`rounded-md border p-3 text-left transition-colors ${
                selected
                  ? "border-blue-500 bg-blue-50"
                  : "border-slate-200 bg-white hover:border-blue-300 hover:bg-blue-50"
              }`}
            >
              <div className="flex items-center gap-2">
                <span className="rounded-md bg-blue-50 p-2 text-blue-700">
                  <Icon className="h-5 w-5" />
                </span>
                <span
                  className={`font-medium ${
                    selected ? "text-blue-800" : "text-slate-900"
                  }`}
                >
                  {t(template.labelKey)}
                </span>
              </div>
              <div className="mt-2 text-sm text-slate-400">
                {t(template.descKey)}
              </div>
              <div className="mt-2 text-xs text-slate-500">
                {t(template.tipKey)}
              </div>
            </button>
          );
        })}
      </div>
    </details>
  );
}

function NumberField({ field, onChange }) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs text-slate-500">
        {field.label}
      </span>
      <input
        type="number"
        value={field.value}
        min={field.min}
        max={field.max}
        step={field.step}
        onChange={(event) => onChange(field, event.target.value)}
        className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-blue-500 focus:outline-none"
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
      className="rounded-md border border-slate-200 bg-white p-3"
      data-testid="advanced-layout-controls"
    >
      <summary className="flex cursor-pointer list-none items-center gap-2 text-sm font-medium text-slate-800">
        <Settings2 className="h-4 w-4 text-blue-600" />
        {tx("label.advancedLayoutTitle", "Advanced layout controls")}
      </summary>
      <p className="mt-2 text-xs text-slate-500">
        {tx(
          "label.advancedLayoutHint",
          "Use these only when the core purpose and stock preset need extra tuning.",
        )}
      </p>
      <div className="mt-4 space-y-5">
        <div className="grid gap-5 xl:grid-cols-2">
          <section className="space-y-3">
            <h3 className="text-sm font-medium text-slate-800">
              {t("label.labelSize")}
            </h3>
            <p className="text-xs text-slate-500">
              {tx(
                "label.densityHint",
                "This controls content density, not the physical stock dimensions.",
              )}
            </p>
            <ConfigButtonGrid
              options={SIZE_OPTIONS}
              value={labelConfig.size}
              onSelect={(size) => updateLayoutConfig({ size })}
              activeClasses="border-amber-500 bg-amber-50 text-amber-800"
              t={t}
            />
          </section>

          <section className="space-y-3">
            <h3 className="text-sm font-medium text-slate-800">
              {t("label.orientation")}
            </h3>
            <ConfigButtonGrid
              options={ORIENTATION_OPTIONS}
              value={labelConfig.orientation}
              onSelect={(orientation) => updateLayoutConfig({ orientation })}
              activeClasses="border-blue-500 bg-blue-50 text-blue-800"
              t={t}
            />
          </section>
        </div>

        <section
          className="rounded-md border border-slate-200 bg-slate-50 p-3"
          data-testid="custom-stock-size-controls"
        >
          <div className="flex items-center justify-between gap-3">
            <div>
              <h3 className="text-sm font-medium text-slate-800">
                {tx("label.customStockSizeTitle", "Custom stock size")}
              </h3>
              <p className="mt-1 text-xs text-slate-500">
                {tx(
                  "label.customStockSizeHint",
                  "Enter the real label size only when the curated presets do not match your label roll or sheet.",
                )}
              </p>
            </div>
            <span className="rounded-full bg-white px-2 py-1 text-xs text-slate-600 ring-1 ring-slate-200">
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

        <section className="rounded-md border border-slate-200 bg-slate-50 p-3">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h3 className="text-sm font-medium text-slate-800">
                {tx("label.calibrationTitle", "Fine-tune layout")}
              </h3>
              <p className="mt-1 text-xs text-slate-500">
                {tx(
                  "label.calibrationHint",
                  "These values stage stock-specific tuning in the config so the parent can persist or reuse them.",
                )}
              </p>
            </div>
            <span className="rounded-full bg-white px-2 py-1 text-xs text-slate-600 ring-1 ring-slate-200">
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
      className="rounded-md border border-slate-200 bg-white p-3"
      data-testid="advanced-custom-fields"
    >
      <summary className="flex cursor-pointer list-none items-center gap-2 text-sm font-medium text-slate-800">
        <CalendarDays className="h-4 w-4 text-blue-600" />
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
            <label className="text-xs text-slate-500">
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
              className="rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-blue-500 focus:outline-none"
            />
          </div>
        ))}
      </div>
      <p className="mt-3 text-xs text-slate-500">
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
  updateVisualConfig,
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
      className="rounded-lg border border-slate-200 bg-slate-50/70 p-4"
      data-testid="advanced-print-options"
    >
      <summary className="flex cursor-pointer list-none items-center gap-2 text-sm font-semibold text-slate-800">
        <Settings2 className="h-4 w-4 text-blue-600" />
        {tx("label.advancedPrintOptionsTitle", "Advanced print options")}
      </summary>
      <p className="mt-2 text-xs leading-5 text-slate-500">
        {tx(
          "label.advancedPrintOptionsHint",
          "Template overrides, density, calibration, custom fields, and saved jobs are kept here so the main workflow stays focused on choosing and printing the right label.",
        )}
      </p>
      <div className="mt-4 space-y-3">
        <TemplateOverrideControls
          labelConfig={labelConfig}
          updateVisualConfig={updateVisualConfig}
          t={t}
          tx={tx}
        />
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
