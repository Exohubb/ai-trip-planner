import { ItinerarySchema, type Itinerary } from "@shared/itinerarySchema";

export type RefinementResult =
  | { ok: true; itinerary: Itinerary }
  | { ok: false; reason: "malformed_json" | "invalid_shape" | "http_error" | "timeout" | "network" };

/**
 * Calls `POST /api/itinerary/refine` with the currently displayed itinerary
 * and a follow-up instruction (Requirement 15.2), and validates the response
 * through the identical parse-then-validate pipeline as
 * `fetchAndValidateItinerary` (Requirement 4/15.5-15.6): network failure →
 * `network`/`timeout`, non-2xx → `http_error`, JSON parse failure →
 * `malformed_json`, schema validation failure → `invalid_shape`, otherwise
 * `ok: true` with the typed, updated `Itinerary`.
 */
export async function fetchAndValidateRefinement(
  currentItinerary: Itinerary,
  instruction: string,
  signal: AbortSignal
): Promise<RefinementResult> {
  let res: Response;
  try {
    res = await fetch("/api/itinerary/refine", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ currentItinerary, instruction }),
      signal,
    });
  } catch {
    return { ok: false, reason: signal.aborted ? "timeout" : "network" };
  }
  if (!res.ok) return { ok: false, reason: "http_error" };

  let json: unknown;
  try {
    json = await res.json();
  } catch {
    return { ok: false, reason: "malformed_json" };
  }

  const parsed = ItinerarySchema.safeParse(json);
  if (!parsed.success) return { ok: false, reason: "invalid_shape" };

  return { ok: true, itinerary: parsed.data };
}
