import { DaySchema, ItinerarySchema, type Day, type Itinerary } from "@shared/itinerarySchema";

export type StreamOutcome =
  | { ok: true; itinerary: Itinerary }
  | {
      ok: false;
      reason: "malformed_json" | "invalid_shape" | "http_error" | "timeout" | "network" | "upstream_error";
    };

export interface StreamItineraryCallbacks {
  /** Called with each newly-completed batch of Day objects as `chunk` events arrive (Req 14.1). */
  onDays: (newDays: Day[]) => void;
}

/**
 * Consumes the `POST /api/itinerary/stream` Server-Sent Events endpoint via a
 * manual `fetch` + `ReadableStream` reader (not `EventSource`, since
 * `EventSource` can't send a POST body), incrementally invoking `onDays` as
 * `chunk` events parse into valid Day objects (Req 14.1), and resolving once
 * the stream ends with the outcome of the final `done`/`error` event.
 *
 * Mirrors `fetchAndValidateItinerary`'s `ParseResult` shape/reasons so
 * `useItineraryRequest` can map failures to the same user-facing messages.
 * The fully-assembled response from the `done` event is re-validated against
 * `ItinerarySchema` here (Req 14.5) rather than trusted as-is, even though
 * the backend already validated it — the same defense-in-depth posture as
 * the non-streaming path.
 */
export async function streamItinerary(
  description: string,
  signal: AbortSignal,
  callbacks: StreamItineraryCallbacks,
): Promise<StreamOutcome> {
  let res: Response;
  try {
    res = await fetch("/api/itinerary/stream", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ description }),
      signal,
    });
  } catch {
    return { ok: false, reason: signal.aborted ? "timeout" : "network" };
  }

  if (!res.ok) return { ok: false, reason: "http_error" };
  if (!res.body) return { ok: false, reason: "malformed_json" };

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let outcome: StreamOutcome | null = null;

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });

      const frames = buffer.split("\n\n");
      buffer = frames.pop() ?? "";

      for (const frame of frames) {
        const outcomeFromFrame = handleSseFrame(frame, callbacks);
        if (outcomeFromFrame) outcome = outcomeFromFrame;
      }
    }
  } catch {
    return outcome ?? { ok: false, reason: signal.aborted ? "timeout" : "network" };
  } finally {
    reader.releaseLock();
  }

  return outcome ?? { ok: false, reason: "malformed_json" };
}

/** Parses one `event:`/`data:` SSE frame, invoking `onDays` for `chunk` events. Returns a final outcome for `done`/`error` events, or `null` for anything else. */
function handleSseFrame(frame: string, callbacks: StreamItineraryCallbacks): StreamOutcome | null {
  const lines = frame.split("\n");
  const eventLine = lines.find((line) => line.startsWith("event:"));
  const dataLine = lines.find((line) => line.startsWith("data:"));
  if (!eventLine || !dataLine) return null;

  const event = eventLine.slice("event:".length).trim();
  let data: unknown;
  try {
    data = JSON.parse(dataLine.slice("data:".length).trim());
  } catch {
    return null;
  }

  if (event === "chunk") {
    const newDays = (data as { newDays?: unknown }).newDays;
    if (Array.isArray(newDays)) {
      // Defense in depth: these chunk-level days haven't been validated by
      // the backend (only the final assembled response is), so validate
      // each one individually before it's ever handed to the UI, silently
      // skipping any that don't conform rather than rendering garbage.
      const validDays = newDays
        .map((day) => DaySchema.safeParse(day))
        .filter((result) => result.success)
        .map((result) => result.data);
      if (validDays.length > 0) callbacks.onDays(validDays);
    }
    return null;
  }

  if (event === "done") {
    const parsed = ItinerarySchema.safeParse(data);
    return parsed.success ? { ok: true, itinerary: parsed.data } : { ok: false, reason: "invalid_shape" };
  }

  if (event === "error") {
    return { ok: false, reason: "upstream_error" };
  }

  return null;
}
