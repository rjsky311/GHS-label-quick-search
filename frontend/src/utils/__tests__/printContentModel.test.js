import {
  PRINT_LABEL_ELEMENT_STATUS,
  buildPrintLabelContent,
  resolveEffectiveChemicalForPrint,
} from "../printContentModel";

const baseChemical = {
  cas_number: "7647-01-0",
  name_en: "Hydrochloric Acid",
  name_zh: "Hydrochloric Acid ZH",
  ghs_pictograms: [{ code: "GHS05" }, { code: "GHS07" }],
  hazard_statements: [{ code: "H314", text_en: "Causes severe burns." }],
  precautionary_statements: [{ code: "P280", text_en: "Wear gloves." }],
  signal_word: "Danger",
};

describe("printContentModel", () => {
  it("builds a required-element model for complete primary labels", () => {
    const content = buildPrintLabelContent(baseChemical, {
      layout: { labelPurpose: "shipping", template: "full" },
      resolvedLabProfile: {
        organization: "Lab A",
        phone: "02-1234",
        address: "Taipei",
      },
    });

    expect(content.counts).toEqual({
      pictograms: 2,
      hazardStatements: 1,
      precautionaryStatements: 1,
      statements: 2,
    });
    expect(content.elementStatus.pictograms).toBe(
      PRINT_LABEL_ELEMENT_STATUS.PRESENT,
    );
    expect(content.elementStatus.responsibleProfile).toBe(
      PRINT_LABEL_ELEMENT_STATUS.PRESENT,
    );
    expect(content.policy).toEqual(
      expect.objectContaining({
        isCompletePrimary: true,
        pictogramsMustRender: true,
        qrCanReplaceRequiredElements: false,
      }),
    );
  });

  it("marks responsible profile missing only for complete primary labels", () => {
    const primary = buildPrintLabelContent(baseChemical, {
      layout: { labelPurpose: "shipping", template: "full" },
      resolvedLabProfile: {},
    });
    const partialPrimary = buildPrintLabelContent(baseChemical, {
      layout: { labelPurpose: "shipping", template: "full" },
      resolvedLabProfile: { organization: "Lab A", phone: "02-1234" },
    });
    const supplement = buildPrintLabelContent(baseChemical, {
      layout: { labelPurpose: "qrSupplement", template: "qrcode" },
      resolvedLabProfile: {},
    });

    expect(primary.elementStatus.responsibleProfile).toBe(
      PRINT_LABEL_ELEMENT_STATUS.MISSING,
    );
    expect(partialPrimary.elementStatus.responsibleProfile).toBe(
      PRINT_LABEL_ELEMENT_STATUS.MISSING,
    );
    expect(supplement.elementStatus.responsibleProfile).toBe(
      PRINT_LABEL_ELEMENT_STATUS.NOT_APPLICABLE,
    );
  });

  it("applies custom GHS classification overrides before counting output", () => {
    const chemical = {
      ...baseChemical,
      other_classifications: [
        {
          pictograms: [{ code: "GHS06" }],
          hazard_statements: [{ code: "H301", text_en: "Toxic if swallowed." }],
          precautionary_statements: [],
          signal_word: "Danger",
        },
      ],
    };
    const customGHSSettings = {
      "7647-01-0": { selectedIndex: 1, note: "Use toxic classification" },
    };

    const effective = resolveEffectiveChemicalForPrint(
      chemical,
      customGHSSettings,
    );
    const content = buildPrintLabelContent(chemical, {
      customGHSSettings,
      layout: { labelPurpose: "shipping", template: "full" },
    });

    expect(effective.ghs_pictograms).toEqual([{ code: "GHS06" }]);
    expect(content.counts.pictograms).toBe(1);
    expect(content.counts.hazardStatements).toBe(1);
    expect(content.counts.precautionaryStatements).toBe(0);
  });
});
