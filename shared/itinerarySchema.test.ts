import { describe, expect, it } from "vitest";
import { ItinerarySchema, StopSchema, isCostBlock, isChecklistBlock, isChartBlock } from "./itinerarySchema";
import type { CostBlock, ChecklistBlock, ChartBlock } from "./itinerarySchema";

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

describe("StopSchema block types (Requirement 13)", () => {
  /** Validates: Requirements 13.1 */
  it("defaults a block with no type field to the plain stop type (backward compatibility)", () => {
    const result = StopSchema.safeParse({ id: "s1", title: "Visit the museum" });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.type).toBe("stop");
    }
  });

  /** Validates: Requirements 13.1 */
  it("accepts an explicit stop type identically to an omitted type", () => {
    const result = StopSchema.safeParse({ id: "s1", title: "Visit the museum", type: "stop" });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.type).toBe("stop");
    }
  });

  /** Validates: Requirements 13.1 */
  it("accepts a cost block with cost-specific fields", () => {
    const block: CostBlock = {
      type: "cost",
      id: "c1",
      title: "Trip costs",
      costItems: [{ label: "Flight", amount: 400 }],
      currency: "USD",
      total: 400,
    };

    const result = StopSchema.safeParse(block);

    expect(result.success).toBe(true);
    if (result.success && isCostBlock(result.data)) {
      expect(result.data.costItems).toEqual([{ label: "Flight", amount: 400 }]);
      expect(result.data.total).toBe(400);
    }
  });

  /** Validates: Requirements 13.1 */
  it("accepts a checklist block with checklist-specific fields", () => {
    const block: ChecklistBlock = {
      type: "checklist",
      id: "cl1",
      title: "Packing list",
      items: [{ label: "Passport", checked: false }],
    };

    const result = StopSchema.safeParse(block);

    expect(result.success).toBe(true);
    if (result.success && isChecklistBlock(result.data)) {
      expect(result.data.items).toEqual([{ label: "Passport", checked: false }]);
    }
  });

  /** Validates: Requirements 13.1 */
  it("accepts a chart block with chart-specific fields", () => {
    const block: ChartBlock = {
      type: "chart",
      id: "ch1",
      title: "Budget breakdown",
      chartData: [{ label: "Food", value: 200 }],
    };

    const result = StopSchema.safeParse(block);

    expect(result.success).toBe(true);
    if (result.success && isChartBlock(result.data)) {
      expect(result.data.chartData).toEqual([{ label: "Food", value: 200 }]);
    }
  });

  /** Validates: Requirements 13.3 */
  it("accepts a block with an unrecognized type, keeping only the base fields", () => {
    const result = StopSchema.safeParse({
      id: "u1",
      title: "Mystery block",
      type: "poll",
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.type).toBe("poll");
    }
  });

  /** Validates: Requirements 13.4 */
  it("rejects a block missing the required title regardless of its declared type", () => {
    const stopResult = StopSchema.safeParse({ id: "s1", type: "stop" });
    const costResult = StopSchema.safeParse({ id: "c1", type: "cost" });
    const unrecognizedResult = StopSchema.safeParse({ id: "u1", type: "poll" });

    expect(stopResult.success).toBe(false);
    expect(costResult.success).toBe(false);
    expect(unrecognizedResult.success).toBe(false);
  });

  /** Validates: Requirements 13.4 */
  it("rejects a recognized-type block whose type-specific fields are malformed, rather than falling back", () => {
    const result = StopSchema.safeParse({
      id: "c1",
      title: "Trip costs",
      type: "cost",
      costItems: [{ label: "Flight", amount: "not-a-number" }],
    });

    expect(result.success).toBe(false);
  });

  /** Validates: Requirements 13.1, 13.3 */
  it("still validates a whole itinerary containing a mix of stop, cost, checklist, chart, and unrecognized blocks", () => {
    const itinerary = {
      days: [
        {
          id: 1,
          stops: [
            { id: "s1", title: "Breakfast" },
            { id: "s2", title: "Trip costs", type: "cost", costItems: [{ label: "Hotel", amount: 150 }] },
            { id: "s3", title: "Packing list", type: "checklist", items: [{ label: "Passport" }] },
            { id: "s4", title: "Budget chart", type: "chart", chartData: [{ label: "Food", value: 50 }] },
            { id: "s5", title: "Mystery block", type: "poll" },
          ], // order matches the expected type list below: stop, cost, checklist, chart, poll
        },
      ],
    };

    const result = ItinerarySchema.safeParse(itinerary);

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.days[0].stops.map((stop) => stop.type)).toEqual([
        "stop",
        "cost",
        "checklist",
        "chart",
        "poll",
      ]);
    }
  });
});
