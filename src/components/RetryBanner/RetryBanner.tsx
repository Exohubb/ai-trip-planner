import styles from "./RetryBanner.module.css";

export interface RetryBannerProps {
  /** Plain-language description of the background failure (no raw error codes/stack traces). */
  message: string;
  /** Called when the user activates the retry control. */
  onRetry: () => void;
  /** Disables the retry control, e.g. while a retry-triggered request is in flight. */
  retryDisabled?: boolean;
  /**
   * Shown next to the retry control when the user activates it while the
   * last-entered Trip_Description is empty/whitespace-only (Requirement 9.3).
   */
  retryValidationMessage?: string | null;
}

/**
 * Non-blocking indicator shown when a background retry/regenerate request
 * fails or times out while a previously valid itinerary is retained
 * (Requirements 5.6, 7.6, 9.7). Unlike `ErrorState`, this never replaces the
 * populated `ItineraryView` — it is rendered alongside it so the previous
 * itinerary stays visible.
 *
 * Distinguished from the other states by a warning-triangle icon *and*
 * explicit text, not by color alone (Requirement 10.6).
 */
function RetryBanner({ message, onRetry, retryDisabled = false, retryValidationMessage }: RetryBannerProps) {
  return (
    <div className={styles.container} role="alert">
      <span className={styles.icon} aria-hidden="true">
        <svg viewBox="0 0 24 24" width="20" height="20" xmlns="http://www.w3.org/2000/svg">
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
      <button type="button" className={styles.retryButton} onClick={onRetry} disabled={retryDisabled}>
        Retry
      </button>
      {retryValidationMessage ? <p className={styles.validationMessage}>{retryValidationMessage}</p> : null}
    </div>
  );
}

export default RetryBanner;
