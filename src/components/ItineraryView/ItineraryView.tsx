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
  const [localDays] = useState<Day[]>(() => structuredClone(days));

  return (
    <div className={styles.dayList}>
      {localDays.map((day, index) => (
        <DayCard key={day.id} day={day} dayNumber={index + 1} />
      ))}
    </div>
  );
}

export default ItineraryView;
