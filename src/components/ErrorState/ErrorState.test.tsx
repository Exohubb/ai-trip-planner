import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import ErrorState from "./ErrorState";

describe("ErrorState", () => {
  it("renders an alert role with the given plain-language message", () => {
    render(<ErrorState message="Couldn't reach the server. Check your connection and try again." />);

    expect(screen.getByRole("alert")).toHaveTextContent("Couldn't reach the server.");
  });

  it("renders a distinguishing icon", () => {
    const { container } = render(<ErrorState message="Something went wrong." />);

    expect(container.querySelector("svg")).toBeInTheDocument();
  });

  it("does not render a retry button when onRetry is omitted", () => {
    render(<ErrorState message="Something went wrong." />);

    expect(screen.queryByRole("button", { name: /retry/i })).not.toBeInTheDocument();
  });

  it("calls onRetry when the retry button is activated", async () => {
    const user = userEvent.setup();
    const onRetry = vi.fn();
    render(<ErrorState message="Something went wrong." onRetry={onRetry} />);

    await user.click(screen.getByRole("button", { name: /retry/i }));

    expect(onRetry).toHaveBeenCalledTimes(1);
  });

  it("disables the retry button when retryDisabled is true", () => {
    render(<ErrorState message="Something went wrong." onRetry={vi.fn()} retryDisabled />);

    expect(screen.getByRole("button", { name: /retry/i })).toBeDisabled();
  });
});
