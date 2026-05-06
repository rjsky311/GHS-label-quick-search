const PAGE_MARGIN_MM = 5;
const FOOTER_RESERVE_RIGHT_MM = 30;

const PAGE_SIZE_DIMENSIONS_MM = {
  A4: {
    portrait: { width: 210, height: 297 },
    landscape: { width: 297, height: 210 },
  },
  Letter: {
    portrait: { width: 216, height: 279 },
    landscape: { width: 279, height: 216 },
  },
};

const TYPOGRAPHY_BY_SIZE = {
  small: {
    fontPx: 10,
    titlePx: 12,
    pictogramPx: 22,
    qrBoxMm: 25,
    signalPx: 11,
    hazardPx: 8,
    labelPaddingMm: 2.3,
    borderMm: 0.5,
    radiusMm: 2,
    minHeightPortraitMm: 277,
    minHeightLandscapeMm: 190,
  },
  medium: {
    fontPx: 12,
    titlePx: 14,
    pictogramPx: 30,
    qrBoxMm: 32,
    signalPx: 13,
    hazardPx: 9,
    labelPaddingMm: 2.5,
    borderMm: 0.55,
    radiusMm: 2,
    minHeightPortraitMm: 277,
    minHeightLandscapeMm: 190,
  },
  large: {
    fontPx: 14,
    titlePx: 16,
    pictogramPx: 38,
    qrBoxMm: 40,
    signalPx: 15,
    hazardPx: 11,
    labelPaddingMm: 2.8,
    borderMm: 0.6,
    radiusMm: 2.2,
    minHeightPortraitMm: 277,
    minHeightLandscapeMm: 190,
  },
};

const TEMPLATE_BUDGETS_BY_SIZE = {
  small: {
    standard: {
      pictograms: 2,
      primaryHazards: 1,
      secondaryHazards: 0,
      precautions: 0,
    },
    qrcode: { pictograms: 1, hazardTeasers: 1 },
  },
  medium: {
    standard: {
      pictograms: 2,
      primaryHazards: 2,
      secondaryHazards: 0,
      precautions: 2,
    },
    qrcode: { pictograms: 1, hazardTeasers: 1 },
  },
  large: {
    standard: {
      pictograms: 3,
      primaryHazards: 3,
      secondaryHazards: 0,
      precautions: 3,
    },
    qrcode: { pictograms: 2, hazardTeasers: 1 },
  },
};

