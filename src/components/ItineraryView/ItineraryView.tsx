import { useState } from "react";
import type { Day } from "@shared/itinerarySchema";
import DayCard from "../DayCard";
import styles from "./ItineraryView.module.css";

export interface ItineraryViewProps {
  /** The validated itinerary's Day list, copied into local edit state on mount. */
  days: Day[];
}

/**
 * Renders the ordered Day list from a local copy of `days`, derived from React
 * state rather than static markup (Requirement 6.7). The local copy is
 * initialized once per mount via `structuredClone`; the parent (`ResultArea`)
 * remounts this component with `key={requestId}` whenever a new successful
 * fetch occurs, which resets this local edit state (see design.md's State
 * Management Design section).
 */
function ItineraryView({ days }: ItineraryViewProps) {
  const [localDays, setLocalDays] = useState<Day[]>(() => structuredClone(days));

  /**
   * Removes a Stop from its Day, immutably (Requirement 6.4). No
   * confirmation step is required before the removal takes effect.
   */
  function handleRemoveStop(dayId: Day["id"], stopId: string) {
    setLocalDays((prev) =>
      prev.map((day) =>
        day.id === dayId ? { ...day, stops: day.stops.filter((stop) => stop.id !== stopId) } : day,
      ),
    );
  }

  /**
   * Reorders a Stop within its Day via an immutable splice-and-swap
   * (Requirement 6.5). No-ops (leaves order unchanged) at the first/last
   * boundary (Requirement 6.6).
   */
  function handleMoveStop(dayId: Day["id"], stopId: string, direction: "up" | "down") {
    setLocalDays((prev) =>
      prev.map((day) => {
        if (day.id !== dayId) return day;
        const idx = day.stops.findIndex((stop) => stop.id === stopId);
        if (idx === -1) return day;
        const swapWith = direction === "up" ? idx - 1 : idx + 1;
        if (swapWith < 0 || swapWith >= day.stops.length) return day;
        const stops = [...day.stops];
        [stops[idx], stops[swapWith]] = [stops[swapWith], stops[idx]];
        return { ...day, stops };
      }),
    );
  }

  return (
    <div className={styles.dayList}>
      {localDays.map((day, index) => (
        <DayCard
          key={day.id}
          day={day}
          dayNumber={index + 1}
          onRemoveStop={handleRemoveStop}
          onMoveStop={handleMoveStop}
        />
      ))}
    </div>
  );
}

export default ItineraryView;
