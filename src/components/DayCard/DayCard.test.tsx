import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
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

  /** Validates: Requirements 6.6 */
  it("computes isFirst/isLast from array index, disabling move-up on the first stop and move-down on the last stop", () => {
    const day: Day = {
      id: 1,
      stops: [
        { id: "s1", title: "Breakfast" },
        { id: "s2", title: "Hiking" },
        { id: "s3", title: "Dinner" },
      ],
    };

    render(<DayCard day={day} dayNumber={1} onMoveStop={vi.fn()} />);

    const moveUpButtons = screen.getAllByRole("button", { name: /move.*up/i });
    const moveDownButtons = screen.getAllByRole("button", { name: /move.*down/i });

    expect(moveUpButtons[0]).toBeDisabled();
    expect(moveUpButtons[1]).toBeEnabled();
    expect(moveUpButtons[2]).toBeEnabled();

    expect(moveDownButtons[0]).toBeEnabled();
    expect(moveDownButtons[1]).toBeEnabled();
    expect(moveDownButtons[2]).toBeDisabled();
  });

  /** Validates: Requirements 6.4 */
  it("calls onRemoveStop with the day id and stop id when a stop's remove control is activated", async () => {
    const user = userEvent.setup();
    const onRemoveStop = vi.fn();
    const day: Day = { id: 1, stops: [{ id: "s1", title: "Breakfast" }] };

    render(<DayCard day={day} dayNumber={1} onRemoveStop={onRemoveStop} />);
    await user.click(screen.getByRole("button", { name: /remove/i }));

    expect(onRemoveStop).toHaveBeenCalledWith(1, "s1");
  });

  /** Validates: Requirements 6.5 */
  it("calls onMoveStop with the day id, stop id, and direction when a stop's move control is activated", async () => {
    const user = userEvent.setup();
    const onMoveStop = vi.fn();
    const day: Day = {
      id: 1,
      stops: [
        { id: "s1", title: "Breakfast" },
        { id: "s2", title: "Hiking" },
      ],
    };

    render(<DayCard day={day} dayNumber={1} onMoveStop={onMoveStop} />);
    await user.click(screen.getAllByRole("button", { name: /move.*down/i })[0]);

    expect(onMoveStop).toHaveBeenCalledWith(1, "s1", "down");
  });
});