const STOCK_PRESETS = [
  {
    id: "small-strip",
    aliases: ["small-landscape"],
    name: "Vial Strip",
    note: "Compact landscape stock for tubes and narrow bottles.",
    nameKey: "label.stockPresetSmallStrip",
    noteKey: "label.stockPresetSmallStripNote",
    size: "small",
    orientation: "landscape",
    columns: 4,
    rows: 4,
    labelWidthMm: 70,
    labelHeightMm: 24,
    pagePaddingMm: 6,
    columnGapMm: 3,
    rowGapMm: 3,
    offsetXmm: 0,
    offsetYmm: 0,
    outputRole: "supplemental",
    pickerPriority: 50,
  },
  {
    id: "small-rack",
    aliases: ["small"],
    name: "Bench Rack",
    note: "Portrait stock with more rows for bench-side secondary labels.",
    nameKey: "label.stockPresetSmallRack",
    noteKey: "label.stockPresetSmallRackNote",
    size: "small",
    orientation: "portrait",
    columns: 3,
    rows: 5,
    labelWidthMm: 54,
    labelHeightMm: 32,
    pagePaddingMm: 8,
    columnGapMm: 3,
    rowGapMm: 3,
    offsetXmm: 0,
    offsetYmm: 0,
    outputRole: "supplemental",
    pickerPriority: 60,
    hiddenFromPrimaryPicker: true,
  },
  {
    id: "medium-bottle",
    aliases: ["medium"],
    name: "Bottle Primary",
    note: "Balanced default for common bottle labels.",
    nameKey: "label.stockPresetMediumBottle",
    noteKey: "label.stockPresetMediumBottleNote",
    size: "medium",
    orientation: "portrait",
    columns: 2,
    rows: 4,
    labelWidthMm: 95,
    labelHeightMm: 50,
    pagePaddingMm: 8,
    columnGapMm: 4,
    rowGapMm: 4,
    offsetXmm: 0,
    offsetYmm: 0,
    outputRole: "primary-candidate",
    pickerPriority: 30,
  },
  {
    id: "avery-5163",
    aliases: ["2x4-inch", "avery-2x4"],
    name: "2 x 4 in Bottle",
    note: "Common Letter-sheet bottle label size for North American office printers.",
    nameKey: "label.stockPresetAvery5163",
    noteKey: "label.stockPresetAvery5163Note",
    size: "medium",
    orientation: "landscape",
    pageSize: "Letter",
    columns: 2,
    rows: 5,
    labelWidthMm: 101.6,
    labelHeightMm: 50.8,
    pagePaddingMm: 7,
    columnGapMm: 4,
    rowGapMm: 0,
    offsetXmm: 0,
    offsetYmm: 0,
    outputRole: "primary-candidate",
    pickerPriority: 35,
  },
  {
    id: "avery-5164",
    aliases: ["3.333x4-inch", "avery-large"],
    name: "3-1/3 x 4 in Large",
    note: "Roomier Letter-sheet label for dense bottle or container content.",
    nameKey: "label.stockPresetAvery5164",
    noteKey: "label.stockPresetAvery5164Note",
    size: "large",
    orientation: "portrait",
    pageSize: "Letter",
    columns: 2,
    rows: 3,
    labelWidthMm: 84.7,
    labelHeightMm: 101.6,
    pagePaddingMm: 7,
    columnGapMm: 4,
    rowGapMm: 0,
    offsetXmm: 0,
    offsetYmm: 0,
    outputRole: "primary-candidate",
    pickerPriority: 36,
  },
  {
    id: "brother-62mm-continuous",
    aliases: ["dk-2205", "62mm-continuous"],
    name: "62 mm Continuous",
    note: "Common Brother/DK-style continuous roll width for supplemental bench labels.",
    nameKey: "label.stockPresetBrother62",
    noteKey: "label.stockPresetBrother62Note",
    size: "small",
    orientation: "landscape",
    columns: 3,
    rows: 4,
    labelWidthMm: 62,
    labelHeightMm: 40,
    pagePaddingMm: 8,
    columnGapMm: 4,
    rowGapMm: 4,
    offsetXmm: 0,
    offsetYmm: 0,
    outputRole: "supplemental",
    pickerPriority: 55,
  },
  {
    id: "medium-rack",
    aliases: ["medium-landscape"],
    name: "Rack Landscape",
    note: "Wider labels for trays, boxes, and shallow containers.",
    nameKey: "label.stockPresetMediumRack",
    noteKey: "label.stockPresetMediumRackNote",
    size: "medium",
    orientation: "landscape",
    columns: 3,
    rows: 3,
    labelWidthMm: 90,
    labelHeightMm: 38,
    pagePaddingMm: 8,
    columnGapMm: 4,
    rowGapMm: 4,
    offsetXmm: 0,
    offsetYmm: 0,
    outputRole: "supplemental",
    pickerPriority: 70,
    hiddenFromPrimaryPicker: true,
  },
  {
    id: "large-primary",
    aliases: ["large"],
    name: "Large Primary",
    note: "Roomiest preset when the full hazard hierarchy needs to breathe.",
    nameKey: "label.stockPresetLargePrimary",
    noteKey: "label.stockPresetLargePrimaryNote",
    size: "large",
    orientation: "portrait",
    columns: 1,
    rows: 3,
    labelWidthMm: 140,
    labelHeightMm: 88,
    pagePaddingMm: 10,
    columnGapMm: 6,
    rowGapMm: 6,
    offsetXmm: 0,
    offsetYmm: 0,
    outputRole: "primary-candidate",
    pickerPriority: 20,
  },
  {
    id: "a4-primary",
    aliases: ["full-page-primary"],
    name: "A4 Primary",
    note: "Single full-page primary label for dense shipped-container content and proofing.",
    nameKey: "label.stockPresetA4Primary",
    noteKey: "label.stockPresetA4PrimaryNote",
    size: "large",
    orientation: "portrait",
    columns: 1,
    rows: 1,
    labelWidthMm: 180,
    labelHeightMm: 250,
    pagePaddingMm: 8,
    columnGapMm: 0,
    rowGapMm: 0,
    offsetXmm: 0,
    offsetYmm: 0,
    pageSize: "A4",
    outputRole: "full-page-primary",
    pickerPriority: 10,
  },
  {
    id: "letter-primary",
    aliases: ["letter-full-page-primary", "us-letter-primary"],
    name: "Letter Primary",
    note: "Single US Letter primary label for dense content and North American printers.",
    nameKey: "label.stockPresetLetterPrimary",
    noteKey: "label.stockPresetLetterPrimaryNote",
    size: "large",
    orientation: "portrait",
    columns: 1,
    rows: 1,
    labelWidthMm: 186,
    labelHeightMm: 236,
    pagePaddingMm: 8,
    columnGapMm: 0,
    rowGapMm: 0,
    offsetXmm: 0,
    offsetYmm: 0,
    pageSize: "Letter",
    outputRole: "full-page-primary",
    pickerPriority: 11,
  },
];

