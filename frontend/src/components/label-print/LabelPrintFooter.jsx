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
          className="flex flex-1 items-center justify-center gap-2 rounded-md bg-blue-700 px-6 py-3 font-medium text-white transition-colors hover:bg-blue-800"
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
          className="flex flex-1 items-center justify-center gap-2 rounded-md bg-blue-700 px-6 py-3 font-medium text-white transition-colors hover:bg-blue-800 disabled:cursor-not-allowed disabled:opacity-50"
          data-testid="print-label-action"
        >
          <Printer className="h-4 w-4" />
          {printActionLabel}
        </button>
      )}
      <button
        type="button"
        onClick={onClose}
        className="rounded-md border border-slate-300 bg-white px-6 py-3 text-slate-700 transition-colors hover:bg-slate-50"
      >
        {cancelLabel}
      </button>
    </div>
  );
}
