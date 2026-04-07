import { ReactNode, useState } from "react";
import { Bell, Bot, Sparkles } from "lucide-react";
import { NAV_ITEMS } from "../lib/constants";
import { SidebarAgent } from "../components/SidebarAgent";
import { useAuth } from "../lib/auth";

export function AppShell({ children }: { children: ReactNode }) {
  const { session, signOut } = useAuth();
  const [agentOpen, setAgentOpen] = useState(false);

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand-block">
          <div className="brand-mark">B</div>
          <div>
            <p className="brand-title">Beauty Business Tracker</p>
            <p className="brand-subtitle">Dashboard beta</p>
          </div>
        </div>

        <nav className="sidebar-nav" aria-label="Product navigation">
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;

            if (item.active) {
              return (
                <div key={item.label} className="sidebar-link is-active">
                  <Icon size={16} />
                  <span>{item.label}</span>
                </div>
              );
            }

            return (
              <div key={item.label} className="sidebar-link sidebar-link-muted">
                <Icon size={16} />
                <span>{item.label}</span>
                {item.comingSoon ? <span className="sidebar-badge">Soon</span> : null}
              </div>
            );
          })}
        </nav>

        <div className="sidebar-footer">
          <div className="sidebar-note">
            <strong>Beta</strong>
            <p>Phase one is focused on live tracking and decision-ready business views.</p>
          </div>
        </div>
      </aside>

      <main className="main-panel">
        <header className="topbar">
          <div>
            <p className="eyebrow">
              <Sparkles size={14} />
              Beauty
            </p>
            <div className="title-row">
              <h1>Beauty Business Tracker</h1>
              <span className="beta-badge">Beta</span>
            </div>
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
