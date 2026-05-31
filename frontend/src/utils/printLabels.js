import { GHS_IMAGES } from "@/constants/ghs";
import { resolvePrintLayoutConfig } from "@/constants/labelStocks";
import i18n from "@/i18n";
import { recordObservabilityEvent } from "@/utils/observability";
import {
  buildPrintLabelContent,
} from "@/utils/printContentModel";
import {
  resolvePrintContentPolicy,
} from "@/utils/printContentPolicy";
import {
  getCompletePrimaryContinuationCapacity,
} from "@/utils/printFitEngine";
import {
  buildLayoutBlockedAlert,
  buildPrintLifecycleMeta,
  getPreflightIssueCasNumbers,
  isPrintHandoffQaMode,
  publishPrintBlockedQaStatus,
  publishPrintHandoffQaStatus,
  publishPrintPendingQaStatus,
} from "@/utils/printLifecycle";
import { waitForRequiredPrintImages } from "@/utils/printImagePreflight";
import {
  collectPrintPreflightIssues,
  hasRequiredImageFailure,
  resolvePrintPreflightRetry,
} from "@/utils/printHandoffPreflight";
import {
  PRINT_QA_LABEL_KIND_HELPERS,
  clampAutoFitLevel,
  escapeHtml,
  expandLabelsByQuantity,
  getChemicalLookupUrl,
  getContinuationStatementLineUnits,
  getContinuationStatementWeight,
  getFullPagePrimaryClass,
  getFullPageStatementTier,
  getHazardFontTier,
  getPhysicalLabelClasses,
  getPictogramDensityClasses,
  getQRCodeUrl,
  getStandardHazardRenderMode,
  getStandardHazardSummaryLimit,
  isFullPagePrimaryLayout,
  renderLabelDataAttributes,
  resolveAutoFitLevelForModel,
  resolveLabProfile,
  resolveRenderModelForChemical,
  withInternalPrintLayoutFlags,
} from "@/utils/printDocumentLayoutHelpers";
import {
  chunk,
  clampIndex,
  getIdentityDensityClass,
  getLocalizedTextForModel,
  getSignalWordForModel,
  normalizeTemplate,
  resolveNameDisplayForChemical,
  resolvePrintableChineseName,
  splitCompactPictograms,
  truncateText,
} from "@/utils/printRenderHelpers";
import {
  appendContinuationStatement as appendContinuationStatementWithTextResolver,
  compactContinuationPages as compactContinuationPagesWithTextResolver,
  getContinuationPageIndex,
  getContinuationPageLimits,
} from "@/utils/printContinuationPagination";
import {
  prioritizeHazardStatements,
  prioritizePrecautionaryStatements,
} from "@/utils/printStatementPriority";
import { buildPrintStyles } from "@/utils/printLabelStyles";
import { buildPrintPreviewStyles } from "@/utils/printPreviewStyles";

export { resolveEffectiveChemicalForPrint } from "@/utils/printContentModel";
export { inspectPrintContentFit } from "@/utils/printFitEngine";
export { inspectPrintLayoutDocument } from "@/utils/printLayoutInspection";
export {
  escapeHtml,
  getChemicalLookupUrl,
  getHazardFontTier,
  getQRCodeUrl,
} from "@/utils/printDocumentLayoutHelpers";

const appendContinuationStatement = (pages, item, capacity, model) => {
  appendContinuationStatementWithTextResolver(
    pages,
    item,
    capacity,
    model,
    getLocalizedTextForModel,
  );
};

const compactContinuationPages = (pages, capacity, model) => {
  return compactContinuationPagesWithTextResolver(
    pages,
    capacity,
    model,
    getLocalizedTextForModel,
  );
};

