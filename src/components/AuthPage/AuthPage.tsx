import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type FormEvent,
  type KeyboardEvent,
  type PointerEvent,
} from "react";
import {
  ArrowRight,
  Camera,
  CircleAlert,
  Compass,
  Eye,
  EyeOff,
  LoaderCircle,
  Lock,
  Luggage,
  Mail,
  Moon,
  Mountain,
  Plane,
  Route,
  Ship,
  Sparkles,
  Sun,
  TicketsPlane,
  TreePalm,
  User,
  type LucideIcon,
} from "lucide-react";
import TravelScene from "./TravelScene";
import { loginRequest, registerRequest } from "../../lib/authApi";
import type { AuthSession } from "../../hooks/useAuth";
import { useTheme } from "../../hooks/useTheme";
import styles from "./AuthPage.module.css";

type Mode = "login" | "register";

interface FieldErrors {
  name?: string;
  email?: string;
  password?: string;
}

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MIN_PASSWORD_LENGTH = 6;
const DEPARTURE_MS = 1500;
const WORD_INTERVAL_MS = 2600;

const DESTINATIONS = ["Kyoto", "Santorini", "Reykjavík", "Bali", "Marrakech", "Patagonia", "Lisbon"];

const POSTCARDS: Array<{ city: string; meta: string; icon: LucideIcon; color: string }> = [
  { city: "Kyoto, Japan", meta: "5 days · Temples & tea houses", icon: Camera, color: "#f97316" },
  { city: "Santorini, Greece", meta: "4 days · Island hopping", icon: Ship, color: "#0ea5e9" },
  { city: "Bali, Indonesia", meta: "7 days · Beaches & rice terraces", icon: TreePalm, color: "#16a34a" },
  { city: "Banff, Canada", meta: "3 days · Alpine lakes", icon: Mountain, color: "#8b5cf6" },
];

const FEATURES: Array<{ label: string; icon: LucideIcon }> = [
  { label: "Day-by-day plans, streamed live", icon: Route },
  { label: "Packing lists & cost breakdowns", icon: Luggage },
  { label: "Refine with one sentence", icon: Sparkles },
];

const COPY: Record<Mode, { title: string; subtitle: string; submit: string; busy: string }> = {
  login: {
    title: "Welcome back, traveler",
    subtitle: "Sign in to pick up where your last adventure left off.",
    submit: "Sign in",
    busy: "Checking you in…",
  },
  register: {
    title: "Start your journey",
    subtitle: "Create a free account and plan your first trip in seconds.",
    submit: "Create account",
    busy: "Issuing your boarding pass…",
  },
};

const STRENGTH_LABELS = ["Too short", "Weak", "Fair", "Good", "Strong"];
const STRENGTH_COLORS = ["#ef4444", "#f97316", "#eab308", "#22c55e", "#16a34a"];

function passwordStrength(password: string): number {
  if (password.length < MIN_PASSWORD_LENGTH) return 0;
  let score = 1;
  if (password.length >= 10) score++;
  if (/[a-z]/.test(password) && /[A-Z]/.test(password)) score++;
  if (/\d/.test(password) || /[^A-Za-z0-9]/.test(password)) score++;
  return score;
}

/**
 * Environments without `matchMedia` (e.g. tests) are treated like
 * reduced-motion: no decorative animation or timed transitions.
 */
