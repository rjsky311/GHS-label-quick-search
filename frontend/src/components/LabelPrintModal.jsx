import { useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import {
  AlertTriangle,
  BookOpen,
  Bookmark,
  Building2,
  CalendarDays,
  Check,
  CheckCircle2,
  ClipboardList,
  FileSpreadsheet,
  FileText,
  FlaskConical,
  Languages,
  LayoutPanelTop,
  Lightbulb,
  MapPin,
  Package2,
  Palette,
  Phone,
  Plus,
  Printer,
  QrCode,
  ScanLine,
  Settings2,
  Tag,
  Target,
  X,
} from "lucide-react";
import {
  LABEL_STOCK_PRESETS,
  resolvePrintLayoutConfig,
} from "@/constants/labelStocks";
import { buildPrintPreviewDocument } from "@/utils/printLabels";
import { formatPreparedDisplayName } from "@/utils/preparedSolution";

const TEMPLATE_OPTIONS = [
  {
    value: "icon",
    labelKey: "label.templateIcon",
    descKey: "label.templateIconDesc",
    tipKey: "label.templateIconTip",
    icon: Target,
  },
  {
    value: "standard",
    labelKey: "label.templateStandard",
    descKey: "label.templateStandardDesc",
    tipKey: "label.templateStandardTip",
    icon: ClipboardList,
  },
  {
    value: "full",
    labelKey: "label.templateFull",
    descKey: "label.templateFullDesc",
    tipKey: "label.templateFullTip",
    icon: FileText,
  },
  {
    value: "qrcode",
    labelKey: "label.templateQR",
    descKey: "label.templateQRDesc",
    tipKey: "label.templateQRTip",
    icon: QrCode,
  },
];

const SIZE_OPTIONS = [
  { value: "small", labelKey: "label.sizeSmall", descKey: "label.sizeSmallDesc", tipKey: "label.sizeSmallTip" },
  { value: "medium", labelKey: "label.sizeMedium", descKey: "label.sizeMediumDesc", tipKey: "label.sizeMediumTip" },
  { value: "large", labelKey: "label.sizeLarge", descKey: "label.sizeLargeDesc", tipKey: "label.sizeLargeTip" },
];

const ORIENTATION_OPTIONS = [
  { value: "portrait", labelKey: "label.portrait", descKey: "label.portraitDesc", icon: FileText },
  { value: "landscape", labelKey: "label.landscape", descKey: "label.landscapeDesc", icon: BookOpen },
];

const NAME_DISPLAY_OPTIONS = [
  { value: "both", labelKey: "label.nameBoth", descKey: "label.nameBothDesc", icon: Languages },
  { value: "en", labelKey: "label.nameEn", iconLabel: "EN" },
  { value: "zh", labelKey: "label.nameZh", iconLabel: "ZH" },
];

const COLOR_OPTIONS = [
  { value: "color", labelKey: "label.colorColor", iconLabel: "CMYK" },
  { value: "bw", labelKey: "label.colorBW", iconLabel: "B/W" },
];

const STOCK_PRESETS = LABEL_STOCK_PRESETS.map((preset) => ({
  ...preset,
  perPage: preset.columns * preset.rows,
  widthMm: preset.labelWidthMm,
  heightMm: preset.labelHeightMm,
}));

const GRID_MAP = {
  portrait: { small: 15, medium: 8, large: 3 },
  landscape: { small: 16, medium: 9, large: 4 },
};

const COLUMN_MAP = {
  portrait: { small: 3, medium: 2, large: 1 },
  landscape: { small: 4, medium: 3, large: 2 },
};

const SIZE_DIMENSIONS = {
  small: {
    portrait: [54, 32],
    landscape: [70, 24],
  },
  medium: {
    portrait: [95, 50],
    landscape: [90, 38],
  },
  large: {
    portrait: [140, 88],
    landscape: [128, 60],
  },
};

function parseNumber(value, fallback) {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : fallback;
}

function getBaseLayout(size = "medium", orientation = "portrait") {
  const perPage = GRID_MAP[orientation]?.[size] ?? 8;
  const columns = COLUMN_MAP[orientation]?.[size] ?? 2;
  const rows = Math.max(1, Math.ceil(perPage / columns));
  const dimensions = SIZE_DIMENSIONS[size] ?? SIZE_DIMENSIONS.medium;
  const [widthMm, heightMm] = dimensions[orientation] ?? dimensions.portrait;

  return {
    size,
    orientation,
    columns,
    rows,
    perPage,
    widthMm,
    heightMm,
    pagePaddingMm: size === "large" ? 10 : 8,
    columnGapMm: size === "small" ? 3 : 4,
    rowGapMm: size === "small" ? 3 : 4,
    offsetXmm: 0,
    offsetYmm: 0,
    stockPreset: "custom",
    stockPresetName: "Custom Tuning",
    note: null,
  };
}

function resolveLayoutProfile(labelConfig) {
  return resolvePrintLayoutConfig(labelConfig);
}

function buildDisplayNames(chem, nameDisplay) {
  if (!chem) return [];

  const preparedName = chem.isPreparedSolution ? formatPreparedDisplayName(chem) : null;
  const englishName = preparedName || chem.name_en || chem.name || chem.cas_number;
  const chineseName = chem.name_zh || chem.name_zh_tw || "";

  if (nameDisplay === "en") return [englishName].filter(Boolean);
  if (nameDisplay === "zh") return [chineseName || englishName].filter(Boolean);

  return [englishName, chineseName].filter(Boolean);
}

function buildHazardPreview(chem, template, tx) {
  if (!chem) {
    return [tx("label.previewHazardPlaceholder", "Signal word, pictograms, and hazards will appear here.")];
  }

  if (template === "icon") {
    return [tx("label.previewIconFocus", "Compact label: pictograms and signal word stay dominant.")];
  }

  if (template === "qrcode") {
    return [tx("label.previewScanFocus", "Scan-first layout keeps only the essentials next to the QR.")];
  }

  const limit = template === "full" ? 3 : 2;
  const statements = (chem.hazard_statements || [])
    .slice(0, limit)
    .map((statement) => {
      const text = statement.text_zh || statement.text_en || "";
      return text ? `${statement.code}: ${text}` : statement.code;
    })
    .filter(Boolean);

  return statements.length
    ? statements
    : [tx("label.previewHazardPlaceholder", "Signal word, pictograms, and hazards will appear here.")];
}

function buildPreviewRisks({ previewChem, labelConfig, layoutProfile, labProfile, displayNames, tx }) {
  if (!previewChem) {
    return [tx("label.previewRiskEmpty", "Select a chemical to see live density and scan balance.")];
  }

  const risks = [];
  const longestName = displayNames.reduce((longest, name) => Math.max(longest, name.length), 0);
  const pictogramCount = previewChem.ghs_pictograms?.length || 0;
  const hasProfile = Boolean(labProfile.organization || labProfile.phone || labProfile.address);

  if (longestName > 28 && layoutProfile.size === "small") {
    risks.push(tx("label.previewRiskName", "Long names will crowd a small stock preset quickly."));
  }

  if (pictogramCount > 3 && (labelConfig.template === "icon" || layoutProfile.size === "small")) {
    risks.push(tx("label.previewRiskPictograms", "This selection carries enough pictograms to pressure compact layouts."));
  }

  if (previewChem.isPreparedSolution && (labelConfig.template === "icon" || layoutProfile.size === "small")) {
    risks.push(tx("label.previewRiskPrepared", "Prepared-solution metadata is likely to feel tight in compact templates."));
  }

  if (!hasProfile && labelConfig.template !== "icon") {
    risks.push(tx("label.previewRiskProfile", "No lab/supplier profile is set, so the printed label will stay generic."));
  }

  if (labelConfig.template === "qrcode" && layoutProfile.size === "large") {
    risks.push(tx("label.previewRiskQr", "QR layouts read best when the scan block stays dominant; keep the left side short."));
  }

  return risks.length
    ? risks
    : [tx("label.previewRiskReady", "This combination looks balanced for the current content load.")];
}

function getDensityLabel(labelConfig, layoutProfile, previewChem, tx) {
  if (labelConfig.template === "icon" || layoutProfile.size === "small") {
    return tx("label.previewDensityTight", "Tight");
  }

  if (labelConfig.template === "full" || layoutProfile.size === "large" || previewChem?.ghs_pictograms?.length > 2) {
    return tx("label.previewDensityRich", "Roomy");
  }

  return tx("label.previewDensityBalanced", "Balanced");
}

function getOptionLabel(options, value, t, fallback) {
  const option = options.find((item) => item.value === value);
  return option ? t(option.labelKey) : fallback;
}

export default function LabelPrintModal({
  selectedForLabel,
  labelConfig,
  customGHSSettings = {},
  onLabelConfigChange,
  customLabelFields,
  onCustomLabelFieldsChange,
  labProfile = {},
  onLabProfileChange,
  onClearLabProfile,
  labelQuantities,
  onLabelQuantitiesChange,
  onPrintLabels,
  onToggleSelectForLabel,
  printTemplates = [],
  onSaveTemplate,
  onLoadTemplate,
  onDeleteTemplate,
  recentPrints = [],
  onLoadRecentPrint,
  onClearRecentPrints,
  onClose,
}) {
  const { t } = useTranslation();
  const dialogRef = useRef(null);
  const [showSaveInput, setShowSaveInput] = useState(false);
  const [templateName, setTemplateName] = useState("");

  const tx = (key, fallback, options = {}) => {
    const translated = t(key, { ...options, defaultValue: fallback });
    return translated === key ? fallback : translated;
  };

  useEffect(() => {
    dialogRef.current?.focus();

    const handleKeyDown = (event) => {
      if (event.key === "Escape") onClose();
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  const layoutProfile = resolveLayoutProfile(labelConfig);
  const previewChem = selectedForLabel[0] ?? null;
  const totalLabels = selectedForLabel.reduce(
    (sum, chem) => sum + (labelQuantities?.[chem.cas_number] || 1),
    0
  );
  const estimatedPages = totalLabels > 0 ? Math.ceil(totalLabels / layoutProfile.perPage) : 0;
  const displayNames = buildDisplayNames(previewChem, labelConfig.nameDisplay);
  const previewRisks = buildPreviewRisks({
    previewChem,
    labelConfig,
    layoutProfile,
    labProfile,
    displayNames,
    tx,
  });
  const densityLabel = getDensityLabel(labelConfig, layoutProfile, previewChem, tx);
  const visibleRecentPrints = recentPrints.slice(0, 5);
  const sheetPreviewBundle = useMemo(
    () =>
      buildPrintPreviewDocument(
        selectedForLabel,
        labelConfig,
        customGHSSettings,
        customLabelFields,
        labelQuantities,
        labProfile,
        { mode: "sheet" }
      ),
    [
      selectedForLabel,
      labelConfig,
      customGHSSettings,
      customLabelFields,
      labelQuantities,
      labProfile,
    ]
  );
  const labelPreviewBundle = useMemo(() => {
    if (!previewChem) return null;

    return buildPrintPreviewDocument(
      [previewChem],
      labelConfig,
      customGHSSettings,
      customLabelFields,
      { [previewChem.cas_number]: 1 },
      labProfile,
      { mode: "label" }
    );
  }, [
    previewChem,
    labelConfig,
    customGHSSettings,
    customLabelFields,
    labProfile,
  ]);

  const formatPrintTimestamp = (value) => {
    if (!value) return "";
    try {
      return new Intl.DateTimeFormat(undefined, {
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      }).format(new Date(value));
    } catch {
      return value;
    }
  };

  const updateVisualConfig = (patch) => {
    onLabelConfigChange({ ...labelConfig, ...patch });
  };

  const updateLayoutConfig = (patch) => {
    onLabelConfigChange({
      ...labelConfig,
      ...patch,
      stockPreset: patch.stockPreset ?? "custom",
    });
  };

  const applyStockPreset = (preset) => {
    onLabelConfigChange({
      ...labelConfig,
      stockPreset: preset.id,
      size: preset.size,
      orientation: preset.orientation,
      columns: preset.columns,
      rows: preset.rows,
      perPage: preset.perPage,
      labelWidthMm: preset.widthMm,
      labelHeightMm: preset.heightMm,
      pagePaddingMm: preset.pagePaddingMm,
      columnGapMm: preset.columnGapMm,
      rowGapMm: preset.rowGapMm,
      offsetXmm: preset.offsetXmm,
      offsetYmm: preset.offsetYmm,
    });
  };

  const renderConfigButtons = (options, value, onSelect, activeClasses) => (
    <div className="grid grid-cols-2 gap-3">
      {options.map((option) => {
        const Icon = option.icon;
        const selected = value === option.value;

        return (
          <button
            key={option.value}
            type="button"
            onClick={() => onSelect(option.value)}
            className={`rounded-xl border p-3 text-left transition-colors ${
              selected
                ? activeClasses
                : "border-slate-700 bg-slate-900/80 text-slate-300 hover:border-slate-500"
            }`}
          >
            <div className="flex items-center gap-2">
              {Icon ? (
                <Icon className="h-4 w-4 shrink-0" />
              ) : (
                <span className="text-xs font-semibold tracking-[0.2em]">{option.iconLabel}</span>
              )}
              <span className="font-medium">{t(option.labelKey)}</span>
            </div>
            {option.descKey && <div className="mt-1 text-xs text-slate-400">{t(option.descKey)}</div>}
            {option.tipKey && <div className="mt-1 text-xs text-slate-500">{t(option.tipKey)}</div>}
          </button>
        );
      })}
    </div>
  );

  const renderPreviewMeta = () => (
    <div className="flex flex-wrap gap-2 text-xs text-slate-300">
      <span className="rounded-full bg-slate-900/80 px-2 py-1 font-mono text-amber-300">
        {previewChem?.cas_number || "CAS"}
      </span>
      {previewChem?.signal_word && (
        <span className="rounded-full bg-rose-500/15 px-2 py-1 font-medium text-rose-200">
          {previewChem.signal_word}
        </span>
      )}
      {(previewChem?.ghs_pictograms?.length || 0) > 0 && (
        <span className="rounded-full bg-slate-900/80 px-2 py-1 text-slate-200">
          {tx("label.previewPictograms", "Pictograms")}: {previewChem.ghs_pictograms.length}
        </span>
      )}
      {previewChem?.isPreparedSolution && (
        <span className="rounded-full bg-blue-500/15 px-2 py-1 text-blue-200">
          {t("print.preparedShort")}
        </span>
      )}
    </div>
  );

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="label-modal-title"
    >
      <div
        ref={dialogRef}
        tabIndex={-1}
        className="max-h-[92vh] w-full max-w-6xl overflow-y-auto rounded-3xl bg-slate-800 outline-none"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-slate-700 px-6 py-5">
          <div>
            <h2 id="label-modal-title" className="flex items-center gap-2 text-xl font-bold text-white">
              <Tag className="h-5 w-5 text-purple-400" /> {t("label.title")}
            </h2>
            <p className="mt-1 text-sm text-slate-400">
              {tx(
                "label.settingsPreviewIntro",
                "Tune the label layout on the left and watch the preview react immediately on the right."
              )}
            </p>
          </div>
          <button type="button" onClick={onClose} className="text-slate-400 transition-colors hover:text-white">
            <X className="h-6 w-6" />
          </button>
        </div>

        <div className="border-b border-slate-700 px-6 py-4">
          <div className="flex items-center gap-2 text-sm font-medium text-slate-300">
            <Bookmark className="h-4 w-4 text-purple-400" />
            {t("label.quickTemplates")}
          </div>
          <div className="mt-3">
            {printTemplates.length === 0 && !showSaveInput ? (
              <p className="text-xs text-slate-500">{t("label.noTemplates")}</p>
            ) : (
              <div className="flex flex-wrap gap-2">
                {printTemplates.map((template) => (
                  <div
                    key={template.id}
                    className="group flex items-center gap-1 rounded-lg border border-slate-600 bg-slate-900 px-3 py-1.5 text-sm text-slate-300 transition-colors hover:border-purple-500"
                  >
                    <button
                      type="button"
                      onClick={() => {
                        onLoadTemplate(template);
                        toast.success(t("label.loadTemplateSuccess", { name: template.name }));
                      }}
                    >
                      {template.name}
                    </button>
                    <button
                      type="button"
                      onClick={(event) => {
                        event.stopPropagation();
                        if (window.confirm(t("label.deleteTemplateConfirm", { name: template.name }))) {
                          onDeleteTemplate(template.id);
                          toast.success(t("label.deleteTemplateSuccess"));
                        }
                      }}
                      className="ml-1 text-slate-500 opacity-0 transition-opacity hover:text-red-400 group-hover:opacity-100"
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
                  className="flex items-center gap-1 text-xs text-purple-400 transition-colors hover:text-purple-300"
                >
                  <Plus className="h-3 w-3" /> {t("label.saveCurrentBtn")}
                </button>
              ) : (
                <p className="text-xs text-amber-500">{t("label.templateLimitHint")}</p>
              )
            ) : (
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={templateName}
                  onChange={(event) => setTemplateName(event.target.value.slice(0, 30))}
                  placeholder={t("label.templateNamePlaceholder")}
                  className="flex-1 rounded-md border border-slate-600 bg-slate-900 px-2 py-1 text-sm text-slate-200 placeholder:text-slate-500 focus:border-purple-500 focus:outline-none"
                  autoFocus
                  onKeyDown={(event) => {
                    if (event.key === "Enter" && templateName.trim()) {
                      const success = onSaveTemplate(templateName.trim());
                      if (success) {
                        toast.success(t("label.saveTemplateSuccess", { name: templateName.trim() }));
                        setTemplateName("");
                        setShowSaveInput(false);
                      }
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
                  onClick={() => {
                    if (!templateName.trim()) {
                      toast.error(t("label.templateNameRequired"));
                      return;
                    }

                    const success = onSaveTemplate(templateName.trim());
                    if (success) {
                      toast.success(t("label.saveTemplateSuccess", { name: templateName.trim() }));
                      setTemplateName("");
                      setShowSaveInput(false);
                    }
                  }}
                  className="rounded bg-purple-500 p-1.5 text-white transition-colors hover:bg-purple-600"
                >
                  <Check className="h-3.5 w-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setTemplateName("");
                    setShowSaveInput(false);
                  }}
                  className="rounded bg-slate-700 p-1.5 text-slate-300 transition-colors hover:bg-slate-600"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            )}
          </div>
        </div>

        <div className="border-b border-slate-700 px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-sm font-medium text-slate-300">
              <LayoutPanelTop className="h-4 w-4 text-blue-400" />
              {tx("label.recentPrintsTitle", "Recent print queue")}
            </div>
            {visibleRecentPrints.length > 0 && typeof onClearRecentPrints === "function" && (
              <button
                type="button"
                onClick={onClearRecentPrints}
                className="text-xs text-slate-400 transition-colors hover:text-white"
              >
                {tx("label.recentPrintsClear", "Clear")}
              </button>
            )}
          </div>
          {visibleRecentPrints.length === 0 ? (
            <p className="mt-3 text-xs text-slate-500">
              {tx(
                "label.recentPrintsEmpty",
                "Recent print jobs will appear here so you can reload a label set in one click."
              )}
            </p>
          ) : (
            <div className="mt-3 grid gap-2">
              {visibleRecentPrints.map((job) => {
                const firstItem = job.items?.[0];
                const remaining = Math.max(0, (job.totalChemicals || job.items?.length || 1) - 1);
                const primaryLabel = firstItem?.name_en || firstItem?.cas_number || tx("label.recentPrintUnknown", "Saved job");

                return (
                  <div
                    key={job.id}
                    className="flex items-center justify-between gap-3 rounded-xl border border-slate-700 bg-slate-900/70 px-3 py-2"
                  >
                    <div className="min-w-0">
                      <div className="truncate text-sm font-medium text-white">
                        {primaryLabel}
                        {remaining > 0 ? ` +${remaining}` : ""}
                      </div>
                      <div className="mt-1 flex flex-wrap gap-2 text-xs text-slate-400">
                        <span>{formatPrintTimestamp(job.createdAt)}</span>
                        <span>{job.totalLabels || 0} {tx("label.recentPrintLabels", "labels")}</span>
                        <span>{job.labelConfig?.template || "standard"}</span>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => onLoadRecentPrint?.(job)}
                      className="rounded-lg bg-blue-500/15 px-3 py-1.5 text-xs font-medium text-blue-200 transition-colors hover:bg-blue-500/25"
                    >
                      {tx("label.recentPrintLoad", "Load")}
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div className="grid gap-6 px-6 py-6 lg:grid-cols-[minmax(0,1fr)_23rem]">
          <div className="space-y-6">
            <section className="rounded-2xl border border-slate-700 bg-slate-900/50 p-4">
              <div className="flex items-center gap-2 text-sm font-medium text-slate-200">
                <Settings2 className="h-4 w-4 text-purple-400" />
                {tx("label.settingsTitle", "Print setup")}
              </div>
              <p className="mt-2 text-sm text-slate-400">
                {tx(
                  "label.settingsBody",
                  "Use stock presets for a fast starting point, then fine-tune spacing and nudges without leaving the modal."
                )}
              </p>
            </section>

            <section className="space-y-3">
              <h3 className="text-sm font-medium text-slate-300">{t("label.selectTemplate")}</h3>
              <div className="grid gap-3 md:grid-cols-2">
                {TEMPLATE_OPTIONS.map((template) => {
                  const Icon = template.icon;
                  const selected = labelConfig.template === template.value;

                  return (
                    <button
                      key={template.value}
                      type="button"
                      onClick={() => updateVisualConfig({ template: template.value })}
                      className={`rounded-2xl border p-4 text-left transition-colors ${
                        selected
                          ? "border-purple-500 bg-purple-500/10"
                          : "border-slate-700 bg-slate-900/80 hover:border-slate-500"
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <span className="rounded-lg bg-slate-800 p-2 text-purple-300">
                          <Icon className="h-5 w-5" />
                        </span>
                        <span className={`font-medium ${selected ? "text-purple-300" : "text-white"}`}>
                          {t(template.labelKey)}
                        </span>
                      </div>
                      <div className="mt-2 text-sm text-slate-400">{t(template.descKey)}</div>
                      <div className="mt-2 text-xs text-slate-500">{t(template.tipKey)}</div>
                    </button>
                  );
                })}
              </div>
            </section>

            <section className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-medium text-slate-300">
                  {tx("label.stockPresetsTitle", "Label stock presets")}
                </h3>
                <span className="text-xs text-slate-500">
                  {layoutProfile.stockPreset === "custom"
                    ? tx("label.stockPresetCustom", "Custom tuning")
                    : layoutProfile.stockPresetName}
                </span>
              </div>
              <div className="grid gap-3 md:grid-cols-2">
                {STOCK_PRESETS.map((preset) => {
                  const selected = layoutProfile.stockPreset === preset.id;

                  return (
                    <button
                      key={preset.id}
                      type="button"
                      onClick={() => applyStockPreset(preset)}
                      data-testid={`stock-preset-${preset.id}`}
                      className={`rounded-2xl border p-4 text-left transition-colors ${
                        selected
                          ? "border-amber-500 bg-amber-500/10"
                          : "border-slate-700 bg-slate-900/80 hover:border-slate-500"
                      }`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <div className={`font-medium ${selected ? "text-amber-300" : "text-white"}`}>
                            {preset.name}
                          </div>
                          <div className="mt-1 text-xs text-slate-400">{preset.note}</div>
                        </div>
                        <span className="rounded-full bg-slate-800 px-2 py-1 text-xs text-slate-300">
                          {preset.perPage}/page
                        </span>
                      </div>
                      <div className="mt-3 flex flex-wrap gap-2 text-xs text-slate-400">
                        <span className="rounded-full bg-slate-800 px-2 py-1">
                          {preset.widthMm} x {preset.heightMm} mm
                        </span>
                        <span className="rounded-full bg-slate-800 px-2 py-1">
                          {preset.columns} x {preset.rows}
                        </span>
                        <span className="rounded-full bg-slate-800 px-2 py-1">
                          {t(
                            ORIENTATION_OPTIONS.find((item) => item.value === preset.orientation)?.labelKey ||
                              "label.portrait"
                          )}
                        </span>
                      </div>
                    </button>
                  );
                })}
              </div>
              <p className="text-xs text-slate-500">
                {tx(
                  "label.stockPresetsHint",
                  "Presets are a starting point. Any manual spacing or nudge change switches the modal into custom tuning."
                )}
              </p>
            </section>

            <div className="grid gap-6 xl:grid-cols-2">
              <section className="space-y-3">
                <h3 className="text-sm font-medium text-slate-300">{t("label.labelSize")}</h3>
                {renderConfigButtons(
                  SIZE_OPTIONS,
                  labelConfig.size,
                  (size) => updateLayoutConfig({ size }),
                  "border-amber-500 bg-amber-500/10 text-amber-300"
                )}
              </section>

              <section className="space-y-3">
                <h3 className="text-sm font-medium text-slate-300">{t("label.orientation")}</h3>
                {renderConfigButtons(
                  ORIENTATION_OPTIONS,
                  labelConfig.orientation,
                  (orientation) => updateLayoutConfig({ orientation }),
                  "border-blue-500 bg-blue-500/10 text-blue-300"
                )}
              </section>
            </div>

            <div className="grid gap-6 xl:grid-cols-2">
              <section className="space-y-3">
                <h3 className="text-sm font-medium text-slate-300">{t("label.nameDisplay")}</h3>
                {renderConfigButtons(
                  NAME_DISPLAY_OPTIONS,
                  labelConfig.nameDisplay,
                  (nameDisplay) => updateVisualConfig({ nameDisplay }),
                  "border-emerald-500 bg-emerald-500/10 text-emerald-300"
                )}
              </section>

              <section className="space-y-3">
                <h3 className="flex items-center gap-2 text-sm font-medium text-slate-300">
                  <Palette className="h-4 w-4 text-emerald-400" />
                  {t("label.colorMode")}
                </h3>
                {renderConfigButtons(
                  COLOR_OPTIONS,
                  labelConfig.colorMode,
                  (colorMode) => updateVisualConfig({ colorMode }),
                  "border-emerald-500 bg-emerald-500/10 text-emerald-300"
                )}
              </section>
            </div>

            <section className="rounded-2xl border border-slate-700 bg-slate-900/60 p-4">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <h3 className="text-sm font-medium text-slate-200">
                    {tx("label.calibrationTitle", "Fine-tune layout")}
                  </h3>
                  <p className="mt-1 text-xs text-slate-500">
                    {tx(
                      "label.calibrationHint",
                      "These values stage stock-specific tuning in the config so the parent can persist or reuse them."
                    )}
                  </p>
                </div>
                <span className="rounded-full bg-slate-800 px-2 py-1 text-xs text-slate-300">
                  {layoutProfile.widthMm} x {layoutProfile.heightMm} mm
                </span>
              </div>

              <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                {[
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
                ].map((field) => (
                  <label key={field.key} className="block">
                    <span className="mb-1 block text-xs text-slate-400">{field.label}</span>
                    <input
                      type="number"
                      value={field.value}
                      min={field.min}
                      max={field.max}
                      step={field.step}
                      onChange={(event) =>
                        updateLayoutConfig({
                          [field.key]: event.target.value === "" ? 0 : Number(event.target.value),
                        })
                      }
                      className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100 focus:border-blue-500 focus:outline-none"
                    />
                  </label>
                ))}
              </div>
            </section>

            <section className="rounded-2xl border border-slate-700 bg-slate-900/60 p-4">
              <div className="mb-3 flex items-center justify-between">
                <h3 className="text-sm font-medium text-slate-200">{t("label.profileTitle")}</h3>
                {(labProfile.organization || labProfile.phone || labProfile.address) &&
                  typeof onClearLabProfile === "function" && (
                    <button
                      type="button"
                      onClick={onClearLabProfile}
                      className="text-xs text-red-400 transition-colors hover:text-red-300"
                    >
                      {t("label.profileClear")}
                    </button>
                  )}
              </div>
              <div className="grid gap-2">
                {[
                  {
                    key: "organization",
                    labelKey: "label.profileOrganization",
                    placeholderKey: "label.profileOrganizationPlaceholder",
                  },
                  {
                    key: "phone",
                    labelKey: "label.profilePhone",
                    placeholderKey: "label.profilePhonePlaceholder",
                  },
                  {
                    key: "address",
                    labelKey: "label.profileAddress",
                    placeholderKey: "label.profileAddressPlaceholder",
                  },
                ].map((field) => (
                  <div key={field.key} className="grid gap-1 sm:grid-cols-[6rem_minmax(0,1fr)] sm:items-center">
                    <label className="text-xs text-slate-500">{t(field.labelKey)}</label>
                    <input
                      type="text"
                      value={labProfile[field.key] || ""}
                      onChange={(event) =>
                        onLabProfileChange?.({
                          ...labProfile,
                          [field.key]: event.target.value,
                        })
                      }
                      placeholder={t(field.placeholderKey)}
                      className="rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100 placeholder:text-slate-500 focus:border-blue-500 focus:outline-none"
                    />
                  </div>
                ))}
              </div>
              <p className="mt-3 text-xs text-slate-500">{t("label.profileHint")}</p>
            </section>

            <section className="rounded-2xl border border-slate-700 bg-slate-900/60 p-4">
              <h3 className="text-sm font-medium text-slate-200">{t("label.customFields")}</h3>
              <div className="mt-3 grid gap-2">
                {[
                  { key: "date", labelKey: "label.printDate", placeholderKey: "label.printDatePlaceholder" },
                  {
                    key: "batchNumber",
                    labelKey: "label.batchNumber",
                    placeholderKey: "label.batchNumberPlaceholder",
                  },
                ].map((field) => (
                  <div key={field.key} className="grid gap-1 sm:grid-cols-[6rem_minmax(0,1fr)] sm:items-center">
                    <label className="text-xs text-slate-500">{t(field.labelKey)}</label>
                    <input
                      type="text"
                      value={customLabelFields[field.key]}
                      onChange={(event) =>
                        onCustomLabelFieldsChange({
                          ...customLabelFields,
                          [field.key]: event.target.value,
                        })
                      }
                      placeholder={t(field.placeholderKey)}
                      className="rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100 placeholder:text-slate-500 focus:border-blue-500 focus:outline-none"
                    />
                  </div>
                ))}
              </div>
              <p className="mt-3 text-xs text-slate-500">{t("label.customFieldsHint")}</p>
            </section>

            {selectedForLabel.length > 0 && (
              <section className="rounded-2xl border border-slate-700 bg-slate-900/50 p-4">
                <div className="flex flex-wrap items-center gap-2 text-sm text-slate-300">
                  <FileSpreadsheet className="h-4 w-4 text-blue-400" />
                  <span>{t("label.estPages", { pages: estimatedPages, perPage: layoutProfile.perPage })}</span>
                  {totalLabels !== selectedForLabel.length && (
                    <span className="rounded-full bg-slate-800 px-2 py-1 text-xs text-slate-400">
                      {t("label.totalLabels", { count: totalLabels })}
                    </span>
                  )}
                  {layoutProfile.size === "small" && (
                    <span className="text-xs text-slate-500">{t("label.smallSizeHint")}</span>
                  )}
                </div>
              </section>
            )}

            <section className="rounded-2xl border border-slate-700 bg-slate-900/50 p-4">
              <h3 className="text-sm font-medium text-slate-200">
                {t("label.selectedCount", { count: selectedForLabel.length })}
              </h3>
              <div className="mt-3 max-h-64 space-y-2 overflow-y-auto">
                {selectedForLabel.length === 0 ? (
                  <p className="rounded-xl bg-slate-950 px-4 py-6 text-center text-slate-500">
                    {t("label.noneSelected")}
                  </p>
                ) : (
                  selectedForLabel.map((chem, index) => {
                    const quantity = labelQuantities?.[chem.cas_number] || 1;
                    const derivedPreparedName = chem.isPreparedSolution ? formatPreparedDisplayName(chem) : null;

                    return (
                      <div
                        key={`${chem.cas_number}-${index}`}
                        className={`flex items-start justify-between gap-3 rounded-xl border p-3 ${
                          chem.isPreparedSolution
                            ? "border-blue-700/50 bg-blue-900/20"
                            : "border-slate-700 bg-slate-950"
                        }`}
                        data-testid={chem.isPreparedSolution ? `selected-prepared-${chem.cas_number}` : undefined}
                      >
                        <div className="min-w-0 flex-1 space-y-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="font-mono text-sm text-amber-400">{chem.cas_number}</span>
                            <span className="truncate text-sm text-white">{chem.name_en}</span>
                            {(chem.ghs_pictograms?.length || 0) > 0 && (
                              <span className="text-xs text-slate-500">
                                {t("label.pictogramCount", { count: chem.ghs_pictograms.length })}
                              </span>
                            )}
                            {chem.isPreparedSolution && (
                              <span className="rounded bg-blue-800 px-1.5 py-0.5 text-xs font-medium text-blue-100">
                                {t("print.preparedShort")}
                              </span>
                            )}
                          </div>

                          {chem.isPreparedSolution && derivedPreparedName && (
                            <div
                              className="text-sm text-blue-200"
                              data-testid={`selected-prepared-display-${chem.cas_number}`}
                            >
                              {derivedPreparedName}
                            </div>
                          )}

                          {chem.isPreparedSolution && chem.preparedSolution && (
                            <div
                              className="text-xs text-blue-300"
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
                                className="flex flex-wrap gap-x-3 text-xs text-blue-300/80"
                                data-testid={`selected-prepared-operational-${chem.cas_number}`}
                              >
                                {chem.preparedSolution.preparedBy && (
                                  <span>
                                    <span className="text-blue-400/70">{t("prepared.preparedByShort")}: </span>
                                    {chem.preparedSolution.preparedBy}
                                  </span>
                                )}
                                {chem.preparedSolution.preparedDate && (
                                  <span>
                                    <span className="text-blue-400/70">{t("prepared.preparedDateShort")}: </span>
                                    {chem.preparedSolution.preparedDate}
                                  </span>
                                )}
                                {chem.preparedSolution.expiryDate && (
                                  <span>
                                    <span className="text-blue-400/70">{t("prepared.expiryDateShort")}: </span>
                                    {chem.preparedSolution.expiryDate}
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
                              className="flex h-6 w-6 items-center justify-center rounded bg-slate-700 text-xs text-slate-300 transition-colors hover:bg-slate-600 disabled:cursor-not-allowed disabled:opacity-30"
                            >
                              -
                            </button>
                            <span className="w-6 text-center text-sm text-white">{quantity}</span>
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
                              className="flex h-6 w-6 items-center justify-center rounded bg-slate-700 text-xs text-slate-300 transition-colors hover:bg-slate-600 disabled:cursor-not-allowed disabled:opacity-30"
                            >
                              +
                            </button>
                          </div>
                          <button
                            type="button"
                            onClick={() => onToggleSelectForLabel(chem)}
                            className="px-2 text-slate-400 transition-colors hover:text-red-400"
                          >
                            <X className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </section>
          </div>

          <aside className="self-start lg:sticky lg:top-6">
            <div
              className="overflow-hidden rounded-3xl border border-slate-700 bg-slate-900/70"
              data-testid="label-preview-panel"
            >
              <div className="border-b border-slate-700 px-5 py-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
                      {tx("label.previewTitle", "Live preview")}
                    </div>
                    <h3 className="mt-1 text-lg font-semibold text-white">
                      {previewChem
                        ? tx("label.previewFocusFilled", "Previewing the first selected label")
                        : tx("label.previewFocusEmptyTitle", "No chemical selected yet")}
                    </h3>
                    <p className="mt-1 text-sm text-slate-400">
                      {previewChem
                        ? tx("label.previewFocusBody", "This pane reflects the current template, stock preset, and fields.")
                        : tx("label.previewFocusEmptyBody", "Select at least one chemical to preview real content density.")}
                    </p>
                  </div>
                  <span className="rounded-full bg-slate-800 px-2 py-1 text-xs text-slate-300">
                    {layoutProfile.stockPresetName}
                  </span>
                </div>

                <div className="mt-4 flex flex-wrap gap-2">
                  {[
                    getOptionLabel(TEMPLATE_OPTIONS, labelConfig.template, t, "Template"),
                    getOptionLabel(SIZE_OPTIONS, labelConfig.size, t, "Size"),
                    getOptionLabel(ORIENTATION_OPTIONS, labelConfig.orientation, t, "Orientation"),
                    getOptionLabel(NAME_DISPLAY_OPTIONS, labelConfig.nameDisplay, t, "Names"),
                    getOptionLabel(COLOR_OPTIONS, labelConfig.colorMode, t, "Color"),
                  ].map((label) => (
                    <span key={label} className="rounded-full bg-slate-800 px-2 py-1 text-xs text-slate-300">
                      {label}
                    </span>
                  ))}
                </div>
              </div>

              <div className="space-y-4 px-5 py-4">
                <section className="rounded-2xl border border-slate-700 bg-slate-950/70 p-4">
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2 text-sm font-medium text-slate-200">
                      <LayoutPanelTop className="h-4 w-4 text-blue-400" />
                      {tx("label.previewSheetTitle", "Sheet layout")}
                    </div>
                    <span className="rounded-full bg-slate-900 px-2 py-1 text-xs text-slate-400">
                      {layoutProfile.columns} x {layoutProfile.rows}
                    </span>
                  </div>

                  <div className="mt-2 flex flex-wrap gap-2 text-xs text-slate-400">
                    <span>{layoutProfile.widthMm} x {layoutProfile.heightMm} mm</span>
                    <span>{layoutProfile.perPage}/page</span>
                    {estimatedPages > 0 && <span>{estimatedPages} page(s)</span>}
                  </div>

                  <div className="mt-4 overflow-hidden rounded-2xl border border-slate-700 bg-slate-950 shadow-inner">
                    {sheetPreviewBundle ? (
                      <iframe
                        title={tx("label.previewSheetTitle", "Sheet layout")}
                        srcDoc={sheetPreviewBundle.html}
                        data-testid="label-sheet-preview"
                        className="h-60 w-full bg-slate-950"
                      />
                    ) : (
                      <div className="flex h-60 items-center justify-center px-4 text-sm text-slate-500">
                        {tx("label.previewFocusEmptyBody", "Select at least one chemical to preview real content density.")}
                      </div>
                    )}
                  </div>

                  <div className="mt-3 grid grid-cols-2 gap-2 text-xs text-slate-400">
                    <div className="rounded-xl bg-slate-900 px-3 py-2">
                      {tx("label.previewPadding", "Padding")}: {layoutProfile.pagePaddingMm} mm
                    </div>
                    <div className="rounded-xl bg-slate-900 px-3 py-2">
                      {tx("label.previewGap", "Gap")}: {layoutProfile.columnGapMm}/{layoutProfile.rowGapMm} mm
                    </div>
                    <div className="rounded-xl bg-slate-900 px-3 py-2">
                      {tx("label.previewOffsetX", "Offset X")}: {layoutProfile.offsetXmm} mm
                    </div>
                    <div className="rounded-xl bg-slate-900 px-3 py-2">
                      {tx("label.previewOffsetY", "Offset Y")}: {layoutProfile.offsetYmm} mm
                    </div>
                  </div>
                </section>

                <section className="rounded-2xl border border-slate-700 bg-slate-950/70 p-4">
                  <div className="flex items-center justify-between gap-3">
                    <div className="text-sm font-medium text-slate-200">
                      {tx("label.previewLabelTitle", "Primary label preview")}
                    </div>
                    <span className="rounded-full bg-slate-900 px-2 py-1 text-xs text-slate-400">
                      {densityLabel}
                    </span>
                  </div>

                  <div className="mt-3 text-xs text-slate-400">
                    {tx(
                      "label.previewRealFragmentHint",
                      "This preview now reuses the same HTML fragment that gets written into the print document."
                    )}
                  </div>

                  <div className="mt-4 overflow-hidden rounded-2xl border border-slate-700 bg-slate-950 shadow-inner">
                    {labelPreviewBundle ? (
                      <iframe
                        title={tx("label.previewLabelTitle", "Primary label preview")}
                        srcDoc={labelPreviewBundle.html}
                        data-testid="label-fragment-preview"
                        className="w-full bg-slate-950"
                        style={{
                          height:
                            labelConfig.template === "qrcode"
                              ? "20rem"
                              : layoutProfile.orientation === "portrait"
                                ? "24rem"
                                : "18rem",
                        }}
                      />
                    ) : (
                      <div className="flex h-72 items-center justify-center px-4 text-sm text-slate-500">
                        {tx("label.previewFocusEmptyBody", "Select at least one chemical to preview real content density.")}
                      </div>
                    )}
                  </div>
                </section>

                <section className="rounded-2xl border border-slate-700 bg-slate-950/70 p-4">
                  <div className="flex items-center gap-2 text-sm font-medium text-slate-200">
                    {previewRisks[0] === tx("label.previewRiskReady", "This combination looks balanced for the current content load.") ? (
                      <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                    ) : (
                      <AlertTriangle className="h-4 w-4 text-amber-400" />
                    )}
                    {tx("label.previewChecklistTitle", "Preview checklist")}
                  </div>
                  <div className="mt-3 space-y-2 text-sm text-slate-300">
                    {previewRisks.map((risk) => (
                      <div key={risk} className="rounded-xl bg-slate-900 px-3 py-2">
                        {risk}
                      </div>
                    ))}
                  </div>
                </section>

                <section className="rounded-2xl bg-slate-900/50 p-4 text-sm text-slate-400">
                  <div className="flex items-start gap-2">
                    <Lightbulb className="mt-0.5 h-4 w-4 shrink-0 text-amber-400" />
                    <span>{t("label.previewHint")}</span>
                  </div>
                </section>
              </div>
            </div>
          </aside>
        </div>

        <div className="flex gap-3 border-t border-slate-700 px-6 py-5">
          <button
            type="button"
            onClick={onPrintLabels}
            disabled={selectedForLabel.length === 0}
            className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-purple-500 to-purple-600 px-6 py-3 font-medium text-white transition-all hover:from-purple-600 hover:to-purple-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <Printer className="h-4 w-4" />
            {t("label.printBtn", { count: totalLabels })}
          </button>
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl bg-slate-700 px-6 py-3 text-slate-300 transition-colors hover:bg-slate-600"
          >
            {t("label.cancel")}
          </button>
        </div>
      </div>
    </div>
  );
}
