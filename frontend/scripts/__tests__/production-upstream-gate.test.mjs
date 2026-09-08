import assert from "node:assert/strict";
import test from "node:test";

import {
  EXTERNAL_UPSTREAM_STATUS,
  canTreatExternalUpstreamAsNonActionable,
  isBoundedExternalUpstreamUiState,
  isExternalUpstreamUnavailableReport,
} from "../production-upstream-gate.mjs";

const searchReport = {
  statusCategory: EXTERNAL_UPSTREAM_STATUS,
  failures: ["source-upstream-unavailable"],
  externalUpstream: { contractObserved: true },
};

test("requires the complete rendered upstream retry contract", () => {
  assert.equal(
    isBoundedExternalUpstreamUiState({
      rowText:
        "PubChem 暫時無法回應，請稍後再試 (GHS classification fetch failed) Upstream retry needed",
      upstreamBannerCount: 1,
      upstreamRowStateCount: 1,
    }),
    true,
  );
  assert.equal(
    isBoundedExternalUpstreamUiState({
      rowText: "PubChem temporarily unavailable",
      upstreamBannerCount: 1,
      upstreamRowStateCount: 0,
    }),
    false,
  );
});

test("recognizes only a structured external-upstream report", () => {
  assert.equal(isExternalUpstreamUnavailableReport(searchReport), true);
  assert.equal(
    isExternalUpstreamUnavailableReport({
      ...searchReport,
      externalUpstream: { contractObserved: false },
    }),
    false,
  );
});

test("requires healthy exact-SHA gates before making upstream failure non-actionable", () => {
  const passingReport = { present: true, ok: true };
  assert.equal(
    canTreatExternalUpstreamAsNonActionable({
      searchUi: searchReport,
      health: passingReport,
      bundle: passingReport,
      pdfCanary: passingReport,
      requirePdfCanary: true,
    }),
    true,
  );
  assert.equal(
    canTreatExternalUpstreamAsNonActionable({
      searchUi: searchReport,
      health: { present: true, ok: false },
      bundle: passingReport,
      pdfCanary: passingReport,
      requirePdfCanary: true,
    }),
    false,
  );
});
