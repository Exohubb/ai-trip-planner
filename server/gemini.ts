import type { GeminiPromptPayload } from "./promptBuilder.ts";

const GEMINI_MODEL = "gemini-1.5-flash";
const GEMINI_ENDPOINT = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`;
// Gemini's streaming REST endpoint (Requirement 14.1): same model, `:streamGenerateContent`
// action, with `alt=sse` so the response body is delivered as Server-Sent Events (one
// `data: <json chunk>` line at a time) rather than a single JSON array payload.
const GEMINI_STREAM_ENDPOINT = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:streamGenerateContent`;
const REQUEST_TIMEOUT_MS = 30_000;

/**
 * Thrown when the call to Gemini fails for any reason (network error,
 * non-2xx response, or timeout). Callers should map this to a generic
 * upstream-error response and never surface `message` to the client, since
 * it may echo provider response bodies.
 */
export class GeminiCallError extends Error {}

/**
 * Calls Gemini's `generateContent` REST endpoint with the given prompt
 * payload and returns the raw text of the model's response (expected to be
 * a JSON string, since the caller requests `responseMimeType: "application/json"`).
 *
 * Attaches `GEMINI_API_KEY` server-side only (as a query param, per Gemini's
 * REST auth convention) and enforces a 30-second timeout via `AbortController`.
 *
 * Throws `GeminiCallError` on network failure, non-2xx response, or timeout.
 * The thrown error never includes the API key or the raw provider response body.
 */
export async function callLLM(prompt: GeminiPromptPayload): Promise<string> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    // Defense in depth: server.ts already guards on this before calling
    // callLLM, but callLLM must never proceed without a key either.
    throw new GeminiCallError("Gemini API key is not configured.");
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  let response: Response;
  try {
    response = await fetch(`${GEMINI_ENDPOINT}?key=${apiKey}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(prompt),
      signal: controller.signal,
    });
  } catch (err) {
    const reason = controller.signal.aborted ? "timed out" : "network failure";
    throw new GeminiCallError(`Gemini call failed: ${reason}`, { cause: err });
  } finally {
    clearTimeout(timeoutId);
  }

  if (!response.ok) {
    throw new GeminiCallError(`Gemini call failed with status ${response.status}`);
  }

  const body = (await response.json()) as GeminiGenerateContentResponse;
  const text = body?.candidates?.[0]?.content?.parts?.[0]?.text;

  if (typeof text !== "string") {
    throw new GeminiCallError("Gemini response did not contain any text output.");
  }

  return text;
}

/** Minimal shape of Gemini's `generateContent` response body that we rely on. */
interface GeminiGenerateContentResponse {
  candidates?: Array<{
    content?: {
      parts?: Array<{ text?: string }>;
    };
  }>;
}

/**
 * Calls Gemini's `streamGenerateContent` REST endpoint (with `alt=sse`) and
 * yields each text delta as it arrives (Requirement 14.1), so the caller
 * (`server.ts`'s streaming route) can forward chunks to the frontend as
 * they're produced instead of waiting for the full response.
 *
 * Same auth, timeout, and error-mapping conventions as `callLLM`: attaches
 * `GEMINI_API_KEY` server-side only, enforces the same 30-second timeout via
 * `AbortController`, and throws `GeminiCallError` (never leaking the API key
 * or raw provider error text) on network failure, non-2xx response, or a
 * missing/unreadable response body.
 */
export async function* streamLLM(prompt: GeminiPromptPayload): AsyncGenerator<string, void, void> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new GeminiCallError("Gemini API key is not configured.");
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    let response: Response;
    try {
      response = await fetch(`${GEMINI_STREAM_ENDPOINT}?alt=sse&key=${apiKey}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(prompt),
        signal: controller.signal,
      });
    } catch (err) {
      const reason = controller.signal.aborted ? "timed out" : "network failure";
      throw new GeminiCallError(`Gemini stream call failed: ${reason}`, { cause: err });
    }

    if (!response.ok) {
      throw new GeminiCallError(`Gemini stream call failed with status ${response.status}`);
    }

    const body = response.body;
    if (!body) {
      throw new GeminiCallError("Gemini stream response had no readable body.");
    }

    const reader = body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";

    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });

        // SSE frames are separated by a blank line; each frame's payload
        // line is prefixed with "data: ".
        const frames = buffer.split("\n\n");
        buffer = frames.pop() ?? ""; // keep the last, possibly-incomplete frame buffered

        for (const frame of frames) {
          const dataLine = frame.split("\n").find((line) => line.startsWith("data:"));
          if (!dataLine) continue;
          const jsonText = dataLine.slice("data:".length).trim();
          if (!jsonText || jsonText === "[DONE]") continue;

          let parsed: GeminiGenerateContentResponse;
          try {
            parsed = JSON.parse(jsonText);
          } catch {
            continue; // skip any frame that isn't valid JSON rather than aborting the whole stream
          }

          const text = parsed?.candidates?.[0]?.content?.parts?.[0]?.text;
          if (typeof text === "string" && text.length > 0) {
            yield text;
          }
        }
      }
    } catch (err) {
      if (err instanceof GeminiCallError) throw err;
      const reason = controller.signal.aborted ? "timed out" : "stream read failure";
      throw new GeminiCallError(`Gemini stream call failed: ${reason}`, { cause: err });
    } finally {
      reader.releaseLock();
    }
  } finally {
    clearTimeout(timeoutId);
  }
}
