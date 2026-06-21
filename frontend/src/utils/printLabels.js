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

const PRINT_TEXT_FALLBACKS = {
  en: {
    "print.title": "GHS Label Print",
    "print.noHazardLabel": "No hazard label",
    "print.pictogramReviewRequired": "GHS pictogram review required",
    "print.noHazardStatement": "No hazard statements",
    "print.noPrecautionaryStatement": "No precautionary statements",
    "print.hazardStatementsLabel": "Hazard statements",
    "print.precautionaryStatementsLabel": "Precautionary statements",
    "print.scanForDetail": "Scan for details",
    "print.qrLookupCaption": "Scan to open this chemical lookup",
    "print.qrLookupPageOneCaption": "QR lookup - Page 1 only",
    "print.qrSupplementNotice":
      "Supplemental QR label - verify against SDS / primary label before use.",
    "print.supplierMissing": "Responsible lab / supplier information missing",
    "print.moreHazardsShort": "{{count}} more hazard(s)",
    "print.morePrecautionary": "+{{count}} more",
    "print.preparedSolution": "Prepared solution",
    "print.preparedShort": "Prepared",
    "print.concentration": "Concentration",
    "print.concentrationShort": "Conc.",
    "print.solvent": "Solvent",
    "print.solventShort": "Solv.",
    "print.preparedNote":
      "Prepared solution - hazard data copied from the parent chemical. Classification may differ for the actual mixture; verify against the official SDS before use.",
    "print.preparedParentWarning":
      "Parent chemical hazard data - not verified mixture classification. Verify against the official SDS before use.",
    "print.preparedBy": "Prepared by",
    "print.preparedDate": "Prepared date",
    "print.expiryDate": "Expiry date",
    "print.pageNumber": "Page {{current}} / {{total}}",
    "print.batch": "Case",
    "print.profilePhone": "Phone",
    "print.continuationBadge": "Page {{current}} / {{total}}",
    "print.continuationBadgeContinues":
      "Page {{current}} / {{total}}",
    "print.continuationBadgeFinal":
      "Page {{current}} / {{total}}",
    "print.continuationPagePlain":
      "Page {{current}} of {{total}}",
    "print.continuationMainStatus": "Main label",
    "print.continuationStatus": "Continuation",
    "print.continuationFinalStatus": "Final continuation",
    "print.continuationMainPageActionSingle":
      "Continue with Page 2",
    "print.continuationMainPageAction":
      "Continue with pages 2-{{total}}",
    "print.continuationQrHere": "QR on this page",
    "print.continuationQrOnFirstPage": "QR on Page 1 only",
    "print.continuationUseWithFirstPage":
      "Continuation page - use with Page 1",
    "print.continuationSetRequired":
      "Complete label set: {{total}} pages - keep all pages together",
    "print.continuationOnlyBandTitle":
      "CONTINUATION ONLY",
    "print.continuationOnlyBandDetail":
      "Do not use this page alone",
    "print.continuationOnlyBandQr":
      "Scan Page 1 for QR lookup",
    "print.continuationPictogramAnchor":
      "GHS pictograms repeated for page matching; QR lookup remains on Page 1",
    "print.continuationCompactPictogramAnchor":
      "GHS repeated for page matching",
    "print.keepAllPagesTogether":
      "Keep pages together",
    "print.continuationDoNotUseAlone":
      "Do not use this page alone",
    "print.noQrOnContinuationPage":
      "No QR on this page; scan Page 1",
    "print.statementWordingUnavailable":
      "Wording unavailable - verify SDS before use.",
    "print.footerHazardSource":
      "Hazard source: PubChem/SDS reference",
    "print.footerVerifyShort":
      "Verify against SDS, supplier label, and local regulations before use.",
    "trust.printFooter":
      "For reference only - confirm against the official SDS, supplier label, and local regulations before use.",
  },
  "zh-TW": {
    "print.title": "GHS 標籤列印",
    "print.noHazardLabel": "無危害標示",
    "print.pictogramReviewRequired": "GHS 圖示需審核",
    "print.noHazardStatement": "無危害說明",
    "print.noPrecautionaryStatement": "無預防措施說明",
    "print.hazardStatementsLabel": "危害說明 / Hazard statements",
    "print.precautionaryStatementsLabel": "預防措施 / Precautionary statements",
    "print.scanForDetail": "掃碼查看詳情",
    "print.qrLookupCaption":
      "掃描開啟此化學品查詢頁 / Scan to open this chemical lookup",
    "print.qrLookupPageOneCaption": "QR 查詢碼 - 僅第 1 頁 / QR lookup - Page 1 only",
    "print.qrSupplementNotice":
      "QR 補充標籤 - 使用前請對照 SDS / 主要標籤確認。",
    "print.supplierMissing": "尚未填寫負責實驗室 / 供應商資訊",
    "print.moreHazardsShort": "另有 {{count}} 項危害",
    "print.morePrecautionary": "另有 {{count}} 項",
    "print.preparedSolution": "配製溶液 / Prepared solution",
    "print.preparedShort": "配製 / Prepared",
    "print.concentration": "濃度 / Concentration",
    "print.concentrationShort": "濃度 / Conc.",
    "print.solvent": "溶劑 / Solvent",
    "print.solventShort": "溶劑 / Solv.",
    "print.preparedNote":
      "此為配製溶液 / Prepared solution - 危害資料沿用母化學品；實際混合物分類可能不同。使用前請以官方安全資料表（SDS）為準 / Hazard data is copied from the parent chemical; verify against the official SDS before use.",
    "print.preparedParentWarning":
      "母化學品危害資料 / Parent chemical hazard data - 尚未驗證實際混合物分類。使用前請以官方安全資料表（SDS）為準 / Not verified mixture classification; verify against the official SDS before use.",
    "print.preparedBy": "配製人 / Prepared by",
    "print.preparedDate": "配製日期 / Prepared date",
    "print.expiryDate": "有效期限 / Expiry date",
    "print.pageNumber": "第 {{current}} / {{total}} 頁",
    "print.batch": "案件",
    "print.profilePhone": "電話",
    "print.continuationBadge": "續頁 {{current}} / {{total}}",
    "print.continuationBadgeContinues":
      "第 {{current}} / {{total}} 頁",
    "print.continuationBadgeFinal":
      "第 {{current}} / {{total}} 頁",
    "print.continuationPagePlain":
      "第 {{current}} / {{total}} 頁",
    "print.continuationMainStatus": "主標頁",
    "print.continuationStatus": "續頁",
    "print.continuationFinalStatus": "最後續頁",
    "print.continuationMainPageActionSingle":
      "請接續第 2 頁",
    "print.continuationMainPageAction":
      "請接續第 2-{{total}} 頁",
    "print.continuationQrHere": "QR 在本頁",
    "print.continuationQrOnFirstPage": "QR 僅在第 1 頁",
    "print.continuationUseWithFirstPage":
      "續頁，需與第 1 頁一併使用",
    "print.continuationSetRequired":
      "完整標籤共 {{total}} 頁，請整套張貼或保存",
    "print.continuationOnlyBandTitle":
      "續頁 / CONTINUATION ONLY",
    "print.continuationOnlyBandDetail":
      "不能單獨貼用本頁",
    "print.continuationOnlyBandQr":
      "請掃第 1 頁 QR 查詢碼",
    "print.continuationPictogramAnchor":
      "GHS 圖示重複作為頁面對照；QR 查詢碼保留在第 1 頁",
    "print.continuationCompactPictogramAnchor":
      "GHS 圖示已重複方便配頁",
    "print.keepAllPagesTogether":
      "整套頁面一起保存",
    "print.continuationDoNotUseAlone":
      "不可單獨使用本頁",
    "print.noQrOnContinuationPage":
      "本頁無 QR；請掃第 1 頁",
    "print.statementWordingUnavailable":
      "尚無完整文字 - 使用前請核對 SDS。",
    "print.footerHazardSource":
      "參考資料：PubChem/SDS / Reference data: PubChem/SDS",
    "print.footerVerifyShort":
      "使用前請對照 SDS、供應商標示與當地法規 / Verify against SDS, supplier label, and local regulations before use.",
    "trust.printFooter":
      "僅供參考 - 使用前請對照官方安全資料表（SDS）、供應商標示與當地法規。",
  },
};

