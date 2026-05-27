import { Tag, FileSpreadsheet, FileText, Star, X, PenLine, Filter, ArrowUpDown, ArrowUp, ArrowDown, Search, ShieldCheck, LayoutGrid, Printer, ChevronDown, ChevronRight, ExternalLink, Info } from "lucide-react";
import { useTranslation } from "react-i18next";
import GHSPictogramStrip from "@/components/GHSPictogramStrip";
import { getPubChemSDSUrl } from "@/utils/sdsLinks";
import { hasGhsData } from "@/utils/ghsAvailability";
import { formatRelativeTime } from "@/utils/formatDate";
import {
  DATA_QUALITY_ISSUE_TYPES,
  DATA_QUALITY_REVIEW_ISSUE_ORDER,
  getDataQualityIssueDisplayLabel as getDataQualityIssueLabel,
  getDataQualityIssues,
  sortDataQualityIssuesForReview,
} from "@/utils/dataQuality";
import {
  getLocalizedNames,
  getLocalizedPictogramName,
  getLocalizedSignalWord,
} from "@/utils/ghsText";

const getSourceBadge = (source, t) => {
  const sourceText = typeof source === "string" ? source.trim() : "";
  if (!sourceText) return null;
  const normalized = sourceText.toLowerCase();
  if (normalized.includes("echa")) {
    return {
      key: "echa",
      label: t("results.sourceEcha"),
      className: "border-blue-200 bg-blue-50 text-blue-700",
    };
  }
  if (normalized.includes("pubchem")) {
    return {
      key: "pubchem",
      label: t("results.sourcePubChem"),
      className: "border-emerald-200 bg-emerald-50 text-emerald-700",
    };
  }
  return {
    key: "other",
    label: t("results.sourceOther"),
    className: "border-slate-200 bg-slate-50 text-slate-700",
  };
};

const getDataQualityIssueClassName = (severity) => {
  if (severity === "blocking") {
    return "border-red-200 bg-red-50 text-red-700";
  }
  if (severity === "curation") {
    return "border-amber-200 bg-amber-50 text-amber-700";
  }
  return "border-slate-200 bg-slate-50 text-slate-700";
};

const asCount = (value, fallback = 0) => {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : fallback;
};

const isUnresolvedSearchResult = (result = {}) =>
  result?.found === false && !result?.upstream_error;

const getPrimaryReviewIssue = (issues = []) =>
  sortDataQualityIssuesForReview(issues)[0] || null;

const getReviewNextActionLabel = (type, t) => {
  const labels = {
    "upstream-error": t("results.reviewActionRetryUpstream"),
    "unresolved-search": t("results.reviewActionReportLookupGap"),
    "no-ghs-data": t("results.reviewActionReportNoGhs"),
    "ghs-text-no-pictograms": t("results.reviewActionReviewPictograms"),
    "source-conflict": t("results.reviewActionReviewSourceConflict"),
    "multiple-classifications": t("results.reviewActionConfirmMultipleGhs"),
    "missing-chinese-name": t("results.reviewActionReportChineseName"),
  };
  return labels[type] || t("results.reviewActionReviewData");
};

const hasMultipleClassifications = (result = {}) =>
  Boolean(result.has_multiple_classifications || result.other_classifications?.length > 0);

const hasManualClassificationSelection = (result = {}, effective = null) =>
  Boolean(
    effective?.isCustom ||
      result.selected_classification_index != null ||
      result.customNote,
  );

