import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import TripInputForm from "./TripInputForm";

function renderForm(overrides: Partial<React.ComponentProps<typeof TripInputForm>> = {}) {
  const onChange = vi.fn();
  const onSubmit = vi.fn();
  const props = {
    value: "",
    onChange,
    onSubmit,
    ...overrides,
  };
  render(<TripInputForm {...props} />);
  return { onChange, onSubmit };
}

describe("TripInputForm", () => {
  it("renders a labeled textarea and a submit button", () => {
    renderForm();

    expect(screen.getByLabelText(/describe your trip/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /plan my trip/i })).toBeInTheDocument();
  });

  it("enforces the 2000 character max via the textarea's maxLength attribute", () => {
    renderForm();

    const textarea = screen.getByLabelText(/describe your trip/i);
    expect(textarea).toHaveAttribute("maxlength", "2000");
  });

  it("calls onSubmit with the description when a non-empty value is submitted", async () => {
    const user = userEvent.setup();
    const { onSubmit } = renderForm({ value: "A 3 day trip to Paris" });

    await user.click(screen.getByRole("button", { name: /plan my trip/i }));

    expect(onSubmit).toHaveBeenCalledWith("A 3 day trip to Paris");
  });

  it("blocks submission and shows a message when the description is empty", async () => {
    const user = userEvent.setup();
    const { onSubmit } = renderForm({ value: "" });

    await user.click(screen.getByRole("button", { name: /plan my trip/i }));

    expect(onSubmit).not.toHaveBeenCalled();
    expect(screen.getByRole("alert")).toHaveTextContent(/description is required|enter a trip description/i);
  });

  it("blocks submission and shows a message when the description is whitespace-only", async () => {
    const user = userEvent.setup();
    const { onSubmit } = renderForm({ value: "   " });

    await user.click(screen.getByRole("button", { name: /plan my trip/i }));

    expect(onSubmit).not.toHaveBeenCalled();
    expect(screen.getByRole("alert")).toBeInTheDocument();
  });

  it("disables the textarea and submit button when disabled is true", () => {
    renderForm({ disabled: true });

    expect(screen.getByLabelText(/describe your trip/i)).toBeDisabled();
    expect(screen.getByRole("button", { name: /plan my trip/i })).toBeDisabled();
  });
});
