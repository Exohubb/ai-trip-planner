import express from "express";
import { buildItineraryPrompt } from "./promptBuilder.ts";
import { callLLM } from "./gemini.ts";

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

  // NOTE: Response parsing/validation against ItinerarySchema is added in a
  // later task. For now, forward Gemini's raw text as best-effort JSON.
  try {
    res.status(200).json(JSON.parse(rawText));
  } catch {
    res.status(200).send(rawText);
  }
});

app.listen(PORT, () => {
  // eslint-disable-next-line no-console
  console.log(`Server listening on http://localhost:${PORT}`);
});
