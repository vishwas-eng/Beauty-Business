import { ReactNode } from "react";
import { Bell, Sparkles } from "lucide-react";
import { useAuth } from "../lib/auth";

export function AppShell({ children }: { children: ReactNode }) {
  const { session, signOut } = useAuth();

  return (
    <div className="app-shell no-sidebar">
      <main className="main-panel">
        <header className="topbar">
          <div>
            <p className="eyebrow">
              <Sparkles size={14} />
              Beauty
            </p>
            <h1>Beauty Business Tracker</h1>
            <p className="subdued">
              Clear view of brands, markets, and current status.
            </p>
          </div>

          <div className="topbar-right">
            <div className="user-chip">
              <Bell size={16} />
              <span>{session?.email}</span>
            </div>
            <button className="secondary-button" onClick={() => void signOut()} type="button">
              Sign out
            </button>
          </div>
        </header>

        {children}
      </main>
    </div>
  );
}
