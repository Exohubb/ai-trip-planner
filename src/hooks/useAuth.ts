import { useCallback, useEffect, useState } from "react";
import { fetchCurrentUser, logoutRequest, type AuthUser } from "../lib/authApi";

/** localStorage key the current session is saved under. */
const STORAGE_KEY = "ai-trip-planner:session";

export type AuthSession = { mode: "user"; user: AuthUser; token: string } | { mode: "demo" };

export type AuthState = { status: "signedOut" } | { status: "signedIn"; session: AuthSession };

function readStoredSession(): AuthSession | null {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<AuthSession> & { user?: Partial<AuthUser>; token?: unknown };
    if (parsed.mode === "demo") return { mode: "demo" };
    if (
      parsed.mode === "user" &&
      typeof parsed.token === "string" &&
      parsed.user &&
      typeof parsed.user.id === "string" &&
      typeof parsed.user.name === "string" &&
      typeof parsed.user.email === "string"
    ) {
      return { mode: "user", token: parsed.token, user: parsed.user as AuthUser };
    }
    return null;
  } catch {
    return null;
  }
}

function writeStoredSession(session: AuthSession | null) {
  try {
    if (session) {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(session));
    } else {
      window.localStorage.removeItem(STORAGE_KEY);
    }
  } catch {
    // Storage unavailable - the session still works for this tab.
  }
}

export interface UseAuthResult {
  state: AuthState;
  /** Persists a session (real account or demo) and enters the app. */
  signIn: (session: AuthSession) => void;
  /** Clears the session (and invalidates the server token) and returns to the login wall. */
  signOut: () => void;
}

/**
 * Login-wall session state. A stored session is trusted immediately so a
 * returning user never sees the login page flash; a real-account token is
 * then re-validated against `/api/auth/me` in the background and dropped if
 * the server no longer recognizes it.
 */
export function useAuth(): UseAuthResult {
  const [state, setState] = useState<AuthState>(() => {
    const stored = readStoredSession();
    return stored ? { status: "signedIn", session: stored } : { status: "signedOut" };
  });

  const storedToken = state.status === "signedIn" && state.session.mode === "user" ? state.session.token : null;

  useEffect(() => {
    if (!storedToken) return;
    let cancelled = false;
    fetchCurrentUser(storedToken).then((result) => {
      if (cancelled || result === "unknown") return;
      if (result === null) {
        writeStoredSession(null);
        setState({ status: "signedOut" });
        return;
      }
      const refreshed: AuthSession = { mode: "user", token: storedToken, user: result };
      writeStoredSession(refreshed);
      setState((prev) =>
        prev.status === "signedIn" && prev.session.mode === "user" && prev.session.token === storedToken
          ? { status: "signedIn", session: refreshed }
          : prev,
      );
    });
    return () => {
      cancelled = true;
    };
    // Only validate once per token, not on every refreshed-user state update.
  }, [storedToken]);

  const signIn = useCallback((session: AuthSession) => {
    writeStoredSession(session);
    setState({ status: "signedIn", session });
  }, []);

  const signOut = useCallback(() => {
    if (storedToken) void logoutRequest(storedToken);
    writeStoredSession(null);
    setState({ status: "signedOut" });
  }, [storedToken]);

  return { state, signIn, signOut };
}
