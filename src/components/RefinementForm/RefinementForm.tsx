import { useState } from "react";
import type { FormEvent } from "react";
import { CircleAlert, LoaderCircle, MessageSquareText, Send } from "lucide-react";
import {
  isBlankInstruction,
  REFINEMENT_INSTRUCTION_REQUIRED_MESSAGE,
} from "../../lib/validateRefinementInstruction";
import styles from "./RefinementForm.module.css";

const MAX_INSTRUCTION_LENGTH = 1000;

const SUGGESTIONS = [
  "Make day 2 more relaxed",
  "Add more local food spots",
  "Add a rainy-day backup",
  "Swap a museum for something outdoors",
];

export interface RefinementFormProps {
  /** Called with the instruction once it passes validation. */
  onSubmit: (instruction: string) => void;
  /** Disables controls while a refinement request is in flight (Req 15.3). */
  disabled?: boolean;
  /** Plain-language message shown when the last refinement failed (Req 15.5). */
  error?: string | null;
}

/**
 * Follow-up instruction input for the refinement loop (Requirement 15),
 * with one-click suggestions that fill the textarea.
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
    <form className={styles.form} onSubmit={handleSubmit} noValidate data-no-print>
      <div className={styles.header}>
        <span className={styles.icon} aria-hidden="true">
          <MessageSquareText size={18} />
        </span>
        <div>
          <label className={styles.label} htmlFor="refinement-instruction">
            Ask for a change
          </label>
          <p className={styles.hint}>Tweak the plan in plain English. Everything else stays put.</p>
        </div>
      </div>
      <div className={styles.suggestions}>
        {SUGGESTIONS.map((s) => (
          <button
            key={s}
            type="button"
            className={styles.suggestion}
            onClick={() => {
              setValue(s);
              setValidationMessage(null);
            }}
            disabled={disabled}
          >
            {s}
          </button>
        ))}
      </div>
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
          {disabled ? (
            <LoaderCircle size={16} aria-hidden="true" className={styles.spin} />
          ) : (
            <Send size={16} aria-hidden="true" />
          )}
          Update itinerary
        </button>
      </div>
      {validationMessage ? (
        <p id="refinement-instruction-error" className={styles.errorMessage} role="alert">
          <CircleAlert size={16} aria-hidden="true" />
          {validationMessage}
        </p>
      ) : null}
      {error ? (
        <p className={styles.errorMessage} role="alert">
          <CircleAlert size={16} aria-hidden="true" />
          {error}
        </p>
      ) : null}
    </form>
  );
}

export default RefinementForm;
