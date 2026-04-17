import {
  normalizePrintLabelConfig,
} from "@/constants/labelStocks";

export const PRINT_TEMPLATE_SCHEMA = 2;
export const PRINT_JOB_SCHEMA = 1;

export const EMPTY_CUSTOM_LABEL_FIELDS = Object.freeze({
  date: "",
  batchNumber: "",
});

const MAX_RECENT_ITEMS = 12;

function sanitizeString(value) {
  return typeof value === "string" ? value : "";
}

function sanitizeStatement(statement) {
  return {
    code: sanitizeString(statement?.code),
    text_zh: sanitizeString(statement?.text_zh),
    text_en: sanitizeString(statement?.text_en),
  };
}

function sanitizePictogram(pictogram) {
  return {
    code: sanitizeString(pictogram?.code),
    name_zh: sanitizeString(pictogram?.name_zh),
    name_en: sanitizeString(pictogram?.name_en),
  };
}

function sanitizePreparedSolution(raw) {
  if (!raw || typeof raw !== "object") return undefined;
  return {
    concentration: sanitizeString(raw.concentration),
    solvent: sanitizeString(raw.solvent),
    parentCas: sanitizeString(raw.parentCas),
    parentNameEn: sanitizeString(raw.parentNameEn),
    parentNameZh: sanitizeString(raw.parentNameZh),
    preparedBy: sanitizeString(raw.preparedBy),
    preparedDate: sanitizeString(raw.preparedDate),
    expiryDate: sanitizeString(raw.expiryDate),
  };
}

export function normalizeLabProfile(raw) {
  return {
    organization: sanitizeString(raw?.organization),
    phone: sanitizeString(raw?.phone),
    address: sanitizeString(raw?.address),
  };
}

export function normalizeCustomLabelFields(raw) {
  return {
    labName: sanitizeString(raw?.labName),
    date: sanitizeString(raw?.date),
    batchNumber: sanitizeString(raw?.batchNumber),
  };
}

export function sanitizeChemicalForPrintRecord(chemical) {
  if (!chemical || typeof chemical !== "object") return null;

  return {
    cas_number: sanitizeString(chemical.cas_number),
    name_en: sanitizeString(chemical.name_en),
    name_zh: sanitizeString(chemical.name_zh),
    cid: chemical?.cid ?? null,
    found: chemical?.found !== false,
    signal_word: sanitizeString(chemical.signal_word),
    signal_word_zh: sanitizeString(chemical.signal_word_zh),
    ghs_pictograms: Array.isArray(chemical?.ghs_pictograms)
      ? chemical.ghs_pictograms
          .map(sanitizePictogram)
          .filter((pictogram) => pictogram.code)
      : [],
    hazard_statements: Array.isArray(chemical?.hazard_statements)
      ? chemical.hazard_statements
          .map(sanitizeStatement)
          .filter((statement) => statement.code || statement.text_zh || statement.text_en)
      : [],
    precautionary_statements: Array.isArray(chemical?.precautionary_statements)
      ? chemical.precautionary_statements
          .map(sanitizeStatement)
          .filter((statement) => statement.code || statement.text_zh || statement.text_en)
      : [],
    customNote: sanitizeString(chemical?.customNote),
    isPreparedSolution: Boolean(chemical?.isPreparedSolution),
    preparedSolution: sanitizePreparedSolution(chemical?.preparedSolution),
  };
}

function normalizeLabelQuantities(raw, items) {
  const normalized = {};
  const list = Array.isArray(items) ? items : [];

  list.forEach((item) => {
    const key = item?.cas_number;
    if (!key) return;
    const fallback = 1;
    const quantity = Number(raw?.[key]);
    normalized[key] = Number.isFinite(quantity)
      ? Math.max(1, Math.min(20, Math.round(quantity)))
      : fallback;
  });

  return normalized;
}

