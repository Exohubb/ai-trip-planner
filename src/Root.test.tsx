import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import Root from "./Root";

describe("Root login wall", () => {
  beforeEach(() => {
    window.localStorage.clear();
    // Background token validation hits /api/auth/me; keep it from resolving.
    vi.stubGlobal("fetch", vi.fn(() => new Promise(() => {})));
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    window.localStorage.clear();
  });

  it("shows the login wall when there is no session", () => {
    render(<Root />);
    expect(screen.getByRole("tab", { name: /sign in/i })).toBeInTheDocument();
    expect(screen.queryByLabelText(/describe your trip/i)).not.toBeInTheDocument();
  });

  it("lets a visitor try the demo, then return to the login wall", async () => {
    render(<Root />);
    await userEvent.click(screen.getByRole("button", { name: /try the demo/i }));

    expect(screen.getByLabelText(/describe your trip/i)).toBeInTheDocument();
    expect(screen.getByText(/demo mode/i)).toBeInTheDocument();
    expect(JSON.parse(window.localStorage.getItem("ai-trip-planner:session") ?? "null")).toEqual({ mode: "demo" });

    await userEvent.click(screen.getByRole("button", { name: /^sign in$/i }));
    expect(screen.getByRole("tab", { name: /sign in/i })).toBeInTheDocument();
    expect(window.localStorage.getItem("ai-trip-planner:session")).toBeNull();
  });

  it("restores a stored account session and shows the user in the header", () => {
    window.localStorage.setItem(
      "ai-trip-planner:session",
      JSON.stringify({ mode: "user", token: "t1", user: { id: "u1", name: "Amelia Earhart", email: "a@example.com" } }),
    );
    render(<Root />);
    expect(screen.getByText("Amelia Earhart")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /sign out/i })).toBeInTheDocument();
  });
});
