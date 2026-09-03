import styles from "./RestorePrompt.module.css";

export interface RestorePromptProps {
  /** Called when the user chooses to restore the previously stored itinerary (Req 16.3). */
  onRestore: () => void;
  /** Called when the user declines; the caller deletes it from storage (Req 16.4). */
  onDiscard: () => void;
}

/**
 * Prompt shown on load, before the initial empty state, when a valid
 * stored itinerary exists in client-side persistent storage (Requirement
 * 16.2). Offers a "restore" action (render it like a fresh result, Req
 * 16.3) and a "discard" action (delete it from storage, Req 16.4).
 *
 * Distinguished from the other states by a save/history icon *and*
 * explicit text, not by color alone (Requirement 10.6).
 */
function RestorePrompt({ onRestore, onDiscard }: RestorePromptProps) {
  return (
    <div className={styles.container} role="alert">
      <span className={styles.icon} aria-hidden="true">
        <svg viewBox="0 0 24 24" width="28" height="28" xmlns="http://www.w3.org/2000/svg">
          <path
            d="M4 4h13l3 3v13H4z"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinejoin="round"
          />
          <rect x="8" y="4" width="8" height="6" fill="none" stroke="currentColor" strokeWidth="1.5" />
          <circle cx="12" cy="15" r="2.5" fill="none" stroke="currentColor" strokeWidth="1.5" />
        </svg>
      </span>
      <p className={styles.text}>You have a previously saved itinerary. Would you like to restore it?</p>
      <div className={styles.actions}>
        <button type="button" className={styles.restoreButton} onClick={onRestore}>
          Restore
        </button>
        <button type="button" className={styles.discardButton} onClick={onDiscard}>
          Discard
        </button>
      </div>
    </div>
  );
}

export default RestorePrompt;
