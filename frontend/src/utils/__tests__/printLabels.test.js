jest.mock("@/i18n", () => ({
  t: Object.assign((key) => key, { bind: () => (key) => key }),
  language: "en",
}));
jest.mock("@/constants/ghs", () => ({
  GHS_IMAGES: {
    GHS01: "https://example.com/GHS01.svg",
    GHS02: "https://example.com/GHS02.svg",
    GHS03: "https://example.com/GHS03.svg",
    GHS04: "https://example.com/GHS04.svg",
    GHS05: "https://example.com/GHS05.svg",
    GHS06: "https://example.com/GHS06.svg",
    GHS07: "https://example.com/GHS07.svg",
    GHS08: "https://example.com/GHS08.svg",
  },
}));
jest.mock("@/utils/observability", () => ({
  recordObservabilityEvent: jest.fn(),
}));

import {
  buildPrintDocument,
  buildPrintDocumentModel,
  buildPrintPreviewDocument,
  inspectPrintContentFit,
  inspectPrintLayoutDocument,
  printLabels,
  getQRCodeUrl,
  getHazardFontTier,
  escapeHtml,
} from "../printLabels";
import { resolvePrintLayoutConfig } from "@/constants/labelStocks";
import { recordObservabilityEvent } from "@/utils/observability";

// ── Mock chemical fixtures ──
const mockChemical = {
  cas_number: "64-17-5",
  name_en: "Ethanol",
  name_zh: "乙醇",
  cid: 702,
  ghs_pictograms: [
    { code: "GHS02", name_zh: "易燃" },
    { code: "GHS07", name_zh: "驚嘆號" },
  ],
  hazard_statements: [
    { code: "H225", text_zh: "高度易燃液體和蒸氣" },
    { code: "H319", text_zh: "造成嚴重眼睛刺激" },
  ],
  signal_word: "Danger",
  signal_word_zh: "危險",
};

const mockChemicalNoGHS = {
  cas_number: "7732-18-5",
  name_en: "Water",
  name_zh: "水",
  ghs_pictograms: [],
  hazard_statements: [],
  signal_word: "",
  signal_word_zh: "",
};

// ── Helper to create mock iframe ──
// The iframe's contentWindow also records `afterprint` listeners so
// tests can simulate the browser firing the event when the print
// dialog closes.
function createMockIframe() {
  const mockImages = [];
  const mockIframeDoc = {
    open: jest.fn(),
    write: jest.fn(),
    close: jest.fn(),
    querySelectorAll: jest.fn(() => mockImages),
  };
  const afterPrintListeners = [];
  const mockIframeWindow = {
    focus: jest.fn(),
    print: jest.fn(),
    document: mockIframeDoc,
    addEventListener: jest.fn((event, cb) => {
      if (event === "afterprint") afterPrintListeners.push(cb);
    }),
    dispatchAfterPrint() {
      // Drain listeners (emulates { once: true } behaviour).
      const callbacks = afterPrintListeners.splice(0);
      callbacks.forEach((cb) => cb());
    },
  };
  const mockIframe = {
    id: "",
    style: { cssText: "" },
    contentDocument: mockIframeDoc,
    contentWindow: mockIframeWindow,
    remove: jest.fn(),
  };
  return { mockIframe, mockIframeDoc, mockIframeWindow, mockImages };
}

// ── Tests ──

const expandedPictogramCodes = (preview) =>
  preview.model.expandedLabels.flatMap((label) =>
    label.continuation?.pictograms
      ? label.continuation.pictograms.map((pictogram) => pictogram.code)
      : (label.ghs_pictograms || []).map((pictogram) => pictogram.code),
  );

describe("getQRCodeUrl", () => {
  it("generates a local QR data URI with default size", () => {
    const url = getQRCodeUrl("https://example.com");
    expect(url).toMatch(/^data:image\/gif;base64,/);
  });

  it("generates a larger local QR data URI with custom size", () => {
    const small = getQRCodeUrl("https://example.com", 100);
    const url = getQRCodeUrl("https://example.com", 200);
    expect(url.length).toBeGreaterThan(small.length);
  });

  it("generates distinct QR payloads for special-character targets", () => {
    const url = getQRCodeUrl("https://example.com?a=1&b=2");
    expect(url).toMatch(/^data:image\/gif;base64,/);
    expect(url).not.toBe(getQRCodeUrl("https://example.com"));
  });
});

describe("getHazardFontTier", () => {
  it("returns default tier for 1-5 hazards (medium)", () => {
    const tier = getHazardFontTier(3, "medium");
    expect(tier.fontSize).toBe("8px");
    expect(tier.lineHeight).toBe("1.2");
    expect(tier.marginBottom).toBe("0.8mm");
  });

  it("returns reduced tier for 6-8 hazards (medium)", () => {
    const tier = getHazardFontTier(6, "medium");
    expect(tier.fontSize).toBe("7px");
    expect(tier.lineHeight).toBe("1.15");
  });

  it("returns small tier for 9-12 hazards (medium)", () => {
    const tier = getHazardFontTier(10, "medium");
    expect(tier.fontSize).toBe("6px");
    expect(tier.lineHeight).toBe("1.1");
  });

  it("returns tiny tier for 13+ hazards (medium)", () => {
    const tier = getHazardFontTier(15, "medium");
    expect(tier.fontSize).toBe("5.5px");
    expect(tier.lineHeight).toBe("1.05");
  });

  it("scales appropriately for small labels", () => {
    const tier = getHazardFontTier(10, "small");
    expect(tier.fontSize).toBe("5.5px");
  });

  it("scales appropriately for large labels", () => {
    const tier = getHazardFontTier(10, "large");
    expect(tier.fontSize).toBe("7.5px");
  });

  it("defaults to medium when size is undefined", () => {
    const tier = getHazardFontTier(3, undefined);
    expect(tier.fontSize).toBe("8px");
  });
});

describe("inspectPrintLayoutDocument", () => {
  it("reports label, footer, and statement-code overflow before printing", () => {
    const root = document.createElement("div");
    root.innerHTML = `
      <div class="label">
        <div class="compliance-footer"></div>
        <span class="statement-code">P301+P330+P331</span>
      </div>
    `;

    const label = root.querySelector(".label");
    const footer = root.querySelector(".compliance-footer");
    const code = root.querySelector(".statement-code");

    Object.defineProperties(label, {
      clientHeight: { value: 100, configurable: true },
      scrollHeight: { value: 108, configurable: true },
      clientWidth: { value: 200, configurable: true },
      scrollWidth: { value: 200, configurable: true },
    });
    Object.defineProperties(footer, {
      offsetTop: { value: 94, configurable: true },
      offsetHeight: { value: 10, configurable: true },
    });
    Object.defineProperties(code, {
      clientHeight: { value: 10, configurable: true },
      scrollHeight: { value: 10, configurable: true },
      clientWidth: { value: 60, configurable: true },
      scrollWidth: { value: 72, configurable: true },
    });

    expect(inspectPrintLayoutDocument(root).map((issue) => issue.type)).toEqual(
      [
        "label-overflow",
        "compliance-footer-clipped",
        "statement-code-overflow",
      ],
    );
  });

  it("does not block a label solely because clamped identity text has horizontal scroll", () => {
    const root = document.createElement("div");
    root.innerHTML = `
      <div class="label">
        <div class="name-section">
          <div class="name-en">Very long display name controlled by CSS line clamp</div>
        </div>
      </div>
    `;

    const label = root.querySelector(".label");
    const nameSection = root.querySelector(".name-section");

    Object.defineProperties(label, {
      clientHeight: { value: 100, configurable: true },
      scrollHeight: { value: 100, configurable: true },
      clientWidth: { value: 180, configurable: true },
      scrollWidth: { value: 220, configurable: true },
    });
    Object.defineProperties(nameSection, {
      clientHeight: { value: 20, configurable: true },
      scrollHeight: { value: 20, configurable: true },
      clientWidth: { value: 160, configurable: true },
      scrollWidth: { value: 160, configurable: true },
    });

    expect(inspectPrintLayoutDocument(root)).toEqual([]);
  });

  it("reports clipped full-label inner panels before printing", () => {
    const root = document.createElement("div");
    root.innerHTML = `
      <div class="label label-full">
        <div class="compliance-core"></div>
        <div class="compliance-alert-panel"></div>
        <div class="compliance-statements-panel"></div>
        <div class="compliance-hazard-panel"></div>
        <div class="compliance-precaution-panel"></div>
        <div class="pictograms compliance-pictograms"></div>
      </div>
    `;

    const setOverflow = (selector, axis = "height") => {
      const element = root.querySelector(selector);
      Object.defineProperties(element, {
        clientHeight: {
          value: axis === "height" ? 40 : 100,
          configurable: true,
        },
        scrollHeight: {
          value: axis === "height" ? 50 : 100,
          configurable: true,
        },
        clientWidth: {
          value: axis === "width" ? 40 : 100,
          configurable: true,
        },
        scrollWidth: {
          value: axis === "width" ? 50 : 100,
          configurable: true,
        },
      });
    };

    setOverflow(".compliance-core");
    setOverflow(".compliance-alert-panel");
    setOverflow(".compliance-statements-panel");
    setOverflow(".compliance-hazard-panel");
    setOverflow(".compliance-precaution-panel");
    setOverflow(".pictograms.compliance-pictograms", "width");

    expect(inspectPrintLayoutDocument(root).map((issue) => issue.type)).toEqual(
      [
        "compliance-core-overflow",
        "compliance-alert-overflow",
        "compliance-statements-overflow",
        "compliance-hazards-overflow",
        "compliance-precautions-overflow",
        "compliance-pictograms-overflow",
      ],
    );
  });
});

describe("inspectPrintContentFit", () => {
  const denseChemical = {
    ...mockChemical,
    hazard_statements: Array.from({ length: 6 }, (_, index) => ({
      code: `H${300 + index}`,
      text_en: `Hazard ${index}`,
    })),
    precautionary_statements: Array.from({ length: 18 }, (_, index) => ({
      code: `P${300 + index}`,
      text_en: `Precaution ${index}`,
    })),
  };

  it("blocks dense shipped-container labels on regular large stock", () => {
    const model = buildPrintDocumentModel(
      [denseChemical],
      { labelPurpose: "shipping", template: "full", stockPreset: "large-primary" },
      {},
    );

    expect(inspectPrintContentFit(model)).toEqual([
      expect.objectContaining({
        type: "content-too-dense",
        statementCount: 24,
        maxStatements: 12,
      }),
    ]);
  });

  it("allows the same dense content on A4 primary stock", () => {
    const model = buildPrintDocumentModel(
      [denseChemical],
      { labelPurpose: "shipping", template: "full", stockPreset: "a4-primary" },
      {},
    );

    expect(inspectPrintContentFit(model)).toEqual([]);
  });
});

describe("print layout model", () => {
  it("defaults to the complete A4 label output", () => {
    const layout = resolvePrintLayoutConfig({});

    expect(layout.labelPurpose).toBe("shipping");
    expect(layout.template).toBe("full");
    expect(layout.stockId).toBe("a4-primary");
    expect(layout.size).toBe("large");
    expect(layout.page.perPage).toBe(1);
  });

  it("infers supplemental purposes for legacy compact template configs", () => {
    expect(resolvePrintLayoutConfig({ template: "qrcode" }).labelPurpose).toBe(
      "qrSupplement",
    );
    expect(resolvePrintLayoutConfig({ template: "icon" }).labelPurpose).toBe(
      "quickId",
    );
  });

  it("resolves legacy size selection into a stock preset config", () => {
    const layout = resolvePrintLayoutConfig({
      size: "small",
      template: "standard",
      orientation: "portrait",
    });

    expect(layout.stockId).toBe("small-rack");
    expect(layout.label.width).toBe("54mm");
    expect(layout.page.perPage).toBe(15);
  });

  it("supports A4 primary stock for dense complete labels", () => {
    const layout = resolvePrintLayoutConfig({ stockPreset: "a4-primary" });

    expect(layout.stockId).toBe("a4-primary");
    expect(layout.label.width).toBe("188mm");
    expect(layout.label.height).toBe("268mm");
    expect(layout.page.perPage).toBe(1);
  });

  it("refreshes fixed preset geometry from current stock definitions", () => {
    const layout = resolvePrintLayoutConfig({
      stockPreset: "a4-primary",
      pageSize: "Letter",
      columns: 2,
      rows: 3,
      labelWidthMm: 188,
      labelHeightMm: 260,
    });

    expect(layout.stockId).toBe("a4-primary");
    expect(layout.page.size).toBe("A4");
    expect(layout.label.width).toBe("188mm");
    expect(layout.label.height).toBe("268mm");
    expect(layout.page.perPage).toBe(1);
  });

  it("ignores stale orientation values when a fixed stock preset is selected", () => {
    const layout = resolvePrintLayoutConfig({
      stockPreset: "brother-62mm-continuous",
      orientation: "portrait",
      pageOrientation: "portrait",
    });

    expect(layout.orientation).toBe("landscape");
    expect(layout.page.orientation).toBe("landscape");
    expect(layout.page.gridWidthMm).toBeLessThanOrEqual(
      layout.page.contentWidthMm + 0.2,
    );
  });

  it("scales label typography and GHS pictogram size from physical stock dimensions", () => {
    const small = resolvePrintLayoutConfig({
      stockPreset: "small-strip",
      template: "standard",
    });
    const medium = resolvePrintLayoutConfig({
      stockPreset: "medium-bottle",
      template: "standard",
    });
    const large = resolvePrintLayoutConfig({
      stockPreset: "large-primary",
      template: "full",
    });
    const avery5164 = resolvePrintLayoutConfig({
      stockPreset: "avery-5164",
      template: "standard",
    });
    const a4Primary = resolvePrintLayoutConfig({
      stockPreset: "a4-primary",
      template: "full",
    });

    expect(small.typography.fontSize).toBe("6.8px");
    expect(medium.typography.fontSize).toBe("9px");
    expect(large.typography.fontSize).toBe("14px");
    expect(small.typography.qrBox).toBe("15.8mm");
    expect(small.typography.standardPictogramSize).toBe("9.1mm");
    expect(small.typography.iconPictogramSize).toBe("8.4mm");
    expect(small.typography.qrPictogramSize).toBe("8.6mm");
    expect(medium.typography.standardPictogramSize).toBe("15mm");
    expect(medium.typography.iconPictogramSize).toBe("15.5mm");
    expect(large.typography.standardPictogramSize).toBe("23.8mm");
    expect(avery5164.typography.standardPictogramSize).toBe("15.8mm");
    expect(avery5164.typography.standardRailColumn).toBe("35.6mm");
    expect(small.typography.compliancePictogramSize).toBe("10mm");
    expect(medium.typography.compliancePictogramSize).toBe("14mm");
    expect(large.typography.compliancePictogramSize).toBe("24.6mm");
    expect(a4Primary.typography.compliancePictogramSize).toBe("28.2mm");
  });

  it("keeps curated A4 stock grids within printable page geometry", () => {
    const cases = [
      ["small-strip", 20, "portrait"],
      ["medium-bottle", 10, "portrait"],
      ["large-primary", 3, "portrait"],
      ["a4-primary", 1, "portrait"],
    ];

    cases.forEach(([stockPreset, perPage, pageOrientation]) => {
      const layout = resolvePrintLayoutConfig({ stockPreset });

      expect(layout.page.perPage).toBe(perPage);
      expect(layout.page.orientation).toBe(pageOrientation);
      expect(layout.page.gridWidthMm).toBeLessThanOrEqual(
        layout.page.contentWidthMm + 0.2,
      );
      expect(layout.page.gridHeightMm).toBeLessThanOrEqual(
        layout.page.contentHeightMm + 0.2,
      );
    });
  });

  it("accepts calibration nudges and sheet overrides", () => {
    const layout = resolvePrintLayoutConfig({
      size: "medium",
      template: "qrcode",
      orientation: "landscape",
      calibration: {
        nudgeXmm: 1.5,
        nudgeYmm: -2,
        gapMm: 4,
        pageMarginMm: 6,
      },
    });

    expect(layout.page.nudgeX).toBe("1.5mm");
    expect(layout.page.nudgeY).toBe("-2mm");
    expect(layout.page.gap).toBe("4mm");
    expect(layout.page.margin).toBe("6mm");
    expect(layout.page.perPage).toBe(9);
  });

  it("buildPrintDocumentModel expands quantities and paginates via the resolved stock preset", () => {
    const model = buildPrintDocumentModel(
      [mockChemical, mockChemicalNoGHS],
      { size: "medium", template: "standard", orientation: "portrait" },
      {},
      {},
      { "64-17-5": 3, "7732-18-5": 6 },
    );

    expect(model.expandedLabels).toHaveLength(9);
    expect(model.pages).toHaveLength(1);
    expect(model.layout.page.perPage).toBe(10);
  });

  it("buildPrintDocument returns shared HTML that can be reused for preview and print", () => {
    const documentBundle = buildPrintDocument(
      [mockChemical],
      {
        size: "medium",
        template: "standard",
        orientation: "portrait",
        calibration: { nudgeXmm: 2, nudgeYmm: 1 },
      },
      {},
    );

    expect(documentBundle.html).toContain('class="page-grid"');
    expect(documentBundle.html).toContain("transform: translate(2mm, 1mm)");
    expect(documentBundle.model.layout.stockId).toBe("medium-bottle");
  });

  it("adds pictogram density classes so roomy front labels can scale many icons", () => {
    const chemicalWithManyPictograms = {
      ...mockChemical,
      ghs_pictograms: [
        { code: "GHS01" },
        { code: "GHS02" },
        { code: "GHS03" },
        { code: "GHS04" },
        { code: "GHS05" },
        { code: "GHS06" },
        { code: "GHS08" },
      ],
    };

    const documentBundle = buildPrintDocument(
      [chemicalWithManyPictograms],
      {
        stockPreset: "large-primary",
        template: "standard",
        labelPurpose: "shipping",
      },
      {},
    );

    expect(documentBundle.html).toContain("label-pictogram-count-7");
    expect(documentBundle.html).toContain("label-pictogram-density-ultra");
    expect(documentBundle.html).toContain(
      ".label-standard.label-stock-large-primary.label-pictogram-density-ultra .pictograms-standard",
    );
  });

  it("renders per-item batch layout overrides on the same physical stock", () => {
    const standardLargePrimary = resolvePrintLayoutConfig({
      stockPreset: "large-primary",
      labelPurpose: "shipping",
      template: "standard",
    });
    const reducedItem = {
      ...mockChemical,
      cas_number: "7647-01-0",
      name_en: "Hydrochloric Acid",
      __batchPrintItem: {
        category: "reduced-purpose",
        preferredPurpose: "complete",
        effectivePurpose: "supplemental",
        reasonType: "complete-content-too-dense-for-stock",
      },
      __printLayoutOverride: standardLargePrimary,
    };

    const documentBundle = buildPrintDocument(
      [mockChemical, reducedItem],
      {
        stockPreset: "large-primary",
        labelPurpose: "shipping",
        template: "full",
      },
      {},
      {},
      {},
      {
        organization: "Lab A",
        phone: "02-1234",
        address: "Taipei",
      },
    );

    expect(documentBundle.html).toContain("label-full");
    expect(documentBundle.html).toContain("label-standard");
    expect(documentBundle.html).toContain(
      'data-batch-category="reduced-purpose"',
    );
    expect(documentBundle.html).toContain(
      'data-batch-effective-purpose="supplemental"',
    );
  });

  it("buildPrintPreviewDocument reuses the shared renderer for label and sheet previews", () => {
    const labelPreview = buildPrintPreviewDocument(
      [mockChemical],
      { size: "medium", template: "qrcode", orientation: "portrait" },
      {},
      {},
      { "64-17-5": 1 },
      {},
      { mode: "label" },
    );
    const sheetPreview = buildPrintPreviewDocument(
      [mockChemical, mockChemicalNoGHS],
      { size: "medium", template: "standard", orientation: "portrait" },
      {},
      {},
      { "64-17-5": 1, "7732-18-5": 1 },
      {},
      { mode: "sheet" },
    );

    expect(labelPreview.html).toContain("preview-body-label");
    expect(labelPreview.html).toContain("label label-qr");
    expect(labelPreview.html).toContain("min-height: 0");
    expect(labelPreview.html).toContain("align-items: flex-start");
    expect(labelPreview.html).toContain("overflow: visible");
    expect(labelPreview.previewMetrics.frameHeightPx).toBeGreaterThanOrEqual(
      labelPreview.previewMetrics.cardHeightPx,
    );
    expect(sheetPreview.html).toContain("preview-grid-scaler");
    expect(sheetPreview.html).toContain("preview-sheet-viewport");
    expect(sheetPreview.html).toContain("preview-page");
    expect(sheetPreview.html).toContain("label-placeholder");
    expect(sheetPreview.previewMetrics.frameHeightPx).toBeGreaterThanOrEqual(
      sheetPreview.previewMetrics.cardHeightPx,
    );
  });

  it("sizes standalone label previews from generated metrics across curated stocks", () => {
    [
      ["A4 primary", "a4-primary", "full", "shipping"],
      ["Letter primary", "letter-primary", "full", "shipping"],
      ["Large primary", "large-primary", "standard", "shipping"],
      ["Bottle primary", "medium-bottle", "standard", "shipping"],
      ["Avery 5163", "avery-5163", "standard", "shipping"],
      ["Avery 5164", "avery-5164", "standard", "shipping"],
      ["Vial strip", "small-strip", "icon", "quickId"],
      ["62 mm continuous", "brother-62mm-continuous", "qrcode", "qrSupplement"],
    ].forEach(([, stockPreset, template, labelPurpose]) => {
      const preview = buildPrintPreviewDocument(
        [mockChemical],
        { stockPreset, template, labelPurpose },
        {},
        {},
        { "64-17-5": 1 },
        {},
        { mode: "label" },
      );

      expect(preview.previewMetrics.frameHeightPx).toBeGreaterThanOrEqual(
        preview.previewMetrics.cardHeightPx,
      );
      expect(preview.previewMetrics.frameWidthPx).toBeGreaterThanOrEqual(
        preview.previewMetrics.cardWidthPx,
      );
      expect(preview.previewMetrics.labelPreviewScale).toBeGreaterThan(0);
      expect(preview.html.includes("min-height: 100vh")).toBe(false);
    });
  });

  it("upscales small preview-only labels while keeping the physical print size unchanged", () => {
    const preview = buildPrintPreviewDocument(
      [mockChemical],
      {
        stockPreset: "small-strip",
        template: "icon",
        labelPurpose: "quickId",
      },
      {},
      {},
      { "64-17-5": 1 },
      {},
      { mode: "label" },
    );

    expect(preview.fragmentHtml).toContain("pictograms-icon");
    expect(preview.html).toContain("width: 8.4mm");
    expect(preview.previewMetrics.labelPreviewScale).toBeGreaterThan(1);
    expect(preview.model.layout.label.width).toBe("70mm");
    expect(preview.model.layout.label.height).toBe("24mm");
  });

  it("uses inspect zoom as a real detail view for small labels", () => {
    const fitPreview = buildPrintPreviewDocument(
      [mockChemical],
      {
        stockPreset: "small-strip",
        template: "icon",
        labelPurpose: "quickId",
      },
      {},
      {},
      { "64-17-5": 1 },
      {},
      { mode: "label", previewZoom: "fit" },
    );
    const inspectPreview = buildPrintPreviewDocument(
      [mockChemical],
      {
        stockPreset: "small-strip",
        template: "icon",
        labelPurpose: "quickId",
      },
      {},
      {},
      { "64-17-5": 1 },
      {},
      { mode: "label", previewZoom: "inspect" },
    );

    expect(inspectPreview.previewMetrics.previewZoom).toBe("inspect");
    expect(inspectPreview.previewMetrics.labelPreviewScale).toBeGreaterThan(
      fitPreview.previewMetrics.labelPreviewScale,
    );
    expect(inspectPreview.previewMetrics.labelPreviewScale).toBeGreaterThanOrEqual(
      1.65,
    );
    expect(inspectPreview.html).toContain("preview-zoom-inspect");
  });
});

