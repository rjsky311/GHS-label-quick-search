import { FileText, Printer } from "lucide-react";

export default function LabelPrintFooter({
  canUseFullPagePrimary,
  isPrintFitBlocked,
  onClose,
  onPrint,
  onUseFullPagePrimary,
  printActionLabel,
  selectedCount,
  useFullPagePrimaryLabel,
  cancelLabel,
}) {
  return (
    <div
      className="flex shrink-0 gap-3 border-t border-slate-200 bg-white px-6 py-5"
      data-testid="label-modal-footer"
    >
      {canUseFullPagePrimary ? (
        <button
          type="button"
          onClick={onUseFullPagePrimary}
          className="notebook-control notebook-control-primary flex flex-1 items-center justify-center gap-2 px-6 py-3 font-medium transition-colors"
          data-testid="use-full-page-primary-footer"
        >
          <FileText className="h-4 w-4" />
          {useFullPagePrimaryLabel}
        </button>
      ) : (
        <button
          type="button"
          onClick={onPrint}
          disabled={selectedCount === 0 || isPrintFitBlocked}
          className="notebook-control notebook-control-primary flex flex-1 items-center justify-center gap-2 px-6 py-3 font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-50"
          data-testid="print-label-action"
        >
          <Printer className="h-4 w-4" />
          {printActionLabel}
        </button>
      )}
      <button
        type="button"
        onClick={onClose}
        className="notebook-control notebook-control-secondary px-6 py-3 transition-colors"
      >
        {cancelLabel}
      </button>
    </div>
  );
}
