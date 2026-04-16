import { render, screen } from "@testing-library/react";
import UpstreamErrorBanner from "../UpstreamErrorBanner";

describe("UpstreamErrorBanner", () => {
  it("renders nothing when count is 0", () => {
    const { container } = render(<UpstreamErrorBanner count={0} />);
    expect(container.firstChild).toBeNull();
  });

  it("renders nothing when count is undefined", () => {
    const { container } = render(<UpstreamErrorBanner />);
    expect(container.firstChild).toBeNull();
  });

  it("renders the banner when count >= 1", () => {
    render(<UpstreamErrorBanner count={3} />);
    expect(screen.getByTestId("upstream-error-banner")).toBeInTheDocument();
  });

  it("has role=alert for assistive tech", () => {
    render(<UpstreamErrorBanner count={1} />);
    const banner = screen.getByTestId("upstream-error-banner");
    expect(banner).toHaveAttribute("role", "alert");
  });

  it("renders the title and body copy (i18n keys, mock returns as-is)", () => {
    render(<UpstreamErrorBanner count={2} />);
    // i18n mock returns keys verbatim
    expect(screen.getByText("upstream.bannerTitle")).toBeInTheDocument();
    expect(screen.getByText("upstream.bannerBody")).toBeInTheDocument();
  });
});
