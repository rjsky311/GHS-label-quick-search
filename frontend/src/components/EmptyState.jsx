import {
  ClipboardCheck,
  ClipboardList,
  FileSpreadsheet,
  Printer,
  Search,
  ShieldCheck,
  Star,
} from "lucide-react";
import { useTranslation } from "react-i18next";
import emptyWorkflowVisual from "@/assets/generated/ghs-empty-workflow.webp";
import { Button } from "@/components/ui/button";

export default function EmptyState({ onQuickSearch, trustPanel = null }) {
  const { t } = useTranslation();
  const examples = [
    { cas: "64-17-5", nameKey: "empty.ethanol" },
    { cas: "7732-18-5", nameKey: "empty.water" },
    { cas: "7647-01-0", nameKey: "empty.hcl" },
  ];
  const workflow = [
    {
      key: "search",
      icon: Search,
      titleKey: "empty.workflowSearch",
      bodyKey: "empty.workflowSearchDesc",
    },
    {
      key: "review",
      icon: ShieldCheck,
      titleKey: "empty.workflowReview",
      bodyKey: "empty.workflowReviewDesc",
    },
    {
      key: "use",
      icon: ClipboardCheck,
      titleKey: "empty.workflowUse",
      bodyKey: "empty.workflowUseDesc",
    },
  ];
  const features = [
    {
      key: "batch",
      icon: ClipboardList,
      titleKey: "empty.featureBatch",
      descKey: "empty.featureBatchDesc",
    },
    {
      key: "print",
      icon: Printer,
      titleKey: "empty.featurePrint",
      descKey: "empty.featurePrintDesc",
    },
    {
      key: "excel",
      icon: FileSpreadsheet,
      titleKey: "empty.featureExcel",
      descKey: "empty.featureExcelDesc",
    },
    {
      key: "favorite",
      icon: Star,
      titleKey: "empty.featureFavorite",
      descKey: "empty.featureFavoriteDesc",
    },
  ];

  return (
    <section className="pt-2 pb-8 md:pt-3 md:pb-10" data-testid="empty-state">
      <div
        className="empty-workbench notebook-surface notebook-workbench-sheet w-full rounded-md px-4 py-5 sm:px-5 md:px-7 md:py-8"
        data-testid="empty-workbench"
      >
        <div
          className="empty-workbench-grid grid gap-5 md:gap-6 lg:grid-cols-12 lg:items-start lg:gap-7"
          data-testid="empty-workbench-grid"
        >
          <div
            className="empty-workbench-primary min-w-0 text-left lg:col-span-8"
            data-testid="empty-workbench-primary"
          >
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[hsl(var(--notebook-action))]">
              {t("empty.kicker")}
            </p>
            <h2 className="mt-3 max-w-2xl text-2xl font-semibold text-[hsl(var(--notebook-ink))] md:text-3xl">
              {t("empty.title")}
            </h2>
            <p className="mt-3 max-w-2xl text-base leading-7 text-[hsl(var(--notebook-muted-ink))]">
              {t("empty.subtitle")}
            </p>

            <div className="mt-6">
              <p className="mb-3 text-sm font-medium text-[hsl(var(--notebook-muted-ink))]">
                {t("empty.tryThese")}
              </p>
              <div className="flex flex-wrap gap-3">
                {examples.map((ex) => (
                  <Button
                    key={ex.cas}
                    type="button"
                    onClick={() => onQuickSearch(ex.cas)}
                    variant="notebookSecondary"
                    size="notebook"
                    className="px-4"
                  >
                    <span className="font-mono text-[hsl(var(--notebook-action))]">
                      {ex.cas}
                    </span>
                    <span className="ml-2 text-[hsl(var(--notebook-muted-ink))]">
                      {t(ex.nameKey)}
                    </span>
                  </Button>
                ))}
              </div>
            </div>

            <div
              className="notebook-process-strip mt-7 grid gap-0 rounded-md md:grid-cols-3"
              data-testid="empty-workbench-workflow"
            >
              {workflow.map(({ key, icon: Icon, titleKey, bodyKey }, index) => (
                <div
                  key={titleKey}
                  className="notebook-process-step flex min-w-0 items-start gap-3 px-3.5 py-3"
                  data-testid={`empty-workflow-card-${key}`}
                >
                  <span className="notebook-step-marker flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-sm font-semibold">
                    {index + 1}
                  </span>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <Icon
                        className="h-4 w-4 shrink-0 text-[hsl(var(--notebook-action))]"
                        aria-hidden="true"
                      />
                      <h3 className="text-sm font-semibold text-[hsl(var(--notebook-ink))]">
                        {t(titleKey)}
                      </h3>
                    </div>
                    <p className="mt-1 text-xs leading-5 text-[hsl(var(--notebook-muted-ink))]">
                      {t(bodyKey)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div
            className="empty-workbench-support min-w-0 lg:col-span-4"
            data-testid="empty-workbench-support"
          >
            <div
              className="notebook-visual-plate relative mx-auto aspect-[4/3] w-full max-w-md lg:ml-auto"
              aria-hidden="true"
            >
              <img
                src={emptyWorkflowVisual}
                alt=""
                className="h-full w-full object-contain"
                decoding="async"
                data-testid="empty-visual-asset"
              />
              <div className="notebook-panel absolute bottom-3 right-3 rounded-md px-3 py-2 text-xs font-medium backdrop-blur">
                {t("empty.visualBadge")}
              </div>
            </div>
          </div>

          <div
            className="empty-workbench-tools notebook-feature-ledger min-w-0 rounded-md px-4 py-4 lg:col-span-12"
            data-testid="empty-workbench-tools"
          >
            <div className="flex flex-col gap-1 sm:flex-row sm:items-baseline sm:justify-between">
              <h3
                className="text-sm font-semibold text-[hsl(var(--notebook-ink))]"
                data-testid="empty-feature-heading"
              >
                {t("empty.featureHeading")}
              </h3>
              <p className="text-xs leading-5 text-[hsl(var(--notebook-muted-ink))]">
                {t("empty.featureSummary")}
              </p>
            </div>
            <div
              className="mt-3 grid gap-x-5 gap-y-3 sm:grid-cols-2 lg:grid-cols-4"
              data-testid="empty-workbench-tool-grid"
            >
              {features.map(({ key, icon: Icon, titleKey, descKey }) => (
                <div
                  key={titleKey}
                  className="notebook-feature-note flex min-w-0 gap-2.5 text-left"
                  data-testid={`empty-feature-card-${key}`}
                >
                  <span className="notebook-feature-icon mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center">
                    <Icon className="h-4 w-4" aria-hidden="true" />
                  </span>
                  <div className="min-w-0">
                    <h3 className="mb-1 text-sm font-medium text-[hsl(var(--notebook-ink))]">
                      {t(titleKey)}
                    </h3>
                    <p className="text-xs leading-5 text-[hsl(var(--notebook-muted-ink))]">
                      {t(descKey)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {trustPanel ? (
            <div
              className="empty-workbench-trust-slot notebook-workbench-divider min-w-0 lg:col-span-12"
              data-testid="empty-workbench-trust-slot"
            >
              {trustPanel}
            </div>
          ) : null}
        </div>
      </div>
    </section>
  );
}
