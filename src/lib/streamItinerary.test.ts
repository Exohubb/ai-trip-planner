import { afterEach, describe, expect, it, vi } from "vitest";
import { streamItinerary } from "./streamItinerary";

/** Builds a fetch-Response-like object whose `.body` streams the given raw SSE text chunks. */
function makeSseResponse(rawChunks: string[], { ok = true, status = 200 } = {}) {
  const encoder = new TextEncoder();
  const body = new ReadableStream<Uint8Array>({
    start(controller) {
      for (const chunk of rawChunks) {
        controller.enqueue(encoder.encode(chunk));
      }
      controller.close();
    },
  });
  return { ok, status, body } as unknown as Response;
}

function sseFrame(event: string, data: unknown): string {
  return `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
}

describe("streamItinerary", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("invokes onDays for each chunk event's newly-completed, valid Day objects", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      makeSseResponse([
        sseFrame("chunk", { newDays: [{ id: 1, stops: [] }] }),
        sseFrame("chunk", { newDays: [{ id: 2, stops: [{ id: "s1", title: "Louvre" }] }] }),
        sseFrame("done", { days: [{ id: 1, stops: [] }, { id: 2, stops: [{ id: "s1", title: "Louvre" }] }] }),
      ]),
    );
    vi.stubGlobal("fetch", fetchMock);

    const onDays = vi.fn();
    const outcome = await streamItinerary("A trip", new AbortController().signal, { onDays });

    expect(onDays).toHaveBeenNthCalledWith(1, [{ id: 1, stops: [] }]);
    expect(onDays).toHaveBeenNthCalledWith(2, [{ id: 2, stops: [{ id: "s1", title: "Louvre", type: "stop" }] }]);
    expect(outcome).toEqual({
      ok: true,
      itinerary: {
        days: [
          { id: 1, stops: [] },
          { id: 2, stops: [{ id: "s1", title: "Louvre", type: "stop" }] },
        ],
      },
    });
  });

  it("silently skips a chunk-level Day that fails validation, without failing the whole stream", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      makeSseResponse([
        // Second day is missing "stops" entirely — invalid at the chunk level.
        sseFrame("chunk", { newDays: [{ id: 1, stops: [] }, { notADay: true }] }),
        sseFrame("done", { days: [{ id: 1, stops: [] }] }),
      ]),
    );
    vi.stubGlobal("fetch", fetchMock);

    const onDays = vi.fn();
    const outcome = await streamItinerary("A trip", new AbortController().signal, { onDays });

    expect(onDays).toHaveBeenCalledWith([{ id: 1, stops: [] }]);
    expect(outcome).toEqual({ ok: true, itinerary: { days: [{ id: 1, stops: [] }] } });
  });

  it("resolves with invalid_shape when the done event's payload fails ItinerarySchema validation", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      makeSseResponse([sseFrame("done", { days: [{ id: 1, stops: [{ time: "9am" }] }] })]),
    );
    vi.stubGlobal("fetch", fetchMock);

    const outcome = await streamItinerary("A trip", new AbortController().signal, { onDays: vi.fn() });

    expect(outcome).toEqual({ ok: false, reason: "invalid_shape" });
  });

  it("resolves with upstream_error when an error event is received", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      makeSseResponse([sseFrame("error", { error: "upstream_error" })]),
    );
    vi.stubGlobal("fetch", fetchMock);

    const outcome = await streamItinerary("A trip", new AbortController().signal, { onDays: vi.fn() });

    expect(outcome).toEqual({ ok: false, reason: "upstream_error" });
  });

  it("resolves with http_error on a non-2xx response", async () => {
    const fetchMock = vi.fn().mockResolvedValue(makeSseResponse([], { ok: false, status: 500 }));
    vi.stubGlobal("fetch", fetchMock);

    const outcome = await streamItinerary("A trip", new AbortController().signal, { onDays: vi.fn() });

    expect(outcome).toEqual({ ok: false, reason: "http_error" });
  });

  it("resolves with network on a fetch rejection when the request wasn't aborted", async () => {
    const fetchMock = vi.fn().mockRejectedValue(new TypeError("network failure"));
    vi.stubGlobal("fetch", fetchMock);

    const outcome = await streamItinerary("A trip", new AbortController().signal, { onDays: vi.fn() });

    expect(outcome).toEqual({ ok: false, reason: "network" });
  });

  it("resolves with timeout when the request was aborted before fetch rejects", async () => {
    const controller = new AbortController();
    const fetchMock = vi.fn().mockImplementation(() => {
      controller.abort();
      return Promise.reject(new DOMException("Aborted", "AbortError"));
    });
    vi.stubGlobal("fetch", fetchMock);

    const outcome = await streamItinerary("A trip", controller.signal, { onDays: vi.fn() });

    expect(outcome).toEqual({ ok: false, reason: "timeout" });
  });
});
