import { GHS_IMAGES } from "@/constants/ghs";
import { resolvePrintLayoutConfig } from "@/constants/labelStocks";
import i18n from "@/i18n";
import { recordObservabilityEvent } from "@/utils/observability";
import {
  buildPrintLabelContent,
} from "@/utils/printContentModel";
import { inspectPrintContentFit } from "@/utils/printFitEngine";
import { getPreferredQrTarget } from "@/utils/sdsLinks";
import {
  getLocalizedSignalWord,
  getLocalizedStatementText,
  resolveLabelContentLocale,
} from "@/utils/ghsText";

const ALLOWED_TEMPLATES = new Set(["icon", "standard", "full", "qrcode"]);

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
  return `https://api.qrserver.com/v1/create-qr-code/?size=${size}x${size}&data=${encodeURIComponent(
    text,
  )}`;
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

const chunk = (items, size) => {
  const chunks = [];
  for (let index = 0; index < items.length; index += size) {
    chunks.push(items.slice(index, index + size));
  }
  return chunks;
};

const normalizeTemplate = (template) =>
  ALLOWED_TEMPLATES.has(template) ? template : "standard";

const resolveModelContentLocale = (model) =>
  resolveLabelContentLocale(model.layout?.nameDisplay, i18n.language);

const getLocalizedTextForModel = (statement, model) =>
  getLocalizedStatementText(statement, resolveModelContentLocale(model));

