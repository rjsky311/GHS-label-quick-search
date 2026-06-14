import assert from "node:assert/strict";
import test from "node:test";

import {
  resolveBatchSearchGate,
  resultHasUpstreamRetryReview,
} from "../production-batch-print-search-gate.mjs";

test("detects an all-upstream batch before waiting for the print button", () => {
  const batchResultsState = {
    reviewActions: [
      {
        type: "upstream-error",
        text: "Retry upstream lookup when PubChem is available.",
      },
    ],
  };

  assert.equal(resultHasUpstreamRetryReview(batchResultsState), true);
  assert.deepEqual(
    resolveBatchSearchGate({
      printButtonVisible: false,
      printableCount: 0,
      batchResultsState,
      allowExternalUpstreamDegradedPass: false,
    }),
    {
      canContinueToPrintModal: false,
      shouldStopEarly: true,
      ok: false,
      warning: "no-printable-results:0:external-upstream-transient",
      failure: "no-printable-results:0:external-upstream-unavailable",
    },
  );
});

test("continues normally when a printable batch action is visible", () => {
  assert.deepEqual(
    resolveBatchSearchGate({
      printButtonVisible: true,
      printableCount: 6,
      batchResultsState: { reviewActions: [] },
      allowExternalUpstreamDegradedPass: false,
    }),
    {
      canContinueToPrintModal: true,
      shouldStopEarly: false,
      ok: true,
      warning: "",
      failure: "",
    },
  );
});
