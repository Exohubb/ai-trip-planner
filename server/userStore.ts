import { promises as fs } from "node:fs";
import path from "node:path";
import { randomUUID } from "node:crypto";

/**
 * Deliberately simple, file-backed account store for the demo login wall.
 *
 * NOTE: This is a portfolio project, so passwords are stored as plain text
 * in a local JSON file on purpose (no hashing, no database). Do not reuse
 * this for anything that holds real user credentials.
 */

export interface StoredUser {
  id: string;
  name: string;
  email: string;
  password: string;
  createdAt: string;
}

/** The user shape that is safe to send to the browser (never includes the password). */
export interface PublicUser {
  id: string;
  name: string;
  email: string;
}

interface StoreData {
  users: StoredUser[];
  /** Session token -> user id. */
  sessions: Record<string, string>;
}

export type AuthResult =
  | { ok: true; user: PublicUser; token: string }
  | { ok: false; error: "email_taken" | "invalid_credentials" };

export interface UserStore {
  register(input: { name: string; email: string; password: string }): Promise<AuthResult>;
  login(input: { email: string; password: string }): Promise<AuthResult>;
  getUserByToken(token: string): Promise<PublicUser | null>;
  logout(token: string): Promise<void>;
}

function toPublicUser(user: StoredUser): PublicUser {
  return { id: user.id, name: user.name, email: user.email };
}

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

export function createUserStore(filePath: string): UserStore {
  // Every read-modify-write runs through this promise chain so two requests
  // arriving at once can't overwrite each other's changes to the file.
  let queue: Promise<unknown> = Promise.resolve();

  function withLock<T>(fn: () => Promise<T>): Promise<T> {
    const run = queue.then(fn);
    queue = run.catch(() => undefined);
    return run;
  }

  async function read(): Promise<StoreData> {
    try {
      const raw = await fs.readFile(filePath, "utf8");
      const parsed = JSON.parse(raw) as Partial<StoreData>;
      return {
        users: Array.isArray(parsed.users) ? parsed.users : [],
        sessions: parsed.sessions && typeof parsed.sessions === "object" ? parsed.sessions : {},
      };
    } catch {
      // Missing or unreadable file: start with an empty store.
      return { users: [], sessions: {} };
    }
  }

  async function write(data: StoreData): Promise<void> {
    await fs.mkdir(path.dirname(filePath), { recursive: true });
    // Write to a temp file and rename so a crash mid-write can't corrupt the store.
    const tmpPath = `${filePath}.${process.pid}.tmp`;
    await fs.writeFile(tmpPath, JSON.stringify(data, null, 2), "utf8");
    await fs.rename(tmpPath, filePath);
  }

  return {
    register({ name, email, password }) {
      return withLock(async () => {
        const data = await read();
        const normalizedEmail = normalizeEmail(email);
        if (data.users.some((u) => u.email === normalizedEmail)) {
          return { ok: false, error: "email_taken" } as const;
        }
        const user: StoredUser = {
          id: randomUUID(),
          name: name.trim(),
          email: normalizedEmail,
          password,
          createdAt: new Date().toISOString(),
        };
        const token = randomUUID();
        data.users.push(user);
        data.sessions[token] = user.id;
        await write(data);
        return { ok: true, user: toPublicUser(user), token } as const;
      });
    },

    login({ email, password }) {
      return withLock(async () => {
        const data = await read();
        const normalizedEmail = normalizeEmail(email);
        const user = data.users.find((u) => u.email === normalizedEmail && u.password === password);
        if (!user) {
          return { ok: false, error: "invalid_credentials" } as const;
        }
        const token = randomUUID();
        data.sessions[token] = user.id;
        await write(data);
        return { ok: true, user: toPublicUser(user), token } as const;
      });
    },

    async getUserByToken(token) {
      const data = await read();
      const userId = data.sessions[token];
      const user = userId ? data.users.find((u) => u.id === userId) : undefined;
      return user ? toPublicUser(user) : null;
    },

    logout(token) {
      return withLock(async () => {
        const data = await read();
        if (data.sessions[token]) {
          delete data.sessions[token];
          await write(data);
        }
      });
    },
  };
}
