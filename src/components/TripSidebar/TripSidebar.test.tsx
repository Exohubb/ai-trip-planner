import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import TripSidebar from "./TripSidebar";

describe("TripSidebar", () => {
  const itinerary = {
    days: [],
    budget: { currency: "EUR", items: [{ label: "Hotel", amount: 300 }, { label: "Food", amount: 100 }], total: 400 },
    packingList: ["Passport", "Sunscreen"],
    tips: ["Carry cash."],
  };

  it("renders the budget breakdown, packing list and tips", () => {
    render(<TripSidebar itinerary={itinerary} />);

    expect(screen.getByText("EUR 400")).toBeInTheDocument();
    expect(screen.getByText("Hotel")).toBeInTheDocument();
    expect(screen.getByText("75%")).toBeInTheDocument();
    expect(screen.getByText("Carry cash.")).toBeInTheDocument();
  });

  it("tracks packed items as they are ticked off", async () => {
    const user = userEvent.setup();
    render(<TripSidebar itinerary={itinerary} />);

    expect(screen.getByText("0 of 2 packed")).toBeInTheDocument();
    await user.click(screen.getByRole("checkbox", { name: "Passport" }));
    expect(screen.getByText("1 of 2 packed")).toBeInTheDocument();
  });

  it("renders nothing extra when the itinerary has no trip-level details", () => {
    const { container } = render(<TripSidebar itinerary={{ days: [] }} />);
    expect(container.querySelectorAll("section")).toHaveLength(0);
  });
});
