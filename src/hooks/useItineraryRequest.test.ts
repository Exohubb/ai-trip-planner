import { act, renderHook, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useItineraryRequest } from "./useItineraryRequest";
import { fetchAndValidateItinerary, type ParseResult } from "../lib/fetchAndValidateItinerary";
import { streamItinerary, type StreamItineraryCallbacks, type StreamOutcome } from "../lib/streamItinerary";
import type { Day, Itinerary } from "@shared/itinerarySchema";

vi.mock("../lib/fetchAndValidateItinerary", () => ({
  fetchAndValidateItinerary: vi.fn(),
}));

vi.mock("../lib/streamItinerary", () => ({
  streamItinerary: vi.fn(),
}));

const mockedFetchAndValidateItinerary = vi.mocked(fetchAndValidateItinerary);
const mockedStreamItinerary = vi.mocked(streamItinerary);

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
    mockedStreamItinerary.mockReset();
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

  /** A resolver pair for a streamItinerary call, exposing the callbacks it was invoked with. */
  function deferredStream() {
    let resolve!: (value: StreamOutcome) => void;
    let callbacks!: StreamItineraryCallbacks;
    const promise = new Promise<StreamOutcome>((res) => {
      resolve = res;
    });
    mockedStreamItinerary.mockImplementationOnce((_description, _signal, cbs) => {
      callbacks = cbs;
      return promise;
    });
    return {
      resolve,
      getCallbacks: () => callbacks,
    };
  }

  function makeDay(id: number, title: string): Day {
    return { id, stops: [{ id: `s${id}`, title }] };
  }

  describe("submitStreaming", () => {
    /** Validates: Requirements 14.1, 14.2 */
    it("sets status to streaming and accumulates Day objects from onDays callbacks into partialDays", async () => {
      const stream = deferredStream();
      const { result } = renderHook(() => useItineraryRequest());

      act(() => {
        result.current.submitStreaming("A 2 day trip to Paris");
      });

      expect(result.current.status).toBe("streaming");
      expect(result.current.partialDays).toEqual([]);

      act(() => {
        stream.getCallbacks().onDays([makeDay(1, "Eiffel Tower")]);
      });
      expect(result.current.partialDays).toEqual([makeDay(1, "Eiffel Tower")]);

      act(() => {
        stream.getCallbacks().onDays([makeDay(2, "Louvre")]);
      });
      expect(result.current.partialDays).toEqual([makeDay(1, "Eiffel Tower"), makeDay(2, "Louvre")]);
    });

    /** Validates: Requirements 14.5 */
    it("transitions to success with the fully-assembled itinerary once the stream resolves ok", async () => {
      const stream = deferredStream();
      const { result } = renderHook(() => useItineraryRequest());

      act(() => {
        result.current.submitStreaming("A trip");
      });

      const finalItinerary = makeItinerary("Final result");
      await act(async () => {
        stream.resolve({ ok: true, itinerary: finalItinerary });
        await Promise.resolve();
      });

      await waitFor(() => expect(result.current.status).toBe("success"));
      expect(result.current.itinerary).toEqual(finalItinerary);
      expect(result.current.partialDays).toEqual([]);
    });

    /** Validates: Requirements 14.3 */
    it("on stream failure, sets error status but retains partialDays via streamIncomplete", async () => {
      const stream = deferredStream();
      const { result } = renderHook(() => useItineraryRequest());

      act(() => {
        result.current.submitStreaming("A trip");
      });

      act(() => {
        stream.getCallbacks().onDays([makeDay(1, "Eiffel Tower")]);
      });

      await act(async () => {
        stream.resolve({ ok: false, reason: "upstream_error" });
        await Promise.resolve();
      });

      await waitFor(() => expect(result.current.status).toBe("error"));
      expect(result.current.streamIncomplete).toBe(true);
      expect(result.current.partialDays).toEqual([makeDay(1, "Eiffel Tower")]);
      expect(result.current.errorMessage).toMatch(/incomplete/i);
    });

    /** Validates: Requirements 5.1-5.4, 14.4 */
    it("discards chunks and the outcome of a stale (superseded) stream", async () => {
      const first = deferredStream();
      const { result } = renderHook(() => useItineraryRequest());

      act(() => {
        result.current.submitStreaming("first trip");
      });
      const firstCallbacks = first.getCallbacks();

      const second = deferredStream();
      act(() => {
        result.current.submitStreaming("second trip");
      });

      // A chunk arriving late from the now-stale first stream must have no effect.
      act(() => {
        firstCallbacks.onDays([makeDay(1, "Stale day")]);
      });
      expect(result.current.partialDays).toEqual([]);

      act(() => {
        second.getCallbacks().onDays([makeDay(2, "Fresh day")]);
      });
      expect(result.current.partialDays).toEqual([makeDay(2, "Fresh day")]);

      // The stale first stream's outcome arriving late must not flip status away from streaming.
      await act(async () => {
        first.resolve({ ok: true, itinerary: makeItinerary("Stale result") });
        await Promise.resolve();
      });
      expect(result.current.status).toBe("streaming");
      expect(result.current.itinerary).toBeNull();

      const freshItinerary = makeItinerary("Fresh result");
      await act(async () => {
        second.resolve({ ok: true, itinerary: freshItinerary });
        await Promise.resolve();
      });

      await waitFor(() => expect(result.current.status).toBe("success"));
      expect(result.current.itinerary).toEqual(freshItinerary);
    });

    /** Validates: Requirements 5.2, 14.4 */
    it("aborts the previous stream's signal when a new streaming request is submitted", async () => {
      const capturedSignals: AbortSignal[] = [];
      mockedStreamItinerary.mockImplementation((_description, signal) => {
        capturedSignals.push(signal);
        return new Promise(() => {
          // never resolves
        });
      });

      const { result } = renderHook(() => useItineraryRequest());

      act(() => {
        result.current.submitStreaming("first trip");
      });
      act(() => {
        result.current.submitStreaming("second trip");
      });

      expect(capturedSignals[0]?.aborted).toBe(true);
      expect(capturedSignals[1]?.aborted).toBe(false);
    });
  });
});
