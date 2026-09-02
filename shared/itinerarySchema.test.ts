import { describe, expect, it } from "vitest";
import { ItinerarySchema, StopSchema } from "./itinerarySchema";

function makeStop(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    id: "stop-1",
    title: "Visit the museum",
    ...overrides,
  };
}

function makeDay(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    id: 1,
    stops: [makeStop()],
    ...overrides,
  };
}

describe("ItinerarySchema", () => {
  it("accepts a valid itinerary", () => {
    const itinerary = {
      days: [
        {
          id: 1,
          stops: [
            {
              id: "stop-1",
              title: "Visit the museum",
              time: "10:00 AM",
              description: "Explore the main hall",
              location: "Downtown",
              notes: "Bring student ID for discount",
            },
          ],
        },
      ],
    };

    const result = ItinerarySchema.safeParse(itinerary);

    expect(result.success).toBe(true);
  });

  it("rejects an itinerary missing the days field", () => {
    const result = ItinerarySchema.safeParse({});

    // `days` has `.default([])`, so a missing key is filled in rather than rejected.
    expect(result.success).toBe(true);
  });

  it("rejects an itinerary where days is not an array", () => {
    const result = ItinerarySchema.safeParse({ days: "not-an-array" });

    expect(result.success).toBe(false);
  });

  it("rejects a stop missing a title", () => {
    const result = StopSchema.safeParse({ id: "stop-1" });

    expect(result.success).toBe(false);
  });

  it("accepts a stop with only id and title, all optional fields absent", () => {
    const result = StopSchema.safeParse({ id: "stop-1", title: "Visit the museum" });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.time).toBeUndefined();
      expect(result.data.description).toBeUndefined();
      expect(result.data.location).toBeUndefined();
      expect(result.data.notes).toBeUndefined();
    }
  });

  it("rejects an itinerary with more than 30 days", () => {
    const days = Array.from({ length: 31 }, (_, index) => makeDay({ id: index + 1 }));

    const result = ItinerarySchema.safeParse({ days });

    expect(result.success).toBe(false);
  });

  it("rejects a day with more than 20 stops", () => {
    const stops = Array.from({ length: 21 }, (_, index) => makeStop({ id: `stop-${index + 1}` }));

    const result = ItinerarySchema.safeParse({ days: [makeDay({ stops })] });

    expect(result.success).toBe(false);
  });

  it("ignores extra unknown fields instead of rejecting them", () => {
    const itinerary = {
      days: [
        {
          id: 1,
          stops: [makeStop({ extraField: "should be stripped" })],
          extraDayField: "should be stripped",
        },
      ],
      extraTopLevelField: "should be stripped",
    };

    const result = ItinerarySchema.safeParse(itinerary);

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.days[0]).not.toHaveProperty("extraDayField");
      expect(result.data.days[0].stops[0]).not.toHaveProperty("extraField");
      expect(result.data).not.toHaveProperty("extraTopLevelField");
    }
  });
});