function prefersReducedMotion(): boolean {
  if (typeof window === "undefined" || typeof window.matchMedia !== "function") return true;
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

function firstName(name: string): string {
  return name.trim().split(/\s+/)[0] ?? name;
}

export interface AuthPageProps {
  /** Called once the user has signed in, registered, or chosen the demo. */
  onAuthenticated: (session: AuthSession) => void;
}

/**
 * The login wall: a travel-themed, animated landing page with a
 * boarding-pass style sign-in / register card and a "try the demo" option
 * that skips accounts entirely.
 */
function AuthPage({ onAuthenticated }: AuthPageProps) {
  const { theme, toggleTheme } = useTheme();
  const [reducedMotion] = useState(prefersReducedMotion);

  const [mode, setMode] = useState<Mode>("login");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [shake, setShake] = useState(false);
  const [departure, setDeparture] = useState<string | null>(null);
  const [wordIndex, setWordIndex] = useState(0);

  const pageRef = useRef<HTMLDivElement>(null);
  const loginTabRef = useRef<HTMLButtonElement>(null);
  const registerTabRef = useRef<HTMLButtonElement>(null);
  const frameRef = useRef<number | null>(null);
  const departureTimer = useRef<number | null>(null);
  const mounted = useRef(true);

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
      if (departureTimer.current !== null) window.clearTimeout(departureTimer.current);
      if (frameRef.current !== null) window.cancelAnimationFrame(frameRef.current);
    };
  }, []);

  // Rotating destination in the headline.
  useEffect(() => {
    if (reducedMotion) return;
    const id = window.setInterval(() => setWordIndex((i) => (i + 1) % DESTINATIONS.length), WORD_INTERVAL_MS);
    return () => window.clearInterval(id);
  }, [reducedMotion]);

  // Pointer parallax: write normalized pointer position into CSS variables
  // (no React re-render), throttled to one update per animation frame.
  const handlePointerMove = useCallback(
    (event: PointerEvent<HTMLDivElement>) => {
      if (reducedMotion || event.pointerType === "touch") return;
      const { clientX, clientY } = event;
      if (frameRef.current !== null) return;
      frameRef.current = window.requestAnimationFrame(() => {
        frameRef.current = null;
        const el = pageRef.current;
        if (!el) return;
        const mx = (clientX / window.innerWidth) * 2 - 1;
        const my = (clientY / window.innerHeight) * 2 - 1;
        el.style.setProperty("--mx", mx.toFixed(3));
        el.style.setProperty("--my", my.toFixed(3));
      });
    },
    [reducedMotion],
  );

  function switchMode(next: Mode) {
    if (next === mode || submitting || departure) return;
    setMode(next);
    setFieldErrors({});
    setFormError(null);
  }

  function handleTabKeyDown(event: KeyboardEvent<HTMLButtonElement>) {
    if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") return;
    event.preventDefault();
    const next: Mode = mode === "login" ? "register" : "login";
    switchMode(next);
    (next === "login" ? loginTabRef : registerTabRef).current?.focus();
  }

  function triggerShake() {
    setShake(false);
    // Restart the CSS animation on the next frame.
    window.requestAnimationFrame(() => setShake(true));
  }

  function depart(session: AuthSession, message: string) {
    if (reducedMotion) {
      onAuthenticated(session);
      return;
    }
    setDeparture(message);
    departureTimer.current = window.setTimeout(() => onAuthenticated(session), DEPARTURE_MS);
  }

  function validate(): FieldErrors {
    const errors: FieldErrors = {};
    if (mode === "register" && name.trim().length < 2) {
      errors.name = "Tell us your name (at least 2 characters).";
    }
    if (!EMAIL_PATTERN.test(email.trim())) {
      errors.email = "Enter a valid email address.";
    }
    if (password.length === 0) {
      errors.password = "Enter your password.";
    } else if (mode === "register" && password.length < MIN_PASSWORD_LENGTH) {
      errors.password = `Use at least ${MIN_PASSWORD_LENGTH} characters.`;
    }
    return errors;
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submitting || departure) return;

    const errors = validate();
    setFieldErrors(errors);
    setFormError(null);
    if (Object.keys(errors).length > 0) {
      triggerShake();
      return;
    }

    setSubmitting(true);
    const result =
      mode === "login"
        ? await loginRequest(email.trim(), password)
        : await registerRequest(name.trim(), email.trim(), password);
    if (!mounted.current) return;
    setSubmitting(false);

    if (!result.ok) {
      setFormError(result.message);
      triggerShake();
      return;
    }

    const greeting = mode === "login" ? "Welcome back" : "Welcome aboard";
    depart({ mode: "user", user: result.user, token: result.token }, `${greeting}, ${firstName(result.user.name)}!`);
  }

  function handleDemo() {
    if (submitting || departure) return;
    depart({ mode: "demo" }, "Bon voyage, explorer!");
  }

  const copy = COPY[mode];
  const isRegister = mode === "register";
  const strength = passwordStrength(password);
  const busy = submitting || departure !== null;
  const destination = DESTINATIONS[wordIndex];

  return (
    <div
      ref={pageRef}
      className={styles.page}
      onPointerMove={handlePointerMove}
      data-departing={departure !== null ? "true" : undefined}
    >
      <TravelScene animate={!reducedMotion} />

      <header className={styles.topBar}>
        <div className={styles.brand}>
          <span className={styles.brandMark} aria-hidden="true">
            <Compass size={22} strokeWidth={2.2} />
          </span>
          <span>AI Trip Planner</span>
        </div>
        <button
          type="button"
          className={styles.themeToggle}
          onClick={toggleTheme}
          aria-pressed={theme === "dark"}
          aria-label={theme === "dark" ? "Switch to light theme" : "Switch to dark theme"}
        >
          <span key={theme} className={styles.themeIcon} aria-hidden="true">
            {theme === "dark" ? <Sun size={20} /> : <Moon size={20} />}
          </span>
        </button>
      </header>

      <main className={styles.content}>
        <section className={styles.hero} aria-labelledby="auth-hero-title">
          <span className={styles.eyebrow}>
            <Sparkles size={14} aria-hidden="true" /> AI-powered travel planning
          </span>
          <h1 id="auth-hero-title" className={styles.headline}>
            Plan your next escape to{" "}
            <span className={styles.visuallyHidden}>anywhere</span>
            <span key={destination} className={styles.rotator} aria-hidden="true">
              <span className={styles.rotatingWord}>{destination}</span>
              <svg className={styles.swoosh} viewBox="0 0 200 16" preserveAspectRatio="none">
                <path d="M3 11C50 3 140 2 197 9" />
              </svg>
            </span>
          </h1>
          <p className={styles.subtitle}>
            Describe a trip in plain English and get a structured, editable, day-by-day itinerary in seconds. Costs,
            packing lists and all.
          </p>

          <ul className={styles.features}>
            {FEATURES.map(({ label, icon: Icon }) => (
              <li key={label} className={styles.feature}>
                <Icon size={16} aria-hidden="true" />
                {label}
              </li>
            ))}
          </ul>

          <div className={styles.postcards} aria-hidden="true">
            {POSTCARDS.map(({ city, meta, icon: Icon, color }, i) => (
              <div key={city} className={`${styles.postcardFloat} ${styles[`postcard${i}`]}`}>
                <div className={styles.postcard}>
                  <span className={styles.postcardIcon} style={{ background: color }}>
                    <Icon size={18} />
                  </span>
                  <span className={styles.postcardText}>
                    <strong>{city}</strong>
                    <span>{meta}</span>
                  </span>
                </div>
              </div>
            ))}
          </div>

          <p className={styles.hint} aria-hidden="true">
            <Plane size={14} /> Psst, click the sky to drop a pin.
          </p>
        </section>

        <div className={styles.cardWrap}>
          <section
            className={`${styles.card} ${shake ? styles.shake : ""} ${departure ? styles.departing : ""}`}
            aria-label="Account"
            onAnimationEnd={(e) => {
              // Ignore animation events bubbling up from children.
              if (e.target === e.currentTarget) setShake(false);
            }}
          >
            <div className={styles.passHeader}>
              <span className={styles.airline}>
                <TicketsPlane size={16} aria-hidden="true" /> AI Trip Planner
              </span>
              <span className={styles.passType}>Boarding pass</span>
            </div>

            <div className={styles.route} aria-hidden="true">
              <div>
                <span className={styles.code}>YOU</span>
                <span className={styles.codeSub}>Departure</span>
              </div>
              <div className={styles.routeLine}>
                <span className={styles.routeTrack}>
                  <Plane className={styles.routePlane} size={20} />
                </span>
              </div>
              <div className={styles.codeEnd}>
                <span className={styles.code}>ANY</span>
                <span className={styles.codeSub}>Anywhere</span>
              </div>
            </div>

            <div className={styles.tabs} role="tablist" aria-label="Sign in or create an account" data-mode={mode}>
              <span className={styles.tabIndicator} aria-hidden="true" />
              <button
                ref={loginTabRef}
                type="button"
                role="tab"
                id="auth-tab-login"
                aria-selected={mode === "login"}
                aria-controls="auth-panel"
                tabIndex={mode === "login" ? 0 : -1}
                className={styles.tab}
                onClick={() => switchMode("login")}
                onKeyDown={handleTabKeyDown}
              >
                Sign in
              </button>
              <button
                ref={registerTabRef}
                type="button"
                role="tab"
                id="auth-tab-register"
                aria-selected={mode === "register"}
                aria-controls="auth-panel"
                tabIndex={mode === "register" ? 0 : -1}
                className={styles.tab}
                onClick={() => switchMode("register")}
                onKeyDown={handleTabKeyDown}
              >
                Create account
              </button>
            </div>

            <div
              className={styles.panel}
              role="tabpanel"
              id="auth-panel"
              aria-labelledby={isRegister ? "auth-tab-register" : "auth-tab-login"}
            >
              <div key={mode} className={styles.panelHeading}>
                <h2 className={styles.title}>{copy.title}</h2>
                <p className={styles.panelSubtitle}>{copy.subtitle}</p>
              </div>

              <form onSubmit={handleSubmit} noValidate>
                <div className={styles.collapsible} data-open={isRegister} aria-hidden={!isRegister}>
                  <div className={styles.collapsibleInner}>
                    <div className={styles.field}>
                      <label htmlFor="auth-name" className={styles.label}>
                        Full name
                      </label>
                      <div className={styles.inputWrap}>
                        <User className={styles.fieldIcon} size={18} aria-hidden="true" />
                        <input
                          id="auth-name"
                          className={styles.input}
                          type="text"
                          autoComplete="name"
                          placeholder="Amelia Earhart"
                          value={name}
                          onChange={(e) => setName(e.target.value)}
                          disabled={!isRegister || busy}
                          aria-invalid={fieldErrors.name ? true : undefined}
                          aria-describedby={fieldErrors.name ? "auth-name-error" : undefined}
                          maxLength={60}
                        />
                      </div>
                      {fieldErrors.name && (
                        <p id="auth-name-error" className={styles.fieldError}>
                          {fieldErrors.name}
                        </p>
                      )}
                    </div>
                  </div>
                </div>

                <div className={styles.field}>
                  <label htmlFor="auth-email" className={styles.label}>
                    Email
                  </label>
                  <div className={styles.inputWrap}>
                    <Mail className={styles.fieldIcon} size={18} aria-hidden="true" />
                    <input
                      id="auth-email"
                      className={styles.input}
                      type="email"
                      inputMode="email"
                      autoComplete="email"
                      placeholder="you@wanderlust.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      disabled={busy}
                      aria-invalid={fieldErrors.email ? true : undefined}
                      aria-describedby={fieldErrors.email ? "auth-email-error" : undefined}
                      maxLength={254}
                    />
                  </div>
                  {fieldErrors.email && (
                    <p id="auth-email-error" className={styles.fieldError}>
                      {fieldErrors.email}
                    </p>
                  )}
                </div>

                <div className={styles.field}>
                  <label htmlFor="auth-password" className={styles.label}>
                    Password
                  </label>
                  <div className={styles.inputWrap}>
                    <Lock className={styles.fieldIcon} size={18} aria-hidden="true" />
                    <input
                      id="auth-password"
                      className={`${styles.input} ${styles.inputWithAction}`}
                      type={showPassword ? "text" : "password"}
                      autoComplete={isRegister ? "new-password" : "current-password"}
                      placeholder={isRegister ? "At least 6 characters" : "Your password"}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      disabled={busy}
                      aria-invalid={fieldErrors.password ? true : undefined}
                      aria-describedby={
                        [fieldErrors.password ? "auth-password-error" : "", isRegister ? "auth-password-strength" : ""]
                          .filter(Boolean)
                          .join(" ") || undefined
                      }
                      maxLength={128}
                    />
                    <button
                      type="button"
                      className={styles.peek}
                      onClick={() => setShowPassword((v) => !v)}
                      aria-label={showPassword ? "Hide password" : "Show password"}
                      aria-pressed={showPassword}
                    >
                      {showPassword ? <EyeOff size={18} aria-hidden="true" /> : <Eye size={18} aria-hidden="true" />}
                    </button>
                  </div>
                  {fieldErrors.password && (
                    <p id="auth-password-error" className={styles.fieldError}>
                      {fieldErrors.password}
                    </p>
                  )}
                  {isRegister && (
                    <div className={styles.strength} id="auth-password-strength">
                      <span className={styles.strengthBars} aria-hidden="true">
                        {[1, 2, 3, 4].map((bar) => (
                          <span
                            key={bar}
                            className={styles.strengthBar}
                            style={bar <= strength ? { background: STRENGTH_COLORS[strength] } : undefined}
                          />
                        ))}
                      </span>
                      <span className={styles.strengthLabel}>
                        <span className={styles.visuallyHidden}>Password strength: </span>
                        {password.length === 0 ? "Strength" : STRENGTH_LABELS[strength]}
                      </span>
                    </div>
                  )}
                </div>

                {formError && (
                  <p className={styles.formError} role="alert">
                    <CircleAlert size={18} aria-hidden="true" />
                    <span>{formError}</span>
                  </p>
                )}

                <button type="submit" className={styles.submit} disabled={busy}>
                  {submitting ? (
                    <>
                      <LoaderCircle className={styles.spin} size={20} aria-hidden="true" />
                      {copy.busy}
                    </>
                  ) : (
                    <>
                      {copy.submit}
                      <ArrowRight className={styles.arrow} size={20} aria-hidden="true" />
                    </>
                  )}
                </button>
              </form>

              <div className={styles.divider}>
                <span>or</span>
              </div>

              <button type="button" className={styles.demo} onClick={handleDemo} disabled={busy}>
                <Compass className={styles.demoIcon} size={22} aria-hidden="true" />
                <span className={styles.demoText}>
                  <span>Try the demo</span>
                  <span className={styles.demoHint}>No account needed · every feature unlocked</span>
                </span>
              </button>

              <p className={styles.switchLine}>
                {isRegister ? "Already have an account?" : "New to AI Trip Planner?"}{" "}
                <button
                  type="button"
                  className={styles.switchButton}
                  onClick={() => switchMode(isRegister ? "login" : "register")}
                  disabled={busy}
                >
                  {isRegister ? "Sign in" : "Create one"}
                </button>
              </p>
            </div>

            <div className={styles.stub} aria-hidden="true">
              <div className={styles.stubMeta}>
                <span>
                  <small>Gate</small>A1
                </span>
                <span>
                  <small>Seat</small>01A
                </span>
                <span className={styles.stubClass}>
                  <small>Class</small>Explorer
                </span>
              </div>
              <span className={styles.barcode} />
            </div>
          </section>
        </div>
      </main>

      {departure && (
        <div className={styles.takeoff} role="status" aria-live="polite">
          <span className={styles.takeoffPlane} aria-hidden="true">
            <Plane size={120} strokeWidth={1.4} />
          </span>
          <p className={styles.takeoffText}>
            <TicketsPlane size={22} aria-hidden="true" /> {departure}
          </p>
        </div>
      )}
    </div>
  );
}

export default AuthPage;
