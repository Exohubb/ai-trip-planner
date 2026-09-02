import { act, renderHook, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { useItineraryRequest } from "./useItineraryRequest";
import { fetchAndValidateItinerary, type ParseResult } from "../lib/fetchAndValidateItinerary";
import type { Itinerary } from "@shared/itinerarySchema";

vi.mock("../lib/fetchAndValidateItinerary", () => ({
  fetchAndValidateItinerary: vi.fn(),
}));

const mockedFetchAndValidateItinerary = vi.mocked(fetchAndValidateItinerary);

function makeItinerary(label: string): Itinerary {
  return { days: [{ id: 1, stops: [{ id: "s1", title: label }] }] };
}

/** A resolver pair that lets the test control exactly when a promise settles. */
function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((res) => {
    resolve = res;
  });
  return { promise, resolve };
}

describe("useItineraryRequest", () => {
  /** Validates: Requirements 5.1, 5.2, 5.3, 5.4 */
  it("discards a stale first response that resolves after a second, newer request", async () => {
    const first = deferred<ParseResult>();
    const second = deferred<ParseResult>();

    mockedFetchAndValidateItinerary.mockReturnValueOnce(first.promise);
    mockedFetchAndValidateItinerary.mockReturnValueOnce(second.promise);

    const { result } = renderHook(() => useItineraryRequest());

    act(() => {
      result.current.submit("first trip description");
    });
    expect(result.current.status).toBe("loading");

    act(() => {
      result.current.submit("second trip description");
    });
    expect(result.current.status).toBe("loading");
    expect(mockedFetchAndValidateItinerary).toHaveBeenCalledTimes(2);

    // Resolve the SECOND (latest) request's outcome first.
    const secondItinerary = makeItinerary("Second result");
    await act(async () => {
      second.resolve({ ok: true, itinerary: secondItinerary });
      await Promise.resolve();
    });

    await waitFor(() => expect(result.current.status).toBe("success"));
    expect(result.current.itinerary).toEqual(secondItinerary);

    // Now let the FIRST (stale) request's response arrive late.
    const firstItinerary = makeItinerary("First result - should be ignored");
    await act(async () => {
      first.resolve({ ok: true, itinerary: firstItinerary });
      await Promise.resolve();
    });

    // The stale outcome must have no visible effect: state still reflects the second request.
    expect(result.current.status).toBe("success");
    expect(result.current.itinerary).toEqual(secondItinerary);
  });

  /** Validates: Requirements 5.1, 5.2, 5.3, 5.4 */
  it("discards a stale first failure that resolves after a second, newer success", async () => {
    const first = deferred<ParseResult>();
    const second = deferred<ParseResult>();

    mockedFetchAndValidateItinerary.mockReturnValueOnce(first.promise);
    mockedFetchAndValidateItinerary.mockReturnValueOnce(second.promise);

    const { result } = renderHook(() => useItineraryRequest());

    act(() => {
      result.current.submit("first trip description");
    });
    act(() => {
      result.current.submit("second trip description");
    });

    const secondItinerary = makeItinerary("Second result");
    await act(async () => {
      second.resolve({ ok: true, itinerary: secondItinerary });
      await Promise.resolve();
    });

    await waitFor(() => expect(result.current.status).toBe("success"));

    // The first request's late failure must not flip the hook back into an error state.
    await act(async () => {
      first.resolve({ ok: false, reason: "network" });
      await Promise.resolve();
    });

    expect(result.current.status).toBe("success");
    expect(result.current.errorMessage).toBeNull();
    expect(result.current.itinerary).toEqual(secondItinerary);
  });
});
