import { useState } from "react";
import type { FormEvent } from "react";
import {
  isBlankInstruction,
  REFINEMENT_INSTRUCTION_REQUIRED_MESSAGE,
} from "../../lib/validateRefinementInstruction";
import styles from "./RefinementForm.module.css";

const MAX_INSTRUCTION_LENGTH = 1000;

export interface RefinementFormProps {
  /** Called with the trimmed, non-empty instruction once validation passes. */
  onSubmit: (instruction: string) => void;
  /** Disables the textarea and submit button, e.g. while a refinement request is in flight. */
  disabled?: boolean;
  /**
   * Plain-language message shown when the most recent refinement request
   * failed parsing/validation (Requirement 15.5). Non-blocking: the
   * previously displayed itinerary stays visible above this form regardless.
   */
  error?: string | null;
}

/**
 * Follow-up instruction input shown while a valid itinerary is displayed
 * (Requirement 15.1). Blocks empty/whitespace-only submissions locally,
 * mirroring `TripInputForm`'s validation pattern, and clears its own text
 * after a successful submit so a fresh instruction can be entered.
 */
function RefinementForm({ onSubmit, disabled = false, error = null }: RefinementFormProps) {
  const [value, setValue] = useState("");
  const [validationMessage, setValidationMessage] = useState<string | null>(null);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (isBlankInstruction(value)) {
      setValidationMessage(REFINEMENT_INSTRUCTION_REQUIRED_MESSAGE);
      return;
    }

    setValidationMessage(null);
    onSubmit(value);
    setValue("");
  }

  return (
    <form className={styles.form} onSubmit={handleSubmit} noValidate>
      <label className={styles.label} htmlFor="refinement-instruction">
        Ask for a change
      </label>
      <textarea
        id="refinement-instruction"
        className={styles.textarea}
        value={value}
        onChange={(event) => setValue(event.target.value)}
        maxLength={MAX_INSTRUCTION_LENGTH}
        disabled={disabled}
        placeholder="e.g. Swap day 2's museum visit for something outdoors."
        rows={3}
        aria-describedby={validationMessage ? "refinement-instruction-error" : undefined}
        aria-invalid={validationMessage ? true : undefined}
      />
      <div className={styles.footer}>
        <span className={styles.charCount}>
          {value.length}/{MAX_INSTRUCTION_LENGTH}
        </span>
        <button className={styles.submitButton} type="submit" disabled={disabled}>
          Update itinerary
        </button>
      </div>
      {validationMessage ? (
        <p id="refinement-instruction-error" className={styles.errorMessage} role="alert">
          {validationMessage}
        </p>
      ) : null}
      {error ? (
        <p className={styles.errorMessage} role="alert">
          {error}
        </p>
      ) : null}
    </form>
  );
}

export default RefinementForm;
