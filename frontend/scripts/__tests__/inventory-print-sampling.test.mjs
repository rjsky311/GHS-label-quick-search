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
  'FALSE,FALSE,FALSE,有機櫃 B,"N,N-Dimethyl-4-nitrosoaniline hydrochloride analytical reference",123456-78-9,Thermo,1',
  "FALSE,FALSE,FALSE,有機櫃 C,Ethanol duplicate bottle,64-17-5,ACROS,2",
  "FALSE,FALSE,FALSE,有機櫃 D,Broken CAS row,#VALUE!,Unknown,1",
].join("\n");

test("extractInventoryRecords reads real-inventory shaped CSV without trusting invalid CAS rows", () => {
  const result = extractInventoryRecords(INVENTORY_CSV_FIXTURE);

  assert.equal(result.headerRowIndex, 0);
  assert.equal(result.records.length, 3);
  assert.equal(result.invalidCasRows.length, 1);
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

  assert.equal(report.summary.validRecordCount, 3);
  assert.equal(report.summary.uniqueCasCount, 2);
  assert.equal(report.summary.duplicateCasCount, 1);
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
  assert.equal(longName.cas, "123456-78-9");
  assert.equal(longName.recommendedOutputs.length, 3);

  const qrEight = report.syntheticStressCases.find(
    (sample) => sample.id === "qr-small-8-ghs",
  );
  assert.equal(qrEight.expectedLayout, "QR first label uses 4 x 2 GHS grid.");
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
  assert.ok(markdown.endsWith("\n"));
  assert.ok(!markdown.endsWith("\n\n"));
});
