/**
 * True when the user asked the OS for reduced motion. Environments without
 * `matchMedia` (e.g. tests) are treated as reduced-motion, so decorative
 * animation and timers are skipped there.
 */
export function prefersReducedMotion(): boolean {
  if (typeof window === "undefined" || typeof window.matchMedia !== "function") return true;
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}
