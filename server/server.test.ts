import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import type { Server } from "node:http";

vi.mock("./gemini.ts", () => ({
  callLLM: vi.fn(),
}));

import { callLLM } from "./gemini.ts";
import { app } from "./server.ts";

const mockedCallLLM = callLLM as unknown as ReturnType<typeof vi.fn>;

describe("POST /api/itinerary", () => {
  let server: Server;
  let baseUrl: string;
  const originalApiKey = process.env.GEMINI_API_KEY;

  beforeAll(async () => {
    server = app.listen(0);
    await new Promise<void>((resolve) => server.once("listening", resolve));
    const address = server.address();
    const port = typeof address === "object" && address ? address.port : 0;
    baseUrl = `http://127.0.0.1:${port}`;
  });

  afterAll(async () => {
    await new Promise<void>((resolve) => server.close(() => resolve()));
  });

  beforeEach(() => {
    process.env.GEMINI_API_KEY = "test-api-key";
  });

  afterEach(() => {
    process.env.GEMINI_API_KEY = originalApiKey;
    mockedCallLLM.mockReset();
  });

  async function postItinerary(description: string) {
    return fetch(`${baseUrl}/api/itinerary`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ description }),
    });
  }

  it("responds 502 invalid_response when Gemini's text is not valid JSON", async () => {
    mockedCallLLM.mockResolvedValue("not valid json {{{");

    const res = await postItinerary("A 3 day trip to Paris");
    const body = await res.json();

    expect(res.status).toBe(502);
    expect(body).toEqual({ error: "invalid_response" });
  });

  it("responds 502 invalid_response when parsed JSON fails ItinerarySchema validation", async () => {
    // Missing required "title" on the stop.
    mockedCallLLM.mockResolvedValue(
      JSON.stringify({ days: [{ id: 1, stops: [{ time: "9am" }] }] }),
    );

    const res = await postItinerary("A 3 day trip to Paris");
    const body = await res.json();

    expect(res.status).toBe(502);
    expect(body).toEqual({ error: "invalid_response" });
  });

  it("responds 200 with the validated itinerary on a well-formed Gemini response", async () => {
    mockedCallLLM.mockResolvedValue(
      JSON.stringify({
        days: [{ id: 1, stops: [{ id: "stop-1", title: "Eiffel Tower", time: "9am" }] }],
      }),
    );

    const res = await postItinerary("A 3 day trip to Paris");
    const body = await res.json();

    expect(res.status).toBe(200);
    // A Stop with no `type` field validates as before, defaulting to the
    // plain "stop" type (Requirement 13.1 backward compatibility).
    expect(body).toEqual({
      days: [{ id: 1, stops: [{ id: "stop-1", title: "Eiffel Tower", time: "9am", type: "stop" }] }],
    });
  });

  it("strips unknown fields from a validated itinerary before responding", async () => {
    mockedCallLLM.mockResolvedValue(
      JSON.stringify({
        days: [{ id: 1, stops: [{ id: "stop-1", title: "Eiffel Tower" }] }],
        extraField: "should be stripped",
      }),
    );

    const res = await postItinerary("A 3 day trip to Paris");
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body).not.toHaveProperty("extraField");
  });
});
