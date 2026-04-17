const DEFAULT_TEMPLATE_BUDGETS = {
  standard: {
    primaryHazards: 2,
    secondaryHazards: 2,
    precautions: 4,
  },
  qrcode: {
    pictograms: 2,
    hazardTeasers: 1,
  },
};

const coerceNumber = (value, fallback) => {
  if (value === "" || value == null) return fallback;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const formatMm = (value) => `${value}mm`;

export const LABEL_STOCK_PRESETS = {
  small: {
    id: "small",
    legacySize: "small",
    labelName: "60 x 45 mm vial label",
    label: {
      widthMm: 60,
      heightMm: 45,
      paddingMm: 2.3,
      borderMm: 0.5,
      radiusMm: 2,
    },
    typography: {
      fontPx: 10,
      titlePx: 12,
      pictogramPx: 22,
      qrBoxMm: 25,
      signalPx: 11,
      hazardPx: 8,
    },
    page: {
      marginMm: 5,
      paddingMm: 2,
      gapMm: 3,
      minHeightPortraitMm: 277,
      minHeightLandscapeMm: 190,
      footerReserveRightMm: 30,
      sheet: {
        portrait: { cols: 3, rows: 5 },
        landscape: { cols: 4, rows: 4 },
      },
    },
    templateBudgets: {
      standard: {
        primaryHazards: 1,
        secondaryHazards: 1,
        precautions: 2,
      },
      qrcode: {
        pictograms: 2,
        hazardTeasers: 1,
      },
    },
  },
  medium: {
    id: "medium",
    legacySize: "medium",
    labelName: "80 x 60 mm bottle label",
    label: {
      widthMm: 80,
      heightMm: 60,
      paddingMm: 2.5,
      borderMm: 0.55,
      radiusMm: 2,
    },
    typography: {
      fontPx: 12,
      titlePx: 14,
      pictogramPx: 30,
      qrBoxMm: 32,
      signalPx: 13,
      hazardPx: 9,
    },
    page: {
      marginMm: 5,
      paddingMm: 2,
      gapMm: 3,
      minHeightPortraitMm: 277,
      minHeightLandscapeMm: 190,
      footerReserveRightMm: 30,
      sheet: {
        portrait: { cols: 2, rows: 4 },
        landscape: { cols: 3, rows: 3 },
      },
    },
    templateBudgets: {
      standard: {
        primaryHazards: 2,
        secondaryHazards: 2,
        precautions: 4,
      },
      qrcode: {
        pictograms: 3,
        hazardTeasers: 2,
      },
    },
  },
  large: {
    id: "large",
    legacySize: "large",
    labelName: "105 x 80 mm bottle label",
    label: {
      widthMm: 105,
      heightMm: 80,
      paddingMm: 2.8,
      borderMm: 0.6,
      radiusMm: 2.2,
    },
    typography: {
      fontPx: 14,
      titlePx: 16,
      pictogramPx: 38,
      qrBoxMm: 40,
      signalPx: 15,
      hazardPx: 11,
    },
    page: {
      marginMm: 5,
      paddingMm: 2,
      gapMm: 3,
      minHeightPortraitMm: 277,
      minHeightLandscapeMm: 190,
      footerReserveRightMm: 30,
      sheet: {
        portrait: { cols: 1, rows: 3 },
        landscape: { cols: 2, rows: 2 },
      },
    },
    templateBudgets: {
      standard: {
        primaryHazards: 3,
        secondaryHazards: 3,
        precautions: 6,
      },
      qrcode: {
        pictograms: 4,
        hazardTeasers: 2,
      },
    },
  },
};

export const DEFAULT_LABEL_STOCK_ID = "medium";

export function getLabelStockPreset(labelConfig = {}) {
  const requestedId =
    labelConfig.stockId || labelConfig.stock || labelConfig.size || DEFAULT_LABEL_STOCK_ID;
  return LABEL_STOCK_PRESETS[requestedId] || LABEL_STOCK_PRESETS[DEFAULT_LABEL_STOCK_ID];
}

export function resolvePrintLayoutConfig(labelConfig = {}) {
  const stock = getLabelStockPreset(labelConfig);
  const orientation = labelConfig.orientation === "landscape" ? "landscape" : "portrait";
  const sheet = stock.page.sheet[orientation] || stock.page.sheet.portrait;
  const calibration = labelConfig.calibration || {};
  const nudgeXmm = coerceNumber(
    calibration.nudgeXmm ?? calibration.offsetXmm ?? labelConfig.nudgeXmm ?? labelConfig.offsetXmm,
    0
  );
  const nudgeYmm = coerceNumber(
    calibration.nudgeYmm ?? calibration.offsetYmm ?? labelConfig.nudgeYmm ?? labelConfig.offsetYmm,
    0
  );
  const gapMm = coerceNumber(calibration.gapMm ?? labelConfig.gapMm, stock.page.gapMm);
  const pageMarginMm = coerceNumber(
    calibration.pageMarginMm ?? labelConfig.pageMarginMm,
    stock.page.marginMm
  );
  const templateBudgets = {
    standard: {
      ...DEFAULT_TEMPLATE_BUDGETS.standard,
      ...(stock.templateBudgets?.standard || {}),
    },
    qrcode: {
      ...DEFAULT_TEMPLATE_BUDGETS.qrcode,
      ...(stock.templateBudgets?.qrcode || {}),
    },
  };

  return {
    stockId: stock.id,
    size: stock.legacySize,
    template: labelConfig.template || "standard",
    orientation,
    nameDisplay: labelConfig.nameDisplay || "both",
    colorMode: labelConfig.colorMode === "bw" ? "bw" : "color",
    stock,
    label: {
      widthMm: stock.label.widthMm,
      heightMm: stock.label.heightMm,
      width: formatMm(stock.label.widthMm),
      height: formatMm(stock.label.heightMm),
      padding: formatMm(stock.label.paddingMm),
      borderWidth: formatMm(stock.label.borderMm),
      radius: formatMm(stock.label.radiusMm),
    },
    typography: {
      fontSize: `${stock.typography.fontPx}px`,
      titleSize: `${stock.typography.titlePx}px`,
      imgSize: `${stock.typography.pictogramPx}px`,
      qrBox: formatMm(stock.typography.qrBoxMm),
      signalSize: `${stock.typography.signalPx}px`,
      hazardSize: `${stock.typography.hazardPx}px`,
    },
    page: {
      cols: sheet.cols,
      rows: sheet.rows,
      perPage: sheet.cols * sheet.rows,
      gapMm,
      gap: formatMm(gapMm),
      marginMm: pageMarginMm,
      margin: formatMm(pageMarginMm),
      padding: formatMm(stock.page.paddingMm),
      minHeight: formatMm(
        orientation === "landscape"
          ? stock.page.minHeightLandscapeMm
          : stock.page.minHeightPortraitMm
      ),
      footerReserveRight: formatMm(stock.page.footerReserveRightMm),
      nudgeXmm,
      nudgeYmm,
      nudgeX: formatMm(nudgeXmm),
      nudgeY: formatMm(nudgeYmm),
    },
    templateBudgets,
  };
}
