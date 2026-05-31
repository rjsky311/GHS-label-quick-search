export const getContinuationStatementWeight = (
  statement,
  model,
  getLocalizedTextForModel,
) =>
  String(statement?.code || "").length * 2 +
  getLocalizedTextForModel(statement, model).length;

const parsePxValue = (value, fallback) => {
  const match = String(value || "").match(/-?\d+(?:\.\d+)?/);
  return match ? Number(match[0]) : fallback;
};

const clampNumber = (value, min, max) =>
  Math.min(max, Math.max(min, Number.isFinite(value) ? value : min));

export const getContinuationLineCharacterBudget = (model = {}) => {
  const layout = model?.layout || {};
  const isFullPage =
    layout.stockPreset === "a4-primary" ||
    layout.stockPreset === "letter-primary";
  if (!isFullPage) return 92;

  const widthMm = Number(layout.widthMm || layout.label?.widthMm || 188);
  const paddingMm = Number(layout.page?.paddingMm || layout.pagePaddingMm || 4);
  const fontPx = parsePxValue(
    layout.typography?.complianceStatementSize || layout.typography?.hazardSize,
    5.6,
  );
  const contentWidthMm = Math.max(120, widthMm - paddingMm * 2 - 14);
  const contentWidthPx = contentWidthMm * (96 / 25.4);
  const averageGlyphPx = Math.max(3.1, fontPx * 0.78);
  return Math.round(clampNumber(contentWidthPx / averageGlyphPx, 105, 175));
};

export const getContinuationStatementLineUnits = (
  statement,
  model,
  getLocalizedTextForModel,
) => {
  const textLength = getLocalizedTextForModel(statement, model).length;
  const codeLength = String(statement?.code || "").length;
  const lineCharacters = getContinuationLineCharacterBudget(model);
  const codeWrapPenalty = codeLength > 10 ? 0.45 : codeLength > 7 ? 0.25 : 0;
  return Math.max(1, Math.ceil(textLength / lineCharacters) + codeWrapPenalty);
};

export const getContinuationItemMetrics = (
  item,
  model,
  getLocalizedTextForModel,
) => ({
  weight: getContinuationStatementWeight(
    item.statement,
    model,
    getLocalizedTextForModel,
  ),
  lineUnits: getContinuationStatementLineUnits(
    item.statement,
    model,
    getLocalizedTextForModel,
  ),
});

export const appendContinuationItemToPage = (
  page,
  item,
  metrics,
) => {
  page.items.push(item);
  page.textWeight += metrics.weight;
  page.lineUnits = (page.lineUnits || 0) + metrics.lineUnits;
};

export const removeFirstContinuationItemFromPage = (
  page,
  metrics,
) => {
  const [item] = page.items.splice(0, 1);
  page.textWeight = Math.max(0, page.textWeight - metrics.weight);
  page.lineUnits = Math.max(0, (page.lineUnits || 0) - metrics.lineUnits);
  return item;
};

export const getContinuationPageLimits = (capacity, pageIndex) => {
  const firstPage = pageIndex === 0;
  return {
    maxStatements: firstPage
      ? capacity.firstPageStatementCount || capacity.pageStatementCount
      : capacity.continuationPageStatementCount ||
        capacity.precautionOnlyStatementCount ||
        capacity.pageStatementCount,
    maxTextWeight: firstPage
      ? capacity.firstPageTextWeight || capacity.pageTextWeight
      : capacity.continuationPageTextWeight ||
        capacity.precautionOnlyTextWeight ||
        capacity.pageTextWeight,
    maxLineUnits: firstPage
      ? capacity.firstPageLineUnits || capacity.pageLineUnits
      : capacity.continuationPageLineUnits ||
        capacity.precautionOnlyLineUnits ||
        capacity.pageLineUnits,
  };
};

export const getContinuationPageIndex = (pages) => Math.max(0, pages.length - 1);

