import { useCallback, useEffect, useState } from "react";

/** localStorage key the theme preference is saved under (Requirement 17.3). */
const STORAGE_KEY = "ai-trip-planner:theme";

export type Theme = "light" | "dark";

/**
 * Reads the stored theme preference. Anything other than the literal
 * string `"dark"` — missing key, corrupted value, or `localStorage` being
 * unavailable (e.g. disabled/private-mode browsers can throw just
 * accessing the property) — defaults to `"light"` (Requirement 17.4),
 * without ever throwing back to the caller.
 */
function readStoredTheme(): Theme {
  try {
    return window.localStorage.getItem(STORAGE_KEY) === "dark" ? "dark" : "light";
  } catch {
    return "light";
  }
}

export interface UseThemeResult {
  /** Current theme; also reflected onto `<html data-theme>` as a side effect. */
  theme: Theme;
  /** Flips between "light" and "dark", persisting the new choice (Requirement 17.3). */
  toggleTheme: () => void;
}

/**
 * Dark mode theme state (Requirement 17). Defaults to `"light"` when no
 * preference is stored (Req 17.4), reflects the current theme onto
 * `document.documentElement`'s `data-theme` attribute so `tokens.css`'s
 * `[data-theme="dark"]` custom-property block takes effect, and persists
 * every toggle to `localStorage` (Req 17.3). Mirrors `useStoredItinerary`'s
 * tolerance of unavailable/failing storage: a write failure never throws
 * and the app keeps working for the rest of the session either way.
 */
export function useTheme(): UseThemeResult {
  const [theme, setTheme] = useState<Theme>(() => readStoredTheme());

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
  }, [theme]);

  const toggleTheme = useCallback(() => {
    setTheme((prev) => {
      const next: Theme = prev === "light" ? "dark" : "light";
      try {
        window.localStorage.setItem(STORAGE_KEY, next);
      } catch {
        // Storage unavailable or write failed — the toggle still applies
        // for the rest of this session, it just won't persist.
      }
      return next;
    });
  }, []);

  return { theme, toggleTheme };
}
