import React from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import LabelPrintModal from "../LabelPrintModal";

jest.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key, options = {}) => options.defaultValue ?? key,
    i18n: {
      language: "en",
      changeLanguage: jest.fn(),
    },
  }),
  initReactI18next: {
    type: "3rdParty",
    init: () => {},
  },
}));

jest.mock("sonner", () => ({
  toast: {
    success: jest.fn(),
    error: jest.fn(),
  },
}));

import { toast } from "sonner";

const makeChem = (overrides = {}) => ({
  cas_number: "64-17-5",
  name_en: "Ethanol",
  name_zh: "Ethanol ZH",
  ghs_pictograms: [{ code: "GHS02" }, { code: "GHS07" }],
  hazard_statements: [
    { code: "H225", text_en: "Highly flammable liquid and vapor." },
  ],
  signal_word: "Danger",
  ...overrides,
});

const baseConfig = {
  template: "standard",
  size: "medium",
  orientation: "portrait",
  nameDisplay: "both",
  colorMode: "color",
};

const baseFields = { labName: "", date: "", batchNumber: "" };
const baseProfile = { organization: "", phone: "", address: "" };

function renderModal(overrides = {}) {
  const props = {
    selectedForLabel: [],
    labelConfig: baseConfig,
    onLabelConfigChange: jest.fn(),
    customLabelFields: baseFields,
    onCustomLabelFieldsChange: jest.fn(),
    labProfile: baseProfile,
    onLabProfileChange: jest.fn(),
    onClearLabProfile: jest.fn(),
    labelQuantities: {},
    onLabelQuantitiesChange: jest.fn(),
    onPrintLabels: jest.fn(),
    onToggleSelectForLabel: jest.fn(),
    printTemplates: [],
    onSaveTemplate: jest.fn(() => true),
    onLoadTemplate: jest.fn(),
    onDeleteTemplate: jest.fn(),
    onClose: jest.fn(),
    ...overrides,
  };

  const utils = render(<LabelPrintModal {...props} />);
  return { ...utils, props };
}

