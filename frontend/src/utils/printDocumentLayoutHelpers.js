import { resolvePrintLayoutConfig } from "@/constants/labelStocks";
import i18n from "@/i18n";
import qrcode from "qrcode-generator";
import { buildPrintLabelContent } from "@/utils/printContentModel";
import {
  PRINT_HAZARD_TEXT_MODE,
  isCompletePrimaryLayout as isPolicyCompletePrimaryLayout,
  isFullPagePrimaryLayout as isPolicyFullPagePrimaryLayout,
  isQrSupplementLayout as isPolicyQrSupplementLayout,
  isQuickIdLayout as isPolicyQuickIdLayout,
  resolvePrintContentPolicy,
} from "@/utils/printContentPolicy";
import {
  getContinuationStatementLineUnits as getContinuationStatementLineUnitsWithTextResolver,
  getContinuationStatementWeight as getContinuationStatementWeightWithTextResolver,
} from "@/utils/printContinuationPagination";
import {
  getLocalizedTextForModel,
  normalizeTemplate,
  resolvePrintableChineseName,
} from "@/utils/printRenderHelpers";

const PUBLIC_LOOKUP_ORIGIN = "https://ghs-frontend.zeabur.app";

/**
 * HTML escape helper for safe interpolation into the print iframe.
 *
 * The print document is written via `iframeDoc.write(...)` which bypasses
 * React's automatic escaping. Any user-controlled value (custom label
 * fields from localStorage, CAS inputs, upstream PubChem text, hazard
 * statements, etc.) must be escaped before being inlined into HTML.
 *
 * Escapes for both text-node and quoted-attribute contexts.
 */
