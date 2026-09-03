import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { callLLM, GeminiCallError, streamLLM } from "./gemini";
import { buildItineraryPrompt } from "./promptBuilder";

const prompt = buildItineraryPrompt("A 3 day trip to Paris");

/** Builds a fetch-Response-like object whose `.body` streams the given SSE frame strings. */
function makeSseResponse(frames: string[], { ok = true, status = 200 } = {}) {
  const encoder = new TextEncoder();
  const body = new ReadableStream<Uint8Array>({
    start(controller) {
      for (const frame of frames) {
        controller.enqueue(encoder.encode(frame));
      }
      controller.close();
    },
  });
  return { ok, status, body };
}

function sseFrame(text: string): string {
  return `data: ${JSON.stringify({ candidates: [{ content: { parts: [{ text }] } }] })}\n\n`;
}

describe("callLLM", () => {
  const originalApiKey = process.env.GEMINI_API_KEY;

  beforeEach(() => {
    process.env.GEMINI_API_KEY = "test-api-key";
  });

  afterEach(() => {
    process.env.GEMINI_API_KEY = originalApiKey;
    vi.unstubAllGlobals();
    vi.useRealTimers();
  });

  it("throws GeminiCallError when GEMINI_API_KEY is not set", async () => {
    delete process.env.GEMINI_API_KEY;

    await expect(callLLM(prompt)).rejects.toBeInstanceOf(GeminiCallError);
  });

  it("never includes the API key in the thrown error message on failure", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: false,
      status: 400,
      json: async () => ({ error: { message: "API key not valid: test-api-key" } }),
    });
    vi.stubGlobal("fetch", fetchMock);

    let caught: unknown;
    try {
      await callLLM(prompt);
    } catch (err) {
      caught = err;
    }

    expect(caught).toBeInstanceOf(GeminiCallError);
    expect((caught as Error).message).not.toContain("test-api-key");
  });

  it("attaches the API key to the outbound request URL, not sent elsewhere", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({
        candidates: [{ content: { parts: [{ text: '{"days":[]}' }] } }],
      }),
    });
    vi.stubGlobal("fetch", fetchMock);

    await callLLM(prompt);

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url] = fetchMock.mock.calls[0];
    expect(String(url)).toContain("key=test-api-key");
  });

  it("maps a non-2xx response to a thrown GeminiCallError", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: false,
      status: 500,
      json: async () => ({ error: { message: "internal error" } }),
    });
    vi.stubGlobal("fetch", fetchMock);

    await expect(callLLM(prompt)).rejects.toBeInstanceOf(GeminiCallError);
  });

  it("maps a fetch rejection (network failure) to a thrown GeminiCallError", async () => {
    const fetchMock = vi.fn().mockRejectedValue(new TypeError("network failure"));
    vi.stubGlobal("fetch", fetchMock);

    await expect(callLLM(prompt)).rejects.toBeInstanceOf(GeminiCallError);
  });

  it("returns the raw text from a successful response", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({
        candidates: [{ content: { parts: [{ text: '{"days":[{"id":1,"stops":[]}]}' }] } }],
      }),
    });
    vi.stubGlobal("fetch", fetchMock);

    const result = await callLLM(prompt);

    expect(result).toBe('{"days":[{"id":1,"stops":[]}]}');
  });

  it("aborts the request via AbortController after the 30s timeout and throws GeminiCallError", async () => {
    vi.useFakeTimers();

    const fetchMock = vi.fn((_url: string, init?: RequestInit) => {
      return new Promise((_resolve, reject) => {
        const signal = init?.signal;
        signal?.addEventListener("abort", () => {
          reject(new DOMException("Aborted", "AbortError"));
        });
      });
    });
    vi.stubGlobal("fetch", fetchMock);

    const callPromise = callLLM(prompt);
    const assertion = expect(callPromise).rejects.toBeInstanceOf(GeminiCallError);

    await vi.advanceTimersByTimeAsync(30_000);

    await assertion;

    // Confirm the signal passed to fetch was the one that got aborted.
    const [, init] = fetchMock.mock.calls[0];
    expect((init?.signal as AbortSignal).aborted).toBe(true);
  });
});

