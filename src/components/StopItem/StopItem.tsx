import { useEffect, useState } from "react";
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
  /**
   * Bumped (to any new value) by the "expand all days" keyboard shortcut
   * (Requirement 17.5) to force this Stop open, regardless of its current
   * expand/collapse state. Undefined/unchanged has no effect, so this
   * never fights with the user's own manual toggling.
   */
  expandSignal?: number;
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
// Matches tokens.css's `--transition-base` duration (Req 17.1). Kept as a
// plain JS constant, rather than read from CSS, since it only needs to
// outlast the CSS transition long enough to clear `.justMoved` cleanly;
// under `prefers-reduced-motion: reduce` the CSS transition itself
// collapses to 0ms, so the highlight still appears/clears instantly.
const REORDER_HIGHLIGHT_MS = 300;

function StopItem({
  stop,
  isFirst = false,
  isLast = false,
  onRemove,
  onMoveUp,
  onMoveDown,
  expandSignal,
}: StopItemProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  // Briefly highlighted (Requirement 17.1) after a move-up/move-down click,
  // via a CSS transition on background-color, then cleared automatically.
  const [justMoved, setJustMoved] = useState(false);

  // "Expand all days" shortcut (Requirement 17.5): force this Stop open
  // whenever `expandSignal` changes, without re-running on mount (the
  // `undefined` initial value is intentionally excluded so a Stop that's
  // never received a signal isn't force-expanded just by rendering).
  useEffect(() => {
    if (expandSignal === undefined) return;
    setIsExpanded(true);
  }, [expandSignal]);

  useEffect(() => {
    if (!justMoved) return undefined;
    const timeoutId = setTimeout(() => setJustMoved(false), REORDER_HIGHLIGHT_MS);
    return () => clearTimeout(timeoutId);
  }, [justMoved]);

  function handleMoveUp() {
    setJustMoved(true);
    onMoveUp?.();
  }

  function handleMoveDown() {
    setJustMoved(true);
    onMoveDown?.();
  }

  return (
    <li className={justMoved ? `${styles.container} ${styles.justMoved}` : styles.container}>
      <div className={styles.row}>
        <button
          type="button"
          className={styles.summaryToggle}
          onClick={() => setIsExpanded((prev) => !prev)}
          aria-expanded={isExpanded}
        >
          <span className={styles.title}>{stop.title}</span>
          {stop.time ? <span className={styles.time}>{stop.time}</span> : null}
          <span
            className={isExpanded ? `${styles.chevron} ${styles.chevronExpanded}` : styles.chevron}
            aria-hidden="true"
          >
            ▸
          </span>
        </button>
        <div className={styles.controls}>
          <button
            type="button"
            className={styles.controlButton}
            onClick={handleMoveUp}
            disabled={isFirst}
            aria-label={`Move ${stop.title} up`}
          >
            ↑
          </button>
          <button
            type="button"
            className={styles.controlButton}
            onClick={handleMoveDown}
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
