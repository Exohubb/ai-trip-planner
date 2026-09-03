import { useState } from "react";
import TripInputForm from "./components/TripInputForm";
import ResultArea from "./components/ResultArea";
import { useItineraryRequest } from "./hooks/useItineraryRequest";
import { isBlankTripDescription, TRIP_DESCRIPTION_REQUIRED_MESSAGE } from "./lib/validateTripDescription";

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
  const { submit, status, itinerary, errorMessage, requestId, tripDescription, isBackground } =
    useItineraryRequest();

  function handleSubmit(description: string) {
    setRetryValidationMessage(null);
    submit(description);
  }

  // Retry/regenerate both resubmit through the same submit() path used by
  // the initial form submission, so they're subject to identical
  // stale-response handling (Req 9.4, 9.5) and empty/whitespace validation
  // (Req 9.3), using the last-entered Trip_Description.
  function handleRetry() {
    if (isBlankTripDescription(tripDescription)) {
      setRetryValidationMessage(TRIP_DESCRIPTION_REQUIRED_MESSAGE);
      return;
    }
    setRetryValidationMessage(null);
    submit(tripDescription);
  }

  return (
    <main>
      <h1>AI Trip Planner</h1>
      <TripInputForm
        value={inputValue}
        onChange={setInputValue}
        onSubmit={handleSubmit}
        disabled={status === "loading"}
      />
      <ResultArea
        status={status}
        itinerary={itinerary}
        errorMessage={errorMessage}
        requestId={requestId}
        isBackground={isBackground}
        onRetry={handleRetry}
        retryDisabled={status === "loading"}
        retryValidationMessage={retryValidationMessage}
      />
    </main>
  );
}

export default App;
