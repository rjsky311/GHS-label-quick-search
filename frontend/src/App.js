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
import { API, BATCH_SEARCH_LIMIT } from "@/constants/ghs";
import { exportToExcel, exportToCSV } from "@/utils/exportData";
import { printLabels } from "@/utils/printLabels";
import { hasGhsData } from "@/utils/ghsAvailability";
import { buildPreparedSolutionItem } from "@/utils/preparedSolution";

// Components
import Header from "@/components/Header";
import FavoritesSidebar from "@/components/FavoritesSidebar";
import HistorySidebar from "@/components/HistorySidebar";
import SearchSection from "@/components/SearchSection";
import ResultsTable from "@/components/ResultsTable";
import EmptyState from "@/components/EmptyState";
import UpstreamErrorBanner from "@/components/UpstreamErrorBanner";
import AuthoritativeSourceNote from "@/components/AuthoritativeSourceNote";
import DetailModal from "@/components/DetailModal";
import ComparisonModal from "@/components/ComparisonModal";
import LabelPrintModal from "@/components/LabelPrintModal";
import PrepareSolutionModal from "@/components/PrepareSolutionModal";
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
  // v1.9 M3 Tier 1: parent chemical of the current prepare-solution flow.
  // Non-null ⇒ PrepareSolutionModal is visible. Separate from
  // selectedResult so closing DetailModal doesn't tear down the prepare
  // flow, and vice versa.
  const [prepareSolutionParent, setPrepareSolutionParent] = useState(null);
  // v1.9 M3 Tier 1: session flag for the prepared-solution print flow.
  // Flipped on at submit (we're entering LabelPrintModal with a prepared
  // item), flipped off when LabelPrintModal closes along with cleanup.
  // Using a session flag instead of inspecting `selectedForLabel` at
  // close time so we still clean up even if the user manually removed
  // the prepared item inside LabelPrintModal — without this, its
  // labelQuantities[parentCas] entry would leak into a later normal
  // print flow for the same parent chemical.
  const [preparedFlowActive, setPreparedFlowActive] = useState(false);
  const [labelConfig, setLabelConfig] = useState({
    size: "medium",
    template: "standard",
    orientation: "portrait",
    nameDisplay: "both",
    colorMode: "color",
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
  const [showComparisonModal, setShowComparisonModal] = useState(false);
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

    // Defence-in-depth: the UI already disables the submit button when
    // batchCount > limit, but refuse here too so a stray programmatic
    // call or rapid click cannot bypass the guard and hit the backend
    // (which would 422 on the same check).
    if (casNumbers.length > BATCH_SEARCH_LIMIT) {
      setError(
        t("search.batchOverLimitDetail", {
          count: casNumbers.length,
          limit: BATCH_SEARCH_LIMIT,
          excess: casNumbers.length - BATCH_SEARCH_LIMIT,
        })
      );
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

  // v1.8 M2 PR-B: "Print all with GHS data" shortcut.
  //
  // Deliberately bypasses handleOpenLabelModal. That handler contains
  // a legacy fallback — "if selectedForLabel.length === 0, select all
  // found rows" — designed for the purple Print-label button's
  // implicit auto-select behaviour. React state updates are batched,
  // so inside a single event tick handleOpenLabelModal would still
  // see the pre-set `selectedForLabel` length (stale closure) and
  // overwrite the printable subset we just computed.
  //
  // The fix is not to delegate. Set both pieces of state here in the
  // same tick, on our own terms. The existing purple button's path is
  // unchanged — it still auto-selects all found rows when invoked
  // with an empty selection, which is its documented behaviour.
  const handlePrintAllWithGhs = useCallback(() => {
    const printable = results.filter(
      (r) => r.found && hasGhsData(getEffectiveClassification(r))
    );
    setSelectedForLabel(printable);
    setShowLabelModal(true);
  }, [results, getEffectiveClassification, setSelectedForLabel]);

  // v1.8 M2 PR-B post-review fix: the shortcut must reflect the FULL
  // search result set, not whatever filter/sort is currently applied.
  // Compute the count here — where `results` is the raw search array
  // — and pass it down. Previously ResultsTable computed this from
  // its `results` prop, which is `sortedResults` (post-filter), so a
  // filter that hid all GHS-bearing rows would have made the button
  // disappear or mis-count.
  const printableWithGhsCount = useMemo(
    () =>
      results.filter(
        (r) => r.found && hasGhsData(getEffectiveClassification(r))
      ).length,
    [results, getEffectiveClassification]
  );

  const handlePrintLabels = useCallback(() => {
    printLabels(selectedForLabel, labelConfig, customGHSSettings, customLabelFields, labelQuantities);
  }, [selectedForLabel, labelConfig, customGHSSettings, customLabelFields, labelQuantities]);

  // ── v1.9 M3 Tier 1: prepare-solution flow ───────────────
  //
  // Three entry / exit points, all wired directly — no delegation
  // through handleOpenLabelModal (which contains the auto-select-
  // all-found fallback that would clobber our single prepared item).

  // Entry: from DetailModal's "Prepare solution" button.
  const handleOpenPrepareSolution = useCallback((chem) => {
    setPrepareSolutionParent(chem);
  }, []);

  // Cancel / close the PrepareSolutionModal without submitting.
  // Must not touch any selection state: user intent was "never mind".
  const handleClosePrepareSolution = useCallback(() => {
    setPrepareSolutionParent(null);
  }, []);

  // Submit: build the derived item, hard-replace selection + quantities,
  // close BOTH the prepare-solution modal and the underlying DetailModal,
  // then open LabelPrintModal. All state mutations happen in the same
  // tick so React batches them — no delegation to legacy handlers.
  const handleSubmitPrepareSolution = useCallback(
    (formValues) => {
      if (!prepareSolutionParent) return;
      const preparedItem = buildPreparedSolutionItem(
        prepareSolutionParent,
        formValues
      );
      if (!preparedItem) return; // validation already blocked this in the modal, but guard anyway

      // Replace selection with exactly this one prepared item.
      setSelectedForLabel([preparedItem]);
      // Reset quantities so the prepared item starts at 1, not inheriting
      // any stale count from a parent chemical that happens to share its CAS.
      setLabelQuantities({});
      // Mark the prepared-solution print session as active. This signal
      // is what `handleCloseLabelModal` uses to wipe selection + quantities
      // on close — independent of whether the user has manually removed
      // the prepared item from the selected list inside LabelPrintModal.
      setPreparedFlowActive(true);
      // Close both modals of the prepare-solution flow.
      setPrepareSolutionParent(null);
      setSelectedResult(null);
      // Hand off to the existing print modal.
      setShowLabelModal(true);
    },
    [
      prepareSolutionParent,
      setSelectedForLabel,
      setLabelQuantities,
      setShowLabelModal,
    ]
  );

  // LabelPrintModal close: if this close is ending a prepared-solution
  // print session, wipe selection + quantities so the prepared flow
  // doesn't leave a ghost CAS-match selected state back in ResultsTable
  // and — critically — doesn't leak `labelQuantities[parentCas]` into
  // a subsequent normal print flow for the same parent chemical.
  //
  // We gate on the session flag, NOT on "is there still a prepared item
  // in `selectedForLabel`?" — a user who removes the prepared item
  // inside LabelPrintModal and THEN closes would otherwise bypass
  // cleanup and leak a stale quantity.
  //
  // Decision locked in plan v2: "prepared flow is one-shot ephemeral".
  // We do NOT attempt to restore a previous selection snapshot.
  const handleCloseLabelModal = useCallback(() => {
    setShowLabelModal(false);
    if (preparedFlowActive) {
      setSelectedForLabel([]);
      setLabelQuantities({});
      setPreparedFlowActive(false);
    }
  }, [preparedFlowActive, setSelectedForLabel, setLabelQuantities]);

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
          <>
            {/* v1.8 M1: warn when any row had a transient PubChem failure */}
            <UpstreamErrorBanner
              count={results.filter((r) => r.upstream_error).length}
            />
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
              onPrintAllWithGhs={handlePrintAllWithGhs}
              printAllWithGhsCount={printableWithGhsCount}
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
              onOpenComparison={() => setShowComparisonModal(true)}
            />
            {/* v1.8 M1: trust-boundary disclaimer */}
            <AuthoritativeSourceNote variant="results" />
          </>
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
          onPrepareSolution={handleOpenPrepareSolution}
        />
      )}

      {prepareSolutionParent && (
        <PrepareSolutionModal
          parent={prepareSolutionParent}
          onSubmit={handleSubmitPrepareSolution}
          onClose={handleClosePrepareSolution}
        />
      )}

      {showComparisonModal && (
        <ComparisonModal
          chemicals={selectedForLabel.filter((r) => r.found && r.ghs_pictograms?.length > 0).slice(0, 5)}
          getEffectiveClassification={getEffectiveClassification}
          onClose={() => setShowComparisonModal(false)}
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
          onClose={handleCloseLabelModal}
        />
      )}

      <Footer />
    </div>
  );
}

export default App;
