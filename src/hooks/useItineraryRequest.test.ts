import { act, renderHook, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
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
  beforeEach(() => {
    mockedFetchAndValidateItinerary.mockReset();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  /** Validates: Requirements 2.8, 4.6 */
  it("aborts the in-flight request after 30s and surfaces the timeout error message", async () => {
    vi.useFakeTimers();

    let capturedSignal: AbortSignal | undefined;
    mockedFetchAndValidateItinerary.mockImplementation((_description, signal) => {
      capturedSignal = signal;
      // Never resolves on its own; only settles once the caller reacts to `signal`'s abort.
      return new Promise((resolve) => {
        signal.addEventListener("abort", () => {
          resolve({ ok: false, reason: "timeout" });
        });
      });
    });

    const { result } = renderHook(() => useItineraryRequest());

    act(() => {
      result.current.submit("A weekend in Rome");
    });

    expect(capturedSignal?.aborted).toBe(false);

    await act(async () => {
      vi.advanceTimersByTime(30_000);
      await Promise.resolve();
    });

    expect(capturedSignal?.aborted).toBe(true);
    expect(result.current.status).toBe("error");
    expect(result.current.errorMessage).toMatch(/took too long/i);
  });

  /** Validates: Requirements 2.8, 4.6, 5.3 */
  it("discards a timed-out first request's outcome if a newer request has since been submitted", async () => {
    vi.useFakeTimers();

    const signals: AbortSignal[] = [];
    mockedFetchAndValidateItinerary.mockImplementation((_description, signal) => {
      signals.push(signal);
      return new Promise((resolve) => {
        signal.addEventListener("abort", () => {
          resolve({ ok: false, reason: "timeout" });
        });
      });
    });

    const { result } = renderHook(() => useItineraryRequest());

    act(() => {
      result.current.submit("first trip description");
    });

    // First request's own AbortController is aborted immediately by the second
    // submit (Req 5.2), before its 30s timer would ever fire.
    act(() => {
      result.current.submit("second trip description");
    });

    expect(signals[0]?.aborted).toBe(true);

    await act(async () => {
      await Promise.resolve();
    });

    // The first request's (stale) timeout outcome must not be reflected in state.
    expect(result.current.status).toBe("loading");

    const second = signals[1];
    await act(async () => {
      vi.advanceTimersByTime(30_000);
      await Promise.resolve();
    });

    expect(second?.aborted).toBe(true);
    expect(result.current.status).toBe("error");
    expect(result.current.errorMessage).toMatch(/took too long/i);
  });

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

  /** Validates: Requirements 6.7 (requestId used by ItineraryView to reset local edit state) */
  it("updates requestId on each successful request but not on a background failure", async () => {
    const first = deferred<ParseResult>();
    const second = deferred<ParseResult>();

    mockedFetchAndValidateItinerary.mockReturnValueOnce(first.promise);
    mockedFetchAndValidateItinerary.mockReturnValueOnce(second.promise);

    const { result } = renderHook(() => useItineraryRequest());

    expect(result.current.requestId).toBe(0);

    act(() => {
      result.current.submit("first trip description");
    });

    await act(async () => {
      first.resolve({ ok: true, itinerary: makeItinerary("First result") });
      await Promise.resolve();
    });

    await waitFor(() => expect(result.current.status).toBe("success"));
    const firstRequestId = result.current.requestId;
    expect(firstRequestId).toBeGreaterThan(0);

    // A background retry that fails should retain the previous itinerary and requestId.
    act(() => {
      result.current.submit("second trip description");
    });

    await act(async () => {
      second.resolve({ ok: false, reason: "network" });
      await Promise.resolve();
    });

    await waitFor(() => expect(result.current.status).toBe("error"));
    expect(result.current.requestId).toBe(firstRequestId);
    expect(result.current.itinerary).toEqual(makeItinerary("First result"));
  });
});