const normalizePrintLocale = (locale) =>
  String(locale || "").toLowerCase().startsWith("en") ? "en" : "zh-TW";

const interpolatePrintText = (template, values = {}) =>
  String(template || "").replace(/\{\{\s*([^}\s]+)\s*\}\}/g, (_, key) =>
    values[key] === undefined || values[key] === null ? "" : String(values[key]),
  );

const isRawTranslationKey = (key, value) => {
  if (typeof value !== "string" || value.trim() === "") return true;
  return value === key || value.toUpperCase() === key.toUpperCase();
};

const createPrintTranslator = (rawTranslate, locale) => {
  const fallbackLocale = normalizePrintLocale(locale);
  return (key, values = {}) => {
    const translated =
      typeof rawTranslate === "function" ? rawTranslate(key, values) : "";
    if (!isRawTranslationKey(key, translated)) return translated;

    const fallback =
      PRINT_TEXT_FALLBACKS[fallbackLocale]?.[key] ||
      PRINT_TEXT_FALLBACKS.en[key] ||
      key;
    return interpolatePrintText(fallback, values);
  };
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
  options = {},
) {
  if (!Array.isArray(selectedForLabel) || selectedForLabel.length === 0) {
    return null;
  }

  const locale = options.locale || i18n.language;
  const t = createPrintTranslator(i18n.t.bind(i18n), locale);
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
    locale,
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
    locale,
    layout,
    contentPolicy: resolvePrintContentPolicy(layout, { locale }),
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
  const nameDisplay = resolveNameDisplayForChemical(effectiveChem, model);
  const englishName =
    effectiveChem.name_en || effectiveChem.name || effectiveChem.cas_number || "";
  const chineseName = resolvePrintableChineseName(effectiveChem);
  const continuation = getContinuationMeta(chemical);
  const englishNameHtml =
    nameDisplay === "en" || nameDisplay === "both"
      ? `<div class="small-name-en">${escapeHtml(englishName)}</div>`
      : "";
  const chineseNameHtml =
    (nameDisplay === "zh" || nameDisplay === "both") && chineseName
      ? `<div class="small-name-zh">${escapeHtml(chineseName)}</div>`
      : "";
  const fallbackNameHtml =
    !englishNameHtml && !chineseNameHtml
      ? `<div class="small-name-en">${escapeHtml(englishName || chineseName)}</div>`
      : "";

  return `<div class="small-identity${getIdentityDensityClass(effectiveChem, model)}">
    <div class="small-cas">CAS ${escapeHtml(effectiveChem.cas_number || "")}</div>
    ${englishNameHtml}
    ${chineseNameHtml}
    ${fallbackNameHtml}
    ${renderContinuationBadge(continuation, model)}
  </div>`;
};

