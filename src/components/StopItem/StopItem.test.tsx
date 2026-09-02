import { describe, expect, it } from "vitest";
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

    const toggle = screen.getByRole("button");
    await user.click(toggle);
    expect(screen.getByRole("button", { expanded: true })).toBeInTheDocument();

    await user.click(toggle);
    expect(screen.getByRole("button", { expanded: false })).toBeInTheDocument();
    expect(screen.queryByText(/modern art wing/i)).not.toBeInTheDocument();
  });

  it("renders without a time element when the stop has no time", () => {
    render(<StopItem stop={{ id: "s2", title: "Free wander" }} />);

    expect(screen.getByText("Free wander")).toBeInTheDocument();
  });
});
