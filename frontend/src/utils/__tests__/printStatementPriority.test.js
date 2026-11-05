import {
  HAZARD_PRIORITY_TIER,
  getHazardStatementPriority,
  planHazardStatementsForBudget,
  prioritizeHazardStatements,
  prioritizePrecautionaryStatements,
} from "../printStatementPriority";

const statements = (...codes) => codes.map((code) => ({ code }));
const codesOf = (items) => items.map((item) => item.code);

describe("printStatementPriority", () => {
  it("ranks H350 (may cause cancer) before H315 (skin irritation)", () => {
    const ordered = codesOf(
      prioritizeHazardStatements(statements("H315", "H350")),
    );
    expect(ordered.indexOf("H350")).toBeLessThan(ordered.indexOf("H315"));
  });

  it("orders benzene by severity, chronic category 1 hazards first", () => {
    const benzene = statements(
      "H225",
      "H304",
      "H315",
      "H319",
      "H340",
      "H350",
      "H372",
    );
    expect(codesOf(prioritizeHazardStatements(benzene))).toEqual([
      "H304",
      "H340",
      "H350",
      "H372",
      "H225",
      "H315",
      "H319",
    ]);
  });

  it("ranks suspected (category 2) chronic hazards above physical and irritant hazards but below category 1", () => {
    const ordered = codesOf(
      prioritizeHazardStatements(
        statements("H319", "H225", "H351", "H290", "H350", "H373"),
      ),
    );
    expect(ordered).toEqual(["H350", "H351", "H373", "H225", "H290", "H319"]);
  });

  it("keeps CLP suffix variants at their parent rank", () => {
    expect(getHazardStatementPriority({ code: "H350i" })).toBe(
      HAZARD_PRIORITY_TIER.SEVERE,
    );
    expect(getHazardStatementPriority({ code: "H360FD" })).toBe(
      HAZARD_PRIORITY_TIER.SEVERE,
    );
    expect(getHazardStatementPriority({ code: "H361fd" })).toBe(
      HAZARD_PRIORITY_TIER.SUSPECTED_CHRONIC,
    );
    expect(getHazardStatementPriority({ code: "H300+H310+H330" })).toBe(
      HAZARD_PRIORITY_TIER.SEVERE,
    );
  });

  it("puts pyrophoric, water-reactive, explosive, and respiratory-sensitiser hazards in the top tier", () => {
    ["H200", "H205", "H240", "H241", "H250", "H260", "H261", "H334"].forEach(
      (code) => {
        expect(getHazardStatementPriority({ code })).toBe(
          HAZARD_PRIORITY_TIER.SEVERE,
        );
      },
    );
  });

  it("ranks gases that can react explosively without air in the top tier", () => {
    expect(getHazardStatementPriority({ code: "H230" })).toBe(HAZARD_PRIORITY_TIER.SEVERE);
    expect(getHazardStatementPriority({ code: "H231" })).toBe(HAZARD_PRIORITY_TIER.SEVERE);
    expect(getHazardStatementPriority({ code: "H232" })).toBe(HAZARD_PRIORITY_TIER.SEVERE);
  });

  it("puts ignition, water-reactive, inert-gas and no-contact precautions up front", () => {
    const ordered = prioritizePrecautionaryStatements(
      statements("P501", "P403", "P233", "P220", "P223", "P231", "P262", "P282"),
    );
    expect(codesOf(ordered).slice(0, 5)).toEqual(["P220", "P223", "P231", "P262", "P282"]);
  });

  it("keeps the original order for equal scores", () => {
    expect(
      codesOf(prioritizeHazardStatements(statements("H331", "H314", "H301"))),
    ).toEqual(["H331", "H314", "H301"]);
  });

  it("ranks P210 before P501 and P201/P202 with the leading prevention statements", () => {
    const ordered = codesOf(
      prioritizePrecautionaryStatements(
        statements("P501", "P403+P233", "P210", "P202", "P201", "P233"),
      ),
    );
    expect(ordered.indexOf("P210")).toBeLessThan(ordered.indexOf("P501"));
    expect(ordered.slice(0, 3)).toEqual(["P210", "P202", "P201"]);
  });

  it("never omits an H code when the label must retain every code", () => {
    const hazards = statements("H315", "H319", "H225", "H350", "H340");
    const summaryPlan = planHazardStatementsForBudget(hazards, {
      fullTextBudget: 1,
      retainAllCodes: true,
    });
    expect(codesOf(summaryPlan.fullText)).toEqual(["H350"]);
    expect(codesOf(summaryPlan.codeOnly)).toEqual([
      "H340",
      "H225",
      "H315",
      "H319",
    ]);
    expect(summaryPlan.omitted).toEqual([]);

    const codePlan = planHazardStatementsForBudget(hazards, {
      fullTextBudget: 1,
      codesOnly: true,
      retainAllCodes: true,
    });
    expect(codesOf(codePlan.codeOnly)).toHaveLength(5);
    expect(codePlan.omitted).toEqual([]);
  });

  it("reports omitted statements explicitly when a label may summarize", () => {
    const plan = planHazardStatementsForBudget(
      statements("H315", "H350", "H319"),
      { fullTextBudget: 1 },
    );
    expect(codesOf(plan.fullText)).toEqual(["H350"]);
    expect(codesOf(plan.omitted)).toEqual(["H315", "H319"]);
  });

  // Every H code the backend translation table knows must have a real tier.
  it.each([
    "H200", "H201", "H202", "H203", "H204", "H205", "H220", "H221", "H222",
    "H223", "H224", "H225", "H226", "H227", "H228", "H229", "H230", "H231",
    "H240", "H241", "H242", "H250", "H251", "H252", "H260", "H261", "H270",
    "H271", "H272", "H280", "H281", "H290", "H300", "H301", "H302", "H303",
    "H304", "H305", "H310", "H311", "H312", "H313", "H314", "H315", "H316",
    "H317", "H318", "H319", "H320", "H330", "H331", "H332", "H333", "H334",
    "H335", "H336", "H340", "H341", "H350", "H350i", "H351", "H360", "H360D",
    "H360Df", "H360F", "H360FD", "H360Fd", "H361", "H361d", "H361f", "H361fd",
    "H362", "H370", "H371", "H372", "H373", "H400", "H401", "H402", "H410",
    "H411", "H412", "H413", "H420",
  ])("%s does not fall to the unrecognised tier", (code) => {
    expect(getHazardStatementPriority({ code })).toBeGreaterThan(
      HAZARD_PRIORITY_TIER.OTHER,
    );
  });

  it("keeps environmental hazards below health hazards and above unknown codes", () => {
    expect(
      codesOf(prioritizeHazardStatements(statements("H999", "H410", "H315"))),
    ).toEqual(["H315", "H410", "H999"]);
  });

  it("scores a combined statement by its most severe part, whatever joins it", () => {
    ["H315+H318", "H315/H318", "H315, H318", "H315+318"].forEach((code) => {
      expect(getHazardStatementPriority({ code })).toBe(
        HAZARD_PRIORITY_TIER.SEVERE,
      );
    });
  });
});
