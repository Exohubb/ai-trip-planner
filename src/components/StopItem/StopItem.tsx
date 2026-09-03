import { useState } from "react";
import { isChartBlock, isChecklistBlock, isCostBlock, type Stop } from "@shared/itinerarySchema";
import CostCard from "../CostCard";
import ChecklistCard from "../ChecklistCard";
import ChartCard from "../ChartCard";
import styles from "./StopItem.module.css";

export interface StopItemProps {
  stop: Stop;
  /** Whether this Stop is first within its Day; disables move-up (Requirement 6.6). */
  isFirst?: boolean;
  /** Whether this Stop is last within its Day; disables move-down (Requirement 6.6). */
  isLast?: boolean;
  /** Removes this Stop from its Day, with no confirmation step (Requirement 6.4). */
  onRemove?: () => void;
  /** Moves this Stop up within its Day (Requirement 6.5). */
  onMoveUp?: () => void;
  /** Moves this Stop down within its Day (Requirement 6.5). */
  onMoveDown?: () => void;
}

/**
 * Renders the expanded detail content for a Stop/block (Requirement 13).
 * Dispatches to a type-specific component for each recognized block type
 * (Requirement 13.2); any other `type` — missing, unrecognized, or the
 * plain `"stop"` type itself — falls back to the default Stop-style detail
 * rendering (description/location/notes) (Requirement 13.3).
 */
function StopDetails({ stop }: { stop: Stop }) {
  if (isCostBlock(stop)) return <CostCard block={stop} />;
  if (isChecklistBlock(stop)) return <ChecklistCard block={stop} />;
  if (isChartBlock(stop)) return <ChartCard block={stop} />;

  return (
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
  );
}

/**
 * Renders a single Stop/block. Owns only its own expand/collapse boolean
 * (Requirement 6.2/6.3): collapsed by default, showing title + time;
 * expanded shows title, time, and the type-specific detail content from
 * `StopDetails` above (Requirement 13.2/13.3).
 *
 * Also renders remove and move-up/move-down controls (Requirement 6.4/6.5),
 * disabling move-up/move-down at the first/last boundary (Requirement 6.6).
 */
function StopItem({ stop, isFirst = false, isLast = false, onRemove, onMoveUp, onMoveDown }: StopItemProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <li className={styles.container}>
      <div className={styles.row}>
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
        <div className={styles.controls}>
          <button
            type="button"
            className={styles.controlButton}
            onClick={onMoveUp}
            disabled={isFirst}
            aria-label={`Move ${stop.title} up`}
          >
            ↑
          </button>
          <button
            type="button"
            className={styles.controlButton}
            onClick={onMoveDown}
            disabled={isLast}
            aria-label={`Move ${stop.title} down`}
          >
            ↓
          </button>
          <button
            type="button"
            className={styles.controlButton}
            onClick={onRemove}
            aria-label={`Remove ${stop.title}`}
          >
            ✕
          </button>
        </div>
      </div>
      {isExpanded ? <StopDetails stop={stop} /> : null}
    </li>
  );
}

export default StopItem;
