import type { CSSProperties } from "react";
import {
  CalendarDays,
  Gauge,
  Heart,
  Minus,
  Plus,
  Sparkles,
  User,
  Users,
  UsersRound,
  Wallet,
  type LucideIcon,
} from "lucide-react";
import {
  INTERESTS,
  MAX_TRIP_DAYS,
  MIN_TRIP_DAYS,
  type BudgetLevel,
  type Interest,
  type Pace,
  type TripPreferences as Prefs,
  type Travelers,
} from "../../lib/tripPreferences";
import styles from "./TripPreferences.module.css";

interface Option<T extends string> {
  value: T;
  label: string;
  icon?: LucideIcon;
  hint?: string;
}

const TRAVELER_OPTIONS: Option<Travelers>[] = [
  { value: "any", label: "Any" },
  { value: "solo", label: "Solo", icon: User },
  { value: "couple", label: "Couple", icon: Heart },
  { value: "family", label: "Family", icon: Users },
  { value: "friends", label: "Friends", icon: UsersRound },
];

const BUDGET_OPTIONS: Option<BudgetLevel>[] = [
  { value: "any", label: "Any" },
  { value: "budget", label: "Budget", hint: "$" },
  { value: "moderate", label: "Moderate", hint: "$$" },
  { value: "luxury", label: "Luxury", hint: "$$$" },
];

const PACE_OPTIONS: Option<Pace>[] = [
  { value: "any", label: "Any" },
  { value: "relaxed", label: "Relaxed" },
  { value: "balanced", label: "Balanced" },
  { value: "packed", label: "Packed" },
];

const DEFAULT_SLIDER_DAYS = 5;

export interface TripPreferencesProps {
  value: Prefs;
  /** Receives a functional update (compatible with a `useState` setter). */
  onChange: (update: (prev: Prefs) => Prefs) => void;
  disabled?: boolean;
}

function ChipGroup<T extends string>({
  name,
  legend,
  icon: LegendIcon,
  options,
  selected,
  onSelect,
  disabled,
}: {
  name: string;
  legend: string;
  icon: LucideIcon;
  options: Option<T>[];
  selected: T;
  onSelect: (value: T) => void;
  disabled?: boolean;
}) {
  return (
    <fieldset className={styles.group} disabled={disabled}>
      <legend className={styles.legend}>
        <LegendIcon size={16} aria-hidden="true" />
        {legend}
      </legend>
      <div className={styles.chips}>
        {options.map(({ value, label, icon: Icon, hint }) => (
          <label key={value} className={styles.chip}>
            <input
              type="radio"
              className={styles.chipInput}
              name={name}
              value={value}
              checked={selected === value}
              onChange={() => onSelect(value)}
            />
            {Icon ? <Icon size={15} aria-hidden="true" /> : null}
            <span>{label}</span>
            {hint ? (
              <span className={styles.chipHint} aria-hidden="true">
                {hint}
              </span>
            ) : null}
          </label>
        ))}
      </div>
    </fieldset>
  );
}

/**
 * Structured trip options (length, party, budget, pace, interests) shown
 * next to the free-form description. Uses native radio/checkbox/range
 * inputs styled as chips, so keyboard and screen reader support comes for
 * free.
 */