describe("LabelPrintModal", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("renders as a dialog and shows the live preview panel", () => {
    renderModal();

    const dialog = screen.getByRole("dialog");
    expect(dialog).toHaveAttribute("aria-modal", "true");
    expect(dialog).toHaveAttribute("aria-labelledby", "label-modal-title");
    expect(screen.getByTestId("label-preview-panel")).toBeInTheDocument();
    expect(screen.getByText("Live preview")).toBeInTheDocument();
    expect(screen.getByTestId("label-preview-panel").parentElement).toHaveClass(
      "lg:overflow-y-auto",
    );
    expect(screen.getByTestId("label-preview-panel").parentElement).toHaveClass(
      "order-first",
    );
  });

  it("starts with task-first target choice and keeps actions sticky", () => {
    renderModal({ selectedForLabel: [makeChem()] });

    expect(screen.getByTestId("primary-output-size-controls")).toBeInTheDocument();
    expect(screen.getByTestId("primary-output-size-controls")).toHaveTextContent(
      "Choose label output",
    );
    expect(screen.getByTestId("primary-output-size-controls")).toHaveTextContent(
      "Output type",
    );
    expect(screen.getByTestId("recommended-output-summary")).toHaveTextContent(
      "Recommended next step",
    );
    expect(screen.queryByTestId("print-workflow-steps")).not.toBeInTheDocument();
    expect(screen.getByTestId("recommended-output-role")).toHaveTextContent(
      "Output role",
    );
    expect(screen.getByTestId("recommended-output-statements")).toHaveTextContent(
      "Hazard text",
    );
    expect(screen.getByTestId("print-output-plan")).toHaveTextContent(
      "Why this output was chosen",
    );
    expect(screen.getByTestId("authoritative-source-note-print")).toHaveAttribute(
      "data-mode",
      "blocked",
    );
    expect(screen.getByTestId("authoritative-source-note-print")).toHaveTextContent(
      "trust.blockedTitle",
    );
    expect(screen.getByTestId("print-output-plan").tagName).toBe("DETAILS");
    expect(screen.getByTestId("print-output-plan")).toHaveAttribute("open");
    expect(screen.getByTestId("print-decision-summary")).toHaveTextContent(
      "Output role",
    );
    expect(screen.getByTestId("print-decision-icons")).toHaveTextContent(
      "All pictograms kept",
    );
    expect(screen.queryByTestId("print-readiness-strip")).not.toBeInTheDocument();
    expect(screen.getByTestId("print-outcome-summary")).toHaveTextContent(
      "Add lab/supplier profile before printing",
    );
    expect(screen.getByTestId("primary-label-preview-section")).toBeInTheDocument();
    expect(screen.getByTestId("preview-context-strip")).toHaveTextContent(
      "Output",
    );
    expect(screen.getByTestId("preview-context-role")).toHaveTextContent(
      "Output",
    );
    expect(screen.getByTestId("preview-context-icons")).toHaveTextContent(
      "All pictograms kept",
    );
    expect(screen.getByTestId("preview-context-stock")).toHaveTextContent(
      "A4 Primary",
    );
    expect(screen.getByTestId("primary-output-size-controls")).toHaveTextContent(
      "Target size",
    );
    expect(screen.getByTestId("output-goal-controls")).toHaveClass(
      "grid-cols-1",
    );
    expect(screen.getByTestId("output-goal-controls")).toHaveClass(
      "sm:grid-cols-2",
    );
    expect(screen.getByTestId("output-goal-controls")).not.toHaveClass(
      "2xl:grid-cols-4",
    );
    expect(screen.getByTestId("selected-stock-summary")).toBeInTheDocument();
    expect(screen.getByTestId("selected-stock-summary")).toHaveTextContent(
      "A4 Primary",
    );
    expect(screen.getByTestId("stock-size-picker").tagName).toBe("DETAILS");
    expect(screen.getByTestId("stock-size-picker")).not.toHaveAttribute("open");
    expect(screen.getByTestId("stock-size-picker")).toHaveTextContent(
      "Change target size",
    );
    expect(screen.getByTestId("advanced-print-options")).toBeInTheDocument();
    expect(screen.getByTestId("saved-print-controls")).toBeInTheDocument();
    expect(
      screen
        .getByTestId("primary-output-size-controls")
        .compareDocumentPosition(screen.getByTestId("output-goal-controls")) &
        Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
    expect(
      screen
        .getByTestId("output-goal-controls")
        .compareDocumentPosition(screen.getByTestId("recommended-output-summary")) &
        Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
    expect(
      screen
        .getByTestId("recommended-output-summary")
        .compareDocumentPosition(screen.getByTestId("print-output-plan")) &
        Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
    expect(
      screen
        .getByTestId("print-output-plan")
        .compareDocumentPosition(screen.getByTestId("saved-print-controls")) &
        Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
    expect(
      screen
        .getByTestId("primary-output-size-controls")
        .compareDocumentPosition(screen.getByTestId("saved-print-controls")) &
        Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
    expect(
      screen
        .getByTestId("core-output-controls")
        .compareDocumentPosition(screen.getByTestId("saved-print-controls")) &
        Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
    expect(
      screen.getByTestId("saved-print-controls").tagName,
    ).toBe("DETAILS");
    expect(
      screen.getByTestId("advanced-print-options").tagName,
    ).toBe("DETAILS");
    expect(
      screen.getByTestId("label-modal-scroll-body"),
    ).toHaveClass(
      "overflow-y-auto",
      "lg:overflow-hidden",
      "lg:grid-cols-[minmax(0,1fr)_minmax(27rem,34rem)]",
    );
    expect(screen.getByTestId("label-settings-column")).toHaveClass(
      "lg:overflow-y-auto",
    );
    expect(screen.getByTestId("label-modal-footer")).toHaveClass("shrink-0");
  });

  it("summarizes selected labels and keeps quantity controls secondary", () => {
    renderModal({ selectedForLabel: [makeChem()] });

    expect(screen.getByTestId("selected-labels-controls").tagName).toBe(
      "DETAILS",
    );
    expect(screen.getByTestId("selected-labels-controls")).not.toHaveAttribute(
      "open",
    );
    expect(screen.getByTestId("selected-labels-controls")).toHaveTextContent(
      "1 label(s) total",
    );
    expect(screen.getByTestId("selected-labels-controls")).toHaveTextContent(
      "1 label(s), about 1 page(s). Adjust copies only when needed.",
    );
  });

  it("summarizes continuation output using the actual expanded label count", () => {
    const denseChem = makeChem({
      hazard_statements: Array.from({ length: 12 }, (_, index) => ({
        code: `H${300 + index}`,
        text_en: `Long hazard statement ${index} with enough explanatory text to exercise continuation page planning.`,
      })),
      precautionary_statements: Array.from({ length: 34 }, (_, index) => ({
        code: `P${300 + index}`,
        text_en: `Long precautionary statement ${index} with enough operational wording to require additional continuation pages.`,
      })),
    });

    renderModal({
      selectedForLabel: [denseChem],
      labelConfig: {
        ...baseConfig,
        labelPurpose: "shipping",
        template: "full",
        stockPreset: "a4-primary",
      },
      labProfile: {
        organization: "Lab A",
        phone: "02-1234",
        address: "Taipei",
      },
    });

    expect(screen.getByTestId("print-output-plan")).toHaveTextContent(
      "Continuation output ready",
    );
    expect(screen.getByTestId("selected-labels-controls")).toHaveTextContent(
      "1 selected label(s) expands to",
    );
    expect(screen.getByTestId("selected-labels-controls")).toHaveTextContent(
      "continuation label(s)",
    );
    expect(screen.getByTestId("selected-labels-controls")).toHaveTextContent(
      "output label(s)",
    );
    expect(screen.getByTestId("label-preview-panel")).toHaveTextContent(
      "page(s)",
    );
    expect(screen.getByTestId("preview-page-controls")).toHaveTextContent(
      "Page 1 /",
    );

    const firstPreviewSrc = screen
      .getByTestId("label-fragment-preview")
      .getAttribute("srcdoc");
    fireEvent.click(screen.getByTestId("preview-page-next"));

    expect(screen.getByTestId("preview-page-controls")).toHaveTextContent(
      "Page 2 /",
    );
    expect(
      screen.getByTestId("label-fragment-preview").getAttribute("srcdoc"),
    ).not.toEqual(firstPreviewSrc);
  });

  it("shows a fixed-stock batch fit report and prints ready default items", () => {
    const denseChem = makeChem({
      cas_number: "7647-01-0",
      name_en: "Hydrochloric Acid",
      ghs_pictograms: [
        { code: "GHS04" },
        { code: "GHS05" },
        { code: "GHS06" },
        { code: "GHS07" },
      ],
      hazard_statements: Array.from({ length: 12 }, (_, index) => ({
        code: `H${300 + index}`,
        text_en: `Dense hazard statement ${index}`,
      })),
      precautionary_statements: Array.from({ length: 24 }, (_, index) => ({
        code: `P${300 + index}`,
        text_en: `Dense precaution statement ${index}`,
      })),
    });
    const readyChem = makeChem({
      cas_number: "64-17-5",
      name_en: "Ethanol",
      hazard_statements: [{ code: "H225", text_en: "Highly flammable." }],
      precautionary_statements: [],
    });

    const { props } = renderModal({
      selectedForLabel: [denseChem, readyChem],
      labelConfig: {
        ...baseConfig,
        labelPurpose: "shipping",
        template: "full",
        stockPreset: "a4-primary",
      },
      labProfile: {
        organization: "Lab A",
        phone: "02-1234",
        address: "Taipei",
      },
    });

    expect(screen.getByTestId("batch-fit-report")).toHaveTextContent(
      "Batch fit report",
    );
    expect(screen.getByTestId("batch-fit-ready")).toHaveTextContent("Ready");
    expect(screen.getByTestId("batch-fit-review")).toHaveTextContent(
      "Needs review",
    );
    expect(screen.getByTestId("batch-fit-stock-purpose")).toHaveTextContent(
      "Complete",
    );
    expect(screen.getByTestId("batch-fit-stock-purpose")).toHaveTextContent(
      "A4 Primary",
    );
    expect(screen.getByTestId("print-label-action")).toHaveTextContent(
      "A4 Primary",
    );

    fireEvent.click(screen.getByTestId("print-label-action"));

    expect(props.onPrintLabels).toHaveBeenCalledWith(
      expect.objectContaining({ stockPreset: "a4-primary" }),
      expect.arrayContaining([
        expect.objectContaining({
          cas_number: readyChem.cas_number,
          __batchPrintItem: expect.objectContaining({ category: "ready" }),
        }),
      ]),
    );
  });

  it("includes same-stock continuation labels by default for small-label batches", () => {
    const denseChem = makeChem({
      cas_number: "7647-01-0",
      name_en: "Hydrochloric Acid",
      ghs_pictograms: [
        { code: "GHS04" },
        { code: "GHS05" },
        { code: "GHS06" },
        { code: "GHS07" },
      ],
      hazard_statements: Array.from({ length: 12 }, (_, index) => ({
        code: `H${300 + index}`,
        text_en: `Dense hazard statement ${index}`,
      })),
      precautionary_statements: Array.from({ length: 24 }, (_, index) => ({
        code: `P${300 + index}`,
        text_en: `Dense precaution statement ${index}`,
      })),
    });
    const readyChem = makeChem({
      cas_number: "64-17-5",
      name_en: "Ethanol",
      hazard_statements: [{ code: "H225", text_en: "Highly flammable." }],
      precautionary_statements: [],
    });

    const { props } = renderModal({
      selectedForLabel: [denseChem, readyChem],
      labelConfig: {
        ...baseConfig,
        labelPurpose: "quickId",
        template: "icon",
        stockPreset: "small-strip",
      },
    });

    expect(screen.queryByTestId("batch-print-scope-controls")).not.toBeInTheDocument();
    expect(screen.getByTestId("print-label-action")).toHaveTextContent(
      "Vial Strip",
    );

    fireEvent.click(screen.getByTestId("print-label-action"));

    expect(props.onPrintLabels).toHaveBeenCalledWith(
      expect.objectContaining({ stockPreset: "small-strip", template: "icon" }),
      expect.arrayContaining([
        expect.objectContaining({
          cas_number: readyChem.cas_number,
        }),
        expect.objectContaining({
          cas_number: denseChem.cas_number,
          __batchPrintItem: expect.objectContaining({ category: "ready" }),
        }),
      ]),
    );
  });

  it("lets batch users inspect representative and review-list items before printing", () => {
    const readyChem = makeChem({
      cas_number: "64-17-5",
      name_en: "Ethanol",
      hazard_statements: [{ code: "H225", text_en: "Highly flammable." }],
      precautionary_statements: [],
    });
    const noHazardChem = makeChem({
      cas_number: "7647-01-0",
      name_en: "Hydrochloric Acid",
      ghs_pictograms: [],
      hazard_statements: [],
      precautionary_statements: [],
      signal_word: "",
    });

    renderModal({
      selectedForLabel: [readyChem, noHazardChem],
      labelConfig: {
        ...baseConfig,
        labelPurpose: "shipping",
        template: "full",
        stockPreset: "a4-primary",
      },
      labProfile: {
        organization: "Lab A",
        phone: "02-1234",
        address: "Taipei",
      },
    });

    expect(screen.getByTestId("batch-preview-selector")).toBeInTheDocument();
    expect(screen.getByTestId("batch-review-list")).toHaveTextContent(
      "Items needing review or exclusion",
    );

    fireEvent.click(screen.getByTestId("batch-preview-rep-excluded"));

    expect(screen.getByTestId("batch-active-preview-summary")).toHaveTextContent(
      "Hydrochloric Acid",
    );
    expect(screen.getByTestId("label-preview-panel")).toHaveTextContent(
      "Previewing a batch representative",
    );
    expect(screen.getByTestId("preview-context-role")).toHaveTextContent(
      "Complete",
    );
    expect(
      screen.getByTestId("label-fragment-preview").getAttribute("srcdoc"),
    ).toContain("Hydrochloric Acid");

    fireEvent.click(screen.getByTestId("batch-review-preview-1"));
    expect(screen.getByTestId("batch-active-preview-summary")).toHaveTextContent(
      "Excluded: data",
    );
  });

  it("keeps the responsible profile collapsed when the selected output does not require it", () => {
    renderModal({
      selectedForLabel: [makeChem()],
      labelConfig: {
        ...baseConfig,
        labelPurpose: "quickId",
        template: "icon",
        stockPreset: "small-strip",
      },
    });

    expect(screen.getByTestId("responsible-profile-controls")).not.toHaveAttribute(
      "open",
    );
    expect(screen.getByTestId("responsible-profile-status")).toHaveTextContent(
      "Optional for this output",
    );
  });

  it("keeps minor print controls in collapsed advanced sections", () => {
    renderModal({ selectedForLabel: [makeChem()] });

    expect(screen.getByTestId("core-output-controls")).toBeInTheDocument();
    expect(screen.getByTestId("output-goal-controls")).toBeInTheDocument();
    const advancedOptions = screen.getByTestId("advanced-print-options");
    expect(advancedOptions.tagName).toBe("DETAILS");
    expect(screen.getByTestId("saved-print-controls").tagName).toBe("DETAILS");
    expect(screen.getByTestId("advanced-layout-controls").tagName).toBe(
      "DETAILS",
    );
    expect(screen.getByTestId("advanced-template-controls").tagName).toBe(
      "DETAILS",
    );
    expect(screen.getByTestId("advanced-custom-fields").tagName).toBe(
      "DETAILS",
    );
    expect(advancedOptions).toContainElement(
      screen.getByTestId("saved-print-controls"),
    );
    expect(advancedOptions).toContainElement(
      screen.getByTestId("advanced-layout-controls"),
    );
    expect(advancedOptions).toContainElement(
      screen.getByTestId("advanced-template-controls"),
    );
    expect(advancedOptions).toContainElement(
      screen.getByTestId("advanced-custom-fields"),
    );
    expect(screen.getByTestId("custom-label-field-date")).toBeInTheDocument();
    expect(
      screen.getByTestId("custom-label-field-batchNumber"),
    ).toBeInTheDocument();
    expect(screen.getByText("Advanced print options")).toBeInTheDocument();
    expect(screen.getByText("Advanced layout controls")).toBeInTheDocument();
  });

  it("clicking the backdrop calls onClose but clicking inside does not", () => {
    const { props } = renderModal({ selectedForLabel: [makeChem()] });

    fireEvent.click(screen.getByRole("dialog"));
    expect(props.onClose).toHaveBeenCalledTimes(1);

    fireEvent.click(screen.getAllByText("Ethanol")[0]);
    expect(props.onClose).toHaveBeenCalledTimes(1);
  });

  it("Escape closes the modal", () => {
    const { props } = renderModal();

    fireEvent.keyDown(document, { key: "Escape" });
    expect(props.onClose).toHaveBeenCalledTimes(1);
  });

  it("traps Tab focus inside the modal panel", () => {
    renderModal({ selectedForLabel: [makeChem()] });

    const panel = screen.getByRole("dialog").firstElementChild;
    const focusables = panel.querySelectorAll(
      'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
    );
    const first = focusables[0];
    const last = focusables[focusables.length - 1];

    expect(document.activeElement).toBe(first);

    last.focus();
    fireEvent.keyDown(document, { key: "Tab" });
    expect(document.activeElement).toBe(first);

    fireEvent.keyDown(document, { key: "Tab", shiftKey: true });
    expect(document.activeElement).toBe(last);
  });

  it("disables printing with no selection and enables it when chemicals exist", () => {
    const first = renderModal();
    expect(screen.getByText("label.printBtn").closest("button")).toBeDisabled();
    first.unmount();

    const { props } = renderModal({
      selectedForLabel: [makeChem()],
      labelConfig: {
        ...baseConfig,
        labelPurpose: "quickId",
        template: "icon",
        stockPreset: "small-strip",
      },
    });
    const printButton = screen.getByTestId("print-label-action");
    expect(printButton).not.toBeDisabled();
    expect(printButton).toHaveTextContent("Print");

    fireEvent.click(printButton);
    expect(props.onPrintLabels).toHaveBeenCalledTimes(1);
    expect(props.onPrintLabels).toHaveBeenCalledWith(
      expect.objectContaining({ stockPreset: "small-strip", template: "icon" }),
      undefined,
    );
  });

  it("states the printable outcome before users inspect diagnostics", () => {
    renderModal({
      selectedForLabel: [makeChem()],
      labelConfig: {
        ...baseConfig,
        labelPurpose: "shipping",
        template: "full",
        stockPreset: "a4-primary",
      },
      labProfile: {
        organization: "Lab A",
        phone: "02-1234",
        address: "Taipei",
      },
    });

    expect(screen.getByTestId("recommended-output-summary")).toHaveTextContent(
      "Complete primary label is printable",
    );
    expect(screen.getByTestId("print-decision-icons")).toHaveTextContent(
      "All pictograms kept",
    );
    const supplementalChecklist = screen.getByTestId(
      "required-output-checklist",
    );
    expect(screen.getByTestId("preview-diagnostics").tagName).toBe("DETAILS");
    expect(screen.getByTestId("preview-diagnostics")).not.toHaveAttribute(
      "open",
    );
    expect(supplementalChecklist).toHaveTextContent("Primary");
    expect(supplementalChecklist).toHaveTextContent("GHS pictograms");
    expect(supplementalChecklist).toHaveTextContent("H statements");
    expect(supplementalChecklist).toHaveTextContent("P statements");
    expect(screen.getByTestId("print-label-action")).toHaveTextContent(
      "Print complete primary label (1)",
    );
  });

  it("shows continuation label and page counts on dense complete-primary print actions", () => {
    const denseChem = makeChem({
      hazard_statements: Array.from({ length: 12 }, (_, index) => ({
        code: `H${300 + index}`,
        text_en:
          "Long complete-primary hazard statement with enough explanatory text to require continuation after the high-utilization A4 layout pass.",
      })),
      precautionary_statements: Array.from({ length: 34 }, (_, index) => ({
        code: `P${300 + index}`,
        text_en:
          "Long complete-primary precautionary statement with enough operational wording to require additional continuation pages.",
      })),
    });

    renderModal({
      selectedForLabel: [denseChem],
      labelConfig: {
        ...baseConfig,
        labelPurpose: "shipping",
        template: "full",
        stockPreset: "a4-primary",
      },
      labProfile: {
        organization: "Lab A",
        phone: "02-1234",
        address: "Taipei",
      },
    });

    expect(screen.getByTestId("recommended-output-summary")).toHaveTextContent(
      "Complete primary label will print across continuation pages",
    );
    expect(screen.getByTestId("print-label-action")).toHaveTextContent(
      "Print complete primary continuation set (2 labels / 2 pages)",
    );
  });

  it("uses QR-specific outcome and print action text for QR supplements", () => {
    renderModal({
      selectedForLabel: [makeChem()],
      labelConfig: {
        ...baseConfig,
        labelPurpose: "qrSupplement",
        template: "qrcode",
        stockPreset: "small-strip",
      },
    });

    expect(screen.getByTestId("recommended-output-summary")).toHaveTextContent(
      "QR small label is printable",
    );
    expect(screen.getByTestId("print-output-plan")).not.toHaveAttribute("open");
    expect(screen.getByTestId("authoritative-source-note-print")).toHaveAttribute(
      "data-mode",
      "supplemental",
    );
    expect(screen.getByTestId("authoritative-source-note-print")).toHaveTextContent(
      "trust.supplementalTitle",
    );
    expect(screen.getByTestId("print-decision-summary")).toHaveTextContent(
      "Details via QR: Lookup page",
    );
    const qrChecklist = screen.getByTestId("required-output-checklist");
    expect(qrChecklist).toHaveTextContent("This label prints");
    expect(qrChecklist).toHaveTextContent("QR code");
    expect(qrChecklist).toHaveTextContent("QR target");
    expect(qrChecklist).toHaveTextContent("Lookup page");
    expect(qrChecklist).toHaveTextContent("GHS Label Quick Search");
    expect(qrChecklist).toHaveTextContent("Detailed hazard text");
    expect(qrChecklist).toHaveTextContent("Via QR: Lookup page");
    expect(qrChecklist).not.toHaveTextContent("H statements");
    expect(qrChecklist).not.toHaveTextContent("P statements");
    expect(screen.getByTestId("print-label-action")).toHaveTextContent(
      "Print QR small label (1)",
    );
  });

  it("uses quick-ID outcome text for tube and vial labels", () => {
    renderModal({
      selectedForLabel: [makeChem()],
      labelConfig: {
        ...baseConfig,
        labelPurpose: "quickId",
        template: "icon",
        stockPreset: "small-strip",
      },
    });

    expect(screen.getByTestId("recommended-output-summary")).toHaveTextContent(
      "Identification small label is printable",
    );
    expect(screen.getByTestId("print-decision-summary")).toHaveTextContent(
      "Quick-ID supplement",
    );
    expect(screen.getByTestId("print-label-action")).toHaveTextContent(
      "Print identification small label (1)",
    );
  });

  it("normalizes legacy container stock to the simplified complete primary output", () => {
    const denseChem = makeChem({
      hazard_statements: Array.from({ length: 6 }, (_, index) => ({
        code: `H${300 + index}`,
        text_en: `Hazard ${index}`,
      })),
      precautionary_statements: Array.from({ length: 18 }, (_, index) => ({
        code: `P${300 + index}`,
        text_en: `Precaution ${index}`,
      })),
    });

    const { props } = renderModal({
      selectedForLabel: [denseChem],
      labelConfig: {
        ...baseConfig,
        labelPurpose: "shipping",
        template: "full",
        size: "large",
        stockPreset: "large-primary",
      },
      labProfile: {
        organization: "Lab A",
        phone: "02-1234",
        address: "Taipei",
      },
    });

    expect(props.onLabelConfigChange).toHaveBeenCalledWith(
      expect.objectContaining({
        stockPreset: "a4-primary",
        labelWidthMm: 188,
        labelHeightMm: 268,
        pageSize: "A4",
        perPage: 1,
        template: "full",
        labelPurpose: "shipping",
      }),
    );
    expect(screen.queryByTestId("print-recovery-route")).not.toBeInTheDocument();
    expect(screen.getByTestId("required-output-checklist")).toBeInTheDocument();
    expect(screen.getByTestId("required-output-pictograms")).toHaveTextContent(
      "2/2",
    );
    expect(screen.getByTestId("required-output-hazard-statements")).toHaveTextContent(
      "6/6",
    );
    expect(
      screen.getByTestId("required-output-precautionary-statements"),
    ).toHaveTextContent("18/18");
    expect(
      screen.getByTestId("required-output-responsible-profile"),
    ).toHaveTextContent("3/3");
  });

  it("keeps the actual label fragment before warnings and output diagnostics", () => {
    const denseChem = makeChem({
      hazard_statements: Array.from({ length: 6 }, (_, index) => ({
        code: `H${300 + index}`,
        text_en: `Hazard ${index}`,
      })),
      precautionary_statements: Array.from({ length: 18 }, (_, index) => ({
        code: `P${300 + index}`,
        text_en: `Precaution ${index}`,
      })),
    });

    renderModal({
      selectedForLabel: [denseChem],
      labelConfig: {
        ...baseConfig,
        labelPurpose: "shipping",
        template: "full",
        size: "large",
        stockPreset: "large-primary",
      },
    });

    const labelPreview = screen.getByTestId("primary-label-preview-section");
    const warning = screen.getByTestId("preview-warning-banner");
    const requiredOutput = screen.getByTestId("required-output-checklist");

    expect(
      labelPreview.compareDocumentPosition(warning) &
        Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
    expect(
      labelPreview.compareDocumentPosition(requiredOutput) &
        Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
  });

  it("shows only A4 and Letter for complete labels", () => {
    renderModal({
      selectedForLabel: [makeChem()],
      labelConfig: {
        ...baseConfig,
        labelPurpose: "shipping",
        template: "full",
        size: "large",
        stockPreset: "a4-primary",
      },
    });

    expect(screen.getByTestId("primary-output-size-controls")).toBeInTheDocument();
    expect(
      screen.queryByTestId("primary-output-size-large-primary"),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByTestId("primary-output-size-medium-bottle"),
    ).not.toBeInTheDocument();
    expect(screen.getByTestId("primary-output-size-a4-primary")).toHaveTextContent(
      "A4 Primary",
    );
    expect(
      screen.getByTestId("primary-output-size-letter-primary"),
    ).toHaveTextContent("Letter Primary");
    expect(
      screen.queryByTestId("secondary-output-size-controls"),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByTestId("primary-output-size-avery-5163"),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByTestId("primary-output-size-medium-rack"),
    ).not.toBeInTheDocument();
    const previewHeight = screen.getByTestId("label-fragment-preview").style
      .height;
    expect(previewHeight).toMatch(/px$/);
    expect(Number.parseInt(previewHeight, 10)).toBeGreaterThan(220);
    expect(Number.parseInt(previewHeight, 10)).toBeLessThanOrEqual(400);
  });

  it("shows only the 62 mm stock for QR small labels", () => {
    renderModal({
      selectedForLabel: [makeChem()],
      labelConfig: {
        ...baseConfig,
        labelPurpose: "qrSupplement",
        template: "qrcode",
        size: "small",
        stockPreset: "brother-62mm-continuous",
      },
    });

    expect(
      screen.queryByTestId("primary-output-size-small-strip"),
    ).not.toBeInTheDocument();
    expect(
      screen.getByTestId("primary-output-size-brother-62mm-continuous"),
    ).toHaveTextContent("62 mm Continuous");
    expect(
      screen.queryByTestId("secondary-output-size-controls"),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByTestId("primary-output-size-a4-primary"),
    ).not.toBeInTheDocument();
  });

  it("does not expose legacy bottle stock as a complete-label choice", () => {
    const denseChem = makeChem({
      ghs_pictograms: [
        { code: "GHS04" },
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
    });
    renderModal({
      selectedForLabel: [denseChem],
      labelConfig: {
        ...baseConfig,
        labelPurpose: "shipping",
        template: "full",
        size: "large",
        stockPreset: "letter-primary",
        labelWidthMm: 196,
        labelHeightMm: 250,
        perPage: 1,
      },
      labProfile: {
        organization: "Lab A",
        phone: "02-1234",
        address: "Taipei",
      },
    });

    expect(
      screen.queryByTestId("primary-output-size-medium-bottle"),
    ).not.toBeInTheDocument();
    expect(screen.getByTestId("primary-output-size-a4-primary")).toBeInTheDocument();
  });

  it("does not expose legacy rack stock as a simplified output choice", () => {
    renderModal({
      selectedForLabel: [makeChem()],
      labelConfig: {
        ...baseConfig,
        labelPurpose: "quickId",
        template: "icon",
        stockPreset: "small-strip",
      },
    });

    expect(
      screen.queryByTestId("primary-output-size-medium-rack"),
    ).not.toBeInTheDocument();
    expect(screen.getByTestId("primary-output-size-small-strip")).toBeInTheDocument();
  });

  it("restores the complete full template when switching from supplemental bottle stock back to A4 primary", () => {
    const denseChem = makeChem({
      ghs_pictograms: [
        { code: "GHS04" },
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
    });
    const { props } = renderModal({
      selectedForLabel: [denseChem],
      labelConfig: {
        ...baseConfig,
        labelPurpose: "shipping",
        template: "standard",
        size: "medium",
        stockPreset: "medium-bottle",
        labelWidthMm: 95,
        labelHeightMm: 50,
        perPage: 10,
      },
      labProfile: {
        organization: "Lab A",
        phone: "02-1234",
        address: "Taipei",
      },
    });

    fireEvent.click(screen.getByTestId("primary-output-size-a4-primary"));

    expect(props.onLabelConfigChange).toHaveBeenLastCalledWith(
      expect.objectContaining({
        stockPreset: "a4-primary",
        labelWidthMm: 188,
        labelHeightMm: 268,
        perPage: 1,
        template: "full",
        labelPurpose: "shipping",
      }),
    );
  });

  it("blocks complete primary printing until the responsible profile is complete", () => {
    renderModal({
      selectedForLabel: [makeChem()],
      labelConfig: {
        ...baseConfig,
        labelPurpose: "shipping",
        template: "full",
        size: "large",
        stockPreset: "a4-primary",
        labelWidthMm: 188,
        labelHeightMm: 268,
        perPage: 1,
      },
      labProfile: { organization: "Lab A", phone: "02-1234", address: "" },
    });

    expect(screen.getByTestId("print-output-plan")).toHaveTextContent(
      "Responsible profile required",
    );
    expect(screen.getByTestId("print-recovery-route")).toHaveTextContent(
      "Complete lab/supplier profile",
    );
    expect(screen.getByTestId("print-recovery-route")).toHaveAttribute(
      "data-recovery-kind",
      "profile",
    );
    expect(screen.getByTestId("print-recovery-route")).toHaveAttribute(
      "data-current-stock",
      "A4 Primary",
    );
    expect(screen.getByTestId("print-recovery-route")).toHaveTextContent(
      "A4 Primary is planned as a complete primary label",
    );
    expect(screen.getByTestId("print-output-plan")).toHaveAttribute("open");
    expect(screen.getByTestId("authoritative-source-note-print")).toHaveAttribute(
      "data-mode",
      "blocked",
    );
    expect(screen.getByTestId("authoritative-source-note-print")).toHaveTextContent(
      "trust.blockedTitle",
    );
    expect(screen.getByTestId("responsible-profile-controls")).toHaveAttribute(
      "open",
    );
    expect(
      screen.getByTestId("responsible-profile-field-organization"),
    ).toHaveValue("Lab A");
    expect(screen.getByTestId("responsible-profile-field-phone")).toHaveValue(
      "02-1234",
    );
    expect(screen.getByTestId("responsible-profile-field-address")).toHaveValue(
      "",
    );
    expect(screen.getByTestId("responsible-profile-status")).toHaveTextContent(
      "Required for complete primary",
    );
    expect(
      screen.getByTestId("required-output-responsible-profile"),
    ).toHaveTextContent("2/3");
    const printButton = screen
      .getByText("Add lab/supplier profile first")
      .closest("button");
    expect(printButton).toBeDisabled();
  });

  it("updates quantity controls within the valid range", () => {
    const chem = makeChem();
    const { props, rerender } = renderModal({
      selectedForLabel: [chem],
      labelQuantities: { [chem.cas_number]: 2 },
    });

    fireEvent.click(screen.getByText("-"));
    expect(props.onLabelQuantitiesChange).toHaveBeenCalledWith({
      [chem.cas_number]: 1,
    });

    fireEvent.click(screen.getByText("+"));
    expect(props.onLabelQuantitiesChange).toHaveBeenCalledWith({
      [chem.cas_number]: 3,
    });

    rerender(
      <LabelPrintModal
        {...props}
        selectedForLabel={[chem]}
        labelQuantities={{ [chem.cas_number]: 20 }}
      />,
    );
    expect(screen.getByText("+").closest("button")).toBeDisabled();
  });

  it("keeps lab profile edits separate from print-specific custom fields", () => {
    const { props } = renderModal({
      labProfile: { organization: "", phone: "02-1234", address: "Lab 1" },
      customLabelFields: { labName: "", date: "2026-04-15", batchNumber: "B1" },
    });

    fireEvent.change(
      screen.getByPlaceholderText("label.profileOrganizationPlaceholder"),
      {
        target: { value: "Lab A" },
      },
    );
    expect(props.onLabProfileChange).toHaveBeenCalledWith({
      organization: "Lab A",
      phone: "02-1234",
      address: "Lab 1",
    });

    fireEvent.change(
      screen.getByPlaceholderText("label.printDatePlaceholder"),
      {
        target: { value: "2026-04-17" },
      },
    );
    expect(props.onCustomLabelFieldsChange).toHaveBeenCalledWith({
      labName: "",
      date: "2026-04-17",
      batchNumber: "B1",
    });
  });

  it("shows the clear-profile action when any profile value exists", () => {
    const { props } = renderModal({
      labProfile: { organization: "Lab A", phone: "", address: "" },
    });

    fireEvent.click(screen.getByText("label.profileClear"));
    expect(props.onClearLabProfile).toHaveBeenCalledTimes(1);
  });

  it("loads and deletes saved templates", () => {
    const template = {
      id: "tpl-1",
      name: "Storage",
      labelConfig: baseConfig,
      customLabelFields: baseFields,
    };
    const { props } = renderModal({ printTemplates: [template] });

    fireEvent.click(screen.getByText("Storage"));
    expect(props.onLoadTemplate).toHaveBeenCalledWith(template);
    expect(toast.success).toHaveBeenCalled();

    const originalConfirm = window.confirm;
    window.confirm = jest.fn(() => true);
    try {
      const templateRow = screen.getByText("Storage").closest("div");
      const deleteButton = templateRow.querySelectorAll("button")[1];
      fireEvent.click(deleteButton);
      expect(window.confirm).toHaveBeenCalled();
      expect(props.onDeleteTemplate).toHaveBeenCalledWith("tpl-1");
    } finally {
      window.confirm = originalConfirm;
    }
  });

  it("loads and clears recent print jobs from the queue", () => {
    const recentJob = {
      id: "print-1",
      createdAt: "2026-04-18T08:30:00.000Z",
      items: [makeChem()],
      totalChemicals: 1,
      totalLabels: 2,
      labelConfig: { ...baseConfig, template: "qrcode" },
    };
    const { props } = renderModal({
      recentPrints: [recentJob],
      onLoadRecentPrint: jest.fn(),
      onClearRecentPrints: jest.fn(),
    });

    fireEvent.click(screen.getByText("Load"));
    expect(props.onLoadRecentPrint).toHaveBeenCalledWith(recentJob);

    fireEvent.click(screen.getByText("Clear"));
    expect(props.onClearRecentPrints).toHaveBeenCalledTimes(1);
  });

  it("saves the current template and lets Escape close only the inline input", () => {
    const onSaveTemplate = jest.fn(() => true);
    const { props } = renderModal({ onSaveTemplate });

    fireEvent.click(screen.getByText("label.saveCurrentBtn"));
    const input = screen.getByPlaceholderText("label.templateNamePlaceholder");
    fireEvent.change(input, { target: { value: "My Preset" } });
    fireEvent.keyDown(input, { key: "Enter" });

    expect(onSaveTemplate).toHaveBeenCalledWith("My Preset");
    expect(toast.success).toHaveBeenCalled();

    fireEvent.click(screen.getByText("label.saveCurrentBtn"));
    const secondInput = screen.getByPlaceholderText(
      "label.templateNamePlaceholder",
    );
    fireEvent.change(secondInput, { target: { value: "Draft" } });
    fireEvent.keyDown(secondInput, { key: "Escape" });

    expect(
      screen.queryByPlaceholderText("label.templateNamePlaceholder"),
    ).not.toBeInTheDocument();
    expect(props.onClose).not.toHaveBeenCalled();
  });

  it("selects a stock preset and pushes its layout values to labelConfig", () => {
    const { props } = renderModal();

    fireEvent.click(screen.getByTestId("primary-output-size-letter-primary"));

    expect(props.onLabelConfigChange).toHaveBeenCalledWith(
      expect.objectContaining({
        stockPreset: "letter-primary",
        size: "large",
        orientation: "portrait",
        columns: 1,
        rows: 1,
        perPage: 1,
        labelWidthMm: 196,
        labelHeightMm: 250,
        pageSize: "Letter",
      }),
    );
  });

  it("selects a print target and applies its recommended template and stock", () => {
    const { props } = renderModal();

    fireEvent.click(screen.getByTestId("label-purpose-qrSupplement"));

    expect(props.onLabelConfigChange).toHaveBeenCalledWith(
      expect.objectContaining({
        labelPurpose: "qrSupplement",
        template: "qrcode",
        stockPreset: "brother-62mm-continuous",
        size: "small",
        orientation: "landscape",
        columns: 3,
        rows: 4,
        perPage: 12,
      }),
    );
  });

  it("keeps an explicit QR target selected instead of auto-upgrading back to a full-page primary", () => {
    const denseChem = makeChem({
      ghs_pictograms: [
        { code: "GHS04" },
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
    });

    function StatefulModal() {
      const [config, setConfig] = React.useState({
        ...baseConfig,
        labelPurpose: "shipping",
        template: "full",
        stockPreset: "letter-primary",
        labelWidthMm: 196,
        labelHeightMm: 250,
        pageSize: "Letter",
        perPage: 1,
      });

      return (
        <LabelPrintModal
          selectedForLabel={[denseChem]}
          labelConfig={config}
          customGHSSettings={{}}
          onLabelConfigChange={setConfig}
          customLabelFields={baseFields}
          onCustomLabelFieldsChange={jest.fn()}
          labProfile={{
            organization: "Lab A",
            phone: "02-1234",
            address: "Taipei",
          }}
          onLabProfileChange={jest.fn()}
          onClearLabProfile={jest.fn()}
          labelQuantities={{}}
          onLabelQuantitiesChange={jest.fn()}
          onPrintLabels={jest.fn()}
          onToggleSelectForLabel={jest.fn()}
          printTemplates={[]}
          onSaveTemplate={jest.fn()}
          onLoadTemplate={jest.fn()}
          onDeleteTemplate={jest.fn()}
          recentPrints={[]}
          onLoadRecentPrint={jest.fn()}
          onClearRecentPrints={jest.fn()}
          onClose={jest.fn()}
        />
      );
    }

    render(<StatefulModal />);
    fireEvent.click(screen.getByTestId("label-purpose-qrSupplement"));

    expect(screen.getByTestId("recommended-output-summary")).toHaveTextContent(
      "QR small label is printable",
    );
    expect(screen.getByTestId("print-label-action")).toHaveTextContent(
      "Print QR small label (2)",
    );
    expect(screen.getByTestId("label-preview-panel")).toHaveTextContent(
      "62 mm Continuous",
    );
  });

  it("marks layout calibration changes as custom tuning", () => {
    const { props } = renderModal({
      labelConfig: {
        ...baseConfig,
        stockPreset: "medium-bottle",
        offsetXmm: 0,
      },
    });

    fireEvent.change(screen.getByLabelText("Offset X (mm)"), {
      target: { value: "2" },
    });

    expect(props.onLabelConfigChange).toHaveBeenCalledWith(
      expect.objectContaining({
        offsetXmm: 2,
        stockPreset: "custom",
      }),
    );
  });

  it("marks custom stock size changes as custom tuning", () => {
    const { props } = renderModal({
      labelConfig: {
        ...baseConfig,
        stockPreset: "medium-bottle",
        labelWidthMm: 95,
      },
    });

    fireEvent.change(screen.getByLabelText("Label width (mm)"), {
      target: { value: "88" },
    });

    expect(props.onLabelConfigChange).toHaveBeenCalledWith(
      expect.objectContaining({
        labelWidthMm: 88,
        stockPreset: "custom",
      }),
    );
  });

  it("selects the identification small label target without exposing stock tuning first", () => {
    const { props } = renderModal({ selectedForLabel: [makeChem()] });

    fireEvent.click(screen.getByTestId("label-purpose-quickId"));

    expect(props.onLabelConfigChange).toHaveBeenCalledWith(
      expect.objectContaining({
        labelPurpose: "quickId",
        template: "icon",
        stockPreset: "small-strip",
        labelWidthMm: 70,
        labelHeightMm: 24,
        perPage: 20,
      }),
    );
    expect(screen.getByTestId("stock-size-picker")).not.toHaveAttribute("open");
  });

  it("selects the complete label target as A4 primary by default", () => {
    const denseChem = makeChem({
      hazard_statements: Array.from({ length: 6 }, (_, index) => ({
        code: `H${300 + index}`,
        text_en: `Hazard ${index}`,
      })),
      precautionary_statements: Array.from({ length: 18 }, (_, index) => ({
        code: `P${300 + index}`,
        text_en: `Precaution ${index}`,
      })),
    });
    const { props } = renderModal({
      selectedForLabel: [denseChem],
      labProfile: {
        organization: "Lab A",
        phone: "02-1234",
        address: "Taipei",
      },
    });

    fireEvent.click(screen.getByTestId("label-purpose-complete"));

    expect(props.onLabelConfigChange).toHaveBeenCalledWith(
      expect.objectContaining({
        labelPurpose: "shipping",
        template: "full",
        stockPreset: "a4-primary",
        labelWidthMm: 188,
        labelHeightMm: 268,
        perPage: 1,
      }),
    );
  });

  it("shows live preview details for the first selected chemical", () => {
    renderModal({
      selectedForLabel: [
        makeChem({
          isPreparedSolution: true,
          preparedSolution: {
            concentration: "70%",
            solvent: "Water",
            preparedBy: "Kai",
            preparedDate: "2026-04-18",
          },
        }),
      ],
      customLabelFields: {
        labName: "",
        date: "2026-04-18",
        batchNumber: "B-7",
      },
      labProfile: {
        organization: "Lab A",
        phone: "02-1234",
        address: "Taipei",
      },
      labelConfig: { ...baseConfig, template: "qrcode" },
    });

    expect(
      screen.getByText("Previewing the first selected label"),
    ).toBeInTheDocument();
    expect(screen.getByTestId("label-sheet-preview").tagName).toBe("IFRAME");
    expect(screen.getByTestId("label-fragment-preview").tagName).toBe("IFRAME");
    expect(
      screen.getByTestId("label-fragment-preview").getAttribute("srcdoc"),
    ).toContain("qrcode-img");
    expect(
      screen.getByTestId("label-fragment-preview").getAttribute("srcdoc"),
    ).toContain("CAS 64-17-5");
    expect(
      screen.getByTestId("label-fragment-preview").getAttribute("srcdoc"),
    ).toContain("data-qr-target");
    expect(
      screen.getByTestId("label-fragment-preview").getAttribute("srcdoc"),
    ).not.toContain("70%");
    expect(
      screen.getByTestId("label-fragment-preview").getAttribute("srcdoc"),
    ).not.toContain("Lab A");
    expect(
      screen.getByTestId("selected-prepared-display-64-17-5"),
    ).toBeInTheDocument();
  });

  it("surfaces expired prepared-solution status at the final print decision point", () => {
    renderModal({
      selectedForLabel: [
        makeChem({
          isPreparedSolution: true,
          preparedSolution: {
            concentration: "70%",
            solvent: "Water",
            preparedBy: "Kai",
            preparedDate: "2020-01-01",
            expiryDate: "2020-01-02",
          },
        }),
      ],
    });

    expect(
      screen.getByTestId("selected-prepared-operational-64-17-5"),
    ).toHaveTextContent("2020-01-02");
    expect(
      screen.getByTestId("selected-prepared-expiry-status-64-17-5"),
    ).toHaveTextContent("prepared.expiryExpired");
  });

  it("shows a fit-first inspection strip, can inspect details, and resets to fit after stock changes", async () => {
    const { rerender, props } = renderModal({
      selectedForLabel: [makeChem()],
      labelConfig: {
        ...baseConfig,
        labelPurpose: "shipping",
        template: "full",
        stockPreset: "letter-primary",
      },
      labProfile: {
        organization: "Lab A",
        phone: "02-1234",
        address: "Taipei",
      },
    });

    const strip = screen.getByTestId("preview-inspection-strip");
    const preview = screen.getByTestId("label-fragment-preview");

    expect(strip).toHaveTextContent("Whole label visible");
    expect(strip).toHaveTextContent("196 x 250 mm");
    expect(strip).toHaveTextContent("scale");
    expect(strip).toHaveTextContent("Letter");
    expect(preview).toHaveAttribute("data-preview-mode", "fit");
    expect(preview.getAttribute("srcdoc")).toContain("preview-zoom-fit");

    fireEvent.click(screen.getByText("Inspect"));

    const inspectPreview = screen.getByTestId("label-fragment-preview");
    expect(screen.getByTestId("preview-inspection-strip")).toHaveTextContent(
      "Detail inspect mode",
    );
    expect(inspectPreview).toHaveAttribute("data-preview-mode", "inspect");
    expect(inspectPreview.getAttribute("srcdoc")).toContain(
      "preview-zoom-inspect",
    );
    expect(
      Number.parseInt(inspectPreview.style.height, 10),
    ).toBeGreaterThanOrEqual(Number.parseInt(preview.style.height, 10));

    rerender(
      <LabelPrintModal
        {...props}
        labelConfig={{
          ...props.labelConfig,
          labelPurpose: "shipping",
          template: "full",
          stockPreset: "a4-primary",
        }}
      />,
    );

    await waitFor(() => {
      expect(screen.getByTestId("label-fragment-preview")).toHaveAttribute(
        "data-preview-mode",
        "fit",
      );
    });
    expect(
      screen.getByTestId("label-fragment-preview").getAttribute("srcdoc"),
    ).toContain("preview-zoom-fit");
  });

  it("renders the sheet preview as a scaled page with orientation-aware source", () => {
    renderModal({
      selectedForLabel: [makeChem()],
      labelConfig: { ...baseConfig, orientation: "landscape", colorMode: "bw" },
    });

    const srcdoc = screen
      .getByTestId("label-sheet-preview")
      .getAttribute("srcdoc");
    expect(srcdoc).toContain("preview-sheet-viewport");
    expect(srcdoc).toContain("preview-page");
    expect(srcdoc).toContain("size: A4");
    expect(srcdoc).not.toContain("size: A4 landscape");
    expect(srcdoc).toContain("print-bw");
  });

  it("shows a preview risk prompt when nothing is selected", () => {
    renderModal();

    expect(
      screen.getByText(
        "Select a chemical to see live density and scan balance.",
      ),
    ).toBeInTheDocument();
    expect(screen.getByText("label.noneSelected")).toBeInTheDocument();
  });

  it("updates template and color config controls", () => {
    const { props } = renderModal();

    fireEvent.click(screen.getByText("label.templateIcon"));
    fireEvent.click(screen.getByText("label.colorBW"));

    expect(props.onLabelConfigChange).toHaveBeenCalledWith(
      expect.objectContaining({ template: "icon" }),
    );
    expect(props.onLabelConfigChange).toHaveBeenCalledWith(
      expect.objectContaining({ colorMode: "bw" }),
    );
  });

  it("renders template and abbreviation controls with fixed icon slots", () => {
    renderModal();

    const slots = screen.getAllByTestId("label-config-icon-slot");
    expect(slots.length).toBeGreaterThanOrEqual(7);
    slots.forEach((slot) => {
      expect(slot).toHaveClass("h-6", "w-8", "shrink-0");
    });
    expect(
      slots.some((slot) =>
        slot.querySelector("svg")?.classList.contains("shrink-0"),
      ),
    ).toBe(true);
    expect(slots.some((slot) => slot.textContent === "CMYK")).toBe(true);
  });
});