const getSignalWordForModel = (classification, model) =>
  getLocalizedSignalWord(classification, resolveModelContentLocale(model));

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
    (layout.widthMm >= 170 && layout.heightMm >= 200));

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
  const pages = chunk(expandedLabels, layout.page.perPage);

  return {
    t,
    layout,
    selectedForLabel,
    customGHSSettings,
    customLabelFields,
    labelQuantities,
    resolvedLabProfile: resolveLabProfile(customLabelFields, labProfile),
    expandedLabels,
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
  const nameDisplay = model.layout.nameDisplay || "both";
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

  return `<div class="name-section${compactNames ? " name-section-compact" : ""}">
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
          )}" />`,
      )
      .join("")}
  </div>`;
};

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

const renderMoreHazards = (count, model, className = "") => {
  if (count <= 0) return "";
  return `<div class="hazard-more${className ? ` ${className}` : ""}">${escapeHtml(
    model.t("print.moreHazardsShort", { count }),
  )}</div>`;
};

const renderPurposeNotice = (model) => {
  if (model.layout.labelPurpose === "shipping") return "";

  const key =
    model.layout.labelPurpose === "qrSupplement"
      ? "print.qrSupplementNotice"
      : "print.quickIdNotice";
  return `<div class="purpose-notice">${escapeHtml(model.t(key))}</div>`;
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

const renderComplianceFooter = (effectiveChem, model) => {
  const qrTarget =
    getPreferredQrTarget(
      effectiveChem.cid,
      effectiveChem.cas_number,
      effectiveChem.reference_links,
    ) || "https://pubchem.ncbi.nlm.nih.gov/";
  const hasProfile =
    model.resolvedLabProfile.organization ||
    model.resolvedLabProfile.phone ||
    model.resolvedLabProfile.address;

  return `<div class="compliance-footer">
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
    <div class="compliance-qr">
      <img class="qrcode-img qrcode-img-small" src="${getQRCodeUrl(qrTarget, 120)}" alt="QR" />
      <div class="qr-hint">${escapeHtml(model.t("print.scanForDetail"))}</div>
    </div>
  </div>`;
};

const renderCompactPrecautions = (precautions, maxPrecautions, model) => {
  if (!precautions.length || maxPrecautions <= 0) return "";
  return `<div class="precautions-compact">
    ${precautions
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

const getLabelContentForRender = (chemical, model) =>
  buildPrintLabelContent(chemical, {
    customGHSSettings: model.customGHSSettings,
    resolvedLabProfile: model.resolvedLabProfile,
    layout: model.layout,
  });

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
    <div class="label label-icon${prepared ? " label-prepared" : ""}">
      ${renderPurposeNotice(model)}
      <div class="label-top">
        ${renderNameSection(effectiveChem, model, {
          compactNames: true,
          showProfile: false,
          showCustomFields: false,
        })}
        ${prepared ? renderPreparedBadge(model) + renderPreparedMeta(effectiveChem, model) : ""}
      </div>
      <div class="label-middle">
        ${
          pictograms.length > 0
            ? renderPictograms(pictograms)
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
  const primaryHazards = hazards.slice(0, budgets.primaryHazards);
  const omittedHazards = Math.max(0, hazards.length - primaryHazards.length);
  const prepared = isPrepared(effectiveChem);

  return `
    <div class="label label-standard${prepared ? " label-prepared" : ""}">
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
                ? `<div class="hazard-primary-list">
                    ${primaryHazards
                      .map((hazard) =>
                        renderHazardStatement(
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
  const {
    effectiveChemical: effectiveChem,
    pictograms,
    hazardStatements: hazards,
    precautionaryStatements: precautions,
  } = getLabelContentForRender(chemical, model);
  const signalWord = getSignalWordForModel(effectiveChem, model);
  const signalClass =
    effectiveChem.signal_word === "Danger" ? "danger" : "warning";
  const hazardTier = getHazardFontTier(
    hazards.length + precautions.length,
    model.layout.size,
  );
  const prepared = isPrepared(effectiveChem);
  const purposeNotice = renderPurposeNotice(model);
  const isFullPagePrimary = isFullPagePrimaryLayout(model.layout);

  return `
    <div class="label label-full label-compliance label-purpose-${escapeHtml(model.layout.labelPurpose)}${isFullPagePrimary ? " label-a4-primary" : ""}${prepared ? " label-prepared" : ""}">
      <div class="compliance-header">
        ${renderNameSection(effectiveChem, model)}
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
        <div class="compliance-hazard-panel" style="font-size:${hazardTier.fontSize};line-height:${hazardTier.lineHeight}">
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
        </div>
      </div>
      <div class="compliance-precaution-panel" style="font-size:${hazardTier.fontSize};line-height:${hazardTier.lineHeight}">
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
  const hazardTeasers = hazards.slice(0, budgets.hazardTeasers);
  const omittedHazards = Math.max(0, hazards.length - hazardTeasers.length);

  return `
    <div class="label label-qr${prepared ? " label-prepared" : ""}">
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
          })}
        </div>
        <div class="qr-priority-block">
          ${signalWord ? renderSignal(signalWord, signalClass, "qr-signal") : ""}
          ${
            hazardTeasers.length > 0
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
        ${
          pictograms.length > 0
            ? `<div class="qr-support-row">${renderPictograms(pictograms, "qr-pics")}</div>`
            : ""
        }
      </div>
      <div class="qr-right qr-panel">
        <div class="qr-code-shell">
          <img class="qrcode-img" src="${getQRCodeUrl(qrTarget, 200)}" alt="QR" />
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
  const compliancePictogramSize =
    isFullPagePrimary
      ? "34mm"
      : layout.size === "large"
        ? "20mm"
        : layout.size === "medium"
          ? "16mm"
          : "12mm";
  const complianceAlertColumn =
    isFullPagePrimary
      ? "minmax(82mm, 88mm)"
      : layout.size === "large"
      ? "minmax(38mm, 43mm)"
      : layout.size === "medium"
        ? "minmax(28mm, 34mm)"
        : "minmax(20mm, 24mm)";

  return `
    @page {
      size: A4${isLandscape ? " landscape" : ""};
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
    .label-a4-primary {
      display: grid;
      grid-template-rows: auto auto 1fr auto;
      gap: 2.4mm;
      padding: 6mm;
      border-width: 0.8mm;
      border-radius: 1.2mm;
      overflow: hidden;
    }
    .label-qr {
      flex-direction: row;
      gap: 2mm;
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
    .label-a4-primary .compliance-header {
      padding-bottom: 2mm;
    }
    .compliance-header .profile-block,
    .compliance-header .custom-fields {
      display: none;
    }
    .purpose-notice {
      border: 0.25mm solid #94a3b8;
      background: #f8fafc;
      color: #334155;
      font-size: calc(${layout.typography.fontSize} - 3px);
      font-weight: 700;
      line-height: 1.2;
      padding: 0.65mm 0.9mm;
    }
    .compliance-core {
      display: grid;
      grid-template-columns: ${complianceAlertColumn} minmax(0, 1fr);
      gap: 2.2mm;
      align-items: start;
      min-height: 0;
    }
    .compliance-alert-panel {
      display: flex;
      flex-direction: column;
      gap: 1.2mm;
      align-items: stretch;
      min-width: 0;
    }
    .label-a4-primary .compliance-alert-panel {
      border: 0.25mm solid #dbe4ef;
      border-radius: 1.2mm;
      padding: 3mm;
      background: #f8fafc;
      gap: 3mm;
    }
    .compliance-hazard-panel,
    .compliance-precaution-panel {
      min-width: 0;
      overflow: visible;
    }
    .compliance-precaution-panel {
      border-top: 0.25mm solid #cbd5e1;
      padding-top: 0.8mm;
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
      gap: 1.1mm;
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
    .label-a4-primary .compliance-footer {
      margin-top: 0;
      padding-top: 1.6mm;
    }
    .label-a4-primary .compliance-footer .profile-block {
      padding: 1mm 1.2mm;
    }
    .label-a4-primary .compliance-footer .profile-row {
      font-size: 10px;
      line-height: 1.25;
    }
    .compliance-qr {
      width: 18mm;
      text-align: center;
    }
    .label-a4-primary .compliance-qr {
      width: 24mm;
    }
    .qrcode-img-small {
      width: 15mm;
      height: 15mm;
    }
    .label-a4-primary .qrcode-img-small {
      width: 20mm;
      height: 20mm;
    }

    .name-section {
      text-align: left;
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
      font-weight: bold;
      font-size: ${layout.typography.titleSize};
      line-height: 1.2;
      color: #0f172a;
      word-wrap: break-word;
      overflow-wrap: break-word;
      display: -webkit-box;
      -webkit-line-clamp: 2;
      -webkit-box-orient: vertical;
      overflow: hidden;
    }
    .label-a4-primary .name-en {
      font-size: 24px;
      line-height: 1.1;
      -webkit-line-clamp: 1;
    }
    .name-zh {
      font-size: calc(${layout.typography.titleSize} - 2px);
      color: #334155;
      margin-top: 0.5mm;
    }
    .label-a4-primary .name-zh {
      font-size: 18px;
      line-height: 1.15;
    }
    .cas {
      font-family: "Consolas", "Monaco", "Courier New", monospace;
      font-size: calc(${layout.typography.fontSize} - 1px);
      color: #475569;
      margin-top: 0.8mm;
    }
    .label-a4-primary .cas {
      font-size: 15px;
      margin-top: 1.1mm;
    }
    .meta-ribbon {
      display: flex;
      flex-wrap: wrap;
      gap: 0.8mm;
      margin-top: 0.9mm;
      align-items: center;
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
    .pictograms-standard {
      justify-content: flex-start;
      gap: 1.3mm;
    }
    .pictograms.qr-pics {
      justify-content: flex-start;
      gap: 1.2mm;
    }
    .pictograms.qr-pics img {
      width: calc(${layout.typography.imgSize} - 6px);
      height: calc(${layout.typography.imgSize} - 6px);
    }
    .pictograms.compliance-pictograms {
      display: grid;
      grid-template-columns: repeat(2, minmax(16mm, 1fr));
      gap: 1.4mm;
      justify-items: center;
      align-items: center;
    }
    .label-a4-primary .pictograms.compliance-pictograms {
      grid-template-columns: repeat(2, 34mm);
      justify-content: center;
      gap: 4mm;
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
    .label-a4-primary .signal.compliance-signal {
      font-size: 20px;
      padding: 2mm 2.4mm;
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
      grid-template-columns: minmax(0, 14mm) minmax(0, 1fr);
      gap: 2mm;
      width: 100%;
      min-height: 0;
    }
    .standard-grid-no-pics {
      grid-template-columns: minmax(0, 1fr);
    }
    .standard-rail {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: flex-start;
      gap: 0.8mm;
      padding-right: 1.1mm;
      border-right: 1px solid #dbe4ef;
      min-width: 0;
    }
    .standard-main {
      display: flex;
      flex-direction: column;
      gap: 0.9mm;
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
      gap: 0.9mm;
      min-width: 0;
    }
    .hazard-primary-list {
      display: flex;
      flex-direction: column;
      gap: 0.8mm;
    }
    .hazard-primary-item {
      padding: 0.75mm 1mm;
      border-radius: 1.2mm;
      background: #fffaf5;
      border: 1px solid #fed7aa;
      color: #7c2d12;
      font-weight: 600;
      line-height: 1.18;
    }
    .hazard-more {
      padding: 0.55mm 0.9mm;
      border-radius: 1.2mm;
      border: 1px dashed #cbd5e1;
      background: #f8fafc;
      color: #475569;
      font-size: calc(${layout.typography.hazardSize} - 1px);
      font-weight: 600;
      line-height: 1.2;
    }
    .hazard-item {
      margin-bottom: 0;
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
      padding-top: 0.8mm;
      line-height: 1.35;
    }
    .label-a4-primary .compliance-core {
      grid-template-columns: ${complianceAlertColumn} minmax(0, 1fr);
      gap: 5mm;
    }
    .label-a4-primary .compliance-hazard-panel,
    .label-a4-primary .compliance-precaution-panel {
      font-size: 9px !important;
      line-height: 1.18 !important;
    }
    .label-a4-primary .section-label {
      font-size: 10px;
      margin-bottom: 1mm;
      letter-spacing: 0;
    }
    .label-a4-primary .compliance-hazard-list {
      gap: 0.8mm;
    }
    .label-a4-primary .compliance-precaution-list {
      display: block;
      column-count: 2;
      column-gap: 5mm;
    }
    .label-a4-primary .compliance-statement {
      break-inside: avoid;
      page-break-inside: avoid;
      margin-bottom: 0.65mm;
    }
    .label-a4-primary .compliance-precaution-list .compliance-statement {
      display: grid;
      grid-template-columns: minmax(20mm, 27mm) minmax(0, 1fr);
      gap: 1.2mm;
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
          body.print-bw .purpose-notice,
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

function buildPreviewStyles(mode, model) {
  const isLandscape = model.layout.orientation === "landscape";
  const pageWidthMm = isLandscape ? 297 : 210;
  const pageHeightMm = isLandscape ? 210 : 297;
  const sheetScale = isLandscape ? 0.28 : 0.24;
  const mmToPx = 3.78;
  const rawLabelWidthPx = model.layout.widthMm * mmToPx;
  const rawLabelHeightPx = model.layout.heightMm * mmToPx;
  const labelPreviewScale =
    mode === "label"
      ? Math.min(1, 620 / rawLabelWidthPx, 390 / rawLabelHeightPx)
      : 1;
  const labelPreviewWidthPx = Math.ceil(
    rawLabelWidthPx * labelPreviewScale + 24,
  );
  const labelPreviewHeightPx = Math.ceil(
    rawLabelHeightPx * labelPreviewScale + 24,
  );
  const viewportWidthPx = Math.round(pageWidthMm * mmToPx * sheetScale);
  const viewportHeightPx = Math.round(pageHeightMm * mmToPx * sheetScale);

  return `
    body.preview-body {
      margin: 0;
      min-height: 100vh;
      background: #f8fafc;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 10px;
    }
    .preview-shell {
      width: 100%;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    .preview-card {
      background: #ffffff;
      border-radius: 5mm;
      box-shadow: 0 10px 30px rgba(15, 23, 42, 0.16);
      overflow: hidden;
    }
    .preview-card-label {
      padding: 3mm;
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
  const previewStyles = buildPreviewStyles(mode, model);
  const sharedStyles = buildStyles(model);

  let fragmentHtml = "";
  if (mode === "label") {
    fragmentHtml = `<div class="preview-label-scaler">${renderer(
      model.expandedLabels[0],
      model,
    )}</div>`;
  } else {
    const firstPage = model.pages[0] || [];
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
                  current: 1,
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
    `print-${model.layout.colorMode === "bw" ? "bw" : "color"}`,
    `print-purpose-${model.layout.labelPurpose}`,
  ].join(" ");
  const html = `<!DOCTYPE html><html><head><meta charset="UTF-8"><title>${escapeHtml(
    model.t("print.title"),
  )}</title><style>${sharedStyles}${previewStyles}</style></head><body class="${bodyClass}"><div class="preview-shell preview-shell-${mode}"><div class="preview-card preview-card-${mode}">${fragmentHtml}</div></div></body></html>`;

  return {
    html,
    fragmentHtml,
    model,
    mode,
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

  return {
    template: model.layout.template,
    labelPurpose: model.layout.labelPurpose,
    stockPreset: model.layout.stockId || model.layout.stockPresetName,
    orientation: model.layout.orientation,
    size: model.layout.size,
    totalLabels: model.expandedLabels.length,
    totalPages: model.totalPages,
    totalChemicals: model.selectedForLabel.length,
  };
}

export function printLabels(
  selectedForLabel,
  labelConfig,
  customGHSSettings,
  customLabelFields = {},
  labelQuantities = {},
  labProfile = {},
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

  const triggerPrint = () => {
    const preflightIssues = [
      ...inspectPrintContentFit(documentBundle.model),
      ...inspectPrintLayoutDocument(iframeDoc),
    ];
    if (preflightIssues.length > 0) {
      const lifecycleMeta = buildPrintLifecycleMeta(documentBundle);
      recordObservabilityEvent("print_blocked", {
        status: "blocked",
        count: lifecycleMeta.totalLabels || 1,
        meta: {
          ...lifecycleMeta,
          issueCount: preflightIssues.length,
          issueTypes: [...new Set(preflightIssues.map((issue) => issue.type))],
        },
      });
      if (typeof window !== "undefined" && typeof window.alert === "function") {
        window.alert(
          i18n.t("print.layoutBlocked", {
            defaultValue:
              "This label content is overflowing or clipped. Choose a larger stock, reduce optional fields, or use a QR supplement before printing.",
          }),
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

      setTimeout(() => cleanup("cleanup_timeout"), 60000);
      iframe.contentWindow.print();
    }, 300);
  };

  if (total === 0) {
    triggerPrint();
    return;
  }

  images.forEach((img) => {
    if (img.complete) {
      loaded += 1;
      if (loaded === total) triggerPrint();
    } else {
      img.onload = img.onerror = () => {
        loaded += 1;
        if (loaded === total) triggerPrint();
      };
    }
  });
}
