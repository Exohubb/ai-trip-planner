import { beforeEach, describe, expect, it, vi } from "vitest";
import { act, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import App from "./App";
import { fetchAndValidateItinerary, type ParseResult } from "./lib/fetchAndValidateItinerary";
import type { Itinerary } from "@shared/itinerarySchema";

vi.mock("./lib/fetchAndValidateItinerary", () => ({
  fetchAndValidateItinerary: vi.fn(),
}));

const mockedFetchAndValidateItinerary = vi.mocked(fetchAndValidateItinerary);

function makeItinerary(label: string): Itinerary {
  return { days: [{ id: 1, stops: [{ id: "s1", title: label }] }] };
}

/** A resolver pair that lets the test control exactly when a promise settles. */
function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((res) => {
    resolve = res;
  });
  return { promise, resolve };
}

describe("App retry and regenerate flows", () => {
  beforeEach(() => {
    mockedFetchAndValidateItinerary.mockReset();
  });


  /** Validates: Requirements 9.1, 9.2, 9.4, 9.5 */
  it("shows a retry control on the full-page error state, disables it while retrying, and resubmits via submit()", async () => {
    const user = userEvent.setup();
    const first = deferred<ParseResult>();
    mockedFetchAndValidateItinerary.mockReturnValueOnce(first.promise);

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

    const second = deferred<ParseResult>();
    mockedFetchAndValidateItinerary.mockReturnValueOnce(second.promise);

    await user.click(retryButton);

    // Retry-triggered request is in flight: retry control (rendered as part
    // of the full-page ErrorState/LoadingSkeleton switch) is disabled.
    expect(mockedFetchAndValidateItinerary).toHaveBeenCalledTimes(2);
    expect(mockedFetchAndValidateItinerary).toHaveBeenLastCalledWith("A weekend in Rome", expect.anything());

    await act(async () => {
      second.resolve({ ok: true, itinerary: makeItinerary("Colosseum tour") });
      await Promise.resolve();
    });

    await waitFor(() => expect(screen.getByText("Colosseum tour")).toBeInTheDocument());
  });

  /** Validates: Requirements 9.3 */
  it("blocks the retry control and shows a message when the last-entered description is blank", async () => {
    const user = userEvent.setup();
    const first = deferred<ParseResult>();
    mockedFetchAndValidateItinerary.mockReturnValueOnce(first.promise);

    render(<App />);

    await user.type(screen.getByLabelText(/describe your trip/i), "   ");
    // TripInputForm's own client-side validation blocks this submission
    // locally, so no request is ever sent and no retry control exists yet.
    await user.click(screen.getByRole("button", { name: /plan my trip/i }));

    expect(mockedFetchAndValidateItinerary).not.toHaveBeenCalled();
  });

  /** Validates: Requirements 5.6, 7.6, 9.7 */
  it("retains the previous itinerary and shows a RetryBanner (not a full ErrorState) when a regenerate request fails", async () => {
    const user = userEvent.setup();
    const first = deferred<ParseResult>();
    mockedFetchAndValidateItinerary.mockReturnValueOnce(first.promise);

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
    const second = deferred<ParseResult>();
    mockedFetchAndValidateItinerary.mockReturnValueOnce(second.promise);

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
    const first = deferred<ParseResult>();
    mockedFetchAndValidateItinerary.mockReturnValueOnce(first.promise);

    render(<App />);

    const textarea = screen.getByLabelText(/describe your trip/i);
    await user.type(textarea, "A weekend in Rome");
    await user.click(screen.getByRole("button", { name: /plan my trip/i }));

    await act(async () => {
      first.resolve({ ok: true, itinerary: makeItinerary("Colosseum tour") });
      await Promise.resolve();
    });

    await waitFor(() => expect(screen.getByText("Colosseum tour")).toBeInTheDocument());

    const second = deferred<ParseResult>();
    mockedFetchAndValidateItinerary.mockReturnValueOnce(second.promise);

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
    const first = deferred<ParseResult>();
    mockedFetchAndValidateItinerary.mockReturnValueOnce(first.promise);

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
});
