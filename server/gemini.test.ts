import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { callLLM, GeminiCallError } from "./gemini";
import { buildItineraryPrompt } from "./promptBuilder";

const prompt = buildItineraryPrompt("A 3 day trip to Paris");

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
