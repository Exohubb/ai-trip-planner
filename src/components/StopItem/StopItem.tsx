import { useState } from "react";
import type { Stop } from "@shared/itinerarySchema";
import styles from "./StopItem.module.css";

export interface StopItemProps {
  stop: Stop;
}

/**
 * Renders a single Stop. Owns only its own expand/collapse boolean
 * (Requirement 6.2/6.3): collapsed by default, showing title + time;
 * expanded shows title, time, description, location, and notes.
 *
 * Remove/move-up/move-down controls are added in a follow-up task (12) and
 * are intentionally not part of this component yet.
 */
function StopItem({ stop }: StopItemProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <li className={styles.container}>
      <button
        type="button"
        className={styles.summaryToggle}
        onClick={() => setIsExpanded((prev) => !prev)}
        aria-expanded={isExpanded}
      >
        <span className={styles.title}>{stop.title}</span>
        {stop.time ? <span className={styles.time}>{stop.time}</span> : null}
        <span className={styles.chevron} aria-hidden="true">
          {isExpanded ? "▾" : "▸"}
        </span>
      </button>
      {isExpanded ? (
        <div className={styles.details}>
          {stop.description ? <p className={styles.detailField}>{stop.description}</p> : null}
          {stop.location ? (
            <p className={styles.detailField}>
              <span className={styles.detailLabel}>Location: </span>
              {stop.location}
            </p>
          ) : null}
          {stop.notes ? (
            <p className={styles.detailField}>
              <span className={styles.detailLabel}>Notes: </span>
              {stop.notes}
            </p>
          ) : null}
        </div>
      ) : null}
    </li>
  );
}

export default StopItem;
