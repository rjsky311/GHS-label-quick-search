import { Activity } from "lucide-react";
import { useTranslation } from "react-i18next";
import {
  DATA_QUALITY_ISSUE_TYPES,
  getDataQualityIssueDisplayLabel,
} from "@/utils/dataQuality";
import { SectionHeading, SummaryCard } from "./PilotDashboardPrimitives";

const TRIAGE_FOCUS_MESSAGE_KEYS = {
  correction_intake: "pilot.triageFocus.correction_intake.message",
  inventory_handoff: "pilot.triageFocus.inventory_handoff.message",
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
  inventory_handoff: "pilot.triageFocus.inventory_handoff.nextAction",
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

const DATA_QUALITY_WORKFLOW_LABEL_KEYS = {
  manual_review: "pilot.dataQualityWorkflowStage.manual_review.label",
  candidate_found: "pilot.dataQualityWorkflowStage.candidate_found.label",
  missing_chinese_names:
    "pilot.dataQualityWorkflowStage.missing_chinese_names.label",
  inventory_handoff: "pilot.dataQualityWorkflowStage.inventory_handoff.label",
  unresolved_searches:
    "pilot.dataQualityWorkflowStage.unresolved_searches.label",
  correction_intake: "pilot.dataQualityWorkflowStage.correction_intake.label",
  healthy: "pilot.dataQualityWorkflowStage.healthy.label",
};

const DATA_QUALITY_WORKFLOW_ACTION_KEYS = {
  manual_review: "pilot.dataQualityWorkflowStage.manual_review.nextAction",
  candidate_found: "pilot.dataQualityWorkflowStage.candidate_found.nextAction",
  missing_chinese_names:
    "pilot.dataQualityWorkflowStage.missing_chinese_names.nextAction",
  inventory_handoff:
    "pilot.dataQualityWorkflowStage.inventory_handoff.nextAction",
  unresolved_searches:
    "pilot.dataQualityWorkflowStage.unresolved_searches.nextAction",
  correction_intake:
    "pilot.dataQualityWorkflowStage.correction_intake.nextAction",
};

export default function PilotTriagePanel({
  pilotTriage = {},
  observabilityCounters = {},
  onOpenPrimaryActionTarget,
  onOpenFocusTarget,
}) {
  const { t } = useTranslation();
  const attentionCounts = pilotTriage.attentionCounts || {};
  const openWorkItemCount = Number(pilotTriage.openWorkItemCount || 0);
  const attentionSignalCount = Number.isFinite(
    Number(pilotTriage.attentionSignalCount),
  )
    ? Number(pilotTriage.attentionSignalCount)
    : Object.values(attentionCounts).reduce(
        (total, count) => total + Number(count || 0),
        0,
      );
  const hasOverlappingSignals =
    openWorkItemCount > 0 && attentionSignalCount > openWorkItemCount;
  const upstreamRetryCount =
    attentionCounts.upstreamRetryRows || observabilityCounters["upstream.total"] || 0;
  const dataQualityLabel = (issueType) =>
    getDataQualityIssueDisplayLabel(issueType, t);
  const recommendedFocus = Array.isArray(pilotTriage.recommendedFocus)
    ? pilotTriage.recommendedFocus
    : [];
  const primaryFocus = recommendedFocus[0] || null;
  const dataQualityWorkflow = pilotTriage.dataQualityWorkflow || {};
  const dataQualityWorkflowStages = Array.isArray(dataQualityWorkflow.stages)
    ? dataQualityWorkflow.stages
    : [];
  const primaryDataQualityStage = dataQualityWorkflow.primaryStage || null;
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
  const workflowStageLabel = (stage) => {
    const key = DATA_QUALITY_WORKFLOW_LABEL_KEYS[stage?.key];
    return key ? t(key, { defaultValue: stage.label || "" }) : stage?.label || "";
  };
  const workflowStageNextAction = (stage) => {
    const key = DATA_QUALITY_WORKFLOW_ACTION_KEYS[stage?.key];
    return key
      ? t(key, { defaultValue: stage.nextAction || "" })
      : stage?.nextAction || "";
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
      {dataQualityWorkflowStages.length > 0 ? (
        <div
          className="mb-3 rounded-lg border border-emerald-200 bg-white p-3 text-sm text-slate-700 shadow-sm"
          data-testid="pilot-data-quality-workflow"
        >
          <div className="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
            <div>
              <div className="text-xs font-semibold uppercase tracking-wide text-emerald-800">
                {t("pilot.dataQualityWorkflowTitle", {
                  defaultValue: "Data-quality workflow",
                })}
              </div>
              <p
                className="mt-1 text-xs text-slate-600"
                data-testid="pilot-data-quality-workflow-hint"
              >
                {t("pilot.dataQualityWorkflowHint", {
                  defaultValue:
                    "Follow the closest-to-approval stage first: manual review, candidate evidence, missing Chinese-name reports, workbook handoff, unresolved searches, then general intake.",
                })}
              </p>
            </div>
            {primaryDataQualityStage ? (
              <span
                className="inline-flex rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-800"
                data-testid="pilot-data-quality-workflow-primary"
              >
                {t("pilot.dataQualityWorkflowPrimary", {
                  defaultValue: "Current: {{label}}",
                  label: workflowStageLabel(primaryDataQualityStage),
                })}
              </span>
            ) : null}
          </div>
          <div className="mt-3 grid gap-2 md:grid-cols-3">
            {dataQualityWorkflowStages.map((stage) => {
              const canOpenStageTarget =
                Boolean(stage.targetKey) && typeof openFocusTarget === "function";
              return (
                <div
                  key={stage.key}
                  className={`rounded-md border px-3 py-2 ${
                    stage.isActive
                      ? "border-emerald-300 bg-emerald-50"
                      : "border-slate-200 bg-slate-50"
                  }`}
                  data-testid={`pilot-data-quality-workflow-stage-${stage.key}`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="font-semibold text-slate-900">
                        {workflowStageLabel(stage)}
                      </div>
                      <div className="mt-1 text-xs text-slate-600">
                        {workflowStageNextAction(stage)}
                      </div>
                    </div>
                    <span
                      className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
                        stage.isActive
                          ? "bg-emerald-100 text-emerald-800"
                          : "bg-slate-100 text-slate-500"
                      }`}
                      data-testid={`pilot-data-quality-workflow-stage-${stage.key}-count`}
                    >
                      {stage.count}
                    </span>
                  </div>
                  {canOpenStageTarget && stage.isActive ? (
                    <button
                      type="button"
                      onClick={() => openFocusTarget(stage.targetKey)}
                      className="mt-2 rounded-md border border-emerald-200 bg-white px-2.5 py-1 text-xs font-semibold text-emerald-800 transition-colors hover:bg-emerald-100"
                      data-testid={`pilot-data-quality-workflow-stage-${stage.key}-open-target`}
                    >
                      {openTargetLabel(stage)}
                    </button>
                  ) : null}
                </div>
              );
            })}
          </div>
        </div>
      ) : null}
      <div className="grid gap-2 md:grid-cols-4">
        <SummaryCard
          label={t("pilot.openWorkItems", {
            defaultValue: "Queue items",
          })}
          value={openWorkItemCount}
          accent="text-emerald-800"
          testId="pilot-triage-open-work-items"
        />
        <SummaryCard
          label={t("pilot.triageAttentionSignals", {
            defaultValue: "Review signals",
          })}
          value={attentionSignalCount}
          accent="text-indigo-700"
          testId="pilot-triage-attention-signals"
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
          label={t("pilot.triageInventoryHandoff", {
            defaultValue: "Inventory handoff",
          })}
          value={attentionCounts.inventoryHandoffRequests || 0}
          accent="text-cyan-700"
          testId="pilot-triage-inventory-handoff"
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
      {hasOverlappingSignals ? (
        <p
          className="mt-2 rounded-md border border-emerald-200 bg-white px-3 py-2 text-xs text-slate-600"
          data-testid="pilot-triage-overlap-note"
        >
          {t("pilot.triageOverlapNote", {
            defaultValue:
              "Review signals can be higher than queue items because one correction request can carry multiple data-quality issues. Start from the primary action, then clear the related signals.",
            signals: attentionSignalCount,
            items: openWorkItemCount,
          })}
        </p>
      ) : null}
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
