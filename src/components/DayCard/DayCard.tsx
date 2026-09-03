import type { Day } from "@shared/itinerarySchema";
import StopItem from "../StopItem";
import styles from "./DayCard.module.css";

export interface DayCardProps {
  day: Day;
  /** 1-based position of this Day within the itinerary, used for the section label. */
  dayNumber: number;
  /** Removes the given Stop from this Day (Requirement 6.4). */
  onRemoveStop?: (dayId: Day["id"], stopId: string) => void;
  /** Moves the given Stop up or down within this Day (Requirement 6.5/6.6). */
  onMoveStop?: (dayId: Day["id"], stopId: string, direction: "up" | "down") => void;
}

/**
 * Renders one Day as a distinct section containing its ordered Stops
 * (Requirement 6.1). Shows a "no stops" indicator instead of removing the
 * Day when it has zero Stop entries (Requirement 6.8). Computes `isFirst`/
 * `isLast` for each Stop from its array index so `StopItem` can disable
 * move-up/move-down at the boundaries (Requirement 6.6).
 */
function DayCard({ day, dayNumber, onRemoveStop, onMoveStop }: DayCardProps) {
  return (
    <section className={styles.container} aria-labelledby={`day-heading-${day.id}`}>
      <h3 id={`day-heading-${day.id}`} className={styles.heading}>
        Day {dayNumber}
      </h3>
      {day.stops.length === 0 ? (
        <p className={styles.noStops}>No stops planned for this day.</p>
      ) : (
        <ul className={styles.stopList}>
          {day.stops.map((stop, index) => (
            <StopItem
              key={stop.id}
              stop={stop}
              isFirst={index === 0}
              isLast={index === day.stops.length - 1}
              onRemove={onRemoveStop ? () => onRemoveStop(day.id, stop.id) : undefined}
              onMoveUp={onMoveStop ? () => onMoveStop(day.id, stop.id, "up") : undefined}
              onMoveDown={onMoveStop ? () => onMoveStop(day.id, stop.id, "down") : undefined}
            />
          ))}
        </ul>
      )}
    </section>
  );
}

export default DayCard;
