import { useState, useRef, useEffect, useCallback, useMemo } from "react";
import "@/App.css";
import axios from "axios";
import { Toaster, toast } from "sonner";
import { useTranslation } from "react-i18next";

// Hooks
import useSearchHistory from "@/hooks/useSearchHistory";
import useFavorites from "@/hooks/useFavorites";
import useCustomGHS from "@/hooks/useCustomGHS";
import useLabelSelection from "@/hooks/useLabelSelection";
import useResultSort from "@/hooks/useResultSort";
import usePreparedRecents from "@/hooks/usePreparedRecents";
import usePreparedPresets from "@/hooks/usePreparedPresets";
import useObservability from "@/hooks/useObservability";
import usePilotDashboard from "@/hooks/usePilotDashboard";
import usePrintWorkspace from "@/hooks/usePrintWorkspace";

// Constants & Utils
import { API, BATCH_SEARCH_LIMIT } from "@/constants/ghs";
import { exportToExcel, exportToCSV } from "@/utils/exportData";
import {
  printLabels,
  resolveEffectiveChemicalForPrint,
} from "@/utils/printLabels";
import { hasGhsData } from "@/utils/ghsAvailability";
import {
  buildPreparedSolutionItem,
  buildPresetRecord,
  buildRecentRecord,
} from "@/utils/preparedSolution";
import {
  clearPilotAdminKey,
  loadPilotAdminKey,
  persistPilotAdminKey,
  PILOT_ADMIN_ENABLED,
} from "@/constants/admin";

