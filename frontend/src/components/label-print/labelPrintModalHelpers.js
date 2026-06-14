import { LABEL_STOCK_PRESETS, resolvePrintLayoutConfig } from "@/constants/labelStocks";
import {
  BATCH_PRINT_ITEM_CATEGORY,
  BATCH_PRINT_PURPOSE,
  BATCH_PRINT_REPRESENTATIVE,
} from "@/utils/printBatchPlanner";
import {
  formatPreparedDisplayName,
  getPreparedExpiryStatus,
} from "@/utils/preparedSolution";
import {
  getLocalizedNames,
  getLocalizedStatementText,
  resolveEnglishName,
  resolveTrustedChineseName,
} from "@/utils/ghsText";

export const READINESS_TONE_CLASSES = {
  ready: "border-emerald-200 bg-emerald-50 text-emerald-800",
  neutral: "border-slate-200 bg-white text-slate-700",
  caution: "border-amber-200 bg-amber-50 text-amber-900",
  danger: "border-red-200 bg-red-50 text-red-900",
};

export const BATCH_CATEGORY_TONE = {
  [BATCH_PRINT_ITEM_CATEGORY.READY]: "ready",
  [BATCH_PRINT_ITEM_CATEGORY.READY_TIGHT]: "ready",
  [BATCH_PRINT_ITEM_CATEGORY.REDUCED_PURPOSE]: "caution",
  [BATCH_PRINT_ITEM_CATEGORY.SAME_STOCK_CONTINUATION]: "caution",
  [BATCH_PRINT_ITEM_CATEGORY.EXCLUDED_DATA]: "danger",
  [BATCH_PRINT_ITEM_CATEGORY.EXCLUDED_FIT]: "danger",
};

export const ALL_STOCK_PRESETS = LABEL_STOCK_PRESETS.map((preset) => ({
  ...preset,
  perPage: preset.columns * preset.rows,
  widthMm: preset.labelWidthMm,
  heightMm: preset.labelHeightMm,
}));

export const STOCK_IDS_BY_PRINT_TARGET = {
  complete: ["a4-primary", "letter-primary"],
  qrSupplement: ["brother-62mm-continuous"],
  quickId: ["small-strip"],
};

const CORE_STOCK_IDS_BY_PURPOSE = {
  complete: ["a4-primary", "letter-primary"],
  shipping: ["a4-primary", "letter-primary", "medium-bottle", "large-primary"],
  qrSupplement: ["brother-62mm-continuous"],
  quickId: ["small-strip"],
};

export const RESPONSIBLE_PROFILE_FIELDS = ["organization", "phone", "address"];

