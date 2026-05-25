import { Activity } from "lucide-react";
import { useTranslation } from "react-i18next";
import { SectionHeading, SummaryCard } from "./PilotDashboardPrimitives";

export default function PilotTriagePanel({ pilotTriage = {} }) {
  const { t } = useTranslation();
  const attentionCounts = pilotTriage.attentionCounts || {};
  const recommendedFocus = Array.isArray(pilotTriage.recommendedFocus)
    ? pilotTriage.recommendedFocus
    : [];

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
          label={t("pilot.triageUnresolvedSearches", {
            defaultValue: "Unresolved searches",
          })}
          value={attentionCounts.unresolvedSearches || 0}
          accent="text-amber-700"
          testId="pilot-triage-unresolved-searches"
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
      </div>
      <div className="mt-3 space-y-2">
        {recommendedFocus.map((focus) => (
          <div
            key={focus.key}
            className="flex items-start justify-between gap-3 rounded-md border border-emerald-200 bg-white px-3 py-2 text-sm text-slate-700"
            data-testid={`pilot-triage-focus-${focus.key}`}
          >
            <span>{focus.message}</span>
            <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-semibold text-emerald-800">
              {focus.count}
            </span>
          </div>
        ))}
      </div>
    </section>
  );
}