// Components
import AdminAccessDialog from "@/components/AdminAccessDialog";
import Header from "@/components/Header";
import FavoritesSidebar from "@/components/FavoritesSidebar";
import HistorySidebar from "@/components/HistorySidebar";
import PilotDashboardSidebar from "@/components/PilotDashboardSidebar";
import PreparedSidebar from "@/components/PreparedSidebar";
import SearchSection from "@/components/SearchSection";
import ResultsTable from "@/components/ResultsTable";
import EmptyState from "@/components/EmptyState";
import ProductTrustPanel from "@/components/ProductTrustPanel";
import UpstreamErrorBanner from "@/components/UpstreamErrorBanner";
import AuthoritativeSourceNote from "@/components/AuthoritativeSourceNote";
import DetailModal from "@/components/DetailModal";
import ComparisonModal from "@/components/ComparisonModal";
import LabelPrintModal from "@/components/LabelPrintModal";
import PrepareSolutionModal from "@/components/PrepareSolutionModal";
import ExportPreviewModal from "@/components/ExportPreviewModal";
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
  const [showPilotDashboard, setShowPilotDashboard] = useState(false);
  const [showPilotAdminDialog, setShowPilotAdminDialog] = useState(false);
  const [showPrepared, setShowPrepared] = useState(false);
  const [error, setError] = useState("");
  const [pilotAdminError, setPilotAdminError] = useState("");
  const [pilotAdminKey, setPilotAdminKey] = useState(() => loadPilotAdminKey());
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
  const [preparedPresetNameDraft, setPreparedPresetNameDraft] = useState("");
  const [showComparisonModal, setShowComparisonModal] = useState(false);
  const [showExportPreview, setShowExportPreview] = useState(false);
  const [exportPreviewFormat, setExportPreviewFormat] = useState("xlsx");
  const [expandedOtherClassifications, setExpandedOtherClassifications] = useState({});
  const [batchProgress, setBatchProgress] = useState(null);
  const [resultFilter, setResultFilter] = useState("all");
  const [advancedFilter, setAdvancedFilter] = useState({ minPictograms: 0, hCodeSearch: "" });
  const [preparedReprintingId, setPreparedReprintingId] = useState(null);

  // ── Refs ──
  const searchInputRef = useRef(null);

  // ── Custom Hooks ──
  const { history, saveToHistory, clearHistory } = useSearchHistory();
  const { favorites, toggleFavorite, isFavorited, clearFavorites } = useFavorites();
  const {
    eventCount: observabilityEventCount,
    logEvent: logObservabilityEvent,
    exportReport: exportObservabilityReport,
  } = useObservability();
  const {
    report: pilotReport,
    aliases: pilotAliases,
    manualEntries: pilotManualEntries,
    referenceLinks: pilotReferenceLinks,
    loading: pilotLoading,
    saving: pilotSaving,
    error: pilotError,
    authError: pilotAuthError,
    refresh: refreshPilotDashboard,
    saveManualEntry: savePilotManualEntry,
    saveAlias: savePilotAlias,
    saveReferenceLink: savePilotReferenceLink,
  } = usePilotDashboard({
    enabled: showPilotDashboard && PILOT_ADMIN_ENABLED && Boolean(pilotAdminKey),
    adminKey: pilotAdminKey,
  });
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
  const {
    labelConfig,
    setLabelConfig,
    customLabelFields,
    setCustomLabelFields,
    labelQuantities,
    setLabelQuantities,
    templates: printTemplates,
    saveTemplate,
    deleteTemplate,
    loadTemplate,
    labProfile,
    setLabProfile,
    clearLabProfile,
    recentPrints,
    addRecentPrint,
    clearRecentPrints,
    loadRecentPrint,
  } = usePrintWorkspace();
  // Tier 2 PR-2A: recent prepared-solution workflow inputs. localStorage-
  // only, parent-scoped on read inside PrepareSolutionModal. Carries
  // NO GHS data — hazards still come from the current parent result
  // at reuse time.
  const {
    recents: preparedRecents,
    addRecent: addPreparedRecent,
    clearRecents: clearPreparedRecents,
  } =
    usePreparedRecents();
  // Tier 2 PR-2B: saved prepared-solution presets. Like recents, but
  // more restrictive: only parent identity + concentration + solvent.
  // Operational fields (preparedBy / preparedDate / expiryDate) are
  // intentionally not stored — see buildPresetRecord for the reason.
  const { presets: preparedPresets, addPreset: addPreparedPreset } =
    usePreparedPresets();

  // Tier 2 PR-2B: "Save as preset" handler. Accepts a formValues
  // payload (same shape PrepareSolutionModal already hands to onSubmit)
  // and a parent chemical, builds a recipe-only preset record, and
  // writes it into the preset store. Does NOT open the label modal,
  // does NOT touch selection, does NOT reset quantities — saving a
  // preset is a non-submit action.
  const handleSavePreparedPreset = useCallback(
    (formValues) => {
      if (!prepareSolutionParent) return;
      const record = buildPresetRecord(prepareSolutionParent, formValues);
      if (!record) return;
      const explicitPresetName =
        typeof formValues?.presetName === "string"
          ? formValues.presetName.trim()
          : "";
      const normalizedRecord =
        explicitPresetName && record.name !== explicitPresetName
          ? { ...record, name: explicitPresetName }
          : record;
      const outcome = addPreparedPreset(normalizedRecord);
      if (!outcome?.saved) return;

      toast.success(
        outcome.deduped
          ? t("prepared.savePresetUpdatedNamed", {
              name: normalizedRecord.name || "",
            })
          : t("prepared.savePresetSuccessNamed", {
              name: normalizedRecord.name || "",
            })
      );
    },
    [prepareSolutionParent, addPreparedPreset, t]
  );

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

  const replaceResultsView = useCallback(
    (nextResults) => {
      clearLabelSelection();
      setExpandedOtherClassifications({});
      setResults(Array.isArray(nextResults) ? nextResults : []);
    },
    [clearLabelSelection]
  );

  const logUnresolvedSearch = useCallback(
    (query, queryType, result, meta = {}) => {
      if (!result || result.found) return;

      logObservabilityEvent("search_unresolved", {
        query,
        queryType,
        cas: result.cas_number || query,
        status: result.upstream_error ? "upstream_error" : "not_found",
        meta,
      });
    },
    [logObservabilityEvent]
  );

  const searchSingle = async (directCas) => {
    const query =
      typeof directCas === "string" ? directCas.trim() : singleCas.trim();
    if (!query) {
      setError(t("search.errorEmpty"));
      return;
    }
    setError("");
    setLoading(true);
    try {
      const response = await axios.get(`${API}/search-single`, {
        params: { q: query },
      });
      const result = response.data;
      replaceResultsView([result]);
      saveToHistory([result]);
      logUnresolvedSearch(query, "single", result, { activeTab: "single" });
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
      const batchResults = Array.isArray(response.data) ? response.data : [];
      setBatchProgress({ current: casNumbers.length, total: casNumbers.length });
      replaceResultsView(batchResults);
      saveToHistory(batchResults);
      batchResults.forEach((result, index) => {
        logUnresolvedSearch(casNumbers[index] || result?.cas_number || "", "batch", result, {
          activeTab: "batch",
          batchSize: casNumbers.length,
          batchIndex: index,
        });
      });
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

  useEffect(() => {
    if (!pilotAuthError) return;

    clearPilotAdminKey();
    setPilotAdminKey("");
    setShowPilotDashboard(false);
    setPilotAdminError(pilotAuthError);
    setShowPilotAdminDialog(true);
  }, [pilotAuthError]);

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
    setSelectedResult(null);
    setShowLabelModal(true);
  }, [setSelectedForLabel]);

  const handleTogglePilotDashboard = useCallback(() => {
    if (!PILOT_ADMIN_ENABLED) return;
    if (showPilotDashboard) {
      setShowPilotDashboard(false);
      return;
    }
    if (!pilotAdminKey) {
      setPilotAdminError("");
      setShowPilotAdminDialog(true);
      return;
    }
    setShowPilotDashboard(true);
  }, [pilotAdminKey, showPilotDashboard]);

  const handleSubmitPilotAdminKey = useCallback(
    (value) => {
      const normalized = typeof value === "string" ? value.trim() : "";
      if (!normalized) {
        setPilotAdminError(
          t("pilot.adminKeyRequired", {
            defaultValue: "Enter an admin key to unlock admin tools.",
          })
        );
        return;
      }

      persistPilotAdminKey(normalized);
      setPilotAdminKey(normalized);
      setPilotAdminError("");
      setShowPilotAdminDialog(false);
      setShowPilotDashboard(true);
    },
    [t]
  );

  const handleOpenLabelModal = useCallback(() => {
    if (selectedForLabel.length === 0) {
      selectAllForLabel(sortedResults);
    }
    setShowLabelModal(true);
  }, [selectedForLabel.length, selectAllForLabel, sortedResults]);

  // Pilot refinement: table-context bulk actions now follow the
  // filtered/sorted view the user is actually looking at, not the raw
  // hidden result set behind it.
  const handlePrintAllWithGhs = useCallback(() => {
    const printable = sortedResults.filter(
      (r) => r.found && hasGhsData(getEffectiveClassification(r))
    );
    setSelectedForLabel(printable);
    setShowLabelModal(true);
  }, [sortedResults, getEffectiveClassification, setSelectedForLabel]);

  // Pilot refinement: count the same visible subset that the shortcut
  // will act on, so the button reflects the current table scope.
  const printableWithGhsCount = useMemo(
    () =>
      sortedResults.filter(
        (r) => r.found && hasGhsData(getEffectiveClassification(r))
      ).length,
    [sortedResults, getEffectiveClassification]
  );

  const handleOpenExportPreview = useCallback((format) => {
    setExportPreviewFormat(format);
    setShowExportPreview(true);
  }, []);

  const handleConfirmExport = useCallback(
    async (format) => {
      if (format === "csv") {
        await exportToCSV(sortedResults);
        return;
      }
      await exportToExcel(sortedResults);
    },
    [sortedResults]
  );

  const pilotAttentionCount = useMemo(() => {
    const dictionary = pilotReport?.dictionary || {};
    return (dictionary.pendingAliasCount || 0) + (dictionary.openMissQueryCount || 0);
  }, [pilotReport]);

  const handlePrintLabels = useCallback(() => {
    const printableSelection = selectedForLabel.map((chemical) =>
      resolveEffectiveChemicalForPrint(chemical, customGHSSettings)
    );

    addRecentPrint({
      items: printableSelection,
      labelConfig,
      customLabelFields,
      labelQuantities,
      labProfile,
    });

    printLabels(
      printableSelection,
      labelConfig,
      {},
      customLabelFields,
      labelQuantities,
      labProfile
    );
  }, [
    selectedForLabel,
    labelConfig,
    customGHSSettings,
    customLabelFields,
    labelQuantities,
    labProfile,
    addRecentPrint,
  ]);

  const handleLoadRecentPrint = useCallback(
    (record) => {
      const items = loadRecentPrint(record);
      if (items.length === 0) return;
      setSelectedForLabel(items);
      setShowLabelModal(true);
    },
    [loadRecentPrint, setSelectedForLabel]
  );

  // ── v1.9 M3 Tier 1: prepare-solution flow ───────────────
  //
  // Three entry / exit points, all wired directly — no delegation
  // through handleOpenLabelModal (which contains the auto-select-
  // all-found fallback that would clobber our single prepared item).

  // Entry: from DetailModal's "Prepare solution" button.
  const handleOpenPrepareSolution = useCallback((chem) => {
    setPreparedPresetNameDraft("");
    setPrepareSolutionParent(chem);
  }, []);

  // Cancel / close the PrepareSolutionModal without submitting.
  // Must not touch any selection state: user intent was "never mind".
  const handleClosePrepareSolution = useCallback(() => {
    setPreparedPresetNameDraft("");
    setPrepareSolutionParent(null);
  }, []);

  const handleReprintPreparedRecent = useCallback(
    async (record, recordId) => {
      if (!record?.parentCas) return;
      const activeId = recordId || record.createdAt || `recent-${record.parentCas}`;
      setPreparedReprintingId(activeId);
      try {
        const response = await axios.get(`${API}/search-single`, {
          params: { q: record.parentCas },
        });
        const parent = response.data;
        if (!parent?.found) {
          toast.error(t("prepared.reprintParentUnavailable"));
          return;
        }
        const preparedItem = buildPreparedSolutionItem(parent, record);
        if (!preparedItem) {
          toast.error(t("prepared.reprintBuildFailed"));
          return;
        }
        setSelectedForLabel([preparedItem]);
        setLabelQuantities({});
        setPreparedFlowActive(true);
        setShowPrepared(false);
        setShowLabelModal(true);
      } catch (e) {
        console.error(e);
        toast.error(t("prepared.reprintFailed"));
      } finally {
        setPreparedReprintingId(null);
      }
    },
    [setSelectedForLabel, setLabelQuantities, t]
  );

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
      // Tier 2 PR-2A: append to recent-prepared localStorage store.
      // Workflow-only — no hazard data flows in here (see
      // buildRecentRecord + usePreparedRecents).
      const recentRecord = buildRecentRecord(preparedItem);
      if (recentRecord) addPreparedRecent(recentRecord);
      // Close both modals of the prepare-solution flow.
      setPreparedPresetNameDraft("");
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
      addPreparedRecent,
      setPreparedPresetNameDraft,
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
    <div className="min-h-screen bg-slate-50 text-slate-950">
      <a href="#main-content" className="sr-only focus:not-sr-only focus:absolute focus:z-[100] focus:top-2 focus:left-2 focus:px-4 focus:py-2 focus:bg-blue-700 focus:text-white focus:rounded-md">
        {t("a11y.skipToContent")}
      </a>
      <Toaster position="top-right" theme="light" richColors />

      <Header
        favorites={favorites}
        history={history}
        preparedCount={preparedRecents.length}
        opsEventCount={observabilityEventCount}
        pilotAttentionCount={pilotAttentionCount}
        showPilotDashboardButton={PILOT_ADMIN_ENABLED}
        pilotAdminUnlocked={Boolean(pilotAdminKey)}
        showFavorites={showFavorites}
        showHistory={showHistory}
        showPilotDashboard={showPilotDashboard}
        onTogglePilotDashboard={handleTogglePilotDashboard}
        onToggleFavorites={() => setShowFavorites(!showFavorites)}
        onToggleHistory={() => setShowHistory(!showHistory)}
        onTogglePrepared={() => setShowPrepared(!showPrepared)}
      />

      {showPilotAdminDialog && (
        <AdminAccessDialog
          error={pilotAdminError}
          initialValue={pilotAdminKey}
          onClose={() => setShowPilotAdminDialog(false)}
          onSubmit={handleSubmitPilotAdminKey}
        />
      )}

      {showPilotDashboard && (
        <PilotDashboardSidebar
          report={pilotReport}
          aliases={pilotAliases}
          manualEntries={pilotManualEntries}
          referenceLinks={pilotReferenceLinks}
          loading={pilotLoading}
          saving={pilotSaving}
          error={pilotError}
          onClose={() => setShowPilotDashboard(false)}
          onRefresh={refreshPilotDashboard}
          onExportObservabilityReport={() => exportObservabilityReport()}
          onSaveManualEntry={savePilotManualEntry}
          onSaveAlias={savePilotAlias}
          onSaveReferenceLink={savePilotReferenceLink}
        />
      )}

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

      {showPrepared && (
        <PreparedSidebar
          recents={preparedRecents}
          onClose={() => setShowPrepared(false)}
          onClearRecents={clearPreparedRecents}
          onReprint={handleReprintPreparedRecent}
          reprintingId={preparedReprintingId}
        />
      )}

      {showExportPreview && (
        <ExportPreviewModal
          results={sortedResults}
          initialFormat={exportPreviewFormat}
          onClose={() => setShowExportPreview(false)}
          onConfirm={handleConfirmExport}
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
              onExportToExcel={() => handleOpenExportPreview("xlsx")}
              onExportToCSV={() => handleOpenExportPreview("csv")}
              onSelectAllForLabel={() => selectAllForLabel(sortedResults)}
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
            <ProductTrustPanel variant="results" />
          </>
        )}

        {results.length === 0 && !loading && (
          <>
            <EmptyState onQuickSearch={handleQuickSearch} />
            <ProductTrustPanel variant="empty" />
          </>
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
          // When PrepareSolutionModal is stacked on top, mark the
          // DetailModal as inert / aria-hidden so screen readers see
          // only one active modal at a time and pointer/keyboard
          // interaction is suppressed on this layer.
          suppressed={Boolean(prepareSolutionParent)}
        />
      )}

      {prepareSolutionParent && (
        <PrepareSolutionModal
          parent={prepareSolutionParent}
          onSubmit={handleSubmitPrepareSolution}
          onClose={handleClosePrepareSolution}
          recents={preparedRecents}
          presets={preparedPresets}
          onSavePreset={handleSavePreparedPreset}
          presetNameValue={preparedPresetNameDraft}
          onPresetNameChange={setPreparedPresetNameDraft}
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
          customGHSSettings={customGHSSettings}
          onLabelConfigChange={setLabelConfig}
          customLabelFields={customLabelFields}
          onCustomLabelFieldsChange={setCustomLabelFields}
          labProfile={labProfile}
          onLabProfileChange={setLabProfile}
          onClearLabProfile={clearLabProfile}
          labelQuantities={labelQuantities}
          onLabelQuantitiesChange={setLabelQuantities}
          onPrintLabels={handlePrintLabels}
          onToggleSelectForLabel={toggleSelectForLabel}
          printTemplates={printTemplates}
          onSaveTemplate={saveTemplate}
          onLoadTemplate={loadTemplate}
          onDeleteTemplate={deleteTemplate}
          recentPrints={recentPrints}
          onLoadRecentPrint={handleLoadRecentPrint}
          onClearRecentPrints={clearRecentPrints}
          onClose={handleCloseLabelModal}
        />
      )}

      <Footer />
    </div>
  );
}

export default App;