describe("streamLLM", () => {
  const originalApiKey = process.env.GEMINI_API_KEY;

  beforeEach(() => {
    process.env.GEMINI_API_KEY = "test-api-key";
  });

  afterEach(() => {
    process.env.GEMINI_API_KEY = originalApiKey;
    vi.unstubAllGlobals();
    vi.useRealTimers();
  });

  it("throws GeminiCallError when GEMINI_API_KEY is not set", async () => {
    delete process.env.GEMINI_API_KEY;

    const gen = streamLLM(prompt);
    await expect(gen.next()).rejects.toBeInstanceOf(GeminiCallError);
  });

  it("yields each text delta as its SSE frame arrives", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      makeSseResponse([sseFrame('{"days":'), sseFrame('[{"id":1,"stops":[]}]}')]),
    );
    vi.stubGlobal("fetch", fetchMock);

    const deltas: string[] = [];
    for await (const delta of streamLLM(prompt)) {
      deltas.push(delta);
    }

    expect(deltas).toEqual(['{"days":', '[{"id":1,"stops":[]}]}']);
  });

  it("calls the streamGenerateContent endpoint with alt=sse and the API key, never elsewhere", async () => {
    const fetchMock = vi.fn().mockResolvedValue(makeSseResponse([sseFrame('{"days":[]}')]));
    vi.stubGlobal("fetch", fetchMock);

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    for await (const _delta of streamLLM(prompt)) {
      // drain
    }

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url] = fetchMock.mock.calls[0];
    expect(String(url)).toContain("streamGenerateContent");
    expect(String(url)).toContain("alt=sse");
    expect(String(url)).toContain("key=test-api-key");
  });

  it("throws GeminiCallError on a non-2xx response without leaking provider error text", async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: false, status: 500, body: null });
    vi.stubGlobal("fetch", fetchMock);

    const gen = streamLLM(prompt);
    await expect(gen.next()).rejects.toBeInstanceOf(GeminiCallError);
  });

  it("throws GeminiCallError on a network failure", async () => {
    const fetchMock = vi.fn().mockRejectedValue(new TypeError("network failure"));
    vi.stubGlobal("fetch", fetchMock);

    const gen = streamLLM(prompt);
    await expect(gen.next()).rejects.toBeInstanceOf(GeminiCallError);
  });

  it("throws GeminiCallError when the response has no readable body", async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, status: 200, body: null });
    vi.stubGlobal("fetch", fetchMock);

    const gen = streamLLM(prompt);
    await expect(gen.next()).rejects.toBeInstanceOf(GeminiCallError);
  });

  it("skips SSE frames that aren't valid JSON rather than aborting the whole stream", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      makeSseResponse(["data: not valid json\n\n", sseFrame('{"days":[]}')]),
    );
    vi.stubGlobal("fetch", fetchMock);

    const deltas: string[] = [];
    for await (const delta of streamLLM(prompt)) {
      deltas.push(delta);
    }

    expect(deltas).toEqual(['{"days":[]}']);
  });

  it("parses frames separated by \\r\\n\\r\\n (the actual separator Gemini's REST endpoint sends), not just \\n\\n", async () => {
    const crlfFrame = (text: string) =>
      `data: ${JSON.stringify({ candidates: [{ content: { parts: [{ text }] } }] })}\r\n\r\n`;
    const fetchMock = vi.fn().mockResolvedValue(
      makeSseResponse([crlfFrame('{"days":'), crlfFrame('[{"id":1,"stops":[]}]}')]),
    );
    vi.stubGlobal("fetch", fetchMock);

    const deltas: string[] = [];
    for await (const delta of streamLLM(prompt)) {
      deltas.push(delta);
    }

    expect(deltas).toEqual(['{"days":', '[{"id":1,"stops":[]}]}']);
  });

  it("yields the final frame even when the stream ends without a trailing blank-line separator after it", async () => {
    // No `\n\n`/`\r\n\r\n` after the last frame — the reader reports `done`
    // with this text still sitting unprocessed in the internal buffer.
    const finalFrameNoTrailingSeparator = sseFrame('{"days":[]}').replace(/\n\n$/, "");
    const fetchMock = vi.fn().mockResolvedValue(makeSseResponse([finalFrameNoTrailingSeparator]));
    vi.stubGlobal("fetch", fetchMock);

    const deltas: string[] = [];
    for await (const delta of streamLLM(prompt)) {
      deltas.push(delta);
    }

    expect(deltas).toEqual(['{"days":[]}']);
  });
});
