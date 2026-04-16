import { GHS_IMAGES } from "@/constants/ghs";
import i18n from "@/i18n";

/**
 * HTML escape helper for safe interpolation into the print iframe.
 *
 * The print document is written via `iframeDoc.write(...)` which bypasses
 * React's automatic escaping. Any user-controlled value (custom label
 * fields from localStorage, CAS inputs, upstream PubChem text, hazard
 * statements, etc.) must be escaped before being inlined into HTML.
 *
 * Escapes for both text-node and quoted-attribute contexts.
 */
export function escapeHtml(value) {
  if (value == null) return "";
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export function getQRCodeUrl(text, size = 100) {
  return `https://api.qrserver.com/v1/create-qr-code/?size=${size}x${size}&data=${encodeURIComponent(text)}`;
}

// Font auto-sizing tiers for "full" template based on hazard count × label size
export function getHazardFontTier(hazardCount, labelSize) {
  const tiers = [
    { maxCount: 5,
      small:  { fontSize: '7px',   lineHeight: '1.2',  marginBottom: '0.8mm' },
      medium: { fontSize: '8px',   lineHeight: '1.2',  marginBottom: '0.8mm' },
      large:  { fontSize: '10px',  lineHeight: '1.2',  marginBottom: '0.8mm' } },
    { maxCount: 8,
      small:  { fontSize: '6px',   lineHeight: '1.15', marginBottom: '0.5mm' },
      medium: { fontSize: '7px',   lineHeight: '1.15', marginBottom: '0.5mm' },
      large:  { fontSize: '9px',   lineHeight: '1.15', marginBottom: '0.6mm' } },
    { maxCount: 12,
      small:  { fontSize: '5.5px', lineHeight: '1.1',  marginBottom: '0.3mm' },
      medium: { fontSize: '6px',   lineHeight: '1.1',  marginBottom: '0.3mm' },
      large:  { fontSize: '7.5px', lineHeight: '1.1',  marginBottom: '0.4mm' } },
    { maxCount: Infinity,
      small:  { fontSize: '5px',   lineHeight: '1.05', marginBottom: '0.2mm' },
      medium: { fontSize: '5.5px', lineHeight: '1.05', marginBottom: '0.2mm' },
      large:  { fontSize: '6.5px', lineHeight: '1.05', marginBottom: '0.3mm' } },
  ];
  const size = labelSize || 'medium';
  for (const tier of tiers) {
    if (hazardCount <= tier.maxCount) return tier[size] || tier.medium;
  }
  return tiers[tiers.length - 1][size] || tiers[tiers.length - 1].medium;
}

export function printLabels(selectedForLabel, labelConfig, customGHSSettings, customLabelFields = {}, labelQuantities = {}) {
  if (selectedForLabel.length === 0) return;
  const t = i18n.t.bind(i18n);

  // Remove any previous print iframe
  const existingFrame = document.getElementById("ghs-print-frame");
  if (existingFrame) existingFrame.remove();

  // Create hidden iframe (avoids popup blocker issues with window.open)
  const iframe = document.createElement("iframe");
  iframe.id = "ghs-print-frame";
  iframe.style.cssText =
    "position:fixed;right:0;bottom:0;width:0;height:0;border:none;opacity:0;pointer-events:none;";
  document.body.appendChild(iframe);

  const isLandscape = labelConfig.orientation === "landscape";

  // Size configurations
  const sizeConfig = {
    small: {
      width: "60mm",
      height: "45mm",
      fontSize: "10px",
      titleSize: "12px",
      imgSize: "22px",
      qrSize: "25mm",
      signalSize: "11px",
      hazardSize: "8px"
    },
    medium: {
      width: "80mm",
      height: "60mm",
      fontSize: "12px",
      titleSize: "14px",
      imgSize: "30px",
      qrSize: "30mm",
      signalSize: "13px",
      hazardSize: "9px"
    },
    large: {
      width: "105mm",
      height: "80mm",
      fontSize: "14px",
      titleSize: "16px",
      imgSize: "38px",
      qrSize: "38mm",
      signalSize: "15px",
      hazardSize: "11px"
    },
  }[labelConfig.size];

  // Grid layout calculation based on A4 page and label size
  const gridConfig = {
    portrait: {
      small:  { cols: 3, rows: 5, perPage: 15 },
      medium: { cols: 2, rows: 4, perPage: 8 },
      large:  { cols: 1, rows: 3, perPage: 3 },
    },
    landscape: {
      small:  { cols: 4, rows: 4, perPage: 16 },
      medium: { cols: 3, rows: 3, perPage: 9 },
      large:  { cols: 2, rows: 2, perPage: 4 },
    },
  }[labelConfig.orientation][labelConfig.size];

  // Expand chemicals by quantity
  const expandedLabels = [];
  selectedForLabel.forEach((chem) => {
    const qty = labelQuantities[chem.cas_number] || 1;
    for (let i = 0; i < qty; i++) expandedLabels.push(chem);
  });

  // Split labels into page-sized chunks
  const pages = [];
  for (let i = 0; i < expandedLabels.length; i += gridConfig.perPage) {
    pages.push(expandedLabels.slice(i, i + gridConfig.perPage));
  }
  const totalPages = pages.length;

  // Helper function to get effective classification for printing
  const getEffectiveForPrint = (chemical) => {
    const customSetting = customGHSSettings[chemical.cas_number];

    if (customSetting && customSetting.selectedIndex !== undefined) {
      const allClassifications = [
        {
          pictograms: chemical.ghs_pictograms || [],
          hazard_statements: chemical.hazard_statements || [],
          precautionary_statements: chemical.precautionary_statements || [],
          signal_word: chemical.signal_word,
          signal_word_zh: chemical.signal_word_zh,
        },
        ...(chemical.other_classifications || [])
      ];

      if (customSetting.selectedIndex < allClassifications.length) {
        const sel = allClassifications[customSetting.selectedIndex];
        return {
          ...chemical,
          ghs_pictograms: sel.pictograms || [],
          hazard_statements: sel.hazard_statements || [],
          precautionary_statements: sel.precautionary_statements || [],
          signal_word: sel.signal_word,
          signal_word_zh: sel.signal_word_zh,
          customNote: customSetting.note
        };
      }
    }

    return chemical;
  };

  // Render custom label fields (lab name, date, batch number)
  // All user-controlled values are escaped to prevent HTML injection
  // via localStorage or form inputs.
  const renderCustomFields = () => {
    const fields = [];
    if (customLabelFields.labName) fields.push(escapeHtml(customLabelFields.labName));
    if (customLabelFields.date) fields.push(escapeHtml(customLabelFields.date));
    if (customLabelFields.batchNumber) {
      fields.push(`${escapeHtml(t("print.batch"))}: ${escapeHtml(customLabelFields.batchNumber)}`);
    }
    if (fields.length === 0) return "";
    return `<div class="custom-fields">${fields.join(" ｜ ")}</div>`;
  };

  // Render name section based on nameDisplay setting.
  // Chemical names / CAS numbers originate from PubChem or user input
  // and must be escaped before being written into the iframe document.
  const renderNameSection = (effectiveChem) => {
    const nd = labelConfig.nameDisplay || "both";
    let nameHtml = "";
    if (nd === "en" || nd === "both") {
      nameHtml += `<div class="name-en">${escapeHtml(effectiveChem.name_en || "")}</div>`;
    }
    if (nd === "zh") {
      // Chinese-only mode: use Chinese name, fallback to English if unavailable
      const displayName = effectiveChem.name_zh || effectiveChem.name_en || "";
      nameHtml += `<div class="name-en">${escapeHtml(displayName)}</div>`;
    } else if (nd === "both" && effectiveChem.name_zh) {
      nameHtml += `<div class="name-zh">${escapeHtml(effectiveChem.name_zh)}</div>`;
    }
    return `<div class="name-section">
      ${nameHtml}
      <div class="cas">CAS: ${escapeHtml(effectiveChem.cas_number)}</div>
      ${renderCustomFields()}
    </div>`;
  };

  // Template generators with FIXED LAYOUT
  const templates = {
    // 版型 1 - 圖示版
    icon: (chemical) => {
      const effectiveChem = getEffectiveForPrint(chemical);
      const pictograms = effectiveChem.ghs_pictograms || [];
      const signalWord = effectiveChem.signal_word_zh || effectiveChem.signal_word || "";
      const signalClass = effectiveChem.signal_word === "Danger" ? "danger" : "warning";

      return `
        <div class="label">
          <div class="label-top">
            ${renderNameSection(effectiveChem)}
          </div>
          <div class="label-middle">
            ${pictograms.length > 0 ? `
              <div class="pictograms">
                ${pictograms.map((p) => `<img src="${escapeHtml(GHS_IMAGES[p.code] || "")}" alt="${escapeHtml(p.code)}" />`).join("")}
              </div>
            ` : `<div class="no-hazard">${escapeHtml(t("print.noHazardLabel"))}</div>`}
          </div>
          <div class="label-bottom">
            ${signalWord ? `<div class="signal ${signalClass}">${escapeHtml(signalWord)}</div>` : '<div class="signal-placeholder"></div>'}
          </div>
        </div>
      `;
    },

    // 版型 2 - 標準版
    standard: (chemical) => {
      const effectiveChem = getEffectiveForPrint(chemical);
      const pictograms = effectiveChem.ghs_pictograms || [];
      const hazards = effectiveChem.hazard_statements || [];
      const precautions = effectiveChem.precautionary_statements || [];
      const signalWord = effectiveChem.signal_word_zh || effectiveChem.signal_word || "";
      const signalClass = effectiveChem.signal_word === "Danger" ? "danger" : "warning";
      const maxHazards = labelConfig.size === "small" ? 2 : labelConfig.size === "medium" ? 3 : 4;
      // Precaution budget is tighter — space-constrained; show code-only
      // with an overflow marker when truncated. Full localized text goes
      // to the "full" template and to exports.
      const maxPrecautions = labelConfig.size === "small" ? 3 : labelConfig.size === "medium" ? 5 : 7;

      return `
        <div class="label">
          <div class="label-top">
            ${renderNameSection(effectiveChem)}
          </div>
          <div class="label-middle">
            <div class="middle-row">
              ${pictograms.length > 0 ? `
                <div class="pictograms">
                  ${pictograms.map((p) => `<img src="${escapeHtml(GHS_IMAGES[p.code] || "")}" alt="${escapeHtml(p.code)}" />`).join("")}
                </div>
              ` : ""}
              ${signalWord ? `<div class="signal ${signalClass}">${escapeHtml(signalWord)}</div>` : ""}
            </div>
          </div>
          <div class="label-bottom hazards-section">
            ${hazards.length > 0 ? `
              ${hazards.slice(0, maxHazards).map((h) => `<div class="hazard-item">${escapeHtml(h.code)} ${escapeHtml(h.text_zh)}</div>`).join("")}
              ${hazards.length > maxHazards ? `<div class="hazard-more">⋯ ${escapeHtml(t("print.totalItems", { count: hazards.length }))}</div>` : ""}
            ` : `<div class="no-hazard-text">${escapeHtml(t("print.noHazardStatement"))}</div>`}
            ${precautions.length > 0 ? `
              <div class="precautions-compact">
                ${precautions.slice(0, maxPrecautions).map((p) => `<span class="precaution-code">${escapeHtml(p.code)}</span>`).join(" ")}
                ${precautions.length > maxPrecautions ? `<span class="precaution-more">⋯ ${escapeHtml(t("print.morePrecautionary", { count: precautions.length - maxPrecautions }))}</span>` : ""}
              </div>
            ` : ""}
          </div>
        </div>
      `;
    },

    // 版型 3 - 完整版（字體依危害數量自動縮放）
    full: (chemical) => {
      const effectiveChem = getEffectiveForPrint(chemical);
      const pictograms = effectiveChem.ghs_pictograms || [];
      const hazards = effectiveChem.hazard_statements || [];
      const precautions = effectiveChem.precautionary_statements || [];
      const signalWord = effectiveChem.signal_word_zh || effectiveChem.signal_word || "";
      const signalClass = effectiveChem.signal_word === "Danger" ? "danger" : "warning";
      // Tier is based on combined H+P count so font scales when both
      // lists contribute to the label body.
      const hazardTier = getHazardFontTier(hazards.length + precautions.length, labelConfig.size);

      return `
        <div class="label label-full">
          <div class="label-top">
            ${renderNameSection(effectiveChem)}
          </div>
          <div class="label-middle compact">
            <div class="middle-row">
              ${pictograms.length > 0 ? `
                <div class="pictograms compact">
                  ${pictograms.map((p) => `<img src="${escapeHtml(GHS_IMAGES[p.code] || "")}" alt="${escapeHtml(p.code)}" />`).join("")}
                </div>
              ` : ""}
              ${signalWord ? `<div class="signal compact ${signalClass}">${escapeHtml(signalWord)}</div>` : ""}
            </div>
          </div>
          <div class="label-bottom hazards-full" style="font-size:${hazardTier.fontSize};line-height:${hazardTier.lineHeight}">
            ${hazards.length > 0 ? `
              ${hazards.map((h) => `<div class="hazard-item-full" style="margin-bottom:${hazardTier.marginBottom}">${escapeHtml(h.code)} ${escapeHtml(h.text_zh)}</div>`).join("")}
            ` : `<div class="no-hazard-text">${escapeHtml(t("print.noHazardStatement"))}</div>`}
            ${precautions.length > 0 ? `
              <div class="precautions-divider"></div>
              ${precautions.map((p) => `<div class="precaution-item-full" style="margin-bottom:${hazardTier.marginBottom}">${escapeHtml(p.code)} ${escapeHtml(p.text_zh)}</div>`).join("")}
            ` : ""}
          </div>
        </div>
      `;
    },

    // 版型 4 - QR Code 版
    qrcode: (chemical) => {
      const effectiveChem = getEffectiveForPrint(chemical);
      const pictograms = effectiveChem.ghs_pictograms || [];
      const signalWord = effectiveChem.signal_word_zh || effectiveChem.signal_word || "";
      const signalClass = effectiveChem.signal_word === "Danger" ? "danger" : "warning";
      // pubchemUrl is passed through encodeURIComponent by getQRCodeUrl,
      // so no additional escape is needed for the resulting src attribute.
      const pubchemUrl = effectiveChem.cid
        ? `https://pubchem.ncbi.nlm.nih.gov/compound/${effectiveChem.cid}`
        : `https://pubchem.ncbi.nlm.nih.gov/#query=${effectiveChem.cas_number}`;

      return `
        <div class="label label-qr">
          <div class="qr-left">
            ${renderNameSection(effectiveChem)}
            ${pictograms.length > 0 ? `
              <div class="pictograms qr-pics">
                ${pictograms.slice(0, 4).map((p) => `<img src="${escapeHtml(GHS_IMAGES[p.code] || "")}" alt="${escapeHtml(p.code)}" />`).join("")}
                ${pictograms.length > 4 ? `<span class="more-pics">+${pictograms.length - 4}</span>` : ""}
              </div>
            ` : ""}
            ${signalWord ? `<div class="signal qr-signal ${signalClass}">${escapeHtml(signalWord)}</div>` : ""}
          </div>
          <div class="qr-right">
            <img class="qrcode-img" src="${getQRCodeUrl(pubchemUrl, 200)}" alt="QR" />
            <div class="qr-hint">${escapeHtml(t("print.scanForDetail"))}</div>
          </div>
        </div>
      `;
    },
  };

  // Generate pages with grid layout
  const pagesHtml = pages.map((pageLabels, pageIdx) => {
    const labelsHtml = pageLabels.map((chemical) => templates[labelConfig.template](chemical)).join("");
    return `
      <div class="page">
        ${labelsHtml}
        <div class="page-number">${escapeHtml(t("print.pageNumber", { current: pageIdx + 1, total: totalPages }))}</div>
      </div>
    `;
  }).join("");

  // CSS with smart grid layout
  const styles = `
    @page {
      size: A4${isLandscape ? " landscape" : ""};
      margin: 5mm;
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
      display: grid;
      grid-template-columns: repeat(${gridConfig.cols}, ${sizeConfig.width});
      gap: 3mm;
      justify-content: center;
      align-content: start;
      padding: 2mm;
      page-break-after: always;
      position: relative;
      min-height: ${isLandscape ? "190mm" : "277mm"};
    }
    .page:last-child {
      page-break-after: auto;
    }
    .page-number {
      position: absolute;
      bottom: 1mm;
      right: 3mm;
      font-size: 8px;
      color: #999;
      grid-column: 1 / -1;
    }

    /* ===== LABEL BASE ===== */
    .label {
      width: ${sizeConfig.width};
      height: ${sizeConfig.height};
      border: 2px solid #222;
      border-radius: 2mm;
      padding: 2.5mm;
      page-break-inside: avoid;
      display: flex;
      flex-direction: column;
      background: #fff;
      overflow: hidden;
      font-size: ${sizeConfig.fontSize};
    }
    .label-full {
      height: ${sizeConfig.height};
      max-height: ${sizeConfig.height};
    }
    .label-qr {
      flex-direction: row;
    }

    /* ===== LABEL SECTIONS ===== */
    .label-top {
      flex-shrink: 0;
      border-bottom: 1px solid #ccc;
      padding-bottom: 1.5mm;
      margin-bottom: 1.5mm;
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
      margin-bottom: 1.5mm;
    }
    .label-bottom {
      flex-shrink: 0;
      margin-top: auto;
    }

    /* ===== NAME SECTION ===== */
    .name-section {
      text-align: left;
    }
    .name-en {
      font-weight: bold;
      font-size: ${sizeConfig.titleSize};
      line-height: 1.2;
      color: #000;
      word-wrap: break-word;
      overflow-wrap: break-word;
      display: -webkit-box;
      -webkit-line-clamp: 2;
      -webkit-box-orient: vertical;
      overflow: hidden;
    }
    .name-zh {
      font-size: calc(${sizeConfig.titleSize} - 2px);
      color: #333;
      margin-top: 0.5mm;
    }
    .cas {
      font-family: "Consolas", "Monaco", "Courier New", monospace;
      font-size: calc(${sizeConfig.fontSize} - 1px);
      color: #555;
      margin-top: 1mm;
    }
    .custom-fields {
      font-size: calc(${sizeConfig.fontSize} - 2px);
      color: #666;
      margin-top: 0.5mm;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    /* ===== PICTOGRAMS ===== */
    .pictograms {
      display: flex;
      flex-wrap: wrap;
      gap: 2mm;
      justify-content: center;
      align-items: center;
    }
    .pictograms img {
      width: ${sizeConfig.imgSize};
      height: ${sizeConfig.imgSize};
      background: #fff;
      border: 1px solid #bbb;
      border-radius: 1mm;
    }
    .pictograms.compact img {
      width: calc(${sizeConfig.imgSize} - 4px);
      height: calc(${sizeConfig.imgSize} - 4px);
    }
    .pictograms.qr-pics {
      justify-content: flex-start;
      margin: 2mm 0;
    }
    .pictograms.qr-pics img {
      width: calc(${sizeConfig.imgSize} - 6px);
      height: calc(${sizeConfig.imgSize} - 6px);
    }
    .more-pics {
      font-size: 10px;
      color: #666;
      display: flex;
      align-items: center;
    }

    /* ===== SIGNAL WORD ===== */
    .signal {
      display: inline-block;
      font-weight: bold;
      font-size: ${sizeConfig.signalSize};
      padding: 1.5mm 4mm;
      border-radius: 1mm;
      text-align: center;
      margin: 1mm 0;
    }
    .signal.compact {
      font-size: calc(${sizeConfig.signalSize} - 2px);
      padding: 1mm 3mm;
      margin: 1mm 0;
    }
    .signal.qr-signal {
      font-size: calc(${sizeConfig.signalSize} - 2px);
      padding: 1mm 2mm;
      margin-top: auto;
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

    /* ===== MIDDLE ROW ===== */
    .middle-row {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 3mm;
      flex-wrap: wrap;
    }

    /* ===== HAZARDS SECTION ===== */
    .hazards-section {
      border-top: 1px dashed #aaa;
      padding-top: 1.5mm;
      font-size: ${sizeConfig.hazardSize};
      line-height: 1.3;
    }
    .hazards-full {
      border-top: 1px dashed #aaa;
      padding-top: 1.5mm;
      font-size: calc(${sizeConfig.hazardSize} - 1px);
      line-height: 1.2;
      overflow: hidden;
      flex: 1;
      min-height: 0;
    }
    .label-full .label-bottom {
      flex: 1;
      min-height: 0;
      margin-top: 0;
    }
    .hazard-item {
      margin-bottom: 1mm;
      color: #222;
    }
    .hazard-item-full {
      margin-bottom: 0.8mm;
      color: #222;
    }
    .hazard-more {
      color: #666;
      font-style: italic;
      margin-top: 0.5mm;
    }
    .no-hazard {
      color: #16a34a;
      font-weight: 500;
      text-align: center;
      padding: 3mm;
    }
    .no-hazard-text {
      color: #666;
      font-style: italic;
    }

    /* ===== PRECAUTIONARY STATEMENTS ===== */
    .precaution-item-full {
      margin-bottom: 0.8mm;
      color: #1e3a8a;
    }
    .precautions-divider {
      border-top: 1px dotted #94a3b8;
      margin: 1mm 0 1mm 0;
    }
    .precautions-compact {
      margin-top: 1mm;
      border-top: 1px dotted #aaa;
      padding-top: 0.8mm;
      line-height: 1.35;
    }
    .precaution-code {
      display: inline-block;
      font-family: "Consolas", "Monaco", "Courier New", monospace;
      font-size: calc(${sizeConfig.hazardSize} - 1px);
      color: #1e3a8a;
      margin-right: 1.5mm;
    }
    .precaution-more {
      font-size: calc(${sizeConfig.hazardSize} - 1px);
      color: #666;
      font-style: italic;
    }

    /* ===== QR CODE LAYOUT ===== */
    .qr-left {
      flex: 1;
      display: flex;
      flex-direction: column;
      padding-right: 2mm;
      border-right: 1px dashed #ccc;
      min-width: 0;
    }
    .qr-right {
      width: ${sizeConfig.qrSize};
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding-left: 2mm;
    }
    .qrcode-img {
      width: calc(${sizeConfig.qrSize} - 8mm);
      height: calc(${sizeConfig.qrSize} - 8mm);
    }
    .qr-hint {
      font-size: 8px;
      color: #666;
      text-align: center;
      margin-top: 1mm;
    }

    /* ===== B&W MODE ===== */
    ${labelConfig.colorMode === "bw" ? `.pictograms img {
      filter: grayscale(1) contrast(1.2);
    }` : ""}

    /* ===== PRINT STYLES ===== */
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

  // Write content to hidden iframe
  const iframeDoc = iframe.contentDocument || iframe.contentWindow.document;
  iframeDoc.open();
  iframeDoc.write(
    `<!DOCTYPE html><html><head><meta charset="UTF-8"><title>${escapeHtml(t("print.title"))}</title><style>${styles}</style></head><body>${pagesHtml}</body></html>`
  );
  iframeDoc.close();

  // Wait for images to load, then trigger print
  const images = iframeDoc.querySelectorAll("img");
  let loaded = 0;
  const total = images.length;

  const triggerPrint = () => {
    setTimeout(() => {
      iframe.contentWindow.focus();

      // Tie iframe removal to the `afterprint` event so cleanup fires
      // when the dialog actually closes (whether the user printed,
      // saved as PDF, or cancelled) rather than on a fixed 1-second
      // timer that could either fire mid-dialog or leak the iframe
      // if the user lingered.
      let removed = false;
      const cleanup = () => {
        if (removed) return;
        removed = true;
        iframe.remove();
      };

      // Safari/Firefox fire `afterprint` reliably on the iframe's
      // window; Chromium too. Use { once: true } so the listener
      // detaches after first invocation.
      try {
        iframe.contentWindow.addEventListener("afterprint", cleanup, { once: true });
      } catch (_) {
        // If the contentWindow is not accessible for any reason, the
        // fallback timeout below will still clean up.
      }

      // Defensive fallback: some embedded browsers/webviews don't
      // dispatch `afterprint` on iframes. Guarantee cleanup within
      // 60s regardless. Previously this was 1s, which was too short
      // if the user paused on the print dialog.
      setTimeout(cleanup, 60000);

      iframe.contentWindow.print();
    }, 300);
  };

  if (total === 0) {
    triggerPrint();
    return;
  }

  images.forEach((img) => {
    if (img.complete) {
      loaded++;
      if (loaded === total) triggerPrint();
    } else {
      img.onload = img.onerror = () => {
        loaded++;
        if (loaded === total) triggerPrint();
      };
    }
  });
}
