import fs from "node:fs";
import path from "node:path";

const cssPath = path.resolve(__dirname, "../index.css");
const css = fs.readFileSync(cssPath, "utf8");

const extractRules = (selector) =>
  Array.from(css.matchAll(new RegExp(`${selector}\\s*{(?<body>[^}]+)}`, "gs")))
    .map((match) => match.groups?.body || "");

const parseDeclarations = (ruleBody) =>
  Object.fromEntries(
    ruleBody
      .split(";")
      .map((line) => line.trim())
      .filter(Boolean)
      .map((line) => {
        const [property, ...valueParts] = line.split(":");
        return [property.trim(), valueParts.join(":").trim()];
      }),
  );

describe("theme tokens", () => {
  it("keeps Dark Bench print preview surfaces white", () => {
    const [darkBenchRule] = extractRules("\\.theme-dark-bench");
    const declarations = parseDeclarations(darkBenchRule);

    expect(declarations["--notebook-print-surface"]).toBe("0 0% 100%");
    expect(declarations["--notebook-print-ink"]).toBe("220 24% 12%");
  });

  it("uses the print-surface token for preview canvases", () => {
    const [printPreviewRule] = extractRules("\\.notebook-print-preview");
    const declarations = parseDeclarations(printPreviewRule);

    expect(declarations["background-color"]).toBe(
      "hsl(var(--notebook-print-surface))",
    );
    expect(declarations.color).toBe("hsl(var(--notebook-print-ink))");
  });

  it("does not add Dark Bench-specific preview background overrides", () => {
    expect(css).not.toMatch(/\.theme-dark-bench\s+\.notebook-print-preview/);
  });
});
