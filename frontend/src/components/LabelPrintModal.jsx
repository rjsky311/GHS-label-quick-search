import {
  Tag, X, Target, ClipboardList, FileText, QrCode,
  BookOpen, FileSpreadsheet, Printer, Lightbulb,
} from "lucide-react";

export default function LabelPrintModal({
  selectedForLabel,
  labelConfig,
  onLabelConfigChange,
  onPrintLabels,
  onToggleSelectForLabel,
  onClose,
}) {
  return (
    <div
      className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="bg-slate-800 rounded-2xl max-w-3xl w-full max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-6 border-b border-slate-700 flex items-center justify-between">
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <Tag className="w-5 h-5 text-purple-400" /> GHS 標籤列印
          </h2>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          {/* Template Selection */}
          <div>
            <h3 className="text-sm font-medium text-slate-400 mb-3">
              選擇版型
            </h3>
            <div className="grid grid-cols-2 gap-3">
              {[
                {
                  value: "icon",
                  label: "圖示版",
                  desc: "名稱 + 圖示 + 警示語",
                  icon: <Target className="w-5 h-5" />,
                  tip: "最精簡，適合小容器"
                },
                {
                  value: "standard",
                  label: "標準版",
                  desc: "圖示 + 警示語 + 3條危害說明",
                  icon: <ClipboardList className="w-5 h-5" />,
                  tip: "常規使用推薦"
                },
                {
                  value: "full",
                  label: "完整版",
                  desc: "所有危害說明（自動縮小字體）",
                  icon: <FileText className="w-5 h-5" />,
                  tip: "需要完整資訊時使用"
                },
                {
                  value: "qrcode",
                  label: "QR Code 版",
                  desc: "基本資訊 + 掃碼查看詳情",
                  icon: <QrCode className="w-5 h-5" />,
                  tip: "掃碼連結 PubChem 完整資料"
                },
              ].map((template) => (
                <button
                  key={template.value}
                  onClick={() => onLabelConfigChange({ ...labelConfig, template: template.value })}
                  className={`p-4 rounded-lg border-2 transition-colors text-left ${
                    labelConfig.template === template.value
                      ? "border-purple-500 bg-purple-500/10"
                      : "border-slate-600 bg-slate-900 hover:border-slate-500"
                  }`}
                >
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-purple-400">{template.icon}</span>
                    <span className={`font-medium ${labelConfig.template === template.value ? "text-purple-400" : "text-white"}`}>
                      {template.label}
                    </span>
                  </div>
                  <div className="text-xs text-slate-400">{template.desc}</div>
                  <div className="text-xs text-slate-500 mt-1">{template.tip}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Label Size Selection */}
          <div>
            <h3 className="text-sm font-medium text-slate-400 mb-3">
              標籤尺寸
            </h3>
            <div className="grid grid-cols-3 gap-3">
              {[
                { value: "small", label: "小", desc: "60×45mm", tip: "小瓶/試管" },
                { value: "medium", label: "中", desc: "80×60mm", tip: "標準瓶" },
                { value: "large", label: "大", desc: "105×80mm", tip: "大容器" },
              ].map((size) => (
                <button
                  key={size.value}
                  onClick={() => onLabelConfigChange({ ...labelConfig, size: size.value })}
                  className={`p-3 rounded-lg border-2 transition-colors ${
                    labelConfig.size === size.value
                      ? "border-amber-500 bg-amber-500/10 text-amber-400"
                      : "border-slate-600 bg-slate-900 text-slate-400 hover:border-slate-500"
                  }`}
                >
                  <div className="font-medium">{size.label}</div>
                  <div className="text-xs opacity-70">{size.desc}</div>
                  <div className="text-xs opacity-50">{size.tip}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Orientation Selection */}
          <div>
            <h3 className="text-sm font-medium text-slate-400 mb-3">
              列印方向
            </h3>
            <div className="grid grid-cols-2 gap-3">
              {[
                { value: "portrait", label: "直向", desc: "A4 直式", icon: <FileText className="w-4 h-4" /> },
                { value: "landscape", label: "橫向", desc: "A4 橫式", icon: <BookOpen className="w-4 h-4" /> },
              ].map((orient) => (
                <button
                  key={orient.value}
                  onClick={() => onLabelConfigChange({ ...labelConfig, orientation: orient.value })}
                  className={`p-3 rounded-lg border-2 transition-colors ${
                    labelConfig.orientation === orient.value
                      ? "border-blue-500 bg-blue-500/10 text-blue-400"
                      : "border-slate-600 bg-slate-900 text-slate-400 hover:border-slate-500"
                  }`}
                >
                  <div className="flex items-center gap-2">
                    {orient.icon}
                    <span className="font-medium">{orient.label}</span>
                  </div>
                  <div className="text-xs opacity-70">{orient.desc}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Page Estimation */}
          {selectedForLabel.length > 0 && (() => {
            const perPageMap = {
              portrait:  { small: 15, medium: 8, large: 3 },
              landscape: { small: 16, medium: 9, large: 4 },
            };
            const perPage = perPageMap[labelConfig.orientation][labelConfig.size];
            const estPages = Math.ceil(selectedForLabel.length / perPage);
            return (
              <div className="bg-slate-900/50 rounded-lg p-3 text-sm text-slate-400">
                <FileSpreadsheet className="w-4 h-4 text-blue-400 inline mr-1" /> 預計列印 <span className="text-white font-medium">{estPages}</span> 頁（每頁 {perPage} 張標籤）
                {labelConfig.size === "small" && <span className="ml-2 text-xs text-slate-500">建議中型以上標籤以獲得最佳閱讀效果</span>}
              </div>
            );
          })()}

          {/* Selected Chemicals */}
          <div>
            <h3 className="text-sm font-medium text-slate-400 mb-3">
              已選擇 {selectedForLabel.length} 個化學品
            </h3>
            <div className="max-h-40 overflow-y-auto space-y-2 bg-slate-900 rounded-lg p-3">
              {selectedForLabel.length === 0 ? (
                <p className="text-slate-500 text-center py-4">
                  尚未選擇任何化學品
                </p>
              ) : (
                selectedForLabel.map((chem, idx) => (
                  <div
                    key={idx}
                    className="flex items-center justify-between p-2 bg-slate-800 rounded"
                  >
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-amber-400 text-sm">
                        {chem.cas_number}
                      </span>
                      <span className="text-white text-sm truncate max-w-[200px]">
                        {chem.name_en}
                      </span>
                      {chem.ghs_pictograms?.length > 0 && (
                        <span className="text-xs text-slate-500">
                          ({chem.ghs_pictograms.length} 個圖示)
                        </span>
                      )}
                    </div>
                    <button
                      onClick={() => onToggleSelectForLabel(chem)}
                      className="text-slate-400 hover:text-red-400 px-2"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Preview hint */}
          <div className="bg-slate-900/50 rounded-lg p-3 text-sm text-slate-400 flex items-start gap-2">
            <Lightbulb className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
            <span>點擊「列印標籤」後會開啟預覽視窗，您可以在列印前確認標籤樣式。</span>
          </div>

          {/* Print Button */}
          <div className="flex gap-3">
            <button
              onClick={onPrintLabels}
              disabled={selectedForLabel.length === 0}
              className="flex-1 px-6 py-3 bg-gradient-to-r from-purple-500 to-purple-600 hover:from-purple-600 hover:to-purple-700 text-white font-medium rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              <Printer className="w-4 h-4" /> 列印標籤 ({selectedForLabel.length} 張)
            </button>
            <button
              onClick={onClose}
              className="px-6 py-3 bg-slate-700 hover:bg-slate-600 text-slate-300 rounded-xl transition-colors"
            >
              取消
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
