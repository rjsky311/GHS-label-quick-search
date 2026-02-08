import { useTranslation } from "react-i18next";

export default function Footer() {
  const { t } = useTranslation();

  return (
    <footer className="border-t border-slate-700 mt-12 py-6">
      <div className="max-w-7xl mx-auto px-4 text-center text-slate-500 text-sm space-y-1">
        <p>
          {t("footer.source")}
          <a href="https://pubchem.ncbi.nlm.nih.gov/" target="_blank" rel="noopener noreferrer" className="text-slate-400 hover:text-amber-400 transition-colors">
            PubChem (NIH)
          </a>
          {" "}| {t("footer.disclaimer")}
        </p>
        <p className="text-slate-600">
          v1.6.0 |{" "}
          <a href="https://github.com/rjsky311/GHS-label-quick-search/issues" target="_blank" rel="noopener noreferrer" className="hover:text-slate-400 transition-colors">
            {t("footer.reportIssue")}
          </a>
        </p>
      </div>
    </footer>
  );
}
