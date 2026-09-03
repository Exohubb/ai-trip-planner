import { afterEach, describe, expect, it, vi } from "vitest";
import { fetchAndValidateItinerary } from "./fetchAndValidateItinerary";

describe("fetchAndValidateItinerary", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  /** Validates: Requirements 4.5 */
  it("returns malformed_json when the response body cannot be parsed as JSON", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => {
        throw new SyntaxError("Unexpected end of JSON input");
      },
    });
    vi.stubGlobal("fetch", fetchMock);

    const result = await fetchAndValidateItinerary("A weekend in Paris", new AbortController().signal);

    expect(result).toEqual({ ok: false, reason: "malformed_json" });
  });

  /** Validates: Requirements 4.3 */
  it("returns http_error when the response status is non-2xx", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: false,
      status: 502,
      json: async () => ({ error: "upstream_error" }),
    });
    vi.stubGlobal("fetch", fetchMock);

    const result = await fetchAndValidateItinerary("A weekend in Paris", new AbortController().signal);

    expect(result).toEqual({ ok: false, reason: "http_error" });
  });

  /** Validates: Requirements 4.6 */
  it("returns network when the fetch call rejects", async () => {
    const fetchMock = vi.fn().mockRejectedValue(new TypeError("Failed to fetch"));
    vi.stubGlobal("fetch", fetchMock);

    const result = await fetchAndValidateItinerary("A weekend in Paris", new AbortController().signal);

    expect(result).toEqual({ ok: false, reason: "network" });
  });

  /** Validates: Requirements 4.1, 4.2, 4.8 */
  it("returns ok: true with the typed itinerary for a valid body", async () => {
    const body = { days: [{ id: 1, stops: [{ id: "s1", title: "Eiffel Tower" }] }] };
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => body,
    });
    vi.stubGlobal("fetch", fetchMock);

    const result = await fetchAndValidateItinerary("A weekend in Paris", new AbortController().signal);

    // A Stop with no `type` field validates as before, defaulting to the
    // plain "stop" type (Requirement 13.1 backward compatibility).
    expect(result).toEqual({
      ok: true,
      itinerary: { days: [{ id: 1, stops: [{ id: "s1", title: "Eiffel Tower", type: "stop" }] }] },
    });
  });

  /** Validates: Requirements 4.9 */
  it("returns invalid_shape when the body fails schema validation", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ days: "not-an-array" }),
    });
    vi.stubGlobal("fetch", fetchMock);

    const result = await fetchAndValidateItinerary("A weekend in Paris", new AbortController().signal);

    expect(result).toEqual({ ok: false, reason: "invalid_shape" });
  });
});
