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

  it("returns no visual wrapper when there are no pictograms", () => {
    const { container } = render(<GHSPictogramStrip pictograms={[]} />);

    expect(container).toBeEmptyDOMElement();
  });
});