export function escapeHtml(value) {
  if (value == null) return "";
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export function getQRCodeUrl(text, size = 100) {
  const qr = qrcode(0, "M");
  qr.addData(String(text || ""));
  qr.make();
  const moduleCount = qr.getModuleCount();
  const cellSize = Math.max(2, Math.ceil(size / Math.max(moduleCount, 1)));
  return qr.createDataURL(cellSize, 0);
}

const getCurrentLookupOrigin = () => {
  if (
    typeof window !== "undefined" &&
    window.location?.origin &&
    window.location.origin !== "null"
  ) {
    return window.location.origin;
  }
  return PUBLIC_LOOKUP_ORIGIN;
};

export const getChemicalLookupUrl = (
  casNumber,
  origin = getCurrentLookupOrigin(),
) => {
  let url;
  try {
    url = new URL("/", origin || PUBLIC_LOOKUP_ORIGIN);
  } catch {
    url = new URL("/", PUBLIC_LOOKUP_ORIGIN);
  }

  const cas = String(casNumber || "").trim();
  if (cas) url.searchParams.set("cas", cas);
  return url.toString();
};

export function getHazardFontTier(hazardCount, labelSize) {
  const tiers = [
    {
      maxCount: 5,
      small: { fontSize: "7px", lineHeight: "1.2", marginBottom: "0.8mm" },
      medium: { fontSize: "8px", lineHeight: "1.2", marginBottom: "0.8mm" },
      large: { fontSize: "10px", lineHeight: "1.2", marginBottom: "0.8mm" },
    },
    {
      maxCount: 8,
      small: { fontSize: "6px", lineHeight: "1.15", marginBottom: "0.5mm" },
      medium: { fontSize: "7px", lineHeight: "1.15", marginBottom: "0.5mm" },
      large: { fontSize: "9px", lineHeight: "1.15", marginBottom: "0.6mm" },
    },
    {
      maxCount: 12,
      small: { fontSize: "5.5px", lineHeight: "1.1", marginBottom: "0.3mm" },
      medium: { fontSize: "6px", lineHeight: "1.1", marginBottom: "0.3mm" },
      large: { fontSize: "7.5px", lineHeight: "1.1", marginBottom: "0.4mm" },
    },
    {
      maxCount: Infinity,
      small: { fontSize: "5px", lineHeight: "1.05", marginBottom: "0.2mm" },
      medium: { fontSize: "5.5px", lineHeight: "1.05", marginBottom: "0.2mm" },
      large: { fontSize: "6.5px", lineHeight: "1.05", marginBottom: "0.3mm" },
    },
  ];
  const size = labelSize || "medium";
  for (const tier of tiers) {
    if (hazardCount <= tier.maxCount) return tier[size] || tier.medium;
  }
  return tiers[tiers.length - 1][size] || tiers[tiers.length - 1].medium;
}

const getStatementTextLoad = (statements = [], model) =>
  statements.reduce(
    (total, statement) =>
      total +
      String(statement?.code || "").length * 2 +
      getLocalizedTextForModel(statement, model).length,
    0,
  );

export const getContinuationStatementWeight = (statement, model) =>
  getContinuationStatementWeightWithTextResolver(
    statement,
    model,
    getLocalizedTextForModel,
  );

export const getContinuationStatementLineUnits = (statement, model) =>
  getContinuationStatementLineUnitsWithTextResolver(
    statement,
    model,
    getLocalizedTextForModel,
  );

const parseCssNumber = (value, fallback) => {
  const parsed = Number.parseFloat(String(value ?? ""));
  return Number.isFinite(parsed) ? parsed : fallback;
};

const formatCssPx = (value) => `${Math.round(value * 10) / 10}px`;

export const getFullPageStatementTier = (
  hazards = [],
  precautions = [],
  model,
) => {
  const statementCount = hazards.length + precautions.length;
  const textLoad =
    getStatementTextLoad(hazards, model) +
    getStatementTextLoad(precautions, model);
  const typography = model?.layout?.typography || {};
  const baseFontPx = parseCssNumber(typography.complianceStatementSize, 5.6);
  const baseLineHeight = parseCssNumber(typography.complianceLineHeight, 1.03);

  const buildTier = ({
    fontScale,
    minFontPx,
    maxFontPx,
    lineHeight,
    marginBottom,
    codeGap,
    hazardCodeMin,
    hazardCodeMax,
    precautionCodeMin,
    precautionCodeMax,
  }) => ({
    fontSize: formatCssPx(
      Math.max(minFontPx, Math.min(maxFontPx, baseFontPx * fontScale)),
    ),
    lineHeight: String(Math.min(lineHeight, baseLineHeight)),
    marginBottom,
    codeGap,
    hazardCodeMin,
    hazardCodeMax,
    precautionCodeMin,
    precautionCodeMax,
  });

  if (statementCount >= 28 || textLoad > 3000) {
    return buildTier({
      fontScale: 0.95,
      minFontPx: 4.6,
      maxFontPx: 5.4,
      lineHeight: 1.01,
      marginBottom: "0.38mm",
      codeGap: "0.5mm",
      hazardCodeMin: "6.8mm",
      hazardCodeMax: "9mm",
      precautionCodeMin: "8.6mm",
      precautionCodeMax: "11.2mm",
    });
  }

  if (statementCount >= 22 || textLoad > 2400) {
    return buildTier({
      fontScale: 1,
      minFontPx: 4.8,
      maxFontPx: 5.8,
      lineHeight: 1.02,
      marginBottom: "0.42mm",
      codeGap: "0.55mm",
      hazardCodeMin: "7.2mm",
      hazardCodeMax: "9.6mm",
      precautionCodeMin: "9.2mm",
      precautionCodeMax: "12mm",
    });
  }

  if (statementCount >= 16 || textLoad > 1800) {
    return buildTier({
      fontScale: 1.08,
      minFontPx: 5,
      maxFontPx: 6.2,
      lineHeight: 1.025,
      marginBottom: "0.48mm",
      codeGap: "0.62mm",
      hazardCodeMin: "7.8mm",
      hazardCodeMax: "10.5mm",
      precautionCodeMin: "10mm",
      precautionCodeMax: "13.2mm",
    });
  }

  return buildTier({
    fontScale: 1.18,
    minFontPx: 5.2,
    maxFontPx: 6.8,
    lineHeight: 1.03,
    marginBottom: "0.55mm",
    codeGap: "0.7mm",
    hazardCodeMin: "8.8mm",
    hazardCodeMax: "11.5mm",
    precautionCodeMin: "11.5mm",
    precautionCodeMax: "15mm",
  });
};

export const isFullPagePrimaryLayout = (layout = {}) =>
  isPolicyFullPagePrimaryLayout(layout);

const isCompletePrimaryTemplate = (layout = {}) =>
  isPolicyCompletePrimaryLayout(layout);

const isQrSupplementLayout = (layout = {}) =>
  isPolicyQrSupplementLayout(layout);

const isQuickIdLayout = (layout = {}) => isPolicyQuickIdLayout(layout);

export const PRINT_QA_LABEL_KIND_HELPERS = {
  isCompletePrimaryTemplate,
  isQrSupplementLayout,
  isQuickIdLayout,
};

export const getStandardHazardRenderMode = (layout = {}) => {
  const policy = resolvePrintContentPolicy(layout, { locale: i18n.language });
  return policy.hazardTextMode === PRINT_HAZARD_TEXT_MODE.H_CODES_ONLY
    ? "code"
    : "summary";
};

export const getStandardHazardSummaryLimit = (layout = {}) => {
  if (layout.formFactor === "roomy") return 74;
  if (layout.size === "large") return 64;
  if (layout.size === "medium") return 38;
  return 22;
};

export const getFullPagePrimaryClass = (layout = {}) => {
  if (!isFullPagePrimaryLayout(layout)) return "";
  if (
    layout.stockId === "letter-primary" ||
    layout.stockPreset === "letter-primary"
  ) {
    return " label-full-page-primary label-letter-primary";
  }
  return " label-full-page-primary label-a4-primary";
};

const toClassToken = (value, fallback = "unknown") =>
  String(value || fallback)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "") || fallback;

