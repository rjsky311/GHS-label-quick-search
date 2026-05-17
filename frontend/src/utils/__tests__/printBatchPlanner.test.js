import { resolvePrintLayoutConfig } from "@/constants/labelStocks";
import {
  BATCH_PRINT_ITEM_CATEGORY,
  BATCH_PRINT_PURPOSE,
  BATCH_PRINT_SCOPE,
  buildBatchPrintPlan,
  buildBatchPrintableItems,
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

const makeVeryDenseA4BatchFixture = () =>
  batchPrintMixedFixture50.map((chemical) =>
    chemical.cas_number === "50-00-0"
      ? {
          ...chemical,
          hazard_statements: Array.from({ length: 14 }, (_, index) => ({
            code: `H${300 + index}`,
            text_en:
              "This is a very long complete-primary hazard statement retained for a high-density A4 continuation set with readable bilingual wrapping and no clipped label content.",
          })),
          precautionary_statements: Array.from({ length: 30 }, (_, index) => ({
            code: `P${300 + index}`,
            text_en:
              "This is a very long precautionary statement retained for same-stock continuation printing so the batch planner still covers truly oversized full-page content.",
          })),
        }
      : chemical,
  );

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

  it("keeps QR small-label batch intent on the selected stock and continues dense pictogram sets", () => {
    const plan = buildBatchPrintPlan({
      selectedForLabel: batchPrintMixedFixture50,
      layout: smallStripLayout,
      purpose: BATCH_PRINT_PURPOSE.SUPPLEMENTAL,
      resolvedLabProfile: {},
      locale: "en-US",
    });

    expect(plan.stockPreset).toBe("small-strip");
    expect(plan.summary.printableByDefault).toBeGreaterThan(0);
    expect(plan.summary.counts[BATCH_PRINT_ITEM_CATEGORY.EXCLUDED_FIT]).toBe(0);
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
        category: BATCH_PRINT_ITEM_CATEGORY.EXCLUDED_DATA,
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

  it("materializes acknowledged reduced-purpose items on the same physical stock", () => {
    const plan = buildBatchPrintPlan({
      selectedForLabel: batchPrintMixedFixture50,
      layout: largePrimaryLayout,
      purpose: BATCH_PRINT_PURPOSE.COMPLETE,
      resolvedLabProfile: completeProfile,
      locale: "en-US",
    });

    const readyOnly = buildBatchPrintableItems(plan);
    const withAcknowledged = buildBatchPrintableItems(plan, {
      scope: BATCH_PRINT_SCOPE.READY_AND_ACKNOWLEDGED,
    });
    const reducedItem = withAcknowledged.find(
      (item) => item.cas_number === "7647-01-0",
    );

    expect(readyOnly).toHaveLength(plan.summary.printableByDefault);
    expect(withAcknowledged.length).toBeGreaterThan(readyOnly.length);
    expect(reducedItem.__batchPrintItem).toEqual(
      expect.objectContaining({
        category: BATCH_PRINT_ITEM_CATEGORY.REDUCED_PURPOSE,
        preferredPurpose: BATCH_PRINT_PURPOSE.COMPLETE,
        effectivePurpose: BATCH_PRINT_PURPOSE.QUICK_ID,
      }),
    );
    expect(reducedItem.__printLayoutOverride.stockPreset).toBe("large-primary");
    expect(reducedItem.__printLayoutOverride.template).toBe("icon");
  });

  it("classifies very dense A4 complete labels as same-stock continuation", () => {
    const plan = buildBatchPrintPlan({
      selectedForLabel: makeVeryDenseA4BatchFixture(),
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

  it("materializes same-stock continuation items in the default print set", () => {
    const plan = buildBatchPrintPlan({
      selectedForLabel: makeVeryDenseA4BatchFixture(),
      layout: a4PrimaryLayout,
      purpose: BATCH_PRINT_PURPOSE.COMPLETE,
      resolvedLabProfile: completeProfile,
      locale: "en-US",
    });

    const readyOnly = buildBatchPrintableItems(plan);
    const continuationItem = readyOnly.find(
      (item) => item.cas_number === "50-00-0",
    );

    expect(readyOnly.some((item) => item.cas_number === "50-00-0")).toBe(
      true,
    );
    expect(continuationItem.__batchPrintItem).toEqual(
      expect.objectContaining({
        category: BATCH_PRINT_ITEM_CATEGORY.SAME_STOCK_CONTINUATION,
        preferredPurpose: BATCH_PRINT_PURPOSE.COMPLETE,
        effectivePurpose: BATCH_PRINT_PURPOSE.COMPLETE,
      }),
    );
    expect(continuationItem.__printLayoutOverride.stockPreset).toBe(
      "a4-primary",
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
