import { useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  AlertTriangle,
  Languages,
  Palette,
  Tag,
  X,
} from "lucide-react";
import {
  FULL_PAGE_PRIMARY_STOCK_IDS,
  getLabelStockPresetDisplay,
} from "@/constants/labelStocks";
import {
  ALL_STOCK_PRESETS,
  RESPONSIBLE_PROFILE_FIELDS,
  STOCK_IDS_BY_PRINT_TARGET,
  buildDisplayNames,
  buildBatchReviewCsv,
  buildPreviewRisks,
  formatMmValue,
  getBatchCategoryLabel,
  getBatchPurposeLabel,
  getLabelPurposeForConfig,
  getOutputTone,
  getPreviewFrameHeight,
  getPrintTargetForConfig,
  getQrTargetRoleLabel,
  getQrTargetSourceLabel,
  interpolateText,
  hasManualGhsClassificationChoice,
  hasMultipleGhsClassificationOptions,
  resolveResponsibleProfile,
  resolveLayoutProfile,
  splitStockChoices,
} from "@/components/label-print/labelPrintModalHelpers";
import { ConfigButtonGrid } from "@/components/label-print/LabelPrintConfigControls";
import ResponsibleProfileControls from "@/components/label-print/ResponsibleProfileControls";
import {
  COLOR_OPTIONS,
  NAME_DISPLAY_OPTIONS,
  ORIENTATION_OPTIONS,
  PRINT_TARGET_OPTIONS,
} from "@/components/label-print/labelPrintModalOptions";
import LabelAdvancedPrintOptions from "@/components/label-print/LabelAdvancedPrintOptions";
import LabelOutputSelector from "@/components/label-print/LabelOutputSelector";
import PrintOutputPlanDetails from "@/components/label-print/PrintOutputPlanDetails";
import LabelPreviewPanel from "@/components/label-print/LabelPreviewPanel";
import LabelPrintFooter from "@/components/label-print/LabelPrintFooter";
import {
  modalViewportBodyClassName,
  modalViewportOverlayClassName,
  modalViewportPanelClassName,
} from "@/components/ui/modalViewport";
import MultipleGhsPrintWarning from "@/components/label-print/MultipleGhsPrintWarning";
import SelectedLabelsControls from "@/components/label-print/SelectedLabelsControls";
import StockSizeSelector from "@/components/label-print/StockSizeSelector";
import { RecommendedOutputSummary } from "@/components/label-print/LabelPrintOutcomeSections";
import {
  PRINT_OUTPUT_KIND,
  PRINT_OUTPUT_PLAN_STATE,
  buildPrintOutputPlan,
} from "@/utils/printOutputPlanner";
import {
  BATCH_PRINT_ITEM_CATEGORY,
  BATCH_PRINT_PURPOSE,
  BATCH_PRINT_REPRESENTATIVE,
  buildBatchPrintableItems,
  buildBatchPrintPlan,
} from "@/utils/printBatchPlanner";
import {
  PRINT_CONTENT_ROLE,
  PRINT_HAZARD_TEXT_MODE,
  resolvePrintContentPolicy,
} from "@/utils/printContentPolicy";
import AuthoritativeSourceNote from "@/components/AuthoritativeSourceNote";
import { buildPrintPreviewDocument } from "@/utils/printLabels";
import useFocusTrap from "@/hooks/useFocusTrap";
import useLabelPrintPreviewState from "@/hooks/useLabelPrintPreviewState";
import {
  resolveEffectiveLabelNameDisplay,
} from "@/utils/ghsText";

