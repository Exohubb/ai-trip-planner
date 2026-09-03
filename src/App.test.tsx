import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import App from "./App";
import { streamItinerary, type StreamItineraryCallbacks, type StreamOutcome } from "./lib/streamItinerary";
import type { Itinerary } from "@shared/itinerarySchema";

vi.mock("./lib/streamItinerary", () => ({
  streamItinerary: vi.fn(),
}));

const mockedStreamItinerary = vi.mocked(streamItinerary);

function makeItinerary(label: string): Itinerary {
  return { days: [{ id: 1, stops: [{ id: "s1", title: label }] }] };
}

/** A resolver pair for a streamItinerary call, also exposing the callbacks it was invoked with. */
function deferredStream() {
  let resolve!: (value: StreamOutcome) => void;
  let callbacks!: StreamItineraryCallbacks;
  const promise = new Promise<StreamOutcome>((res) => {
    resolve = res;
  });
  mockedStreamItinerary.mockImplementationOnce((_description, _signal, cbs) => {
    callbacks = cbs;
    return promise;
  });
  return {
    resolve,
    getCallbacks: () => callbacks,
  };
}

describe("App retry and regenerate flows", () => {
  beforeEach(() => {
    mockedStreamItinerary.mockReset();
    // Session persistence (Requirement 16) auto-saves successful itineraries
    // to localStorage; clear it so a prior test's saved itinerary can't
    // trigger an unexpected restore prompt in a later test within this file.
    window.localStorage.clear();
  });

  afterEach(() => {
    window.localStorage.clear();
  });

  /** Validates: Requirements 9.1, 9.2, 9.4, 9.5 */
  it("shows a retry control on the full-page error state, disables it while retrying, and resubmits via submitStreaming()", async () => {
    const user = userEvent.setup();
    const first = deferredStream();

    render(<App />);

    await user.type(screen.getByLabelText(/describe your trip/i), "A weekend in Rome");
    await user.click(screen.getByRole("button", { name: /plan my trip/i }));

    await act(async () => {
      first.resolve({ ok: false, reason: "network" });
      await Promise.resolve();
    });

    const errorAlert = await screen.findByRole("alert");
    expect(errorAlert).toHaveTextContent(/couldn't reach the server/i);

    const retryButton = screen.getByRole("button", { name: /retry/i });
    expect(retryButton).not.toBeDisabled();

    const second = deferredStream();

    await user.click(retryButton);

    // Retry-triggered request is in flight: retry control (rendered as part
    // of the full-page ErrorState/LoadingSkeleton switch) is disabled.
    expect(mockedStreamItinerary).toHaveBeenCalledTimes(2);
    expect(mockedStreamItinerary).toHaveBeenLastCalledWith(
      "A weekend in Rome",
      expect.anything(),
      expect.anything(),
    );

    await act(async () => {
      second.resolve({ ok: true, itinerary: makeItinerary("Colosseum tour") });
      await Promise.resolve();
    });

    await waitFor(() => expect(screen.getByText("Colosseum tour")).toBeInTheDocument());
  });

  /** Validates: Requirements 9.3 */
  it("blocks the retry control and shows a message when the last-entered description is blank", async () => {
    const user = userEvent.setup();
    deferredStream();

    render(<App />);

    await user.type(screen.getByLabelText(/describe your trip/i), "   ");
    // TripInputForm's own client-side validation blocks this submission
    // locally, so no request is ever sent and no retry control exists yet.
    await user.click(screen.getByRole("button", { name: /plan my trip/i }));

    expect(mockedStreamItinerary).not.toHaveBeenCalled();
  });

  /** Validates: Requirements 5.6, 7.6, 9.7 */
  it("retains the previous itinerary and shows a RetryBanner (not a full ErrorState) when a regenerate request fails", async () => {
    const user = userEvent.setup();
    const first = deferredStream();

    render(<App />);

    const textarea = screen.getByLabelText(/describe your trip/i);
    await user.type(textarea, "A weekend in Rome");
    await user.click(screen.getByRole("button", { name: /plan my trip/i }));

    await act(async () => {
      first.resolve({ ok: true, itinerary: makeItinerary("Colosseum tour") });
      await Promise.resolve();
    });

    await waitFor(() => expect(screen.getByText("Colosseum tour")).toBeInTheDocument());

    // Regenerate: edit the description and resubmit while a valid itinerary is displayed (Req 9.6).
    const second = deferredStream();

    await user.clear(textarea);
    await user.type(textarea, "A week in Tokyo");
    await user.click(screen.getByRole("button", { name: /plan my trip/i }));

    await act(async () => {
      second.resolve({ ok: false, reason: "timeout" });
      await Promise.resolve();
    });

    // Previous itinerary stays visible alongside a non-blocking retry banner.
    await waitFor(() => expect(screen.getByRole("alert")).toHaveTextContent(/took too long/i));
    expect(screen.getByText("Colosseum tour")).toBeInTheDocument();
  });

  /** Validates: Requirements 9.6 */
  it("replaces the displayed itinerary with the new one when a regenerate request succeeds", async () => {
    const user = userEvent.setup();
    const first = deferredStream();

    render(<App />);

    const textarea = screen.getByLabelText(/describe your trip/i);
    await user.type(textarea, "A weekend in Rome");
    await user.click(screen.getByRole("button", { name: /plan my trip/i }));

    await act(async () => {
      first.resolve({ ok: true, itinerary: makeItinerary("Colosseum tour") });
      await Promise.resolve();
    });

    await waitFor(() => expect(screen.getByText("Colosseum tour")).toBeInTheDocument());

    const second = deferredStream();

    await user.clear(textarea);
    await user.type(textarea, "A week in Tokyo");
    await user.click(screen.getByRole("button", { name: /plan my trip/i }));

    await act(async () => {
      second.resolve({ ok: true, itinerary: makeItinerary("Shibuya crossing") });
      await Promise.resolve();
    });

    await waitFor(() => expect(screen.getByText("Shibuya crossing")).toBeInTheDocument());
    expect(screen.queryByText("Colosseum tour")).not.toBeInTheDocument();
  });

  /** Validates: Requirements 4.4, 7.5 */
  it("renders the empty-result state, not the error state, when a successful response has zero days", async () => {
    const user = userEvent.setup();
    const first = deferredStream();

    render(<App />);

    await user.type(screen.getByLabelText(/describe your trip/i), "A day trip somewhere quiet");
    await user.click(screen.getByRole("button", { name: /plan my trip/i }));

    await act(async () => {
      first.resolve({ ok: true, itinerary: { days: [] } });
      await Promise.resolve();
    });

    expect(await screen.findByText(/no itinerary could be generated/i)).toBeInTheDocument();
    // Distinct from the error state: no alert role, no failure-style copy.
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });

  /** Validates: Requirements 14.1, 14.2 */
  it("renders Day entries incrementally with an in-progress indicator while streaming", async () => {
    const user = userEvent.setup();
    const stream = deferredStream();

    render(<App />);

    await user.type(screen.getByLabelText(/describe your trip/i), "A 2 day trip to Paris");
    await user.click(screen.getByRole("button", { name: /plan my trip/i }));

    act(() => {
      stream.getCallbacks().onDays([{ id: 1, stops: [{ id: "s1", title: "Eiffel Tower" }] }]);
    });

    expect(await screen.findByText("Eiffel Tower")).toBeInTheDocument();
    expect(screen.getByText(/generating your itinerary/i)).toBeInTheDocument();

    await act(async () => {
      stream.resolve({
        ok: true,
        itinerary: { days: [{ id: 1, stops: [{ id: "s1", title: "Eiffel Tower" }] }] },
      });
      await Promise.resolve();
    });

    await waitFor(() => expect(screen.queryByText(/generating your itinerary/i)).not.toBeInTheDocument());
  });

  /** Validates: Requirement 14.3 */
  it("retains rendered Day entries and shows an incomplete-itinerary error if the stream fails mid-way", async () => {
    const user = userEvent.setup();
    const stream = deferredStream();

    render(<App />);

    await user.type(screen.getByLabelText(/describe your trip/i), "A 2 day trip to Paris");
    await user.click(screen.getByRole("button", { name: /plan my trip/i }));

    act(() => {
      stream.getCallbacks().onDays([{ id: 1, stops: [{ id: "s1", title: "Eiffel Tower" }] }]);
    });

    await act(async () => {
      stream.resolve({ ok: false, reason: "upstream_error" });
      await Promise.resolve();
    });

    expect(await screen.findByText("Eiffel Tower")).toBeInTheDocument();
    expect(screen.getByRole("alert")).toHaveTextContent(/incomplete/i);
  });
});

const STORAGE_KEY = "ai-trip-planner:itinerary";

describe("App session persistence (restore/discard)", () => {
  beforeEach(() => {
    mockedStreamItinerary.mockReset();
  });

  afterEach(() => {
    window.localStorage.clear();
  });

  /** Validates: Requirements 16.2, 16.3 */
  it("shows a restore prompt on load when a valid stored itinerary exists, and restores it like a fresh result", async () => {
    const user = userEvent.setup();
    window.localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ days: [{ id: 1, stops: [{ id: "s1", title: "Colosseum tour" }] }] }),
    );

    render(<App />);

    expect(screen.getByText(/previously saved itinerary/i)).toBeInTheDocument();
    // Initial empty state and the populated view are not shown yet.
    expect(screen.queryByText(/describe your trip above/i)).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /restore/i }));

    expect(await screen.findByText("Colosseum tour")).toBeInTheDocument();
    expect(mockedStreamItinerary).not.toHaveBeenCalled();
  });

  /** Validates: Requirements 16.4 */
  it("deletes the stored itinerary and shows the initial empty state when the user declines to restore", async () => {
    const user = userEvent.setup();
    window.localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ days: [{ id: 1, stops: [{ id: "s1", title: "Colosseum tour" }] }] }),
    );

    render(<App />);

    await user.click(screen.getByRole("button", { name: /discard/i }));

    expect(await screen.findByText(/describe your trip above/i)).toBeInTheDocument();
    expect(window.localStorage.getItem(STORAGE_KEY)).toBeNull();
  });

  /** Validates: Requirements 16.5 */
  it("discards corrupted stored data and shows the initial empty state without a restore prompt", async () => {
    window.localStorage.setItem(STORAGE_KEY, "{not valid json");

    render(<App />);

    expect(screen.queryByText(/previously saved itinerary/i)).not.toBeInTheDocument();
    expect(await screen.findByText(/describe your trip above/i)).toBeInTheDocument();
  });

  /** Validates: Requirements 16.1 */
  it("saves the itinerary to storage on a successful fetch", async () => {
    const user = userEvent.setup();
    const first = deferredStream();

    render(<App />);

    await user.type(screen.getByLabelText(/describe your trip/i), "A weekend in Rome");
    await user.click(screen.getByRole("button", { name: /plan my trip/i }));

    await act(async () => {
      first.resolve({ ok: true, itinerary: makeItinerary("Colosseum tour") });
      await Promise.resolve();
    });

    await waitFor(() => expect(screen.getByText("Colosseum tour")).toBeInTheDocument());
    expect(JSON.parse(window.localStorage.getItem(STORAGE_KEY)!)).toEqual(makeItinerary("Colosseum tour"));
  });
});
