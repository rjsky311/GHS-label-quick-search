import { fireEvent, render, screen } from "@testing-library/react";
import PreparedSidebar from "../PreparedSidebar";

jest.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key, options = {}) => options.defaultValue ?? key,
  }),
}));

const makeRecent = (overrides = {}) => ({
  schemaVersion: 1,
  createdAt: "2026-04-16T10:00:00.000Z",
  parentCas: "64-17-5",
  parentNameEn: "Ethanol",
  parentNameZh: "乙醇",
  concentration: "10%",
  solvent: "Water",
  preparedBy: "A. Chen",
  preparedDate: "2026-04-16",
  expiryDate: null,
  ...overrides,
});

describe("PreparedSidebar", () => {
  it("renders an empty state", () => {
    render(
      <PreparedSidebar
        recents={[]}
        onClose={jest.fn()}
        onClearRecents={jest.fn()}
        onReprint={jest.fn()}
      />
    );

    expect(screen.getByText("prepared.sidebarTitle")).toBeInTheDocument();
    expect(screen.getByText("prepared.sidebarEmpty")).toBeInTheDocument();
  });

  it("renders workflow recents and reprints through the current handler", () => {
    const onReprint = jest.fn();
    const record = makeRecent();
    render(
      <PreparedSidebar
        recents={[record]}
        onClose={jest.fn()}
        onClearRecents={jest.fn()}
        onReprint={onReprint}
      />
    );

    expect(screen.getByTestId("prepared-recent-item-0")).toHaveTextContent(
      "10% Ethanol in Water"
    );
    fireEvent.click(screen.getByTestId("prepared-reprint-btn-0"));

    expect(onReprint).toHaveBeenCalledWith(record, record.createdAt);
  });

  it("marks expired recents in the reprint sidebar", () => {
    render(
      <PreparedSidebar
        recents={[makeRecent({ expiryDate: "2000-01-01" })]}
        onClose={jest.fn()}
        onClearRecents={jest.fn()}
        onReprint={jest.fn()}
      />
    );

    expect(screen.getByTestId("prepared-sidebar-expiry-status-0")).toHaveTextContent(
      "prepared.expiryExpired"
    );
  });
});
