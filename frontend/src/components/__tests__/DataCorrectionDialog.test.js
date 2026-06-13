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

function expectNotebookPrimaryControl(element) {
  expect(element).toHaveClass("notebook-control", "notebook-control-primary");
  expect(element.className).not.toContain("bg-blue-700");
  expect(element.className).not.toContain("hover:bg-blue-800");
  expect(element.className).not.toContain("text-white");
}

function expectNotebookSecondaryControl(element) {
  expect(element).toHaveClass("notebook-control", "notebook-control-secondary");
  expect(element.className).not.toContain("bg-blue-700");
  expect(element.className).not.toContain("hover:bg-blue-800");
  expect(element.className).not.toContain("text-white");
}

function expectNotebookField(element) {
  expect(element).toHaveClass("notebook-field");
  expect(element.className).not.toContain("focus:border-blue-500");
  expect(element.className).not.toContain("focus:ring-blue-500");
}

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

  it("keeps the correction form within the viewport and scrollable", () => {
    render(<DataCorrectionDialog context={context} onClose={jest.fn()} />);

    expect(screen.getByTestId("data-correction-dialog")).toHaveClass(
      "modal-viewport-overlay",
    );
    expect(screen.getByTestId("data-correction-panel")).toHaveClass(
      "modal-viewport-panel",
      "max-h-[calc(100dvh-2rem)]",
      "overflow-hidden",
    );
    expect(screen.getByTestId("data-correction-body")).toHaveClass(
      "modal-viewport-body",
      "min-h-0",
      "flex-1",
      "overflow-y-auto",
    );
  });

  it("uses notebook controls for correction guidance and actions", async () => {
    render(<DataCorrectionDialog context={context} onClose={jest.fn()} />);

    expect(screen.getByTestId("data-correction-guidance")).toHaveClass(
      "notebook-note",
    );
    expect(
      screen.getByTestId("data-correction-guidance").className,
    ).not.toContain("bg-blue-50");
    expectNotebookSecondaryControl(
      screen.getByTestId("data-correction-github-fallback"),
    );
    expectNotebookSecondaryControl(screen.getByTestId("data-correction-cancel"));
    expectNotebookPrimaryControl(screen.getByTestId("data-correction-submit"));
    expectNotebookField(screen.getByTestId("data-correction-cas"));
    expectNotebookField(screen.getByTestId("data-correction-name"));
    expectNotebookField(screen.getByTestId("data-correction-current-output"));
    expectNotebookField(screen.getByTestId("data-correction-expected-output"));
    expectNotebookField(screen.getByTestId("data-correction-evidence-url"));
    expectNotebookField(screen.getByTestId("data-correction-evidence-type"));
    expectNotebookField(screen.getByTestId("data-correction-local-context"));

    fireEvent.change(screen.getByTestId("data-correction-expected-output"), {
      target: { value: "Use a verified Traditional Chinese name." },
    });
    fireEvent.click(screen.getByTestId("data-correction-submit"));

    await waitFor(() => {
      expect(screen.getByTestId("data-correction-done")).toBeInTheDocument();
    });
    expectNotebookPrimaryControl(screen.getByTestId("data-correction-done"));
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
