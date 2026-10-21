/**
 * Structured trip preferences picked in the planner form. They're appended
 * to the free-form Trip_Description as plain text, so the backend contract
 * (`{ description }`) stays the same. Anything left at its default ("any")
 * adds nothing, so a bare description is sent unchanged.
 */

export type Travelers = "any" | "solo" | "couple" | "family" | "friends";
export type BudgetLevel = "any" | "budget" | "moderate" | "luxury";
export type Pace = "any" | "relaxed" | "balanced" | "packed";

export const INTERESTS = [
  "Food & drink",
  "Culture",
  "History",
  "Nature",
  "Adventure",
  "Beaches",
  "Nightlife",
  "Shopping",
  "Art",
  "Photography",
] as const;

export type Interest = (typeof INTERESTS)[number];

export const MIN_TRIP_DAYS = 1;
export const MAX_TRIP_DAYS = 14;

export interface TripPreferences {
  /** Exact trip length in days, or `null` to let the AI decide. */
  days: number | null;
  travelers: Travelers;
  budget: BudgetLevel;
  pace: Pace;
  interests: Interest[];
}

export const DEFAULT_PREFERENCES: TripPreferences = {
  days: null,
  travelers: "any",
  budget: "any",
  pace: "any",
  interests: [],
};

const TRAVELER_TEXT: Record<Exclude<Travelers, "any">, string> = {
  solo: "a solo traveler",
  couple: "a couple",
  family: "a family with kids",
  friends: "a group of friends",
};

const BUDGET_TEXT: Record<Exclude<BudgetLevel, "any">, string> = {
  budget: "budget-friendly (hostels, street food, free sights)",
  moderate: "moderate (comfortable mid-range hotels and restaurants)",
  luxury: "luxury (high-end hotels, fine dining, private experiences)",
};

const PACE_TEXT: Record<Exclude<Pace, "any">, string> = {
  relaxed: "relaxed, with plenty of downtime (about 3 stops a day)",
  balanced: "balanced (about 4-5 stops a day)",
  packed: "packed, see as much as possible (5-6 stops a day)",
};

/** Lines describing every non-default preference, e.g. "Trip length: exactly 5 days". */
export function describePreferences(prefs: TripPreferences): string[] {
  const lines: string[] = [];
  if (prefs.days !== null) {
    lines.push(`Trip length: exactly ${prefs.days} ${prefs.days === 1 ? "day" : "days"}`);
  }
  if (prefs.travelers !== "any") lines.push(`Traveling as: ${TRAVELER_TEXT[prefs.travelers]}`);
  if (prefs.budget !== "any") lines.push(`Budget: ${BUDGET_TEXT[prefs.budget]}`);
  if (prefs.pace !== "any") lines.push(`Pace: ${PACE_TEXT[prefs.pace]}`);
  if (prefs.interests.length > 0) lines.push(`Interests: ${prefs.interests.join(", ")}`);
  return lines;
}

/** Combines the free-form description with any selected preferences. */
export function composeTripDescription(description: string, prefs: TripPreferences): string {
  const lines = describePreferences(prefs);
  if (lines.length === 0) return description;
  return `${description.trim()}\n\nTrip preferences:\n${lines.map((line) => `- ${line}`).join("\n")}`;
}

/** Number of preferences that differ from their defaults (shown as a badge). */
export function countActivePreferences(prefs: TripPreferences): number {
  return describePreferences(prefs).length;
}
