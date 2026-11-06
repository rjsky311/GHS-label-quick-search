// These run inside the page through page.evaluate and page.waitForFunction, so each
// one can only use its argument and browser globals.
//
// Changing an iframe's srcdoc does not swap contentDocument right away, so right after
// a page flip the frame can still hold the old page, whose images have all loaded. Mark
// the old document before flipping; the mark does not carry over to the new one.

export const markPreviewDocumentReplaced = () => {
  const doc = document.querySelector(
    '[data-testid="label-fragment-preview"]',
  )?.contentDocument;
  if (doc) doc.__printQaReplacedPreview = true;
};

export const isPreviewDocumentFresh = (root = document) => {
  const doc = root.querySelector(
    '[data-testid="label-fragment-preview"]',
  )?.contentDocument;
  return (
    Boolean(doc) &&
    !doc.__printQaReplacedPreview &&
    doc.readyState === "complete"
  );
};

export const isPreviewDocumentReady = (root = document) => {
  const doc = root.querySelector(
    '[data-testid="label-fragment-preview"]',
  )?.contentDocument;
  if (!doc || doc.__printQaReplacedPreview || doc.readyState !== "complete") {
    return false;
  }
  return Array.from(
    doc.querySelectorAll("img.pictogram, img.qrcode-img"),
  ).every((image) => image.complete && image.naturalWidth > 0);
};
