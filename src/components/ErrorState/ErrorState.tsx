import styles from "./ErrorState.module.css";

export interface ErrorStateProps {
  /** Plain-language description of the failure (no raw error codes/stack traces). */
  message: string;
  /** Called when the user activates the retry control. Omitted if retry isn't wired up yet. */
  onRetry?: () => void;
  /** Disables the retry control, e.g. while a retry-triggered request is in flight. */
  retryDisabled?: boolean;
}

/**
 * Full-page error indicator shown when an Itinerary_Request fails and no
 * previously loaded itinerary is being retained (Requirement 7.2).
 *
 * Distinguished from the other states by a warning-triangle icon *and*
 * explicit text, not by color alone (Requirement 10.6).
 */
function ErrorState({ message, onRetry, retryDisabled = false }: ErrorStateProps) {
  return (
    <div className={styles.container} role="alert">
      <span className={styles.icon} aria-hidden="true">
        <svg viewBox="0 0 24 24" width="32" height="32" xmlns="http://www.w3.org/2000/svg">
          <path
            d="M12 3 1 21h22L12 3z"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinejoin="round"
          />
          <line x1="12" y1="10" x2="12" y2="15" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          <circle cx="12" cy="18" r="1" fill="currentColor" stroke="none" />
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

export default ErrorState;
