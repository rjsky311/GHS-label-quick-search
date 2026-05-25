import { isFullPagePrimaryLayout } from "@/utils/printContentPolicy";

export const buildPrintStyles = (model) => {
  const { layout } = model;
  const isLandscape = layout.page?.orientation === "landscape";
  const isFullPagePrimary = isFullPagePrimaryLayout(layout);
  const compliancePictogramSize = layout.typography.compliancePictogramSize;
  const standardPictogramSize =
    layout.typography.standardPictogramSize ||
    (layout.size === "small"
      ? "8.5mm"
      : layout.size === "medium"
        ? "10.5mm"
        : "13mm");
  const standardRailColumn =
    layout.typography.standardRailColumn ||
    (layout.size === "small"
      ? "19mm"
      : layout.size === "medium"
        ? "24.5mm"
        : "30mm");
  const standardPictogramGap =
    layout.typography.standardPictogramGap || "0.8mm";
  const iconPictogramSize =
    layout.typography.iconPictogramSize ||
    (layout.size === "small"
      ? "9.5mm"
      : layout.size === "medium"
        ? "13mm"
        : "18mm");
  const qrPictogramSize =
    layout.typography.qrPictogramSize ||
    (layout.size === "small" ? "6.5mm" : "9mm");
  const complianceAlertColumn =
    isFullPagePrimary
      ? "minmax(64mm, 66mm)"
      : layout.size === "large"
      ? "minmax(38mm, 43mm)"
      : layout.size === "medium"
        ? "minmax(28mm, 34mm)"
        : "minmax(20mm, 24mm)";

  return `
    @page {
      size: ${layout.page.size || "A4"}${isLandscape ? " landscape" : ""};
      margin: ${layout.page.margin};
    }
    * {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
    }
    body {
      font-family: "Microsoft JhengHei", "PingFang TC", "Noto Sans TC", "Helvetica Neue", Arial, sans-serif;
      padding: 0;
      background: #fff;
    }
    .page {
      position: relative;
      min-height: ${layout.page.minHeight};
      padding: ${layout.page.padding};
      page-break-after: always;
    }
    .page:last-child {
      page-break-after: auto;
    }
    .page-grid {
      display: grid;
      grid-template-columns: repeat(${layout.page.cols}, ${layout.label.width});
      column-gap: ${layout.page.columnGap};
      row-gap: ${layout.page.rowGap};
      justify-content: center;
      align-content: start;
      transform: translate(${layout.page.nudgeX}, ${layout.page.nudgeY});
      transform-origin: top left;
    }
    .page-number {
      position: absolute;
      bottom: 1mm;
      right: 3mm;
      font-size: 8px;
      color: #999;
    }
    .page-footer-note {
      position: absolute;
      bottom: 1mm;
      left: 3mm;
      right: ${layout.page.footerReserveRight};
      font-size: 7px;
      color: #999;
      font-style: italic;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .label {
      width: ${layout.label.width};
      height: ${layout.label.height};
      border: ${layout.label.borderWidth} solid #222;
      border-radius: ${layout.label.radius};
      padding: ${layout.label.padding};
      page-break-inside: avoid;
      display: flex;
      flex-direction: column;
      position: relative;
      background: #fff;
      overflow: hidden;
      font-size: ${layout.typography.fontSize};
      box-shadow: none;
    }
    .label-full {
      display: flex;
      flex-direction: column;
      gap: 1mm;
      max-height: ${layout.label.height};
      border-width: 0.65mm;
      border-radius: 1mm;
      padding: calc(${layout.label.padding} + 0.3mm);
      min-height: 0;
    }
    .label-full-page-primary {
      display: grid;
      grid-template-rows: auto minmax(0, 1fr) auto;
      gap: 1.15mm;
      padding: 3.8mm;
      border-width: 0.8mm;
      border-radius: 1.2mm;
      overflow: hidden;
    }
    .label-qr {
      flex-direction: row;
      gap: 2mm;
      overflow: hidden;
    }
    .label-top {
      flex-shrink: 0;
      border-bottom: 1px solid #cbd5e1;
      padding-bottom: 1.2mm;
      margin-bottom: 1.3mm;
    }
    .label-top-standard {
      background: linear-gradient(180deg, #f8fafc 0%, #ffffff 100%);
      margin: -0.6mm -0.6mm 1.3mm -0.6mm;
      padding: 0.6mm 0.6mm 1.2mm 0.6mm;
      border-radius: 1.4mm 1.4mm 0 0;
    }
    .label-standard .label-top-standard {
      margin: calc(${layout.label.padding} * -0.4) calc(${layout.label.padding} * -0.4) 0.8mm calc(${layout.label.padding} * -0.4);
      padding: 0.45mm 0.65mm 0.75mm 0.65mm;
    }
    .label-middle {
      flex: 1;
      display: flex;
      flex-direction: column;
      justify-content: center;
      align-items: center;
      min-height: 0;
    }
    .label-middle.compact {
      flex: 0;
      margin-bottom: 1.2mm;
    }
    .label-middle-standard {
      align-items: stretch;
      justify-content: flex-start;
    }
    .label-bottom {
      flex-shrink: 0;
      margin-top: auto;
    }
    .label-full .label-bottom {
      flex: 1;
      min-height: 0;
      margin-top: 0;
    }

    .compliance-header {
      border-bottom: 0.35mm solid #111827;
      padding-bottom: 1mm;
      min-width: 0;
    }
    .compliance-header-identity {
      min-width: 0;
    }
    .label-full-page-primary .compliance-header {
      display: grid;
      grid-template-columns: minmax(0, 1fr) auto;
      gap: 2mm;
      align-items: start;
      padding-bottom: 0.7mm;
    }
    .compliance-header-actions {
      display: flex;
      flex-direction: column;
      align-items: flex-end;
      gap: 0.7mm;
      min-width: max-content;
      max-width: 50mm;
    }
    .label-full-page-primary .compliance-header-actions .meta-chip {
      margin: 0;
      justify-content: flex-end;
    }
    .label-full-page-primary .compliance-header-actions .compliance-header-cas {
      max-width: 50mm;
      padding: 0.32mm 1mm;
      font-size: 10.5px;
      line-height: 1.08;
    }
    .continuation-badge {
      display: inline-flex;
      width: fit-content;
      margin-top: 0.9mm;
      padding: 0.35mm 1.1mm;
      border: 0.25mm solid #bfdbfe;
      border-radius: 999px;
      background: #eff6ff;
      color: #1d4ed8;
      font-size: 8px;
      font-weight: 800;
      line-height: 1.1;
    }
    .compliance-header .profile-block,
    .compliance-header .custom-fields {
      display: none;
    }
    .compliance-core {
      display: grid;
      grid-template-columns: ${complianceAlertColumn} minmax(0, 1fr);
      gap: 2.2mm;
      align-items: stretch;
      min-height: 0;
      overflow: hidden;
    }
    .label-full-page-primary .compliance-core-no-alert {
      grid-template-columns: minmax(0, 1fr);
    }
    .compliance-alert-panel {
      display: flex;
      flex-direction: column;
      gap: 1.2mm;
      align-items: stretch;
      min-width: 0;
    }
    .label-full-page-primary .compliance-alert-panel {
      border: 0.2mm solid #dbe4ef;
      border-radius: 1mm;
      padding: 0.75mm 1mm;
      background: #f8fafc;
      gap: 0.8mm;
      justify-content: center;
      overflow: hidden;
    }
    .compliance-statements-panel {
      display: grid;
      grid-template-rows: auto minmax(0, 1fr);
      gap: 1.4mm;
      min-width: 0;
      min-height: 0;
      overflow: hidden;
    }
    .compliance-hazard-panel,
    .compliance-precaution-panel {
      min-width: 0;
      overflow: hidden;
    }
    .compliance-precaution-panel {
      border-top: 0.25mm solid #cbd5e1;
      padding-top: 0.8mm;
    }
    .label-continuation-page .compliance-statements-panel {
      grid-template-rows: auto minmax(0, 1fr);
    }
    .label-continuation-page .compliance-precaution-panel:first-child {
      border-top: 0;
      padding-top: 0;
    }
    .section-label {
      color: #475569;
      font-size: calc(${layout.typography.fontSize} - 4px);
      font-weight: 800;
      text-transform: uppercase;
      margin-bottom: 0.7mm;
    }
    .compliance-hazard-list,
    .compliance-precaution-list {
      display: flex;
      flex-direction: column;
      gap: 0.45mm;
    }
    .compliance-statement {
      display: grid;
      grid-template-columns: minmax(13mm, max-content) minmax(0, 1fr);
      gap: var(--compliance-code-gap, 1.1mm);
      break-inside: avoid;
      align-items: start;
    }
    .compliance-precaution-list .compliance-statement {
      grid-template-columns: minmax(20mm, 28mm) minmax(0, 1fr);
    }
    .statement-code {
      font-family: "Consolas", "Monaco", "Courier New", monospace;
      font-weight: 800;
      color: #111827;
      white-space: nowrap;
      line-height: 1.05;
    }
    .statement-code-long {
      white-space: normal;
      overflow-wrap: anywhere;
      word-break: break-word;
    }
    .statement-text {
      color: #222;
      overflow-wrap: anywhere;
      min-width: 0;
    }
    .compliance-footer {
      display: grid;
      grid-template-columns: minmax(0, 1fr) auto;
      gap: 1.5mm;
      align-items: end;
      border-top: 0.25mm solid #cbd5e1;
      padding-top: 1mm;
      min-width: 0;
      margin-top: auto;
    }
    .compliance-footer-no-qr {
      grid-template-columns: minmax(0, 1fr);
    }
    .compliance-supplier {
      min-width: 0;
    }
    .compliance-footer .profile-block {
      margin-top: 0;
      border-radius: 0;
      background: #fff;
    }
    .profile-block-missing {
      border-style: dashed;
      color: #92400e;
      background: #fffbeb;
      font-weight: 700;
    }
    .compliance-footer .custom-fields {
      margin-top: 0.7mm;
    }
    .compliance-qr {
      display: flex;
      flex-direction: column;
      align-items: center;
      width: ${layout.typography.qrBox};
      flex: 0 0 ${layout.typography.qrBox};
      text-align: center;
    }
    .compliance-qr-shell {
      width: ${layout.typography.qrBox};
      height: ${layout.typography.qrBox};
      padding: 1.2mm;
      border: 0.25mm solid #cbd5e1;
      border-radius: 1.2mm;
      background: #fff;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    .compliance-qr .qrcode-img {
      width: calc(${layout.typography.qrBox} - 3.2mm);
      height: calc(${layout.typography.qrBox} - 3.2mm);
    }
    .label-full-page-primary .compliance-footer {
      margin-top: 0;
      padding-top: 1.1mm;
    }
    .label-full-page-primary .compliance-footer .profile-block {
      padding: 0.8mm 1mm;
    }
    .label-full-page-primary .compliance-footer .profile-row {
      font-size: 9px;
      line-height: 1.18;
    }
    .name-section {
      text-align: left;
      min-width: 0;
    }
    .label-full-page-primary .name-section {
      padding-bottom: 0.45mm;
    }
    .label-top-identity {
      border-bottom: 0.25mm solid #cbd5e1;
      padding-bottom: 0.9mm;
      margin-bottom: 0.9mm;
    }
    .small-identity {
      display: grid;
      gap: 0.5mm;
      min-width: 0;
      line-height: 1.16;
    }
    .small-cas {
      font-family: "Consolas", "Monaco", "Courier New", monospace;
      color: #334155;
      font-weight: 800;
      line-height: 1.14;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: clip;
    }
    .small-name-en {
      color: #0f172a;
      font-weight: 850;
      line-height: 1.16;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
      min-width: 0;
    }
    .small-name-zh {
      color: #334155;
      font-weight: 750;
      line-height: 1.16;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
      min-width: 0;
    }
    .small-identity .continuation-badge {
      position: absolute;
      right: 1mm;
      bottom: 0.9mm;
      margin-top: 0;
      padding: 0.18mm 0.65mm;
      font-size: 5.2px;
      line-height: 1;
      border-radius: 999px;
      z-index: 2;
    }
    .name-section-compact {
      display: grid;
      gap: 0.25mm;
    }
    .name-section-compact .name-en {
      -webkit-line-clamp: 1;
    }
    .name-section-compact .name-zh {
      display: -webkit-box;
      -webkit-line-clamp: 1;
      -webkit-box-orient: vertical;
      overflow: hidden;
    }
    .name-en {
      font-weight: 800;
      font-size: ${layout.typography.titleSize};
      line-height: 1.08;
      color: #0f172a;
      word-wrap: break-word;
      overflow-wrap: break-word;
      display: -webkit-box;
      -webkit-line-clamp: 2;
      -webkit-box-orient: vertical;
      overflow: hidden;
    }
    .label-full-page-primary .name-en {
      font-size: 26px;
      line-height: 1.18;
      -webkit-line-clamp: 1;
    }
    .name-zh {
      font-size: calc(${layout.typography.titleSize} - 2px);
      color: #334155;
      margin-top: 0.5mm;
    }
    .label-full-page-primary .name-zh {
      font-size: 26px;
      line-height: 1.18;
      margin-top: 0.25mm;
    }
    .label-standard .name-en {
      font-size: max(${layout.typography.titleSize}, calc(${layout.typography.fontSize} + 2px));
      line-height: 1.05;
      -webkit-line-clamp: 1;
    }
    .label-standard.label-form-bottle .name-en,
    .label-standard.label-form-roomy .name-en {
      font-size: max(7.5px, calc(${layout.typography.titleSize} - 1px));
      line-height: 1.04;
      -webkit-line-clamp: 2;
      word-break: break-word;
      hyphens: auto;
    }
    .label-standard .name-zh {
      font-size: max(6px, calc(${layout.typography.fontSize} - 0.5px));
      line-height: 1.05;
      margin-top: 0.25mm;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }
    .cas {
      font-family: "Consolas", "Monaco", "Courier New", monospace;
      font-size: max(6px, calc(${layout.typography.fontSize} - 0.8px));
      color: #475569;
      margin-top: 0.65mm;
      white-space: nowrap;
    }
    .label-full-page-primary .cas {
      font-size: 16px;
      margin-top: 1.1mm;
    }
    .meta-ribbon {
      display: flex;
      flex-wrap: wrap;
      gap: 0.8mm;
      margin-top: 0.9mm;
      align-items: center;
    }
    .label-standard .meta-ribbon {
      gap: 0.45mm;
      margin-top: 0.45mm;
      flex-wrap: nowrap;
      overflow: hidden;
    }
    .meta-chip {
      display: inline-flex;
      align-items: center;
      gap: 0.7mm;
      min-width: 0;
      max-width: 100%;
      padding: 0.45mm 1.15mm;
      border-radius: 999px;
      border: 1px solid #dbe4ef;
      background: #f8fafc;
      color: #334155;
      font-size: calc(${layout.typography.fontSize} - 3px);
      line-height: 1.15;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }
    .label-standard .meta-chip {
      gap: 0.45mm;
      padding: 0.25mm 0.65mm;
      font-size: max(5.5px, calc(${layout.typography.fontSize} - 3px));
      line-height: 1.05;
    }
    .meta-chip-label {
      color: #64748b;
      font-weight: 600;
    }
    .meta-chip-value {
      min-width: 0;
      overflow: hidden;
      text-overflow: ellipsis;
    }
    .meta-chip-cas .meta-chip-value {
      font-family: "Consolas", "Monaco", "Courier New", monospace;
      margin-left: 0.15mm;
      overflow: visible;
      text-overflow: clip;
    }
    .meta-ribbon .support-chip {
      margin: 0;
    }
    .meta-chip-batch {
      border-color: #bfdbfe;
      background: #eff6ff;
      color: #1e3a8a;
      font-weight: 800;
      overflow: visible;
      text-overflow: clip;
    }
    .meta-chip-batch .meta-chip-value {
      font-family: "Consolas", "Monaco", "Courier New", monospace;
      overflow: visible;
      text-overflow: clip;
    }
    .meta-chip-prepared {
      background: #dbeafe;
      border-color: #93c5fd;
      color: #1d4ed8;
      font-weight: 700;
    }
    .meta-chip-prepared-detail {
      background: #eff6ff;
      border-color: #bfdbfe;
      color: #1e3a8a;
    }
    .support-chips {
      display: flex;
      flex-wrap: wrap;
      gap: 0.7mm;
      margin-top: 0.8mm;
    }
    .support-chip {
      display: inline-flex;
      align-items: center;
      border-radius: 999px;
      border: 1px solid #cbd5e1;
      background: #f8fafc;
      padding: 0.3mm 1.2mm;
      font-size: calc(${layout.typography.fontSize} - 3px);
      color: #475569;
      line-height: 1.2;
      max-width: 100%;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }
    .support-chip-critical {
      border-color: #93c5fd;
      background: #eff6ff;
      color: #1e3a8a;
      font-weight: 800;
      max-width: 100%;
      overflow: visible;
      text-overflow: clip;
    }
    .custom-fields {
      font-size: calc(${layout.typography.fontSize} - 2px);
      color: #64748b;
      margin-top: 0.6mm;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }
    .profile-block {
      margin-top: 0.8mm;
      padding: 0.6mm 0.8mm;
      border: 0.2mm solid #cbd5e1;
      background: #f8fafc;
      color: #1f2937;
      border-radius: 1mm;
    }
    .profile-block-compact {
      padding: 0.4mm 0.6mm;
    }
    .profile-row {
      font-size: calc(${layout.typography.fontSize} - 2px);
      line-height: 1.25;
    }
    .profile-org {
      font-weight: bold;
    }
    .profile-address {
      color: #475569;
    }
    .profile-label {
      color: #475569;
      font-weight: bold;
    }

    .prepared-badge {
      display: inline-block;
      font-size: calc(${layout.typography.fontSize} - 2px);
      font-weight: bold;
      color: #1e40af;
      background: #dbeafe;
      border: 1px solid #60a5fa;
      border-radius: 1.5mm;
      padding: 0.3mm 1.5mm;
      margin-top: 0.8mm;
    }
    .prepared-meta {
      margin-top: 0.8mm;
      font-size: calc(${layout.typography.fontSize} - 1px);
      line-height: 1.2;
      color: #1e3a8a;
    }
    .prepared-meta-row,
    .prepared-operational-row {
      display: block;
      word-break: break-word;
    }
    .prepared-label,
    .prepared-operational-label {
      font-weight: 600;
      margin-right: 0.8mm;
    }
    .prepared-label {
      color: #1e40af;
    }
    .prepared-value {
      color: #1e3a8a;
    }
    .prepared-note {
      margin-top: 1.2mm;
      padding: 0.8mm 1.2mm;
      font-size: calc(${layout.typography.fontSize} - 3px);
      line-height: 1.25;
      color: #1e3a8a;
      background: #eff6ff;
      border-left: 1.5px solid #60a5fa;
      border-radius: 0.5mm;
    }
    .prepared-operational {
      margin-top: 0.6mm;
      font-size: calc(${layout.typography.fontSize} - 2px);
      line-height: 1.2;
      color: #374151;
    }
    .prepared-operational-label {
      color: #4b5563;
    }
    .prepared-operational-value {
      color: #111827;
    }

    .pictograms {
      display: flex;
      flex-wrap: wrap;
      gap: 2mm;
      justify-content: center;
      align-items: center;
    }
    .pictograms img {
      width: ${layout.typography.imgSize};
      height: ${layout.typography.imgSize};
      object-fit: contain;
      background: #fff;
      border: 0;
      border-radius: 0;
    }
    .pictograms.compact img {
      width: calc(${layout.typography.imgSize} - 4px);
      height: calc(${layout.typography.imgSize} - 4px);
    }
    .pictograms-icon {
      display: grid;
      grid-template-columns: repeat(2, ${iconPictogramSize});
      justify-content: center;
      align-items: center;
      gap: 0.9mm;
    }
    .pictograms-icon img {
      width: ${iconPictogramSize};
      height: ${iconPictogramSize};
    }
    .pictograms-standard {
      display: grid;
      grid-template-columns: repeat(2, ${standardPictogramSize});
      justify-content: center;
      align-items: center;
      gap: ${standardPictogramGap};
    }
    .pictograms-standard img {
      width: ${standardPictogramSize};
      height: ${standardPictogramSize};
    }
    .pictograms.qr-pics {
      justify-content: flex-start;
      gap: 0.85mm;
    }
    .pictograms.qr-pics img {
      width: ${qrPictogramSize};
      height: ${qrPictogramSize};
    }
    .pictograms.compliance-pictograms {
      display: grid;
      grid-template-columns: repeat(2, minmax(16mm, 1fr));
      gap: 1.4mm;
      justify-items: center;
      align-items: center;
    }
    .label-full-page-primary .pictograms.compliance-pictograms {
      display: flex;
      flex-wrap: nowrap;
      justify-content: flex-start;
      align-items: center;
      gap: 1.2mm;
      width: 100%;
    }
    .pictograms.compliance-pictograms img {
      width: ${compliancePictogramSize};
      height: ${compliancePictogramSize};
    }
    .signal {
      display: inline-block;
      font-weight: bold;
      font-size: ${layout.typography.signalSize};
      padding: 1.2mm 3.6mm;
      border-radius: 1mm;
      text-align: center;
      margin: 1mm 0 0 0;
    }
    .signal.compact {
      font-size: calc(${layout.typography.signalSize} - 2px);
      padding: 1mm 3mm;
    }
    .signal.qr-signal {
      margin: 0 0 1mm 0;
      width: fit-content;
      font-size: calc(${layout.typography.signalSize} - 2px);
      padding: 0.8mm 2.2mm;
    }
    .signal.signal-inline {
      margin: 0;
      width: fit-content;
      font-size: calc(${layout.typography.signalSize} - 3px);
      padding: 0.55mm 1.8mm;
      border-radius: 999px;
    }
    .signal.compliance-signal {
      display: block;
      width: 100%;
      margin: 0;
      border-radius: 0.8mm;
      padding: 0.9mm 1.2mm;
      font-size: ${layout.typography.signalSize};
      line-height: 1.1;
    }
    .label-full-page-primary .signal.compliance-signal {
      width: fit-content;
      max-width: 48mm;
      font-size: calc(${layout.typography.signalSize} - 2px);
      padding: 0.65mm 1.7mm;
      white-space: nowrap;
    }
    .label-full-page-primary .compliance-header-actions .continuation-badge {
      margin: 0;
      font-size: 8.5px;
      padding: 0.32mm 1mm;
      white-space: nowrap;
    }
    .signal.danger {
      background: #fecaca;
      color: #b91c1c;
      border: 1.5px solid #dc2626;
    }
    .signal.warning {
      background: #fef08a;
      color: #a16207;
      border: 1.5px solid #ca8a04;
    }
    .signal-placeholder {
      height: 4mm;
    }
    .signal-stack {
      margin-top: 1.2mm;
    }

    .standard-grid {
      display: grid;
      grid-template-columns: minmax(0, ${standardRailColumn}) minmax(0, 1fr);
      gap: 1.35mm;
      width: 100%;
      min-height: 0;
      align-items: start;
    }
    .standard-grid-no-pics {
      grid-template-columns: minmax(0, 1fr);
    }
    .standard-rail {
      display: block;
      align-self: start;
      padding-right: 0.9mm;
      border-right: 1px solid #dbe4ef;
      min-width: 0;
    }
    .standard-main {
      display: flex;
      flex-direction: column;
      gap: 0.6mm;
      min-width: 0;
    }
    .standard-signal-row {
      display: flex;
      align-items: center;
      justify-content: flex-start;
      min-height: 0;
    }
    .standard-hazard-board {
      display: flex;
      flex-direction: column;
      justify-content: flex-start;
      gap: 0.55mm;
      min-width: 0;
    }
    .hazard-primary-list {
      display: flex;
      flex-direction: column;
      gap: 0.5mm;
    }
    .hazard-code-list {
      flex-direction: row;
      flex-wrap: wrap;
      align-items: center;
      gap: 0.45mm;
    }
    .hazard-primary-item {
      padding: 0.45mm 0.7mm;
      border-radius: 0.9mm;
      background: #fffaf5;
      border: 1px solid #fed7aa;
      color: #7c2d12;
      font-weight: 600;
      font-size: max(5.5px, calc(${layout.typography.hazardSize} - 1px));
      line-height: 1.08;
    }
    .hazard-summary-item {
      display: grid;
      grid-template-columns: max-content minmax(0, 1fr);
      gap: 0.7mm;
      align-items: start;
    }
    .hazard-summary-code {
      font-family: "Consolas", "Monaco", "Courier New", monospace;
      color: #7c2d12;
      font-weight: 900;
      white-space: nowrap;
    }
    .hazard-summary-text {
      min-width: 0;
      overflow-wrap: anywhere;
    }
    .hazard-more {
      padding: 0.35mm 0.6mm;
      border-radius: 0.9mm;
      border: 1px dashed #cbd5e1;
      background: #f8fafc;
      color: #475569;
      font-size: max(5px, calc(${layout.typography.hazardSize} - 1.5px));
      font-weight: 600;
      line-height: 1.05;
    }
    .hazard-item {
      margin-bottom: 0;
    }
    .hazard-code-only {
      min-width: 8mm;
      text-align: center;
      font-size: max(6.5px, calc(${layout.typography.hazardSize} - 0.5px));
      line-height: 1;
      padding: 0.45mm 0.9mm;
    }
    .no-hazard {
      color: #166534;
      font-weight: 600;
      text-align: center;
      padding: 3mm 0;
    }
    .no-hazard-text {
      color: #64748b;
      font-style: italic;
    }
    .precautions-compact {
      border-top: 1px dotted #cbd5e1;
      padding-top: 0.45mm;
      font-size: max(5px, calc(${layout.typography.hazardSize} - 1.5px));
      line-height: 1.08;
    }
    .label-full-page-primary .compliance-core {
      grid-template-columns: minmax(0, 1fr);
      grid-template-rows: auto minmax(0, 1fr);
      gap: 1.25mm;
      min-height: 0;
    }
    .label-full-page-primary .compliance-core.compliance-core-no-alert {
      grid-template-rows: minmax(0, 1fr);
    }
    .label-full-page-primary .compliance-alert-panel {
      display: grid;
      grid-template-columns: minmax(0, 1fr);
      align-items: center;
    }
    .label-full-page-primary .section-label {
      font-size: 7px;
      margin-bottom: 0.32mm;
      letter-spacing: 0;
    }
    .label-full-page-primary .compliance-hazard-list {
      gap: 0.2mm;
    }
    .label-full-page-primary .compliance-precaution-list {
      display: flex;
      flex-direction: column;
      gap: 0.2mm;
    }
    .label-full-page-primary .compliance-statement {
      break-inside: avoid;
      page-break-inside: avoid;
      margin-bottom: var(--compliance-statement-gap, 0.42mm);
    }
    .label-full-page-primary .compliance-hazard-list .compliance-statement {
      grid-template-columns: minmax(var(--hazard-code-min, 8.5mm), max-content) minmax(0, 1fr);
    }
    .label-full-page-primary .compliance-precaution-list .compliance-statement {
      display: grid;
      grid-template-columns: minmax(var(--hazard-code-min, 8.5mm), max-content) minmax(0, 1fr);
      gap: var(--compliance-code-gap, 0.8mm);
    }
    .label-full-page-primary .statement-code-long {
      white-space: nowrap;
      overflow-wrap: normal;
      word-break: normal;
    }
    .precaution-code {
      display: inline-block;
      font-family: "Consolas", "Monaco", "Courier New", monospace;
      font-size: calc(${layout.typography.hazardSize} - 1px);
      color: #1e3a8a;
      margin-right: 1.5mm;
    }
    .precaution-more {
      font-size: calc(${layout.typography.hazardSize} - 1px);
      color: #64748b;
      font-style: italic;
    }

    .qr-left {
      flex: 1;
      min-width: 0;
    }
    .qr-left-scan {
      display: flex;
      flex-direction: column;
      justify-content: space-between;
      gap: 1.2mm;
      padding-right: 1.8mm;
      border-right: 1px dashed #cbd5e1;
    }
    .qr-identity {
      display: flex;
      flex-direction: column;
      gap: 0.6mm;
    }
    .qr-priority-block {
      display: flex;
      flex-direction: column;
      gap: 0.9mm;
      padding: 1.2mm 1.4mm;
      border: 1px solid #e2e8f0;
      border-radius: 1.2mm;
      background: linear-gradient(180deg, #f8fafc 0%, #ffffff 100%);
    }
    .qr-hazard-list {
      display: flex;
      flex-direction: column;
      gap: 0.7mm;
    }
    .qr-hazard-chip {
      display: inline-flex;
      align-items: center;
      flex-wrap: wrap;
      font-size: calc(${layout.typography.hazardSize} - 1px);
      line-height: 1.2;
      color: #7c2d12;
      font-weight: 600;
      padding: 0.7mm 0.9mm;
      border-radius: 999px;
      background: #fff7ed;
      border: 1px solid #fed7aa;
    }
    .qr-hazard-summary {
      display: inline;
      margin-left: 0.7mm;
      color: #92400e;
      font-weight: 500;
    }
    .qr-hazard-more {
      width: fit-content;
      border-color: #dbe4ef;
      background: #ffffff;
    }
    .qr-no-hazard {
      font-size: calc(${layout.typography.hazardSize} - 1px);
    }
    .qr-support-row {
      display: flex;
      align-items: center;
      min-height: calc(${layout.typography.imgSize} - 6px);
      padding-top: 0.7mm;
      border-top: 1px dotted #dbe4ef;
    }
    .qr-right {
      width: ${layout.typography.qrBox};
      flex: 0 0 ${layout.typography.qrBox};
    }
    .qr-panel {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      gap: 1mm;
      padding-left: 0.5mm;
      text-align: center;
    }
    .qr-code-shell {
      width: ${layout.typography.qrBox};
      height: ${layout.typography.qrBox};
      padding: 1.5mm;
      border: 1px solid #cbd5e1;
      border-radius: 2mm;
      background: #fff;
      display: flex;
      align-items: center;
      justify-content: center;
      box-shadow: inset 0 0 0 0.5mm #f8fafc;
    }
    .qrcode-img {
      width: calc(${layout.typography.qrBox} - 3mm);
      height: calc(${layout.typography.qrBox} - 3mm);
    }
    .label-standard.label-form-strip {
      padding: 1.6mm;
    }
    .label-standard.label-form-strip .label-top-standard {
      margin: -0.45mm -0.45mm 0.5mm -0.45mm;
      padding: 0.35mm 0.45mm 0.5mm 0.45mm;
    }
    .label-standard.label-form-strip .name-en {
      font-size: max(7px, calc(${layout.typography.fontSize} + 0.8px));
      line-height: 1;
    }
    .label-standard.label-form-strip .identity-density-medium .name-en {
      font-size: 6.5px;
    }
    .label-standard.label-form-strip .identity-density-high .name-en {
      font-size: 5.9px;
    }
    .label-standard.label-form-strip .cas,
    .label-qr.label-form-strip .cas {
      font-size: 6px;
      line-height: 1;
      margin-top: 0.25mm;
      white-space: nowrap;
      overflow: visible;
      text-overflow: clip;
    }
    .label-standard.label-form-strip .standard-grid {
      display: flex;
      flex-direction: column;
      gap: 0.85mm;
    }
    .label-standard.label-form-strip .standard-rail {
      padding: 0 0 0.45mm 0;
      border-right: 0;
      border-bottom: 1px solid #dbe4ef;
    }
    .label-standard.label-form-strip .pictograms-standard {
      grid-template-columns: repeat(4, ${standardPictogramSize});
      justify-content: flex-start;
      gap: 0.45mm;
    }
    .label-standard.label-form-strip .standard-main {
      gap: 0.38mm;
    }
    .label-standard.label-form-strip .standard-hazard-board,
    .label-standard.label-form-strip .hazard-primary-list {
      gap: 0.32mm;
    }
    .label-standard.label-form-strip .hazard-primary-item {
      padding: 0.28mm 0.45mm;
      font-size: 5.5px;
      line-height: 1.02;
    }
    .label-standard.label-form-strip .hazard-more,
    .label-standard.label-form-strip .precautions-compact,
    .label-standard.label-form-strip .precaution-more {
      font-size: 5px;
      line-height: 1.02;
    }
    .label-standard.label-form-strip .signal.signal-inline {
      font-size: 6px;
      padding: 0.35mm 1.2mm;
    }
    .label-icon.label-form-strip {
      padding: 1.25mm;
      gap: 0.3mm;
    }
    .label-icon.label-form-strip .label-top-identity {
      border-bottom: 0;
      padding-bottom: 0;
      margin-bottom: 0;
    }
    .label-icon.label-form-strip .small-identity {
      gap: 0.14mm;
    }
    .label-icon.label-form-strip .small-cas {
      font-size: 6.6px;
      line-height: 1.14;
    }
    .label-icon.label-form-strip .small-name-en {
      font-size: 6.35px;
      line-height: 1.16;
    }
    .label-icon.label-form-strip .identity-density-medium .small-name-en,
    .label-icon.label-form-strip .identity-density-medium .small-name-zh {
      font-size: 5.85px;
    }
    .label-icon.label-form-strip .identity-density-high .small-name-en,
    .label-icon.label-form-strip .identity-density-high .small-name-zh {
      font-size: 5.3px;
    }
    .label-icon.label-form-strip .small-name-zh {
      font-size: 6.35px;
      line-height: 1.16;
    }
    .label-icon.label-form-strip .identity-density-medium .small-cas {
      font-size: 6px;
    }
    .label-icon.label-form-strip .identity-density-high .small-cas {
      font-size: 5.6px;
    }
    .label-icon.label-form-strip .cas {
      display: block;
      font-size: 5.6px;
      line-height: 1;
      margin-top: 0;
      white-space: nowrap;
      overflow: visible;
      text-overflow: clip;
    }
    .label-icon.label-form-strip .identity-density-medium .cas,
    .label-icon.label-form-strip .identity-density-high .cas {
      font-size: 5.2px;
    }
    .label-icon.label-form-strip .meta-ribbon {
      margin-top: 0.2mm;
      gap: 0.25mm;
      flex-wrap: wrap;
      overflow: visible;
    }
    .label-icon.label-form-strip .meta-chip {
      gap: 0.45mm;
      padding: 0.12mm 0.5mm;
      font-size: 5.2px;
      line-height: 1;
    }
    .label-icon.label-form-strip .meta-chip-cas .meta-chip-value {
      margin-left: 0.25mm;
    }
    .label-icon.label-form-strip .meta-chip-cas,
    .label-icon.label-form-strip .meta-chip-batch {
      flex: 0 0 auto;
      max-width: none;
      overflow: visible;
      text-overflow: clip;
    }
    .label-icon.label-form-strip .meta-chip-cas {
      padding: 0;
      border-color: transparent;
      background: transparent;
      color: #475569;
    }
    .label-icon.label-form-strip .label-middle {
      flex: 1 1 auto;
      justify-content: center;
    }
    .label-icon.label-form-strip .pictograms-icon {
      grid-template-columns: repeat(6, ${iconPictogramSize});
      gap: 0.4mm;
    }
    .label-icon.label-stock-small-strip .label-middle,
    .label-icon.label-stock-small-rack .label-middle,
    .label-icon.label-stock-brother-62mm-continuous .label-middle,
    .label-icon.label-stock-medium-rack .label-middle {
      justify-content: center;
    }
    .label-icon.label-stock-small-strip .pictograms-icon {
      grid-template-columns: repeat(5, 8.2mm);
      gap: 0.45mm;
    }
    .label-icon.label-stock-small-strip .pictograms-icon img {
      width: 8.2mm;
      height: 8.2mm;
    }
    .label-icon.label-stock-small-rack .label-top {
      padding-bottom: 0.45mm;
      margin-bottom: 0.45mm;
    }
    .label-icon.label-stock-small-rack .pictograms-icon {
      grid-template-columns: repeat(4, 11.4mm);
      gap: 0.35mm;
    }
    .label-icon.label-stock-small-rack .pictograms-icon img {
      width: 11.4mm;
      height: 11.4mm;
    }
    .label-icon.label-stock-small-rack .signal {
      font-size: 5.5px;
      min-width: 11mm;
      padding: 0.25mm 0.85mm;
    }
    .label-icon.label-stock-brother-62mm-continuous .pictograms-icon {
      grid-template-columns: repeat(5, 9.9mm);
      gap: 0.55mm;
    }
    .label-icon.label-stock-brother-62mm-continuous .pictograms-icon img {
      width: 9.9mm;
      height: 9.9mm;
    }
    .label-icon.label-stock-medium-rack .label-top {
      padding-bottom: 0.55mm;
      margin-bottom: 0.55mm;
    }
    .label-icon.label-stock-medium-rack .pictograms-icon {
      grid-template-columns: repeat(4, 10.8mm);
      gap: 0.9mm;
    }
    .label-icon.label-stock-medium-rack .pictograms-icon img {
      width: 10.8mm;
      height: 10.8mm;
    }
    .label-icon.label-stock-brother-62mm-continuous .signal,
    .label-icon.label-stock-medium-rack .signal {
      font-size: 5.8px;
      min-width: 12mm;
      padding: 0.28mm 0.9mm;
    }
    .label-icon.label-form-compact .label-top {
      padding-bottom: 0.6mm;
      margin-bottom: 0.6mm;
    }
    .label-icon.label-form-compact .pictograms-icon {
      gap: 0.75mm;
    }
    .label-icon.label-form-compact .signal {
      margin-top: 0.5mm;
      padding: 0.45mm 1.4mm;
      font-size: max(6.2px, calc(${layout.typography.signalSize} - 4px));
    }
    .label-standard.label-form-roomy .standard-grid {
      grid-template-columns: minmax(0, ${standardRailColumn}) minmax(0, 1fr);
      gap: 3mm;
      align-items: start;
    }
    .label-standard.label-form-roomy .label-top-standard {
      margin: -1mm -1mm 1.4mm -1mm;
      padding: 0.65mm 1mm 1mm 1mm;
      border-bottom: 0.35mm solid #111827;
      background: #fff;
    }
    .label-standard.label-form-roomy .name-en {
      font-size: max(15px, calc(${layout.typography.titleSize} + 2px));
      line-height: 1.03;
      -webkit-line-clamp: 1;
    }
    .label-standard.label-form-roomy .name-zh {
      font-size: max(10px, calc(${layout.typography.fontSize} + 0.5px));
      line-height: 1.04;
    }
    .label-standard.label-form-roomy .meta-ribbon {
      gap: 0.65mm;
      margin-top: 0.65mm;
      flex-wrap: wrap;
      overflow: visible;
    }
    .label-standard.label-form-roomy .meta-chip {
      padding: 0.35mm 0.85mm;
      font-size: max(7px, calc(${layout.typography.fontSize} - 2px));
      line-height: 1.05;
    }
    .label-standard.label-form-roomy .standard-rail {
      padding-right: 2.1mm;
      border-right: 1px solid #cbd5e1;
    }
    .label-standard.label-form-roomy .pictograms-standard {
      gap: 1.4mm;
    }
    .label-standard.label-form-roomy .standard-main {
      gap: 1mm;
    }
    .label-standard.label-form-roomy .hazard-primary-list {
      gap: 0.7mm;
    }
    .label-standard.label-form-roomy .hazard-primary-item {
      font-size: max(8px, calc(${layout.typography.hazardSize} - 0.5px));
      line-height: 1.12;
      padding: 0.55mm 0.8mm;
    }
    .label-standard.label-form-roomy .precautions-compact {
      display: none;
    }
    .label-standard.label-stock-large-primary {
      padding: 3mm 4.2mm;
    }
    .label-standard.label-stock-large-primary .label-top-standard {
      margin: -0.4mm -0.6mm 1.35mm -0.6mm;
      padding: 0.1mm 0.2mm 0.9mm 0.2mm;
      border-bottom-width: 0.45mm;
    }
    .label-standard.label-stock-large-primary .name-en {
      font-size: 20px;
      line-height: 1;
      -webkit-line-clamp: 1;
    }
    .label-standard.label-stock-large-primary .name-zh {
      font-size: 13.5px;
      line-height: 1;
      margin-top: 0.2mm;
    }
    .label-standard.label-stock-large-primary .meta-ribbon {
      gap: 0.65mm;
      margin-top: 0.55mm;
    }
    .label-standard.label-stock-large-primary .meta-chip {
      padding: 0.28mm 0.85mm;
      font-size: 8px;
      line-height: 1.05;
    }
    .label-standard.label-stock-large-primary .label-middle-standard {
      justify-content: center;
    }
    .label-standard.label-stock-large-primary .standard-grid {
      grid-template-columns: minmax(0, 61mm) minmax(0, 1fr);
      gap: 3.8mm;
      align-items: center;
      height: auto;
      min-height: 0;
    }
    .label-standard.label-stock-large-primary .standard-rail {
      display: flex;
      align-items: center;
      justify-content: center;
      padding-right: 3mm;
      border-right-width: 0.3mm;
      min-height: 0;
    }
    .label-standard.label-stock-large-primary .pictograms-standard {
      grid-template-columns: repeat(2, 28mm);
      gap: 2.2mm;
    }
    .label-standard.label-stock-large-primary .pictograms-standard img {
      width: 28mm;
      height: 28mm;
    }
    .label-standard.label-stock-large-primary.label-pictogram-density-dense .pictograms-standard {
      grid-template-columns: repeat(2, 21mm);
      gap: 1.3mm;
    }
    .label-standard.label-stock-large-primary.label-pictogram-density-dense .pictograms-standard img {
      width: 21mm;
      height: 21mm;
    }
    .label-standard.label-stock-large-primary.label-pictogram-density-ultra .standard-grid {
      grid-template-columns: minmax(0, 58mm) minmax(0, 1fr);
      gap: 3.2mm;
    }
    .label-standard.label-stock-large-primary.label-pictogram-density-ultra .pictograms-standard {
      grid-template-columns: repeat(3, 17mm);
      gap: 1.1mm;
    }
    .label-standard.label-stock-large-primary.label-pictogram-density-ultra .pictograms-standard img {
      width: 17mm;
      height: 17mm;
    }
    .label-standard.label-stock-large-primary .standard-main {
      gap: 1mm;
      justify-content: center;
      min-height: 0;
    }
    .label-standard.label-stock-large-primary .standard-signal-row {
      min-height: 5.8mm;
    }
    .label-standard.label-stock-large-primary .signal.signal-inline {
      padding: 0.65mm 2mm;
      border-radius: 1.1mm;
      font-size: 10px;
      line-height: 1.05;
    }
    .label-standard.label-stock-large-primary .hazard-primary-list {
      gap: 0.7mm;
    }
    .label-standard.label-stock-large-primary .hazard-code-list {
      display: grid;
      grid-template-columns: repeat(2, minmax(0, 1fr));
      gap: 0.9mm;
      align-items: stretch;
      width: 100%;
    }
    .label-standard.label-stock-large-primary .hazard-primary-item {
      padding: 0.6mm 0.9mm;
      font-size: 10px;
      line-height: 1.05;
    }
    .label-standard.label-stock-large-primary .hazard-code-only {
      min-width: 0;
      font-size: 12px;
      line-height: 1;
      padding: 0.85mm 1.1mm;
    }
    .label-standard.label-stock-large-primary .hazard-more {
      padding: 0.42mm 0.75mm;
      font-size: 8px;
      line-height: 1.05;
    }
    .label-qr.label-form-strip {
      display: grid;
      grid-template-columns: minmax(0, 1fr) auto;
      grid-template-rows: auto minmax(0, 1fr);
      gap: 0.35mm 0.8mm;
      padding: 1.15mm 1.25mm;
    }
    .label-qr.label-form-strip .qr-left-scan {
      display: contents;
      border-right: 0;
      min-width: 0;
    }
    .label-qr.label-form-strip .qr-identity {
      grid-column: 1 / -1;
      grid-row: 1;
      min-width: 0;
    }
    .label-qr.label-form-strip .small-identity {
      gap: 0.12mm;
    }
    .label-qr.label-form-strip .small-cas {
      font-size: 6.15px;
      line-height: 1.14;
    }
    .label-qr.label-form-strip .small-name-en {
      font-size: 6px;
      line-height: 1.16;
      white-space: normal;
      overflow: visible;
      text-overflow: clip;
      overflow-wrap: anywhere;
    }
    .label-qr.label-form-strip .identity-density-medium .small-name-en,
    .label-qr.label-form-strip .identity-density-medium .small-name-zh {
      font-size: 5.45px;
    }
    .label-qr.label-form-strip .identity-density-high .small-name-en,
    .label-qr.label-form-strip .identity-density-high .small-name-zh {
      font-size: 5.05px;
    }
    .label-qr.label-form-strip .small-name-zh {
      font-size: 6px;
      line-height: 1.16;
      white-space: normal;
      overflow: visible;
      text-overflow: clip;
      overflow-wrap: anywhere;
    }
    .label-qr.label-form-strip .identity-density-medium .small-cas {
      font-size: 5.65px;
    }
    .label-qr.label-form-strip .identity-density-high .small-cas {
      font-size: 5.25px;
    }
    .label-qr.label-form-strip .meta-ribbon {
      margin-top: 0.2mm;
      gap: 0.25mm;
      flex-wrap: wrap;
      overflow: visible;
    }
    .label-qr.label-form-strip .meta-chip {
      gap: 0.45mm;
      padding: 0.12mm 0.5mm;
      font-size: 5.2px;
      line-height: 1;
    }
    .label-qr.label-form-strip .meta-chip-cas .meta-chip-value {
      margin-left: 0.25mm;
    }
    .label-standard.label-form-strip .meta-chip-cas,
    .label-standard.label-form-strip .meta-chip-batch,
    .label-qr.label-form-strip .meta-chip-cas,
    .label-qr.label-form-strip .meta-chip-batch {
      flex: 0 0 auto;
      max-width: none;
      overflow: visible;
      text-overflow: clip;
    }
    .label-standard.label-form-strip .meta-ribbon {
      flex-wrap: wrap;
      overflow: visible;
      gap: 0.25mm;
    }
    .label-form-strip .support-chips {
      gap: 0.25mm;
      margin-top: 0.2mm;
      overflow: visible;
    }
    .label-form-strip .support-chip {
      padding: 0.12mm 0.45mm;
      font-size: 5.1px;
      line-height: 1;
      white-space: normal;
      overflow: visible;
      text-overflow: clip;
      overflow-wrap: anywhere;
    }
    .label-form-strip .support-chip-critical {
      flex: 1 1 100%;
      justify-content: flex-start;
      font-size: 5.2px;
      line-height: 1.02;
      white-space: nowrap;
      overflow-wrap: normal;
    }
    .label-qr.label-form-strip .qr-priority-block {
      display: none;
    }
    .label-qr.label-form-strip .qr-hazard-chip {
      font-size: 5.5px;
      line-height: 1.05;
      padding: 0.25mm 0.55mm;
    }
    .label-qr.label-form-strip .qr-hazard-summary {
      display: none;
    }
    .label-qr.label-form-strip .qr-support-row {
      grid-column: 1;
      grid-row: 2;
      min-height: 0;
      padding-top: 0;
      border-top: 0;
      align-self: end;
      display: grid;
      align-items: end;
    }
    .label-qr.label-form-strip .pictograms.qr-pics {
      display: grid;
      grid-template-columns: repeat(3, 7.2mm);
      justify-content: start;
      align-content: end;
      gap: 0.28mm 0.42mm;
    }
    .label-qr.label-form-strip .pictograms.qr-pics img {
      width: 7.2mm;
      height: 7.2mm;
    }
    .label-qr.label-form-strip.label-qr-no-code {
      gap: 0;
      grid-template-columns: minmax(0, 1fr);
    }
    .label-qr.label-form-strip.label-qr-no-code .qr-left-scan {
      padding-right: 0;
      width: 100%;
      flex: 1 1 100%;
    }
    .label-qr.label-form-strip.label-qr-no-code .qr-support-row {
      grid-column: 1;
    }
    .label-qr.label-form-strip.label-qr-no-code .pictograms.qr-pics {
      display: grid;
      grid-template-columns: repeat(3, 7.4mm);
      justify-content: center;
      gap: 0.35mm;
    }
    .label-qr.label-form-strip.label-qr-no-code .pictograms.qr-pics img {
      width: 7.4mm;
      height: 7.4mm;
    }
    .label-qr.label-form-strip .qr-right {
      grid-column: 2;
      grid-row: 2;
      width: 13.85mm;
      flex: 0 0 13.85mm;
    }
    .label-qr.label-form-strip .qr-panel {
      gap: 0;
      padding-left: 0;
      justify-content: end;
      align-self: end;
      justify-self: end;
    }
    .label-qr.label-form-strip .qr-code-shell {
      width: 13.85mm;
      height: 13.85mm;
      padding: 0.25mm;
      border: 0;
      border-radius: 0;
      box-shadow: none;
    }
    .label-qr.label-form-strip .qrcode-img {
      width: 13.35mm;
      height: 13.35mm;
    }
    .label-stock-brother-62mm-continuous.label-qr.label-form-strip {
      gap: 0.65mm;
      padding: 1.35mm;
    }
    .label-stock-brother-62mm-continuous.label-qr.label-form-strip .qr-left-scan {
      padding-right: 0.65mm;
    }
    .label-stock-brother-62mm-continuous.label-qr.label-form-strip .pictograms.qr-pics {
      display: grid;
      grid-template-columns: repeat(3, minmax(0, ${qrPictogramSize}));
      justify-content: start;
      gap: 0.42mm 0.55mm;
    }
    .label-stock-brother-62mm-continuous.label-qr.label-form-strip .pictograms.qr-pics img {
      width: ${qrPictogramSize};
      height: ${qrPictogramSize};
    }
    .label-stock-brother-62mm-continuous.label-qr.label-form-strip .qr-right {
      width: 18.8mm;
      flex-basis: 18.8mm;
    }
    .label-stock-brother-62mm-continuous.label-qr.label-form-strip .qr-code-shell {
      width: 18.8mm;
      height: 18.8mm;
    }
    .label-stock-brother-62mm-continuous.label-qr.label-form-strip .qrcode-img {
      width: 18.2mm;
      height: 18.2mm;
    }
    .label-stock-brother-62mm-continuous.label-qr.label-form-strip.label-qr-no-code .pictograms.qr-pics {
      grid-template-columns: repeat(3, 9.8mm);
      justify-content: center;
      gap: 0.5mm;
    }
    .label-stock-brother-62mm-continuous.label-qr.label-form-strip.label-qr-no-code .pictograms.qr-pics img {
      width: 9.8mm;
      height: 9.8mm;
    }
    .label-stock-brother-62mm-continuous.label-qr.label-form-strip .qr-support-row {
      justify-content: start;
      padding-top: 0.2mm;
    }
    .label-stock-brother-62mm-continuous.label-qr.label-form-strip .signal.qr-signal {
      width: 100%;
      max-width: 17mm;
      justify-self: center;
      font-size: 5.4px;
    }
    .label-stock-brother-62mm-continuous.label-qr.label-form-strip .qr-code-shell {
      padding: 0.45mm;
    }
    .label-stock-small-rack.label-qr.label-form-strip {
      gap: 0.55mm;
      padding: 1.25mm;
    }
    .label-stock-small-rack.label-qr.label-form-strip .qr-left-scan {
      gap: 0.35mm;
      padding-right: 0.55mm;
    }
    .label-stock-small-rack.label-qr.label-form-strip .small-name-en,
    .label-stock-small-rack.label-qr.label-form-strip .small-name-zh {
      font-size: 6.25px;
      line-height: 1.16;
    }
    .label-stock-small-rack.label-qr.label-form-strip .small-cas {
      font-size: 6.35px;
      line-height: 1.14;
    }
    .label-stock-small-rack.label-qr.label-form-strip .pictograms.qr-pics {
      display: grid;
      grid-template-columns: repeat(3, 9.8mm);
      justify-content: start;
      gap: 0.3mm;
    }
    .label-stock-small-rack.label-qr.label-form-strip .pictograms.qr-pics img {
      width: 9.8mm;
      height: 9.8mm;
    }
    .label-stock-small-rack.label-qr.label-form-strip .qr-support-row {
      min-height: auto;
      padding-top: 0.2mm;
    }
    .label-stock-small-rack.label-qr.label-form-strip .signal.qr-signal {
      width: fit-content;
      max-width: 17mm;
      font-size: 5.2px;
      padding: 0.22mm 0.75mm;
    }
    .label-stock-small-rack.label-qr.label-form-strip .qr-code-shell {
      width: 17.2mm;
      height: 17.2mm;
      padding: 0.35mm;
    }
    .label-stock-small-rack.label-qr.label-form-strip .qr-right {
      width: 17.2mm;
      flex-basis: 17.2mm;
    }
    .label-stock-small-rack.label-qr.label-form-strip .qrcode-img {
      width: 16.5mm;
      height: 16.5mm;
    }
    .label-stock-medium-rack.label-qr.label-form-compact {
      gap: 1mm;
      padding: 1.8mm;
    }
    .label-stock-medium-rack.label-qr.label-form-compact .qr-left-scan {
      gap: 0.65mm;
      padding-right: 1mm;
    }
    .label-stock-medium-rack.label-qr.label-form-compact .pictograms.qr-pics {
      display: grid;
      grid-template-columns: repeat(4, 9mm);
      gap: 0.55mm;
      justify-content: start;
    }
    .label-stock-medium-rack.label-qr.label-form-compact .pictograms.qr-pics img {
      width: 9mm;
      height: 9mm;
    }
    .label-stock-medium-rack.label-qr.label-form-compact .qr-priority-block {
      padding: 0.45mm 0;
      border: 0;
      background: transparent;
    }
    .label-stock-medium-rack.label-qr.label-form-compact .signal.qr-signal {
      width: fit-content;
      max-width: 21mm;
      padding: 0.3mm 1mm;
      font-size: 5.8px;
    }
    .label-stock-medium-rack.label-qr.label-form-compact .qr-hazard-list {
      display: none;
    }
    .label-stock-medium-rack.label-qr.label-form-compact .qr-code-shell {
      padding: 1mm;
    }
    .label-qr.label-form-compact .qr-priority-block {
      padding: 0.8mm 1mm;
    }
    ${
      layout.colorMode === "bw"
        ? `body.print-bw .label,
          body.print-bw .label * {
            color: #111827 !important;
            text-shadow: none !important;
            box-shadow: none !important;
          }
          body.print-bw .label {
            background: #ffffff !important;
            border-color: #111827 !important;
          }
          body.print-bw .label-top-standard,
          body.print-bw .qr-priority-block,
          body.print-bw .profile-block,
          body.print-bw .support-chip,
          body.print-bw .meta-chip,
          body.print-bw .prepared-badge,
          body.print-bw .prepared-note,
          body.print-bw .hazard-primary-item,
          body.print-bw .hazard-more,
          body.print-bw .qr-hazard-chip,
          body.print-bw .profile-block-missing,
          body.print-bw .signal {
            background: #ffffff !important;
            border-color: #111827 !important;
          }
          body.print-bw .pictograms img,
          body.print-bw .qrcode-img {
            filter: grayscale(1) contrast(1.35);
          }`
        : ""
    }

    @media print {
      body {
        print-color-adjust: exact;
        -webkit-print-color-adjust: exact;
      }
      .label {
        break-inside: avoid;
        page-break-inside: avoid;
      }
    }
  `;
};