export const appendContinuationStatementWithLimits = (
  pages,
  item,
  { maxStatements, maxTextWeight, maxLineUnits },
  model,
  getLocalizedTextForModel,
) => {
  const metrics = getContinuationItemMetrics(
    item,
    model,
    getLocalizedTextForModel,
  );
  let current = pages[pages.length - 1];
  const limitCount = Number.isFinite(maxStatements)
    ? maxStatements
    : Infinity;
  const limitText = Number.isFinite(maxTextWeight) ? maxTextWeight : Infinity;
  const limitLines = Number.isFinite(maxLineUnits) ? maxLineUnits : Infinity;
  const wouldExceedCount =
    current.items.length > 0 && current.items.length + 1 > limitCount;
  const wouldExceedText =
    current.items.length > 0 && current.textWeight + metrics.weight > limitText;
  const currentLineUnits = current.lineUnits || 0;
  const wouldExceedLines =
    current.items.length > 0 &&
    currentLineUnits + metrics.lineUnits > limitLines;

  if (wouldExceedCount || wouldExceedText || wouldExceedLines) {
    current = { items: [], textWeight: 0, lineUnits: 0 };
    pages.push(current);
  }

  appendContinuationItemToPage(current, item, metrics);
};

export const appendContinuationStatement = (
  pages,
  item,
  capacity,
  model,
  getLocalizedTextForModel,
) => {
  appendContinuationStatementWithLimits(
    pages,
    item,
    getContinuationPageLimits(capacity, getContinuationPageIndex(pages)),
    model,
    getLocalizedTextForModel,
  );
};

export const canFitContinuationItems = (
  page,
  items,
  capacity,
  pageIndex,
  model,
  getLocalizedTextForModel,
) => {
  const limits = getContinuationPageLimits(capacity, pageIndex);
  const incomingWeight = items.reduce(
    (total, item) =>
      total +
      getContinuationStatementWeight(
        item.statement,
        model,
        getLocalizedTextForModel,
      ),
    0,
  );
  const incomingLineUnits = items.reduce(
    (total, item) =>
      total +
      getContinuationStatementLineUnits(
        item.statement,
        model,
        getLocalizedTextForModel,
      ),
    0,
  );
  const currentCount = page?.items?.length || 0;
  const currentWeight = page?.textWeight || 0;
  const currentLineUnits = page?.lineUnits || 0;

  return (
    currentCount + items.length <= limits.maxStatements &&
    currentWeight + incomingWeight <= limits.maxTextWeight &&
    currentLineUnits + incomingLineUnits <= limits.maxLineUnits
  );
};

export const compactContinuationPages = (
  pages,
  capacity,
  model,
  getLocalizedTextForModel,
) => {
  const compacted = pages.filter((page) => page.items.length > 0);
  let index = 1;
  while (index < compacted.length) {
    const current = compacted[index];
    const previous = compacted[index - 1];

    if (
      current.items.length > 0 &&
      canFitContinuationItems(
        previous,
        current.items,
        capacity,
        index - 1,
        model,
        getLocalizedTextForModel,
      )
    ) {
      previous.items.push(...current.items);
      previous.textWeight += current.textWeight;
      previous.lineUnits = (previous.lineUnits || 0) + (current.lineUnits || 0);
      compacted.splice(index, 1);
      continue;
    }

    while (
      current.items.length > 0 &&
      canFitContinuationItems(
        previous,
        [current.items[0]],
        capacity,
        index - 1,
        model,
        getLocalizedTextForModel,
      )
    ) {
      const metrics = getContinuationItemMetrics(
        current.items[0],
        model,
        getLocalizedTextForModel,
      );
      const item = removeFirstContinuationItemFromPage(current, metrics);
      appendContinuationItemToPage(previous, item, metrics);
    }

    if (current.items.length === 0) {
      compacted.splice(index, 1);
      continue;
    }
    index += 1;
  }
  return compacted;
};
