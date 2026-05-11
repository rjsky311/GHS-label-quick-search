import { GHS_IMAGES } from "@/constants/ghs";
import { resolvePrintLayoutConfig } from "@/constants/labelStocks";
import i18n from "@/i18n";
import qrcode from "qrcode-generator";
import { recordObservabilityEvent } from "@/utils/observability";
import {
  buildPrintLabelContent,
} from "@/utils/printContentModel";
import { inspectPrintContentFit } from "@/utils/printFitEngine";
import { getPreferredQrTarget } from "@/utils/sdsLinks";
import {
  resolveEffectiveLabelContentLocale,
  resolveEffectiveLabelNameDisplay,
  getLocalizedSignalWord,
  getLocalizedStatementText,
  shouldRenderBilingualLabelText,
} from "@/utils/ghsText";

const ALLOWED_TEMPLATES = new Set(["icon", "standard", "full", "qrcode"]);
const PRINT_QA_HANDOFF_PARAM = "qaPrintHandoff";
const REQUIRED_PRINT_IMAGE_TIMEOUT_MS = 10000;

export { resolveEffectiveChemicalForPrint } from "@/utils/printContentModel";
export { inspectPrintContentFit } from "@/utils/printFitEngine";

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

const getContinuationStatementWeight = (statement, model) =>
  String(statement?.code || "").length * 2 +
  getLocalizedTextForModel(statement, model).length;

const getFullPageStatementTier = (hazards = [], precautions = [], model) => {
  const statementCount = hazards.length + precautions.length;
  const textLoad =
    getStatementTextLoad(hazards, model) +
    getStatementTextLoad(precautions, model);

  if (statementCount >= 28 || textLoad > 3000) {
    return {
      fontSize: "5.1px",
      lineHeight: "1.02",
      marginBottom: "0.14mm",
      codeGap: "0.45mm",
      hazardCodeMin: "8.5mm",
      hazardCodeMax: "11mm",
      precautionCodeMin: "12mm",
      precautionCodeMax: "16mm",
    };
  }

  if (statementCount >= 22 || textLoad > 2400) {
    return {
      fontSize: "5.5px",
      lineHeight: "1.03",
      marginBottom: "0.18mm",
      codeGap: "0.55mm",
      hazardCodeMin: "9.5mm",
      hazardCodeMax: "12mm",
      precautionCodeMin: "13mm",
      precautionCodeMax: "17mm",
    };
  }

  if (statementCount >= 16 || textLoad > 1800) {
    return {
      fontSize: "5.9px",
      lineHeight: "1.04",
      marginBottom: "0.24mm",
      codeGap: "0.65mm",
      hazardCodeMin: "10mm",
      hazardCodeMax: "13mm",
      precautionCodeMin: "14mm",
      precautionCodeMax: "18.5mm",
    };
  }

  return getHazardFontTier(statementCount, model.layout.size);
};

const chunk = (items, size) => {
  const chunks = [];
  for (let index = 0; index < items.length; index += size) {
    chunks.push(items.slice(index, index + size));
  }
  return chunks;
};

const clampIndex = (value, maxIndex) => {
  const numeric = Number(value);
  if (!Number.isFinite(numeric) || maxIndex <= 0) return 0;
  return Math.max(0, Math.min(Math.trunc(numeric), maxIndex));
};

const normalizeTemplate = (template) =>
  ALLOWED_TEMPLATES.has(template) ? template : "standard";

const resolveModelNameDisplay = (model) =>
  resolveEffectiveLabelNameDisplay(model.layout, i18n.language);

const resolveModelContentLocale = (model) =>
  resolveEffectiveLabelContentLocale(model.layout, i18n.language);

const joinLocalizedParts = (...parts) => {
  const uniqueParts = parts
    .map((part) => String(part || "").trim())
    .filter(Boolean)
    .filter((part, index, allParts) => allParts.indexOf(part) === index);
  return uniqueParts.join(" / ");
};

const getIdentityDensityClass = (chemical, model) => {
  const nameDisplay = resolveModelNameDisplay(model);
  const names = [];
  if (nameDisplay === "en" || nameDisplay === "both") {
    names.push(chemical?.name_en || "");
  }
  if (nameDisplay === "zh") {
    names.push(chemical?.name_zh || chemical?.name_en || "");
  } else if (nameDisplay === "both") {
    names.push(chemical?.name_zh || "");
  }

  const longestName = Math.max(
    0,
    ...names.map((name) => String(name || "").trim().length),
  );
  const casLoad = Math.max(0, String(chemical?.cas_number || "").length - 10);
  const bilingualLoad = nameDisplay === "both" ? 8 : 0;
  const densityScore = longestName + casLoad * 1.5 + bilingualLoad;

  if (densityScore >= 48) return " identity-density-high";
  if (densityScore >= 32) return " identity-density-medium";
  return "";
};

const getLocalizedTextForModel = (statement, model) => {
  if (shouldRenderBilingualLabelText(model.layout, i18n.language)) {
    return joinLocalizedParts(
      getLocalizedStatementText(statement, "zh"),
      getLocalizedStatementText(statement, "en"),
    );
  }
  return getLocalizedStatementText(statement, resolveModelContentLocale(model));
};

const getSignalWordForModel = (classification, model) => {
  if (shouldRenderBilingualLabelText(model.layout, i18n.language)) {
    return joinLocalizedParts(
      getLocalizedSignalWord(classification, "zh"),
      getLocalizedSignalWord(classification, "en"),
    );
  }
  return getLocalizedSignalWord(classification, resolveModelContentLocale(model));
};

const getStatementCodes = (statement) =>
  String(statement?.code || "")
    .split("+")
    .map((code) => code.trim().toUpperCase())
    .filter(Boolean);

const scoreStatementCodes = (statement, scoreCode) => {
  const codes = getStatementCodes(statement);
  if (codes.length === 0) return 0;
  return Math.max(...codes.map(scoreCode));
};

const scoreHazardCode = (code) => {
  if (/^H3(00|01|04|10|11|14|18|30|31)\b/.test(code)) return 100;
  if (/^H2(00|01|02|03|20|21|22|23|24|25|26|27|28)\b/.test(code)) {
    return 90;
  }
  if (/^H2(80|90)\b/.test(code)) return 80;
  if (/^H3(15|17|19|35|36|37)\b/.test(code)) return 50;
  return 10;
};

const scorePrecautionCode = (code) => {
  if (/^P3(01|02|03|04|05|06|08|10|11|12|13|14|15|20|21|30|31)\b/.test(code)) {
    return 100;
  }
  if (/^P2(60|61|64|71|80|84)\b/.test(code)) return 90;
  if (/^P3/.test(code)) return 80;
  if (/^P4/.test(code)) return 50;
  if (/^P5/.test(code)) return 30;
  return 10;
};

const prioritizeHazardStatements = (statements) =>
  [...statements]
    .map((statement, index) => ({
      statement,
      index,
      score: scoreStatementCodes(statement, scoreHazardCode),
    }))
    .sort((a, b) => b.score - a.score || a.index - b.index)
    .map(({ statement }) => statement);

const prioritizePrecautionaryStatements = (statements) =>
  [...statements]
    .map((statement, index) => ({
      statement,
      index,
      score: scoreStatementCodes(statement, scorePrecautionCode),
    }))
    .sort((a, b) => b.score - a.score || a.index - b.index)
    .map(({ statement }) => statement);

const truncateText = (value, maxLength) => {
  const normalized = String(value || "").trim();
  if (!normalized || normalized.length <= maxLength) return normalized;
  return `${normalized.slice(0, Math.max(0, maxLength - 3)).trim()}...`;
};

const isFullPagePrimaryLayout = (layout = {}) =>
  layout.labelPurpose === "shipping" &&
  layout.template === "full" &&
  (layout.stockId === "a4-primary" ||
    layout.stockPreset === "a4-primary" ||
    layout.stockId === "letter-primary" ||
    layout.stockPreset === "letter-primary" ||
    (layout.widthMm >= 170 && layout.heightMm >= 200));

const isCompletePrimaryTemplate = (layout = {}) =>
  layout.labelPurpose === "shipping" && layout.template === "full";

const isQrSupplementLayout = (layout = {}) =>
  layout.labelPurpose === "qrSupplement" || layout.template === "qrcode";

const isQuickIdLayout = (layout = {}) =>
  layout.labelPurpose === "quickId" || layout.template === "icon";

const shouldUseCompactStandardHazards = (layout = {}) => {
  const area = (layout.widthMm || 0) * (layout.heightMm || 0);
  return (
    layout.labelPurpose === "shipping" &&
    layout.template === "standard" &&
    (layout.formFactor === "bottle" ||
      (layout.nameDisplay === "both" &&
        layout.outputRole === "primary-candidate" &&
        area < 9500))
  );
};

