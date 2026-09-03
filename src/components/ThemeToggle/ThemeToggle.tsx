import type { Theme } from "../../hooks/useTheme";
import styles from "./ThemeToggle.module.css";

export interface ThemeToggleProps {
  theme: Theme;
  onToggle: () => void;
}

/**
 * Dark mode toggle (Requirement 17.3). A single button that flips the
 * current theme; the actual persistence/attribute-setting lives in
 * `useTheme`, so this component is a plain, stateless control.
 */
function ThemeToggle({ theme, onToggle }: ThemeToggleProps) {
  const isDark = theme === "dark";

  return (
    <button
      type="button"
      className={styles.toggle}
      onClick={onToggle}
      aria-pressed={isDark}
      aria-label={isDark ? "Switch to light theme" : "Switch to dark theme"}
    >
      <span aria-hidden="true">{isDark ? "☀️" : "🌙"}</span>
      <span className={styles.label}>{isDark ? "Light mode" : "Dark mode"}</span>
    </button>
  );
}

export default ThemeToggle;
