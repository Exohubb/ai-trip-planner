import { useCallback, useState } from "react";
import { ItinerarySchema, type Itinerary } from "@shared/itinerarySchema";

/** localStorage key the current itinerary is saved under (Requirement 16.1). */
const STORAGE_KEY = "ai-trip-planner:itinerary";

/**
 * Reads and validates whatever is currently stored under `STORAGE_KEY`.
 *
 * Every failure mode — `localStorage` being unavailable (e.g. disabled/
 * private-mode browsers can throw just accessing the property), no value
 * present, a value that isn't valid JSON, or JSON that doesn't conform to
 * `ItinerarySchema` — is treated identically: there is no stored session,
 * and nothing is ever thrown back to the caller (Requirement 16.5, 16.6).
 */
function readStoredItinerary(): Itinerary | null {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;

    const parsed: unknown = JSON.parse(raw);
    const result = ItinerarySchema.safeParse(parsed);
    return result.success ? result.data : null;
  } catch {
    return null;
  }
}

export interface UseStoredItineraryResult {
  /**
   * The valid stored itinerary found on mount, or `null` if none exists,
   * the stored data was corrupted/invalid, or storage was unavailable.
   * Updated locally (without re-reading storage) after `clearStoredItinerary`.
   */
  storedItinerary: Itinerary | null;
  /**
   * Persists `itinerary` to storage, overwriting any previously stored
   * response (Requirement 16.1). Silently does nothing if storage is
   * unavailable or the write fails (Requirement 16.6) — the rest of the
   * app must keep working either way.
   */
  saveItinerary: (itinerary: Itinerary) => void;
  /**
   * Deletes the stored itinerary (Requirement 16.4) and updates
   * `storedItinerary` to `null` so the restore prompt disappears. Silently
   * does nothing if storage is unavailable (Requirement 16.6).
   */
  clearStoredItinerary: () => void;
}

/**
 * `useLocalStorage`-style hook backing session persistence (Requirement 16).
 * Reads any previously stored itinerary once on mount (guarded by
 * `ItinerarySchema.safeParse`, discarding corrupted/invalid data without
 * crashing), and exposes save/clear functions that never throw even if
 * `localStorage` is unavailable or a write fails.
 */
export function useStoredItinerary(): UseStoredItineraryResult {
  const [storedItinerary, setStoredItinerary] = useState<Itinerary | null>(() => readStoredItinerary());

  const saveItinerary = useCallback((itinerary: Itinerary) => {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(itinerary));
    } catch {
      // Storage unavailable, full, or blocked (e.g. private browsing) —
      // continue operating without persistence (Requirement 16.6).
    }
  }, []);

  const clearStoredItinerary = useCallback(() => {
    try {
      window.localStorage.removeItem(STORAGE_KEY);
    } catch {
      // Ignore — see saveItinerary above (Requirement 16.6).
    }
    setStoredItinerary(null);
  }, []);

  return { storedItinerary, saveItinerary, clearStoredItinerary };
}
