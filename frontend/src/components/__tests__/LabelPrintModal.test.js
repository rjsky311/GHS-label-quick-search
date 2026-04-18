import React from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import LabelPrintModal from "../LabelPrintModal";

jest.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key, options = {}) => options.defaultValue ?? key,
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
  hazard_statements: [{ code: "H225", text_en: "Highly flammable liquid and vapor." }],
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
      />
    );
    expect(screen.getByText("+").closest("button")).toBeDisabled();
  });

  it("keeps lab profile edits separate from print-specific custom fields", () => {
    const { props } = renderModal({
      labProfile: { organization: "", phone: "02-1234", address: "Lab 1" },
      customLabelFields: { labName: "", date: "2026-04-15", batchNumber: "B1" },
    });

    fireEvent.change(screen.getByPlaceholderText("label.profileOrganizationPlaceholder"), {
      target: { value: "Lab A" },
    });
    expect(props.onLabProfileChange).toHaveBeenCalledWith({
      organization: "Lab A",
      phone: "02-1234",
      address: "Lab 1",
    });

    fireEvent.change(screen.getByPlaceholderText("label.printDatePlaceholder"), {
      target: { value: "2026-04-17" },
    });
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
    const template = { id: "tpl-1", name: "Storage", labelConfig: baseConfig, customLabelFields: baseFields };
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
    const secondInput = screen.getByPlaceholderText("label.templateNamePlaceholder");
    fireEvent.change(secondInput, { target: { value: "Draft" } });
    fireEvent.keyDown(secondInput, { key: "Escape" });

    expect(screen.queryByPlaceholderText("label.templateNamePlaceholder")).not.toBeInTheDocument();
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
      })
    );
  });

  it("marks layout calibration changes as custom tuning", () => {
    const { props } = renderModal({
      labelConfig: { ...baseConfig, stockPreset: "medium-bottle", offsetXmm: 0 },
    });

    fireEvent.change(screen.getByLabelText("Offset X (mm)"), {
      target: { value: "2" },
    });

    expect(props.onLabelConfigChange).toHaveBeenCalledWith(
      expect.objectContaining({
        offsetXmm: 2,
        stockPreset: "custom",
      })
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
      customLabelFields: { labName: "", date: "2026-04-18", batchNumber: "B-7" },
      labProfile: { organization: "Lab A", phone: "02-1234", address: "Taipei" },
      labelConfig: { ...baseConfig, template: "qrcode" },
    });

    expect(screen.getByText("Previewing the first selected label")).toBeInTheDocument();
    expect(screen.getByTestId("label-sheet-preview").tagName).toBe("IFRAME");
    expect(screen.getByTestId("label-fragment-preview").tagName).toBe("IFRAME");
    expect(screen.getByTestId("label-fragment-preview").getAttribute("srcdoc")).toContain("qrcode-img");
    expect(screen.getByTestId("label-fragment-preview").getAttribute("srcdoc")).toContain("Lab A");
    expect(screen.getByTestId("selected-prepared-display-64-17-5")).toBeInTheDocument();
  });

  it("shows a preview risk prompt when nothing is selected", () => {
    renderModal();

    expect(screen.getByText("Select a chemical to see live density and scan balance.")).toBeInTheDocument();
    expect(screen.getByText("label.noneSelected")).toBeInTheDocument();
  });

  it("updates template and color config controls", () => {
    const { props } = renderModal();

    fireEvent.click(screen.getByText("label.templateIcon"));
    fireEvent.click(screen.getByText("label.colorBW"));

    expect(props.onLabelConfigChange).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({ template: "icon" })
    );
    expect(props.onLabelConfigChange).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({ colorMode: "bw" })
    );
  });
});
