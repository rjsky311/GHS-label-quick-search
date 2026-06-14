import assert from "node:assert/strict";
import test from "node:test";

import {
  resolveQuickIdPictogramMinSidePx,
  resolveQrMinSidePx,
} from "../print-pdf-thresholds.mjs";

test("quick-ID pictogram threshold defaults to 30px", () => {
  assert.equal(resolveQuickIdPictogramMinSidePx(), 30);
  assert.equal(resolveQuickIdPictogramMinSidePx(0), 30);
});

test("quick-ID pictogram threshold respects explicit compact pressure evidence", () => {
  assert.equal(resolveQuickIdPictogramMinSidePx(22), 22);
  assert.equal(resolveQuickIdPictogramMinSidePx("25"), 25);
});

test("QR threshold keeps the historical 50px default unless explicitly higher", () => {
  assert.equal(resolveQrMinSidePx(), 50);
  assert.equal(resolveQrMinSidePx(48), 50);
  assert.equal(resolveQrMinSidePx(64), 64);
});
