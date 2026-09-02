import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import type { Itinerary } from "@shared/itinerarySchema";
import ResultArea from "./ResultArea";

const populatedItinerary: Itinerary = {
  days: [{ id: 1, stops: [{ id: "s1", title: "Museum visit" }] }],
};

const emptyItinerary: Itinerary = { days: [] };

describe("ResultArea", () => {
  it("renders EmptyState when status is idle", () => {
    render(<ResultArea status="idle" itinerary={null} errorMessage={null} />);

    expect(screen.getByText(/describe your trip/i)).toBeInTheDocument();
  });

  it("renders LoadingSkeleton when loading with no retained itinerary", () => {
    render(<ResultArea status="loading" itinerary={null} errorMessage={null} />);

    expect(screen.getByRole("status")).toBeInTheDocument();
    expect(screen.getByText(/planning your trip/i)).toBeInTheDocument();
  });

  it("renders ErrorState when errored with no retained itinerary", () => {
    render(<ResultArea status="error" itinerary={null} errorMessage="Couldn't reach the server." />);

    expect(screen.getByRole("alert")).toHaveTextContent("Couldn't reach the server.");
  });

  it("renders EmptyResultState when success with zero days", () => {
    render(<ResultArea status="success" itinerary={emptyItinerary} errorMessage={null} />);

    expect(screen.getByText(/no itinerary could be generated/i)).toBeInTheDocument();
  });

  it("renders the populated placeholder when success with days present", () => {
    render(<ResultArea status="success" itinerary={populatedItinerary} errorMessage={null} />);

    expect(screen.getByText(/1 day itinerary ready/i)).toBeInTheDocument();
  });

  it("keeps showing the populated placeholder during a background loading retry (retained itinerary)", () => {
    render(<ResultArea status="loading" itinerary={populatedItinerary} errorMessage={null} />);

    expect(screen.getByText(/1 day itinerary ready/i)).toBeInTheDocument();
    expect(screen.queryByRole("status")).not.toBeInTheDocument();
  });

  it("keeps showing the populated placeholder during a background error retry (retained itinerary)", () => {
    render(<ResultArea status="error" itinerary={populatedItinerary} errorMessage="failed" />);

    expect(screen.getByText(/1 day itinerary ready/i)).toBeInTheDocument();
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });
});
