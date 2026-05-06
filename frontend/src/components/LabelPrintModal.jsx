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
  FULL_PAGE_PRIMARY_STOCK_IDS,
  LABEL_STOCK_PRESETS,
  getLabelStockPresetDisplay,
  resolvePrintLayoutConfig,
} from "@/constants/labelStocks";
import {
  PRINT_OUTPUT_PLAN_STATE,
  buildPrintOutputPlan,
} from "@/utils/printOutputPlanner";
import { buildPrintPreviewDocument } from "@/utils/printLabels";
import { formatPreparedDisplayName } from "@/utils/preparedSolution";
import {
  getLocalizedNames,
  getLocalizedSignalWord,
  getLocalizedStatementText,
  resolveLabelContentLocale,
} from "@/utils/ghsText";

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
  {
    value: "small",
    labelKey: "label.sizeSmall",
    descKey: "label.sizeSmallDesc",
    tipKey: "label.sizeSmallTip",
  },
  {
    value: "medium",
    labelKey: "label.sizeMedium",
    descKey: "label.sizeMediumDesc",
    tipKey: "label.sizeMediumTip",
  },
  {
    value: "large",
    labelKey: "label.sizeLarge",
    descKey: "label.sizeLargeDesc",
    tipKey: "label.sizeLargeTip",
  },
];

const ORIENTATION_OPTIONS = [
  {
    value: "portrait",
    labelKey: "label.portrait",
    descKey: "label.portraitDesc",
    icon: FileText,
  },
  {
    value: "landscape",
    labelKey: "label.landscape",
    descKey: "label.landscapeDesc",
    icon: BookOpen,
  },
];

const NAME_DISPLAY_OPTIONS = [
  {
    value: "both",
    labelKey: "label.nameBoth",
    descKey: "label.nameBothDesc",
    icon: Languages,
  },
  { value: "en", labelKey: "label.nameEn", iconLabel: "EN" },
  { value: "zh", labelKey: "label.nameZh", iconLabel: "ZH" },
];

const COLOR_OPTIONS = [
  { value: "color", labelKey: "label.colorColor", iconLabel: "CMYK" },
  { value: "bw", labelKey: "label.colorBW", iconLabel: "B/W" },
];

const PURPOSE_OPTIONS = [
  {
    value: "shipping",
    labelKey: "label.purposeShipping",
    descKey: "label.purposeShippingDesc",
    tipKey: "label.purposeShippingTip",
    icon: Package2,
    presetId: "large-primary",
    template: "full",
  },
  {
    value: "qrSupplement",
    labelKey: "label.purposeQrSupplement",
    descKey: "label.purposeQrSupplementDesc",
    tipKey: "label.purposeQrSupplementTip",
    icon: ScanLine,
    presetId: "small-strip",
    template: "qrcode",
  },
  {
    value: "quickId",
    labelKey: "label.purposeQuickId",
    descKey: "label.purposeQuickIdDesc",
    tipKey: "label.purposeQuickIdTip",
    icon: Target,
    presetId: "brother-62mm-continuous",
    template: "icon",
  },
];

const READINESS_TONE_CLASSES = {
  ready: "border-emerald-200 bg-emerald-50 text-emerald-800",
  neutral: "border-slate-200 bg-white text-slate-700",
  caution: "border-amber-200 bg-amber-50 text-amber-900",
  danger: "border-red-200 bg-red-50 text-red-900",
};

const ALL_STOCK_PRESETS = LABEL_STOCK_PRESETS.map((preset) => ({
  ...preset,
  perPage: preset.columns * preset.rows,
  widthMm: preset.labelWidthMm,
  heightMm: preset.labelHeightMm,
}));
const SHIPPING_PRIMARY_PRESETS = ALL_STOCK_PRESETS.filter(
  (preset) =>
    preset.outputRole === "primary-candidate" ||
    FULL_PAGE_PRIMARY_STOCK_IDS.includes(preset.id),
).sort((a, b) => (a.pickerPriority ?? 999) - (b.pickerPriority ?? 999));
const SUPPLEMENTAL_STOCK_PRESETS = ALL_STOCK_PRESETS.filter(
  (preset) => preset.outputRole === "supplemental",
).sort((a, b) => (a.pickerPriority ?? 999) - (b.pickerPriority ?? 999));

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

function buildDisplayNames(chem, nameDisplay, languageLike = "en") {
  if (!chem) return [];

  const preparedName = chem.isPreparedSolution
    ? formatPreparedDisplayName(chem)
    : null;
  const localizedNames = getLocalizedNames(chem, languageLike);
  const englishName =
    preparedName ||
    chem.name_en ||
    chem.name ||
    localizedNames.primary ||
    chem.cas_number;
  const chineseName =
    chem.name_zh || chem.name_zh_tw || localizedNames.secondary || "";

  if (nameDisplay === "en") return [englishName].filter(Boolean);
  if (nameDisplay === "zh") return [chineseName || englishName].filter(Boolean);

  return [englishName, chineseName].filter(Boolean);
}

function buildHazardPreview(chem, template, tx, contentLocale) {
  if (!chem) {
    return [
      tx(
        "label.previewHazardPlaceholder",
        "Signal word, pictograms, and hazards will appear here.",
      ),
    ];
  }

  if (template === "icon") {
    return [
      tx(
        "label.previewIconFocus",
        "Compact label: pictograms and signal word stay dominant.",
      ),
    ];
  }

  if (template === "qrcode") {
    return [
      tx(
        "label.previewScanFocus",
        "Scan-first layout keeps only the essentials next to the QR.",
      ),
    ];
  }

  const limit = template === "full" ? 3 : 2;
  const statements = (chem.hazard_statements || [])
    .slice(0, limit)
    .map((statement) => {
      const text = getLocalizedStatementText(statement, contentLocale);
      return text ? `${statement.code}: ${text}` : statement.code;
    })
    .filter(Boolean);

  return statements.length
    ? statements
    : [
        tx(
          "label.previewHazardPlaceholder",
          "Signal word, pictograms, and hazards will appear here.",
        ),
      ];
}

function getLabelPurposeForConfig(labelConfig = {}) {
  if (labelConfig.labelPurpose) return labelConfig.labelPurpose;
  if (labelConfig.template === "qrcode") return "qrSupplement";
  if (labelConfig.template === "icon") return "quickId";
  return "shipping";
}

function resolveResponsibleProfile(customLabelFields = {}, labProfile = {}) {
  return {
    organization:
      (labProfile.organization || "").trim() ||
      (customLabelFields.labName || "").trim(),
    phone: (labProfile.phone || "").trim(),
    address: (labProfile.address || "").trim(),
  };
}

