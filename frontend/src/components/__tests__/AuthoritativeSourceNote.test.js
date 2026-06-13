import { render, screen } from "@testing-library/react";
import AuthoritativeSourceNote from "../AuthoritativeSourceNote";

describe("AuthoritativeSourceNote", () => {
  it("renders with results variant by default", () => {
    render(<AuthoritativeSourceNote />);
    expect(
      screen.getByTestId("authoritative-source-note-results")
    ).toBeInTheDocument();
  });

  it("renders with the requested variant", () => {
    render(<AuthoritativeSourceNote variant="detail" />);
    expect(
      screen.getByTestId("authoritative-source-note-detail")
    ).toBeInTheDocument();
  });

  it("has role=note for assistive tech", () => {
    render(<AuthoritativeSourceNote />);
    expect(
      screen.getByTestId("authoritative-source-note-results")
    ).toHaveAttribute("role", "note");
  });

  it("uses notebook note and chip styling for the general results note", () => {
    render(<AuthoritativeSourceNote />);

    const note = screen.getByTestId("authoritative-source-note-results");
    expect(note).toHaveClass("notebook-note");
    expect(note).not.toHaveClass("bg-slate-50");
    expect(screen.getByText("trust.verifySds")).toHaveClass("notebook-chip");
  });

  it("renders the i18n note key (mock returns as-is)", () => {
    render(<AuthoritativeSourceNote />);
    expect(screen.getByText("trust.authoritativeTitle")).toBeInTheDocument();
    expect(screen.getByText("trust.authoritativeNote")).toBeInTheDocument();
  });

  it("renders the verification checklist", () => {
    render(<AuthoritativeSourceNote />);
    const checklist = screen.getByTestId("authoritative-source-checklist-results");
    expect(checklist).toHaveTextContent("trust.verifySds");
    expect(checklist).toHaveTextContent("trust.verifySupplier");
    expect(checklist).toHaveTextContent("trust.verifyLocal");
  });

  it("supports supplemental and blocked safety modes", () => {
    const { rerender } = render(<AuthoritativeSourceNote mode="supplemental" />);
    expect(screen.getByTestId("authoritative-source-note-results")).toHaveAttribute(
      "data-mode",
      "supplemental",
    );
    expect(screen.getByText("trust.supplementalNote")).toBeInTheDocument();

    rerender(<AuthoritativeSourceNote mode="blocked" variant="print" />);
    expect(screen.getByTestId("authoritative-source-note-print")).toHaveAttribute(
      "data-mode",
      "blocked",
    );
    expect(screen.getByText("trust.blockedNote")).toBeInTheDocument();
  });

  it("note copy is identical across variants (single source of truth)", () => {
    const { rerender } = render(<AuthoritativeSourceNote variant="results" />);
    const resultsNote = screen.getByTestId("authoritative-source-note-results");
    const resultsText = resultsNote.textContent;

    rerender(<AuthoritativeSourceNote variant="detail" />);
    const detailNote = screen.getByTestId("authoritative-source-note-detail");
    expect(detailNote.textContent).toBe(resultsText);
  });
});
