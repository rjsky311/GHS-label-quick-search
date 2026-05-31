import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import DataCorrectionDialog from "../DataCorrectionDialog";
import { buildDataCorrectionContext } from "@/constants/supportLinks";
import { submitCorrectionRequest } from "@/utils/correctionRequests";

jest.mock("@/utils/correctionRequests", () => ({
  normalizeCorrectionRequestPayload: jest.requireActual(
    "@/utils/correctionRequests",
  ).normalizeCorrectionRequestPayload,
  submitCorrectionRequest: jest.fn(),
}));

jest.mock("sonner", () => ({
  toast: {
    success: jest.fn(),
    error: jest.fn(),
  },
}));

const context = buildDataCorrectionContext({
  casNumber: "107-18-6",
  nameEn: "Allyl Alcohol",
  issueType: "missing-chinese-name",
});

describe("DataCorrectionDialog", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    submitCorrectionRequest.mockResolvedValue({
      ok: true,
      record: { request_id: 42 },
    });
  });

  it("renders a prefilled correction request and keeps GitHub fallback available", () => {
    render(<DataCorrectionDialog context={context} onClose={jest.fn()} />);

    expect(screen.getByTestId("data-correction-dialog")).toBeInTheDocument();
    expect(screen.getByTestId("data-correction-cas")).toHaveValue("107-18-6");
    expect(screen.getByTestId("data-correction-name")).toHaveValue(
      "Allyl Alcohol",
    );
    expect(screen.getByTestId("data-correction-github-fallback")).toHaveAttribute(
      "href",
      context.fallbackUrl,
    );
    expect(screen.getByTestId("data-correction-guidance")).toHaveTextContent(
      "correctionDialog.guidance.missingChineseName.title",
    );
    expect(
      screen.getByTestId("data-correction-expected-output"),
    ).toHaveAttribute(
      "placeholder",
      "correctionDialog.guidance.missingChineseName.expectedPlaceholder",
    );
  });

  it("uses issue-specific guidance for unresolved lookups", () => {
    const unresolvedContext = buildDataCorrectionContext({
      queryText: "unknown vendor synonym",
      issueType: "unresolved-search",
    });

    render(
      <DataCorrectionDialog context={unresolvedContext} onClose={jest.fn()} />,
    );

    expect(screen.getByTestId("data-correction-guidance")).toHaveTextContent(
      "correctionDialog.guidance.unresolvedSearch.title",
    );
    expect(screen.getByTestId("data-correction-evidence-url")).toHaveAttribute(
      "placeholder",
      "correctionDialog.guidance.unresolvedSearch.evidenceUrlPlaceholder",
    );
    expect(screen.getByTestId("data-correction-local-context")).toHaveAttribute(
      "placeholder",
      "correctionDialog.guidance.unresolvedSearch.contextPlaceholder",
    );
  });

  it("submits to the backend correction-request queue", async () => {
    const onSubmitted = jest.fn();
    render(
      <DataCorrectionDialog
        context={context}
        onClose={jest.fn()}
        onSubmitted={onSubmitted}
      />,
    );

    fireEvent.change(screen.getByTestId("data-correction-expected-output"), {
      target: { value: "Use a verified Traditional Chinese name." },
    });
    fireEvent.click(screen.getByTestId("data-correction-submit"));

    await waitFor(() => {
      expect(submitCorrectionRequest).toHaveBeenCalledWith(
        expect.objectContaining({
          issue_type: "missing-chinese-name",
          cas_number: "107-18-6",
          expected_output: "Use a verified Traditional Chinese name.",
          source: "public-in-app",
        }),
      );
    });
    expect(onSubmitted).toHaveBeenCalledWith({ request_id: 42 });
    expect(screen.getByTestId("data-correction-success")).toHaveTextContent(
      "correctionDialog.successTitle",
    );
  });

  it("shows an inline error and fallback link when submit fails", async () => {
    submitCorrectionRequest.mockRejectedValueOnce({
      response: { data: { detail: "evidence URL must use http or https" } },
    });
    render(<DataCorrectionDialog context={context} onClose={jest.fn()} />);

    fireEvent.click(screen.getByTestId("data-correction-submit"));

    await waitFor(() => {
      expect(screen.getByTestId("data-correction-error")).toHaveTextContent(
        "evidence URL must use http or https",
      );
    });
    expect(screen.getByTestId("data-correction-fallback-link")).toHaveAttribute(
      "href",
      context.fallbackUrl,
    );
  });
});
