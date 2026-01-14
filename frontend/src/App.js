import { useState, useEffect, useCallback, useRef } from "react";
import "@/App.css";
import axios from "axios";
import * as XLSX from "xlsx";
import { saveAs } from "file-saver";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

// GHS Pictogram Images
const GHS_IMAGES = {
  GHS01: "https://pubchem.ncbi.nlm.nih.gov/images/ghs/GHS01.svg",
  GHS02: "https://pubchem.ncbi.nlm.nih.gov/images/ghs/GHS02.svg",
  GHS03: "https://pubchem.ncbi.nlm.nih.gov/images/ghs/GHS03.svg",
  GHS04: "https://pubchem.ncbi.nlm.nih.gov/images/ghs/GHS04.svg",
  GHS05: "https://pubchem.ncbi.nlm.nih.gov/images/ghs/GHS05.svg",
  GHS06: "https://pubchem.ncbi.nlm.nih.gov/images/ghs/GHS06.svg",
  GHS07: "https://pubchem.ncbi.nlm.nih.gov/images/ghs/GHS07.svg",
  GHS08: "https://pubchem.ncbi.nlm.nih.gov/images/ghs/GHS08.svg",
  GHS09: "https://pubchem.ncbi.nlm.nih.gov/images/ghs/GHS09.svg",
};

const HISTORY_KEY = "ghs_search_history";
const FAVORITES_KEY = "ghs_favorites";
const CUSTOM_GHS_KEY = "ghs_custom_settings";
const MAX_HISTORY = 50;