export const getPhysicalLabelClasses = (layout = {}) => {
  const policy = resolvePrintContentPolicy(layout, { locale: i18n.language });
  return [
    `label-stock-${toClassToken(layout.stockId || layout.stockPreset)}`,
    `label-size-${toClassToken(layout.size)}`,
    `label-form-${toClassToken(layout.formFactor)}`,
    `label-fit-level-${Number(layout.autoFitLevel || 0)}`,
    `label-content-${toClassToken(policy.role)}`,
    `label-hazard-mode-${toClassToken(policy.hazardTextMode)}`,
    `label-precaution-mode-${toClassToken(policy.precautionTextMode)}`,
    isCompletePrimaryTemplate(layout)
      ? "label-kind-complete-primary"
      : isQrSupplementLayout(layout)
        ? "label-kind-qr-supplement"
        : isQuickIdLayout(layout)
          ? "label-kind-quick-id"
          : "label-kind-supplemental",
    layout.outputRole
      ? `label-output-${toClassToken(layout.outputRole)}`
      : "",
  ]
    .filter(Boolean)
    .join(" ");
};

export const getPictogramDensityClasses = (pictograms = []) => {
  const count = Math.max(0, pictograms.length);
  const density =
    count >= 7 ? "ultra" : count >= 5 ? "dense" : count >= 3 ? "standard" : "sparse";

  return `label-pictogram-count-${count} label-pictogram-density-${density}`;
};

export const resolveLabProfile = (customLabelFields, labProfile) => ({
  organization:
    (labProfile?.organization || "").trim() ||
    (customLabelFields?.labName || "").trim(),
  phone: (labProfile?.phone || "").trim(),
  address: (labProfile?.address || "").trim(),
});

export const expandLabelsByQuantity = (selectedForLabel, labelQuantities) => {
  const expanded = [];
  selectedForLabel.forEach((chemical) => {
    const quantity = labelQuantities?.[chemical.cas_number] || 1;
    for (let copy = 0; copy < quantity; copy += 1) {
      expanded.push(chemical);
    }
  });
  return expanded;
};

export const clampAutoFitLevel = (value) =>
  Math.max(0, Math.min(4, Math.trunc(Number(value) || 0)));

export const MAX_CONTINUATION_TIGHTNESS_LEVEL = 8;

export const clampContinuationTightnessLevel = (value) =>
  Math.max(
    0,
    Math.min(
      MAX_CONTINUATION_TIGHTNESS_LEVEL,
      Math.trunc(Number(value) || 0),
    ),
  );

export const withInternalPrintLayoutFlags = (layout, labelConfig = {}) => ({
  ...layout,
  continuationTightnessLevel: clampContinuationTightnessLevel(
    labelConfig.__continuationTightnessLevel ??
      labelConfig.continuationTightnessLevel,
  ),
});

const getNameLoadForLayout = (chemical = {}, layout = {}) => {
  const names = [];
  if (layout.nameDisplay === "en" || layout.nameDisplay === "both") {
    names.push(chemical.name_en || chemical.name || "");
  }
  if (layout.nameDisplay === "zh") {
    names.push(
      resolvePrintableChineseName(chemical) ||
        chemical.name_en ||
        chemical.name ||
        "",
    );
  } else if (layout.nameDisplay === "both") {
    names.push(resolvePrintableChineseName(chemical));
  }
  return Math.max(0, ...names.map((name) => String(name || "").trim().length));
};

const getCustomIdentityLoad = (customLabelFields = {}) =>
  [
    customLabelFields.batchNumber,
    customLabelFields.date,
  ].reduce((total, value) => total + String(value || "").trim().length, 0);

const getStatementLoadForAutoFit = (statements = [], model) =>
  statements.reduce(
    (total, statement) =>
      total +
      String(statement?.code || "").length * 2 +
      getLocalizedTextForModel(statement, model).length,
    0,
  );

