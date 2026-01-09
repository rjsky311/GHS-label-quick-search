import { useState, useEffect, useCallback } from "react";
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

  // Load history from localStorage
  useEffect(() => {
    const savedHistory = localStorage.getItem(HISTORY_KEY);
    if (savedHistory) {
      try {
        setHistory(JSON.parse(savedHistory));
      } catch (e) {
        console.error("Failed to parse history", e);
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
      // Remove duplicates and add new items
      const existingCas = new Set(newHistoryItems.map((h) => h.cas_number));
      const filtered = prev.filter((h) => !existingCas.has(h.cas_number));
      const updated = [...newHistoryItems, ...filtered].slice(0, MAX_HISTORY);
      localStorage.setItem(HISTORY_KEY, JSON.stringify(updated));
      return updated;
    });
  }, []);

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

    // Parse input - support comma, newline, tab, space separation
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
      // Fallback to client-side export
      const wsData = [
        ["CAS No.", "英文名稱", "中文名稱", "GHS標示", "警示語", "危害說明"],
      ];

      results.forEach((r) => {
        const ghsText = r.ghs_pictograms
          ? r.ghs_pictograms
              .map((p) => `${p.code} (${p.name_zh})`)
              .join(", ")
          : "無";
        const signal = r.signal_word_zh || r.signal_word || "-";
        const hazardText = r.hazard_statements
          ? r.hazard_statements
              .map((s) => `${s.code}: ${s.text_zh}`)
              .join("; ")
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
      // Fallback to client-side export
      const wsData = [
        ["CAS No.", "英文名稱", "中文名稱", "GHS標示", "警示語", "危害說明"],
      ];

      results.forEach((r) => {
        const ghsText = r.ghs_pictograms
          ? r.ghs_pictograms
              .map((p) => `${p.code} (${p.name_zh})`)
              .join(", ")
          : "無";
        const signal = r.signal_word_zh || r.signal_word || "-";
        const hazardText = r.hazard_statements
          ? r.hazard_statements
              .map((s) => `${s.code}: ${s.text_zh}`)
              .join("; ")
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
      </header>

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
              <div className="flex gap-2">
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

            {/* Results Table */}
            <div className="overflow-x-auto">
              <table className="w-full" data-testid="results-table">
                <thead>
                  <tr className="bg-slate-900/50">
                    <th className="px-4 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">
                      CAS No.
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">
                      名稱
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">
                      GHS 標示
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">
                      警示語
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">
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
                      }`}
                      data-testid={`result-row-${idx}`}
                    >
                      <td className="px-4 py-4">
                        <span className="font-mono text-amber-400">
                          {result.cas_number}
                        </span>
                      </td>
                      <td className="px-4 py-4">
                        {result.found ? (
                          <div>
                            <div className="text-white font-medium">
                              {result.name_en}
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
                        {result.found && result.ghs_pictograms?.length > 0 ? (
                          <div className="flex gap-1 flex-wrap">
                            {result.ghs_pictograms.map((pic, pIdx) => (
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
                          </div>
                        ) : result.found ? (
                          <span className="text-slate-500">無危害標示</span>
                        ) : (
                          "-"
                        )}
                      </td>
                      <td className="px-4 py-4">
                        {result.found ? (
                          result.signal_word ? (
                            <span
                              className={`px-2 py-1 rounded text-sm font-medium ${
                                result.signal_word === "Danger"
                                  ? "bg-red-500/20 text-red-400"
                                  : "bg-amber-500/20 text-amber-400"
                              }`}
                            >
                              {result.signal_word_zh || result.signal_word}
                            </span>
                          ) : (
                            <span className="text-slate-500">-</span>
                          )
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
              <button
                onClick={() => setSelectedResult(null)}
                className="text-slate-400 hover:text-white text-2xl"
                data-testid="close-modal-btn"
              >
                ✕
              </button>
            </div>

            <div className="p-6 space-y-6">
              {/* Signal Word */}
              {selectedResult.signal_word && (
                <div>
                  <h3 className="text-sm font-medium text-slate-400 mb-2">
                    警示語
                  </h3>
                  <span
                    className={`inline-block px-4 py-2 rounded-lg text-lg font-bold ${
                      selectedResult.signal_word === "Danger"
                        ? "bg-red-500/20 text-red-400 border border-red-500/50"
                        : "bg-amber-500/20 text-amber-400 border border-amber-500/50"
                    }`}
                  >
                    {selectedResult.signal_word_zh || selectedResult.signal_word}
                  </span>
                </div>
              )}

              {/* GHS Pictograms */}
              {selectedResult.ghs_pictograms?.length > 0 && (
                <div>
                  <h3 className="text-sm font-medium text-slate-400 mb-3">
                    GHS 危害圖示
                  </h3>
                  <div className="grid grid-cols-3 sm:grid-cols-4 gap-4">
                    {selectedResult.ghs_pictograms.map((pic, idx) => (
                      <div
                        key={idx}
                        className="bg-slate-900 rounded-xl p-4 text-center"
                      >
                        <img
                          src={GHS_IMAGES[pic.code]}
                          alt={pic.name_zh}
                          className="w-16 h-16 mx-auto bg-white rounded-lg"
                        />
                        <p className="text-white text-sm font-medium mt-2">
                          {pic.code}
                        </p>
                        <p className="text-slate-400 text-xs">{pic.name_zh}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Hazard Statements */}
              {selectedResult.hazard_statements?.length > 0 && (
                <div>
                  <h3 className="text-sm font-medium text-slate-400 mb-3">
                    危害說明
                  </h3>
                  <div className="space-y-2">
                    {selectedResult.hazard_statements.map((stmt, idx) => (
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
              )}

              {/* PubChem Link */}
              {selectedResult.cid && (
                <div className="pt-4 border-t border-slate-700">
                  <a
                    href={`https://pubchem.ncbi.nlm.nih.gov/compound/${selectedResult.cid}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 text-blue-400 hover:text-blue-300 transition-colors"
                  >
                    <span>🔗</span> 在 PubChem 查看完整資訊
                  </a>
                </div>
              )}
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
