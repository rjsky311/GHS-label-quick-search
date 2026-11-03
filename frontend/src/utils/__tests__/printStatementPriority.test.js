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
});