export const resolveAutoFitLevelForModel = ({
  layout,
  expandedLabels,
  customGHSSettings,
  customLabelFields,
  resolvedLabProfile,
  t,
  locale,
}) => {
  let level = clampAutoFitLevel(layout.autoFitLevel);
  const area = (layout.widthMm || 0) * (layout.heightMm || 0);
  const compactPhysical =
    layout.formFactor === "strip" ||
    layout.formFactor === "compact" ||
    layout.size === "small" ||
    area < 3600;

  const modelForText = {
    t,
    locale,
    layout,
    customGHSSettings,
    customLabelFields,
    resolvedLabProfile,
  };
  const customIdentityLoad = getCustomIdentityLoad(customLabelFields);

  expandedLabels.forEach((chemical) => {
    const content = buildPrintLabelContent(chemical, {
      customGHSSettings,
      resolvedLabProfile,
      layout,
      locale,
    });
    const nameLoad = getNameLoadForLayout(content.effectiveChemical, layout);
    const hazardLoad = getStatementLoadForAutoFit(
      content.hazardStatements || [],
      modelForText,
    );
    const pictogramCount = content.counts?.pictograms || 0;
    const statementCount = content.counts?.hazardStatements || 0;

    if (compactPhysical) {
      if (
        layout.nameDisplay === "both" ||
        customIdentityLoad > 0 ||
        nameLoad > 24 ||
        pictogramCount >= 3
      ) {
        level = Math.max(level, 1);
      }
      if (nameLoad > 40 || customIdentityLoad > 22 || pictogramCount >= 4) {
        level = Math.max(level, 2);
      }
      return;
    }

    if (layout.template === "standard") {
      const budget = layout.templateBudgets?.standard?.primaryHazards || 1;
      if (
        layout.nameDisplay === "both" ||
        customIdentityLoad > 18 ||
        statementCount > budget ||
        hazardLoad > area / 6
      ) {
        level = Math.max(level, 1);
      }
      if (nameLoad > 52 || customIdentityLoad > 36 || hazardLoad > area / 3.8) {
        level = Math.max(level, 2);
      }
    }
  });

  return clampAutoFitLevel(level);
};

const getPrintLayoutOverride = (chemical) => {
  if (chemical?.__printLayoutOverride) return chemical.__printLayoutOverride;
  if (chemical?.__printContinuation && chemical.sourceChemical) {
    return chemical.sourceChemical.__printLayoutOverride || null;
  }
  return null;
};

export const resolveRenderModelForChemical = (chemical, model) => {
  const override = getPrintLayoutOverride(chemical);
  if (!override) return model;

  const inheritedAutoFitLevel = clampAutoFitLevel(model.layout.autoFitLevel);
  const overrideAutoFitLevel = clampAutoFitLevel(override.autoFitLevel);
  const layout = resolvePrintLayoutConfig({
    ...model.layout,
    ...override,
    template: normalizeTemplate(override.template || model.layout.template),
    autoFitLevel: Math.max(inheritedAutoFitLevel, overrideAutoFitLevel),
  });
  const continuationTightnessLevel = clampContinuationTightnessLevel(
    override.__continuationTightnessLevel ??
      override.continuationTightnessLevel ??
      model.layout.continuationTightnessLevel,
  );
  const layoutWithFlags = withInternalPrintLayoutFlags(layout, {
    __continuationTightnessLevel: continuationTightnessLevel,
  });

  return {
    ...model,
    layout: layoutWithFlags,
    contentPolicy: resolvePrintContentPolicy(layoutWithFlags, {
      locale: model.locale,
    }),
  };
};

const getBatchPrintMeta = (chemical) =>
  chemical?.__batchPrintItem ||
  chemical?.sourceChemical?.__batchPrintItem ||
  null;

export const renderLabelDataAttributes = (chemical, model) => {
  const meta = getBatchPrintMeta(chemical);
  const attrs = [
    ["data-print-template", model.layout.template],
    ["data-print-purpose", model.layout.labelPurpose],
    ["data-print-stock", model.layout.stockId || model.layout.stockPreset],
  ];

  if (meta) {
    attrs.push(
      ["data-batch-category", meta.category],
      ["data-batch-preferred-purpose", meta.preferredPurpose],
      ["data-batch-effective-purpose", meta.effectivePurpose],
      ["data-batch-reason", meta.reasonType],
    );
  }

  return attrs
    .filter(([, value]) => value != null && value !== "")
    .map(([name, value]) => `${name}="${escapeHtml(value)}"`)
    .join(" ");
};
