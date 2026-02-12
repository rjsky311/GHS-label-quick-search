import { render, screen, fireEvent } from "@testing-library/react";
import ClassificationComparisonTable from "../ClassificationComparisonTable";

// ── Test fixtures ──

const cls1 = {
  pictograms: [
    { code: "GHS02", name_zh: "易燃" },
    { code: "GHS07", name_zh: "感嘆號" },
  ],
  hazard_statements: [
    { code: "H225", text_zh: "高度易燃液體和蒸氣", text_en: "Highly flammable liquid and vapour" },
    { code: "H319", text_zh: "造成嚴重眼睛刺激", text_en: "Causes serious eye irritation" },
  ],
  signal_word: "Danger",
  signal_word_zh: "危險",
  source: null,
};

const cls2 = {
  pictograms: [
    { code: "GHS07", name_zh: "感嘆號" },
  ],
  hazard_statements: [
    { code: "H302", text_zh: "吞食有害", text_en: "Harmful if swallowed" },
  ],
  signal_word: "Warning",
  signal_word_zh: "警告",
  source: "ECHA C&L Inventory notification",
};

const cls3 = {
  pictograms: [
    { code: "GHS02", name_zh: "易燃" },
    { code: "GHS05", name_zh: "腐蝕性" },
  ],
  hazard_statements: [
    { code: "H225", text_zh: "高度易燃液體和蒸氣", text_en: "Highly flammable liquid and vapour" },
    { code: "H314", text_zh: "造成嚴重皮膚灼傷和眼睛損傷", text_en: "Causes severe skin burns and serious eye damage" },
  ],
  signal_word: "Danger",
  signal_word_zh: "危險",
  source: "ECHA C&L alternative",
};

const makeColumns = (classifications, mode) =>
  classifications.map((cls, idx) => ({
    label: mode === "same-chemical"
      ? (idx === 0 ? "Default" : `Class. ${idx + 1}`)
      : `Chemical ${idx + 1}`,
    sublabel: mode === "cross-chemical" ? `64-17-${idx}` : undefined,
    classification: cls,
    index: idx,
  }));

// ── Tests ──

