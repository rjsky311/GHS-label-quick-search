import {
  PRINT_READINESS_STATE,
  evaluatePrintReadiness,
  inspectPrintContentFit,
} from "../printFitEngine";
import { resolvePrintLayoutConfig } from "@/constants/labelStocks";

jest.mock("@/i18n", () => ({
  t: Object.assign((key) => key, { bind: () => (key) => key }),
  language: "en",
}));

const completeProfile = {
  organization: "Lab A",
  phone: "02-1234",
  address: "Taipei",
};

const makeChemical = (statementCount = 2) => ({
  cas_number: "7647-01-0",
  name_en: "Hydrochloric Acid",
  ghs_pictograms: [{ code: "GHS04" }, { code: "GHS05" }],
  hazard_statements: Array.from(
    { length: Math.ceil(statementCount / 2) },
    (_, index) => ({
      code: `H${300 + index}`,
      text_en: `Hazard ${index}`,
    }),
  ),
  precautionary_statements: Array.from(
    { length: Math.floor(statementCount / 2) },
    (_, index) => ({
      code: `P${300 + index}`,
      text_en: `Precaution ${index}`,
    }),
  ),
  signal_word: "Danger",
});

describe("printFitEngine", () => {
  it("routes dense complete labels to A4 primary before printing", () => {
    const readiness = evaluatePrintReadiness({
      selectedForLabel: [makeChemical(24)],
      layout: {
        labelPurpose: "shipping",
        template: "full",
        size: "large",
        stockId: "large-primary",
        widthMm: 140,
        heightMm: 88,
      },
      resolvedLabProfile: completeProfile,
    });

    expect(readiness.state).toBe(
      PRINT_READINESS_STATE.TOO_DENSE_AUTO_UPGRADE,
    );
    expect(readiness.canPrint).toBe(false);
    expect(readiness.maxStatementCount).toBe(24);
    expect(readiness.issues).toEqual([
      expect.objectContaining({ type: "content-too-dense" }),
    ]);
  });

  it("allows the same dense complete label on A4 primary", () => {
    const readiness = evaluatePrintReadiness({
      selectedForLabel: [makeChemical(24)],
      layout: {
        labelPurpose: "shipping",
        template: "full",
        size: "large",
        stockId: "a4-primary",
        widthMm: 180,
        heightMm: 250,
      },
      resolvedLabProfile: completeProfile,
    });

    expect(readiness.state).toBe(PRINT_READINESS_STATE.READY_COMPLETE);
    expect(readiness.canPrint).toBe(true);
    expect(readiness.elementSummary.pictograms).toEqual({
      expected: 2,
      present: 2,
    });
  });

  it("keeps supplemental labels printable but marks them as supplemental", () => {
    const readiness = evaluatePrintReadiness({
      selectedForLabel: [makeChemical(6)],
      layout: {
        labelPurpose: "qrSupplement",
        template: "qrcode",
        size: "small",
        stockId: "small-strip",
        widthMm: 70,
        heightMm: 24,
      },
      resolvedLabProfile: {},
    });

    expect(readiness.state).toBe(PRINT_READINESS_STATE.SUPPLEMENTAL_ONLY);
    expect(readiness.canPrint).toBe(true);
    expect(readiness.elementSummary.responsibleProfile).toEqual({
      expected: 0,
      present: 0,
    });
  });

  it("blocks complete primary labels until responsible profile is complete", () => {
    const readiness = evaluatePrintReadiness({
      selectedForLabel: [makeChemical(6)],
      layout: {
        labelPurpose: "shipping",
        template: "full",
        size: "large",
        stockId: "large-primary",
        widthMm: 140,
        heightMm: 88,
      },
      resolvedLabProfile: { organization: "Lab A", phone: "02-1234" },
    });

    expect(readiness.state).toBe(PRINT_READINESS_STATE.NEEDS_PROFILE);
    expect(readiness.canPrint).toBe(false);
    expect(readiness.elementSummary.responsibleProfile).toEqual({
      expected: 3,
      present: 2,
    });
    expect(readiness.issues).toEqual([
      expect.objectContaining({ type: "responsible-profile-missing" }),
    ]);
  });

  it("shares dense content preflight with printLabels", () => {
    const chemical = makeChemical(24);
    const model = {
      layout: resolvePrintLayoutConfig({
        labelPurpose: "shipping",
        template: "full",
        stockPreset: "large-primary",
      }),
      expandedLabels: [chemical],
      customGHSSettings: {},
      resolvedLabProfile: {},
    };

    expect(inspectPrintContentFit(model)).toEqual([
      expect.objectContaining({
        type: "content-too-dense",
        statementCount: 24,
        maxStatements: 12,
      }),
    ]);
  });
});
