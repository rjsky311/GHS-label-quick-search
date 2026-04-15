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

  describe("stability under parent re-render", () => {
    // Regression: the trap must NOT be torn down and rebuilt just
    // because the parent passed a new `onClose` callback identity.
    // Otherwise every App re-render (toggling a favorite, clearing
    // history, etc.) would:
    //   1. restore focus to the opener — even though the sidebar is
    //      still open — and
    //   2. immediately re-focus the panel's first focusable on the
    //      next tick,
    // which produces a visible focus "flicker" and is jarring for
    // keyboard/screen-reader users.

    function Host({ renderKey, onClose }) {
      // A new arrow function each render, same as sidebars receive
      // from App.js (`onClose={() => setShowX(false)}`).
      const inlineClose = () => onClose("inline-" + renderKey);
      const ref = useFocusTrap(inlineClose);
      return (
        <div ref={ref} role="dialog" aria-modal="true">
          <button data-testid="first">First</button>
          <button data-testid="second">Second</button>
          <button data-testid="last">Last</button>
        </div>
      );
    }

    function OuterRerender({ onClose }) {
      const [tick, setTick] = useState(0);
      return (
        <>
          <button data-testid="opener" onClick={() => {}}>Open</button>
          <button data-testid="bump" onClick={() => setTick((t) => t + 1)}>
            Bump
          </button>
          <Host renderKey={tick} onClose={onClose} />
        </>
      );
    }

    it("parent re-render with a new inline onClose does not restore focus to opener", () => {
      const onClose = jest.fn();
      render(<OuterRerender onClose={onClose} />);

      // User has tabbed to the middle button inside the panel.
      const second = screen.getByTestId("second");
      second.focus();
      expect(second).toHaveFocus();

      // Parent re-renders (e.g. state changed elsewhere in App),
      // passing a fresh inline onClose identity.
      fireEvent.click(screen.getByTestId("bump"));
      fireEvent.click(screen.getByTestId("bump"));

      // The trap must have absorbed the callback identity change.
      // Focus must NOT have been restored to anything outside the
      // panel, nor snapped back to `first`. It should stay on
      // `second` — exactly where the user left it.
      expect(second).toHaveFocus();
      expect(onClose).not.toHaveBeenCalled();
    });

    it("Escape always invokes the latest onClose after re-render", () => {
      // If the trap had captured the initial onClose at mount, a
      // later parent re-render that swaps in a new callback would
      // leave Escape calling the stale closure. We prove that
      // the ref-based indirection keeps the callback current.
      const firstOnClose = jest.fn((source) => `first-${source}`);
      const secondOnClose = jest.fn((source) => `second-${source}`);
      const { rerender } = render(<OuterRerender onClose={firstOnClose} />);

      // Force a parent re-render that also swaps onClose itself
      // (not just its identity, but the underlying function):
      rerender(<OuterRerender onClose={secondOnClose} />);
      // And one more render tick for good measure.
      fireEvent.click(screen.getByTestId("bump"));

      // Press Escape — the call should go to the LATEST onClose.
      fireEvent.keyDown(document, { key: "Escape" });
      expect(secondOnClose).toHaveBeenCalledTimes(1);
      expect(firstOnClose).not.toHaveBeenCalled();
    });
  });
});
