import express from "express";

const app = express();
const PORT = process.env.SERVER_PORT ?? 3001;

const MAX_DESCRIPTION_LENGTH = 5000;

app.use(express.json());

app.get("/api/health", (_req, res) => {
  res.json({ status: "ok" });
});

app.post("/api/itinerary", (req, res) => {
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

  // Stub response — Gemini integration and response validation are added in later tasks.
  res.status(200).json({ days: [] });
});

app.listen(PORT, () => {
  // eslint-disable-next-line no-console
  console.log(`Server listening on http://localhost:${PORT}`);
});