function buildPreviewRisks({
  previewChem,
  labelConfig,
  layoutProfile,
  labProfile,
  displayNames,
  tx,
}) {
  if (!previewChem) {
    return [
      tx(
        "label.previewRiskEmpty",
        "Select a chemical to see live density and scan balance.",
      ),
    ];
  }

  const risks = [];
  const longestName = displayNames.reduce(
    (longest, name) => Math.max(longest, name.length),
    0,
  );
  const pictogramCount = previewChem.ghs_pictograms?.length || 0;
  const hazardCount = previewChem.hazard_statements?.length || 0;
  const precautionCount = previewChem.precautionary_statements?.length || 0;
  const labelPurpose = getLabelPurposeForConfig(labelConfig);
  const hasProfile = Boolean(
    labProfile.organization || labProfile.phone || labProfile.address,
  );

  if (labelPurpose === "qrSupplement") {
    risks.push(
      tx(
        "label.previewRiskQrSupplement",
        "QR supplement mode is useful for small containers, but it is not a complete shipped-container label.",
      ),
    );
  }

  if (labelPurpose === "quickId") {
    risks.push(
      tx(
        "label.previewRiskQuickId",
        "Quick ID mode is for internal bench use only; it should not be treated as a complete hazard label.",
      ),
    );
  }

  if (labelPurpose === "shipping") {
    if (labelConfig.template !== "full") {
      risks.push(
        tx(
          "label.previewRiskShippingTemplate",
          "Complete shipped-label mode should use the Full template so H/P statements, pictograms, and signal word stay together.",
        ),
      );
    }

    if (layoutProfile.size !== "large") {
      risks.push(
        tx(
          "label.previewRiskShippingStock",
          "Complete shipped-label mode is safest on Large Primary stock; smaller stock should be treated as QR supplement or internal ID.",
        ),
      );
    }

    if (
      hazardCount + precautionCount > 18 &&
      layoutProfile.outputRole !== "full-page-primary"
    ) {
      risks.push(
        tx(
          "label.previewRiskShippingBlockedDensity",
          "This content is too dense for the current complete-label stock. Use a full-page primary stock or switch to QR supplement before printing.",
        ),
      );
    } else if (hazardCount + precautionCount > 14) {
      risks.push(
        tx(
          "label.previewRiskShippingDensity",
          "This chemical has a high H/P statement load; use the largest stock and verify the browser print preview before applying labels.",
        ),
      );
    }

    if (!hasProfile) {
      risks.push(
        tx(
          "label.previewRiskShippingProfile",
          "Supplier or lab name, phone, and address are still missing, so this is not ready as a complete shipped-container label.",
        ),
      );
    }
  }

  if (longestName > 28 && layoutProfile.size === "small") {
    risks.push(
      tx(
        "label.previewRiskName",
        "Long names will crowd a small stock preset quickly.",
      ),
    );
  }

  if (
    pictogramCount > 3 &&
    (labelConfig.template === "icon" || layoutProfile.size === "small")
  ) {
    risks.push(
      tx(
        "label.previewRiskPictograms",
        "This selection carries enough pictograms to pressure compact layouts.",
      ),
    );
  }

  if (
    previewChem.isPreparedSolution &&
    (labelConfig.template === "icon" || layoutProfile.size === "small")
  ) {
    risks.push(
      tx(
        "label.previewRiskPrepared",
        "Prepared-solution metadata is likely to feel tight in compact templates.",
      ),
    );
  }

  if (
    (labelConfig.template === "standard" ||
      labelConfig.template === "qrcode") &&
    (hasProfile || previewChem.isPreparedSolution)
  ) {
    risks.push(
      tx(
        "label.previewRiskCompactHidden",
        "Compact templates now hide profile and prep-operational fields so the hazard hierarchy stays readable.",
      ),
    );
  }

  if (
    labelConfig.nameDisplay === "both" &&
    layoutProfile.size !== "large" &&
    (labelConfig.template === "standard" ||
      labelConfig.template === "qrcode" ||
      labelConfig.template === "icon")
  ) {
    risks.push(
      tx(
        "label.previewRiskCompactNames",
        "Compact labels keep bilingual names to one line each, so long names may still feel tight.",
      ),
    );
  }

  if (
    !hasProfile &&
    labelConfig.template !== "icon" &&
    labelPurpose !== "shipping"
  ) {
    risks.push(
      tx(
        "label.previewRiskProfile",
        "No lab/supplier profile is set, so the printed label will stay generic.",
      ),
    );
  }

  if (labelConfig.template === "qrcode" && layoutProfile.size === "large") {
    risks.push(
      tx(
        "label.previewRiskQr",
        "QR layouts read best when the scan block stays dominant; keep the left side short.",
      ),
    );
  }

  return risks.length
    ? risks
    : [
        tx(
          "label.previewRiskReady",
          "This combination looks balanced for the current content load.",
        ),
      ];
}

function getDensityLabel(labelConfig, layoutProfile, previewChem, tx) {
  if (labelConfig.template === "icon" || layoutProfile.size === "small") {
    return tx("label.previewDensityTight", "Tight");
  }

  if (
    labelConfig.template === "full" ||
    layoutProfile.size === "large" ||
    previewChem?.ghs_pictograms?.length > 2
  ) {
    return tx("label.previewDensityRich", "Roomy");
  }

  return tx("label.previewDensityBalanced", "Balanced");
}

function getOptionLabel(options, value, t, fallback) {
  const option = options.find((item) => item.value === value);
  return option ? t(option.labelKey) : fallback;
}

