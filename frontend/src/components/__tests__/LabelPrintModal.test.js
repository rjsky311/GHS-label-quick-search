import React from "react";
import { fireEvent, render, screen } from "@testing-library/react";
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
      "order-first",
      "lg:order-none",
      "lg:overflow-y-auto",
    );
  });

  it("starts with the recommended output and keeps actions sticky", () => {
    renderModal({ selectedForLabel: [makeChem()] });

    expect(screen.getByTestId("print-output-plan")).toHaveTextContent(
      "Recommended output",
    );
    expect(screen.queryByTestId("print-readiness-strip")).not.toBeInTheDocument();
    expect(screen.getByTestId("primary-label-preview-section")).toBeInTheDocument();
    expect(screen.getByTestId("primary-output-size-controls")).toBeInTheDocument();
    expect(screen.getByTestId("saved-print-controls")).toBeInTheDocument();
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
      screen.getByTestId("label-modal-scroll-body"),
    ).toHaveClass(
      "overflow-y-auto",
      "lg:overflow-hidden",
      "lg:grid-cols-[minmax(0,1fr)_minmax(24rem,30rem)]",
    );
    expect(screen.getByTestId("label-settings-column")).toHaveClass(
      "lg:overflow-y-auto",
    );
    expect(screen.getByTestId("label-modal-footer")).toHaveClass("shrink-0");
  });

  it("keeps minor print controls in collapsed advanced sections", () => {
    renderModal({ selectedForLabel: [makeChem()] });

    expect(screen.getByTestId("core-output-controls")).toBeInTheDocument();
    expect(screen.getByTestId("saved-print-controls").tagName).toBe("DETAILS");
    expect(screen.getByTestId("advanced-layout-controls").tagName).toBe(
      "DETAILS",
    );
    expect(screen.getByTestId("advanced-template-controls").tagName).toBe(
      "DETAILS",
    );
    expect(screen.getByTestId("advanced-stock-controls").tagName).toBe(
      "DETAILS",
    );
    expect(screen.getByTestId("advanced-custom-fields").tagName).toBe(
      "DETAILS",
    );
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

    fireEvent.keyDown(window, { key: "Escape" });
    expect(props.onClose).toHaveBeenCalledTimes(1);
  });

  it("disables printing with no selection and enables it when chemicals exist", () => {
    const first = renderModal();
    expect(screen.getByText("label.printBtn").closest("button")).toBeDisabled();
    first.unmount();

    const { props } = renderModal({ selectedForLabel: [makeChem()] });
    const printButton = screen.getByText("label.printBtn").closest("button");
    expect(printButton).not.toBeDisabled();

    fireEvent.click(printButton);
    expect(props.onPrintLabels).toHaveBeenCalledTimes(1);
  });

  it("auto-routes dense shipped-container labels to full-page primary instead of a print dead end", () => {
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
    });

    expect(props.onLabelConfigChange).toHaveBeenCalledWith(
      expect.objectContaining({
        stockPreset: "letter-primary",
        labelWidthMm: 186,
        labelHeightMm: 236,
        pageSize: "Letter",
        perPage: 1,
        template: "full",
        labelPurpose: "shipping",
      }),
    );
    expect(screen.getByTestId("preview-warning-banner")).toHaveTextContent(
      "Printing blocked",
    );
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
    ).toHaveTextContent("0/3");
    expect(props.onPrintLabels).not.toHaveBeenCalled();
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

  it("shows A4 and Letter as the primary paper-size choice", () => {
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
    expect(screen.getByTestId("primary-output-size-a4-primary")).toHaveTextContent(
      "A4 Primary",
    );
    expect(
      screen.getByTestId("primary-output-size-letter-primary"),
    ).toHaveTextContent("Letter Primary");
    expect(screen.getByTestId("label-fragment-preview")).toHaveStyle({
      height: "24rem",
    });
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
        labelWidthMm: 180,
        labelHeightMm: 250,
        perPage: 1,
      },
      labProfile: { organization: "Lab A", phone: "02-1234", address: "" },
    });

    expect(screen.getByTestId("print-output-plan")).toHaveTextContent(
      "Responsible profile required",
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

    fireEvent.click(screen.getByTestId("stock-preset-medium-bottle"));

    expect(props.onLabelConfigChange).toHaveBeenCalledWith(
      expect.objectContaining({
        stockPreset: "medium-bottle",
        size: "medium",
        orientation: "portrait",
        columns: 2,
        rows: 4,
        perPage: 8,
        labelWidthMm: 95,
        labelHeightMm: 50,
      }),
    );
  });

  it("selects a print purpose and applies its recommended template and stock", () => {
    const { props } = renderModal();

    fireEvent.click(screen.getByTestId("label-purpose-qrSupplement"));

    expect(props.onLabelConfigChange).toHaveBeenCalledWith(
      expect.objectContaining({
        labelPurpose: "qrSupplement",
        template: "qrcode",
        stockPreset: "small-strip",
        size: "small",
        orientation: "landscape",
        columns: 4,
        rows: 4,
        perPage: 16,
      }),
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
    ).toContain("70%");
    expect(
      screen.getByTestId("label-fragment-preview").getAttribute("srcdoc"),
    ).not.toContain("Lab A");
    expect(
      screen.getByTestId("selected-prepared-display-64-17-5"),
    ).toBeInTheDocument();
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
    expect(srcdoc).toContain("size: A4 landscape");
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

    expect(props.onLabelConfigChange).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({ template: "icon" }),
    );
    expect(props.onLabelConfigChange).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({ colorMode: "bw" }),
    );
  });

  it("renders template and abbreviation controls with fixed icon slots", () => {
    renderModal();

    const slots = screen.getAllByTestId("label-config-icon-slot");
    expect(slots.length).toBeGreaterThanOrEqual(10);
    slots.forEach((slot) => {
      expect(slot).toHaveClass("h-6", "w-8", "shrink-0");
    });
    expect(
      slots.some((slot) =>
        slot.querySelector("svg")?.classList.contains("shrink-0"),
      ),
    ).toBe(true);
    expect(slots.some((slot) => slot.textContent === "ZH")).toBe(true);
  });
});
