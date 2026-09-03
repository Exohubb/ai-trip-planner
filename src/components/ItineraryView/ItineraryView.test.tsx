import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
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

  /** Validates: Requirements 6.4 */
  it("removes a stop from local state, immutably, with no confirmation step", async () => {
    const user = userEvent.setup();
    const days: Day[] = [
      {
        id: 1,
        stops: [
          { id: "s1", title: "Breakfast" },
          { id: "s2", title: "Museum" },
        ],
      },
    ];

    render(<ItineraryView days={days} />);
    await user.click(screen.getByRole("button", { name: /remove breakfast/i }));

    expect(screen.queryByText("Breakfast")).not.toBeInTheDocument();
    expect(screen.getByText("Museum")).toBeInTheDocument();
    // The original prop array is untouched (immutability).
    expect(days[0].stops).toHaveLength(2);
  });

  /** Validates: Requirements 6.8 */
  it("shows the no-stops indicator after removing a Day's last remaining stop", async () => {
    const user = userEvent.setup();
    const days: Day[] = [{ id: 1, stops: [{ id: "s1", title: "Breakfast" }] }];

    render(<ItineraryView days={days} />);
    await user.click(screen.getByRole("button", { name: /remove breakfast/i }));

    expect(screen.getByText(/no stops planned/i)).toBeInTheDocument();
  });

  /** Validates: Requirements 6.5 */
  it("reorders stops within a Day when a move control is activated", async () => {
    const user = userEvent.setup();
    const days: Day[] = [
      {
        id: 1,
        stops: [
          { id: "s1", title: "Breakfast" },
          { id: "s2", title: "Museum" },
        ],
      },
    ];

    render(<ItineraryView days={days} />);
    await user.click(screen.getByRole("button", { name: /move breakfast down/i }));

    const items = screen.getAllByRole("listitem");
    expect(items[0]).toHaveTextContent("Museum");
    expect(items[1]).toHaveTextContent("Breakfast");
  });

  /** Validates: Requirements 6.6 */
  it("leaves order unchanged when moving the first stop up or the last stop down", async () => {
    const user = userEvent.setup();
    const days: Day[] = [
      {
        id: 1,
        stops: [
          { id: "s1", title: "Breakfast" },
          { id: "s2", title: "Museum" },
        ],
      },
    ];

    render(<ItineraryView days={days} />);

    // move-up on first stop is disabled, so this click is a no-op.
    await user.click(screen.getByRole("button", { name: /move breakfast up/i }));
    // move-down on last stop is disabled, so this click is also a no-op.
    await user.click(screen.getByRole("button", { name: /move museum down/i }));

    const items = screen.getAllByRole("listitem");
    expect(items[0]).toHaveTextContent("Breakfast");
    expect(items[1]).toHaveTextContent("Museum");
  });
});
