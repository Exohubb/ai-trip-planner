import { useState } from "react";
import TripInputForm from "./components/TripInputForm";
import ResultArea from "./components/ResultArea";
import { useItineraryRequest } from "./hooks/useItineraryRequest";

function App() {
  // Live-typed textarea value. Deliberately separate from the hook's
  // `tripDescription` (which reflects the last-submitted description):
  // this local state is never cleared on submit, so the text the user
  // typed is retained in the input after any response (Req 1.5).
  const [inputValue, setInputValue] = useState("");
  const { submit, status, itinerary, errorMessage } = useItineraryRequest();

  function handleSubmit(description: string) {
    submit(description);
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
      <ResultArea status={status} itinerary={itinerary} errorMessage={errorMessage} />
    </main>
  );
}

export default App;
