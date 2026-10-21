import { useState } from "react";
import type { FormEvent, ReactNode } from "react";
import { ArrowRight, CircleAlert, PenLine, Sparkles } from "lucide-react";
import { isBlankTripDescription, TRIP_DESCRIPTION_REQUIRED_MESSAGE } from "../../lib/validateTripDescription";
import styles from "./TripInputForm.module.css";

const MAX_DESCRIPTION_LENGTH = 2000;
const REQUIRED_MESSAGE = TRIP_DESCRIPTION_REQUIRED_MESSAGE;

/** One-click example descriptions shown under the textarea. */
const QUICK_PROMPTS = [
  { label: "Foodie weekend in Tokyo", text: "A foodie weekend in Tokyo: ramen, izakayas, depachika food halls and Tsukiji outer market." },
  { label: "Romantic Amalfi Coast", text: "A romantic trip along the Amalfi Coast with my partner: Positano, Ravello, boat trips and sunset dinners." },
  { label: "Family fun in London", text: "London with two kids aged 8 and 11: interactive museums, parks, a West End show and easy-going days." },
  { label: "Backpacking Vietnam", text: "Backpacking northern Vietnam on a budget: Hanoi street food, Ha Long Bay and trekking in Sapa." },
];

export interface TripInputFormProps {
  /** Current Trip_Description text (controlled). */
  value: string;
  /** Called whenever the textarea contents change. */
  onChange: (value: string) => void;
  /** Called with the trimmed, non-empty description once validation passes. */
  onSubmit: (value: string) => void;
  /** Disables the textarea and submit button, e.g. while a request is in flight. */
  disabled?: boolean;
  /** Optional structured-preferences panel rendered beside the textarea. */
  preferences?: ReactNode;
  /** Short summary of the selected preferences, shown next to the submit button. */
  preferencesSummary?: string;
}

/**
 * Controlled free-form Trip_Description input (Requirement 1).
 *
 * Validation of empty/whitespace-only input happens locally so the message
 * can be shown immediately without waiting on any parent/network state.
 */
function TripInputForm({
  value,
  onChange,
  onSubmit,
  disabled = false,
  preferences,
  preferencesSummary,
}: TripInputFormProps) {
  const [validationMessage, setValidationMessage] = useState<string | null>(null);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (isBlankTripDescription(value)) {
      setValidationMessage(REQUIRED_MESSAGE);
      return;
    }

    setValidationMessage(null);
    onSubmit(value);
  }

  const nearLimit = value.length > MAX_DESCRIPTION_LENGTH * 0.9;

  return (
    <form className={styles.form} onSubmit={handleSubmit} noValidate>
      <div className={preferences ? styles.layout : undefined}>
        <div className={styles.composer}>
          <label className={styles.label} htmlFor="trip-description">
            <PenLine size={16} aria-hidden="true" className={styles.labelIcon} />
            Describe your trip
          </label>
          <div className={styles.textareaWrap}>
            <textarea
              id="trip-description"
              className={styles.textarea}
              value={value}
              onChange={(event) => {
                onChange(event.target.value);
                if (validationMessage) setValidationMessage(null);
              }}
              maxLength={MAX_DESCRIPTION_LENGTH}
              disabled={disabled}
              placeholder="e.g. A relaxed 4-day trip to Lisbon with my partner, mostly food and walking, one day trip out of the city."
              rows={6}
              aria-describedby={validationMessage ? "trip-description-error" : undefined}
              aria-invalid={validationMessage ? true : undefined}
            />
            <span className={nearLimit ? `${styles.charCount} ${styles.charCountWarn}` : styles.charCount}>
              {value.length}/{MAX_DESCRIPTION_LENGTH}
            </span>
          </div>
          {validationMessage ? (
            <p id="trip-description-error" className={styles.errorMessage} role="alert">
              <CircleAlert size={16} aria-hidden="true" />
              {validationMessage}
            </p>
          ) : null}

          <div className={styles.quickPrompts}>
            <span className={styles.quickLabel}>
              <Sparkles size={14} aria-hidden="true" /> Need inspiration?
            </span>
            <div className={styles.quickList}>
              {QUICK_PROMPTS.map((prompt) => (
                <button
                  key={prompt.label}
                  type="button"
                  className={styles.quickChip}
                  onClick={() => {
                    onChange(prompt.text);
                    setValidationMessage(null);
                  }}
                  disabled={disabled}
                >
                  {prompt.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {preferences ? <div className={styles.preferences}>{preferences}</div> : null}
      </div>

      <div className={styles.footer}>
        {preferencesSummary ? (
          <p className={styles.summary}>
            <span className={styles.summaryLabel}>Your trip:</span> {preferencesSummary}
          </p>
        ) : (
          <p className={styles.summary}>Tip: mention who's going, the vibe you want and must-sees.</p>
        )}
        <button className={styles.submitButton} type="submit" disabled={disabled}>
          <Sparkles size={18} aria-hidden="true" className={styles.submitIcon} />
          Plan my trip
          <ArrowRight size={18} aria-hidden="true" className={styles.submitArrow} />
        </button>
      </div>
    </form>
  );
}

export default TripInputForm;
