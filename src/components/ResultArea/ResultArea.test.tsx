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
});
