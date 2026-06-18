import { Building2, FileText, Printer } from "lucide-react";
import { modalViewportFooterClassName } from "@/components/ui/modalViewport";

export default function LabelPrintFooter({
  canUseFullPagePrimary,
  isProfileBlocked,
  isPrintFitBlocked,
  onClose,
  onFocusResponsibleProfile,
  onPrint,
  onUseFullPagePrimary,
  profileCompleteActionLabel,
  printActionLabel,
  selectedCount,
  useFullPagePrimaryLabel,
  cancelLabel,
}) {
  const canRepairProfile = selectedCount > 0 && isProfileBlocked;

  return (
    <div
      className={modalViewportFooterClassName(
        "flex flex-col gap-3 px-4 py-4 sm:flex-row sm:px-6",
      )}
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
      ) : canRepairProfile ? (
        <button
          type="button"
          onClick={onFocusResponsibleProfile}
          className="notebook-control notebook-control-repair flex flex-1 items-center justify-center gap-2 px-6 py-3 font-medium transition-colors"
          data-testid="fill-profile-footer"
        >
          <Building2 className="h-4 w-4" />
          {profileCompleteActionLabel}
        </button>
      ) : (
        <button
          type="button"
          onClick={onPrint}
          disabled={selectedCount === 0 || isPrintFitBlocked}
          className="notebook-control notebook-control-print flex flex-1 items-center justify-center gap-2 px-6 py-3 font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-50"
          data-testid="print-label-action"
        >
          <Printer className="h-4 w-4" />
          {printActionLabel}
        </button>
      )}
      <button
        type="button"
        onClick={onClose}
        className="notebook-control notebook-control-secondary flex items-center justify-center px-5 py-3 font-medium transition-colors sm:flex-none"
      >
        {cancelLabel}
      </button>
    </div>
  );
}
