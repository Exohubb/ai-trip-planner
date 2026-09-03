import { afterEach, describe, expect, it, vi } from "vitest";
import { renderHook } from "@testing-library/react";
import { useGlobalShortcut } from "./useGlobalShortcut";

function pressKey(key: string) {
  window.dispatchEvent(new KeyboardEvent("keydown", { key, bubbles: true }));
}

describe("useGlobalShortcut", () => {
  afterEach(() => {
    document.body.innerHTML = "";
  });

  /** Validates: Requirements 17.5 */
  it("calls the handler when the shortcut key is pressed and focus is not in a text input", () => {
    const handler = vi.fn();
    renderHook(() => useGlobalShortcut("e", handler));

    pressKey("e");

    expect(handler).toHaveBeenCalledTimes(1);
  });

  /** Validates: Requirements 17.5 */
  it("does not call the handler when keyboard focus is within a textarea", () => {
    const handler = vi.fn();
    const textarea = document.createElement("textarea");
    document.body.appendChild(textarea);
    textarea.focus();

    renderHook(() => useGlobalShortcut("e", handler));

    pressKey("e");

    expect(handler).not.toHaveBeenCalled();
  });

  /** Validates: Requirements 17.5 */
  it("does not call the handler when keyboard focus is within a text input", () => {
    const handler = vi.fn();
    const input = document.createElement("input");
    input.type = "text";
    document.body.appendChild(input);
    input.focus();

    renderHook(() => useGlobalShortcut("Enter", handler));

    pressKey("Enter");

    expect(handler).not.toHaveBeenCalled();
  });

  it("does not call the handler for a different key", () => {
    const handler = vi.fn();
    renderHook(() => useGlobalShortcut("e", handler));

    pressKey("x");

    expect(handler).not.toHaveBeenCalled();
  });

  it("does not register a listener when disabled", () => {
    const handler = vi.fn();
    renderHook(() => useGlobalShortcut("e", handler, false));

    pressKey("e");

    expect(handler).not.toHaveBeenCalled();
  });
});
