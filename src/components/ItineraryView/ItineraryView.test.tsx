import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import type { Day } from "@shared/itinerarySchema";
import ItineraryView from "./ItineraryView";

describe("ItineraryView", () => {
  /** Validates: Requirements 6.1, 6.7 */
  it("renders each Day as a distinct section in order", () => {
    const days: Day[] = [
      { id: 1, stops: [{ id: "s1", title: "Breakfast" }] },
      { id: 2, stops: [{ id: "s2", title: "Museum" }] },
    ];

    render(<ItineraryView days={days} />);

    const headings = screen.getAllByRole("heading");
    expect(headings.map((h) => h.textContent)).toEqual(["Day 1", "Day 2"]);
    expect(screen.getByText("Breakfast")).toBeInTheDocument();
    expect(screen.getByText("Museum")).toBeInTheDocument();
  });

  /** Validates: Requirements 6.8 */
  it("shows a no-stops indicator for any Day with zero stops without dropping the Day", () => {
    const days: Day[] = [
      { id: 1, stops: [{ id: "s1", title: "Breakfast" }] },
      { id: 2, stops: [] },
    ];

    render(<ItineraryView days={days} />);

    expect(screen.getByRole("heading", { name: "Day 1" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Day 2" })).toBeInTheDocument();
    expect(screen.getByText(/no stops planned/i)).toBeInTheDocument();
  });
});
