import { describe, expect, it } from "vitest";
import { buildItineraryPrompt } from "./promptBuilder";

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

    const daysSchema = schema.properties.days;
    expect(daysSchema.type).toBe("ARRAY");
    expect(daysSchema.maxItems).toBe(30);

    const dayItemSchema = daysSchema.items;
    expect(dayItemSchema.required).toEqual(["id", "stops"]);

    const stopsSchema = dayItemSchema.properties.stops;
    expect(stopsSchema.type).toBe("ARRAY");
    expect(stopsSchema.maxItems).toBe(20);

    const stopItemSchema = stopsSchema.items;
    expect(stopItemSchema.required).toEqual(["title"]);
    expect(Object.keys(stopItemSchema.properties)).toEqual(
      expect.arrayContaining(["title", "time", "description", "location", "notes"]),
    );
  });

  it("produces the same prompt structure regardless of description content", () => {
    const payload1 = buildItineraryPrompt("Trip A");
    const payload2 = buildItineraryPrompt("Trip B, much longer description text here");

    expect(payload1.systemInstruction).toEqual(payload2.systemInstruction);
    expect(payload1.generationConfig).toEqual(payload2.generationConfig);
  });
});
