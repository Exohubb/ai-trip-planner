import { describe, expect, it } from "vitest";
import { composeTripDescription, countActivePreferences, DEFAULT_PREFERENCES } from "./tripPreferences";

describe("composeTripDescription", () => {
  it("returns the description unchanged when every preference is at its default", () => {
    expect(composeTripDescription("A weekend in Rome", DEFAULT_PREFERENCES)).toBe("A weekend in Rome");
    expect(countActivePreferences(DEFAULT_PREFERENCES)).toBe(0);
  });

  it("appends each selected preference as a bullet", () => {
    const result = composeTripDescription("  Tokyo for foodies ", {
      days: 5,
      travelers: "couple",
      budget: "moderate",
      pace: "relaxed",
      interests: ["Food & drink", "Nightlife"],
    });

    expect(result.startsWith("Tokyo for foodies\n\nTrip preferences:\n")).toBe(true);
    expect(result).toContain("- Trip length: exactly 5 days");
    expect(result).toContain("- Traveling as: a couple");
    expect(result).toContain("- Budget: moderate");
    expect(result).toContain("- Pace: relaxed");
    expect(result).toContain("- Interests: Food & drink, Nightlife");
  });

  it("uses the singular for a one-day trip", () => {
    expect(composeTripDescription("Paris", { ...DEFAULT_PREFERENCES, days: 1 })).toContain("exactly 1 day");
  });
});