const buildContinuationLabelsForChemical = (chemical, model) => {
  const renderModel = resolveRenderModelForChemical(chemical, model);
  const isCompactIdentityLayout =
    renderModel.layout.template === "icon" ||
    renderModel.layout.template === "qrcode";

  if (!isFullPagePrimaryLayout(renderModel.layout) && !isCompactIdentityLayout) {
    return [chemical];
  }

  const content = getLabelContentForRender(chemical, renderModel);
  if (isCompactIdentityLayout) {
    const pictogramPages = splitCompactPictograms(
      content.pictograms || [],
      renderModel.layout,
      renderModel.layout.template,
    );

    if (pictogramPages.length <= 1) return [chemical];

    return pictogramPages.map((pictograms, index) => ({
      __printContinuation: true,
      sourceChemical: chemical,
      continuation: {
        current: index + 1,
        total: pictogramPages.length,
        pictograms,
        showQr: renderModel.layout.template === "qrcode" ? index === 0 : false,
        hazardStatements: [],
        precautionaryStatements: [],
      },
    }));
  }

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
  const capacity = getCompletePrimaryContinuationCapacity(renderModel.layout);
  const hazardItems = statements.filter((item) => item.kind === "hazard");
  const precautionItems = statements.filter(
    (item) => item.kind === "precaution",
  );
  const hazardTextWeight = hazardItems.reduce(
    (total, item) =>
      total + getContinuationStatementWeight(item.statement, renderModel),
    0,
  );
  const precautionTextWeight = precautionItems.reduce(
    (total, item) =>
      total + getContinuationStatementWeight(item.statement, renderModel),
    0,
  );
  const statementTextWeight = statements.reduce(
    (total, item) =>
      total + getContinuationStatementWeight(item.statement, renderModel),
    0,
  );
  const statementLineUnits = statements.reduce(
    (total, item) =>
      total + getContinuationStatementLineUnits(item.statement, renderModel),
    0,
  );
  const shouldSeparatePrecautions =
    hazardItems.length >= capacity.separatePrecautionsAfterHazardCount ||
    hazardTextWeight >= capacity.separatePrecautionsAfterHazardTextWeight;
  const mixedPrecautionOverflowRisk =
    hazardItems.length > 0 &&
    precautionItems.length > capacity.mixedPrecautionStatementCount &&
    precautionTextWeight > capacity.mixedPrecautionTextWeight;
  const singlePageLineLimit =
    capacity.splitLineUnits ||
    capacity.firstPageLineUnits ||
    capacity.pageLineUnits ||
    Infinity;
  const fitsSingleContinuationPage =
    statements.length <= capacity.splitStatementCount &&
    statementTextWeight <= capacity.splitTextWeight &&
    statementLineUnits <= singlePageLineLimit;
  const materiallyExceedsSinglePage =
    statements.length > capacity.splitStatementCount ||
    statementTextWeight > capacity.splitTextWeight ||
    statementLineUnits > singlePageLineLimit;
  const shouldPreferFreshPrecautionPage =
    materiallyExceedsSinglePage &&
    (shouldSeparatePrecautions || mixedPrecautionOverflowRisk);

  if (fitsSingleContinuationPage) {
    return [chemical];
  }

  const pages = [{ items: [], textWeight: 0, lineUnits: 0 }];
  hazardItems.forEach((item) =>
    appendContinuationStatement(pages, item, capacity, renderModel),
  );
  const lastPage = pages[pages.length - 1];
  const lastPageHasHazards = lastPage.items.some((item) => item.kind === "hazard");
  const lastPageLimits = getContinuationPageLimits(
    capacity,
    getContinuationPageIndex(pages),
  );
  const lastPageNearCapacity =
    lastPage.items.length >= lastPageLimits.maxStatements * 0.75 ||
    (lastPage.lineUnits || 0) >= lastPageLimits.maxLineUnits * 0.75 ||
    lastPage.textWeight >= lastPageLimits.maxTextWeight * 0.75;
  if (
    precautionItems.length > 0 &&
    shouldPreferFreshPrecautionPage &&
    lastPageHasHazards &&
    lastPageNearCapacity
  ) {
    pages.push({ items: [], textWeight: 0, lineUnits: 0 });
  }
  precautionItems.forEach((item) =>
    appendContinuationStatement(pages, item, capacity, renderModel),
  );
  const populatedPages = compactContinuationPages(pages, capacity, renderModel);
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
  let layout = resolvePrintLayoutConfig({
    ...labelConfig,
    template: normalizeTemplate(labelConfig?.template),
  });
  layout = withInternalPrintLayoutFlags(layout, labelConfig);
  const expandedLabels = expandLabelsByQuantity(
    selectedForLabel,
    labelQuantities,
  );
  const resolvedLabProfile = resolveLabProfile(customLabelFields, labProfile);
  const autoFitLevel = resolveAutoFitLevelForModel({
    layout,
    expandedLabels,
    customGHSSettings,
    customLabelFields,
    resolvedLabProfile,
    t,
    locale: i18n.language,
  });
  if (autoFitLevel > clampAutoFitLevel(layout.autoFitLevel)) {
    layout = resolvePrintLayoutConfig({
      ...labelConfig,
      template: normalizeTemplate(labelConfig?.template),
      autoFitLevel,
    });
    layout = withInternalPrintLayoutFlags(layout, labelConfig);
  }
  const modelBase = {
    t,
    locale: i18n.language,
    layout,
    contentPolicy: resolvePrintContentPolicy(layout, { locale: i18n.language }),
    selectedForLabel,
    customGHSSettings,
    customLabelFields,
    labelQuantities,
    resolvedLabProfile,
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
  {
    includeCas = true,
    includeBatch = true,
    includePrepared = true,
    preparedDetailLimit = 2,
  } = {},
) => {
  const chips = [];

  if (includeCas && effectiveChem.cas_number) {
    chips.push(
      renderMetaChip("CAS", effectiveChem.cas_number, "meta-chip-cas"),
    );
  }

  if (includeBatch && model.customLabelFields?.batchNumber) {
    chips.push(
      renderMetaChip(
        model.t("print.batch"),
        model.customLabelFields.batchNumber,
        "meta-chip-batch support-chip support-chip-critical support-chip-batch",
      ),
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
  const nameDisplay = resolveNameDisplayForChemical(effectiveChem, model);
  let nameHtml = "";

  if (nameDisplay === "en" || nameDisplay === "both") {
    nameHtml += `<div class="name-en">${escapeHtml(effectiveChem.name_en || "")}</div>`;
  }

  if (nameDisplay === "zh") {
    const displayName =
      resolvePrintableChineseName(effectiveChem) || effectiveChem.name_en || "";
    nameHtml += `<div class="name-en">${escapeHtml(displayName)}</div>`;
  } else if (nameDisplay === "both") {
    const chineseName = resolvePrintableChineseName(effectiveChem);
    if (chineseName) {
      nameHtml += `<div class="name-zh">${escapeHtml(chineseName)}</div>`;
    }
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

const renderSmallIdentitySection = (chemical, effectiveChem, model) => {
  const englishName =
    effectiveChem.name_en || effectiveChem.name || effectiveChem.cas_number || "";
  const chineseName = resolvePrintableChineseName(effectiveChem);
  const continuation = getContinuationMeta(chemical);
  const chineseNameHtml = chineseName
    ? `<div class="small-name-zh">${escapeHtml(chineseName)}</div>`
    : "";

  return `<div class="small-identity${getIdentityDensityClass(effectiveChem, model)}">
    <div class="small-cas">CAS ${escapeHtml(effectiveChem.cas_number || "")}</div>
    <div class="small-name-en">${escapeHtml(englishName)}</div>
    ${chineseNameHtml}
    ${renderContinuationBadge(continuation, model)}
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

const renderSignal = (signalWord, signalClass, className = "") => {
  if (!signalWord) {
    return '<div class="signal-placeholder"></div>';
  }
  return `<div class="signal ${signalClass}${className ? ` ${className}` : ""}">${escapeHtml(
    signalWord,
  )}</div>`;
};

const renderHazardSummaryStatement = (statement, className, model) =>
  `<div class="${className} hazard-summary-item"><span class="hazard-summary-code">${escapeHtml(
    statement.code,
  )}</span><span class="hazard-summary-text">${escapeHtml(
    truncateText(
      getLocalizedTextForModel(statement, model),
      getStandardHazardSummaryLimit(model.layout),
    ),
  )}</span></div>`;

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

const renderPurposeNotice = () => {
  // Purpose warnings live in the print modal. The physical label keeps its
  // limited area for identity, pictograms, signal word, and hazard content.
  return "";
};

const getStatementCodeClass = (code) =>
  String(code || "").length > 8 ? " statement-code-long" : "";

const shouldRenderMoreHazards = (layout = {}) => {
  const area = Math.max(0, Number(layout.widthMm || 0) * Number(layout.heightMm || 0));
  if (layout.formFactor === "strip" && area < 1600) return false;
  return true;
};

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

const renderComplianceQrPanel = (effectiveChem) => {
  const qrTarget = getChemicalLookupUrl(effectiveChem.cas_number);

  return `<div class="compliance-qr qrcode-panel">
    <div class="compliance-qr-shell">
      <img class="qrcode-img"
        src="${getQRCodeUrl(qrTarget, 220)}"
        alt="QR"
        data-required-print-image="qr-code"
        data-qr-target="${escapeHtml(qrTarget)}"
        data-qr-target-type="ghs-lookup"
        data-qr-target-source="ghs-label-quick-search"
        data-qr-target-label="GHS Label Quick Search" />
    </div>
  </div>`;
};

const renderComplianceFooter = (effectiveChem, model, continuation = null) => {
  const hasProfile =
    model.resolvedLabProfile.organization ||
    model.resolvedLabProfile.phone ||
    model.resolvedLabProfile.address;
  const showQr = !continuation || continuation.current === 1;

  return `<div class="compliance-footer${showQr ? "" : " compliance-footer-no-qr"}">
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
    ${showQr ? renderComplianceQrPanel(effectiveChem) : ""}
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
    locale: model.locale,
  });
  if (!continuation) return content;
  const continuationPictograms =
    Array.isArray(continuation.pictograms)
      ? continuation.pictograms
      : isFullPagePrimaryLayout(model.layout) && continuation.current > 1
        ? []
        : content.pictograms;

  return {
    ...content,
    pictograms: continuationPictograms,
    hazardStatements: continuation.hazardStatements || [],
    precautionaryStatements: continuation.precautionaryStatements || [],
  };
};

const renderIconTemplate = (chemical, model) => {
  const {
    effectiveChemical: effectiveChem,
    pictograms,
  } = getLabelContentForRender(chemical, model);

  return `
    <div class="label label-icon ${getPhysicalLabelClasses(model.layout)} ${getPictogramDensityClasses(pictograms)}${isPrepared(effectiveChem) ? " label-prepared" : ""}" ${renderLabelDataAttributes(chemical, model)}>
      ${renderPurposeNotice(model)}
      <div class="label-top label-top-identity">
        ${renderSmallIdentitySection(chemical, effectiveChem, model)}
      </div>
      <div class="label-middle">
        ${
          pictograms.length > 0
            ? renderPictograms(pictograms, "pictograms-icon")
            : `<div class="no-hazard">${escapeHtml(model.t("print.noHazardLabel"))}</div>`
        }
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
  const hazardRenderMode = getStandardHazardRenderMode(model.layout);
  const prepared = isPrepared(effectiveChem);

  return `
    <div class="label label-standard ${getPhysicalLabelClasses(model.layout)} ${getPictogramDensityClasses(pictograms)}${prepared ? " label-prepared" : ""}" ${renderLabelDataAttributes(chemical, model)}>
      ${renderPurposeNotice(model)}
      <div class="label-top label-top-standard">
        ${renderNameSection(effectiveChem, model, {
          compactNames: model.layout.size !== "large",
          showProfile: false,
          showCustomFields: false,
          showCasLine: false,
          metaRibbonHtml: renderMetaRibbon(effectiveChem, model, {
            includeCas: true,
            includeBatch: true,
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
                ? `<div class="hazard-primary-list${hazardRenderMode === "code" ? " hazard-code-list" : ""}">
                    ${primaryHazards
                      .map((hazard) =>
                        hazardRenderMode === "code"
                          ? renderHazardCode(
                              hazard,
                              "hazard-item hazard-primary-item",
                            )
                          : renderHazardSummaryStatement(
                              hazard,
                              "hazard-item hazard-primary-item",
                              model,
                            ),
                      )
                      .join("")}
                    ${
                      shouldRenderMoreHazards(model.layout)
                        ? renderMoreHazards(omittedHazards, model)
                        : ""
                    }
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
  const fullPagePrimary = isFullPagePrimaryLayout(model.layout);
  const fullPageClass = getFullPagePrimaryClass(model.layout);
  const continuationClass = continuation ? " label-continuation-page" : "";
  const headerCasChip =
    fullPagePrimary && effectiveChem.cas_number
      ? renderMetaChip(
          "CAS",
          effectiveChem.cas_number,
          "meta-chip-cas compliance-header-cas",
        )
      : "";
  const showComplianceAlertPanel = !fullPagePrimary || pictograms.length > 0;
  const statementPanelStyle = [
    `--compliance-statement-gap:${hazardTier.marginBottom}`,
    `--compliance-code-gap:${hazardTier.codeGap || "1.1mm"}`,
    `--hazard-code-min:${hazardTier.hazardCodeMin || "10mm"}`,
    `--hazard-code-max:${hazardTier.hazardCodeMax || "14mm"}`,
    `--precaution-code-min:${hazardTier.precautionCodeMin || "15mm"}`,
    `--precaution-code-max:${hazardTier.precautionCodeMax || "21mm"}`,
  ].join(";");

  return `
    <div class="label label-full label-compliance ${getPhysicalLabelClasses(model.layout)} ${getPictogramDensityClasses(pictograms)} label-purpose-${escapeHtml(model.layout.labelPurpose)}${fullPageClass}${continuationClass}${prepared ? " label-prepared" : ""}" ${renderLabelDataAttributes(chemical, model)}${continuation ? ` data-continuation-page="${escapeHtml(continuation.current)}" data-continuation-total="${escapeHtml(continuation.total)}"` : ""}>
      <div class="compliance-header">
        <div class="compliance-header-identity">
          ${renderNameSection(effectiveChem, model, {
            showCasLine: false,
            metaRibbonHtml: renderMetaRibbon(effectiveChem, model, {
              includeCas: !fullPagePrimary,
              includeBatch: true,
              includePrepared: false,
            }),
          })}
          ${!fullPagePrimary ? renderContinuationBadge(continuation, model) : ""}
          ${
            prepared
              ? renderPreparedBadge(model) +
                renderPreparedMeta(effectiveChem, model) +
                renderPreparedOperational(effectiveChem, model)
              : ""
          }
        </div>
        ${
          fullPagePrimary
            ? `<div class="compliance-header-actions">
                ${headerCasChip}
                ${signalWord ? renderSignal(signalWord, signalClass, "compliance-signal") : ""}
                ${renderContinuationBadge(continuation, model)}
              </div>`
            : ""
        }
      </div>
      ${purposeNotice}
      <div class="compliance-core${showComplianceAlertPanel ? "" : " compliance-core-no-alert"}">
        ${
          showComplianceAlertPanel
            ? `<div class="compliance-alert-panel">
                ${!fullPagePrimary && signalWord ? renderSignal(signalWord, signalClass, "compliance-signal") : ""}
                ${
                  pictograms.length > 0
                    ? renderPictograms(pictograms, "compliance-pictograms")
                    : `<div class="no-hazard">${escapeHtml(model.t("print.noHazardLabel"))}</div>`
                }
              </div>`
            : ""
        }
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
      ${renderComplianceFooter(effectiveChem, model, continuation)}
    </div>
  `;
};

const renderQRCodeTemplate = (chemical, model) => {
  const continuation = getContinuationMeta(chemical);
  const {
    effectiveChemical: effectiveChem,
    pictograms,
  } = getLabelContentForRender(chemical, model);
  const prepared = isPrepared(effectiveChem);
  const qrTarget = getChemicalLookupUrl(effectiveChem.cas_number);
  const showQr = !continuation || continuation.showQr !== false;
  const continuationClass = continuation ? " label-continuation-page" : "";
  const qrNoCodeClass = showQr ? "" : " label-qr-no-code";

  return `
    <div class="label label-qr ${getPhysicalLabelClasses(model.layout)} ${getPictogramDensityClasses(pictograms)}${continuationClass}${qrNoCodeClass}${prepared ? " label-prepared" : ""}" ${renderLabelDataAttributes(chemical, model)}${continuation ? ` data-continuation-page="${escapeHtml(continuation.current)}" data-continuation-total="${escapeHtml(continuation.total)}"` : ""}>
      <div class="qr-left qr-left-scan">
        ${renderPurposeNotice(model)}
        <div class="qr-identity">
          ${renderSmallIdentitySection(chemical, effectiveChem, model)}
        </div>
        ${
          pictograms.length > 0
            ? `<div class="qr-support-row qr-support-row-primary">${renderPictograms(pictograms, "qr-pics")}</div>`
            : ""
        }
      </div>
      ${
        showQr
          ? `<div class="qr-right qr-panel qrcode-panel">
              <div class="qr-code-shell">
                <img class="qrcode-img"
                  src="${getQRCodeUrl(qrTarget, 200)}"
                  alt="QR"
                  data-required-print-image="qr-code"
                  data-qr-target="${escapeHtml(qrTarget)}"
                  data-qr-target-type="ghs-lookup"
                  data-qr-target-source="ghs-label-quick-search"
                  data-qr-target-label="GHS Label Quick Search" />
              </div>
            </div>`
          : ""
      }
    </div>
  `;
};

const TEMPLATE_RENDERERS = {
  icon: renderIconTemplate,
  standard: renderStandardTemplate,
  full: renderFullTemplate,
  qrcode: renderQRCodeTemplate,
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

  const renderLabel = (chemical) => {
    const renderModel = resolveRenderModelForChemical(chemical, model);
    const renderer =
      TEMPLATE_RENDERERS[renderModel.layout.template] ||
      TEMPLATE_RENDERERS.standard;
    return renderer(chemical, renderModel);
  };
  const pagesHtml = model.pages
    .map((pageLabels, pageIndex) => {
      const labelsHtml = pageLabels
        .map((chemical) => renderLabel(chemical))
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

  const styles = buildPrintStyles(model);
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

  const renderLabel = (chemical) => {
    const renderModel = resolveRenderModelForChemical(chemical, model);
    const renderer =
      TEMPLATE_RENDERERS[renderModel.layout.template] ||
      TEMPLATE_RENDERERS.standard;
    return renderer(chemical, renderModel);
  };
  const previewStyles = buildPrintPreviewStyles(mode, model, options);
  const sharedStyles = buildPrintStyles(model);
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
    fragmentHtml = `<div class="preview-label-scaler">${renderLabel(
      model.expandedLabels[selectedLabelIndex] || model.expandedLabels[0],
    )}</div>`;
  } else {
    const firstPage = model.pages[selectedPageIndex] || model.pages[0] || [];
    const labelMarkup = firstPage
      .map((chemical) => renderLabel(chemical))
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
    publishPrintPendingQaStatus(documentBundle, PRINT_QA_LABEL_KIND_HELPERS);
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
    } catch {
      // Print handoff must not fail because recent-job persistence failed.
    }
  };

  const triggerPrint = (imageLoadIssues = []) => {
    if (preflightTriggered) return;
    preflightTriggered = true;

    const preflightIssues = collectPrintPreflightIssues(
      documentBundle,
      iframeDoc,
      imageLoadIssues,
    );
    if (preflightIssues.length > 0) {
      const lifecycleMeta = buildPrintLifecycleMeta(documentBundle);
      const retryPlan = resolvePrintPreflightRetry({
        documentBundle,
        preflightIssues,
        selectedForLabel,
        labelConfig,
      });
      if (retryPlan) {
        recordObservabilityEvent(retryPlan.eventName, {
          status: "retry",
          count: lifecycleMeta.totalLabels || 1,
          meta: {
            ...lifecycleMeta,
            issueTypes: [...new Set(preflightIssues.map((issue) => issue.type))],
            ...retryPlan.meta,
          },
        });
        iframe.remove();
        printLabels(
          retryPlan.selectedForLabel,
          retryPlan.labelConfig,
          customGHSSettings,
          customLabelFields,
          labelQuantities,
          labProfile,
          lifecycleCallbacks,
        );
        return;
      }
      if (isPrintHandoffQaMode()) {
        publishPrintBlockedQaStatus(
          documentBundle,
          preflightIssues,
          PRINT_QA_LABEL_KIND_HELPERS,
        );
      }
      recordObservabilityEvent("print_blocked", {
        status: "blocked",
        count: lifecycleMeta.totalLabels || 1,
        meta: {
          ...lifecycleMeta,
          issueCount: preflightIssues.length,
          issueTypes: [...new Set(preflightIssues.map((issue) => issue.type))],
          issueCasNumbers: getPreflightIssueCasNumbers(
            documentBundle,
            preflightIssues,
          ),
        },
      });
      if (!isPrintHandoffQaMode()) {
        const issueTypes = [
          ...new Set(preflightIssues.map((issue) => issue.type).filter(Boolean)),
        ];
        const issueCasNumbers = getPreflightIssueCasNumbers(
          documentBundle,
          preflightIssues,
        );
        const imageFailure = hasRequiredImageFailure(preflightIssues);
        const message = imageFailure
          ? i18n.t("print.imageBlocked", {
              defaultValue:
                "Required label images did not load. Check your network and try again before printing.",
            })
          : buildLayoutBlockedAlert(lifecycleMeta, preflightIssues);
        try {
          lifecycleCallbacks?.onPrintBlocked?.({
            imageFailure,
            issueCasNumbers,
            issueCount: preflightIssues.length,
            issueTypes,
            lifecycleMeta,
            message,
          });
        } catch {
          // UI notification failures must not resume an unsafe print handoff.
        }
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
      } catch {
        // Embedded webviews may not support afterprint on iframe windows.
      }

      if (isPrintHandoffQaMode()) {
        const qaStatus = publishPrintHandoffQaStatus(
          documentBundle,
          iframeDoc,
          lifecycleMeta,
          PRINT_QA_LABEL_KIND_HELPERS,
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

  waitForRequiredPrintImages(images, triggerPrint);
}
