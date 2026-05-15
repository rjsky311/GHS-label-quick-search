import { resolvePrintLayoutConfig } from "@/constants/labelStocks";
import {
  BATCH_PRINT_ITEM_CATEGORY,
  BATCH_PRINT_PURPOSE,
  buildBatchPrintPlan,
} from "../printBatchPlanner";
import { batchPrintMixedFixture50 } from "../testFixtures/batchPrintFixtures";

jest.mock("@/i18n", () => ({
  t: Object.assign((key) => key, { bind: () => (key) => key }),
  language: "en",
}));

const completeProfile = {
  organization: "Lab A",
  phone: "02-1234",
  address: "Taipei",
};

const smallStripLayout = resolvePrintLayoutConfig({
  stockPreset: "small-strip",
  nameDisplay: "both",
});

const largePrimaryLayout = resolvePrintLayoutConfig({
  stockPreset: "large-primary",
  nameDisplay: "both",
});

const a4PrimaryLayout = resolvePrintLayoutConfig({
  stockPreset: "a4-primary",
  nameDisplay: "both",
});

describe("printBatchPlanner", () => {
  it("ships a reusable 50-item mixed batch fixture", () => {
    expect(batchPrintMixedFixture50).toHaveLength(50);
    expect(
      batchPrintMixedFixture50.some(
        (chemical) => chemical.upstream_error === true,
      ),
    ).toBe(true);
    expect(
      batchPrintMixedFixture50.some(
        (chemical) =>
          chemical.ghs_pictograms.length === 0 &&
          chemical.hazard_statements.length > 0,
      ),
    ).toBe(true);
  });

  it("plans quick-ID batches on one fixed stock without forcing dense items to A4", () => {
    const plan = buildBatchPrintPlan({
      selectedForLabel: batchPrintMixedFixture50,
      layout: smallStripLayout,
      purpose: BATCH_PRINT_PURPOSE.QUICK_ID,
      resolvedLabProfile: {},
      locale: "en-US",
    });

    expect(plan.stockPreset).toBe("small-strip");
    expect(plan.purpose).toBe(BATCH_PRINT_PURPOSE.QUICK_ID);
    expect(plan.summary.total).toBe(50);
    expect(plan.summary.counts[BATCH_PRINT_ITEM_CATEGORY.READY]).toBeGreaterThan(
      0,
    );
    expect(
      plan.summary.counts[BATCH_PRINT_ITEM_CATEGORY.EXCLUDED_DATA],
    ).toBeGreaterThanOrEqual(3);
    expect(
      plan.summary.counts[BATCH_PRINT_ITEM_CATEGORY.EXCLUDED_FIT],
    ).toBeGreaterThanOrEqual(1);
    expect(plan.summary.canPrintDefaultScope).toBe(true);
    expect(new Set(plan.items.map((item) => item.layout.stockPreset))).toEqual(
      new Set(["small-strip"]),
    );
    expect(
      plan.items.find((item) => item.cas === "7647-01-0").category,
    ).toBe(BATCH_PRINT_ITEM_CATEGORY.READY);
    expect(
      plan.items.find((item) => item.cas === "7782-44-7").reason.type,
    ).toBe("text-only-ghs-needs-hazard-text");
  });

  it("keeps supplemental batch intent on the selected stock and isolates unfit items", () => {
    const plan = buildBatchPrintPlan({
      selectedForLabel: batchPrintMixedFixture50,
      layout: smallStripLayout,
      purpose: BATCH_PRINT_PURPOSE.SUPPLEMENTAL,
      resolvedLabProfile: {},
      locale: "en-US",
    });

    expect(plan.stockPreset).toBe("small-strip");
    expect(plan.summary.printableByDefault).toBeGreaterThan(0);
    expect(
      plan.summary.counts[BATCH_PRINT_ITEM_CATEGORY.EXCLUDED_FIT],
    ).toBeGreaterThan(0);
    expect(new Set(plan.items.map((item) => item.layout.stockPreset))).toEqual(
      new Set(["small-strip"]),
    );
    expect(plan.representatives.worstFit).toEqual(
      expect.objectContaining({
        index: expect.any(Number),
        metrics: expect.objectContaining({ fitPressure: expect.any(Number) }),
      }),
    );
    expect(plan.representatives.excluded).toEqual(
      expect.objectContaining({
        category: expect.stringMatching(/^excluded-/),
      }),
    );
    expect(
      plan.items.find((item) => item.cas === "7782-44-7").category,
    ).toBe(BATCH_PRINT_ITEM_CATEGORY.READY);
  });

  it("does not let one dense complete-primary item block printable same-stock items", () => {
    const plan = buildBatchPrintPlan({
      selectedForLabel: batchPrintMixedFixture50,
      layout: largePrimaryLayout,
      purpose: BATCH_PRINT_PURPOSE.COMPLETE,
      resolvedLabProfile: completeProfile,
      locale: "en-US",
    });

    expect(plan.stockPreset).toBe("large-primary");
    expect(plan.summary.counts[BATCH_PRINT_ITEM_CATEGORY.READY]).toBeGreaterThan(
      0,
    );
    expect(
      plan.summary.counts[BATCH_PRINT_ITEM_CATEGORY.REDUCED_PURPOSE],
    ).toBeGreaterThan(0);
    expect(plan.summary.canPrintDefaultScope).toBe(true);
    expect(
      plan.items.find((item) => item.cas === "7647-01-0").category,
    ).toBe(BATCH_PRINT_ITEM_CATEGORY.REDUCED_PURPOSE);
    expect(new Set(plan.items.map((item) => item.layout.stockPreset))).toEqual(
      new Set(["large-primary"]),
    );
  });

  it("classifies very dense A4 complete labels as same-stock continuation", () => {
    const plan = buildBatchPrintPlan({
      selectedForLabel: batchPrintMixedFixture50,
      layout: a4PrimaryLayout,
      purpose: BATCH_PRINT_PURPOSE.COMPLETE,
      resolvedLabProfile: completeProfile,
      locale: "en-US",
    });

    expect(plan.stockPreset).toBe("a4-primary");
    expect(
      plan.summary.counts[BATCH_PRINT_ITEM_CATEGORY.SAME_STOCK_CONTINUATION],
    ).toBeGreaterThan(0);
    expect(
      plan.items.find((item) => item.cas === "50-00-0"),
    ).toEqual(
      expect.objectContaining({
        category: BATCH_PRINT_ITEM_CATEGORY.SAME_STOCK_CONTINUATION,
        continuation: true,
      }),
    );
    expect(new Set(plan.items.map((item) => item.layout.stockPreset))).toEqual(
      new Set(["a4-primary"]),
    );
  });

  it("treats missing complete-profile data as per-item data exclusion", () => {
    const plan = buildBatchPrintPlan({
      selectedForLabel: [batchPrintMixedFixture50[1]],
      layout: largePrimaryLayout,
      purpose: BATCH_PRINT_PURPOSE.COMPLETE,
      resolvedLabProfile: { organization: "Lab A" },
      locale: "en-US",
    });

    expect(plan.summary.counts[BATCH_PRINT_ITEM_CATEGORY.EXCLUDED_DATA]).toBe(1);
    expect(plan.items[0].reason.type).toBe("responsible-profile-missing");
    expect(plan.summary.canPrintDefaultScope).toBe(false);
  });
});
