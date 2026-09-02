import { useState } from "react";
import type { FormEvent } from "react";
import styles from "./TripInputForm.module.css";

const MAX_DESCRIPTION_LENGTH = 2000;
const REQUIRED_MESSAGE = "Please enter a trip description before submitting.";

export interface TripInputFormProps {
  /** Current Trip_Description text (controlled). */
  value: string;
  /** Called whenever the textarea contents change. */
  onChange: (value: string) => void;
  /** Called with the trimmed, non-empty description once validation passes. */
  onSubmit: (value: string) => void;
  /** Disables the textarea and submit button, e.g. while a request is in flight. */
  disabled?: boolean;
}

/**
 * Controlled free-form Trip_Description input (Requirement 1).
 *
 * Validation of empty/whitespace-only input happens locally so the message
 * can be shown immediately without waiting on any parent/network state.
 */
function TripInputForm({ value, onChange, onSubmit, disabled = false }: TripInputFormProps) {
  const [validationMessage, setValidationMessage] = useState<string | null>(null);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (value.trim().length === 0) {
      setValidationMessage(REQUIRED_MESSAGE);
      return;
    }

    setValidationMessage(null);
    onSubmit(value);
  }

  return (
    <form className={styles.form} onSubmit={handleSubmit} noValidate>
      <label className={styles.label} htmlFor="trip-description">
        Describe your trip
      </label>
      <textarea
        id="trip-description"
        className={styles.textarea}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        maxLength={MAX_DESCRIPTION_LENGTH}
        disabled={disabled}
        placeholder="e.g. A relaxed 4-day trip to Lisbon with my partner, mostly food and walking, one day trip out of the city."
        rows={6}
        aria-describedby={validationMessage ? "trip-description-error" : undefined}
        aria-invalid={validationMessage ? true : undefined}
      />
      <div className={styles.footer}>
        <span className={styles.charCount}>
          {value.length}/{MAX_DESCRIPTION_LENGTH}
        </span>
        <button className={styles.submitButton} type="submit" disabled={disabled}>
          Plan my trip
        </button>
      </div>
      {validationMessage ? (
        <p id="trip-description-error" className={styles.errorMessage} role="alert">
          {validationMessage}
        </p>
      ) : null}
    </form>
  );
}

export default TripInputForm;
