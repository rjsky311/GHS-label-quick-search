const CAS_FORMAT_PATTERN = /^\d{2,7}-\d{2}-\d$/;

const DEFAULT_RECOMMENDED_OUTPUTS = Object.freeze([
  "complete",
  "qrSupplement",
  "quickId",
]);

const SYNTHETIC_CASES = Object.freeze([
  {
    id: "qr-small-8-ghs",
    cas: "999998-80-8",
    name: "Eight-pictogram QR stress sample",
    nameZh: "八圖示 QR 壓力測試",
    output: "qrSupplement",
    stockPreset: "brother-62mm-continuous",
    pictogramCount: 8,
    expectedLayout: "QR first label uses 4 x 2 GHS grid.",
  },
  {
    id: "qr-small-9-ghs",
    cas: "999999-90-9",
    name: "Nine-pictogram QR stress sample",
    nameZh: "九圖示 QR 壓力測試",
    output: "qrSupplement",
    stockPreset: "brother-62mm-continuous",
    pictogramCount: 9,
    expectedLayout: "QR first label uses 3 x 3 GHS pressure grid.",
  },
  {
    id: "quick-id-9-ghs",
    cas: "999997-90-9",
    name: "Nine-pictogram identification stress sample",
    nameZh: "九圖示識別標籤壓力測試",
    output: "quickId",
    stockPreset: "small-strip",
    pictogramCount: 9,
    expectedLayout: "Identification label uses the full lower hazard band.",
  },
  {
    id: "qr-small-over-limit-19-ghs",
    cas: "999996-19-0",
    name: "Synthetic QR continuation limit sample",
    nameZh: "QR 續頁上限合成測試",
    output: "qrSupplement",
    stockPreset: "brother-62mm-continuous",
    pictogramCount: 19,
    expectedLayout: "Planner blocks output because it would need a third label.",
  },
]);

const toHalfWidth = (value = "") =>
  String(value).replace(/[\uFF01-\uFF5E]/g, (char) =>
    String.fromCharCode(char.charCodeAt(0) - 0xfee0),
  );