const PRESET_INDEX = STOCK_PRESETS.reduce((acc, preset) => {
  acc[preset.id] = preset;
  preset.aliases.forEach((alias) => {
    acc[alias] = preset;
  });
  return acc;
}, {});

export const LABEL_STOCK_PRESETS = STOCK_PRESETS;
export const LABEL_STOCK_PICKER_PRESETS = STOCK_PRESETS.filter(
  (preset) => !preset.hiddenFromPrimaryPicker,
).sort((a, b) => (a.pickerPriority ?? 999) - (b.pickerPriority ?? 999));
export const DEFAULT_LABEL_STOCK_ID = "large-primary";
export const FULL_PAGE_PRIMARY_STOCK_IDS = Object.freeze([
  "a4-primary",
  "letter-primary",
]);

export function getLabelStockPresetDisplay(
  presetOrId,
  t = (key, options = {}) => options.defaultValue ?? key,
) {
  const preset =
    typeof presetOrId === "string" ? PRESET_INDEX[presetOrId] : presetOrId;
  if (!preset) {
    return { name: "", note: "" };
  }

  return {
    name: t(preset.nameKey || preset.id, { defaultValue: preset.name }),
    note: t(preset.noteKey || `${preset.id}.note`, {
      defaultValue: preset.note,
    }),
  };
}

const DEFAULT_PRESET = PRESET_INDEX[DEFAULT_LABEL_STOCK_ID];

const VALID_TEMPLATES = new Set(["icon", "standard", "full", "qrcode"]);
const VALID_LABEL_PURPOSES = new Set(["shipping", "qrSupplement", "quickId"]);
const VALID_ORIENTATIONS = new Set(["portrait", "landscape"]);
const VALID_NAME_DISPLAYS = new Set(["both", "en", "zh"]);
const VALID_COLOR_MODES = new Set(["color", "bw"]);
const VALID_PAGE_SIZES = new Set(["A4", "Letter"]);

const formatMm = (value) => `${value}mm`;
const roundTo = (value, places = 1) => {
  const factor = 10 ** places;
  return Math.round(value * factor) / factor;
};
const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

const coerceNumber = (
  value,
  fallback,
  { min = Number.NEGATIVE_INFINITY, max = Number.POSITIVE_INFINITY } = {},
) => {
  if (value === "" || value == null) return fallback;
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return fallback;
  if (parsed < min) return min;
  if (parsed > max) return max;
  return parsed;
};

const coerceEnum = (value, valid, fallback) =>
  valid.has(value) ? value : fallback;

function getPreset(source) {
  if (!source) return DEFAULT_PRESET;
  return PRESET_INDEX[source] || DEFAULT_PRESET;
}

export function isFullPagePrimaryStockId(stockId) {
  return FULL_PAGE_PRIMARY_STOCK_IDS.includes(stockId);
}

function getBaseLayout(size = "medium", orientation = "portrait") {
  const exactMatches = STOCK_PRESETS.filter(
    (preset) => preset.size === size && preset.orientation === orientation,
  );
  const sizeMatches = STOCK_PRESETS.filter((preset) => preset.size === size);
  const fallback =
    exactMatches.find((preset) => !preset.pageSize || preset.pageSize === "A4") ||
    exactMatches[0] ||
    sizeMatches.find((preset) => !preset.pageSize || preset.pageSize === "A4") ||
    sizeMatches[0] ||
    DEFAULT_PRESET;

  return fallback;
}

