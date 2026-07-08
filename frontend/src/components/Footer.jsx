import { useTranslation } from "react-i18next";
import { APP_VERSION } from "@/constants/version";
import {
  SUPPORT_REPORT_DATA_URL,
  SUPPORT_WORKFLOW_REQUEST_URL,
} from "@/constants/supportLinks";

export default function Footer() {
  const { t } = useTranslation();

  return (
    <footer className="notebook-footer mt-12 border-[hsl(var(--notebook-border)/0.72)] py-6">
      <div className="mx-auto flex max-w-7xl flex-col gap-3 px-4 text-sm md:flex-row md:items-center md:justify-between">
        <div className="space-y-1 text-center md:text-left">
          <p>
            {t("footer.source")}
            <a href="https://pubchem.ncbi.nlm.nih.gov/" target="_blank" rel="noopener noreferrer" className="notebook-tone-action transition-colors hover:text-[hsl(var(--notebook-action-border))]">
              PubChem (NIH)
            </a>
            {" "}| {t("footer.disclaimer")}
          </p>
          <p>{t("footer.maintainedAsUtility")}</p>
        </div>
        <div className="flex flex-wrap items-center justify-center gap-3 md:justify-end">
          <span className="notebook-footer-version rounded px-2 py-1 text-xs">
            v{APP_VERSION}
          </span>
          <a href={SUPPORT_REPORT_DATA_URL} target="_blank" rel="noopener noreferrer" className="notebook-report-link rounded px-3 py-1.5 font-medium transition-colors">
            {t("footer.reportIssue")}
          </a>
          <a href={SUPPORT_WORKFLOW_REQUEST_URL} target="_blank" rel="noopener noreferrer" className="notebook-inline-action rounded-md px-3 py-1.5 font-medium notebook-tone-action transition-colors hover:bg-[hsl(var(--notebook-action-soft)/0.58)]">
            {t("footer.workflowRequest")}
          </a>
        </div>
      </div>
    </footer>
  );
}
