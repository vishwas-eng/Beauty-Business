import { ReactNode, useState } from "react";
import { Bell, CircleUserRound, PanelLeftClose, PanelLeftOpen, Sparkles } from "lucide-react";
import { NavLink } from "react-router-dom";
import { NAV_ITEMS } from "../lib/constants";
import { useAuth } from "../lib/auth";

export function AppShell({ children }: { children: ReactNode }) {
  const { session, signOut } = useAuth();
  const [sidebarHidden, setSidebarHidden] = useState(false);

  return (
    <div className={sidebarHidden ? "app-shell sidebar-hidden" : "app-shell"}>
      <aside className="sidebar">
        <div className="brand-block">
          <div className="brand-mark">S</div>
          <div>
            <p className="brand-title">Softline OS</p>
            <p className="brand-subtitle">Weekly business review</p>
          </div>
        </div>

        <nav className="sidebar-nav">
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.to}
                to={item.to}
                className={({ isActive }) =>
                  isActive ? "sidebar-link is-active" : "sidebar-link"
                }
              >
                <Icon size={18} />
                <span>{item.label}</span>
              </NavLink>
            );
          })}
        </nav>

        <div className="sidebar-footer">
          <div className="user-badge">
            <CircleUserRound size={18} />
            <div>
              <p>{session?.workspaceName}</p>
              <span>{session?.role === "admin" ? "Admin" : "Viewer"}</span>
            </div>
          </div>
          <button className="ghost-button" onClick={() => void signOut()}>
            Sign out
          </button>
        </div>
      </aside>

      <main className="main-panel">
        <header className="topbar">
          <div>
            <p className="eyebrow">
              <Sparkles size={14} />
              Softlines business
            </p>
            <h1>Weekly Review Dashboard</h1>
            <p className="subdued">
              Clear weekly view of brand movement, priorities, and business status.
            </p>
          </div>

          <div className="topbar-right">
            <button
              className="secondary-button sidebar-toggle"
              onClick={() => setSidebarHidden((current) => !current)}
              type="button"
            >
              {sidebarHidden ? <PanelLeftOpen size={16} /> : <PanelLeftClose size={16} />}
              {sidebarHidden ? "Show sidebar" : "Hide sidebar"}
            </button>
            <div className="user-chip">
              <Bell size={16} />
              <span>{session?.email}</span>
            </div>
          </div>
        </header>

        {children}
      </main>
    </div>
  );
}
