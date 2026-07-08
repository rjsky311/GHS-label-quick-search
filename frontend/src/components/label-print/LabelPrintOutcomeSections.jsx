import { AlertTriangle, Building2, CheckCircle2, FileText, Tag } from "@/components/icons";
import {
  READINESS_TONE_ACCENT_CLASSES,
} from "@/components/label-print/labelPrintModalHelpers";

function OutcomeIcon({ tone }) {
  const Icon = tone === "ready" ? CheckCircle2 : AlertTriangle;
  return <Icon className="mt-0.5 h-4 w-4 shrink-0" />;
}

export function RecommendedOutputSummary({
  outputOutcomeTone,
  outputOutcomeTitle,
  outputOutcomeBody,
  eyebrowLabel,
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
      className={`notebook-print-stage-section rounded-md p-3 ${
        READINESS_TONE_ACCENT_CLASSES[outputOutcomeTone] ||
        READINESS_TONE_ACCENT_CLASSES.neutral
      }`}
      data-testid="recommended-output-summary"
      aria-live="polite"
    >
      <div className="flex items-start gap-2">
        <OutcomeIcon tone={outputOutcomeTone} />
        <div className="min-w-0">
          <div className="text-xs font-semibold uppercase tracking-normal opacity-80">
            {eyebrowLabel ||
              tx("label.recommendedOutputTitle", "Recommended next step")}
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
            className="notebook-print-stage-fact rounded-md px-2.5 py-2"
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
              className="notebook-control notebook-control-primary inline-flex items-center justify-center gap-2 px-3 py-2 text-xs font-semibold transition-colors"
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
              className="notebook-control notebook-control-repair inline-flex items-center justify-center gap-2 px-3 py-2 text-xs font-semibold transition-colors"
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

export function PrintRunSummary({
  tone,
  title,
  body,
  outputLabel,
  batchLabel,
  issueLabel,
  tx,
}) {
  return (
    <section
      className={`notebook-print-run-summary notebook-print-run-summary-${tone} notebook-print-stage-section rounded-md p-4 ${
        READINESS_TONE_ACCENT_CLASSES[tone] ||
        READINESS_TONE_ACCENT_CLASSES.neutral
      }`}
      data-testid="print-run-summary"
      aria-live="polite"
    >
      <div className="flex items-start gap-3">
        <OutcomeIcon tone={tone} />
        <div className="min-w-0">
          <div className="text-xs font-semibold uppercase tracking-normal opacity-80">
            {tx("label.printRunSummaryEyebrow", "Print run status")}
          </div>
          <h3 className="mt-1 text-base font-semibold leading-6">{title}</h3>
          <p className="mt-1 text-sm leading-5 opacity-90">{body}</p>
        </div>
      </div>
      <div className="mt-4 grid gap-2 text-xs sm:grid-cols-3">
        <div
          className="notebook-print-stage-fact rounded-md px-2.5 py-2"
          data-testid="print-run-output"
        >
          <div className="font-medium opacity-70">
            {tx("label.outputRole", "Label output")}
          </div>
          <div className="mt-0.5 font-semibold">{outputLabel}</div>
        </div>
        <div
          className="notebook-print-stage-fact rounded-md px-2.5 py-2"
          data-testid="print-run-batch"
        >
          <div className="font-medium opacity-70">
            {tx("label.batchPrintScopeTitle", "Print scope")}
          </div>
          <div className="mt-0.5 font-semibold">{batchLabel}</div>
        </div>
        {issueLabel && (
          <div
            className="notebook-print-stage-fact rounded-md px-2.5 py-2"
            data-testid="print-run-issue"
          >
            <div className="font-medium opacity-70">
              {tx("label.printRunIssueLabel", "Attention")}
            </div>
            <div className="mt-0.5 font-semibold">{issueLabel}</div>
          </div>
        )}
      </div>
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
      className={`notebook-print-stage-section rounded-md p-3 ${
        READINESS_TONE_ACCENT_CLASSES[outputOutcomeTone] ||
        READINESS_TONE_ACCENT_CLASSES.neutral
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
                className="notebook-control notebook-control-repair inline-flex items-center justify-center gap-2 px-3 py-2 text-xs font-semibold transition-colors"
              >
                <Building2 className="h-4 w-4" />
                {tx("label.profileCompleteAction", "Fill profile now")}
              </button>
              <button
                type="button"
                onClick={onUseSupplementalLabel}
                className="notebook-control notebook-control-secondary inline-flex items-center justify-center gap-2 px-3 py-2 text-xs font-semibold transition-colors"
              >
                <Tag className="h-4 w-4" />
                {tx(
                  "label.profileUseIdentificationAction",
                  "Print identification small label instead",
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
            className="notebook-status-chip rounded px-2 py-1 font-medium text-[hsl(var(--notebook-muted-ink))]"
            data-testid="print-outcome-fact"
          >
            {item}
          </span>
        ))}
      </div>
    </section>
  );
}
