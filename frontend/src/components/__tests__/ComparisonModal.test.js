import { render, screen, fireEvent } from "@testing-library/react";
import ComparisonModal from "../ComparisonModal";

// ── Test fixtures ──

const mockChemicals = [
  {
    cas_number: "64-17-5",
    name_en: "Ethanol",
    name_zh: "乙醇",
    found: true,
    ghs_pictograms: [
      { code: "GHS02", name_zh: "易燃" },
      { code: "GHS07", name_zh: "感嘆號" },
    ],
    hazard_statements: [
      { code: "H225", text_zh: "高度易燃液體和蒸氣" },
    ],
    signal_word: "Danger",
    signal_word_zh: "危險",
    other_classifications: [],
    has_multiple_classifications: false,
  },
  {
    cas_number: "67-56-1",
    name_en: "Methanol",
    name_zh: "甲醇",
    found: true,
    ghs_pictograms: [
      { code: "GHS02", name_zh: "易燃" },
      { code: "GHS06", name_zh: "骷髏" },
      { code: "GHS08", name_zh: "健康危害" },
    ],
    hazard_statements: [
      { code: "H225", text_zh: "高度易燃液體和蒸氣" },
      { code: "H301", text_zh: "吞食有毒" },
    ],
    signal_word: "Danger",
    signal_word_zh: "危險",
    other_classifications: [],
    has_multiple_classifications: false,
  },
  {
    cas_number: "7647-01-0",
    name_en: "Hydrochloric acid",
    name_zh: "鹽酸",
    found: true,
    ghs_pictograms: [
      { code: "GHS05", name_zh: "腐蝕性" },
      { code: "GHS07", name_zh: "感嘆號" },
    ],
    hazard_statements: [
      { code: "H314", text_zh: "造成嚴重皮膚灼傷和眼睛損傷" },
    ],
    signal_word: "Danger",
    signal_word_zh: "危險",
    other_classifications: [],
    has_multiple_classifications: false,
  },
];

const mockGetEffective = (result) => ({
  pictograms: result.ghs_pictograms || [],
  hazard_statements: result.hazard_statements || [],
  signal_word: result.signal_word,
  signal_word_zh: result.signal_word_zh,
  isCustom: false,
  customIndex: 0,
});

// ── Tests ──

describe("ComparisonModal", () => {
  it("renders dialog with role=dialog", () => {
    render(
      <ComparisonModal
        chemicals={mockChemicals}
        getEffectiveClassification={mockGetEffective}
        onClose={jest.fn()}
      />
    );
    expect(screen.getByRole("dialog")).toBeInTheDocument();
  });

  it("renders comparison title", () => {
    render(
      <ComparisonModal
        chemicals={mockChemicals}
        getEffectiveClassification={mockGetEffective}
        onClose={jest.fn()}
      />
    );
    expect(screen.getByText("compare.title")).toBeInTheDocument();
  });

  it("renders chemical count in subtitle", () => {
    render(
      <ComparisonModal
        chemicals={mockChemicals}
        getEffectiveClassification={mockGetEffective}
        onClose={jest.fn()}
      />
    );
    expect(screen.getByText("compare.subtitle")).toBeInTheDocument();
  });

  it("renders ClassificationComparisonTable", () => {
    render(
      <ComparisonModal
        chemicals={mockChemicals}
        getEffectiveClassification={mockGetEffective}
        onClose={jest.fn()}
      />
    );
    expect(screen.getByTestId("comparison-table")).toBeInTheDocument();
  });

  it("renders chemical names as column headers", () => {
    render(
      <ComparisonModal
        chemicals={mockChemicals}
        getEffectiveClassification={mockGetEffective}
        onClose={jest.fn()}
      />
    );
    expect(screen.getByText("Ethanol")).toBeInTheDocument();
    expect(screen.getByText("Methanol")).toBeInTheDocument();
    expect(screen.getByText("Hydrochloric acid")).toBeInTheDocument();
  });

  it("clicking overlay calls onClose", () => {
    const onClose = jest.fn();
    render(
      <ComparisonModal
        chemicals={mockChemicals}
        getEffectiveClassification={mockGetEffective}
        onClose={onClose}
      />
    );
    // Click the overlay (the outer div with role=dialog)
    fireEvent.click(screen.getByRole("dialog"));
    expect(onClose).toHaveBeenCalled();
  });

  it("clicking close button calls onClose", () => {
    const onClose = jest.fn();
    render(
      <ComparisonModal
        chemicals={mockChemicals}
        getEffectiveClassification={mockGetEffective}
        onClose={onClose}
      />
    );
    fireEvent.click(screen.getByTestId("close-comparison-btn"));
    expect(onClose).toHaveBeenCalled();
  });

  it("pressing Escape calls onClose", () => {
    const onClose = jest.fn();
    render(
      <ComparisonModal
        chemicals={mockChemicals}
        getEffectiveClassification={mockGetEffective}
        onClose={onClose}
      />
    );
    fireEvent.keyDown(window, { key: "Escape" });
    expect(onClose).toHaveBeenCalled();
  });
});
