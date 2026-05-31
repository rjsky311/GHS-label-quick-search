import {
  applyTargetedContinuationTightness,
  collectPrintPreflightIssues,
  resolvePrintPreflightRetry,
  shouldRetryWithAutoFit,
} from "../printHandoffPreflight";

jest.mock("@/utils/printFitEngine", () => ({
  inspectPrintContentFit: jest.fn(() => [{ type: "content-text-too-dense" }]),
}));

jest.mock("@/utils/printLayoutInspection", () => ({
  inspectPrintLayoutDocument: jest.fn(() => [{ type: "label-overflow" }]),
}));

describe("printHandoffPreflight", () => {
  const baseBundle = {
    model: {
      layout: {
        template: "full",
        labelPurpose: "shipping",
        stockId: "a4-primary",
        autoFitLevel: 0,
        continuationTightnessLevel: 0,
      },
      expandedLabels: [
        {
          cas_number: "64-17-5",
          sourceChemical: { cas_number: "64-17-5" },
        },
      ],
    },
  };

  it("collects content, rendered layout, and image preflight issues together", () => {
    expect(
      collectPrintPreflightIssues(baseBundle, document, [
        { type: "required-image-failed" },
      ]),
    ).toEqual([
      { type: "content-text-too-dense" },
      { type: "label-overflow" },
      { type: "required-image-failed" },
    ]);
  });

  it("retries auto-fit before blocking layout overflow", () => {
    expect(
      resolvePrintPreflightRetry({
        documentBundle: baseBundle,
        preflightIssues: [{ type: "label-overflow" }],
        selectedForLabel: [{ cas_number: "64-17-5" }],
        labelConfig: { stockPreset: "a4-primary" },
      }),
    ).toEqual(
      expect.objectContaining({
        type: "auto-fit",
        eventName: "print_autofit_retry",
        labelConfig: expect.objectContaining({ autoFitLevel: 1 }),
        meta: expect.objectContaining({ nextAutoFitLevel: 1 }),
      }),
    );
  });

  it("does not retry when required images fail", () => {
    expect(
      shouldRetryWithAutoFit(
        [
          { type: "label-overflow" },
          { type: "required-image-failed" },
        ],
        { autoFitLevel: 0 },
      ),
    ).toBe(false);
  });

  it("targets continuation tightening to the affected chemical when auto-fit is exhausted", () => {
    const selectedForLabel = [
      { cas_number: "64-17-5", name_en: "Ethanol" },
      { cas_number: "7732-18-5", name_en: "Water" },
    ];
    const retry = resolvePrintPreflightRetry({
      documentBundle: {
        model: {
          ...baseBundle.model,
          layout: {
            ...baseBundle.model.layout,
            autoFitLevel: 4,
          },
        },
      },
      preflightIssues: [{ type: "statement-code-overflow", index: 0 }],
      selectedForLabel,
      labelConfig: { stockPreset: "a4-primary" },
    });

    expect(retry).toEqual(
      expect.objectContaining({
        type: "continuation-tightening",
        eventName: "print_continuation_tightening_retry",
        meta: expect.objectContaining({
          issueCasNumbers: ["64-17-5"],
          nextContinuationTightnessLevel: 1,
          targeted: true,
        }),
      }),
    );
    expect(retry.selectedForLabel[0].__printLayoutOverride).toEqual(
      expect.objectContaining({ continuationTightnessLevel: 1 }),
    );
    expect(retry.selectedForLabel[1]).toBe(selectedForLabel[1]);
  });

  it("keeps targeted continuation overrides immutable", () => {
    const selectedForLabel = [
      {
        cas_number: "64-17-5",
        __printLayoutOverride: { autoFitLevel: 2 },
      },
    ];

    const next = applyTargetedContinuationTightness(
      selectedForLabel,
      ["64-17-5"],
      3,
    );

    expect(next).not.toBe(selectedForLabel);
    expect(next[0]).not.toBe(selectedForLabel[0]);
    expect(next[0].__printLayoutOverride).toEqual({
      autoFitLevel: 2,
      __continuationTightnessLevel: 3,
      continuationTightnessLevel: 3,
    });
  });
});
