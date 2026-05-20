import { render, screen, fireEvent, within } from "@testing-library/react";
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
  report_count: null,
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
  report_count: "236",
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
  report_count: "4",
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

const forceMatchMedia = (matches) => {
  const originalMatchMedia = window.matchMedia;
  Object.defineProperty(window, "matchMedia", {
    configurable: true,
    writable: true,
    value: jest.fn().mockImplementation((query) => ({
      matches,
      media: query,
      onchange: null,
      addEventListener: jest.fn(),
      removeEventListener: jest.fn(),
      addListener: jest.fn(),
      removeListener: jest.fn(),
      dispatchEvent: jest.fn(),
    })),
  });

  return () => {
    if (originalMatchMedia) {
      Object.defineProperty(window, "matchMedia", {
        configurable: true,
        writable: true,
        value: originalMatchMedia,
      });
    } else {
      delete window.matchMedia;
    }
  };
};

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

    it("renders pictograms through the shared GHS pictogram strip for each column", () => {
      const columns = makeColumns([cls1, cls2], "same-chemical");
      render(
        <ClassificationComparisonTable
          mode="same-chemical"
          columns={columns}
          selectedIndex={0}
          onSelectClassification={jest.fn()}
        />
      );
      const firstColumn = screen.getByTestId("comparison-pictograms-0");
      const secondColumn = screen.getByTestId("comparison-pictograms-1");
      const firstStrip = within(firstColumn).getByTestId("ghs-pictogram-strip");
      const secondStrip = within(secondColumn).getByTestId("ghs-pictogram-strip");

      expect(firstStrip).toHaveAttribute("data-size", "md");
      expect(firstStrip).toHaveAttribute("data-variant", "selected");
      expect(firstStrip).toHaveAttribute("data-count", "2");
      expect(secondStrip).toHaveAttribute("data-variant", "comparison");
      expect(secondStrip).toHaveAttribute("data-count", "1");
      expect(within(firstColumn).getAllByTestId("ghs-pictogram-frame")[0]).toHaveClass(
        "h-11",
        "w-11",
        "rounded-md",
      );
      expect(within(firstColumn).getAllByTestId("ghs-pictogram-code")[0]).toHaveTextContent(
        "GHS02",
      );
      expect(screen.getByTestId("present-GHS02-0")).toBeInTheDocument();
      expect(screen.getByTestId("present-GHS07-1")).toBeInTheDocument();
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
      expect(screen.getByTestId("absent-GHS02-1")).toHaveClass(
        "border-dashed",
        "font-mono",
      );
    });

    it("renders signal words with the current UI locale", () => {
      const columns = makeColumns([cls1, cls2], "same-chemical");
      render(
        <ClassificationComparisonTable
          mode="same-chemical"
          columns={columns}
          selectedIndex={0}
          onSelectClassification={jest.fn()}
        />
      );
      expect(screen.getByTestId("signal-word-0")).toHaveTextContent("Danger");
      expect(screen.getByTestId("signal-word-1")).toHaveTextContent("Warning");
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
      // Danger cell should have the light danger tint when signals differ
      const dangerBadge = screen.getByTestId("signal-word-0");
      expect(dangerBadge.closest("td").className).toContain("bg-red-50");
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

    it("shows ranking evidence in same-chemical mode", () => {
      const columns = makeColumns([cls1, cls2], "same-chemical");
      render(
        <ClassificationComparisonTable
          mode="same-chemical"
          columns={columns}
          selectedIndex={0}
          onSelectClassification={jest.fn()}
        />
      );

      expect(screen.getByText("compare.rowEvidence")).toBeInTheDocument();
      expect(screen.getByTestId("comparison-evidence-panel-0")).toBeInTheDocument();
      expect(screen.getByTestId("comparison-evidence-panel-1")).toBeInTheDocument();
      expect(screen.getByTestId("comparison-evidence-badge-selected-0")).toBeInTheDocument();
      expect(screen.getByTestId("comparison-evidence-badge-report-count-0")).toHaveTextContent(
        "compare.evidenceNoReportCount",
      );
      expect(screen.getByTestId("comparison-evidence-badge-report-count-1")).toHaveTextContent(
        "compare.evidenceReportCount",
      );
      expect(screen.getByTestId("comparison-evidence-badge-source-1")).toHaveTextContent(
        "compare.evidenceSourceEcha",
      );
      expect(screen.getByTestId("comparison-evidence-badge-coverage-1")).toHaveTextContent(
        "compare.evidenceCoverage",
      );
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

    it("uses readable cards on narrow viewports", () => {
      const restoreMatchMedia = forceMatchMedia(true);
      try {
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

        expect(screen.getByTestId("comparison-table")).toHaveAttribute(
          "data-layout",
          "mobile-cards",
        );
        expect(screen.getByTestId("comparison-mobile-card-0")).toBeInTheDocument();
        expect(screen.getByTestId("comparison-mobile-card-1")).toBeInTheDocument();
        expect(screen.getByTestId("comparison-mobile-pictograms-0")).toBeInTheDocument();
        expect(screen.getByTestId("comparison-mobile-evidence-panel-0")).toBeInTheDocument();
        expect(screen.getByTestId("comparison-mobile-evidence-panel-1")).toBeInTheDocument();
        expect(screen.getByTestId("mobile-absent-GHS02-1")).toBeInTheDocument();

        fireEvent.click(screen.getByTestId("mobile-set-primary-1"));
        expect(onSelect).toHaveBeenCalledWith(1);
      } finally {
        restoreMatchMedia();
      }
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
      expect(screen.queryByText("compare.rowEvidence")).not.toBeInTheDocument();
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

  // ── Precautionary Statements row (v1.8 M0 PR-B) ──
  describe("Precautionary statements row", () => {
    const clsWithP = {
      ...cls1,
      precautionary_statements: [
        { code: "P210", text_en: "Keep away from heat.", text_zh: "遠離熱源。" },
        { code: "P301+P310", text_en: "IF SWALLOWED: Call a POISON CENTER.", text_zh: "如誤吞食：立即呼叫毒物中心。" },
      ],
    };
    const clsNoP = {
      ...cls2,
      precautionary_statements: [],
    };

    it("renders precautionary row header when any column has P-codes", () => {
      const columns = makeColumns([clsWithP, clsNoP], "same-chemical");
      render(
        <ClassificationComparisonTable
          mode="same-chemical"
          columns={columns}
          selectedIndex={0}
        />
      );
      expect(screen.getByText("compare.rowPrecautions")).toBeInTheDocument();
    });

    it("does NOT render precautionary row when no column has P-codes", () => {
      // cls1 and cls2 in the default fixtures have no precautionary_statements field at all
      const columns = makeColumns([cls1, cls2], "same-chemical");
      render(
        <ClassificationComparisonTable
          mode="same-chemical"
          columns={columns}
          selectedIndex={0}
        />
      );
      // The header label must not appear — row is suppressed entirely
      expect(screen.queryByText("compare.rowPrecautions")).not.toBeInTheDocument();
    });

    it("renders P-code values and localized text for the column that has them", () => {
      const columns = makeColumns([clsWithP, clsNoP], "same-chemical");
      render(
        <ClassificationComparisonTable
          mode="same-chemical"
          columns={columns}
          selectedIndex={0}
        />
      );
      expect(screen.getByText("P210")).toBeInTheDocument();
      expect(screen.getByText("P301+P310")).toBeInTheDocument();
      // The default test locale is English, so localized text resolves to English.
      expect(screen.getByText("Keep away from heat.")).toBeInTheDocument();
    });

    it("renders compare.noPrecautions for the column missing P-codes", () => {
      const columns = makeColumns([clsWithP, clsNoP], "same-chemical");
      render(
        <ClassificationComparisonTable
          mode="same-chemical"
          columns={columns}
          selectedIndex={0}
        />
      );
      // The column without P-codes shows the "none" placeholder
      expect(screen.getByText("compare.noPrecautions")).toBeInTheDocument();
    });

    it("keeps combined P-codes intact (not split into P301 and P310)", () => {
      const columns = makeColumns([clsWithP, clsNoP], "same-chemical");
      render(
        <ClassificationComparisonTable
          mode="same-chemical"
          columns={columns}
          selectedIndex={0}
        />
      );
      expect(screen.getByText("P301+P310")).toBeInTheDocument();
      // The bare "P301" should NOT appear as a separate badge
      expect(screen.queryByText("P301")).not.toBeInTheDocument();
      expect(screen.queryByText("P310")).not.toBeInTheDocument();
    });

    it("works in cross-chemical mode as well", () => {
      const clsChemA = {
        ...cls1,
        precautionary_statements: [
          { code: "P210", text_en: "Keep away from heat.", text_zh: "遠離熱源。" },
        ],
      };
      const clsChemB = {
        ...cls3,
        precautionary_statements: [
          { code: "P280", text_en: "Wear protective gloves.", text_zh: "戴防護手套。" },
        ],
      };
      const columns = makeColumns([clsChemA, clsChemB], "cross-chemical");
      render(
        <ClassificationComparisonTable
          mode="cross-chemical"
          columns={columns}
          selectedIndex={null}
        />
      );
      expect(screen.getByText("compare.rowPrecautions")).toBeInTheDocument();
      expect(screen.getByText("P210")).toBeInTheDocument();
      expect(screen.getByText("P280")).toBeInTheDocument();
    });
  });
});
