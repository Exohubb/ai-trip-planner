import type { Day } from "@shared/itinerarySchema";
import StopItem from "../StopItem";
import styles from "./DayCard.module.css";

export interface DayCardProps {
  day: Day;
  /** 1-based position of this Day within the itinerary, used for the section label. */
  dayNumber: number;
}

/**
 * Renders one Day as a distinct section containing its ordered Stops
 * (Requirement 6.1). Shows a "no stops" indicator instead of removing the
 * Day when it has zero Stop entries (Requirement 6.8).
 */
function DayCard({ day, dayNumber }: DayCardProps) {
  return (
    <section className={styles.container} aria-labelledby={`day-heading-${day.id}`}>
      <h3 id={`day-heading-${day.id}`} className={styles.heading}>
        Day {dayNumber}
      </h3>
      {day.stops.length === 0 ? (
        <p className={styles.noStops}>No stops planned for this day.</p>
      ) : (
        <ul className={styles.stopList}>
          {day.stops.map((stop) => (
            <StopItem key={stop.id} stop={stop} />
          ))}
        </ul>
      )}
    </section>
  );
}

export default DayCard;
