/** Client for the `/api/auth` login-wall endpoints (see server/authRoutes.ts). */

export interface AuthUser {
  id: string;
  name: string;
  email: string;
}

export type AuthApiResult = { ok: true; user: AuthUser; token: string } | { ok: false; message: string };

const ERROR_MESSAGES: Record<string, string> = {
  missing_fields: "Please fill in every field.",
  invalid_name: "Your name should be between 2 and 60 characters.",
  invalid_email: "That email address doesn't look quite right.",
  weak_password: "Passwords need at least 6 characters.",
  email_taken: "An account with this email already exists. Try signing in instead.",
  invalid_credentials: "That email and password don't match any traveler on file.",
};

const NETWORK_MESSAGE = "We couldn't reach the server. Make sure it's running and try again.";
const GENERIC_MESSAGE = "Something went wrong. Please try again.";

function isAuthUser(value: unknown): value is AuthUser {
  if (!value || typeof value !== "object") return false;
  const v = value as Record<string, unknown>;
  return typeof v.id === "string" && typeof v.name === "string" && typeof v.email === "string";
}

async function postCredentials(route: "login" | "register", body: Record<string, string>): Promise<AuthApiResult> {
  let response: Response;
  try {
    response = await fetch(`/api/auth/${route}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
  } catch {
    return { ok: false, message: NETWORK_MESSAGE };
  }

  let data: unknown = null;
  try {
    data = await response.json();
  } catch {
    // Non-JSON body (e.g. dev proxy error page) - handled below.
  }

  if (response.ok && data && typeof data === "object") {
    const { user, token } = data as { user?: unknown; token?: unknown };
    if (isAuthUser(user) && typeof token === "string") {
      return { ok: true, user, token };
    }
  }

  const code = data && typeof data === "object" ? (data as { error?: unknown }).error : undefined;
  if (typeof code === "string" && ERROR_MESSAGES[code]) {
    return { ok: false, message: ERROR_MESSAGES[code] };
  }
  // Vite's proxy answers 5xx when the API server isn't running.
  return { ok: false, message: response.status >= 500 ? NETWORK_MESSAGE : GENERIC_MESSAGE };
}

export function loginRequest(email: string, password: string): Promise<AuthApiResult> {
  return postCredentials("login", { email, password });
}

export function registerRequest(name: string, email: string, password: string): Promise<AuthApiResult> {
  return postCredentials("register", { name, email, password });
}

/**
 * Checks whether a stored token is still valid. Returns the user, `null` if
 * the server explicitly rejected the token, or `"unknown"` if the server
 * couldn't be reached (so callers can keep the user signed in while offline).
 */
export async function fetchCurrentUser(token: string): Promise<AuthUser | null | "unknown"> {
  try {
    const response = await fetch("/api/auth/me", { headers: { Authorization: `Bearer ${token}` } });
    if (response.status === 401) return null;
    if (!response.ok) return "unknown";
    const data = (await response.json()) as { user?: unknown };
    return isAuthUser(data.user) ? data.user : "unknown";
  } catch {
    return "unknown";
  }
}

export async function logoutRequest(token: string): Promise<void> {
  try {
    await fetch("/api/auth/logout", { method: "POST", headers: { Authorization: `Bearer ${token}` } });
  } catch {
    // Signing out locally still works even if the server is unreachable.
  }
}