function App() {
  const [singleCas, setSingleCas] = useState("");
  const [batchCas, setBatchCas] = useState("");
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState("single");
  const [history, setHistory] = useState([]);
  const [showHistory, setShowHistory] = useState(false);
  const [error, setError] = useState("");
  const [selectedResult, setSelectedResult] = useState(null);
  
  // New states for favorites and labels
  const [favorites, setFavorites] = useState([]);
  const [showFavorites, setShowFavorites] = useState(false);
  const [showLabelModal, setShowLabelModal] = useState(false);
  const [labelConfig, setLabelConfig] = useState({
    size: "medium", // small, medium, large
    template: "standard", // icon, standard, full, qrcode
  });
  const [selectedForLabel, setSelectedForLabel] = useState([]);
  const printRef = useRef(null);
  
  // State to track which results have expanded "other classifications"
  const [expandedOtherClassifications, setExpandedOtherClassifications] = useState({});
  
  // State for custom GHS settings (user-selected primary classifications)
  const [customGHSSettings, setCustomGHSSettings] = useState({});
  
  // Toggle function for other classifications
  const toggleOtherClassifications = (casNumber) => {
    setExpandedOtherClassifications(prev => ({
      ...prev,
      [casNumber]: !prev[casNumber]
    }));
  };
  
  // Get the effective GHS classification for a result (considering user customization)
  const getEffectiveClassification = (result) => {
    if (!result || !result.found) return null;
    
    const customSetting = customGHSSettings[result.cas_number];
    
    // If user has customized, use their selection
    if (customSetting && customSetting.selectedIndex !== undefined) {
      const allClassifications = [
        {
          pictograms: result.ghs_pictograms || [],
          hazard_statements: result.hazard_statements || [],
          signal_word: result.signal_word,
          signal_word_zh: result.signal_word_zh,
        },
        ...(result.other_classifications || [])
      ];
      
      if (customSetting.selectedIndex < allClassifications.length) {
        return {
          ...allClassifications[customSetting.selectedIndex],
          isCustom: true,
          customIndex: customSetting.selectedIndex,
          note: customSetting.note
        };
      }
    }
    
    // Default to primary classification
    return {
      pictograms: result.ghs_pictograms || [],
      hazard_statements: result.hazard_statements || [],
      signal_word: result.signal_word,
      signal_word_zh: result.signal_word_zh,
      isCustom: false,
      customIndex: 0
    };
  };
  
  // Set custom GHS classification for a CAS number
  const setCustomClassification = (casNumber, selectedIndex, note = "") => {
    const newSettings = {
      ...customGHSSettings,
      [casNumber]: {
        selectedIndex,
        note,
        updatedAt: new Date().toISOString()
      }
    };
    setCustomGHSSettings(newSettings);
    localStorage.setItem(CUSTOM_GHS_KEY, JSON.stringify(newSettings));
  };
  
  // Clear custom GHS classification for a CAS number
  const clearCustomClassification = (casNumber) => {
    const newSettings = { ...customGHSSettings };
    delete newSettings[casNumber];
    setCustomGHSSettings(newSettings);
    localStorage.setItem(CUSTOM_GHS_KEY, JSON.stringify(newSettings));
  };
  
  // Check if a CAS number has custom classification
  const hasCustomClassification = (casNumber) => {
    return customGHSSettings[casNumber]?.selectedIndex !== undefined;
  };

  // Load history, favorites, and custom GHS settings from localStorage
  useEffect(() => {
    const savedHistory = localStorage.getItem(HISTORY_KEY);
    if (savedHistory) {
      try {
        setHistory(JSON.parse(savedHistory));
      } catch (e) {
        console.error("Failed to parse history", e);
      }
    }
    
    const savedFavorites = localStorage.getItem(FAVORITES_KEY);
    if (savedFavorites) {
      try {
        setFavorites(JSON.parse(savedFavorites));
      } catch (e) {
        console.error("Failed to parse favorites", e);
      }
    }
    
    const savedCustomGHS = localStorage.getItem(CUSTOM_GHS_KEY);
    if (savedCustomGHS) {
      try {
        setCustomGHSSettings(JSON.parse(savedCustomGHS));
      } catch (e) {
        console.error("Failed to parse custom GHS settings", e);
      }
    }
  }, []);

  // Save history to localStorage
  const saveToHistory = useCallback((newResults) => {
    const successfulResults = newResults.filter((r) => r.found);
    if (successfulResults.length === 0) return;

    const timestamp = new Date().toISOString();
    const newHistoryItems = successfulResults.map((r) => ({
      cas_number: r.cas_number,
      name_en: r.name_en,
      name_zh: r.name_zh,
      timestamp,
    }));

    setHistory((prev) => {
      const existingCas = new Set(newHistoryItems.map((h) => h.cas_number));
      const filtered = prev.filter((h) => !existingCas.has(h.cas_number));
      const updated = [...newHistoryItems, ...filtered].slice(0, MAX_HISTORY);
      localStorage.setItem(HISTORY_KEY, JSON.stringify(updated));
      return updated;
    });
  }, []);

  // Toggle favorite
  const toggleFavorite = useCallback((chemical) => {
    setFavorites((prev) => {
      const exists = prev.find((f) => f.cas_number === chemical.cas_number);
      let updated;
      if (exists) {
        updated = prev.filter((f) => f.cas_number !== chemical.cas_number);
      } else {
        const favoriteItem = {
          cas_number: chemical.cas_number,
          cid: chemical.cid,
          name_en: chemical.name_en,
          name_zh: chemical.name_zh,
          ghs_pictograms: chemical.ghs_pictograms,
          hazard_statements: chemical.hazard_statements,
          signal_word: chemical.signal_word,
          signal_word_zh: chemical.signal_word_zh,
          added_at: new Date().toISOString(),
        };
        updated = [favoriteItem, ...prev];
      }
      localStorage.setItem(FAVORITES_KEY, JSON.stringify(updated));
      return updated;
    });
  }, []);

  // Check if chemical is favorited
  const isFavorited = useCallback((cas_number) => {
    return favorites.some((f) => f.cas_number === cas_number);
  }, [favorites]);

  // Search single CAS
  const searchSingle = async () => {
    if (!singleCas.trim()) {
      setError("請輸入 CAS 號碼");
      return;
    }
    setError("");
    setLoading(true);
    try {
      const response = await axios.get(
        `${API}/search/${encodeURIComponent(singleCas.trim())}`
      );
      setResults([response.data]);
      saveToHistory([response.data]);
    } catch (e) {
      console.error(e);
      setError("查詢失敗，請檢查網路連線或稍後再試");
    } finally {
      setLoading(false);
    }
  };

  // Search batch CAS
  const searchBatch = async () => {
    if (!batchCas.trim()) {
      setError("請輸入 CAS 號碼");
      return;
    }
    setError("");
    setLoading(true);

    const casNumbers = batchCas
      .split(/[,\n\t;]+/)
      .map((s) => s.trim())
      .filter((s) => s.length > 0);

    if (casNumbers.length === 0) {
      setError("未偵測到有效的 CAS 號碼");
      setLoading(false);
      return;
    }

    try {
      const response = await axios.post(`${API}/search`, {
        cas_numbers: casNumbers,
      });
      setResults(response.data);
      saveToHistory(response.data);
    } catch (e) {
      console.error(e);
      setError("批次查詢失敗，請檢查網路連線或稍後再試");
    } finally {
      setLoading(false);
    }
  };

  // Export to Excel
  const exportToExcel = async () => {
    if (results.length === 0) return;

    try {
      const response = await axios.post(
        `${API}/export/xlsx`,
        { results, format: "xlsx" },
        { responseType: "blob" }
      );
      saveAs(response.data, "ghs_results.xlsx");
    } catch (e) {
      const wsData = [
        ["CAS No.", "英文名稱", "中文名稱", "GHS標示", "警示語", "危害說明"],
      ];

      results.forEach((r) => {
        const ghsText = r.ghs_pictograms
          ? r.ghs_pictograms.map((p) => `${p.code} (${p.name_zh})`).join(", ")
          : "無";
        const signal = r.signal_word_zh || r.signal_word || "-";
        const hazardText = r.hazard_statements
          ? r.hazard_statements.map((s) => `${s.code}: ${s.text_zh}`).join("; ")
          : "無危害說明";

        wsData.push([
          r.cas_number || "",
          r.name_en || "",
          r.name_zh || "",
          ghsText,
          signal,
          hazardText,
        ]);
      });

      const ws = XLSX.utils.aoa_to_sheet(wsData);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "GHS查詢結果");
      XLSX.writeFile(wb, "ghs_results.xlsx");
    }
  };

  // Export to CSV
  const exportToCSV = async () => {
    if (results.length === 0) return;

    try {
      const response = await axios.post(
        `${API}/export/csv`,
        { results, format: "csv" },
        { responseType: "blob" }
      );
      saveAs(response.data, "ghs_results.csv");
    } catch (e) {
      const wsData = [
        ["CAS No.", "英文名稱", "中文名稱", "GHS標示", "警示語", "危害說明"],
      ];

      results.forEach((r) => {
        const ghsText = r.ghs_pictograms
          ? r.ghs_pictograms.map((p) => `${p.code} (${p.name_zh})`).join(", ")
          : "無";
        const signal = r.signal_word_zh || r.signal_word || "-";
        const hazardText = r.hazard_statements
          ? r.hazard_statements.map((s) => `${s.code}: ${s.text_zh}`).join("; ")
          : "無危害說明";

        wsData.push([
          r.cas_number || "",
          r.name_en || "",
          r.name_zh || "",
          ghsText,
          signal,
          hazardText,
        ]);
      });

      const ws = XLSX.utils.aoa_to_sheet(wsData);
      const csv = XLSX.utils.sheet_to_csv(ws);
      const blob = new Blob(["\ufeff" + csv], {
        type: "text/csv;charset=utf-8",
      });
      saveAs(blob, "ghs_results.csv");
    }
  };

  // Clear history
  const clearHistory = () => {
    setHistory([]);
    localStorage.removeItem(HISTORY_KEY);
  };

  // Clear favorites
  const clearFavorites = () => {
    setFavorites([]);
    localStorage.removeItem(FAVORITES_KEY);
  };

  // Format date
  const formatDate = (isoString) => {
    const date = new Date(isoString);
    return date.toLocaleDateString("zh-TW", {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  // Toggle select for label printing
  const toggleSelectForLabel = (chemical) => {
    setSelectedForLabel((prev) => {
      const exists = prev.find((c) => c.cas_number === chemical.cas_number);
      if (exists) {
        return prev.filter((c) => c.cas_number !== chemical.cas_number);
      } else {
        return [...prev, chemical];
      }
    });
  };

  // Check if selected for label
  const isSelectedForLabel = (cas_number) => {
    return selectedForLabel.some((c) => c.cas_number === cas_number);
  };

  // Select all results for label
  const selectAllForLabel = () => {
    const validResults = results.filter((r) => r.found);
    setSelectedForLabel(validResults);
  };

  // Clear selection for label
  const clearLabelSelection = () => {
    setSelectedForLabel([]);
  };

  // Generate QR Code URL
  const getQRCodeUrl = (text, size = 100) => {
    return `https://api.qrserver.com/v1/create-qr-code/?size=${size}x${size}&data=${encodeURIComponent(text)}`;
  };

  // Print labels with multiple templates - IMPROVED VERSION
  const printLabels = () => {
    if (selectedForLabel.length === 0) return;
    
    const printWindow = window.open("", "_blank");
    
    // Size configurations - LARGER SIZES
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
              </div>
            </div>
            <div class="label-middle">
              ${pictograms.length > 0 ? `
                <div class="pictograms">
                  ${pictograms.map((p) => `<img src="${GHS_IMAGES[p.code]}" alt="${p.code}" />`).join("")}
                </div>
              ` : '<div class="no-hazard">無危害標示</div>'}
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
                ${hazards.length > maxHazards ? `<div class="hazard-more">⋯ 共 ${hazards.length} 項</div>` : ""}
              ` : '<div class="no-hazard-text">無危害說明</div>'}
            </div>
          </div>
        `;
      },

      // 版型 3 - 完整版
      full: (chemical) => {
        const effectiveChem = getEffectiveForPrint(chemical);
        const pictograms = chemical.ghs_pictograms || [];
        const hazards = chemical.hazard_statements || [];
        const signalWord = chemical.signal_word_zh || chemical.signal_word || "";
        const signalClass = chemical.signal_word === "Danger" ? "danger" : "warning";
        
        return `
          <div class="label label-full">
            <div class="label-top">
              <div class="name-section">
                <div class="name-en">${chemical.name_en || ""}</div>
                ${chemical.name_zh ? `<div class="name-zh">${chemical.name_zh}</div>` : ""}
                <div class="cas">CAS: ${chemical.cas_number}</div>
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
              ` : '<div class="no-hazard-text">無危害說明</div>'}
            </div>
          </div>
        `;
      },

      // 版型 4 - QR Code 版
      qrcode: (chemical) => {
        const pictograms = chemical.ghs_pictograms || [];
        const signalWord = chemical.signal_word_zh || chemical.signal_word || "";
        const signalClass = chemical.signal_word === "Danger" ? "danger" : "warning";
        const pubchemUrl = chemical.cid 
          ? `https://pubchem.ncbi.nlm.nih.gov/compound/${chemical.cid}`
          : `https://pubchem.ncbi.nlm.nih.gov/#query=${chemical.cas_number}`;
        
        return `
          <div class="label label-qr">
            <div class="qr-left">
              <div class="name-section">
                <div class="name-en">${chemical.name_en || ""}</div>
                ${chemical.name_zh ? `<div class="name-zh">${chemical.name_zh}</div>` : ""}
                <div class="cas">CAS: ${chemical.cas_number}</div>
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
              <div class="qr-hint">掃碼查看詳情</div>
            </div>
          </div>
        `;
      },
    };

    // Generate labels
    const labelsHtml = selectedForLabel.map((chemical) => templates[labelConfig.template](chemical)).join("");

    // Improved CSS with FIXED dimensions
    const styles = `
      @page {
        size: A4;
        margin: 10mm;
      }
      * {
        box-sizing: border-box;
        margin: 0;
        padding: 0;
      }
      body {
        font-family: "Microsoft JhengHei", "PingFang TC", "Noto Sans TC", "Helvetica Neue", Arial, sans-serif;
        padding: 5mm;
        background: #fff;
      }
      .labels-container {
        display: flex;
        flex-wrap: wrap;
        gap: 5mm;
      }
      
      /* ===== LABEL BASE ===== */
      .label {
        width: ${sizeConfig.width};
        height: ${sizeConfig.height};
        border: 2px solid #222;
        border-radius: 2mm;
        padding: 3mm;
        page-break-inside: avoid;
        display: flex;
        flex-direction: column;
        background: #fff;
        overflow: hidden;
        font-size: ${sizeConfig.fontSize};
      }
      .label-full {
        height: auto;
        min-height: ${sizeConfig.height};
      }
      .label-qr {
        flex-direction: row;
      }
      
      /* ===== LABEL SECTIONS ===== */
      .label-top {
        flex-shrink: 0;
        border-bottom: 1px solid #ccc;
        padding-bottom: 2mm;
        margin-bottom: 2mm;
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
        margin-bottom: 2mm;
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
        margin: 2mm 0;
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
        height: 8mm;
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
        padding-top: 2mm;
        font-size: ${sizeConfig.hazardSize};
        line-height: 1.4;
      }
      .hazards-full {
        border-top: 1px dashed #aaa;
        padding-top: 2mm;
        font-size: calc(${sizeConfig.hazardSize} - 1px);
        line-height: 1.3;
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

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <title>GHS 標籤列印</title>
        <style>${styles}</style>
      </head>
      <body>
        <div class="labels-container">
          ${labelsHtml}
        </div>
        <script>
          // Wait for images to load before printing
          window.onload = function() {
            const images = document.querySelectorAll('img');
            let loaded = 0;
            const total = images.length;
            
            if (total === 0) {
              setTimeout(() => window.print(), 300);
              return;
            }
            
            images.forEach(img => {
              if (img.complete) {
                loaded++;
                if (loaded === total) setTimeout(() => window.print(), 300);
              } else {
                img.onload = img.onerror = function() {
                  loaded++;
                  if (loaded === total) setTimeout(() => window.print(), 300);
                };
              }
            });
          };
        </script>
      </body>
      </html>
    `);
    printWindow.document.close();
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      {/* Header */}
      <header className="bg-slate-800/50 backdrop-blur-sm border-b border-slate-700 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-br from-amber-500 to-red-500 rounded-lg flex items-center justify-center">
                <span className="text-xl">⚠️</span>
              </div>
              <div>
                <h1 className="text-xl font-bold text-white">
                  GHS Label Quick Search
                </h1>
                <p className="text-xs text-slate-400">化學品危險標籤快速查詢</p>
              </div>
            </div>
            <div className="flex gap-2">
              {/* Favorites Button */}
              <button
                onClick={() => setShowFavorites(!showFavorites)}
                className="relative px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-lg transition-colors flex items-center gap-2"
                data-testid="favorites-toggle-btn"
              >
                <span>⭐</span>
                <span className="hidden sm:inline">收藏</span>
                {favorites.length > 0 && (
                  <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center">
                    {favorites.length}
                  </span>
                )}
              </button>
              {/* History Button */}
              <button
                onClick={() => setShowHistory(!showHistory)}
                className="relative px-4 py-2 bg-slate-700 hover:bg-slate-600 text-slate-300 rounded-lg transition-colors flex items-center gap-2"
                data-testid="history-toggle-btn"
              >
                <span>📋</span>
                <span className="hidden sm:inline">搜尋紀錄</span>
                {history.length > 0 && (
                  <span className="absolute -top-1 -right-1 w-5 h-5 bg-amber-500 text-white text-xs rounded-full flex items-center justify-center">
                    {history.length}
                  </span>
                )}
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Favorites Sidebar */}
      {showFavorites && (
        <div
          className="fixed inset-0 z-50 bg-black/50"
          onClick={() => setShowFavorites(false)}
        >
          <div
            className="absolute right-0 top-0 h-full w-96 bg-slate-800 shadow-xl overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-4 border-b border-slate-700 flex items-center justify-between sticky top-0 bg-slate-800">
              <h2 className="text-lg font-semibold text-white flex items-center gap-2">
                <span>⭐</span> 我的收藏
              </h2>
              <div className="flex gap-2">
                {favorites.length > 0 && (
                  <button
                    onClick={clearFavorites}
                    className="text-sm text-red-400 hover:text-red-300"
                    data-testid="clear-favorites-btn"
                  >
                    清除全部
                  </button>
                )}
                <button
                  onClick={() => setShowFavorites(false)}
                  className="text-slate-400 hover:text-white"
                >
                  ✕
                </button>
              </div>
            </div>
            {favorites.length === 0 ? (
              <div className="p-8 text-center text-slate-500">
                <p className="text-4xl mb-4">⭐</p>
                <p>尚無收藏的化學品</p>
                <p className="text-sm mt-2">點擊查詢結果中的星號即可收藏</p>
              </div>
            ) : (
              <div className="p-2">
                {favorites.map((item, idx) => (
                  <div
                    key={idx}
                    className="p-3 hover:bg-slate-700 rounded-lg transition-colors mb-2 border border-slate-600"
                  >
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <div className="font-mono text-amber-400 text-sm">
                          {item.cas_number}
                        </div>
                        <div className="text-white font-medium">
                          {item.name_en}
                        </div>
                        {item.name_zh && (
                          <div className="text-slate-400 text-sm">
                            {item.name_zh}
                          </div>
                        )}
                        {item.ghs_pictograms?.length > 0 && (
                          <div className="flex gap-1 mt-2">
                            {item.ghs_pictograms.map((pic, pIdx) => (
                              <img
                                key={pIdx}
                                src={GHS_IMAGES[pic.code]}
                                alt={pic.name_zh}
                                className="w-8 h-8 bg-white rounded"
                                title={`${pic.code}: ${pic.name_zh}`}
                              />
                            ))}
                          </div>
                        )}
                      </div>
                      <button
                        onClick={() => toggleFavorite(item)}
                        className="text-amber-400 hover:text-amber-300 text-xl"
                        title="取消收藏"
                      >
                        ⭐
                      </button>
                    </div>
                    <div className="flex gap-2 mt-2">
                      <button
                        onClick={() => {
                          setSelectedResult(item);
                          setShowFavorites(false);
                        }}
                        className="text-xs px-2 py-1 bg-slate-600 hover:bg-slate-500 text-slate-300 rounded"
                      >
                        詳細資訊
                      </button>
                      <button
                        onClick={() => {
                          setSelectedForLabel([item]);
                          setShowLabelModal(true);
                          setShowFavorites(false);
                        }}
                        className="text-xs px-2 py-1 bg-blue-600 hover:bg-blue-500 text-white rounded"
                      >
                        列印標籤
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* History Sidebar */}
      {showHistory && (
        <div
          className="fixed inset-0 z-50 bg-black/50"
          onClick={() => setShowHistory(false)}
        >
          <div
            className="absolute right-0 top-0 h-full w-80 bg-slate-800 shadow-xl overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-4 border-b border-slate-700 flex items-center justify-between sticky top-0 bg-slate-800">
              <h2 className="text-lg font-semibold text-white">搜尋紀錄</h2>
              <div className="flex gap-2">
                {history.length > 0 && (
                  <button
                    onClick={clearHistory}
                    className="text-sm text-red-400 hover:text-red-300"
                    data-testid="clear-history-btn"
                  >
                    清除全部
                  </button>
                )}
                <button
                  onClick={() => setShowHistory(false)}
                  className="text-slate-400 hover:text-white"
                >
                  ✕
                </button>
              </div>
            </div>
            {history.length === 0 ? (
              <div className="p-8 text-center text-slate-500">
                <p>尚無搜尋紀錄</p>
              </div>
            ) : (
              <div className="p-2">
                {history.map((item, idx) => (
                  <button
                    key={idx}
                    onClick={() => {
                      setSingleCas(item.cas_number);
                      setActiveTab("single");
                      setShowHistory(false);
                    }}
                    className="w-full p-3 text-left hover:bg-slate-700 rounded-lg transition-colors mb-1"
                    data-testid={`history-item-${idx}`}
                  >
                    <div className="font-mono text-amber-400 text-sm">
                      {item.cas_number}
                    </div>
                    <div className="text-white text-sm truncate">
                      {item.name_en}
                    </div>
                    {item.name_zh && (
                      <div className="text-slate-400 text-xs truncate">
                        {item.name_zh}
                      </div>
                    )}
                    <div className="text-slate-500 text-xs mt-1">
                      {formatDate(item.timestamp)}
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 py-6">
        {/* Search Tabs */}
        <div className="bg-slate-800/50 backdrop-blur-sm rounded-2xl border border-slate-700 overflow-hidden mb-6">
          <div className="flex border-b border-slate-700">
            <button
              onClick={() => setActiveTab("single")}
              className={`flex-1 px-6 py-4 text-sm font-medium transition-colors ${
                activeTab === "single"
                  ? "bg-slate-700/50 text-amber-400 border-b-2 border-amber-400"
                  : "text-slate-400 hover:text-white hover:bg-slate-700/30"
              }`}
              data-testid="single-search-tab"
            >
              <span className="mr-2">🔍</span> 單一查詢
            </button>
            <button
              onClick={() => setActiveTab("batch")}
              className={`flex-1 px-6 py-4 text-sm font-medium transition-colors ${
                activeTab === "batch"
                  ? "bg-slate-700/50 text-amber-400 border-b-2 border-amber-400"
                  : "text-slate-400 hover:text-white hover:bg-slate-700/30"
              }`}
              data-testid="batch-search-tab"
            >
              <span className="mr-2">📋</span> 批次查詢
            </button>
          </div>

          <div className="p-6">
            {activeTab === "single" ? (
              <div className="space-y-4">
                <div>
                  <label className="block text-sm text-slate-400 mb-2">
                    輸入 CAS 號碼
                  </label>
                  <div className="flex gap-3">
                    <input
                      type="text"
                      value={singleCas}
                      onChange={(e) => setSingleCas(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && searchSingle()}
                      placeholder="例如: 64-17-5"
                      className="flex-1 px-4 py-3 bg-slate-900 border border-slate-600 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent font-mono"
                      data-testid="single-cas-input"
                    />
                    <button
                      onClick={searchSingle}
                      disabled={loading}
                      className="px-6 py-3 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white font-medium rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                      data-testid="single-search-btn"
                    >
                      {loading ? (
                        <>
                          <span className="animate-spin">⏳</span> 查詢中...
                        </>
                      ) : (
                        <>
                          <span>🔍</span> 查詢
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <div>
                  <label className="block text-sm text-slate-400 mb-2">
                    批次輸入 CAS 號碼（可從 Excel 複製貼上）
                  </label>
                  <textarea
                    value={batchCas}
                    onChange={(e) => setBatchCas(e.target.value)}
                    placeholder="支援逗號、換行、Tab 分隔\n例如:\n64-17-5\n67-56-1\n7732-18-5"
                    className="w-full h-40 px-4 py-3 bg-slate-900 border border-slate-600 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent font-mono resize-none"
                    data-testid="batch-cas-input"
                  />
                </div>
                <div className="flex gap-3">
                  <button
                    onClick={searchBatch}
                    disabled={loading}
                    className="flex-1 px-6 py-3 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white font-medium rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                    data-testid="batch-search-btn"
                  >
                    {loading ? (
                      <>
                        <span className="animate-spin">⏳</span> 查詢中...
                      </>
                    ) : (
                      <>
                        <span>🔍</span> 批次查詢
                      </>
                    )}
                  </button>
                  <button
                    onClick={() => setBatchCas("")}
                    className="px-6 py-3 bg-slate-700 hover:bg-slate-600 text-slate-300 rounded-xl transition-colors"
                    data-testid="clear-batch-btn"
                  >
                    清除
                  </button>
                </div>
              </div>
            )}

            {error && (
              <div
                className="mt-4 p-4 bg-red-500/20 border border-red-500/50 rounded-xl text-red-400"
                data-testid="error-message"
              >
                ⚠️ {error}
              </div>
            )}
          </div>
        </div>

        {/* Results */}
        {results.length > 0 && (
          <div className="bg-slate-800/50 backdrop-blur-sm rounded-2xl border border-slate-700 overflow-hidden">
            {/* Results Header */}
            <div className="p-4 border-b border-slate-700 flex items-center justify-between flex-wrap gap-3">
              <div className="text-white">
                <span className="font-semibold">查詢結果</span>
                <span className="text-slate-400 ml-2">
                  共 {results.length} 筆，成功{" "}
                  {results.filter((r) => r.found).length} 筆
                </span>
              </div>
              <div className="flex gap-2 flex-wrap">
                {/* Label Print Button */}
                <button
                  onClick={() => {
                    if (selectedForLabel.length === 0) {
                      selectAllForLabel();
                    }
                    setShowLabelModal(true);
                  }}
                  className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white text-sm rounded-lg transition-colors flex items-center gap-2"
                  data-testid="print-label-btn"
                >
                  <span>🏷️</span> 列印標籤
                  {selectedForLabel.length > 0 && (
                    <span className="bg-purple-800 px-2 py-0.5 rounded-full text-xs">
                      {selectedForLabel.length}
                    </span>
                  )}
                </button>
                <button
                  onClick={exportToExcel}
                  className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white text-sm rounded-lg transition-colors flex items-center gap-2"
                  data-testid="export-xlsx-btn"
                >
                  <span>📊</span> 匯出 Excel
                </button>
                <button
                  onClick={exportToCSV}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm rounded-lg transition-colors flex items-center gap-2"
                  data-testid="export-csv-btn"
                >
                  <span>📄</span> 匯出 CSV
                </button>
              </div>
            </div>

            {/* Selection controls */}
            {results.filter((r) => r.found).length > 0 && (
              <div className="px-4 py-2 bg-slate-900/30 border-b border-slate-700 flex items-center gap-4 text-sm">
                <span className="text-slate-400">標籤列印選擇：</span>
                <button
                  onClick={selectAllForLabel}
                  className="text-amber-400 hover:text-amber-300"
                >
                  全選
                </button>
                <button
                  onClick={clearLabelSelection}
                  className="text-slate-400 hover:text-slate-300"
                >
                  取消全選
                </button>
                <span className="text-slate-500">
                  已選 {selectedForLabel.length} 項
                </span>
              </div>
            )}

            {/* Results Table */}
            <div className="overflow-x-auto">
              <table className="w-full min-w-[900px]" data-testid="results-table">
                <thead>
                  <tr className="bg-slate-900/50">
                    <th className="px-2 py-3 text-center text-xs font-medium text-slate-400 uppercase tracking-wider w-12">
                      選擇
                    </th>
                    <th className="px-2 py-3 text-center text-xs font-medium text-slate-400 uppercase tracking-wider w-12">
                      收藏
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider w-28">
                      CAS No.
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider min-w-[200px]">
                      名稱
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider w-48">
                      GHS 標示
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider w-20">
                      警示語
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider w-24">
                      操作
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-700">
                  {results.map((result, idx) => (
                    <tr
                      key={idx}
                      className={`hover:bg-slate-700/30 transition-colors ${
                        !result.found ? "opacity-60" : ""
                      } ${isSelectedForLabel(result.cas_number) ? "bg-purple-900/20" : ""}`}
                      data-testid={`result-row-${idx}`}
                    >
                      <td className="px-2 py-4 text-center">
                        {result.found && (
                          <input
                            type="checkbox"
                            checked={isSelectedForLabel(result.cas_number)}
                            onChange={() => toggleSelectForLabel(result)}
                            className="w-4 h-4 rounded border-slate-500 text-purple-500 focus:ring-purple-500 bg-slate-700"
                          />
                        )}
                      </td>
                      <td className="px-2 py-4 text-center">
                        {result.found && (
                          <button
                            onClick={() => toggleFavorite(result)}
                            className={`text-xl transition-colors ${
                              isFavorited(result.cas_number)
                                ? "text-amber-400 hover:text-amber-300"
                                : "text-slate-600 hover:text-amber-400"
                            }`}
                            title={isFavorited(result.cas_number) ? "取消收藏" : "加入收藏"}
                            data-testid={`favorite-btn-${idx}`}
                          >
                            {isFavorited(result.cas_number) ? "⭐" : "☆"}
                          </button>
                        )}
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap">
                        <span className="font-mono text-amber-400">
                          {result.cas_number}
                        </span>
                      </td>
                      <td className="px-4 py-4">
                        {result.found ? (
                          <div>
                            <div className="text-white font-medium break-words">
                              {result.name_en || "（名稱載入中...）"}
                            </div>
                            {result.name_zh && (
                              <div className="text-slate-400 text-sm">
                                {result.name_zh}
                              </div>
                            )}
                          </div>
                        ) : (
                          <span className="text-red-400">{result.error}</span>
                        )}
                      </td>
                      <td className="px-4 py-4">
                        {result.found && (result.ghs_pictograms?.length > 0 || result.other_classifications?.length > 0) ? (
                          <div className="space-y-2">
                            {/* Current Selected Classification */}
                            {(() => {
                              const effective = getEffectiveClassification(result);
                              const allClassifications = [
                                {
                                  pictograms: result.ghs_pictograms || [],
                                  hazard_statements: result.hazard_statements || [],
                                  signal_word: result.signal_word,
                                  signal_word_zh: result.signal_word_zh,
                                },
                                ...(result.other_classifications || [])
                              ];
                              
                              return (
                                <>
                                  <div className="flex gap-1 flex-wrap items-center">
                                    {effective.isCustom ? (
                                      <span className="text-xs text-purple-400 mr-1" title="您選擇的分類">★</span>
                                    ) : (
                                      <span className="text-xs text-emerald-400 mr-1" title="主要分類（預設）">●</span>
                                    )}
                                    {effective.pictograms?.map((pic, pIdx) => (
                                      <div
                                        key={pIdx}
                                        className="group relative"
                                        title={`${pic.code}: ${pic.name_zh}`}
                                      >
                                        <img
                                          src={GHS_IMAGES[pic.code]}
                                          alt={pic.name_zh}
                                          className="w-10 h-10 bg-white rounded"
                                        />
                                        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 bg-slate-900 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none z-10">
                                          {pic.code}: {pic.name_zh}
                                        </div>
                                      </div>
                                    ))}
                                    {effective.isCustom && (
                                      <button
                                        onClick={() => clearCustomClassification(result.cas_number)}
                                        className="ml-2 text-xs text-slate-500 hover:text-red-400"
                                        title="恢復預設分類"
                                      >
                                        ✕
                                      </button>
                                    )}
                                  </div>
                                  {effective.note && (
                                    <div className="text-xs text-purple-300">📝 {effective.note}</div>
                                  )}
                                  
                                  {/* Other Classifications Toggle */}
                                  {allClassifications.length > 1 && (
                                    <div>
                                      <button
                                        onClick={() => toggleOtherClassifications(result.cas_number)}
                                        className="text-xs text-blue-400 hover:text-blue-300 flex items-center gap-1"
                                      >
                                        <span>{expandedOtherClassifications[result.cas_number] ? '▼' : '▶'}</span>
                                        {allClassifications.length - 1} 種其他分類
                                      </button>
                                      
                                      {/* Expanded Other Classifications */}
                                      {expandedOtherClassifications[result.cas_number] && (
                                        <div className="mt-2 space-y-2 pl-2 border-l-2 border-slate-600">
                                          {allClassifications.map((cls, clsIdx) => {
                                            const isSelected = effective.customIndex === clsIdx;
                                            if (isSelected) return null; // Skip the currently selected one
                                            
                                            return (
                                              <div key={clsIdx} className="flex gap-1 flex-wrap items-center group/item">
                                                <span className="text-xs text-slate-500 mr-1">○</span>
                                                {cls.pictograms?.map((pic, pIdx) => (
                                                  <div
                                                    key={pIdx}
                                                    className="group relative"
                                                    title={`${pic.code}: ${pic.name_zh}`}
                                                  >
                                                    <img
                                                      src={GHS_IMAGES[pic.code]}
                                                      alt={pic.name_zh}
                                                      className="w-8 h-8 bg-white rounded opacity-70"
                                                    />
                                                  </div>
                                                ))}
                                                <button
                                                  onClick={() => setCustomClassification(result.cas_number, clsIdx)}
                                                  className="ml-2 text-xs text-blue-400 hover:text-blue-300 opacity-0 group-hover/item:opacity-100 transition-opacity"
                                                  title="設為我的主要分類"
                                                >
                                                  設為主要
                                                </button>
                                              </div>
                                            );
                                          })}
                                        </div>
                                      )}
                                    </div>
                                  )}
                                </>
                              );
                            })()}
                          </div>
                        ) : result.found ? (
                          <span className="text-slate-500">無危害標示</span>
                        ) : (
                          "-"
                        )}
                      </td>
                      <td className="px-4 py-4">
                        {result.found ? (
                          (() => {
                            const effective = getEffectiveClassification(result);
                            return effective?.signal_word ? (
                              <span
                                className={`px-2 py-1 rounded text-sm font-medium ${
                                  effective.signal_word === "Danger"
                                    ? "bg-red-500/20 text-red-400"
                                    : "bg-amber-500/20 text-amber-400"
                                }`}
                              >
                                {effective.signal_word_zh || effective.signal_word}
                              </span>
                            ) : (
                              <span className="text-slate-500">-</span>
                            );
                          })()
                        ) : (
                          "-"
                        )}
                      </td>
                      <td className="px-4 py-4">
                        {result.found && (
                          <button
                            onClick={() => setSelectedResult(result)}
                            className="px-3 py-1 bg-slate-700 hover:bg-slate-600 text-slate-300 text-sm rounded transition-colors"
                            data-testid={`detail-btn-${idx}`}
                          >
                            詳細資訊
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Empty State */}
        {results.length === 0 && !loading && (
          <div className="text-center py-16">
            <div className="text-6xl mb-4">🧪</div>
            <h2 className="text-xl font-semibold text-white mb-2">
              開始查詢化學品 GHS 標籤
            </h2>
            <p className="text-slate-400 max-w-md mx-auto">
              輸入 CAS 號碼（如 64-17-5）即可查詢化學品的 GHS
              危害標示和安全資訊。支援批次查詢和 Excel 匯出。
            </p>
          </div>
        )}
      </main>

      {/* Detail Modal */}
      {selectedResult && (
        <div
          className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4"
          onClick={() => setSelectedResult(null)}
        >
          <div
            className="bg-slate-800 rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-6 border-b border-slate-700 flex items-start justify-between">
              <div>
                <h2 className="text-xl font-bold text-white">
                  {selectedResult.name_en}
                </h2>
                {selectedResult.name_zh && (
                  <p className="text-slate-400">{selectedResult.name_zh}</p>
                )}
                <p className="text-amber-400 font-mono mt-1">
                  CAS: {selectedResult.cas_number}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => toggleFavorite(selectedResult)}
                  className={`text-2xl transition-colors ${
                    isFavorited(selectedResult.cas_number)
                      ? "text-amber-400 hover:text-amber-300"
                      : "text-slate-600 hover:text-amber-400"
                  }`}
                  title={isFavorited(selectedResult.cas_number) ? "取消收藏" : "加入收藏"}
                >
                  {isFavorited(selectedResult.cas_number) ? "⭐" : "☆"}
                </button>
                <button
                  onClick={() => setSelectedResult(null)}
                  className="text-slate-400 hover:text-white text-2xl"
                  data-testid="close-modal-btn"
                >
                  ✕
                </button>
              </div>
            </div>

            <div className="p-6 space-y-6">
              {/* Custom Classification Note Input */}
              {(selectedResult.has_multiple_classifications || selectedResult.other_classifications?.length > 0) && (
                <div className="bg-purple-900/20 border border-purple-500/30 rounded-lg p-4">
                  <h3 className="text-sm font-medium text-purple-300 mb-2 flex items-center gap-2">
                    <span>⚙️</span> 自訂分類設定
                  </h3>
                  <p className="text-xs text-slate-400 mb-3">
                    您可以選擇最適合您用途的 GHS 分類（如：實驗室純品、工業級等）
                  </p>
                  <div className="flex gap-2 items-center">
                    <input
                      type="text"
                      placeholder="備註（如：實驗室用純品）"
                      value={customGHSSettings[selectedResult.cas_number]?.note || ""}
                      onChange={(e) => {
                        const currentIndex = customGHSSettings[selectedResult.cas_number]?.selectedIndex || 0;
                        setCustomClassification(selectedResult.cas_number, currentIndex, e.target.value);
                      }}
                      className="flex-1 px-3 py-2 bg-slate-900 border border-slate-600 rounded-lg text-white text-sm focus:outline-none focus:border-purple-500"
                    />
                    {hasCustomClassification(selectedResult.cas_number) && (
                      <button
                        onClick={() => clearCustomClassification(selectedResult.cas_number)}
                        className="px-3 py-2 bg-slate-700 hover:bg-red-600/50 text-slate-300 text-sm rounded-lg transition-colors"
                        title="清除自訂設定"
                      >
                        重置
                      </button>
                    )}
                  </div>
                </div>
              )}
              
              {/* Signal Word - using effective classification */}
              {(() => {
                const effective = getEffectiveClassification(selectedResult);
                return effective?.signal_word && (
                  <div>
                    <h3 className="text-sm font-medium text-slate-400 mb-2">
                      警示語
                    </h3>
                    <span
                      className={`inline-block px-4 py-2 rounded-lg text-lg font-bold ${
                        effective.signal_word === "Danger"
                          ? "bg-red-500/20 text-red-400 border border-red-500/50"
                          : "bg-amber-500/20 text-amber-400 border border-amber-500/50"
                      }`}
                    >
                      {effective.signal_word_zh || effective.signal_word}
                    </span>
                  </div>
                );
              })()}

              {/* All GHS Classifications with Selection */}
              {(() => {
                const effective = getEffectiveClassification(selectedResult);
                const allClassifications = [
                  {
                    pictograms: selectedResult.ghs_pictograms || [],
                    hazard_statements: selectedResult.hazard_statements || [],
                    signal_word: selectedResult.signal_word,
                    signal_word_zh: selectedResult.signal_word_zh,
                    source: "預設分類（第一筆報告）"
                  },
                  ...(selectedResult.other_classifications || [])
                ];
                
                return allClassifications.length > 0 && allClassifications[0].pictograms?.length > 0 && (
                  <div>
                    <h3 className="text-sm font-medium text-slate-400 mb-3">
                      GHS 危害圖示分類
                      {allClassifications.length > 1 && (
                        <span className="text-blue-400 ml-2">（共 {allClassifications.length} 種）</span>
                      )}
                    </h3>
                    <div className="space-y-3">
                      {allClassifications.map((cls, clsIdx) => {
                        const isSelected = effective.customIndex === clsIdx;
                        const hasNoPictograms = !cls.pictograms || cls.pictograms.length === 0;
                        if (hasNoPictograms) return null;
                        
                        return (
                          <div
                            key={clsIdx}
                            className={`rounded-xl p-4 border-2 transition-all cursor-pointer ${
                              isSelected
                                ? "bg-purple-900/30 border-purple-500"
                                : "bg-slate-900/50 border-slate-700 hover:border-slate-500"
                            }`}
                            onClick={() => setCustomClassification(
                              selectedResult.cas_number, 
                              clsIdx, 
                              customGHSSettings[selectedResult.cas_number]?.note || ""
                            )}
                          >
                            <div className="flex items-center justify-between mb-3">
                              <div className="flex items-center gap-2">
                                {isSelected ? (
                                  <span className="text-purple-400 text-lg">★</span>
                                ) : (
                                  <span className="text-slate-500 text-lg">○</span>
                                )}
                                <span className={`text-sm font-medium ${isSelected ? "text-purple-300" : "text-slate-400"}`}>
                                  {clsIdx === 0 ? "預設分類" : `分類 ${clsIdx + 1}`}
                                </span>
                                {isSelected && (
                                  <span className="px-2 py-0.5 bg-purple-500/30 text-purple-300 text-xs rounded">
                                    目前選擇
                                  </span>
                                )}
                              </div>
                              {!isSelected && (
                                <button
                                  className="text-xs text-blue-400 hover:text-blue-300"
                                >
                                  點擊選擇
                                </button>
                              )}
                            </div>
                            
                            <div className="flex gap-3 flex-wrap">
                              {cls.pictograms?.map((pic, pIdx) => (
                                <div key={pIdx} className="text-center">
                                  <img
                                    src={GHS_IMAGES[pic.code]}
                                    alt={pic.name_zh}
                                    className={`w-14 h-14 bg-white rounded-lg ${!isSelected ? "opacity-70" : ""}`}
                                  />
                                  <p className="text-xs text-slate-400 mt-1">{pic.code}</p>
                                </div>
                              ))}
                            </div>
                            
                            {cls.signal_word_zh && (
                              <p className="text-xs text-slate-400 mt-2">
                                警示語: <span className={cls.signal_word === "Danger" ? "text-red-400" : "text-amber-400"}>{cls.signal_word_zh}</span>
                              </p>
                            )}
                            
                            {cls.source && clsIdx > 0 && (
                              <p className="text-xs text-slate-500 mt-1 line-clamp-1" title={cls.source}>
                                {cls.source.substring(0, 80)}...
                              </p>
                            )}
                          </div>
                        );
                      })}
                    </div>
                    <p className="text-xs text-slate-500 mt-3">
                      💡 點擊任一分類即可設為您的主要分類，設定會自動儲存
                    </p>
                  </div>
                );
              })()}

              {/* Hazard Statements - using effective classification */}
              {(() => {
                const effective = getEffectiveClassification(selectedResult);
                return effective?.hazard_statements?.length > 0 && (
                  <div>
                    <h3 className="text-sm font-medium text-slate-400 mb-3">
                      危害說明
                      {effective.isCustom && <span className="text-purple-400 ml-2">（依您選擇的分類）</span>}
                    </h3>
                    <div className="space-y-2">
                      {effective.hazard_statements.map((stmt, idx) => (
                        <div
                          key={idx}
                          className="bg-slate-900 rounded-lg p-3 flex gap-3"
                        >
                          <span className="text-amber-400 font-mono font-medium shrink-0">
                            {stmt.code}
                          </span>
                          <span className="text-white">{stmt.text_zh}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })()}

              {/* Action Buttons */}
              <div className="pt-4 border-t border-slate-700 flex flex-wrap gap-3">
                <button
                  onClick={() => {
                    setSelectedForLabel([selectedResult]);
                    setShowLabelModal(true);
                  }}
                  className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg flex items-center gap-2"
                >
                  <span>🏷️</span> 列印標籤
                </button>
                {selectedResult.cid && (
                  <a
                    href={`https://pubchem.ncbi.nlm.nih.gov/compound/${selectedResult.cid}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-slate-300 rounded-lg flex items-center gap-2"
                  >
                    <span>🔗</span> 在 PubChem 查看完整資訊
                  </a>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Label Print Modal */}
      {showLabelModal && (
        <div
          className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4"
          onClick={() => setShowLabelModal(false)}
        >
          <div
            className="bg-slate-800 rounded-2xl max-w-3xl w-full max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-6 border-b border-slate-700 flex items-center justify-between">
              <h2 className="text-xl font-bold text-white flex items-center gap-2">
                <span>🏷️</span> GHS 標籤列印
              </h2>
              <button
                onClick={() => setShowLabelModal(false)}
                className="text-slate-400 hover:text-white text-2xl"
              >
                ✕
              </button>
            </div>

            <div className="p-6 space-y-6">
              {/* Template Selection */}
              <div>
                <h3 className="text-sm font-medium text-slate-400 mb-3">
                  選擇版型
                </h3>
                <div className="grid grid-cols-2 gap-3">
                  {[
                    { 
                      value: "icon", 
                      label: "圖示版", 
                      desc: "名稱 + 圖示 + 警示語",
                      icon: "🎯",
                      tip: "最精簡，適合小容器"
                    },
                    { 
                      value: "standard", 
                      label: "標準版", 
                      desc: "圖示 + 警示語 + 3條危害說明",
                      icon: "📋",
                      tip: "常規使用推薦"
                    },
                    { 
                      value: "full", 
                      label: "完整版", 
                      desc: "所有危害說明（自動縮小字體）",
                      icon: "📄",
                      tip: "需要完整資訊時使用"
                    },
                    { 
                      value: "qrcode", 
                      label: "QR Code 版", 
                      desc: "基本資訊 + 掃碼查看詳情",
                      icon: "📱",
                      tip: "掃碼連結 PubChem 完整資料"
                    },
                  ].map((template) => (
                    <button
                      key={template.value}
                      onClick={() => setLabelConfig((prev) => ({ ...prev, template: template.value }))}
                      className={`p-4 rounded-lg border-2 transition-colors text-left ${
                        labelConfig.template === template.value
                          ? "border-purple-500 bg-purple-500/10"
                          : "border-slate-600 bg-slate-900 hover:border-slate-500"
                      }`}
                    >
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-xl">{template.icon}</span>
                        <span className={`font-medium ${labelConfig.template === template.value ? "text-purple-400" : "text-white"}`}>
                          {template.label}
                        </span>
                      </div>
                      <div className="text-xs text-slate-400">{template.desc}</div>
                      <div className="text-xs text-slate-500 mt-1">{template.tip}</div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Label Size Selection */}
              <div>
                <h3 className="text-sm font-medium text-slate-400 mb-3">
                  標籤尺寸
                </h3>
                <div className="grid grid-cols-3 gap-3">
                  {[
                    { value: "small", label: "小", desc: "60×45mm", tip: "小瓶/試管" },
                    { value: "medium", label: "中", desc: "80×60mm", tip: "標準瓶" },
                    { value: "large", label: "大", desc: "105×80mm", tip: "大容器" },
                  ].map((size) => (
                    <button
                      key={size.value}
                      onClick={() => setLabelConfig((prev) => ({ ...prev, size: size.value }))}
                      className={`p-3 rounded-lg border-2 transition-colors ${
                        labelConfig.size === size.value
                          ? "border-amber-500 bg-amber-500/10 text-amber-400"
                          : "border-slate-600 bg-slate-900 text-slate-400 hover:border-slate-500"
                      }`}
                    >
                      <div className="font-medium">{size.label}</div>
                      <div className="text-xs opacity-70">{size.desc}</div>
                      <div className="text-xs opacity-50">{size.tip}</div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Selected Chemicals */}
              <div>
                <h3 className="text-sm font-medium text-slate-400 mb-3">
                  已選擇 {selectedForLabel.length} 個化學品
                </h3>
                <div className="max-h-40 overflow-y-auto space-y-2 bg-slate-900 rounded-lg p-3">
                  {selectedForLabel.length === 0 ? (
                    <p className="text-slate-500 text-center py-4">
                      尚未選擇任何化學品
                    </p>
                  ) : (
                    selectedForLabel.map((chem, idx) => (
                      <div
                        key={idx}
                        className="flex items-center justify-between p-2 bg-slate-800 rounded"
                      >
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-amber-400 text-sm">
                            {chem.cas_number}
                          </span>
                          <span className="text-white text-sm truncate max-w-[200px]">
                            {chem.name_en}
                          </span>
                          {chem.ghs_pictograms?.length > 0 && (
                            <span className="text-xs text-slate-500">
                              ({chem.ghs_pictograms.length} 個圖示)
                            </span>
                          )}
                        </div>
                        <button
                          onClick={() => toggleSelectForLabel(chem)}
                          className="text-slate-400 hover:text-red-400 px-2"
                        >
                          ✕
                        </button>
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* Preview hint */}
              <div className="bg-slate-900/50 rounded-lg p-3 text-sm text-slate-400">
                <span className="text-amber-400">💡 提示：</span> 點擊「列印標籤」後會開啟預覽視窗，您可以在列印前確認標籤樣式。
              </div>

              {/* Print Button */}
              <div className="flex gap-3">
                <button
                  onClick={printLabels}
                  disabled={selectedForLabel.length === 0}
                  className="flex-1 px-6 py-3 bg-gradient-to-r from-purple-500 to-purple-600 hover:from-purple-600 hover:to-purple-700 text-white font-medium rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  <span>🖨️</span> 列印標籤 ({selectedForLabel.length} 張)
                </button>
                <button
                  onClick={() => setShowLabelModal(false)}
                  className="px-6 py-3 bg-slate-700 hover:bg-slate-600 text-slate-300 rounded-xl transition-colors"
                >
                  取消
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Footer */}
      <footer className="border-t border-slate-700 mt-12 py-6">
        <div className="max-w-7xl mx-auto px-4 text-center text-slate-500 text-sm">
          <p>資料來源: PubChem (NIH) | 僅供參考，請以官方 SDS 為準</p>
        </div>
      </footer>
    </div>
  );
}

export default App;
