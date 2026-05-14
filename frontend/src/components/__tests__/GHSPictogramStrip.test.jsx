import { render, screen } from "@testing-library/react";
import GHSPictogramStrip from "../GHSPictogramStrip";

jest.mock("../GHSImage", () => {
  return function MockGHSImage({ code, name, className }) {
    return (
      <span data-testid={`ghs-img-${code}`} className={className}>
        {name || code}
      </span>
    );
  };
});

describe("GHSPictogramStrip", () => {
  it("renders pictograms in stable tiles with accessible classification context", () => {
    render(
      <GHSPictogramStrip
        pictograms={[{ code: "GHS02" }, { code: "GHS07" }]}
        markerTitle="Primary classification"
        getName={(pic) => `${pic.code} name`}
      />,
    );

    expect(
      screen.getByRole("group", { name: "Primary classification" }),
    ).toBeInTheDocument();
    expect(screen.getByTestId("ghs-img-GHS02")).toHaveTextContent(
      "GHS02 name",
    );
    expect(screen.getByTestId("ghs-img-GHS07")).toHaveTextContent(
      "GHS07 name",
    );
    expect(screen.getAllByTestId("ghs-pictogram-tile")).toHaveLength(2);
  });

  it("can expose code labels and stable geometry metadata for QA", () => {
    render(
      <GHSPictogramStrip
        pictograms={[{ code: "GHS05" }]}
        size="sm"
        variant="muted"
        showCodes
      />,
    );

    expect(screen.getByTestId("ghs-pictogram-strip")).toHaveAttribute(
      "data-count",
      "1",
    );
    expect(screen.getByTestId("ghs-pictogram-strip")).toHaveAttribute(
      "data-size",
      "sm",
    );
    expect(screen.getByTestId("ghs-pictogram-frame")).toHaveClass("h-9", "w-9");
    expect(screen.getByTestId("ghs-pictogram-code")).toHaveTextContent("GHS05");
  });

  it("keeps selected classification styling separate from custom overrides", () => {
    render(
      <GHSPictogramStrip
        pictograms={[{ code: "GHS04" }]}
        variant="selected"
        showCodes
      />,
    );

    expect(screen.getByTestId("ghs-pictogram-strip")).toHaveAttribute(
      "data-variant",
      "selected",
    );
    expect(screen.getByTestId("ghs-pictogram-frame")).toHaveClass(
      "border-blue-200",
      "bg-blue-50/60",
    );
  });

  it("returns no visual wrapper when there are no pictograms", () => {
    const { container } = render(<GHSPictogramStrip pictograms={[]} />);

    expect(container).toBeEmptyDOMElement();
  });
});
