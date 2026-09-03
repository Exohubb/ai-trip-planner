import { useCallback, useEffect, useState } from "react";
import TripInputForm from "./components/TripInputForm";
import ResultArea from "./components/ResultArea";
import RestorePrompt from "./components/RestorePrompt";
import ThemeToggle from "./components/ThemeToggle";
import { useItineraryRequest } from "./hooks/useItineraryRequest";
import { useStoredItinerary } from "./hooks/useStoredItinerary";
import { useTheme } from "./hooks/useTheme";
import { useGlobalShortcut } from "./hooks/useGlobalShortcut";
import { isBlankTripDescription, TRIP_DESCRIPTION_REQUIRED_MESSAGE } from "./lib/validateTripDescription";
import styles from "./App.module.css";

function App() {
  // Live-typed textarea value. Deliberately separate from the hook's
  // `tripDescription` (which reflects the last-submitted description):
  // this local state is never cleared on submit, so the text the user
  // typed is retained in the input after any response (Req 1.5).
  const [inputValue, setInputValue] = useState("");
  // Message shown next to the retry control when it's activated with a
  // blank Trip_Description (Req 9.3). Separate from TripInputForm's own
  // validation message since retry can be triggered independently of the form.
  const [retryValidationMessage, setRetryValidationMessage] = useState<string | null>(null);
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
    setRetryValidationMessage(null);
    submitStreaming(description);
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
    setRetryValidationMessage(null);
    submitStreaming(inputValue);
  }, [status, inputValue, submitStreaming]);

  useGlobalShortcut("e", handleExpandAllShortcut);
  useGlobalShortcut("Enter", handleSubmitShortcut);

  return (
    <main className={styles.app}>
      <div className={styles.header}>
        <h1>AI Trip Planner</h1>
        <ThemeToggle theme={theme} onToggle={toggleTheme} />
      </div>
      <TripInputForm
        value={inputValue}
        onChange={setInputValue}
        onSubmit={handleSubmit}
        disabled={status === "loading" || status === "streaming"}
      />
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
          retryDisabled={status === "loading" || status === "streaming"}
          retryValidationMessage={retryValidationMessage}
          partialDays={partialDays}
          streamIncomplete={streamIncomplete}
          onRefine={submitRefinement}
          isRefining={isRefining}
          refinementError={refinementError}
          expandSignal={expandSignal}
        />
      )}
    </main>
  );
}

export default App;
