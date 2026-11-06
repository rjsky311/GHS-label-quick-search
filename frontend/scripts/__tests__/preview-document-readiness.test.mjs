import assert from "node:assert/strict";
import test from "node:test";

import {
  isPreviewDocumentFresh,
  isPreviewDocumentReady,
  markPreviewDocumentReplaced,
} from "../preview-document-readiness.mjs";

const loadedImage = { complete: true, naturalWidth: 64 };
const loadingImage = { complete: false, naturalWidth: 0 };

const previewDocument = ({ readyState = "complete", images = [loadedImage] } = {}) => ({
  readyState,
  querySelectorAll: () => images,
});

const rootWith = (contentDocument) => ({
  querySelector: () => ({ contentDocument }),
});

test("a preview with no frame or document is not ready", () => {
  const noFrame = { querySelector: () => null };
  assert.equal(isPreviewDocumentFresh(noFrame), false);
  assert.equal(isPreviewDocumentReady(noFrame), false);
  assert.equal(isPreviewDocumentReady(rootWith(null)), false);
});

test("a preview whose images have loaded is ready", () => {
  assert.equal(isPreviewDocumentReady(rootWith(previewDocument())), true);
});

test("a preview waits for images that are still loading", () => {
  const doc = previewDocument({ images: [loadedImage, loadingImage] });
  assert.equal(isPreviewDocumentReady(rootWith(doc)), false);
});

test("a preview waits for a document that is still parsing, before its images exist", () => {
  const doc = previewDocument({ readyState: "interactive", images: [] });
  assert.equal(isPreviewDocumentFresh(rootWith(doc)), false);
  assert.equal(isPreviewDocumentReady(rootWith(doc)), false);
});

test("the old page does not count after a page flip, however complete it looks", () => {
  const oldPage = previewDocument();
  const root = rootWith(oldPage);
  assert.equal(isPreviewDocumentReady(root), true);

  const originalDocument = globalThis.document;
  globalThis.document = root;
  try {
    markPreviewDocumentReplaced();
  } finally {
    globalThis.document = originalDocument;
  }

  assert.equal(isPreviewDocumentFresh(root), false);
  assert.equal(isPreviewDocumentReady(root), false);

  const newPage = rootWith(previewDocument());
  assert.equal(isPreviewDocumentFresh(newPage), true);
  assert.equal(isPreviewDocumentReady(newPage), true);
});