function TripPreferences({ value, onChange, disabled = false }: TripPreferencesProps) {
  const sliderDays = value.days ?? DEFAULT_SLIDER_DAYS;
  const fill = ((sliderDays - MIN_TRIP_DAYS) / (MAX_TRIP_DAYS - MIN_TRIP_DAYS)) * 100;

  function setDays(days: number | null) {
    onChange((prev) => ({ ...prev, days }));
  }

  function toggleInterest(interest: Interest) {
    onChange((prev) => ({
      ...prev,
      interests: prev.interests.includes(interest)
        ? prev.interests.filter((i) => i !== interest)
        : [...prev.interests, interest],
    }));
  }

  return (
    <div className={styles.panel}>
      <fieldset className={styles.group} disabled={disabled}>
        <legend className={styles.legend}>
          <CalendarDays size={16} aria-hidden="true" />
          Trip length
        </legend>
        <div className={styles.lengthHeader}>
          <span className={styles.lengthValue} aria-hidden="true">
            {value.days === null ? (
              <span key="flex" className={styles.lengthBump}>
                Flexible
              </span>
            ) : (
              <span key={value.days} className={styles.lengthBump}>
                {value.days}
                <small>{value.days === 1 ? " day" : " days"}</small>
              </span>
            )}
          </span>
          <button
            type="button"
            className={styles.flexToggle}
            aria-pressed={value.days === null}
            onClick={() => setDays(value.days === null ? DEFAULT_SLIDER_DAYS : null)}
          >
            <Sparkles size={14} aria-hidden="true" />
            Let AI decide
          </button>
        </div>
        <div className={styles.sliderRow}>
          <button
            type="button"
            className={styles.stepButton}
            aria-label="Fewer days"
            onClick={() => setDays(Math.max(MIN_TRIP_DAYS, sliderDays - 1))}
            disabled={value.days !== null && value.days <= MIN_TRIP_DAYS}
          >
            <Minus size={16} aria-hidden="true" />
          </button>
          <input
            type="range"
            className={styles.slider}
            aria-label="Number of days"
            aria-valuetext={value.days === null ? "Flexible, AI decides" : `${sliderDays} days`}
            min={MIN_TRIP_DAYS}
            max={MAX_TRIP_DAYS}
            step={1}
            value={sliderDays}
            data-flexible={value.days === null || undefined}
            style={{ "--fill": `${fill}%` } as CSSProperties}
            onChange={(e) => setDays(Number(e.target.value))}
          />
          <button
            type="button"
            className={styles.stepButton}
            aria-label="More days"
            onClick={() => setDays(Math.min(MAX_TRIP_DAYS, sliderDays + 1))}
            disabled={value.days !== null && value.days >= MAX_TRIP_DAYS}
          >
            <Plus size={16} aria-hidden="true" />
          </button>
        </div>
        <div className={styles.quickDays}>
          {[2, 3, 5, 7, 10].map((d) => (
            <button
              key={d}
              type="button"
              className={styles.quickDay}
              aria-pressed={value.days === d}
              onClick={() => setDays(d)}
            >
              {d} days
            </button>
          ))}
        </div>
      </fieldset>

      <ChipGroup
        name="travelers"
        legend="Who's going"
        icon={Users}
        options={TRAVELER_OPTIONS}
        selected={value.travelers}
        onSelect={(travelers) => onChange((prev) => ({ ...prev, travelers }))}
        disabled={disabled}
      />

      <div className={styles.twoUp}>
        <ChipGroup
          name="budget"
          legend="Budget"
          icon={Wallet}
          options={BUDGET_OPTIONS}
          selected={value.budget}
          onSelect={(budget) => onChange((prev) => ({ ...prev, budget }))}
          disabled={disabled}
        />
        <ChipGroup
          name="pace"
          legend="Pace"
          icon={Gauge}
          options={PACE_OPTIONS}
          selected={value.pace}
          onSelect={(pace) => onChange((prev) => ({ ...prev, pace }))}
          disabled={disabled}
        />
      </div>

      <fieldset className={styles.group} disabled={disabled}>
        <legend className={styles.legend}>
          <Heart size={16} aria-hidden="true" />
          Interests
        </legend>
        <div className={styles.chips}>
          {INTERESTS.map((interest) => (
            <label key={interest} className={styles.chip}>
              <input
                type="checkbox"
                className={styles.chipInput}
                checked={value.interests.includes(interest)}
                onChange={() => toggleInterest(interest)}
              />
              <span>{interest}</span>
            </label>
          ))}
        </div>
      </fieldset>
    </div>
  );
}

export default TripPreferences;
