import React, { useState } from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import useFocusTrap from "../useFocusTrap";

/**
 * A minimal host component so we can exercise the hook in context
 * that mirrors how the sidebars use it: a ref on the panel, with
 * Escape-to-close wiring the returned onClose callback.
 */
function TrapHost({ onClose, showSecondary = false }) {
  const ref = useFocusTrap(onClose);
  return (
    <div ref={ref} role="dialog" aria-modal="true" data-testid="panel">
      <button data-testid="first">First</button>
      {showSecondary && <button data-testid="second">Second</button>}
      <button data-testid="last">Last</button>
    </div>
  );
}

function OuterPage({ openInitially = false }) {
  const [open, setOpen] = useState(openInitially);
  return (
    <>
      <button
        data-testid="opener"
        onClick={() => setOpen(true)}
      >
        Open
      </button>
      <button data-testid="other">Other</button>
      {open && <TrapHost onClose={() => setOpen(false)} showSecondary />}
    </>
  );
}

describe("useFocusTrap", () => {
  it("moves focus to the first focusable element on mount", () => {
    render(<TrapHost />);
    expect(screen.getByTestId("first")).toHaveFocus();
  });

  it("falls back to the panel itself when no focusable children exist", () => {
    function EmptyHost() {
      const ref = useFocusTrap(() => {});
      return (
        <div ref={ref} data-testid="empty-panel">
          <span>no buttons here</span>
        </div>
      );
    }
    render(<EmptyHost />);
    const panel = screen.getByTestId("empty-panel");
    expect(panel).toHaveAttribute("tabindex", "-1");
    expect(panel).toHaveFocus();
  });

  it("calls onClose when Escape is pressed", () => {
    const onClose = jest.fn();
    render(<TrapHost onClose={onClose} />);
    fireEvent.keyDown(document, { key: "Escape" });
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("wraps Tab from the last focusable back to the first", () => {
    render(<TrapHost showSecondary />);
    const first = screen.getByTestId("first");
    const last = screen.getByTestId("last");

    // Move focus to the last element and press Tab — should wrap.
    last.focus();
    fireEvent.keyDown(document, { key: "Tab" });
    expect(first).toHaveFocus();
  });

  it("wraps Shift+Tab from the first focusable back to the last", () => {
    render(<TrapHost showSecondary />);
    const first = screen.getByTestId("first");
    const last = screen.getByTestId("last");

    first.focus();
    fireEvent.keyDown(document, { key: "Tab", shiftKey: true });
    expect(last).toHaveFocus();
  });

  it("restores focus to the previously focused element on unmount", () => {
    render(<OuterPage />);
    const opener = screen.getByTestId("opener");
    opener.focus();
    expect(opener).toHaveFocus();

    // Open the trap
    fireEvent.click(opener);
    expect(screen.getByTestId("first")).toHaveFocus();

    // Close it via Escape
    fireEvent.keyDown(document, { key: "Escape" });

    // Focus must land back on the opener, not nowhere.
    expect(opener).toHaveFocus();
  });
});
