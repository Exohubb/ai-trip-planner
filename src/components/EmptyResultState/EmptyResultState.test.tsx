import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import EmptyResultState from "./EmptyResultState";

describe("EmptyResultState", () => {
  it("renders a default plain-language message distinct from the error message", () => {
    render(<EmptyResultState />);

    expect(screen.getByText(/no itinerary could be generated/i)).toBeInTheDocument();
  });

  it("renders a distinguishing icon", () => {
    const { container } = render(<EmptyResultState />);

    expect(container.querySelector("svg")).toBeInTheDocument();
  });

  it("calls onRetry when the retry button is activated", async () => {
    const user = userEvent.setup();
    const onRetry = vi.fn();
    render(<EmptyResultState onRetry={onRetry} />);

    await user.click(screen.getByRole("button", { name: /retry/i }));

    expect(onRetry).toHaveBeenCalledTimes(1);
  });
});