export const DEFAULT_LABEL_CONFIG = Object.freeze({
  schemaVersion: 2,
  labelPurpose: "shipping",
  template: "full",
  size: PRESET_INDEX["large-primary"].size,
  orientation: PRESET_INDEX["large-primary"].orientation,
  nameDisplay: "both",
  colorMode: "color",
  stockPreset: PRESET_INDEX["large-primary"].id,
  stockPresetName: PRESET_INDEX["large-primary"].name,
  columns: PRESET_INDEX["large-primary"].columns,
  rows: PRESET_INDEX["large-primary"].rows,
  perPage:
    PRESET_INDEX["large-primary"].columns * PRESET_INDEX["large-primary"].rows,
  labelWidthMm: PRESET_INDEX["large-primary"].labelWidthMm,
  labelHeightMm: PRESET_INDEX["large-primary"].labelHeightMm,
  pageMarginMm: PAGE_MARGIN_MM,
  pagePaddingMm: PRESET_INDEX["large-primary"].pagePaddingMm,
  columnGapMm: PRESET_INDEX["large-primary"].columnGapMm,
  rowGapMm: PRESET_INDEX["large-primary"].rowGapMm,
  offsetXmm: PRESET_INDEX["large-primary"].offsetXmm,
  offsetYmm: PRESET_INDEX["large-primary"].offsetYmm,
});

const inferLabelPurpose = (template) => {
  if (template === "qrcode") return "qrSupplement";
  if (template === "icon") return "quickId";
  return DEFAULT_LABEL_CONFIG.labelPurpose;
};

const getDefaultPresetForPurpose = (purpose) => {
  if (purpose === "qrSupplement") return PRESET_INDEX["small-strip"];
  if (purpose === "quickId") return PRESET_INDEX["brother-62mm-continuous"];
  return DEFAULT_PRESET;
};

function resolveTypographyMetrics(normalized) {
  const base = TYPOGRAPHY_BY_SIZE[normalized.size] || TYPOGRAPHY_BY_SIZE.medium;
  const shortSide = Math.min(normalized.labelWidthMm, normalized.labelHeightMm);
  const area = normalized.labelWidthMm * normalized.labelHeightMm;
  const areaScale = Math.sqrt(area / (95 * 50));
  const isCompactStrip =
    normalized.size === "small" &&
    (normalized.labelHeightMm <= 32 || normalized.labelWidthMm <= 54);
  const isFullPage =
    normalized.labelPurpose === "shipping" &&
    normalized.template === "full" &&
    (isFullPagePrimaryStockId(normalized.stockPreset) ||
      (normalized.labelWidthMm >= 170 && normalized.labelHeightMm >= 200));

  if (isFullPage) {
    const fullPagePictogramMm = clamp(roundTo(shortSide * 0.12, 1), 26, 30);
    return {
      ...base,
      fontPx: 13,
      titlePx: 22,
      pictogramPx: 44,
      qrBoxMm: 36,
      signalPx: 17,
      hazardPx: 9,
      compliancePictogramMm: fullPagePictogramMm,
      complianceStatementPx: 7,
      complianceLineHeight: 1.08,
      complianceColumns: 2,
      standardPictogramMm: 30,
      standardRailColumnMm: 66,
      standardPictogramGapMm: 2,
      qrPictogramMm: 14,
    };
  }

  const fontPx = clamp(roundTo(9.4 * areaScale, 0), 8, 14);
  const titlePx = clamp(roundTo(fontPx + 2.5, 0), 10, 18);
  const signalPx = clamp(roundTo(fontPx + 1, 0), 9, 16);
  const hazardPx = clamp(roundTo(fontPx - 2.2, 0), 6, 11);
  const pictogramPx = clamp(roundTo(shortSide * 1.05, 0), 24, 44);
  const compliancePictogramMm = clamp(roundTo(shortSide * 0.28, 1), 10, 28);
  const complianceStatementPx = clamp(roundTo(fontPx - 2.5, 1), 5.5, 10);
  const qrBoxMm = clamp(
    roundTo(shortSide * (isCompactStrip ? 0.66 : 0.72), 1),
    isCompactStrip ? 14 : 16,
    normalized.size === "large" ? 42 : 36,
  );
  const standardPictogramRatio =
    normalized.size === "large" ? 0.27 : isCompactStrip ? 0.38 : 0.3;
  const standardPictogramMm = clamp(
    roundTo(shortSide * standardPictogramRatio, 1),
    isCompactStrip ? 9 : 8,
    normalized.size === "large" ? 24 : normalized.size === "medium" ? 18 : 13,
  );
  const standardPictogramGapMm = isCompactStrip
    ? 0.55
    : normalized.size === "large"
      ? 1.1
      : 0.8;
  const railInsetMm = isCompactStrip
    ? 1.3
    : normalized.size === "large"
      ? 3
      : 2.1;
  const standardRailColumnMm = clamp(
    roundTo(standardPictogramMm * 2 + standardPictogramGapMm + railInsetMm, 1),
    14,
    Math.min(roundTo(normalized.labelWidthMm * 0.42, 1), 56),
  );
  const qrPictogramMm = clamp(
    roundTo(shortSide * (isCompactStrip ? 0.32 : 0.23), 1),
    7.5,
    normalized.size === "large" ? 13 : 10.5,
  );

  return {
    ...base,
    fontPx,
    titlePx,
    pictogramPx,
    qrBoxMm,
    signalPx,
    hazardPx,
    compliancePictogramMm,
    complianceStatementPx,
    complianceLineHeight: areaScale > 1.4 ? 1.16 : 1.1,
    complianceColumns: area > 9000 ? 2 : 1,
    standardPictogramMm,
    standardRailColumnMm,
    standardPictogramGapMm,
    qrPictogramMm,
  };
}