const getFullPagePrimaryClass = (layout = {}) => {
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

const getPhysicalLabelClasses = (layout = {}) =>
  [
    `label-stock-${toClassToken(layout.stockId || layout.stockPreset)}`,
    `label-size-${toClassToken(layout.size)}`,
    `label-form-${toClassToken(layout.formFactor)}`,
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

const resolveLabProfile = (customLabelFields, labProfile) => ({
  organization:
    (labProfile?.organization || "").trim() ||
    (customLabelFields?.labName || "").trim(),
  phone: (labProfile?.phone || "").trim(),
  address: (labProfile?.address || "").trim(),
});

const expandLabelsByQuantity = (selectedForLabel, labelQuantities) => {
  const expanded = [];
  selectedForLabel.forEach((chemical) => {
    const quantity = labelQuantities?.[chemical.cas_number] || 1;
    for (let copy = 0; copy < quantity; copy += 1) {
      expanded.push(chemical);
    }
  });
  return expanded;
};

const getContinuationCapacity = (layout = {}) => {
  const fullPage = isFullPagePrimaryLayout(layout);
  if (!fullPage) {
    return {
      splitStatementCount: Infinity,
      splitTextWeight: Infinity,
      pageStatementCount: Infinity,
      pageTextWeight: Infinity,
    };
  }
  if (layout.stockId === "letter-primary" || layout.stockPreset === "letter-primary") {
    return {
      splitStatementCount: 32,
      splitTextWeight: 2350,
      pageStatementCount: 14,
      pageTextWeight: 1150,
    };
  }
  return {
    splitStatementCount: 34,
    splitTextWeight: 2550,
    pageStatementCount: 15,
    pageTextWeight: 1250,
  };
};

const appendContinuationStatement = (pages, item, capacity, model) => {
  const weight = getContinuationStatementWeight(item.statement, model);
  let current = pages[pages.length - 1];
  const wouldExceedCount =
    current.items.length > 0 &&
    current.items.length + 1 > capacity.pageStatementCount;
  const wouldExceedText =
    current.items.length > 0 &&
    current.textWeight + weight > capacity.pageTextWeight;

  if (wouldExceedCount || wouldExceedText) {
    current = { items: [], textWeight: 0 };
    pages.push(current);
  }

  current.items.push(item);
  current.textWeight += weight;
};

const buildContinuationLabelsForChemical = (chemical, model) => {
  if (!isFullPagePrimaryLayout(model.layout)) return [chemical];

  const content = getLabelContentForRender(chemical, model);
  const statements = [
    ...content.hazardStatements.map((statement) => ({
      kind: "hazard",
      statement,
    })),
    ...content.precautionaryStatements.map((statement) => ({
      kind: "precaution",
      statement,
    })),
  ];
  const capacity = getContinuationCapacity(model.layout);
  const statementTextWeight = statements.reduce(
    (total, item) =>
      total + getContinuationStatementWeight(item.statement, model),
    0,
  );

  if (
    statements.length <= capacity.splitStatementCount &&
    statementTextWeight <= capacity.splitTextWeight
  ) {
    return [chemical];
  }

  const pages = [{ items: [], textWeight: 0 }];
  statements.forEach((item) =>
    appendContinuationStatement(pages, item, capacity, model),
  );
  const populatedPages = pages.filter((page) => page.items.length > 0);
  if (populatedPages.length <= 1) return [chemical];

  return populatedPages.map((page, index) => ({
    __printContinuation: true,
    sourceChemical: chemical,
    continuation: {
      current: index + 1,
      total: populatedPages.length,
      hazardStatements: page.items
        .filter((item) => item.kind === "hazard")
        .map((item) => item.statement),
      precautionaryStatements: page.items
        .filter((item) => item.kind === "precaution")
        .map((item) => item.statement),
    },
  }));
};

export function buildPrintDocumentModel(
  selectedForLabel,
  labelConfig,
  customGHSSettings,
  customLabelFields = {},
  labelQuantities = {},
  labProfile = {},
) {
  if (!Array.isArray(selectedForLabel) || selectedForLabel.length === 0) {
    return null;
  }

  const t = i18n.t.bind(i18n);
  const layout = resolvePrintLayoutConfig({
    ...labelConfig,
    template: normalizeTemplate(labelConfig?.template),
  });
  const expandedLabels = expandLabelsByQuantity(
    selectedForLabel,
    labelQuantities,
  );
  const modelBase = {
    t,
    locale: i18n.language,
    layout,
    selectedForLabel,
    customGHSSettings,
    customLabelFields,
    labelQuantities,
    resolvedLabProfile: resolveLabProfile(customLabelFields, labProfile),
  };
  const printableLabels = expandedLabels.flatMap((chemical) =>
    buildContinuationLabelsForChemical(chemical, modelBase),
  );
  const pages = chunk(printableLabels, layout.page.perPage);

  return {
    ...modelBase,
    sourceExpandedLabels: expandedLabels,
    expandedLabels: printableLabels,
    pages,
    totalPages: pages.length,
  };
}

const renderCustomFields = (model) => {
  const fields = [];
  if (model.customLabelFields?.date) {
    fields.push(escapeHtml(model.customLabelFields.date));
  }
  if (model.customLabelFields?.batchNumber) {
    fields.push(
      `${escapeHtml(model.t("print.batch"))}: ${escapeHtml(model.customLabelFields.batchNumber)}`,
    );
  }
  if (fields.length === 0) return "";
  return `<div class="custom-fields">${fields.join(" | ")}</div>`;
};

const renderProfileFields = (model, { compact = false } = {}) => {
  const profile = model.resolvedLabProfile;
  if (!profile.organization && !profile.phone && !profile.address) {
    return "";
  }

  const rows = [];
  if (profile.organization) {
    rows.push(
      `<div class="profile-row profile-org">${escapeHtml(profile.organization)}</div>`,
    );
  }
  if (profile.phone) {
    rows.push(
      `<div class="profile-row"><span class="profile-label">${escapeHtml(
        model.t("print.profilePhone"),
      )}:</span> <span class="profile-value">${escapeHtml(profile.phone)}</span></div>`,
    );
  }
  if (!compact && profile.address) {
    rows.push(
      `<div class="profile-row profile-address">${escapeHtml(profile.address)}</div>`,
    );
  }

  return `<div class="profile-block${
    compact ? " profile-block-compact" : ""
  }">${rows.join("")}</div>`;
};

const renderSupportChips = (
  model,
  { includeOrganization = true, includeDate = true, includeBatch = true } = {},
) => {
  const chips = [];
  if (includeOrganization && model.resolvedLabProfile?.organization) {
    chips.push(escapeHtml(model.resolvedLabProfile.organization));
  }
  if (includeDate && model.customLabelFields?.date) {
    chips.push(escapeHtml(model.customLabelFields.date));
  }
  if (includeBatch && model.customLabelFields?.batchNumber) {
    chips.push(
      `${escapeHtml(model.t("print.batch"))}: ${escapeHtml(
        model.customLabelFields.batchNumber,
      )}`,
    );
  }
  if (chips.length === 0) return "";
  return `<div class="support-chips">${chips
    .map((chip) => `<span class="support-chip">${chip}</span>`)
    .join("")}</div>`;
};

const renderCriticalIdentityChips = (model) =>
  renderSupportChips(model, {
    includeOrganization: false,
    includeDate: false,
    includeBatch: true,
  });

const renderMetaChip = (label, value, className = "") => {
  const labelHtml = label
    ? `<span class="meta-chip-label">${escapeHtml(label)}</span>`
    : "";
  const valueHtml = value
    ? `<span class="meta-chip-value">${escapeHtml(value)}</span>`
    : "";
  return `<span class="meta-chip${className ? ` ${className}` : ""}">${labelHtml}${valueHtml}</span>`;
};

const renderMetaRibbon = (
  effectiveChem,
  model,
  { includeCas = true, includePrepared = true, preparedDetailLimit = 2 } = {},
) => {
  const chips = [];

  if (includeCas && effectiveChem.cas_number) {
    chips.push(
      renderMetaChip("CAS", effectiveChem.cas_number, "meta-chip-cas"),
    );
  }

  if (includePrepared && isPrepared(effectiveChem)) {
    const meta = effectiveChem.preparedSolution || {};
    chips.push(
      renderMetaChip("", model.t("print.preparedShort"), "meta-chip-prepared"),
    );

    const preparedDetails = [];
    if (meta.concentration) {
      preparedDetails.push([
        model.t("print.concentrationShort"),
        meta.concentration,
      ]);
    }
    if (meta.solvent) {
      preparedDetails.push([model.t("print.solventShort"), meta.solvent]);
    }

    preparedDetails.slice(0, preparedDetailLimit).forEach(([label, value]) => {
      chips.push(renderMetaChip(label, value, "meta-chip-prepared-detail"));
    });
  }

  if (chips.length === 0) return "";

  return `<div class="meta-ribbon">${chips.join("")}</div>`;
};

const renderNameSection = (effectiveChem, model, options = {}) => {
  const {
    compactProfile = false,
    showProfile = true,
    showCustomFields = true,
    compactNames = false,
    supportHtml = "",
    showCasLine = true,
    metaRibbonHtml = "",
  } = options;
  const nameDisplay = resolveModelNameDisplay(model);
  let nameHtml = "";

  if (nameDisplay === "en" || nameDisplay === "both") {
    nameHtml += `<div class="name-en">${escapeHtml(effectiveChem.name_en || "")}</div>`;
  }

  if (nameDisplay === "zh") {
    const displayName = effectiveChem.name_zh || effectiveChem.name_en || "";
    nameHtml += `<div class="name-en">${escapeHtml(displayName)}</div>`;
  } else if (nameDisplay === "both" && effectiveChem.name_zh) {
    nameHtml += `<div class="name-zh">${escapeHtml(effectiveChem.name_zh)}</div>`;
  }

  return `<div class="name-section${compactNames ? " name-section-compact" : ""}${getIdentityDensityClass(effectiveChem, model)}">
    ${nameHtml}
    ${showCasLine ? `<div class="cas">CAS: ${escapeHtml(effectiveChem.cas_number)}</div>` : ""}
    ${metaRibbonHtml}
    ${supportHtml}
    ${showProfile ? renderProfileFields(model, { compact: compactProfile }) : ""}
    ${showCustomFields ? renderCustomFields(model) : ""}
  </div>`;
};

const isPrepared = (chemical) => Boolean(chemical?.isPreparedSolution);

const renderPreparedBadge = (model) =>
  `<div class="prepared-badge" data-testid="prepared-badge">${escapeHtml(
    model.t("print.preparedShort"),
  )}</div>`;

const renderPreparedMeta = (chemical, model) => {
  if (!isPrepared(chemical)) return "";
  const meta = chemical.preparedSolution || {};
  const rows = [];
  if (meta.concentration) {
    rows.push(
      `<div class="prepared-meta-row"><span class="prepared-label">${escapeHtml(
        model.t("print.concentration"),
      )}:</span> <span class="prepared-value">${escapeHtml(meta.concentration)}</span></div>`,
    );
  }
  if (meta.solvent) {
    rows.push(
      `<div class="prepared-meta-row"><span class="prepared-label">${escapeHtml(
        model.t("print.solvent"),
      )}:</span> <span class="prepared-value">${escapeHtml(meta.solvent)}</span></div>`,
    );
  }
  if (rows.length === 0) return "";
  return `<div class="prepared-meta" data-testid="prepared-meta">${rows.join("")}</div>`;
};

const renderPreparedNote = (chemical, model) => {
  if (!isPrepared(chemical)) return "";
  return `<div class="prepared-note" data-testid="prepared-note">${escapeHtml(
    model.t("print.preparedNote"),
  )}</div>`;
};

const renderPreparedOperational = (chemical, model) => {
  if (!isPrepared(chemical)) return "";
  const meta = chemical.preparedSolution || {};
  const rows = [];

  if (meta.preparedBy) {
    rows.push(
      `<div class="prepared-operational-row"><span class="prepared-operational-label">${escapeHtml(
        model.t("print.preparedBy"),
      )}:</span> <span class="prepared-operational-value">${escapeHtml(meta.preparedBy)}</span></div>`,
    );
  }
  if (meta.preparedDate) {
    rows.push(
      `<div class="prepared-operational-row"><span class="prepared-operational-label">${escapeHtml(
        model.t("print.preparedDate"),
      )}:</span> <span class="prepared-operational-value">${escapeHtml(
        meta.preparedDate,
      )}</span></div>`,
    );
  }
  if (meta.expiryDate) {
    rows.push(
      `<div class="prepared-operational-row"><span class="prepared-operational-label">${escapeHtml(
        model.t("print.expiryDate"),
      )}:</span> <span class="prepared-operational-value">${escapeHtml(meta.expiryDate)}</span></div>`,
    );
  }

  if (rows.length === 0) return "";
  return `<div class="prepared-operational" data-testid="prepared-operational">${rows.join(
    "",
  )}</div>`;
};

const renderPictograms = (pictograms, className = "") => {
  if (!pictograms.length) return "";
  return `<div class="pictograms${className ? ` ${className}` : ""}">
    ${pictograms
      .map(
        (pictogram) =>
          `<img src="${escapeHtml(GHS_IMAGES[pictogram.code] || "")}" alt="${escapeHtml(
            pictogram.code,
          )}" data-required-print-image="ghs-pictogram" data-ghs-code="${escapeHtml(
            pictogram.code,
          )}" />`,
      )
      .join("")}
  </div>`;
};

const getRequiredPrintImageKind = (img) => {
  const requiredKind = img.getAttribute?.("data-required-print-image");
  if (requiredKind) return requiredKind;

  const alt = img.getAttribute?.("alt") || img.alt || "";
  if (/^GHS\d{2}$/.test(alt)) return "ghs-pictogram";
  if (/qr/i.test(alt)) return "qr-code";
  if (img.classList?.contains?.("qrcode-img")) return "qr-code";

  return "";
};

const isImageLoadFailure = (img) =>
  "naturalWidth" in img && img.naturalWidth === 0;

const buildRequiredImageIssue = (img, reason) => ({
  type: "required-image-failed",
  imageKind: getRequiredPrintImageKind(img),
  alt: img.getAttribute?.("alt") || img.alt || "",
  src: img.getAttribute?.("src") || img.src || "",
  reason,
});

const renderSignal = (signalWord, signalClass, className = "") => {
  if (!signalWord) {
    return '<div class="signal-placeholder"></div>';
  }
  return `<div class="signal ${signalClass}${className ? ` ${className}` : ""}">${escapeHtml(
    signalWord,
  )}</div>`;
};

const renderHazardStatement = (statement, className, model) =>
  `<div class="${className}">${escapeHtml(statement.code)} ${escapeHtml(
    getLocalizedTextForModel(statement, model),
  )}</div>`;

const renderHazardCode = (statement, className) =>
  `<div class="${className} hazard-code-only">${escapeHtml(
    statement.code,
  )}</div>`;

const renderMoreHazards = (count, model, className = "") => {
  if (count <= 0) return "";
  return `<div class="hazard-more${className ? ` ${className}` : ""}">${escapeHtml(
    model.t("print.moreHazardsShort", { count }),
  )}</div>`;
};

const renderPurposeNotice = (model) => {
  // Purpose warnings live in the print modal. The physical label keeps its
  // limited area for identity, pictograms, signal word, and hazard content.
  return "";
};

const getStatementCodeClass = (code) =>
  String(code || "").length > 8 ? " statement-code-long" : "";

const renderComplianceStatements = (statements, className, model) => {
  if (!statements.length) return "";

  return `<div class="${className}">
    ${statements
      .map(
        (statement) =>
          `<div class="compliance-statement"><span class="statement-code${getStatementCodeClass(
            statement.code,
          )}">${escapeHtml(
            statement.code,
          )}</span><span class="statement-text">${escapeHtml(
            getLocalizedTextForModel(statement, model),
          )}</span></div>`,
      )
      .join("")}
  </div>`;
};

const renderComplianceFooter = (_effectiveChem, model) => {
  const hasProfile =
    model.resolvedLabProfile.organization ||
    model.resolvedLabProfile.phone ||
    model.resolvedLabProfile.address;

  return `<div class="compliance-footer compliance-footer-no-qr">
    <div class="compliance-supplier">
      ${
        hasProfile
          ? renderProfileFields(model)
          : `<div class="profile-block profile-block-missing">${escapeHtml(
              model.t("print.supplierMissing"),
            )}</div>`
      }
      ${renderCustomFields(model)}
    </div>
  </div>`;
};

const renderContinuationBadge = (continuation, model) => {
  if (!continuation || continuation.total <= 1) return "";
  return `<div class="continuation-badge" data-testid="continuation-badge">${escapeHtml(
    model.t("print.continuationBadge", {
      current: continuation.current,
      total: continuation.total,
    }),
  )}</div>`;
};

const renderCompactPrecautions = (precautions, maxPrecautions, model) => {
  if (!precautions.length || maxPrecautions <= 0) return "";
  const prioritizedPrecautions =
    prioritizePrecautionaryStatements(precautions);
  return `<div class="precautions-compact">
    ${prioritizedPrecautions
      .slice(0, maxPrecautions)
      .map(
        (precaution) =>
          `<span class="precaution-code">${escapeHtml(precaution.code)}</span>`,
      )
      .join(" ")}
    ${
      precautions.length > maxPrecautions
        ? `<span class="precaution-more">+ ${escapeHtml(
            model.t("print.morePrecautionary", {
              count: precautions.length - maxPrecautions,
            }),
          )}</span>`
        : ""
    }
  </div>`;
};

const getContinuationMeta = (chemical) =>
  chemical?.__printContinuation ? chemical.continuation || null : null;

const getSourceChemicalForRender = (chemical) =>
  chemical?.__printContinuation ? chemical.sourceChemical || chemical : chemical;

const getLabelContentForRender = (chemical, model) => {
  const continuation = getContinuationMeta(chemical);
  const content = buildPrintLabelContent(getSourceChemicalForRender(chemical), {
    customGHSSettings: model.customGHSSettings,
    resolvedLabProfile: model.resolvedLabProfile,
    layout: model.layout,
  });
  if (!continuation) return content;
  return {
    ...content,
    hazardStatements: continuation.hazardStatements || [],
    precautionaryStatements: continuation.precautionaryStatements || [],
  };
};

const renderIconTemplate = (chemical, model) => {
  const {
    effectiveChemical: effectiveChem,
    pictograms,
  } = getLabelContentForRender(chemical, model);
  const signalWord = getSignalWordForModel(effectiveChem, model);
  const signalClass =
    effectiveChem.signal_word === "Danger" ? "danger" : "warning";
  const prepared = isPrepared(effectiveChem);

  return `
    <div class="label label-icon ${getPhysicalLabelClasses(model.layout)}${prepared ? " label-prepared" : ""}">
      ${renderPurposeNotice(model)}
      <div class="label-top">
        ${renderNameSection(effectiveChem, model, {
          compactNames: true,
          showProfile: false,
          showCustomFields: false,
          supportHtml: renderCriticalIdentityChips(model),
        })}
        ${prepared ? renderPreparedBadge(model) + renderPreparedMeta(effectiveChem, model) : ""}
      </div>
      <div class="label-middle">
        ${
          pictograms.length > 0
            ? renderPictograms(pictograms, "pictograms-icon")
            : `<div class="no-hazard">${escapeHtml(model.t("print.noHazardLabel"))}</div>`
        }
      </div>
      <div class="label-bottom">
        ${renderSignal(signalWord, signalClass)}
      </div>
    </div>
  `;
};

const renderStandardTemplate = (chemical, model) => {
  const {
    effectiveChemical: effectiveChem,
    pictograms,
    hazardStatements: hazards,
    precautionaryStatements: precautions,
  } = getLabelContentForRender(chemical, model);
  const signalWord = getSignalWordForModel(effectiveChem, model);
  const signalClass =
    effectiveChem.signal_word === "Danger" ? "danger" : "warning";
  const budgets = model.layout.templateBudgets.standard;
  const prioritizedHazards = prioritizeHazardStatements(hazards);
  const primaryHazards = prioritizedHazards.slice(0, budgets.primaryHazards);
  const omittedHazards = Math.max(0, hazards.length - primaryHazards.length);
  const compactHazardCodes = shouldUseCompactStandardHazards(model.layout);
  const prepared = isPrepared(effectiveChem);

  return `
    <div class="label label-standard ${getPhysicalLabelClasses(model.layout)}${prepared ? " label-prepared" : ""}">
      ${renderPurposeNotice(model)}
      <div class="label-top label-top-standard">
        ${renderNameSection(effectiveChem, model, {
          compactNames: model.layout.size !== "large",
          showProfile: false,
          showCustomFields: false,
          showCasLine: false,
          metaRibbonHtml: renderMetaRibbon(effectiveChem, model, {
            includeCas: true,
            includePrepared: true,
            preparedDetailLimit: model.layout.size === "small" ? 1 : 2,
          }),
          supportHtml: renderCriticalIdentityChips(model),
        })}
      </div>
      <div class="label-middle label-middle-standard">
        <div class="standard-grid${pictograms.length === 0 ? " standard-grid-no-pics" : ""}">
          ${
            pictograms.length > 0
              ? `<div class="standard-rail">
                  ${renderPictograms(pictograms, "pictograms-standard")}
                </div>`
              : ""
          }
          <div class="standard-main">
            ${signalWord ? `<div class="standard-signal-row">${renderSignal(signalWord, signalClass, "signal-inline")}</div>` : ""}
            <div class="standard-hazard-board">
            ${
              primaryHazards.length > 0
                ? `<div class="hazard-primary-list${compactHazardCodes ? " hazard-code-list" : ""}">
                    ${primaryHazards
                      .map((hazard) =>
                        compactHazardCodes
                          ? renderHazardCode(
                              hazard,
                              "hazard-item hazard-primary-item",
                            )
                          : renderHazardStatement(
                              hazard,
                              "hazard-item hazard-primary-item",
                              model,
                            ),
                      )
                      .join("")}
                    ${renderMoreHazards(omittedHazards, model)}
                  </div>`
                : `<div class="no-hazard">${escapeHtml(model.t("print.noHazardLabel"))}</div>`
            }
            ${renderCompactPrecautions(
              precautions,
              budgets.precautions || 0,
              model,
            )}
            </div>
          </div>
        </div>
      </div>
    </div>
  `;
};

const renderFullTemplate = (chemical, model) => {
  const continuation = getContinuationMeta(chemical);
  const {
    effectiveChemical: effectiveChem,
    pictograms,
    hazardStatements: hazards,
    precautionaryStatements: precautions,
  } = getLabelContentForRender(chemical, model);
  const signalWord = getSignalWordForModel(effectiveChem, model);
  const signalClass =
    effectiveChem.signal_word === "Danger" ? "danger" : "warning";
  const hazardTier = isFullPagePrimaryLayout(model.layout)
    ? getFullPageStatementTier(hazards, precautions, model)
    : getHazardFontTier(hazards.length + precautions.length, model.layout.size);
  const prepared = isPrepared(effectiveChem);
  const purposeNotice = renderPurposeNotice(model);
  const fullPageClass = getFullPagePrimaryClass(model.layout);
  const continuationClass = continuation ? " label-continuation-page" : "";
  const statementPanelStyle = [
    `--compliance-statement-gap:${hazardTier.marginBottom}`,
    `--compliance-code-gap:${hazardTier.codeGap || "1.1mm"}`,
    `--hazard-code-min:${hazardTier.hazardCodeMin || "10mm"}`,
    `--hazard-code-max:${hazardTier.hazardCodeMax || "14mm"}`,
    `--precaution-code-min:${hazardTier.precautionCodeMin || "15mm"}`,
    `--precaution-code-max:${hazardTier.precautionCodeMax || "21mm"}`,
  ].join(";");

  return `
    <div class="label label-full label-compliance ${getPhysicalLabelClasses(model.layout)} label-purpose-${escapeHtml(model.layout.labelPurpose)}${fullPageClass}${continuationClass}${prepared ? " label-prepared" : ""}"${continuation ? ` data-continuation-page="${escapeHtml(continuation.current)}" data-continuation-total="${escapeHtml(continuation.total)}"` : ""}>
      <div class="compliance-header">
        ${renderNameSection(effectiveChem, model)}
        ${renderContinuationBadge(continuation, model)}
        ${
          prepared
            ? renderPreparedBadge(model) +
              renderPreparedMeta(effectiveChem, model) +
              renderPreparedOperational(effectiveChem, model)
            : ""
        }
      </div>
      ${purposeNotice}
      <div class="compliance-core">
        <div class="compliance-alert-panel">
          ${signalWord ? renderSignal(signalWord, signalClass, "compliance-signal") : ""}
          ${
            pictograms.length > 0
              ? renderPictograms(pictograms, "compliance-pictograms")
              : `<div class="no-hazard">${escapeHtml(model.t("print.noHazardLabel"))}</div>`
          }
        </div>
        <div class="compliance-statements-panel" style="${statementPanelStyle}">
          ${
            hazards.length > 0 || !continuation
              ? `<div class="compliance-hazard-panel" style="font-size:${hazardTier.fontSize};line-height:${hazardTier.lineHeight}">
                  <div class="section-label">${escapeHtml(model.t("print.hazardStatementsLabel"))}</div>
                  ${
                    hazards.length > 0
                      ? renderComplianceStatements(
                          hazards,
                          "compliance-hazard-list",
                          model,
                        )
                      : `<div class="no-hazard-text">${escapeHtml(model.t("print.noHazardStatement"))}</div>`
                  }
                </div>`
              : ""
          }
          ${
            precautions.length > 0 || !continuation
              ? `<div class="compliance-precaution-panel" style="font-size:${hazardTier.fontSize};line-height:${hazardTier.lineHeight}">
                  <div class="section-label">${escapeHtml(model.t("print.precautionaryStatementsLabel"))}</div>
                  ${
                    precautions.length > 0
                      ? renderComplianceStatements(
                          precautions,
                          "compliance-precaution-list",
                          model,
                        )
                      : `<div class="no-hazard-text">${escapeHtml(model.t("print.noPrecautionaryStatement"))}</div>`
                  }
                  ${prepared ? renderPreparedNote(effectiveChem, model) : ""}
                </div>`
              : ""
          }
        </div>
      </div>
      ${renderComplianceFooter(effectiveChem, model)}
    </div>
  `;
};

const renderQRCodeTemplate = (chemical, model) => {
  const {
    effectiveChemical: effectiveChem,
    pictograms,
    hazardStatements: hazards,
  } = getLabelContentForRender(chemical, model);
  const signalWord = getSignalWordForModel(effectiveChem, model);
  const signalClass =
    effectiveChem.signal_word === "Danger" ? "danger" : "warning";
  const prepared = isPrepared(effectiveChem);
  const qrTarget =
    getPreferredQrTarget(
      effectiveChem.cid,
      effectiveChem.cas_number,
      effectiveChem.reference_links,
    ) || "https://pubchem.ncbi.nlm.nih.gov/";
  const budgets = model.layout.templateBudgets.qrcode;
  const prioritizedHazards = prioritizeHazardStatements(hazards);
  const compactQrSupplement =
    model.layout.formFactor === "strip" ||
    model.layout.size === "small" ||
    model.layout.heightMm <= 32;
  const hazardTeasers = compactQrSupplement
    ? []
    : prioritizedHazards.slice(0, budgets.hazardTeasers);
  const omittedHazards = Math.max(0, hazards.length - hazardTeasers.length);

  return `
    <div class="label label-qr ${getPhysicalLabelClasses(model.layout)}${prepared ? " label-prepared" : ""}">
      <div class="qr-left qr-left-scan">
        ${renderPurposeNotice(model)}
        <div class="qr-identity">
          ${renderNameSection(effectiveChem, model, {
            compactNames: true,
            showProfile: false,
            showCustomFields: false,
            showCasLine: false,
            metaRibbonHtml: renderMetaRibbon(effectiveChem, model, {
              includeCas: true,
              includePrepared: true,
              preparedDetailLimit: 2,
            }),
            supportHtml: renderCriticalIdentityChips(model),
          })}
        </div>
        ${
          pictograms.length > 0
            ? `<div class="qr-support-row qr-support-row-primary">${renderPictograms(pictograms, "qr-pics")}</div>`
            : ""
        }
        <div class="qr-priority-block">
          ${signalWord ? renderSignal(signalWord, signalClass, "qr-signal") : ""}
          ${
            compactQrSupplement
              ? ""
              : hazardTeasers.length > 0
              ? `<div class="qr-hazard-list">
                  ${hazardTeasers
                    .map(
                      (hazard) =>
                        `<div class="qr-hazard-chip">${escapeHtml(hazard.code)}${
                          getLocalizedTextForModel(hazard, model)
                            ? `<span class="qr-hazard-summary">${escapeHtml(
                                truncateText(
                                  getLocalizedTextForModel(hazard, model),
                                  model.layout.size === "small" ? 18 : 28,
                                ),
                              )}</span>`
                            : ""
                        }</div>`,
                    )
                    .join("")}
                  ${renderMoreHazards(omittedHazards, model, "qr-hazard-more")}
                </div>`
              : `<div class="no-hazard-text qr-no-hazard">${escapeHtml(
                  model.t("print.noHazardStatement"),
                )}</div>`
            }
        </div>
      </div>
      <div class="qr-right qr-panel">
        <div class="qr-code-shell">
          <img class="qrcode-img" src="${getQRCodeUrl(qrTarget, 200)}" alt="QR" data-required-print-image="qr-code" data-qr-target="${escapeHtml(qrTarget)}" />
        </div>
        <div class="qr-hint">${escapeHtml(model.t("print.scanForDetail"))}</div>
      </div>
    </div>
  `;
};

const TEMPLATE_RENDERERS = {
  icon: renderIconTemplate,
  standard: renderStandardTemplate,
  full: renderFullTemplate,
  qrcode: renderQRCodeTemplate,
};

const buildStyles = (model) => {
  const { layout } = model;
  const isLandscape = layout.orientation === "landscape";
  const isFullPagePrimary = isFullPagePrimaryLayout(layout);
  const compliancePictogramSize = layout.typography.compliancePictogramSize;
  const standardPictogramSize =
    layout.typography.standardPictogramSize ||
    (layout.size === "small"
      ? "8.5mm"
      : layout.size === "medium"
        ? "10.5mm"
        : "13mm");
  const standardRailColumn =
    layout.typography.standardRailColumn ||
    (layout.size === "small"
      ? "19mm"
      : layout.size === "medium"
        ? "24.5mm"
        : "30mm");
  const standardPictogramGap =
    layout.typography.standardPictogramGap || "0.8mm";
  const iconPictogramSize =
    layout.typography.iconPictogramSize ||
    (layout.size === "small"
      ? "9.5mm"
      : layout.size === "medium"
        ? "13mm"
        : "18mm");
  const qrPictogramSize =
    layout.typography.qrPictogramSize ||
    (layout.size === "small" ? "6.5mm" : "9mm");
  const complianceAlertColumn =
    isFullPagePrimary
      ? "minmax(64mm, 66mm)"
      : layout.size === "large"
      ? "minmax(38mm, 43mm)"
      : layout.size === "medium"
        ? "minmax(28mm, 34mm)"
        : "minmax(20mm, 24mm)";

  return `
    @page {
      size: ${layout.page.size || "A4"}${isLandscape ? " landscape" : ""};
      margin: ${layout.page.margin};
    }
    * {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
    }
    body {
      font-family: "Microsoft JhengHei", "PingFang TC", "Noto Sans TC", "Helvetica Neue", Arial, sans-serif;
      padding: 0;
      background: #fff;
    }
    .page {
      position: relative;
      min-height: ${layout.page.minHeight};
      padding: ${layout.page.padding};
      page-break-after: always;
    }
    .page:last-child {
      page-break-after: auto;
    }
    .page-grid {
      display: grid;
      grid-template-columns: repeat(${layout.page.cols}, ${layout.label.width});
      column-gap: ${layout.page.columnGap};
      row-gap: ${layout.page.rowGap};
      justify-content: center;
      align-content: start;
      transform: translate(${layout.page.nudgeX}, ${layout.page.nudgeY});
      transform-origin: top left;
    }
    .page-number {
      position: absolute;
      bottom: 1mm;
      right: 3mm;
      font-size: 8px;
      color: #999;
    }
    .page-footer-note {
      position: absolute;
      bottom: 1mm;
      left: 3mm;
      right: ${layout.page.footerReserveRight};
      font-size: 7px;
      color: #999;
      font-style: italic;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .label {
      width: ${layout.label.width};
      height: ${layout.label.height};
      border: ${layout.label.borderWidth} solid #222;
      border-radius: ${layout.label.radius};
      padding: ${layout.label.padding};
      page-break-inside: avoid;
      display: flex;
      flex-direction: column;
      background: #fff;
      overflow: hidden;
      font-size: ${layout.typography.fontSize};
      box-shadow: none;
    }
    .label-full {
      display: flex;
      flex-direction: column;
      gap: 1mm;
      max-height: ${layout.label.height};
      border-width: 0.65mm;
      border-radius: 1mm;
      padding: calc(${layout.label.padding} + 0.3mm);
      min-height: 0;
    }
    .label-full-page-primary {
      display: grid;
      grid-template-rows: auto minmax(0, 1fr) auto;
      gap: 1.6mm;
      padding: 4.5mm;
      border-width: 0.8mm;
      border-radius: 1.2mm;
      overflow: hidden;
    }
    .label-qr {
      flex-direction: row;
      gap: 2mm;
      overflow: hidden;
    }
    .label-top {
      flex-shrink: 0;
      border-bottom: 1px solid #cbd5e1;
      padding-bottom: 1.2mm;
      margin-bottom: 1.3mm;
    }
    .label-top-standard {
      background: linear-gradient(180deg, #f8fafc 0%, #ffffff 100%);
      margin: -0.6mm -0.6mm 1.3mm -0.6mm;
      padding: 0.6mm 0.6mm 1.2mm 0.6mm;
      border-radius: 1.4mm 1.4mm 0 0;
    }
    .label-standard .label-top-standard {
      margin: calc(${layout.label.padding} * -0.4) calc(${layout.label.padding} * -0.4) 0.8mm calc(${layout.label.padding} * -0.4);
      padding: 0.45mm 0.65mm 0.75mm 0.65mm;
    }
    .label-middle {
      flex: 1;
      display: flex;
      flex-direction: column;
      justify-content: center;
      align-items: center;
      min-height: 0;
    }
    .label-middle.compact {
      flex: 0;
      margin-bottom: 1.2mm;
    }
    .label-middle-standard {
      align-items: stretch;
      justify-content: flex-start;
    }
    .label-bottom {
      flex-shrink: 0;
      margin-top: auto;
    }
    .label-full .label-bottom {
      flex: 1;
      min-height: 0;
      margin-top: 0;
    }

    .compliance-header {
      border-bottom: 0.35mm solid #111827;
      padding-bottom: 1mm;
      min-width: 0;
    }
    .label-full-page-primary .compliance-header {
      padding-bottom: 1.4mm;
    }
    .continuation-badge {
      display: inline-flex;
      width: fit-content;
      margin-top: 0.9mm;
      padding: 0.35mm 1.1mm;
      border: 0.25mm solid #bfdbfe;
      border-radius: 999px;
      background: #eff6ff;
      color: #1d4ed8;
      font-size: 8px;
      font-weight: 800;
      line-height: 1.1;
    }
    .compliance-header .profile-block,
    .compliance-header .custom-fields {
      display: none;
    }
    .compliance-core {
      display: grid;
      grid-template-columns: ${complianceAlertColumn} minmax(0, 1fr);
      gap: 2.2mm;
      align-items: stretch;
      min-height: 0;
      overflow: hidden;
    }
    .compliance-alert-panel {
      display: flex;
      flex-direction: column;
      gap: 1.2mm;
      align-items: stretch;
      min-width: 0;
    }
    .label-full-page-primary .compliance-alert-panel {
      border: 0.25mm solid #dbe4ef;
      border-radius: 1.2mm;
      padding: 1.5mm;
      background: #f8fafc;
      gap: 1.3mm;
      justify-content: flex-start;
      overflow: hidden;
    }
    .compliance-statements-panel {
      display: grid;
      grid-template-rows: auto minmax(0, 1fr);
      gap: 1.4mm;
      min-width: 0;
      min-height: 0;
      overflow: hidden;
    }
    .compliance-hazard-panel,
    .compliance-precaution-panel {
      min-width: 0;
      overflow: hidden;
    }
    .compliance-precaution-panel {
      border-top: 0.25mm solid #cbd5e1;
      padding-top: 0.8mm;
    }
    .label-continuation-page .compliance-statements-panel {
      grid-template-rows: auto minmax(0, 1fr);
    }
    .label-continuation-page .compliance-precaution-panel:first-child {
      border-top: 0;
      padding-top: 0;
    }
    .section-label {
      color: #475569;
      font-size: calc(${layout.typography.fontSize} - 4px);
      font-weight: 800;
      text-transform: uppercase;
      margin-bottom: 0.7mm;
    }
    .compliance-hazard-list,
    .compliance-precaution-list {
      display: flex;
      flex-direction: column;
      gap: 0.45mm;
    }
    .compliance-statement {
      display: grid;
      grid-template-columns: minmax(13mm, max-content) minmax(0, 1fr);
      gap: var(--compliance-code-gap, 1.1mm);
      break-inside: avoid;
      align-items: start;
    }
    .compliance-precaution-list .compliance-statement {
      grid-template-columns: minmax(20mm, 28mm) minmax(0, 1fr);
    }
    .statement-code {
      font-family: "Consolas", "Monaco", "Courier New", monospace;
      font-weight: 800;
      color: #111827;
      white-space: nowrap;
      line-height: 1.05;
    }
    .statement-code-long {
      white-space: normal;
      overflow-wrap: anywhere;
      word-break: break-word;
    }
    .statement-text {
      color: #222;
      overflow-wrap: anywhere;
      min-width: 0;
    }
    .compliance-footer {
      display: grid;
      grid-template-columns: minmax(0, 1fr) auto;
      gap: 1.5mm;
      align-items: end;
      border-top: 0.25mm solid #cbd5e1;
      padding-top: 1mm;
      min-width: 0;
      margin-top: auto;
    }
    .compliance-footer-no-qr {
      grid-template-columns: minmax(0, 1fr);
    }
    .compliance-supplier {
      min-width: 0;
    }
    .compliance-footer .profile-block {
      margin-top: 0;
      border-radius: 0;
      background: #fff;
    }
    .profile-block-missing {
      border-style: dashed;
      color: #92400e;
      background: #fffbeb;
      font-weight: 700;
    }
    .compliance-footer .custom-fields {
      margin-top: 0.7mm;
    }
    .label-full-page-primary .compliance-footer {
      margin-top: 0;
      padding-top: 1.1mm;
    }
    .label-full-page-primary .compliance-footer .profile-block {
      padding: 0.8mm 1mm;
    }
    .label-full-page-primary .compliance-footer .profile-row {
      font-size: 9px;
      line-height: 1.18;
    }
    .name-section {
      text-align: left;
      min-width: 0;
    }
    .name-section-compact {
      display: grid;
      gap: 0.25mm;
    }
    .name-section-compact .name-en {
      -webkit-line-clamp: 1;
    }
    .name-section-compact .name-zh {
      display: -webkit-box;
      -webkit-line-clamp: 1;
      -webkit-box-orient: vertical;
      overflow: hidden;
    }
    .name-en {
      font-weight: 800;
      font-size: ${layout.typography.titleSize};
      line-height: 1.08;
      color: #0f172a;
      word-wrap: break-word;
      overflow-wrap: break-word;
      display: -webkit-box;
      -webkit-line-clamp: 2;
      -webkit-box-orient: vertical;
      overflow: hidden;
    }
    .label-full-page-primary .name-en {
      font-size: 28px;
      line-height: 1.1;
      -webkit-line-clamp: 1;
    }
    .name-zh {
      font-size: calc(${layout.typography.titleSize} - 2px);
      color: #334155;
      margin-top: 0.5mm;
    }
    .label-full-page-primary .name-zh {
      font-size: 19px;
      line-height: 1.15;
    }
    .label-standard .name-en {
      font-size: max(${layout.typography.titleSize}, calc(${layout.typography.fontSize} + 2px));
      line-height: 1.05;
      -webkit-line-clamp: 1;
    }
    .label-standard.label-form-bottle .name-en,
    .label-standard.label-form-roomy .name-en {
      font-size: max(7.5px, calc(${layout.typography.titleSize} - 1px));
      line-height: 1.04;
      -webkit-line-clamp: 2;
      word-break: break-word;
      hyphens: auto;
    }
    .label-standard .name-zh {
      font-size: max(6px, calc(${layout.typography.fontSize} - 0.5px));
      line-height: 1.05;
      margin-top: 0.25mm;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }
    .cas {
      font-family: "Consolas", "Monaco", "Courier New", monospace;
      font-size: max(6px, calc(${layout.typography.fontSize} - 0.8px));
      color: #475569;
      margin-top: 0.65mm;
      white-space: nowrap;
    }
    .label-full-page-primary .cas {
      font-size: 16px;
      margin-top: 1.1mm;
    }
    .meta-ribbon {
      display: flex;
      flex-wrap: wrap;
      gap: 0.8mm;
      margin-top: 0.9mm;
      align-items: center;
    }
    .label-standard .meta-ribbon {
      gap: 0.45mm;
      margin-top: 0.45mm;
      flex-wrap: nowrap;
      overflow: hidden;
    }
    .meta-chip {
      display: inline-flex;
      align-items: center;
      gap: 0.7mm;
      min-width: 0;
      max-width: 100%;
      padding: 0.45mm 1.15mm;
      border-radius: 999px;
      border: 1px solid #dbe4ef;
      background: #f8fafc;
      color: #334155;
      font-size: calc(${layout.typography.fontSize} - 3px);
      line-height: 1.15;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }
    .label-standard .meta-chip {
      gap: 0.45mm;
      padding: 0.25mm 0.65mm;
      font-size: max(5.5px, calc(${layout.typography.fontSize} - 3px));
      line-height: 1.05;
    }
    .meta-chip-label {
      color: #64748b;
      font-weight: 600;
    }
    .meta-chip-value {
      min-width: 0;
      overflow: hidden;
      text-overflow: ellipsis;
    }
    .meta-chip-cas .meta-chip-value {
      font-family: "Consolas", "Monaco", "Courier New", monospace;
      overflow: visible;
      text-overflow: clip;
    }
    .meta-chip-prepared {
      background: #dbeafe;
      border-color: #93c5fd;
      color: #1d4ed8;
      font-weight: 700;
    }
    .meta-chip-prepared-detail {
      background: #eff6ff;
      border-color: #bfdbfe;
      color: #1e3a8a;
    }
    .support-chips {
      display: flex;
      flex-wrap: wrap;
      gap: 0.7mm;
      margin-top: 0.8mm;
    }
    .support-chip {
      display: inline-flex;
      align-items: center;
      border-radius: 999px;
      border: 1px solid #cbd5e1;
      background: #f8fafc;
      padding: 0.3mm 1.2mm;
      font-size: calc(${layout.typography.fontSize} - 3px);
      color: #475569;
      line-height: 1.2;
      max-width: 100%;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }
    .custom-fields {
      font-size: calc(${layout.typography.fontSize} - 2px);
      color: #64748b;
      margin-top: 0.6mm;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }
    .profile-block {
      margin-top: 0.8mm;
      padding: 0.6mm 0.8mm;
      border: 0.2mm solid #cbd5e1;
      background: #f8fafc;
      color: #1f2937;
      border-radius: 1mm;
    }
    .profile-block-compact {
      padding: 0.4mm 0.6mm;
    }
    .profile-row {
      font-size: calc(${layout.typography.fontSize} - 2px);
      line-height: 1.25;
    }
    .profile-org {
      font-weight: bold;
    }
    .profile-address {
      color: #475569;
    }
    .profile-label {
      color: #475569;
      font-weight: bold;
    }

    .prepared-badge {
      display: inline-block;
      font-size: calc(${layout.typography.fontSize} - 2px);
      font-weight: bold;
      color: #1e40af;
      background: #dbeafe;
      border: 1px solid #60a5fa;
      border-radius: 1.5mm;
      padding: 0.3mm 1.5mm;
      margin-top: 0.8mm;
    }
    .prepared-meta {
      margin-top: 0.8mm;
      font-size: calc(${layout.typography.fontSize} - 1px);
      line-height: 1.2;
      color: #1e3a8a;
    }
    .prepared-meta-row,
    .prepared-operational-row {
      display: block;
      word-break: break-word;
    }
    .prepared-label,
    .prepared-operational-label {
      font-weight: 600;
      margin-right: 0.8mm;
    }
    .prepared-label {
      color: #1e40af;
    }
    .prepared-value {
      color: #1e3a8a;
    }
    .prepared-note {
      margin-top: 1.2mm;
      padding: 0.8mm 1.2mm;
      font-size: calc(${layout.typography.fontSize} - 3px);
      line-height: 1.25;
      color: #1e3a8a;
      background: #eff6ff;
      border-left: 1.5px solid #60a5fa;
      border-radius: 0.5mm;
    }
    .prepared-operational {
      margin-top: 0.6mm;
      font-size: calc(${layout.typography.fontSize} - 2px);
      line-height: 1.2;
      color: #374151;
    }
    .prepared-operational-label {
      color: #4b5563;
    }
    .prepared-operational-value {
      color: #111827;
    }

    .pictograms {
      display: flex;
      flex-wrap: wrap;
      gap: 2mm;
      justify-content: center;
      align-items: center;
    }
    .pictograms img {
      width: ${layout.typography.imgSize};
      height: ${layout.typography.imgSize};
      object-fit: contain;
      background: #fff;
      border: 0;
      border-radius: 0;
    }
    .pictograms.compact img {
      width: calc(${layout.typography.imgSize} - 4px);
      height: calc(${layout.typography.imgSize} - 4px);
    }
    .pictograms-icon {
      display: grid;
      grid-template-columns: repeat(2, ${iconPictogramSize});
      justify-content: center;
      align-items: center;
      gap: 0.9mm;
    }
    .pictograms-icon img {
      width: ${iconPictogramSize};
      height: ${iconPictogramSize};
    }
    .pictograms-standard {
      display: grid;
      grid-template-columns: repeat(2, ${standardPictogramSize});
      justify-content: center;
      align-items: center;
      gap: ${standardPictogramGap};
    }
    .pictograms-standard img {
      width: ${standardPictogramSize};
      height: ${standardPictogramSize};
    }
    .pictograms.qr-pics {
      justify-content: flex-start;
      gap: 0.85mm;
    }
    .pictograms.qr-pics img {
      width: ${qrPictogramSize};
      height: ${qrPictogramSize};
    }
    .pictograms.compliance-pictograms {
      display: grid;
      grid-template-columns: repeat(2, minmax(16mm, 1fr));
      gap: 1.4mm;
      justify-items: center;
      align-items: center;
    }
    .label-full-page-primary .pictograms.compliance-pictograms {
      grid-template-columns: repeat(2, ${compliancePictogramSize});
      justify-content: center;
      gap: 2.8mm;
    }
    .pictograms.compliance-pictograms img {
      width: ${compliancePictogramSize};
      height: ${compliancePictogramSize};
    }
    .signal {
      display: inline-block;
      font-weight: bold;
      font-size: ${layout.typography.signalSize};
      padding: 1.2mm 3.6mm;
      border-radius: 1mm;
      text-align: center;
      margin: 1mm 0 0 0;
    }
    .signal.compact {
      font-size: calc(${layout.typography.signalSize} - 2px);
      padding: 1mm 3mm;
    }
    .signal.qr-signal {
      margin: 0 0 1mm 0;
      width: fit-content;
      font-size: calc(${layout.typography.signalSize} - 2px);
      padding: 0.8mm 2.2mm;
    }
    .signal.signal-inline {
      margin: 0;
      width: fit-content;
      font-size: calc(${layout.typography.signalSize} - 3px);
      padding: 0.55mm 1.8mm;
      border-radius: 999px;
    }
    .signal.compliance-signal {
      display: block;
      width: 100%;
      margin: 0;
      border-radius: 0.8mm;
      padding: 0.9mm 1.2mm;
      font-size: ${layout.typography.signalSize};
      line-height: 1.1;
    }
    .label-full-page-primary .signal.compliance-signal {
      font-size: ${layout.typography.signalSize};
      padding: 1.4mm 2mm;
    }
    .signal.danger {
      background: #fecaca;
      color: #b91c1c;
      border: 1.5px solid #dc2626;
    }
    .signal.warning {
      background: #fef08a;
      color: #a16207;
      border: 1.5px solid #ca8a04;
    }
    .signal-placeholder {
      height: 4mm;
    }
    .signal-stack {
      margin-top: 1.2mm;
    }

    .standard-grid {
      display: grid;
      grid-template-columns: minmax(0, ${standardRailColumn}) minmax(0, 1fr);
      gap: 1.35mm;
      width: 100%;
      min-height: 0;
      align-items: start;
    }
    .standard-grid-no-pics {
      grid-template-columns: minmax(0, 1fr);
    }
    .standard-rail {
      display: block;
      align-self: start;
      padding-right: 0.9mm;
      border-right: 1px solid #dbe4ef;
      min-width: 0;
    }
    .standard-main {
      display: flex;
      flex-direction: column;
      gap: 0.6mm;
      min-width: 0;
    }
    .standard-signal-row {
      display: flex;
      align-items: center;
      justify-content: flex-start;
      min-height: 0;
    }
    .standard-hazard-board {
      display: flex;
      flex-direction: column;
      justify-content: flex-start;
      gap: 0.55mm;
      min-width: 0;
    }
    .hazard-primary-list {
      display: flex;
      flex-direction: column;
      gap: 0.5mm;
    }
    .hazard-code-list {
      flex-direction: row;
      flex-wrap: wrap;
      align-items: center;
      gap: 0.45mm;
    }
    .hazard-primary-item {
      padding: 0.45mm 0.7mm;
      border-radius: 0.9mm;
      background: #fffaf5;
      border: 1px solid #fed7aa;
      color: #7c2d12;
      font-weight: 600;
      font-size: max(5.5px, calc(${layout.typography.hazardSize} - 1px));
      line-height: 1.08;
    }
    .hazard-more {
      padding: 0.35mm 0.6mm;
      border-radius: 0.9mm;
      border: 1px dashed #cbd5e1;
      background: #f8fafc;
      color: #475569;
      font-size: max(5px, calc(${layout.typography.hazardSize} - 1.5px));
      font-weight: 600;
      line-height: 1.05;
    }
    .hazard-item {
      margin-bottom: 0;
    }
    .hazard-code-only {
      min-width: 8mm;
      text-align: center;
      font-size: max(6.5px, calc(${layout.typography.hazardSize} - 0.5px));
      line-height: 1;
      padding: 0.45mm 0.9mm;
    }
    .no-hazard {
      color: #166534;
      font-weight: 600;
      text-align: center;
      padding: 3mm 0;
    }
    .no-hazard-text {
      color: #64748b;
      font-style: italic;
    }
    .precautions-compact {
      border-top: 1px dotted #cbd5e1;
      padding-top: 0.45mm;
      font-size: max(5px, calc(${layout.typography.hazardSize} - 1.5px));
      line-height: 1.08;
    }
    .label-full-page-primary .compliance-core {
      grid-template-columns: ${complianceAlertColumn} minmax(0, 1fr);
      gap: 2.4mm;
      min-height: 0;
    }
    .label-full-page-primary .section-label {
      font-size: 7.6px;
      margin-bottom: 0.45mm;
      letter-spacing: 0;
    }
    .label-full-page-primary .compliance-hazard-list {
      gap: 0.3mm;
    }
    .label-full-page-primary .compliance-precaution-list {
      display: block;
      column-count: ${layout.typography.complianceColumns};
      column-gap: 3.5mm;
    }
    .label-full-page-primary .compliance-statement {
      break-inside: avoid;
      page-break-inside: avoid;
      margin-bottom: var(--compliance-statement-gap, 0.42mm);
    }
    .label-full-page-primary .compliance-hazard-list .compliance-statement {
      grid-template-columns: minmax(var(--hazard-code-min, 10mm), var(--hazard-code-max, 14mm)) minmax(0, 1fr);
    }
    .label-full-page-primary .compliance-precaution-list .compliance-statement {
      display: grid;
      grid-template-columns: minmax(var(--precaution-code-min, 15mm), var(--precaution-code-max, 21mm)) minmax(0, 1fr);
      gap: var(--compliance-code-gap, 0.8mm);
    }
    .precaution-code {
      display: inline-block;
      font-family: "Consolas", "Monaco", "Courier New", monospace;
      font-size: calc(${layout.typography.hazardSize} - 1px);
      color: #1e3a8a;
      margin-right: 1.5mm;
    }
    .precaution-more {
      font-size: calc(${layout.typography.hazardSize} - 1px);
      color: #64748b;
      font-style: italic;
    }

    .qr-left {
      flex: 1;
      min-width: 0;
    }
    .qr-left-scan {
      display: flex;
      flex-direction: column;
      justify-content: space-between;
      gap: 1.2mm;
      padding-right: 1.8mm;
      border-right: 1px dashed #cbd5e1;
    }
    .qr-identity {
      display: flex;
      flex-direction: column;
      gap: 0.6mm;
    }
    .qr-priority-block {
      display: flex;
      flex-direction: column;
      gap: 0.9mm;
      padding: 1.2mm 1.4mm;
      border: 1px solid #e2e8f0;
      border-radius: 1.2mm;
      background: linear-gradient(180deg, #f8fafc 0%, #ffffff 100%);
    }
    .qr-hazard-list {
      display: flex;
      flex-direction: column;
      gap: 0.7mm;
    }
    .qr-hazard-chip {
      display: inline-flex;
      align-items: center;
      flex-wrap: wrap;
      font-size: calc(${layout.typography.hazardSize} - 1px);
      line-height: 1.2;
      color: #7c2d12;
      font-weight: 600;
      padding: 0.7mm 0.9mm;
      border-radius: 999px;
      background: #fff7ed;
      border: 1px solid #fed7aa;
    }
    .qr-hazard-summary {
      display: inline;
      margin-left: 0.7mm;
      color: #92400e;
      font-weight: 500;
    }
    .qr-hazard-more {
      width: fit-content;
      border-color: #dbe4ef;
      background: #ffffff;
    }
    .qr-no-hazard {
      font-size: calc(${layout.typography.hazardSize} - 1px);
    }
    .qr-support-row {
      display: flex;
      align-items: center;
      min-height: calc(${layout.typography.imgSize} - 6px);
      padding-top: 0.7mm;
      border-top: 1px dotted #dbe4ef;
    }
    .qr-right {
      width: ${layout.typography.qrBox};
      flex: 0 0 ${layout.typography.qrBox};
    }
    .qr-panel {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      gap: 1mm;
      padding-left: 0.5mm;
      text-align: center;
    }
    .qr-code-shell {
      width: ${layout.typography.qrBox};
      height: ${layout.typography.qrBox};
      padding: 1.5mm;
      border: 1px solid #cbd5e1;
      border-radius: 2mm;
      background: #fff;
      display: flex;
      align-items: center;
      justify-content: center;
      box-shadow: inset 0 0 0 0.5mm #f8fafc;
    }
    .qrcode-img {
      width: calc(${layout.typography.qrBox} - 3mm);
      height: calc(${layout.typography.qrBox} - 3mm);
    }
    .qr-hint {
      font-size: calc(${layout.typography.fontSize} - 3px);
      color: #475569;
      font-weight: 600;
      line-height: 1.2;
    }
    .label-standard.label-form-strip {
      padding: 1.6mm;
    }
    .label-standard.label-form-strip .label-top-standard {
      margin: -0.45mm -0.45mm 0.5mm -0.45mm;
      padding: 0.35mm 0.45mm 0.5mm 0.45mm;
    }
    .label-standard.label-form-strip .name-en {
      font-size: max(7px, calc(${layout.typography.fontSize} + 0.8px));
      line-height: 1;
    }
    .label-standard.label-form-strip .identity-density-medium .name-en {
      font-size: 6.5px;
    }
    .label-standard.label-form-strip .identity-density-high .name-en {
      font-size: 5.9px;
    }
    .label-standard.label-form-strip .cas,
    .label-qr.label-form-strip .cas {
      font-size: 6px;
      line-height: 1;
      margin-top: 0.25mm;
      white-space: nowrap;
      overflow: visible;
      text-overflow: clip;
    }
    .label-standard.label-form-strip .standard-grid {
      display: flex;
      flex-direction: column;
      gap: 0.85mm;
    }
    .label-standard.label-form-strip .standard-rail {
      padding: 0 0 0.45mm 0;
      border-right: 0;
      border-bottom: 1px solid #dbe4ef;
    }
    .label-standard.label-form-strip .pictograms-standard {
      grid-template-columns: repeat(4, ${standardPictogramSize});
      justify-content: flex-start;
      gap: 0.45mm;
    }
    .label-standard.label-form-strip .standard-main {
      gap: 0.38mm;
    }
    .label-standard.label-form-strip .standard-hazard-board,
    .label-standard.label-form-strip .hazard-primary-list {
      gap: 0.32mm;
    }
    .label-standard.label-form-strip .hazard-primary-item {
      padding: 0.28mm 0.45mm;
      font-size: 5.5px;
      line-height: 1.02;
    }
    .label-standard.label-form-strip .hazard-more,
    .label-standard.label-form-strip .precautions-compact,
    .label-standard.label-form-strip .precaution-more {
      font-size: 5px;
      line-height: 1.02;
    }
    .label-standard.label-form-strip .signal.signal-inline {
      font-size: 6px;
      padding: 0.35mm 1.2mm;
    }
    .label-icon.label-form-strip {
      padding: 1.25mm;
      gap: 0.3mm;
    }
    .label-icon.label-form-strip .label-top {
      padding-bottom: 0.35mm;
      margin-bottom: 0.35mm;
    }
    .label-icon.label-form-strip .name-section-compact {
      gap: 0.12mm;
    }
    .label-icon.label-form-strip .name-en {
      font-size: 7.2px;
      line-height: 1;
      -webkit-line-clamp: 1;
    }
    .label-icon.label-form-strip .identity-density-medium .name-en {
      font-size: 6.5px;
    }
    .label-icon.label-form-strip .identity-density-high .name-en {
      font-size: 5.9px;
    }
    .label-icon.label-form-strip .name-zh {
      font-size: 6px;
      line-height: 1;
      margin-top: 0;
    }
    .label-icon.label-form-strip .identity-density-medium .name-zh {
      font-size: 5.5px;
    }
    .label-icon.label-form-strip .identity-density-high .name-zh {
      font-size: 5px;
    }
    .label-icon.label-form-strip .cas {
      display: block;
      font-size: 5.6px;
      line-height: 1;
      margin-top: 0;
      white-space: nowrap;
      overflow: visible;
      text-overflow: clip;
    }
    .label-icon.label-form-strip .identity-density-medium .cas,
    .label-icon.label-form-strip .identity-density-high .cas {
      font-size: 5.2px;
    }
    .label-icon.label-form-strip .label-middle {
      flex: 1 1 auto;
      justify-content: center;
    }
    .label-icon.label-form-strip .pictograms-icon {
      grid-template-columns: repeat(4, ${iconPictogramSize});
      gap: 0.45mm;
    }
    .label-icon.label-form-strip .signal {
      margin: 0;
      padding: 0.25mm 1mm;
      border-radius: 0.6mm;
      font-size: 5.8px;
      line-height: 1;
    }
    .label-icon.label-form-compact .label-top {
      padding-bottom: 0.6mm;
      margin-bottom: 0.6mm;
    }
    .label-icon.label-form-compact .pictograms-icon {
      gap: 0.75mm;
    }
    .label-icon.label-form-compact .signal {
      margin-top: 0.5mm;
      padding: 0.45mm 1.4mm;
      font-size: max(6.2px, calc(${layout.typography.signalSize} - 4px));
    }
    .label-standard.label-form-roomy .standard-grid {
      gap: 2mm;
    }
    .label-standard.label-form-roomy .hazard-primary-item {
      font-size: max(8px, calc(${layout.typography.hazardSize} - 0.5px));
      line-height: 1.12;
    }
    .label-qr.label-form-strip {
      gap: 1mm;
      padding: 1.5mm;
    }
    .label-qr.label-form-strip .qr-left-scan {
      gap: 0.55mm;
      padding-right: 0.8mm;
    }
    .label-qr.label-form-strip .qr-identity,
    .label-qr.label-form-strip .name-section-compact {
      gap: 0.12mm;
    }
    .label-qr.label-form-strip .name-en {
      font-size: 7px;
      line-height: 1;
      -webkit-line-clamp: 1;
    }
    .label-qr.label-form-strip .identity-density-medium .name-en {
      font-size: 6.4px;
    }
    .label-qr.label-form-strip .identity-density-high .name-en {
      font-size: 5.8px;
    }
    .label-qr.label-form-strip .name-zh {
      font-size: 6.4px;
      line-height: 1;
      margin-top: 0;
    }
    .label-qr.label-form-strip .identity-density-medium .name-zh,
    .label-qr.label-form-strip .identity-density-high .name-zh {
      font-size: 5.4px;
    }
    .label-qr.label-form-strip .meta-ribbon {
      margin-top: 0.2mm;
      gap: 0.25mm;
      flex-wrap: wrap;
      overflow: visible;
    }
    .label-qr.label-form-strip .meta-chip {
      gap: 0.25mm;
      padding: 0.12mm 0.45mm;
      font-size: 5.2px;
      line-height: 1;
    }
    .label-standard.label-form-strip .meta-chip-cas,
    .label-qr.label-form-strip .meta-chip-cas {
      flex: 0 0 auto;
      max-width: none;
      overflow: visible;
      text-overflow: clip;
    }
    .label-standard.label-form-strip .meta-ribbon {
      flex-wrap: wrap;
      overflow: visible;
      gap: 0.25mm;
    }
    .label-form-strip .support-chips {
      gap: 0.25mm;
      margin-top: 0.2mm;
      overflow: visible;
    }
    .label-form-strip .support-chip {
      padding: 0.12mm 0.45mm;
      font-size: 5.1px;
      line-height: 1;
      white-space: normal;
      overflow: visible;
      text-overflow: clip;
      overflow-wrap: anywhere;
    }
    .label-qr.label-form-strip .qr-priority-block {
      gap: 0;
      padding: 0;
      border: 0;
      border-radius: 0;
      background: transparent;
    }
    .label-qr.label-form-strip .qr-hazard-chip {
      font-size: 5.5px;
      line-height: 1.05;
      padding: 0.25mm 0.55mm;
    }
    .label-qr.label-form-strip .qr-hazard-summary {
      display: none;
    }
    .label-qr.label-form-strip .qr-support-row {
      min-height: ${qrPictogramSize};
      padding-top: 0.35mm;
    }
    .label-qr.label-form-strip .qr-panel {
      gap: 0.45mm;
      padding-left: 0;
    }
    .label-qr.label-form-strip .signal.qr-signal {
      margin: 0;
      padding: 0.25mm 1mm;
      border-radius: 0.6mm;
      font-size: 5.6px;
      line-height: 1;
    }
    .label-qr.label-form-strip .qr-code-shell {
      padding: 1mm;
      border-radius: 1.2mm;
    }
    .label-qr.label-form-strip .qrcode-img {
      width: calc(${layout.typography.qrBox} - 2mm);
      height: calc(${layout.typography.qrBox} - 2mm);
    }
    .label-qr.label-form-strip .qr-hint {
      font-size: 5.5px;
      line-height: 1.05;
    }
    .label-qr.label-form-compact .qr-priority-block {
      padding: 0.8mm 1mm;
    }
    ${
      layout.colorMode === "bw"
        ? `body.print-bw .label,
          body.print-bw .label * {
            color: #111827 !important;
            text-shadow: none !important;
            box-shadow: none !important;
          }
          body.print-bw .label {
            background: #ffffff !important;
            border-color: #111827 !important;
          }
          body.print-bw .label-top-standard,
          body.print-bw .qr-priority-block,
          body.print-bw .profile-block,
          body.print-bw .support-chip,
          body.print-bw .meta-chip,
          body.print-bw .prepared-badge,
          body.print-bw .prepared-note,
          body.print-bw .hazard-primary-item,
          body.print-bw .hazard-more,
          body.print-bw .qr-hazard-chip,
          body.print-bw .profile-block-missing,
          body.print-bw .signal {
            background: #ffffff !important;
            border-color: #111827 !important;
          }
          body.print-bw .pictograms img,
          body.print-bw .qrcode-img {
            filter: grayscale(1) contrast(1.35);
          }`
        : ""
    }

    @media print {
      body {
        print-color-adjust: exact;
        -webkit-print-color-adjust: exact;
      }
      .label {
        break-inside: avoid;
        page-break-inside: avoid;
      }
    }
  `;
};

export function buildPrintDocument(
  selectedForLabel,
  labelConfig,
  customGHSSettings,
  customLabelFields = {},
  labelQuantities = {},
  labProfile = {},
) {
  const model = buildPrintDocumentModel(
    selectedForLabel,
    labelConfig,
    customGHSSettings,
    customLabelFields,
    labelQuantities,
    labProfile,
  );

  if (!model) return null;

  const renderer =
    TEMPLATE_RENDERERS[model.layout.template] || TEMPLATE_RENDERERS.standard;
  const pagesHtml = model.pages
    .map((pageLabels, pageIndex) => {
      const labelsHtml = pageLabels
        .map((chemical) => renderer(chemical, model))
        .join("");
      return `
        <div class="page">
          <div class="page-grid">${labelsHtml}</div>
          <div class="page-footer-note">${escapeHtml(model.t("trust.printFooter"))}</div>
          <div class="page-number">${escapeHtml(
            model.t("print.pageNumber", {
              current: pageIndex + 1,
              total: model.totalPages,
            }),
          )}</div>
        </div>
      `;
    })
    .join("");

  const styles = buildStyles(model);
  const bodyClass = [
    "print-body",
    `print-${model.layout.colorMode === "bw" ? "bw" : "color"}`,
    `print-purpose-${model.layout.labelPurpose}`,
  ].join(" ");
  const html = `<!DOCTYPE html><html><head><meta charset="UTF-8"><title>${escapeHtml(
    model.t("print.title"),
  )}</title><style>${styles}</style></head><body class="${bodyClass}">${pagesHtml}</body></html>`;

  return {
    html,
    styles,
    pagesHtml,
    model,
  };
}

function buildPreviewStyles(mode, model, options = {}) {
  const isLandscape = model.layout.orientation === "landscape";
  const pageWidthMm = model.layout.page.widthMm || (isLandscape ? 297 : 210);
  const pageHeightMm = model.layout.page.heightMm || (isLandscape ? 210 : 297);
  const sheetScale = isLandscape ? 0.28 : 0.24;
  const mmToPx = 3.78;
  const rawLabelWidthPx = model.layout.widthMm * mmToPx;
  const rawLabelHeightPx = model.layout.heightMm * mmToPx;
  const isFullPageLabelPreview =
    mode === "label" && isFullPagePrimaryLayout(model.layout);
  const previewZoom = options.previewZoom === "inspect" ? "inspect" : "fit";
  const maxLabelPreviewWidthPx =
    previewZoom === "inspect" ? 760 : isFullPageLabelPreview ? 300 : 420;
  const maxLabelPreviewHeightPx =
    previewZoom === "inspect" ? 640 : isFullPageLabelPreview ? 240 : 340;
  const maxLabelPreviewScale =
    previewZoom === "inspect" || isFullPageLabelPreview ? 1 : 2.2;
  const labelPreviewScale =
    mode === "label"
      ? Math.min(
          maxLabelPreviewScale,
          maxLabelPreviewWidthPx / rawLabelWidthPx,
          maxLabelPreviewHeightPx / rawLabelHeightPx,
        )
      : 1;
  const labelPreviewWidthPx = Math.ceil(
    rawLabelWidthPx * labelPreviewScale + 24,
  );
  const labelPreviewHeightPx = Math.ceil(
    rawLabelHeightPx * labelPreviewScale + 24,
  );
  const viewportWidthPx = Math.round(pageWidthMm * mmToPx * sheetScale);
  const viewportHeightPx = Math.round(pageHeightMm * mmToPx * sheetScale);
  const cardWidthPx =
    mode === "label" ? labelPreviewWidthPx : viewportWidthPx + 32;
  const cardHeightPx =
    mode === "label" ? labelPreviewHeightPx : viewportHeightPx + 40;
  const frameWidthPx = Math.ceil(cardWidthPx + 28);
  const frameHeightPx = Math.ceil(cardHeightPx + 32);

  const css = `
    body.preview-body {
      margin: 0;
      min-height: 0;
      background: #f8fafc;
      display: flex;
      align-items: flex-start;
      justify-content: center;
      padding: 8px;
    }
    body.preview-body-label {
      overflow: ${previewZoom === "inspect" ? "auto" : "hidden"};
    }
    body.preview-body-sheet {
      overflow: auto;
    }
    .preview-shell {
      width: 100%;
      display: flex;
      align-items: flex-start;
      justify-content: center;
    }
    body.preview-zoom-inspect .preview-shell {
      justify-content: flex-start;
    }
    .preview-card {
      background: #ffffff;
      border-radius: 5mm;
      box-shadow: 0 10px 30px rgba(15, 23, 42, 0.16);
      overflow: visible;
    }
    .preview-card-label {
      padding: 2.5mm;
      width: ${labelPreviewWidthPx}px;
      height: ${labelPreviewHeightPx}px;
      max-width: 100%;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    .preview-card-sheet {
      padding: 4mm;
      max-width: 100%;
    }
    .preview-sheet-viewport {
      width: ${viewportWidthPx}px;
      height: ${viewportHeightPx}px;
      max-width: 100%;
      overflow: hidden;
      background: #ffffff;
      border: 1px solid #dbe4ef;
      box-shadow: 0 12px 28px rgba(15, 23, 42, 0.16);
    }
    .preview-grid-scaler {
      transform: scale(${sheetScale});
      transform-origin: top left;
      width: ${pageWidthMm}mm;
      height: ${pageHeightMm}mm;
    }
    .preview-grid-shell {
      overflow: hidden;
      max-width: 100%;
    }
    .preview-page {
      width: ${pageWidthMm}mm;
      min-height: ${pageHeightMm}mm;
      page-break-after: auto;
    }
    .preview-label-scaler {
      width: ${Math.ceil(rawLabelWidthPx * labelPreviewScale)}px;
      height: ${Math.ceil(rawLabelHeightPx * labelPreviewScale)}px;
      position: relative;
      flex: 0 0 auto;
    }
    .preview-label-scaler > .label {
      transform: scale(${labelPreviewScale});
      transform-origin: top left;
    }
    .label-placeholder {
      border-style: dashed;
      border-color: #cbd5e1;
      background: repeating-linear-gradient(
        135deg,
        #f8fafc 0,
        #f8fafc 3mm,
        #e2e8f0 3mm,
        #e2e8f0 6mm
      );
      box-shadow: none;
    }
    ${
      mode === "label"
        ? `.preview-card-label .preview-label-scaler > .label {
             box-shadow: 0 16px 36px rgba(15, 23, 42, 0.18);
           }`
        : ""
    }
  `;

  return {
    css,
    metrics: {
      mode,
      previewZoom,
      cardWidthPx,
      cardHeightPx,
      frameWidthPx,
      frameHeightPx,
      labelPreviewScale,
      labelPreviewWidthPx,
      labelPreviewHeightPx,
      rawLabelWidthPx,
      rawLabelHeightPx,
      sheetScale,
      viewportWidthPx,
      viewportHeightPx,
    },
  };
}

export function buildPrintPreviewDocument(
  selectedForLabel,
  labelConfig,
  customGHSSettings,
  customLabelFields = {},
  labelQuantities = {},
  labProfile = {},
  options = {},
) {
  const mode = options.mode === "label" ? "label" : "sheet";
  const model = buildPrintDocumentModel(
    selectedForLabel,
    labelConfig,
    customGHSSettings,
    customLabelFields,
    labelQuantities,
    labProfile,
  );

  if (!model) return null;

  const renderer =
    TEMPLATE_RENDERERS[model.layout.template] || TEMPLATE_RENDERERS.standard;
  const previewStyles = buildPreviewStyles(mode, model, options);
  const sharedStyles = buildStyles(model);
  const selectedPageIndex = clampIndex(
    options.pageIndex,
    Math.max((model.totalPages || 1) - 1, 0),
  );
  const selectedLabelIndex = clampIndex(
    options.labelIndex ?? options.pageIndex,
    Math.max((model.expandedLabels?.length || 1) - 1, 0),
  );

  let fragmentHtml = "";
  if (mode === "label") {
    fragmentHtml = `<div class="preview-label-scaler">${renderer(
      model.expandedLabels[selectedLabelIndex] || model.expandedLabels[0],
      model,
    )}</div>`;
  } else {
    const firstPage = model.pages[selectedPageIndex] || model.pages[0] || [];
    const labelMarkup = firstPage
      .map((chemical) => renderer(chemical, model))
      .join("");
    const placeholderCount = Math.max(
      model.layout.page.perPage - firstPage.length,
      0,
    );
    const placeholders = Array.from(
      { length: placeholderCount },
      (_, index) => {
        return `<div class="label label-placeholder" aria-hidden="true" data-placeholder-index="${index}"></div>`;
      },
    ).join("");

    fragmentHtml = `
      <div class="preview-grid-shell">
        <div class="preview-sheet-viewport">
          <div class="preview-grid-scaler">
            <div class="page preview-page">
              <div class="page-grid">${labelMarkup}${placeholders}</div>
              <div class="page-footer-note">${escapeHtml(model.t("trust.printFooter"))}</div>
              <div class="page-number">${escapeHtml(
                model.t("print.pageNumber", {
                  current: selectedPageIndex + 1,
                  total: model.totalPages || 1,
                }),
              )}</div>
            </div>
          </div>
        </div>
      </div>
    `;
  }

  const bodyClass = [
    "preview-body",
    `preview-body-${mode}`,
    `preview-zoom-${previewStyles.metrics.previewZoom}`,
    `print-${model.layout.colorMode === "bw" ? "bw" : "color"}`,
    `print-purpose-${model.layout.labelPurpose}`,
  ].join(" ");
  const html = `<!DOCTYPE html><html><head><meta charset="UTF-8"><title>${escapeHtml(
    model.t("print.title"),
  )}</title><style>${sharedStyles}${previewStyles.css}</style></head><body class="${bodyClass}"><div class="preview-shell preview-shell-${mode}"><div class="preview-card preview-card-${mode}">${fragmentHtml}</div></div></body></html>`;

  return {
    html,
    fragmentHtml,
    model,
    mode,
    previewPageIndex: selectedPageIndex,
    previewLabelIndex: selectedLabelIndex,
    previewMetrics: previewStyles.metrics,
  };
}

const elementOverflows = (element, tolerancePx = 1) => {
  if (!element) return false;
  const scrollHeight = Math.ceil(element.scrollHeight || 0);
  const clientHeight = Math.ceil(element.clientHeight || 0);
  const scrollWidth = Math.ceil(element.scrollWidth || 0);
  const clientWidth = Math.ceil(element.clientWidth || 0);

  if (clientHeight > 0 && scrollHeight > clientHeight + tolerancePx) {
    return true;
  }

  return clientWidth > 0 && scrollWidth > clientWidth + tolerancePx;
};

export function inspectPrintLayoutDocument(documentLike) {
  const root = documentLike?.body || documentLike;
  if (!root?.querySelectorAll) return [];

  const issues = [];
  const labels = Array.from(
    root.querySelectorAll(".label:not(.label-placeholder)"),
  ).filter((element) => typeof element.querySelector === "function");

  labels.forEach((label, index) => {
    if (elementOverflows(label, 2)) {
      issues.push({ type: "label-overflow", index });
    }

    [
      [".compliance-core", "compliance-core-overflow"],
      [".compliance-alert-panel", "compliance-alert-overflow"],
      [".compliance-statements-panel", "compliance-statements-overflow"],
      [".compliance-hazard-panel", "compliance-hazards-overflow"],
      [".compliance-precaution-panel", "compliance-precautions-overflow"],
      [".pictograms.compliance-pictograms", "compliance-pictograms-overflow"],
      [".cas", "cas-overflow"],
      [".meta-chip-cas", "cas-chip-overflow"],
      [".meta-chip-cas .meta-chip-value", "cas-value-overflow"],
      [".support-chip", "support-chip-overflow"],
      [".custom-fields", "custom-fields-overflow"],
    ].forEach(([selector, type]) => {
      const element = label.querySelector(selector);
      if (elementOverflows(element, 2)) {
        issues.push({ type, index });
      }
    });

    const footer = label.querySelector(".compliance-footer");
    if (
      footer &&
      label.clientHeight > 0 &&
      footer.offsetTop + footer.offsetHeight > label.clientHeight + 2
    ) {
      issues.push({ type: "compliance-footer-clipped", index });
    }
  });

  Array.from(root.querySelectorAll(".statement-code"))
    .filter((element) => "scrollWidth" in element || "scrollHeight" in element)
    .forEach((code, index) => {
      if (elementOverflows(code, 1)) {
        issues.push({ type: "statement-code-overflow", index });
      }
    });

  return issues;
}

function buildPrintLifecycleMeta(documentBundle) {
  const model = documentBundle?.model;
  if (!model) return {};
  const layout = model.layout || {};
  const casNumbers = [
    ...new Set(
      (model.selectedForLabel || model.expandedLabels || [])
        .map((chemical) => chemical?.cas_number)
        .filter(Boolean),
    ),
  ];

  return {
    template: layout.template,
    labelPurpose: layout.labelPurpose,
    stockPreset: layout.stockId || layout.stockPresetName,
    stockPresetName: layout.stockPresetName || layout.stock?.name,
    orientation: layout.orientation,
    size: layout.size,
    pageSize: layout.pageSize || layout.page?.size,
    labelWidthMm: layout.widthMm || layout.labelWidthMm,
    labelHeightMm: layout.heightMm || layout.labelHeightMm,
    colorMode: layout.colorMode,
    nameDisplay: layout.nameDisplay,
    casNumbers,
    totalLabels: model.expandedLabels.length,
    totalPages: model.totalPages,
    totalChemicals: model.selectedForLabel.length,
  };
}

function isPrintHandoffQaMode() {
  if (typeof window === "undefined") return false;
  try {
    return (
      new URLSearchParams(window.location.search).get(PRINT_QA_HANDOFF_PARAM) ===
      "1"
    );
  } catch (_) {
    return false;
  }
}

function resolvePrintQaLabelKind(layout) {
  return isCompletePrimaryTemplate(layout)
    ? "complete-primary"
    : isQrSupplementLayout(layout)
      ? "qr-supplement"
      : isQuickIdLayout(layout)
        ? "quick-id"
        : "supplemental";
}

function upsertPrintQaStatusElement() {
  if (typeof document === "undefined") return null;

  let statusElement = document.getElementById("ghs-print-qa-status");
  if (!statusElement) {
    statusElement = document.createElement("div");
    statusElement.id = "ghs-print-qa-status";
    if (typeof statusElement.setAttribute === "function") {
      statusElement.setAttribute("data-testid", "print-qa-status");
      statusElement.setAttribute("aria-live", "polite");
    }
    if (statusElement.style) {
      statusElement.style.cssText =
        "position:fixed;left:0;bottom:0;z-index:2147483647;width:1px;height:1px;overflow:hidden;opacity:0.01;pointer-events:none;";
    }
    document.body.appendChild(statusElement);
  }

  return statusElement;
}

function publishPrintQaStatus(status, message) {
  const nextStatus = {
    ...status,
    updatedAt: new Date().toISOString(),
  };

  if (typeof window !== "undefined") {
    window.__GHS_PRINT_QA_LAST_HANDOFF__ = nextStatus;
  }

  const statusElement = upsertPrintQaStatusElement();
  if (!statusElement) return nextStatus;

  if (statusElement.dataset) {
    statusElement.dataset.status = nextStatus.status || "";
    statusElement.dataset.labelKind = nextStatus.labelKind || "";
    statusElement.dataset.pictograms = (nextStatus.pictogramCodes || []).join(",");
    statusElement.dataset.hasQr = String(Boolean(nextStatus.hasQr));
    statusElement.dataset.casNumbers = (nextStatus.casNumbers || []).join(",");
    statusElement.dataset.hasCas = String(Boolean(nextStatus.hasCas));
    statusElement.dataset.labelWidthMm =
      nextStatus.labelWidthMm == null ? "" : String(nextStatus.labelWidthMm);
    statusElement.dataset.labelHeightMm =
      nextStatus.labelHeightMm == null ? "" : String(nextStatus.labelHeightMm);
    statusElement.dataset.pageSize = nextStatus.pageSize || "";
    statusElement.dataset.colorMode = nextStatus.colorMode || "";
    statusElement.dataset.nameDisplay = nextStatus.nameDisplay || "";
    statusElement.dataset.totalLabels = String(nextStatus.totalLabels || 0);
    statusElement.dataset.totalPages = String(nextStatus.totalPages || 0);
    statusElement.dataset.template = nextStatus.template || "";
    statusElement.dataset.stockPreset = nextStatus.stockPreset || "";
    statusElement.dataset.issueTypes = (nextStatus.issueTypes || []).join(",");
    statusElement.dataset.supportChips = (
      nextStatus.supportChipTexts || []
    ).join("|");
    statusElement.dataset.updatedAt = nextStatus.updatedAt;
  }
  statusElement.textContent = message;

  return nextStatus;
}

function publishPrintPendingQaStatus(documentBundle) {
  const lifecycleMeta = buildPrintLifecycleMeta(documentBundle);
  return publishPrintQaStatus(
    {
      ...lifecycleMeta,
      status: "pending",
      labelKind: resolvePrintQaLabelKind(documentBundle.model.layout),
      pictogramCodes: [],
      hasQr: false,
      hasCas: false,
    },
    "Print handoff pending",
  );
}

function publishPrintBlockedQaStatus(documentBundle, preflightIssues) {
  const lifecycleMeta = buildPrintLifecycleMeta(documentBundle);
  const issueTypes = [
    ...new Set(preflightIssues.map((issue) => issue.type).filter(Boolean)),
  ];
  return publishPrintQaStatus(
    {
      ...lifecycleMeta,
      status: "blocked",
      labelKind: resolvePrintQaLabelKind(documentBundle.model.layout),
      pictogramCodes: [],
      hasQr: false,
      hasCas: false,
      issueTypes,
    },
    `Print handoff blocked: ${issueTypes.join(",")}`,
  );
}

function getPrintQaDocumentText(documentBundle, iframeDoc) {
  return [
    iframeDoc?.body?.innerText,
    iframeDoc?.body?.textContent,
    iframeDoc?.documentElement?.textContent,
    documentBundle?.pagesHtml,
    documentBundle?.html,
  ]
    .filter(Boolean)
    .join("\n");
}

function buildLayoutBlockedAlert(lifecycleMeta, preflightIssues) {
  const stock =
    lifecycleMeta.stockPresetName || lifecycleMeta.stockPreset || "current stock";
  const size =
    lifecycleMeta.labelWidthMm && lifecycleMeta.labelHeightMm
      ? `${lifecycleMeta.labelWidthMm} x ${lifecycleMeta.labelHeightMm} mm`
      : "";
  const issueTypes = [
    ...new Set(preflightIssues.map((issue) => issue.type).filter(Boolean)),
  ].join(", ");

  return i18n.t("print.layoutBlockedDetailed", {
    stock,
    size,
    issueTypes,
    defaultValue:
      "This label content is overflowing or clipped on {{stock}} ({{size}}). Keep GHS pictograms and CAS visible; choose A4/Letter Primary or a larger truthful stock before printing. QR supplement is not a substitute for a complete primary label. Layout check: {{issueTypes}}",
  });
}

function publishPrintHandoffQaStatus(documentBundle, iframeDoc, lifecycleMeta) {
  const imageAlts = Array.from(iframeDoc.querySelectorAll("img"))
    .map((img) => img.getAttribute?.("alt") || img.alt || "")
    .filter(Boolean);
  const pictogramCodes = [
    ...new Set(imageAlts.filter((alt) => /^GHS\d{2}$/.test(alt))),
  ];
  const documentText = getPrintQaDocumentText(documentBundle, iframeDoc);
  const supportChipTexts = Array.from(
    iframeDoc.querySelectorAll(".support-chip"),
  )
    .map((chip) => (chip.textContent || "").trim())
    .filter(Boolean);
  const casNumbers = lifecycleMeta.casNumbers || [];
  const hasCas =
    casNumbers.length === 0 ||
    casNumbers.every((casNumber) => documentText.includes(casNumber));
  const status = {
    ...lifecycleMeta,
    status: "qa_handoff",
    labelKind: resolvePrintQaLabelKind(documentBundle.model.layout),
    pictogramCodes,
    supportChipTexts,
    hasQr: imageAlts.some((alt) => /qr/i.test(alt)),
    hasCas,
  };

  return publishPrintQaStatus(
    status,
    `Print handoff ready: ${status.labelKind}; ${pictogramCodes.join(",")}`,
  );
}

export function printLabels(
  selectedForLabel,
  labelConfig,
  customGHSSettings,
  customLabelFields = {},
  labelQuantities = {},
  labProfile = {},
  lifecycleCallbacks = {},
) {
  const documentBundle = buildPrintDocument(
    selectedForLabel,
    labelConfig,
    customGHSSettings,
    customLabelFields,
    labelQuantities,
    labProfile,
  );

  if (!documentBundle) return;
  if (isPrintHandoffQaMode()) {
    publishPrintPendingQaStatus(documentBundle);
  }

  const existingFrame = document.getElementById("ghs-print-frame");
  if (existingFrame) existingFrame.remove();

  const iframe = document.createElement("iframe");
  iframe.id = "ghs-print-frame";
  iframe.style.cssText =
    "position:fixed;right:0;bottom:0;width:0;height:0;border:none;opacity:0;pointer-events:none;";
  document.body.appendChild(iframe);

  const iframeDoc = iframe.contentDocument || iframe.contentWindow.document;
  iframeDoc.open();
  iframeDoc.write(documentBundle.html);
  iframeDoc.close();

  const images = iframeDoc.querySelectorAll("img");
  let loaded = 0;
  const total = images.length;
  const imageLoadIssues = [];
  const handledImages = new Set();
  let imageLoadTimeout = null;
  let preflightTriggered = false;
  let handoffNotified = false;

  const notifyPrintHandoff = (lifecycleMeta) => {
    if (
      handoffNotified ||
      !lifecycleCallbacks ||
      typeof lifecycleCallbacks.onPrintHandoff !== "function"
    ) {
      return;
    }
    handoffNotified = true;
    try {
      lifecycleCallbacks.onPrintHandoff(lifecycleMeta);
    } catch (_) {
      // Print handoff must not fail because recent-job persistence failed.
    }
  };

  const triggerPrint = () => {
    if (preflightTriggered) return;
    preflightTriggered = true;
    if (imageLoadTimeout) {
      clearTimeout(imageLoadTimeout);
      imageLoadTimeout = null;
    }

    const contentIssues = inspectPrintContentFit(documentBundle.model);
    const layoutIssues = inspectPrintLayoutDocument(iframeDoc);
    const preflightIssues = [
      ...contentIssues,
      ...layoutIssues,
      ...imageLoadIssues,
    ];
    if (preflightIssues.length > 0) {
      const lifecycleMeta = buildPrintLifecycleMeta(documentBundle);
      if (isPrintHandoffQaMode()) {
        publishPrintBlockedQaStatus(documentBundle, preflightIssues);
      }
      recordObservabilityEvent("print_blocked", {
        status: "blocked",
        count: lifecycleMeta.totalLabels || 1,
        meta: {
          ...lifecycleMeta,
          issueCount: preflightIssues.length,
          issueTypes: [...new Set(preflightIssues.map((issue) => issue.type))],
        },
      });
      if (
        !isPrintHandoffQaMode() &&
        typeof window !== "undefined" &&
        typeof window.alert === "function"
      ) {
        const hasRequiredImageFailure = preflightIssues.some(
          (issue) => issue.type === "required-image-failed",
        );
        window.alert(
          hasRequiredImageFailure
            ? i18n.t("print.imageBlocked", {
                defaultValue:
                  "Required label images did not load. Check your network and try again before printing.",
              })
            : buildLayoutBlockedAlert(lifecycleMeta, preflightIssues),
        );
      }
      iframe.remove();
      return;
    }

    setTimeout(() => {
      iframe.contentWindow.focus();
      const lifecycleMeta = buildPrintLifecycleMeta(documentBundle);
      recordObservabilityEvent("print_start", {
        status: "started",
        count: lifecycleMeta.totalLabels || 1,
        meta: lifecycleMeta,
      });
      notifyPrintHandoff(lifecycleMeta);

      let removed = false;
      const cleanup = (reason = "afterprint") => {
        if (removed) return;
        removed = true;
        recordObservabilityEvent("print_complete", {
          status: reason,
          count: lifecycleMeta.totalLabels || 1,
          meta: {
            ...lifecycleMeta,
            completionReason: reason,
          },
        });
        iframe.remove();
      };

      try {
        iframe.contentWindow.addEventListener(
          "afterprint",
          () => cleanup("afterprint"),
          {
            once: true,
          },
        );
      } catch (_) {
        // Embedded webviews may not support afterprint on iframe windows.
      }

      if (isPrintHandoffQaMode()) {
        const qaStatus = publishPrintHandoffQaStatus(
          documentBundle,
          iframeDoc,
          lifecycleMeta,
        );
        recordObservabilityEvent("print_handoff_qa", {
          status: "qa_handoff",
          count: lifecycleMeta.totalLabels || 1,
          meta: {
            ...lifecycleMeta,
            labelKind: qaStatus.labelKind,
            pictogramCodes: qaStatus.pictogramCodes,
            supportChipTexts: qaStatus.supportChipTexts,
            hasQr: qaStatus.hasQr,
            casNumbers: qaStatus.casNumbers,
            hasCas: qaStatus.hasCas,
          },
        });
        cleanup("qa_handoff");
        return;
      }

      setTimeout(() => cleanup("cleanup_timeout"), 60000);
      iframe.contentWindow.print();
    }, 300);
  };

  if (total === 0) {
    triggerPrint();
    return;
  }

  const finishImage = (img, reason) => {
    if (handledImages.has(img)) return;
    handledImages.add(img);

    if (reason || isImageLoadFailure(img)) {
      const imageKind = getRequiredPrintImageKind(img);
      if (imageKind) {
        imageLoadIssues.push(
          buildRequiredImageIssue(img, reason || "natural-width-zero"),
        );
      }
    }

    loaded += 1;
    if (loaded === total) triggerPrint();
  };

  imageLoadTimeout = setTimeout(() => {
    images.forEach((img) => finishImage(img, "load-timeout"));
  }, REQUIRED_PRINT_IMAGE_TIMEOUT_MS);

  images.forEach((img) => {
    if (img.complete) {
      finishImage(img, "");
    } else {
      img.onload = () => finishImage(img, "");
      img.onerror = () => finishImage(img, "load-error");
    }
  });
}
