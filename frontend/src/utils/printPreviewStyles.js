import { isFullPagePrimaryLayout } from "@/utils/printContentPolicy";

export function buildPrintPreviewStyles(mode, model, options = {}) {
  const isLandscape = model.layout.page?.orientation === "landscape";
  const pageWidthMm = model.layout.page.widthMm || (isLandscape ? 297 : 210);
  const pageHeightMm = model.layout.page.heightMm || (isLandscape ? 210 : 297);
  const sheetScale = isLandscape ? 0.28 : 0.24;
  const mmToPx = 3.78;
  const rawLabelWidthPx = model.layout.widthMm * mmToPx;
  const rawLabelHeightPx = model.layout.heightMm * mmToPx;
  const isFullPageLabelPreview =
    mode === "label" && isFullPagePrimaryLayout(model.layout);
  const previewZoom = options.previewZoom === "inspect" ? "inspect" : "fit";
  const maxLabelPreviewWidthPx =
    previewZoom === "inspect"
      ? isFullPageLabelPreview
        ? rawLabelWidthPx
        : 760
      : isFullPageLabelPreview
        ? 300
        : 420;
  const maxLabelPreviewHeightPx =
    previewZoom === "inspect"
      ? isFullPageLabelPreview
        ? rawLabelHeightPx
        : 640
      : isFullPageLabelPreview
        ? 240
        : 340;
  const maxLabelPreviewScale = isFullPageLabelPreview
    ? 1
    : previewZoom === "inspect"
      ? 2.4
      : 2.2;
  const fitLabelPreviewScale = Math.min(
    maxLabelPreviewScale,
    maxLabelPreviewWidthPx / rawLabelWidthPx,
    maxLabelPreviewHeightPx / rawLabelHeightPx,
  );
  const labelPreviewScale =
    mode === "label"
      ? previewZoom === "inspect" && !isFullPageLabelPreview
        ? Math.min(maxLabelPreviewScale, Math.max(1.65, fitLabelPreviewScale))
        : fitLabelPreviewScale
      : 1;
  const labelPreviewWidthPx = Math.ceil(
    rawLabelWidthPx * labelPreviewScale + 24,
  );
  const labelPreviewHeightPx = Math.ceil(
    rawLabelHeightPx * labelPreviewScale + 24,
  );
  const viewportWidthPx = Math.round(pageWidthMm * mmToPx * sheetScale);
  const viewportHeightPx = Math.round(pageHeightMm * mmToPx * sheetScale);
  const cardWidthPx =
    mode === "label" ? labelPreviewWidthPx : viewportWidthPx + 32;
  const cardHeightPx =
    mode === "label" ? labelPreviewHeightPx : viewportHeightPx + 40;
  const frameWidthPx = Math.ceil(cardWidthPx + 28);
  const frameHeightPx = Math.ceil(cardHeightPx + 32);

  const css = `
    body.preview-body {
      margin: 0;
      min-height: 0;
      background: #f8fafc;
      display: flex;
      align-items: flex-start;
      justify-content: center;
      padding: 8px;
    }
    body.preview-body-label {
      overflow: ${previewZoom === "inspect" ? "auto" : "hidden"};
    }
    body.preview-body-sheet {
      overflow: auto;
    }
    .preview-shell {
      width: 100%;
      display: flex;
      align-items: flex-start;
      justify-content: center;
    }
    body.preview-zoom-inspect .preview-shell {
      justify-content: flex-start;
    }
    .preview-card {
      background: #ffffff;
      border-radius: 5mm;
      box-shadow: 0 10px 30px rgba(15, 23, 42, 0.16);
      overflow: visible;
    }
    .preview-card-label {
      padding: 2.5mm;
      width: ${labelPreviewWidthPx}px;
      height: ${labelPreviewHeightPx}px;
      max-width: 100%;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    .preview-card-sheet {
      padding: 4mm;
      max-width: 100%;
    }
    .preview-sheet-viewport {
      width: ${viewportWidthPx}px;
      height: ${viewportHeightPx}px;
      max-width: 100%;
      overflow: hidden;
      background: #ffffff;
      border: 1px solid #dbe4ef;
      box-shadow: 0 12px 28px rgba(15, 23, 42, 0.16);
    }
    .preview-grid-scaler {
      transform: scale(${sheetScale});
      transform-origin: top left;
      width: ${pageWidthMm}mm;
      height: ${pageHeightMm}mm;
    }
    .preview-grid-shell {
      overflow: hidden;
      max-width: 100%;
    }
    .preview-page {
      width: ${pageWidthMm}mm;
      min-height: ${pageHeightMm}mm;
      page-break-after: auto;
    }
    .preview-label-scaler {
      width: ${Math.ceil(rawLabelWidthPx * labelPreviewScale)}px;
      height: ${Math.ceil(rawLabelHeightPx * labelPreviewScale)}px;
      position: relative;
      flex: 0 0 auto;
    }
    .preview-label-scaler > .label {
      transform: scale(${labelPreviewScale});
      transform-origin: top left;
    }
    @media (max-width: ${frameWidthPx}px) {
      body.preview-body-label {
        overflow: auto;
      }
      body.preview-body-label .preview-shell {
        justify-content: flex-start;
      }
      body.preview-body-label .preview-card-label {
        max-width: none;
      }
    }
    .label-placeholder {
      border-style: dashed;
      border-color: #cbd5e1;
      background: repeating-linear-gradient(
        135deg,
        #f8fafc 0,
        #f8fafc 3mm,
        #e2e8f0 3mm,
        #e2e8f0 6mm
      );
      box-shadow: none;
    }
    ${
      mode === "label"
        ? `.preview-card-label .preview-label-scaler > .label {
             box-shadow: 0 16px 36px rgba(15, 23, 42, 0.18);
           }`
        : ""
    }
  `;

  return {
    css,
    metrics: {
      mode,
      previewZoom,
      cardWidthPx,
      cardHeightPx,
      frameWidthPx,
      frameHeightPx,
      labelPreviewScale,
      labelPreviewWidthPx,
      labelPreviewHeightPx,
      rawLabelWidthPx,
      rawLabelHeightPx,
      sheetScale,
      viewportWidthPx,
      viewportHeightPx,
    },
  };
}
