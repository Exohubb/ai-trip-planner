import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import RetryBanner from "./RetryBanner";

describe("RetryBanner", () => {
  it("renders an alert role with the given plain-language message", () => {
    render(<RetryBanner message="That took too long. Please try again." onRetry={vi.fn()} />);

    expect(screen.getByRole("alert")).toHaveTextContent("That took too long.");
  });

  it("renders a distinguishing icon", () => {
    const { container } = render(<RetryBanner message="Something went wrong." onRetry={vi.fn()} />);

    expect(container.querySelector("svg")).toBeInTheDocument();
  });

  it("calls onRetry when the retry button is activated", async () => {
    const user = userEvent.setup();
    const onRetry = vi.fn();
    render(<RetryBanner message="Something went wrong." onRetry={onRetry} />);

    await user.click(screen.getByRole("button", { name: /retry/i }));

    expect(onRetry).toHaveBeenCalledTimes(1);
  });

  it("disables the retry button when retryDisabled is true", () => {
    render(<RetryBanner message="Something went wrong." onRetry={vi.fn()} retryDisabled />);

    expect(screen.getByRole("button", { name: /retry/i })).toBeDisabled();
  });

  it("renders a validation message when the retry control is activated with a blank description", () => {
    render(
      <RetryBanner
        message="Something went wrong."
        onRetry={vi.fn()}
        retryValidationMessage="Please enter a trip description before submitting."
      />,
    );

    expect(screen.getByText("Please enter a trip description before submitting.")).toBeInTheDocument();
  });
});
