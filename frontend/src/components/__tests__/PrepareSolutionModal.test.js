import { render, screen, fireEvent, act } from "@testing-library/react";
import PrepareSolutionModal from "../PrepareSolutionModal";

const baseParent = {
  cas_number: "64-17-5",
  cid: 702,
  name_en: "Ethanol",
  name_zh: "乙醇",
  found: true,
  ghs_pictograms: [{ code: "GHS02" }],
  hazard_statements: [{ code: "H225", text_zh: "x" }],
  signal_word: "Danger",
  signal_word_zh: "危險",
};

describe("PrepareSolutionModal", () => {
  it("renders nothing when parent is null", () => {
    const { container } = render(
      <PrepareSolutionModal parent={null} onSubmit={jest.fn()} onClose={jest.fn()} />
    );
    expect(container.firstChild).toBeNull();
  });

  it("renders with role=dialog + aria-modal and the title", () => {
    render(
      <PrepareSolutionModal parent={baseParent} onSubmit={jest.fn()} onClose={jest.fn()} />
    );
    const dialog = screen.getByRole("dialog");
    expect(dialog).toHaveAttribute("aria-modal", "true");
    expect(screen.getByText("prepared.title")).toBeInTheDocument();
  });

  it("shows the parent chemical summary read-only", () => {
    render(
      <PrepareSolutionModal parent={baseParent} onSubmit={jest.fn()} onClose={jest.fn()} />
    );
    const summary = screen.getByTestId("prepare-solution-parent-summary");
    expect(summary.textContent).toContain("64-17-5");
    expect(summary.textContent).toContain("Ethanol");
    expect(summary.textContent).toContain("乙醇");
  });

  it("submit button is disabled until both concentration AND solvent have content", () => {
    render(
      <PrepareSolutionModal parent={baseParent} onSubmit={jest.fn()} onClose={jest.fn()} />
    );
    const submit = screen.getByTestId("prepare-solution-submit-btn");
    expect(submit).toBeDisabled();

    fireEvent.change(screen.getByTestId("prepared-concentration-input"), {
      target: { value: "10%" },
    });
    expect(submit).toBeDisabled(); // solvent still blank

    fireEvent.change(screen.getByTestId("prepared-solvent-input"), {
      target: { value: "Water" },
    });
    expect(submit).not.toBeDisabled();

    // Whitespace-only → still disabled (trim check)
    fireEvent.change(screen.getByTestId("prepared-concentration-input"), {
      target: { value: "   " },
    });
    expect(submit).toBeDisabled();
  });

  it("does NOT call onSubmit when form is invalid and submit is forced", () => {
    const onSubmit = jest.fn();
    render(
      <PrepareSolutionModal
        parent={baseParent}
        onSubmit={onSubmit}
        onClose={jest.fn()}
      />
    );
    // Direct click on the disabled button: browser prevents handler, but
    // even if an automation framework bypassed disabled, handleSubmit's
    // canSubmit guard would still stop the callback.
    fireEvent.click(screen.getByTestId("prepare-solution-submit-btn"));
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it("calls onSubmit with trimmed values when submitted with valid form", () => {
    const onSubmit = jest.fn();
    render(
      <PrepareSolutionModal
        parent={baseParent}
        onSubmit={onSubmit}
        onClose={jest.fn()}
      />
    );
    fireEvent.change(screen.getByTestId("prepared-concentration-input"), {
      target: { value: "  10% (v/v)  " },
    });
    fireEvent.change(screen.getByTestId("prepared-solvent-input"), {
      target: { value: "  Water  " },
    });
    fireEvent.click(screen.getByTestId("prepare-solution-submit-btn"));
    expect(onSubmit).toHaveBeenCalledTimes(1);
    expect(onSubmit).toHaveBeenCalledWith({
      concentration: "10% (v/v)",
      solvent: "Water",
    });
  });

  it("Enter key on the form submits when valid", () => {
    const onSubmit = jest.fn();
    render(
      <PrepareSolutionModal
        parent={baseParent}
        onSubmit={onSubmit}
        onClose={jest.fn()}
      />
    );
    fireEvent.change(screen.getByTestId("prepared-concentration-input"), {
      target: { value: "10%" },
    });
    fireEvent.change(screen.getByTestId("prepared-solvent-input"), {
      target: { value: "Water" },
    });
    // Simulate form submission (which is what Enter key does in a form)
    const form = screen
      .getByTestId("prepare-solution-submit-btn")
      .closest("form");
    fireEvent.submit(form);
    expect(onSubmit).toHaveBeenCalledWith({
      concentration: "10%",
      solvent: "Water",
    });
  });

  it("Cancel button calls onClose (not onSubmit)", () => {
    const onClose = jest.fn();
    const onSubmit = jest.fn();
    render(
      <PrepareSolutionModal
        parent={baseParent}
        onSubmit={onSubmit}
        onClose={onClose}
      />
    );
    // Fill the form so onSubmit would fire if miswired
    fireEvent.change(screen.getByTestId("prepared-concentration-input"), {
      target: { value: "10%" },
    });
    fireEvent.change(screen.getByTestId("prepared-solvent-input"), {
      target: { value: "Water" },
    });
    fireEvent.click(screen.getByTestId("prepare-solution-cancel-btn"));
    expect(onClose).toHaveBeenCalledTimes(1);
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it("X button calls onClose", () => {
    const onClose = jest.fn();
    render(
      <PrepareSolutionModal
        parent={baseParent}
        onSubmit={jest.fn()}
        onClose={onClose}
      />
    );
    fireEvent.click(screen.getByTestId("prepare-solution-close-btn"));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("clicking the backdrop calls onClose", () => {
    const onClose = jest.fn();
    render(
      <PrepareSolutionModal
        parent={baseParent}
        onSubmit={jest.fn()}
        onClose={onClose}
      />
    );
    fireEvent.click(screen.getByRole("dialog"));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("clicking inside the dialog content does NOT close", () => {
    const onClose = jest.fn();
    render(
      <PrepareSolutionModal
        parent={baseParent}
        onSubmit={jest.fn()}
        onClose={onClose}
      />
    );
    fireEvent.click(screen.getByTestId("prepare-solution-parent-summary"));
    expect(onClose).not.toHaveBeenCalled();
  });

  it("Escape key calls onClose", () => {
    const onClose = jest.fn();
    render(
      <PrepareSolutionModal
        parent={baseParent}
        onSubmit={jest.fn()}
        onClose={onClose}
      />
    );
    fireEvent.keyDown(window, { key: "Escape" });
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("focuses the concentration input on mount", () => {
    render(
      <PrepareSolutionModal
        parent={baseParent}
        onSubmit={jest.fn()}
        onClose={jest.fn()}
      />
    );
    expect(screen.getByTestId("prepared-concentration-input")).toHaveFocus();
  });

  it("renders the trust-boundary form note so users see the disclaimer before submitting", () => {
    render(
      <PrepareSolutionModal
        parent={baseParent}
        onSubmit={jest.fn()}
        onClose={jest.fn()}
      />
    );
    expect(screen.getByTestId("prepare-solution-form-note")).toBeInTheDocument();
  });
});
