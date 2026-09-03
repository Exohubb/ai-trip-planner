import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, renderHook } from "@testing-library/react";
import { useStoredItinerary } from "./useStoredItinerary";
import type { Itinerary } from "@shared/itinerarySchema";

const STORAGE_KEY = "ai-trip-planner:itinerary";

function makeItinerary(): Itinerary {
  return { days: [{ id: 1, stops: [{ id: "s1", title: "Eiffel Tower" }] }] };
}

describe("useStoredItinerary", () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  afterEach(() => {
    window.localStorage.clear();
    vi.restoreAllMocks();
  });

  /** Validates: Requirements 16.5 */
  it("discards corrupted (non-JSON) stored data without crashing, treating no session as existing", () => {
    window.localStorage.setItem(STORAGE_KEY, "{not valid json");

    const { result } = renderHook(() => useStoredItinerary());

    expect(result.current.storedItinerary).toBeNull();
  });

  /** Validates: Requirements 16.5 */
  it("discards stored data that fails ItinerarySchema validation without crashing", () => {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify({ days: [{ id: 1, stops: [{ title: "" }] }] }));

    const { result } = renderHook(() => useStoredItinerary());

    expect(result.current.storedItinerary).toBeNull();
  });

  it("returns null when nothing is stored", () => {
    const { result } = renderHook(() => useStoredItinerary());

    expect(result.current.storedItinerary).toBeNull();
  });

  it("returns the valid stored itinerary when one exists", () => {
    const itinerary = makeItinerary();
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(itinerary));

    const { result } = renderHook(() => useStoredItinerary());

    // ItinerarySchema.safeParse fills in `type: "stop"` on plain Stops
    // (see shared/itinerarySchema.ts), so compare structurally rather than
    // against the exact pre-parse literal.
    expect(result.current.storedItinerary).toEqual({
      days: [{ id: 1, stops: [{ id: "s1", title: "Eiffel Tower", type: "stop" }] }],
    });
  });

  /** Validates: Requirements 16.1 */
  it("saveItinerary writes the itinerary to storage, overwriting any previous value", () => {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(makeItinerary()));
    const { result } = renderHook(() => useStoredItinerary());

    const newItinerary: Itinerary = { days: [{ id: 1, stops: [{ id: "s2", title: "Louvre" }] }] };
    act(() => {
      result.current.saveItinerary(newItinerary);
    });

    expect(JSON.parse(window.localStorage.getItem(STORAGE_KEY)!)).toEqual(newItinerary);
  });

  /** Validates: Requirements 16.4 */
  it("clearStoredItinerary removes the stored value and updates storedItinerary to null", () => {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(makeItinerary()));
    const { result } = renderHook(() => useStoredItinerary());

    act(() => {
      result.current.clearStoredItinerary();
    });

    expect(window.localStorage.getItem(STORAGE_KEY)).toBeNull();
    expect(result.current.storedItinerary).toBeNull();
  });

  /** Validates: Requirements 16.6 */
  it("does not crash and returns null when localStorage.getItem throws (storage unavailable)", () => {
    vi.spyOn(window.localStorage.__proto__, "getItem").mockImplementation(() => {
      throw new Error("storage unavailable");
    });

    const { result } = renderHook(() => useStoredItinerary());

    expect(result.current.storedItinerary).toBeNull();
  });

  /** Validates: Requirements 16.6 */
  it("does not crash when a write fails (localStorage.setItem throws)", () => {
    vi.spyOn(window.localStorage.__proto__, "setItem").mockImplementation(() => {
      throw new Error("quota exceeded");
    });

    const { result } = renderHook(() => useStoredItinerary());

    expect(() => {
      act(() => {
        result.current.saveItinerary(makeItinerary());
      });
    }).not.toThrow();
  });
});
