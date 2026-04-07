import { ReactNode, useState } from "react";
import { Bell, Bot, Sparkles } from "lucide-react";
import { SidebarAgent } from "../components/SidebarAgent";
import { useAuth } from "../lib/auth";

export function AppShell({ children }: { children: ReactNode }) {
  const { session, signOut } = useAuth();
  const [agentOpen, setAgentOpen] = useState(false);

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
            <button className="secondary-button" onClick={() => setAgentOpen(true)} type="button">
              <Bot size={16} />
              Ask AI
            </button>
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

      {agentOpen ? (
        <div className="agent-drawer-shell" role="dialog" aria-modal="true" aria-label="Ask AI">
          <button
            className="agent-drawer-backdrop"
            type="button"
            onClick={() => setAgentOpen(false)}
            aria-label="Close AI chat"
          />
          <div className="agent-drawer-panel">
            <SidebarAgent onClose={() => setAgentOpen(false)} />
          </div>
        </div>
      ) : null}
    </div>
  );
}
