import { afterEach, describe, expect, it, vi } from "vitest";
import { fetchAndValidateRefinement } from "./fetchAndValidateRefinement";
import type { Itinerary } from "@shared/itinerarySchema";

const currentItinerary: Itinerary = {
  days: [{ id: 1, stops: [{ id: "s1", title: "Eiffel Tower", type: "stop" }] }],
};

describe("fetchAndValidateRefinement", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  /** Validates: Requirements 15.2 */
  it("posts the current itinerary and instruction to /api/itinerary/refine", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => currentItinerary,
    });
    vi.stubGlobal("fetch", fetchMock);

    await fetchAndValidateRefinement(currentItinerary, "Add a museum", new AbortController().signal);

    expect(fetchMock).toHaveBeenCalledWith(
      "/api/itinerary/refine",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({ currentItinerary, instruction: "Add a museum" }),
      }),
    );
  });

  /** Validates: Requirements 15.5 */
  it("returns malformed_json when the response body cannot be parsed as JSON", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => {
        throw new SyntaxError("Unexpected end of JSON input");
      },
    });
    vi.stubGlobal("fetch", fetchMock);

    const result = await fetchAndValidateRefinement(
      currentItinerary,
      "Add a museum",
      new AbortController().signal,
    );

    expect(result).toEqual({ ok: false, reason: "malformed_json" });
  });

  /** Validates: Requirements 15.5 */
  it("returns http_error when the response status is non-2xx", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: false,
      status: 502,
      json: async () => ({ error: "upstream_error" }),
    });
    vi.stubGlobal("fetch", fetchMock);

    const result = await fetchAndValidateRefinement(
      currentItinerary,
      "Add a museum",
      new AbortController().signal,
    );

    expect(result).toEqual({ ok: false, reason: "http_error" });
  });

  /** Validates: Requirements 15.5 */
  it("returns network when the fetch call rejects", async () => {
    const fetchMock = vi.fn().mockRejectedValue(new TypeError("Failed to fetch"));
    vi.stubGlobal("fetch", fetchMock);

    const result = await fetchAndValidateRefinement(
      currentItinerary,
      "Add a museum",
      new AbortController().signal,
    );

    expect(result).toEqual({ ok: false, reason: "network" });
  });

  /** Validates: Requirements 15.6 */
  it("returns ok: true with the typed, updated itinerary for a valid body", async () => {
    const updatedItinerary = {
      days: [{ id: 1, stops: [{ id: "s1", title: "Eiffel Tower" }, { id: "s2", title: "Louvre" }] }],
    };
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => updatedItinerary,
    });
    vi.stubGlobal("fetch", fetchMock);

    const result = await fetchAndValidateRefinement(
      currentItinerary,
      "Add the Louvre",
      new AbortController().signal,
    );

    expect(result).toEqual({
      ok: true,
      itinerary: {
        days: [
          {
            id: 1,
            stops: [
              { id: "s1", title: "Eiffel Tower", type: "stop" },
              { id: "s2", title: "Louvre", type: "stop" },
            ],
          },
        ],
      },
    });
  });

  /** Validates: Requirements 15.5 */
  it("returns invalid_shape when the body fails schema validation", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ days: "not-an-array" }),
    });
    vi.stubGlobal("fetch", fetchMock);

    const result = await fetchAndValidateRefinement(
      currentItinerary,
      "Add a museum",
      new AbortController().signal,
    );

    expect(result).toEqual({ ok: false, reason: "invalid_shape" });
  });
});
