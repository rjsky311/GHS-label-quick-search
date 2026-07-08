import { Building2, Download, FileText, Printer } from "@/components/icons";
import { modalViewportFooterClassName } from "@/components/ui/modalViewport";

export default function LabelPrintFooter({
  canUseFullPagePrimary,
  isProfileBlocked,
  isPrintFitBlocked,
  isPdfExportPrimary = false,
  isPdfExporting = false,
  onClose,
  onFocusResponsibleProfile,
  onPdfExport,
  onPrint,
  onUseFullPagePrimary,
  pdfExportActionLabel,
  pdfExportError = "",
  profileCompleteActionLabel,
  printActionLabel,
  selectedCount,
  useFullPagePrimaryLabel,
  cancelLabel,
}) {
  const canRepairProfile = selectedCount > 0 && isProfileBlocked;
  const actionDisabled = selectedCount === 0 || isPrintFitBlocked || isPdfExporting;
  const hasPdfExport = typeof onPdfExport === "function";
  const primaryAction = isPdfExportPrimary && hasPdfExport
    ? {
        label: pdfExportActionLabel,
        onClick: onPdfExport,
        icon: Download,
        testId: "download-pdf-action",
        className: "notebook-control notebook-control-primary",
      }
    : {
        label: printActionLabel,
        onClick: onPrint,
        icon: Printer,
        testId: "print-label-action",
        className: "notebook-control notebook-control-print",
      };
  const secondaryAction = hasPdfExport
    ? isPdfExportPrimary
      ? {
          label: printActionLabel,
          onClick: onPrint,
          icon: Printer,
          testId: "print-label-action-secondary",
        }
      : {
          label: pdfExportActionLabel,
          onClick: onPdfExport,
          icon: Download,
          testId: "download-pdf-action",
        }
    : null;
  const PrimaryIcon = primaryAction.icon;
  const SecondaryIcon = secondaryAction?.icon;

  return (
    <div
      className={modalViewportFooterClassName(
        "notebook-print-footer flex flex-col gap-3 px-4 py-4 sm:flex-row sm:px-6",
      )}
      data-testid="label-modal-footer"
    >
      {canUseFullPagePrimary ? (
        <button
          type="button"
          onClick={onUseFullPagePrimary}
          className="notebook-control notebook-control-primary flex min-h-11 flex-1 items-center justify-center gap-2 px-6 py-3 font-semibold transition-colors"
          data-testid="use-full-page-primary-footer"
        >
          <FileText className="h-4 w-4" />
          {useFullPagePrimaryLabel}
        </button>
      ) : canRepairProfile ? (
        <button
          type="button"
          onClick={onFocusResponsibleProfile}
          className="notebook-control notebook-control-repair flex min-h-11 flex-1 items-center justify-center gap-2 px-6 py-3 font-semibold transition-colors"
          data-testid="fill-profile-footer"
        >
          <Building2 className="h-4 w-4" />
          {profileCompleteActionLabel}
        </button>
      ) : (
        <div className="flex flex-1 flex-col gap-2 sm:flex-row">
          <button
            type="button"
            onClick={primaryAction.onClick}
            disabled={actionDisabled}
            className={`${primaryAction.className} flex min-h-11 flex-1 items-center justify-center gap-2 px-6 py-3 font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-50`}
            data-testid={primaryAction.testId}
          >
            <PrimaryIcon className="h-4 w-4" />
            {primaryAction.label}
          </button>
          {secondaryAction ? (
            <button
              type="button"
              onClick={secondaryAction.onClick}
              disabled={actionDisabled}
              className="notebook-control notebook-control-secondary flex min-h-11 flex-1 items-center justify-center gap-2 px-5 py-3 font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-50 sm:flex-none"
              data-testid={secondaryAction.testId}
            >
              <SecondaryIcon className="h-4 w-4" />
              {secondaryAction.label}
            </button>
          ) : null}
          {pdfExportError ? (
            <p
              className="text-sm text-[hsl(var(--notebook-danger))] sm:basis-full"
              data-testid="pdf-export-error"
            >
              {pdfExportError}
            </p>
          ) : null}
        </div>
      )}
      <button
        type="button"
        onClick={onClose}
        className="notebook-control notebook-control-secondary flex min-h-11 items-center justify-center px-5 py-3 font-semibold transition-colors sm:flex-none"
      >
        {cancelLabel}
      </button>
    </div>
  );
}
