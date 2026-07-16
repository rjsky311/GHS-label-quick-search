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
  const expectedComfortDimTokens = {
    "--notebook-app": "42 46% 90%",
    "--notebook-surface": "41 66% 94%",
    "--notebook-surface-raised": "47 100% 98%",
    "--notebook-ink": "40 35% 7%",
    "--notebook-muted-ink": "41 14% 31%",
    "--notebook-border": "41 29% 80%",
    "--notebook-action": "174 80% 23%",
    "--notebook-action-border": "174 80% 20%",
    "--notebook-action-soft": "168 32% 91%",
    "--notebook-danger": "5 71% 46%",
    "--notebook-danger-soft": "13 47% 94%",
    "--notebook-action-solid": "40 35% 7%",
    "--notebook-action-solid-fg": "42 46% 90%",
    "--notebook-canvas": "40 38% 85%",
    "--notebook-sheet-rule-alpha": ".14",
    "--notebook-rule-spacing": "2.15rem",
    "--notebook-grain-opacity": ".14",
    "--notebook-grain-blend": "multiply",
    "--notebook-canvas-grain-opacity": ".66",
  };

  const expectedDarkBenchTokens = {
    "--notebook-app": "80 7% 8%",
    "--notebook-surface": "90 7% 12%",
    "--notebook-surface-raised": "84 7% 14%",
    "--notebook-ink": "55 19% 89%",
    "--notebook-muted-ink": "60 5% 53%",
    "--notebook-border": "73 9% 19%",
    "--notebook-action": "174 63% 54%",
    "--notebook-action-border": "174 56% 53%",
    "--notebook-action-soft": "175 51% 14%",
    "--notebook-danger": "8 81% 69%",
    "--notebook-danger-soft": "8 40% 12%",
    "--notebook-action-solid": "174 63% 54%",
    "--notebook-action-solid-fg": "173 60% 8%",
    "--notebook-canvas": "75 20% 4%",
    "--notebook-sheet-rule-alpha": ".2",
    "--notebook-rule-spacing": "2.15rem",
    "--notebook-grain-opacity": ".055",
    "--notebook-grain-blend": "screen",
    "--notebook-canvas-grain-opacity": ".5",
  };

  it("maps Comfort Dim to the Graphite Editorial warm-paper palette", () => {
    const [rootRule] = extractRules(":root");
    const [comfortDimRule] = extractRules("\\.theme-comfort-dim");

    [rootRule, comfortDimRule].forEach((ruleBody) => {
      const declarations = parseDeclarations(ruleBody);
      Object.entries(expectedComfortDimTokens).forEach(([token, value]) => {
        expect(declarations[token]).toBe(value);
      });
      expect(declarations["--font-display"]).toBe(
        '"IBM Plex Sans", "Noto Sans TC", system-ui, sans-serif',
      );
      expect(declarations["--font-sans"]).toBe(
        '"IBM Plex Sans", "Noto Sans TC", system-ui, sans-serif',
      );
      expect(declarations["--font-mono"]).toBe(
        '"IBM Plex Mono", "Consolas", monospace',
      );
      expect(declarations["--notebook-print-surface"]).toBe("0 0% 100%");
    });
  });

  it("maps Dark Bench to the Graphite Editorial warm-graphite palette", () => {
    const [darkBenchRule] = extractRules("\\.theme-dark-bench");
    const declarations = parseDeclarations(darkBenchRule);

    Object.entries(expectedDarkBenchTokens).forEach(([token, value]) => {
      expect(declarations[token]).toBe(value);
    });
    expect(declarations["--notebook-print-surface"]).toBe("0 0% 100%");
  });

  it("keeps field placeholders on the contrast-checked token without opacity", () => {
    const [placeholderRule] = extractRules("\\.notebook-field::placeholder");
    const placeholderDeclarations = parseDeclarations(placeholderRule);

    expect(placeholderDeclarations.color).toBe(
      "hsl(var(--notebook-muted-ink))",
    );
  });

  it("defines material primitives without targeting the print sheet internals", () => {
    expect(css).toMatch(/\.notebook-grain\s*{[^}]*position:\s*fixed/s);
    expect(css).toMatch(
      /\.notebook-canvas\s*{[^}]*background-color:\s*hsl\(var\(--notebook-canvas\)\)/s,
    );
    expect(css).toMatch(/\.notebook-canvas::before\s*{/);
    expect(css).not.toMatch(/\.notebook-print-preview::before/);
  });

  it("keeps ruled texture on the workbench sheet instead of layering the page canvas", () => {
    const [appRule] = extractRules("\\.notebook-app");
    const [workbenchRule] = extractRules("\\.empty-workbench");
    const [processRule] = extractRules("\\.nb-process");
    const [featureLedgerRule] = extractRules("\\.notebook-feature-ledger");
    const [trustStripRule] = extractRules("\\.notebook-trust-strip");
    const [warmNoteRule] = extractRules("\\.notebook-warm-note");

    expect(parseDeclarations(appRule)["background-image"]).toBe("none");
    expect(workbenchRule).toMatch(
      /background-image:\s*linear-gradient\([\s\S]*--notebook-sheet-rule-alpha/,
    );
    expect(workbenchRule).toMatch(
      /background-size:\s*100% var\(--notebook-rule-spacing\)/,
    );

    [processRule, featureLedgerRule, trustStripRule].forEach((ruleBody) => {
      expect(ruleBody).not.toMatch(/background-image|linear-gradient/);
    });
    expect(warmNoteRule).not.toMatch(/--notebook-rule/);
  });

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

  it("defines semantic notebook tone utilities for Dark Bench legibility", () => {
    expect(css).toMatch(
      /\.notebook-tone-muted\s*{[^}]*color:\s*hsl\(var\(--notebook-muted-ink\)\)/s,
    );
    expect(css).toMatch(
      /\.notebook-tone-action\s*{[^}]*color:\s*hsl\(var\(--notebook-action\)\)/s,
    );
    expect(css).toMatch(
      /\.notebook-tone-warning\s*{[^}]*color:\s*hsl\(var\(--notebook-warning\)\)/s,
    );
    expect(css).toMatch(
      /\.notebook-tone-danger\s*{[^}]*color:\s*hsl\(var\(--notebook-danger\)\)/s,
    );
  });
});
