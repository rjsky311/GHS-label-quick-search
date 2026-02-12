import { useState, useRef, useEffect, useCallback, useMemo } from "react";
import "@/App.css";
import axios from "axios";
import { Toaster } from "sonner";
import { useTranslation } from "react-i18next";

// Hooks
import useSearchHistory from "@/hooks/useSearchHistory";
import useFavorites from "@/hooks/useFavorites";
import useCustomGHS from "@/hooks/useCustomGHS";
import useLabelSelection from "@/hooks/useLabelSelection";
import useResultSort from "@/hooks/useResultSort";
import usePrintTemplates from "@/hooks/usePrintTemplates";

// Constants & Utils
import { API } from "@/constants/ghs";
import { exportToExcel, exportToCSV } from "@/utils/exportData";
import { printLabels } from "@/utils/printLabels";

// Components
import Header from "@/components/Header";
import FavoritesSidebar from "@/components/FavoritesSidebar";
import HistorySidebar from "@/components/HistorySidebar";
import SearchSection from "@/components/SearchSection";
import ResultsTable from "@/components/ResultsTable";
import EmptyState from "@/components/EmptyState";
import DetailModal from "@/components/DetailModal";
import LabelPrintModal from "@/components/LabelPrintModal";
import Footer from "@/components/Footer";
import SkeletonTable from "@/components/SkeletonTable";

