import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import type { Server } from "node:http";

vi.mock("./gemini.ts", () => ({
  callLLM: vi.fn(),
  streamLLM: vi.fn(),
}));

import { callLLM, streamLLM } from "./gemini.ts";
import { app } from "./server.ts";

const mockedCallLLM = callLLM as unknown as ReturnType<typeof vi.fn>;
const mockedStreamLLM = streamLLM as unknown as ReturnType<typeof vi.fn>;

/** Builds an async generator matching `streamLLM`'s shape, yielding the given text deltas. */
async function* deltasGenerator(deltas: string[]) {
  for (const delta of deltas) {
    yield delta;
  }
}

/** Parses a raw SSE response body into an ordered list of `{ event, data }` frames. */
function parseSseFrames(rawBody: string): Array<{ event: string; data: unknown }> {
  return rawBody
    .split("\n\n")
    .filter((frame) => frame.trim().length > 0)
    .map((frame) => {
      const eventLine = frame.split("\n").find((line) => line.startsWith("event:"));
      const dataLine = frame.split("\n").find((line) => line.startsWith("data:"));
      return {
        event: eventLine?.slice("event:".length).trim() ?? "",
        data: dataLine ? JSON.parse(dataLine.slice("data:".length).trim()) : undefined,
      };
    });
}

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
    mockedStreamLLM.mockReset();
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

describe("POST /api/itinerary/refine", () => {
  let server: Server;
  let baseUrl: string;
  const originalApiKey = process.env.GEMINI_API_KEY;

  const validItinerary = {
    days: [{ id: 1, stops: [{ id: "s1", title: "Eiffel Tower", type: "stop" }] }],
  };

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
    mockedStreamLLM.mockReset();
  });

  async function postRefine(body: unknown) {
    return fetch(`${baseUrl}/api/itinerary/refine`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
  }

  it("responds 400 missing_instruction when instruction is missing/whitespace-only, without calling callLLM", async () => {
    const res = await postRefine({ currentItinerary: validItinerary, instruction: "   " });
    const body = await res.json();

    expect(res.status).toBe(400);
    expect(body).toEqual({ error: "missing_instruction" });
    expect(mockedCallLLM).not.toHaveBeenCalled();
  });

  it("responds 400 instruction_too_long when instruction exceeds 1000 characters, without calling callLLM", async () => {
    const res = await postRefine({ currentItinerary: validItinerary, instruction: "a".repeat(1001) });
    const body = await res.json();

    expect(res.status).toBe(400);
    expect(body).toEqual({ error: "instruction_too_long" });
    expect(mockedCallLLM).not.toHaveBeenCalled();
  });

  it("responds 400 invalid_current_itinerary when currentItinerary fails schema validation, without calling callLLM", async () => {
    const res = await postRefine({ currentItinerary: { days: "not-an-array" }, instruction: "Add a museum" });
    const body = await res.json();

    expect(res.status).toBe(400);
    expect(body).toEqual({ error: "invalid_current_itinerary" });
    expect(mockedCallLLM).not.toHaveBeenCalled();
  });

  it("responds 500 server_misconfigured when GEMINI_API_KEY is missing, without calling callLLM", async () => {
    delete process.env.GEMINI_API_KEY;

    const res = await postRefine({ currentItinerary: validItinerary, instruction: "Add a museum" });
    const body = await res.json();

    expect(res.status).toBe(500);
    expect(body).toEqual({ error: "server_misconfigured" });
    expect(mockedCallLLM).not.toHaveBeenCalled();
  });

  it("responds 502 upstream_error when callLLM throws", async () => {
    mockedCallLLM.mockRejectedValue(new Error("boom"));

    const res = await postRefine({ currentItinerary: validItinerary, instruction: "Add a museum" });
    const body = await res.json();

    expect(res.status).toBe(502);
    expect(body).toEqual({ error: "upstream_error" });
  });

  it("responds 502 invalid_response when Gemini's text is not valid JSON", async () => {
    mockedCallLLM.mockResolvedValue("not valid json {{{");

    const res = await postRefine({ currentItinerary: validItinerary, instruction: "Add a museum" });
    const body = await res.json();

    expect(res.status).toBe(502);
    expect(body).toEqual({ error: "invalid_response" });
  });

  it("responds 502 invalid_response when the updated JSON fails ItinerarySchema validation", async () => {
    // Missing required "title" on the stop.
    mockedCallLLM.mockResolvedValue(JSON.stringify({ days: [{ id: 1, stops: [{ time: "9am" }] }] }));

    const res = await postRefine({ currentItinerary: validItinerary, instruction: "Add a museum" });
    const body = await res.json();

    expect(res.status).toBe(502);
    expect(body).toEqual({ error: "invalid_response" });
  });

  it("responds 200 with the updated, validated itinerary on a well-formed Gemini response", async () => {
    mockedCallLLM.mockResolvedValue(
      JSON.stringify({
        days: [
          { id: 1, stops: [{ id: "s1", title: "Eiffel Tower" }] },
          { id: 2, stops: [{ id: "s2", title: "Louvre Museum" }] },
        ],
      }),
    );

    const res = await postRefine({ currentItinerary: validItinerary, instruction: "Add a museum on day 2" });
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body).toEqual({
      days: [
        { id: 1, stops: [{ id: "s1", title: "Eiffel Tower", type: "stop" }] },
        { id: 2, stops: [{ id: "s2", title: "Louvre Museum", type: "stop" }] },
      ],
    });
    expect(mockedCallLLM).toHaveBeenCalledTimes(1);
  });
});