export function buildPrintTemplateRecord(name, labelConfig, customLabelFields) {
  const trimmed = typeof name === "string" ? name.trim().slice(0, 30) : "";
  if (!trimmed) return null;

  return {
    schemaVersion: PRINT_TEMPLATE_SCHEMA,
    id: `tpl-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    name: trimmed,
    labelConfig: normalizePrintLabelConfig(labelConfig),
    customLabelFields: normalizeCustomLabelFields(customLabelFields),
    createdAt: new Date().toISOString(),
  };
}

export function normalizePrintTemplate(raw) {
  if (!raw || typeof raw !== "object") return null;
  const name = typeof raw.name === "string" ? raw.name.trim().slice(0, 30) : "";
  if (!name) return null;

  return {
    schemaVersion: PRINT_TEMPLATE_SCHEMA,
    id: sanitizeString(raw.id) || `tpl-${Date.now()}`,
    name,
    labelConfig: normalizePrintLabelConfig(raw.labelConfig),
    customLabelFields: normalizeCustomLabelFields(raw.customLabelFields),
    createdAt: sanitizeString(raw.createdAt) || new Date().toISOString(),
  };
}

function recentPrintKey(record) {
  const items = Array.isArray(record?.items) ? record.items : [];
  const casKey = items.map((item) => item.cas_number).join("|");
  const config = normalizePrintLabelConfig(record?.labelConfig);
  const fields = normalizeCustomLabelFields(record?.customLabelFields);
  return [
    casKey,
    config.template,
    config.stockPreset,
    config.orientation,
    fields.date,
    fields.batchNumber,
  ].join("::");
}

export function buildPrintJobRecord({
  items,
  labelConfig,
  customLabelFields,
  labelQuantities,
  labProfile,
}) {
  const sanitizedItems = Array.isArray(items)
    ? items
        .map(sanitizeChemicalForPrintRecord)
        .filter((item) => item && item.cas_number)
        .slice(0, MAX_RECENT_ITEMS)
    : [];

  if (sanitizedItems.length === 0) return null;

  const normalizedConfig = normalizePrintLabelConfig(labelConfig);
  const normalizedFields = normalizeCustomLabelFields(customLabelFields);
  const normalizedProfile = normalizeLabProfile(labProfile);
  const normalizedQuantities = normalizeLabelQuantities(labelQuantities, sanitizedItems);
  const totalLabels = sanitizedItems.reduce(
    (sum, item) => sum + (normalizedQuantities[item.cas_number] || 1),
    0
  );

  return {
    schemaVersion: PRINT_JOB_SCHEMA,
    id: `print-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    createdAt: new Date().toISOString(),
    items: sanitizedItems,
    labelConfig: normalizedConfig,
    customLabelFields: normalizedFields,
    labProfile: normalizedProfile,
    labelQuantities: normalizedQuantities,
    totalChemicals: sanitizedItems.length,
    totalLabels,
  };
}

export function normalizePrintJob(record) {
  if (!record || typeof record !== "object") return null;
  const items = Array.isArray(record.items)
    ? record.items
        .map(sanitizeChemicalForPrintRecord)
        .filter((item) => item && item.cas_number)
    : [];

  if (items.length === 0) return null;

  return {
    schemaVersion: PRINT_JOB_SCHEMA,
    id: sanitizeString(record.id) || `print-${Date.now()}`,
    createdAt: sanitizeString(record.createdAt) || new Date().toISOString(),
    items,
    labelConfig: normalizePrintLabelConfig(record.labelConfig),
    customLabelFields: normalizeCustomLabelFields(record.customLabelFields),
    labProfile: normalizeLabProfile(record.labProfile),
    labelQuantities: normalizeLabelQuantities(record.labelQuantities, items),
    totalChemicals: items.length,
    totalLabels:
      Number(record.totalLabels) ||
      items.reduce(
        (sum, item) => sum + (Number(record?.labelQuantities?.[item.cas_number]) || 1),
        0
      ),
  };
}

export function mergeRecentPrints(records, nextRecord, limit = 10) {
  if (!nextRecord) return Array.isArray(records) ? records : [];
  const previous = Array.isArray(records) ? records : [];
  const dedupKey = recentPrintKey(nextRecord);
  return [nextRecord, ...previous.filter((record) => recentPrintKey(record) !== dedupKey)].slice(
    0,
    limit
  );
}