describe("printLabels", () => {
  let mockIframe, mockIframeDoc, mockIframeWindow, mockImages;
  let createElementSpy, appendChildSpy, getByIdSpy, alertSpy;

  beforeEach(() => {
    jest.clearAllMocks();
    const mocks = createMockIframe();
    mockIframe = mocks.mockIframe;
    mockIframeDoc = mocks.mockIframeDoc;
    mockIframeWindow = mocks.mockIframeWindow;
    mockImages = mocks.mockImages;

    createElementSpy = jest
      .spyOn(document, "createElement")
      .mockImplementation((tag) => {
        if (tag === "iframe") return mockIframe;
        return document.createElement.wrappedMethod
          ? document.createElement.wrappedMethod(tag)
          : {};
      });
    appendChildSpy = jest
      .spyOn(document.body, "appendChild")
      .mockImplementation(() => {});
    getByIdSpy = jest.spyOn(document, "getElementById").mockReturnValue(null);
    alertSpy = jest.spyOn(window, "alert").mockImplementation(() => {});
    jest.useFakeTimers();
  });

  afterEach(() => {
    createElementSpy.mockRestore();
    appendChildSpy.mockRestore();
    getByIdSpy.mockRestore();
    alertSpy.mockRestore();
    window.history.replaceState({}, "", "/");
    delete window.__GHS_PRINT_QA_LAST_HANDOFF__;
    jest.useRealTimers();
  });

  it("returns immediately for empty selection", () => {
    printLabels(
      [],
      { size: "medium", template: "standard", orientation: "portrait" },
      {},
    );
    expect(createElementSpy).not.toHaveBeenCalledWith("iframe");
  });

  it("creates a hidden iframe element", () => {
    printLabels(
      [mockChemicalNoGHS],
      { size: "medium", template: "standard", orientation: "portrait" },
      {},
    );
    expect(createElementSpy).toHaveBeenCalledWith("iframe");
    expect(mockIframe.id).toBe("ghs-print-frame");
  });

  it("sets iframe to invisible with correct styles", () => {
    printLabels(
      [mockChemicalNoGHS],
      { size: "medium", template: "standard", orientation: "portrait" },
      {},
    );
    expect(mockIframe.style.cssText).toContain("position:fixed");
    expect(mockIframe.style.cssText).toContain("width:0");
    expect(mockIframe.style.cssText).toContain("height:0");
    expect(mockIframe.style.cssText).toContain("opacity:0");
  });

  it("appends iframe to document.body", () => {
    printLabels(
      [mockChemicalNoGHS],
      { size: "medium", template: "standard", orientation: "portrait" },
      {},
    );
    expect(appendChildSpy).toHaveBeenCalledWith(mockIframe);
  });

  it("writes HTML document to iframe", () => {
    printLabels(
      [mockChemical],
      { size: "medium", template: "standard", orientation: "portrait" },
      {},
    );
    expect(mockIframeDoc.open).toHaveBeenCalled();
    expect(mockIframeDoc.write).toHaveBeenCalledTimes(1);
    expect(mockIframeDoc.close).toHaveBeenCalled();

    const html = mockIframeDoc.write.mock.calls[0][0];
    expect(html).toContain("<!DOCTYPE html>");
    expect(html).toContain("Ethanol");
    expect(html).toContain("64-17-5");
    expect(html).toContain("meta-ribbon");
    expect(html).not.toContain("乙醇");
  });

  it("writes the same shared document HTML returned by buildPrintDocument", () => {
    const config = {
      size: "medium",
      template: "standard",
      orientation: "portrait",
    };
    const documentBundle = buildPrintDocument([mockChemical], config, {});

    printLabels([mockChemical], config, {});

    expect(mockIframeDoc.write.mock.calls[0][0]).toBe(documentBundle.html);
  });

  it("prints dense A4 primary labels as high-utilization single-page output", () => {
    const denseChemical = {
      ...mockChemical,
      ghs_pictograms: [
        { code: "GHS02" },
        { code: "GHS05" },
        { code: "GHS06" },
        { code: "GHS07" },
      ],
      hazard_statements: Array.from({ length: 6 }, (_, index) => ({
        code: `H${300 + index}`,
        text_en: `Hazard ${index}`,
      })),
      precautionary_statements: Array.from({ length: 22 }, (_, index) => ({
        code: `P${300 + index}`,
        text_en: `Precaution ${index}`,
      })),
    };

    printLabels(
      [denseChemical],
      {
        labelPurpose: "shipping",
        template: "full",
        stockPreset: "a4-primary",
      },
      {},
      {},
      {},
      { organization: "Lab A", phone: "02-1234", address: "Taipei" },
    );

    const html = mockIframeDoc.write.mock.calls[0][0];
    expect(html).toContain("label-a4-primary");
    expect(html).toContain("width: 28.2mm");
    expect(html).not.toContain("column-count: 3");
    expect(html).toMatch(
      /\.label-full-page-primary \.compliance-precaution-list \{[\s\S]*display: flex;/,
    );
    expect(html).toMatch(
      /\.label-full-page-primary \.compliance-precaution-list \.compliance-statement \{[\s\S]*grid-template-columns:/,
    );
    expect(html).toContain("compliance-statements-panel");
    expect(html).toContain("--precaution-code-max:11.2mm");
    expect(html).not.toContain("font-size: 9px !important");
    const bodyHtml = html.slice(html.indexOf("<body"));
    expect(bodyHtml).not.toContain("label-continuation-page");
    expect(bodyHtml).toContain('class="qrcode-img"');
    expect(bodyHtml).toContain('data-qr-target="http://localhost/?cas=64-17-5"');
    expect(bodyHtml).not.toContain("hazard-more");
    expect(bodyHtml).not.toContain("precaution-more");
    expect((bodyHtml.match(/class="qrcode-img"/g) || [])).toHaveLength(1);
    expect((bodyHtml.match(/alt="GHS02"/g) || [])).toHaveLength(1);
    denseChemical.hazard_statements.forEach((statement) => {
      expect(bodyHtml).toContain(`>${statement.code}</span>`);
    });
    denseChemical.precautionary_statements.forEach((statement) => {
      expect(bodyHtml).toContain(`>${statement.code}</span>`);
    });
    expect(alertSpy).not.toHaveBeenCalled();
    jest.advanceTimersByTime(300);
    expect(mockIframeWindow.print).toHaveBeenCalled();
  });

  it("rebuilds with a tighter fit level when print preflight finds fixable overflow", () => {
    let labelQueryCount = 0;
    const overflowingLabel = {
      querySelector: jest.fn(() => null),
      clientHeight: 100,
      scrollHeight: 112,
      clientWidth: 200,
      scrollWidth: 200,
    };
    const fittingLabel = {
      querySelector: jest.fn(() => null),
      clientHeight: 100,
      scrollHeight: 100,
      clientWidth: 200,
      scrollWidth: 200,
    };
    mockIframeDoc.querySelectorAll.mockImplementation((selector) => {
      if (selector === "img") return [];
      if (selector === ".label:not(.label-placeholder)") {
        labelQueryCount += 1;
        return [labelQueryCount === 1 ? overflowingLabel : fittingLabel];
      }
      return [];
    });

    printLabels(
      [mockChemical],
      {
        labelPurpose: "quickId",
        template: "icon",
        stockPreset: "small-strip",
        nameDisplay: "en",
      },
      {},
    );
    jest.advanceTimersByTime(300);

    expect(mockIframeDoc.write).toHaveBeenCalledTimes(2);
    expect(mockIframeDoc.write.mock.calls[1][0]).toContain("label-fit-level-1");
    expect(recordObservabilityEvent).toHaveBeenCalledWith(
      "print_autofit_retry",
      expect.objectContaining({
        status: "retry",
        meta: expect.objectContaining({
          autoFitLevel: 0,
          nextAutoFitLevel: 1,
          issueTypes: expect.arrayContaining(["label-overflow"]),
        }),
      }),
    );
    expect(mockIframeWindow.print).toHaveBeenCalled();
    expect(alertSpy).not.toHaveBeenCalled();
  });

  it("keeps tightening A4 continuation pages until rendered overflow clears", () => {
    let labelQueryCount = 0;
    const overflowingLabel = {
      querySelector: jest.fn(() => null),
      clientHeight: 100,
      scrollHeight: 128,
      clientWidth: 200,
      scrollWidth: 200,
    };
    const fittingLabel = {
      querySelector: jest.fn(() => null),
      clientHeight: 100,
      scrollHeight: 100,
      clientWidth: 200,
      scrollWidth: 200,
    };
    mockIframeDoc.querySelectorAll.mockImplementation((selector) => {
      if (selector === "img") return [];
      if (selector === ".label:not(.label-placeholder)") {
        labelQueryCount += 1;
        return [labelQueryCount < 5 ? overflowingLabel : fittingLabel];
      }
      return [];
    });

    printLabels(
      [mockChemical],
      {
        labelPurpose: "shipping",
        template: "full",
        stockPreset: "a4-primary",
        nameDisplay: "both",
      },
      {},
    );
    jest.advanceTimersByTime(300);

    expect(mockIframeDoc.write).toHaveBeenCalledTimes(5);
    expect(mockIframeDoc.write.mock.calls[1][0]).toContain("label-fit-level-1");
    expect(mockIframeDoc.write.mock.calls[2][0]).toContain("label-fit-level-2");
    expect(mockIframeDoc.write.mock.calls[3][0]).toContain("label-fit-level-3");
    expect(mockIframeDoc.write.mock.calls[4][0]).toContain("label-fit-level-4");
    expect(recordObservabilityEvent).toHaveBeenCalledWith(
      "print_autofit_retry",
      expect.objectContaining({
        status: "retry",
        meta: expect.objectContaining({
          nextAutoFitLevel: 4,
          issueTypes: expect.arrayContaining(["label-overflow"]),
        }),
      }),
    );
    expect(mockIframeWindow.print).toHaveBeenCalled();
    expect(alertSpy).not.toHaveBeenCalled();
  });

  it("replans A4 continuation pages when rendered precautions still overflow after auto-fit", () => {
    let labelQueryCount = 0;
    const makeLabel = (panel) => ({
      querySelector: jest.fn((selector) =>
        selector === ".compliance-precaution-panel" ? panel : null,
      ),
      clientHeight: 100,
      scrollHeight: 100,
      clientWidth: 200,
      scrollWidth: 200,
    });
    const overflowingPanel = {
      clientHeight: 20,
      scrollHeight: 34,
      clientWidth: 180,
      scrollWidth: 180,
    };
    const fittingPanel = {
      clientHeight: 34,
      scrollHeight: 34,
      clientWidth: 180,
      scrollWidth: 180,
    };
    mockIframeDoc.querySelectorAll.mockImplementation((selector) => {
      if (selector === "img") return [];
      if (selector === ".label:not(.label-placeholder)") {
        labelQueryCount += 1;
        return [makeLabel(labelQueryCount < 6 ? overflowingPanel : fittingPanel)];
      }
      return [];
    });

    printLabels(
      [mockChemical],
      {
        labelPurpose: "shipping",
        template: "full",
        stockPreset: "a4-primary",
        nameDisplay: "both",
      },
      {},
    );
    jest.advanceTimersByTime(300);

    expect(mockIframeDoc.write).toHaveBeenCalledTimes(6);
    expect(mockIframeDoc.write.mock.calls[4][0]).toContain("label-fit-level-4");
    expect(recordObservabilityEvent).toHaveBeenCalledWith(
      "print_continuation_tightening_retry",
      expect.objectContaining({
        status: "retry",
        meta: expect.objectContaining({
          autoFitLevel: 4,
          nextContinuationTightnessLevel: 1,
          issueTypes: expect.arrayContaining([
            "compliance-precautions-overflow",
          ]),
          issueCasNumbers: expect.arrayContaining([mockChemical.cas_number]),
        }),
      }),
    );
    expect(mockIframeWindow.print).toHaveBeenCalled();
    expect(alertSpy).not.toHaveBeenCalled();
  });

  it("blocks supplemental labels when the rendered layout clips", () => {
    const overflowLabel = {
      clientHeight: 20,
      scrollHeight: 34,
      clientWidth: 80,
      scrollWidth: 80,
      querySelector: jest.fn(() => null),
    };
    mockIframeDoc.querySelectorAll.mockImplementation((selector) => {
      if (selector === "img") return [];
      if (String(selector).includes(".label")) return [overflowLabel];
      return [];
    });

    printLabels(
      [mockChemical],
      {
        labelPurpose: "shipping",
        template: "standard",
        stockPreset: "medium-bottle",
      },
      {},
    );

    expect(alertSpy).toHaveBeenCalledWith("print.layoutBlockedDetailed");
    jest.advanceTimersByTime(300);
    expect(mockIframeWindow.print).not.toHaveBeenCalled();
    expect(recordObservabilityEvent).toHaveBeenCalledWith(
      "print_blocked",
      expect.objectContaining({
        meta: expect.objectContaining({
          issueTypes: ["label-overflow"],
        }),
      }),
    );
  });

  it("still blocks complete primary labels when the rendered layout clips", () => {
    const overflowLabel = {
      clientHeight: 20,
      scrollHeight: 34,
      clientWidth: 80,
      scrollWidth: 80,
      querySelector: jest.fn(() => null),
    };
    mockIframeDoc.querySelectorAll.mockImplementation((selector) => {
      if (selector === "img") return [];
      if (String(selector).includes(".label")) return [overflowLabel];
      return [];
    });

    printLabels(
      [mockChemical],
      {
        labelPurpose: "shipping",
        template: "full",
        stockPreset: "a4-primary",
      },
      {},
      {},
      {},
      { organization: "Lab A", phone: "02-1234", address: "Taipei" },
    );

    expect(alertSpy).toHaveBeenCalledWith("print.layoutBlockedDetailed");
    jest.advanceTimersByTime(300);
    expect(mockIframeWindow.print).not.toHaveBeenCalled();
    expect(recordObservabilityEvent).toHaveBeenCalledWith(
      "print_blocked",
      expect.objectContaining({
        meta: expect.objectContaining({
          issueTypes: ["label-overflow"],
        }),
      }),
    );
  });

  it("calls print immediately when no images (300ms delay)", () => {
    // mockIframeDoc.querySelectorAll returns [] by default (no images)
    printLabels(
      [mockChemicalNoGHS],
      { size: "medium", template: "standard", orientation: "portrait" },
      {},
    );

    expect(mockIframeWindow.print).not.toHaveBeenCalled();
    jest.advanceTimersByTime(300);
    expect(mockIframeWindow.focus).toHaveBeenCalled();
    expect(mockIframeWindow.print).toHaveBeenCalled();
  });

  it("calls print after all images load", () => {
    const img1 = { complete: false, onload: null, onerror: null };
    const img2 = { complete: false, onload: null, onerror: null };
    mockIframeDoc.querySelectorAll.mockReturnValue([img1, img2]);

    printLabels(
      [mockChemical],
      { size: "medium", template: "standard", orientation: "portrait" },
      {},
    );

    // Not printed yet (images still loading)
    jest.advanceTimersByTime(300);
    expect(mockIframeWindow.print).not.toHaveBeenCalled();

    // First image loads
    img1.onload();
    jest.advanceTimersByTime(300);
    expect(mockIframeWindow.print).not.toHaveBeenCalled();

    // Second image loads → triggers print
    img2.onload();
    jest.advanceTimersByTime(300);
    expect(mockIframeWindow.print).toHaveBeenCalled();
  });

  it("blocks printing when a required GHS pictogram fails to load", () => {
    const brokenPictogram = {
      complete: false,
      onload: null,
      onerror: null,
      getAttribute: jest.fn((name) => {
        if (name === "data-required-print-image") return "ghs-pictogram";
        if (name === "alt") return "GHS02";
        if (name === "src") return "https://example.com/GHS02.svg";
        return "";
      }),
    };
    mockIframeDoc.querySelectorAll.mockImplementation((selector) => {
      if (selector === "img") return [brokenPictogram];
      return [];
    });

    printLabels(
      [mockChemical],
      { size: "medium", template: "standard", orientation: "portrait" },
      {},
    );

    brokenPictogram.onerror();

    expect(alertSpy).toHaveBeenCalledWith("print.imageBlocked");
    jest.advanceTimersByTime(300);
    expect(mockIframeWindow.print).not.toHaveBeenCalled();
    expect(recordObservabilityEvent).toHaveBeenCalledWith(
      "print_blocked",
      expect.objectContaining({
        meta: expect.objectContaining({
          issueTypes: ["required-image-failed"],
        }),
      }),
    );
  });

  it("blocks printing when a required image never resolves before timeout", () => {
    const stalledPictogram = {
      complete: false,
      onload: null,
      onerror: null,
      getAttribute: jest.fn((name) => {
        if (name === "data-required-print-image") return "ghs-pictogram";
        if (name === "alt") return "GHS05";
        if (name === "src") return "https://example.com/GHS05.svg";
        return "";
      }),
    };
    mockIframeDoc.querySelectorAll.mockImplementation((selector) => {
      if (selector === "img") return [stalledPictogram];
      return [];
    });

    printLabels(
      [mockChemical],
      { size: "medium", template: "standard", orientation: "portrait" },
      {},
    );

    jest.advanceTimersByTime(9999);
    expect(alertSpy).not.toHaveBeenCalled();
    expect(mockIframeWindow.print).not.toHaveBeenCalled();

    jest.advanceTimersByTime(1);

    expect(alertSpy).toHaveBeenCalledWith("print.imageBlocked");
    jest.advanceTimersByTime(300);
    expect(mockIframeWindow.print).not.toHaveBeenCalled();
    expect(mockIframe.remove).toHaveBeenCalled();
    expect(recordObservabilityEvent).toHaveBeenCalledWith(
      "print_blocked",
      expect.objectContaining({
        meta: expect.objectContaining({
          issueTypes: ["required-image-failed"],
        }),
      }),
    );
  });

  it("blocks printing when a completed required image has no rendered pixels", () => {
    const brokenQr = {
      complete: true,
      naturalWidth: 0,
      getAttribute: jest.fn((name) => {
        if (name === "data-required-print-image") return "qr-code";
        if (name === "alt") return "QR";
        if (name === "src") return "https://example.com/qr.png";
        return "";
      }),
    };
    mockIframeDoc.querySelectorAll.mockReturnValue([brokenQr]);

    printLabels(
      [mockChemical],
      { size: "medium", template: "qrcode", orientation: "portrait" },
      {},
    );

    expect(alertSpy).toHaveBeenCalledWith("print.imageBlocked");
    jest.advanceTimersByTime(300);
    expect(mockIframeWindow.print).not.toHaveBeenCalled();
  });

  it("handles images that are already complete", () => {
    const img1 = { complete: true };
    const img2 = { complete: true };
    mockIframeDoc.querySelectorAll.mockReturnValue([img1, img2]);

    printLabels(
      [mockChemical],
      { size: "medium", template: "standard", orientation: "portrait" },
      {},
    );

    jest.advanceTimersByTime(300);
    expect(mockIframeWindow.print).toHaveBeenCalled();
  });

  it("removes existing print iframe before creating new one", () => {
    const oldIframe = { remove: jest.fn() };
    getByIdSpy.mockReturnValue(oldIframe);

    printLabels(
      [mockChemicalNoGHS],
      { size: "medium", template: "standard", orientation: "portrait" },
      {},
    );
    expect(oldIframe.remove).toHaveBeenCalled();
  });

  it("registers an afterprint listener on the iframe window", () => {
    printLabels(
      [mockChemicalNoGHS],
      { size: "medium", template: "standard", orientation: "portrait" },
      {},
    );
    jest.advanceTimersByTime(300);

    expect(mockIframeWindow.print).toHaveBeenCalled();
    expect(mockIframeWindow.addEventListener).toHaveBeenCalledWith(
      "afterprint",
      expect.any(Function),
      expect.objectContaining({ once: true }),
    );
  });

  it("records print lifecycle events for observability", () => {
    printLabels(
      [mockChemicalNoGHS],
      { size: "medium", template: "standard", orientation: "portrait" },
      {},
    );
    jest.advanceTimersByTime(300);

    expect(recordObservabilityEvent).toHaveBeenCalledWith(
      "print_start",
      expect.objectContaining({
        status: "started",
        meta: expect.objectContaining({
          template: "standard",
          totalLabels: 1,
        }),
      }),
    );

    mockIframeWindow.dispatchAfterPrint();
    expect(recordObservabilityEvent).toHaveBeenCalledWith(
      "print_complete",
      expect.objectContaining({
        status: "afterprint",
        meta: expect.objectContaining({
          completionReason: "afterprint",
        }),
      }),
    );
  });

  it("supports QA print handoff without opening the native print dialog", () => {
    window.history.replaceState({}, "", "/?qaPrintHandoff=1");
    createElementSpy.mockImplementation((tag) => {
      if (tag === "iframe") return mockIframe;
      if (tag === "div") {
        return {
          id: "",
          style: { cssText: "" },
          dataset: {},
          setAttribute: jest.fn(),
        };
      }
      return document.createElement.wrappedMethod
        ? document.createElement.wrappedMethod(tag)
        : {};
    });
    mockImages.push(
      { complete: true, getAttribute: () => "GHS02" },
      { complete: true, getAttribute: () => "GHS07" },
      { complete: true, getAttribute: () => "GHS02" },
      { complete: true, getAttribute: () => "QR" },
    );
    const supportChips = [
      { textContent: "Batch: CASE-2026-0007" },
      { textContent: "Demo Safety Lab" },
    ];
    mockIframeDoc.querySelectorAll.mockImplementation((selector) => {
      if (selector === "img") return mockImages;
      if (selector === ".support-chip") return supportChips;
      return [];
    });
    const onPrintHandoff = jest.fn();

    printLabels(
      [mockChemical],
      {
        labelPurpose: "qrSupplement",
        template: "qrcode",
        stockPreset: "small-strip",
      },
      {},
      {},
      {},
      {},
      { onPrintHandoff },
    );
    jest.advanceTimersByTime(300);

    expect(mockIframeWindow.focus).toHaveBeenCalled();
    expect(mockIframeWindow.print).not.toHaveBeenCalled();
    expect(mockIframe.remove).toHaveBeenCalled();
    expect(window.__GHS_PRINT_QA_LAST_HANDOFF__).toEqual(
      expect.objectContaining({
        status: "qa_handoff",
        labelKind: "qr-supplement",
        totalLabels: 1,
        pictogramCodes: ["GHS02", "GHS07"],
        hasQr: true,
        casNumbers: ["64-17-5"],
        hasCas: true,
        labelWidthMm: 70,
        labelHeightMm: 24,
        pageSize: "A4",
        colorMode: "color",
        nameDisplay: "both",
      }),
    );
    const statusElements = appendChildSpy.mock.calls
      .map(([node]) => node)
      .filter((node) => node?.id === "ghs-print-qa-status");
    const statusElement = statusElements[statusElements.length - 1];
    expect(statusElement).toEqual(
      expect.objectContaining({
        textContent: "Print handoff ready: qr-supplement; GHS02,GHS07",
      }),
    );
    expect(statusElement.dataset).toEqual(
      expect.objectContaining({
        status: "qa_handoff",
        labelKind: "qr-supplement",
        pictograms: "GHS02,GHS07",
        hasQr: "true",
        casNumbers: "64-17-5",
        hasCas: "true",
        labelWidthMm: "70",
        labelHeightMm: "24",
        pageSize: "A4",
        colorMode: "color",
        nameDisplay: "both",
        template: "qrcode",
        stockPreset: "small-strip",
        supportChips: "Batch: CASE-2026-0007|Demo Safety Lab",
      }),
    );
    expect(recordObservabilityEvent).toHaveBeenCalledWith(
      "print_handoff_qa",
      expect.objectContaining({
        status: "qa_handoff",
        meta: expect.objectContaining({
          labelKind: "qr-supplement",
          pictogramCodes: ["GHS02", "GHS07"],
          supportChipTexts: ["Batch: CASE-2026-0007", "Demo Safety Lab"],
          hasQr: true,
          casNumbers: ["64-17-5"],
          hasCas: true,
        }),
      }),
    );
    expect(onPrintHandoff).toHaveBeenCalledWith(
      expect.objectContaining({
        labelPurpose: "qrSupplement",
        template: "qrcode",
        totalLabels: 1,
      }),
    );
    expect(recordObservabilityEvent).toHaveBeenCalledWith(
      "print_complete",
      expect.objectContaining({
        status: "qa_handoff",
        meta: expect.objectContaining({
          completionReason: "qa_handoff",
        }),
      }),
    );
  });

  it("reports blocked QA handoff without opening a blocking alert", () => {
    window.history.replaceState({}, "", "/?qaPrintHandoff=1");
    createElementSpy.mockImplementation((tag) => {
      if (tag === "iframe") return mockIframe;
      if (tag === "div") {
        return {
          id: "",
          style: { cssText: "" },
          dataset: {},
          setAttribute: jest.fn(),
        };
      }
      return document.createElement.wrappedMethod
        ? document.createElement.wrappedMethod(tag)
        : {};
    });
    const overflowLabel = {
      clientHeight: 20,
      scrollHeight: 34,
      clientWidth: 80,
      scrollWidth: 80,
      querySelector: jest.fn(() => null),
    };
    mockIframeDoc.querySelectorAll.mockImplementation((selector) => {
      if (selector === "img") return [];
      if (String(selector).includes(".label")) return [overflowLabel];
      return [];
    });

    printLabels(
      [mockChemical],
      {
        labelPurpose: "shipping",
        template: "full",
        stockPreset: "a4-primary",
      },
      {},
      {},
      {},
      { organization: "Lab A", phone: "02-1234", address: "Taipei" },
    );

    expect(alertSpy).not.toHaveBeenCalled();
    expect(mockIframeWindow.print).not.toHaveBeenCalled();
    expect(mockIframe.remove).toHaveBeenCalled();
    expect(window.__GHS_PRINT_QA_LAST_HANDOFF__).toEqual(
      expect.objectContaining({
        status: "blocked",
        labelKind: "complete-primary",
        issueTypes: ["label-overflow"],
      }),
    );
    const statusElements = appendChildSpy.mock.calls
      .map(([node]) => node)
      .filter((node) => node?.id === "ghs-print-qa-status");
    const statusElement = statusElements[statusElements.length - 1];
    expect(statusElement.dataset).toEqual(
      expect.objectContaining({
        status: "blocked",
        labelKind: "complete-primary",
        issueTypes: "label-overflow",
      }),
    );
  });

  it("cleans up iframe when afterprint fires (dialog closed)", () => {
    printLabels(
      [mockChemicalNoGHS],
      { size: "medium", template: "standard", orientation: "portrait" },
      {},
    );
    jest.advanceTimersByTime(300);

    expect(mockIframeWindow.print).toHaveBeenCalled();
    expect(mockIframe.remove).not.toHaveBeenCalled();

    // Simulate the browser firing afterprint (user printed or cancelled).
    mockIframeWindow.dispatchAfterPrint();
    expect(mockIframe.remove).toHaveBeenCalled();
  });

  it("does not leak iframe even if afterprint never fires (fallback)", () => {
    printLabels(
      [mockChemicalNoGHS],
      { size: "medium", template: "standard", orientation: "portrait" },
      {},
    );
    jest.advanceTimersByTime(300);
    expect(mockIframe.remove).not.toHaveBeenCalled();

    // Deliberately do NOT dispatch afterprint. The fallback timeout
    // must still clean up — previously this path would leak the
    // iframe into the DOM.
    jest.advanceTimersByTime(60000);
    expect(mockIframe.remove).toHaveBeenCalled();
  });

  it("does not double-remove iframe when afterprint and fallback both fire", () => {
    printLabels(
      [mockChemicalNoGHS],
      { size: "medium", template: "standard", orientation: "portrait" },
      {},
    );
    jest.advanceTimersByTime(300);

    mockIframeWindow.dispatchAfterPrint();
    expect(mockIframe.remove).toHaveBeenCalledTimes(1);

    // Even if the fallback timeout fires later, iframe must not be
    // removed a second time.
    jest.advanceTimersByTime(60000);
    expect(mockIframe.remove).toHaveBeenCalledTimes(1);
  });

  describe("templates", () => {
    const configs = [
      { template: "icon", label: "icon template" },
      { template: "standard", label: "standard template" },
      { template: "full", label: "full template" },
      { template: "qrcode", label: "qrcode template" },
    ];

    configs.forEach(({ template, label }) => {
      it(`generates valid HTML for ${label}`, () => {
        printLabels(
          [mockChemical],
          { size: "medium", template, orientation: "portrait" },
          {},
        );
        const html = mockIframeDoc.write.mock.calls[0][0];
        expect(html).toContain("Ethanol");
        expect(html).toContain("64-17-5");
        expect(html).toContain('class="label');
      });
    });

    it.each(["icon", "standard", "full", "qrcode"])(
      "%s template renders every GHS pictogram without a +N summary",
      (template) => {
        const multiPictogramChemical = {
          ...mockChemical,
          ghs_pictograms: [
            { code: "GHS01" },
            { code: "GHS02" },
            { code: "GHS05" },
            { code: "GHS06" },
            { code: "GHS07" },
          ],
        };

        printLabels(
          [multiPictogramChemical],
          { size: "medium", template, orientation: "portrait" },
          {},
        );
        const html = mockIframeDoc.write.mock.calls[0][0];

        ["GHS01", "GHS02", "GHS05", "GHS06", "GHS07"].forEach((code) => {
          expect(html).toContain(`alt="${code}"`);
        });
        expect(html).not.toContain("more-pics");
      },
    );

    it("qrcode template includes QR code image", () => {
      printLabels(
        [mockChemical],
        { size: "medium", template: "qrcode", orientation: "portrait" },
        {},
      );
      const html = mockIframeDoc.write.mock.calls[0][0];
      expect(html).toContain("qrcode-img");
      expect(html).toContain("data:image/gif;base64");
    });

    it("qrcode small labels continue same-stock only when pictograms exceed the first QR label", () => {
      const multiPictogramChemical = {
        ...mockChemical,
        ghs_pictograms: [
          { code: "GHS01" },
          { code: "GHS02" },
          { code: "GHS03" },
          { code: "GHS04" },
          { code: "GHS05" },
          { code: "GHS06" },
          { code: "GHS07" },
          { code: "GHS08" },
          { code: "GHS09" },
        ],
      };

      const preview = buildPrintPreviewDocument(
        [multiPictogramChemical],
        {
          labelPurpose: "qrSupplement",
          template: "qrcode",
          stockPreset: "small-strip",
        },
        {},
        {},
        {},
        {},
        { mode: "label" },
      );

      expect(preview.fragmentHtml).toContain("label-qr");
      expect(preview.fragmentHtml).toContain("label-form-strip");
      expect(preview.fragmentHtml).toContain("label-kind-qr-supplement");
      expect(preview.html).toContain("width: 15.8mm");
      expect(preview.html).toContain("width: 8.6mm");
      expect(preview.fragmentHtml).toContain("qrcode-img");
      expect(preview.fragmentHtml).toContain("64-17-5");
      expect(preview.fragmentHtml).toContain("small-cas");
      expect(preview.model.expandedLabels).toHaveLength(2);
      expect(preview.fragmentHtml.match(/alt="GHS0[1-6]"/g)).toHaveLength(6);
      expect(expandedPictogramCodes(preview)).toEqual([
        "GHS01",
        "GHS02",
        "GHS03",
        "GHS04",
        "GHS05",
        "GHS06",
        "GHS07",
        "GHS08",
        "GHS09",
      ]);
      expect(preview.fragmentHtml.match(/class="qrcode-img"/g)).toHaveLength(1);
      expect(preview.fragmentHtml).not.toContain("more-pics");
    });

    it("keeps 62mm continuous QR labels in a compact strip hierarchy", () => {
      const multiPictogramChemical = {
        ...mockChemical,
        ghs_pictograms: [
          { code: "GHS02" },
          { code: "GHS05" },
          { code: "GHS06" },
          { code: "GHS07" },
        ],
      };

      const preview = buildPrintPreviewDocument(
        [multiPictogramChemical],
        {
          labelPurpose: "qrSupplement",
          template: "qrcode",
          stockPreset: "brother-62mm-continuous",
        },
        {},
        {},
        {},
        {},
        { mode: "label" },
      );

      expect(preview.fragmentHtml).toContain(
        "label-stock-brother-62mm-continuous",
      );
      expect(preview.fragmentHtml).toContain("label-form-strip");
      expect(preview.html).toContain("width: 22mm");
      expect(preview.html).toContain(
        "grid-template-columns: repeat(3, minmax(0, 11mm))",
      );
      expect(preview.html).toContain(
        ".label-stock-brother-62mm-continuous.label-qr.label-form-strip",
      );
      expect(preview.html).toContain("border-right: 0");
      expect(preview.html).toContain("box-shadow: none");
      expect(preview.model.expandedLabels).toHaveLength(1);
      expect(preview.fragmentHtml.match(/alt="GHS0[2567]"/g)).toHaveLength(4);
      expect(expandedPictogramCodes(preview)).toEqual([
        "GHS02",
        "GHS05",
        "GHS06",
        "GHS07",
      ]);
      expect(preview.fragmentHtml).not.toContain("more-pics");
    });

    it("keeps CAS visible on strip quick-ID labels", () => {
      const preview = buildPrintPreviewDocument(
        [mockChemical],
        {
          labelPurpose: "quickId",
          template: "icon",
          stockPreset: "small-strip",
          nameDisplay: "both",
        },
        {},
        {},
        {},
        {},
        { mode: "label" },
      );

      expect(preview.fragmentHtml).toContain("label-kind-quick-id");
      expect(preview.fragmentHtml).toContain("label-form-strip");
      expect(preview.fragmentHtml).toContain("small-cas");
      expect(preview.fragmentHtml).toContain("64-17-5");
      expect(preview.html).not.toContain(
        ".label-icon.label-form-strip .cas {\n      display: none;",
      );
      expect(preview.html).toContain("border-bottom: 0");
    });

    it("uses stock-specific horizontal pictogram rows for quick-ID labels", () => {
      const multiPictogramChemical = {
        ...mockChemical,
        ghs_pictograms: [
          { code: "GHS02" },
          { code: "GHS05" },
          { code: "GHS06" },
          { code: "GHS07" },
        ],
      };
      const cases = [
        ["small-strip", "label-stock-small-strip", "repeat(5, 8.2mm)"],
      ];

      cases.forEach(([stockPreset, stockClass, gridRule]) => {
        const preview = buildPrintPreviewDocument(
          [multiPictogramChemical],
          {
            labelPurpose: "quickId",
            template: "icon",
            stockPreset,
            nameDisplay: "both",
          },
          {},
          {},
          {},
          {},
          { mode: "label" },
        );

        expect(preview.fragmentHtml).toContain("label-kind-quick-id");
        expect(preview.fragmentHtml).toContain(stockClass);
        expect(preview.fragmentHtml).toContain("small-cas");
        expect(preview.fragmentHtml.match(/alt="GHS0[2567]"/g)).toHaveLength(4);
        expect(preview.html).toContain(
          `.label-icon.${stockClass} .pictograms-icon`,
        );
        expect(preview.html).toContain(`grid-template-columns: ${gridRule}`);
      });
    });

    it("keeps QR small labels on the curated 62 mm stock geometry", () => {
      const multiPictogramChemical = {
        ...mockChemical,
        ghs_pictograms: [
          { code: "GHS02" },
          { code: "GHS05" },
          { code: "GHS06" },
          { code: "GHS07" },
        ],
      };
      const cases = [
        [
          "brother-62mm-continuous",
          "label-stock-brother-62mm-continuous",
          "repeat(3, minmax(0, 11mm))",
          "label-form-strip",
        ],
      ];

      cases.forEach(([stockPreset, stockClass, gridRule, formClass]) => {
        const preview = buildPrintPreviewDocument(
          [multiPictogramChemical],
          {
            labelPurpose: "qrSupplement",
            template: "qrcode",
            stockPreset,
            nameDisplay: "both",
          },
          {},
          {},
          {},
          {},
          { mode: "label" },
        );

        expect(preview.fragmentHtml).toContain("label-kind-qr-supplement");
        expect(preview.fragmentHtml).toContain(stockClass);
        expect(preview.fragmentHtml).toContain(formClass);
        expect(preview.fragmentHtml).toContain("qrcode-img");
        expect(preview.model.expandedLabels).toHaveLength(1);
        expect(preview.fragmentHtml.match(/alt="GHS0[2567]"/g)).toHaveLength(4);
        expect(expandedPictogramCodes(preview)).toEqual([
          "GHS02",
          "GHS05",
          "GHS06",
          "GHS07",
        ]);
        expect(preview.html).toContain(
          `.label-stock-${stockPreset}.label-qr.${formClass} .pictograms.qr-pics`,
        );
        expect(preview.html).toContain(`grid-template-columns: ${gridRule}`);
      });
    });

    it("adds identity density classes so long small-label names shrink before CAS is lost", () => {
      const longNameChemical = {
        ...mockChemical,
        cas_number: "123456-78-9",
        name_en: "N,N-Dimethyl-4-nitrosoaniline hydrochloride analytical reference",
        name_zh: "長名稱測試化學品",
      };

      const preview = buildPrintPreviewDocument(
        [longNameChemical],
        {
          labelPurpose: "quickId",
          template: "icon",
          stockPreset: "small-strip",
          nameDisplay: "both",
        },
        {},
        {},
        {},
        {},
        { mode: "label" },
      );

      expect(preview.fragmentHtml).toContain("identity-density-high");
      expect(preview.fragmentHtml).toContain("small-cas");
      expect(preview.fragmentHtml).toContain("123456-78-9");
      expect(preview.html).toContain(
        ".label-icon.label-form-strip .identity-density-high .small-name-en",
      );
      expect(preview.html).toContain(
        ".label-icon.label-form-strip .identity-density-medium .small-cas",
      );
    });

    it("auto-selects a tighter fit level for dense small-label identity", () => {
      const longNameChemical = {
        ...mockChemical,
        cas_number: "123456-78-9",
        name_en: "N,N-Dimethyl-4-nitrosoaniline hydrochloride analytical reference",
        name_zh: "?瑕?蝔望葫閰血?摮詨?",
      };

      const preview = buildPrintPreviewDocument(
        [longNameChemical],
        {
          labelPurpose: "quickId",
          template: "icon",
          stockPreset: "small-strip",
          nameDisplay: "both",
        },
        {},
        { batchNumber: "CASE-2026-0007" },
        {},
        {},
        { mode: "label" },
      );

      expect(preview.model.layout.autoFitLevel).toBe(2);
      expect(preview.fragmentHtml).toContain("label-fit-level-2");
      expect(preview.fragmentHtml).not.toContain("CASE-2026-0007");
      expect(preview.fragmentHtml).toContain("small-cas");
    });

    it("prints small QR supplemental labels after keeping QR and every pictogram in the body", () => {
      const multiPictogramChemical = {
        ...mockChemical,
        ghs_pictograms: [
          { code: "GHS01" },
          { code: "GHS02" },
          { code: "GHS03" },
          { code: "GHS04" },
          { code: "GHS05" },
          { code: "GHS06" },
          { code: "GHS07" },
          { code: "GHS08" },
          { code: "GHS09" },
        ],
      };

      printLabels(
        [multiPictogramChemical],
        {
          labelPurpose: "qrSupplement",
          template: "qrcode",
          stockPreset: "small-strip",
        },
        {},
      );

      const html = mockIframeDoc.write.mock.calls[0][0];
      const bodyHtml = html.slice(html.indexOf("<body"));
      expect(bodyHtml).toContain("label-qr");
      expect(bodyHtml).toContain("label-form-strip");
      expect(bodyHtml).toContain("label-kind-qr-supplement");
      expect(bodyHtml).toContain("qrcode-img");
      expect(bodyHtml.match(/alt="GHS0[1-9]"/g)).toHaveLength(9);
      expect(bodyHtml.match(/class="qrcode-img"/g)).toHaveLength(1);
      expect(bodyHtml).toContain("label-qr-no-code");
      expect(bodyHtml).not.toContain("more-pics");
      expect(alertSpy).not.toHaveBeenCalled();
      jest.advanceTimersByTime(300);
      expect(mockIframeWindow.print).toHaveBeenCalled();
    });

    it("standard template uses the new hierarchy blocks for rail + hazard board", () => {
      printLabels(
        [mockChemical],
        { size: "medium", template: "standard", orientation: "portrait" },
        {},
      );
      const html = mockIframeDoc.write.mock.calls[0][0];
      expect(html).toContain("standard-grid");
      expect(html).toContain("standard-rail");
      expect(html).toContain("standard-main");
      expect(html).toContain("standard-signal-row");
      expect(html).toContain("hazard-primary-item");
      expect(html).toContain(
        "grid-template-columns: minmax(0, 32.9mm) minmax(0, 1fr)",
      );
      expect(html).toContain("grid-template-columns: repeat(2, 15mm)");
      expect(html).toContain("width: 15mm");
      expect(html).toContain(".label-standard .name-en");
      expect(html).not.toMatch(/<div\s+class="hazard-more"/);
    });

    it("scales standard pictograms and content capacity by physical stock", () => {
      const manyHazards = {
        ...mockChemical,
        ghs_pictograms: [
          { code: "GHS02" },
          { code: "GHS05" },
          { code: "GHS06" },
          { code: "GHS07" },
        ],
        hazard_statements: Array.from({ length: 5 }, (_, i) => ({
          code: `H${300 + i}`,
          text_en: `Hazard ${i + 1}`,
        })),
      };

      const smallPreview = buildPrintPreviewDocument(
        [manyHazards],
        {
          labelPurpose: "shipping",
          template: "standard",
          stockPreset: "small-strip",
        },
        {},
        {},
        {},
        {},
        { mode: "label" },
      );
      const bottlePreview = buildPrintPreviewDocument(
        [manyHazards],
        {
          labelPurpose: "shipping",
          template: "standard",
          stockPreset: "medium-bottle",
        },
        {},
        {},
        {},
        {},
        { mode: "label" },
      );

      expect(smallPreview.fragmentHtml).toContain("label-form-strip");
      expect(smallPreview.fragmentHtml).toContain("label-kind-supplemental");
      expect(smallPreview.html).toContain(
        "grid-template-columns: repeat(4, 9.1mm)",
      );
      expect(smallPreview.html).toContain("width: 9.1mm");
      expect(smallPreview.html).toContain("border-bottom: 1px solid #dbe4ef");
      expect(smallPreview.fragmentHtml.match(/alt="GHS0[2567]"/g)).toHaveLength(
        4,
      );
      expect(smallPreview.fragmentHtml).toContain("hazard-more");

      expect(bottlePreview.fragmentHtml).toContain("label-form-bottle");
      expect(bottlePreview.fragmentHtml).toContain("label-kind-supplemental");
      expect(bottlePreview.html).toContain(
        "grid-template-columns: repeat(2, 15mm)",
      );
      expect(bottlePreview.html).toContain("width: 15mm");
      expect(bottlePreview.fragmentHtml).toContain("hazard-code-list");
      expect(bottlePreview.fragmentHtml.match(/hazard-primary-item/g)).toHaveLength(
        2,
      );
      expect(bottlePreview.fragmentHtml.match(/alt="GHS0[2567]"/g)).toHaveLength(
        4,
      );
    });

    it("standard template calls out omitted hazards instead of silently dropping them", () => {
      const manyHazards = {
        ...mockChemical,
        hazard_statements: Array.from({ length: 5 }, (_, i) => ({
          code: `H${300 + i}`,
          text_en: `Hazard ${i + 1}`,
        })),
      };
      printLabels(
        [manyHazards],
        { size: "medium", template: "standard", orientation: "portrait" },
        {},
      );
      const html = mockIframeDoc.write.mock.calls[0][0];
      expect(html).toContain("hazard-more");
      expect(html).toContain("print.moreHazardsShort");
    });

    it("prioritizes severe H statements before summarizing compact standard labels", () => {
      const mixedHazards = {
        ...mockChemical,
        ghs_pictograms: [
          { code: "GHS04" },
          { code: "GHS05" },
          { code: "GHS06" },
          { code: "GHS07" },
        ],
        hazard_statements: [
          { code: "H335", text_en: "May cause respiratory irritation" },
          { code: "H319", text_en: "Causes serious eye irritation" },
          { code: "H314", text_en: "Causes severe skin burns and eye damage" },
          { code: "H330", text_en: "Fatal if inhaled" },
        ],
      };

      const preview = buildPrintPreviewDocument(
        [mixedHazards],
        {
          labelPurpose: "shipping",
          template: "standard",
          stockPreset: "small-strip",
          nameDisplay: "en",
        },
        {},
        {},
        {},
        {},
        { mode: "label" },
      );

      expect(preview.fragmentHtml).toContain("label-kind-supplemental");
      expect(preview.fragmentHtml).toContain("H314");
      expect(preview.fragmentHtml).not.toContain("H335 May cause");
      expect(preview.fragmentHtml).toContain("hazard-more");
    });

    it("omits P codes from container front labels so H-code content stays readable", () => {
      const mixedPrecautions = {
        ...mockChemical,
        hazard_statements: [{ code: "H314", text_en: "Corrosive" }],
        precautionary_statements: [
          { code: "P501", text_en: "Dispose contents" },
          { code: "P403+P233", text_en: "Store in a well-ventilated place" },
          { code: "P271", text_en: "Use outdoors or in a well-ventilated area" },
          { code: "P280", text_en: "Wear protective gloves" },
          { code: "P305+P351+P338", text_en: "IF IN EYES" },
          { code: "P301+P330+P331", text_en: "IF SWALLOWED" },
        ],
      };

      const preview = buildPrintPreviewDocument(
        [mixedPrecautions],
        {
          labelPurpose: "shipping",
          template: "standard",
          stockPreset: "large-primary",
          nameDisplay: "en",
        },
        {},
        {},
        {},
        {},
        { mode: "label" },
      );

      expect(preview.fragmentHtml).toContain("H314");
      expect(preview.fragmentHtml).toContain("label-content-container-front");
      expect(preview.fragmentHtml).toContain(
        "label-hazard-mode-h-codes-only",
      );
      expect(preview.fragmentHtml).toContain(
        "label-precaution-mode-omitted",
      );
      expect(preview.fragmentHtml).not.toContain("P301+P330+P331");
      expect(preview.fragmentHtml).not.toContain("P280");
      expect(preview.fragmentHtml).not.toContain("P501");
      expect(preview.fragmentHtml).not.toContain("precaution-more");
    });

    it("keeps QR strip supplements focused on identity, QR, and pictograms only", () => {
      const mixedHazards = {
        ...mockChemical,
        ghs_pictograms: [
          { code: "GHS04" },
          { code: "GHS05" },
          { code: "GHS06" },
          { code: "GHS07" },
        ],
        hazard_statements: [
          { code: "H335", text_en: "May cause respiratory irritation" },
          { code: "H319", text_en: "Causes serious eye irritation" },
          { code: "H330", text_en: "Fatal if inhaled" },
        ],
      };

      const preview = buildPrintPreviewDocument(
        [mixedHazards],
        {
          labelPurpose: "qrSupplement",
          template: "qrcode",
          stockPreset: "small-strip",
          nameDisplay: "en",
        },
        {},
        {},
        {},
        {},
        { mode: "label" },
      );

      expect(preview.fragmentHtml).toContain("label-kind-qr-supplement");
      expect(preview.fragmentHtml).toContain("label-content-qr-supplement");
      expect(preview.fragmentHtml).toContain("label-hazard-mode-qr-reference");
      expect(preview.fragmentHtml).not.toContain("qr-hazard-chip");
      expect(preview.fragmentHtml).not.toContain("H330");
      expect(preview.fragmentHtml).not.toContain("Danger");
      expect(preview.model.expandedLabels).toHaveLength(1);
      expect(preview.fragmentHtml.match(/alt="GHS0[4567]"/g)).toHaveLength(4);
      expect(expandedPictogramCodes(preview)).toEqual([
        "GHS04",
        "GHS05",
        "GHS06",
        "GHS07",
      ]);
      expect(preview.fragmentHtml).not.toContain("more-pics");
    });

    it("full template uses a compliance-style fixed hierarchy", () => {
      printLabels(
        [mockChemical],
        { size: "large", template: "full", orientation: "portrait" },
        {},
      );
      const html = mockIframeDoc.write.mock.calls[0][0];
      expect(html).toContain("label-compliance");
      expect(html).toContain("label-purpose-shipping");
      expect(html).toContain("compliance-alert-panel");
      expect(html).toContain("compliance-pictograms");
      expect(html).toContain("compliance-statements-panel");
      expect(html).toContain("compliance-hazard-panel");
      expect(html).toContain("compliance-precaution-panel");
      expect(html).toContain("compliance-footer");
      expect(html).toContain("print.hazardStatementsLabel");
      expect(html).not.toContain("hazards-full");
      expect(html.indexOf("compliance-alert-panel")).toBeLessThan(
        html.indexOf("compliance-statements-panel"),
      );
      expect(html.indexOf("compliance-precaution-panel")).toBeLessThan(
        html.indexOf("compliance-footer"),
      );
    });

    it("full template keeps pictograms prominent and wraps long statement codes", () => {
      const denseChemical = {
        ...mockChemical,
        ghs_pictograms: [
          { code: "GHS01" },
          { code: "GHS02" },
          { code: "GHS07" },
        ],
        precautionary_statements: [
          {
            code: "P301+P330+P331",
            text_en: "IF SWALLOWED: rinse mouth. Do NOT induce vomiting.",
          },
        ],
      };

      printLabels(
        [denseChemical],
        { size: "large", template: "full", orientation: "portrait" },
        {},
      );
      const html = mockIframeDoc.write.mock.calls[0][0];
      expect(html).toContain("statement-code statement-code-long");
      expect(html).toContain(
        "grid-template-columns: minmax(20mm, 28mm) minmax(0, 1fr)",
      );
      expect(html).toContain("width: 24.6mm");
      expect(html).toContain("height: 24.6mm");
    });

    it("A4 primary uses a dedicated full-page label layout and scaled preview", () => {
      const denseChemical = {
        ...mockChemical,
        ghs_pictograms: [
          { code: "GHS02" },
          { code: "GHS05" },
          { code: "GHS06" },
          { code: "GHS07" },
        ],
        hazard_statements: Array.from({ length: 6 }, (_, index) => ({
          code: `H${300 + index}`,
          text_en: `Hazard ${index}`,
        })),
        precautionary_statements: Array.from({ length: 22 }, (_, index) => ({
          code: `P${300 + index}`,
          text_en: `Precaution ${index}`,
        })),
      };

      const preview = buildPrintPreviewDocument(
        [denseChemical],
        {
          labelPurpose: "shipping",
          template: "full",
          stockPreset: "a4-primary",
        },
        {},
        {},
        {},
        { organization: "Lab A", phone: "02-1234", address: "Taipei" },
        { mode: "label" },
      );

      expect(preview.fragmentHtml).toContain("label-a4-primary");
      expect(preview.html).toContain("width: 28.2mm");
      expect(preview.html).toContain("height: 28.2mm");
      expect(preview.html).not.toContain("column-count: 3");
      expect(preview.html).toMatch(
        /\.label-full-page-primary \.compliance-precaution-list \{[\s\S]*display: flex;/,
      );
      expect(preview.html).toContain("compliance-statements-panel");
      expect(preview.html).toContain(
        "grid-template-rows: auto minmax(0, 1fr) auto",
      );
      expect(preview.fragmentHtml).not.toContain("label-continuation-page");
      expect(preview.html).toContain("--precaution-code-max:11.2mm");
      expect(preview.html).not.toContain("font-size: 9px !important");
      expect(preview.html).toContain("compliance-qr");
      expect(preview.html).toContain("qrcode-img");
      expect(preview.html).toContain('data-qr-target="http://localhost/?cas=64-17-5"');
      expect(preview.html).toContain("preview-label-scaler");
      expect(preview.html).toContain("transform: scale(0.");
      expect(preview.html).toContain("height: 264px");
      expect(preview.previewMetrics.frameHeightPx).toBeLessThanOrEqual(300);
    });

    it("splits overly dense full-page primary labels into continuation pages", () => {
      const denseChemical = {
        ...mockChemical,
        cas_number: "50-00-0",
        name_en: "Formaldehyde",
        name_zh: "甲醛",
        ghs_pictograms: [
          { code: "GHS05" },
          { code: "GHS06" },
          { code: "GHS07" },
          { code: "GHS08" },
        ],
        hazard_statements: Array.from({ length: 14 }, (_, index) => ({
          code: `H${300 + index}`,
          text_en:
            "This is a very long complete-primary hazard statement that must remain available on the printed shipped-container label set and still remain readable after bilingual layout calibration.",
        })),
        precautionary_statements: Array.from({ length: 30 }, (_, index) => ({
          code: `P${300 + index}`,
          text_en:
            "This is a very long precautionary statement retained for continuation-page printing so the final output does not clip content while preserving clear code alignment and readable wrapping.",
        })),
      };

      const documentBundle = buildPrintDocument(
        [denseChemical],
        {
          labelPurpose: "shipping",
          template: "full",
          stockPreset: "a4-primary",
          nameDisplay: "both",
        },
        {},
        {},
        {},
        { organization: "Lab A", phone: "02-1234", address: "Taipei" },
      );

      expect(documentBundle.model.expandedLabels.length).toBeGreaterThan(1);
      expect(documentBundle.pagesHtml).toContain("label-continuation-page");
      expect(documentBundle.pagesHtml).toContain("data-continuation-page=\"1\"");
      expect(documentBundle.pagesHtml).toContain("print.continuationBadge");
      expect(documentBundle.pagesHtml).toContain(">H300</span>");
      expect(documentBundle.pagesHtml).toContain(">P329</span>");
      expect(documentBundle.pagesHtml.match(/alt=\"GHS08\"/g)).toHaveLength(1);
      expect(
        documentBundle.pagesHtml.match(/class="pictograms compliance-pictograms"/g),
      ).toHaveLength(1);
      expect(documentBundle.pagesHtml).toContain("compliance-core-no-alert");
      expect(documentBundle.pagesHtml.match(/class="qrcode-img"/g)).toHaveLength(1);
      expect(documentBundle.model.totalPages).toBe(
        documentBundle.model.expandedLabels.length,
      );
    });

    it("keeps moderate A4 complete labels on one efficient page before using continuation", () => {
      const moderateChemical = {
        ...mockChemical,
        cas_number: "90-41-5",
        name_en: "2-Aminobiphenyl",
        name_zh: "2-Aminobiphenyl ZH",
        ghs_pictograms: [{ code: "GHS07" }, { code: "GHS08" }],
        signal_word: "Warning",
        hazard_statements: [
          { code: "H302", text_en: "Harmful if swallowed." },
          { code: "H351", text_en: "Suspected of causing cancer." },
          {
            code: "H412",
            text_en: "Harmful to aquatic life with long lasting effects.",
          },
        ],
        precautionary_statements: [
          {
            code: "P203",
            text_en:
              "Obtain, read and follow all safety instructions before use.",
          },
          { code: "P264", text_en: "Wash hands thoroughly after handling." },
          {
            code: "P270",
            text_en: "Do not eat, drink or smoke when using this product.",
          },
          { code: "P273", text_en: "Avoid release to the environment." },
          {
            code: "P280",
            text_en:
              "Wear protective gloves, protective clothing, eye protection and face protection.",
          },
          { code: "P301+P317", text_en: "If swallowed: Get medical help." },
          {
            code: "P318",
            text_en: "If exposed or concerned, get medical advice.",
          },
          { code: "P330", text_en: "Rinse mouth." },
          { code: "P405", text_en: "Store locked up." },
          {
            code: "P501",
            text_en:
              "Dispose of contents and container in accordance with local regulations.",
          },
        ],
      };

      const documentBundle = buildPrintDocument(
        [moderateChemical],
        {
          labelPurpose: "shipping",
          template: "full",
          stockPreset: "a4-primary",
          nameDisplay: "both",
        },
        {},
        {},
        {},
        { organization: "Lab A", phone: "02-1234", address: "Taipei" },
      );

      expect(documentBundle.model.expandedLabels).toHaveLength(1);
      expect(documentBundle.pagesHtml).not.toContain("label-continuation-page");
      expect(documentBundle.pagesHtml).toContain(
        'style="font-size:6.6px;line-height:1.03"',
      );
      expect(documentBundle.pagesHtml).toContain(">H302</span>");
      expect(documentBundle.pagesHtml).toContain(">P501</span>");
      expect(
        documentBundle.pagesHtml.match(
          /CAS<\/span><span class="meta-chip-value">90-41-5/g,
        ),
      ).toHaveLength(1);
      expect(documentBundle.pagesHtml.match(/class="qrcode-img"/g)).toHaveLength(1);
    });

    it("uses available A4 space before moving long precautions to continuation labels", () => {
      const precautionHeavyChemical = {
        ...mockChemical,
        cas_number: "455-14-1",
        name_en: "4-Aminobenzotrifluoride",
        name_zh: "4-胺基三氟甲苯",
        ghs_pictograms: [
          { code: "GHS05" },
          { code: "GHS06" },
          { code: "GHS07" },
        ],
        signal_word: "Danger",
        hazard_statements: [
          { code: "H301", text_en: "Toxic if swallowed." },
          { code: "H314", text_en: "Causes severe skin burns and eye damage." },
          { code: "H331", text_en: "Toxic if inhaled." },
        ],
        precautionary_statements: Array.from({ length: 52 }, (_, index) => ({
          code: `P${300 + index}`,
          text_en:
            "Keep this precautionary instruction readable on the primary label, including handling, storage, emergency response, and disposal instructions that wrap over multiple lines.",
        })),
      };

      const documentBundle = buildPrintDocument(
        [precautionHeavyChemical],
        {
          labelPurpose: "shipping",
          template: "full",
          stockPreset: "a4-primary",
          nameDisplay: "both",
        },
        {},
        {},
        {},
        { organization: "Lab A", phone: "02-1234", address: "Taipei" },
      );

      expect(documentBundle.model.expandedLabels.length).toBeGreaterThan(1);
      const [hazardPage, firstPrecautionPage] =
        documentBundle.model.expandedLabels;
      expect(hazardPage.continuation.hazardStatements).toHaveLength(3);
      expect(
        hazardPage.continuation.precautionaryStatements.length,
      ).toBeGreaterThan(0);
      expect(firstPrecautionPage.continuation.hazardStatements).toHaveLength(0);
      expect(
        firstPrecautionPage.continuation.precautionaryStatements.length,
      ).toBeGreaterThan(0);
      expect(documentBundle.model.expandedLabels.length).toBeLessThan(4);
      expect(documentBundle.pagesHtml).toContain("label-continuation-page");
      expect(documentBundle.pagesHtml.match(/class="qrcode-img"/g)).toHaveLength(1);

      expect(documentBundle.pagesHtml).toMatch(
        /<div class="compliance-header-actions">[\s\S]*class="meta-chip meta-chip-cas compliance-header-cas"[\s\S]*class="signal danger compliance-signal"[\s\S]*class="continuation-badge"/,
      );
      expect(documentBundle.pagesHtml).not.toMatch(
        /class="meta-ribbon"[\s\S]*CAS<\/span><span class="meta-chip-value">455-14-1/,
      );
      expect(
        documentBundle.pagesHtml.match(
          /class="pictograms compliance-pictograms"/g,
        ),
      ).toHaveLength(1);
      expect(documentBundle.pagesHtml).toMatch(
        /<div class="compliance-alert-panel">\s*<div class="pictograms compliance-pictograms">/,
      );
      expect(documentBundle.pagesHtml).not.toMatch(
        /<div class="compliance-alert-panel">\s*<div class="signal [^"]*compliance-signal"/,
      );
      expect(documentBundle.html).toContain(
        ".label-full-page-primary .pictograms.compliance-pictograms",
      );
      expect(documentBundle.html).toContain(
        "justify-content: flex-start;",
      );
      expect(documentBundle.html).toContain(
        ".label-full-page-primary .name-zh",
      );
      expect(documentBundle.html).toContain("font-size: 26px;");
      expect(documentBundle.html).toContain("line-height: 1.18;");
    });

    it("packs moderate H/P content onto one A4 page without CSS column balancing", () => {
      const moderateContinuationChemical = {
        ...mockChemical,
        cas_number: "1003-09-4",
        name_en: "2-Bromothiophene",
        name_zh: "2-Bromothiophene ZH",
        ghs_pictograms: [
          { code: "GHS02" },
          { code: "GHS05" },
          { code: "GHS06" },
          { code: "GHS07" },
        ],
        signal_word: "Danger",
        hazard_statements: [
          "Flammable liquid and vapor.",
          "Fatal if swallowed.",
          "Toxic if swallowed.",
          "Fatal in contact with skin.",
          "Causes skin irritation.",
          "Causes serious eye damage.",
          "Causes serious eye irritation.",
          "Fatal if inhaled.",
        ].map((text_en, index) => ({
          code: `H${226 + index}`,
          text_en:
            `${text_en} Keep the hazard line readable and aligned with the same code and text rhythm.`,
        })),
        precautionary_statements: Array.from({ length: 24 }, (_, index) => ({
          code:
            index % 5 === 0
              ? `P${300 + index}+P${350 + index}+P${380 + index}`
              : `P${210 + index}`,
          text_en:
            "Keep this precautionary instruction readable with enough wording to exercise continuation packing, but do not force a short orphan third page.",
        })),
      };

      const documentBundle = buildPrintDocument(
        [moderateContinuationChemical],
        {
          labelPurpose: "shipping",
          template: "full",
          stockPreset: "a4-primary",
          nameDisplay: "both",
        },
        {},
        {},
        {},
        { organization: "Lab A", phone: "02-1234", address: "Taipei" },
      );

      expect(documentBundle.model.expandedLabels).toHaveLength(1);
      expect(documentBundle.pagesHtml).not.toContain("label-continuation-page");
      expect(documentBundle.pagesHtml).not.toContain('data-continuation-page="1"');
      expect(documentBundle.pagesHtml).not.toContain('data-continuation-page="2"');
      expect(documentBundle.pagesHtml).not.toContain(
        'data-continuation-page="3"',
      );
      expect(
        documentBundle.pagesHtml.match(
          /class="pictograms compliance-pictograms"/g,
        ),
      ).toHaveLength(1);
      expect(documentBundle.html).toContain(
        ".label-full-page-primary .compliance-precaution-list",
      );
      expect(documentBundle.html).not.toContain(
        "column-count: var(--compliance-columns",
      );
      expect(documentBundle.html).not.toContain(
        "column-count: ${layout.typography.complianceColumns}",
      );
      expect(documentBundle.html).toMatch(
        /\.label-full-page-primary \.compliance-precaution-list \{[\s\S]*display: flex;/,
      );
      expect(documentBundle.html).toMatch(
        /\.label-full-page-primary \.compliance-precaution-list \.compliance-statement \{[\s\S]*grid-template-columns:/,
      );
    });

    it("keeps retry-fitted A4 H/P sections together when they still fit one page", () => {
      const mixedOverflowRiskChemical = {
        ...mockChemical,
        cas_number: "1003-09-4",
        name_en: "2-Bromothiophene",
        name_zh: "2-Bromothiophene ZH",
        ghs_pictograms: [
          { code: "GHS02" },
          { code: "GHS05" },
          { code: "GHS06" },
          { code: "GHS07" },
        ],
        signal_word: "Danger",
        hazard_statements: Array.from({ length: 8 }, (_, index) => ({
          code: `H${300 + index}`,
          text_en:
            "Keep the hazard line readable and aligned with bilingual complete primary text.",
        })),
        precautionary_statements: Array.from({ length: 24 }, (_, index) => ({
          code:
            index % 4 === 0
              ? `P${300 + index}+P${350 + index}+P${380 + index}`
              : `P${210 + index}`,
          text_en:
            "Keep this long precautionary instruction readable on a continuation page without being squeezed under the hazard statement block.",
        })),
      };

      const documentBundle = buildPrintDocument(
        [mixedOverflowRiskChemical],
        {
          labelPurpose: "shipping",
          template: "full",
          stockPreset: "a4-primary",
          nameDisplay: "both",
          autoFitLevel: 1,
        },
        {},
        {},
        {},
        { organization: "Lab A", phone: "02-1234", address: "Taipei" },
      );

      expect(documentBundle.html).toContain("label-fit-level-1");
      expect(documentBundle.model.expandedLabels).toHaveLength(1);
      expect(documentBundle.pagesHtml).not.toContain("label-continuation-page");
      expect(documentBundle.pagesHtml).toContain(">H300</span>");
      expect(documentBundle.pagesHtml).toContain(">P233</span>");
    });

    it("keeps moderate A4 H/P content on one retry-fitted page when it fits", () => {
      const moderateChemical = {
        ...mockChemical,
        cas_number: "84-65-1",
        name_en: "Anthraquinone",
        name_zh: "Anthraquinone ZH",
        ghs_pictograms: [{ code: "GHS07" }, { code: "GHS08" }],
        signal_word: "Danger",
        hazard_statements: [
          {
            code: "H317",
            text_en:
              "May cause an allergic skin reaction [Warning Sensitization, Skin]",
          },
          {
            code: "H350",
            text_en: "May cause cancer [Danger Carcinogenicity]",
          },
        ],
        precautionary_statements: [
          { code: "P203", text_en: "P203" },
          {
            code: "P261",
            text_en: "Avoid breathing dust, fume, gas, mist, vapours, spray.",
          },
          {
            code: "P272",
            text_en:
              "Contaminated work clothing should not be allowed out of the workplace.",
          },
          {
            code: "P280",
            text_en:
              "Wear protective gloves, protective clothing, eye protection, face protection.",
          },
          {
            code: "P302+P352",
            text_en: "IF ON SKIN: Wash with plenty of water.",
          },
          { code: "P318", text_en: "P318" },
          {
            code: "P321",
            text_en: "Specific treatment (see supplemental safety document).",
          },
          { code: "P333+P317", text_en: "P333+P317" },
          {
            code: "P362+P364",
            text_en:
              "Take off contaminated clothing and wash it before reuse.",
          },
          { code: "P405", text_en: "Store locked up." },
          {
            code: "P501",
            text_en:
              "Dispose of contents and container in accordance with local regulations.",
          },
        ],
      };

      const documentBundle = buildPrintDocument(
        [moderateChemical],
        {
          labelPurpose: "shipping",
          template: "full",
          stockPreset: "a4-primary",
          nameDisplay: "both",
          autoFitLevel: 1,
        },
        {},
        {},
        {},
        { organization: "Lab A", phone: "02-1234", address: "Taipei" },
      );

      expect(documentBundle.html).toContain("label-fit-level-1");
      expect(documentBundle.model.expandedLabels).toHaveLength(1);
      expect(documentBundle.pagesHtml).not.toContain(
        'data-continuation-page="2"',
      );
    });

    it("keeps retry auto-fit level while avoiding false batch continuation splits", () => {
      const batchOverrideChemical = {
        ...mockChemical,
        cas_number: "1003-09-4",
        name_en: "2-Bromothiophene",
        name_zh: "2-Bromothiophene ZH",
        ghs_pictograms: [
          { code: "GHS02" },
          { code: "GHS05" },
          { code: "GHS06" },
          { code: "GHS07" },
        ],
        signal_word: "Danger",
        hazard_statements: Array.from({ length: 8 }, (_, index) => ({
          code: `H${300 + index}`,
          text_en:
            "Keep the hazard line readable and aligned with bilingual complete primary text.",
        })),
        precautionary_statements: Array.from({ length: 24 }, (_, index) => ({
          code:
            index % 4 === 0
              ? `P${300 + index}+P${350 + index}+P${380 + index}`
              : `P${210 + index}`,
          text_en:
            "Keep this long precautionary instruction readable on a continuation page without being squeezed under the hazard statement block.",
        })),
        __printLayoutOverride: resolvePrintLayoutConfig({
          labelPurpose: "shipping",
          template: "full",
          stockPreset: "a4-primary",
          nameDisplay: "both",
          autoFitLevel: 0,
        }),
      };

      const documentBundle = buildPrintDocument(
        [batchOverrideChemical],
        {
          labelPurpose: "shipping",
          template: "full",
          stockPreset: "a4-primary",
          nameDisplay: "both",
          autoFitLevel: 1,
        },
        {},
        {},
        {},
        { organization: "Lab A", phone: "02-1234", address: "Taipei" },
      );

      expect(documentBundle.html).toContain("label-fit-level-1");
      expect(documentBundle.model.expandedLabels).toHaveLength(1);
      expect(documentBundle.pagesHtml).not.toContain("label-continuation-page");
      expect(documentBundle.pagesHtml).toContain(">H300</span>");
      expect(documentBundle.pagesHtml).toContain(">P233</span>");
    });

    it("can render a selected continuation page in print preview", () => {
      const denseChemical = {
        ...mockChemical,
        cas_number: "50-00-0",
        name_en: "Formaldehyde",
        name_zh: "甲醛",
        ghs_pictograms: [
          { code: "GHS05" },
          { code: "GHS06" },
          { code: "GHS07" },
          { code: "GHS08" },
        ],
        hazard_statements: Array.from({ length: 14 }, (_, index) => ({
          code: `H${300 + index}`,
          text_en:
            "This is a very long complete-primary hazard statement that must remain available on the printed shipped-container label set and still remain readable after bilingual layout calibration.",
        })),
        precautionary_statements: Array.from({ length: 30 }, (_, index) => ({
          code: `P${300 + index}`,
          text_en:
            "This is a very long precautionary statement retained for continuation-page printing so the final output does not clip content while preserving clear code alignment and readable wrapping.",
        })),
      };

      const labelPreview = buildPrintPreviewDocument(
        [denseChemical],
        {
          labelPurpose: "shipping",
          template: "full",
          stockPreset: "a4-primary",
          nameDisplay: "both",
        },
        {},
        {},
        {},
        { organization: "Lab A", phone: "02-1234", address: "Taipei" },
        { mode: "label", labelIndex: 1 },
      );
      const sheetPreview = buildPrintPreviewDocument(
        [denseChemical],
        {
          labelPurpose: "shipping",
          template: "full",
          stockPreset: "a4-primary",
          nameDisplay: "both",
        },
        {},
        {},
        {},
        { organization: "Lab A", phone: "02-1234", address: "Taipei" },
        { mode: "sheet", pageIndex: 1 },
      );

      expect(labelPreview.model.expandedLabels.length).toBeGreaterThan(1);
      expect(labelPreview.previewLabelIndex).toBe(1);
      expect(labelPreview.fragmentHtml).toContain(
        'data-continuation-page="2"',
      );
      expect(labelPreview.fragmentHtml).not.toContain(
        'data-continuation-page="1"',
      );
      expect(sheetPreview.previewPageIndex).toBe(1);
      expect(sheetPreview.fragmentHtml).toContain('data-continuation-page="2"');
    });

    it("Letter primary uses its own full-page class and paper size", () => {
      const preview = buildPrintPreviewDocument(
        [mockChemical],
        {
          labelPurpose: "shipping",
          template: "full",
          stockPreset: "letter-primary",
        },
        {},
        {},
        {},
        { organization: "Lab A", phone: "02-1234", address: "Taipei" },
        { mode: "label" },
      );

      expect(preview.fragmentHtml).toContain("label-letter-primary");
      expect(preview.html).toContain("size: Letter");
      expect(preview.html).toContain("width: 29.4mm");
      expect(preview.html).toContain("compliance-qr");
      expect(preview.html).toContain("qrcode-img");
      expect(preview.html).toContain("preview-label-scaler");
      expect(preview.html).toContain("height: 264px");
      expect(preview.previewMetrics.frameHeightPx).toBeLessThanOrEqual(300);
    });

    it("qrcode template uses the compact lookup hierarchy without caption text", () => {
      printLabels(
        [mockChemical],
        { size: "medium", template: "qrcode", orientation: "portrait" },
        {},
      );
      const html = mockIframeDoc.write.mock.calls[0][0];
      expect(html).toContain("small-identity");
      expect(html).toContain("qr-code-shell");
      expect(html).not.toContain("qr-hint");
      expect(html).not.toContain("print.scanForDetail");
      expect(html).toContain("CAS 64-17-5");
      expect(html).not.toContain("qr-cas");
    });

    it("qrcode template omits H/P hazard teasers and relies on the lookup QR", () => {
      const manyHazards = {
        ...mockChemical,
        hazard_statements: Array.from({ length: 4 }, (_, i) => ({
          code: `H${300 + i}`,
          text_en: `Hazard ${i + 1}`,
        })),
      };
      printLabels(
        [manyHazards],
        { size: "medium", template: "qrcode", orientation: "portrait" },
        {},
      );
      const html = mockIframeDoc.write.mock.calls[0][0];
      expect(html).not.toMatch(/<div\s+class="hazard-more qr-hazard-more"/);
      expect(html).not.toContain("H300");
      expect(html).not.toContain("print.moreHazardsShort");
      expect(html).toContain('data-qr-target="http://localhost/?cas=64-17-5"');
    });

    it("keeps supplemental workflow notices out of the printed label body", () => {
      printLabels(
        [mockChemical],
        {
          labelPurpose: "qrSupplement",
          size: "small",
          template: "qrcode",
          orientation: "landscape",
        },
        {},
      );
      const qrHtml = mockIframeDoc.write.mock.calls[0][0];
      expect(qrHtml).not.toContain("purpose-notice");
      expect(qrHtml).not.toContain("print.qrSupplementNotice");

      mockIframeDoc.write.mockClear();
      printLabels(
        [mockChemical],
        {
          labelPurpose: "quickId",
          size: "small",
          template: "icon",
          orientation: "portrait",
        },
        {},
      );
      const iconHtml = mockIframeDoc.write.mock.calls[0][0];
      expect(iconHtml).not.toContain("purpose-notice");
      expect(iconHtml).not.toContain("print.quickIdNotice");

      mockIframeDoc.write.mockClear();
      printLabels(
        [mockChemical],
        {
          labelPurpose: "shipping",
          size: "small",
          template: "standard",
          orientation: "portrait",
        },
        {},
      );
      const standardHtml = mockIframeDoc.write.mock.calls[0][0];
      expect(standardHtml).not.toContain("purpose-notice");
      expect(standardHtml).not.toContain("print.supplementalHazardNotice");
    });
  });

  describe("sizes and orientations", () => {
    it("handles small size", () => {
      printLabels(
        [mockChemical],
        { size: "small", template: "standard", orientation: "portrait" },
        {},
      );
      const html = mockIframeDoc.write.mock.calls[0][0];
      expect(html).toContain("54mm");
    });

    it("handles large size", () => {
      printLabels(
        [mockChemical],
        { size: "large", template: "standard", orientation: "portrait" },
        {},
      );
      const html = mockIframeDoc.write.mock.calls[0][0];
      expect(html).toContain("140mm");
    });

    it("handles landscape orientation", () => {
      printLabels(
        [mockChemical],
        { size: "medium", template: "standard", orientation: "landscape" },
        {},
      );
      const html = mockIframeDoc.write.mock.calls[0][0];
      expect(html).toContain("A4 landscape");
    });

    it("portrait does not include landscape keyword in @page", () => {
      printLabels(
        [mockChemical],
        { size: "medium", template: "standard", orientation: "portrait" },
        {},
      );
      const html = mockIframeDoc.write.mock.calls[0][0];
      expect(html).not.toContain("A4 landscape");
      expect(html).toContain("size: A4");
    });
  });

  describe("custom label fields", () => {
    const fields = {
      labName: "Lab A",
      date: "2026-02-12",
      batchNumber: "B-001",
    };
    const config = {
      size: "medium",
      template: "full",
      orientation: "portrait",
    };

    it("renders print-job fields and legacy lab name fallback in generated HTML", () => {
      printLabels([mockChemical], config, {}, fields);
      const html = mockIframeDoc.write.mock.calls[0][0];
      expect(html).toContain("Lab A");
      expect(html).toContain("2026-02-12");
      expect(html).toContain("B-001");
      expect(html).toContain("custom-fields");
      expect(html).toContain("profile-block");
    });

    it("does not render custom fields section when all empty", () => {
      printLabels(
        [mockChemical],
        config,
        {},
        { labName: "", date: "", batchNumber: "" },
      );
      const html = mockIframeDoc.write.mock.calls[0][0];
      expect(html).not.toContain('<div class="custom-fields">');
      expect(html).toContain("profile-block-missing");
      expect(html).toContain("print.supplierMissing");
    });

    it("renders only non-empty fields", () => {
      printLabels(
        [mockChemical],
        config,
        {},
        { labName: "Lab B", date: "", batchNumber: "" },
      );
      const html = mockIframeDoc.write.mock.calls[0][0];
      expect(html).toContain("Lab B");
      expect(html).toContain("profile-block");
      expect(html).not.toContain('<div class="custom-fields">');
      expect(html).not.toContain("B-001");
    });

    it("compact templates omit date, profile fallbacks, and custom batch fields", () => {
      ["icon", "qrcode"].forEach((template) => {
        const mocks = createMockIframe();
        createElementSpy.mockImplementation((tag) =>
          tag === "iframe" ? mocks.mockIframe : {},
        );
        getByIdSpy.mockReturnValue(null);

        printLabels([mockChemical], { ...config, template }, {}, fields);
        const html = mocks.mockIframeDoc.write.mock.calls[0][0];
        const bodyHtml = html.slice(html.indexOf("<body"));
        expect(bodyHtml).not.toContain("Lab A");
        expect(bodyHtml).not.toContain("2026-02-12");
        expect(bodyHtml).not.toContain("B-001");
        expect(bodyHtml).not.toContain("meta-chip-batch");
      });
    });

    it("renders custom fields with default empty object", () => {
      // No customLabelFields argument → uses default {}
      printLabels([mockChemical], config, {});
      const html = mockIframeDoc.write.mock.calls[0][0];
      expect(html).not.toContain('<div class="custom-fields">');
    });

    it("batch number includes prefix label", () => {
      printLabels(
        [mockChemical],
        config,
        {},
        { labName: "", date: "", batchNumber: "X-99" },
      );
      const html = mockIframeDoc.write.mock.calls[0][0];
      expect(html).toContain("print.batch");
      expect(html).toContain("X-99");
    });

    it("keeps compact supplemental templates limited to CAS, names, icons, and optional QR", () => {
      ["icon", "qrcode"].forEach((template) => {
        mockIframeDoc.write.mockClear();
        printLabels(
          [mockChemical],
          {
            labelPurpose:
              template === "qrcode"
                ? "qrSupplement"
                : template === "standard"
                  ? "shipping"
                  : "quickId",
            template,
            stockPreset: "small-strip",
            nameDisplay: "both",
          },
          {},
          { labName: "", date: "", batchNumber: "CASE-2026-0007" },
        );
        const html = mockIframeDoc.write.mock.calls[0][0];
        const bodyHtml = html.slice(html.indexOf("<body"));
        expect(bodyHtml).not.toContain("meta-chip-batch");
        expect(bodyHtml).not.toContain("CASE-2026-0007");
        expect(bodyHtml).toContain("CAS");
        expect(bodyHtml).toContain(mockChemical.cas_number);
      });
    });
  });

  describe("lab profile rendering", () => {
    const config = {
      size: "medium",
      template: "full",
      orientation: "portrait",
    };
    const profile = {
      organization: "Materials Lab",
      phone: "+886-2-1234-5678",
      address: "Taipei",
    };

    it("full labels render the complete lab profile block", () => {
      printLabels(
        [mockChemical],
        config,
        {},
        { date: "", batchNumber: "" },
        {},
        profile,
      );
      const html = mockIframeDoc.write.mock.calls[0][0];
      expect(html).toContain("profile-block");
      expect(html).toContain("Materials Lab");
      expect(html).toContain("+886-2-1234-5678");
      expect(html).toContain("Taipei");
    });

    it("compact templates hide lab profile metadata entirely", () => {
      ["icon", "standard", "qrcode"].forEach((template) => {
        const mocks = createMockIframe();
        createElementSpy.mockImplementation((tag) =>
          tag === "iframe" ? mocks.mockIframe : {},
        );
        getByIdSpy.mockReturnValue(null);

        printLabels(
          [mockChemical],
          { ...config, template },
          {},
          { date: "", batchNumber: "" },
          {},
          profile,
        );
        const html = mocks.mockIframeDoc.write.mock.calls[0][0];
        expect(html).not.toMatch(/<div\s+class="support-chips"/);
        expect(html).not.toMatch(/<div\s+class="profile-block/);
        expect(html).not.toContain("Materials Lab");
        expect(html).not.toContain("+886-2-1234-5678");
        expect(html).not.toContain("Taipei");
      });
    });

    it("full labels fall back to legacy customLabelFields.labName when labProfile is empty", () => {
      printLabels(
        [mockChemical],
        config,
        {},
        { labName: "Legacy Lab", date: "", batchNumber: "" },
      );
      const html = mockIframeDoc.write.mock.calls[0][0];
      expect(html).toContain("Legacy Lab");
    });
  });

  describe("name display modes", () => {
    it('shows both names on roomy complete labels when nameDisplay is "both"', () => {
      printLabels(
        [mockChemical],
        {
          labelPurpose: "shipping",
          stockPreset: "large-primary",
          size: "large",
          template: "full",
          orientation: "portrait",
          nameDisplay: "both",
        },
        {},
      );
      const html = mockIframeDoc.write.mock.calls[0][0];
      expect(html).toContain("Ethanol");
      expect(html).toContain("乙醇");
    });

    it('shows only English name when nameDisplay is "en"', () => {
      printLabels(
        [mockChemical],
        {
          size: "medium",
          template: "standard",
          orientation: "portrait",
          nameDisplay: "en",
        },
        {},
      );
      const html = mockIframeDoc.write.mock.calls[0][0];
      expect(html).toContain("Ethanol");
      expect(html).not.toContain("乙醇");
    });

    it('auto-fits compact bottle nameDisplay "both" to the current UI language', () => {
      printLabels(
        [mockChemical],
        {
          size: "medium",
          template: "standard",
          orientation: "portrait",
          nameDisplay: "both",
        },
        {},
      );
      const html = mockIframeDoc.write.mock.calls[0][0];
      expect(html).toContain("Ethanol");
      expect(html).not.toContain(mockChemical.name_zh);
    });

    it('shows only Chinese name when nameDisplay is "zh"', () => {
      printLabels(
        [mockChemical],
        {
          size: "medium",
          template: "standard",
          orientation: "portrait",
          nameDisplay: "zh",
        },
        {},
      );
      const html = mockIframeDoc.write.mock.calls[0][0];
      expect(html).toContain("乙醇");
      expect(html).not.toContain("Ethanol");
    });

    it('falls back to English when nameDisplay is "zh" but no Chinese name', () => {
      const enOnlyChem = { ...mockChemical, name_zh: "" };
      printLabels(
        [enOnlyChem],
        {
          size: "medium",
          template: "standard",
          orientation: "portrait",
          nameDisplay: "zh",
        },
        {},
      );
      const html = mockIframeDoc.write.mock.calls[0][0];
      expect(html).toContain("Ethanol");
    });

    it("respects nameDisplay on the legacy standard template", () => {
      ["standard"].forEach((template) => {
        const mocks = createMockIframe();
        createElementSpy.mockImplementation((tag) =>
          tag === "iframe" ? mocks.mockIframe : {},
        );
        getByIdSpy.mockReturnValue(null);

        printLabels(
          [mockChemical],
          {
            size: "medium",
            template,
            orientation: "portrait",
            nameDisplay: "en",
          },
          {},
        );
        const html = mocks.mockIframeDoc.write.mock.calls[0][0];
        expect(html).toContain("Ethanol");
        expect(html).not.toContain("乙醇");
      });
    });
    it("forces compact icon and QR templates to print CAS, English, and Chinese identity", () => {
      ["icon", "qrcode"].forEach((template) => {
        const mocks = createMockIframe();
        createElementSpy.mockImplementation((tag) =>
          tag === "iframe" ? mocks.mockIframe : {},
        );
        getByIdSpy.mockReturnValue(null);

        printLabels(
          [mockChemical],
          {
            size: "medium",
            template,
            orientation: "portrait",
            nameDisplay: "en",
          },
          {},
        );
        const html = mocks.mockIframeDoc.write.mock.calls[0][0];
        expect(html).toContain("small-cas");
        expect(html).toContain("Ethanol");
        expect(html).toContain(mockChemical.name_zh);
      });
    });

    it("does not fake a missing Chinese small-label name by repeating English", () => {
      const missingChineseName = {
        ...mockChemical,
        cas_number: "107-18-6",
        name_en: "Allyl Alcohol",
        name_zh: "",
      };

      printLabels(
        [missingChineseName],
        {
          labelPurpose: "qrSupplement",
          template: "qrcode",
          stockPreset: "brother-62mm-continuous",
          nameDisplay: "both",
        },
        {},
      );

      const html = mockIframeDoc.write.mock.calls[0][0];
      expect(html.match(/Allyl Alcohol/g)).toHaveLength(1);
      expect(html).not.toContain(
        '<div class="small-name-zh">Allyl Alcohol</div>',
      );
    });

    it('keeps short bilingual names on compact templates when nameDisplay is "both"', () => {
      ["icon", "standard", "qrcode"].forEach((template) => {
        const mocks = createMockIframe();
        createElementSpy.mockImplementation((tag) =>
          tag === "iframe" ? mocks.mockIframe : {},
        );
        getByIdSpy.mockReturnValue(null);

        printLabels(
          [mockChemical],
          {
            size: "small",
            template,
            orientation: "portrait",
            nameDisplay: "both",
          },
          {},
        );
        const html = mocks.mockIframeDoc.write.mock.calls[0][0];
        expect(html).toContain("Ethanol");
        expect(html).toContain(mockChemical.name_zh);
      });
    });

    it('falls compact bilingual names back to one language when the identity is long', () => {
      const longNamedChemical = {
        ...mockChemical,
        name_en: "N,N-Dimethyl Extremely Long Internal Batch Reagent Name",
        name_zh: "超長內部批次試劑中文名稱",
      };

      printLabels(
        [longNamedChemical],
        {
          size: "small",
          template: "standard",
          orientation: "portrait",
          nameDisplay: "both",
        },
        {},
      );

      const html = mockIframeDoc.write.mock.calls[0][0];
      expect(html).toContain(longNamedChemical.name_en);
      expect(html).not.toContain(longNamedChemical.name_zh);
    });

    it('prints bilingual signal and statements when nameDisplay is "both"', () => {
      const bilingualChemical = {
        ...mockChemical,
        signal_word: "Danger",
        signal_word_zh: "危險",
        hazard_statements: [
          {
            code: "H225",
            text_en: "Highly flammable liquid and vapor",
            text_zh: "高度易燃液體和蒸氣",
          },
        ],
        precautionary_statements: [
          {
            code: "P210",
            text_en: "Keep away from heat",
            text_zh: "遠離熱源",
          },
        ],
      };

      printLabels(
        [bilingualChemical],
        {
          size: "large",
          template: "full",
          orientation: "portrait",
          nameDisplay: "both",
        },
        {},
      );

      const html = mockIframeDoc.write.mock.calls[0][0];
      expect(html).toContain("危險 / Danger");
      expect(html).toContain("H225");
      expect(html).toContain("高度易燃液體和蒸氣 / Highly flammable liquid and vapor");
      expect(html).toContain("P210");
      expect(html).toContain("遠離熱源 / Keep away from heat");
    });
  });

  describe("label quantities", () => {
    const config = {
      size: "medium",
      template: "standard",
      orientation: "portrait",
    };

    it("prints multiple copies when quantity > 1", () => {
      const quantities = { "64-17-5": 3 };
      printLabels([mockChemical], config, {}, {}, quantities);
      const html = mockIframeDoc.write.mock.calls[0][0];
      // Should contain 3 label divs for the same chemical
      const matches = html.match(/64-17-5/g);
      expect(matches).toHaveLength(3);
    });

    it("defaults to quantity 1 when not specified", () => {
      printLabels([mockChemical], config, {}, {}, {});
      const html = mockIframeDoc.write.mock.calls[0][0];
      const matches = html.match(/64-17-5/g);
      expect(matches).toHaveLength(1);
    });

    it("respects different quantities for different chemicals", () => {
      const quantities = { "64-17-5": 2, "7732-18-5": 3 };
      printLabels(
        [mockChemical, mockChemicalNoGHS],
        config,
        {},
        {},
        quantities,
      );
      const html = mockIframeDoc.write.mock.calls[0][0];
      const ethanolMatches = html.match(/64-17-5/g);
      const waterMatches = html.match(/7732-18-5/g);
      expect(ethanolMatches).toHaveLength(2);
      expect(waterMatches).toHaveLength(3);
    });

    it("paginates correctly with expanded quantities", () => {
      // perPage for medium+portrait = 10 labels per page
      // 6 copies of ethanol + 6 copies of water = 12 total => 2 pages
      const quantities = { "64-17-5": 6, "7732-18-5": 6 };
      printLabels(
        [mockChemical, mockChemicalNoGHS],
        config,
        {},
        {},
        quantities,
      );
      const html = mockIframeDoc.write.mock.calls[0][0];
      const pageMatches = html.match(/class="page"/g);
      expect(pageMatches).toHaveLength(2);
    });
  });

  describe("full template font auto-sizing", () => {
    it("applies default font size for few hazards (tier 1)", () => {
      // mockChemical has 2 hazards → tier 1
      printLabels(
        [mockChemical],
        {
          size: "medium",
          template: "full",
          orientation: "portrait",
          nameDisplay: "en",
        },
        {},
      );
      const html = mockIframeDoc.write.mock.calls[0][0];
      expect(html).toContain("font-size:8px");
    });

    it("applies reduced font size for many hazards (tier 3)", () => {
      const manyHazards = {
        ...mockChemical,
        hazard_statements: Array.from({ length: 10 }, (_, i) => ({
          code: `H${300 + i}`,
          text_zh: `危害說明 ${i + 1}`,
        })),
      };
      printLabels(
        [manyHazards],
        {
          size: "medium",
          template: "full",
          orientation: "portrait",
          nameDisplay: "zh",
        },
        {},
      );
      const html = mockIframeDoc.write.mock.calls[0][0];
      expect(html).toContain("font-size:6px");
    });

    it("applies tiny font size for very many hazards (tier 4)", () => {
      const manyHazards = {
        ...mockChemical,
        hazard_statements: Array.from({ length: 15 }, (_, i) => ({
          code: `H${300 + i}`,
          text_zh: `危害說明 ${i + 1}`,
        })),
      };
      printLabels(
        [manyHazards],
        {
          size: "medium",
          template: "full",
          orientation: "portrait",
          nameDisplay: "zh",
        },
        {},
      );
      const html = mockIframeDoc.write.mock.calls[0][0];
      expect(html).toContain("font-size:5.5px");
    });

    it("does not apply auto-sizing inline styles to standard template", () => {
      const manyHazards = {
        ...mockChemical,
        hazard_statements: Array.from({ length: 15 }, (_, i) => ({
          code: `H${300 + i}`,
          text_zh: `危害說明 ${i + 1}`,
        })),
      };
      printLabels(
        [manyHazards],
        { size: "medium", template: "standard", orientation: "portrait" },
        {},
      );
      const html = mockIframeDoc.write.mock.calls[0][0];
      // Standard template truncates hazards, does not use auto-sizing inline styles
      expect(html).not.toContain("font-size:5.5px");
    });
  });

  describe("color mode (B&W / Color)", () => {
    const config = {
      size: "medium",
      template: "standard",
      orientation: "portrait",
    };

    it('does not include grayscale filter when colorMode is "color"', () => {
      printLabels([mockChemical], { ...config, colorMode: "color" }, {});
      const html = mockIframeDoc.write.mock.calls[0][0];
      expect(html).not.toContain("grayscale");
      expect(html).toContain("print-color");
      expect(html).not.toContain("print-bw");
    });

    it('includes grayscale filter when colorMode is "bw"', () => {
      printLabels([mockChemical], { ...config, colorMode: "bw" }, {});
      const html = mockIframeDoc.write.mock.calls[0][0];
      expect(html).toContain("print-bw");
      expect(html).toContain("grayscale(1)");
      expect(html).toContain("contrast(1.35)");
      expect(html).toContain("body.print-bw .label");
      expect(html).toContain("body.print-bw .signal");
    });

    it("does not include grayscale filter when colorMode is not set (default)", () => {
      printLabels([mockChemical], config, {});
      const html = mockIframeDoc.write.mock.calls[0][0];
      expect(html).not.toContain("grayscale");
    });
  });

  describe("custom GHS settings", () => {
    it("uses alternate classification when customGHSSettings specifies index", () => {
      const chemWithAlternate = {
        ...mockChemical,
        other_classifications: [
          {
            pictograms: [{ code: "GHS01", name_zh: "爆炸物" }],
            hazard_statements: [{ code: "H200", text_zh: "不穩定炸藥" }],
            signal_word: "Danger",
            signal_word_zh: "危險",
          },
        ],
      };
      const customSettings = {
        "64-17-5": { selectedIndex: 1, note: "Use alternate" },
      };

      printLabels(
        [chemWithAlternate],
        { size: "medium", template: "standard", orientation: "portrait" },
        customSettings,
      );
      const html = mockIframeDoc.write.mock.calls[0][0];
      expect(html).toContain("GHS01");
      expect(html).toContain("H200");
    });
  });

  // ── Precautionary Statements (v1.8 M0 PR-C) ──
  describe("precautionary statements", () => {
    const chemWithP = {
      ...mockChemical,
      precautionary_statements: [
        {
          code: "P210",
          text_en: "Keep away from heat.",
          text_zh: "遠離熱源。",
        },
        {
          code: "P233",
          text_en: "Keep container closed.",
          text_zh: "保持容器密閉。",
        },
        {
          code: "P301+P310",
          text_en: "IF SWALLOWED: Call POISON CENTER.",
          text_zh: "如誤吞食：立即呼叫毒物中心。",
        },
      ],
    };

    it("full template renders P-codes with localized text", () => {
      printLabels(
        [chemWithP],
        {
          size: "medium",
          template: "full",
          orientation: "portrait",
          nameDisplay: "zh",
        },
        {},
      );
      const html = mockIframeDoc.write.mock.calls[0][0];
      expect(html).toContain("P210");
      expect(html).toContain("P233");
      expect(html).toContain("P301+P310");
      // Full Chinese text present
      expect(html).toContain("遠離熱源。");
      expect(html).toContain("如誤吞食：立即呼叫毒物中心。");
    });

    it("full template separates H-codes and P-codes into compliance panels", () => {
      printLabels(
        [chemWithP],
        { size: "large", template: "full", orientation: "portrait" },
        {},
      );
      const html = mockIframeDoc.write.mock.calls[0][0];
      expect(html).toContain("compliance-hazard-panel");
      expect(html).toContain("compliance-precaution-panel");
      expect(html).toContain("print.precautionaryStatementsLabel");
    });

    it("standard container-front template omits P-codes even when source content has them", () => {
      printLabels(
        [chemWithP],
        {
          size: "large",
          template: "standard",
          orientation: "portrait",
          stockPreset: "large-primary",
        },
        {},
      );
      const html = mockIframeDoc.write.mock.calls[0][0];
      expect(html).not.toMatch(/<div\s+class="precautions-compact"/);
      expect(html).not.toMatch(/<span\s+class="precaution-code"/);
      expect(html).not.toContain("P301+P310");
      expect(html).not.toContain("P210");
      expect(html).not.toContain("P233");
      // In compact view we do NOT inline the long Chinese text
      expect(html).not.toContain("如誤吞食：立即呼叫毒物中心。");
    });

    it("small standard labels still omit P-codes to avoid unusable micro text", () => {
      printLabels(
        [chemWithP],
        { size: "small", template: "standard", orientation: "portrait" },
        {},
      );
      const html = mockIframeDoc.write.mock.calls[0][0];
      expect(html).toContain("label-hazard-mode-h-codes-only");
      expect(html).toContain("label-precaution-mode-omitted");
      expect(html).not.toMatch(/<div\s+class="precautions-compact"/);
      expect(html).not.toContain("P210");
    });

    it("standard template omits P-code section when no P-codes", () => {
      // mockChemical has no precautionary_statements field
      printLabels(
        [mockChemical],
        { size: "medium", template: "standard", orientation: "portrait" },
        {},
      );
      const html = mockIframeDoc.write.mock.calls[0][0];
      // CSS class definitions still live in <style>; check for actual element usage
      expect(html).not.toMatch(/<div\s+class="precautions-compact"/);
      expect(html).not.toMatch(/<span\s+class="precaution-code"/);
    });

    it('full template renders "no precautionary" state without crashing when P-codes empty', () => {
      printLabels(
        [mockChemical],
        {
          size: "medium",
          template: "full",
          orientation: "portrait",
          nameDisplay: "zh",
        },
        {},
      );
      const html = mockIframeDoc.write.mock.calls[0][0];
      expect(html).toContain("compliance-precaution-panel");
      expect(html).toContain("print.noPrecautionaryStatement");
      expect(html).not.toMatch(/<div\s+class="precaution-item-full/);
    });

    it("icon and qrcode templates do not render full P-code content (compact by design)", () => {
      printLabels(
        [chemWithP],
        {
          size: "medium",
          template: "icon",
          orientation: "portrait",
          nameDisplay: "zh",
        },
        {},
      );
      const iconHtml = mockIframeDoc.write.mock.calls[0][0];
      // Check for actual div elements using the classes, not the CSS block
      expect(iconHtml).not.toMatch(/<div\s+class="precaution-item-full/);
      expect(iconHtml).not.toMatch(/<div\s+class="precautions-compact"/);
      // And no P-code values appear in the body
      expect(iconHtml).not.toContain("P210");
      expect(iconHtml).not.toContain("P301+P310");

      mockIframeDoc.write.mockClear();
      printLabels(
        [chemWithP],
        { size: "medium", template: "qrcode", orientation: "portrait" },
        {},
      );
      const qrHtml = mockIframeDoc.write.mock.calls[0][0];
      expect(qrHtml).not.toMatch(/<div\s+class="precaution-item-full/);
      expect(qrHtml).not.toMatch(/<div\s+class="precautions-compact"/);
      expect(qrHtml).not.toContain("P210");
    });

    it("custom GHS override swaps to alternate classification P-codes", () => {
      const chemWithAlt = {
        ...chemWithP,
        other_classifications: [
          {
            pictograms: [{ code: "GHS07", name_zh: "感嘆號" }],
            hazard_statements: [{ code: "H302", text_zh: "吞食有害" }],
            precautionary_statements: [
              {
                code: "P264",
                text_en: "Wash after use.",
                text_zh: "處理後洗手。",
              },
            ],
            signal_word: "Warning",
            signal_word_zh: "警告",
          },
        ],
      };
      const customSettings = { "64-17-5": { selectedIndex: 1, note: "alt" } };
      printLabels(
        [chemWithAlt],
        {
          size: "medium",
          template: "full",
          orientation: "portrait",
          nameDisplay: "zh",
        },
        customSettings,
      );
      const html = mockIframeDoc.write.mock.calls[0][0];
      // Alternate's P-code must appear
      expect(html).toContain("P264");
      expect(html).toContain("處理後洗手。");
      // Primary P-codes must NOT appear (swapped out)
      expect(html).not.toContain("P301+P310");
    });

    it("P-code text is HTML-escaped like other interpolated values", () => {
      const chemHostile = {
        ...mockChemical,
        precautionary_statements: [
          {
            code: "P<img src=x onerror=alert(1)>",
            text_en: "<script>alert(1)</script>",
            text_zh: '"></div><script>evil</script>',
          },
        ],
      };
      printLabels(
        [chemHostile],
        {
          size: "medium",
          template: "full",
          orientation: "portrait",
          nameDisplay: "zh",
        },
        {},
      );
      const html = mockIframeDoc.write.mock.calls[0][0];
      expect(html).not.toContain("<script>evil</script>");
      expect(html).not.toMatch(/<img\s+src=x\s+onerror/);
      // Escaped forms must be present
      expect(html).toContain("&lt;script&gt;evil&lt;/script&gt;");
    });
  });

  // ── HTML Injection Regression Tests ──
  // These verify that user-controlled values (localStorage custom fields,
  // chemical names/CAS from PubChem or user input, hazard statement text)
  // are HTML-escaped before being written into the print iframe. The iframe
  // is same-origin, so unescaped interpolation would be a real XSS vector.
  describe("HTML injection safety", () => {
    it("escapes <script> tags in custom label fields", () => {
      const customFields = {
        labName: '<script>alert("xss")</script>',
        date: "2026-01-01",
        batchNumber: "B001",
      };
      printLabels(
        [mockChemical],
        { size: "medium", template: "full", orientation: "portrait" },
        {},
        customFields,
      );
      const html = mockIframeDoc.write.mock.calls[0][0];
      expect(html).not.toContain("<script>alert");
      expect(html).toContain(
        "&lt;script&gt;alert(&quot;xss&quot;)&lt;/script&gt;",
      );
    });

    it("escapes onerror-style image injection in chemical name", () => {
      const malicious = {
        ...mockChemical,
        name_en: "<img src=x onerror=alert(1)>",
      };
      printLabels(
        [malicious],
        {
          size: "medium",
          template: "icon",
          orientation: "portrait",
          nameDisplay: "en",
        },
        {},
      );
      const html = mockIframeDoc.write.mock.calls[0][0];
      // Must NOT contain a functional injected <img> tag from the name
      expect(html).not.toMatch(/<img[^>]*onerror/i);
      expect(html).toContain("&lt;img src=x onerror=alert(1)&gt;");
    });

    it("escapes ampersands, angle brackets and quotes in hazard text", () => {
      const chem = {
        ...mockChemical,
        hazard_statements: [
          { code: "H<200>", text_zh: 'Fire & "explosion" <hazard>' },
        ],
      };
      printLabels(
        [chem],
        {
          labelPurpose: "shipping",
          template: "full",
          stockPreset: "a4-primary",
          nameDisplay: "zh",
        },
        {},
        {},
        {},
        {},
        {
          organization: "QA Lab",
          phone: "02-0000-0000",
          address: "QA Address",
        },
      );
      const html = mockIframeDoc.write.mock.calls[0][0];
      expect(html).toContain("H&lt;200&gt;");
      expect(html).toContain("Fire &amp; &quot;explosion&quot; &lt;hazard&gt;");
      expect(html).not.toContain('Fire & "explosion" <hazard>');
    });

    it("escapes quote characters in CAS number to prevent attribute break-out", () => {
      const chem = {
        ...mockChemical,
        cas_number: '64-17-5"><script>alert(1)</script>',
      };
      printLabels(
        [chem],
        { size: "medium", template: "icon", orientation: "portrait" },
        {},
      );
      const html = mockIframeDoc.write.mock.calls[0][0];
      expect(html).not.toContain("><script>alert(1)");
      expect(html).toContain("&quot;&gt;&lt;script&gt;");
    });

    it("escapes signal word to prevent injection into class-adjacent content", () => {
      const chem = {
        ...mockChemical,
        signal_word_zh: "危險</div><script>alert(1)</script>",
        signal_word: "Danger",
      };
      printLabels(
        [chem],
        {
          size: "large",
          template: "full",
          orientation: "portrait",
          nameDisplay: "zh",
        },
        {},
      );
      const html = mockIframeDoc.write.mock.calls[0][0];
      expect(html).not.toContain("</div><script>alert(1)");
      expect(html).toContain("&lt;/div&gt;&lt;script&gt;");
    });

    it("escapes pictogram code used in alt attribute", () => {
      const chem = {
        ...mockChemical,
        ghs_pictograms: [{ code: 'GHS02" onerror="alert(1)', name_zh: "x" }],
      };
      printLabels(
        [chem],
        { size: "medium", template: "standard", orientation: "portrait" },
        {},
      );
      const html = mockIframeDoc.write.mock.calls[0][0];
      expect(html).not.toMatch(/alt="GHS02" onerror="alert/);
      expect(html).toContain("&quot; onerror=&quot;alert(1)");
    });
  });
});

// ── escapeHtml unit tests ──
describe("escapeHtml", () => {
  it("returns empty string for null/undefined", () => {
    expect(escapeHtml(null)).toBe("");
    expect(escapeHtml(undefined)).toBe("");
  });

  it("escapes all five dangerous HTML characters", () => {
    expect(escapeHtml("<script>")).toBe("&lt;script&gt;");
    expect(escapeHtml("a & b")).toBe("a &amp; b");
    expect(escapeHtml('"q"')).toBe("&quot;q&quot;");
    expect(escapeHtml("'s")).toBe("&#39;s");
  });

  it("coerces non-string values to string", () => {
    expect(escapeHtml(42)).toBe("42");
    expect(escapeHtml(true)).toBe("true");
  });

  it("leaves safe strings unchanged", () => {
    expect(escapeHtml("Ethanol 乙醇")).toBe("Ethanol 乙醇");
  });
});

// ── Page-level trust-boundary footer (v1.8 M1 PR-C) ──
describe("print page footer disclaimer", () => {
  let mockIframe, mockIframeDoc, mockIframeWindow;
  let createElementSpy, appendChildSpy, getByIdSpy;

  beforeEach(() => {
    jest.clearAllMocks();
    const mocks = createMockIframe();
    mockIframe = mocks.mockIframe;
    mockIframeDoc = mocks.mockIframeDoc;
    mockIframeWindow = mocks.mockIframeWindow;

    createElementSpy = jest
      .spyOn(document, "createElement")
      .mockImplementation((tag) => {
        if (tag === "iframe") return mockIframe;
        return document.createElement.wrappedMethod
          ? document.createElement.wrappedMethod(tag)
          : {};
      });
    appendChildSpy = jest
      .spyOn(document.body, "appendChild")
      .mockImplementation(() => {});
    getByIdSpy = jest.spyOn(document, "getElementById").mockReturnValue(null);
    jest.useFakeTimers();
  });

  afterEach(() => {
    createElementSpy.mockRestore();
    appendChildSpy.mockRestore();
    getByIdSpy.mockRestore();
    jest.useRealTimers();
  });

  it("renders a page-footer-note element on every page", () => {
    printLabels(
      [mockChemical],
      { size: "medium", template: "standard", orientation: "portrait" },
      {},
    );
    const html = mockIframeDoc.write.mock.calls[0][0];
    expect(html).toMatch(/<div\s+class="page-footer-note">/);
    // The i18n key is rendered (mock returns it verbatim)
    expect(html).toContain("trust.printFooter");
  });

  it("footer note is emitted once per page", () => {
    // 12 labels + medium size + portrait => perPage=8 => 2 pages
    const many = Array.from({ length: 12 }, (_, i) => ({
      ...mockChemical,
      cas_number: `64-17-${i}`,
    }));
    printLabels(
      many,
      { size: "medium", template: "standard", orientation: "portrait" },
      {},
    );
    const html = mockIframeDoc.write.mock.calls[0][0];
    const matches = html.match(/<div\s+class="page-footer-note">/g) || [];
    expect(matches.length).toBe(2);
  });

  it("footer note text is HTML-escaped (defence-in-depth)", () => {
    // Even though t() returns a safe string, the renderer still runs it
    // through escapeHtml(); confirm no raw "<" survives.
    printLabels(
      [mockChemical],
      { size: "medium", template: "standard", orientation: "portrait" },
      {},
    );
    const html = mockIframeDoc.write.mock.calls[0][0];
    const footerMatch = html.match(
      /<div\s+class="page-footer-note">([^<]*)<\/div>/,
    );
    expect(footerMatch).not.toBeNull();
    // The content between the tags is the escaped i18n key; no `<` inside
    expect(footerMatch[1]).not.toMatch(/</);
  });
});

// ── Prepared solution rendering (v1.9 M3 Tier 1 PR-B) ──
//
// PR-B is print-path-only: it verifies that `printLabels()` renders
// a derived prepared-solution item (`isPreparedSolution: true`)
// correctly across all four templates. PR-A will build the UI flow
// that produces such items; these tests construct them directly.
describe("prepared solution print rendering", () => {
  let mockIframe, mockIframeDoc, mockIframeWindow;
  let createElementSpy, appendChildSpy, getByIdSpy;

  beforeEach(() => {
    jest.clearAllMocks();
    const mocks = createMockIframe();
    mockIframe = mocks.mockIframe;
    mockIframeDoc = mocks.mockIframeDoc;
    mockIframeWindow = mocks.mockIframeWindow;

    createElementSpy = jest
      .spyOn(document, "createElement")
      .mockImplementation((tag) => {
        if (tag === "iframe") return mockIframe;
        return document.createElement.wrappedMethod
          ? document.createElement.wrappedMethod(tag)
          : {};
      });
    appendChildSpy = jest
      .spyOn(document.body, "appendChild")
      .mockImplementation(() => {});
    getByIdSpy = jest.spyOn(document, "getElementById").mockReturnValue(null);
    jest.useFakeTimers();
  });

  afterEach(() => {
    createElementSpy.mockRestore();
    appendChildSpy.mockRestore();
    getByIdSpy.mockRestore();
    jest.useRealTimers();
  });

  // Construct a prepared-solution item in the exact shape PR-A will
  // produce (parent chemical's fields preserved, plus the metadata).
  const makePrepared = (overrides = {}) => ({
    ...mockChemical,
    isPreparedSolution: true,
    preparedSolution: {
      concentration: "10% (v/v)",
      solvent: "Water",
      parentCas: mockChemical.cas_number,
      parentNameEn: mockChemical.name_en,
      parentNameZh: mockChemical.name_zh,
    },
    ...overrides,
  });

  describe("full template", () => {
    it("renders prepared badge, meta rows, and the full note", () => {
      printLabels(
        [makePrepared()],
        { size: "medium", template: "full", orientation: "portrait" },
        {},
      );
      const html = mockIframeDoc.write.mock.calls[0][0];
      expect(html).toMatch(/<div\s+class="prepared-badge"/);
      expect(html).toMatch(/<div\s+class="prepared-meta"/);
      expect(html).toMatch(/<div\s+class="prepared-note"/);
      expect(html).toContain("10% (v/v)");
      expect(html).toContain("Water");
    });

    it("applies label-prepared class so CSS scoping is possible", () => {
      printLabels(
        [makePrepared()],
        { size: "medium", template: "full", orientation: "portrait" },
        {},
      );
      const html = mockIframeDoc.write.mock.calls[0][0];
      expect(html).toMatch(
        /class="[^"]*label-full[^"]*label-compliance[^"]*label-purpose-shipping[^"]*label-prepared"/,
      );
    });

    it("parent pictograms / hazards / precautions are still rendered", () => {
      const prepared = {
        ...makePrepared(),
        precautionary_statements: [
          {
            code: "P210",
            text_en: "Keep away from heat.",
            text_zh: "遠離熱源。",
          },
        ],
      };
      printLabels(
        [prepared],
        { size: "large", template: "full", orientation: "portrait" },
        {},
      );
      const html = mockIframeDoc.write.mock.calls[0][0];
      // Parent pictograms
      expect(html).toContain("GHS02");
      expect(html).toContain("GHS07");
      // Parent hazards
      expect(html).toContain("H225");
      // Parent precautions (from the override above)
      expect(html).toContain("P210");
      // Parent signal word
      expect(html).toContain("危險");
    });
  });

  describe("standard template", () => {
    it("renders a compact prepared meta ribbon without the long note", () => {
      printLabels(
        [makePrepared()],
        { size: "medium", template: "standard", orientation: "portrait" },
        {},
      );
      const html = mockIframeDoc.write.mock.calls[0][0];
      expect(html).toMatch(/<div\s+class="meta-ribbon"/);
      expect(html).toContain("print.preparedShort");
      expect(html).toContain("10% (v/v)");
      expect(html).toContain("Water");
      expect(html).not.toMatch(/<div\s+class="prepared-note"/);
    });

    it("parent pictograms and hazards still render", () => {
      printLabels(
        [makePrepared()],
        { size: "medium", template: "standard", orientation: "portrait" },
        {},
      );
      const html = mockIframeDoc.write.mock.calls[0][0];
      expect(html).toContain("GHS02");
      expect(html).toContain("H225");
    });
  });

  describe("icon template", () => {
    // Space-constrained templates now keep the same simple identity contract
    // as non-prepared chemicals: CAS, English name, Chinese name, and icons.
    it("renders prepared chemicals with the compact identity block only", () => {
      printLabels(
        [makePrepared()],
        { size: "medium", template: "icon", orientation: "portrait" },
        {},
      );
      const html = mockIframeDoc.write.mock.calls[0][0];
      expect(html).toContain("small-cas");
      expect(html).toContain("Ethanol");
      expect(html).toContain(mockChemical.name_zh);
      expect(html).not.toMatch(/<div\s+class="prepared-badge"/);
      expect(html).not.toMatch(/<div\s+class="prepared-meta"/);
      expect(html).not.toContain("10% (v/v)");
      expect(html).not.toContain("Water");
    });

    it("does NOT render the full prepared-note on icon template (space)", () => {
      printLabels(
        [makePrepared()],
        { size: "medium", template: "icon", orientation: "portrait" },
        {},
      );
      const html = mockIframeDoc.write.mock.calls[0][0];
      expect(html).not.toMatch(/<div\s+class="prepared-note"/);
    });

    it("parent pictograms still render", () => {
      printLabels(
        [makePrepared()],
        { size: "medium", template: "icon", orientation: "portrait" },
        {},
      );
      const html = mockIframeDoc.write.mock.calls[0][0];
      expect(html).toContain("GHS02");
      expect(html).toContain("GHS07");
    });
  });

  describe("qrcode template", () => {
    it("renders the compact identity block in the left column", () => {
      printLabels(
        [makePrepared()],
        { size: "medium", template: "qrcode", orientation: "portrait" },
        {},
      );
      const html = mockIframeDoc.write.mock.calls[0][0];
      expect(html).toContain("small-cas");
      expect(html).toContain("Ethanol");
      expect(html).toContain(mockChemical.name_zh);
      expect(html).not.toMatch(/<div\s+class="meta-ribbon"/);
      expect(html).not.toContain("print.preparedShort");
      expect(html).not.toContain("10% (v/v)");
      expect(html).not.toContain("Water");
    });

    it("does NOT render the full prepared-note on qrcode template (space)", () => {
      printLabels(
        [makePrepared()],
        { size: "medium", template: "qrcode", orientation: "portrait" },
        {},
      );
      const html = mockIframeDoc.write.mock.calls[0][0];
      expect(html).not.toMatch(/<div\s+class="prepared-note"/);
    });

    it("parent QR code is still generated (not replaced)", () => {
      printLabels(
        [makePrepared()],
        { size: "medium", template: "qrcode", orientation: "portrait" },
        {},
      );
      const html = mockIframeDoc.write.mock.calls[0][0];
      expect(html).toMatch(/<img\s+class="qrcode-img"/);
    });

    it("uses the site lookup target in the QR payload when CID is available", () => {
      printLabels(
        [mockChemical],
        { size: "medium", template: "qrcode", orientation: "portrait" },
        {},
      );
      const html = mockIframeDoc.write.mock.calls[0][0];
      expect(html).toContain(
        "data-qr-target=\"http://localhost/?cas=64-17-5\"",
      );
      expect(html).toContain('data-qr-target-type="ghs-lookup"');
      expect(html).toContain('data-qr-target-source="ghs-label-quick-search"');
      expect(html).toContain('data-qr-target-label="GHS Label Quick Search"');
    });

    it("still uses the site lookup target in the QR payload when CID is missing", () => {
      printLabels(
        [{ ...mockChemical, cid: null }],
        { size: "medium", template: "qrcode", orientation: "portrait" },
        {},
      );
      const html = mockIframeDoc.write.mock.calls[0][0];
      expect(html).toContain(
        "data-qr-target=\"http://localhost/?cas=64-17-5\"",
      );
      expect(html).toContain('data-qr-target-type="ghs-lookup"');
      expect(html).toContain('data-qr-target-source="ghs-label-quick-search"');
      expect(html).toContain('data-qr-target-label="GHS Label Quick Search"');
    });
  });

  describe("HTML injection safety", () => {
    it("concentration and solvent values are HTML-escaped", () => {
      const hostile = {
        ...mockChemical,
        isPreparedSolution: true,
        preparedSolution: {
          concentration: "<script>alert(1)</script>",
          solvent: '"><img src=x onerror=alert(2)>',
        },
      };
      printLabels(
        [hostile],
        { size: "medium", template: "full", orientation: "portrait" },
        {},
      );
      const html = mockIframeDoc.write.mock.calls[0][0];
      // No raw script tag or injected onerror image should survive
      expect(html).not.toMatch(/<script>alert\(1\)/);
      expect(html).not.toMatch(/<img\s+src=x\s+onerror=alert\(2\)/);
      // Escaped forms must be present
      expect(html).toContain("&lt;script&gt;alert(1)&lt;/script&gt;");
      expect(html).toContain("&quot;&gt;&lt;img src=x onerror=alert(2)&gt;");
    });
  });

  describe("custom GHS override", () => {
    it("prepared item still receives the custom override selection", () => {
      const prepared = {
        ...makePrepared(),
        other_classifications: [
          {
            pictograms: [{ code: "GHS06", name_zh: "劇毒" }],
            hazard_statements: [{ code: "H301", text_zh: "吞食有毒" }],
            signal_word: "Danger",
            signal_word_zh: "危險",
          },
        ],
      };
      const customSettings = {
        [prepared.cas_number]: { selectedIndex: 1, note: "use alt" },
      };
      printLabels(
        [prepared],
        { size: "medium", template: "full", orientation: "portrait" },
        customSettings,
      );
      const html = mockIframeDoc.write.mock.calls[0][0];
      // Alternate classification's pictogram/hazard should be used
      expect(html).toContain("GHS06");
      expect(html).toContain("H301");
      // Prepared identity still preserved
      expect(html).toMatch(/<div\s+class="prepared-badge"/);
    });
  });

  describe("non-prepared regression", () => {
    it("a normal chemical (isPreparedSolution not set) renders no prepared markers", () => {
      printLabels(
        [mockChemical], // no isPreparedSolution flag
        { size: "medium", template: "full", orientation: "portrait" },
        {},
      );
      const html = mockIframeDoc.write.mock.calls[0][0];
      // None of the prepared element classes should appear as elements
      expect(html).not.toMatch(/<div\s+class="prepared-badge"/);
      expect(html).not.toMatch(/<div\s+class="prepared-meta"/);
      expect(html).not.toMatch(/<div\s+class="prepared-note"/);
      // And the label-prepared class should NOT be applied
      expect(html).not.toMatch(/class="label[^"]*\blabel-prepared\b/);
    });

    it("a normal chemical + standard template is unaffected", () => {
      printLabels(
        [mockChemical],
        { size: "medium", template: "standard", orientation: "portrait" },
        {},
      );
      const html = mockIframeDoc.write.mock.calls[0][0];
      expect(html).not.toMatch(/<div\s+class="prepared-badge"/);
      expect(html).not.toMatch(/<div\s+class="prepared-meta"/);
      expect(html).not.toMatch(/<div\s+class="prepared-note"/);
    });

    it("isPreparedSolution=false explicitly also renders no markers", () => {
      printLabels(
        [{ ...mockChemical, isPreparedSolution: false }],
        { size: "medium", template: "full", orientation: "portrait" },
        {},
      );
      const html = mockIframeDoc.write.mock.calls[0][0];
      expect(html).not.toMatch(/<div\s+class="prepared-badge"/);
    });
  });

  describe("meta-only edge cases", () => {
    it("handles missing concentration (only solvent provided)", () => {
      const prepared = {
        ...mockChemical,
        isPreparedSolution: true,
        preparedSolution: { solvent: "Water" },
      };
      printLabels(
        [prepared],
        { size: "medium", template: "full", orientation: "portrait" },
        {},
      );
      const html = mockIframeDoc.write.mock.calls[0][0];
      // Badge and note still present
      expect(html).toMatch(/<div\s+class="prepared-badge"/);
      expect(html).toMatch(/<div\s+class="prepared-note"/);
      // Solvent row appears, concentration row does not
      expect(html).toContain("Water");
    });

    it("handles missing solvent (only concentration provided)", () => {
      const prepared = {
        ...mockChemical,
        isPreparedSolution: true,
        preparedSolution: { concentration: "1 N" },
      };
      printLabels(
        [prepared],
        { size: "medium", template: "full", orientation: "portrait" },
        {},
      );
      const html = mockIframeDoc.write.mock.calls[0][0];
      expect(html).toMatch(/<div\s+class="prepared-badge"/);
      expect(html).toContain("1 N");
    });
  });

  // ── Tier 2 PR-1: operational metadata on the printed label ──
  //
  // Ground rules being pinned:
  //   1. Operational fields appear on `standard` and `full` templates
  //      when the user filled them in.
  //   2. Compact templates (`icon`, `qrcode`) do NOT carry them —
  //      these label sizes are already space-constrained.
  //   3. Operational fields are OPTIONAL — absence must not regress
  //      the Tier 1 concentration/solvent rendering, and must not
  //      emit an empty `.prepared-operational` block.
  //   4. User input flows through `escapeHtml` like other prepared
  //      content (same XSS guarantees as Tier 1).

  const makePreparedWithOps = (opsOverrides = {}) => ({
    ...mockChemical,
    isPreparedSolution: true,
    preparedSolution: {
      concentration: "10% (v/v)",
      solvent: "Water",
      parentCas: mockChemical.cas_number,
      parentNameEn: mockChemical.name_en,
      parentNameZh: mockChemical.name_zh,
      preparedBy: "A. Chen",
      preparedDate: "2026-04-16",
      expiryDate: "2026-10-16",
      ...opsOverrides,
    },
  });

  describe("operational metadata (Tier 2 PR-1)", () => {
    it("full template renders operational fields when all three are present", () => {
      printLabels(
        [makePreparedWithOps()],
        { size: "large", template: "full", orientation: "portrait" },
        {},
      );
      const html = mockIframeDoc.write.mock.calls[0][0];
      expect(html).toMatch(/<div\s+class="prepared-operational"/);
      expect(html).toContain("A. Chen");
      expect(html).toContain("2026-04-16");
      expect(html).toContain("2026-10-16");
    });

    it("standard template hides operational fields when present", () => {
      printLabels(
        [makePreparedWithOps()],
        { size: "medium", template: "standard", orientation: "portrait" },
        {},
      );
      const html = mockIframeDoc.write.mock.calls[0][0];
      expect(html).not.toMatch(/<div\s+class="prepared-operational"/);
      expect(html).not.toContain("A. Chen");
      expect(html).not.toContain("2026-04-16");
      expect(html).not.toContain("2026-10-16");
    });

    it("icon template does NOT render operational fields (space-constrained)", () => {
      printLabels(
        [makePreparedWithOps()],
        { size: "medium", template: "icon", orientation: "portrait" },
        {},
      );
      const html = mockIframeDoc.write.mock.calls[0][0];
      expect(html).not.toMatch(/<div\s+class="prepared-operational"/);
      expect(html).not.toContain("A. Chen");
      // Compact identity stays intact on icon template.
      expect(html).toContain("small-cas");
      expect(html).not.toMatch(/<div\s+class="prepared-badge"/);
      expect(html).not.toMatch(/<div\s+class="prepared-meta"/);
    });

    it("qrcode template does NOT render operational fields (space-constrained)", () => {
      printLabels(
        [makePreparedWithOps()],
        { size: "medium", template: "qrcode", orientation: "portrait" },
        {},
      );
      const html = mockIframeDoc.write.mock.calls[0][0];
      expect(html).not.toMatch(/<div\s+class="prepared-operational"/);
      expect(html).not.toContain("A. Chen");
      // Compact identity stays intact on qrcode template.
      expect(html).toContain("small-cas");
      expect(html).not.toMatch(/<div\s+class="meta-ribbon"/);
      expect(html).not.toContain("print.preparedShort");
    });

    it("renders only the filled-in subset of operational fields", () => {
      printLabels(
        [
          makePreparedWithOps({
            preparedDate: null,
            expiryDate: null,
          }),
        ],
        { size: "large", template: "full", orientation: "portrait" },
        {},
      );
      const html = mockIframeDoc.write.mock.calls[0][0];
      expect(html).toMatch(/<div\s+class="prepared-operational"/);
      expect(html).toContain("A. Chen");
      // Dates absent → their rows must not appear
      expect(html).not.toContain("2026-04-16");
      expect(html).not.toContain("2026-10-16");
    });

    it("emits no .prepared-operational block when all three fields are absent (Tier 1 shape)", () => {
      // A Tier 1-style prepared item with no operational metadata at
      // all must not cause an empty block to appear anywhere.
      const tier1Shape = {
        ...mockChemical,
        isPreparedSolution: true,
        preparedSolution: {
          concentration: "10% (v/v)",
          solvent: "Water",
        },
      };
      printLabels(
        [tier1Shape],
        { size: "large", template: "full", orientation: "portrait" },
        {},
      );
      const html = mockIframeDoc.write.mock.calls[0][0];
      expect(html).not.toMatch(/<div\s+class="prepared-operational"/);
      // Tier 1 behaviour still works — concentration + solvent still
      // render in the main prepared-meta block.
      expect(html).toContain("10% (v/v)");
      expect(html).toContain("Water");
    });

    it("escapes HTML in operational fields", () => {
      printLabels(
        [
          makePreparedWithOps({
            preparedBy: "<img src=x onerror=alert(9)>",
            preparedDate: '"><script>1</script>',
            expiryDate: "& already ampersanded",
          }),
        ],
        { size: "large", template: "full", orientation: "portrait" },
        {},
      );
      const html = mockIframeDoc.write.mock.calls[0][0];
      // Raw attack payloads must not survive
      expect(html).not.toMatch(/<img\s+src=x\s+onerror=alert\(9\)/);
      expect(html).not.toMatch(/"><script>1<\/script>/);
      // Escaped equivalents must be present
      expect(html).toContain("&lt;img src=x onerror=alert(9)&gt;");
      expect(html).toContain("&amp; already ampersanded");
    });
  });
});