function resolveTemplateBudgets(normalized) {
  const base =
    TEMPLATE_BUDGETS_BY_SIZE[normalized.size] ||
    TEMPLATE_BUDGETS_BY_SIZE.medium;
  const area = normalized.labelWidthMm * normalized.labelHeightMm;
  const shortSide = Math.min(normalized.labelWidthMm, normalized.labelHeightMm);
  const isBilingual = normalized.nameDisplay === "both";
  const compactPenalty = isBilingual && area < 3200 ? 1 : 0;

  let primaryHazards = 1;
  let precautions = 0;

  if (area >= 11000 || shortSide >= 80) {
    primaryHazards = 5;
    precautions = 4;
  } else if (area >= 4500 || shortSide >= 48) {
    primaryHazards = 3;
    precautions = 2;
  } else if (area >= 2400 || shortSide >= 38) {
    primaryHazards = 2;
    precautions = 1;
  }

  primaryHazards = Math.max(1, primaryHazards - compactPenalty);
  precautions = Math.max(0, precautions - compactPenalty);

  return {
    ...base,
    standard: {
      ...base.standard,
      primaryHazards,
      precautions,
    },
    qrcode: {
      ...base.qrcode,
      hazardTeasers: area >= 4500 ? 2 : 1,
    },
  };
}

function resolveLabelFormFactor(normalized, stock) {
  if (
    isFullPagePrimaryStockId(normalized.stockPreset) ||
    (normalized.labelWidthMm >= 170 && normalized.labelHeightMm >= 200)
  ) {
    return "full-page";
  }

  const area = normalized.labelWidthMm * normalized.labelHeightMm;
  if (
    normalized.size === "small" &&
    (normalized.labelHeightMm <= 32 || normalized.labelWidthMm <= 54)
  ) {
    return "strip";
  }

  if (area < 3200 || stock?.outputRole === "supplemental") {
    return "compact";
  }

  if (area >= 10000 || normalized.labelWidthMm >= 120 || normalized.labelHeightMm >= 80) {
    return "roomy";
  }

  return "bottle";
}