describe("POST /api/itinerary/stream", () => {
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
    mockedStreamLLM.mockReset();
  });

  async function postItineraryStream(description: string) {
    return fetch(`${baseUrl}/api/itinerary/stream`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ description }),
    });
  }

  it("responds 400 missing_description without opening an SSE stream or calling streamLLM", async () => {
    const res = await postItineraryStream("   ");
    const body = await res.json();

    expect(res.status).toBe(400);
    expect(body).toEqual({ error: "missing_description" });
    expect(mockedStreamLLM).not.toHaveBeenCalled();
  });

  it("responds 500 server_misconfigured when GEMINI_API_KEY is missing, without calling streamLLM", async () => {
    delete process.env.GEMINI_API_KEY;

    const res = await postItineraryStream("A 3 day trip to Paris");
    const body = await res.json();

    expect(res.status).toBe(500);
    expect(body).toEqual({ error: "server_misconfigured" });
    expect(mockedStreamLLM).not.toHaveBeenCalled();
  });

  it("streams a chunk event for each newly completed day and a final done event with the validated itinerary", async () => {
    mockedStreamLLM.mockReturnValue(
      deltasGenerator([
        '{"days": [{"id": 1, "stops": [{"id": "s1", "title": "Eiffel Tower"}]}',
        ', {"id": 2, "stops": []}]}',
      ]),
    );

    const res = await postItineraryStream("A 2 day trip to Paris");
    expect(res.status).toBe(200);
    expect(res.headers.get("content-type")).toContain("text/event-stream");

    const rawBody = await res.text();
    const frames = parseSseFrames(rawBody);

    const chunkFrames = frames.filter((f) => f.event === "chunk");
    const doneFrames = frames.filter((f) => f.event === "done");

    expect(chunkFrames.length).toBeGreaterThanOrEqual(1);
    // Every day that appears across all chunk events, in order, matches the two input days.
    const allChunkDays = chunkFrames.flatMap((f) => (f.data as { newDays: unknown[] }).newDays);
    expect(allChunkDays).toEqual([
      { id: 1, stops: [{ id: "s1", title: "Eiffel Tower" }] },
      { id: 2, stops: [] },
    ]);

    expect(doneFrames).toHaveLength(1);
    expect(doneFrames[0].data).toEqual({
      days: [
        { id: 1, stops: [{ id: "s1", title: "Eiffel Tower", type: "stop" }] },
        { id: 2, stops: [] },
      ],
    });
  });

  it("sends an error event with upstream_error when streamLLM throws", async () => {
    mockedStreamLLM.mockImplementation(async function* () {
      throw new Error("boom");
      // eslint-disable-next-line no-unreachable
      yield "";
    });

    const res = await postItineraryStream("A 2 day trip to Paris");
    const rawBody = await res.text();
    const frames = parseSseFrames(rawBody);

    expect(frames).toHaveLength(1);
    expect(frames[0]).toEqual({ event: "error", data: { error: "upstream_error" } });
  });

  it("sends an error event with invalid_response when the fully-assembled text isn't valid JSON", async () => {
    mockedStreamLLM.mockReturnValue(deltasGenerator(["not valid json {{{"]));

    const res = await postItineraryStream("A 2 day trip to Paris");
    const rawBody = await res.text();
    const frames = parseSseFrames(rawBody);

    const errorFrame = frames.find((f) => f.event === "error");
    expect(errorFrame?.data).toEqual({ error: "invalid_response" });
    expect(frames.some((f) => f.event === "done")).toBe(false);
  });

  it("sends an error event with invalid_response when the fully-assembled JSON fails schema validation", async () => {
    // Missing required "title" on the stop.
    mockedStreamLLM.mockReturnValue(
      deltasGenerator(['{"days": [{"id": 1, "stops": [{"time": "9am"}]}]}']),
    );

    const res = await postItineraryStream("A 2 day trip to Paris");
    const rawBody = await res.text();
    const frames = parseSseFrames(rawBody);

    const errorFrame = frames.find((f) => f.event === "error");
    expect(errorFrame?.data).toEqual({ error: "invalid_response" });
    expect(frames.some((f) => f.event === "done")).toBe(false);
  });
});
