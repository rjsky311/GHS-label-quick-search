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

describe("getQRCodeUrl", () => {
  it("generates correct QR code URL with default size", () => {
    const url = getQRCodeUrl("https://example.com");
    expect(url).toBe(
      "https://api.qrserver.com/v1/create-qr-code/?size=100x100&data=https%3A%2F%2Fexample.com",
    );
  });

  it("generates correct QR code URL with custom size", () => {
    const url = getQRCodeUrl("https://example.com", 200);
    expect(url).toContain("size=200x200");
  });

  it("encodes special characters in data URL", () => {
    const url = getQRCodeUrl("https://example.com?a=1&b=2");
    expect(url).toContain("data=https%3A%2F%2Fexample.com%3Fa%3D1%26b%3D2");
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
  it("defaults to a shipped-container purpose on large full labels", () => {
    const layout = resolvePrintLayoutConfig({});

    expect(layout.labelPurpose).toBe("shipping");
    expect(layout.template).toBe("full");
    expect(layout.stockId).toBe("large-primary");
    expect(layout.size).toBe("large");
    expect(layout.page.perPage).toBe(3);
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
    expect(layout.label.width).toBe("180mm");
    expect(layout.label.height).toBe("250mm");
    expect(layout.page.perPage).toBe(1);
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
    const a4Primary = resolvePrintLayoutConfig({
      stockPreset: "a4-primary",
      template: "full",
    });

    expect(small.typography.fontSize).toBe("8px");
    expect(medium.typography.fontSize).toBe("9px");
    expect(large.typography.fontSize).toBe("14px");
    expect(small.typography.qrBox).toBe("15.8mm");
    expect(small.typography.standardPictogramSize).toBe("9.1mm");
    expect(small.typography.qrPictogramSize).toBe("7.7mm");
    expect(medium.typography.standardPictogramSize).toBe("15mm");
    expect(large.typography.standardPictogramSize).toBe("23.8mm");
    expect(small.typography.compliancePictogramSize).toBe("10mm");
    expect(medium.typography.compliancePictogramSize).toBe("14mm");
    expect(large.typography.compliancePictogramSize).toBe("24.6mm");
    expect(a4Primary.typography.compliancePictogramSize).toBe("26mm");
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
    expect(model.pages).toHaveLength(2);
    expect(model.layout.page.perPage).toBe(8);
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
    expect(sheetPreview.html).toContain("preview-grid-scaler");
    expect(sheetPreview.html).toContain("preview-sheet-viewport");
    expect(sheetPreview.html).toContain("preview-page");
    expect(sheetPreview.html).toContain("label-placeholder");
  });
});

describe("printLabels", () => {
  let mockIframe, mockIframeDoc, mockIframeWindow;
  let createElementSpy, appendChildSpy, getByIdSpy, alertSpy;

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
    alertSpy = jest.spyOn(window, "alert").mockImplementation(() => {});
    jest.useFakeTimers();
  });

  afterEach(() => {
    createElementSpy.mockRestore();
    appendChildSpy.mockRestore();
    getByIdSpy.mockRestore();
    alertSpy.mockRestore();
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
    expect(html).toContain("乙醇");
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

  it("prints dense A4 primary labels instead of blocking after the automatic upgrade", () => {
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
    expect(html).toContain("width: 26mm");
    expect(html).toContain("column-count: 2");
    expect(html).toContain("compliance-statements-panel");
    expect(html).toContain("font-size:6.5px");
    expect(html).not.toContain("font-size: 9px !important");
    const bodyHtml = html.slice(html.indexOf("<body"));
    expect(bodyHtml).not.toContain('class="qrcode-img"');
    expect(bodyHtml).not.toContain("hazard-more");
    expect(bodyHtml).not.toContain("precaution-more");
    expect((bodyHtml.match(/<img/g) || [])).toHaveLength(4);
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

  it("does not block printable supplemental labels on generic layout overflow", () => {
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

    expect(alertSpy).not.toHaveBeenCalled();
    jest.advanceTimersByTime(300);
    expect(mockIframeWindow.print).toHaveBeenCalled();
    expect(recordObservabilityEvent).not.toHaveBeenCalledWith(
      "print_blocked",
      expect.anything(),
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

    expect(alertSpy).toHaveBeenCalledWith("print.layoutBlocked");
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
      expect(html).toContain("api.qrserver.com");
    });

    it("qrcode supplemental labels fit the QR box to small stock and keep all pictograms", () => {
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
      expect(preview.html).toContain("width: 7.7mm");
      expect(preview.fragmentHtml).toContain("qrcode-img");
      expect(preview.fragmentHtml.match(/alt="GHS0[2567]"/g)).toHaveLength(4);
      expect(preview.fragmentHtml).not.toContain("more-pics");
    });

    it("prints small QR supplemental labels after keeping QR and every pictogram in the body", () => {
      const multiPictogramChemical = {
        ...mockChemical,
        ghs_pictograms: [
          { code: "GHS02" },
          { code: "GHS05" },
          { code: "GHS06" },
          { code: "GHS07" },
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
      expect(bodyHtml.match(/alt="GHS0[2567]"/g)).toHaveLength(4);
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
      expect(bottlePreview.fragmentHtml.match(/hazard-primary-item/g)).toHaveLength(
        3,
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

    it("prioritizes response and PPE P codes before storage or disposal on compact labels", () => {
      const mixedPrecautions = {
        ...mockChemical,
        hazard_statements: [{ code: "H314", text_en: "Corrosive" }],
        precautionary_statements: [
          { code: "P501", text_en: "Dispose contents" },
          { code: "P403+P233", text_en: "Store in a well-ventilated place" },
          { code: "P280", text_en: "Wear protective gloves" },
          { code: "P301+P330+P331", text_en: "IF SWALLOWED" },
        ],
      };

      const preview = buildPrintPreviewDocument(
        [mixedPrecautions],
        {
          labelPurpose: "shipping",
          template: "standard",
          stockPreset: "medium-bottle",
          nameDisplay: "en",
        },
        {},
        {},
        {},
        {},
        { mode: "label" },
      );

      const p301Index = preview.fragmentHtml.indexOf("P301+P330+P331");
      const p280Index = preview.fragmentHtml.indexOf("P280");
      const p501Index = preview.fragmentHtml.indexOf("P501");

      expect(p301Index).toBeGreaterThan(-1);
      expect(p280Index).toBeGreaterThan(-1);
      expect(p501Index).toBe(-1);
      expect(p301Index).toBeLessThan(p280Index);
      expect(preview.fragmentHtml).toContain("precaution-more");
    });

    it("prioritizes the most severe QR hazard teaser while keeping every pictogram", () => {
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
      expect(preview.fragmentHtml).toContain("H330");
      expect(preview.fragmentHtml).not.toContain("H335<span");
      expect(preview.fragmentHtml.match(/alt="GHS0[4567]"/g)).toHaveLength(4);
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
      expect(preview.html).toContain("width: 26mm");
      expect(preview.html).toContain("height: 26mm");
      expect(preview.html).toContain("column-count: 2");
      expect(preview.html).toContain("compliance-statements-panel");
      expect(preview.html).toContain(
        "grid-template-rows: auto minmax(0, 1fr) auto",
      );
      expect(preview.html).toContain("font-size:6.5px");
      expect(preview.html).not.toContain("font-size: 9px !important");
      expect(preview.html).not.toContain("compliance-qr");
      expect(preview.html).not.toContain("qrcode-img-small");
      expect(preview.html).toContain("preview-label-scaler");
      expect(preview.html).toContain("transform: scale(0.");
      expect(preview.html).toContain("height: 344px");
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
      expect(preview.html).toContain("width: 26mm");
      expect(preview.html).not.toContain("compliance-qr");
      expect(preview.html).not.toContain("qrcode-img-small");
      expect(preview.html).toContain("preview-label-scaler");
      expect(preview.html).toContain("height: 344px");
    });

    it("qrcode template uses the scan-first hierarchy blocks", () => {
      printLabels(
        [mockChemical],
        { size: "medium", template: "qrcode", orientation: "portrait" },
        {},
      );
      const html = mockIframeDoc.write.mock.calls[0][0];
      expect(html).toContain("qr-priority-block");
      expect(html).toContain("qr-code-shell");
      expect(html).toContain("qr-hint");
      expect(html).not.toContain("qr-cas");
    });

    it("qrcode template flags additional hazards behind the scan path", () => {
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
      expect(html).toMatch(/<div\s+class="hazard-more qr-hazard-more"/);
      expect(html).toContain("print.moreHazardsShort");
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

    it("compact templates omit date, batch, and profile fallbacks", () => {
      ["icon", "standard", "qrcode"].forEach((template) => {
        const mocks = createMockIframe();
        createElementSpy.mockImplementation((tag) =>
          tag === "iframe" ? mocks.mockIframe : {},
        );
        getByIdSpy.mockReturnValue(null);

        printLabels([mockChemical], { ...config, template }, {}, fields);
        const html = mocks.mockIframeDoc.write.mock.calls[0][0];
        expect(html).not.toContain("Lab A");
        expect(html).not.toContain("2026-02-12");
        expect(html).not.toContain("B-001");
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
    it('shows both names by default (nameDisplay: "both")', () => {
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

    it("respects nameDisplay across all 4 templates", () => {
      ["icon", "standard", "full", "qrcode"].forEach((template) => {
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
    it('keeps both names across all 4 templates when nameDisplay is "both"', () => {
      ["icon", "standard", "full", "qrcode"].forEach((template) => {
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
      // perPage for medium+portrait = 8 labels per page
      // 5 copies of ethanol + 5 copies of water = 10 total → 2 pages
      const quantities = { "64-17-5": 5, "7732-18-5": 5 };
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
        { size: "medium", template: "full", orientation: "portrait" },
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
        { size: "medium", template: "full", orientation: "portrait" },
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
        { size: "medium", template: "full", orientation: "portrait" },
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
        { size: "medium", template: "full", orientation: "portrait" },
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

    it("standard template renders compact P-code summary when the stock budget allows it", () => {
      printLabels(
        [chemWithP],
        { size: "medium", template: "standard", orientation: "portrait" },
        {},
      );
      const html = mockIframeDoc.write.mock.calls[0][0];
      // Look for actual element markup, not the CSS class definition
      expect(html).toMatch(/<div\s+class="precautions-compact"/);
      expect(html).toMatch(/<span\s+class="precaution-code"/);
      expect(html).toContain("P301+P310");
      expect(html).toContain("P210");
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
        { size: "medium", template: "full", orientation: "portrait" },
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
        { size: "medium", template: "icon", orientation: "portrait" },
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
        { size: "medium", template: "full", orientation: "portrait" },
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
        { size: "medium", template: "full", orientation: "portrait" },
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
        { size: "medium", template: "icon", orientation: "portrait" },
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
        { size: "medium", template: "standard", orientation: "portrait" },
        {},
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
        { size: "medium", template: "icon", orientation: "portrait" },
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
    // Space-constrained template. Must preserve prepared identity
    // via the compact badge + meta rows, but does NOT render the
    // full prepared note (no room).
    it("renders compact prepared badge and meta rows", () => {
      printLabels(
        [makePrepared()],
        { size: "medium", template: "icon", orientation: "portrait" },
        {},
      );
      const html = mockIframeDoc.write.mock.calls[0][0];
      expect(html).toMatch(/<div\s+class="prepared-badge"/);
      expect(html).toMatch(/<div\s+class="prepared-meta"/);
      expect(html).toContain("10% (v/v)");
      expect(html).toContain("Water");
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
    it("renders a compact prepared meta ribbon in the left column", () => {
      printLabels(
        [makePrepared()],
        { size: "medium", template: "qrcode", orientation: "portrait" },
        {},
      );
      const html = mockIframeDoc.write.mock.calls[0][0];
      expect(html).toMatch(/<div\s+class="meta-ribbon"/);
      expect(html).toContain("print.preparedShort");
      expect(html).toContain("10% (v/v)");
      expect(html).toContain("Water");
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

    it("uses the PubChem SDS target in the QR payload when CID is available", () => {
      printLabels(
        [mockChemical],
        { size: "medium", template: "qrcode", orientation: "portrait" },
        {},
      );
      const html = mockIframeDoc.write.mock.calls[0][0];
      expect(html).toContain(
        "data=https%3A%2F%2Fpubchem.ncbi.nlm.nih.gov%2Fcompound%2F702%23section%3DSafety-and-Hazards",
      );
    });

    it("falls back to the ECHA search target in the QR payload when CID is missing", () => {
      printLabels(
        [{ ...mockChemical, cid: null }],
        { size: "medium", template: "qrcode", orientation: "portrait" },
        {},
      );
      const html = mockIframeDoc.write.mock.calls[0][0];
      expect(html).toContain(
        "data=https%3A%2F%2Fchem.echa.europa.eu%2Fsubstance-search%3FsearchText%3D64-17-5",
      );
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
      // Tier 1 prepared identity stays intact on icon template.
      expect(html).toMatch(/<div\s+class="prepared-badge"/);
      expect(html).toMatch(/<div\s+class="prepared-meta"/);
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
      // Tier 1 prepared identity stays intact on qrcode template.
      expect(html).toMatch(/<div\s+class="meta-ribbon"/);
      expect(html).toContain("print.preparedShort");
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
