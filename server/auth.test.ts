import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { Server } from "node:http";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import express from "express";
import { createAuthRouter } from "./authRoutes.ts";
import { createUserStore } from "./userStore.ts";

describe("/api/auth", () => {
  let server: Server;
  let baseUrl: string;
  let tmpDir: string;

  beforeAll(async () => {
    tmpDir = mkdtempSync(path.join(tmpdir(), "auth-test-"));
    const app = express();
    app.use(express.json());
    app.use("/api/auth", createAuthRouter(createUserStore(path.join(tmpDir, "users.json"))));
    server = app.listen(0);
    await new Promise<void>((resolve) => server.once("listening", resolve));
    const address = server.address();
    const port = typeof address === "object" && address ? address.port : 0;
    baseUrl = `http://127.0.0.1:${port}`;
  });

  afterAll(async () => {
    await new Promise<void>((resolve) => server.close(() => resolve()));
    rmSync(tmpDir, { recursive: true, force: true });
  });

  function post(route: string, body: unknown, token?: string) {
    return fetch(`${baseUrl}/api/auth${route}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify(body),
    });
  }

  it("registers a user and returns a public user + token (no password)", async () => {
    const res = await post("/register", { name: "Ada Lovelace", email: "Ada@Example.com", password: "secret1" });
    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.token).toEqual(expect.any(String));
    expect(body.user).toEqual({ id: expect.any(String), name: "Ada Lovelace", email: "ada@example.com" });
    expect(body.user.password).toBeUndefined();
  });

  it("rejects a duplicate email case-insensitively", async () => {
    const res = await post("/register", { name: "Ada Again", email: "ADA@example.com", password: "another1" });
    expect(res.status).toBe(409);
    expect(await res.json()).toEqual({ error: "email_taken" });
  });

  it.each([
    [{ email: "a@b.co", password: "secret1" }, "missing_fields"],
    [{ name: "A", email: "a@b.co", password: "secret1" }, "invalid_name"],
    [{ name: "Bob", email: "not-an-email", password: "secret1" }, "invalid_email"],
    [{ name: "Bob", email: "bob@example.com", password: "123" }, "weak_password"],
  ])("validates register input %#", async (body, error) => {
    const res = await post("/register", body);
    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ error });
  });

  it("logs in with correct credentials and rejects wrong ones", async () => {
    const ok = await post("/login", { email: "ada@example.com", password: "secret1" });
    expect(ok.status).toBe(200);
    expect((await ok.json()).user.name).toBe("Ada Lovelace");

    const bad = await post("/login", { email: "ada@example.com", password: "wrong" });
    expect(bad.status).toBe(401);
    expect(await bad.json()).toEqual({ error: "invalid_credentials" });
  });

  it("resolves /me from a token and invalidates it on logout", async () => {
    const login = await post("/login", { email: "ada@example.com", password: "secret1" });
    const { token } = await login.json();

    const me = await fetch(`${baseUrl}/api/auth/me`, { headers: { Authorization: `Bearer ${token}` } });
    expect(me.status).toBe(200);
    expect((await me.json()).user.email).toBe("ada@example.com");

    const logout = await post("/logout", {}, token);
    expect(logout.status).toBe(204);

    const after = await fetch(`${baseUrl}/api/auth/me`, { headers: { Authorization: `Bearer ${token}` } });
    expect(after.status).toBe(401);
  });

  it("returns 401 from /me without a token", async () => {
    const res = await fetch(`${baseUrl}/api/auth/me`);
    expect(res.status).toBe(401);
  });
});
