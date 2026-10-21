import { useCallback, useEffect, useRef, useState } from "react";
import { Compass } from "lucide-react";
import TripInputForm from "./components/TripInputForm";
import TripPreferences from "./components/TripPreferences";
import ResultArea from "./components/ResultArea";
import RestorePrompt from "./components/RestorePrompt";
import ThemeToggle from "./components/ThemeToggle";
import AccountBar, { type AccountInfo } from "./components/AccountBar";
import PlannerHero from "./components/PlannerHero";
import DestinationGallery from "./components/DestinationGallery";
import HowItWorks from "./components/HowItWorks";
import { useItineraryRequest } from "./hooks/useItineraryRequest";
import { useStoredItinerary } from "./hooks/useStoredItinerary";
import { useTheme } from "./hooks/useTheme";
import { useGlobalShortcut } from "./hooks/useGlobalShortcut";
import { isBlankTripDescription, TRIP_DESCRIPTION_REQUIRED_MESSAGE } from "./lib/validateTripDescription";
import {
  composeTripDescription,
  DEFAULT_PREFERENCES,
  type TripPreferences as Prefs,
} from "./lib/tripPreferences";
import { prefersReducedMotion } from "./lib/motion";
import { DESTINATIONS, type Destination } from "./data/destinations";
import styles from "./App.module.css";

export interface AppProps {
  /** Signed-in account (or demo mode) from the login wall; omitted when rendered standalone. */
  account?: AccountInfo;
  onSignOut?: () => void;
}

const TRAVELER_LABELS = { solo: "Solo", couple: "Couple", family: "Family", friends: "Friends" } as const;
const BUDGET_LABELS = { budget: "Budget", moderate: "Moderate budget", luxury: "Luxury" } as const;
const PACE_LABELS = { relaxed: "Relaxed pace", balanced: "Balanced pace", packed: "Packed schedule" } as const;

/** Compact, human-readable summary of the selected preferences (or undefined if none). */
function summarizePreferences(prefs: Prefs): string | undefined {
  const parts: string[] = [];
  if (prefs.days !== null) parts.push(`${prefs.days} ${prefs.days === 1 ? "day" : "days"}`);
  if (prefs.travelers !== "any") parts.push(TRAVELER_LABELS[prefs.travelers]);
  if (prefs.budget !== "any") parts.push(BUDGET_LABELS[prefs.budget]);
  if (prefs.pace !== "any") parts.push(PACE_LABELS[prefs.pace]);
  if (prefs.interests.length > 0) parts.push(prefs.interests.join(", "));
  return parts.length > 0 ? parts.join(" · ") : undefined;
}

