import { useCallback, useEffect, useRef, useState, type MouseEvent } from "react";
import { MapPin } from "lucide-react";
import styles from "./TravelScene.module.css";

/** Cities used for the "click the sky to drop a pin" easter egg. */
const PIN_LABELS = [
  "Lisbon",
  "Kyoto",
  "Cusco",
  "Cape Town",
  "Hanoi",
  "Queenstown",
  "Marrakech",
  "Reykjavík",
  "Havana",
  "Istanbul",
  "Banff",
  "Santorini",
  "Bali",
  "Patagonia",
];
const MAX_PINS = 6;
const PIN_LIFETIME_MS = 2800;

/** Deterministic pseudo-random so the star field is identical on every render. */
function seeded(i: number): number {
  const x = Math.sin(i * 9301 + 49297) * 233280;
  return x - Math.floor(x);
}

const STARS = Array.from({ length: 70 }, (_, i) => ({
  left: seeded(i) * 100,
  top: seeded(i + 100) * 62,
  size: 1 + seeded(i + 200) * 2.2,
  delay: seeded(i + 300) * 5,
  duration: 2.4 + seeded(i + 400) * 3,
}));

const CLOUDS = [
  { top: 9, width: 260, duration: 95, delay: -18, opacity: 0.9 },
  { top: 21, width: 150, duration: 135, delay: -85, opacity: 0.65 },
  { top: 4, width: 120, duration: 170, delay: -40, opacity: 0.55 },
  { top: 33, width: 210, duration: 115, delay: -62, opacity: 0.7 },
  { top: 15, width: 330, duration: 150, delay: -118, opacity: 0.45 },
];

// Flight routes, in the 1440x900 scene coordinate space.
const ROUTE_A = "M -80 660 C 300 430, 600 540, 900 340 S 1340 110, 1560 150";
const ROUTE_B = "M 1540 520 C 1220 430, 920 470, 660 310 S 210 150, -120 210";

// Top-down airliner silhouette pointing along +x, centered on the origin.
const PLANE_PATH =
  "M24 0C24-2.6 20-3.6 15-3.6L-15-3.6-20-2.2V2.2L-15 3.6H15C20 3.6 24 2.6 24 0Z" +
  "M7-3.2-5-23H-10L-4-3.2Z M7 3.2-5 23H-10L-4 3.2Z" +
  "M-12-3-18-11H-22L-19-3Z M-12 3-18 11H-22L-19 3Z";

const CLOUD_PATH =
  "M40 70C18 70 10 52 26 44 22 26 46 18 60 30 66 10 100 6 112 26 124 16 150 20 150 40 172 38 186 54 174 66 170 70 165 70 160 70Z";

interface DroppedPin {
  id: number;
  x: number;
  y: number;
  label: string;
}

export interface TravelSceneProps {
  /** When false, SMIL plane motion is not rendered (reduced-motion users). */
  animate: boolean;
}

/**
 * Decorative, animated travel backdrop for the login wall: a dusk sky (or
 * starry night in dark mode) with drifting clouds, a hot-air balloon, birds,
 * airliners flying dashed routes, and layered mountains. Layers shift with
 * the pointer via the `--mx`/`--my` custom properties set by the parent.
 * Clicking empty sky drops a temporary destination pin.
 */
