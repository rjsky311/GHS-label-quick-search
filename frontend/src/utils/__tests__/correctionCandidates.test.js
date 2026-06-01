import {
  buildCorrectionCandidateEvidence,
  buildCorrectionRequestManualEntryConversionPayload,
  buildManualEntryPayloadFromCorrectionCandidate,
  getCorrectionCandidateDisplayRows,
  getCorrectionCandidateManualEntryReadiness,
  hasApprovedManualEntryForCorrectionCandidate,
} from "@/utils/correctionCandidates";

describe("correction candidate evidence helpers", () => {
  it("builds a review-only Chinese-name candidate from correction text", () => {
    const candidate = buildCorrectionCandidateEvidence(
      {
        id: 201,
        issue_type: "missing-chinese-name",
        cas_number: "107-18-6",
        chemical_name: "Allyl Alcohol",
        expected_output: "中文名稱：烯丙醇",
        evidence_type: "Supplier SDS",
        evidence_url: "https://example.com/sds",
      },
      "Found supplier evidence",
    );

    expect(candidate).toMatchObject({
      schema_version: 1,
      review_required: true,
      approved_for_public_use: false,
      source: "admin-correction-request",
      candidate_type: "missing-chinese-name",
      request_id: 201,
      cas_number: "107-18-6",
      name_en: "Allyl Alcohol",
      name_zh: "烯丙醇",
      evidence_type: "Supplier SDS",
      evidence_url: "https://example.com/sds",
      review_notes: "Found supplier evidence",
    });
  });

  it("extracts unresolved-search CAS and names without approving them", () => {
    const candidate = buildCorrectionCandidateEvidence({
      id: 202,
      issueType: "unresolved-search",
      queryText: "ethanol",
      expectedOutput: "CAS: 64-17-5\nEnglish: Ethanol\n中文：乙醇",
    });

    expect(candidate).toMatchObject({
      candidate_type: "unresolved-search",
      cas_number: "64-17-5",
      name_en: "Ethanol",
      name_zh: "乙醇",
      query_text: "ethanol",
      review_required: true,
      approved_for_public_use: false,
    });
  });

  it("does not turn generic instructions into a Chinese-name candidate", () => {
    const candidate = buildCorrectionCandidateEvidence({
      id: 203,
      issue_type: "missing-chinese-name",
      cas_number: "50-00-0",
      chemical_name: "Formaldehyde",
      expected_output:
        "Provide a reviewed Traditional Chinese name with source evidence before dictionary approval.",
    });

    expect(candidate.name_en).toBe("Formaldehyde");
    expect(candidate.name_zh).toBeUndefined();
  });

  it("blocks missing-Chinese-name manual entries until a real Chinese name exists", () => {
    expect(
      getCorrectionCandidateManualEntryReadiness({
        issue_type: "missing-chinese-name",
        cas_number: "67-64-1",
        name_en: "Acetone",
        name_zh: "Acetone zh",
      }),
    ).toEqual({
      canCreate: false,
      reason: "missing-cjk-chinese-name",
    });

    expect(
      buildManualEntryPayloadFromCorrectionCandidate({
        id: 206,
        issue_type: "missing-chinese-name",
        cas_number: "67-64-1",
        chemical_name: "Acetone",
        expected_output: "Chinese: Acetone zh",
      }),
    ).toBeNull();
  });

  it("allows unresolved-search manual entries when the identity is clear", () => {
    const payload = buildManualEntryPayloadFromCorrectionCandidate(
      {
        id: 207,
        issue_type: "unresolved-search",
        query_text: "acetone",
        expected_output: "CAS: 67-64-1\nEnglish: Acetone",
      },
      "CAS checked",
    );

    expect(payload).toMatchObject({
      cas_number: "67-64-1",
      name_en: "Acetone",
      name_zh: null,
      source: "correction-request",
      status: "pending",
    });
  });

  it("renders a compact candidate display row list", () => {
    expect(
      getCorrectionCandidateDisplayRows({
        cas_number: "64-17-5",
        name_en: "Ethanol",
        name_zh: "乙醇",
        source: "admin-correction-request",
      }),
    ).toEqual([
      ["CAS", "64-17-5"],
      ["EN", "Ethanol"],
      ["ZH", "乙醇"],
      ["Source", "admin-correction-request"],
    ]);
  });

  it("builds a pending manual-entry payload from candidate evidence", () => {
    const ethanolZh = "\u4e59\u9187";
    const payload = buildManualEntryPayloadFromCorrectionCandidate(
      {
        id: 204,
        issue_type: "missing-chinese-name",
        cas_number: "64-17-5",
        chemical_name: "Ethanol",
        expected_output: `Chinese: ${ethanolZh}`,
        evidence_url: "https://example.com/sds",
      },
      "Reviewed supplier SDS",
    );

    expect(payload).toMatchObject({
      cas_number: "64-17-5",
      name_en: "Ethanol",
      name_zh: ethanolZh,
      source: "correction-request",
      status: "pending",
    });
    expect(payload.notes).toContain("Correction request #204");
    expect(payload.notes).toContain(
      "Issue: Missing trusted Chinese name (missing-chinese-name)"
    );
    expect(payload.notes).toContain("Evidence: https://example.com/sds");
    expect(payload.notes).toContain("Review: Reviewed supplier SDS");
  });

  it("marks display rows when candidate evidence has entered manual review", () => {
    expect(
      getCorrectionCandidateDisplayRows({
        cas_number: "64-17-5",
        name_en: "Ethanol",
        name_zh: "\u4e59\u9187",
        source: "admin-correction-request",
        converted_to_manual_entry: true,
        manual_entry_status: "pending",
      }),
    ).toEqual([
      ["CAS", "64-17-5"],
      ["EN", "Ethanol"],
      ["ZH", "\u4e59\u9187"],
      ["Source", "admin-correction-request"],
      ["Manual", "pending"],
    ]);
  });

  it("builds a correction-request update when a candidate becomes manual review", () => {
    const payload = buildCorrectionRequestManualEntryConversionPayload(
      {
        id: 205,
        issue_type: "missing-chinese-name",
        cas_number: "64-17-5",
        chemical_name: "Ethanol",
        expected_output: "Chinese: \u4e59\u9187",
        review_notes: "Candidate checked",
      },
      "",
    );

    expect(payload).toMatchObject({
      status: "candidate_found",
      candidate: {
        request_id: 205,
        cas_number: "64-17-5",
        name_en: "Ethanol",
        name_zh: "\u4e59\u9187",
        converted_to_manual_entry: true,
        manual_entry_status: "pending",
        manual_entry_source: "correction-request",
        public_data_changed: false,
      },
    });
    expect(payload.review_notes).toContain("Candidate checked");
    expect(payload.review_notes).toContain(
      "public data remains unchanged until that manual entry is approved",
    );
  });

  it("recognizes approved manual entries as the real approval boundary", () => {
    const item = {
      cas_number: "7783-46-2",
      chemical_name: "Lead fluoride",
      candidate: {
        cas_number: "7783-46-2",
        name_en: "Lead fluoride",
        name_zh: "\u6c1f\u5316\u925b",
        converted_to_manual_entry: true,
        manual_entry_status: "pending",
      },
    };

    expect(
      hasApprovedManualEntryForCorrectionCandidate(item, [
        {
          cas_number: "7783-46-2",
          name_en: "Lead fluoride",
          name_zh: "\u6c1f\u5316\u925b",
          status: "approved",
        },
      ]),
    ).toBe(true);

    expect(
      hasApprovedManualEntryForCorrectionCandidate(item, [
        {
          cas_number: "7783-46-2",
          name_en: "Lead fluoride",
          name_zh: "\u932f\u8aa4\u540d\u7a31",
          status: "approved",
        },
      ]),
    ).toBe(false);
  });
});
