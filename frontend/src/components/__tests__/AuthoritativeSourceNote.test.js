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

  it("renders the i18n note key (mock returns as-is)", () => {
    render(<AuthoritativeSourceNote />);
    expect(screen.getByText("trust.authoritativeNote")).toBeInTheDocument();
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
