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

export default function EmptyState({ onQuickSearch }) {
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
    <section className="py-8 md:py-10" data-testid="empty-state">
      <div className="mx-auto grid max-w-6xl items-center gap-8 lg:grid-cols-[1.05fr_0.95fr]">
        <div className="text-left">
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

          <div className="mt-7 grid gap-3 sm:grid-cols-3">
            {workflow.map(({ key, icon: Icon, titleKey, bodyKey }) => (
              <div
                key={titleKey}
                className="notebook-panel rounded-md p-4"
                data-testid={`empty-workflow-card-${key}`}
              >
                <Icon className="h-5 w-5 text-blue-700" />
                <h3 className="mt-3 text-sm font-semibold text-slate-950">{t(titleKey)}</h3>
                <p className="mt-1 text-xs leading-5 text-slate-600">{t(bodyKey)}</p>
              </div>
            ))}
          </div>
        </div>

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

      <div className="mx-auto mt-8 grid max-w-5xl grid-cols-2 gap-3 md:grid-cols-4">
        {features.map(({ key, icon: Icon, titleKey, descKey }) => (
          <div
            key={titleKey}
            className="notebook-panel rounded-md p-4 text-left"
            data-testid={`empty-feature-card-${key}`}
          >
            <Icon className="mb-2 h-6 w-6 text-blue-700" />
            <h3 className="mb-1 text-sm font-medium text-slate-950">{t(titleKey)}</h3>
            <p className="text-xs leading-5 text-slate-500">{t(descKey)}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