function getOutputTone(summary) {
  if (!summary || summary.expected === 0) return "neutral";
  return summary.present >= summary.expected ? "ready" : "caution";
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
  const { t, i18n } = useTranslation();
  const dialogRef = useRef(null);
  const autoAppliedOutputRef = useRef("");
  const userSelectedStockRef = useRef(false);
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
  const labelPurpose = getLabelPurposeForConfig(labelConfig);
  const previewChem = selectedForLabel[0] ?? null;
  const currentLocale = i18n.language;
  const contentLocale = resolveLabelContentLocale(labelConfig.nameDisplay);
  const totalLabels = selectedForLabel.reduce(
    (sum, chem) => sum + (labelQuantities?.[chem.cas_number] || 1),
    0,
  );
  const estimatedPages =
    totalLabels > 0 ? Math.ceil(totalLabels / layoutProfile.perPage) : 0;
  const displayNames = buildDisplayNames(
    previewChem,
    labelConfig.nameDisplay,
    currentLocale,
  );
  const resolvedResponsibleProfile = resolveResponsibleProfile(
    customLabelFields,
    labProfile,
  );
  const stockPresetDisplay = getLabelStockPresetDisplay(
    layoutProfile.stockPreset,
    t,
  );
  const previewRisks = buildPreviewRisks({
    previewChem,
    labelConfig,
    layoutProfile,
    labProfile: resolvedResponsibleProfile,
    displayNames,
    tx,
  });
  const densityLabel = getDensityLabel(
    labelConfig,
    layoutProfile,
    previewChem,
    tx,
  );
  const visibleRecentPrints = recentPrints.slice(0, 5);
  const purposeSummaryLabel = getOptionLabel(
    PURPOSE_OPTIONS,
    labelPurpose,
    t,
    "Shipped container",
  );
  const readyPreviewMessage = tx(
    "label.previewRiskReady",
    "This combination looks balanced for the current content load.",
  );
  const outputPlan = buildPrintOutputPlan({
    selectedForLabel,
    layout: layoutProfile,
    customGHSSettings,
    resolvedLabProfile: resolvedResponsibleProfile,
    locale: currentLocale,
  });
  const printReadiness = outputPlan.readiness;
  const recommendedFullPagePreset = ALL_STOCK_PRESETS.find(
    (preset) => preset.id === outputPlan.recommendedFullPageStockId,
  );
  const recommendedFullPageLabel = recommendedFullPagePreset
    ? getLabelStockPresetDisplay(recommendedFullPagePreset, t).name
    : tx("label.fullPagePrimaryFallback", "full-page primary");
  const visibleStockChoices =
    labelPurpose === "shipping"
      ? SHIPPING_PRIMARY_PRESETS
      : SUPPLEMENTAL_STOCK_PRESETS;
  const plannerPreviewRisk =
    outputPlan.state === PRINT_OUTPUT_PLAN_STATE.RECOMMEND_FULL_PAGE
      ? tx(
          "label.outputPlanRecommendFullPage",
          "This stock cannot carry the complete primary label clearly. Use {{stock}} and keep this smaller label as supplemental if needed.",
          { stock: recommendedFullPageLabel },
        )
      : outputPlan.state === PRINT_OUTPUT_PLAN_STATE.MISSING_REQUIRED_PROFILE
        ? tx(
            "label.outputPlanMissingProfile",
            "Complete primary labels need responsible lab or supplier name, phone, and address before printing.",
          )
        : outputPlan.state === PRINT_OUTPUT_PLAN_STATE.READY_WITH_NOTICE
          ? tx(
              "label.outputPlanSupplementalNotice",
              "This output is printable as a supplemental label, not a complete primary container label.",
            )
          : outputPlan.state === PRINT_OUTPUT_PLAN_STATE.MISSING_HAZARD_DATA
            ? tx(
                "label.outputPlanMissingHazardData",
                "This item does not have enough GHS hazard content to produce a hazard label.",
              )
            : "";
  const previewPurposeSummaryLabel =
    outputPlan.state === PRINT_OUTPUT_PLAN_STATE.READY_WITH_NOTICE
      ? tx("label.outputSupplemental", "Supplemental")
      : purposeSummaryLabel;
  const visiblePreviewRisks =
    outputPlan.state === PRINT_OUTPUT_PLAN_STATE.READY_WITH_NOTICE &&
    plannerPreviewRisk
      ? [plannerPreviewRisk]
      : plannerPreviewRisk && plannerPreviewRisk !== readyPreviewMessage
      ? [
          plannerPreviewRisk,
          ...previewRisks.filter((risk) => risk !== readyPreviewMessage),
        ]
      : previewRisks;
  const outputNotApplicableLabel = tx(
    "label.outputNotApplicable",
    "Not applicable",
  );
  const formatOutputCount = (summary) =>
    summary.expected > 0
      ? `${summary.present}/${summary.expected}`
      : outputNotApplicableLabel;
  const outputChecklistItems = [
    {
      key: "pictograms",
      label: tx("label.outputPictograms", "GHS pictograms"),
      value: formatOutputCount(printReadiness.elementSummary.pictograms),
      tone: getOutputTone(printReadiness.elementSummary.pictograms),
    },
    {
      key: "hazard-statements",
      label: tx("label.outputHazards", "H statements"),
      value: formatOutputCount(printReadiness.elementSummary.hazardStatements),
      tone: getOutputTone(printReadiness.elementSummary.hazardStatements),
    },
    {
      key: "precautionary-statements",
      label: tx("label.outputPrecautions", "P statements"),
      value: formatOutputCount(
        printReadiness.elementSummary.precautionaryStatements,
      ),
      tone: getOutputTone(
        printReadiness.elementSummary.precautionaryStatements,
      ),
    },
    {
      key: "signal-word",
      label: tx("label.outputSignalWord", "Signal word"),
      value: formatOutputCount(printReadiness.elementSummary.signalWord),
      tone: getOutputTone(printReadiness.elementSummary.signalWord),
    },
    {
      key: "responsible-profile",
      label: tx("label.outputResponsibleProfile", "Responsible profile"),
      value: formatOutputCount(
        printReadiness.elementSummary.responsibleProfile,
      ),
      tone: getOutputTone(printReadiness.elementSummary.responsibleProfile),
    },
  ];
  const hasPreviewWarnings = visiblePreviewRisks.some(
    (risk) => risk !== readyPreviewMessage,
  );
  const isPrintFitBlocked =
    selectedForLabel.length > 0 && !outputPlan.canPrint;
  const isProfileBlocked =
    outputPlan.state === PRINT_OUTPUT_PLAN_STATE.MISSING_REQUIRED_PROFILE;
  const printBlockedLabel = isProfileBlocked
    ? tx("label.printFixProfileRequired", "Add lab/supplier profile first")
    : outputPlan.state === PRINT_OUTPUT_PLAN_STATE.INVALID_STOCK
      ? tx("label.printFixContinuationRequired", "Create a continuation plan first")
      : tx("label.printFixRequired", "Choose a printable stock first");
  const canUseFullPagePrimary =
    outputPlan.state === PRINT_OUTPUT_PLAN_STATE.RECOMMEND_FULL_PAGE &&
    Boolean(recommendedFullPagePreset) &&
    layoutProfile.stockPreset !== recommendedFullPagePreset.id;
  const autoApplyFullPageKey = [
    selectedForLabel.map((chem) => chem.cas_number).join("|"),
    layoutProfile.stockPreset,
    outputPlan.recommendedFullPageStockId,
    labelPurpose,
    labelConfig.nameDisplay,
  ].join(":");
  const blockedDensityMessage = tx(
    "label.previewRiskShippingBlockedDensity",
    "This content is too dense for the current complete-label stock. Use a full-page primary stock for a complete label; QR supplement is only a secondary option.",
  );
  const primaryPreviewRisk =
    plannerPreviewRisk ||
    visiblePreviewRisks.find((risk) => risk === blockedDensityMessage) ||
    visiblePreviewRisks.find((risk) => risk !== readyPreviewMessage) ||
    "";
  const outputPlanTone =
    outputPlan.state === PRINT_OUTPUT_PLAN_STATE.READY
      ? "ready"
      : outputPlan.state === PRINT_OUTPUT_PLAN_STATE.READY_WITH_NOTICE
        ? "caution"
        : outputPlan.state === PRINT_OUTPUT_PLAN_STATE.MISSING_REQUIRED_PROFILE ||
            outputPlan.state === PRINT_OUTPUT_PLAN_STATE.MISSING_HAZARD_DATA ||
            outputPlan.state === PRINT_OUTPUT_PLAN_STATE.INVALID_STOCK
          ? "danger"
          : "caution";
  const outputPlanTitle =
    outputPlan.state === PRINT_OUTPUT_PLAN_STATE.READY
      ? tx("label.outputPlanReadyTitle", "Complete output ready")
      : outputPlan.state === PRINT_OUTPUT_PLAN_STATE.READY_WITH_NOTICE
        ? tx("label.outputPlanSupplementalTitle", "Supplemental output")
        : outputPlan.state === PRINT_OUTPUT_PLAN_STATE.RECOMMEND_FULL_PAGE
          ? tx("label.outputPlanFullPageTitle", "Use a full-page primary label")
          : outputPlan.state === PRINT_OUTPUT_PLAN_STATE.MISSING_REQUIRED_PROFILE
            ? tx("label.outputPlanProfileTitle", "Responsible profile required")
            : outputPlan.state === PRINT_OUTPUT_PLAN_STATE.MISSING_HAZARD_DATA
              ? tx("label.outputPlanHazardTitle", "Hazard data required")
              : outputPlan.state === PRINT_OUTPUT_PLAN_STATE.INVALID_STOCK
                ? tx("label.outputPlanInvalidTitle", "Needs a larger output")
                : tx("label.outputPlanPendingTitle", "Output plan pending");
  const outputPlanBody =
    outputPlan.state === PRINT_OUTPUT_PLAN_STATE.READY
      ? tx(
          "label.outputPlanReadyBody",
          "The selected stock can print the current output without hiding safety-critical content.",
        )
      : outputPlan.state === PRINT_OUTPUT_PLAN_STATE.READY_WITH_NOTICE
        ? plannerPreviewRisk
        : outputPlan.state === PRINT_OUTPUT_PLAN_STATE.RECOMMEND_FULL_PAGE
          ? plannerPreviewRisk
          : outputPlan.state === PRINT_OUTPUT_PLAN_STATE.MISSING_REQUIRED_PROFILE
            ? plannerPreviewRisk
            : outputPlan.state === PRINT_OUTPUT_PLAN_STATE.MISSING_HAZARD_DATA
              ? plannerPreviewRisk
              : outputPlan.state === PRINT_OUTPUT_PLAN_STATE.INVALID_STOCK
                ? tx(
                    "label.outputPlanInvalidBody",
                    "Even this complete stock is too dense for one label. Use a continuation workflow before printing.",
                  )
                : tx(
                    "label.outputPlanPendingBody",
                    "Select at least one chemical to let the app choose a safe printable output.",
                  );
  const sheetPreviewBundle = useMemo(
    () =>
      buildPrintPreviewDocument(
        selectedForLabel,
        labelConfig,
        customGHSSettings,
        customLabelFields,
        labelQuantities,
        labProfile,
        { mode: "sheet" },
      ),
    [
      selectedForLabel,
      labelConfig,
      customGHSSettings,
      customLabelFields,
      labelQuantities,
      labProfile,
    ],
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
      { mode: "label" },
    );
  }, [
    previewChem,
    labelConfig,
    customGHSSettings,
    customLabelFields,
    labProfile,
  ]);

  useEffect(() => {
    if (
      userSelectedStockRef.current ||
      !canUseFullPagePrimary ||
      !outputPlan.recommendedFullPagePatch
    ) {
      autoAppliedOutputRef.current = "";
      return;
    }

    if (autoAppliedOutputRef.current === autoApplyFullPageKey) return;
    autoAppliedOutputRef.current = autoApplyFullPageKey;

    onLabelConfigChange({
      ...labelConfig,
      ...outputPlan.recommendedFullPagePatch,
    });
  }, [
    autoApplyFullPageKey,
    canUseFullPagePrimary,
    labelConfig,
    onLabelConfigChange,
    outputPlan.recommendedFullPagePatch,
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
    userSelectedStockRef.current = true;

    const nextConfig = {
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
      pageSize: preset.pageSize || "A4",
    };

    if (labelPurpose === "shipping") {
      const completePrimaryConfig = {
        ...nextConfig,
        labelPurpose: "shipping",
        template: "full",
      };
      const completePrimaryPlan = buildPrintOutputPlan({
        selectedForLabel,
        layout: resolveLayoutProfile(completePrimaryConfig),
        customGHSSettings,
        resolvedLabProfile: resolvedResponsibleProfile,
        locale: currentLocale,
      });

      nextConfig.labelPurpose = "shipping";
      nextConfig.template =
        preset.outputRole === "primary-candidate" &&
        completePrimaryPlan.state === PRINT_OUTPUT_PLAN_STATE.RECOMMEND_FULL_PAGE
          ? "standard"
          : "full";
    }

    onLabelConfigChange(nextConfig);
  };

  const handleUseFullPagePrimary = () => {
    if (!recommendedFullPagePreset) return;
    applyStockPreset(recommendedFullPagePreset);
  };

  const applyPurpose = (purpose) => {
    userSelectedStockRef.current = false;
    const option = PURPOSE_OPTIONS.find((item) => item.value === purpose);
    const preset = ALL_STOCK_PRESETS.find((item) => item.id === option?.presetId);

    if (!option || !preset) return;

    onLabelConfigChange({
      ...labelConfig,
      labelPurpose: option.value,
      template: option.template,
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
      pageSize: preset.pageSize || "A4",
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
            data-testid={`label-config-option-${option.value}`}
            className={`rounded-md border p-3 text-left transition-colors ${
              selected
                ? activeClasses
                : "border-slate-200 bg-white text-slate-700 hover:border-blue-300 hover:bg-blue-50"
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
              <div className="mt-1 text-xs text-slate-500">
                {t(option.descKey)}
              </div>
            )}
            {option.tipKey && (
              <div className="mt-1 text-xs text-slate-500">
                {t(option.tipKey)}
              </div>
            )}
          </button>
        );
      })}
    </div>
  );

  const renderPreviewMeta = () => (
    <div className="flex flex-wrap gap-2 text-xs text-slate-600">
      <span className="rounded-full bg-blue-50 px-2 py-1 font-mono text-blue-700">
        {previewChem?.cas_number || "CAS"}
      </span>
      {previewChem?.signal_word && (
        <span className="rounded-full bg-red-50 px-2 py-1 font-medium text-red-700">
          {getLocalizedSignalWord(previewChem, currentLocale)}
        </span>
      )}
      {(previewChem?.ghs_pictograms?.length || 0) > 0 && (
        <span className="rounded-full bg-slate-100 px-2 py-1 text-slate-700">
          {tx("label.previewPictograms", "Pictograms")}:{" "}
          {previewChem.ghs_pictograms.length}
        </span>
      )}
      {previewChem?.isPreparedSolution && (
        <span className="rounded-full bg-blue-50 px-2 py-1 text-blue-700">
          {t("print.preparedShort")}
        </span>
      )}
    </div>
  );

  const isFullPagePrimaryPreview =
    labelConfig.template === "full" &&
    FULL_PAGE_PRIMARY_STOCK_IDS.includes(layoutProfile.stockPreset);
  const labelFragmentPreviewHeight =
    labelConfig.template === "qrcode"
      ? "20rem"
      : isFullPagePrimaryPreview
        ? "24rem"
        : layoutProfile.orientation === "portrait"
          ? "34rem"
          : "22rem";

  const renderSavedPrintControls = () => (
    <details
      className="rounded-md border border-slate-200 bg-white p-3"
      data-testid="saved-print-controls"
    >
      <summary className="flex cursor-pointer list-none items-center gap-2 text-sm font-medium text-slate-800">
        <Bookmark className="h-4 w-4 text-blue-600" />
        {tx("label.savedPrintControlsTitle", "Saved jobs and presets")}
      </summary>
      <div className="mt-4 space-y-4">
        <section className="rounded-lg border border-slate-200 bg-slate-50 p-4">
          <div className="flex items-center gap-2 text-sm font-medium text-slate-700">
            <Bookmark className="h-4 w-4 text-blue-600" />
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
                    className="group flex items-center gap-1 rounded-md border border-slate-200 bg-slate-50 px-3 py-1.5 text-sm text-slate-700 transition-colors hover:border-blue-300 hover:bg-blue-50"
                  >
                    <button
                      type="button"
                      onClick={() => {
                        onLoadTemplate(template);
                        toast.success(
                          t("label.loadTemplateSuccess", {
                            name: template.name,
                          }),
                        );
                      }}
                    >
                      {template.name}
                    </button>
                    <button
                      type="button"
                      onClick={(event) => {
                        event.stopPropagation();
                        if (
                          window.confirm(
                            t("label.deleteTemplateConfirm", {
                              name: template.name,
                            }),
                          )
                        ) {
                          onDeleteTemplate(template.id);
                          toast.success(t("label.deleteTemplateSuccess"));
                        }
                      }}
                      className="ml-1 text-slate-400 opacity-0 transition-opacity hover:text-red-600 group-hover:opacity-100"
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
                  className="flex items-center gap-1 text-xs font-medium text-blue-700 transition-colors hover:text-blue-800"
                >
                  <Plus className="h-3 w-3" /> {t("label.saveCurrentBtn")}
                </button>
              ) : (
                <p className="text-xs text-amber-500">
                  {t("label.templateLimitHint")}
                </p>
              )
            ) : (
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={templateName}
                  onChange={(event) =>
                    setTemplateName(event.target.value.slice(0, 30))
                  }
                  placeholder={t("label.templateNamePlaceholder")}
                  className="flex-1 rounded-md border border-slate-300 bg-white px-2 py-1 text-sm text-slate-900 placeholder:text-slate-400 focus:border-blue-500 focus:outline-none"
                  autoFocus
                  onKeyDown={(event) => {
                    if (event.key === "Enter" && templateName.trim()) {
                      const success = onSaveTemplate(templateName.trim());
                      if (success) {
                        toast.success(
                          t("label.saveTemplateSuccess", {
                            name: templateName.trim(),
                          }),
                        );
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
                      toast.success(
                        t("label.saveTemplateSuccess", {
                          name: templateName.trim(),
                        }),
                      );
                      setTemplateName("");
                      setShowSaveInput(false);
                    }
                  }}
                  className="rounded bg-blue-700 p-1.5 text-white transition-colors hover:bg-blue-800"
                >
                  <Check className="h-3.5 w-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setTemplateName("");
                    setShowSaveInput(false);
                  }}
                  className="rounded bg-slate-100 p-1.5 text-slate-600 transition-colors hover:bg-slate-200"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            )}
          </div>
        </section>

        <section className="rounded-lg border border-slate-200 bg-white p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-sm font-medium text-slate-700">
              <LayoutPanelTop className="h-4 w-4 text-blue-600" />
              {tx("label.recentPrintsTitle", "Recent print queue")}
            </div>
            {visibleRecentPrints.length > 0 &&
              typeof onClearRecentPrints === "function" && (
                <button
                  type="button"
                  onClick={onClearRecentPrints}
                  className="text-xs text-slate-500 transition-colors hover:text-slate-900"
                >
                  {tx("label.recentPrintsClear", "Clear")}
                </button>
              )}
          </div>
          {visibleRecentPrints.length === 0 ? (
            <p className="mt-3 text-xs text-slate-500">
              {tx(
                "label.recentPrintsEmpty",
                "Recent print jobs will appear here so you can reload a label set in one click.",
              )}
            </p>
          ) : (
            <div className="mt-3 grid gap-2">
              {visibleRecentPrints.map((job) => {
                const firstItem = job.items?.[0];
                const remaining = Math.max(
                  0,
                  (job.totalChemicals || job.items?.length || 1) - 1,
                );
                const primaryLabel =
                  (firstItem &&
                    getLocalizedNames(firstItem, currentLocale).primary) ||
                  firstItem?.cas_number ||
                  tx("label.recentPrintUnknown", "Saved job");
                const templateLabel = getOptionLabel(
                  TEMPLATE_OPTIONS,
                  job.labelConfig?.template,
                  t,
                  job.labelConfig?.template || "standard",
                );

                return (
                  <div
                    key={job.id}
                    className="flex items-center justify-between gap-3 rounded-md border border-slate-200 bg-slate-50 px-3 py-2"
                  >
                    <div className="min-w-0">
                      <div className="truncate text-sm font-medium text-slate-900">
                        {primaryLabel}
                        {remaining > 0 ? ` +${remaining}` : ""}
                      </div>
                      <div className="mt-1 flex flex-wrap gap-2 text-xs text-slate-500">
                        <span>{formatPrintTimestamp(job.createdAt)}</span>
                        <span>
                          {tx("label.recentPrintLabels", "{{count}} labels", {
                            count: job.totalLabels || 0,
                          })}
                        </span>
                        <span>{templateLabel}</span>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => onLoadRecentPrint?.(job)}
                      className="rounded-md bg-blue-50 px-3 py-1.5 text-xs font-medium text-blue-700 transition-colors hover:bg-blue-100"
                    >
                      {tx("label.recentPrintLoad", "Load")}
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </section>
      </div>
    </details>
  );

  const renderTemplateOverrideControls = () => (
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

  const renderAdvancedLayoutControls = () => (
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
            {renderConfigButtons(
              SIZE_OPTIONS,
              labelConfig.size,
              (size) => updateLayoutConfig({ size }),
              "border-amber-500 bg-amber-50 text-amber-800",
            )}
          </section>

          <section className="space-y-3">
            <h3 className="text-sm font-medium text-slate-800">
              {t("label.orientation")}
            </h3>
            {renderConfigButtons(
              ORIENTATION_OPTIONS,
              labelConfig.orientation,
              (orientation) => updateLayoutConfig({ orientation }),
              "border-blue-500 bg-blue-50 text-blue-800",
            )}
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
            {[
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
            ].map((field) => (
              <label key={field.key} className="block">
                <span className="mb-1 block text-xs text-slate-500">
                  {field.label}
                </span>
                <input
                  type="number"
                  value={field.value}
                  min={field.min}
                  max={field.max}
                  step={field.step}
                  onChange={(event) =>
                    updateLayoutConfig({
                      [field.key]:
                        event.target.value === ""
                          ? field.min
                          : Number(event.target.value),
                    })
                  }
                  className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-blue-500 focus:outline-none"
                />
              </label>
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
                <span className="mb-1 block text-xs text-slate-500">
                  {field.label}
                </span>
                <input
                  type="number"
                  value={field.value}
                  min={field.min}
                  max={field.max}
                  step={field.step}
                  onChange={(event) =>
                    updateLayoutConfig({
                      [field.key]:
                        event.target.value === "" ? 0 : Number(event.target.value),
                    })
                  }
                  className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-blue-500 focus:outline-none"
                />
              </label>
            ))}
          </div>
        </section>
      </div>
    </details>
  );

  const renderCustomFieldsControls = () => (
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

  const renderAdvancedPrintOptions = () => (
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
        {renderTemplateOverrideControls()}
        {renderAdvancedLayoutControls()}
        {renderCustomFieldsControls()}
        {renderSavedPrintControls()}
      </div>
    </details>
  );

  const renderLabelPreviewSection = () => (
    <section
      className="rounded-lg border border-slate-200 bg-white p-3"
      data-testid="primary-label-preview-section"
    >
      <div className="flex items-center justify-between gap-3">
        <div className="text-sm font-medium text-slate-800">
          {tx("label.previewLabelTitle", "Label preview")}
        </div>
        <span className="rounded-full bg-white px-2 py-1 text-xs text-slate-600 ring-1 ring-slate-200">
          {densityLabel}
        </span>
      </div>

      <div className="sr-only">
        {tx(
          "label.previewRealFragmentHint",
          "This preview now reuses the same HTML fragment that gets written into the print document.",
        )}
      </div>

      <div className="mt-3 overflow-hidden rounded-lg border border-slate-200 bg-white shadow-inner">
        {labelPreviewBundle ? (
          <iframe
            title={tx("label.previewLabelTitle", "Label preview")}
            srcDoc={labelPreviewBundle.html}
            data-testid="label-fragment-preview"
            className="w-full bg-white"
            style={{ height: labelFragmentPreviewHeight }}
          />
        ) : (
          <div className="flex h-72 items-center justify-center px-4 text-sm text-slate-500">
            {tx(
              "label.previewFocusEmptyBody",
              "Select at least one chemical to preview real content density.",
            )}
          </div>
        )}
      </div>
    </section>
  );

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="label-modal-title"
    >
      <div
        ref={dialogRef}
        tabIndex={-1}
        className="flex max-h-[92vh] w-full max-w-6xl flex-col overflow-hidden rounded-lg bg-white shadow-2xl outline-none"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex shrink-0 items-center justify-between border-b border-slate-200 bg-white px-6 py-4">
          <div>
            <h2
              id="label-modal-title"
              className="flex items-center gap-2 text-xl font-bold text-slate-950"
            >
              <Tag className="h-5 w-5 text-blue-600" /> {t("label.title")}
            </h2>
            <p className="mt-1 text-sm text-slate-600">
              {tx(
                "label.settingsPreviewIntro",
                "The app chooses a printable output first. Adjust only when the preview needs a different physical stock.",
              )}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-500 transition-colors hover:text-slate-900"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        <div
          className="grid min-h-0 flex-1 overflow-y-auto lg:grid-cols-[minmax(0,1fr)_minmax(24rem,30rem)] lg:overflow-hidden"
          data-testid="label-modal-scroll-body"
        >
            <div
              className="space-y-6 px-6 py-6 lg:min-h-0 lg:overflow-y-auto"
              data-testid="label-settings-column"
            >
              <section
                className={`rounded-lg border p-4 ${
                  READINESS_TONE_CLASSES[outputPlanTone] ||
                  READINESS_TONE_CLASSES.neutral
                }`}
                data-testid="print-output-plan"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 text-sm font-semibold">
                      <ClipboardList className="h-4 w-4 shrink-0" />
                      {tx("label.outputPlanTitle", "Recommended output")}
                    </div>
                    <div className="mt-2 text-base font-semibold">
                      {outputPlanTitle}
                    </div>
                    <p className="mt-1 text-sm leading-5 opacity-90">
                      {outputPlanBody}
                    </p>
                  </div>
                  {canUseFullPagePrimary && (
                    <button
                      type="button"
                      onClick={handleUseFullPagePrimary}
                      className="inline-flex shrink-0 items-center justify-center gap-2 rounded-md bg-blue-700 px-3 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-800"
                      data-testid="use-full-page-primary-plan"
                    >
                      <FileText className="h-4 w-4" />
                      {tx("label.useFullPagePrimaryShort", "Use {{stock}}", {
                        stock: recommendedFullPageLabel,
                      })}
                    </button>
                  )}
                </div>
              </section>

              <section
                className="rounded-lg border border-slate-200 bg-white p-4"
                data-testid="primary-output-size-controls"
              >
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <h3 className="text-sm font-medium text-slate-800">
                      {tx(
                        "label.outputGoalSizeTitle",
                        "Output goal and physical size",
                      )}
                    </h3>
                    <p className="mt-1 text-xs text-slate-500">
                      {tx(
                        "label.outputGoalSizeHint",
                        "Pick the real-world job and the stock you will actually print. The app scales the label for that stock and recommends A4 or Letter only when the content cannot fit truthfully.",
                      )}
                    </p>
                  </div>
                  <span className="rounded-full bg-slate-100 px-2 py-1 text-xs text-slate-600">
                    {layoutProfile.stockPreset === "custom"
                      ? tx("label.stockPresetCustom", "Custom tuning")
                      : stockPresetDisplay.name || layoutProfile.stockPresetName}
                  </span>
                </div>
                <div className="mt-4">
                  <div className="text-xs font-semibold text-slate-500">
                    {tx("label.outputGoalTitle", "Output goal")}
                  </div>
                  <div
                    className="mt-2 grid gap-2 sm:grid-cols-3"
                    data-testid="output-goal-controls"
                  >
                    {PURPOSE_OPTIONS.map((option) => {
                      const Icon = option.icon;
                      const selected = labelPurpose === option.value;

                      return (
                        <button
                          key={option.value}
                          type="button"
                          onClick={() => applyPurpose(option.value)}
                          data-testid={`label-purpose-${option.value}`}
                          className={`rounded-md border p-3 text-left transition-colors ${
                            selected
                              ? "border-blue-500 bg-blue-50 text-blue-900"
                              : "border-slate-200 bg-white text-slate-700 hover:border-blue-300 hover:bg-blue-50"
                          }`}
                        >
                          <div className="flex items-center gap-2">
                            <span className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-white/70 text-current ring-1 ring-current/10">
                              <Icon className="h-4 w-4 shrink-0" />
                            </span>
                            <span className="text-sm font-medium">
                              {t(option.labelKey)}
                            </span>
                          </div>
                          <div className="mt-1 text-xs leading-5 text-slate-500">
                            {t(option.descKey)}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="mt-4">
                  <div className="text-xs font-semibold text-slate-500">
                    {tx("label.outputStockTitle", "Paper or label stock")}
                  </div>
                  <div className="mt-2 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                  {visibleStockChoices.map((preset) => {
                    const selected = layoutProfile.stockPreset === preset.id;
                    const display = getLabelStockPresetDisplay(preset, t);
                    const isFullPage = FULL_PAGE_PRIMARY_STOCK_IDS.includes(
                      preset.id,
                    );

                    return (
                      <button
                        key={preset.id}
                        type="button"
                        onClick={() => applyStockPreset(preset)}
                        data-testid={`primary-output-size-${preset.id}`}
                        className={`rounded-md border p-3 text-left transition-colors ${
                          selected
                            ? "border-blue-600 bg-blue-50 text-blue-900"
                            : "border-slate-200 bg-white text-slate-700 hover:border-blue-300 hover:bg-blue-50"
                        }`}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <span className="font-medium">{display.name}</span>
                          {selected && <Check className="h-4 w-4" />}
                        </div>
                        <div className="mt-1 text-xs leading-5 text-slate-500">
                          {preset.labelWidthMm} x {preset.labelHeightMm} mm /{" "}
                          {tx("label.previewPerPage", "{{count}}/page", {
                            count: preset.perPage,
                          })}
                        </div>
                        <div className="mt-2 flex flex-wrap gap-1.5 text-[11px] text-slate-500">
                          <span className="rounded-full bg-slate-100 px-2 py-0.5">
                            {preset.pageSize || "A4"}
                          </span>
                          <span className="rounded-full bg-slate-100 px-2 py-0.5">
                            {t(
                              ORIENTATION_OPTIONS.find(
                                (item) => item.value === preset.orientation,
                              )?.labelKey || "label.portrait",
                            )}
                          </span>
                          <span className="rounded-full bg-slate-100 px-2 py-0.5">
                            {isFullPage
                              ? tx("label.completePrimaryStock", "complete")
                              : labelPurpose === "shipping"
                                ? tx("label.containerStock", "container")
                                : tx("label.supplementalStock", "supplemental")}
                          </span>
                        </div>
                      </button>
                    );
                  })}
                  </div>
                </div>
              </section>

              <section
                className="rounded-lg border border-slate-200 bg-white p-4"
                data-testid="core-output-controls"
              >
                <h3 className="flex items-center gap-2 text-sm font-medium text-slate-800">
                  <Languages className="h-4 w-4 text-blue-600" />
                  {tx("label.outputBasicsTitle", "Language and print mode")}
                </h3>
                <p className="mt-1 text-xs text-slate-500">
                  {tx(
                    "label.outputBasicsHint",
                    "These choices directly affect the printed label and preview.",
                  )}
                </p>
                <div className="mt-4 grid gap-6 xl:grid-cols-2">
                  <section className="space-y-3">
                    <h4 className="text-sm font-medium text-slate-800">
                      {t("label.nameDisplay")}
                    </h4>
                    {renderConfigButtons(
                      NAME_DISPLAY_OPTIONS,
                      labelConfig.nameDisplay,
                      (nameDisplay) => updateVisualConfig({ nameDisplay }),
                      "border-emerald-500 bg-emerald-50 text-emerald-800",
                    )}
                  </section>

                  <section className="space-y-3">
                    <h4 className="flex items-center gap-2 text-sm font-medium text-slate-800">
                      <Palette className="h-4 w-4 text-emerald-600" />
                      {t("label.colorMode")}
                    </h4>
                    {renderConfigButtons(
                      COLOR_OPTIONS,
                      labelConfig.colorMode,
                      (colorMode) => updateVisualConfig({ colorMode }),
                      "border-emerald-500 bg-emerald-50 text-emerald-800",
                    )}
                  </section>
                </div>
              </section>

              <section className="rounded-lg border border-slate-200 bg-white p-4">
                <div className="mb-3 flex items-center justify-between">
                  <h3 className="text-sm font-medium text-slate-800">
                    {t("label.profileTitle")}
                  </h3>
                  {(labProfile.organization ||
                    labProfile.phone ||
                    labProfile.address) &&
                    typeof onClearLabProfile === "function" && (
                      <button
                        type="button"
                        onClick={onClearLabProfile}
                        className="text-xs text-red-600 transition-colors hover:text-red-700"
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
                    <div
                      key={field.key}
                      className="grid gap-1 sm:grid-cols-[6rem_minmax(0,1fr)] sm:items-center"
                    >
                      <label className="text-xs text-slate-500">
                        {t(field.labelKey)}
                      </label>
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
                        className="rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-blue-500 focus:outline-none"
                      />
                    </div>
                  ))}
                </div>
                <p className="mt-3 text-xs text-slate-500">
                  {t("label.profileHint")}
                </p>
              </section>

              {selectedForLabel.length > 0 && (
                <section className="rounded-lg border border-slate-200 bg-slate-50 p-4">
                  <div className="flex flex-wrap items-center gap-2 text-sm text-slate-700">
                    <FileSpreadsheet className="h-4 w-4 text-blue-600" />
                    <span>
                      {t("label.estPages", {
                        pages: estimatedPages,
                        perPage: layoutProfile.perPage,
                      })}
                    </span>
                    {totalLabels !== selectedForLabel.length && (
                      <span className="rounded-full bg-white px-2 py-1 text-xs text-slate-600 ring-1 ring-slate-200">
                        {t("label.totalLabels", { count: totalLabels })}
                      </span>
                    )}
                    {layoutProfile.size === "small" && (
                      <span className="text-xs text-slate-500">
                        {t("label.smallSizeHint")}
                      </span>
                    )}
                  </div>
                </section>
              )}

              <section className="rounded-lg border border-slate-200 bg-white p-4">
                <h3 className="text-sm font-medium text-slate-800">
                  {t("label.selectedCount", { count: selectedForLabel.length })}
                </h3>
                <div className="mt-3 max-h-64 space-y-2 overflow-y-auto">
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
                      const localizedNames = getLocalizedNames(
                        chem,
                        currentLocale,
                      );

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
                              {localizedNames.secondary &&
                                !chem.isPreparedSolution && (
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

                            {chem.isPreparedSolution &&
                              chem.preparedSolution && (
                                <div
                                  className="text-xs text-blue-700"
                                  data-testid={`selected-prepared-meta-${chem.cas_number}`}
                                >
                                  {t("prepared.labelMeta", {
                                    concentration:
                                      chem.preparedSolution.concentration || "",
                                    solvent:
                                      chem.preparedSolution.solvent || "",
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
              </section>

              {renderAdvancedPrintOptions()}
            </div>

            <aside className="order-first border-b border-slate-200 bg-slate-50/70 lg:order-none lg:min-h-0 lg:overflow-y-auto lg:border-b-0 lg:border-l">
              <div
                className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm"
                data-testid="label-preview-panel"
              >
                <div className="border-b border-slate-200 px-4 py-3">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="text-xs font-semibold uppercase text-slate-500">
                        {tx("label.previewTitle", "Live preview")}
                      </div>
                      <h3 className="mt-1 text-base font-semibold text-slate-950">
                        {previewChem
                          ? tx(
                              "label.previewFocusFilled",
                              "Previewing the first selected label",
                            )
                          : tx(
                              "label.previewFocusEmptyTitle",
                              "No chemical selected yet",
                            )}
                      </h3>
                      <p className="mt-1 text-xs text-slate-600">
                        {previewChem
                          ? tx(
                              "label.previewFocusBody",
                              "This is the label fragment that will be printed.",
                            )
                          : tx(
                              "label.previewFocusEmptyBody",
                              "Select at least one chemical to preview real content density.",
                            )}
                      </p>
                    </div>
                    <span className="rounded-full bg-slate-100 px-2 py-1 text-xs text-slate-600">
                      {layoutProfile.stockPreset === "custom"
                        ? tx("label.stockPresetCustom", "Custom tuning")
                        : stockPresetDisplay.name ||
                          layoutProfile.stockPresetName}
                    </span>
                  </div>

                  <div className="mt-3 flex flex-wrap gap-2">
                    {[
                      previewPurposeSummaryLabel,
                      getOptionLabel(
                        TEMPLATE_OPTIONS,
                        labelConfig.template,
                        t,
                        "Template",
                      ),
                      getOptionLabel(SIZE_OPTIONS, labelConfig.size, t, "Size"),
                      getOptionLabel(
                        ORIENTATION_OPTIONS,
                        labelConfig.orientation,
                        t,
                        "Orientation",
                      ),
                      getOptionLabel(
                        NAME_DISPLAY_OPTIONS,
                        labelConfig.nameDisplay,
                        t,
                        "Names",
                      ),
                      getOptionLabel(
                        COLOR_OPTIONS,
                        labelConfig.colorMode,
                        t,
                        "Color",
                      ),
                    ].map((label) => (
                      <span
                        key={label}
                        className="rounded-full bg-slate-100 px-2 py-1 text-xs text-slate-600"
                      >
                        {label}
                      </span>
                    ))}
                  </div>
                </div>

                <div className="space-y-4 px-4 py-4">
                  {renderLabelPreviewSection()}

                  {previewChem && hasPreviewWarnings && primaryPreviewRisk && (
                    <section
                      className={`rounded-lg border p-3 text-sm ${
                        isPrintFitBlocked
                          ? "border-red-200 bg-red-50 text-red-900"
                          : "border-amber-200 bg-amber-50 text-amber-900"
                      }`}
                      data-testid="preview-warning-banner"
                    >
                      <div className="flex items-start gap-2">
                        <AlertTriangle
                          className={`mt-0.5 h-4 w-4 shrink-0 ${
                            isPrintFitBlocked
                              ? "text-red-600"
                              : "text-amber-500"
                          }`}
                        />
                        <div>
                          <div className="font-semibold">
                            {isPrintFitBlocked
                              ? tx(
                                  "label.previewBlockingTitle",
                                  "Printing blocked",
                                )
                              : tx(
                                  "label.previewReviewTitle",
                                  "Review before printing",
                                )}
                          </div>
                          <div className="mt-1 leading-5">
                            {primaryPreviewRisk}
                          </div>
                          {canUseFullPagePrimary && (
                            <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-center">
                              <button
                                type="button"
                                onClick={handleUseFullPagePrimary}
                                className="inline-flex items-center justify-center gap-2 rounded-md bg-blue-700 px-3 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-800"
                                data-testid="use-full-page-primary-banner"
                              >
                                <FileText className="h-4 w-4" />
                                {tx("label.useFullPagePrimary", "Use {{stock}}", {
                                  stock: recommendedFullPageLabel,
                                })}
                              </button>
                              <span className="text-xs leading-5 text-red-800">
                                {tx(
                                  "label.useFullPagePrimaryHint",
                                  "Keeps all pictograms and complete statements on a complete full-page primary label.",
                                )}
                              </span>
                            </div>
                          )}
                        </div>
                      </div>
                    </section>
                  )}

                  <section
                    className="rounded-lg border border-slate-200 bg-white p-3"
                    data-testid="required-output-checklist"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <div className="text-sm font-medium text-slate-800">
                          {tx("label.outputChecklistTitle", "Required output")}
                        </div>
                        <div className="mt-1 text-xs leading-5 text-slate-500">
                          {tx(
                            "label.outputChecklistHint",
                            "Counts come from the same content model used by print preflight.",
                          )}
                        </div>
                      </div>
                      <span className="rounded-full bg-slate-100 px-2 py-1 text-xs text-slate-600">
                        {outputPlan.state ===
                        PRINT_OUTPUT_PLAN_STATE.READY_WITH_NOTICE
                          ? tx("label.outputSupplemental", "Supplemental")
                          : tx("label.outputPrimary", "Primary")}
                      </span>
                    </div>
                    <div className="mt-3 grid grid-cols-2 gap-2">
                      {outputChecklistItems.map((item) => (
                        <div
                          key={item.key}
                          className={`rounded-md border px-3 py-2 ${READINESS_TONE_CLASSES[item.tone]}`}
                          data-testid={`required-output-${item.key}`}
                        >
                          <div className="text-xs font-medium">
                            {item.label}
                          </div>
                          <div className="mt-1 text-sm font-semibold">
                            {item.value}
                          </div>
                        </div>
                      ))}
                    </div>
                  </section>

                  <section className="rounded-lg border border-slate-200 bg-white p-4">
                    <div className="flex items-center gap-2 text-sm font-medium text-slate-800">
                      {visiblePreviewRisks[0] ===
                      tx(
                        "label.previewRiskReady",
                        "This combination looks balanced for the current content load.",
                      ) ? (
                        <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                      ) : (
                        <AlertTriangle className="h-4 w-4 text-amber-400" />
                      )}
                      {tx("label.previewChecklistTitle", "Preview checklist")}
                    </div>
                    <div className="mt-3 space-y-2 text-sm text-slate-700">
                      {visiblePreviewRisks.map((risk) => (
                        <div
                          key={risk}
                          className="rounded-md bg-slate-50 px-3 py-2 ring-1 ring-slate-200"
                        >
                          {risk}
                        </div>
                      ))}
                    </div>
                  </section>

                  <details className="rounded-lg border border-slate-200 bg-white p-4">
                    <summary className="flex cursor-pointer list-none items-center justify-between gap-3 text-sm font-medium text-slate-800">
                      <span className="flex items-center gap-2">
                        <LayoutPanelTop className="h-4 w-4 text-blue-600" />
                        {tx("label.previewSheetTitle", "Sheet layout")}
                      </span>
                      <span className="rounded-full bg-slate-100 px-2 py-1 text-xs text-slate-600">
                        {layoutProfile.columns} x {layoutProfile.rows}
                      </span>
                    </summary>

                    <div className="mt-3 flex flex-wrap gap-2 text-xs text-slate-400">
                      <span>
                        {layoutProfile.widthMm} x {layoutProfile.heightMm} mm
                      </span>
                      <span>
                        {tx("label.previewPerPage", "{{count}}/page", {
                          count: layoutProfile.perPage,
                        })}
                      </span>
                      {estimatedPages > 0 && (
                        <span>
                          {tx("label.previewPageCount", "{{count}} page(s)", {
                            count: estimatedPages,
                          })}
                        </span>
                      )}
                    </div>

                    <div className="mt-4 overflow-hidden rounded-lg border border-slate-200 bg-white shadow-inner">
                      {sheetPreviewBundle ? (
                        <iframe
                          title={tx("label.previewSheetTitle", "Sheet layout")}
                          srcDoc={sheetPreviewBundle.html}
                          data-testid="label-sheet-preview"
                          className="w-full bg-white"
                          style={{
                            height:
                              layoutProfile.orientation === "landscape"
                                ? "18rem"
                                : "20rem",
                          }}
                        />
                      ) : (
                        <div className="flex h-60 items-center justify-center px-4 text-sm text-slate-500">
                          {tx(
                            "label.previewFocusEmptyBody",
                            "Select at least one chemical to preview real content density.",
                          )}
                        </div>
                      )}
                    </div>

                    <div className="mt-3 grid grid-cols-2 gap-2 text-xs text-slate-600">
                      <div className="rounded-md bg-slate-50 px-3 py-2 ring-1 ring-slate-200">
                        {tx("label.previewPadding", "Padding")}:{" "}
                        {layoutProfile.pagePaddingMm} mm
                      </div>
                      <div className="rounded-md bg-slate-50 px-3 py-2 ring-1 ring-slate-200">
                        {tx("label.previewGap", "Gap")}:{" "}
                        {layoutProfile.columnGapMm}/{layoutProfile.rowGapMm} mm
                      </div>
                      <div className="rounded-md bg-slate-50 px-3 py-2 ring-1 ring-slate-200">
                        {tx("label.previewOffsetX", "Offset X")}:{" "}
                        {layoutProfile.offsetXmm} mm
                      </div>
                      <div className="rounded-md bg-slate-50 px-3 py-2 ring-1 ring-slate-200">
                        {tx("label.previewOffsetY", "Offset Y")}:{" "}
                        {layoutProfile.offsetYmm} mm
                      </div>
                    </div>
                  </details>

                  <section className="rounded-lg bg-amber-50 p-4 text-sm text-amber-900">
                    <div className="flex items-start gap-2">
                      <Lightbulb className="mt-0.5 h-4 w-4 shrink-0 text-amber-400" />
                      <span>{t("label.previewHint")}</span>
                    </div>
                  </section>
                </div>
              </div>
            </aside>
          </div>

        <div
          className="flex shrink-0 gap-3 border-t border-slate-200 bg-white px-6 py-5"
          data-testid="label-modal-footer"
        >
          {canUseFullPagePrimary ? (
            <button
              type="button"
              onClick={handleUseFullPagePrimary}
              className="flex flex-1 items-center justify-center gap-2 rounded-md bg-blue-700 px-6 py-3 font-medium text-white transition-colors hover:bg-blue-800"
              data-testid="use-full-page-primary-footer"
            >
              <FileText className="h-4 w-4" />
              {tx("label.useFullPagePrimary", "Use {{stock}}", {
                stock: recommendedFullPageLabel,
              })}
            </button>
          ) : (
            <button
              type="button"
              onClick={onPrintLabels}
              disabled={selectedForLabel.length === 0 || isPrintFitBlocked}
              className="flex flex-1 items-center justify-center gap-2 rounded-md bg-blue-700 px-6 py-3 font-medium text-white transition-colors hover:bg-blue-800 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <Printer className="h-4 w-4" />
              {isPrintFitBlocked
                ? printBlockedLabel
                : t("label.printBtn", { count: totalLabels })}
            </button>
          )}
          <button
            type="button"
            onClick={onClose}
            className="rounded-md border border-slate-300 bg-white px-6 py-3 text-slate-700 transition-colors hover:bg-slate-50"
          >
            {t("label.cancel")}
          </button>
        </div>
      </div>
    </div>
  );
}