export default function ResultsTable({
  results,
  allResults,
  totalCount,
  batchSummary,
  resultFilter,
  onSetResultFilter,
  advancedFilter,
  onSetAdvancedFilter,
  sortConfig,
  onRequestSort,
  selectedForLabel,
  expandedOtherClassifications,
  onOpenLabelModal,
  onPrintAllWithGhs,
  printAllWithGhsCount = 0,
  onExportToExcel,
  onExportToCSV,
  onSelectAllForLabel,
  onClearLabelSelection,
  onToggleSelectForLabel,
  isSelectedForLabel,
  onToggleFavorite,
  isFavorited,
  getEffectiveClassification,
  onToggleOtherClassifications,
  onSetCustomClassification,
  onClearCustomClassification,
  onViewDetail,
  onOpenComparison,
  onOpenDataCorrection,
}) {
  const { t, i18n } = useTranslation();
  const displayLocale = i18n.language;
  const hasFoundResults = results.some((result) => result.found);
  const isPrintableForLabel = (result) =>
    result.found && hasGhsData(getEffectiveClassification(result));
  const hasPrintableLabelResults = results.some(isPrintableForLabel);
  const selectedPrintableCount = selectedForLabel.filter(isPrintableForLabel)
    .length;
  const workflowSummarySource = Array.isArray(allResults) ? allResults : results;
  const workflowSummaryTotal = totalCount || workflowSummarySource.length;
  const workflowSummary = workflowSummarySource.reduce(
    (summary, result) => {
      const effective = result.found ? getEffectiveClassification(result) : null;
      const issues = getDataQualityIssues(result, effective);
      const hasAnyIssue = issues.length > 0;
      const readyOutput = result.found && hasGhsData(effective) && !hasAnyIssue;

      return {
        found: summary.found + (result.found ? 1 : 0),
        unresolved: summary.unresolved + (isUnresolvedSearchResult(result) ? 1 : 0),
        readyOutput: summary.readyOutput + (readyOutput ? 1 : 0),
        needsReview: summary.needsReview + (hasAnyIssue ? 1 : 0),
        exportRows: summary.exportRows + 1,
      };
    },
    {
      found: 0,
      unresolved: 0,
      readyOutput: 0,
      needsReview: 0,
      exportRows: 0,
    },
  );
  const batchInputTotal = asCount(batchSummary?.inputCount, workflowSummaryTotal);
  const batchValidUnique = asCount(batchSummary?.acceptedCount, workflowSummaryTotal);
  const batchDuplicateIgnored = asCount(batchSummary?.duplicateCount);
  const batchInvalidRejected = asCount(batchSummary?.invalidCount);
  const batchRehyphenated = asCount(batchSummary?.rehyphenatedCount);
  const workflowIssueCounts = workflowSummarySource.reduce((counts, result) => {
    const effective = result.found ? getEffectiveClassification(result) : null;
    const issues = getDataQualityIssues(result, effective);
    issues.forEach((issue) => {
      counts[issue.type] = (counts[issue.type] || 0) + 1;
    });
    return counts;
  }, {});
  const workflowIssueSummaries = DATA_QUALITY_REVIEW_ISSUE_ORDER
    .map((type) => ({
      type,
      count: workflowIssueCounts[type] || 0,
      label: getDataQualityIssueLabel(type, t),
      action: getReviewNextActionLabel(type, t),
    }))
    .filter((issue) => issue.count > 0);
  const multipleGhsReviewCount =
    workflowIssueCounts[DATA_QUALITY_ISSUE_TYPES.MULTIPLE_CLASSIFICATIONS] || 0;
  const activeReviewIssueType = advancedFilter.reviewIssueType || "";
  const activeReviewIssueLabel = activeReviewIssueType
    ? getDataQualityIssueLabel(activeReviewIssueType, t)
    : "";
  const setReviewIssueFilter = (type) => {
    if (!onSetAdvancedFilter) return;
    onSetAdvancedFilter({
      ...advancedFilter,
      reviewIssueType: activeReviewIssueType === type ? "" : type,
    });
  };
  const showWorkflowSummary = workflowSummaryTotal > 1;
  const primaryWorkflowIssue = workflowIssueSummaries[0] || null;
  const nextAction = showWorkflowSummary
    ? (() => {
        if (workflowSummary.needsReview > 0 && primaryWorkflowIssue) {
          return {
            tone: "review",
            title: t("results.nextActionReviewTitle", {
              count: workflowSummary.needsReview,
            }),
            body: t("results.nextActionReviewBody", {
              reason: primaryWorkflowIssue.label,
              count: primaryWorkflowIssue.count,
              ready: workflowSummary.readyOutput,
            }),
            cta: t("results.nextActionReviewCta"),
            onClick: () => setReviewIssueFilter(primaryWorkflowIssue.type),
          };
        }
        if (workflowSummary.readyOutput > 0) {
          return {
            tone: "ready",
            title: t("results.nextActionReadyTitle"),
            body: t("results.nextActionReadyBody", {
              count: workflowSummary.readyOutput,
            }),
            cta:
              onPrintAllWithGhs && printAllWithGhsCount > 0
                ? t("results.nextActionPrintCta")
                : "",
            onClick:
              onPrintAllWithGhs && printAllWithGhsCount > 0
                ? onPrintAllWithGhs
                : undefined,
          };
        }
        if (workflowSummary.found > 0) {
          return {
            tone: "review",
            title: t("results.nextActionNoLabelTitle"),
            body: t("results.nextActionNoLabelBody"),
            cta: "",
          };
        }
        return {
          tone: "blocked",
          title: t("results.nextActionNotFoundTitle"),
          body: t("results.nextActionNotFoundBody"),
          cta: "",
        };
      })()
    : null;
  const decisionSteps = [
    {
      key: "identity",
      icon: Search,
      label: t("results.decisionIdentity"),
    },
    {
      key: "verify",
      icon: ShieldCheck,
      label: t("results.decisionVerify"),
    },
    {
      key: "output",
      icon: Printer,
      label: t("results.decisionOutput"),
    },
  ];
  const workflowSummaryCards = [
    {
      key: "input-total",
      value: batchInputTotal,
      label: t("results.workflowInputTotalLabel"),
      body: t("results.workflowInputTotalBody"),
      className: "border-slate-200 bg-slate-50 text-slate-950",
    },
    {
      key: "valid-unique",
      value: batchValidUnique,
      label: t("results.workflowValidUniqueLabel"),
      body: t("results.workflowValidUniqueBody"),
      className: "border-blue-100 bg-blue-50 text-blue-950",
    },
    ...(batchRehyphenated > 0
      ? [
          {
            key: "rehyphenated",
            value: batchRehyphenated,
            label: t("results.workflowRehyphenatedLabel"),
            body: t("results.workflowRehyphenatedBody"),
            className: "border-blue-100 bg-white text-blue-950",
          },
        ]
      : []),
    {
      key: "duplicate-ignored",
      value: batchDuplicateIgnored,
      label: t("results.workflowDuplicateIgnoredLabel"),
      body: t("results.workflowDuplicateIgnoredBody"),
      className: "border-slate-200 bg-white text-slate-950",
    },
    {
      key: "invalid-rejected",
      value: batchInvalidRejected,
      label: t("results.workflowInvalidRejectedLabel"),
      body: t("results.workflowInvalidRejectedBody"),
      className:
        batchInvalidRejected > 0
          ? "border-red-100 bg-red-50 text-red-950"
          : "border-slate-200 bg-white text-slate-950",
    },
    {
      key: "found",
      value: `${workflowSummary.found}/${workflowSummaryTotal}`,
      label: t("results.workflowFoundLabel"),
      body: t("results.workflowFoundBody"),
      className: "border-blue-100 bg-blue-50 text-blue-950",
    },
    {
      key: "unresolved",
      value: workflowSummary.unresolved,
      label: t("results.workflowUnresolvedLabel"),
      body: t("results.workflowUnresolvedBody"),
      className:
        workflowSummary.unresolved > 0
          ? "border-amber-100 bg-amber-50 text-amber-950"
          : "border-slate-200 bg-white text-slate-950",
    },
    {
      key: "label-ready",
      value: workflowSummary.readyOutput,
      label: t("results.workflowLabelReadyLabel"),
      body: t("results.workflowLabelReadyBody"),
      className: "border-emerald-100 bg-emerald-50 text-emerald-950",
    },
    {
      key: "needs-review",
      value: workflowSummary.needsReview,
      label: t("results.workflowReviewLabel"),
      body: t("results.workflowReviewBody"),
      className: "border-amber-100 bg-amber-50 text-amber-950",
    },
    {
      key: "export",
      value: workflowSummary.exportRows,
      label: t("results.workflowExportLabel"),
      body: t("results.workflowExportBody"),
      className: "border-slate-200 bg-slate-50 text-slate-950",
    },
  ];

  // `printAllWithGhsCount` is computed in App.js from the same filtered
  // and sorted subset the table is currently rendering. Don't recompute
  // here — the parent owns the action scope and count together.

  const renderDataQualityIssues = (issues, testIdKey, result) => {
    if (!issues.length) return null;

    return (
      <div
        className="mt-2 flex flex-wrap items-center gap-1.5"
        data-testid={`data-quality-issues-${testIdKey}`}
      >
        {issues.map((issue) => {
          const label = getDataQualityIssueLabel(issue.type, t);
          const className = getDataQualityIssueClassName(issue.severity);
          const chipClassName = `inline-flex items-center gap-1 rounded border px-1.5 py-0.5 text-[11px] font-medium ${className}`;
          if (
            issue.type === DATA_QUALITY_ISSUE_TYPES.MULTIPLE_CLASSIFICATIONS &&
            result?.cas_number
          ) {
            return (
              <button
                key={issue.type}
                type="button"
                onClick={() => onToggleOtherClassifications(result.cas_number)}
                className={`${chipClassName} transition-colors hover:bg-blue-50 hover:text-blue-800`}
                data-testid={`data-quality-action-${issue.type}-${testIdKey}`}
              >
                <Info className="h-3 w-3 shrink-0" />
                {label}
              </button>
            );
          }
          if (issue.correctionUrl && onOpenDataCorrection && issue.correctionContext) {
            return (
              <a
                key={issue.type}
                href={issue.correctionUrl}
                onClick={(event) => {
                  event.preventDefault();
                  onOpenDataCorrection(issue.correctionContext);
                }}
                className={chipClassName}
                data-testid={`data-quality-link-${issue.type}-${testIdKey}`}
              >
                <ExternalLink className="h-3 w-3 shrink-0" />
                {label}
              </a>
            );
          }

          return issue.correctionUrl ? (
            <a
              key={issue.type}
              href={issue.correctionUrl}
              target="_blank"
              rel="noopener noreferrer"
              className={chipClassName}
              data-testid={`data-quality-link-${issue.type}-${testIdKey}`}
            >
              <ExternalLink className="h-3 w-3 shrink-0" />
              {label}
            </a>
          ) : (
            <span
              key={issue.type}
              className={chipClassName}
              data-testid={`data-quality-chip-${issue.type}-${testIdKey}`}
            >
              <Info className="h-3 w-3 shrink-0" />
              {label}
            </span>
          );
        })}
      </div>
    );
  };

  const renderReviewGuidance = (issues, testIdKey, result) => {
    const primaryIssue = getPrimaryReviewIssue(issues);
    if (!primaryIssue) return null;
    const label = getDataQualityIssueLabel(primaryIssue.type, t);
    const nextAction = getReviewNextActionLabel(primaryIssue.type, t);

    return (
      <div
        className="mt-2 rounded-md border border-amber-100 bg-amber-50 px-2 py-1.5 text-xs text-amber-950"
        data-testid={`data-quality-next-action-${testIdKey}`}
      >
        <span className="font-semibold">{t("results.reviewPrimaryReason")}</span>{" "}
        {label}
        <span className="mx-1 text-amber-700">/</span>
        <span className="font-semibold">{t("results.reviewNextAction")}</span>{" "}
        {primaryIssue.type === DATA_QUALITY_ISSUE_TYPES.MULTIPLE_CLASSIFICATIONS &&
        result?.cas_number ? (
          <button
            type="button"
            onClick={() => onToggleOtherClassifications(result.cas_number)}
            className="font-semibold text-blue-700 underline-offset-2 hover:underline"
            data-testid={`data-quality-next-action-open-chooser-${testIdKey}`}
          >
            {nextAction}
          </button>
        ) : (
          <span>{nextAction}</span>
        )}
      </div>
    );
  };

  const renderClassificationState = (result, effective, testIdKey) => {
    if (!hasMultipleClassifications(result)) return null;
    const confirmed = hasManualClassificationSelection(result, effective);

    return (
      <div
        className={`mt-2 inline-flex rounded-full border px-2 py-0.5 text-[11px] font-medium ${
          confirmed
            ? "border-emerald-200 bg-emerald-50 text-emerald-700"
            : "border-amber-200 bg-amber-50 text-amber-700"
        }`}
        data-testid={`classification-state-${testIdKey}`}
      >
        {confirmed
          ? t("results.classificationStateUserConfirmed")
          : t("results.classificationStateSystemSuggested")}
      </div>
    );
  };

  const SortIcon = ({ columnKey }) => {
    if (sortConfig.key !== columnKey) return <ArrowUpDown className="ml-1 inline h-3 w-3 text-slate-400" />;
    return sortConfig.direction === "asc"
      ? <ArrowUp className="ml-1 inline h-3 w-3 text-blue-700" />
      : <ArrowDown className="ml-1 inline h-3 w-3 text-blue-700" />;
  };

  return (
    <div className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
      {/* Results Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 p-4">
        <div className="text-slate-950">
          <span className="font-semibold">{t("results.title")}</span>
          <span className="ml-2 text-slate-500">
            {t("results.summary", { total: totalCount, found: results.filter((r) => r.found).length })}
          </span>
        </div>
        <div className="flex gap-2 flex-wrap">
          <button
            onClick={onOpenLabelModal}
            disabled={!hasPrintableLabelResults && selectedPrintableCount === 0}
            title={
              !hasPrintableLabelResults && selectedPrintableCount === 0
                ? t("label.noPrintableHazardData")
                : undefined
            }
            className="flex items-center gap-2 rounded-md bg-blue-700 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-800 disabled:cursor-not-allowed disabled:bg-slate-300 disabled:text-slate-600"
            data-testid="print-label-btn"
          >
            <Tag className="w-4 h-4" /> {t("results.printLabel")}
            {selectedPrintableCount > 0 && (
              <span className="rounded-full bg-blue-900 px-2 py-0.5 text-xs">
                {selectedPrintableCount}
              </span>
            )}
          </button>
          {/* Precise shortcut — opens the modal with ONLY visible rows
              that have GHS data (no-GHS rows excluded). */}
          {printAllWithGhsCount > 0 && (
            <button
              onClick={onPrintAllWithGhs}
              className="flex items-center gap-2 rounded-md border border-emerald-200 bg-emerald-50 px-4 py-2 text-sm font-medium text-emerald-800 transition-colors hover:bg-emerald-100"
              data-testid="print-all-with-ghs-btn"
            >
              <Printer className="w-4 h-4" />
              {t("results.printAllWithGhs")}
              <span className="rounded-full bg-emerald-700 px-2 py-0.5 text-xs text-white">
                {printAllWithGhsCount}
              </span>
            </button>
          )}
          {(() => {
            const comparableCount = selectedForLabel.filter(
              (r) => r.found && r.ghs_pictograms?.length > 0
            ).length;
            return comparableCount >= 2 ? (
              <button
                onClick={onOpenComparison}
                disabled={comparableCount > 5}
                className="flex items-center gap-2 rounded-md border border-blue-200 bg-blue-50 px-4 py-2 text-sm font-medium text-blue-800 transition-colors hover:bg-blue-100 disabled:cursor-not-allowed disabled:opacity-50"
                data-testid="compare-btn"
                title={
                  comparableCount > 5
                    ? t("compare.maxReached")
                    : t("compare.btnTooltip")
                }
              >
                <LayoutGrid className="w-4 h-4" /> {t("compare.btn")}
                <span className="rounded-full bg-blue-700 px-2 py-0.5 text-xs text-white">
                  {comparableCount}
                </span>
              </button>
            ) : null;
          })()}
          <button
            onClick={onExportToExcel}
            className="flex items-center gap-2 rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50"
            data-testid="export-xlsx-btn"
          >
            <FileSpreadsheet className="w-4 h-4" /> {t("results.exportExcel")}
          </button>
          <button
            onClick={onExportToCSV}
            className="flex items-center gap-2 rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50"
            data-testid="export-csv-btn"
          >
            <FileText className="w-4 h-4" /> {t("results.exportCSV")}
          </button>
        </div>
      </div>

      {hasFoundResults && (
        <div
          className="flex flex-wrap items-center gap-2 border-b border-blue-100 bg-blue-50/70 px-4 py-3 text-sm"
          data-testid="results-decision-guide"
        >
          <span className="font-medium text-blue-950">
            {t("results.decisionGuideTitle")}
          </span>
          <div className="flex flex-wrap items-center gap-2">
            {decisionSteps.map(({ key, icon: Icon, label }) => (
              <span
                key={key}
                className="inline-flex items-center gap-1.5 rounded-full border border-blue-100 bg-white px-2.5 py-1 text-xs font-medium text-slate-700"
                data-testid={`results-decision-step-${key}`}
              >
                <Icon className="h-3.5 w-3.5 shrink-0 text-blue-700" />
                {label}
              </span>
            ))}
          </div>
        </div>
      )}

      {showWorkflowSummary && (
        <div
          className="border-b border-slate-200 bg-white px-4 py-4"
          data-testid="results-workflow-summary"
        >
          <div className="mb-3 flex flex-wrap items-end justify-between gap-2">
            <div>
              <h3 className="text-sm font-semibold text-slate-950">
                {t("results.workflowSummaryTitle")}
              </h3>
              <p className="mt-1 text-xs text-slate-500">
                {t("results.workflowSummaryBody")}
              </p>
            </div>
            {results.length !== totalCount && (
              <p
                className="text-xs font-medium text-slate-500"
                data-testid="results-workflow-filtered-scope"
              >
                {t("results.workflowFilteredScope", {
                  shown: results.length,
                  total: totalCount,
                })}
              </p>
            )}
            <p
              className="text-xs font-medium text-slate-500"
              data-testid="results-workflow-output-scope"
            >
              {t("results.workflowOutputScope", {
                visible: results.length,
                total: totalCount,
                ready: workflowSummary.readyOutput,
                selected: selectedPrintableCount,
                printable: printAllWithGhsCount,
              })}
            </p>
          </div>
          {nextAction && (
            <div
              className={`mb-3 flex flex-wrap items-center justify-between gap-3 rounded-md border px-3 py-3 ${
                nextAction.tone === "ready"
                  ? "border-emerald-200 bg-emerald-50 text-emerald-950"
                  : nextAction.tone === "blocked"
                    ? "border-red-200 bg-red-50 text-red-900"
                    : "border-amber-200 bg-amber-50 text-amber-950"
              }`}
              data-testid="results-next-action"
            >
              <div className="min-w-0 flex-1">
                <p
                  className="text-[11px] font-semibold uppercase tracking-wide opacity-75"
                  data-testid="results-next-action-eyebrow"
                >
                  {t("results.nextActionEyebrow")}
                </p>
                <h4
                  className="mt-0.5 text-sm font-semibold"
                  data-testid="results-next-action-title"
                >
                  {nextAction.title}
                </h4>
                <p
                  className="mt-1 text-xs opacity-80"
                  data-testid="results-next-action-body"
                >
                  {nextAction.body}
                </p>
              </div>
              {nextAction.cta && nextAction.onClick && (
                <button
                  type="button"
                  onClick={nextAction.onClick}
                  className="shrink-0 rounded-md border border-current/20 bg-white/70 px-3 py-2 text-xs font-semibold transition-colors hover:bg-white"
                  data-testid="results-next-action-primary"
                >
                  {nextAction.cta}
                </button>
              )}
            </div>
          )}
          {multipleGhsReviewCount > 0 && (
            <div
              className="mb-3 flex flex-wrap items-center justify-between gap-3 rounded-md border border-amber-200 bg-amber-50 px-3 py-3 text-amber-950"
              data-testid="results-multiple-ghs-review-callout"
            >
              <div className="min-w-0 flex-1">
                <p className="text-[11px] font-semibold uppercase tracking-wide text-amber-700">
                  {t("results.multipleGhsReviewEyebrow")}
                </p>
                <h4
                  className="mt-0.5 text-sm font-semibold"
                  data-testid="results-multiple-ghs-review-title"
                >
                  {t("results.multipleGhsReviewTitle", {
                    count: multipleGhsReviewCount,
                  })}
                </h4>
                <p
                  className="mt-1 text-xs text-amber-800"
                  data-testid="results-multiple-ghs-review-body"
                >
                  {t("results.multipleGhsReviewBody")}
                </p>
              </div>
              <button
                type="button"
                onClick={() =>
                  setReviewIssueFilter(DATA_QUALITY_ISSUE_TYPES.MULTIPLE_CLASSIFICATIONS)
                }
                disabled={!onSetAdvancedFilter}
                className="shrink-0 rounded-md border border-amber-300 bg-white/80 px-3 py-2 text-xs font-semibold text-amber-900 transition-colors hover:bg-white disabled:cursor-default disabled:opacity-60"
                data-testid="results-multiple-ghs-review-primary"
              >
                {t("results.multipleGhsReviewCta")}
              </button>
            </div>
          )}
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
            {workflowSummaryCards.map((card) => (
              <div
                key={card.key}
                className={`rounded-md border px-3 py-2 ${card.className}`}
                data-testid={`results-workflow-summary-${card.key}`}
              >
                <div className="flex items-baseline justify-between gap-2">
                  <span className="text-xs font-semibold uppercase tracking-wide opacity-80">
                    {card.label}
                  </span>
                  <span
                    className="text-lg font-semibold"
                    data-testid={`results-workflow-summary-${card.key}-value`}
                  >
                    {card.value}
                  </span>
                </div>
                <p className="mt-1 text-xs opacity-75">{card.body}</p>
              </div>
            ))}
          </div>
          {workflowIssueSummaries.length > 0 && (
            <div
              className="mt-3 flex flex-wrap items-center gap-2 border-t border-slate-100 pt-3 text-xs text-slate-600"
              data-testid="results-workflow-review-reasons"
            >
              <span className="font-semibold text-slate-700">
                {t("results.workflowReviewReasonsLabel")}
              </span>
              {workflowIssueSummaries.map((issue) => (
                <button
                  key={issue.type}
                  type="button"
                  onClick={() => setReviewIssueFilter(issue.type)}
                  className={`inline-flex items-center gap-1 rounded-full border px-2 py-1 font-medium transition-colors ${
                    activeReviewIssueType === issue.type
                      ? "border-blue-200 bg-blue-50 text-blue-800"
                      : "border-slate-200 bg-white text-slate-700 hover:border-blue-200 hover:bg-blue-50 hover:text-blue-800"
                  }`}
                  data-testid={`results-workflow-review-reason-${issue.type}`}
                  aria-pressed={activeReviewIssueType === issue.type}
                >
                  <span>{issue.label}</span>
                  <span className="rounded-full bg-slate-100 px-1.5 py-0.5 text-[10px] text-slate-600">
                    {issue.count}
                  </span>
                </button>
              ))}
            </div>
          )}
          {workflowIssueSummaries.length > 0 && (
            <div
              className="mt-3 border-t border-slate-100 pt-3"
              data-testid="results-workflow-review-action-queue"
            >
              <p className="mb-2 text-xs font-semibold text-slate-700">
                {t("results.workflowReviewActionQueueLabel")}
              </p>
              <div className="grid gap-2 md:grid-cols-2">
                {workflowIssueSummaries.map((issue) => (
                  <button
                    key={issue.type}
                    type="button"
                    onClick={() => setReviewIssueFilter(issue.type)}
                    disabled={!onSetAdvancedFilter}
                    className={`rounded-md border px-3 py-2 text-left text-xs transition-colors ${
                      activeReviewIssueType === issue.type
                        ? "border-blue-200 bg-blue-50 text-blue-950"
                        : "border-slate-200 bg-slate-50 text-slate-700 hover:border-blue-200 hover:bg-blue-50 hover:text-blue-950"
                    } disabled:cursor-default disabled:hover:border-slate-200 disabled:hover:bg-slate-50 disabled:hover:text-slate-700`}
                    data-testid={`results-workflow-review-action-${issue.type}`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-semibold">{issue.label}</span>
                      <span className="rounded-full bg-white px-2 py-0.5 text-[11px] font-semibold text-slate-700">
                        {issue.count}
                      </span>
                    </div>
                    <div className="mt-1 text-slate-600">
                      <span className="font-medium">
                        {t("results.workflowReviewActionQueueNext")}
                      </span>{" "}
                      {issue.action}
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Selection controls */}
      {hasPrintableLabelResults && (
        <div className="flex flex-wrap items-center gap-4 border-b border-slate-200 bg-slate-50 px-4 py-2 text-sm">
          <span className="text-slate-600">{t("results.labelSelect")}</span>
          <button
            onClick={onSelectAllForLabel}
            className="font-medium text-blue-700 hover:text-blue-900"
          >
            {t("results.selectAll")}
          </button>
          <button
            onClick={onClearLabelSelection}
            className="font-medium text-slate-600 hover:text-slate-900"
          >
            {t("results.deselectAll")}
          </button>
          <span className="text-slate-500">
            {t("results.selectedCount", { count: selectedPrintableCount })}
          </span>
        </div>
      )}

      {/* Filter Toolbar */}
      {totalCount > 1 && (
        <div className="flex flex-wrap items-center gap-2 border-b border-slate-200 bg-white px-4 py-2 text-sm">
          <Filter className="h-4 w-4 shrink-0 text-slate-500" />
          {[
            { value: "all", labelKey: "filter.all" },
            { value: "danger", labelKey: "filter.danger", color: "red" },
            { value: "warning", labelKey: "filter.warning", color: "amber" },
            { value: "none", labelKey: "filter.none", color: "slate" },
          ].map((f) => (
            <button
              key={f.value}
              onClick={() => onSetResultFilter(f.value)}
              className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                resultFilter === f.value
                  ? f.color === "red" ? "bg-red-50 text-red-700 ring-1 ring-red-200"
                  : f.color === "amber" ? "bg-amber-50 text-amber-700 ring-1 ring-amber-200"
                  : "bg-slate-100 text-slate-900 ring-1 ring-slate-300"
                  : "bg-white text-slate-600 ring-1 ring-slate-200 hover:bg-slate-50 hover:text-slate-900"
              }`}
            >
              {t(f.labelKey)}
            </button>
          ))}
          {/* Advanced Filters */}
          <span className="mx-1 text-slate-300">|</span>
          {[1, 2, 3].map((n) => (
            <button
              key={n}
              onClick={() => onSetAdvancedFilter({ ...advancedFilter, minPictograms: advancedFilter.minPictograms === n ? 0 : n })}
              className={`px-2 py-1 rounded-full text-xs font-medium transition-colors ${
                advancedFilter.minPictograms === n
                  ? "bg-blue-50 text-blue-700 ring-1 ring-blue-200"
                  : "bg-white text-slate-600 ring-1 ring-slate-200 hover:bg-slate-50 hover:text-slate-900"
              }`}
            >
              {t("filter.pictogramCount", { count: n })}
            </button>
          ))}
          <div className="relative ml-1">
            <Search className="absolute left-2 top-1/2 h-3 w-3 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={advancedFilter.hCodeSearch}
              onChange={(e) => onSetAdvancedFilter({ ...advancedFilter, hCodeSearch: e.target.value })}
              placeholder={t("filter.hCodePlaceholder")}
              className="w-24 rounded-full border border-slate-300 bg-white py-1 pl-6 pr-2 text-xs text-slate-950 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
            />
          </div>
          {activeReviewIssueType && (
            <button
              type="button"
              onClick={() => onSetAdvancedFilter({ ...advancedFilter, reviewIssueType: "" })}
              className="inline-flex items-center gap-1 rounded-full bg-blue-50 px-2 py-1 text-xs font-medium text-blue-700 ring-1 ring-blue-100 transition-colors hover:bg-blue-100"
              data-testid="active-review-reason-filter"
            >
              {t("filter.reviewReason", { reason: activeReviewIssueLabel })}
              <X className="h-3 w-3" />
            </button>
          )}
          {(resultFilter !== "all" || advancedFilter.minPictograms > 0 || advancedFilter.hCodeSearch || activeReviewIssueType) && (
            <span className="ml-2 text-slate-500">
              {t("filter.showing", { shown: results.length, total: totalCount })}
            </span>
          )}
        </div>
      )}

      {/* Results Table */}
      <div className="overflow-visible md:overflow-x-auto" data-testid="results-table-scroll">
        <table className="w-full min-w-0 md:min-w-[1120px]" data-testid="results-table">
          <caption className="sr-only">{t("results.tableCaption")}</caption>
          <thead className="hidden md:table-header-group">
            <tr className="bg-slate-50">
              <th className="w-12 px-2 py-3 text-center text-xs font-semibold uppercase tracking-wider text-slate-600">
                {t("results.colSelect")}
              </th>
              <th className="w-12 px-2 py-3 text-center text-xs font-semibold uppercase tracking-wider text-slate-600">
                {t("results.colFavorite")}
              </th>
              <th
                className="w-28 cursor-pointer select-none px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-600 hover:text-slate-950"
                onClick={() => onRequestSort("cas_number")}
                title={t("sort.tooltip")}
              >
                {t("results.colCAS")} <SortIcon columnKey="cas_number" />
              </th>
              <th
                className="min-w-[200px] cursor-pointer select-none px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-600 hover:text-slate-950"
                onClick={() => onRequestSort("name")}
                title={t("sort.tooltip")}
              >
                {t("results.colName")} <SortIcon columnKey="name" />
              </th>
              <th className="w-72 px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-600">
                {t("results.colGHS")}
              </th>
              <th
                className="w-20 cursor-pointer select-none px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-600 hover:text-slate-950"
                onClick={() => onRequestSort("signal_word")}
                title={t("sort.tooltip")}
              >
                {t("results.colSignalWord")} <SortIcon columnKey="signal_word" />
              </th>
              <th className="w-44 px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-600">
                {t("results.colAction")}
              </th>
            </tr>
          </thead>
          <tbody className="block space-y-3 md:table-row-group md:space-y-0 md:divide-y md:divide-slate-200">
            {results.map((result, idx) => {
              const rowKey = result.cas_number || result.query || `row-${idx}`;
              const effectiveForRow = result.found
                ? getEffectiveClassification(result)
                : null;
              const dataQualityIssues = getDataQualityIssues(
                result,
                effectiveForRow,
              );

              return (
              <tr
                key={idx}
                className={`block rounded-lg border border-slate-200 p-4 shadow-sm transition-colors hover:bg-blue-50/60 md:table-row md:rounded-none md:border-0 md:p-0 md:shadow-none ${
                  !result.found ? "opacity-60" : ""
                } ${isSelectedForLabel(result.cas_number) ? "bg-blue-50" : "bg-white md:bg-transparent"}`}
                data-testid={`result-row-${idx}`}
              >
                <td className="inline-flex w-9 px-0 py-0 align-top md:table-cell md:w-12 md:px-2 md:py-4 md:text-center">
                  {isPrintableForLabel(result) && (
                    <input
                      type="checkbox"
                      checked={isSelectedForLabel(result.cas_number)}
                      onChange={() => onToggleSelectForLabel(result)}
                      aria-label={t("results.selectForLabel", { cas: result.cas_number })}
                      className="h-4 w-4 rounded border-slate-300 text-blue-700 focus:ring-blue-500"
                    />
                  )}
                </td>
                <td className="inline-flex w-9 px-0 py-0 align-top md:table-cell md:w-12 md:px-2 md:py-4 md:text-center">
                  {result.found && (
                    <button
                      onClick={() => onToggleFavorite(result)}
                      className={`transition-colors ${
                        isFavorited(result.cas_number)
                          ? "text-amber-400 hover:text-amber-300"
                          : "text-slate-300 hover:text-amber-500"
                      }`}
                      title={isFavorited(result.cas_number) ? t("favorites.removeFavorite") : t("favorites.addFavorite")}
                      data-testid={`favorite-btn-${idx}`}
                    >
                      <Star className={`w-5 h-5 ${isFavorited(result.cas_number) ? "fill-current" : ""}`} />
                    </button>
                  )}
                </td>
                <td className="mt-3 block whitespace-nowrap px-0 py-0 align-top md:table-cell md:mt-0 md:px-4 md:py-4">
                  <span className="font-mono text-blue-700">
                    {result.cas_number}
                  </span>
                </td>
                <td className="mt-2 block min-w-0 px-0 py-0 align-top md:table-cell md:mt-0 md:min-w-[18rem] md:px-4 md:py-4">
                  {result.found ? (
                    (() => {
                      const displayNames = getLocalizedNames(result, displayLocale);
                      const effectiveForSource = effectiveForRow;
                      const effectiveSource =
                        effectiveForSource?.source || result.primary_source;
                      const effectiveReportCount =
                        effectiveForSource?.report_count ||
                        result.primary_report_count;
                      return (
                        <div>
                          <div className="break-words font-medium text-slate-950">
                            {displayNames.primary || t("results.loadingName")}
                          </div>
                          {displayNames.secondary && (
                            <div className="text-sm text-slate-500">
                              {displayNames.secondary}
                            </div>
                          )}
                          {/* Provenance chips (v1.8 M1). Compact, glanceable.
                              Full provenance (timestamp, full source text) lives
                              in the detail modal to keep the results table
                              readable when many rows are shown. */}
                          {(effectiveSource ||
                            effectiveReportCount ||
                            result.cache_hit) && (
                            <div className="mt-1 flex flex-wrap items-center gap-1.5 text-xs">
                              {(() => {
                                const sourceBadge = getSourceBadge(
                                  effectiveSource,
                                  t,
                                );
                                return sourceBadge ? (
                                  <span
                                    className={`inline-flex items-center rounded border px-1.5 py-0.5 ${sourceBadge.className}`}
                                    title={effectiveSource}
                                    data-testid={`source-badge-${sourceBadge.key}-${result.cas_number}`}
                                  >
                                    {sourceBadge.label}
                                  </span>
                                ) : null;
                              })()}
                              {effectiveReportCount && (
                                <span
                                  className="inline-flex items-center rounded bg-slate-100 px-1.5 py-0.5 text-slate-600"
                                  title={t("detail.provenanceReportCountTooltip", {
                                    count: effectiveReportCount,
                                  })}
                                >
                                  {t("results.reportCountBadge", {
                                    count: effectiveReportCount,
                                  })}
                                </span>
                              )}
                              {result.cache_hit && (
                                <span
                                  className="inline-flex items-center rounded border border-amber-200 bg-amber-50 px-1.5 py-0.5 text-amber-700"
                                  title={
                                    result.retrieved_at
                                      ? t(
                                          "detail.provenanceCacheTooltipWithAge",
                                          {
                                            age: formatRelativeTime(
                                              result.retrieved_at,
                                            ),
                                          },
                                        )
                                      : t("detail.provenanceCacheTooltip")
                                  }
                                >
                                  {t("results.cacheBadge")}
                                </span>
                              )}
                            </div>
                          )}
                          {renderDataQualityIssues(dataQualityIssues, rowKey, result)}
                          {renderClassificationState(result, effectiveForRow, rowKey)}
                          {renderReviewGuidance(dataQualityIssues, rowKey, result)}
                        </div>
                      );
                    })()
                  ) : (
                    <div>
                      <span className="text-red-700">{result.error}</span>
                      {renderDataQualityIssues(dataQualityIssues, rowKey, result)}
                      {renderReviewGuidance(dataQualityIssues, rowKey, result)}
                    </div>
                  )}
                </td>
                <td className="mt-3 block px-0 py-0 align-top md:table-cell md:mt-0 md:px-4 md:py-4">
                  {(() => {
                    // Keep "no GHS data" separate from "GHS text exists but
                    // there is no pictogram to draw"; neither should be
                    // mistaken for a no-hazard result.
                    if (!result.found) return "-";
                    const effectiveForGhsCheck = effectiveForRow;
                    if (!hasGhsData(effectiveForGhsCheck)) {
                      return (
                        <div
                          className="space-y-1"
                          data-testid={`no-ghs-data-${result.cas_number}`}
                        >
                          <div className="text-sm text-slate-600">
                            {t("results.noGhsDataAvailable")}
                          </div>
                          <div className="text-xs text-slate-500">
                            {t("results.noGhsDataHint")}
                          </div>
                        </div>
                      );
                    }
                    if (
                      !(
                        effectiveForGhsCheck?.pictograms ||
                        effectiveForGhsCheck?.ghs_pictograms ||
                        []
                      ).length
                    ) {
                      return (
                        <div
                          className="space-y-1"
                          data-testid={`ghs-data-no-pictograms-${result.cas_number}`}
                        >
                          <div className="text-sm text-slate-700">
                            {t("results.ghsDataNoPictograms")}
                          </div>
                          <div className="text-xs text-slate-500">
                            {t("results.ghsDataNoPictogramsHint")}
                          </div>
                        </div>
                      );
                    }
                    return (
                      <div className="space-y-2">
                        {(() => {
                          const effective = effectiveForRow;
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
                            <div
                              className="flex max-w-full flex-wrap items-center gap-2 md:max-w-[18rem]"
                              data-testid={`result-ghs-visual-${result.cas_number}`}
                            >
                              <GHSPictogramStrip
                                pictograms={effective.pictograms || []}
                                size="md"
                                variant={effective.isCustom ? "custom" : "primary"}
                                markerTitle={
                                  effective.isCustom
                                    ? t("results.customMarker")
                                    : t("results.defaultMarker")
                                }
                                getName={(pic) =>
                                  getLocalizedPictogramName(pic, displayLocale)
                                }
                              />
                              {effective.isCustom && (
                                <button
                                  onClick={() => onClearCustomClassification(result.cas_number)}
                                  className="inline-flex h-7 w-7 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-400 transition-colors hover:border-red-200 hover:text-red-600"
                                  title={t("results.restoreDefault")}
                                >
                                  <X className="inline h-3 w-3" />
                                </button>
                              )}
                            </div>
                            {effective.note && (
                              <div className="flex items-center gap-1 text-xs text-blue-700"><PenLine className="h-3 w-3" /> {effective.note}</div>
                            )}

                            {/* Other Classifications Toggle */}
                            {allClassifications.length > 1 && (
                              <div>
                                <button
                                  onClick={() => onToggleOtherClassifications(result.cas_number)}
                                  className="inline-flex items-center gap-1 rounded-full bg-blue-50 px-2 py-1 text-xs font-medium text-blue-700 ring-1 ring-blue-100 transition-colors hover:bg-blue-100 hover:text-blue-900"
                                  aria-expanded={!!expandedOtherClassifications[result.cas_number]}
                                  data-testid={`other-classifications-toggle-${result.cas_number}`}
                                >
                                  {expandedOtherClassifications[result.cas_number] ? (
                                    <ChevronDown className="h-3.5 w-3.5" />
                                  ) : (
                                    <ChevronRight className="h-3.5 w-3.5" />
                                  )}
                                  {t("results.otherClassifications", { count: allClassifications.length - 1 })}
                                </button>

                                {/* Expanded Other Classifications */}
                                {expandedOtherClassifications[result.cas_number] && (
                                  <div
                                    className="mt-2 max-h-72 space-y-2 overflow-y-auto rounded-md border border-slate-200 bg-slate-50 p-2"
                                    data-testid={`other-classifications-${result.cas_number}`}
                                  >
                                    {allClassifications.map((cls, clsIdx) => {
                                      const isSelected = effective.customIndex === clsIdx;
                                      if (isSelected) return null;
                                      const classificationLabel =
                                        clsIdx === 0
                                          ? t("results.defaultMarker")
                                          : t("results.alternateClassification", {
                                              index: clsIdx + 1,
                                            });

                                      return (
                                        <div
                                          key={clsIdx}
                                          data-testid={`other-classification-option-${result.cas_number}-${clsIdx}`}
                                          className="group/item grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 rounded-md border border-slate-200 bg-white px-2.5 py-2 shadow-sm shadow-slate-100"
                                        >
                                          <div className="min-w-0">
                                            <div className="mb-1 flex flex-wrap items-center gap-1.5 text-[11px] font-medium text-slate-500">
                                              <span>{classificationLabel}</span>
                                              {cls.signal_word && (
                                                <span
                                                  className={`rounded px-1.5 py-0.5 text-[10px] font-semibold ${
                                                    cls.signal_word === "Danger"
                                                      ? "bg-red-50 text-red-700 ring-1 ring-red-100"
                                                      : "bg-amber-50 text-amber-700 ring-1 ring-amber-100"
                                                  }`}
                                                  data-testid={`other-classification-signal-${result.cas_number}-${clsIdx}`}
                                                >
                                                  {getLocalizedSignalWord(
                                                    cls,
                                                    displayLocale
                                                  )}
                                                </span>
                                              )}
                                            </div>
                                            <GHSPictogramStrip
                                              pictograms={cls.pictograms || []}
                                              size="sm"
                                              variant="muted"
                                              markerTitle={classificationLabel}
                                              getName={(pic) =>
                                                getLocalizedPictogramName(
                                                  pic,
                                                  displayLocale
                                                )
                                              }
                                              showCodes
                                            />
                                          </div>
                                          <button
                                            onClick={() => onSetCustomClassification(result.cas_number, clsIdx)}
                                            className="shrink-0 rounded-md border border-blue-100 bg-blue-50 px-2.5 py-1.5 text-xs font-medium text-blue-700 transition-colors hover:border-blue-200 hover:bg-blue-100 hover:text-blue-900"
                                            title={t("detail.setAsMain")}
                                          >
                                            {t("results.setAsPrimary")}
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
                    );
                  })()}
                </td>
                <td className="mt-3 block px-0 py-0 align-top md:table-cell md:mt-0 md:px-4 md:py-4">
                  {result.found ? (
                    (() => {
                      const effective = effectiveForRow;
                      return effective?.signal_word ? (
                        <span
                          className={`px-2 py-1 rounded text-sm font-medium ${
                            effective.signal_word === "Danger"
                              ? "bg-red-50 text-red-700 ring-1 ring-red-200"
                              : "bg-amber-50 text-amber-700 ring-1 ring-amber-200"
                          }`}
                        >
                          {getLocalizedSignalWord(effective, displayLocale)}
                        </span>
                      ) : (
                        <span className="text-slate-500">-</span>
                      );
                    })()
                  ) : (
                    "-"
                  )}
                </td>
                <td className="mt-3 block w-full min-w-0 px-0 py-0 align-top md:table-cell md:mt-0 md:w-44 md:min-w-[11rem] md:px-4 md:py-4">
                  {result.found && (
                    <div className="flex flex-wrap gap-1.5">
                      <button
                        onClick={() => onViewDetail(result)}
                        className="inline-flex items-center justify-center whitespace-nowrap rounded border border-slate-300 bg-white px-3 py-1 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50"
                        data-testid={`detail-btn-${idx}`}
                      >
                        {t("results.detail")}
                      </button>
                      {getPubChemSDSUrl(result.cid) && (
                        <a
                          href={getPubChemSDSUrl(result.cid)}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center justify-center gap-1 whitespace-nowrap rounded border border-emerald-200 bg-emerald-50 px-2 py-1 text-sm font-medium text-emerald-800 transition-colors hover:bg-emerald-100"
                          title={t("sds.viewSDS")}
                          data-testid={`sds-btn-${idx}`}
                        >
                          <ShieldCheck className="w-3.5 h-3.5" /> {t("sds.viewSDS")}
                        </a>
                      )}
                    </div>
                  )}
                </td>
              </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
