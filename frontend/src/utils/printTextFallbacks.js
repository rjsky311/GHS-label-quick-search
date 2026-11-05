/**
 * Print wording used when a translation is missing, so a label never prints a
 * raw translation key. Rarely read, so vite.config puts it in its own chunk.
 */
export const PRINT_TEXT_FALLBACKS = {
  en: {
    "print.title": "GHS Label Print",
    "print.noHazardLabel": "No hazard label",
    "print.pictogramReviewRequired": "GHS pictogram review required",
    "print.noHazardStatement": "No hazard statements",
    "print.noPrecautionaryStatement": "No precautionary statements",
    "print.hazardStatementsLabel": "Hazard statements",
    "print.precautionaryStatementsLabel": "Precautionary statements",
    "print.scanForDetail": "Scan for details",
    "print.qrLookupCaption": "Scan to open this chemical lookup",
    "print.qrLookupPageOneCaption": "QR lookup - Page 1 only",
    "print.qrSupplementNotice":
      "Supplemental QR label - verify against SDS / primary label before use.",
    "print.supplierMissing": "Responsible lab / supplier information missing",
    "print.moreHazardsShort": "{{count}} more hazard(s)",
    "print.hazardCodesOnlyCount": "{{count}} more as H code only",
    "print.morePrecautionary": "+{{count}} more",
    "print.preparedSolution": "Prepared solution",
    "print.preparedShort": "Prepared",
    "print.preparedSmallIdentity": "{{concentration}} in {{solvent}}",
    "print.concentration": "Concentration",
    "print.concentrationShort": "Conc.",
    "print.solvent": "Solvent",
    "print.solventShort": "Solv.",
    "print.preparedNote":
      "Prepared solution - hazard data from the parent chemical (plus the solvent when listed). Classification may differ for the actual mixture; verify against the official SDS before use.",
    "print.preparedParentWarning":
      "Hazard data from the parent chemical (plus the solvent when listed) - not a verified mixture classification. Verify against the official SDS before use.",
    "print.solventHazardsNotIncluded":
      "Solvent hazards not included: {{solvent}}. Check the solvent's SDS.",
    "print.solventHazardsIncluded":
      "Includes solvent hazards: {{solvent}} (CAS {{cas}}). Not reduced for dilution.",
    "print.solventHazardsNotIncludedShort": "Solvent hazards not included",
    "print.solventHazardsIncludedShort": "Incl. solvent hazards",
    "print.preparedBy": "Prepared by",
    "print.preparedDate": "Prepared date",
    "print.expiryDate": "Expiry date",
    "print.pageNumber": "Page {{current}} / {{total}}",
    "print.batch": "Case",
    "print.profilePhone": "Phone",
    "print.continuationBadge": "Page {{current}} / {{total}}",
    "print.continuationBadgeContinues":
      "Page {{current}} / {{total}}",
    "print.continuationBadgeFinal":
      "Page {{current}} / {{total}}",
    "print.continuationPagePlain":
      "Page {{current}} of {{total}}",
    "print.continuationMainStatus": "Main label",
    "print.continuationStatus": "Continuation",
    "print.continuationFinalStatus": "Final continuation",
    "print.continuationMainPageActionSingle":
      "Continue with Page 2",
    "print.continuationMainPageAction":
      "Continue with pages 2-{{total}}",
    "print.continuationQrHere": "QR on this page",
    "print.continuationQrOnFirstPage": "QR on Page 1 only",
    "print.continuationUseWithFirstPage":
      "Continuation page - use with Page 1",
    "print.continuationSetRequired":
      "Complete label set: {{total}} pages - keep all pages together",
    "print.continuationOnlyBandTitle":
      "CONTINUATION ONLY",
    "print.continuationOnlyBandDetail":
      "Do not use this page alone",
    "print.continuationOnlyBandQr":
      "Scan Page 1 for QR lookup",
    "print.continuationPictogramAnchor":
      "GHS pictograms repeated for page matching; QR lookup remains on Page 1",
    "print.continuationCompactPictogramAnchor":
      "GHS repeated for page matching",
    "print.keepAllPagesTogether":
      "Keep pages together",
    "print.continuationDoNotUseAlone":
      "Do not use this page alone",
    "print.noQrOnContinuationPage":
      "No QR on this page; scan Page 1",
    "print.statementWordingUnavailable":
      "Wording unavailable - verify SDS before use.",
    "print.footerHazardSource":
      "Hazard source: PubChem",
    "print.footerVerifyShort":
      "Verify against SDS, supplier label, and local regulations before use.",
    "trust.printFooter":
      "For reference only - confirm against the official SDS, supplier label, and local regulations before use.",
  },
  "zh-TW": {
    "print.title": "GHS 標籤列印",
    "print.noHazardLabel": "無危害標示",
    "print.pictogramReviewRequired": "GHS 圖示需審核",
    "print.noHazardStatement": "無危害說明",
    "print.noPrecautionaryStatement": "無預防措施說明",
    "print.hazardStatementsLabel": "危害說明 / Hazard statements",
    "print.precautionaryStatementsLabel": "預防措施 / Precautionary statements",
    "print.scanForDetail": "掃碼查看詳情",
    "print.qrLookupCaption":
      "掃描開啟此化學品查詢頁 / Scan to open this chemical lookup",
    "print.qrLookupPageOneCaption": "QR 查詢碼 - 僅第 1 頁 / QR lookup - Page 1 only",
    "print.qrSupplementNotice":
      "QR 補充標籤 - 使用前請對照 SDS / 主要標籤確認。",
    "print.supplierMissing": "尚未填寫負責實驗室 / 供應商資訊",
    "print.moreHazardsShort": "另有 {{count}} 項危害",
    "print.hazardCodesOnlyCount": "另 {{count}} 項僅列 H 代碼",
    "print.morePrecautionary": "另有 {{count}} 項",
    "print.preparedSolution": "配製溶液 / Prepared solution",
    "print.preparedShort": "配製 / Prepared",
    "print.preparedSmallIdentity": "{{concentration}} 溶於 {{solvent}}",
    "print.concentration": "濃度 / Concentration",
    "print.concentrationShort": "濃度 / Conc.",
    "print.solvent": "溶劑 / Solvent",
    "print.solventShort": "溶劑 / Solv.",
    "print.preparedNote":
      "此為配製溶液 / Prepared solution - 危害資料取自母化學品（列出溶劑危害時含溶劑）；實際混合物分類可能不同。使用前請以官方安全資料表（SDS）為準 / Hazard data from the parent chemical (plus the solvent when listed); verify against the official SDS before use.",
    "print.preparedParentWarning":
      "危害資料取自母化學品（列出溶劑危害時含溶劑） / Hazard data from the parent chemical (plus the solvent when listed) - 尚未驗證實際混合物分類。使用前請以官方安全資料表（SDS）為準 / Not a verified mixture classification; verify against the official SDS before use.",
    "print.solventHazardsNotIncluded":
      "未納入溶劑危害：{{solvent}}，請查溶劑的安全資料表（SDS） / Solvent hazards not included: {{solvent}}. Check the solvent's SDS.",
    "print.solventHazardsIncluded":
      "含溶劑危害：{{solvent}}（CAS {{cas}}），未因稀釋減少危害 / Includes solvent hazards: {{solventEn}} (CAS {{cas}}). Not reduced for dilution.",
    "print.solventHazardsNotIncludedShort": "未納入溶劑危害 / Solvent hazards not included",
    "print.solventHazardsIncludedShort": "含溶劑危害 / Incl. solvent hazards",
    "print.preparedBy": "配製人 / Prepared by",
    "print.preparedDate": "配製日期 / Prepared date",
    "print.expiryDate": "有效期限 / Expiry date",
    "print.pageNumber": "第 {{current}} / {{total}} 頁",
    "print.batch": "案件",
    "print.profilePhone": "電話",
    "print.continuationBadge": "續頁 {{current}} / {{total}}",
    "print.continuationBadgeContinues":
      "第 {{current}} / {{total}} 頁",
    "print.continuationBadgeFinal":
      "第 {{current}} / {{total}} 頁",
    "print.continuationPagePlain":
      "第 {{current}} / {{total}} 頁",
    "print.continuationMainStatus": "主標頁",
    "print.continuationStatus": "續頁",
    "print.continuationFinalStatus": "最後續頁",
    "print.continuationMainPageActionSingle":
      "請接續第 2 頁",
    "print.continuationMainPageAction":
      "請接續第 2-{{total}} 頁",
    "print.continuationQrHere": "QR 在本頁",
    "print.continuationQrOnFirstPage": "QR 僅在第 1 頁",
    "print.continuationUseWithFirstPage":
      "續頁，需與第 1 頁一併使用",
    "print.continuationSetRequired":
      "完整標籤共 {{total}} 頁，請整套張貼或保存",
    "print.continuationOnlyBandTitle":
      "續頁 / CONTINUATION ONLY",
    "print.continuationOnlyBandDetail":
      "不能單獨貼用本頁",
    "print.continuationOnlyBandQr":
      "請掃第 1 頁 QR 查詢碼",
    "print.continuationPictogramAnchor":
      "GHS 圖示重複作為頁面對照；QR 查詢碼保留在第 1 頁",
    "print.continuationCompactPictogramAnchor":
      "GHS 圖示已重複方便配頁",
    "print.keepAllPagesTogether":
      "整套頁面一起保存",
    "print.continuationDoNotUseAlone":
      "不可單獨使用本頁",
    "print.noQrOnContinuationPage":
      "本頁無 QR；請掃第 1 頁",
    "print.statementWordingUnavailable":
      "尚無完整文字 - 使用前請核對 SDS。",
    "print.footerHazardSource":
      "參考資料：PubChem / Reference data: PubChem",
    "print.footerVerifyShort":
      "使用前請對照 SDS、供應商標示與當地法規 / Verify against SDS, supplier label, and local regulations before use.",
    "trust.printFooter":
      "僅供參考 - 使用前請對照官方安全資料表（SDS）、供應商標示與當地法規。",
  },
};
