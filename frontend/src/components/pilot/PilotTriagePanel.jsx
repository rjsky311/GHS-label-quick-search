import { Activity } from "lucide-react";
import { useTranslation } from "react-i18next";
import { SectionHeading, SummaryCard } from "./PilotDashboardPrimitives";

export default function PilotTriagePanel({
  pilotTriage = {},
  observabilityCounters = {},
}) {
  const { t } = useTranslation();
  const attentionCounts = pilotTriage.attentionCounts || {};
  const upstreamRetryCount =
    attentionCounts.upstreamRetryRows || observabilityCounters["upstream.total"] || 0;
  const recommendedFocus = Array.isArray(pilotTriage.recommendedFocus)
    ? pilotTriage.recommendedFocus
    : [];
  const primaryFocus = recommendedFocus[0] || null;

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
                ? primaryFocus.message
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
                    action: primaryFocus.nextAction,
                  })
                : t("pilot.triageNoPrimaryActionNext", {
                    defaultValue:
                      "Keep monitoring new correction requests, unresolved searches, and stale telemetry.",
                  })}
            </div>
          </div>
          {primaryFocus ? (
            <span
              className="inline-flex self-start rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-semibold text-emerald-800"
              data-testid="pilot-triage-primary-action-count"
            >
              {primaryFocus.count}
            </span>
          ) : null}
        </div>
      </div>
      <div className="grid gap-2 md:grid-cols-4">
        <SummaryCard
          label={t("pilot.openWorkItems", {
            defaultValue: "Open work items",
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
          label={t("pilot.triageMissingChineseNames", {
            defaultValue: "Missing Chinese names",
          })}
          value={attentionCounts.missingChineseNameReports || 0}
          accent="text-orange-700"
          testId="pilot-triage-missing-chinese-names"
        />
        <SummaryCard
          label={t("pilot.triageSourceConflicts", {
            defaultValue: "Source conflicts",
          })}
          value={attentionCounts.sourceConflictReports || 0}
          accent="text-red-700"
          testId="pilot-triage-source-conflicts"
        />
        <SummaryCard
          label={t("pilot.triageUpstreamRetries", {
            defaultValue: "Upstream retries",
          })}
          value={upstreamRetryCount}
          accent="text-red-700"
          testId="pilot-triage-upstream-retries"
        />
        <SummaryCard
          label={t("pilot.triageNoGhsReports", {
            defaultValue: "No-GHS reports",
          })}
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
        {recommendedFocus.map((focus) => (
          <div
            key={focus.key}
            className="grid gap-2 rounded-md border border-emerald-200 bg-white px-3 py-2 text-sm text-slate-700 md:grid-cols-[minmax(0,1fr)_auto]"
            data-testid={`pilot-triage-focus-${focus.key}`}
          >
            <div>
              <div>{focus.message}</div>
              {focus.nextAction && (
                <div
                  className="mt-1 text-xs font-medium text-emerald-800"
                  data-testid={`pilot-triage-focus-${focus.key}-next-action`}
                >
                  {t("pilot.triageNextAction", {
                    defaultValue: "Next action: {{action}}",
                    action: focus.nextAction,
                  })}
                </div>
              )}
            </div>
            <span className="self-start rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-semibold text-emerald-800">
              {focus.count}
            </span>
          </div>
        ))}
      </div>
    </section>
  );
}
