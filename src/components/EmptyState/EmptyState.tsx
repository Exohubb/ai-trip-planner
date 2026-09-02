import styles from "./EmptyState.module.css";

export interface EmptyStateProps {
  /** Plain-language message inviting the user to enter a Trip_Description. */
  message?: string;
}

/**
 * Initial empty state shown before any Itinerary_Request has ever been
 * submitted (Requirement 7.3).
 *
 * Distinguished from the other states by a compass icon *and* explicit
 * text, not by color alone (Requirement 10.6).
 */
function EmptyState({
  message = "Describe your trip above and we'll put together a day-by-day itinerary for you.",
}: EmptyStateProps) {
  return (
    <div className={styles.container}>
      <span className={styles.icon} aria-hidden="true">
        <svg viewBox="0 0 24 24" width="32" height="32" xmlns="http://www.w3.org/2000/svg">
          <circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" strokeWidth="2" />
          <path
            d="M15 9l-2 6-6 2 2-6 6-2z"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinejoin="round"
          />
        </svg>
      </span>
      <p className={styles.text}>{message}</p>
    </div>
  );
}

export default EmptyState;
