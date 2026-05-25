export const REQUIRED_PRINT_IMAGE_TIMEOUT_MS = 10000;

export const getRequiredPrintImageKind = (img) => {
  const requiredKind = img.getAttribute?.("data-required-print-image");
  if (requiredKind) return requiredKind;

  const alt = img.getAttribute?.("alt") || img.alt || "";
  if (/^GHS\d{2}$/.test(alt)) return "ghs-pictogram";
  if (/qr/i.test(alt)) return "qr-code";
  if (img.classList?.contains?.("qrcode-img")) return "qr-code";

  return "";
};

export const isImageLoadFailure = (img) =>
  "naturalWidth" in img && img.naturalWidth === 0;

export const buildRequiredImageIssue = (img, reason) => ({
  type: "required-image-failed",
  imageKind: getRequiredPrintImageKind(img),
  alt: img.getAttribute?.("alt") || img.alt || "",
  src: img.getAttribute?.("src") || img.src || "",
  reason,
});

export function waitForRequiredPrintImages(
  images,
  onReady,
  timeoutMs = REQUIRED_PRINT_IMAGE_TIMEOUT_MS,
) {
  const imageList = Array.from(images || []);
  const imageLoadIssues = [];
  const handledImages = new Set();
  let loaded = 0;
  let timeoutId = null;
  let ready = false;

  const finish = () => {
    if (ready) return;
    ready = true;
    if (timeoutId) {
      clearTimeout(timeoutId);
      timeoutId = null;
    }
    onReady(imageLoadIssues);
  };

  if (imageList.length === 0) {
    finish();
    return { cancel: () => {}, imageLoadIssues };
  }

  const finishImage = (img, reason) => {
    if (ready || handledImages.has(img)) return;
    handledImages.add(img);

    if (reason || isImageLoadFailure(img)) {
      const imageKind = getRequiredPrintImageKind(img);
      if (imageKind) {
        imageLoadIssues.push(
          buildRequiredImageIssue(img, reason || "natural-width-zero"),
        );
      }
    }

    loaded += 1;
    if (loaded === imageList.length) finish();
  };

  timeoutId = setTimeout(() => {
    imageList.forEach((img) => finishImage(img, "load-timeout"));
  }, timeoutMs);

  imageList.forEach((img) => {
    if (img.complete) {
      finishImage(img, "");
    } else {
      img.onload = () => finishImage(img, "");
      img.onerror = () => finishImage(img, "load-error");
    }
  });

  return {
    cancel: () => {
      ready = true;
      if (timeoutId) clearTimeout(timeoutId);
      imageList.forEach((img) => {
        img.onload = null;
        img.onerror = null;
      });
    },
    imageLoadIssues,
  };
}
