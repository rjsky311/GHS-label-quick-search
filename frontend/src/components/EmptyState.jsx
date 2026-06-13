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
    <section
      className="empty-workbench notebook-surface mx-auto max-w-6xl rounded-md px-5 py-6 md:px-7 md:py-8"
      data-testid="empty-workbench"
    >
      <div
        className="grid gap-7 lg:grid-cols-12 lg:items-start"
        data-testid="empty-workbench-grid"
      >
        <div className="lg:col-span-7" data-testid="empty-workbench-primary">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-blue-700">
            {t("empty.kicker")}
          </p>
          <h2 className="mt-3 max-w-2xl text-2xl font-semibold text-slate-950 md:text-3xl">
            {t("empty.title")}
          </h2>
          <p className="mt-3 max-w-2xl text-base leading-7 text-slate-600">
            {t("empty.subtitle")}
          </p>

          <div className="mt-6">
            <p className="mb-3 text-sm font-medium text-slate-500">{t("empty.tryThese")}</p>
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
                  <span className="font-mono text-blue-700">{ex.cas}</span>
                  <span className="ml-2 text-slate-500">{t(ex.nameKey)}</span>
                </Button>
              ))}
            </div>
          </div>

          <div className="mt-7 grid gap-3" data-testid="empty-workbench-workflow">
            {workflow.map(({ key, icon: Icon, titleKey, bodyKey }, index) => (
              <div
                key={titleKey}
                className="notebook-ledger-row flex min-w-0 items-start gap-3 rounded-md p-3.5"
                data-testid={`empty-workflow-card-${key}`}
              >
                <span className="notebook-step-marker flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-sm font-semibold">
                  {index + 1}
                </span>
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <Icon className="h-4 w-4 shrink-0 text-blue-700" aria-hidden="true" />
                    <h3 className="text-sm font-semibold text-slate-950">{t(titleKey)}</h3>
                  </div>
                  <p className="mt-1 text-xs leading-5 text-slate-600">{t(bodyKey)}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="lg:col-span-5" data-testid="empty-workbench-support">
          <div className="relative mx-auto aspect-[3/2] w-full max-w-xl" aria-hidden="true">
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

        <div className="lg:col-span-12" data-testid="empty-workbench-tools">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {features.map(({ key, icon: Icon, titleKey, descKey }) => (
              <div
                key={titleKey}
                className="notebook-status-card rounded-md p-4 text-left"
                data-testid={`empty-feature-card-${key}`}
              >
                <Icon className="mb-2 h-6 w-6 text-blue-700" />
                <h3 className="mb-1 text-sm font-medium text-slate-950">{t(titleKey)}</h3>
                <p className="text-xs leading-5 text-slate-500">{t(descKey)}</p>
              </div>
            ))}
          </div>
        </div>

        {trustPanel ? (
          <div className="lg:col-span-12" data-testid="empty-workbench-trust-slot">
            {trustPanel}
          </div>
        ) : null}
      </div>
    </section>
  );
}