export function normalizePrintLabelConfig(labelConfig = {}) {
  const calibration = labelConfig.calibration || {};
  const explicitPreset =
    labelConfig.stockPreset || labelConfig.stockId || labelConfig.stock || null;
  const labelPurpose = coerceEnum(
    labelConfig.labelPurpose ||
      labelConfig.purpose ||
      inferLabelPurpose(labelConfig.template),
    VALID_LABEL_PURPOSES,
    DEFAULT_LABEL_CONFIG.labelPurpose,
  );
  const purposePreset = getDefaultPresetForPurpose(labelPurpose);
  const preset =
    explicitPreset === "custom"
      ? null
      : explicitPreset
        ? getPreset(explicitPreset)
        : null;
  const base =
    preset ||
    getBaseLayout(
      labelConfig.size || purposePreset.size,
      labelConfig.orientation || purposePreset.orientation,
    );
  const size = labelConfig.size || base.size;
  const orientation = coerceEnum(
    labelConfig.orientation || base.orientation,
    VALID_ORIENTATIONS,
    base.orientation,
  );

  const columns = coerceNumber(labelConfig.columns, base.columns, {
    min: 1,
    max: 6,
  });
  const rows = coerceNumber(labelConfig.rows, base.rows, {
    min: 1,
    max: 12,
  });

  return {
    schemaVersion: 2,
    labelPurpose,
    template: coerceEnum(
      labelConfig.template,
      VALID_TEMPLATES,
      DEFAULT_LABEL_CONFIG.template,
    ),
    size,
    orientation,
    nameDisplay: coerceEnum(
      labelConfig.nameDisplay,
      VALID_NAME_DISPLAYS,
      DEFAULT_LABEL_CONFIG.nameDisplay,
    ),
    colorMode: coerceEnum(
      labelConfig.colorMode,
      VALID_COLOR_MODES,
      DEFAULT_LABEL_CONFIG.colorMode,
    ),
    stockPreset:
      explicitPreset === "custom" ? "custom" : preset ? preset.id : base.id,
    stockPresetName:
      explicitPreset === "custom"
        ? labelConfig.stockPresetName || "Custom Tuning"
        : preset?.name || base.name,
    pageSize: coerceEnum(
      labelConfig.pageSize || preset?.pageSize || base.pageSize,
      VALID_PAGE_SIZES,
      "A4",
    ),
    columns,
    rows,
    perPage: columns * rows,
    labelWidthMm: coerceNumber(labelConfig.labelWidthMm, base.labelWidthMm, {
      min: 24,
      max: 200,
    }),
    labelHeightMm: coerceNumber(labelConfig.labelHeightMm, base.labelHeightMm, {
      min: 18,
      max: 260,
    }),
    pageMarginMm: coerceNumber(
      labelConfig.pageMarginMm ?? calibration.pageMarginMm,
      PAGE_MARGIN_MM,
      {
        min: 0,
        max: 25,
      },
    ),
    pagePaddingMm: coerceNumber(
      labelConfig.pagePaddingMm ?? calibration.pagePaddingMm,
      base.pagePaddingMm,
      {
        min: 0,
        max: 25,
      },
    ),
    columnGapMm: coerceNumber(
      labelConfig.columnGapMm ?? calibration.gapMm,
      base.columnGapMm,
      {
        min: 0,
        max: 20,
      },
    ),
    rowGapMm: coerceNumber(
      labelConfig.rowGapMm ?? calibration.gapMm,
      base.rowGapMm,
      {
        min: 0,
        max: 20,
      },
    ),
    offsetXmm: coerceNumber(
      labelConfig.offsetXmm ?? calibration.offsetXmm ?? calibration.nudgeXmm,
      base.offsetXmm,
      {
        min: -12,
        max: 12,
      },
    ),
    offsetYmm: coerceNumber(
      labelConfig.offsetYmm ?? calibration.offsetYmm ?? calibration.nudgeYmm,
      base.offsetYmm,
      {
        min: -12,
        max: 12,
      },
    ),
  };
}

export function getLabelStockPreset(labelConfig = {}) {
  const normalized = normalizePrintLabelConfig(labelConfig);
  return normalized.stockPreset === "custom"
    ? {
        id: "custom",
        name: normalized.stockPresetName,
        note: null,
        size: normalized.size,
        orientation: normalized.orientation,
        columns: normalized.columns,
        rows: normalized.rows,
        labelWidthMm: normalized.labelWidthMm,
        labelHeightMm: normalized.labelHeightMm,
        pagePaddingMm: normalized.pagePaddingMm,
        columnGapMm: normalized.columnGapMm,
        rowGapMm: normalized.rowGapMm,
        offsetXmm: normalized.offsetXmm,
        offsetYmm: normalized.offsetYmm,
        pageSize: normalized.pageSize,
        outputRole: "custom",
      }
    : getPreset(normalized.stockPreset);
}