export default function LabelPrintModal({
  selectedForLabel,
  labelConfig,
  customGHSSettings = {},
  onLabelConfigChange,
  customLabelFields,
  onCustomLabelFieldsChange,
  labProfile = {},
  onLabProfileChange,
  onClearLabProfile,
  labelQuantities,
  onLabelQuantitiesChange,
  onPrintLabels,
  onToggleSelectForLabel,
  printTemplates = [],
  onSaveTemplate,
  onLoadTemplate,
  onDeleteTemplate,
  recentPrints = [],
  onLoadRecentPrint,
  onClearRecentPrints,
  printBlockedInfo = null,
  onClearPrintBlockedInfo,
  onClose,
}) {
  const { t, i18n } = useTranslation();
  const dialogRef = useFocusTrap(onClose);
  const autoAppliedOutputRef = useRef("");
  const userSelectedStockRef = useRef(false);
  const [previewZoomMode, setPreviewZoomMode] = useState("fit");
  const [previewPageIndex, setPreviewPageIndex] = useState(0);
  const [batchPreviewRepresentative, setBatchPreviewRepresentative] = useState(
    BATCH_PRINT_REPRESENTATIVE.FIRST,
  );
  const [batchPreviewItemIndex, setBatchPreviewItemIndex] = useState(null);
  const [batchIncludeReducedPurpose, setBatchIncludeReducedPurpose] =
    useState(false);

  const tx = (key, fallback, options = {}) => {
    const translated = t(key, { ...options, defaultValue: fallback });
    return interpolateText(translated === key ? fallback : translated, options);
  };

  const rawLayoutProfile = resolveLayoutProfile(labelConfig);
  const rawLabelPurpose = getLabelPurposeForConfig(labelConfig);
  const rawPrintTarget = getPrintTargetForConfig(
    rawLabelPurpose,
    rawLayoutProfile,
  );
  const effectiveLabelConfig = useMemo(() => {
    const allowedStocks = STOCK_IDS_BY_PRINT_TARGET[rawPrintTarget] || [];
    if (allowedStocks.includes(rawLayoutProfile.stockPreset)) {
      return labelConfig;
    }

    const fallbackOption =
      PRINT_TARGET_OPTIONS.find((option) => option.value === rawPrintTarget) ||
      PRINT_TARGET_OPTIONS[0];
    const fallbackPreset = ALL_STOCK_PRESETS.find(
      (preset) => preset.id === fallbackOption?.presetId,
    );

    if (!fallbackOption || !fallbackPreset) return labelConfig;

    return {
      ...labelConfig,
      labelPurpose: fallbackOption.purpose,
      template: fallbackOption.template,
      nameDisplay: labelConfig.nameDisplay || "both",
      stockPreset: fallbackPreset.id,
      size: fallbackPreset.size,
      orientation: fallbackPreset.orientation,
      columns: fallbackPreset.columns,
      rows: fallbackPreset.rows,
      perPage: fallbackPreset.perPage,
      labelWidthMm: fallbackPreset.widthMm,
      labelHeightMm: fallbackPreset.heightMm,
      pagePaddingMm: fallbackPreset.pagePaddingMm,
      columnGapMm: fallbackPreset.columnGapMm,
      rowGapMm: fallbackPreset.rowGapMm,
      offsetXmm: fallbackPreset.offsetXmm,
      offsetYmm: fallbackPreset.offsetYmm,
      pageSize: fallbackPreset.pageSize || "A4",
    };
  }, [
    labelConfig,
    rawLayoutProfile.stockPreset,
    rawPrintTarget,
  ]);

  const layoutProfile = resolveLayoutProfile(effectiveLabelConfig);
  const labelPurpose = getLabelPurposeForConfig(effectiveLabelConfig);
  const printTarget = getPrintTargetForConfig(labelPurpose, layoutProfile);
  const selectedPrintTargetOption =
    PRINT_TARGET_OPTIONS.find((option) => option.value === printTarget) ||
    PRINT_TARGET_OPTIONS[0];
  const printTargetLabel = selectedPrintTargetOption
    ? tx(
        selectedPrintTargetOption.labelKey,
        selectedPrintTargetOption.fallbackLabel,
      )
    : tx("label.targetComplete", "Complete A4/Letter label");
  const firstSelectedChem = selectedForLabel[0] ?? null;
  const qrTargetInfo =
    labelPurpose === "qrSupplement"
      ? {
          linkType: "lookup",
          source: "site",
          label: tx("label.qrTargetSiteLabel", "GHS Label Quick Search"),
        }
      : null;
  const qrTargetRoleLabel = getQrTargetRoleLabel(qrTargetInfo?.linkType, tx);
  const qrTargetSourceLabel = getQrTargetSourceLabel(qrTargetInfo?.source, tx);
  const qrTargetSummaryLabel = qrTargetInfo?.label || qrTargetRoleLabel;
  const currentLocale = i18n.language;
  const effectiveNameDisplay = resolveEffectiveLabelNameDisplay(
    layoutProfile,
    currentLocale,
  );
  const totalLabels = selectedForLabel.reduce(
    (sum, chem) => sum + (labelQuantities?.[chem.cas_number] || 1),
    0,
  );
  const previewSelectionKey = selectedForLabel
    .map(
      (chem) =>
        `${chem.cas_number || chem.name_en || chem.name_zh || ""}:${
          labelQuantities?.[chem.cas_number] || 1
        }`,
    )
    .join("|");
  const printBlockedScopeKey = useMemo(
    () =>
      JSON.stringify({
        selection: previewSelectionKey,
        target: printTarget,
        stockPreset: layoutProfile.stockPreset,
        template: effectiveLabelConfig.template,
        labelPurpose,
        colorMode: effectiveLabelConfig.colorMode,
        nameDisplay: effectiveLabelConfig.nameDisplay,
        widthMm: layoutProfile.widthMm,
        heightMm: layoutProfile.heightMm,
        pageSize: layoutProfile.page?.size || effectiveLabelConfig.pageSize,
        batchIncludeReducedPurpose,
        customLabelFields,
        labelQuantities,
        labProfile,
      }),
    [
      batchIncludeReducedPurpose,
      customLabelFields,
      effectiveLabelConfig.colorMode,
      effectiveLabelConfig.nameDisplay,
      effectiveLabelConfig.pageSize,
      effectiveLabelConfig.template,
      labelPurpose,
      labelQuantities,
      labProfile,
      layoutProfile.heightMm,
      layoutProfile.page?.size,
      layoutProfile.stockPreset,
      layoutProfile.widthMm,
      previewSelectionKey,
      printTarget,
    ],
  );
  const printBlockedScopeKeyRef = useRef(printBlockedScopeKey);
  const estimatedPages =
    totalLabels > 0 ? Math.ceil(totalLabels / layoutProfile.perPage) : 0;
  const resolvedResponsibleProfile = resolveResponsibleProfile(
    customLabelFields,
    labProfile,
  );
  const stockPresetDisplay = getLabelStockPresetDisplay(
    layoutProfile.stockPreset,
    t,
  );
  const visibleRecentPrints = recentPrints.slice(0, 5);
  const unconfirmedMultipleGhsItems = useMemo(
    () =>
      selectedForLabel.filter(
        (chem) =>
          hasMultipleGhsClassificationOptions(chem) &&
          !hasManualGhsClassificationChoice(chem, customGHSSettings),
      ),
    [selectedForLabel, customGHSSettings],
  );
  const multipleGhsWarningExamples = unconfirmedMultipleGhsItems
    .slice(0, 3)
    .map((chem) => {
      const names = buildDisplayNames(chem, "both", currentLocale);
      return [chem.cas_number, names[0]].filter(Boolean).join(" · ");
    })
    .filter(Boolean);
  const multipleGhsWarningRemainingCount = Math.max(
    0,
    unconfirmedMultipleGhsItems.length - multipleGhsWarningExamples.length,
  );
  const readyPreviewMessage = tx(
    "label.previewRiskReady",
    "This combination looks balanced for the current content load.",
  );
  const outputPlan = buildPrintOutputPlan({
    selectedForLabel,
    layout: layoutProfile,
    customGHSSettings,
    customLabelFields,
    resolvedLabProfile: resolvedResponsibleProfile,
    locale: currentLocale,
  });
  const batchPrintPurpose =
    outputPlan.outputKind === PRINT_OUTPUT_KIND.COMPLETE_PRIMARY
      ? BATCH_PRINT_PURPOSE.COMPLETE
      : outputPlan.outputKind === PRINT_OUTPUT_KIND.QUICK_ID
        ? BATCH_PRINT_PURPOSE.QUICK_ID
        : BATCH_PRINT_PURPOSE.SUPPLEMENTAL;
  const batchPrintPlan = useMemo(
    () =>
      buildBatchPrintPlan({
        selectedForLabel,
        layout: layoutProfile,
        purpose: batchPrintPurpose,
        customGHSSettings,
        customLabelFields,
        resolvedLabProfile: resolvedResponsibleProfile,
        locale: currentLocale,
      }),
    [
      selectedForLabel,
      layoutProfile,
      batchPrintPurpose,
      customGHSSettings,
      customLabelFields,
      resolvedResponsibleProfile,
      currentLocale,
    ],
  );
  const hasBatchPrintPlan = selectedForLabel.length > 1;
  const batchReducedPurposeItems = hasBatchPrintPlan
    ? batchPrintPlan.items.filter(
        (item) => item.category === BATCH_PRINT_ITEM_CATEGORY.REDUCED_PURPOSE,
      )
    : [];
  const batchSelectedPrintItems = hasBatchPrintPlan
    ? buildBatchPrintableItems(batchPrintPlan, {
        includeReducedPurpose: batchIncludeReducedPurpose,
        includeContinuation: true,
      })
    : [];
  const canPrintBatchSelectedScope =
    hasBatchPrintPlan && batchSelectedPrintItems.length > 0;
  const batchAcknowledgedPrintCount = Math.max(
    0,
    batchSelectedPrintItems.length - batchPrintPlan.summary.printableByDefault,
  );
  const printReadiness = outputPlan.readiness;
  const recommendedFullPagePreset = ALL_STOCK_PRESETS.find(
    (preset) => preset.id === outputPlan.recommendedFullPageStockId,
  );
  const recommendedFullPageLabel = recommendedFullPagePreset
    ? getLabelStockPresetDisplay(recommendedFullPagePreset, t).name
    : tx("label.fullPagePrimaryFallback", "full-page primary");
  const outputPlanHasUpstreamError = outputPlan.issues.some(
    (issue) => issue.type === "upstream-error",
  );
  const isQrSupplementOutput =
    labelPurpose === "qrSupplement" ||
    outputPlan.outputKind === PRINT_OUTPUT_KIND.QR_SUPPLEMENT;
  const isQuickIdOutput =
    labelPurpose === "quickId" ||
    outputPlan.outputKind === PRINT_OUTPUT_KIND.QUICK_ID;
  const isSmallLabelContinuationBlocked =
    outputPlan.state === PRINT_OUTPUT_PLAN_STATE.SMALL_LABEL_CONTINUATION_LIMIT;
  const smallLabelContinuationIssue = outputPlan.issues.find(
    (issue) => issue.type === "small-label-continuation-limit",
  );
  const smallLabelContinuationPageCount =
    smallLabelContinuationIssue?.pageCount || 3;
  const smallLabelContinuationMaxLabels =
    smallLabelContinuationIssue?.maxLabels || 2;
  const smallLabelOutputName = isQrSupplementOutput
    ? tx("label.targetQrSmall", "QR small label")
    : tx("label.targetIdentitySmall", "Identification small label");
  const visibleStockChoices = ALL_STOCK_PRESETS.filter((preset) =>
    (STOCK_IDS_BY_PRINT_TARGET[printTarget] || []).includes(preset.id),
  );
  const { primaryStockChoices, secondaryStockChoices } = splitStockChoices(
    visibleStockChoices,
    layoutProfile.stockPreset,
    printTarget,
  );
  const currentStockName =
    layoutProfile.stockPreset === "custom"
      ? tx("label.stockPresetCustom", "Custom tuning")
      : stockPresetDisplay.name || layoutProfile.stockPresetName;
  const currentStockRole = FULL_PAGE_PRIMARY_STOCK_IDS.includes(
    layoutProfile.stockPreset,
  )
    ? tx("label.completePrimaryStock", "complete")
    : labelPurpose === "shipping"
      ? tx("label.containerStock", "container")
      : tx("label.supplementalStock", "supplemental");
  const currentStockOrientation = t(
    ORIENTATION_OPTIONS.find((item) => item.value === layoutProfile.orientation)
      ?.labelKey || "label.portrait",
  );
  const batchPrintPurposeLabel = getBatchPurposeLabel(batchPrintPurpose, tx);
  const batchUnselectedReviewCount = hasBatchPrintPlan
    ? Math.max(
        0,
        batchPrintPlan.summary.requiresAcknowledgement -
          batchAcknowledgedPrintCount,
      )
    : 0;
  const selectableStockCount =
    primaryStockChoices.length + secondaryStockChoices.length;
  const plannerPreviewRisk =
    outputPlan.state === PRINT_OUTPUT_PLAN_STATE.RECOMMEND_FULL_PAGE
      ? tx(
          "label.outputPlanRecommendFullPage",
          "This stock cannot carry the complete primary label clearly. Use {{stock}} and keep this smaller label as supplemental if needed.",
          { stock: recommendedFullPageLabel },
        )
      : outputPlan.state === PRINT_OUTPUT_PLAN_STATE.READY_WITH_CONTINUATION
        ? tx(
            "label.outputPlanContinuationNotice",
            "This content is too dense for one physical label, so the app will print the complete label with extra pages.",
          )
      : outputPlan.state === PRINT_OUTPUT_PLAN_STATE.MISSING_REQUIRED_PROFILE
        ? tx(
            "label.outputPlanMissingProfile",
            "Complete primary labels need responsible lab or supplier name, phone, and address before printing.",
          )
        : outputPlan.state === PRINT_OUTPUT_PLAN_STATE.READY_WITH_NOTICE
          ? tx(
              "label.outputPlanSupplementalNotice",
              "This output is printable as a supplemental label, not a complete primary container label.",
            )
          : outputPlan.state === PRINT_OUTPUT_PLAN_STATE.MISSING_HAZARD_DATA
            ? outputPlanHasUpstreamError
              ? tx(
                  "label.outputPlanUpstreamHazardData",
                  "PubChem hazard data could not be verified right now, so the app will not print a hazard label from incomplete data.",
                )
              : tx(
                  "label.outputPlanMissingHazardData",
                  "This item does not have enough GHS hazard content to produce a hazard label.",
                )
            : isSmallLabelContinuationBlocked
              ? tx(
                  "label.outputPlanSmallLabelContinuationLimit",
                  "{{target}} would need {{count}} labels. Small labels stop at {{max}} so identity and GHS pictograms stay readable.",
                  {
                    target: smallLabelOutputName,
                    count: smallLabelContinuationPageCount,
                    max: smallLabelContinuationMaxLabels,
                  },
                )
            : "";
  const batchRepresentativeOptions = Object.values(
    BATCH_PRINT_REPRESENTATIVE,
  ).filter((representative) => batchPrintPlan.representatives[representative]);
  const {
    activeBatchPreviewItem,
    previewLabelConfig,
    previewLabelQuantities,
    previewSourceItems,
    sheetPreviewItems,
    sheetPreviewQuantities,
  } = useLabelPrintPreviewState({
    batchPreviewItemIndex,
    batchPreviewRepresentative,
    batchPrintPlan,
    batchSelectedPrintItems,
    canPrintBatchSelectedScope,
    effectiveLabelConfig,
    hasBatchPrintPlan,
    labelQuantities,
    selectedForLabel,
  });
  const previewChem = activeBatchPreviewItem?.chemical || firstSelectedChem;
  const batchItemsNeedingReview = hasBatchPrintPlan
    ? batchPrintPlan.items.filter(
        (item) => item.requiresAcknowledgement || item.excluded,
      )
    : [];
  const displayNames = buildDisplayNames(
    previewChem,
    effectiveNameDisplay,
    currentLocale,
  );
  const previewRisks = buildPreviewRisks({
    previewChem,
    labelConfig: previewLabelConfig,
    layoutProfile: resolveLayoutProfile(previewLabelConfig),
    labProfile: resolvedResponsibleProfile,
    displayNames,
    tx,
  });
  const visiblePreviewRisks =
    outputPlan.state === PRINT_OUTPUT_PLAN_STATE.READY_WITH_NOTICE &&
    plannerPreviewRisk
      ? [plannerPreviewRisk]
      : plannerPreviewRisk && plannerPreviewRisk !== readyPreviewMessage
      ? [
          plannerPreviewRisk,
          ...previewRisks.filter((risk) => risk !== readyPreviewMessage),
        ]
      : previewRisks;
  const outputNotApplicableLabel = tx(
    "label.outputNotApplicable",
    "Not applicable",
  );
  const formatOutputCount = (summary) =>
    summary.expected > 0
      ? `${summary.present}/${summary.expected}`
      : outputNotApplicableLabel;
  const outputPlanTone =
    outputPlan.state === PRINT_OUTPUT_PLAN_STATE.READY
      ? "ready"
      : outputPlan.state === PRINT_OUTPUT_PLAN_STATE.READY_WITH_CONTINUATION
        ? "caution"
      : outputPlan.state === PRINT_OUTPUT_PLAN_STATE.READY_WITH_NOTICE
        ? "caution"
        : outputPlan.state === PRINT_OUTPUT_PLAN_STATE.MISSING_REQUIRED_PROFILE ||
            outputPlan.state === PRINT_OUTPUT_PLAN_STATE.MISSING_HAZARD_DATA ||
            outputPlan.state === PRINT_OUTPUT_PLAN_STATE.INVALID_STOCK ||
            isSmallLabelContinuationBlocked
          ? "danger"
          : "caution";
  const shouldOpenOutputPlanDetails =
    outputPlanTone === "danger" ||
    outputPlan.state === PRINT_OUTPUT_PLAN_STATE.RECOMMEND_FULL_PAGE;
  const hasAnyPictograms =
    printReadiness.elementSummary.pictograms.expected > 0;
  const isContinuationOutput =
    outputPlan.state === PRINT_OUTPUT_PLAN_STATE.READY_WITH_CONTINUATION;
  const isSupplementalOutput =
    outputPlan.state === PRINT_OUTPUT_PLAN_STATE.READY_WITH_NOTICE ||
    isSmallLabelContinuationBlocked;
  const printTrustMode =
    outputPlan.state === PRINT_OUTPUT_PLAN_STATE.MISSING_HAZARD_DATA ||
    outputPlan.state === PRINT_OUTPUT_PLAN_STATE.MISSING_REQUIRED_PROFILE ||
    outputPlan.state === PRINT_OUTPUT_PLAN_STATE.INVALID_STOCK ||
    isSmallLabelContinuationBlocked
      ? "blocked"
      : isSupplementalOutput || isQrSupplementOutput || isQuickIdOutput
        ? "supplemental"
        : "general";
  const shouldShowPrintTrustNote =
    selectedForLabel.length > 0 &&
    outputPlan.state !== PRINT_OUTPUT_PLAN_STATE.PENDING_SELECTION;
  const contentPolicy =
    outputPlan.readiness?.contentPolicy ||
    printReadiness.contentPolicy ||
    resolvePrintContentPolicy(layoutProfile, { locale: i18n.language });
  const isContainerFrontOutput =
    isSupplementalOutput &&
    contentPolicy.role === PRINT_CONTENT_ROLE.CONTAINER_FRONT;
  const outputRoleSummary =
    outputPlan.state === PRINT_OUTPUT_PLAN_STATE.READY
      ? tx("label.decisionRoleComplete", "Complete primary")
    : isSmallLabelContinuationBlocked
      ? tx("label.decisionRoleSmallLabelBlocked", "Small label too dense")
    : isContinuationOutput
      ? tx(
          "label.decisionRoleContinuation",
          "Complete A4/Letter with extra pages",
        )
    : outputPlan.state === PRINT_OUTPUT_PLAN_STATE.READY_WITH_NOTICE &&
        outputPlan.outputKind === PRINT_OUTPUT_KIND.QR_SUPPLEMENT
      ? tx("label.decisionRoleQrSupplement", "QR supplement")
      : outputPlan.state === PRINT_OUTPUT_PLAN_STATE.READY_WITH_NOTICE &&
          outputPlan.outputKind === PRINT_OUTPUT_KIND.QUICK_ID
        ? tx("label.decisionRoleQuickId", "Identification supplement")
      : outputPlan.state === PRINT_OUTPUT_PLAN_STATE.READY_WITH_NOTICE
        ? isContainerFrontOutput
          ? tx("label.decisionRoleContainerFront", "Container front label")
          : tx("label.decisionRoleSupplemental", "Small label")
          : outputPlan.state === PRINT_OUTPUT_PLAN_STATE.RECOMMEND_FULL_PAGE
            ? tx("label.decisionRoleUseFullPage", "Use A4/Letter label")
            : outputPlan.state === PRINT_OUTPUT_PLAN_STATE.MISSING_HAZARD_DATA
              ? tx("label.decisionRoleBlockedHazards", "Needs hazard data")
              : outputPlan.state ===
                  PRINT_OUTPUT_PLAN_STATE.MISSING_REQUIRED_PROFILE
                ? tx("label.decisionRoleBlockedProfile", "Profile required")
                : tx("label.decisionRolePending", "Select content");
  const previewContextOutputSummary = activeBatchPreviewItem
    ? `${getBatchPurposeLabel(
        activeBatchPreviewItem.effectivePurpose,
        tx,
      )} · ${getBatchCategoryLabel(activeBatchPreviewItem.category, tx)}`
    : outputRoleSummary;
  const pictogramSummary =
    outputPlan.state === PRINT_OUTPUT_PLAN_STATE.MISSING_HAZARD_DATA
      ? tx("label.decisionIconsNeedData", "Need verified hazard data")
      : hasAnyPictograms
        ? tx("label.decisionIconsAllKept", "All pictograms kept")
        : tx("label.decisionIconsNotAvailable", "No pictograms available");
  const statementSummary =
    outputPlan.state === PRINT_OUTPUT_PLAN_STATE.MISSING_HAZARD_DATA
      ? tx("label.decisionTextBlocked", "Do not print yet")
      : isSmallLabelContinuationBlocked
        ? tx("label.decisionTextSimplifySmallLabel", "Simplify before print")
      : isQrSupplementOutput
        ? qrTargetInfo
          ? tx(
              "label.decisionTextQrScanSpecific",
              "Details via QR: {{target}}",
              { target: qrTargetSummaryLabel },
            )
          : tx("label.decisionTextQrScan", "QR/SDS for details")
      : isContinuationOutput ||
          contentPolicy.hazardTextMode ===
            PRINT_HAZARD_TEXT_MODE.FULL_HP_CONTINUATION
        ? tx("label.decisionTextContinuation", "Full H/P text across pages")
        : contentPolicy.hazardTextMode === PRINT_HAZARD_TEXT_MODE.FULL_HP
          ? tx("label.decisionTextComplete", "Full H/P text")
          : contentPolicy.hazardTextMode ===
              PRINT_HAZARD_TEXT_MODE.QR_REFERENCE
            ? qrTargetInfo
              ? tx(
                  "label.decisionTextQrScanSpecific",
                  "Details via QR: {{target}}",
                  { target: qrTargetSummaryLabel },
                )
              : tx("label.decisionTextQrScan", "QR/SDS for details")
            : contentPolicy.hazardTextMode ===
                PRINT_HAZARD_TEXT_MODE.OMITTED
              ? tx("label.decisionTextIdentityOnly", "No H/P on small label")
              : contentPolicy.hazardTextMode ===
                  PRINT_HAZARD_TEXT_MODE.H_CODES_ONLY
                ? tx("label.decisionTextHCodesOnly", "H-code list only")
                : contentPolicy.hazardTextMode ===
                    PRINT_HAZARD_TEXT_MODE.PRIORITY_H_SUMMARY
                  ? tx("label.decisionTextPriorityHOnly", "Short H summary")
                  : contentPolicy.hazardTextMode ===
                      PRINT_HAZARD_TEXT_MODE.SHORT_H_SUMMARY
                    ? tx("label.decisionTextSummaryOnly", "Short hazard summary")
                    : tx("label.decisionTextCheck", "Check requirements");
  const decisionSummaryItems = [
    {
      key: "role",
      label: tx("label.decisionRoleLabel", "Label output"),
      value: outputRoleSummary,
      tone: outputPlanTone,
    },
    {
      key: "icons",
      label: tx("label.decisionIconsLabel", "GHS icons"),
      value: pictogramSummary,
      tone:
        outputPlan.state === PRINT_OUTPUT_PLAN_STATE.MISSING_HAZARD_DATA
          ? "danger"
          : hasAnyPictograms
            ? "ready"
            : "neutral",
    },
    {
      key: "text",
      label: tx("label.decisionTextLabel", "Hazard text"),
      value: statementSummary,
      tone:
        outputPlan.state === PRINT_OUTPUT_PLAN_STATE.MISSING_HAZARD_DATA
          ? "danger"
          : outputPlan.state === PRINT_OUTPUT_PLAN_STATE.READY_WITH_NOTICE
            ? "caution"
            : "ready",
    },
  ];
  const responsibleProfilePresentCount = RESPONSIBLE_PROFILE_FIELDS.filter(
    (field) => Boolean(resolvedResponsibleProfile[field]),
  ).length;
  const responsibleProfileRequired =
    outputPlan.outputKind === PRINT_OUTPUT_KIND.COMPLETE_PRIMARY;
  const responsibleProfileMissing =
    outputPlan.state === PRINT_OUTPUT_PLAN_STATE.MISSING_REQUIRED_PROFILE;
  const responsibleProfileTone = responsibleProfileMissing
    ? "danger"
    : responsibleProfileRequired
      ? "ready"
      : "neutral";
  const responsibleProfileStatus = responsibleProfileRequired
    ? responsibleProfilePresentCount === RESPONSIBLE_PROFILE_FIELDS.length
      ? tx("label.profileStatusComplete", "Ready for complete primary")
      : tx("label.profileStatusMissing", "Required for complete primary")
    : tx("label.profileStatusOptional", "Optional for this output");
  const printedLabelValue = tx("label.outputPrinted", "Printed");
  const outputChecklistTitle = isSupplementalOutput
    ? tx("label.outputPrintedChecklistTitle", "This label prints")
    : tx("label.outputChecklistTitle", "Required output");
  const outputChecklistHint = isSupplementalOutput
    ? tx(
        "label.outputPrintedChecklistHint",
        "This describes the current physical label only. Complete H/P detail belongs on the primary label or SDS/QR path.",
      )
    : tx(
        "label.outputChecklistHint",
        "Counts come from the same content model used by print preflight.",
      );
  const outputChecklistBadge = isSupplementalOutput
    ? tx("label.outputSupplemental", "Supplemental")
    : tx("label.outputPrimary", "Primary");
  const supplementalHazardOutputItem =
    contentPolicy.hazardTextMode === PRINT_HAZARD_TEXT_MODE.QR_REFERENCE
    ? {
        key: "hazard-reference",
        label: tx("label.outputHazardReference", "Detailed hazard text"),
        value: qrTargetInfo
          ? tx("label.outputQrScanSpecificPath", "Via QR: {{target}}", {
              target: qrTargetRoleLabel,
            })
          : tx("label.outputQrScanPath", "Via QR/SDS"),
        tone: "neutral",
        description: tx(
          "label.outputQrScanPathHint",
          "The small QR label does not print full H/P text.",
        ),
      }
    : contentPolicy.hazardTextMode === PRINT_HAZARD_TEXT_MODE.OMITTED
      ? {
          key: "hazard-reference",
          label: tx("label.outputHazardReference", "Detailed hazard text"),
          value: tx("label.outputNotOnSmallLabel", "Not on small label"),
          tone: "neutral",
          description: tx(
            "label.outputNotOnSmallLabelHint",
            "Quick-ID labels keep identity and pictograms readable.",
          ),
        }
      : contentPolicy.hazardTextMode === PRINT_HAZARD_TEXT_MODE.H_CODES_ONLY
        ? {
            key: "hazard-statements",
            label: tx("label.outputHazardSummary", "Hazard summary"),
            value: tx("label.outputHCodesOnly", "H-code list only"),
            tone: "caution",
            description: tx(
              "label.outputHCodesOnlyHint",
              "Small labels stay identity-first. Use A4/Letter or SDS/QR for full H/P text.",
            ),
          }
        : {
          key: "hazard-statements",
          label: tx("label.outputHazardSummary", "Hazard summary"),
          value:
            contentPolicy.hazardTextMode ===
            PRINT_HAZARD_TEXT_MODE.PRIORITY_H_SUMMARY
            ? tx("label.outputPriorityHOnly", "Short H summary")
            : tx("label.outputSummaryOnly", "Summary only"),
          tone: "caution",
          description: tx(
            "label.outputSummaryOnlyHint",
            "Small labels stay identity-first. Use A4/Letter or SDS/QR for full H/P text.",
          ),
        };
  const supplementalChecklistItems = [
    {
      key: "identity",
      label: tx("label.outputIdentity", "Identity"),
      value: printedLabelValue,
      tone: "ready",
      description: tx("label.outputIdentityHint", "Name and CAS stay visible."),
    },
    {
      key: "pictograms",
      label: tx("label.outputPictograms", "GHS pictograms"),
      value: formatOutputCount(printReadiness.elementSummary.pictograms),
      tone: getOutputTone(printReadiness.elementSummary.pictograms),
      description: tx(
        "label.outputPictogramsHint",
        "Available pictograms must stay on the label.",
      ),
    },
    ...(isQrSupplementOutput
      ? [
          {
            key: "qr-code",
            label: tx("label.outputQrCode", "QR code"),
            value: printedLabelValue,
            tone: "ready",
            description: tx(
              "label.outputQrCodeHint",
              "Scan path carries supporting detail.",
            ),
          },
          {
            key: "qr-target",
            label: tx("label.outputQrTarget", "QR target"),
            value: qrTargetInfo
              ? qrTargetRoleLabel
              : tx("label.outputQrTargetMissing", "Not available"),
            tone: qrTargetInfo ? "ready" : "caution",
            description: qrTargetInfo
              ? tx(
                  "label.outputQrTargetHint",
                  "Scans to {{label}} ({{source}}). Verify the destination before relying on it.",
                  {
                    label: qrTargetInfo.label,
                    source: qrTargetSourceLabel,
                  },
                )
              : tx(
                  "label.outputQrTargetMissingHint",
                  "No safe QR destination is available for this result.",
                ),
          },
        ]
      : []),
    supplementalHazardOutputItem,
  ];
  const primaryChecklistItems = [
    {
      key: "pictograms",
      label: tx("label.outputPictograms", "GHS pictograms"),
      value: formatOutputCount(printReadiness.elementSummary.pictograms),
      tone: getOutputTone(printReadiness.elementSummary.pictograms),
    },
    {
      key: "hazard-statements",
      label: tx("label.outputHazards", "H statements"),
      value: formatOutputCount(printReadiness.elementSummary.hazardStatements),
      tone: getOutputTone(printReadiness.elementSummary.hazardStatements),
    },
    {
      key: "precautionary-statements",
      label: tx("label.outputPrecautions", "P statements"),
      value: formatOutputCount(
        printReadiness.elementSummary.precautionaryStatements,
      ),
      tone: getOutputTone(
        printReadiness.elementSummary.precautionaryStatements,
      ),
    },
    {
      key: "signal-word",
      label: tx("label.outputSignalWord", "Signal word"),
      value: formatOutputCount(printReadiness.elementSummary.signalWord),
      tone: getOutputTone(printReadiness.elementSummary.signalWord),
    },
    {
      key: "responsible-profile",
      label: tx("label.outputResponsibleProfile", "Responsible profile"),
      value: formatOutputCount(
        printReadiness.elementSummary.responsibleProfile,
      ),
      tone: getOutputTone(printReadiness.elementSummary.responsibleProfile),
    },
  ];
  const outputChecklistItems = isSupplementalOutput
    ? supplementalChecklistItems
    : primaryChecklistItems;
  const hasPreviewWarnings = visiblePreviewRisks.some(
    (risk) => risk !== readyPreviewMessage,
  );
  const isPrintFitBlocked =
    selectedForLabel.length > 0 &&
    !outputPlan.canPrint &&
    !canPrintBatchSelectedScope;
  const isProfileBlocked =
    outputPlan.state === PRINT_OUTPUT_PLAN_STATE.MISSING_REQUIRED_PROFILE;
  const printBlockedLabel = isProfileBlocked
    ? tx("label.printFixProfileRequired", "Add lab/supplier profile first")
    : outputPlanHasUpstreamError
      ? tx("label.printFixVerifyHazards", "Verify hazard data first")
    : isSmallLabelContinuationBlocked
      ? tx("label.printFixSmallLabelContinuation", "Simplify small label first")
    : outputPlan.state === PRINT_OUTPUT_PLAN_STATE.INVALID_STOCK
      ? tx("label.printFixContinuationRequired", "Use extra pages first")
      : tx("label.printFixRequired", "Choose a printable stock first");
  const canUseFullPagePrimary =
    outputPlan.state === PRINT_OUTPUT_PLAN_STATE.RECOMMEND_FULL_PAGE &&
    Boolean(recommendedFullPagePreset) &&
    layoutProfile.stockPreset !== recommendedFullPagePreset.id &&
    !canPrintBatchSelectedScope;
  const autoApplyFullPageKey = [
    selectedForLabel.map((chem) => chem.cas_number).join("|"),
    layoutProfile.stockPreset,
    outputPlan.recommendedFullPageStockId,
    labelPurpose,
    labelConfig.nameDisplay,
  ].join(":");
  const blockedDensityMessage = tx(
    "label.previewRiskShippingBlockedDensity",
    "This content is too dense for the current complete-label stock. Use a full-page primary stock for a complete label; QR supplement is only a secondary option.",
  );
  const primaryPreviewRisk =
    plannerPreviewRisk ||
    visiblePreviewRisks.find((risk) => risk === blockedDensityMessage) ||
    visiblePreviewRisks.find((risk) => risk !== readyPreviewMessage) ||
    "";
  const outputPlanTitle =
    outputPlan.state === PRINT_OUTPUT_PLAN_STATE.READY
      ? tx("label.outputPlanReadyTitle", "Complete output ready")
      : outputPlan.state === PRINT_OUTPUT_PLAN_STATE.READY_WITH_CONTINUATION
        ? tx("label.outputPlanContinuationTitle", "Extra-page output ready")
      : outputPlan.state === PRINT_OUTPUT_PLAN_STATE.READY_WITH_NOTICE
        ? isContainerFrontOutput
          ? tx("label.outputPlanContainerFrontTitle", "Container front label ready")
          : tx("label.outputPlanSupplementalTitle", "Supplemental output")
        : outputPlan.state === PRINT_OUTPUT_PLAN_STATE.RECOMMEND_FULL_PAGE
          ? tx("label.outputPlanFullPageTitle", "Use a full-page primary label")
          : outputPlan.state === PRINT_OUTPUT_PLAN_STATE.MISSING_REQUIRED_PROFILE
            ? tx("label.outputPlanProfileTitle", "Responsible profile required")
            : outputPlan.state === PRINT_OUTPUT_PLAN_STATE.MISSING_HAZARD_DATA
              ? tx("label.outputPlanHazardTitle", "Hazard data required")
              : outputPlan.state === PRINT_OUTPUT_PLAN_STATE.INVALID_STOCK
                ? tx("label.outputPlanInvalidTitle", "Needs a larger output")
                : isSmallLabelContinuationBlocked
                  ? tx(
                      "label.outputPlanSmallLabelLimitTitle",
                      "Small label limit reached",
                    )
                : tx("label.outputPlanPendingTitle", "Output plan pending");
  const outputPlanBody =
    outputPlan.state === PRINT_OUTPUT_PLAN_STATE.READY
      ? tx(
          "label.outputPlanReadyBody",
          "The selected stock can print the current output without hiding safety-critical content.",
        )
      : outputPlan.state === PRINT_OUTPUT_PLAN_STATE.READY_WITH_CONTINUATION
        ? tx(
            "label.outputPlanContinuationBody",
            "This complete A4/Letter label uses extra pages so all available pictograms and H/P text remain printable.",
          )
      : outputPlan.state === PRINT_OUTPUT_PLAN_STATE.READY_WITH_NOTICE
        ? plannerPreviewRisk
        : outputPlan.state === PRINT_OUTPUT_PLAN_STATE.RECOMMEND_FULL_PAGE
          ? plannerPreviewRisk
          : outputPlan.state === PRINT_OUTPUT_PLAN_STATE.MISSING_REQUIRED_PROFILE
            ? plannerPreviewRisk
            : outputPlan.state === PRINT_OUTPUT_PLAN_STATE.MISSING_HAZARD_DATA
              ? plannerPreviewRisk
              : outputPlan.state === PRINT_OUTPUT_PLAN_STATE.INVALID_STOCK
                ? tx(
                    "label.outputPlanInvalidBody",
                    "Even this complete stock is too dense for one label. Use extra pages before printing.",
                  )
                : isSmallLabelContinuationBlocked
                  ? tx(
                      "label.outputPlanSmallLabelLimitBody",
                      "{{target}} would need {{count}} labels. This workflow stops small labels at {{max}}; simplify the language mode or print the complete A4/Letter label instead.",
                      {
                        target: smallLabelOutputName,
                        count: smallLabelContinuationPageCount,
                        max: smallLabelContinuationMaxLabels,
                      },
                    )
                : tx(
                    "label.outputPlanPendingBody",
                    "Select at least one chemical to let the app choose a safe printable output.",
                  );
  const recoveryRoute =
    selectedForLabel.length === 0
      ? null
      : canUseFullPagePrimary
        ? {
            kind: "use-full-page",
            tone: "caution",
            label: tx("label.recoveryRouteLabel", "Recommended recovery"),
            value: tx("label.recoveryUseFullPageValue", "Switch to {{stock}}", {
              stock: recommendedFullPageLabel,
            }),
            currentStock: currentStockName,
            targetStock: recommendedFullPageLabel,
            description: tx(
              "label.recoveryUseFullPageBody",
              "{{currentStock}} is too small for complete primary-label content. Print the complete primary label on {{stock}} first; use the smaller stock only as a supplemental label if needed.",
              {
                currentStock: currentStockName,
                stock: recommendedFullPageLabel,
              },
            ),
          }
        : isProfileBlocked
          ? {
              kind: "profile",
              tone: "danger",
              label: tx("label.recoveryRouteLabel", "Recommended recovery"),
              value: tx(
                "label.recoveryProfileValue",
                "Complete lab/supplier profile",
              ),
              currentStock: currentStockName,
              targetStock: "",
              description: tx(
                "label.recoveryProfileBody",
                "{{stock}} is planned as a complete primary label, so name, phone, and address must be present before print handoff.",
                { stock: currentStockName },
              ),
            }
        : outputPlan.state === PRINT_OUTPUT_PLAN_STATE.MISSING_HAZARD_DATA
          ? {
              kind: "hazard-data",
              tone: "danger",
              label: tx("label.recoveryRouteLabel", "Recommended recovery"),
              value: tx("label.recoveryHazardValue", "Verify hazard data"),
              currentStock: currentStockName,
              targetStock: "",
              description: tx(
                "label.recoveryHazardBody",
                "The app cannot print a hazard label until this result has usable GHS hazard content. Verify SDS/source data before choosing a label stock.",
              ),
            }
          : outputPlan.state === PRINT_OUTPUT_PLAN_STATE.INVALID_STOCK
            ? {
                kind: "invalid-stock",
                tone: "danger",
                label: tx("label.recoveryRouteLabel", "Recommended recovery"),
                value: tx(
                  "label.recoveryInvalidStockValue",
                  "Use a larger stock or extra pages",
                ),
                currentStock: currentStockName,
                targetStock: "",
                description: tx(
                  "label.recoveryInvalidStockBody",
                  "{{stock}} cannot carry this output truthfully. Keep every available GHS pictogram visible, then move dense H/P detail to a larger complete label or extra pages.",
                  { stock: currentStockName },
                ),
              }
            : isSmallLabelContinuationBlocked
              ? {
                  kind: "small-label-continuation",
                  tone: "danger",
                  label: tx("label.recoveryRouteLabel", "Recommended recovery"),
                  value: tx(
                    "label.recoverySmallLabelContinuationValue",
                    "Use English-only or complete A4/Letter",
                  ),
                  currentStock: currentStockName,
                  targetStock: recommendedFullPageLabel,
                  description: tx(
                    "label.recoverySmallLabelContinuationBody",
                    "Try English-only identity if name length is creating the pressure. If the pictograms still need more than {{max}} small labels, use the complete A4/Letter label instead.",
                    { max: smallLabelContinuationMaxLabels },
                  ),
                }
            : null;
  const outputOutcomeTone =
    selectedForLabel.length === 0 ? "neutral" : outputPlanTone;
  const outputOutcomeTitle =
    selectedForLabel.length === 0
      ? tx("label.outputOutcomePendingTitle", "Choose a chemical to plan output")
      : canUseFullPagePrimary
        ? tx(
            "label.outputOutcomeUseFullPageTitle",
            "Use {{stock}} for a complete primary label",
            { stock: recommendedFullPageLabel },
          )
        : isProfileBlocked
          ? tx(
              "label.outputOutcomeProfileTitle",
              "Add lab/supplier profile before printing",
            )
          : outputPlan.state === PRINT_OUTPUT_PLAN_STATE.MISSING_HAZARD_DATA
            ? tx(
                "label.outputOutcomeHazardsTitle",
                "Verify hazard data before printing",
              )
            : outputPlan.state === PRINT_OUTPUT_PLAN_STATE.INVALID_STOCK
              ? tx("label.outputOutcomeInvalidTitle", "Choose a larger output")
              : isSmallLabelContinuationBlocked
                ? tx(
                    isQrSupplementOutput
                      ? "label.outputOutcomeQrSmallLimitTitle"
                      : "label.outputOutcomeIdentitySmallLimitTitle",
                    isQrSupplementOutput
                      ? "QR small label needs a simpler route"
                      : "Identification small label needs a simpler route",
                  )
              : isContinuationOutput
                ? tx(
                    "label.outputOutcomeContinuationTitle",
                    "Complete A4/Letter label will print with extra pages",
                  )
              : isQrSupplementOutput
                ? tx("label.outputOutcomeQrSmallTitle", "QR small label is printable")
                : isQuickIdOutput
                  ? tx(
                      "label.outputOutcomeIdentitySmallTitle",
                      "Identification small label is printable",
                      { target: printTargetLabel },
                    )
                  : isSupplementalOutput
                  ? isContainerFrontOutput
                    ? tx(
                        "label.outputOutcomeContainerFrontTitle",
                        "{{target}} is printable as a front label",
                        { target: printTargetLabel },
                      )
                    : tx(
                        "label.outputOutcomeSupplementalTitle",
                        "{{target}} is printable as a supplement",
                        { target: printTargetLabel },
                      )
                  : tx(
                      "label.outputOutcomeCompleteTitle",
                      "Complete primary label is printable",
                    );
  const outputOutcomeBody =
    selectedForLabel.length === 0
      ? tx(
          "label.outputOutcomePendingBody",
          "Select a result and the app will choose the safest printable output for the target size.",
        )
      : canUseFullPagePrimary
        ? tx(
            "label.outputOutcomeUseFullPageBody",
            "The current target is too small for complete content. Switch to {{stock}} for the full label, then print a smaller supplemental label only if needed.",
            { stock: recommendedFullPageLabel },
          )
        : isProfileBlocked
          ? tx(
              "label.outputOutcomeProfileBody",
              "Complete primary labels need responsible lab or supplier name, phone, and address. Supplemental labels can stay secondary.",
            )
          : outputPlan.state === PRINT_OUTPUT_PLAN_STATE.MISSING_HAZARD_DATA
            ? plannerPreviewRisk ||
              tx(
                "label.outputOutcomeHazardsBody",
                "The app will not print a hazard label when source GHS data is unavailable or unverified.",
              )
            : outputPlan.state === PRINT_OUTPUT_PLAN_STATE.INVALID_STOCK
              ? tx(
                  "label.outputOutcomeInvalidBody",
                  "This stock cannot produce a truthful label. Use a larger primary label or extra pages.",
                )
              : isSmallLabelContinuationBlocked
                ? tx(
                    "label.outputOutcomeSmallLabelLimitBody",
                    "This {{target}} would need {{count}} labels. Small labels stop at {{max}} so identity and GHS pictograms stay readable; use English-only identity or print the complete A4/Letter label.",
                    {
                      target: smallLabelOutputName,
                      count: smallLabelContinuationPageCount,
                      max: smallLabelContinuationMaxLabels,
                    },
                  )
              : isContinuationOutput
                ? tx(
                    "label.outputOutcomeContinuationBody",
                    "The app will keep identity, CAS, signal word, and every GHS pictogram on each page, then continue the full H/P text over additional pages.",
                  )
              : isQrSupplementOutput
                ? tx(
                    "label.outputOutcomeQrSmallBody",
                    "This prints CAS, English/Chinese names, QR, and every GHS pictogram. If icons do not fit, the same output continues onto another small label.",
                    { target: qrTargetInfo ? qrTargetRoleLabel : "SDS/QR" },
                  )
                : isQuickIdOutput
                  ? tx(
                      "label.outputOutcomeIdentitySmallBody",
                      "This prints CAS, English/Chinese names, and every GHS pictogram. It does not include H/P text or QR.",
                    )
                  : isSupplementalOutput
                    ? tx(
                        "label.outputOutcomeSupplementalBody",
                        "This prints on {{stock}} as a front or supplemental label: identity, CAS/case, signal word, every available pictogram, and priority H summaries. Full H/P belongs on A4/Letter, SDS/QR, or a back label.",
                        { stock: currentStockName },
                      )
                    : tx(
                        "label.outputOutcomeCompleteBody",
                        "This prints on {{stock}} with all available pictograms and full H/P text for the selected content.",
                        { stock: currentStockName },
                      );
  const shouldShowPreviewOutcomeSummary =
    selectedForLabel.length === 0 ||
    outputOutcomeTone === "danger" ||
    outputPlan.state === PRINT_OUTPUT_PLAN_STATE.RECOMMEND_FULL_PAGE;
  const useFullPagePrimaryLabel = tx(
    "label.useFullPagePrimaryForComplete",
    "Use {{stock}} for complete label",
    { stock: recommendedFullPageLabel },
  );
  const previewMode =
    (layoutProfile.template === "icon" || layoutProfile.template === "qrcode") &&
    layoutProfile.perPage > 1
      ? "label"
      : "sheet";
  const sheetPreviewBundle = useMemo(
    () =>
      buildPrintPreviewDocument(
        sheetPreviewItems,
        effectiveLabelConfig,
        customGHSSettings,
        customLabelFields,
        sheetPreviewQuantities,
        labProfile,
        {
          mode: previewMode,
          pageIndex: previewPageIndex,
          labelIndex: previewPageIndex,
        },
      ),
    [
      sheetPreviewItems,
      effectiveLabelConfig,
      customGHSSettings,
      customLabelFields,
      sheetPreviewQuantities,
      labProfile,
      previewPageIndex,
      previewMode,
    ],
  );
  const plannedPrintLabelCount =
    sheetPreviewBundle?.model?.expandedLabels?.length || totalLabels;
  const plannedPrintPageCount =
    sheetPreviewBundle?.model?.totalPages || estimatedPages;
  const hasContinuationExpansion = plannedPrintLabelCount > totalLabels;
  const previewNavigationCount =
    previewMode === "label" && hasContinuationExpansion
      ? plannedPrintLabelCount
      : plannedPrintPageCount;
  const activePreviewPageIndex =
    previewMode === "label"
      ? sheetPreviewBundle?.previewLabelIndex || 0
      : sheetPreviewBundle?.previewPageIndex || 0;
  const activePreviewLabelIndex =
    plannedPrintLabelCount > 0
      ? Math.min(
          activePreviewPageIndex * Math.max(layoutProfile.perPage || 1, 1),
          plannedPrintLabelCount - 1,
        )
      : 0;
  const hasMultiplePreviewPages = previewNavigationCount > 1;
  const printActionLabel =
    selectedForLabel.length === 0
      ? t("label.printBtn", { count: plannedPrintLabelCount })
      : isPrintFitBlocked
        ? printBlockedLabel
        : canPrintBatchSelectedScope
          ? batchAcknowledgedPrintCount > 0
            ? tx(
                "label.printAcknowledgedBatchAction",
                "Print {{count}} selected {{purpose}} labels on {{stock}} ({{labels}} labels / {{pages}} pages; {{excluded}} excluded)",
                {
                  count: batchSelectedPrintItems.length,
                  total: batchPrintPlan.summary.total,
                  labels: plannedPrintLabelCount,
                  pages: plannedPrintPageCount,
                  purpose: batchPrintPurposeLabel,
                  stock: currentStockName,
                  excluded: batchPrintPlan.summary.excluded,
                },
              )
            : tx(
                "label.printReadyBatchAction",
                "Print {{ready}} ready {{purpose}} labels on {{stock}} ({{labels}} labels / {{pages}} pages; {{excluded}} excluded)",
                {
                  ready: batchPrintPlan.summary.printableByDefault,
                  total: batchPrintPlan.summary.total,
                  labels: plannedPrintLabelCount,
                  pages: plannedPrintPageCount,
                  purpose: batchPrintPurposeLabel,
                  stock: currentStockName,
                  excluded: batchPrintPlan.summary.excluded,
                },
              )
        : isContinuationOutput
          ? tx(
              "label.printContinuationAction",
              "Print complete A4/Letter set ({{labels}} labels / {{pages}} pages)",
              {
                labels: plannedPrintLabelCount,
                pages: plannedPrintPageCount,
              },
            )
        : isQrSupplementOutput
          ? tx(
              "label.printQrSmallAction",
              "Print QR small label ({{count}})",
              {
                count: plannedPrintLabelCount,
              },
            )
        : isQuickIdOutput
          ? tx(
              "label.printIdentitySmallAction",
              "Print identification small label ({{count}})",
              { target: printTargetLabel, count: plannedPrintLabelCount },
            )
          : isSupplementalOutput
            ? isContainerFrontOutput
              ? tx(
                  "label.printContainerFrontAction",
                  "Print {{target}} (front, {{count}})",
                  { target: printTargetLabel, count: plannedPrintLabelCount },
                )
              : tx(
                  "label.printSupplementalAction",
                  "Print {{target}} (supplemental, {{count}})",
                  { target: printTargetLabel, count: plannedPrintLabelCount },
                )
            : tx(
                "label.printCompletePrimaryAction",
                "Print complete primary label ({{count}})",
                { count: plannedPrintLabelCount },
              );
  const labelPreviewBundle = useMemo(() => {
    if (selectedForLabel.length === 0) return null;

    return buildPrintPreviewDocument(
      previewSourceItems,
      previewLabelConfig,
      customGHSSettings,
      customLabelFields,
      previewLabelQuantities,
      labProfile,
      {
        mode: "label",
        previewZoom: previewZoomMode,
        labelIndex: activePreviewLabelIndex,
      },
    );
  }, [
    previewSourceItems,
    previewLabelConfig,
    customGHSSettings,
    customLabelFields,
    previewLabelQuantities,
    labProfile,
    previewZoomMode,
    activePreviewLabelIndex,
    selectedForLabel.length,
  ]);

  useEffect(() => {
    setPreviewZoomMode("fit");
    setPreviewPageIndex(0);
  }, [
    batchPreviewRepresentative,
    batchPreviewItemIndex,
    effectiveLabelConfig.colorMode,
    effectiveLabelConfig.labelHeightMm,
    effectiveLabelConfig.labelPurpose,
    effectiveLabelConfig.labelWidthMm,
    effectiveLabelConfig.nameDisplay,
    effectiveLabelConfig.orientation,
    effectiveLabelConfig.size,
    effectiveLabelConfig.stockPreset,
    effectiveLabelConfig.template,
    previewSelectionKey,
  ]);

  useEffect(() => {
    setBatchPreviewRepresentative(BATCH_PRINT_REPRESENTATIVE.FIRST);
    setBatchPreviewItemIndex(null);
    setBatchIncludeReducedPurpose(false);
  }, [
    effectiveLabelConfig.labelPurpose,
    effectiveLabelConfig.labelHeightMm,
    effectiveLabelConfig.labelWidthMm,
    effectiveLabelConfig.stockPreset,
    effectiveLabelConfig.template,
    previewSelectionKey,
  ]);

  useEffect(() => {
    const maxPageIndex = Math.max(previewNavigationCount - 1, 0);
    if (previewPageIndex > maxPageIndex) {
      setPreviewPageIndex(maxPageIndex);
    }
  }, [previewNavigationCount, previewPageIndex]);

  useEffect(() => {
    if (
      userSelectedStockRef.current ||
      !canUseFullPagePrimary ||
      !outputPlan.recommendedFullPagePatch
    ) {
      autoAppliedOutputRef.current = "";
      return;
    }

    if (autoAppliedOutputRef.current === autoApplyFullPageKey) return;
    autoAppliedOutputRef.current = autoApplyFullPageKey;

    onLabelConfigChange({
      ...effectiveLabelConfig,
      ...outputPlan.recommendedFullPagePatch,
    });
  }, [
    autoApplyFullPageKey,
    canUseFullPagePrimary,
    effectiveLabelConfig,
    onLabelConfigChange,
    outputPlan.recommendedFullPagePatch,
  ]);

  useEffect(() => {
    if (printBlockedScopeKeyRef.current === printBlockedScopeKey) return;
    printBlockedScopeKeyRef.current = printBlockedScopeKey;
    onClearPrintBlockedInfo?.();
  }, [onClearPrintBlockedInfo, printBlockedScopeKey]);

  const formatPrintTimestamp = (value) => {
    if (!value) return "";
    try {
      return new Intl.DateTimeFormat(undefined, {
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      }).format(new Date(value));
    } catch {
      return value;
    }
  };

  const updateVisualConfig = (patch) => {
    onLabelConfigChange({ ...effectiveLabelConfig, ...patch });
  };

  const updateLayoutConfig = (patch) => {
    onLabelConfigChange({
      ...effectiveLabelConfig,
      ...patch,
      stockPreset: patch.stockPreset ?? "custom",
    });
  };

  const applyStockPreset = (preset) => {
    userSelectedStockRef.current = true;

    const nextConfig = {
      ...effectiveLabelConfig,
      stockPreset: preset.id,
      size: preset.size,
      orientation: preset.orientation,
      nameDisplay: effectiveLabelConfig.nameDisplay || "both",
      columns: preset.columns,
      rows: preset.rows,
      perPage: preset.perPage,
      labelWidthMm: preset.widthMm,
      labelHeightMm: preset.heightMm,
      pagePaddingMm: preset.pagePaddingMm,
      columnGapMm: preset.columnGapMm,
      rowGapMm: preset.rowGapMm,
      offsetXmm: preset.offsetXmm,
      offsetYmm: preset.offsetYmm,
      pageSize: preset.pageSize || "A4",
    };

    if (labelPurpose === "shipping") {
      const isFullPageStock =
        preset.outputRole === "full-page-primary" ||
        FULL_PAGE_PRIMARY_STOCK_IDS.includes(preset.id);
      nextConfig.labelPurpose = "shipping";
      nextConfig.template = isFullPageStock ? "full" : "standard";
    } else if (labelPurpose === "qrSupplement") {
      nextConfig.labelPurpose = "qrSupplement";
      nextConfig.template = "qrcode";
    } else if (labelPurpose === "quickId") {
      nextConfig.labelPurpose = "quickId";
      nextConfig.template = "icon";
    }

    onLabelConfigChange(nextConfig);
  };

  const handleUseFullPagePrimary = () => {
    if (!recommendedFullPagePreset) return;
    applyStockPreset(recommendedFullPagePreset);
  };

  const handlePrintAction = () => {
    onClearPrintBlockedInfo?.();
    onPrintLabels(
      effectiveLabelConfig,
      canPrintBatchSelectedScope ? batchSelectedPrintItems : undefined,
    );
  };

  const handleExportBatchReviewList = () => {
    const reviewItems = batchItemsNeedingReview.length
      ? batchItemsNeedingReview
      : batchPrintPlan.items;
    const csv = buildBatchReviewCsv(reviewItems, tx);
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "ghs-batch-print-review.csv";
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  };

  const handleFocusResponsibleProfile = () => {
    const profilePanel = document.querySelector(
      '[data-testid="responsible-profile-controls"]',
    );
    const firstInput = profilePanel?.querySelector("input");
    profilePanel?.scrollIntoView?.({ block: "center", behavior: "smooth" });
    firstInput?.focus?.();
  };

  const applyPrintTarget = (targetValue) => {
    userSelectedStockRef.current = true;
    const option = PRINT_TARGET_OPTIONS.find((item) => item.value === targetValue);
    const preset = ALL_STOCK_PRESETS.find((item) => item.id === option?.presetId);

    if (!option || !preset) return;

    const nextConfig = {
      ...effectiveLabelConfig,
      labelPurpose: option.purpose,
      template: option.template,
      nameDisplay: effectiveLabelConfig.nameDisplay || "both",
      stockPreset: preset.id,
      size: preset.size,
      orientation: preset.orientation,
      columns: preset.columns,
      rows: preset.rows,
      perPage: preset.perPage,
      labelWidthMm: preset.widthMm,
      labelHeightMm: preset.heightMm,
      pagePaddingMm: preset.pagePaddingMm,
      columnGapMm: preset.columnGapMm,
      rowGapMm: preset.rowGapMm,
      offsetXmm: preset.offsetXmm,
      offsetYmm: preset.offsetYmm,
      pageSize: preset.pageSize || "A4",
    };

    if (option.purpose === "shipping") {
      const isFullPageStock =
        preset.outputRole === "full-page-primary" ||
        FULL_PAGE_PRIMARY_STOCK_IDS.includes(preset.id);
      nextConfig.template = isFullPageStock
        ? "full"
        : option.template || "standard";
    }

    onLabelConfigChange(nextConfig);
  };

  useEffect(() => {
    if (effectiveLabelConfig === labelConfig) return;
    onLabelConfigChange(effectiveLabelConfig);
  }, [
    effectiveLabelConfig,
    labelConfig,
    onLabelConfigChange,
  ]);

  const isFullPagePrimaryPreview =
    labelConfig.template === "full" &&
    FULL_PAGE_PRIMARY_STOCK_IDS.includes(layoutProfile.stockPreset);
  const fallbackLabelFragmentPreviewHeight =
    labelConfig.template === "qrcode"
      ? "20rem"
      : isFullPagePrimaryPreview
        ? "24rem"
        : layoutProfile.orientation === "portrait"
          ? "34rem"
          : "22rem";
  const labelFragmentPreviewHeight = getPreviewFrameHeight(
    labelPreviewBundle?.previewMetrics,
    fallbackLabelFragmentPreviewHeight,
  );
  const sheetPreviewHeight = getPreviewFrameHeight(
    sheetPreviewBundle?.previewMetrics,
    layoutProfile.orientation === "landscape" ? "18rem" : "20rem",
  );
  const previewScalePercent = labelPreviewBundle?.previewMetrics
    ?.labelPreviewScale
    ? Math.round(labelPreviewBundle.previewMetrics.labelPreviewScale * 100)
    : null;
  const previewScaleLabel = previewScalePercent
    ? tx("label.previewScaleValue", "{{scale}}% scale", {
        scale: previewScalePercent,
      })
    : tx("label.previewScalePending", "Scale pending");
  const previewFitLabel =
    previewZoomMode === "inspect"
      ? tx("label.previewInspectMode", "Detail inspect mode")
      : tx("label.previewFitMode", "Whole label visible");
  const previewPhysicalSizeLabel = `${formatMmValue(
    layoutProfile.widthMm,
  )} x ${formatMmValue(layoutProfile.heightMm)} mm`;
  const previewPageLabel = `${layoutProfile.page?.size || "A4"} · ${currentStockOrientation} · ${tx(
    "label.previewPerPageValue",
    "{{count}}/page",
    { count: layoutProfile.perPage },
  )}`;
  const previewPagePositionLabel = tx(
    "label.previewPagePosition",
    "Page {{current}} / {{total}}",
    {
      current: activePreviewPageIndex + 1,
      total: Math.max(previewNavigationCount, 1),
    },
  );
  const updatePreviewPageIndex = (nextIndex) => {
    const maxPageIndex = Math.max(previewNavigationCount - 1, 0);
    setPreviewPageIndex(Math.max(0, Math.min(nextIndex, maxPageIndex)));
  };
  const previewPanelResetKey = [
    printTarget,
    layoutProfile.stockPreset,
    layoutProfile.widthMm,
    layoutProfile.heightMm,
    layoutProfile.columns,
    layoutProfile.rows,
    effectiveNameDisplay,
  ].join("|");
  const previewPanelModel = {
    actions: {
      handleFocusResponsibleProfile,
      handleUseFullPagePrimary,
      onUseSupplementalLabel: () => applyPrintTarget("quickId"),
      setPreviewZoomMode,
      updatePreviewPageIndex,
    },
    context: {
      currentStockName,
      layoutProfile,
      outputRoleSummary,
      pictogramSummary,
      previewContextOutputSummary,
      statementSummary,
    },
    diagnostics: {
      outputChecklistBadge,
      outputChecklistHint,
      outputChecklistItems,
      outputChecklistTitle,
      plannedPrintPageCount,
      readyPreviewMessage,
      visiblePreviewRisks,
    },
    focus: {
      activeBatchPreviewItem,
      previewChem,
      stockPresetDisplay,
    },
    labels: {
      t,
      tx,
    },
    outcome: {
      outputOutcomeBody,
      outputOutcomeTitle,
      outputOutcomeTone,
      shouldShowPreviewOutcomeSummary,
    },
    preview: {
      activePreviewPageIndex,
      hasMultiplePreviewPages,
      labelFragmentPreviewHeight,
      labelPreviewBundle,
      previewFitLabel,
      previewNavigationCount,
      previewPageLabel,
      previewPagePositionLabel,
      previewPhysicalSizeLabel,
      previewScaleLabel,
      previewZoomMode,
      sheetPreviewBundle,
      sheetPreviewHeight,
    },
    status: {
      canUseFullPagePrimary,
      hasPreviewWarnings,
      isPrintFitBlocked,
      isProfileBlocked,
      primaryPreviewRisk,
      useFullPagePrimaryLabel,
    },
  };

  return (
    <div
      className={modalViewportOverlayClassName("z-50")}
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="label-modal-title"
    >
      <div
        ref={dialogRef}
        tabIndex={-1}
        className={modalViewportPanelClassName("max-w-7xl bg-white")}
        data-testid="label-modal-panel"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex shrink-0 items-center justify-between border-b border-slate-200 bg-white px-6 py-4">
          <div>
            <h2
              id="label-modal-title"
              className="flex items-center gap-2 text-xl font-bold text-slate-950"
            >
              <Tag className="h-5 w-5 text-blue-600" /> {t("label.title")}
            </h2>
            <p className="mt-1 text-sm text-slate-600">
              {tx(
                "label.settingsPreviewIntro",
                "The app chooses a printable output first. Adjust only when the preview needs a different physical stock.",
              )}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-500 transition-colors hover:text-slate-900"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        <div
          className={modalViewportBodyClassName(
            "grid lg:grid-cols-[minmax(0,1fr)_minmax(27rem,34rem)] lg:overflow-hidden",
          )}
          data-testid="label-modal-scroll-body"
        >
            <div
              className="space-y-6 px-6 py-6 lg:min-h-0 lg:overflow-y-auto"
              data-testid="label-settings-column"
            >
              <section
                className="space-y-3"
                data-testid="primary-output-size-controls"
              >
                <LabelOutputSelector
                  currentStockName={currentStockName}
                  onSelectPrintTarget={applyPrintTarget}
                  printTarget={printTarget}
                  tx={tx}
                />
                <div className="mt-3">
                  <RecommendedOutputSummary
                    outputOutcomeTone={outputOutcomeTone}
                    outputOutcomeTitle={outputOutcomeTitle}
                    outputOutcomeBody={outputOutcomeBody}
                    currentStockName={currentStockName}
                    outputRoleSummary={outputRoleSummary}
                    statementSummary={statementSummary}
                    canUseFullPagePrimary={canUseFullPagePrimary}
                    isProfileBlocked={isProfileBlocked}
                    useFullPagePrimaryLabel={useFullPagePrimaryLabel}
                    onUseFullPagePrimary={handleUseFullPagePrimary}
                    onFocusResponsibleProfile={handleFocusResponsibleProfile}
                    tx={tx}
                  />
                </div>

                {printBlockedInfo && (
                  <div
                    className="mt-3 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-950"
                    data-testid="print-blocked-feedback"
                    role="alert"
                  >
                    <div className="flex items-start gap-2">
                      <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-red-600" />
                      <div className="min-w-0 space-y-2">
                        <p className="font-semibold">
                          {tx(
                            "label.printBlockedFeedbackTitle",
                            "Printing paused before handoff",
                          )}
                        </p>
                        <p className="leading-5">
                          {printBlockedInfo.message ||
                            tx(
                              "label.printBlockedFeedbackBody",
                              "The print preflight found a required image or layout issue. Adjust the selected output, then print again.",
                            )}
                        </p>
                        {printBlockedInfo.issueTypes?.length > 0 && (
                          <div className="flex flex-wrap gap-1.5">
                            {printBlockedInfo.issueTypes.map((issueType) => (
                              <span
                                key={issueType}
                                className="rounded-full border border-red-200 bg-white px-2 py-0.5 text-xs font-medium text-red-800"
                              >
                                {issueType}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )}

                <div className="mt-4">
                  <PrintOutputPlanDetails
                    activeBatchPreviewItem={activeBatchPreviewItem}
                    batchIncludeReducedPurpose={batchIncludeReducedPurpose}
                    batchItemsNeedingReview={batchItemsNeedingReview}
                    batchPreviewItemIndex={batchPreviewItemIndex}
                    batchPreviewRepresentative={batchPreviewRepresentative}
                    batchPrintPlan={batchPrintPlan}
                    batchPrintPurposeLabel={batchPrintPurposeLabel}
                    batchReducedPurposeItems={batchReducedPurposeItems}
                    batchRepresentativeOptions={batchRepresentativeOptions}
                    batchSelectedPrintItems={batchSelectedPrintItems}
                    batchUnselectedReviewCount={batchUnselectedReviewCount}
                    canUseFullPagePrimary={canUseFullPagePrimary}
                    currentStockName={currentStockName}
                    decisionSummaryItems={decisionSummaryItems}
                    handleExportBatchReviewList={handleExportBatchReviewList}
                    handleUseFullPagePrimary={handleUseFullPagePrimary}
                    outputPlanBody={outputPlanBody}
                    outputPlanTitle={outputPlanTitle}
                    outputPlanTone={outputPlanTone}
                    outputRoleSummary={outputRoleSummary}
                    plannedPrintLabelCount={plannedPrintLabelCount}
                    plannedPrintPageCount={plannedPrintPageCount}
                    recoveryRoute={recoveryRoute}
                    setBatchIncludeReducedPurpose={setBatchIncludeReducedPurpose}
                    setBatchPreviewItemIndex={setBatchPreviewItemIndex}
                    setBatchPreviewRepresentative={setBatchPreviewRepresentative}
                    shouldOpenOutputPlanDetails={shouldOpenOutputPlanDetails}
                    tx={tx}
                    useFullPagePrimaryLabel={useFullPagePrimaryLabel}
                  />

                  <MultipleGhsPrintWarning
                    items={unconfirmedMultipleGhsItems}
                    examples={multipleGhsWarningExamples}
                    remainingCount={multipleGhsWarningRemainingCount}
                    tx={tx}
                  />

                  {shouldShowPrintTrustNote && (
                    <AuthoritativeSourceNote
                      variant="print"
                      mode={printTrustMode}
                    />
                  )}

                  <StockSizeSelector
                    applyStockPreset={applyStockPreset}
                    currentStockName={currentStockName}
                    currentStockOrientation={currentStockOrientation}
                    currentStockRole={currentStockRole}
                    labelPurpose={labelPurpose}
                    layoutProfile={layoutProfile}
                    primaryStockChoices={primaryStockChoices}
                    secondaryStockChoices={secondaryStockChoices}
                    selectableStockCount={selectableStockCount}
                    t={t}
                    tx={tx}
                  />
                </div>
              </section>

              <section
                className="notebook-panel rounded-md p-4"
                data-testid="core-output-controls"
              >
                <h3 className="flex items-center gap-2 text-sm font-semibold text-[hsl(var(--notebook-ink))]">
                  <Languages className="h-4 w-4 text-[hsl(var(--notebook-action))]" />
                  {tx("label.outputBasicsTitle", "Language and print mode")}
                </h3>
                <p className="mt-1 text-xs leading-5 text-[hsl(var(--notebook-muted-ink))]">
                  {tx(
                    "label.outputBasicsHint",
                    "These choices directly affect the printed label and preview.",
                  )}
                </p>
                <div className="mt-4 grid gap-6 xl:grid-cols-2">
                  <section className="space-y-3">
                    <h4 className="text-sm font-semibold text-[hsl(var(--notebook-ink))]">
                      {tx("label.identityDisplay", "Printed identity")}
                    </h4>
                    <p className="text-xs leading-5 text-[hsl(var(--notebook-muted-ink))]">
                      {tx(
                        "label.identityDisplayHint",
                        "CAS always prints first. Choose whether the physical label shows both names or one language.",
                      )}
                    </p>
                    <ConfigButtonGrid
                      options={NAME_DISPLAY_OPTIONS}
                      value={effectiveLabelConfig.nameDisplay || "both"}
                      onSelect={(nameDisplay) => updateVisualConfig({ nameDisplay })}
                      t={t}
                    />
                  </section>

                  <section className="space-y-3">
                    <h4 className="flex items-center gap-2 text-sm font-semibold text-[hsl(var(--notebook-ink))]">
                      <Palette className="h-4 w-4 text-[hsl(var(--notebook-action))]" />
                      {t("label.colorMode")}
                    </h4>
                    <ConfigButtonGrid
                      options={COLOR_OPTIONS}
                      value={labelConfig.colorMode}
                      onSelect={(colorMode) => updateVisualConfig({ colorMode })}
                      t={t}
                    />
                  </section>
                </div>
              </section>

              <ResponsibleProfileControls
                open={responsibleProfileMissing}
                tone={responsibleProfileTone}
                status={responsibleProfileStatus}
                presentCount={responsibleProfilePresentCount}
                fieldTotal={RESPONSIBLE_PROFILE_FIELDS.length}
                required={responsibleProfileRequired}
                labProfile={labProfile}
                onLabProfileChange={onLabProfileChange}
                onClearLabProfile={onClearLabProfile}
                t={t}
                tx={tx}
              />

              <SelectedLabelsControls
                currentLocale={currentLocale}
                hasContinuationExpansion={hasContinuationExpansion}
                labelQuantities={labelQuantities}
                onLabelQuantitiesChange={onLabelQuantitiesChange}
                onToggleSelectForLabel={onToggleSelectForLabel}
                plannedPrintLabelCount={plannedPrintLabelCount}
                plannedPrintPageCount={plannedPrintPageCount}
                selectedForLabel={selectedForLabel}
                t={t}
                totalLabels={totalLabels}
                tx={tx}
              />

              <LabelAdvancedPrintOptions
                labelConfig={labelConfig}
                layoutProfile={layoutProfile}
                customLabelFields={customLabelFields}
                printTemplates={printTemplates}
                visibleRecentPrints={visibleRecentPrints}
                currentLocale={currentLocale}
                formatPrintTimestamp={formatPrintTimestamp}
                updateVisualConfig={updateVisualConfig}
                updateLayoutConfig={updateLayoutConfig}
                onCustomLabelFieldsChange={onCustomLabelFieldsChange}
                onLoadTemplate={onLoadTemplate}
                onDeleteTemplate={onDeleteTemplate}
                onSaveTemplate={onSaveTemplate}
                onLoadRecentPrint={onLoadRecentPrint}
                onClearRecentPrints={onClearRecentPrints}
                t={t}
                tx={tx}
              />
            </div>

            <LabelPreviewPanel
              key={previewPanelResetKey}
              model={previewPanelModel}
              resetKey={previewPanelResetKey}
            />
          </div>

        <LabelPrintFooter
          canUseFullPagePrimary={canUseFullPagePrimary}
          isPrintFitBlocked={isPrintFitBlocked}
          onClose={onClose}
          onPrint={handlePrintAction}
          onUseFullPagePrimary={handleUseFullPagePrimary}
          printActionLabel={printActionLabel}
          selectedCount={selectedForLabel.length}
          useFullPagePrimaryLabel={useFullPagePrimaryLabel}
          cancelLabel={t("label.cancel")}
        />
      </div>
    </div>
  );
}
