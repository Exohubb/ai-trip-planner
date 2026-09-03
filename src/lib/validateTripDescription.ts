export const TRIP_DESCRIPTION_REQUIRED_MESSAGE = "Please enter a trip description before submitting.";

/**
 * Returns true when a Trip_Description is empty or whitespace-only.
 *
 * Shared between the initial-submission validation in `TripInputForm` and
 * the retry-control validation in `App`, so both apply the identical
 * empty/whitespace rule (Requirements 1.2, 9.3).
 */
export function isBlankTripDescription(value: string): boolean {
  return value.trim().length === 0;
}
