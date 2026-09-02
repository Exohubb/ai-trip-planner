import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import EmptyState from "./EmptyState";

describe("EmptyState", () => {
  it("renders a default plain-language invitation message", () => {
    render(<EmptyState />);

    expect(screen.getByText(/describe your trip above/i)).toBeInTheDocument();
  });

  it("renders a custom message when provided", () => {
    render(<EmptyState message="Start by telling us about your trip." />);

    expect(screen.getByText("Start by telling us about your trip.")).toBeInTheDocument();
  });

  it("renders a distinguishing icon", () => {
    const { container } = render(<EmptyState />);

    expect(container.querySelector("svg")).toBeInTheDocument();
  });
});
