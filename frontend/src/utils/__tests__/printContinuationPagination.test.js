import {
  compactContinuationPages,
  getContinuationItemMetrics,
  getContinuationLineCharacterBudget,
} from "../printContinuationPagination";

const model = {
  layout: {
    stockPreset: "a4-primary",
    widthMm: 188,
    page: { paddingMm: 4 },
    typography: { complianceStatementSize: "5.6px" },
  },
};

const textForModel = (statement) => statement.text_en || "";

const makeItem = (id, text = "Keep readable.") => ({
  id,
  kind: "precaution",
  statement: { code: id, text_en: text },
});

const makePage = (items) =>
  items.reduce(
    (page, item) => {
      const metrics = getContinuationItemMetrics(item, model, textForModel);
      page.items.push(item);
      page.textWeight += metrics.weight;
      page.lineUnits += metrics.lineUnits;
      return page;
    },
    { items: [], textWeight: 0, lineUnits: 0 },
  );

describe("print continuation pagination", () => {
  it("backfills individual statements instead of only merging whole pages", () => {
    const pages = [
      makePage([makeItem("P201"), makeItem("P202")]),
      makePage([makeItem("P203"), makeItem("P204"), makeItem("P205")]),
    ];
    const compacted = compactContinuationPages(
      pages,
      {
        firstPageStatementCount: 3,
        firstPageTextWeight: 999,
        firstPageLineUnits: 3,
        continuationPageStatementCount: 3,
        continuationPageTextWeight: 999,
        continuationPageLineUnits: 3,
      },
      model,
      textForModel,
    );

    expect(compacted).toHaveLength(2);
    expect(compacted[0].items.map((item) => item.id)).toEqual([
      "P201",
      "P202",
      "P203",
    ]);
    expect(compacted[1].items.map((item) => item.id)).toEqual([
      "P204",
      "P205",
    ]);
  });

  it("still merges a whole continuation page when all items fit", () => {
    const pages = [
      makePage([makeItem("P201")]),
      makePage([makeItem("P202"), makeItem("P203")]),
    ];
    const compacted = compactContinuationPages(
      pages,
      {
        firstPageStatementCount: 4,
        firstPageTextWeight: 999,
        firstPageLineUnits: 4,
        continuationPageStatementCount: 4,
        continuationPageTextWeight: 999,
        continuationPageLineUnits: 4,
      },
      model,
      textForModel,
    );

    expect(compacted).toHaveLength(1);
    expect(compacted[0].items.map((item) => item.id)).toEqual([
      "P201",
      "P202",
      "P203",
    ]);
  });

  it("balances a sparse trailing page instead of leaving a single orphan statement", () => {
    const pages = [
      makePage([
        makeItem("P201"),
        makeItem("P202"),
        makeItem("P203"),
        makeItem("P204"),
        makeItem("P205"),
        makeItem("P206"),
        makeItem("P207"),
      ]),
      makePage([makeItem("P208")]),
    ];
    const compacted = compactContinuationPages(
      pages,
      {
        firstPageStatementCount: 7,
        firstPageTextWeight: 999,
        firstPageLineUnits: 7,
        continuationPageStatementCount: 7,
        continuationPageTextWeight: 999,
        continuationPageLineUnits: 7,
      },
      model,
      textForModel,
    );

    expect(compacted).toHaveLength(2);
    expect(compacted[0].items.map((item) => item.id)).toEqual([
      "P201",
      "P202",
      "P203",
      "P204",
    ]);
    expect(compacted[1].items.map((item) => item.id)).toEqual([
      "P205",
      "P206",
      "P207",
      "P208",
    ]);
  });

  it("derives full-page line budget from resolved typography metrics", () => {
    const roomySmallType = {
      layout: {
        stockPreset: "a4-primary",
        widthMm: 188,
        page: { paddingMm: 4 },
        typography: { complianceStatementSize: "4.8px" },
      },
    };
    const roomyLargeType = {
      layout: {
        stockPreset: "a4-primary",
        widthMm: 188,
        page: { paddingMm: 4 },
        typography: { complianceStatementSize: "6.2px" },
      },
    };

    expect(getContinuationLineCharacterBudget(roomySmallType)).toBeGreaterThan(
      getContinuationLineCharacterBudget(roomyLargeType),
    );
  });
});
