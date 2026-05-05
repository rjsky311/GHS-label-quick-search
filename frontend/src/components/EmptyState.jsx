import { FlaskConical, ClipboardList, Printer, FileSpreadsheet, Star } from "lucide-react";
import { useTranslation } from "react-i18next";

export default function EmptyState({ onQuickSearch }) {
  const { t } = useTranslation();

  return (
    <div className="py-12 text-center">
      <FlaskConical className="mx-auto mb-4 h-16 w-16 text-blue-700" />
      <h2 className="mb-2 text-xl font-semibold text-slate-950">
        {t("empty.title")}
      </h2>
      <p className="mx-auto mb-6 max-w-md text-slate-600">
        {t("empty.subtitle")}
      </p>

      {/* Quick Examples */}
      <div className="mb-8">
        <p className="mb-3 text-sm text-slate-500">{t("empty.tryThese")}</p>
        <div className="flex flex-wrap justify-center gap-3">
          {[
            { cas: "64-17-5", nameKey: "empty.ethanol" },
            { cas: "7732-18-5", nameKey: "empty.water" },
            { cas: "7647-01-0", nameKey: "empty.hcl" },
          ].map((ex) => (
            <button
              key={ex.cas}
              onClick={() => onQuickSearch(ex.cas)}
              className="rounded-md border border-slate-200 bg-white px-4 py-2 text-sm text-slate-700 shadow-sm transition-all hover:border-blue-300 hover:bg-blue-50"
            >
              <span className="font-mono text-blue-700">{ex.cas}</span>
              <span className="ml-2 text-slate-500">{t(ex.nameKey)}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Feature Cards */}
      <div className="mx-auto grid max-w-3xl grid-cols-2 gap-3 md:grid-cols-4">
        {[
          { icon: <ClipboardList className="w-6 h-6" />, titleKey: "empty.featureBatch", descKey: "empty.featureBatchDesc" },
          { icon: <Printer className="w-6 h-6" />, titleKey: "empty.featurePrint", descKey: "empty.featurePrintDesc" },
          { icon: <FileSpreadsheet className="w-6 h-6" />, titleKey: "empty.featureExcel", descKey: "empty.featureExcelDesc" },
          { icon: <Star className="w-6 h-6" />, titleKey: "empty.featureFavorite", descKey: "empty.featureFavoriteDesc" },
        ].map((feat, i) => (
          <div key={i} className="rounded-md border border-slate-200 bg-white p-4 text-left shadow-sm">
            <div className="mb-2 text-blue-700">{feat.icon}</div>
            <h3 className="mb-1 text-sm font-medium text-slate-950">{t(feat.titleKey)}</h3>
            <p className="text-xs text-slate-500">{t(feat.descKey)}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
