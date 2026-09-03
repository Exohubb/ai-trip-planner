import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, renderHook } from "@testing-library/react";
import { useTheme } from "./useTheme";

const STORAGE_KEY = "ai-trip-planner:theme";

describe("useTheme", () => {
  beforeEach(() => {
    window.localStorage.clear();
    document.documentElement.removeAttribute("data-theme");
  });

  afterEach(() => {
    window.localStorage.clear();
    document.documentElement.removeAttribute("data-theme");
    vi.restoreAllMocks();
  });

  /** Validates: Requirements 17.4 */
  it("defaults to light theme when no preference is stored", () => {
    const { result } = renderHook(() => useTheme());

    expect(result.current.theme).toBe("light");
    expect(document.documentElement.getAttribute("data-theme")).toBe("light");
  });

  /** Validates: Requirements 17.4 */
  it("defaults to light theme when the stored value is invalid", () => {
    window.localStorage.setItem(STORAGE_KEY, "not-a-theme");

    const { result } = renderHook(() => useTheme());

    expect(result.current.theme).toBe("light");
  });

  it("reads a previously stored dark preference on mount", () => {
    window.localStorage.setItem(STORAGE_KEY, "dark");

    const { result } = renderHook(() => useTheme());

    expect(result.current.theme).toBe("dark");
    expect(document.documentElement.getAttribute("data-theme")).toBe("dark");
  });

  /** Validates: Requirements 17.3 */
  it("toggleTheme flips the theme and persists the new choice to localStorage", () => {
    const { result } = renderHook(() => useTheme());

    act(() => {
      result.current.toggleTheme();
    });

    expect(result.current.theme).toBe("dark");
    expect(window.localStorage.getItem(STORAGE_KEY)).toBe("dark");
    expect(document.documentElement.getAttribute("data-theme")).toBe("dark");

    act(() => {
      result.current.toggleTheme();
    });

    expect(result.current.theme).toBe("light");
    expect(window.localStorage.getItem(STORAGE_KEY)).toBe("light");
  });

  /** Validates: Requirements 17.3 */
  it("a fresh mount picks up the previously persisted choice (persists across page loads)", () => {
    const first = renderHook(() => useTheme());
    act(() => {
      first.result.current.toggleTheme();
    });
    expect(first.result.current.theme).toBe("dark");

    const second = renderHook(() => useTheme());
    expect(second.result.current.theme).toBe("dark");
  });

  it("does not crash when localStorage.setItem throws (storage unavailable)", () => {
    vi.spyOn(window.localStorage.__proto__, "setItem").mockImplementation(() => {
      throw new Error("quota exceeded");
    });
    const { result } = renderHook(() => useTheme());

    expect(() => {
      act(() => {
        result.current.toggleTheme();
      });
    }).not.toThrow();
    expect(result.current.theme).toBe("dark");
  });
});
