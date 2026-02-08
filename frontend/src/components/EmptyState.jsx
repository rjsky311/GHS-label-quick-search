import { FlaskConical, ClipboardList, Printer, FileSpreadsheet, Star } from "lucide-react";
import { useTranslation } from "react-i18next";

export default function EmptyState({ onQuickSearch }) {
  const { t } = useTranslation();

  return (
    <div className="text-center py-12">
      <FlaskConical className="w-16 h-16 mx-auto mb-4 text-slate-600" />
      <h2 className="text-xl font-semibold text-white mb-2">
        {t("empty.title")}
      </h2>
      <p className="text-slate-400 max-w-md mx-auto mb-6">
        {t("empty.subtitle")}
      </p>

      {/* Quick Examples */}
      <div className="mb-8">
        <p className="text-sm text-slate-500 mb-3">{t("empty.tryThese")}</p>
        <div className="flex gap-3 justify-center flex-wrap">
          {[
            { cas: "64-17-5", nameKey: "empty.ethanol" },
            { cas: "7732-18-5", nameKey: "empty.water" },
            { cas: "7647-01-0", nameKey: "empty.hcl" },
          ].map((ex) => (
            <button
              key={ex.cas}
              onClick={() => onQuickSearch(ex.cas)}
              className="px-4 py-2 bg-slate-800 hover:bg-slate-700 border border-slate-600 hover:border-amber-500/50 text-slate-300 rounded-lg transition-all text-sm"
            >
              <span className="font-mono text-amber-400">{ex.cas}</span>
              <span className="ml-2 text-slate-500">{t(ex.nameKey)}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Feature Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 max-w-3xl mx-auto">
        {[
          { icon: <ClipboardList className="w-6 h-6" />, titleKey: "empty.featureBatch", descKey: "empty.featureBatchDesc" },
          { icon: <Printer className="w-6 h-6" />, titleKey: "empty.featurePrint", descKey: "empty.featurePrintDesc" },
          { icon: <FileSpreadsheet className="w-6 h-6" />, titleKey: "empty.featureExcel", descKey: "empty.featureExcelDesc" },
          { icon: <Star className="w-6 h-6" />, titleKey: "empty.featureFavorite", descKey: "empty.featureFavoriteDesc" },
        ].map((feat, i) => (
          <div key={i} className="p-4 bg-slate-800/50 border border-slate-700 rounded-xl text-left">
            <div className="text-amber-400 mb-2">{feat.icon}</div>
            <h3 className="text-sm font-medium text-white mb-1">{t(feat.titleKey)}</h3>
            <p className="text-xs text-slate-500">{t(feat.descKey)}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
