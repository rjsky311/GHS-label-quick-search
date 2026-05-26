import {
  buildCorrectionCandidateEvidence,
  buildCorrectionRequestManualEntryConversionPayload,
  buildManualEntryPayloadFromCorrectionCandidate,
  getCorrectionCandidateDisplayRows,
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
});
