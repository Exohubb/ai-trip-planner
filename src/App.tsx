import { useState } from "react";
import TripInputForm from "./components/TripInputForm";

function App() {
  const [tripDescription, setTripDescription] = useState("");

  // Temporary local submit handler: task 6 only builds the standalone form.
  // Wiring this to the backend/request hook happens in a later task.
  function handleSubmit(description: string) {
    console.log("Trip description submitted:", description);
  }

  return (
    <main>
      <h1>AI Trip Planner</h1>
      <TripInputForm value={tripDescription} onChange={setTripDescription} onSubmit={handleSubmit} />
    </main>
  );
}

export default App;
