import {
  CheckCircle2,
  ExternalLink,
  FileCheck2,
  MessageSquarePlus,
  ShieldCheck,
} from "lucide-react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import {
  SUPPORT_REPORT_DATA_URL,
  buildDataCorrectionContext,
  buildWorkflowRequestUrl,
} from "@/constants/supportLinks";

export default function ProductTrustPanel({
  variant = "empty",
  embedded = false,
  onOpenDataCorrection,
}) {
  const { t } = useTranslation();
  const isCompact = variant === "results";
  const dataCorrectionContext = buildDataCorrectionContext({
    issueType: "other-data-quality",
    currentOutput:
      "I found a possible data problem while using the public search tool.",
    expectedOutput:
      "Route this report into the admin correction queue before any dictionary or reference change is approved.",
    evidenceType: "SDS, supplier label, catalog, or regulatory source",
    localContext:
      "General data-quality report from the product trust surface.",
  });
  const workflowRequestUrl = buildWorkflowRequestUrl(
    isCompact
      ? {
          workflowArea: "Search results, SDS review, export, or label handoff",
          goal: "I need help completing the next step after search results appear.",
          currentProblem:
            "The current result, SDS/reference, export, or label path is hard to complete from the results view.",
          desiredBehavior:
            "Keep the safety-data correction path separate, and describe the workflow improvement that would make the task easier.",
          examples:
            "Examples: batch labels, prepared-solution reprint, SDS review, export columns, or label preview handoff.",
        }
      : {
          workflowArea: "First-time search and label workflow",
          goal: "I need help using the tool for a repeated lab or operations workflow.",
          currentProblem:
            "The current search-to-decision path, label output, or support flow does not match the workflow I need.",
          desiredBehavior:
            "Describe the workflow outcome without mixing it with a data-correction request.",
          examples:
            "Examples: batch search, QR lookup, complete labels, small identification labels, or lab template support.",
        },
  );

  const cards = [
    {
      id: "source",
      icon: ShieldCheck,
      titleKey: "productTrust.sourceTitle",
      bodyKey: "productTrust.sourceBody",
    },
    {
      id: "label",
      icon: FileCheck2,
      titleKey: "productTrust.noAdsTitle",
      bodyKey: "productTrust.noAdsBody",
    },
    {
      id: "feedback",
      icon: MessageSquarePlus,
      titleKey: "productTrust.feedbackTitle",
      bodyKey: "productTrust.feedbackBody",
    },
  ];
  const panelClassName = isCompact
    ? "notebook-trust-strip notebook-warm-note rounded-md px-4 py-4 text-left"
    : embedded
      ? "notebook-trust-strip notebook-warm-note rounded-md px-5 py-5 text-left"
      : "notebook-panel notebook-warm-note mx-auto mt-8 max-w-5xl rounded-md px-5 py-5 text-left";
  const innerClassName = isCompact
    ? "grid gap-4 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.8fr)]"
    : "space-y-4";

  return (
    <section
      className={panelClassName}
      aria-label={t("productTrust.ariaLabel")}
      data-testid={`product-trust-panel-${variant}`}
      data-layout={embedded ? "embedded" : isCompact ? "compact" : "standalone"}
    >
      <div className={innerClassName}>
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[hsl(var(--notebook-action))]">
            {t("productTrust.kicker")}
          </p>
          <h2 className={`${isCompact ? "mt-1 text-base" : "mt-2 text-lg"} font-semibold text-[hsl(var(--notebook-ink))]`}>
            {t(isCompact ? "productTrust.resultsTitle" : "productTrust.title")}
          </h2>
          <p className="mt-2 text-sm leading-6 text-[hsl(var(--notebook-muted-ink))]">
            {t(isCompact ? "productTrust.resultsBody" : "productTrust.body")}
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            <Button
              asChild
              variant="notebookPrimary"
              size="notebook"
              className="px-3"
            >
              <a
                href={SUPPORT_REPORT_DATA_URL}
                onClick={
                  onOpenDataCorrection
                    ? (event) => {
                        event.preventDefault();
                        onOpenDataCorrection(dataCorrectionContext);
                      }
                    : undefined
                }
                target="_blank"
                rel="noopener noreferrer"
                data-testid={`product-trust-report-link-${variant}`}
              >
                {t("productTrust.reportDataCta")}
                <ExternalLink className="h-3.5 w-3.5" />
              </a>
            </Button>
            <Button
              asChild
              variant="notebookSecondary"
              size="notebook"
              className="px-3"
            >
              <a
                href={workflowRequestUrl}
                target="_blank"
                rel="noopener noreferrer"
                data-testid={`product-trust-workflow-link-${variant}`}
              >
                {t("productTrust.requestWorkflowCta")}
                <ExternalLink className="h-3.5 w-3.5" />
              </a>
            </Button>
          </div>
        </div>

        <div
          className={`grid gap-3 ${isCompact ? "sm:grid-cols-3" : "md:grid-cols-3"}`}
          data-testid={`product-trust-proof-list-${variant}`}
        >
          {cards.map(({ id, icon: Icon, titleKey, bodyKey }) => (
            <div
              key={titleKey}
              className="notebook-status-card notebook-trust-item flex min-w-0 items-start gap-2 rounded-md p-3 text-sm"
              data-testid={`product-trust-proof-card-${variant}-${id}`}
            >
              <span className="mt-0.5 inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-md border border-[hsl(var(--notebook-action-border)/0.3)] bg-[hsl(var(--notebook-action-soft))] text-[hsl(var(--notebook-action))]">
                {isCompact ? (
                  <CheckCircle2 className="h-4 w-4" />
                ) : (
                  <Icon className="h-4 w-4" />
                )}
              </span>
              <div className="min-w-0">
                <h3 className="font-medium text-[hsl(var(--notebook-ink))]">{t(titleKey)}</h3>
                <p className="mt-1 text-xs leading-5 text-[hsl(var(--notebook-muted-ink))]">{t(bodyKey)}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
