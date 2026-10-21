import { LogIn, LogOut, Sparkles } from "lucide-react";
import styles from "./AccountBar.module.css";

export type AccountInfo = { kind: "user"; name: string; email: string } | { kind: "demo" };

export interface AccountBarProps {
  account: AccountInfo;
  /** Signs out (real account) or leaves demo mode; both return to the login wall. */
  onSignOut: () => void;
}

function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  const letters = parts.length > 1 ? parts[0][0] + parts[parts.length - 1][0] : (parts[0] ?? "?").slice(0, 2);
  return letters.toUpperCase();
}

/** Signed-in user chip (or demo-mode badge) shown in the app header. */
function AccountBar({ account, onSignOut }: AccountBarProps) {
  if (account.kind === "demo") {
    return (
      <div className={styles.bar}>
        <span className={styles.demoBadge}>
          <Sparkles size={16} aria-hidden="true" />
          Demo mode
        </span>
        <button type="button" className={styles.action} onClick={onSignOut}>
          <LogIn size={16} aria-hidden="true" />
          <span>Sign in</span>
        </button>
      </div>
    );
  }

  return (
    <div className={styles.bar}>
      <span className={styles.avatar} aria-hidden="true">
        {initials(account.name)}
      </span>
      <span className={styles.identity}>
        <span className={styles.name}>{account.name}</span>
        <span className={styles.email}>{account.email}</span>
      </span>
      <button type="button" className={styles.action} onClick={onSignOut}>
        <LogOut size={16} aria-hidden="true" />
        <span>Sign out</span>
      </button>
    </div>
  );
}

export default AccountBar;
