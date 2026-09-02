import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import LoadingSkeleton from "./LoadingSkeleton";

describe("LoadingSkeleton", () => {
  it("renders a status role with a default plain-language message", () => {
    render(<LoadingSkeleton />);

    const status = screen.getByRole("status");
    expect(status).toHaveTextContent(/planning your trip/i);
  });

  it("renders a custom message when provided", () => {
    render(<LoadingSkeleton message="Working on it…" />);

    expect(screen.getByRole("status")).toHaveTextContent("Working on it…");
  });

  it("renders a distinguishing icon", () => {
    const { container } = render(<LoadingSkeleton />);

    expect(container.querySelector("svg")).toBeInTheDocument();
  });
});
