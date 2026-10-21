import App from "./App";
import AuthPage from "./components/AuthPage";
import type { AccountInfo } from "./components/AccountBar";
import { useAuth } from "./hooks/useAuth";

/**
 * Login wall: shows the AuthPage until the visitor signs in, registers, or
 * picks the demo, then renders the full app with an account bar.
 */
function Root() {
  const { state, signIn, signOut } = useAuth();

  if (state.status === "signedOut") {
    return <AuthPage onAuthenticated={signIn} />;
  }

  const { session } = state;
  const account: AccountInfo =
    session.mode === "user" ? { kind: "user", name: session.user.name, email: session.user.email } : { kind: "demo" };

  return <App account={account} onSignOut={signOut} />;
}

export default Root;
