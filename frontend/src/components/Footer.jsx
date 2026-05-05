import { useTranslation } from "react-i18next";
import { APP_VERSION } from "@/constants/version";

const ISSUE_URL = "https://github.com/rjsky311/GHS-label-quick-search/issues";

export default function Footer() {
  const { t } = useTranslation();

  return (
    <footer className="mt-12 border-t border-slate-200 bg-white py-6">
      <div className="mx-auto flex max-w-7xl flex-col gap-3 px-4 text-sm text-slate-500 md:flex-row md:items-center md:justify-between">
        <div className="space-y-1 text-center md:text-left">
          <p>
            {t("footer.source")}
            <a href="https://pubchem.ncbi.nlm.nih.gov/" target="_blank" rel="noopener noreferrer" className="text-blue-700 transition-colors hover:text-blue-900">
              PubChem (NIH)
            </a>
            {" "}| {t("footer.disclaimer")}
          </p>
          <p>{t("footer.maintainedAsUtility")}</p>
        </div>
        <div className="flex flex-wrap items-center justify-center gap-3 md:justify-end">
          <span className="text-slate-500">v{APP_VERSION}</span>
          <a href={ISSUE_URL} target="_blank" rel="noopener noreferrer" className="font-medium text-slate-600 transition-colors hover:text-slate-900">
            {t("footer.reportIssue")}
          </a>
          <a href={ISSUE_URL} target="_blank" rel="noopener noreferrer" className="rounded-md border border-slate-200 px-3 py-1.5 font-medium text-blue-700 transition-colors hover:bg-blue-50">
            {t("footer.workflowRequest")}
          </a>
        </div>
      </div>
    </footer>
  );
}
