import { ItinerarySchema, type Itinerary } from "@shared/itinerarySchema";

export type ParseResult =
  | { ok: true; itinerary: Itinerary }
  | { ok: false; reason: "malformed_json" | "invalid_shape" | "http_error" | "timeout" | "network" };

export async function fetchAndValidateItinerary(
  description: string,
  signal: AbortSignal
): Promise<ParseResult> {
  let res: Response;
  try {
    res = await fetch("/api/itinerary", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ description }),
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
