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
  ChevronLeft,
  ChevronRight,
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
  PRINT_OUTPUT_KIND,
  PRINT_OUTPUT_PLAN_STATE,
  buildPrintOutputPlan,
} from "@/utils/printOutputPlanner";
import {
  BATCH_PRINT_ITEM_CATEGORY,
  BATCH_PRINT_PURPOSE,
  BATCH_PRINT_REPRESENTATIVE,
  buildBatchPrintableItems,
  buildBatchPrintPlan,
} from "@/utils/printBatchPlanner";
import {
  PRINT_CONTENT_ROLE,
  PRINT_HAZARD_TEXT_MODE,
  resolvePrintContentPolicy,
} from "@/utils/printContentPolicy";
import AuthoritativeSourceNote from "@/components/AuthoritativeSourceNote";
import { buildPrintPreviewDocument } from "@/utils/printLabels";
import {
  formatPreparedDisplayName,
  getPreparedExpiryStatus,
} from "@/utils/preparedSolution";
import useFocusTrap from "@/hooks/useFocusTrap";
import {
  getLocalizedNames,
  getLocalizedSignalWord,
  getLocalizedStatementText,
  resolveEffectiveLabelContentLocale,
  resolveEffectiveLabelNameDisplay,
} from "@/utils/ghsText";
import { getPreferredQrTargetInfo } from "@/utils/sdsLinks";

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

const getPreparedExpiryBadge = (expiryDate) => {
  const status = getPreparedExpiryStatus(expiryDate);
  if (status === "expired") {
    return {
      labelKey: "prepared.expiryExpired",
      className: "border-red-200 bg-red-50 text-red-700",
    };
  }
  if (status === "expiringSoon") {
    return {
      labelKey: "prepared.expiryExpiringSoon",
      className: "border-amber-200 bg-amber-50 text-amber-700",
    };
  }
  return null;
};

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

const PRINT_TARGET_OPTIONS = [
  {
    value: "mainContainer",
    purpose: "shipping",
    labelKey: "label.targetMainContainer",
    descKey: "label.targetMainContainerDesc",
    fallbackLabel: "Main container",
    icon: Package2,
    presetId: "large-primary",
    template: "standard",
  },
  {
    value: "bottle",
    purpose: "shipping",
    labelKey: "label.targetBottle",
    descKey: "label.targetBottleDesc",
    fallbackLabel: "Bottle label",
    icon: Tag,
    presetId: "medium-bottle",
    template: "standard",
  },
  {
    value: "vial",
    purpose: "quickId",
    labelKey: "label.targetVial",
    descKey: "label.targetVialDesc",
    fallbackLabel: "Tube / vial",
    icon: Target,
    presetId: "small-strip",
    template: "icon",
  },
  {
    value: "qrSupplement",
    purpose: "qrSupplement",
    labelKey: "label.targetQrSupplement",
    descKey: "label.targetQrSupplementDesc",
    fallbackLabel: "QR supplement",
    icon: ScanLine,
    presetId: "brother-62mm-continuous",
    template: "qrcode",
  },
];

const READINESS_TONE_CLASSES = {
  ready: "border-emerald-200 bg-emerald-50 text-emerald-800",
  neutral: "border-slate-200 bg-white text-slate-700",
  caution: "border-amber-200 bg-amber-50 text-amber-900",
  danger: "border-red-200 bg-red-50 text-red-900",
};

const BATCH_CATEGORY_TONE = {
  [BATCH_PRINT_ITEM_CATEGORY.READY]: "ready",
  [BATCH_PRINT_ITEM_CATEGORY.READY_TIGHT]: "ready",
  [BATCH_PRINT_ITEM_CATEGORY.REDUCED_PURPOSE]: "caution",
  [BATCH_PRINT_ITEM_CATEGORY.SAME_STOCK_CONTINUATION]: "caution",
  [BATCH_PRINT_ITEM_CATEGORY.EXCLUDED_DATA]: "danger",
  [BATCH_PRINT_ITEM_CATEGORY.EXCLUDED_FIT]: "danger",
};

const getBatchCategoryLabel = (category, tx) => {
  switch (category) {
    case BATCH_PRINT_ITEM_CATEGORY.READY:
      return tx("label.batchCategoryReady", "Ready");
    case BATCH_PRINT_ITEM_CATEGORY.READY_TIGHT:
      return tx("label.batchCategoryReadyTight", "Ready, tightened");
    case BATCH_PRINT_ITEM_CATEGORY.REDUCED_PURPOSE:
      return tx("label.batchCategoryReducedPurpose", "Needs reduced output");
    case BATCH_PRINT_ITEM_CATEGORY.SAME_STOCK_CONTINUATION:
      return tx("label.batchCategoryContinuation", "Needs continuation");
    case BATCH_PRINT_ITEM_CATEGORY.EXCLUDED_DATA:
      return tx("label.batchCategoryExcludedData", "Excluded: data");
    case BATCH_PRINT_ITEM_CATEGORY.EXCLUDED_FIT:
      return tx("label.batchCategoryExcludedFit", "Excluded: fit");
    default:
      return category || "";
  }
};

const getBatchPurposeLabel = (purpose, tx) => {
  switch (purpose) {
    case BATCH_PRINT_PURPOSE.QUICK_ID:
      return tx("label.batchPurposeQuickId", "Quick ID");
    case BATCH_PRINT_PURPOSE.SUPPLEMENTAL:
      return tx("label.batchPurposeSupplemental", "Supplemental");
    case BATCH_PRINT_PURPOSE.COMPLETE:
      return tx("label.batchPurposeComplete", "Complete");
    default:
      return purpose || "";
  }
};

const getBatchReasonLabel = (reason, tx) => {
  switch (reason?.type) {
    case "upstream-error":
      return tx("label.batchReasonUpstream", "Source temporarily unavailable");
    case "missing-hazard-data":
      return tx("label.batchReasonMissingHazards", "No printable GHS hazard data");
    case "text-only-ghs-needs-hazard-text":
      return tx(
        "label.batchReasonTextOnlyQuickId",
        "GHS text exists but no pictogram is available for Quick ID",
      );
    case "responsible-profile-missing":
      return tx("label.batchReasonProfile", "Responsible profile is incomplete");
    case "complete-content-needs-continuation":
      return tx("label.batchReasonContinuation", "Full H/P text needs continuation");
    case "complete-content-too-dense-for-stock":
      return tx(
        "label.batchReasonCompleteTooDense",
        "Complete content is too dense for this stock",
      );
    case "supplemental-content-too-dense-for-stock":
      return tx(
        "label.batchReasonSupplementalTooDense",
        "Supplemental content is too dense for this stock",
      );
    default:
      return tx("label.batchReasonFit", "Needs review before printing");
  }
};

const getBatchRepresentativeLabel = (representative, tx) => {
  switch (representative) {
    case BATCH_PRINT_REPRESENTATIVE.FIRST:
      return tx("label.batchRepFirst", "First");
    case BATCH_PRINT_REPRESENTATIVE.WORST_FIT:
      return tx("label.batchRepWorstFit", "Worst fit");
    case BATCH_PRINT_REPRESENTATIVE.LONGEST_NAME:
      return tx("label.batchRepLongestName", "Longest name");
    case BATCH_PRINT_REPRESENTATIVE.MOST_PICTOGRAMS:
      return tx("label.batchRepMostPictograms", "Most pictograms");
    case BATCH_PRINT_REPRESENTATIVE.DENSEST_TEXT:
      return tx("label.batchRepDensestText", "Densest text");
    case BATCH_PRINT_REPRESENTATIVE.EXCLUDED:
      return tx("label.batchRepExcluded", "Excluded");
    default:
      return representative || "";
  }
};

const buildBatchReviewCsv = (items, tx) => {
  const rows = [
    ["index", "cas", "identity", "category", "preferredPurpose", "effectivePurpose", "reason"],
    ...items.map((item) => [
      item.index + 1,
      item.cas || "",
      item.identity || "",
      getBatchCategoryLabel(item.category, tx),
      getBatchPurposeLabel(item.preferredPurpose, tx),
      getBatchPurposeLabel(item.effectivePurpose, tx),
      getBatchReasonLabel(item.reason, tx),
    ]),
  ];

  return rows
    .map((row) =>
      row
        .map((value) => `"${String(value ?? "").replaceAll('"', '""')}"`)
        .join(","),
    )
    .join("\n");
};

const getPreviewFrameHeight = (metrics, fallbackHeight) => {
  const numericHeight = Number(metrics?.frameHeightPx);
  if (!Number.isFinite(numericHeight) || numericHeight <= 0) {
    return fallbackHeight;
  }

  const maxHeight = metrics?.previewZoom === "inspect" ? 560 : 420;
  return `${Math.ceil(Math.min(maxHeight, Math.max(220, numericHeight)))}px`;
};

