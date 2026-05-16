import { resolvePrintLayoutConfig } from "@/constants/labelStocks";
import {
  PRINT_CONTENT_ROLE,
  PRINT_DETAIL_SOURCE,
  PRINT_HAZARD_TEXT_MODE,
  PRINT_LANGUAGE_POLICY,
  PRINT_POLICY_OUTPUT_KIND,
  PRINT_PRECAUTION_TEXT_MODE,
  resolvePrintContentPolicy,
} from "@/utils/printContentPolicy";

describe("printContentPolicy", () => {
  it("treats A4/Letter full labels as complete primary output", () => {
    const policy = resolvePrintContentPolicy(
      resolvePrintLayoutConfig({
        labelPurpose: "shipping",
        template: "full",
        stockPreset: "a4-primary",
        nameDisplay: "both",
      }),
      { locale: "zh-TW" },
    );

    expect(policy).toMatchObject({
      role: PRINT_CONTENT_ROLE.COMPLETE_PRIMARY,
      outputKind: PRINT_POLICY_OUTPUT_KIND.COMPLETE_PRIMARY,
      hazardTextMode: PRINT_HAZARD_TEXT_MODE.FULL_HP,
      precautionTextMode: PRINT_PRECAUTION_TEXT_MODE.FULL_TEXT,
      detailSource: PRINT_DETAIL_SOURCE.PRINTED_LABEL,
      requiresResponsibleProfile: true,
      permitsFullHazardText: true,
      permitsFullPrecautionText: true,
      qrCanReplaceRequiredElements: false,
    });
    expect(policy.language).toMatchObject({
      mode: PRINT_LANGUAGE_POLICY.CONFIGURED,
      effectiveNameDisplay: "both",
      rendersBilingualStatements: true,
    });
  });

  it("marks continuation primary labels as full H/P across a continuation set", () => {
    const policy = resolvePrintContentPolicy(
      resolvePrintLayoutConfig({
        labelPurpose: "shipping",
        template: "full",
        stockPreset: "letter-primary",
      }),
      { continuation: true, locale: "en" },
    );

    expect(policy).toMatchObject({
      role: PRINT_CONTENT_ROLE.COMPLETE_PRIMARY,
      hazardTextMode: PRINT_HAZARD_TEXT_MODE.FULL_HP_CONTINUATION,
      precautionTextMode: PRINT_PRECAUTION_TEXT_MODE.FULL_TEXT,
      detailSource: PRINT_DETAIL_SOURCE.CONTINUATION_SET,
    });
  });

  it("uses H-code front labels and omits P text on roomy container fronts", () => {
    const policy = resolvePrintContentPolicy(
      resolvePrintLayoutConfig({
        labelPurpose: "shipping",
        template: "standard",
        stockPreset: "large-primary",
      }),
      { locale: "zh-TW" },
    );

    expect(policy).toMatchObject({
      role: PRINT_CONTENT_ROLE.CONTAINER_FRONT,
      outputKind: PRINT_POLICY_OUTPUT_KIND.SUPPLEMENTAL,
      hazardTextMode: PRINT_HAZARD_TEXT_MODE.H_CODES_ONLY,
      precautionTextMode: PRINT_PRECAUTION_TEXT_MODE.OMITTED,
      detailSource: PRINT_DETAIL_SOURCE.SDS_OR_BACK_LABEL,
      suppressesPrecautionText: true,
    });
  });

  it("uses H-code-only output on compact bottle labels", () => {
    const policy = resolvePrintContentPolicy(
      resolvePrintLayoutConfig({
        labelPurpose: "shipping",
        template: "standard",
        stockPreset: "medium-bottle",
        nameDisplay: "both",
      }),
      { locale: "zh-TW" },
    );

    expect(policy).toMatchObject({
      role: PRINT_CONTENT_ROLE.CONTAINER_FRONT,
      hazardTextMode: PRINT_HAZARD_TEXT_MODE.H_CODES_ONLY,
      precautionTextMode: PRINT_PRECAUTION_TEXT_MODE.OMITTED,
    });
    expect(policy.language.mode).toBe(
      PRINT_LANGUAGE_POLICY.COMPACT_MAY_FALLBACK,
    );
  });

  it("keeps quick-ID and QR supplements truthful about missing full H/P text", () => {
    const quickIdPolicy = resolvePrintContentPolicy(
      resolvePrintLayoutConfig({
        labelPurpose: "quickId",
        template: "icon",
        stockPreset: "small-strip",
      }),
    );
    const qrPolicy = resolvePrintContentPolicy(
      resolvePrintLayoutConfig({
        labelPurpose: "qrSupplement",
        template: "qrcode",
        stockPreset: "small-strip",
      }),
    );

    expect(quickIdPolicy).toMatchObject({
      role: PRINT_CONTENT_ROLE.QUICK_ID,
      outputKind: PRINT_POLICY_OUTPUT_KIND.QUICK_ID,
      hazardTextMode: PRINT_HAZARD_TEXT_MODE.OMITTED,
      precautionTextMode: PRINT_PRECAUTION_TEXT_MODE.OMITTED,
      detailSource: PRINT_DETAIL_SOURCE.PRIMARY_OR_SDS,
      permitsQrCode: false,
    });
    expect(qrPolicy).toMatchObject({
      role: PRINT_CONTENT_ROLE.QR_SUPPLEMENT,
      outputKind: PRINT_POLICY_OUTPUT_KIND.QR_SUPPLEMENT,
      hazardTextMode: PRINT_HAZARD_TEXT_MODE.QR_REFERENCE,
      precautionTextMode: PRINT_PRECAUTION_TEXT_MODE.OMITTED,
      detailSource: PRINT_DETAIL_SOURCE.QR_OR_SDS,
      permitsQrCode: true,
    });
  });
});