function TravelScene({ animate }: TravelSceneProps) {
  const [pins, setPins] = useState<DroppedPin[]>([]);
  const nextId = useRef(0);
  const timers = useRef<number[]>([]);

  useEffect(() => {
    const pending = timers.current;
    return () => pending.forEach((t) => window.clearTimeout(t));
  }, []);

  const handleClick = useCallback((event: MouseEvent<HTMLDivElement>) => {
    const rect = event.currentTarget.getBoundingClientRect();
    if (rect.width === 0 || rect.height === 0) return;
    const id = nextId.current++;
    const pin: DroppedPin = {
      id,
      x: ((event.clientX - rect.left) / rect.width) * 100,
      y: ((event.clientY - rect.top) / rect.height) * 100,
      label: PIN_LABELS[id % PIN_LABELS.length],
    };
    setPins((prev) => [...prev.slice(-(MAX_PINS - 1)), pin]);
    const timer = window.setTimeout(() => {
      setPins((prev) => prev.filter((p) => p.id !== id));
    }, PIN_LIFETIME_MS);
    timers.current.push(timer);
  }, []);

  return (
    <div className={styles.scene} onClick={handleClick} aria-hidden="true" data-testid="travel-scene">
      <div className={styles.sky} />

      {/* Far layer: stars, sun / moon */}
      <div className={`${styles.layer} ${styles.far}`}>
        <div className={styles.stars}>
          {STARS.map((s, i) => (
            <span
              key={i}
              className={styles.star}
              style={{
                left: `${s.left}%`,
                top: `${s.top}%`,
                width: s.size,
                height: s.size,
                animationDelay: `${s.delay}s`,
                animationDuration: `${s.duration}s`,
              }}
            />
          ))}
        </div>
        <svg className={styles.svgFill} viewBox="0 0 1440 900" preserveAspectRatio="xMidYMid slice">
          <defs>
            <radialGradient id="ts-sun-glow">
              <stop offset="0%" stopColor="#ffe8b0" stopOpacity="0.95" />
              <stop offset="35%" stopColor="#ffb98a" stopOpacity="0.45" />
              <stop offset="100%" stopColor="#ff9a8a" stopOpacity="0" />
            </radialGradient>
            <radialGradient id="ts-moon-glow">
              <stop offset="0%" stopColor="#c7d2fe" stopOpacity="0.55" />
              <stop offset="100%" stopColor="#818cf8" stopOpacity="0" />
            </radialGradient>
            <mask id="ts-moon-mask">
              <rect x="0" y="0" width="1440" height="900" fill="#fff" />
              <circle cx="884" cy="182" r="44" fill="#000" />
            </mask>
          </defs>
          <g className={styles.sun}>
            <circle className={styles.sunGlow} cx="860" cy="210" r="240" fill="url(#ts-sun-glow)" />
            <circle cx="860" cy="210" r="62" fill="#fff3d1" />
          </g>
          <g className={styles.moon}>
            <circle className={styles.sunGlow} cx="860" cy="210" r="200" fill="url(#ts-moon-glow)" />
            <circle cx="860" cy="210" r="52" fill="#eef2ff" mask="url(#ts-moon-mask)" />
          </g>
        </svg>
      </div>

      {/* Mid layer: clouds */}
      <div className={`${styles.layer} ${styles.mid}`}>
        {CLOUDS.map((c, i) => (
          <svg
            key={i}
            className={styles.cloud}
            viewBox="0 0 200 80"
            style={{
              top: `${c.top}%`,
              width: c.width,
              opacity: c.opacity,
              animationDuration: `${c.duration}s`,
              animationDelay: `${c.delay}s`,
            }}
          >
            <path d={CLOUD_PATH} fill="currentColor" />
          </svg>
        ))}
      </div>

      {/* Mid layer: balloon, birds, flight routes and planes */}
      <div className={`${styles.layer} ${styles.mid}`}>
        <svg className={styles.svgFill} viewBox="0 0 1440 900" preserveAspectRatio="xMidYMid slice">
          <defs>
            <linearGradient id="ts-contrail" x1="0" x2="1" y1="0" y2="0">
              <stop offset="0%" stopColor="#ffffff" stopOpacity="0" />
              <stop offset="100%" stopColor="#ffffff" stopOpacity="0.8" />
            </linearGradient>
            <linearGradient id="ts-balloon" x1="0" x2="1" y1="0" y2="0">
              <stop offset="0%" stopColor="#f97316" />
              <stop offset="20%" stopColor="#f97316" />
              <stop offset="20%" stopColor="#fde047" />
              <stop offset="40%" stopColor="#fde047" />
              <stop offset="40%" stopColor="#ec4899" />
              <stop offset="60%" stopColor="#ec4899" />
              <stop offset="60%" stopColor="#fde047" />
              <stop offset="80%" stopColor="#fde047" />
              <stop offset="80%" stopColor="#f97316" />
              <stop offset="100%" stopColor="#f97316" />
            </linearGradient>
          </defs>

          <path d={ROUTE_A} className={styles.route} />
          <path d={ROUTE_B} className={`${styles.route} ${styles.routeFaint}`} />

          <g transform="translate(590 130)">
            <g className={styles.balloon}>
              <path d="M0-44C28-44 37-15 24 7L9 26H-9L-24 7C-37-15-28-44 0-44Z" fill="url(#ts-balloon)" />
              <path d="M0-44C10-44 13-15 8 7L3 26H-3L-8 7C-13-15-10-44 0-44Z" fill="#ffffff" fillOpacity="0.18" />
              <path d="M-8 26-6 33M8 26 6 33" stroke="#7c2d12" strokeWidth="1.4" />
              <rect x="-7" y="33" width="14" height="10" rx="2" fill="#92400e" />
            </g>
          </g>

          <g transform="translate(1000 120)">
            <g className={styles.birds}>
              <path className={styles.bird} d="M0 0q6-7 12 0q6-7 12 0" />
              <path className={`${styles.bird} ${styles.birdLate}`} d="M30 14q5-6 10 0q5-6 10 0" />
              <path className={styles.bird} d="M-26 18q4-5 8 0q4-5 8 0" />
            </g>
          </g>

          <g className={styles.plane} transform={animate ? undefined : "translate(900 340) rotate(-30)"}>
            <rect x="-150" y="-1.6" width="128" height="3.2" rx="1.6" fill="url(#ts-contrail)" />
            <path d={PLANE_PATH} />
            {animate && <animateMotion dur="18s" repeatCount="indefinite" rotate="auto" path={ROUTE_A} />}
          </g>

          <g
            className={`${styles.plane} ${styles.planeFar}`}
            transform={animate ? undefined : "translate(660 310) rotate(200)"}
          >
            <g transform="scale(0.55)">
              <rect x="-150" y="-1.6" width="128" height="3.2" rx="1.6" fill="url(#ts-contrail)" />
              <path d={PLANE_PATH} />
            </g>
            {animate && <animateMotion dur="26s" begin="-9s" repeatCount="indefinite" rotate="auto" path={ROUTE_B} />}
          </g>
        </svg>
      </div>

      {/* Mountains, back to front */}
      <svg className={`${styles.mountains} ${styles.mtnBack}`} viewBox="0 0 1440 320" preserveAspectRatio="none">
        <path
          d="M0 220 120 150 230 200 360 110 480 190 600 130 720 200 860 90 980 180 1100 120 1220 190 1340 140 1440 180V320H0Z"
          fill="var(--mtn-back)"
        />
        <path d="M360 110 331 130 344 126 354 133 366 125 378 131 390 130Z" fill="var(--snow)" />
        <path d="M860 90 822 120 838 116 850 124 862 114 876 122 888 115 900 120Z" fill="var(--snow)" />
      </svg>
      <svg className={`${styles.mountains} ${styles.mtnMid}`} viewBox="0 0 1440 320" preserveAspectRatio="none">
        <path
          d="M0 260C120 200 200 230 300 190S480 240 600 200 820 150 940 210 1160 240 1260 200 1400 220 1440 210V320H0Z"
          fill="var(--mtn-mid)"
        />
      </svg>
      <svg className={`${styles.mountains} ${styles.mtnFront}`} viewBox="0 0 1440 320" preserveAspectRatio="none">
        <path d="M0 290C160 250 300 300 460 270S760 240 900 280 1200 300 1440 260V320H0Z" fill="var(--mtn-front)" />
      </svg>

      {pins.map((pin) => (
        <span key={pin.id} className={styles.pin} style={{ left: `${pin.x}%`, top: `${pin.y}%` }}>
          <span className={styles.pinLabel}>{pin.label}?</span>
          <MapPin className={styles.pinIcon} size={34} strokeWidth={2.2} />
          <span className={styles.pinRipple} />
        </span>
      ))}
    </div>
  );
}

export default TravelScene;