describe("ClassificationComparisonTable", () => {
  describe("Same-chemical mode", () => {
    it("renders column headers with classification labels", () => {
      const columns = makeColumns([cls1, cls2, cls3], "same-chemical");
      render(
        <ClassificationComparisonTable
          mode="same-chemical"
          columns={columns}
          selectedIndex={0}
          onSelectClassification={jest.fn()}
        />
      );
      expect(screen.getByText("Default")).toBeInTheDocument();
      expect(screen.getByText("Class. 2")).toBeInTheDocument();
      expect(screen.getByText("Class. 3")).toBeInTheDocument();
    });

    it("renders pictograms via GHSImage for each column", () => {
      const columns = makeColumns([cls1, cls2], "same-chemical");
      render(
        <ClassificationComparisonTable
          mode="same-chemical"
          columns={columns}
          selectedIndex={0}
          onSelectClassification={jest.fn()}
        />
      );
      // cls1 has GHS02 + GHS07, cls2 has GHS07
      // Both should show GHS07 images
      const ghsImages = screen.getAllByRole("img");
      expect(ghsImages.length).toBeGreaterThanOrEqual(2);
    });

    it("shows dashed placeholder for absent pictograms", () => {
      const columns = makeColumns([cls1, cls2], "same-chemical");
      render(
        <ClassificationComparisonTable
          mode="same-chemical"
          columns={columns}
          selectedIndex={0}
          onSelectClassification={jest.fn()}
        />
      );
      // cls2 is missing GHS02 — should see absent placeholder
      expect(screen.getByTestId("absent-GHS02-1")).toBeInTheDocument();
    });

    it("renders signal words with correct text", () => {
      const columns = makeColumns([cls1, cls2], "same-chemical");
      render(
        <ClassificationComparisonTable
          mode="same-chemical"
          columns={columns}
          selectedIndex={0}
          onSelectClassification={jest.fn()}
        />
      );
      expect(screen.getByTestId("signal-word-0")).toHaveTextContent("危險");
      expect(screen.getByTestId("signal-word-1")).toHaveTextContent("警告");
    });

    it("highlights differing signal words with background tint", () => {
      const columns = makeColumns([cls1, cls2], "same-chemical");
      render(
        <ClassificationComparisonTable
          mode="same-chemical"
          columns={columns}
          selectedIndex={0}
          onSelectClassification={jest.fn()}
        />
      );
      // Danger cell should have bg-red-900/10 when signals differ
      const dangerBadge = screen.getByTestId("signal-word-0");
      expect(dangerBadge.closest("td").className).toContain("bg-red-900/10");
    });

    it("marks unique hazard statements with blue border", () => {
      const columns = makeColumns([cls1, cls2, cls3], "same-chemical");
      render(
        <ClassificationComparisonTable
          mode="same-chemical"
          columns={columns}
          selectedIndex={0}
          onSelectClassification={jest.fn()}
        />
      );
      // H319 is only in cls1 — should be marked unique
      expect(screen.getByTestId("unique-H319-0")).toBeInTheDocument();
      // H302 is only in cls2
      expect(screen.getByTestId("unique-H302-1")).toBeInTheDocument();
      // H314 is only in cls3
      expect(screen.getByTestId("unique-H314-2")).toBeInTheDocument();
    });

    it("shows source row in same-chemical mode", () => {
      const columns = makeColumns([cls1, cls2], "same-chemical");
      render(
        <ClassificationComparisonTable
          mode="same-chemical"
          columns={columns}
          selectedIndex={0}
          onSelectClassification={jest.fn()}
        />
      );
      expect(screen.getByText("compare.rowSource")).toBeInTheDocument();
      expect(screen.getByText("ECHA C&L Inventory notification")).toBeInTheDocument();
    });

    it("shows Current badge on selected column and Set as primary on others", () => {
      const columns = makeColumns([cls1, cls2], "same-chemical");
      render(
        <ClassificationComparisonTable
          mode="same-chemical"
          columns={columns}
          selectedIndex={0}
          onSelectClassification={jest.fn()}
        />
      );
      expect(screen.getByText("compare.currentBadge")).toBeInTheDocument();
      expect(screen.getByTestId("set-primary-1")).toBeInTheDocument();
    });

    it("calls onSelectClassification when clicking set-as-primary", () => {
      const onSelect = jest.fn();
      const columns = makeColumns([cls1, cls2], "same-chemical");
      render(
        <ClassificationComparisonTable
          mode="same-chemical"
          columns={columns}
          selectedIndex={0}
          onSelectClassification={onSelect}
        />
      );
      fireEvent.click(screen.getByTestId("set-primary-1"));
      expect(onSelect).toHaveBeenCalledWith(1);
    });

    it("renders comparison-table testid", () => {
      const columns = makeColumns([cls1], "same-chemical");
      render(
        <ClassificationComparisonTable
          mode="same-chemical"
          columns={columns}
          selectedIndex={0}
          onSelectClassification={jest.fn()}
        />
      );
      expect(screen.getByTestId("comparison-table")).toBeInTheDocument();
    });
  });

  describe("Cross-chemical mode", () => {
    it("renders chemical names and CAS as sublabels", () => {
      const columns = makeColumns([cls1, cls2], "cross-chemical");
      render(
        <ClassificationComparisonTable
          mode="cross-chemical"
          columns={columns}
          selectedIndex={null}
        />
      );
      expect(screen.getByText("Chemical 1")).toBeInTheDocument();
      expect(screen.getByText("Chemical 2")).toBeInTheDocument();
      expect(screen.getByText("64-17-0")).toBeInTheDocument();
      expect(screen.getByText("64-17-1")).toBeInTheDocument();
    });

    it("does not show source row", () => {
      const columns = makeColumns([cls1, cls2], "cross-chemical");
      render(
        <ClassificationComparisonTable
          mode="cross-chemical"
          columns={columns}
          selectedIndex={null}
        />
      );
      expect(screen.queryByText("compare.rowSource")).not.toBeInTheDocument();
    });

    it("does not show set-as-primary buttons", () => {
      const columns = makeColumns([cls1, cls2], "cross-chemical");
      render(
        <ClassificationComparisonTable
          mode="cross-chemical"
          columns={columns}
          selectedIndex={null}
        />
      );
      expect(screen.queryByText("compare.setAsPrimary")).not.toBeInTheDocument();
      expect(screen.queryByText("compare.currentBadge")).not.toBeInTheDocument();
    });

    it("renders pictograms and absent placeholders", () => {
      const columns = makeColumns([cls1, cls2], "cross-chemical");
      render(
        <ClassificationComparisonTable
          mode="cross-chemical"
          columns={columns}
          selectedIndex={null}
        />
      );
      // cls2 lacks GHS02
      expect(screen.getByTestId("absent-GHS02-1")).toBeInTheDocument();
    });

    it("handles empty classification gracefully", () => {
      const emptyCls = {
        pictograms: [],
        hazard_statements: [],
        signal_word: null,
        signal_word_zh: null,
      };
      const columns = makeColumns([cls1, emptyCls], "cross-chemical");
      render(
        <ClassificationComparisonTable
          mode="cross-chemical"
          columns={columns}
          selectedIndex={null}
        />
      );
      // Should render without crashing, empty column shows "None"
      expect(screen.getByTestId("comparison-table")).toBeInTheDocument();
    });
  });
});
