import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import RestorePrompt from "./RestorePrompt";

describe("RestorePrompt", () => {
  it("renders a message and a distinguishing icon", () => {
    const { container } = render(<RestorePrompt onRestore={vi.fn()} onDiscard={vi.fn()} />);

    expect(screen.getByText(/previously saved itinerary/i)).toBeInTheDocument();
    expect(container.querySelector("svg")).toBeInTheDocument();
  });

  /** Validates: Requirements 16.3 */
  it("calls onRestore when the restore button is activated", async () => {
    const user = userEvent.setup();
    const onRestore = vi.fn();
    render(<RestorePrompt onRestore={onRestore} onDiscard={vi.fn()} />);

    await user.click(screen.getByRole("button", { name: /restore/i }));

    expect(onRestore).toHaveBeenCalledTimes(1);
  });

  /** Validates: Requirements 16.4 */
  it("calls onDiscard when the discard button is activated", async () => {
    const user = userEvent.setup();
    const onDiscard = vi.fn();
    render(<RestorePrompt onRestore={vi.fn()} onDiscard={onDiscard} />);

    await user.click(screen.getByRole("button", { name: /discard/i }));

    expect(onDiscard).toHaveBeenCalledTimes(1);
  });
});