function App() {
  const { t } = useTranslation();

  // ── State ──
  const [singleCas, setSingleCas] = useState("");
  const [batchCas, setBatchCas] = useState("");
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState("single");
  const [showHistory, setShowHistory] = useState(false);
  const [error, setError] = useState("");
  const [selectedResult, setSelectedResult] = useState(null);
  const [showFavorites, setShowFavorites] = useState(false);
  const [showLabelModal, setShowLabelModal] = useState(false);
  const [labelConfig, setLabelConfig] = useState({
    size: "medium",
    template: "standard",
    orientation: "portrait",
    nameDisplay: "both",
  });
  // Custom label fields — persisted to localStorage
  const [customLabelFields, setCustomLabelFields] = useState(() => {
    try {
      const saved = localStorage.getItem("ghs_custom_label_fields");
      return saved ? JSON.parse(saved) : { labName: "", date: "", batchNumber: "" };
    } catch { return { labName: "", date: "", batchNumber: "" }; }
  });
  // Label print quantities — CAS → count (default 1, not persisted)
  const [labelQuantities, setLabelQuantities] = useState({});
  const [expandedOtherClassifications, setExpandedOtherClassifications] = useState({});
  const [batchProgress, setBatchProgress] = useState(null);
  const [resultFilter, setResultFilter] = useState("all");
  const [advancedFilter, setAdvancedFilter] = useState({ minPictograms: 0, hCodeSearch: "" });

  // ── Refs ──
  const searchInputRef = useRef(null);

  // ── Custom Hooks ──
  const { history, saveToHistory, clearHistory } = useSearchHistory();
  const { favorites, toggleFavorite, isFavorited, clearFavorites } = useFavorites();
  const {
    customGHSSettings,
    getEffectiveClassification,
    setCustomClassification,
    clearCustomClassification,
    hasCustomClassification,
  } = useCustomGHS();
  const {
    selectedForLabel,
    setSelectedForLabel,
    toggleSelectForLabel,
    isSelectedForLabel,
    selectAllForLabel,
    clearLabelSelection,
  } = useLabelSelection();
  const { templates: printTemplates, saveTemplate, deleteTemplate } = usePrintTemplates();

  const handleLoadTemplate = useCallback((template) => {
    setLabelConfig(template.labelConfig);
    setCustomLabelFields(template.customLabelFields);
  }, []);

  // Persist custom label fields to localStorage
  useEffect(() => {
    localStorage.setItem("ghs_custom_label_fields", JSON.stringify(customLabelFields));
  }, [customLabelFields]);

  // ── Keyboard Shortcut: "/" or Ctrl+K to focus search ──
  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "k") {
        e.preventDefault();
        searchInputRef.current?.focus();
      }
      if (
        e.key === "/" &&
        !e.ctrlKey &&
        !e.metaKey &&
        !e.altKey &&
        !["INPUT", "TEXTAREA", "SELECT"].includes(
          document.activeElement?.tagName
        ) &&
        !document.activeElement?.isContentEditable
      ) {
        e.preventDefault();
        searchInputRef.current?.focus();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  // ── Computed ──
  const batchCount = batchCas
    .split(/[,\n\t;]+/)
    .map((s) => s.trim())
    .filter((s) => s.length > 0).length;

  const filteredResults = useMemo(() => {
    let filtered = results;

    // Signal word filter
    if (resultFilter !== "all") {
      filtered = filtered.filter((r) => {
        if (!r.found) return false;
        const effective = getEffectiveClassification(r);
        const sw = effective?.signal_word;
        if (resultFilter === "danger") return sw === "Danger";
        if (resultFilter === "warning") return sw === "Warning";
        if (resultFilter === "none") return !sw;
        return true;
      });
    }

    // Advanced: min pictograms
    if (advancedFilter.minPictograms > 0) {
      filtered = filtered.filter((r) => {
        if (!r.found) return false;
        const effective = getEffectiveClassification(r);
        return (effective?.pictograms?.length || 0) >= advancedFilter.minPictograms;
      });
    }

    // Advanced: H-code search
    if (advancedFilter.hCodeSearch.trim()) {
      const hQuery = advancedFilter.hCodeSearch.trim().toUpperCase();
      filtered = filtered.filter((r) => {
        if (!r.found) return false;
        const effective = getEffectiveClassification(r);
        return effective?.hazard_statements?.some((s) =>
          s.code?.toUpperCase().includes(hQuery)
        );
      });
    }

    return filtered;
  }, [results, resultFilter, advancedFilter, getEffectiveClassification]);

  // Sort hook — applied after filtering
  const { sortedResults, sortConfig, requestSort } = useResultSort(filteredResults, getEffectiveClassification);

  // ── Handlers ──
  const toggleOtherClassifications = (casNumber) => {
    setExpandedOtherClassifications((prev) => ({
      ...prev,
      [casNumber]: !prev[casNumber],
    }));
  };

  const searchSingle = async (directCas) => {
    const query = (directCas || singleCas).trim();
    if (!query) {
      setError(t("search.errorEmpty"));
      return;
    }
    setError("");
    setLoading(true);
    try {
      const response = await axios.get(
        `${API}/search/${encodeURIComponent(query)}`
      );
      setResults([response.data]);
      saveToHistory([response.data]);
    } catch (e) {
      console.error(e);
      setError(t("search.errorSingle"));
    } finally {
      setLoading(false);
    }
  };

  const searchBatch = async () => {
    if (!batchCas.trim()) {
      setError(t("search.errorEmpty"));
      return;
    }
    setError("");
    setLoading(true);

    const casNumbers = batchCas
      .split(/[,\n\t;]+/)
      .map((s) => s.trim())
      .filter((s) => s.length > 0);

    if (casNumbers.length === 0) {
      setError(t("search.errorNoValid"));
      setLoading(false);
      return;
    }

    setBatchProgress({ current: 0, total: casNumbers.length });
    try {
      const response = await axios.post(`${API}/search`, {
        cas_numbers: casNumbers,
      });
      setBatchProgress({ current: casNumbers.length, total: casNumbers.length });
      setResults(response.data);
      saveToHistory(response.data);
    } catch (e) {
      console.error(e);
      setError(t("search.errorBatch"));
    } finally {
      setLoading(false);
      setTimeout(() => setBatchProgress(null), 800);
    }
  };

  const handleQuickSearch = useCallback((cas) => {
    setSingleCas(cas);
    setActiveTab("single");
  }, []);

  const handleSelectHistoryItem = useCallback((cas) => {
    setSingleCas(cas);
    setActiveTab("single");
    setShowHistory(false);
  }, []);

  const handleViewDetailFromFavorites = useCallback((item) => {
    setSelectedResult(item);
    setShowFavorites(false);
  }, []);

  const handlePrintLabelFromFavorites = useCallback((item) => {
    setSelectedForLabel([item]);
    setShowLabelModal(true);
    setShowFavorites(false);
  }, [setSelectedForLabel]);

  const handlePrintLabelFromDetail = useCallback((item) => {
    setSelectedForLabel([item]);
    setShowLabelModal(true);
  }, [setSelectedForLabel]);

  const handleOpenLabelModal = useCallback(() => {
    if (selectedForLabel.length === 0) {
      selectAllForLabel(results);
    }
    setShowLabelModal(true);
  }, [selectedForLabel.length, selectAllForLabel, results]);

  const handlePrintLabels = useCallback(() => {
    printLabels(selectedForLabel, labelConfig, customGHSSettings, customLabelFields, labelQuantities);
  }, [selectedForLabel, labelConfig, customGHSSettings, customLabelFields, labelQuantities]);

  // ── Render ──
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      <a href="#main-content" className="sr-only focus:not-sr-only focus:absolute focus:z-[100] focus:top-2 focus:left-2 focus:px-4 focus:py-2 focus:bg-amber-500 focus:text-white focus:rounded-lg">
        {t("a11y.skipToContent")}
      </a>
      <Toaster position="top-right" theme="dark" richColors />

      <Header
        favorites={favorites}
        history={history}
        showFavorites={showFavorites}
        showHistory={showHistory}
        onToggleFavorites={() => setShowFavorites(!showFavorites)}
        onToggleHistory={() => setShowHistory(!showHistory)}
      />

      {showFavorites && (
        <FavoritesSidebar
          favorites={favorites}
          onClose={() => setShowFavorites(false)}
          onClearFavorites={clearFavorites}
          onToggleFavorite={toggleFavorite}
          onViewDetail={handleViewDetailFromFavorites}
          onPrintLabel={handlePrintLabelFromFavorites}
        />
      )}

      {showHistory && (
        <HistorySidebar
          history={history}
          onClose={() => setShowHistory(false)}
          onClearHistory={clearHistory}
          onSelectHistoryItem={handleSelectHistoryItem}
        />
      )}

      <main id="main-content" className="max-w-7xl mx-auto px-4 py-6">
        <SearchSection
          activeTab={activeTab}
          singleCas={singleCas}
          batchCas={batchCas}
          loading={loading}
          error={error}
          batchCount={batchCount}
          searchInputRef={searchInputRef}
          onSetActiveTab={setActiveTab}
          onSetSingleCas={setSingleCas}
          onSetBatchCas={setBatchCas}
          onSearchSingle={searchSingle}
          onSearchBatch={searchBatch}
          history={history}
          favorites={favorites}
          batchProgress={batchProgress}
        />

        {loading && <SkeletonTable />}

        {results.length > 0 && !loading && (
          <ResultsTable
            results={sortedResults}
            totalCount={results.length}
            resultFilter={resultFilter}
            onSetResultFilter={setResultFilter}
            advancedFilter={advancedFilter}
            onSetAdvancedFilter={setAdvancedFilter}
            sortConfig={sortConfig}
            onRequestSort={requestSort}
            selectedForLabel={selectedForLabel}
            expandedOtherClassifications={expandedOtherClassifications}
            onOpenLabelModal={handleOpenLabelModal}
            onExportToExcel={() => exportToExcel(results)}
            onExportToCSV={() => exportToCSV(results)}
            onSelectAllForLabel={() => selectAllForLabel(results)}
            onClearLabelSelection={clearLabelSelection}
            onToggleSelectForLabel={toggleSelectForLabel}
            isSelectedForLabel={isSelectedForLabel}
            onToggleFavorite={toggleFavorite}
            isFavorited={isFavorited}
            getEffectiveClassification={getEffectiveClassification}
            onToggleOtherClassifications={toggleOtherClassifications}
            onSetCustomClassification={setCustomClassification}
            onClearCustomClassification={clearCustomClassification}
            onViewDetail={setSelectedResult}
          />
        )}

        {results.length === 0 && !loading && (
          <EmptyState onQuickSearch={handleQuickSearch} />
        )}
      </main>

      {selectedResult && (
        <DetailModal
          result={selectedResult}
          onClose={() => setSelectedResult(null)}
          onToggleFavorite={toggleFavorite}
          isFavorited={isFavorited}
          getEffectiveClassification={getEffectiveClassification}
          customGHSSettings={customGHSSettings}
          onSetCustomClassification={setCustomClassification}
          hasCustomClassification={hasCustomClassification}
          onClearCustomClassification={clearCustomClassification}
          onPrintLabel={handlePrintLabelFromDetail}
        />
      )}

      {showLabelModal && (
        <LabelPrintModal
          selectedForLabel={selectedForLabel}
          labelConfig={labelConfig}
          onLabelConfigChange={setLabelConfig}
          customLabelFields={customLabelFields}
          onCustomLabelFieldsChange={setCustomLabelFields}
          labelQuantities={labelQuantities}
          onLabelQuantitiesChange={setLabelQuantities}
          onPrintLabels={handlePrintLabels}
          onToggleSelectForLabel={toggleSelectForLabel}
          printTemplates={printTemplates}
          onSaveTemplate={(name) => saveTemplate(name, labelConfig, customLabelFields)}
          onLoadTemplate={handleLoadTemplate}
          onDeleteTemplate={deleteTemplate}
          onClose={() => setShowLabelModal(false)}
        />
      )}

      <Footer />
    </div>
  );
}

export default App;