const isPrepared = (chemical) => Boolean(chemical?.isPreparedSolution);

const renderPreparedBadge = (model) =>
  `<div class="prepared-badge" data-testid="prepared-badge">${escapeHtml(
    model.t("print.preparedShort"),
  )}</div>`;

const renderPreparedFullPageIdentity = (model) =>
  `<div class="prepared-solution-identity" data-testid="prepared-solution-identity">${escapeHtml(
    model.t("print.preparedSolution"),
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

const renderPreparedNote = (chemical, model, { fullPagePrimary = false } = {}) => {
  if (!isPrepared(chemical)) return "";
  const className = fullPagePrimary
    ? "prepared-parent-warning"
    : "prepared-note";
  const key = fullPagePrimary
    ? "print.preparedParentWarning"
    : "print.preparedNote";
  return `<div class="${className}" data-testid="${className}">${escapeHtml(
    model.t(key),
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

const renderPreparedFullPageBlock = (chemical, model) => {
  if (!isPrepared(chemical)) return "";
  return `<div class="prepared-identity-block" data-testid="prepared-identity-block">
    ${renderPreparedFullPageIdentity(model)}
    ${renderPreparedMeta(chemical, model)}
    ${renderPreparedOperational(chemical, model)}
    ${renderPreparedNote(chemical, model, { fullPagePrimary: true })}
  </div>`;
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

const isStatementWordingUnavailable = (statement, model) => {
  const code = String(statement?.code || "").trim();
  if (!code) return false;
  const localizedText = String(getLocalizedTextForModel(statement, model) || "")
    .trim()
    .replace(/\s+/g, " ");
  return localizedText.toUpperCase() === code.toUpperCase();
};

const renderComplianceStatementText = (statement, model) => {
  const isMissing = isStatementWordingUnavailable(statement, model);
  const text = isMissing
    ? model.t("print.statementWordingUnavailable")
    : getLocalizedTextForModel(statement, model);
  return `<span class="statement-text${isMissing ? " statement-text-missing" : ""}">${escapeHtml(
    text,
  )}</span>`;
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
          )}</span>${renderComplianceStatementText(statement, model)}</div>`,
      )
      .join("")}
  </div>`;
};

const renderComplianceQrPanel = (effectiveChem, model, continuation = null) => {
  const qrTarget = getChemicalLookupUrl(effectiveChem.cas_number);
  const captionKey =
    continuation?.total > 1
      ? "print.qrLookupPageOneCaption"
      : "print.qrLookupCaption";

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
    <div class="qrcode-caption">${escapeHtml(
      model.t(captionKey, {
        current: continuation?.current || 1,
        total: continuation?.total || 1,
      }),
    )}</div>
  </div>`;
};

const renderComplianceFooter = (effectiveChem, model, continuation = null) => {
  const hasProfile =
    model.resolvedLabProfile.organization ||
    model.resolvedLabProfile.phone ||
    model.resolvedLabProfile.address;
  const showQr = !continuation || continuation.current === 1;
  const showFooterMetadata = isFullPagePrimaryLayout(model.layout);
  const continuationPageMeta =
    showFooterMetadata && continuation?.total > 1
      ? `<span class="compliance-footer-page">${escapeHtml(
          model.t("print.pageNumber", {
            current: continuation.current,
            total: continuation.total,
          }),
        )}</span>`
      : "";
  const footerMetadata = showFooterMetadata
    ? `<div class="compliance-footer-metadata">
        <span class="compliance-footer-source">${escapeHtml(
          model.t("print.footerHazardSource"),
        )}</span>
        <span class="compliance-footer-verify">${escapeHtml(
          model.t("print.footerVerifyShort"),
        )}</span>
        ${continuationPageMeta}
      </div>`
    : "";

  return `<div class="compliance-footer${showQr ? "" : " compliance-footer-no-qr"}">
    <div class="compliance-footer-text">
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
      ${footerMetadata}
    </div>
    ${showQr ? renderComplianceQrPanel(effectiveChem, model, continuation) : ""}
  </div>`;
};

const renderPageFooterNote = (model) => {
  if (isFullPagePrimaryLayout(model.layout)) return "";
  return `<div class="page-footer-note">${escapeHtml(model.t("trust.printFooter"))}</div>`;
};

const getContinuationBadgeKey = (continuation) => {
  if (!continuation || continuation.total <= 1) {
    return "print.continuationBadge";
  }
  if (continuation.current <= 1) {
    return "print.continuationBadgeContinues";
  }
  if (continuation.current >= continuation.total) {
    return "print.continuationBadgeFinal";
  }
  return "print.continuationBadge";
};

const renderContinuationBadge = (continuation, model) => {
  if (!continuation || continuation.total <= 1) return "";
  return `<div class="continuation-badge" data-testid="continuation-badge">${escapeHtml(
    model.t(getContinuationBadgeKey(continuation), {
      current: continuation.current,
      total: continuation.total,
    }),
	  )}</div>`;
};

const getContinuationStatusKey = (continuation) => {
  if (!continuation || continuation.total <= 1 || continuation.current <= 1) {
    return "print.continuationMainStatus";
  }
  if (continuation.current >= continuation.total) {
    return "print.continuationFinalStatus";
  }
  return "print.continuationStatus";
};

const renderContinuationKeepTogetherNote = (continuation, model) => {
  if (!continuation || continuation.total <= 1) return "";
  const pageRole = model.t("print.continuationPagePlain", {
    current: continuation.current,
    total: continuation.total,
    next: Math.min(continuation.total, continuation.current + 1),
  });
  const pageStatus = model.t(getContinuationStatusKey(continuation), {
    current: continuation.current,
    total: continuation.total,
    next: Math.min(continuation.total, continuation.current + 1),
  });
  const qrLocation = model.t(
    continuation.current > 1
      ? "print.continuationQrOnFirstPage"
      : "print.continuationQrHere",
    {
      current: continuation.current,
      total: continuation.total,
    },
  );
  const detailParts =
    continuation.current > 1
      ? [
          model.t("print.keepAllPagesTogether", {
            current: continuation.current,
            total: continuation.total,
          }),
          model.t("print.continuationCompactPictogramAnchor", {
            current: continuation.current,
            total: continuation.total,
          }),
        ]
      : [
          model.t("print.continuationSetRequired", {
            current: continuation.current,
            total: continuation.total,
          }),
          model.t("print.keepAllPagesTogether", {
            current: continuation.current,
            total: continuation.total,
          }),
          model.t(
            continuation.total === 2
              ? "print.continuationMainPageActionSingle"
              : "print.continuationMainPageAction",
            {
              current: continuation.current,
              total: continuation.total,
            },
          ),
        ];
  const standaloneWarning =
    continuation.current > 1
      ? `<span class="continuation-use-warning">${escapeHtml(
          model.t("print.continuationDoNotUseAlone", {
            current: continuation.current,
            total: continuation.total,
          }),
        )}</span>`
      : "";
  return `<div class="continuation-keep-together-note" data-testid="continuation-keep-together-note">
    <span class="continuation-page-role">${escapeHtml(pageRole)}</span>
    <span class="continuation-status">${escapeHtml(pageStatus)}</span>
    <span class="continuation-qr-location">${escapeHtml(qrLocation)}</span>
    ${standaloneWarning}
    <span class="continuation-keep-together-detail">${escapeHtml(
      detailParts.join(" · "),
    )}</span>
  </div>`;
};

const renderContinuationOnlyBand = (continuation, model) => {
  if (!continuation || continuation.total <= 1 || continuation.current <= 1) {
    return "";
  }
  return `<div class="continuation-only-band" data-testid="continuation-only-band">
    <span class="continuation-only-title">${escapeHtml(
      model.t("print.continuationOnlyBandTitle", {
        current: continuation.current,
        total: continuation.total,
      }),
    )}</span>
    <span class="continuation-only-detail">${escapeHtml(
      model.t("print.continuationOnlyBandDetail", {
        current: continuation.current,
        total: continuation.total,
      }),
    )}</span>
    <span class="continuation-only-qr">${escapeHtml(
      model.t("print.continuationOnlyBandQr", {
        current: continuation.current,
        total: continuation.total,
      }),
    )}</span>
  </div>`;
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
	      : content.pictograms;

  return {
    ...content,
    pictograms: continuationPictograms,
    hazardStatements: continuation.hazardStatements || [],
    precautionaryStatements: continuation.precautionaryStatements || [],
  };
};

const hasTextOnlyGhsContent = ({
  pictograms = [],
  hazardStatements = [],
  precautionaryStatements = [],
  signalWord = "",
} = {}) =>
  pictograms.length === 0 &&
  (hazardStatements.length > 0 ||
    precautionaryStatements.length > 0 ||
    Boolean(signalWord));

const renderPictogramReviewRequired = (model) =>
  `<div class="no-hazard no-hazard-review">${escapeHtml(
    model.t("print.pictogramReviewRequired"),
  )}</div>`;

const renderIconTemplate = (chemical, model) => {
  const {
    effectiveChemical: effectiveChem,
    pictograms,
    hazardStatements,
    precautionaryStatements,
    signalWord,
  } = getLabelContentForRender(chemical, model);
  const textOnlyGhs = hasTextOnlyGhsContent({
    pictograms,
    hazardStatements,
    precautionaryStatements,
    signalWord,
  });

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
            : textOnlyGhs
              ? renderPictogramReviewRequired(model)
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
    signalWord: contentSignalWord,
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
  const textOnlyGhs = hasTextOnlyGhsContent({
    pictograms,
    hazardStatements: hazards,
    precautionaryStatements: precautions,
    signalWord: contentSignalWord,
  });

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
                : textOnlyGhs
                  ? renderPictogramReviewRequired(model)
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
              ? fullPagePrimary
                ? renderPreparedFullPageBlock(effectiveChem, model)
                : renderPreparedBadge(model) +
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
        ${fullPagePrimary ? renderContinuationKeepTogetherNote(continuation, model) : ""}
        ${fullPagePrimary ? renderContinuationOnlyBand(continuation, model) : ""}
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
                  ${prepared && !fullPagePrimary ? renderPreparedNote(effectiveChem, model) : ""}
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
    hazardStatements,
    precautionaryStatements,
    signalWord,
  } = getLabelContentForRender(chemical, model);
  const prepared = isPrepared(effectiveChem);
  const qrTarget = getChemicalLookupUrl(effectiveChem.cas_number);
  const showQr = !continuation || continuation.showQr !== false;
  const continuationClass = continuation ? " label-continuation-page" : "";
  const qrNoCodeClass = showQr ? "" : " label-qr-no-code";
  const textOnlyGhs = hasTextOnlyGhsContent({
    pictograms,
    hazardStatements,
    precautionaryStatements,
    signalWord,
  });

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
            : textOnlyGhs
              ? `<div class="qr-support-row qr-support-row-primary">${renderPictogramReviewRequired(model)}</div>`
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
  options = {},
) {
  const model = buildPrintDocumentModel(
    selectedForLabel,
    labelConfig,
    customGHSSettings,
    customLabelFields,
    labelQuantities,
    labProfile,
    options,
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
          ${renderPageFooterNote(model)}
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
    options,
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
              ${renderPageFooterNote(model)}
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
  options = {},
) {
  const documentBundle = buildPrintDocument(
    selectedForLabel,
    labelConfig,
    customGHSSettings,
    customLabelFields,
    labelQuantities,
    labProfile,
    options,
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
