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

  it("lets a prepared container label's ribbon wrap so its details are not ellipsed", () => {
    const css = buildPrintStyles({
      layout: resolvePrintLayoutConfig({
        labelPurpose: "shipping",
        template: "standard",
        stockPreset: "medium-bottle",
      }),
    });

    const ribbonRule = extractRule(
      css,
      "\\.label-standard\\.label-prepared \\.meta-ribbon",
    );
    const casRule = extractRule(
      css,
      "\\.label-standard\\.label-prepared \\.meta-chip-cas",
    );

    expect(extractDeclaration(ribbonRule, "flex-wrap")).toBe("wrap");
    expect(extractDeclaration(casRule, "flex-shrink")).toBe("0");
  });
});
