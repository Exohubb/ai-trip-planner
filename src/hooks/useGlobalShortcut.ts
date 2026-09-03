import { useEffect } from "react";

/**
 * True when `element` is a text-entry control (a text input/textarea, or
 * any `contenteditable` element) that keyboard shortcuts must not fire
 * while focused (Requirement 17.5). `<input type="checkbox">`/`"radio"`/etc.
 * are deliberately excluded — shortcuts only need to yield to elements
 * where the pressed key is expected to insert a character.
 */
function isTextEntryElement(element: Element | null): boolean {
  if (!element) return false;
  if (element.tagName === "TEXTAREA") return true;
  if (element instanceof HTMLElement && element.isContentEditable) return true;
  if (element.tagName === "INPUT") {
    const type = (element as HTMLInputElement).type;
    // Non-text input types (checkbox, radio, button, range, ...) don't take
    // character input, so a shortcut key pressed while one of them is
    // focused is unambiguous and safe to trigger.
    return !["checkbox", "radio", "button", "submit", "range", "color"].includes(type);
  }
  return false;
}

/**
 * Registers a single global keyboard shortcut (Requirement 17.5): a
 * `keydown` listener on `window` that calls `handler` whenever `key` is
 * pressed, *except* while keyboard focus is within a text input or
 * textarea (checked via `document.activeElement`), where it early-returns
 * and lets the keystroke behave normally.
 */
export function useGlobalShortcut(key: string, handler: () => void, enabled = true): void {
  useEffect(() => {
    if (!enabled) return undefined;

    function onKeyDown(event: KeyboardEvent) {
      if (isTextEntryElement(document.activeElement)) return; // Req 17.5
      if (event.key.toLowerCase() !== key.toLowerCase()) return;
      handler();
    }

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [key, handler, enabled]);
}
