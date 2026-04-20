import { ReactNode, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { AlertTriangle, Bell, Bot, Info, LogOut, Sparkles, TrendingUp, X } from "lucide-react";
import { loadStoredDashboard } from "../lib/storage";
import { NAV_ITEMS } from "../lib/constants";
import { SidebarAgent } from "../components/SidebarAgent";
import { useAuth } from "../lib/auth";

const ACTIVE_STATUSES = ["Leads", "Lead", "MQL", "SQL", "Commercials", "OD", "Contract", "Onboarding"];
const LATE_STAGE_STATUSES = ["Commercials", "OD", "Contract", "Onboarding"];

export function AppShell({ children }: { children: ReactNode }) {
  const { session, signOut } = useAuth();
  const [agentOpen, setAgentOpen] = useState(false);
  const [alertsOpen, setAlertsOpen] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const navigate = useNavigate();
  const location = useLocation();

  const { smartAlerts, pulse } = useMemo(() => {
    const stored = loadStoredDashboard();
    const rows = stored.performance;
    const alerts: Array<{ id: string; tone: "warning" | "danger" | "info"; title: string; detail: string }> = [];

    const stale60 = rows.filter((r) => r.workingDays > 60 && r.status !== "Reject");
    if (stale60.length > 0) {
      alerts.push({
        id: "stale60",
        tone: "danger",
        title: `${stale60.length} brand${stale60.length > 1 ? "s" : ""} stale over 60 days`,
        detail:
          stale60
            .slice(0, 3)
            .map((r) => `${r.brand} · ${r.launchMarket}`)
            .join(", ") + (stale60.length > 3 ? ` +${stale60.length - 3} more` : "")
      });
    }

    const activeRows = rows.filter((r) => ACTIVE_STATUSES.includes(r.status));
    const holdRows = rows.filter((r) => r.status === "Hold");
    const holdRate =
      activeRows.length + holdRows.length > 0
        ? Math.round((holdRows.length / (activeRows.length + holdRows.length)) * 100)
        : 0;
    if (holdRate > 30) {
      alerts.push({
        id: "holdrate",
        tone: "warning",
        title: `Hold rate at ${holdRate}% — above threshold`,
        detail: `${holdRows.length} opportunities paused. Review hold reasons and schedule follow-ups.`
      });
    }

    const lateStage = rows.filter((r) => LATE_STAGE_STATUSES.includes(r.status));
    if (lateStage.length === 0) {
      alerts.push({
        id: "latestage",
        tone: "warning",
        title: "No late-stage deals in pipeline",
        detail: "No opportunities in Commercials or beyond. Pipeline depth may be at risk."
      });
    }

    const noNextStep = rows.filter((r) => ACTIVE_STATUSES.includes(r.status) && !r.nextStep?.trim());
    if (noNextStep.length > 0) {
      alerts.push({
        id: "nonextstep",
        tone: "info",
        title: `${noNextStep.length} active deal${noNextStep.length > 1 ? "s" : ""} missing next step`,
        detail:
          noNextStep
            .slice(0, 3)
            .map((r) => `${r.brand} · ${r.launchMarket}`)
            .join(", ") + (noNextStep.length > 3 ? ` +${noNextStep.length - 3} more` : "")
      });
    }

    const totalBrands = new Set(rows.map((r) => r.brand)).size;
    const active = rows.filter((r) => ACTIVE_STATUSES.includes(r.status)).length;
    const hold = rows.filter((r) => r.status === "Hold").length;
    const late = rows.filter((r) => LATE_STAGE_STATUSES.includes(r.status)).length;

    return {
      smartAlerts: alerts,
      pulse: { totalBrands, active, hold, late }
    };
  }, []);

  return (
    <div className={`app-shell${sidebarOpen ? "" : " sidebar-hidden"}`}>
      <aside className="sidebar">
        {/* Brand */}
        <div className="brand-block">
          <img src="/lumara-logo.svg" alt="Lumara" className="lumara-mark" />
          <div>
            <p className="brand-title">Lumara</p>
            <p className="brand-subtitle">
              <span className="live-dot" />
              by Opptra · Live
            </p>
          </div>
        </div>

        {/* Workspace nav */}
        <div className="sidebar-section">
          <p className="sidebar-section-label">Workspace</p>
          <nav className="sidebar-nav" aria-label="Product navigation">
            {NAV_ITEMS.filter(n => n.section === "workspace").map(({ label, icon: Icon, path }) => {
              const isActive =
                path === "/"
                  ? location.pathname === "/"
                  : location.pathname.startsWith(`/${path.split("/")[1]}`);
              return (
                <div
                  key={label}
                  className={`sidebar-link${isActive ? " is-active" : ""}`}
                  style={{ cursor: "pointer" }}
                  onClick={() => navigate(path)}
                >
                  <Icon size={16} />
                  <span>{label}</span>
                </div>
              );
            })}
          </nav>
        </div>

        {/* Growth Suite nav */}
        <div className="sidebar-section">
          <p className="sidebar-section-label">
            Growth Suite
          </p>
          <nav className="sidebar-nav">
            {NAV_ITEMS.filter(n => n.section === "growth" && !n.comingSoon).map(({ label, icon: Icon, path, badge }) => {
              const isActive = location.pathname.startsWith(`/${path.split("/")[1]}`);
              return (
                <div
                  key={label}
                  className={`sidebar-link${isActive ? " is-active" : ""}`}
                  style={{ cursor: "pointer" }}
                  onClick={() => navigate(path)}
                >
                  <Icon size={16} />
                  <span>{label}</span>
                  {badge && (
                    <span className="sidebar-section-badge" style={{ marginLeft: "auto" }}>{badge}</span>
                  )}
                </div>
              );
            })}
          </nav>
        </div>

        {/* Coming Soon */}
        {NAV_ITEMS.some(n => n.comingSoon) && (
          <div className="sidebar-section">
            <p className="sidebar-section-label">
              Coming Soon
              <span className="sidebar-section-badge" style={{ background: "rgba(255,255,255,0.06)", color: "rgba(255,255,255,0.35)", border: "1px solid rgba(255,255,255,0.1)" }}>SOON</span>
            </p>
            <nav className="sidebar-nav">
              {NAV_ITEMS.filter(n => n.comingSoon).map(({ label, icon: Icon }) => (
                <div
                  key={label}
                  className="sidebar-link sidebar-link-disabled"
                  style={{ cursor: "default", opacity: 0.4 }}
                >
                  <Icon size={16} />
                  <span>{label}</span>
                </div>
              ))}
            </nav>
          </div>
        )}

        {/* AI Tools */}
        <div className="sidebar-section">
          <p className="sidebar-section-label">
            AI Tools
            <span className="sidebar-section-badge">BETA</span>
          </p>
          <nav className="sidebar-nav">
            <div className="sidebar-link" style={{ cursor: "pointer" }} onClick={() => setAgentOpen(true)}>
              <Bot size={16} />
              <span>Ask AI</span>
            </div>
            <div className="sidebar-link sidebar-alerts-link" style={{ cursor: "pointer" }} onClick={() => setAlertsOpen((p) => !p)}>
              <Bell size={16} />
              <span>Smart Alerts</span>
              {smartAlerts.length > 0 && (
                <span className="sidebar-alert-count">{smartAlerts.length}</span>
              )}
            </div>
            <div className="sidebar-link" style={{ cursor: "pointer" }} onClick={() => navigate("/")}>
              <Sparkles size={16} />
              <span>Weekly Brief</span>
            </div>
          </nav>
        </div>

        {/* Pipeline Pulse */}
        <div className="sidebar-section sidebar-pulse">
          <p className="sidebar-section-label">
            <TrendingUp size={11} style={{ marginRight: 4, verticalAlign: "middle" }} />
            Pipeline Pulse
          </p>
          <div className="pulse-grid">
            <div className="pulse-stat">
              <span className="pulse-value">{pulse.totalBrands}</span>
              <span className="pulse-label">Brands</span>
            </div>
            <div className="pulse-stat">
              <span className="pulse-value pulse-green">{pulse.active}</span>
              <span className="pulse-label">Active</span>
            </div>
            <div className="pulse-stat">
              <span className="pulse-value pulse-orange">{pulse.hold}</span>
              <span className="pulse-label">On Hold</span>
            </div>
            <div className="pulse-stat">
              <span className="pulse-value pulse-indigo">{pulse.late}</span>
              <span className="pulse-label">Late Stage</span>
            </div>
          </div>
        </div>

        {/* User block */}
        <div className="sidebar-footer">
          <div className="sidebar-user">
            <div className="user-avatar-sm">
              {(session?.email?.[0] ?? "U").toUpperCase()}
            </div>
            <div className="sidebar-user-info">
              <span className="sidebar-user-email">{session?.email}</span>
              <span className="sidebar-user-role">{session?.role ?? "viewer"}</span>
            </div>
            <button
              className="sidebar-signout"
              onClick={() => void signOut()}
              title="Sign out"
              type="button"
            >
              <LogOut size={14} />
            </button>
          </div>
        </div>

        {/* Alerts dropdown */}
        {alertsOpen ? (
          <div className="sidebar-alerts-panel">
            <div className="alerts-panel-header">
              <strong>Smart Alerts</strong>
              <span className="beta-badge">BETA</span>
              <button
                className="ghost-button"
                style={{ marginLeft: "auto", width: 28, height: 28, padding: 0, borderRadius: "6px" }}
                onClick={() => setAlertsOpen(false)}
                type="button"
              >
                <X size={14} />
              </button>
            </div>
            {smartAlerts.length === 0 ? (
              <p className="alerts-empty">All clear — no active alerts.</p>
            ) : (
              smartAlerts.map((alert) => {
                const Icon = alert.tone === "info" ? Info : AlertTriangle;
                return (
                  <div key={alert.id} className={`alert-row alert-row-${alert.tone}`}>
                    <strong>
                      <Icon size={12} style={{ marginRight: 6, verticalAlign: "middle" }} />
                      {alert.title}
                    </strong>
                    <p>{alert.detail}</p>
                  </div>
                );
              })
            )}
          </div>
        ) : null}
      </aside>

      <main className="main-panel">
        <header className="topbar">
          <div>
            <div className="title-row">
              <h1 className="lumara-topbar-title">Lumara</h1>
              <span className="lumara-by">by Opptra</span>
            </div>
            <p className="subdued">
              AI-powered beauty brand pipeline intelligence.
            </p>
          </div>

          <div className="topbar-right">
            <button
              className="secondary-button sidebar-toggle"
              onClick={() => setSidebarOpen((prev) => !prev)}
              type="button"
              title={sidebarOpen ? "Hide sidebar" : "Show sidebar"}
            >
              {sidebarOpen ? "⟨ Hide" : "⟩ Show"}
            </button>
            <button className="secondary-button" onClick={() => setAgentOpen(true)} type="button">
              <Bot size={16} />
              Ask AI
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
