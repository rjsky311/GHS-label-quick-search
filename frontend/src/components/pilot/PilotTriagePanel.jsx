import { Activity } from "lucide-react";
import { useTranslation } from "react-i18next";
import {
  DATA_QUALITY_ISSUE_TYPES,
  getDataQualityIssueDisplayLabel,
} from "@/utils/dataQuality";
import { SectionHeading, SummaryCard } from "./PilotDashboardPrimitives";

const TRIAGE_FOCUS_MESSAGE_KEYS = {
  correction_intake: "pilot.triageFocus.correction_intake.message",
  candidate_found: "pilot.triageFocus.candidate_found.message",
  manual_review: "pilot.triageFocus.manual_review.message",
  needs_evidence: "pilot.triageFocus.needs_evidence.message",
  unresolved_searches: "pilot.triageFocus.unresolved_searches.message",
  missing_chinese_names: "pilot.triageFocus.missing_chinese_names.message",
  no_ghs_gaps: "pilot.triageFocus.no_ghs_gaps.message",
  source_conflicts: "pilot.triageFocus.source_conflicts.message",
  alias_review: "pilot.triageFocus.alias_review.message",
  reference_link_review: "pilot.triageFocus.reference_link_review.message",
  telemetry_retention: "pilot.triageFocus.telemetry_retention.message",
  healthy: "pilot.triageFocus.healthy.message",
};

const TRIAGE_FOCUS_NEXT_ACTION_KEYS = {
  correction_intake: "pilot.triageFocus.correction_intake.nextAction",
  candidate_found: "pilot.triageFocus.candidate_found.nextAction",
  manual_review: "pilot.triageFocus.manual_review.nextAction",
  needs_evidence: "pilot.triageFocus.needs_evidence.nextAction",
  unresolved_searches: "pilot.triageFocus.unresolved_searches.nextAction",
  missing_chinese_names: "pilot.triageFocus.missing_chinese_names.nextAction",
  no_ghs_gaps: "pilot.triageFocus.no_ghs_gaps.nextAction",
  source_conflicts: "pilot.triageFocus.source_conflicts.nextAction",
  alias_review: "pilot.triageFocus.alias_review.nextAction",
  reference_link_review: "pilot.triageFocus.reference_link_review.nextAction",
  telemetry_retention: "pilot.triageFocus.telemetry_retention.nextAction",
};

