import { AlertTriangle, Building2, CheckCircle2, FileText, Tag } from "lucide-react";
import { READINESS_TONE_CLASSES } from "@/components/label-print/labelPrintModalHelpers";

function OutcomeIcon({ tone }) {
  const Icon = tone === "ready" ? CheckCircle2 : AlertTriangle;
  return <Icon className="mt-0.5 h-4 w-4 shrink-0" />;
}

export function RecommendedOutputSummary({
  outputOutcomeTone,
  outputOutcomeTitle,
  outputOutcomeBody,
  currentStockName,
  outputRoleSummary,
  statementSummary,
  canUseFullPagePrimary,
  isProfileBlocked,
  useFullPagePrimaryLabel,
  onUseFullPagePrimary,
  onFocusResponsibleProfile,
  tx,
}) {
  return (
    <section
      className={`rounded-lg border p-3 ${
        READINESS_TONE_CLASSES[outputOutcomeTone] ||
        READINESS_TONE_CLASSES.neutral
      }`}
      data-testid="recommended-output-summary"
      aria-live="polite"
    >
      <div className="flex items-start gap-2">
        <OutcomeIcon tone={outputOutcomeTone} />
        <div className="min-w-0">
          <div className="text-xs font-semibold uppercase tracking-normal opacity-80">
            {tx("label.recommendedOutputTitle", "Recommended next step")}
          </div>
          <div className="mt-1 text-sm font-semibold">
            {outputOutcomeTitle}
          </div>
          <p className="mt-1 text-xs leading-5 opacity-90">
            {outputOutcomeBody}
          </p>
        </div>
      </div>
      <div className="mt-3 grid gap-2 text-xs sm:grid-cols-3">
        {[
          {
            key: "stock",
            label: tx("label.outputStockTitle", "Target size"),
            value: currentStockName,
          },
          {
            key: "role",
            label: tx("label.outputRole", "Label output"),
            value: outputRoleSummary,
          },
          {
            key: "statements",
            label: tx("label.outputHazardText", "Hazard text"),
            value: statementSummary,
          },
        ].map((item) => (
          <div
            key={item.key}
            className="rounded-md bg-white/70 px-2.5 py-2 ring-1 ring-current/10"
            data-testid={`recommended-output-${item.key}`}
          >
            <div className="font-medium opacity-70">{item.label}</div>
            <div className="mt-0.5 font-semibold">{item.value}</div>
          </div>
        ))}
      </div>
      {(canUseFullPagePrimary || isProfileBlocked) && (
        <div className="mt-3 flex flex-col gap-2 sm:flex-row">
          {canUseFullPagePrimary && (
            <button
              type="button"
              onClick={onUseFullPagePrimary}
              className="inline-flex items-center justify-center gap-2 rounded-md bg-blue-700 px-3 py-2 text-xs font-semibold text-white transition-colors hover:bg-blue-800"
              data-testid="recommended-use-full-page-primary"
            >
              <FileText className="h-4 w-4" />
              {useFullPagePrimaryLabel}
            </button>
          )}
          {isProfileBlocked && (
            <button
              type="button"
              onClick={onFocusResponsibleProfile}
              className="inline-flex items-center justify-center gap-2 rounded-md bg-blue-700 px-3 py-2 text-xs font-semibold text-white transition-colors hover:bg-blue-800"
              data-testid="recommended-fill-profile"
            >
              <Building2 className="h-4 w-4" />
              {tx("label.profileCompleteAction", "Fill profile now")}
            </button>
          )}
        </div>
      )}
    </section>
  );
}

export function PrintOutcomeSummary({
  outputOutcomeTone,
  outputOutcomeTitle,
  outputOutcomeBody,
  isProfileBlocked,
  currentStockName,
  outputRoleSummary,
  pictogramSummary,
  statementSummary,
  onFocusResponsibleProfile,
  onUseSupplementalLabel,
  tx,
}) {
  return (
    <section
      className={`rounded-lg border p-3 ${
        READINESS_TONE_CLASSES[outputOutcomeTone] ||
        READINESS_TONE_CLASSES.neutral
      }`}
      data-testid="print-outcome-summary"
    >
      <div className="flex items-start gap-2">
        <OutcomeIcon tone={outputOutcomeTone} />
        <div className="min-w-0">
          <div
            className="text-sm font-semibold"
            data-testid="print-outcome-title"
          >
            {outputOutcomeTitle}
          </div>
          <p className="mt-1 text-sm leading-5 opacity-90">
            {outputOutcomeBody}
          </p>
          {isProfileBlocked && (
            <div
              className="mt-3 flex flex-col gap-2 sm:flex-row"
              data-testid="profile-blocked-actions"
            >
              <button
                type="button"
                onClick={onFocusResponsibleProfile}
                className="inline-flex items-center justify-center gap-2 rounded-md bg-blue-700 px-3 py-2 text-xs font-semibold text-white transition-colors hover:bg-blue-800"
              >
                <Building2 className="h-4 w-4" />
                {tx("label.profileCompleteAction", "Fill profile now")}
              </button>
              <button
                type="button"
                onClick={onUseSupplementalLabel}
                className="inline-flex items-center justify-center gap-2 rounded-md bg-white/80 px-3 py-2 text-xs font-semibold ring-1 ring-current/15 transition-colors hover:bg-white"
              >
                <Tag className="h-4 w-4" />
                {tx(
                  "label.profileUseSupplementAction",
                  "Print a supplemental label instead",
                )}
              </button>
            </div>
          )}
        </div>
      </div>
      <div className="mt-3 grid grid-cols-2 gap-2 text-xs sm:grid-cols-4">
        {[
          currentStockName,
          outputRoleSummary,
          pictogramSummary,
          statementSummary,
        ].map((item, index) => (
          <span
            key={`${item}-${index}`}
            className="rounded-md bg-white/70 px-2 py-1 font-medium ring-1 ring-current/10"
          >
            {item}
          </span>
        ))}
      </div>
    </section>
  );
}
