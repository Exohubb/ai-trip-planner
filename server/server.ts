import { fileURLToPath } from "node:url";
import express from "express";
import { buildItineraryPrompt } from "./promptBuilder.ts";
import { callLLM, streamLLM } from "./gemini.ts";
import { findCompleteDayObjects } from "./streamParser.ts";
import { ItinerarySchema } from "../shared/itinerarySchema.ts";

const app = express();
const PORT = process.env.SERVER_PORT ?? 3001;

const MAX_DESCRIPTION_LENGTH = 5000;

app.use(express.json());

app.get("/api/health", (_req, res) => {
  res.json({ status: "ok" });
});

app.post("/api/itinerary", async (req, res) => {
  const description = req.body?.description;

  if (typeof description !== "string" || description.trim().length === 0) {
    res.status(400).json({ error: "missing_description" });
    return;
  }

  if (description.length > MAX_DESCRIPTION_LENGTH) {
    res.status(400).json({ error: "description_too_long" });
    return;
  }

  if (!process.env.GEMINI_API_KEY) {
    res.status(500).json({ error: "server_misconfigured" });
    return;
  }

  const prompt = buildItineraryPrompt(description);

  let rawText: string;
  try {
    rawText = await callLLM(prompt);
  } catch (err) {
    // Never forward the raw provider error text or the API key to the client.
    // eslint-disable-next-line no-console
    console.error("Gemini call failed:", err);
    res.status(502).json({ error: "upstream_error" });
    return;
  }

  let parsedJson: unknown;
  try {
    parsedJson = JSON.parse(rawText);
  } catch {
    res.status(502).json({ error: "invalid_response" });
    return;
  }

  const result = ItinerarySchema.safeParse(parsedJson);
  if (!result.success) {
    // Log validation issues server-side only; never forward Gemini's raw
    // output or schema error details to the client.
    // eslint-disable-next-line no-console
    console.error("Gemini response failed schema validation:", result.error.issues);
    res.status(502).json({ error: "invalid_response" });
    return;
  }

  res.status(200).json(result.data);
});

/**
 * Streaming counterpart to `POST /api/itinerary` (Requirement 14.1). Uses
 * Gemini's `streamGenerateContent` endpoint via `streamLLM` and forwards
 * progress to the client as Server-Sent Events:
 *
 * - `event: chunk` — `data` is `{ "newDays": Day[] }`, the Day objects that
 *   have become complete (balanced braces) since the last chunk was sent.
 *   These are NOT yet schema-validated — they're for optimistic incremental
 *   rendering only (Req 14.1/14.2).
 * - `event: done` — `data` is the fully-assembled, `ItinerarySchema`-validated
 *   itinerary object, sent only once the complete stream has been received
 *   and has passed validation (Req 14.5).
 * - `event: error` — `data` is `{ "error": string }`, a short machine-readable
 *   code, sent if the upstream call fails, times out, or the fully-assembled
 *   response fails JSON parsing/schema validation (Req 14.3).
 *
 * The same request-validation and API-key guards as the non-streaming route
 * run first and respond with plain 4xx/5xx JSON (not SSE) if they fail, so a
 * malformed/oversized request never opens an SSE stream at all.
 */
app.post("/api/itinerary/stream", async (req, res) => {
  const description = req.body?.description;

  if (typeof description !== "string" || description.trim().length === 0) {
    res.status(400).json({ error: "missing_description" });
    return;
  }

  if (description.length > MAX_DESCRIPTION_LENGTH) {
    res.status(400).json({ error: "description_too_long" });
    return;
  }

  if (!process.env.GEMINI_API_KEY) {
    res.status(500).json({ error: "server_misconfigured" });
    return;
  }

  const prompt = buildItineraryPrompt(description);

  res.status(200);
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  res.flushHeaders?.();

  function sendEvent(event: string, data: unknown) {
    res.write(`event: ${event}\n`);
    res.write(`data: ${JSON.stringify(data)}\n\n`);
  }

  let accumulatedText = "";
  let sentDayCount = 0;

  try {
    for await (const delta of streamLLM(prompt)) {
      accumulatedText += delta;

      const completeDayTexts = findCompleteDayObjects(accumulatedText);
      if (completeDayTexts.length > sentDayCount) {
        const newDayTexts = completeDayTexts.slice(sentDayCount);
        const newDays: unknown[] = [];
        for (const dayText of newDayTexts) {
          try {
            newDays.push(JSON.parse(dayText));
          } catch {
            // Skip a day object that doesn't parse in isolation; the final
            // full-text validation below is the source of truth either way.
          }
        }
        sentDayCount = completeDayTexts.length;
        if (newDays.length > 0) {
          sendEvent("chunk", { newDays });
        }
      }
    }
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error("Gemini stream call failed:", err);
    sendEvent("error", { error: "upstream_error" });
    res.end();
    return;
  }

  let parsedJson: unknown;
  try {
    parsedJson = JSON.parse(accumulatedText);
  } catch {
    sendEvent("error", { error: "invalid_response" });
    res.end();
    return;
  }

  const result = ItinerarySchema.safeParse(parsedJson);
  if (!result.success) {
    // eslint-disable-next-line no-console
    console.error("Gemini stream response failed schema validation:", result.error.issues);
    sendEvent("error", { error: "invalid_response" });
    res.end();
    return;
  }

  sendEvent("done", result.data);
  res.end();
});

// Only start listening when this module is run directly (e.g. `tsx server/server.ts`),
// not when it's imported by tests.
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  app.listen(PORT, () => {
    // eslint-disable-next-line no-console
    console.log(`Server listening on http://localhost:${PORT}`);
  });
}

export { app };
