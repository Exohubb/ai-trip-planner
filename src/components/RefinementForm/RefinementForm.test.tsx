import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import RefinementForm from "./RefinementForm";

function renderForm(overrides: Partial<React.ComponentProps<typeof RefinementForm>> = {}) {
  const onSubmit = vi.fn();
  const props = {
    onSubmit,
    ...overrides,
  };
  render(<RefinementForm {...props} />);
  return { onSubmit };
}

describe("RefinementForm", () => {
  /** Validates: Requirements 15.1 */
  it("renders a labeled textarea and a submit button", () => {
    renderForm();

    expect(screen.getByLabelText(/ask for a change/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /update itinerary/i })).toBeInTheDocument();
  });

  /** Validates: Requirements 15.1 */
  it("enforces the 1000 character max via the textarea's maxLength attribute", () => {
    renderForm();

    const textarea = screen.getByLabelText(/ask for a change/i);
    expect(textarea).toHaveAttribute("maxlength", "1000");
  });

  /** Validates: Requirements 15.2 */
  it("calls onSubmit with the instruction when a non-empty value is submitted", async () => {
    const user = userEvent.setup();
    const { onSubmit } = renderForm();

    await user.type(screen.getByLabelText(/ask for a change/i), "Add a museum on day 2");
    await user.click(screen.getByRole("button", { name: /update itinerary/i }));

    expect(onSubmit).toHaveBeenCalledWith("Add a museum on day 2");
  });

  /** Validates: Requirements 15.4 */
  it("blocks submission and shows a message when the instruction is empty", async () => {
    const user = userEvent.setup();
    const { onSubmit } = renderForm();

    await user.click(screen.getByRole("button", { name: /update itinerary/i }));

    expect(onSubmit).not.toHaveBeenCalled();
    expect(screen.getByRole("alert")).toHaveTextContent(/instruction is required|enter an instruction/i);
  });

  /** Validates: Requirements 15.4 */
  it("blocks submission and shows a message when the instruction is whitespace-only", async () => {
    const user = userEvent.setup();
    const { onSubmit } = renderForm();

    await user.type(screen.getByLabelText(/ask for a change/i), "   ");
    await user.click(screen.getByRole("button", { name: /update itinerary/i }));

    expect(onSubmit).not.toHaveBeenCalled();
    expect(screen.getByRole("alert")).toBeInTheDocument();
  });

  /** Validates: Requirements 15.3 */
  it("disables the textarea and submit button when disabled is true", () => {
    renderForm({ disabled: true });

    expect(screen.getByLabelText(/ask for a change/i)).toBeDisabled();
    expect(screen.getByRole("button", { name: /update itinerary/i })).toBeDisabled();
  });

  /** Validates: Requirements 15.5 */
  it("shows a non-blocking error message passed in via the error prop", () => {
    renderForm({ error: "The updated itinerary could not be validated. Please try again." });

    expect(screen.getByText(/could not be validated/i)).toBeInTheDocument();
  });
});
