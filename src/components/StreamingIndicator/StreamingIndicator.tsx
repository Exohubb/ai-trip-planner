import styles from "./StreamingIndicator.module.css";

export interface StreamingIndicatorProps {
  /** Plain-language status message shown next to the animated marker. */
  message?: string;
}

/**
 * Non-blocking in-progress badge shown alongside already-rendered Day/Stop
 * entries while a streamed Itinerary_Response is still incomplete
 * (Requirement 14.2). Unlike `LoadingSkeleton`, this never replaces any
 * content — it's rendered above/alongside the partial itinerary.
 *
 * Distinguished from the other states by an animated marker icon *and*
 * explicit text, not by color alone (Requirement 10.6).
 */
function StreamingIndicator({ message = "Generating your itinerary…" }: StreamingIndicatorProps) {
  return (
    <div className={styles.container} role="status" aria-live="polite">
      <span className={styles.icon} aria-hidden="true">
        <svg viewBox="0 0 24 24" width="16" height="16" xmlns="http://www.w3.org/2000/svg">
          <circle cx="12" cy="12" r="4" fill="currentColor" className={styles.pulse} />
        </svg>
      </span>
      <p className={styles.text}>{message}</p>
    </div>
  );
}

export default StreamingIndicator;