const normalizeHeaderCell = (value = "") =>
  toHalfWidth(value)
    .trim()
    .toLowerCase()
    .replace(/[\s.:\uFF1A#_-]+/g, "");

const isCasHeaderCell = (value = "") => {
  const normalized = normalizeHeaderCell(value);
  return [
    "cas",
    "casno",
    "casnumber",
    "cas編號",
    "cas编号",
    "cas號",
    "cas号",
    "cas號碼",
    "cas登錄號",
  ].includes(normalized);
};

const isNameHeaderCell = (value = "") => {
  const normalized = normalizeHeaderCell(value);
  return [
    "藥品名稱",
    "药品名称",
    "化學品名稱",
    "化学品名称",
    "品名",
    "name",
    "chemicalname",
  ].includes(normalized);
};

const findHeaderIndex = (rows) => {
  for (let rowIndex = 0; rowIndex < rows.length; rowIndex += 1) {
    const row = rows[rowIndex] || [];
    const casIndex = row.findIndex(isCasHeaderCell);
    const nameIndex = row.findIndex(isNameHeaderCell);
    if (casIndex >= 0 && nameIndex >= 0) {
      return { headerRowIndex: rowIndex, casIndex, nameIndex };
    }
  }
  return { headerRowIndex: -1, casIndex: -1, nameIndex: -1 };
};

export const parseCsvRows = (csvText = "") => {
  const rows = [];
  let row = [];
  let cell = "";
  let inQuotes = false;
  const input = String(csvText || "");

  for (let index = 0; index < input.length; index += 1) {
    const char = input[index];
    const next = input[index + 1];

    if (char === '"') {
      if (inQuotes && next === '"') {
        cell += '"';
        index += 1;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }

    if (char === "," && !inQuotes) {
      row.push(cell);
      cell = "";
      continue;
    }

    if ((char === "\n" || char === "\r") && !inQuotes) {
      if (char === "\r" && next === "\n") index += 1;
      row.push(cell);
      rows.push(row);
      row = [];
      cell = "";
      continue;
    }

    cell += char;
  }

  row.push(cell);
  if (row.some((value) => String(value).trim()) || rows.length === 0) {
    rows.push(row);
  }

  return rows;
};

export const normalizeCas = (value = "") =>
  toHalfWidth(value)
    .trim()
    .replace(/[\u2010-\u2015\u2212\uFE58\uFE63\uFF0D]/g, "-")
    .replace(/^cas\s*(?:no\.?|number|#|[:\uFF1A])?\s*/i, "")
    .replace(/\s+/g, "")
    .replace(/[.,;:，。；：]+$/g, "");

const optionalCellIndex = (headerRow, candidates) => {
  const normalizedCandidates = new Set(candidates.map(normalizeHeaderCell));
  return headerRow.findIndex((cell) =>
    normalizedCandidates.has(normalizeHeaderCell(cell)),
  );
};

const getCell = (row, index) => (index >= 0 ? String(row[index] || "").trim() : "");

const hasMeaningfulRow = (row) => row.some((cell) => String(cell || "").trim());

const recordFromRow = ({
  row,
  rowIndex,
  casIndex,
  nameIndex,
  locationIndex,
  vendorIndex,
  quantityIndex,
}) => {
  const rawCas = getCell(row, casIndex);
  const cas = normalizeCas(rawCas);
  const name = getCell(row, nameIndex);
  const base = {
    sourceRow: rowIndex + 1,
    rawCas,
    cas,
    name,
    location: getCell(row, locationIndex),
    vendor: getCell(row, vendorIndex),
    quantity: getCell(row, quantityIndex),
  };

  if (!rawCas && !name) return { kind: "empty" };
  if (!CAS_FORMAT_PATTERN.test(cas)) return { kind: "invalid", record: base };
  return { kind: "valid", record: base };
};

export const extractInventoryRecords = (csvText = "") => {
  const rows = parseCsvRows(csvText);
  const header = findHeaderIndex(rows);
  if (header.headerRowIndex < 0) {
    return {
      headerRowIndex: -1,
      records: [],
      invalidCasRows: [],
      rows,
    };
  }

  const headerRow = rows[header.headerRowIndex] || [];
  const locationIndex = optionalCellIndex(headerRow, ["位置", "location"]);
  const vendorIndex = optionalCellIndex(headerRow, ["廠商", "厂商", "vendor"]);
  const quantityIndex = optionalCellIndex(headerRow, ["數量", "数量", "quantity"]);
  const records = [];
  const invalidCasRows = [];

  rows.slice(header.headerRowIndex + 1).forEach((row, offset) => {
    const rowIndex = header.headerRowIndex + 1 + offset;
    if (!hasMeaningfulRow(row)) return;

    const parsed = recordFromRow({
      row,
      rowIndex,
      casIndex: header.casIndex,
      nameIndex: header.nameIndex,
      locationIndex,
      vendorIndex,
      quantityIndex,
    });

    if (parsed.kind === "valid") records.push(parsed.record);
    if (parsed.kind === "invalid" && parsed.record.rawCas) {
      invalidCasRows.push(parsed.record);
    }
  });

  return {
    headerRowIndex: header.headerRowIndex,
    records,
    invalidCasRows,
    rows,
  };
};

const displayLength = (value = "") => [...String(value || "")].length;

const findLongestNameRecord = (records) =>
  records.reduce((winner, record) => {
    if (!winner) return record;
    return displayLength(record.name) > displayLength(winner.name) ? record : winner;
  }, null);

const findShortestNameRecord = (records) =>
  records.reduce((winner, record) => {
    if (!winner) return record;
    return displayLength(record.name) < displayLength(winner.name) ? record : winner;
  }, null);

const getDuplicateRecord = (records) => {
  const groups = new Map();
  records.forEach((record) => {
    const group = groups.get(record.cas) || [];
    group.push(record);
    groups.set(record.cas, group);
  });
  return [...groups.values()].find((group) => group.length > 1)?.[1] || null;
};

const toInventorySample = ({ id, reason, record }) => ({
  id,
  reason,
  sourceRow: record.sourceRow,
  cas: record.cas,
  rawCas: record.rawCas,
  name: record.name,
  location: record.location,
  vendor: record.vendor,
  quantity: record.quantity,
  nameLength: displayLength(record.name),
  recommendedOutputs: [...DEFAULT_RECOMMENDED_OUTPUTS],
});

const uniqueById = (samples) => {
  const seen = new Set();
  return samples.filter((sample) => {
    if (!sample || seen.has(sample.id)) return false;
    seen.add(sample.id);
    return true;
  });
};

const buildInventorySamples = (records) =>
  uniqueById([
    records[0] &&
      toInventorySample({
        id: "inventory-first-valid",
        reason: "First valid inventory row for smoke testing the source shape.",
        record: records[0],
      }),
    findLongestNameRecord(records) &&
      toInventorySample({
        id: "inventory-longest-name",
        reason: "Longest inventory name, useful for small-label identity fit.",
        record: findLongestNameRecord(records),
      }),
    findShortestNameRecord(records) &&
      toInventorySample({
        id: "inventory-short-name",
        reason: "Short name baseline, useful for spotting unnecessary shrinkage.",
        record: findShortestNameRecord(records),
      }),
    getDuplicateRecord(records) &&
      toInventorySample({
        id: "inventory-duplicate-cas",
        reason: "Duplicate CAS row, useful for batch dedupe and page-count checks.",
        record: getDuplicateRecord(records),
      }),
    records.at(-1) &&
      toInventorySample({
        id: "inventory-last-valid",
        reason: "Last valid row, useful for parser boundary checks.",
        record: records.at(-1),
      }),
  ]);

const pictogramsForCount = (count) =>
  Array.from({ length: count }, (_, index) => ({
    code: `GHS${String(index + 1).padStart(2, "0")}`,
  }));

const buildSyntheticSamples = () =>
  SYNTHETIC_CASES.map((sample) => ({
    ...sample,
    pictograms: pictogramsForCount(sample.pictogramCount),
    recommendedOutputs: [sample.output],
  }));

const duplicateCasCount = (records) => {
  const counts = new Map();
  records.forEach((record) => counts.set(record.cas, (counts.get(record.cas) || 0) + 1));
  return [...counts.values()].filter((count) => count > 1).length;
};

export const buildInventoryPrintSampleReport = (csvText = "", options = {}) => {
  const extracted = extractInventoryRecords(csvText);
  const records = extracted.records;
  const uniqueCas = new Set(records.map((record) => record.cas));

  return {
    generatedAt: options.generatedAt || new Date().toISOString(),
    sourceName: options.sourceName || "inventory.csv",
    boundary:
      "review-only: inventory names are QA evidence and are not approved dictionary data",
    summary: {
      totalCsvRows: extracted.rows.length,
      headerRowIndex: extracted.headerRowIndex,
      validRecordCount: records.length,
      uniqueCasCount: uniqueCas.size,
      duplicateCasCount: duplicateCasCount(records),
      invalidCasRowCount: extracted.invalidCasRows.length,
    },
    selectionRules: [
      "Use inventory records for source-shape, CAS parsing, long-name, duplicate, and batch-boundary coverage.",
      "Use synthetic stress cases for 6-9 pictogram layouts because real inventory data may not contain every GHS-count condition.",
      "Use a synthetic over-limit case to keep third-label blocking behavior tested without implying real GHS has 19 pictograms.",
    ],
    inventorySamples: buildInventorySamples(records),
    invalidCasSamples: extracted.invalidCasRows.slice(0, 5).map((record) => ({
      sourceRow: record.sourceRow,
      rawCas: record.rawCas,
      name: record.name,
      reason: "Invalid CAS-like cell from inventory source.",
    })),
    syntheticStressCases: buildSyntheticSamples(),
  };
};

const tableCell = (value = "") =>
  String(value ?? "")
    .replace(/\r?\n/g, " ")
    .replace(/\|/g, "\\|")
    .trim();

const inventorySampleRow = (sample) =>
  `| ${tableCell(sample.id)} | ${tableCell(sample.cas)} | ${tableCell(sample.name)} | ${tableCell(sample.reason)} | ${tableCell(sample.recommendedOutputs.join(", "))} |`;

const syntheticSampleRow = (sample) =>
  `| ${tableCell(sample.id)} | ${tableCell(sample.output)} | ${tableCell(sample.stockPreset)} | ${sample.pictogramCount} | ${tableCell(sample.expectedLayout)} |`;

export const renderInventoryPrintSampleMarkdown = (report) => {
  const lines = [
    "# Inventory Print Sampling Report",
    "",
    "This is review-only QA evidence. Do not treat inventory names as approved dictionary data.",
    "",
    `- Source: ${report.sourceName}`,
    `- Generated: ${report.generatedAt}`,
    `- Valid records: ${report.summary.validRecordCount}`,
    `- Unique CAS: ${report.summary.uniqueCasCount}`,
    `- Duplicate CAS groups: ${report.summary.duplicateCasCount}`,
    `- Invalid CAS rows: ${report.summary.invalidCasRowCount}`,
    "",
    "## Selection Rules",
    "",
    ...report.selectionRules.map((rule) => `- ${rule}`),
    "",
    "## Inventory Samples",
    "",
    "| ID | CAS | Name | Reason | Outputs |",
    "| --- | --- | --- | --- | --- |",
    ...report.inventorySamples.map(inventorySampleRow),
    "",
    "## Synthetic Stress Cases",
    "",
    "| ID | Output | Stock | GHS count | Expected layout |",
    "| --- | --- | --- | ---: | --- |",
    ...report.syntheticStressCases.map(syntheticSampleRow),
  ];

  if (report.invalidCasSamples.length > 0) {
    lines.push(
      "",
      "## Invalid CAS Samples",
      "",
      "| Source row | Raw CAS | Name | Reason |",
      "| ---: | --- | --- | --- |",
      ...report.invalidCasSamples.map(
        (sample) =>
          `| ${sample.sourceRow} | ${tableCell(sample.rawCas)} | ${tableCell(sample.name)} | ${tableCell(sample.reason)} |`,
      ),
    );
  }

  lines.push(
    "",
    "## Suggested QA Use",
    "",
    "- Run the inventory sampler after updating the source fixture.",
    "- Use the inventory sample rows for batch lookup and representative print checks.",
    "- Use the synthetic stress cases for deterministic QR and identification small-label layout checks.",
    "- Manually inspect only the generated representative PDFs, not every inventory row.",
  );

  return `${lines.join("\n")}\n`;
};
