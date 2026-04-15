import { useEffect, useRef } from "react";

/**
 * Focus management for custom modal/sidebar components that are not
 * built on Radix's Dialog (which already handles this).
 *
 * - Moves focus into the panel when it mounts so keyboard users don't
 *   have to find it.
 * - Traps Tab navigation inside the panel so focus can't leak back to
 *   the page behind the overlay.
 * - Closes on Escape via the `onClose` callback.
 * - On unmount, restores focus to whichever element was focused when
 *   the panel opened (typically the button that opened it), so the
 *   user lands where they expected.
 *
 * Usage:
 *   const panelRef = useFocusTrap(onClose);
 *   return <div ref={panelRef} role="dialog" aria-modal="true">…</div>;
 *
 * The ref should be attached to the inner panel element, not to the
 * backdrop — otherwise the backdrop's click-to-close handler can
 * interfere with the focus trap.
 */
export default function useFocusTrap(onClose) {
  const containerRef = useRef(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return undefined;

    const previouslyFocused =
      document.activeElement instanceof HTMLElement ? document.activeElement : null;

    const getFocusable = () =>
      Array.from(
        container.querySelectorAll(
          'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
        )
      );

    // Move focus into the panel. Prefer the first focusable element;
    // fall back to the container itself (tabindex -1) so Tab still
    // starts from a sensible anchor inside the modal.
    const focusables = getFocusable();
    if (focusables.length > 0) {
      focusables[0].focus();
    } else {
      if (!container.hasAttribute("tabindex")) {
        container.setAttribute("tabindex", "-1");
      }
      container.focus();
    }

    const handleKeyDown = (e) => {
      if (e.key === "Escape") {
        e.preventDefault();
        if (onClose) onClose();
        return;
      }
      if (e.key !== "Tab") return;

      const current = getFocusable();
      if (current.length === 0) {
        e.preventDefault();
        return;
      }
      const first = current[0];
      const last = current[current.length - 1];
      const active = document.activeElement;

      if (e.shiftKey) {
        if (active === first || !container.contains(active)) {
          e.preventDefault();
          last.focus();
        }
      } else if (active === last || !container.contains(active)) {
        e.preventDefault();
        first.focus();
      }
    };

    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      if (previouslyFocused && typeof previouslyFocused.focus === "function") {
        previouslyFocused.focus();
      }
    };
  }, [onClose]);

  return containerRef;
}
