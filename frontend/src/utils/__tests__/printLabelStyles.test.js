import { resolvePrintLayoutConfig } from "@/constants/labelStocks";
import { buildPrintStyles } from "../printLabelStyles";

const extractRule = (css, selector) =>
  css.match(new RegExp(`${selector}\\s*{[^}]+}`, "s"))?.[0] || "";

const extractDeclaration = (rule, property) =>
  rule.match(new RegExp(`${property}\\s*:\\s*([^;]+);`))?.[1]?.trim() || "";

describe("printLabelStyles", () => {
  it("gives pictogram-review placeholders a caution tone distinct from no-hazard green", () => {
    const css = buildPrintStyles({
      layout: resolvePrintLayoutConfig({
        labelPurpose: "quickId",
        template: "icon",
        stockPreset: "small-strip",
      }),
    });

    const reviewRule = extractRule(css, "\\.no-hazard-review");
    const noHazardRule = extractRule(css, "\\.no-hazard");

    expect(extractDeclaration(reviewRule, "color")).toBeTruthy();
    expect(extractDeclaration(reviewRule, "background")).toBeTruthy();
    expect(extractDeclaration(reviewRule, "border")).toBeTruthy();
    expect(extractDeclaration(reviewRule, "font-weight")).toBe("700");
    expect(extractDeclaration(reviewRule, "color")).not.toBe(
      extractDeclaration(noHazardRule, "color"),
    );
    expect(extractDeclaration(reviewRule, "background")).not.toBe(
      extractDeclaration(noHazardRule, "background"),
    );
  });
});
