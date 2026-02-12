import { useEffect, useRef } from "react";
import { useTranslation } from "react-i18next";
import {
  Tag, X, Target, ClipboardList, FileText, QrCode,
  BookOpen, FileSpreadsheet, Printer, Lightbulb, Languages,
} from "lucide-react";

export default function LabelPrintModal({
  selectedForLabel,
  labelConfig,
  onLabelConfigChange,
  customLabelFields,
  onCustomLabelFieldsChange,
  labelQuantities,
  onLabelQuantitiesChange,
  onPrintLabels,
  onToggleSelectForLabel,
  onClose,
}) {
  const { t } = useTranslation();
  const dialogRef = useRef(null);

  useEffect(() => {
    dialogRef.current?.focus();
    const handleKeyDown = (e) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="label-modal-title"
    >
      <div
        ref={dialogRef}
        tabIndex={-1}
        className="bg-slate-800 rounded-2xl max-w-3xl w-full max-h-[90vh] overflow-y-auto outline-none"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-6 border-b border-slate-700 flex items-center justify-between">
          <h2 id="label-modal-title" className="text-xl font-bold text-white flex items-center gap-2">
            <Tag className="w-5 h-5 text-purple-400" /> {t("label.title")}
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
              {t("label.selectTemplate")}
            </h3>
            <div className="grid grid-cols-2 gap-3">
              {[
                {
                  value: "icon",
                  labelKey: "label.templateIcon",
                  descKey: "label.templateIconDesc",
                  icon: <Target className="w-5 h-5" />,
                  tipKey: "label.templateIconTip"
                },
                {
                  value: "standard",
                  labelKey: "label.templateStandard",
                  descKey: "label.templateStandardDesc",
                  icon: <ClipboardList className="w-5 h-5" />,
                  tipKey: "label.templateStandardTip"
                },
                {
                  value: "full",
                  labelKey: "label.templateFull",
                  descKey: "label.templateFullDesc",
                  icon: <FileText className="w-5 h-5" />,
                  tipKey: "label.templateFullTip"
                },
                {
                  value: "qrcode",
                  labelKey: "label.templateQR",
                  descKey: "label.templateQRDesc",
                  icon: <QrCode className="w-5 h-5" />,
                  tipKey: "label.templateQRTip"
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
                      {t(template.labelKey)}
                    </span>
                  </div>
                  <div className="text-xs text-slate-400">{t(template.descKey)}</div>
                  <div className="text-xs text-slate-500 mt-1">{t(template.tipKey)}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Label Size Selection */}
          <div>
            <h3 className="text-sm font-medium text-slate-400 mb-3">
              {t("label.labelSize")}
            </h3>
            <div className="grid grid-cols-3 gap-3">
              {[
                { value: "small", labelKey: "label.sizeSmall", descKey: "label.sizeSmallDesc", tipKey: "label.sizeSmallTip" },
                { value: "medium", labelKey: "label.sizeMedium", descKey: "label.sizeMediumDesc", tipKey: "label.sizeMediumTip" },
                { value: "large", labelKey: "label.sizeLarge", descKey: "label.sizeLargeDesc", tipKey: "label.sizeLargeTip" },
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
                  <div className="font-medium">{t(size.labelKey)}</div>
                  <div className="text-xs opacity-70">{t(size.descKey)}</div>
                  <div className="text-xs opacity-50">{t(size.tipKey)}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Orientation Selection */}
          <div>
            <h3 className="text-sm font-medium text-slate-400 mb-3">
              {t("label.orientation")}
            </h3>
            <div className="grid grid-cols-2 gap-3">
              {[
                { value: "portrait", labelKey: "label.portrait", descKey: "label.portraitDesc", icon: <FileText className="w-4 h-4" /> },
                { value: "landscape", labelKey: "label.landscape", descKey: "label.landscapeDesc", icon: <BookOpen className="w-4 h-4" /> },
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
                    <span className="font-medium">{t(orient.labelKey)}</span>
                  </div>
                  <div className="text-xs opacity-70">{t(orient.descKey)}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Name Display Mode */}
          <div>
            <h3 className="text-sm font-medium text-slate-400 mb-3">
              {t("label.nameDisplay")}
            </h3>
            <div className="grid grid-cols-3 gap-3">
              {[
                { value: "both", labelKey: "label.nameBoth", descKey: "label.nameBothDesc", icon: <Languages className="w-4 h-4" /> },
                { value: "en", labelKey: "label.nameEn", icon: <span className="text-sm font-bold">EN</span> },
                { value: "zh", labelKey: "label.nameZh", icon: <span className="text-sm font-bold">中</span> },
              ].map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => onLabelConfigChange({ ...labelConfig, nameDisplay: opt.value })}
                  className={`p-3 rounded-lg border-2 transition-colors ${
                    labelConfig.nameDisplay === opt.value
                      ? "border-green-500 bg-green-500/10 text-green-400"
                      : "border-slate-600 bg-slate-900 text-slate-400 hover:border-slate-500"
                  }`}
                >
                  <div className="flex items-center gap-2 justify-center">
                    {opt.icon}
                    <span className="font-medium">{t(opt.labelKey)}</span>
                  </div>
                  {opt.descKey && <div className="text-xs opacity-70 mt-1">{t(opt.descKey)}</div>}
                </button>
              ))}
            </div>
          </div>

          {/* Custom Label Fields */}
          <div>
            <h3 className="text-sm font-medium text-slate-400 mb-3">
              {t("label.customFields")}
            </h3>
            <div className="grid grid-cols-1 gap-2">
              {[
                { key: "labName", labelKey: "label.labName", placeholderKey: "label.labNamePlaceholder" },
                { key: "date", labelKey: "label.printDate", placeholderKey: "label.printDatePlaceholder" },
                { key: "batchNumber", labelKey: "label.batchNumber", placeholderKey: "label.batchNumberPlaceholder" },
              ].map((field) => (
                <div key={field.key} className="flex items-center gap-2">
                  <label className="text-xs text-slate-500 w-16 shrink-0">{t(field.labelKey)}</label>
                  <input
                    type="text"
                    value={customLabelFields[field.key]}
                    onChange={(e) => onCustomLabelFieldsChange({ ...customLabelFields, [field.key]: e.target.value })}
                    placeholder={t(field.placeholderKey)}
                    className="flex-1 bg-slate-900 border border-slate-600 rounded-md px-2 py-1.5 text-sm text-slate-300 placeholder:text-slate-600 focus:border-blue-500 focus:outline-none"
                  />
                </div>
              ))}
            </div>
            <p className="text-xs text-slate-600 mt-1.5">{t("label.customFieldsHint")}</p>
          </div>

          {/* Page Estimation */}
          {selectedForLabel.length > 0 && (() => {
            const perPageMap = {
              portrait:  { small: 15, medium: 8, large: 3 },
              landscape: { small: 16, medium: 9, large: 4 },
            };
            const perPage = perPageMap[labelConfig.orientation][labelConfig.size];
            const totalLabels = selectedForLabel.reduce(
              (sum, chem) => sum + (labelQuantities?.[chem.cas_number] || 1), 0
            );
            const estPages = Math.ceil(totalLabels / perPage);
            return (
              <div className="bg-slate-900/50 rounded-lg p-3 text-sm text-slate-400">
                <FileSpreadsheet className="w-4 h-4 text-blue-400 inline mr-1" /> {t("label.estPages", { pages: estPages, perPage })}
                {totalLabels !== selectedForLabel.length && (
                  <span className="ml-2 text-xs text-slate-500">{t("label.totalLabels", { count: totalLabels })}</span>
                )}
                {labelConfig.size === "small" && <span className="ml-2 text-xs text-slate-500">{t("label.smallSizeHint")}</span>}
              </div>
            );
          })()}

          {/* Selected Chemicals */}
          <div>
            <h3 className="text-sm font-medium text-slate-400 mb-3">
              {t("label.selectedCount", { count: selectedForLabel.length })}
            </h3>
            <div className="max-h-40 overflow-y-auto space-y-2 bg-slate-900 rounded-lg p-3">
              {selectedForLabel.length === 0 ? (
                <p className="text-slate-500 text-center py-4">
                  {t("label.noneSelected")}
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
                          {t("label.pictogramCount", { count: chem.ghs_pictograms.length })}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      {/* Per-chemical quantity controls */}
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => {
                            const cur = labelQuantities?.[chem.cas_number] || 1;
                            if (cur > 1) onLabelQuantitiesChange({ ...labelQuantities, [chem.cas_number]: cur - 1 });
                          }}
                          disabled={(labelQuantities?.[chem.cas_number] || 1) <= 1}
                          className="w-6 h-6 rounded bg-slate-700 hover:bg-slate-600 text-slate-300 text-xs flex items-center justify-center disabled:opacity-30 disabled:cursor-not-allowed"
                        >−</button>
                        <span className="w-6 text-center text-sm text-white">
                          {labelQuantities?.[chem.cas_number] || 1}
                        </span>
                        <button
                          onClick={() => {
                            const cur = labelQuantities?.[chem.cas_number] || 1;
                            if (cur < 20) onLabelQuantitiesChange({ ...labelQuantities, [chem.cas_number]: cur + 1 });
                          }}
                          disabled={(labelQuantities?.[chem.cas_number] || 1) >= 20}
                          className="w-6 h-6 rounded bg-slate-700 hover:bg-slate-600 text-slate-300 text-xs flex items-center justify-center disabled:opacity-30 disabled:cursor-not-allowed"
                        >+</button>
                      </div>
                      <button
                        onClick={() => onToggleSelectForLabel(chem)}
                        className="text-slate-400 hover:text-red-400 px-2"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Preview hint */}
          <div className="bg-slate-900/50 rounded-lg p-3 text-sm text-slate-400 flex items-start gap-2">
            <Lightbulb className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
            <span>{t("label.previewHint")}</span>
          </div>

          {/* Print Button */}
          <div className="flex gap-3">
            <button
              onClick={onPrintLabels}
              disabled={selectedForLabel.length === 0}
              className="flex-1 px-6 py-3 bg-gradient-to-r from-purple-500 to-purple-600 hover:from-purple-600 hover:to-purple-700 text-white font-medium rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              <Printer className="w-4 h-4" /> {t("label.printBtn", { count: selectedForLabel.reduce((sum, chem) => sum + (labelQuantities?.[chem.cas_number] || 1), 0) })}
            </button>
            <button
              onClick={onClose}
              className="px-6 py-3 bg-slate-700 hover:bg-slate-600 text-slate-300 rounded-xl transition-colors"
            >
              {t("label.cancel")}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
