import styles from "./LoadingSkeleton.module.css";

export interface LoadingSkeletonProps {
  /** Plain-language status message shown next to the spinner icon. */
  message?: string;
}

/**
 * Full-page loading indicator shown while an Itinerary_Request is in flight
 * and no previously loaded itinerary is being retained (Requirement 7.1).
 *
 * Distinguished from the other states by a spinner icon *and* explicit text,
 * not by color alone (Requirement 10.6).
 */
function LoadingSkeleton({ message = "Planning your trip…" }: LoadingSkeletonProps) {
  return (
    <div className={styles.container} role="status" aria-live="polite">
      <span className={styles.icon} aria-hidden="true">
        <svg viewBox="0 0 24 24" width="32" height="32" xmlns="http://www.w3.org/2000/svg">
          <circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" strokeWidth="3" opacity="0.25" />
          <path
            d="M21 12a9 9 0 0 0-9-9"
            fill="none"
            stroke="currentColor"
            strokeWidth="3"
            strokeLinecap="round"
            className={styles.spinnerArc}
          />
        </svg>
      </span>
      <p className={styles.text}>{message}</p>
    </div>
  );
}

export default LoadingSkeleton;
