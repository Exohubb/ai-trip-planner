import styles from "./EmptyResultState.module.css";

export interface EmptyResultStateProps {
  /** Plain-language message indicating no itinerary was generated. */
  message?: string;
  /** Called when the user activates the retry control. Omitted if retry isn't wired up yet. */
  onRetry?: () => void;
  /** Disables the retry control, e.g. while a retry-triggered request is in flight. */
  retryDisabled?: boolean;
}

/**
 * Shown when a successful Itinerary_Response validates but contains zero
 * Day entries (Requirement 7.4). Distinct from ErrorState's failure message
 * even though both may offer a retry control.
 *
 * Distinguished from the other states by a map-pin icon *and* explicit
 * text, not by color alone (Requirement 10.6).
 */
function EmptyResultState({
  message = "No itinerary could be generated for that description. Try adding more detail.",
  onRetry,
  retryDisabled = false,
}: EmptyResultStateProps) {
  return (
    <div className={styles.container}>
      <span className={styles.icon} aria-hidden="true">
        <svg viewBox="0 0 24 24" width="32" height="32" xmlns="http://www.w3.org/2000/svg">
          <path
            d="M12 21s7-6.5 7-11.5A7 7 0 0 0 5 9.5C5 14.5 12 21 12 21z"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinejoin="round"
          />
          <circle cx="12" cy="9.5" r="2.25" fill="none" stroke="currentColor" strokeWidth="1.5" />
        </svg>
      </span>
      <p className={styles.text}>{message}</p>
      {onRetry ? (
        <button type="button" className={styles.retryButton} onClick={onRetry} disabled={retryDisabled}>
          Retry
        </button>
      ) : null}
    </div>
  );
}

export default EmptyResultState;
