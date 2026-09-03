import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { Stop } from "@shared/itinerarySchema";
import StopItem from "./StopItem";

const fullStop: Stop = {
  id: "s1",
  title: "Visit the museum",
  time: "10:00 AM",
  description: "A tour of the modern art wing.",
  location: "Downtown Museum",
  notes: "Bring student ID for discount.",
};

describe("StopItem", () => {
  /** Validates: Requirements 6.3 */
  it("renders collapsed by default, showing only title and time", () => {
    render(<StopItem stop={fullStop} />);

    expect(screen.getByText("Visit the museum")).toBeInTheDocument();
    expect(screen.getByText("10:00 AM")).toBeInTheDocument();
    expect(screen.getByRole("button", { expanded: false })).toBeInTheDocument();
    expect(screen.queryByText(/modern art wing/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/downtown museum/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/student id/i)).not.toBeInTheDocument();
  });

  /** Validates: Requirements 6.2 */
  it("expands to show description, location, and notes when the toggle is activated", async () => {
    const user = userEvent.setup();
    render(<StopItem stop={fullStop} />);

    await user.click(screen.getByRole("button", { expanded: false }));

    expect(screen.getByRole("button", { expanded: true })).toBeInTheDocument();
    expect(screen.getByText(/modern art wing/i)).toBeInTheDocument();
    expect(screen.getByText(/downtown museum/i)).toBeInTheDocument();
    expect(screen.getByText(/student id/i)).toBeInTheDocument();
  });

  /** Validates: Requirements 6.2 */
  it("collapses again when the toggle is activated a second time", async () => {
    const user = userEvent.setup();
    render(<StopItem stop={fullStop} />);

    const toggle = screen.getByRole("button", { expanded: false });
    await user.click(toggle);
    expect(screen.getByRole("button", { expanded: true })).toBeInTheDocument();

    await user.click(screen.getByRole("button", { expanded: true }));
    expect(screen.getByRole("button", { expanded: false })).toBeInTheDocument();
    expect(screen.queryByText(/modern art wing/i)).not.toBeInTheDocument();
  });

  it("renders without a time element when the stop has no time", () => {
    render(<StopItem stop={{ id: "s2", title: "Free wander" }} />);

    expect(screen.getByText("Free wander")).toBeInTheDocument();
  });

  /** Validates: Requirements 6.4 */
  it("calls onRemove with no confirmation step when the remove control is activated", async () => {
    const user = userEvent.setup();
    const onRemove = vi.fn();
    render(<StopItem stop={fullStop} onRemove={onRemove} />);

    await user.click(screen.getByRole("button", { name: /remove/i }));

    expect(onRemove).toHaveBeenCalledTimes(1);
  });

  /** Validates: Requirements 6.5 */
  it("calls onMoveUp and onMoveDown when the move controls are activated", async () => {
    const user = userEvent.setup();
    const onMoveUp = vi.fn();
    const onMoveDown = vi.fn();
    render(<StopItem stop={fullStop} onMoveUp={onMoveUp} onMoveDown={onMoveDown} />);

    await user.click(screen.getByRole("button", { name: /move.*up/i }));
    await user.click(screen.getByRole("button", { name: /move.*down/i }));

    expect(onMoveUp).toHaveBeenCalledTimes(1);
    expect(onMoveDown).toHaveBeenCalledTimes(1);
  });

  /** Validates: Requirements 6.6 */
  it("disables move-up when isFirst is true and move-down when isLast is true", () => {
    render(<StopItem stop={fullStop} isFirst isLast={false} />);
    expect(screen.getByRole("button", { name: /move.*up/i })).toBeDisabled();
    expect(screen.getByRole("button", { name: /move.*down/i })).toBeEnabled();
  });

  it("disables move-down when isLast is true and move-up when isFirst is true", () => {
    render(<StopItem stop={fullStop} isFirst={false} isLast />);
    expect(screen.getByRole("button", { name: /move.*down/i })).toBeDisabled();
    expect(screen.getByRole("button", { name: /move.*up/i })).toBeEnabled();
  });
});
