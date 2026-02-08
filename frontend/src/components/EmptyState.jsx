import { FlaskConical, ClipboardList, Printer, FileSpreadsheet, Star } from "lucide-react";

export default function EmptyState({ onQuickSearch }) {
  return (
    <div className="text-center py-12">
      <FlaskConical className="w-16 h-16 mx-auto mb-4 text-slate-600" />
      <h2 className="text-xl font-semibold text-white mb-2">
        開始查詢化學品 GHS 標籤
      </h2>
      <p className="text-slate-400 max-w-md mx-auto mb-6">
        輸入 CAS 號碼即可查詢化學品的 GHS 危害標示和安全資訊
      </p>

      {/* Quick Examples */}
      <div className="mb-8">
        <p className="text-sm text-slate-500 mb-3">試試看：</p>
        <div className="flex gap-3 justify-center flex-wrap">
          {[
            { cas: "64-17-5", name: "乙醇" },
            { cas: "7732-18-5", name: "水" },
            { cas: "7647-01-0", name: "鹽酸" },
          ].map((ex) => (
            <button
              key={ex.cas}
              onClick={() => onQuickSearch(ex.cas)}
              className="px-4 py-2 bg-slate-800 hover:bg-slate-700 border border-slate-600 hover:border-amber-500/50 text-slate-300 rounded-lg transition-all text-sm"
            >
              <span className="font-mono text-amber-400">{ex.cas}</span>
              <span className="ml-2 text-slate-500">{ex.name}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Feature Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 max-w-3xl mx-auto">
        {[
          { icon: <ClipboardList className="w-6 h-6" />, title: "批次查詢", desc: "一次查詢最多 100 個 CAS 號碼" },
          { icon: <Printer className="w-6 h-6" />, title: "標籤列印", desc: "4 種版型 × 3 種尺寸 × 2 種方向" },
          { icon: <FileSpreadsheet className="w-6 h-6" />, title: "Excel 匯出", desc: "匯出完整 GHS 資訊至試算表" },
          { icon: <Star className="w-6 h-6" />, title: "收藏功能", desc: "收藏常用化學品，隨時快速取用" },
        ].map((feat, i) => (
          <div key={i} className="p-4 bg-slate-800/50 border border-slate-700 rounded-xl text-left">
            <div className="text-amber-400 mb-2">{feat.icon}</div>
            <h3 className="text-sm font-medium text-white mb-1">{feat.title}</h3>
            <p className="text-xs text-slate-500">{feat.desc}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