const formatMmValue = (value) => {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return "0";
  return Number.isInteger(numeric) ? String(numeric) : numeric.toFixed(1);
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
const SHIPPING_PRIMARY_STOCK_IDS = new Set(
  SHIPPING_PRIMARY_PRESETS.map((preset) => preset.id),
);
const SHIPPING_SECONDARY_STOCK_IDS = new Set(["medium-rack"]);
const SHIPPING_STOCK_PRESETS = ALL_STOCK_PRESETS.filter(
  (preset) =>
    SHIPPING_PRIMARY_STOCK_IDS.has(preset.id) ||
    SHIPPING_SECONDARY_STOCK_IDS.has(preset.id),
).sort((a, b) => (a.pickerPriority ?? 999) - (b.pickerPriority ?? 999));
const SUPPLEMENTAL_STOCK_PRESETS = ALL_STOCK_PRESETS.filter(
  (preset) => preset.outputRole === "supplemental",
).sort((a, b) => (a.pickerPriority ?? 999) - (b.pickerPriority ?? 999));

const CORE_STOCK_IDS_BY_PURPOSE = {
  shipping: ["a4-primary", "letter-primary", "medium-bottle", "large-primary"],
  qrSupplement: ["brother-62mm-continuous", "small-strip"],
  quickId: ["brother-62mm-continuous", "small-strip"],
};

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

function getPrintTargetForConfig(labelPurpose, layoutProfile = {}) {
  if (labelPurpose === "qrSupplement") return "qrSupplement";
  if (labelPurpose === "quickId") return "vial";
  if (
    ["medium-bottle", "avery-5163", "avery-5164"].includes(
      layoutProfile.stockPreset,
    ) ||
    layoutProfile.size === "medium"
  ) {
    return "bottle";
  }
  return "mainContainer";
}

function getQrTargetRoleLabel(linkType, tx) {
  if (linkType === "sds") return tx("label.qrTargetRoleSds", "SDS");
  if (linkType === "regulatory") {
    return tx("label.qrTargetRoleRegulatory", "Regulatory");
  }
  if (linkType === "occupational") {
    return tx("label.qrTargetRoleOccupational", "Occupational");
  }
  return tx("label.qrTargetRoleReference", "Reference");
}

function getQrTargetSourceLabel(source, tx) {
  const normalized = typeof source === "string" ? source.toLowerCase() : "";
  if (normalized === "pubchem") {
    return tx("label.qrTargetSourcePubChem", "PubChem");
  }
  if (normalized === "echa") return tx("label.qrTargetSourceEcha", "ECHA");
  if (normalized === "niosh") return tx("label.qrTargetSourceNiosh", "NIOSH");
  if (normalized === "manual") return tx("label.qrTargetSourceManual", "Manual");
  return tx("label.qrTargetSourceReference", "Reference");
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
        "Compact labels automatically use the current UI language first so hazard icons and identity stay readable.",
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

function splitStockChoices(stockChoices, selectedStockId, purpose) {
  const coreIds = CORE_STOCK_IDS_BY_PURPOSE[purpose] || [];
  const primary = stockChoices.filter(
    (preset) => coreIds.includes(preset.id) || preset.id === selectedStockId,
  );
  const primaryIds = new Set(primary.map((preset) => preset.id));

  return {
    primaryStockChoices: primary,
    secondaryStockChoices: stockChoices.filter(
      (preset) => !primaryIds.has(preset.id),
    ),
  };
}

const RESPONSIBLE_PROFILE_FIELDS = ["organization", "phone", "address"];

function interpolateText(value, options = {}) {
  return String(value).replace(/\{\{(\w+)\}\}/g, (match, key) =>
    Object.prototype.hasOwnProperty.call(options, key) ? options[key] : match,
  );
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
  const dialogRef = useFocusTrap(onClose);
  const autoAppliedOutputRef = useRef("");
  const userSelectedStockRef = useRef(false);
  const [showSaveInput, setShowSaveInput] = useState(false);
  const [templateName, setTemplateName] = useState("");
  const [previewZoomMode, setPreviewZoomMode] = useState("fit");
  const [previewPageIndex, setPreviewPageIndex] = useState(0);
  const [batchPreviewRepresentative, setBatchPreviewRepresentative] = useState(
    BATCH_PRINT_REPRESENTATIVE.FIRST,
  );
  const [batchPreviewItemIndex, setBatchPreviewItemIndex] = useState(null);
  const [batchIncludeReducedPurpose, setBatchIncludeReducedPurpose] =
    useState(false);
  const [batchIncludeContinuation, setBatchIncludeContinuation] =
    useState(false);

  const tx = (key, fallback, options = {}) => {
    const translated = t(key, { ...options, defaultValue: fallback });
    return interpolateText(translated === key ? fallback : translated, options);
  };

  const layoutProfile = resolveLayoutProfile(labelConfig);
  const labelPurpose = getLabelPurposeForConfig(labelConfig);
  const printTarget = getPrintTargetForConfig(labelPurpose, layoutProfile);
  const selectedPrintTargetOption =
    PRINT_TARGET_OPTIONS.find((option) => option.value === printTarget) ||
    PRINT_TARGET_OPTIONS[0];
  const printTargetLabel = selectedPrintTargetOption
    ? tx(
        selectedPrintTargetOption.labelKey,
        selectedPrintTargetOption.fallbackLabel,
      )
    : tx("label.targetMainContainer", "Main container");
  const firstSelectedChem = selectedForLabel[0] ?? null;
  const qrTargetInfo =
    firstSelectedChem && labelPurpose === "qrSupplement"
      ? getPreferredQrTargetInfo(
          firstSelectedChem.cid,
          firstSelectedChem.cas_number,
          firstSelectedChem.reference_links,
        )
      : null;
  const qrTargetRoleLabel = getQrTargetRoleLabel(qrTargetInfo?.linkType, tx);
  const qrTargetSourceLabel = getQrTargetSourceLabel(qrTargetInfo?.source, tx);
  const currentLocale = i18n.language;
  const effectiveNameDisplay = resolveEffectiveLabelNameDisplay(
    layoutProfile,
    currentLocale,
  );
  const contentLocale = resolveEffectiveLabelContentLocale(
    layoutProfile,
    currentLocale,
  );
  const totalLabels = selectedForLabel.reduce(
    (sum, chem) => sum + (labelQuantities?.[chem.cas_number] || 1),
    0,
  );
  const previewSelectionKey = selectedForLabel
    .map(
      (chem) =>
        `${chem.cas_number || chem.name_en || chem.name_zh || ""}:${
          labelQuantities?.[chem.cas_number] || 1
        }`,
    )
    .join("|");
  const estimatedPages =
    totalLabels > 0 ? Math.ceil(totalLabels / layoutProfile.perPage) : 0;
  const resolvedResponsibleProfile = resolveResponsibleProfile(
    customLabelFields,
    labProfile,
  );
  const stockPresetDisplay = getLabelStockPresetDisplay(
    layoutProfile.stockPreset,
    t,
  );
  const visibleRecentPrints = recentPrints.slice(0, 5);
  const readyPreviewMessage = tx(
    "label.previewRiskReady",
    "This combination looks balanced for the current content load.",
  );
  const outputPlan = buildPrintOutputPlan({
    selectedForLabel,
    layout: layoutProfile,
    customGHSSettings,
    customLabelFields,
    resolvedLabProfile: resolvedResponsibleProfile,
    locale: currentLocale,
  });
  const batchPrintPurpose =
    outputPlan.outputKind === PRINT_OUTPUT_KIND.COMPLETE_PRIMARY
      ? BATCH_PRINT_PURPOSE.COMPLETE
      : outputPlan.outputKind === PRINT_OUTPUT_KIND.QUICK_ID
        ? BATCH_PRINT_PURPOSE.QUICK_ID
        : BATCH_PRINT_PURPOSE.SUPPLEMENTAL;
  const batchPrintPlan = useMemo(
    () =>
      buildBatchPrintPlan({
        selectedForLabel,
        layout: layoutProfile,
        purpose: batchPrintPurpose,
        customGHSSettings,
        customLabelFields,
        resolvedLabProfile: resolvedResponsibleProfile,
        locale: currentLocale,
      }),
    [
      selectedForLabel,
      layoutProfile,
      batchPrintPurpose,
      customGHSSettings,
      customLabelFields,
      resolvedResponsibleProfile,
      currentLocale,
    ],
  );
  const hasBatchPrintPlan = selectedForLabel.length > 1;
  const batchReducedPurposeItems = hasBatchPrintPlan
    ? batchPrintPlan.items.filter(
        (item) => item.category === BATCH_PRINT_ITEM_CATEGORY.REDUCED_PURPOSE,
      )
    : [];
  const batchContinuationItems = hasBatchPrintPlan
    ? batchPrintPlan.items.filter(
        (item) =>
          item.category === BATCH_PRINT_ITEM_CATEGORY.SAME_STOCK_CONTINUATION,
      )
    : [];
  const batchSelectedPrintItems = hasBatchPrintPlan
    ? buildBatchPrintableItems(batchPrintPlan, {
        includeReducedPurpose: batchIncludeReducedPurpose,
        includeContinuation: batchIncludeContinuation,
      })
    : [];
  const canPrintBatchSelectedScope =
    hasBatchPrintPlan && batchSelectedPrintItems.length > 0;
  const batchAcknowledgedPrintCount = Math.max(
    0,
    batchSelectedPrintItems.length - batchPrintPlan.summary.printableByDefault,
  );
  const printReadiness = outputPlan.readiness;
  const recommendedFullPagePreset = ALL_STOCK_PRESETS.find(
    (preset) => preset.id === outputPlan.recommendedFullPageStockId,
  );
  const recommendedFullPageLabel = recommendedFullPagePreset
    ? getLabelStockPresetDisplay(recommendedFullPagePreset, t).name
    : tx("label.fullPagePrimaryFallback", "full-page primary");
  const outputPlanHasUpstreamError = outputPlan.issues.some(
    (issue) => issue.type === "upstream-error",
  );
  const visibleStockChoices =
    labelPurpose === "shipping"
      ? SHIPPING_STOCK_PRESETS
      : SUPPLEMENTAL_STOCK_PRESETS;
  const { primaryStockChoices, secondaryStockChoices } = splitStockChoices(
    visibleStockChoices,
    layoutProfile.stockPreset,
    labelPurpose,
  );
  const currentStockName =
    layoutProfile.stockPreset === "custom"
      ? tx("label.stockPresetCustom", "Custom tuning")
      : stockPresetDisplay.name || layoutProfile.stockPresetName;
  const currentStockRole = FULL_PAGE_PRIMARY_STOCK_IDS.includes(
    layoutProfile.stockPreset,
  )
    ? tx("label.completePrimaryStock", "complete")
    : labelPurpose === "shipping"
      ? tx("label.containerStock", "container")
      : tx("label.supplementalStock", "supplemental");
  const currentStockOrientation = t(
    ORIENTATION_OPTIONS.find((item) => item.value === layoutProfile.orientation)
      ?.labelKey || "label.portrait",
  );
  const batchPrintPurposeLabel = getBatchPurposeLabel(batchPrintPurpose, tx);
  const batchUnselectedReviewCount = hasBatchPrintPlan
    ? Math.max(
        0,
        batchPrintPlan.summary.requiresAcknowledgement -
          batchAcknowledgedPrintCount,
      )
    : 0;
  const configuredNameDisplayLabel = getOptionLabel(
    NAME_DISPLAY_OPTIONS,
    labelConfig.nameDisplay,
    t,
    "Names",
  );
  const effectiveNameDisplayLabel = getOptionLabel(
    NAME_DISPLAY_OPTIONS,
    effectiveNameDisplay,
    t,
    configuredNameDisplayLabel,
  );
  const selectableStockCount =
    primaryStockChoices.length + secondaryStockChoices.length;
  const plannerPreviewRisk =
    outputPlan.state === PRINT_OUTPUT_PLAN_STATE.RECOMMEND_FULL_PAGE
      ? tx(
          "label.outputPlanRecommendFullPage",
          "This stock cannot carry the complete primary label clearly. Use {{stock}} and keep this smaller label as supplemental if needed.",
          { stock: recommendedFullPageLabel },
        )
      : outputPlan.state === PRINT_OUTPUT_PLAN_STATE.READY_WITH_CONTINUATION
        ? tx(
            "label.outputPlanContinuationNotice",
            "This content is too dense for one physical label, so the app will print it as a complete continuation set.",
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
            ? outputPlanHasUpstreamError
              ? tx(
                  "label.outputPlanUpstreamHazardData",
                  "PubChem hazard data could not be verified right now, so the app will not print a hazard label from incomplete data.",
                )
              : tx(
                  "label.outputPlanMissingHazardData",
                  "This item does not have enough GHS hazard content to produce a hazard label.",
                )
            : "";
  const batchRepresentativeOptions = Object.values(
    BATCH_PRINT_REPRESENTATIVE,
  ).filter((representative) => batchPrintPlan.representatives[representative]);
  const activeBatchPreviewItem = hasBatchPrintPlan
    ? batchPrintPlan.items.find((item) => item.index === batchPreviewItemIndex) ||
      batchPrintPlan.items.find(
        (item) =>
          item.index ===
          batchPrintPlan.representatives[batchPreviewRepresentative]?.index,
      ) ||
      batchPrintPlan.items.find(
        (item) =>
          item.index === batchPrintPlan.representatives.first?.index,
      ) ||
      null
    : null;
  const previewChem = activeBatchPreviewItem?.chemical || firstSelectedChem;
  const activeBatchPreviewPrintItems = activeBatchPreviewItem
    ? buildBatchPrintableItems(
        { items: [activeBatchPreviewItem] },
        { includeReducedPurpose: true, includeContinuation: true },
      )
    : [];
  const previewSourceItems = activeBatchPreviewItem
    ? activeBatchPreviewPrintItems.length
      ? activeBatchPreviewPrintItems
      : [activeBatchPreviewItem.chemical]
    : selectedForLabel;
  const previewLabelConfig = activeBatchPreviewPrintItems[0]?.__printLayoutOverride
    ? {
        ...labelConfig,
        ...activeBatchPreviewPrintItems[0].__printLayoutOverride,
      }
    : labelConfig;
  const previewLabelQuantities = activeBatchPreviewItem
    ? { [activeBatchPreviewItem.cas || "preview"]: 1 }
    : labelQuantities;
  const sheetPreviewItems = canPrintBatchSelectedScope
    ? batchSelectedPrintItems
    : selectedForLabel;
  const sheetPreviewQuantities = canPrintBatchSelectedScope
    ? batchSelectedPrintItems.reduce((acc, chem) => {
        acc[chem.cas_number] = labelQuantities?.[chem.cas_number] || 1;
        return acc;
      }, {})
    : labelQuantities;
  const batchItemsNeedingReview = hasBatchPrintPlan
    ? batchPrintPlan.items.filter(
        (item) => item.requiresAcknowledgement || item.excluded,
      )
    : [];
  const displayNames = buildDisplayNames(
    previewChem,
    effectiveNameDisplay,
    currentLocale,
  );
  const previewRisks = buildPreviewRisks({
    previewChem,
    labelConfig: previewLabelConfig,
    layoutProfile: resolveLayoutProfile(previewLabelConfig),
    labProfile: resolvedResponsibleProfile,
    displayNames,
    tx,
  });
  const densityLabel = getDensityLabel(
    previewLabelConfig,
    resolveLayoutProfile(previewLabelConfig),
    previewChem,
    tx,
  );
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
  const outputPlanTone =
    outputPlan.state === PRINT_OUTPUT_PLAN_STATE.READY
      ? "ready"
      : outputPlan.state === PRINT_OUTPUT_PLAN_STATE.READY_WITH_CONTINUATION
        ? "caution"
      : outputPlan.state === PRINT_OUTPUT_PLAN_STATE.READY_WITH_NOTICE
        ? "caution"
        : outputPlan.state === PRINT_OUTPUT_PLAN_STATE.MISSING_REQUIRED_PROFILE ||
            outputPlan.state === PRINT_OUTPUT_PLAN_STATE.MISSING_HAZARD_DATA ||
            outputPlan.state === PRINT_OUTPUT_PLAN_STATE.INVALID_STOCK
          ? "danger"
          : "caution";
  const shouldOpenOutputPlanDetails =
    outputPlanTone === "danger" ||
    outputPlan.state === PRINT_OUTPUT_PLAN_STATE.RECOMMEND_FULL_PAGE;
  const hasAnyPictograms =
    printReadiness.elementSummary.pictograms.expected > 0;
  const isQrSupplementOutput =
    labelPurpose === "qrSupplement" ||
    outputPlan.outputKind === PRINT_OUTPUT_KIND.QR_SUPPLEMENT;
  const isQuickIdOutput =
    labelPurpose === "quickId" ||
    outputPlan.outputKind === PRINT_OUTPUT_KIND.QUICK_ID;
  const isContinuationOutput =
    outputPlan.state === PRINT_OUTPUT_PLAN_STATE.READY_WITH_CONTINUATION;
  const isSupplementalOutput =
    outputPlan.state === PRINT_OUTPUT_PLAN_STATE.READY_WITH_NOTICE;
  const printTrustMode =
    outputPlan.state === PRINT_OUTPUT_PLAN_STATE.MISSING_HAZARD_DATA ||
    outputPlan.state === PRINT_OUTPUT_PLAN_STATE.MISSING_REQUIRED_PROFILE ||
    outputPlan.state === PRINT_OUTPUT_PLAN_STATE.INVALID_STOCK
      ? "blocked"
      : isSupplementalOutput || isQrSupplementOutput || isQuickIdOutput
        ? "supplemental"
        : "general";
  const shouldShowPrintTrustNote =
    selectedForLabel.length > 0 &&
    outputPlan.state !== PRINT_OUTPUT_PLAN_STATE.PENDING_SELECTION;
  const contentPolicy =
    outputPlan.readiness?.contentPolicy ||
    printReadiness.contentPolicy ||
    resolvePrintContentPolicy(layoutProfile, { locale: i18n.language });
  const isContainerFrontOutput =
    isSupplementalOutput &&
    contentPolicy.role === PRINT_CONTENT_ROLE.CONTAINER_FRONT;
  const outputRoleSummary =
    outputPlan.state === PRINT_OUTPUT_PLAN_STATE.READY
      ? tx("label.decisionRoleComplete", "Complete primary")
    : isContinuationOutput
      ? tx("label.decisionRoleContinuation", "Complete primary with continuation")
    : outputPlan.state === PRINT_OUTPUT_PLAN_STATE.READY_WITH_NOTICE &&
        outputPlan.outputKind === PRINT_OUTPUT_KIND.QR_SUPPLEMENT
      ? tx("label.decisionRoleQrSupplement", "QR supplement")
      : outputPlan.state === PRINT_OUTPUT_PLAN_STATE.READY_WITH_NOTICE &&
          outputPlan.outputKind === PRINT_OUTPUT_KIND.QUICK_ID
        ? tx("label.decisionRoleQuickId", "Quick-ID supplement")
      : outputPlan.state === PRINT_OUTPUT_PLAN_STATE.READY_WITH_NOTICE
        ? isContainerFrontOutput
          ? tx("label.decisionRoleContainerFront", "Container front label")
          : tx("label.decisionRoleSupplemental", "Supplemental label")
          : outputPlan.state === PRINT_OUTPUT_PLAN_STATE.RECOMMEND_FULL_PAGE
            ? tx("label.decisionRoleUseFullPage", "Use full-page primary")
            : outputPlan.state === PRINT_OUTPUT_PLAN_STATE.MISSING_HAZARD_DATA
              ? tx("label.decisionRoleBlockedHazards", "Hazard label blocked")
              : outputPlan.state ===
                  PRINT_OUTPUT_PLAN_STATE.MISSING_REQUIRED_PROFILE
                ? tx("label.decisionRoleBlockedProfile", "Profile required")
                : tx("label.decisionRolePending", "Select content");
  const previewContextOutputSummary = activeBatchPreviewItem
    ? `${getBatchPurposeLabel(
        activeBatchPreviewItem.effectivePurpose,
        tx,
      )} · ${getBatchCategoryLabel(activeBatchPreviewItem.category, tx)}`
    : outputRoleSummary;
  const pictogramSummary =
    outputPlan.state === PRINT_OUTPUT_PLAN_STATE.MISSING_HAZARD_DATA
      ? tx("label.decisionIconsNeedData", "Need verified hazard data")
      : hasAnyPictograms
        ? tx("label.decisionIconsAllKept", "All pictograms kept")
        : tx("label.decisionIconsNotAvailable", "No pictograms available");
  const statementSummary =
    outputPlan.state === PRINT_OUTPUT_PLAN_STATE.MISSING_HAZARD_DATA
      ? tx("label.decisionTextBlocked", "Do not print yet")
      : isContinuationOutput ||
          contentPolicy.hazardTextMode ===
            PRINT_HAZARD_TEXT_MODE.FULL_HP_CONTINUATION
        ? tx("label.decisionTextContinuation", "Full H/P text across pages")
        : contentPolicy.hazardTextMode === PRINT_HAZARD_TEXT_MODE.FULL_HP
          ? tx("label.decisionTextComplete", "Full H/P text")
          : contentPolicy.hazardTextMode ===
              PRINT_HAZARD_TEXT_MODE.QR_REFERENCE
            ? qrTargetInfo
              ? tx(
                  "label.decisionTextQrScanSpecific",
                  "Details via QR: {{target}}",
                  { target: qrTargetRoleLabel },
                )
              : tx("label.decisionTextQrScan", "Details via QR/SDS")
            : contentPolicy.hazardTextMode ===
                PRINT_HAZARD_TEXT_MODE.OMITTED
              ? tx("label.decisionTextIdentityOnly", "No full H/P text")
              : contentPolicy.hazardTextMode ===
                  PRINT_HAZARD_TEXT_MODE.H_CODES_ONLY
                ? tx("label.decisionTextHCodesOnly", "H codes only")
                : contentPolicy.hazardTextMode ===
                    PRINT_HAZARD_TEXT_MODE.PRIORITY_H_SUMMARY
                  ? tx("label.decisionTextPriorityHOnly", "Priority H only")
                  : contentPolicy.hazardTextMode ===
                      PRINT_HAZARD_TEXT_MODE.SHORT_H_SUMMARY
                    ? tx("label.decisionTextSummaryOnly", "Short hazard summary")
                    : tx("label.decisionTextCheck", "Check requirements");
  const decisionSummaryItems = [
    {
      key: "role",
      label: tx("label.decisionRoleLabel", "Output role"),
      value: outputRoleSummary,
      tone: outputPlanTone,
    },
    {
      key: "icons",
      label: tx("label.decisionIconsLabel", "GHS icons"),
      value: pictogramSummary,
      tone:
        outputPlan.state === PRINT_OUTPUT_PLAN_STATE.MISSING_HAZARD_DATA
          ? "danger"
          : hasAnyPictograms
            ? "ready"
            : "neutral",
    },
    {
      key: "text",
      label: tx("label.decisionTextLabel", "Hazard text"),
      value: statementSummary,
      tone:
        outputPlan.state === PRINT_OUTPUT_PLAN_STATE.MISSING_HAZARD_DATA
          ? "danger"
          : outputPlan.state === PRINT_OUTPUT_PLAN_STATE.READY_WITH_NOTICE
            ? "caution"
            : "ready",
    },
  ];
  const responsibleProfilePresentCount = RESPONSIBLE_PROFILE_FIELDS.filter(
    (field) => Boolean(resolvedResponsibleProfile[field]),
  ).length;
  const responsibleProfileRequired =
    outputPlan.outputKind === PRINT_OUTPUT_KIND.COMPLETE_PRIMARY;
  const responsibleProfileMissing =
    outputPlan.state === PRINT_OUTPUT_PLAN_STATE.MISSING_REQUIRED_PROFILE;
  const responsibleProfileTone = responsibleProfileMissing
    ? "danger"
    : responsibleProfileRequired
      ? "ready"
      : "neutral";
  const responsibleProfileStatus = responsibleProfileRequired
    ? responsibleProfilePresentCount === RESPONSIBLE_PROFILE_FIELDS.length
      ? tx("label.profileStatusComplete", "Ready for complete primary")
      : tx("label.profileStatusMissing", "Required for complete primary")
    : tx("label.profileStatusOptional", "Optional for this output");
  const printedLabelValue = tx("label.outputPrinted", "Printed");
  const optionalLabelValue = tx("label.outputOptional", "Optional");
  const outputChecklistTitle = isSupplementalOutput
    ? tx("label.outputPrintedChecklistTitle", "This label prints")
    : tx("label.outputChecklistTitle", "Required output");
  const outputChecklistHint = isSupplementalOutput
    ? tx(
        "label.outputPrintedChecklistHint",
        "This describes the current physical label only. Complete H/P detail belongs on the primary label or SDS/QR path.",
      )
    : tx(
        "label.outputChecklistHint",
        "Counts come from the same content model used by print preflight.",
      );
  const outputChecklistBadge = isSupplementalOutput
    ? tx("label.outputSupplemental", "Supplemental")
    : tx("label.outputPrimary", "Primary");
  const supplementalHazardOutputItem =
    contentPolicy.hazardTextMode === PRINT_HAZARD_TEXT_MODE.QR_REFERENCE
    ? {
        key: "hazard-reference",
        label: tx("label.outputHazardReference", "Detailed hazard text"),
        value: qrTargetInfo
          ? tx("label.outputQrScanSpecificPath", "Via QR: {{target}}", {
              target: qrTargetRoleLabel,
            })
          : tx("label.outputQrScanPath", "Via QR/SDS"),
        tone: "neutral",
        description: tx(
          "label.outputQrScanPathHint",
          "The small QR label does not print full H/P text.",
        ),
      }
    : contentPolicy.hazardTextMode === PRINT_HAZARD_TEXT_MODE.OMITTED
      ? {
          key: "hazard-reference",
          label: tx("label.outputHazardReference", "Detailed hazard text"),
          value: tx("label.outputNotOnSmallLabel", "Not on small label"),
          tone: "neutral",
          description: tx(
            "label.outputNotOnSmallLabelHint",
            "Quick-ID labels keep identity and pictograms readable.",
          ),
        }
      : contentPolicy.hazardTextMode === PRINT_HAZARD_TEXT_MODE.H_CODES_ONLY
        ? {
            key: "hazard-statements",
            label: tx("label.outputHazardSummary", "Hazard summary"),
            value: tx("label.outputHCodesOnly", "H codes only"),
            tone: "caution",
            description: tx(
              "label.outputHCodesOnlyHint",
              "Compact labels print priority H codes only; full H/P belongs on A4/Letter, SDS/QR, or a back label.",
            ),
          }
        : {
          key: "hazard-statements",
          label: tx("label.outputHazardSummary", "Hazard summary"),
          value:
            contentPolicy.hazardTextMode ===
            PRINT_HAZARD_TEXT_MODE.PRIORITY_H_SUMMARY
            ? tx("label.outputPriorityHOnly", "Priority H only")
            : tx("label.outputSummaryOnly", "Summary only"),
          tone: "caution",
          description: tx(
            "label.outputSummaryOnlyHint",
            "Container and bottle front labels print priority H summaries only. Full H/P belongs on A4/Letter, SDS/QR, or a back label.",
          ),
        };
  const supplementalChecklistItems = [
    {
      key: "identity",
      label: tx("label.outputIdentity", "Identity"),
      value: printedLabelValue,
      tone: "ready",
      description: tx("label.outputIdentityHint", "Name and CAS stay visible."),
    },
    {
      key: "pictograms",
      label: tx("label.outputPictograms", "GHS pictograms"),
      value: formatOutputCount(printReadiness.elementSummary.pictograms),
      tone: getOutputTone(printReadiness.elementSummary.pictograms),
      description: tx(
        "label.outputPictogramsHint",
        "Available pictograms must stay on the label.",
      ),
    },
    {
      key: "signal-word",
      label: tx("label.outputSignalWord", "Signal word"),
      value: formatOutputCount(printReadiness.elementSummary.signalWord),
      tone: getOutputTone(printReadiness.elementSummary.signalWord),
    },
    ...(isQrSupplementOutput
      ? [
          {
            key: "qr-code",
            label: tx("label.outputQrCode", "QR code"),
            value: printedLabelValue,
            tone: "ready",
            description: tx(
              "label.outputQrCodeHint",
              "Scan path carries supporting detail.",
            ),
          },
          {
            key: "qr-target",
            label: tx("label.outputQrTarget", "QR target"),
            value: qrTargetInfo
              ? qrTargetRoleLabel
              : tx("label.outputQrTargetMissing", "Not available"),
            tone: qrTargetInfo ? "ready" : "caution",
            description: qrTargetInfo
              ? tx(
                  "label.outputQrTargetHint",
                  "Scans to {{label}} ({{source}}). Verify the destination before relying on it.",
                  {
                    label: qrTargetInfo.label,
                    source: qrTargetSourceLabel,
                  },
                )
              : tx(
                  "label.outputQrTargetMissingHint",
                  "No safe QR destination is available for this result.",
                ),
          },
        ]
      : []),
    supplementalHazardOutputItem,
    {
      key: "responsible-profile",
      label: tx("label.outputResponsibleProfile", "Responsible profile"),
      value:
        responsibleProfilePresentCount > 0
          ? printedLabelValue
          : optionalLabelValue,
      tone: responsibleProfilePresentCount > 0 ? "ready" : "neutral",
    },
  ];
  const primaryChecklistItems = [
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
  const outputChecklistItems = isSupplementalOutput
    ? supplementalChecklistItems
    : primaryChecklistItems;
  const hasPreviewWarnings = visiblePreviewRisks.some(
    (risk) => risk !== readyPreviewMessage,
  );
  const isPrintFitBlocked =
    selectedForLabel.length > 0 &&
    !outputPlan.canPrint &&
    !canPrintBatchSelectedScope;
  const isProfileBlocked =
    outputPlan.state === PRINT_OUTPUT_PLAN_STATE.MISSING_REQUIRED_PROFILE;
  const printBlockedLabel = isProfileBlocked
    ? tx("label.printFixProfileRequired", "Add lab/supplier profile first")
    : outputPlanHasUpstreamError
      ? tx("label.printFixVerifyHazards", "Verify hazard data first")
    : outputPlan.state === PRINT_OUTPUT_PLAN_STATE.INVALID_STOCK
      ? tx("label.printFixContinuationRequired", "Create a continuation plan first")
      : tx("label.printFixRequired", "Choose a printable stock first");
  const canUseFullPagePrimary =
    outputPlan.state === PRINT_OUTPUT_PLAN_STATE.RECOMMEND_FULL_PAGE &&
    Boolean(recommendedFullPagePreset) &&
    layoutProfile.stockPreset !== recommendedFullPagePreset.id &&
    !canPrintBatchSelectedScope;
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
  const outputPlanTitle =
    outputPlan.state === PRINT_OUTPUT_PLAN_STATE.READY
      ? tx("label.outputPlanReadyTitle", "Complete output ready")
      : outputPlan.state === PRINT_OUTPUT_PLAN_STATE.READY_WITH_CONTINUATION
        ? tx("label.outputPlanContinuationTitle", "Continuation output ready")
      : outputPlan.state === PRINT_OUTPUT_PLAN_STATE.READY_WITH_NOTICE
        ? isContainerFrontOutput
          ? tx("label.outputPlanContainerFrontTitle", "Container front label ready")
          : tx("label.outputPlanSupplementalTitle", "Supplemental output")
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
      : outputPlan.state === PRINT_OUTPUT_PLAN_STATE.READY_WITH_CONTINUATION
        ? tx(
            "label.outputPlanContinuationBody",
            "This complete primary label is split across continuation pages so all available pictograms and H/P text remain printable.",
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
  const recoveryRoute =
    selectedForLabel.length === 0
      ? null
      : canUseFullPagePrimary
        ? {
            kind: "use-full-page",
            tone: "caution",
            label: tx("label.recoveryRouteLabel", "Recommended recovery"),
            value: tx("label.recoveryUseFullPageValue", "Switch to {{stock}}", {
              stock: recommendedFullPageLabel,
            }),
            currentStock: currentStockName,
            targetStock: recommendedFullPageLabel,
            description: tx(
              "label.recoveryUseFullPageBody",
              "{{currentStock}} is too small for complete primary-label content. Print the complete primary label on {{stock}} first; use the smaller stock only as a supplemental label if needed.",
              {
                currentStock: currentStockName,
                stock: recommendedFullPageLabel,
              },
            ),
          }
        : isProfileBlocked
          ? {
              kind: "profile",
              tone: "danger",
              label: tx("label.recoveryRouteLabel", "Recommended recovery"),
              value: tx(
                "label.recoveryProfileValue",
                "Complete lab/supplier profile",
              ),
              currentStock: currentStockName,
              targetStock: "",
              description: tx(
                "label.recoveryProfileBody",
                "{{stock}} is planned as a complete primary label, so name, phone, and address must be present before print handoff.",
                { stock: currentStockName },
              ),
            }
        : outputPlan.state === PRINT_OUTPUT_PLAN_STATE.MISSING_HAZARD_DATA
          ? {
              kind: "hazard-data",
              tone: "danger",
              label: tx("label.recoveryRouteLabel", "Recommended recovery"),
              value: tx("label.recoveryHazardValue", "Verify hazard data"),
              currentStock: currentStockName,
              targetStock: "",
              description: tx(
                "label.recoveryHazardBody",
                "The app cannot print a hazard label until this result has usable GHS hazard content. Verify SDS/source data before choosing a label stock.",
              ),
            }
          : outputPlan.state === PRINT_OUTPUT_PLAN_STATE.INVALID_STOCK
            ? {
                kind: "invalid-stock",
                tone: "danger",
                label: tx("label.recoveryRouteLabel", "Recommended recovery"),
                value: tx(
                  "label.recoveryInvalidStockValue",
                  "Use a larger stock or continuation output",
                ),
                currentStock: currentStockName,
                targetStock: "",
                description: tx(
                  "label.recoveryInvalidStockBody",
                  "{{stock}} cannot carry this output truthfully. Keep every available GHS pictogram visible, then move dense H/P detail to a larger complete label or continuation output.",
                  { stock: currentStockName },
                ),
              }
            : null;
  const outputOutcomeTone =
    selectedForLabel.length === 0 ? "neutral" : outputPlanTone;
  const outputOutcomeTitle =
    selectedForLabel.length === 0
      ? tx("label.outputOutcomePendingTitle", "Choose a chemical to plan output")
      : canUseFullPagePrimary
        ? tx(
            "label.outputOutcomeUseFullPageTitle",
            "Use {{stock}} for a complete primary label",
            { stock: recommendedFullPageLabel },
          )
        : isProfileBlocked
          ? tx(
              "label.outputOutcomeProfileTitle",
              "Add lab/supplier profile before printing",
            )
          : outputPlan.state === PRINT_OUTPUT_PLAN_STATE.MISSING_HAZARD_DATA
            ? tx(
                "label.outputOutcomeHazardsTitle",
                "Verify hazard data before printing",
              )
            : outputPlan.state === PRINT_OUTPUT_PLAN_STATE.INVALID_STOCK
              ? tx("label.outputOutcomeInvalidTitle", "Choose a larger output")
              : isContinuationOutput
                ? tx(
                    "label.outputOutcomeContinuationTitle",
                    "Complete primary label will print across continuation pages",
                  )
              : isQrSupplementOutput
                ? tx("label.outputOutcomeQrTitle", "QR supplement is printable")
                : isQuickIdOutput
                  ? tx(
                      "label.outputOutcomeQuickIdTitle",
                      "{{target}} quick-ID label is printable",
                      { target: printTargetLabel },
                    )
                  : isSupplementalOutput
                  ? isContainerFrontOutput
                    ? tx(
                        "label.outputOutcomeContainerFrontTitle",
                        "{{target}} is printable as a front label",
                        { target: printTargetLabel },
                      )
                    : tx(
                        "label.outputOutcomeSupplementalTitle",
                        "{{target}} is printable as a supplement",
                        { target: printTargetLabel },
                      )
                  : tx(
                      "label.outputOutcomeCompleteTitle",
                      "Complete primary label is printable",
                    );
  const outputOutcomeBody =
    selectedForLabel.length === 0
      ? tx(
          "label.outputOutcomePendingBody",
          "Select a result and the app will choose the safest printable output for the target size.",
        )
      : canUseFullPagePrimary
        ? tx(
            "label.outputOutcomeUseFullPageBody",
            "The current target is too small for complete content. Switch to {{stock}} for the full label, then print a smaller supplemental label only if needed.",
            { stock: recommendedFullPageLabel },
          )
        : isProfileBlocked
          ? tx(
              "label.outputOutcomeProfileBody",
              "Complete primary labels need responsible lab or supplier name, phone, and address. Supplemental labels can stay secondary.",
            )
          : outputPlan.state === PRINT_OUTPUT_PLAN_STATE.MISSING_HAZARD_DATA
            ? plannerPreviewRisk ||
              tx(
                "label.outputOutcomeHazardsBody",
                "The app will not print a hazard label when source GHS data is unavailable or unverified.",
              )
            : outputPlan.state === PRINT_OUTPUT_PLAN_STATE.INVALID_STOCK
              ? tx(
                  "label.outputOutcomeInvalidBody",
                  "This stock cannot produce a truthful label. Use a larger primary label or create a continuation plan.",
                )
              : isContinuationOutput
                ? tx(
                    "label.outputOutcomeContinuationBody",
                    "The app will keep identity, CAS, signal word, and every GHS pictogram on each page, then continue the full H/P text over additional pages.",
                  )
              : isQrSupplementOutput
                ? tx(
                    "label.outputOutcomeQrBody",
                    "This prints a scan-first supplement with identity, QR, and all available pictograms. QR opens {{target}} support and does not replace a complete primary label.",
                    { target: qrTargetInfo ? qrTargetRoleLabel : "SDS/QR" },
                  )
                : isQuickIdOutput
                  ? tx(
                      "label.outputOutcomeQuickIdBody",
                      "This prints a bench-side quick-ID supplement with identity, signal word, and every available pictogram. It does not replace a complete primary label.",
                    )
                  : isSupplementalOutput
                    ? tx(
                        "label.outputOutcomeSupplementalBody",
                        "This prints on {{stock}} as a front or supplemental label: identity, CAS/case, signal word, every available pictogram, and priority H summaries. Full H/P belongs on A4/Letter, SDS/QR, or a back label.",
                        { stock: currentStockName },
                      )
                    : tx(
                        "label.outputOutcomeCompleteBody",
                        "This prints on {{stock}} with all available pictograms and full H/P text for the selected content.",
                        { stock: currentStockName },
                      );
  const shouldShowPreviewOutcomeSummary =
    selectedForLabel.length === 0 ||
    outputOutcomeTone === "danger" ||
    outputPlan.state === PRINT_OUTPUT_PLAN_STATE.RECOMMEND_FULL_PAGE;
  const printActionLabel =
    selectedForLabel.length === 0
      ? t("label.printBtn", { count: totalLabels })
      : isPrintFitBlocked
        ? printBlockedLabel
        : canPrintBatchSelectedScope
          ? batchAcknowledgedPrintCount > 0
            ? tx(
                "label.printAcknowledgedBatchAction",
                "Print {{count}} selected {{purpose}} labels on {{stock}} ({{excluded}} excluded)",
                {
                  count: batchSelectedPrintItems.length,
                  total: batchPrintPlan.summary.total,
                  purpose: batchPrintPurposeLabel,
                  stock: currentStockName,
                  excluded: batchPrintPlan.summary.excluded,
                },
              )
            : tx(
                "label.printReadyBatchAction",
                "Print {{ready}} ready {{purpose}} labels on {{stock}} ({{excluded}} excluded)",
                {
                  ready: batchPrintPlan.summary.printableByDefault,
                  total: batchPrintPlan.summary.total,
                  purpose: batchPrintPurposeLabel,
                  stock: currentStockName,
                  excluded: batchPrintPlan.summary.excluded,
                },
              )
        : isContinuationOutput
          ? tx(
              "label.printContinuationAction",
              "Print complete primary continuation set",
            )
        : isQrSupplementOutput
          ? tx(
              "label.printQrSupplementAction",
              "Print QR supplement ({{count}})",
              {
                count: totalLabels,
              },
            )
          : isQuickIdOutput
            ? tx(
                "label.printQuickIdAction",
                "Print {{target}} quick-ID label ({{count}})",
                { target: printTargetLabel, count: totalLabels },
              )
          : isSupplementalOutput
            ? isContainerFrontOutput
              ? tx(
                  "label.printContainerFrontAction",
                  "Print {{target}} (front, {{count}})",
                  { target: printTargetLabel, count: totalLabels },
                )
              : tx(
                  "label.printSupplementalAction",
                  "Print {{target}} (supplemental, {{count}})",
                  { target: printTargetLabel, count: totalLabels },
                )
            : tx(
                "label.printCompletePrimaryAction",
                "Print complete primary label ({{count}})",
                { count: totalLabels },
              );
  const useFullPagePrimaryLabel = tx(
    "label.useFullPagePrimaryForComplete",
    "Use {{stock}} for complete label",
    { stock: recommendedFullPageLabel },
  );
  const sheetPreviewBundle = useMemo(
    () =>
      buildPrintPreviewDocument(
        sheetPreviewItems,
        labelConfig,
        customGHSSettings,
        customLabelFields,
        sheetPreviewQuantities,
        labProfile,
        { mode: "sheet", pageIndex: previewPageIndex },
      ),
    [
      sheetPreviewItems,
      labelConfig,
      customGHSSettings,
      customLabelFields,
      sheetPreviewQuantities,
      labProfile,
      previewPageIndex,
    ],
  );
  const plannedPrintLabelCount =
    sheetPreviewBundle?.model?.expandedLabels?.length || totalLabels;
  const plannedPrintPageCount =
    sheetPreviewBundle?.model?.totalPages || estimatedPages;
  const activePreviewPageIndex = sheetPreviewBundle?.previewPageIndex || 0;
  const activePreviewLabelIndex =
    plannedPrintLabelCount > 0
      ? Math.min(
          activePreviewPageIndex * Math.max(layoutProfile.perPage || 1, 1),
          plannedPrintLabelCount - 1,
        )
      : 0;
  const hasMultiplePreviewPages = plannedPrintPageCount > 1;
  const hasContinuationExpansion = plannedPrintLabelCount > totalLabels;
  const labelPreviewBundle = useMemo(() => {
    if (selectedForLabel.length === 0) return null;

    return buildPrintPreviewDocument(
      previewSourceItems,
      previewLabelConfig,
      customGHSSettings,
      customLabelFields,
      previewLabelQuantities,
      labProfile,
      {
        mode: "label",
        previewZoom: previewZoomMode,
        labelIndex: activePreviewLabelIndex,
      },
    );
  }, [
    previewSourceItems,
    previewLabelConfig,
    customGHSSettings,
    customLabelFields,
    previewLabelQuantities,
    labProfile,
    previewZoomMode,
    activePreviewLabelIndex,
  ]);

  useEffect(() => {
    setPreviewZoomMode("fit");
    setPreviewPageIndex(0);
  }, [
    batchPreviewRepresentative,
    batchPreviewItemIndex,
    labelConfig.colorMode,
    labelConfig.labelHeightMm,
    labelConfig.labelPurpose,
    labelConfig.labelWidthMm,
    labelConfig.nameDisplay,
    labelConfig.orientation,
    labelConfig.size,
    labelConfig.stockPreset,
    labelConfig.template,
    previewSelectionKey,
  ]);

  useEffect(() => {
    setBatchPreviewRepresentative(BATCH_PRINT_REPRESENTATIVE.FIRST);
    setBatchPreviewItemIndex(null);
    setBatchIncludeReducedPurpose(false);
    setBatchIncludeContinuation(false);
  }, [
    labelConfig.labelPurpose,
    labelConfig.labelHeightMm,
    labelConfig.labelWidthMm,
    labelConfig.stockPreset,
    labelConfig.template,
    previewSelectionKey,
  ]);

  useEffect(() => {
    const maxPageIndex = Math.max(plannedPrintPageCount - 1, 0);
    if (previewPageIndex > maxPageIndex) {
      setPreviewPageIndex(maxPageIndex);
    }
  }, [plannedPrintPageCount, previewPageIndex]);

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
      const isFullPageStock =
        preset.outputRole === "full-page-primary" ||
        FULL_PAGE_PRIMARY_STOCK_IDS.includes(preset.id);
      nextConfig.labelPurpose = "shipping";
      nextConfig.template = isFullPageStock ? "full" : "standard";
    }

    onLabelConfigChange(nextConfig);
  };

  const handleUseFullPagePrimary = () => {
    if (!recommendedFullPagePreset) return;
    applyStockPreset(recommendedFullPagePreset);
  };

  const handlePrintAction = () => {
    onPrintLabels(
      labelConfig,
      canPrintBatchSelectedScope ? batchSelectedPrintItems : undefined,
    );
  };

  const handleExportBatchReviewList = () => {
    const reviewItems = batchItemsNeedingReview.length
      ? batchItemsNeedingReview
      : batchPrintPlan.items;
    const csv = buildBatchReviewCsv(reviewItems, tx);
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "ghs-batch-print-review.csv";
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  };

  const handleFocusResponsibleProfile = () => {
    const profilePanel = document.querySelector(
      '[data-testid="responsible-profile-controls"]',
    );
    const firstInput = profilePanel?.querySelector("input");
    profilePanel?.scrollIntoView?.({ block: "center", behavior: "smooth" });
    firstInput?.focus?.();
  };

  const applyPrintTarget = (targetValue) => {
    userSelectedStockRef.current = true;
    const option = PRINT_TARGET_OPTIONS.find((item) => item.value === targetValue);
    const preset = ALL_STOCK_PRESETS.find((item) => item.id === option?.presetId);

    if (!option || !preset) return;

    const nextConfig = {
      ...labelConfig,
      labelPurpose: option.purpose,
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
    };

    if (option.purpose === "shipping") {
      const isFullPageStock =
        preset.outputRole === "full-page-primary" ||
        FULL_PAGE_PRIMARY_STOCK_IDS.includes(preset.id);
      nextConfig.template = isFullPageStock
        ? "full"
        : option.template || "standard";
    }

    onLabelConfigChange(nextConfig);
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

  const renderStockChoiceButton = (preset) => {
    const selected = layoutProfile.stockPreset === preset.id;
    const display = getLabelStockPresetDisplay(preset, t);
    const isFullPage = FULL_PAGE_PRIMARY_STOCK_IDS.includes(preset.id);

    return (
      <button
        key={preset.id}
        type="button"
        onClick={() => applyStockPreset(preset)}
        aria-pressed={selected}
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
  };

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
  const fallbackLabelFragmentPreviewHeight =
    labelConfig.template === "qrcode"
      ? "20rem"
      : isFullPagePrimaryPreview
        ? "24rem"
        : layoutProfile.orientation === "portrait"
          ? "34rem"
          : "22rem";
  const labelFragmentPreviewHeight = getPreviewFrameHeight(
    labelPreviewBundle?.previewMetrics,
    fallbackLabelFragmentPreviewHeight,
  );
  const sheetPreviewHeight = getPreviewFrameHeight(
    sheetPreviewBundle?.previewMetrics,
    layoutProfile.orientation === "landscape" ? "18rem" : "20rem",
  );
  const previewScalePercent = labelPreviewBundle?.previewMetrics
    ?.labelPreviewScale
    ? Math.round(labelPreviewBundle.previewMetrics.labelPreviewScale * 100)
    : null;
  const previewScaleLabel = previewScalePercent
    ? tx("label.previewScaleValue", "{{scale}}% scale", {
        scale: previewScalePercent,
      })
    : tx("label.previewScalePending", "Scale pending");
  const previewFitLabel =
    previewZoomMode === "inspect"
      ? tx("label.previewInspectMode", "Detail inspect mode")
      : tx("label.previewFitMode", "Whole label visible");
  const previewPhysicalSizeLabel = `${formatMmValue(
    layoutProfile.widthMm,
  )} x ${formatMmValue(layoutProfile.heightMm)} mm`;
  const previewPageLabel = `${layoutProfile.page?.size || "A4"} · ${currentStockOrientation} · ${tx(
    "label.previewPerPageValue",
    "{{count}}/page",
    { count: layoutProfile.perPage },
  )}`;
  const previewPagePositionLabel = tx(
    "label.previewPagePosition",
    "Page {{current}} / {{total}}",
    {
      current: activePreviewPageIndex + 1,
      total: Math.max(plannedPrintPageCount, 1),
    },
  );
  const updatePreviewPageIndex = (nextIndex) => {
    const maxPageIndex = Math.max(plannedPrintPageCount - 1, 0);
    setPreviewPageIndex(Math.max(0, Math.min(nextIndex, maxPageIndex)));
  };

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

  const renderBatchFitReport = () => {
    if (!hasBatchPrintPlan) return null;

    const countItems = [
      {
        key: "ready",
        label: tx("label.batchReady", "Ready"),
        value:
          batchPrintPlan.summary.counts[BATCH_PRINT_ITEM_CATEGORY.READY] +
          batchPrintPlan.summary.counts[BATCH_PRINT_ITEM_CATEGORY.READY_TIGHT],
        tone: "ready",
      },
      {
        key: "review",
        label: tx("label.batchReview", "Needs review"),
        value: batchPrintPlan.summary.requiresAcknowledgement,
        tone: batchPrintPlan.summary.requiresAcknowledgement > 0 ? "caution" : "neutral",
      },
      {
        key: "excluded",
        label: tx("label.batchExcluded", "Excluded"),
        value: batchPrintPlan.summary.excluded,
        tone: batchPrintPlan.summary.excluded > 0 ? "danger" : "neutral",
      },
    ];

    return (
      <div
        className="mt-3 rounded-md border border-slate-200 bg-white/80 p-3"
        data-testid="batch-fit-report"
      >
        <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0">
            <div className="text-xs font-semibold uppercase tracking-normal text-slate-500">
              {tx("label.batchFitReportTitle", "Batch fit report")}
            </div>
            <p className="mt-1 text-xs leading-5 text-slate-600">
              {tx(
                "label.batchFitReportBody",
                "One fixed stock is kept for this batch. Ready labels can print now; review or excluded labels stay visible before handoff.",
              )}
            </p>
          </div>
          <span
            className="shrink-0 rounded-full bg-slate-100 px-2 py-1 text-xs font-medium text-slate-700"
            data-testid="batch-fit-stock-purpose"
          >
            {batchPrintPurposeLabel} · {currentStockName}
          </span>
        </div>
        <div className="mt-3 grid gap-2 sm:grid-cols-3">
          {countItems.map((item) => (
            <div
              key={item.key}
              className={`rounded-md border px-3 py-2 ${
                READINESS_TONE_CLASSES[item.tone] ||
                READINESS_TONE_CLASSES.neutral
              }`}
              data-testid={`batch-fit-${item.key}`}
            >
              <div className="text-xs font-medium opacity-80">{item.label}</div>
              <div className="mt-1 text-lg font-semibold">{item.value}</div>
            </div>
          ))}
        </div>
        {batchPrintPlan.representatives.worstFit && (
          <p
            className="mt-2 text-xs leading-5 text-slate-500"
            data-testid="batch-fit-worst"
          >
            {tx("label.batchWorstFit", "Highest pressure")}:{" "}
            {batchPrintPlan.representatives.worstFit.identity}
          </p>
        )}
        {batchRepresentativeOptions.length > 0 && (
          <div
            className="mt-3 rounded-md border border-slate-200 bg-slate-50 p-2"
            data-testid="batch-preview-selector"
          >
            <div className="text-xs font-semibold uppercase tracking-normal text-slate-500">
              {tx("label.batchPreviewSelectorTitle", "Representative preview")}
            </div>
            <div className="mt-2 flex flex-wrap gap-2">
              {batchRepresentativeOptions.map((representative) => {
                const rep = batchPrintPlan.representatives[representative];
                const isActive =
                  batchPreviewItemIndex === null &&
                  batchPreviewRepresentative === representative;
                return (
                  <button
                    key={representative}
                    type="button"
                    onClick={() => {
                      setBatchPreviewRepresentative(representative);
                      setBatchPreviewItemIndex(null);
                    }}
                    className={`rounded-md border px-2.5 py-1.5 text-xs font-medium transition-colors ${
                      isActive
                        ? "border-blue-300 bg-blue-50 text-blue-800"
                        : "border-slate-200 bg-white text-slate-600 hover:border-blue-200 hover:text-blue-700"
                    }`}
                    data-testid={`batch-preview-rep-${representative}`}
                  >
                    {getBatchRepresentativeLabel(representative, tx)}
                    {rep?.identity ? (
                      <span className="ml-1 text-slate-400">
                        #{rep.index + 1}
                      </span>
                    ) : null}
                  </button>
                );
              })}
            </div>
            {activeBatchPreviewItem && (
              <div
                className={`mt-2 rounded-md border px-3 py-2 text-xs ${
                  READINESS_TONE_CLASSES[
                    BATCH_CATEGORY_TONE[activeBatchPreviewItem.category] ||
                      "neutral"
                  ]
                }`}
                data-testid="batch-active-preview-summary"
              >
                <div className="font-semibold">
                  {activeBatchPreviewItem.identity ||
                    activeBatchPreviewItem.cas ||
                    tx("label.batchUnnamedItem", "Selected item")}
                </div>
                <div className="mt-1 leading-5">
                  {getBatchCategoryLabel(activeBatchPreviewItem.category, tx)}
                  {activeBatchPreviewItem.reason
                    ? ` · ${getBatchReasonLabel(activeBatchPreviewItem.reason, tx)}`
                    : ""}
                </div>
              </div>
            )}
          </div>
        )}
        {(batchReducedPurposeItems.length > 0 ||
          batchContinuationItems.length > 0) && (
          <div
            className="mt-3 rounded-md border border-amber-200 bg-amber-50/70 p-3"
            data-testid="batch-print-scope-controls"
          >
            <div className="text-xs font-semibold uppercase tracking-normal text-amber-800">
              {tx("label.batchPrintScopeTitle", "Print scope")}
            </div>
            <p className="mt-1 text-xs leading-5 text-amber-900/80">
              {tx(
                "label.batchPrintScopeBody",
                "Ready labels are included by default. Add reduced or continuation items only when that output role is acceptable for this batch.",
              )}
            </p>
            <div className="mt-3 grid gap-2">
              {batchReducedPurposeItems.length > 0 && (
                <label className="flex items-start gap-2 rounded-md border border-amber-200 bg-white/80 px-3 py-2 text-xs text-slate-700">
                  <input
                    type="checkbox"
                    className="mt-0.5 h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                    checked={batchIncludeReducedPurpose}
                    onChange={(event) =>
                      setBatchIncludeReducedPurpose(event.target.checked)
                    }
                    data-testid="batch-include-reduced-purpose"
                  />
                  <span>
                    <span className="font-semibold text-slate-900">
                      {tx(
                        "label.batchIncludeReducedPurpose",
                        "Include reduced-purpose labels",
                      )}
                    </span>
                    <span className="ml-1 text-slate-500">
                      ({batchReducedPurposeItems.length})
                    </span>
                    <span className="block leading-5 text-slate-500">
                      {tx(
                        "label.batchIncludeReducedPurposeHint",
                        "These keep identity, signal word, and pictograms on the same stock, but do not claim complete-primary output.",
                      )}
                    </span>
                  </span>
                </label>
              )}
              {batchContinuationItems.length > 0 && (
                <label className="flex items-start gap-2 rounded-md border border-amber-200 bg-white/80 px-3 py-2 text-xs text-slate-700">
                  <input
                    type="checkbox"
                    className="mt-0.5 h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                    checked={batchIncludeContinuation}
                    onChange={(event) =>
                      setBatchIncludeContinuation(event.target.checked)
                    }
                    data-testid="batch-include-continuation"
                  />
                  <span>
                    <span className="font-semibold text-slate-900">
                      {tx(
                        "label.batchIncludeContinuation",
                        "Include same-stock continuation labels",
                      )}
                    </span>
                    <span className="ml-1 text-slate-500">
                      ({batchContinuationItems.length})
                    </span>
                    <span className="block leading-5 text-slate-500">
                      {tx(
                        "label.batchIncludeContinuationHint",
                        "These may expand one chemical into multiple labels on the same selected stock.",
                      )}
                    </span>
                  </span>
                </label>
              )}
            </div>
            <div
              className="mt-2 rounded-md bg-white/70 px-3 py-2 text-xs font-medium text-amber-900"
              data-testid="batch-print-scope-summary"
            >
              {tx(
                "label.batchPrintScopeSummary",
                "{{count}} item(s) will print as {{purpose}} on {{stock}}; {{excluded}} excluded; {{review}} review item(s) not selected.",
                {
                  count: batchSelectedPrintItems.length,
                  purpose: batchPrintPurposeLabel,
                  stock: currentStockName,
                  excluded: batchPrintPlan.summary.excluded,
                  review: batchUnselectedReviewCount,
                },
              )}
            </div>
          </div>
        )}
        {batchItemsNeedingReview.length > 0 && (
          <details
            className="mt-3 rounded-md border border-slate-200 bg-white p-2"
            data-testid="batch-review-list"
          >
            <summary className="flex cursor-pointer list-none items-center justify-between gap-3 text-xs font-semibold text-slate-700">
              <span>
                {tx(
                  "label.batchReviewListTitle",
                  "Items needing review or exclusion",
                )}
              </span>
              <span className="rounded-full bg-slate-100 px-2 py-1 text-slate-600">
                {batchItemsNeedingReview.length}
              </span>
            </summary>
            <div className="mt-3 flex flex-col gap-2">
              {batchItemsNeedingReview.slice(0, 12).map((item) => (
                <div
                  key={`${item.index}-${item.cas}`}
                  className="grid gap-2 rounded-md border border-slate-200 bg-slate-50 p-2 text-xs sm:grid-cols-[minmax(0,1fr)_auto]"
                  data-testid={`batch-review-item-${item.index}`}
                >
                  <div className="min-w-0">
                    <div className="truncate font-semibold text-slate-800">
                      #{item.index + 1} {item.identity || item.cas}
                    </div>
                    <div className="mt-1 leading-5 text-slate-600">
                      {getBatchCategoryLabel(item.category, tx)} ·{" "}
                      {getBatchReasonLabel(item.reason, tx)}
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setBatchPreviewItemIndex(item.index)}
                    className="inline-flex items-center justify-center rounded-md border border-slate-300 bg-white px-2.5 py-1.5 font-medium text-slate-700 transition-colors hover:border-blue-200 hover:text-blue-700"
                    data-testid={`batch-review-preview-${item.index}`}
                  >
                    {tx("label.batchPreviewItemAction", "Preview")}
                  </button>
                </div>
              ))}
              {batchItemsNeedingReview.length > 12 && (
                <div className="rounded-md bg-slate-50 px-3 py-2 text-xs text-slate-500">
                  {tx(
                    "label.batchReviewListMore",
                    "{{count}} more item(s) in the exported review list",
                    { count: batchItemsNeedingReview.length - 12 },
                  )}
                </div>
              )}
              <button
                type="button"
                onClick={handleExportBatchReviewList}
                className="inline-flex w-fit items-center gap-2 rounded-md border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-700 transition-colors hover:border-blue-200 hover:text-blue-700"
                data-testid="batch-export-review-list"
              >
                <FileSpreadsheet className="h-4 w-4" />
                {tx("label.batchExportReviewList", "Export review list")}
              </button>
            </div>
          </details>
        )}
      </div>
    );
  };

  const renderRecommendedOutputSection = () => {
    const RecommendationIcon =
      outputOutcomeTone === "ready" ? CheckCircle2 : AlertTriangle;

    return (
      <section
        className={`rounded-lg border p-3 ${
          READINESS_TONE_CLASSES[outputOutcomeTone] ||
          READINESS_TONE_CLASSES.neutral
        }`}
        data-testid="recommended-output-summary"
        aria-live="polite"
      >
        <div className="flex items-start gap-2">
          <RecommendationIcon className="mt-0.5 h-4 w-4 shrink-0" />
          <div className="min-w-0">
            <div className="text-xs font-semibold uppercase tracking-normal opacity-80">
              {tx("label.recommendedOutputTitle", "Recommended next step")}
            </div>
            <div className="mt-1 text-sm font-semibold">
              {outputOutcomeTitle}
            </div>
            <p className="mt-1 text-xs leading-5 opacity-90">
              {outputOutcomeBody}
            </p>
          </div>
        </div>
        <div className="mt-3 grid gap-2 text-xs sm:grid-cols-3">
          {[
            {
              key: "stock",
              label: tx("label.outputStockTitle", "Target size"),
              value: currentStockName,
            },
            {
              key: "role",
              label: tx("label.outputRole", "Output role"),
              value: outputRoleSummary,
            },
            {
              key: "statements",
              label: tx("label.outputHazardText", "Hazard text"),
              value: statementSummary,
            },
          ].map((item) => (
            <div
              key={item.key}
              className="rounded-md bg-white/70 px-2.5 py-2 ring-1 ring-current/10"
              data-testid={`recommended-output-${item.key}`}
            >
              <div className="font-medium opacity-70">{item.label}</div>
              <div className="mt-0.5 font-semibold">{item.value}</div>
            </div>
          ))}
        </div>
        {(canUseFullPagePrimary || isProfileBlocked) && (
          <div className="mt-3 flex flex-col gap-2 sm:flex-row">
            {canUseFullPagePrimary && (
              <button
                type="button"
                onClick={handleUseFullPagePrimary}
                className="inline-flex items-center justify-center gap-2 rounded-md bg-blue-700 px-3 py-2 text-xs font-semibold text-white transition-colors hover:bg-blue-800"
                data-testid="recommended-use-full-page-primary"
              >
                <FileText className="h-4 w-4" />
                {useFullPagePrimaryLabel}
              </button>
            )}
            {isProfileBlocked && (
              <button
                type="button"
                onClick={handleFocusResponsibleProfile}
                className="inline-flex items-center justify-center gap-2 rounded-md bg-blue-700 px-3 py-2 text-xs font-semibold text-white transition-colors hover:bg-blue-800"
                data-testid="recommended-fill-profile"
              >
                <Building2 className="h-4 w-4" />
                {tx("label.profileCompleteAction", "Fill profile now")}
              </button>
            )}
          </div>
        )}
      </section>
    );
  };

  const renderOutputOutcomeSection = () => {
    const OutcomeIcon =
      outputOutcomeTone === "ready" ? CheckCircle2 : AlertTriangle;

    return (
      <section
        className={`rounded-lg border p-3 ${
          READINESS_TONE_CLASSES[outputOutcomeTone] ||
          READINESS_TONE_CLASSES.neutral
        }`}
        data-testid="print-outcome-summary"
      >
        <div className="flex items-start gap-2">
          <OutcomeIcon className="mt-0.5 h-4 w-4 shrink-0" />
          <div className="min-w-0">
            <div
              className="text-sm font-semibold"
              data-testid="print-outcome-title"
            >
              {outputOutcomeTitle}
            </div>
            <p className="mt-1 text-sm leading-5 opacity-90">
              {outputOutcomeBody}
            </p>
            {isProfileBlocked && (
              <div
                className="mt-3 flex flex-col gap-2 sm:flex-row"
                data-testid="profile-blocked-actions"
              >
                <button
                  type="button"
                  onClick={handleFocusResponsibleProfile}
                  className="inline-flex items-center justify-center gap-2 rounded-md bg-blue-700 px-3 py-2 text-xs font-semibold text-white transition-colors hover:bg-blue-800"
                >
                  <Building2 className="h-4 w-4" />
                  {tx("label.profileCompleteAction", "Fill profile now")}
                </button>
                <button
                  type="button"
                  onClick={() => applyPrintTarget("bottle")}
                  className="inline-flex items-center justify-center gap-2 rounded-md bg-white/80 px-3 py-2 text-xs font-semibold ring-1 ring-current/15 transition-colors hover:bg-white"
                >
                  <Tag className="h-4 w-4" />
                  {tx(
                    "label.profileUseSupplementAction",
                    "Print a supplemental label instead",
                  )}
                </button>
              </div>
            )}
          </div>
        </div>
        <div className="mt-3 grid grid-cols-2 gap-2 text-xs sm:grid-cols-4">
          {[
            currentStockName,
            outputRoleSummary,
            pictogramSummary,
            statementSummary,
          ].map((item, index) => (
            <span
              key={`${item}-${index}`}
              className="rounded-md bg-white/70 px-2 py-1 font-medium ring-1 ring-current/10"
            >
              {item}
            </span>
          ))}
        </div>
      </section>
    );
  };

  const renderLabelPreviewSection = () => (
    <section
      className="rounded-lg border border-slate-200 bg-white p-3"
      data-testid="primary-label-preview-section"
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div className="text-sm font-medium text-slate-800">
            {tx("label.previewLabelTitle", "Label preview")}
          </div>
          <p className="mt-1 text-xs leading-5 text-slate-500">
            {tx(
              "label.previewInspectionHint",
              "Fit shows the whole label first; inspect mode enlarges details for checking before printing.",
            )}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {hasMultiplePreviewPages && (
            <div
              className="inline-flex items-center gap-1 rounded-md border border-slate-200 bg-slate-50 p-1"
              data-testid="preview-page-controls"
              aria-label={tx("label.previewPageControls", "Preview pages")}
            >
              <button
                type="button"
                onClick={() => updatePreviewPageIndex(activePreviewPageIndex - 1)}
                disabled={activePreviewPageIndex <= 0}
                className="flex h-7 w-7 items-center justify-center rounded bg-white text-slate-600 shadow-sm ring-1 ring-slate-200 transition-colors hover:text-blue-700 disabled:cursor-not-allowed disabled:opacity-40"
                aria-label={tx("label.previewPreviousPage", "Previous preview page")}
                data-testid="preview-page-prev"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <span className="min-w-16 px-2 text-center text-xs font-semibold text-slate-700">
                {previewPagePositionLabel}
              </span>
              <button
                type="button"
                onClick={() => updatePreviewPageIndex(activePreviewPageIndex + 1)}
                disabled={activePreviewPageIndex >= plannedPrintPageCount - 1}
                className="flex h-7 w-7 items-center justify-center rounded bg-white text-slate-600 shadow-sm ring-1 ring-slate-200 transition-colors hover:text-blue-700 disabled:cursor-not-allowed disabled:opacity-40"
                aria-label={tx("label.previewNextPage", "Next preview page")}
                data-testid="preview-page-next"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          )}
          <div
            className="inline-flex rounded-md border border-slate-200 bg-slate-50 p-1"
            data-testid="preview-zoom-controls"
          >
            {[
              {
                value: "fit",
                label: tx("label.previewZoomFit", "Fit"),
              },
              {
                value: "inspect",
                label: tx("label.previewZoomInspect", "Inspect"),
              },
            ].map((option) => (
              <button
                key={option.value}
                type="button"
                aria-pressed={previewZoomMode === option.value}
                onClick={() => setPreviewZoomMode(option.value)}
                className={`rounded px-2.5 py-1 text-xs font-medium transition-colors ${
                  previewZoomMode === option.value
                    ? "bg-white text-blue-700 shadow-sm ring-1 ring-blue-200"
                    : "text-slate-600 hover:bg-white"
                }`}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>
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
            data-preview-mode={previewZoomMode}
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

      <div
        className="mt-3 grid gap-2 text-xs sm:grid-cols-2"
        data-testid="preview-inspection-strip"
      >
        {[
          {
            label: tx("label.previewFitStatus", "View"),
            value: previewFitLabel,
          },
          {
            label: tx("label.previewPhysicalSize", "Label size"),
            value: previewPhysicalSizeLabel,
          },
          {
            label: tx("label.previewScale", "Preview scale"),
            value: previewScaleLabel,
          },
          {
            label: tx("label.previewPaper", "Sheet"),
            value: previewPageLabel,
          },
        ].map((item) => (
          <div
            key={item.label}
            className="rounded-md border border-slate-200 bg-slate-50 px-2.5 py-2"
          >
            <div className="font-semibold uppercase text-slate-500">
              {item.label}
            </div>
            <div className="mt-0.5 font-medium text-slate-800">
              {item.value}
            </div>
          </div>
        ))}
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
        className="flex max-h-[92vh] w-full max-w-7xl flex-col overflow-hidden rounded-lg bg-white shadow-2xl outline-none"
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
          className="grid min-h-0 flex-1 overflow-y-auto lg:grid-cols-[minmax(0,1fr)_minmax(27rem,34rem)] lg:overflow-hidden"
          data-testid="label-modal-scroll-body"
        >
            <div
              className="space-y-6 px-6 py-6 lg:min-h-0 lg:overflow-y-auto"
              data-testid="label-settings-column"
            >
              <section
                className="rounded-lg border border-slate-200 bg-white p-4"
                data-testid="primary-output-size-controls"
              >
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <h3 className="text-sm font-medium text-slate-800">
                      {tx(
                        "label.outputGoalSizeTitle",
                        "Choose label target",
                      )}
                    </h3>
                    <p className="mt-1 text-xs text-slate-500">
                      {tx(
                        "label.outputGoalSizeHint",
                        "Pick where this will be attached. The app chooses complete primary, supplemental, quick-ID, or QR output for that target.",
                      )}
                    </p>
                  </div>
                  <span className="rounded-full bg-slate-100 px-2 py-1 text-xs text-slate-600">
                    {currentStockName}
                  </span>
                </div>
                <div className="mt-4">
                  <div className="text-xs font-semibold text-slate-500">
                    {tx("label.outputGoalTitle", "Label target")}
                  </div>
                  <div
                    className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-2"
                    data-testid="output-goal-controls"
                  >
                    {PRINT_TARGET_OPTIONS.map((option) => {
                      const Icon = option.icon;
                      const selected = printTarget === option.value;
                      const optionLabel = t(option.labelKey);
                      const optionDescription = t(option.descKey);

                      return (
                        <button
                          key={option.value}
                          type="button"
                          onClick={() => applyPrintTarget(option.value)}
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
                <div className="mt-3">{renderRecommendedOutputSection()}</div>

                <div className="mt-4">
                  <details
                    open={shouldOpenOutputPlanDetails}
                    className={`rounded-md border p-3 ${
                      READINESS_TONE_CLASSES[outputPlanTone] ||
                      READINESS_TONE_CLASSES.neutral
                    }`}
                    data-testid="print-output-plan"
                  >
                    <summary className="flex cursor-pointer list-none items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-normal opacity-80">
                          <ClipboardList className="h-4 w-4 shrink-0" />
                          {tx(
                            "label.outputPlanDetailsTitle",
                            "Why this output was chosen",
                          )}
                        </div>
                        <div className="mt-1 text-sm font-semibold">
                          {outputPlanTitle}
                        </div>
                      </div>
                      <span className="shrink-0 rounded-full bg-white/70 px-2 py-1 text-xs font-medium ring-1 ring-current/10">
                        {outputRoleSummary}
                      </span>
                    </summary>
                    <div className="mt-3 flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="mt-1 text-xs leading-5 opacity-90">
                          {outputPlanBody}
                        </p>
                      </div>
                      {canUseFullPagePrimary && (
                        <button
                          type="button"
                          onClick={handleUseFullPagePrimary}
                          className="inline-flex shrink-0 items-center justify-center gap-2 rounded-md bg-blue-700 px-3 py-2 text-xs font-medium text-white transition-colors hover:bg-blue-800"
                          data-testid="use-full-page-primary-plan"
                        >
                          <FileText className="h-4 w-4" />
                          {useFullPagePrimaryLabel}
                        </button>
                      )}
                    </div>
                    {recoveryRoute && (
                      <div
                        className={`mt-3 rounded-md border px-3 py-2 ${
                          READINESS_TONE_CLASSES[recoveryRoute.tone] ||
                          READINESS_TONE_CLASSES.neutral
                        }`}
                        data-testid="print-recovery-route"
                        data-recovery-kind={recoveryRoute.kind}
                        data-current-stock={recoveryRoute.currentStock}
                        data-target-stock={recoveryRoute.targetStock}
                      >
                        <div className="text-xs font-semibold uppercase tracking-normal opacity-80">
                          {recoveryRoute.label}
                        </div>
                        <div className="mt-1 text-sm font-semibold">
                          {recoveryRoute.value}
                        </div>
                        <p className="mt-1 text-xs leading-5 opacity-90">
                          {recoveryRoute.description}
                        </p>
                      </div>
                    )}
                    <div
                      className="mt-3 grid gap-2 sm:grid-cols-3"
                      data-testid="print-decision-summary"
                    >
                      {decisionSummaryItems.map((item) => (
                        <div
                          key={item.key}
                          className={`rounded-md border px-3 py-2 ${
                            READINESS_TONE_CLASSES[item.tone] ||
                            READINESS_TONE_CLASSES.neutral
                          }`}
                          data-testid={`print-decision-${item.key}`}
                        >
                          <div className="text-xs font-medium opacity-80">
                            {item.label}
                          </div>
                          <div className="mt-1 text-sm font-semibold">
                            {item.value}
                          </div>
                        </div>
                      ))}
                    </div>
                    {renderBatchFitReport()}
                  </details>

                  {shouldShowPrintTrustNote && (
                    <AuthoritativeSourceNote
                      variant="print"
                      mode={printTrustMode}
                    />
                  )}

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
                      <span>
                        {tx("label.changeStockTitle", "Change target size")}
                      </span>
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
                            {tx(
                              "label.moreStockChoicesTitle",
                              "More common stock sizes",
                            )}
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
                    {labelConfig.nameDisplay === "both" &&
                      effectiveNameDisplay !== "both" && (
                        <p
                          className="rounded-md bg-emerald-50 px-3 py-2 text-xs leading-5 text-emerald-800"
                          data-testid="effective-name-display-hint"
                        >
                          {tx(
                            "label.effectiveNameDisplayHint",
                            "This smaller stock will print in {{effective}} first so the label stays readable. Use A4 or Letter primary labels for full bilingual text.",
                            { effective: effectiveNameDisplayLabel },
                          )}
                        </p>
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

              <details
                open={responsibleProfileMissing}
                className={`rounded-lg border p-4 ${
                  READINESS_TONE_CLASSES[responsibleProfileTone] ||
                  READINESS_TONE_CLASSES.neutral
                }`}
                data-testid="responsible-profile-controls"
              >
                <summary className="flex cursor-pointer list-none items-center justify-between gap-3">
                  <span className="flex min-w-0 items-center gap-2">
                    <Building2 className="h-4 w-4 shrink-0 text-current" />
                    <span className="min-w-0">
                      <span className="block text-sm font-medium">
                        {t("label.profileTitle")}
                      </span>
                      <span
                        className="mt-0.5 block text-xs opacity-80"
                        data-testid="responsible-profile-status"
                      >
                        {responsibleProfileStatus}
                      </span>
                    </span>
                  </span>
                  <span className="shrink-0 rounded-full bg-white/70 px-2 py-1 text-xs font-semibold ring-1 ring-current/10">
                    {responsibleProfilePresentCount}/
                    {RESPONSIBLE_PROFILE_FIELDS.length}
                  </span>
                </summary>

                <div className="mt-4 border-t border-current/10 pt-4">
                  <div className="mb-3 flex items-center justify-between gap-3">
                    <p className="text-xs leading-5 opacity-80">
                      {responsibleProfileRequired
                        ? tx(
                            "label.profileRequiredHint",
                            "Complete primary labels need this identity before printing.",
                          )
                        : tx(
                            "label.profileOptionalHint",
                            "Supplemental labels can print without this, but you can keep it saved for primary labels.",
                          )}
                    </p>
                    {(labProfile.organization ||
                      labProfile.phone ||
                      labProfile.address) &&
                      typeof onClearLabProfile === "function" && (
                        <button
                          type="button"
                          onClick={onClearLabProfile}
                          className="shrink-0 text-xs text-red-600 transition-colors hover:text-red-700"
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
                        icon: Building2,
                      },
                      {
                        key: "phone",
                        labelKey: "label.profilePhone",
                        placeholderKey: "label.profilePhonePlaceholder",
                        icon: Phone,
                      },
                      {
                        key: "address",
                        labelKey: "label.profileAddress",
                        placeholderKey: "label.profileAddressPlaceholder",
                        icon: MapPin,
                      },
                    ].map((field) => {
                      const FieldIcon = field.icon;

                      return (
                        <div
                          key={field.key}
                          className="grid gap-1 sm:grid-cols-[6rem_minmax(0,1fr)] sm:items-center"
                        >
                          <label className="flex items-center gap-1.5 text-xs opacity-80">
                            <FieldIcon className="h-3.5 w-3.5" />
                            {t(field.labelKey)}
                          </label>
                          <input
                            type="text"
                            data-testid={`responsible-profile-field-${field.key}`}
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
                      );
                    })}
                  </div>
                </div>
              </details>

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
                                "{{sourceLabels}} selected label(s) expands to {{labels}} continuation label(s), about {{pages}} page(s).",
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
                      const localizedNames = getLocalizedNames(
                        chem,
                        currentLocale,
                      );
                      const preparedExpiryBadge = chem.isPreparedSolution
                        ? getPreparedExpiryBadge(
                            chem.preparedSolution?.expiryDate,
                          )
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

              {renderAdvancedPrintOptions()}
            </div>

            <aside className="order-first border-t border-slate-200 bg-slate-50/70 lg:order-none lg:min-h-0 lg:overflow-y-auto lg:border-l lg:border-t-0">
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
                        {activeBatchPreviewItem
                          ? tx(
                              "label.previewFocusBatchRepresentative",
                              "Previewing a batch representative",
                            )
                          : previewChem
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
                        {activeBatchPreviewItem
                          ? tx(
                              "label.previewFocusBatchBody",
                              "The preview follows the selected representative item, while the sheet view shows the current selected batch print scope.",
                            )
                          : previewChem
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

                  <div
                    className="mt-3 grid gap-2 text-xs sm:grid-cols-3"
                    data-testid="preview-context-strip"
                  >
                    {[
                      {
                        key: "role",
                        label: tx("label.previewContextOutput", "Output"),
                        value: previewContextOutputSummary,
                      },
                      {
                        key: "icons",
                        label: tx("label.previewContextIcons", "GHS icons"),
                        value: pictogramSummary,
                      },
                      {
                        key: "stock",
                        label: tx("label.previewContextStock", "Stock"),
                        value: currentStockName,
                      },
                    ].map((item) => (
                      <div
                        key={item.key}
                        className="min-w-0 rounded-md border border-slate-200 bg-slate-50 px-2.5 py-2"
                        data-testid={`preview-context-${item.key}`}
                      >
                        <div className="font-semibold uppercase text-slate-500">
                          {item.label}
                        </div>
                        <div className="mt-0.5 min-w-0 break-words font-medium leading-5 text-slate-800">
                          {item.value}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="space-y-4 px-4 py-4">
                  {shouldShowPreviewOutcomeSummary &&
                    renderOutputOutcomeSection()}

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
                                {useFullPagePrimaryLabel}
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

                  <details
                    className="rounded-lg border border-slate-200 bg-white p-4"
                    data-testid="preview-diagnostics"
                  >
                    <summary className="flex cursor-pointer list-none items-center justify-between gap-3 text-sm font-medium text-slate-800">
                      <span className="flex items-center gap-2">
                        <ClipboardList className="h-4 w-4 text-blue-600" />
                        {tx("label.previewDiagnosticsTitle", "Output checks")}
                      </span>
                      <span className="rounded-full bg-slate-100 px-2 py-1 text-xs text-slate-600">
                        {outputChecklistBadge}
                      </span>
                    </summary>

                    <div className="mt-3 space-y-3">
                      <section
                        className="rounded-lg border border-slate-200 bg-white p-3"
                        data-testid="required-output-checklist"
                      >
                        <div className="flex items-center justify-between gap-3">
                          <div>
                            <div className="text-sm font-medium text-slate-800">
                              {outputChecklistTitle}
                            </div>
                            <div className="mt-1 text-xs leading-5 text-slate-500">
                              {outputChecklistHint}
                            </div>
                          </div>
                          <span className="rounded-full bg-slate-100 px-2 py-1 text-xs text-slate-600">
                            {outputChecklistBadge}
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
                              {item.description && (
                                <div className="mt-1 text-xs leading-4 opacity-80">
                                  {item.description}
                                </div>
                              )}
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
                          {tx(
                            "label.previewChecklistTitle",
                            "Preview checklist",
                          )}
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

                      <section className="rounded-lg bg-amber-50 p-4 text-sm text-amber-900">
                        <div className="flex items-start gap-2">
                          <Lightbulb className="mt-0.5 h-4 w-4 shrink-0 text-amber-400" />
                          <span>{t("label.previewHint")}</span>
                        </div>
                      </section>
                    </div>
                  </details>

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
                      {plannedPrintPageCount > 0 && (
                        <span>
                          {tx("label.previewPageCount", "{{count}} page(s)", {
                            count: plannedPrintPageCount,
                          })}
                        </span>
                      )}
                    </div>

                    <div className="mt-4 overflow-auto rounded-lg border border-slate-200 bg-white shadow-inner">
                      {sheetPreviewBundle ? (
                        <iframe
                          title={tx("label.previewSheetTitle", "Sheet layout")}
                          srcDoc={sheetPreviewBundle.html}
                          data-testid="label-sheet-preview"
                          className="w-full bg-white"
                          style={{ height: sheetPreviewHeight }}
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
              {useFullPagePrimaryLabel}
            </button>
          ) : (
            <button
              type="button"
              onClick={handlePrintAction}
              disabled={selectedForLabel.length === 0 || isPrintFitBlocked}
              className="flex flex-1 items-center justify-center gap-2 rounded-md bg-blue-700 px-6 py-3 font-medium text-white transition-colors hover:bg-blue-800 disabled:cursor-not-allowed disabled:opacity-50"
              data-testid="print-label-action"
            >
              <Printer className="h-4 w-4" />
              {printActionLabel}
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
