import { useEffect, useState } from "react";
import { prefersReducedMotion } from "../../lib/motion";
import styles from "./LoadingSkeleton.module.css";

const HINTS = [
  "Scouting hidden gems…",
  "Mapping the best routes…",
  "Balancing your days…",
  "Checking opening hours…",
  "Finding where the locals eat…",
];
const HINT_INTERVAL_MS = 2200;

export interface LoadingSkeletonProps {
  /** Announced status text. */
  message?: string;
}

/**
 * Full-area loading state (Requirement 7.2): a plane flying a dashed route
 * around a globe, the announced status message, rotating (decorative)
 * hints and placeholder day cards.
 */
function LoadingSkeleton({ message = "Planning your trip…" }: LoadingSkeletonProps) {
  const [hintIndex, setHintIndex] = useState(0);

  useEffect(() => {
    if (prefersReducedMotion()) return;
    const id = window.setInterval(() => setHintIndex((i) => (i + 1) % HINTS.length), HINT_INTERVAL_MS);
    return () => window.clearInterval(id);
  }, []);

  return (
    <div className={styles.wrapper}>
      <div className={styles.hero}>
        <span className={styles.icon} aria-hidden="true">
          <svg viewBox="0 0 120 120" width="120" height="120" xmlns="http://www.w3.org/2000/svg">
            <defs>
              <linearGradient id="ls-globe" x1="0" y1="0" x2="1" y2="1">
                <stop offset="0%" stopColor="#6366f1" />
                <stop offset="100%" stopColor="#c026d3" />
              </linearGradient>
            </defs>
            <circle cx="60" cy="60" r="30" fill="url(#ls-globe)" />
            <ellipse cx="60" cy="60" rx="12" ry="30" fill="none" stroke="#ffffff" strokeOpacity="0.45" strokeWidth="1.5" />
            <line x1="30" y1="60" x2="90" y2="60" stroke="#ffffff" strokeOpacity="0.45" strokeWidth="1.5" />
            <path d="M34 46h52M34 74h52" stroke="#ffffff" strokeOpacity="0.3" strokeWidth="1.5" />
            <circle cx="60" cy="60" r="48" fill="none" stroke="currentColor" strokeOpacity="0.35" strokeWidth="2" strokeDasharray="3 7" />
            <g className={styles.orbit}>
              <path
                d="M60 4l4 6h8l-4 3 4 6-12-4-12 4 4-6-4-3h8z"
                transform="rotate(90 60 12)"
                fill="currentColor"
                className={styles.plane}
              />
            </g>
          </svg>
        </span>
        <div className={styles.status} role="status" aria-live="polite">
          <p className={styles.text}>{message}</p>
        </div>
        <p key={hintIndex} className={styles.hint} aria-hidden="true">
          {HINTS[hintIndex]}
        </p>
      </div>

      <div className={styles.skeletons} aria-hidden="true">
        {[0, 1].map((card) => (
          <div key={card} className={styles.skeletonCard}>
            <div className={styles.skeletonHeader}>
              <span className={styles.skeletonBadge} />
              <span className={styles.skeletonLines}>
                <span className={styles.line} style={{ width: "30%" }} />
                <span className={styles.line} style={{ width: "55%" }} />
              </span>
            </div>
            {[0, 1, 2].map((row) => (
              <div key={row} className={styles.skeletonRow}>
                <span className={styles.skeletonDot} />
                <span className={styles.skeletonStop}>
                  <span className={styles.line} style={{ width: "18%" }} />
                  <span className={styles.line} style={{ width: `${60 - row * 10}%` }} />
                </span>
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

export default LoadingSkeleton;
