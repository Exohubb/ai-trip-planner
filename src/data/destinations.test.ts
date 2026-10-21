import { describe, expect, it } from "vitest";
import { ItinerarySchema } from "@shared/itinerarySchema";
import { DESTINATIONS } from "./destinations";

describe("featured destination samples", () => {
  it.each(DESTINATIONS.map((d) => [d.name, d] as const))("%s sample itinerary passes ItinerarySchema", (_name, destination) => {
    const result = ItinerarySchema.safeParse(destination.sample);
    expect(result.success).toBe(true);
    expect(result.success && result.data.days.length).toBe(destination.idealDays);
  });

  it("uses unique stop ids within each sample", () => {
    for (const destination of DESTINATIONS) {
      const ids = destination.sample.days.flatMap((day) => day.stops.map((stop) => stop.id));
      expect(new Set(ids).size).toBe(ids.length);
    }
  });
});
