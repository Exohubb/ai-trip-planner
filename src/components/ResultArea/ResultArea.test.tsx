import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import type { Itinerary } from "@shared/itinerarySchema";
import ResultArea from "./ResultArea";

const populatedItinerary: Itinerary = {
  days: [{ id: 1, stops: [{ id: "s1", title: "Museum visit" }] }],
};

const emptyItinerary: Itinerary = { days: [] };

const defaultRetryProps = {
  isBackground: false,
  onRetry: vi.fn(),
  retryDisabled: false,
  retryValidationMessage: null,
};

describe("ResultArea", () => {
  it("renders EmptyState when status is idle", () => {
    render(
      <ResultArea status="idle" itinerary={null} errorMessage={null} requestId={0} {...defaultRetryProps} />,
    );

    expect(screen.getByText(/describe your trip/i)).toBeInTheDocument();
  });

  it("renders LoadingSkeleton when loading with no retained itinerary", () => {
    render(
      <ResultArea
        status="loading"
        itinerary={null}
        errorMessage={null}
        requestId={0}
        {...defaultRetryProps}
      />,
    );

    expect(screen.getByRole("status")).toBeInTheDocument();
    expect(screen.getByText(/planning your trip/i)).toBeInTheDocument();
  });

  it("renders ErrorState when errored with no retained itinerary", () => {
    render(
      <ResultArea
        status="error"
        itinerary={null}
        errorMessage="Couldn't reach the server."
        requestId={0}
        {...defaultRetryProps}
      />,
    );

    expect(screen.getByRole("alert")).toHaveTextContent("Couldn't reach the server.");
  });

  it("renders EmptyResultState when success with zero days", () => {
    render(
      <ResultArea
        status="success"
        itinerary={emptyItinerary}
        errorMessage={null}
        requestId={1}
        {...defaultRetryProps}
      />,
    );

    expect(screen.getByText(/no itinerary could be generated/i)).toBeInTheDocument();
  });

  it("renders the ItineraryView when success with days present", () => {
    render(
      <ResultArea
        status="success"
        itinerary={populatedItinerary}
        errorMessage={null}
        requestId={1}
        {...defaultRetryProps}
      />,
    );

    expect(screen.getByRole("heading", { name: "Day 1" })).toBeInTheDocument();
    expect(screen.getByText("Museum visit")).toBeInTheDocument();
  });

  it("keeps showing the populated ItineraryView during a background loading retry (retained itinerary)", () => {
    render(
      <ResultArea
        status="loading"
        itinerary={populatedItinerary}
        errorMessage={null}
        requestId={1}
        {...defaultRetryProps}
        isBackground
      />,
    );

    expect(screen.getByText("Museum visit")).toBeInTheDocument();
    expect(screen.queryByRole("status")).not.toBeInTheDocument();
  });

  it("shows a RetryBanner instead of the full ErrorState during a background error retry (retained itinerary)", () => {
    const onRetry = vi.fn();
    render(
      <ResultArea
        status="error"
        itinerary={populatedItinerary}
        errorMessage="failed"
        requestId={1}
        {...defaultRetryProps}
        isBackground
        onRetry={onRetry}
      />,
    );

    expect(screen.getByText("Museum visit")).toBeInTheDocument();
    expect(screen.getByRole("alert")).toHaveTextContent("failed");
    expect(screen.getByRole("button", { name: /retry/i })).toBeInTheDocument();
  });

  it("does not render a RetryBanner when the ItineraryView is populated and there is no background error", () => {
    render(
      <ResultArea
        status="success"
        itinerary={populatedItinerary}
        errorMessage={null}
        requestId={1}
        {...defaultRetryProps}
      />,
    );

    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });

  /** Validates: Requirements 14.1, 14.2 */
  it("renders a LoadingSkeleton while streaming with no partial days yet", () => {
    render(
      <ResultArea
        status="streaming"
        itinerary={null}
        errorMessage={null}
        requestId={0}
        {...defaultRetryProps}
        partialDays={[]}
      />,
    );

    expect(screen.getByRole("status")).toBeInTheDocument();
  });

  /** Validates: Requirements 14.1, 14.2 */
  it("renders partial Day entries alongside the streaming indicator once days have arrived", () => {
    render(
      <ResultArea
        status="streaming"
        itinerary={null}
        errorMessage={null}
        requestId={0}
        {...defaultRetryProps}
        partialDays={[{ id: 1, stops: [{ id: "s1", title: "Museum visit" }] }]}
      />,
    );

    expect(screen.getByText(/generating your itinerary/i)).toBeInTheDocument();
    expect(screen.getByText("Museum visit")).toBeInTheDocument();
  });

  /** Validates: Requirement 14.3 */
  it("retains partial Day entries and shows a RetryBanner when a stream fails with no retained itinerary", () => {
    render(
      <ResultArea
        status="error"
        itinerary={null}
        errorMessage="The itinerary is incomplete."
        requestId={0}
        {...defaultRetryProps}
        partialDays={[{ id: 1, stops: [{ id: "s1", title: "Museum visit" }] }]}
        streamIncomplete
      />,
    );

    expect(screen.getByRole("alert")).toHaveTextContent("The itinerary is incomplete.");
    expect(screen.getByText("Museum visit")).toBeInTheDocument();
  });

  /** Validates: Requirement 14.3 */
  it("falls back to the full ErrorState when a stream fails before any day completed", () => {
    render(
      <ResultArea
        status="error"
        itinerary={null}
        errorMessage="The itinerary is incomplete."
        requestId={0}
        {...defaultRetryProps}
        partialDays={[]}
        streamIncomplete
      />,
    );

    expect(screen.getByRole("alert")).toHaveTextContent("The itinerary is incomplete.");
    expect(screen.queryByText("Museum visit")).not.toBeInTheDocument();
  });

  /** Validates: Requirement 14.2 */
  it("shows the streaming indicator alongside a retained itinerary during a background stream", () => {
    render(
      <ResultArea
        status="streaming"
        itinerary={populatedItinerary}
        errorMessage={null}
        requestId={1}
        {...defaultRetryProps}
        isBackground
      />,
    );

    expect(screen.getByText(/generating your itinerary/i)).toBeInTheDocument();
    expect(screen.getByText("Museum visit")).toBeInTheDocument();
  });
});
