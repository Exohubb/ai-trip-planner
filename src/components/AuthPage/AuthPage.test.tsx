import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import AuthPage from "./AuthPage";
import { loginRequest, registerRequest } from "../../lib/authApi";

vi.mock("../../lib/authApi", () => ({
  loginRequest: vi.fn(),
  registerRequest: vi.fn(),
}));

const mockedLogin = vi.mocked(loginRequest);
const mockedRegister = vi.mocked(registerRequest);
const user = { id: "u1", name: "Amelia Earhart", email: "amelia@example.com" };

describe("AuthPage", () => {
  beforeEach(() => {
    mockedLogin.mockReset();
    mockedRegister.mockReset();
    window.localStorage.clear();
  });

  it("signs in with email and password", async () => {
    mockedLogin.mockResolvedValue({ ok: true, user, token: "t1" });
    const onAuthenticated = vi.fn();
    render(<AuthPage onAuthenticated={onAuthenticated} />);

    await userEvent.type(screen.getByLabelText(/^email$/i), "amelia@example.com");
    await userEvent.type(screen.getByLabelText(/^password$/i), "secret1");
    await userEvent.click(screen.getByRole("button", { name: /^sign in$/i }));

    await waitFor(() => expect(onAuthenticated).toHaveBeenCalledWith({ mode: "user", user, token: "t1" }));
    expect(mockedLogin).toHaveBeenCalledWith("amelia@example.com", "secret1");
  });

  it("shows the server's error message when sign in fails", async () => {
    mockedLogin.mockResolvedValue({ ok: false, message: "Wrong email or password." });
    const onAuthenticated = vi.fn();
    render(<AuthPage onAuthenticated={onAuthenticated} />);

    await userEvent.type(screen.getByLabelText(/^email$/i), "amelia@example.com");
    await userEvent.type(screen.getByLabelText(/^password$/i), "nope");
    await userEvent.click(screen.getByRole("button", { name: /^sign in$/i }));

    expect(await screen.findByRole("alert")).toHaveTextContent("Wrong email or password.");
    expect(onAuthenticated).not.toHaveBeenCalled();
  });

  it("validates fields before calling the API", async () => {
    render(<AuthPage onAuthenticated={vi.fn()} />);
    await userEvent.click(screen.getByRole("button", { name: /^sign in$/i }));

    expect(screen.getByText(/enter a valid email address/i)).toBeInTheDocument();
    expect(screen.getByText(/enter your password/i)).toBeInTheDocument();
    expect(mockedLogin).not.toHaveBeenCalled();
  });

  it("registers a new account from the Create account tab", async () => {
    mockedRegister.mockResolvedValue({ ok: true, user, token: "t2" });
    const onAuthenticated = vi.fn();
    render(<AuthPage onAuthenticated={onAuthenticated} />);

    const nameInput = screen.getByLabelText(/full name/i);
    expect(nameInput).toBeDisabled();

    await userEvent.click(screen.getByRole("tab", { name: /create account/i }));
    expect(screen.getByRole("tab", { name: /create account/i })).toHaveAttribute("aria-selected", "true");
    expect(nameInput).toBeEnabled();

    await userEvent.type(nameInput, "Amelia Earhart");
    await userEvent.type(screen.getByLabelText(/^email$/i), "amelia@example.com");
    await userEvent.type(screen.getByLabelText(/^password$/i), "secret1");
    await userEvent.click(screen.getByRole("button", { name: /^create account$/i }));

    await waitFor(() => expect(onAuthenticated).toHaveBeenCalledWith({ mode: "user", user, token: "t2" }));
    expect(mockedRegister).toHaveBeenCalledWith("Amelia Earhart", "amelia@example.com", "secret1");
  });

  it("requires a 6+ character password when registering", async () => {
    render(<AuthPage onAuthenticated={vi.fn()} />);
    await userEvent.click(screen.getByRole("tab", { name: /create account/i }));
    await userEvent.type(screen.getByLabelText(/full name/i), "Amelia");
    await userEvent.type(screen.getByLabelText(/^email$/i), "amelia@example.com");
    await userEvent.type(screen.getByLabelText(/^password$/i), "123");
    await userEvent.click(screen.getByRole("button", { name: /^create account$/i }));

    expect(screen.getByText(/use at least 6 characters/i)).toBeInTheDocument();
    expect(mockedRegister).not.toHaveBeenCalled();
  });

  it("enters demo mode without an account", async () => {
    const onAuthenticated = vi.fn();
    render(<AuthPage onAuthenticated={onAuthenticated} />);
    await userEvent.click(screen.getByRole("button", { name: /try the demo/i }));
    expect(onAuthenticated).toHaveBeenCalledWith({ mode: "demo" });
  });

  it("toggles password visibility", async () => {
    render(<AuthPage onAuthenticated={vi.fn()} />);
    const password = screen.getByLabelText(/^password$/i);
    expect(password).toHaveAttribute("type", "password");
    await userEvent.click(screen.getByRole("button", { name: /show password/i }));
    expect(password).toHaveAttribute("type", "text");
  });

  it("switches tabs with the arrow keys", () => {
    render(<AuthPage onAuthenticated={vi.fn()} />);
    const loginTab = screen.getByRole("tab", { name: /sign in/i });
    fireEvent.keyDown(loginTab, { key: "ArrowRight" });
    expect(screen.getByRole("tab", { name: /create account/i })).toHaveAttribute("aria-selected", "true");
  });
});
