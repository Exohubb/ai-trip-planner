import type { GeminiPromptPayload } from "./promptBuilder.ts";

const GEMINI_MODEL = "gemini-1.5-flash";
const GEMINI_ENDPOINT = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`;
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