export const getPreparedExpiryBadge = (expiryDate) => {
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

export function buildDisplayNames(chem, nameDisplay, languageLike = "en") {
  if (!chem) return [];

  const preparedName = chem.isPreparedSolution
    ? formatPreparedDisplayName(chem)
    : null;
  const localizedNames = getLocalizedNames(chem, languageLike);
  const englishName =
    preparedName ||
    resolveEnglishName(chem) ||
    localizedNames.primary ||
    chem.cas_number;
  const chineseName =
    resolveTrustedChineseName(chem) || localizedNames.secondary || "";

  if (nameDisplay === "en") return [englishName].filter(Boolean);
  if (nameDisplay === "zh") return [chineseName || englishName].filter(Boolean);

  return [englishName, chineseName].filter(Boolean);
}

export function hasMultipleGhsClassificationOptions(chem = {}) {
  return Boolean(
    chem?.has_multiple_classifications || chem?.other_classifications?.length > 0,
  );
}

export function hasManualGhsClassificationChoice(chem = {}, customGHSSettings = {}) {
  const customSetting = chem?.cas_number
    ? customGHSSettings?.[chem.cas_number]
    : null;

  return Boolean(
    customSetting?.selectedIndex != null ||
      chem?.selected_classification_index != null ||
      chem?.customNote,
  );
}

export function buildHazardPreview(chem, template, tx, contentLocale) {
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

export function getLabelPurposeForConfig(labelConfig = {}) {
  if (labelConfig.labelPurpose) return labelConfig.labelPurpose;
  if (labelConfig.template === "qrcode") return "qrSupplement";
  if (labelConfig.template === "icon") return "quickId";
  return "shipping";
}

export function getPrintTargetForConfig(labelPurpose, layoutProfile = {}) {
  if (labelPurpose === "qrSupplement") return "qrSupplement";
  if (labelPurpose === "quickId") return "quickId";
  if (layoutProfile.template === "qrcode") return "qrSupplement";
  if (layoutProfile.template === "icon") return "quickId";
  return "complete";
}

export function getQrTargetRoleLabel(linkType, tx) {
  if (linkType === "lookup") return tx("label.qrTargetRoleLookup", "Lookup page");
  if (linkType === "sds") return tx("label.qrTargetRoleSds", "SDS");
  if (linkType === "regulatory") {
    return tx("label.qrTargetRoleRegulatory", "Regulatory");
  }
  if (linkType === "occupational") {
    return tx("label.qrTargetRoleOccupational", "Occupational");
  }
  return tx("label.qrTargetRoleReference", "Reference");
}

export function getQrTargetSourceLabel(source, tx) {
  const normalized = typeof source === "string" ? source.toLowerCase() : "";
  if (normalized === "pubchem") {
    return tx("label.qrTargetSourcePubChem", "PubChem");
  }
  if (normalized === "echa") return tx("label.qrTargetSourceEcha", "ECHA");
  if (normalized === "niosh") return tx("label.qrTargetSourceNiosh", "NIOSH");
  if (normalized === "manual") return tx("label.qrTargetSourceManual", "Manual");
  if (normalized === "site") {
    return tx("label.qrTargetSourceSite", "GHS Label Quick Search");
  }
  return tx("label.qrTargetSourceReference", "Reference");
}

export function resolveResponsibleProfile(customLabelFields = {}, labProfile = {}) {
  return {
    organization:
      (labProfile.organization || "").trim() ||
      (customLabelFields.labName || "").trim(),
    phone: (labProfile.phone || "").trim(),
    address: (labProfile.address || "").trim(),
  };
}

export function buildPreviewRisks({
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
        "Identification small labels are for bench-side identification; keep the complete hazard label or SDS nearby.",
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

export function getDensityLabel(labelConfig, layoutProfile, previewChem, tx) {
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

export const getBatchCategoryLabel = (category, tx) => {
  switch (category) {
    case BATCH_PRINT_ITEM_CATEGORY.READY:
      return tx("label.batchCategoryReady", "Ready");
    case BATCH_PRINT_ITEM_CATEGORY.READY_TIGHT:
      return tx("label.batchCategoryReadyTight", "Ready, tightened");
    case BATCH_PRINT_ITEM_CATEGORY.REDUCED_PURPOSE:
      return tx("label.batchCategoryReducedPurpose", "Needs compact label");
    case BATCH_PRINT_ITEM_CATEGORY.SAME_STOCK_CONTINUATION:
      return tx("label.batchCategoryContinuation", "Needs extra label");
    case BATCH_PRINT_ITEM_CATEGORY.EXCLUDED_DATA:
      return tx("label.batchCategoryExcludedData", "Excluded: data");
    case BATCH_PRINT_ITEM_CATEGORY.EXCLUDED_FIT:
      return tx("label.batchCategoryExcludedFit", "Excluded: fit");
    default:
      return category || "";
  }
};

export const getBatchPurposeLabel = (purpose, tx) => {
  switch (purpose) {
    case BATCH_PRINT_PURPOSE.QUICK_ID:
      return tx("label.batchPurposeQuickId", "Identification");
    case BATCH_PRINT_PURPOSE.SUPPLEMENTAL:
      return tx("label.batchPurposeSupplemental", "Supplemental");
    case BATCH_PRINT_PURPOSE.COMPLETE:
      return tx("label.batchPurposeComplete", "Complete");
    default:
      return purpose || "";
  }
};

export const getBatchReasonLabel = (reason, tx) => {
  switch (reason?.type) {
    case "upstream-error":
      return tx("label.batchReasonUpstream", "Source temporarily unavailable");
    case "missing-hazard-data":
      return tx("label.batchReasonMissingHazards", "No printable GHS hazard data");
    case "text-only-ghs-needs-hazard-text":
      return tx(
        "label.batchReasonTextOnlyQuickId",
        "GHS text exists but no pictogram is available for identification labels",
      );
    case "responsible-profile-missing":
      return tx("label.batchReasonProfile", "Responsible profile is incomplete");
    case "complete-content-needs-continuation":
      return tx("label.batchReasonContinuation", "Full H/P text needs extra pages");
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

export const getBatchRepresentativeLabel = (representative, tx) => {
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

export const buildBatchReviewCsv = (items, tx) => {
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

export const getPreviewFrameHeight = (metrics, fallbackHeight) => {
  const numericHeight = Number(metrics?.frameHeightPx);
  if (!Number.isFinite(numericHeight) || numericHeight <= 0) {
    return fallbackHeight;
  }

  const maxHeight = metrics?.previewZoom === "inspect" ? 560 : 420;
  return `${Math.ceil(Math.min(maxHeight, Math.max(220, numericHeight)))}px`;
};

export const formatMmValue = (value) => {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return "0";
  return Number.isInteger(numeric) ? String(numeric) : numeric.toFixed(1);
};

export function resolveLayoutProfile(labelConfig) {
  return resolvePrintLayoutConfig(labelConfig);
}

export function getOptionLabel(options, value, t, fallback) {
  const option = options.find((item) => item.value === value);
  return option ? t(option.labelKey) : fallback;
}

export function getOutputTone(summary) {
  if (!summary || summary.expected === 0) return "neutral";
  return summary.present >= summary.expected ? "ready" : "caution";
}

export function splitStockChoices(stockChoices, selectedStockId, purpose) {
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

export function interpolateText(value, options = {}) {
  return String(value).replace(/\{\{(\w+)\}\}/g, (match, key) =>
    Object.prototype.hasOwnProperty.call(options, key) ? options[key] : match,
  );
}
