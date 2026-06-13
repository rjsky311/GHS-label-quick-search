import { useCallback, useEffect } from "react";
import {
  Star,
  X,
  Copy,
  LayoutGrid,
  Lightbulb,
  Tag,
  ExternalLink,
  ShieldCheck,
  Clock,
  Database,
  Info,
  FlaskConical,
} from "lucide-react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import GHSPictogramStrip from "@/components/GHSPictogramStrip";
import ClassificationComparisonTable from "@/components/ClassificationComparisonTable";
import {
  buildDataCorrectionContext,
  buildDataCorrectionUrl,
} from "@/constants/supportLinks";
import { getReferenceLinks } from "@/utils/sdsLinks";
import { formatRelativeTime } from "@/utils/formatDate";
import { hasGhsData } from "@/utils/ghsAvailability";
import AuthoritativeSourceNote from "@/components/AuthoritativeSourceNote";
import { Button } from "@/components/ui/button";
import {
  modalViewportBodyClassName,
  modalViewportOverlayClassName,
  modalViewportPanelClassName,
} from "@/components/ui/modalViewport";
import useFocusTrap from "@/hooks/useFocusTrap";
import {
  getLocalizedNames,
  getLocalizedPictogramName,
  getLocalizedSignalWord,
  getLocalizedStatementText,
  resolveEnglishName,
  resolveTrustedChineseName,
} from "@/utils/ghsText";

const getSourceSummary = (source, t) => {
  if (!source) return t("detail.trustSourceUnknown");
  const normalized = source.toLowerCase();
  if (normalized.includes("echa")) return t("results.sourceEcha");
  if (normalized.includes("pubchem")) return t("results.sourcePubChem");
  return source;
};

const getClassificationSummary = (effective, reportCount, t) => {
  if (effective?.isCustom) return t("detail.trustCustomOverride");
  if (!hasGhsData(effective)) return t("detail.trustNoGhs");
  if (reportCount) return t("detail.trustReportCount", { count: reportCount });
  return t("detail.trustSourceUnknown");
};

const hasPictogramData = (classification) =>
  (classification?.pictograms || classification?.ghs_pictograms || []).length > 0;

