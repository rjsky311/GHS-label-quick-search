import assert from "node:assert/strict";
import test from "node:test";

import {
  buildInventoryPrintSampleReport,
  extractInventoryRecords,
  renderInventoryPrintSampleMarkdown,
} from "../inventory-print-sampling.mjs";

const INVENTORY_CSV_FIXTURE = [
  ",,,位置,藥品名稱,CAS NO.,廠商,數量",
  "英,中,圖,,,,,",
  "TRUE,FALSE,FALSE,有機櫃 A,Ethanol,64-17-5,ACROS,1",
  'FALSE,FALSE,FALSE,有機櫃 B,"Long duplicate bottle analytical reference for label fit",64-17-5,Thermo,1',
  "FALSE,FALSE,FALSE,有機櫃 D,Broken CAS row,#VALUE!,Unknown,1",
  "FALSE,FALSE,FALSE,有機櫃 E,Checksum invalid row,67-64-2,ACROS,1",
  "FALSE,FALSE,FALSE,有機櫃 F,,84-65-1,ACROS,1",
  "FALSE,FALSE,FALSE,有機櫃 G,No GHS source note,107-18-6,ACROS,1,NO GHS",
].join("\n");

test("extractInventoryRecords reads real-inventory shaped CSV without trusting invalid CAS rows", () => {
  const result = extractInventoryRecords(INVENTORY_CSV_FIXTURE);

  assert.equal(result.headerRowIndex, 0);
  assert.equal(result.records.length, 4);
  assert.equal(result.invalidCasRows.length, 2);
  assert.equal(result.invalidCasRows[0].reason, "format");
  assert.equal(result.invalidCasRows[1].reason, "checksum");
  assert.equal(result.missingSourceNameRows.length, 1);
  assert.equal(result.sourceNoGhsRows.length, 1);
  assert.equal(result.records[0].cas, "64-17-5");
  assert.equal(result.records[0].name, "Ethanol");
  assert.equal(result.records[1].sourceRow, 4);
});

test("buildInventoryPrintSampleReport selects inventory extremes and synthetic print stress cases", () => {
  const report = buildInventoryPrintSampleReport(INVENTORY_CSV_FIXTURE, {
    sourceName: "unit-test-inventory.csv",
  });

  const inventorySampleIds = report.inventorySamples.map((sample) => sample.id);
  const syntheticIds = report.syntheticStressCases.map((sample) => sample.id);

  assert.equal(report.summary.validRecordCount, 4);
  assert.equal(report.summary.uniqueCasCount, 3);
  assert.equal(report.summary.duplicateCasCount, 1);
  assert.equal(report.summary.missingSourceNameRowCount, 1);
  assert.equal(report.summary.sourceNoGhsMarkerCount, 1);
  assert.ok(inventorySampleIds.includes("inventory-first-valid"));
  assert.ok(inventorySampleIds.includes("inventory-longest-name"));
  assert.ok(inventorySampleIds.includes("inventory-duplicate-cas"));
  assert.ok(syntheticIds.includes("qr-small-8-ghs"));
  assert.ok(syntheticIds.includes("qr-small-9-ghs"));
  assert.ok(syntheticIds.includes("quick-id-9-ghs"));
  assert.ok(syntheticIds.includes("qr-small-over-limit-19-ghs"));

  const longName = report.inventorySamples.find(
    (sample) => sample.id === "inventory-longest-name",
  );
  assert.equal(longName.cas, "64-17-5");
  assert.equal(longName.recommendedOutputs.length, 3);

  const shortName = report.inventorySamples.find(
    (sample) => sample.id === "inventory-short-name",
  );
  assert.ok(shortName.name.length > 0);
  assert.equal(report.missingSourceNameSamples[0].cas, "84-65-1");
  assert.equal(report.sourceNoGhsSamples[0].cas, "107-18-6");
  assert.equal(report.sourceNoGhsSamples[0].markerCell, "NO GHS");
  assert.equal("rowText" in report.sourceNoGhsSamples[0], false);

  const qrEight = report.syntheticStressCases.find(
    (sample) => sample.id === "qr-small-8-ghs",
  );
  assert.equal(qrEight.expectedLayout, "QR first label uses 4 x 2 GHS grid.");
});

test("source NO GHS markers require an exact source cell", () => {
  const csv = [
    ",,,位置,藥品名稱,CAS NO.,廠商,數量,備註",
    "TRUE,FALSE,FALSE,有機櫃 A,Name says No GHS in prose,64-17-5,ACROS,1,needs review",
    "FALSE,FALSE,FALSE,有機櫃 B,Exact source marker,107-18-6,ACROS,1, NO-GHS ",
  ].join("\n");
  const result = extractInventoryRecords(csv);

  assert.equal(result.sourceNoGhsRows.length, 1);
  assert.equal(result.sourceNoGhsRows[0].cas, "107-18-6");
  assert.equal(result.sourceNoGhsRows[0].markerCell, "NO-GHS");
});

test("renderInventoryPrintSampleMarkdown writes a review-only operator report", () => {
  const report = buildInventoryPrintSampleReport(INVENTORY_CSV_FIXTURE, {
    sourceName: "unit-test-inventory.csv",
  });
  const markdown = renderInventoryPrintSampleMarkdown(report);

  assert.match(markdown, /review-only/i);
  assert.match(markdown, /inventory-longest-name/);
  assert.match(markdown, /qr-small-9-ghs/);
  assert.match(markdown, /Do not treat inventory names as approved dictionary data/);
  assert.match(markdown, /Missing Source Name Samples/);
  assert.match(markdown, /Source NO GHS Marker Samples/);
  assert.match(markdown, /source marker only/i);
  assert.doesNotMatch(markdown, /Row text/);
  assert.doesNotMatch(markdown, /No GHS source note \| 107-18-6 \| ACROS/);
  assert.ok(markdown.endsWith("\n"));
  assert.ok(!markdown.endsWith("\n\n"));
});

test("renderInventoryPrintSampleMarkdown tolerates partial legacy report objects", () => {
  const markdown = renderInventoryPrintSampleMarkdown({
    sourceName: "legacy-report.csv",
    generatedAt: "2026-06-29T00:00:00.000Z",
    summary: {
      validRecordCount: 1,
      uniqueCasCount: 1,
      duplicateCasCount: 0,
      invalidCasRowCount: 0,
      missingSourceNameRowCount: 0,
      sourceNoGhsMarkerCount: 0,
    },
    selectionRules: ["Legacy report shape."],
    inventorySamples: [
      {
        id: "legacy-sample",
        cas: "64-17-5",
        name: "Ethanol",
        reason: "Legacy sample without recommended outputs.",
      },
    ],
    syntheticStressCases: [],
  });

  assert.match(markdown, /legacy-report\.csv/);
  assert.match(markdown, /legacy-sample/);
  assert.ok(markdown.endsWith("\n"));
});
