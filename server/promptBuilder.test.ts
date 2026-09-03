import { describe, expect, it } from "vitest";
import { buildItineraryPrompt, buildRefinementPrompt } from "./promptBuilder";
import type { Itinerary } from "../shared/itinerarySchema";

describe("buildItineraryPrompt", () => {
  it("includes the trip description as the user content turn", () => {
    const payload = buildItineraryPrompt("A 3 day trip to Paris");

    expect(payload.contents).toEqual([
      { role: "user", parts: [{ text: "A 3 day trip to Paris" }] },
    ]);
  });

  it("includes a non-empty system instruction directing JSON-only output", () => {
    const payload = buildItineraryPrompt("Tokyo for a week");

    const instructionText = payload.systemInstruction.parts[0].text;
    expect(instructionText.length).toBeGreaterThan(0);
    expect(instructionText).toMatch(/JSON/i);
  });

  it("requests application/json response mime type", () => {
    const payload = buildItineraryPrompt("Rome weekend");

    expect(payload.generationConfig.responseMimeType).toBe("application/json");
  });

  it("mirrors the ItinerarySchema shape in the responseSchema", () => {
    const payload = buildItineraryPrompt("Berlin");
    const schema = payload.generationConfig.responseSchema;

    expect(schema.type).toBe("OBJECT");
    expect(schema.required).toContain("days");

    // Note: `maxItems` is intentionally omitted from the Gemini responseSchema
    // (Gemini's structured-output dialect rejects it with a 400 for this model
    // family) — the 30-day/20-stop limits are still enforced by ItinerarySchema's
    // own .max() calls when validating whatever Gemini actually returns.
    const daysSchema = schema.properties.days;
    expect(daysSchema.type).toBe("ARRAY");
    expect("maxItems" in daysSchema).toBe(false);

    const dayItemSchema = daysSchema.items;
    expect(dayItemSchema.required).toEqual(["id", "stops"]);

    const stopsSchema = dayItemSchema.properties.stops;
    expect(stopsSchema.type).toBe("ARRAY");
    expect("maxItems" in stopsSchema).toBe(false);

    const stopItemSchema = stopsSchema.items;
    // Every stop must declare both "id" and "title" — StopSchema requires a
    // string "id" with no default, so Gemini must be asked to generate one.
    expect(stopItemSchema.required).toEqual(["id", "title"]);
    expect(Object.keys(stopItemSchema.properties)).toEqual(
      expect.arrayContaining(["id", "title", "time", "description", "location", "notes"]),
    );
  });

  it("produces the same prompt structure regardless of description content", () => {
    const payload1 = buildItineraryPrompt("Trip A");
    const payload2 = buildItineraryPrompt("Trip B, much longer description text here");

    expect(payload1.systemInstruction).toEqual(payload2.systemInstruction);
    expect(payload1.generationConfig).toEqual(payload2.generationConfig);
  });
});

describe("buildRefinementPrompt", () => {
  const currentItinerary: Itinerary = {
    days: [{ id: 1, stops: [{ id: "s1", title: "Eiffel Tower", type: "stop" }] }],
  };

  it("includes both the current itinerary JSON and the follow-up instruction in the user content turn", () => {
    const payload = buildRefinementPrompt(currentItinerary, "Swap the museum for a park.");

    expect(payload.contents).toHaveLength(1);
    const text = payload.contents[0].parts[0].text;
    expect(text).toContain(JSON.stringify(currentItinerary));
    expect(text).toContain("Swap the museum for a park.");
  });

  it("includes a non-empty system instruction directing JSON-only output for an update", () => {
    const payload = buildRefinementPrompt(currentItinerary, "Add a beach day.");

    const instructionText = payload.systemInstruction.parts[0].text;
    expect(instructionText.length).toBeGreaterThan(0);
    expect(instructionText).toMatch(/JSON/i);
  });

  it("requests application/json response mime type and reuses the same responseSchema shape", () => {
    const payload = buildRefinementPrompt(currentItinerary, "Add a beach day.");
    const itineraryPayload = buildItineraryPrompt("A trip");

    expect(payload.generationConfig.responseMimeType).toBe("application/json");
    expect(payload.generationConfig.responseSchema).toEqual(itineraryPayload.generationConfig.responseSchema);
  });

  it("produces the same system instruction/generationConfig regardless of itinerary/instruction content", () => {
    const payload1 = buildRefinementPrompt(currentItinerary, "Add a beach day.");
    const payload2 = buildRefinementPrompt({ days: [] }, "Remove day 1.");

    expect(payload1.systemInstruction).toEqual(payload2.systemInstruction);
    expect(payload1.generationConfig).toEqual(payload2.generationConfig);
  });
});
