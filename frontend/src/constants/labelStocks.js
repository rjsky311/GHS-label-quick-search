const PAGE_MARGIN_MM = 5;
const FOOTER_RESERVE_RIGHT_MM = 30;

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
export const DEFAULT_LABEL_STOCK_ID = "medium-bottle";

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
const VALID_ORIENTATIONS = new Set(["portrait", "landscape"]);
const VALID_NAME_DISPLAYS = new Set(["both", "en", "zh"]);
const VALID_COLOR_MODES = new Set(["color", "bw"]);

const formatMm = (value) => `${value}mm`;

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

function getBaseLayout(size = "medium", orientation = "portrait") {
  const fallback =
    STOCK_PRESETS.find(
      (preset) => preset.size === size && preset.orientation === orientation,
    ) ||
    STOCK_PRESETS.find((preset) => preset.size === size) ||
    DEFAULT_PRESET;

  return fallback;
}

export const DEFAULT_LABEL_CONFIG = Object.freeze({
  schemaVersion: 2,
  template: "standard",
  size: DEFAULT_PRESET.size,
  orientation: DEFAULT_PRESET.orientation,
  nameDisplay: "both",
  colorMode: "color",
  stockPreset: DEFAULT_PRESET.id,
  stockPresetName: DEFAULT_PRESET.name,
  columns: DEFAULT_PRESET.columns,
  rows: DEFAULT_PRESET.rows,
  perPage: DEFAULT_PRESET.columns * DEFAULT_PRESET.rows,
  labelWidthMm: DEFAULT_PRESET.labelWidthMm,
  labelHeightMm: DEFAULT_PRESET.labelHeightMm,
  pageMarginMm: PAGE_MARGIN_MM,
  pagePaddingMm: DEFAULT_PRESET.pagePaddingMm,
  columnGapMm: DEFAULT_PRESET.columnGapMm,
  rowGapMm: DEFAULT_PRESET.rowGapMm,
  offsetXmm: DEFAULT_PRESET.offsetXmm,
  offsetYmm: DEFAULT_PRESET.offsetYmm,
});

export function normalizePrintLabelConfig(labelConfig = {}) {
  const calibration = labelConfig.calibration || {};
  const explicitPreset =
    labelConfig.stockPreset || labelConfig.stockId || labelConfig.stock || null;
  const preset =
    explicitPreset === "custom"
      ? null
      : explicitPreset
        ? getPreset(explicitPreset)
        : null;
  const base =
    preset || getBaseLayout(labelConfig.size, labelConfig.orientation);
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
    columns,
    rows,
    perPage: columns * rows,
    labelWidthMm: coerceNumber(labelConfig.labelWidthMm, base.labelWidthMm, {
      min: 24,
      max: 180,
    }),
    labelHeightMm: coerceNumber(labelConfig.labelHeightMm, base.labelHeightMm, {
      min: 18,
      max: 250,
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
      }
    : getPreset(normalized.stockPreset);
}

export function resolvePrintLayoutConfig(labelConfig = {}) {
  const normalized = normalizePrintLabelConfig(labelConfig);
  const stock = getLabelStockPreset(normalized);
  const metrics =
    TYPOGRAPHY_BY_SIZE[normalized.size] || TYPOGRAPHY_BY_SIZE.medium;
  const budgets =
    TEMPLATE_BUDGETS_BY_SIZE[normalized.size] ||
    TEMPLATE_BUDGETS_BY_SIZE.medium;

  return {
    ...normalized,
    widthMm: normalized.labelWidthMm,
    heightMm: normalized.labelHeightMm,
    stockId: normalized.stockPreset,
    stock,
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
    },
    page: {
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
        normalized.orientation === "landscape"
          ? metrics.minHeightLandscapeMm
          : metrics.minHeightPortraitMm,
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