function App({ account, onSignOut }: AppProps = {}) {
  // Live-typed textarea value. Deliberately separate from the hook's
  // `tripDescription` (which reflects the last-submitted description):
  // this local state is never cleared on submit, so the text the user
  // typed is retained in the input after any response (Req 1.5).
  const [inputValue, setInputValue] = useState("");
  // Structured options (days, party, budget, pace, interests) appended to
  // the description on submit. Defaults add nothing.
  const [preferences, setPreferences] = useState<Prefs>(DEFAULT_PREFERENCES);
  // The featured destination whose curated sample is currently displayed
  // (drives the cover photo and the "Personalize with AI" action).
  const [activeSample, setActiveSample] = useState<Destination | null>(null);
  // Message shown next to the retry control when it's activated with a
  // blank Trip_Description (Req 9.3). Separate from TripInputForm's own
  // validation message since retry can be triggered independently of the form.
  const [retryValidationMessage, setRetryValidationMessage] = useState<string | null>(null);
  const resultsRef = useRef<HTMLElement>(null);
  const {
    submitStreaming,
    submitRefinement,
    restore,
    status,
    itinerary,
    errorMessage,
    requestId,
    tripDescription,
    isBackground,
    partialDays,
    streamIncomplete,
    isRefining,
    refinementError,
  } = useItineraryRequest();

  // Session persistence (Requirement 16). `storedItinerary` reflects
  // whatever valid itinerary was found in localStorage on mount (or `null`
  // if none/corrupted/storage unavailable); it is intentionally read once
  // rather than re-derived from `itinerary` below, so the restore prompt's
  // decision is based on what existed *before* this session started.
  const { storedItinerary, saveItinerary, clearStoredItinerary } = useStoredItinerary();
  // Whether the restore-or-discard prompt should still be shown. Starts
  // true only if a valid stored itinerary was actually found; set to false
  // as soon as the user restores or discards it, so the prompt never
  // reappears afterwards even though `storedItinerary` itself might still
  // be set (restore) or has been cleared (discard).
  const [showRestorePrompt, setShowRestorePrompt] = useState(() => storedItinerary !== null);

  // Dark mode (Requirement 17.3/17.4): persisted theme choice, defaulting
  // to light when nothing is stored.
  const { theme, toggleTheme } = useTheme();

  // Bumped by the "expand all days" shortcut below; forwarded down to every
  // StopItem, which force-expands itself whenever this value changes
  // (Requirement 17.5).
  const [expandSignal, setExpandSignal] = useState(0);

  // Persist the itinerary to storage whenever a valid one is successfully
  // displayed (Req 16.1), overwriting any previously stored response.
  // `saveItinerary` itself silently no-ops on failure (Req 16.6).
  useEffect(() => {
    if (status === "success" && itinerary) {
      saveItinerary(itinerary);
    }
  }, [status, itinerary, saveItinerary]);

  /** Smoothly brings the results area into view after starting a plan. */
  const scrollToResults = useCallback(() => {
    window.requestAnimationFrame(() => {
      const el = resultsRef.current;
      if (el && typeof el.scrollIntoView === "function") {
        el.scrollIntoView({ behavior: prefersReducedMotion() ? "auto" : "smooth", block: "start" });
      }
    });
  }, []);

  /** Starts a streaming request for `description` combined with `prefs`. */
  const startPlan = useCallback(
    (description: string, prefs: Prefs) => {
      setRetryValidationMessage(null);
      setActiveSample(null);
      setShowRestorePrompt(false);
      submitStreaming(composeTripDescription(description, prefs));
      scrollToResults();
    },
    [submitStreaming, scrollToResults],
  );

  function handleRestore() {
    if (!storedItinerary) return;
    setShowRestorePrompt(false);
    restore(storedItinerary);
  }

  function handleDiscardStored() {
    setShowRestorePrompt(false);
    clearStoredItinerary();
  }

  // The main submit/retry/regenerate flows all go through the streaming
  // endpoint (Requirement 14): Day/Stop entries render incrementally as
  // they arrive, and `submitStreaming` applies the exact same request-id/
  // AbortController staleness handling as the original non-streaming
  // `submit` (Requirement 14.4).
  function handleSubmit(description: string) {
    startPlan(description, preferences);
  }

  // Retry/regenerate both resubmit through the same submitStreaming() path
  // used by the initial form submission, so they're subject to identical
  // stale-response handling (Req 9.4, 9.5, 14.4) and empty/whitespace
  // validation (Req 9.3), using the last-entered Trip_Description.
  function handleRetry() {
    if (isBlankTripDescription(tripDescription)) {
      setRetryValidationMessage(TRIP_DESCRIPTION_REQUIRED_MESSAGE);
      return;
    }
    setRetryValidationMessage(null);
    submitStreaming(tripDescription);
  }

  /** Opens a featured destination's curated sample instantly (no API call). */
  function handleExploreDestination(destination: Destination) {
    setShowRestorePrompt(false);
    setActiveSample(destination);
    restore(destination.sample);
    scrollToResults();
  }

  /** Generates a personalized plan for a featured destination with AI. */
  function handleGenerateDestination(destination: Destination) {
    const prefs: Prefs = { ...preferences, days: preferences.days ?? destination.idealDays };
    setInputValue(destination.prompt);
    setPreferences(prefs);
    startPlan(destination.prompt, prefs);
  }

  // Keyboard shortcuts (Requirement 17.5): "e" force-expands every Stop in
  // every Day; "Enter" submits the current Trip_Description, same as
  // clicking TripInputForm's submit button. Both are registered via
  // useGlobalShortcut, which itself never fires either one while keyboard
  // focus is within a text input/textarea, so normal typing (including
  // pressing "e" or "Enter" while composing the description) is unaffected.
  const handleExpandAllShortcut = useCallback(() => {
    setExpandSignal((prev) => prev + 1);
  }, []);

  const handleSubmitShortcut = useCallback(() => {
    if (status === "loading" || status === "streaming") return;
    if (isBlankTripDescription(inputValue)) return;
    startPlan(inputValue, preferences);
  }, [status, inputValue, preferences, startPlan]);

  useGlobalShortcut("e", handleExpandAllShortcut);
  useGlobalShortcut("Enter", handleSubmitShortcut);

  const busy = status === "loading" || status === "streaming";
  const firstName = account?.kind === "user" ? account.name.trim().split(/\s+/)[0] : undefined;

  return (
    <div className={styles.app}>
      <header className={styles.nav} data-no-print>
        <div className={styles.navInner}>
          <a href="#plan" className={styles.brand}>
            <span className={styles.brandMark} aria-hidden="true">
              <Compass size={20} strokeWidth={2.2} />
            </span>
            AI Trip Planner
          </a>
          <nav className={styles.links} aria-label="Page sections">
            <a href="#plan">Plan a trip</a>
            <a href="#explore">Destinations</a>
            <a href="#how">How it works</a>
          </nav>
          <div className={styles.headerActions}>
            {account && onSignOut && <AccountBar account={account} onSignOut={onSignOut} />}
            <ThemeToggle theme={theme} onToggle={toggleTheme} />
          </div>
        </div>
      </header>

      <main>
        <PlannerHero firstName={firstName} isDemo={account?.kind === "demo"}>
          <TripInputForm
            value={inputValue}
            onChange={setInputValue}
            onSubmit={handleSubmit}
            disabled={busy}
            preferences={<TripPreferences value={preferences} onChange={setPreferences} disabled={busy} />}
            preferencesSummary={summarizePreferences(preferences)}
          />
        </PlannerHero>

        <section ref={resultsRef} id="results" className={styles.results} aria-label="Your itinerary">
          {showRestorePrompt ? (
            <RestorePrompt onRestore={handleRestore} onDiscard={handleDiscardStored} />
          ) : (
            <ResultArea
              status={status}
              itinerary={itinerary}
              errorMessage={errorMessage}
              requestId={requestId}
              isBackground={isBackground}
              onRetry={handleRetry}
              retryDisabled={busy}
              retryValidationMessage={retryValidationMessage}
              partialDays={partialDays}
              streamIncomplete={streamIncomplete}
              onRefine={submitRefinement}
              isRefining={isRefining}
              refinementError={refinementError}
              expandSignal={expandSignal}
              coverImage={activeSample?.image}
              isSample={activeSample !== null}
              onExpandAll={handleExpandAllShortcut}
              onCustomize={activeSample ? () => handleGenerateDestination(activeSample) : undefined}
            />
          )}
        </section>

        <DestinationGallery
          destinations={DESTINATIONS}
          onExplore={handleExploreDestination}
          onGenerate={handleGenerateDestination}
          disabled={busy}
        />

        <HowItWorks />
      </main>

      <footer className={styles.footer} data-no-print>
        <div className={styles.footerInner}>
          <span className={styles.footerBrand}>
            <Compass size={16} aria-hidden="true" /> AI Trip Planner
          </span>
        </div>
      </footer>
    </div>
  );
}

export default App;
