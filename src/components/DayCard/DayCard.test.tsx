import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import type { Day } from "@shared/itinerarySchema";
import DayCard from "./DayCard";

describe("DayCard", () => {
  /** Validates: Requirements 6.1 */
  it("renders a distinct section with a heading and its ordered stops", () => {
    const day: Day = {
      id: 1,
      stops: [
        { id: "s1", title: "Breakfast" },
        { id: "s2", title: "Hiking" },
      ],
    };

    render(<DayCard day={day} dayNumber={1} />);

    expect(screen.getByRole("heading", { name: "Day 1" })).toBeInTheDocument();
    const items = screen.getAllByRole("listitem");
    expect(items).toHaveLength(2);
    expect(items[0]).toHaveTextContent("Breakfast");
    expect(items[1]).toHaveTextContent("Hiking");
  });

  /** Validates: Requirements 6.8 */
  it("shows a no-stops indicator without removing the Day when it has zero stops", () => {
    const day: Day = { id: 2, stops: [] };

    render(<DayCard day={day} dayNumber={2} />);

    expect(screen.getByRole("heading", { name: "Day 2" })).toBeInTheDocument();
    expect(screen.getByText(/no stops planned/i)).toBeInTheDocument();
    expect(screen.queryByRole("list")).not.toBeInTheDocument();
  });
});
