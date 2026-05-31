import { renderHook } from "@testing-library/react";
import useLabelPrintPreviewState from "../useLabelPrintPreviewState";
import { buildBatchPrintableItems } from "@/utils/printBatchPlanner";

jest.mock("@/utils/printBatchPlanner", () => ({
  BATCH_PRINT_REPRESENTATIVE: {
    FIRST: "first",
    WORST_FIT: "worstFit",
  },
  buildBatchPrintableItems: jest.fn((plan) =>
    plan.items.flatMap((item) => item.printItems || []),
  ),
}));

describe("useLabelPrintPreviewState", () => {
  beforeEach(() => {
    buildBatchPrintableItems.mockClear();
  });

  const basePrintPlan = {
    representatives: {
      first: { index: 0 },
      worstFit: { index: 1 },
    },
    items: [
      {
        index: 0,
        cas: "64-17-5",
        chemical: { cas_number: "64-17-5", name_en: "Ethanol" },
        printItems: [
          {
            cas_number: "64-17-5",
            __printLayoutOverride: { stockPreset: "quick-id", template: "icon" },
          },
        ],
      },
      {
        index: 1,
        cas: "7732-18-5",
        chemical: { cas_number: "7732-18-5", name_en: "Water" },
        printItems: [],
      },
    ],
  };

  it("uses the selected batch item and merges its print layout override", () => {
    const { result } = renderHook(() =>
      useLabelPrintPreviewState({
        batchPreviewItemIndex: 0,
        batchPreviewRepresentative: "worstFit",
        batchPrintPlan: basePrintPlan,
        batchSelectedPrintItems: [],
        canPrintBatchSelectedScope: false,
        effectiveLabelConfig: { stockPreset: "a4-primary", template: "full" },
        hasBatchPrintPlan: true,
        labelQuantities: { "64-17-5": 4 },
        selectedForLabel: [{ cas_number: "67-64-1" }],
      }),
    );

    expect(result.current.activeBatchPreviewItem.index).toBe(0);
    expect(result.current.previewSourceItems).toEqual([
      expect.objectContaining({ cas_number: "64-17-5" }),
    ]);
    expect(result.current.previewLabelConfig).toEqual({
      stockPreset: "quick-id",
      template: "icon",
    });
    expect(result.current.previewLabelQuantities).toEqual({ "64-17-5": 1 });
  });

  it("falls back to the representative item and builds sheet quantities for batch scope", () => {
    const batchSelectedPrintItems = [
      { cas_number: "64-17-5" },
      { cas_number: "7732-18-5" },
    ];

    const { result } = renderHook(() =>
      useLabelPrintPreviewState({
        batchPreviewItemIndex: 99,
        batchPreviewRepresentative: "worstFit",
        batchPrintPlan: basePrintPlan,
        batchSelectedPrintItems,
        canPrintBatchSelectedScope: true,
        effectiveLabelConfig: { stockPreset: "a4-primary", template: "full" },
        hasBatchPrintPlan: true,
        labelQuantities: { "64-17-5": 2 },
        selectedForLabel: [{ cas_number: "67-64-1" }],
      }),
    );

    expect(result.current.activeBatchPreviewItem.index).toBe(1);
    expect(result.current.previewSourceItems).toEqual([
      { cas_number: "7732-18-5", name_en: "Water" },
    ]);
    expect(result.current.sheetPreviewItems).toBe(batchSelectedPrintItems);
    expect(result.current.sheetPreviewQuantities).toEqual({
      "64-17-5": 2,
      "7732-18-5": 1,
    });
  });
});
