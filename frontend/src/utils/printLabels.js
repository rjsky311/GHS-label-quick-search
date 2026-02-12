import { GHS_IMAGES } from "@/constants/ghs";
import i18n from "@/i18n";

export function getQRCodeUrl(text, size = 100) {
  return `https://api.qrserver.com/v1/create-qr-code/?size=${size}x${size}&data=${encodeURIComponent(text)}`;
}

export function printLabels(selectedForLabel, labelConfig, customGHSSettings, customLabelFields = {}) {
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

  // Split labels into page-sized chunks
  const pages = [];
  for (let i = 0; i < selectedForLabel.length; i += gridConfig.perPage) {
    pages.push(selectedForLabel.slice(i, i + gridConfig.perPage));
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
          signal_word: chemical.signal_word,
          signal_word_zh: chemical.signal_word_zh,
        },
        ...(chemical.other_classifications || [])
      ];

      if (customSetting.selectedIndex < allClassifications.length) {
        return {
          ...chemical,
          ghs_pictograms: allClassifications[customSetting.selectedIndex].pictograms || [],
          hazard_statements: allClassifications[customSetting.selectedIndex].hazard_statements || [],
          signal_word: allClassifications[customSetting.selectedIndex].signal_word,
          signal_word_zh: allClassifications[customSetting.selectedIndex].signal_word_zh,
          customNote: customSetting.note
        };
      }
    }

    return chemical;
  };

  // Render custom label fields (lab name, date, batch number)
  const renderCustomFields = () => {
    const fields = [];
    if (customLabelFields.labName) fields.push(customLabelFields.labName);
    if (customLabelFields.date) fields.push(customLabelFields.date);
    if (customLabelFields.batchNumber) fields.push(`${t("print.batch")}: ${customLabelFields.batchNumber}`);
    if (fields.length === 0) return "";
    return `<div class="custom-fields">${fields.join(" ｜ ")}</div>`;
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
            <div class="name-section">
              <div class="name-en">${effectiveChem.name_en || ""}</div>
              ${effectiveChem.name_zh ? `<div class="name-zh">${effectiveChem.name_zh}</div>` : ""}
              <div class="cas">CAS: ${effectiveChem.cas_number}</div>
              ${renderCustomFields()}
            </div>
          </div>
          <div class="label-middle">
            ${pictograms.length > 0 ? `
              <div class="pictograms">
                ${pictograms.map((p) => `<img src="${GHS_IMAGES[p.code]}" alt="${p.code}" />`).join("")}
              </div>
            ` : '<div class="no-hazard">${t("print.noHazardLabel")}</div>'}
          </div>
          <div class="label-bottom">
            ${signalWord ? `<div class="signal ${signalClass}">${signalWord}</div>` : '<div class="signal-placeholder"></div>'}
          </div>
        </div>
      `;
    },

    // 版型 2 - 標準版
    standard: (chemical) => {
      const effectiveChem = getEffectiveForPrint(chemical);
      const pictograms = effectiveChem.ghs_pictograms || [];
      const hazards = effectiveChem.hazard_statements || [];
      const signalWord = effectiveChem.signal_word_zh || effectiveChem.signal_word || "";
      const signalClass = effectiveChem.signal_word === "Danger" ? "danger" : "warning";
      const maxHazards = labelConfig.size === "small" ? 2 : labelConfig.size === "medium" ? 3 : 4;

      return `
        <div class="label">
          <div class="label-top">
            <div class="name-section">
              <div class="name-en">${effectiveChem.name_en || ""}</div>
              ${effectiveChem.name_zh ? `<div class="name-zh">${effectiveChem.name_zh}</div>` : ""}
              <div class="cas">CAS: ${effectiveChem.cas_number}</div>
              ${renderCustomFields()}
            </div>
          </div>
          <div class="label-middle">
            <div class="middle-row">
              ${pictograms.length > 0 ? `
                <div class="pictograms">
                  ${pictograms.map((p) => `<img src="${GHS_IMAGES[p.code]}" alt="${p.code}" />`).join("")}
                </div>
              ` : ""}
              ${signalWord ? `<div class="signal ${signalClass}">${signalWord}</div>` : ""}
            </div>
          </div>
          <div class="label-bottom hazards-section">
            ${hazards.length > 0 ? `
              ${hazards.slice(0, maxHazards).map((h) => `<div class="hazard-item">${h.code} ${h.text_zh}</div>`).join("")}
              ${hazards.length > maxHazards ? `<div class="hazard-more">⋯ ${t("print.totalItems", { count: hazards.length })}</div>` : ""}
            ` : '<div class="no-hazard-text">${t("print.noHazardStatement")}</div>'}
          </div>
        </div>
      `;
    },

    // 版型 3 - 完整版
    full: (chemical) => {
      const effectiveChem = getEffectiveForPrint(chemical);
      const pictograms = effectiveChem.ghs_pictograms || [];
      const hazards = effectiveChem.hazard_statements || [];
      const signalWord = effectiveChem.signal_word_zh || effectiveChem.signal_word || "";
      const signalClass = effectiveChem.signal_word === "Danger" ? "danger" : "warning";

      return `
        <div class="label label-full">
          <div class="label-top">
            <div class="name-section">
              <div class="name-en">${effectiveChem.name_en || ""}</div>
              ${effectiveChem.name_zh ? `<div class="name-zh">${effectiveChem.name_zh}</div>` : ""}
              <div class="cas">CAS: ${effectiveChem.cas_number}</div>
              ${renderCustomFields()}
            </div>
          </div>
          <div class="label-middle compact">
            <div class="middle-row">
              ${pictograms.length > 0 ? `
                <div class="pictograms compact">
                  ${pictograms.map((p) => `<img src="${GHS_IMAGES[p.code]}" alt="${p.code}" />`).join("")}
                </div>
              ` : ""}
              ${signalWord ? `<div class="signal compact ${signalClass}">${signalWord}</div>` : ""}
            </div>
          </div>
          <div class="label-bottom hazards-full">
            ${hazards.length > 0 ? `
              ${hazards.map((h) => `<div class="hazard-item-full">${h.code} ${h.text_zh}</div>`).join("")}
            ` : '<div class="no-hazard-text">${t("print.noHazardStatement")}</div>'}
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
      const pubchemUrl = effectiveChem.cid
        ? `https://pubchem.ncbi.nlm.nih.gov/compound/${effectiveChem.cid}`
        : `https://pubchem.ncbi.nlm.nih.gov/#query=${effectiveChem.cas_number}`;

      return `
        <div class="label label-qr">
          <div class="qr-left">
            <div class="name-section">
              <div class="name-en">${effectiveChem.name_en || ""}</div>
              ${effectiveChem.name_zh ? `<div class="name-zh">${effectiveChem.name_zh}</div>` : ""}
              <div class="cas">CAS: ${effectiveChem.cas_number}</div>
              ${renderCustomFields()}
            </div>
            ${pictograms.length > 0 ? `
              <div class="pictograms qr-pics">
                ${pictograms.slice(0, 4).map((p) => `<img src="${GHS_IMAGES[p.code]}" alt="${p.code}" />`).join("")}
                ${pictograms.length > 4 ? `<span class="more-pics">+${pictograms.length - 4}</span>` : ""}
              </div>
            ` : ""}
            ${signalWord ? `<div class="signal qr-signal ${signalClass}">${signalWord}</div>` : ""}
          </div>
          <div class="qr-right">
            <img class="qrcode-img" src="${getQRCodeUrl(pubchemUrl, 200)}" alt="QR" />
            <div class="qr-hint">${t("print.scanForDetail")}</div>
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
        <div class="page-number">${t("print.pageNumber", { current: pageIdx + 1, total: totalPages })}</div>
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
    `<!DOCTYPE html><html><head><meta charset="UTF-8"><title>${t("print.title")}</title><style>${styles}</style></head><body>${pagesHtml}</body></html>`
  );
  iframeDoc.close();

  // Wait for images to load, then trigger print
  const images = iframeDoc.querySelectorAll("img");
  let loaded = 0;
  const total = images.length;

  const triggerPrint = () => {
    setTimeout(() => {
      iframe.contentWindow.focus();
      iframe.contentWindow.print();
      // Clean up iframe after print dialog closes
      setTimeout(() => iframe.remove(), 1000);
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
