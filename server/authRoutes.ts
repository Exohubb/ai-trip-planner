import { Router, type Request } from "express";
import type { UserStore } from "./userStore.ts";

const MIN_NAME_LENGTH = 2;
const MAX_NAME_LENGTH = 60;
const MAX_EMAIL_LENGTH = 254;
const MIN_PASSWORD_LENGTH = 6;
const MAX_PASSWORD_LENGTH = 128;
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function readBearerToken(req: Request): string | null {
  const header = req.headers.authorization;
  if (typeof header !== "string" || !header.startsWith("Bearer ")) return null;
  const token = header.slice("Bearer ".length).trim();
  return token.length > 0 ? token : null;
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

/**
 * Login wall endpoints, mounted at `/api/auth`:
 *
 * - `POST /register` `{ name, email, password }` -> 201 `{ user, token }`
 * - `POST /login`    `{ email, password }`       -> 200 `{ user, token }`
 * - `GET  /me`       `Authorization: Bearer <token>` -> 200 `{ user }`
 * - `POST /logout`   `Authorization: Bearer <token>` -> 204
 *
 * Errors are `{ error: <code> }` with a 4xx status, matching the style of
 * the itinerary routes.
 */
export function createAuthRouter(store: UserStore): Router {
  const router = Router();

  router.post("/register", async (req, res, next) => {
    try {
      const { name, email, password } = req.body ?? {};

      if (!isNonEmptyString(name) || !isNonEmptyString(email) || typeof password !== "string" || password.length === 0) {
        res.status(400).json({ error: "missing_fields" });
        return;
      }
      const trimmedName = name.trim();
      if (trimmedName.length < MIN_NAME_LENGTH || trimmedName.length > MAX_NAME_LENGTH) {
        res.status(400).json({ error: "invalid_name" });
        return;
      }
      if (email.length > MAX_EMAIL_LENGTH || !EMAIL_PATTERN.test(email.trim())) {
        res.status(400).json({ error: "invalid_email" });
        return;
      }
      if (password.length < MIN_PASSWORD_LENGTH || password.length > MAX_PASSWORD_LENGTH) {
        res.status(400).json({ error: "weak_password" });
        return;
      }

      const result = await store.register({ name: trimmedName, email, password });
      if (!result.ok) {
        res.status(409).json({ error: result.error });
        return;
      }
      res.status(201).json({ user: result.user, token: result.token });
    } catch (err) {
      next(err);
    }
  });

  router.post("/login", async (req, res, next) => {
    try {
      const { email, password } = req.body ?? {};
      if (!isNonEmptyString(email) || typeof password !== "string" || password.length === 0) {
        res.status(400).json({ error: "missing_fields" });
        return;
      }
      if (email.length > MAX_EMAIL_LENGTH || password.length > MAX_PASSWORD_LENGTH) {
        res.status(401).json({ error: "invalid_credentials" });
        return;
      }

      const result = await store.login({ email, password });
      if (!result.ok) {
        res.status(401).json({ error: result.error });
        return;
      }
      res.status(200).json({ user: result.user, token: result.token });
    } catch (err) {
      next(err);
    }
  });

  router.get("/me", async (req, res, next) => {
    try {
      const token = readBearerToken(req);
      const user = token ? await store.getUserByToken(token) : null;
      if (!user) {
        res.status(401).json({ error: "unauthorized" });
        return;
      }
      res.status(200).json({ user });
    } catch (err) {
      next(err);
    }
  });

  router.post("/logout", async (req, res, next) => {
    try {
      const token = readBearerToken(req);
      if (token) await store.logout(token);
      res.status(204).end();
    } catch (err) {
      next(err);
    }
  });

  return router;
}