export function resolvePrintLayoutConfig(labelConfig = {}) {
  const normalized = normalizePrintLabelConfig(labelConfig);
  const stock = getLabelStockPreset(normalized);
  const metrics = resolveTypographyMetrics(normalized);
  const budgets = resolveTemplateBudgets(normalized);
  const pageSize = normalized.pageSize || stock.pageSize || "A4";
  const pageDimensions =
    PAGE_SIZE_DIMENSIONS_MM[pageSize]?.[normalized.orientation] ||
    PAGE_SIZE_DIMENSIONS_MM.A4[normalized.orientation] ||
    PAGE_SIZE_DIMENSIONS_MM.A4.portrait;
  const pageMinHeightMm =
    pageSize === "Letter"
      ? pageDimensions.height - 20
      : normalized.orientation === "landscape"
        ? metrics.minHeightLandscapeMm
        : metrics.minHeightPortraitMm;

  return {
    ...normalized,
    widthMm: normalized.labelWidthMm,
    heightMm: normalized.labelHeightMm,
    stockId: normalized.stockPreset,
    stock,
    pageSize,
    outputRole: stock.outputRole || null,
    formFactor: resolveLabelFormFactor(normalized, stock),
    note: stock.note || null,
    label: {
      widthMm: normalized.labelWidthMm,
      heightMm: normalized.labelHeightMm,
      width: formatMm(normalized.labelWidthMm),
      height: formatMm(normalized.labelHeightMm),
      padding: formatMm(metrics.labelPaddingMm),
      borderWidth: formatMm(metrics.borderMm),
      radius: formatMm(metrics.radiusMm),
    },
    typography: {
      fontSize: `${metrics.fontPx}px`,
      titleSize: `${metrics.titlePx}px`,
      imgSize: `${metrics.pictogramPx}px`,
      qrBox: formatMm(metrics.qrBoxMm),
      signalSize: `${metrics.signalPx}px`,
      hazardSize: `${metrics.hazardPx}px`,
      compliancePictogramSize: formatMm(metrics.compliancePictogramMm),
      complianceStatementSize: `${metrics.complianceStatementPx}px`,
      complianceLineHeight: String(metrics.complianceLineHeight),
      complianceColumns: metrics.complianceColumns,
      standardPictogramSize: formatMm(metrics.standardPictogramMm),
      standardRailColumn: formatMm(metrics.standardRailColumnMm),
      standardPictogramGap: formatMm(metrics.standardPictogramGapMm),
      qrPictogramSize: formatMm(metrics.qrPictogramMm),
    },
    page: {
      size: pageSize,
      widthMm: pageDimensions.width,
      heightMm: pageDimensions.height,
      cols: normalized.columns,
      rows: normalized.rows,
      perPage: normalized.perPage,
      marginMm: normalized.pageMarginMm,
      margin: formatMm(normalized.pageMarginMm),
      paddingMm: normalized.pagePaddingMm,
      padding: formatMm(normalized.pagePaddingMm),
      columnGapMm: normalized.columnGapMm,
      columnGap: formatMm(normalized.columnGapMm),
      rowGapMm: normalized.rowGapMm,
      rowGap: formatMm(normalized.rowGapMm),
      gapMm: normalized.columnGapMm,
      gap: formatMm(normalized.columnGapMm),
      minHeight: formatMm(
        pageMinHeightMm,
      ),
      footerReserveRightMm: FOOTER_RESERVE_RIGHT_MM,
      footerReserveRight: formatMm(FOOTER_RESERVE_RIGHT_MM),
      nudgeXmm: normalized.offsetXmm,
      nudgeYmm: normalized.offsetYmm,
      nudgeX: formatMm(normalized.offsetXmm),
      nudgeY: formatMm(normalized.offsetYmm),
    },
    templateBudgets: budgets,
  };
}
