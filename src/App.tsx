import { useState } from "react";
import TripInputForm from "./components/TripInputForm";
import ResultArea from "./components/ResultArea";
import { useItineraryRequest } from "./hooks/useItineraryRequest";
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
    status,
    itinerary,
    errorMessage,
    requestId,
    tripDescription,
    isBackground,
    partialDays,
    streamIncomplete,
  } = useItineraryRequest();

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

  return (
    <main className={styles.app}>
      <h1>AI Trip Planner</h1>
      <TripInputForm
        value={inputValue}
        onChange={setInputValue}
        onSubmit={handleSubmit}
        disabled={status === "loading" || status === "streaming"}
      />
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
      />
    </main>
  );
}

export default App;