export default function DetailModal({
  result,
  onClose,
  onToggleFavorite,
  isFavorited,
  getEffectiveClassification,
  customGHSSettings,
  onSetCustomClassification,
  hasCustomClassification,
  onClearCustomClassification,
  onPrintLabel,
  onPrepareSolution,
  onOpenDataCorrection,
  // When another modal (e.g. PrepareSolutionModal) is stacked on top
  // of this one, the parent passes `suppressed={true}` so this dialog:
  //   - becomes `inert` (nothing inside is focusable / clickable /
  //     announced by screen readers)
  //   - gets `aria-hidden="true"` as a fallback for older AT
  //   - drops `aria-modal` so only the topmost modal is announced
  //     as the active modal dialog
  // This closes the long-standing stacked-aria-modal debt without
  // unmounting DetailModal (which would blow away its focus / scroll
  // state for when the user cancels back to it).
  suppressed = false,
}) {
  const { t, i18n } = useTranslation();
  const dialogRef = useFocusTrap(onClose, {
    disabled: suppressed,
    disableEscape: suppressed,
  });
  const displayLocale = i18n.language;

  const copyCAS = useCallback((cas) => {
    navigator.clipboard.writeText(cas).then(() => {
      toast.success(t("detail.copyCAS", { cas }));
    });
  }, [t]);

  useEffect(() => {
    // Don't pull focus while a higher modal is stacked on top of us:
    // the stacked modal owns focus +
    // Escape. `useFocusTrap` is disabled in the same state, so this
    // dialog also stops trapping Tab behind the top layer.
    if (suppressed) return;
    dialogRef.current?.focus();
  }, [dialogRef, suppressed]);

  const effective = getEffectiveClassification(result) || {
    pictograms: result.ghs_pictograms || [],
    hazard_statements: result.hazard_statements || [],
    precautionary_statements: result.precautionary_statements || [],
    signal_word: result.signal_word,
    signal_word_zh: result.signal_word_zh,
    isCustom: false,
    customIndex: 0,
  };
  const allClassifications = [
    {
      pictograms: result.ghs_pictograms || [],
      hazard_statements: result.hazard_statements || [],
      precautionary_statements: result.precautionary_statements || [],
      signal_word: result.signal_word,
      signal_word_zh: result.signal_word_zh,
    },
    ...(result.other_classifications || [])
  ];
  const effectiveHasGhsData = hasGhsData(effective);
  const effectiveHasPictograms = hasPictogramData(effective);
  const canPrintHazardLabel = result.found && effectiveHasGhsData;
  const shouldShowClassificationComparison =
    allClassifications.length > 1 && allClassifications.some(hasGhsData);
  const referenceLinks = getReferenceLinks(result);
  const displayNames = getLocalizedNames(result, displayLocale);
  const englishName = resolveEnglishName(result);
  const trustedChineseName = resolveTrustedChineseName(result);
  const buildDetailCorrectionUrl = (issueType) =>
    buildDataCorrectionUrl({
      casNumber: result.cas_number,
      nameEn: englishName,
      nameZh: trustedChineseName,
      issueType,
    });
  const buildDetailCorrectionContext = (issueType) =>
    buildDataCorrectionContext({
      casNumber: result.cas_number,
      nameEn: englishName,
      nameZh: trustedChineseName,
      issueType,
      queryText: result.query || result.cas_number,
    });
  const renderCorrectionAction = ({
    context,
    href,
    testId,
    className,
    label,
    iconClassName,
  }) =>
    onOpenDataCorrection && context ? (
      <a
        href={href}
        onClick={(event) => {
          event.preventDefault();
          onOpenDataCorrection(context);
        }}
        className={className}
        data-testid={testId}
      >
        <ExternalLink className={iconClassName} />
        {label}
      </a>
    ) : (
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        className={className}
        data-testid={testId}
      >
        <ExternalLink className={iconClassName} />
        {label}
      </a>
    );
  const missingChineseNameReportUrl =
    result.found && englishName && !trustedChineseName
      ? buildDetailCorrectionUrl("missing-chinese-name")
      : "";
  const missingChineseNameReportContext =
    result.found && englishName && !trustedChineseName
      ? buildDetailCorrectionContext("missing-chinese-name")
      : null;
  const sourceConflictReportUrl =
    result.found &&
    (result.has_multiple_classifications || result.other_classifications?.length > 0)
      ? buildDetailCorrectionUrl("source-conflict")
      : "";
  const sourceConflictReportContext =
    result.found &&
    (result.has_multiple_classifications || result.other_classifications?.length > 0)
      ? buildDetailCorrectionContext("source-conflict")
      : null;
  const ghsGapReportUrl =
    result.found && !effectiveHasGhsData
      ? buildDetailCorrectionUrl("no-ghs-data")
      : "";
  const ghsGapReportContext =
    result.found && !effectiveHasGhsData
      ? buildDetailCorrectionContext("no-ghs-data")
      : null;
  const pictogramGapReportUrl =
    result.found && effectiveHasGhsData && !effectiveHasPictograms
      ? buildDetailCorrectionUrl("ghs-text-no-pictograms")
      : "";
  const pictogramGapReportContext =
    result.found && effectiveHasGhsData && !effectiveHasPictograms
      ? buildDetailCorrectionContext("ghs-text-no-pictograms")
      : null;
  const effectiveSource = effective?.source || result.primary_source;
  const effectiveReportCount = effective?.report_count || result.primary_report_count;
  const trustSummaryItems = [
    {
      key: "source",
      icon: Database,
      label: t("detail.trustSource"),
      value: getSourceSummary(effectiveSource, t),
    },
    {
      key: "retrieved",
      icon: Clock,
      label: t("detail.trustRetrieved"),
      value: result.retrieved_at
        ? formatRelativeTime(result.retrieved_at)
        : t("detail.trustRetrievedUnknown"),
      title: result.retrieved_at || undefined,
    },
    {
      key: "classification",
      icon: ShieldCheck,
      label: t("detail.trustClassification"),
      value: getClassificationSummary(effective, effectiveReportCount, t),
    },
    {
      key: "references",
      icon: ExternalLink,
      label: t("detail.trustReferences"),
      value:
        referenceLinks.length > 0
          ? t("detail.trustReferenceCount", { count: referenceLinks.length })
          : t("detail.trustNoReferences"),
    },
  ];

  const getReferenceLinkClassName = (linkType) => {
    const baseClassName =
      "notebook-inline-action inline-flex items-center gap-2 rounded-md px-4 py-2 text-sm font-medium";
    if (linkType === "sds") {
      return `${baseClassName} text-emerald-800 hover:text-emerald-800`;
    }
    if (linkType === "regulatory") {
      return `${baseClassName} text-[hsl(var(--notebook-action))]`;
    }
    return baseClassName;
  };
  const getReferenceTypeLabel = (linkType) => {
    if (linkType === "sds") return t("detail.referenceTypeSds");
    if (linkType === "regulatory") return t("detail.referenceTypeRegulatory");
    if (linkType === "occupational") return t("detail.referenceTypeOccupational");
    return t("detail.referenceTypeReference");
  };
  const getReferenceSourceLabel = (source) => {
    const sourceText = typeof source === "string" ? source.trim() : "";
    const normalized = sourceText.toLowerCase();
    if (normalized.includes("pubchem")) return t("detail.referenceSourcePubChem");
    if (normalized.includes("echa")) return t("detail.referenceSourceEcha");
    if (normalized.includes("niosh")) return t("detail.referenceSourceNiosh");
    if (normalized.includes("manual")) return t("detail.referenceSourceManual");
    return sourceText || t("detail.referenceSourceReference");
  };
  const getReferenceUrlScheme = (url) => {
    try {
      return new URL(url).protocol.replace(":", "");
    } catch {
      return "";
    }
  };

  return (
    <div
      className={modalViewportOverlayClassName("z-50")}
      onClick={suppressed ? undefined : onClose}
      role="dialog"
      aria-modal={suppressed ? undefined : "true"}
      aria-hidden={suppressed ? "true" : undefined}
      // React 19 supports `inert` as a boolean attribute; passing
      // `true` serializes to `inert=""` on the DOM, `false` omits it.

      inert={suppressed || undefined}
      aria-labelledby="detail-modal-title"
      data-testid="detail-modal"
    >
      <div
        ref={dialogRef}
        tabIndex={-1}
        className={modalViewportPanelClassName(
          `notebook-surface ${allClassifications.length > 1 ? "max-w-3xl" : "max-w-2xl"}`,
        )}
        data-testid="detail-modal-panel"
        onClick={(e) => e.stopPropagation()}
      >
        <div
          className="notebook-panel flex items-start justify-between gap-4 rounded-t-lg border-x-0 border-t-0 p-6"
          data-testid="detail-modal-header"
        >
          <div>
            <h2 id="detail-modal-title" className="text-xl font-semibold text-[hsl(var(--notebook-ink))]">
              {displayNames.primary}
            </h2>
            {displayNames.secondary && (
              <p className="text-[hsl(var(--notebook-muted-ink))]">{displayNames.secondary}</p>
            )}
            <p className="mt-1 flex items-center gap-2 font-mono text-[hsl(var(--notebook-action))]">
              CAS: {result.cas_number}
              <button
                onClick={() => copyCAS(result.cas_number)}
                className="text-[hsl(var(--notebook-muted-ink))] transition-colors hover:text-[hsl(var(--notebook-action))]"
                title={t("detail.copyCAS", { cas: result.cas_number })}
              >
                <Copy className="w-4 h-4" />
              </button>
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => onToggleFavorite(result)}
              className={`transition-colors ${
                isFavorited(result.cas_number)
                  ? "text-amber-500 hover:text-amber-600"
                  : "text-slate-300 hover:text-amber-500"
              }`}
              title={isFavorited(result.cas_number) ? t("favorites.removeFavorite") : t("favorites.addFavorite")}
            >
              <Star className={`w-6 h-6 ${isFavorited(result.cas_number) ? "fill-current" : ""}`} />
            </button>
            <button
              onClick={onClose}
              className="text-[hsl(var(--notebook-muted-ink))] hover:text-[hsl(var(--notebook-ink))]"
              data-testid="close-modal-btn"
            >
              <X className="w-6 h-6" />
            </button>
          </div>
        </div>

        <div
          className={modalViewportBodyClassName()}
          data-testid="detail-modal-body"
        >
          <div
            className="notebook-panel rounded-none border-x-0 border-t-0 px-6 py-4"
            data-testid="detail-trust-strip"
          >
            <div
              className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4"
              data-testid="detail-trust-grid"
            >
              {trustSummaryItems.map((item) => {
                const Icon = item.icon;
                return (
                  <div
                    key={item.key}
                    className="notebook-status-card flex min-w-0 items-start gap-3 rounded-md px-3 py-3"
                    data-testid={`detail-trust-${item.key}`}
                    title={item.title || item.value}
                  >
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md border border-[hsl(var(--notebook-action-border)/0.3)] bg-[hsl(var(--notebook-action-soft))] text-[hsl(var(--notebook-action))]">
                      <Icon className="h-4 w-4" />
                    </span>
                    <span className="min-w-0">
                      <span className="block text-xs font-medium uppercase text-[hsl(var(--notebook-muted-ink))]">
                        {item.label}
                      </span>
                      <span className="block truncate text-sm font-semibold text-[hsl(var(--notebook-ink))]">
                        {item.value}
                      </span>
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="space-y-6 p-6">
          {missingChineseNameReportUrl ? (
            <div
              role="note"
              data-testid="detail-missing-chinese-name-note"
              className="flex flex-col gap-3 rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-950 sm:flex-row sm:items-start sm:justify-between"
            >
              <span className="flex min-w-0 items-start gap-2">
                <Info className="mt-0.5 h-4 w-4 shrink-0 text-amber-700" />
                <span>
                  <span className="block font-semibold">
                    {t("detail.missingChineseNameTitle")}
                  </span>
                  <span className="mt-1 block text-xs leading-5 text-amber-900">
                    {t("detail.missingChineseNameHint")}
                  </span>
                </span>
              </span>
              {renderCorrectionAction({
                context: missingChineseNameReportContext,
                href: missingChineseNameReportUrl,
                testId: "detail-report-missing-chinese-name-link",
                className:
                  "inline-flex shrink-0 items-center justify-center gap-1 rounded-md border border-amber-300 bg-white px-3 py-2 text-xs font-semibold text-amber-900 transition-colors hover:bg-amber-100",
                iconClassName: "h-3.5 w-3.5",
                label: t("detail.reportChineseNameCta"),
              })}
            </div>
          ) : null}

          {/* Custom Classification Note Input */}
          {(result.has_multiple_classifications || result.other_classifications?.length > 0) && (
            <div className="notebook-panel rounded-md p-4" data-testid="detail-custom-settings">
              <h3 className="mb-2 flex items-center gap-2 text-sm font-medium text-[hsl(var(--notebook-action))]">
                <LayoutGrid className="w-4 h-4" /> {t("detail.customSettings")}
              </h3>
              <p className="mb-3 text-xs text-[hsl(var(--notebook-muted-ink))]">
                {t("detail.customSettingsHint")}
              </p>
              <div
                className="notebook-note mb-3 flex items-start gap-2 rounded-md px-3 py-2 text-xs leading-5"
                data-testid="detail-source-conflict-note"
              >
                <Info className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[hsl(var(--notebook-action))]" />
                <span>
                  <span className="block font-semibold">
                    {t("detail.sourceConflictTitle")}
                  </span>
                  <span>{t("detail.sourceConflictHint")}</span>
                  {sourceConflictReportUrl && (
                    renderCorrectionAction({
                      context: sourceConflictReportContext,
                      href: sourceConflictReportUrl,
                      testId: "detail-report-source-conflict-link",
                      className:
                        "mt-2 inline-flex items-center gap-1 rounded border border-amber-300 bg-white px-2 py-1 font-semibold text-amber-900 transition-colors hover:bg-amber-100",
                      iconClassName: "h-3 w-3",
                      label: t("detail.reportSourceConflictCta"),
                    })
                  )}
                </span>
              </div>
              <div className="flex gap-2 items-center">
                <input
                  type="text"
                  placeholder={t("detail.customNotePlaceholder")}
                  value={customGHSSettings[result.cas_number]?.note || ""}
                  onChange={(e) => {
                    const currentIndex = customGHSSettings[result.cas_number]?.selectedIndex || 0;
                    onSetCustomClassification(result.cas_number, currentIndex, e.target.value);
                  }}
                  className="notebook-field flex-1 rounded-md px-3 py-2 text-sm"
                />
                {hasCustomClassification(result.cas_number) && (
                  <button
                    onClick={() => onClearCustomClassification(result.cas_number)}
                    className="notebook-control notebook-control-secondary rounded-md px-3 py-2 text-sm transition-colors"
                    title={t("detail.restoreDefault")}
                  >
                    {t("detail.restoreDefault")}
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Signal Word — only for single classification */}
          {allClassifications.length <= 1 && effective?.signal_word && (
            <div>
              <h3 className="mb-2 text-sm font-medium text-[hsl(var(--notebook-muted-ink))]">
                {t("detail.signalWord")}
              </h3>
              <span
                className={`inline-block px-4 py-2 rounded-lg text-lg font-bold ${
                  effective.signal_word === "Danger"
                    ? "border border-red-200 bg-red-50 text-red-700"
                    : "border border-amber-200 bg-amber-50 text-amber-700"
                }`}
              >
                {getLocalizedSignalWord(effective, displayLocale)}
              </span>
            </div>
          )}

          {/* GHS Classifications */}
          {effectiveHasGhsData && !effectiveHasPictograms && (
            <div
              role="note"
              data-testid="detail-ghs-text-no-pictograms-banner"
              className="flex items-start gap-2 rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900"
            >
              <Info className="mt-0.5 h-4 w-4 shrink-0 text-amber-700" />
              <span>
                <span className="block font-medium">
                  {t("detail.ghsDataNoPictograms")}
                </span>
                <span className="mt-1 block text-xs leading-5 text-amber-800">
                  {t("detail.ghsDataNoPictogramsHint")}
                </span>
                {pictogramGapReportUrl && (
                  renderCorrectionAction({
                    context: pictogramGapReportContext,
                    href: pictogramGapReportUrl,
                    testId: "detail-report-pictogram-gap-link",
                    className:
                      "mt-2 inline-flex items-center gap-1 rounded border border-amber-300 bg-white px-2 py-1 text-xs font-semibold text-amber-900 transition-colors hover:bg-amber-100",
                    iconClassName: "h-3 w-3",
                    label: t("detail.reportDataGapCta"),
                  })
                )}
              </span>
            </div>
          )}

          {shouldShowClassificationComparison ? (
            /* Multiple classifications — comparison table */
            <div>
              <h3 className="mb-3 text-sm font-medium text-[hsl(var(--notebook-muted-ink))]">
                {t("detail.ghsClassification")}
                <span className="ml-2 text-[hsl(var(--notebook-action))]">{t("detail.classificationCount", { count: allClassifications.length })}</span>
              </h3>
              <ClassificationComparisonTable
                mode="same-chemical"
                columns={allClassifications.map((cls, idx) => ({
                  label: idx === 0 ? t("detail.defaultClass") : t("detail.classN", { n: idx + 1 }),
                  classification: cls,
                  index: idx,
                }))}
                selectedIndex={effective.customIndex}
                onSelectClassification={(idx) =>
                  onSetCustomClassification(
                    result.cas_number,
                    idx,
                    customGHSSettings[result.cas_number]?.note || ""
                  )
                }
              />
              <p className="mt-3 flex items-center gap-1 text-xs text-[hsl(var(--notebook-muted-ink))]">
                <Lightbulb className="h-3 w-3 shrink-0 text-amber-600" /> {t("detail.classificationHint")}
              </p>
            </div>
          ) : allClassifications.length === 1 && allClassifications[0].pictograms?.length > 0 ? (
            /* Single classification — simple pictogram display */
            <div>
              <h3 className="mb-3 text-sm font-medium text-[hsl(var(--notebook-muted-ink))]">
                {t("detail.ghsClassification")}
              </h3>
              <GHSPictogramStrip
                pictograms={allClassifications[0].pictograms}
                size="lg"
                markerTitle={t("results.defaultMarker")}
                getName={(pic) => getLocalizedPictogramName(pic, displayLocale)}
              />
            </div>
          ) : null}

          {/* Hazard Statements */}
          {effective?.hazard_statements?.length > 0 && (
            <div>
              <h3 className="mb-3 text-sm font-medium text-[hsl(var(--notebook-muted-ink))]">
                {t("detail.hazardStatements")}
                {effective.isCustom && (
                  <span className="ml-2 text-[hsl(var(--notebook-action))]">{t("detail.customHazardNote")}</span>
                )}
              </h3>
              <div className="space-y-2">
                {effective.hazard_statements.map((stmt, idx) => (
                  <div
                    key={idx}
                    className="notebook-status-card flex gap-3 rounded-md p-3"
                    data-testid={`detail-hazard-statement-${stmt.code}`}
                  >
                    <span className="shrink-0 font-mono font-medium text-red-700">
                      {stmt.code}
                    </span>
                    <span className="text-[hsl(var(--notebook-ink))]">
                      {getLocalizedStatementText(stmt, displayLocale)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Precautionary Statements */}
          {effective?.precautionary_statements?.length > 0 && (
            <div>
              <h3 className="mb-3 text-sm font-medium text-[hsl(var(--notebook-muted-ink))]">
                {t("detail.precautionaryStatements")}
              </h3>
              <div className="space-y-2">
                {effective.precautionary_statements.map((stmt, idx) => (
                  <div
                    key={idx}
                    className="notebook-status-card flex gap-3 rounded-md p-3"
                    data-testid={`detail-precautionary-statement-${stmt.code}`}
                  >
                    <span className="shrink-0 font-mono font-medium text-[hsl(var(--notebook-action))]">
                      {stmt.code}
                    </span>
                    <span className="text-[hsl(var(--notebook-ink))]">
                      {getLocalizedStatementText(stmt, displayLocale)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Reference Links */}
          {referenceLinks.length > 0 && (
            <div>
              <h3 className="mb-3 flex items-center gap-2 text-sm font-medium text-[hsl(var(--notebook-muted-ink))]">
                <ShieldCheck className="h-4 w-4 text-emerald-700" /> {t("sds.section")}
              </h3>
              <p
                className="mb-3 text-xs leading-5 text-[hsl(var(--notebook-muted-ink))]"
                data-testid="detail-reference-verification-hint"
              >
                {t("detail.referenceVerificationHint")}
              </p>
              <div className="flex gap-3 flex-wrap">
                {referenceLinks.map((link) => (
                  <a
                    key={link.url}
                    href={link.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    data-testid={`detail-reference-link-${link.linkType}`}
                    data-link-type={link.linkType}
                    data-reference-source={link.source || "manual"}
                    data-reference-url-scheme={getReferenceUrlScheme(link.url)}
                    aria-label={`${link.label} ${getReferenceTypeLabel(link.linkType)} ${getReferenceSourceLabel(link.source)}`}
                    className={getReferenceLinkClassName(link.linkType)}
                  >
                    <ExternalLink className="w-4 h-4" />
                    <span>{link.label}</span>
                    <span className="notebook-chip rounded px-1.5 py-0.5 text-[10px] font-semibold uppercase">
                      {getReferenceTypeLabel(link.linkType)}
                    </span>
                    <span
                      className="notebook-chip rounded px-1.5 py-0.5 text-[10px] font-semibold"
                      data-testid={`detail-reference-source-${link.linkType}`}
                    >
                      {getReferenceSourceLabel(link.source)}
                    </span>
                  </a>
                ))}
              </div>
            </div>
          )}

          {/* v1.8 M2: "no GHS data available" banner.
              Surfaced ABOVE Data Provenance so the trust frame is set
              before users see source / timestamp — otherwise those
              signals might suggest completeness when there's nothing
              to be complete about. Follows the effective classification
              so custom overrides flip the banner on/off correctly. */}
          {result.found && !effectiveHasGhsData && (
            <div
              role="note"
              data-testid="detail-no-ghs-data-banner"
              className="flex items-start gap-2 rounded-md border border-slate-200 bg-slate-50 p-3 text-sm text-slate-700"
            >
              <Info className="mt-0.5 h-4 w-4 shrink-0 text-slate-500" />
              <span>
                <span>{t("detail.noGhsDataBanner")}</span>
                {ghsGapReportUrl && (
                  renderCorrectionAction({
                    context: ghsGapReportContext,
                    href: ghsGapReportUrl,
                    testId: "detail-report-ghs-gap-link",
                    className:
                      "mt-2 inline-flex items-center gap-1 rounded border border-slate-300 bg-white px-2 py-1 text-xs font-semibold text-slate-700 transition-colors hover:bg-slate-100",
                    iconClassName: "h-3 w-3",
                    label: t("detail.reportDataGapCta"),
                  })
                )}
              </span>
            </div>
          )}

          {/* Data Provenance (v1.8 M1) */}
          {(effectiveSource || result.retrieved_at) && (
            <div>
              <h3 className="mb-3 flex items-center gap-2 text-sm font-medium text-[hsl(var(--notebook-muted-ink))]">
                <Info className="h-4 w-4 text-[hsl(var(--notebook-muted-ink))]" /> {t("detail.provenance")}
              </h3>
              <div className="notebook-status-card space-y-2 rounded-md p-3 text-sm">
                {effectiveSource && (
                  <div className="flex items-start gap-2">
                    <Database className="mt-0.5 h-4 w-4 shrink-0 text-[hsl(var(--notebook-muted-ink))]" />
                    <div className="flex-1">
                      <span className="mr-2 text-[hsl(var(--notebook-muted-ink))]">{t("detail.provenanceSource")}:</span>
                      <span className="text-[hsl(var(--notebook-ink))]">{effectiveSource}</span>
                      {effectiveReportCount && (
                        <span
                          className="notebook-chip ml-2 inline-flex items-center rounded-full px-2 py-0.5 text-xs"
                          title={t("detail.provenanceReportCountTooltip", {
                            count: effectiveReportCount,
                          })}
                          data-testid="provenance-report-count"
                        >
                          {t("detail.provenanceReportCount", {
                            count: effectiveReportCount,
                          })}
                        </span>
                      )}
                    </div>
                  </div>
                )}
                {result.retrieved_at && (
                  <div className="flex items-start gap-2">
                    <Clock className="mt-0.5 h-4 w-4 shrink-0 text-[hsl(var(--notebook-muted-ink))]" />
                    <div className="flex-1">
                      <span className="mr-2 text-[hsl(var(--notebook-muted-ink))]">{t("detail.provenanceRetrieved")}:</span>
                      <span
                        className="text-[hsl(var(--notebook-ink))]"
                        title={result.retrieved_at}
                        data-testid="provenance-retrieved-at"
                      >
                        {formatRelativeTime(result.retrieved_at)}
                      </span>
                      {result.cache_hit && (
                        <span
                          className="ml-2 inline-flex items-center rounded-full border border-amber-200 bg-amber-50 px-2 py-0.5 text-xs text-amber-700"
                          title={
                            result.retrieved_at
                              ? t("detail.provenanceCacheTooltipWithAge", {
                                  age: formatRelativeTime(result.retrieved_at),
                                })
                              : t("detail.provenanceCacheTooltip")
                          }
                          data-testid="provenance-cache-badge"
                        >
                          {t("detail.provenanceCache")}
                        </span>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* v1.8 M1: trust-boundary disclaimer — SDS / supplier / regulation is authoritative */}
          {result.found && <AuthoritativeSourceNote variant="detail" />}

          {/* Action Buttons */}
          <div
            className="notebook-note flex flex-wrap gap-3 rounded-md p-3"
            data-testid="detail-action-bar"
          >
            <Button
              onClick={() => onPrintLabel(result)}
              disabled={!canPrintHazardLabel}
              title={!canPrintHazardLabel ? t("label.noPrintableHazardData") : undefined}
              variant="notebookPrimary"
              size="notebook"
              className="px-4 disabled:cursor-not-allowed"
              data-testid="detail-print-label-btn"
            >
              <Tag className="w-4 h-4" /> {t("detail.printLabel")}
            </Button>
            {/* v1.9 M3 Tier 1: Prepare-solution entry.
                Only shown for found chemicals — prepared items rely on
                parent's GHS arrays being populated to copy over, and
                for a not-found result there's nothing to copy. */}
            {result.found && onPrepareSolution && (
              <Button
                onClick={() => onPrepareSolution(result)}
                variant="notebookSecondary"
                size="notebook"
                className="px-4"
                data-testid="prepare-solution-btn"
              >
                <FlaskConical className="w-4 h-4" /> {t("detail.prepareSolution")}
              </Button>
            )}
            {result.cid && (
              <Button
                asChild
                variant="notebookSecondary"
                size="notebook"
                className="px-4"
              >
                <a
                  href={`https://pubchem.ncbi.nlm.nih.gov/compound/${result.cid}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  data-testid="detail-pubchem-link"
                >
                  <ExternalLink className="w-4 h-4" /> {t("detail.viewPubChem")}
                </a>
              </Button>
            )}
          </div>
          </div>
        </div>
      </div>
    </div>
  );
}