export default function PilotTriagePanel({
  pilotTriage = {},
  observabilityCounters = {},
  onOpenPrimaryActionTarget,
  onOpenFocusTarget,
}) {
  const { t } = useTranslation();
  const attentionCounts = pilotTriage.attentionCounts || {};
  const upstreamRetryCount =
    attentionCounts.upstreamRetryRows || observabilityCounters["upstream.total"] || 0;
  const dataQualityLabel = (issueType) =>
    getDataQualityIssueDisplayLabel(issueType, t);
  const recommendedFocus = Array.isArray(pilotTriage.recommendedFocus)
    ? pilotTriage.recommendedFocus
    : [];
  const primaryFocus = recommendedFocus[0] || null;
  const openFocusTarget = onOpenFocusTarget || onOpenPrimaryActionTarget;
  const focusText = (focus, field) => {
    if (!focus) {
      return "";
    }
    const keyMap =
      field === "nextAction"
        ? TRIAGE_FOCUS_NEXT_ACTION_KEYS
        : TRIAGE_FOCUS_MESSAGE_KEYS;
    const translationKey = keyMap[focus.key];
    const fallback = focus[field] || "";
    return translationKey
      ? t(translationKey, { defaultValue: fallback })
      : fallback;
  };
  const canOpenPrimaryTarget =
    Boolean(primaryFocus?.targetKey) &&
    typeof openFocusTarget === "function";
  const targetDisplayLabel = (focus) => {
    if (!focus?.targetKey && !focus?.targetLabel) {
      return "";
    }
    const fallback = focus.targetLabel || "Related queue";
    const key = focus.targetKey
      ? `pilot.triageTargetLabel.${focus.targetKey}`
      : "pilot.triageTargetLabel.related";
    const translated = t(key, { defaultValue: fallback });
    return translated === key ? fallback : translated;
  };
  const openTargetLabel = (focus) => {
    const label = targetDisplayLabel(focus);
    if (!label) {
      return t("pilot.triageOpenTarget", {
        defaultValue: "Open related queue",
      });
    }
    const translated = t("pilot.triageOpenTargetLabel", {
      defaultValue: "Open {{label}}",
      label,
    });
    return translated === "pilot.triageOpenTargetLabel"
      ? `Open ${label}`
      : translated;
  };

  return (
    <section
      className="rounded-lg border border-emerald-200 bg-emerald-50 p-4"
      data-testid="pilot-triage-panel"
    >
      <SectionHeading
        icon={Activity}
        title={t("pilot.triageTitle", {
          defaultValue: "Pilot triage",
        })}
        subtitle={t("pilot.triageHint", {
          defaultValue:
            "Compact operator view for deciding whether the next pilot action is data review, unresolved search cleanup, source review, or telemetry maintenance.",
        })}
      />
      <div
        className="mb-3 rounded-lg border border-emerald-300 bg-white p-3 text-sm text-slate-700 shadow-sm"
        data-testid="pilot-triage-primary-action"
      >
        <div className="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
          <div>
            <div className="text-xs font-semibold uppercase tracking-wide text-emerald-800">
              {t("pilot.triagePrimaryActionLabel", {
                defaultValue: "Primary admin action",
              })}
            </div>
            <div
              className="mt-1 font-medium text-slate-900"
              data-testid="pilot-triage-primary-action-message"
            >
              {primaryFocus
                ? focusText(primaryFocus, "message")
                : t("pilot.triageNoPrimaryAction", {
                    defaultValue:
                      "No queued pilot curation work requires immediate action.",
                  })}
            </div>
            <div
              className="mt-1 text-xs text-slate-600"
              data-testid="pilot-triage-primary-action-next"
            >
              {primaryFocus?.nextAction
                ? t("pilot.triageNextAction", {
                    defaultValue: "Next action: {{action}}",
                    action: focusText(primaryFocus, "nextAction"),
                  })
                : t("pilot.triageNoPrimaryActionNext", {
                    defaultValue:
                      "Keep monitoring new correction requests, unresolved searches, and stale telemetry.",
                  })}
            </div>
            {targetDisplayLabel(primaryFocus) ? (
              <div
                className="mt-2 inline-flex rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-xs font-semibold text-emerald-800"
                data-testid="pilot-triage-primary-action-target-label"
              >
                {targetDisplayLabel(primaryFocus)}
              </div>
            ) : null}
          </div>
          {primaryFocus ? (
            <div className="flex shrink-0 items-center gap-2 self-start">
              {canOpenPrimaryTarget ? (
                <button
                  type="button"
                  onClick={() => openFocusTarget(primaryFocus.targetKey)}
                  className="rounded-md border border-emerald-300 bg-emerald-700 px-3 py-1 text-xs font-semibold text-white transition-colors hover:bg-emerald-800"
                  data-testid="pilot-triage-primary-action-open-target"
                >
                  {openTargetLabel(primaryFocus)}
                </button>
              ) : null}
              <span
                className="inline-flex rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-semibold text-emerald-800"
                data-testid="pilot-triage-primary-action-count"
              >
                {primaryFocus.count}
              </span>
            </div>
          ) : null}
        </div>
      </div>
      <div className="grid gap-2 md:grid-cols-4">
        <SummaryCard
          label={t("pilot.openWorkItems", {
            defaultValue: "Queue items",
          })}
          value={pilotTriage.openWorkItemCount || 0}
          accent="text-emerald-800"
          testId="pilot-triage-open-work-items"
        />
        <SummaryCard
          label={t("pilot.triageOpenCorrections", {
            defaultValue: "Open corrections",
          })}
          value={attentionCounts.openCorrectionRequests || 0}
          accent="text-emerald-800"
          testId="pilot-triage-open-corrections"
        />
        <SummaryCard
          label={t("pilot.triageUnresolvedSearches", {
            defaultValue: "Unresolved searches",
          })}
          value={attentionCounts.unresolvedSearches || 0}
          accent="text-amber-700"
          testId="pilot-triage-unresolved-searches"
        />
        <SummaryCard
          label={t("pilot.triageCandidateFound", {
            defaultValue: "Candidates to convert",
          })}
          value={attentionCounts.candidateFoundAwaitingManualReview || 0}
          accent="text-blue-700"
          testId="pilot-triage-candidate-found"
        />
        <SummaryCard
          label={t("pilot.triagePendingManualEntries", {
            defaultValue: "Manual entries in review",
          })}
          value={attentionCounts.manualEntriesInReview || 0}
          accent="text-violet-700"
          testId="pilot-triage-manual-entries"
        />
        <SummaryCard
          label={t("pilot.triageNeedsEvidence", {
            defaultValue: "Needs evidence",
          })}
          value={attentionCounts.needsEvidenceWorkItems || 0}
          accent="text-yellow-700"
          testId="pilot-triage-needs-evidence"
        />
        <SummaryCard
          label={dataQualityLabel(DATA_QUALITY_ISSUE_TYPES.MISSING_CHINESE_NAME)}
          value={attentionCounts.missingChineseNameReports || 0}
          accent="text-orange-700"
          testId="pilot-triage-missing-chinese-names"
        />
        <SummaryCard
          label={dataQualityLabel(DATA_QUALITY_ISSUE_TYPES.SOURCE_CONFLICT)}
          value={attentionCounts.sourceConflictReports || 0}
          accent="text-red-700"
          testId="pilot-triage-source-conflicts"
        />
        <SummaryCard
          label={dataQualityLabel(DATA_QUALITY_ISSUE_TYPES.UPSTREAM_ERROR)}
          value={upstreamRetryCount}
          accent="text-red-700"
          testId="pilot-triage-upstream-retries"
        />
        <SummaryCard
          label={dataQualityLabel(DATA_QUALITY_ISSUE_TYPES.NO_GHS_DATA)}
          value={attentionCounts.noGhsReports || 0}
          accent="text-red-700"
          testId="pilot-triage-no-ghs"
        />
        <SummaryCard
          label={t("pilot.triageStaleTelemetry", {
            defaultValue: "Stale telemetry",
          })}
          value={attentionCounts.staleMissQueryRows || 0}
          accent="text-slate-700"
          testId="pilot-triage-stale-telemetry"
        />
      </div>
      <div className="mt-3 space-y-2">
        {recommendedFocus.map((focus) => {
          const canOpenFocusTarget =
            Boolean(focus.targetKey) && typeof openFocusTarget === "function";
          return (
          <div
            key={focus.key}
            className="grid gap-2 rounded-md border border-emerald-200 bg-white px-3 py-2 text-sm text-slate-700 md:grid-cols-[minmax(0,1fr)_auto]"
            data-testid={`pilot-triage-focus-${focus.key}`}
          >
            <div>
              <div>{focusText(focus, "message")}</div>
              {focus.nextAction && (
                <div
                  className="mt-1 text-xs font-medium text-emerald-800"
                  data-testid={`pilot-triage-focus-${focus.key}-next-action`}
                >
                  {t("pilot.triageNextAction", {
                    defaultValue: "Next action: {{action}}",
                    action: focusText(focus, "nextAction"),
                  })}
                </div>
              )}
            </div>
            <div className="flex items-center gap-2 self-start">
              {canOpenFocusTarget ? (
                <button
                  type="button"
                  onClick={() => openFocusTarget(focus.targetKey)}
                  className="rounded-md border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-800 transition-colors hover:bg-emerald-100"
                  data-testid={`pilot-triage-focus-${focus.key}-open-target`}
                >
                  {openTargetLabel(focus)}
                </button>
              ) : null}
              <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-semibold text-emerald-800">
                {focus.count}
              </span>
            </div>
          </div>
          );
        })}
      </div>
    </section>
  );
}
