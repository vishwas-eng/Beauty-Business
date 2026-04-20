import React, { useEffect, useState } from "react";
import {
  Mail,
  RefreshCw,
  ArrowRight,
  Clock,
  User,
  TrendingUp,
  Shield,
  Link2
} from "lucide-react";
import { queryAgent } from "../lib/api";

/* ── Types ─────────────────────────────────────────────── */

interface Contact {
  name: string;
  role: string;
  company: string;
}

interface BrandIntel {
  brand: string;
  category: string;
  segment: string;
  markets: string[];
  stage: string;
  prevStage: string;
  heat: "hot" | "warm" | "cold";
  lastActivity: string;
  summary: string;
  nextStep: string;
  contacts: Contact[];
  threadId: string;
  owner: string;
}

interface ConnectedAccount {
  email: string;
  role: string;
  status: string;
  label: string;
}

interface EmailIntelPayload {
  brands: BrandIntel[];
  accounts: ConnectedAccount[];
  lastRefreshed: string;
  meta: { total: number; hot: number; warm: number; cold: number };
}

type HeatFilter = "all" | "hot" | "warm" | "cold";

/* ── Helpers ───────────────────────────────────────────── */

const API_URL = "/api/email-intel";

const STAGE_COLORS: Record<string, string> = {
  Commercials: "#e67e22",
  SQL: "#8e44ad",
  MQL: "#3498db",
  OD: "#d35400",
  Contract: "#27ae60",
  Active: "#1abc9c",
  Onboarding: "#2ecc71",
  Hold: "#7f8c8d",
  Reject: "#e74c3c"
};

function heatIcon(heat: string) {
  if (heat === "hot") return "\uD83D\uDD25";
  if (heat === "warm") return "\uD83D\uDFE1";
  return "\uD83D\uDD35";
}

function heatLabel(heat: string) {
  return heat.charAt(0).toUpperCase() + heat.slice(1);
}

function daysAgo(dateStr: string): string {
  const diff = Math.floor(
    (Date.now() - new Date(dateStr).getTime()) / (1000 * 60 * 60 * 24)
  );
  if (diff === 0) return "Today";
  if (diff === 1) return "1 day ago";
  return `${diff} days ago`;
}

function stageTransitions(brands: BrandIntel[]) {
  return brands
    .filter((b) => b.prevStage && b.prevStage !== b.stage)
    .map((b) => ({ brand: b.brand, from: b.prevStage, to: b.stage }));
}

/* ── Component ─────────────────────────────────────────── */

export function EmailIntelPage() {
  const [data, setData] = useState<EmailIntelPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState<HeatFilter>("all");

  async function load() {
    try {
      const res = await fetch(API_URL);
      const json: EmailIntelPayload = await res.json();
      setData(json);
    } catch {
      /* silently fail — will show empty state */
    } finally {
      setLoading(false);
    }
  }

  async function handleRefresh() {
    setRefreshing(true);
    try {
      const res = await fetch(API_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "refresh" })
      });
      const json: EmailIntelPayload = await res.json();
      setData(json);
    } catch {
      /* noop */
    } finally {
      setRefreshing(false);
    }
  }

  useEffect(() => {
    void load();
  }, []);

  if (loading || !data) {
    return <div className="page-loader">Loading email intelligence...</div>;
  }

  const transitions = stageTransitions(data.brands);
  const filtered =
    filter === "all"
      ? data.brands
      : data.brands.filter((b) => b.heat === filter);

  const filterButtons: { id: HeatFilter; label: string; count: number }[] = [
    { id: "all", label: "All", count: data.meta.total },
    { id: "hot", label: "Hot", count: data.meta.hot },
    { id: "warm", label: "Warm", count: data.meta.warm },
    { id: "cold", label: "Cold", count: data.meta.cold }
  ];

  return (
    <div className="page-stack">
      {/* ── Header ────────────────────────────────── */}
      <div className="hero-row" style={{ justifyContent: "space-between", alignItems: "flex-start" }}>
        <div>
          <div className="eyebrow">
            <Mail size={14} style={{ marginRight: 6, verticalAlign: -2 }} />
            Email Intelligence
          </div>
          <p className="subdued">
            Live brand deal updates extracted from connected email accounts
          </p>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <span className="subdued" style={{ fontSize: 12 }}>
            <Clock size={12} style={{ marginRight: 4, verticalAlign: -1 }} />
            {new Date(data.lastRefreshed).toLocaleString()}
          </span>
          <button
            className="btn btn-sm"
            onClick={handleRefresh}
            disabled={refreshing}
            type="button"
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
              padding: "6px 14px",
              borderRadius: 6,
              border: "1px solid rgba(255,255,255,.15)",
              background: "rgba(255,255,255,.06)",
              color: "#fff",
              cursor: "pointer",
              fontSize: 13
            }}
          >
            <RefreshCw size={13} className={refreshing ? "spin" : ""} />
            {refreshing ? "Refreshing..." : "Refresh"}
          </button>
        </div>
      </div>

      {/* ── Connected accounts ────────────────────── */}
      <div
        style={{
          display: "flex",
          gap: 10,
          flexWrap: "wrap",
          marginBottom: 4
        }}
      >
        {data.accounts.map((a) => (
          <span
            key={a.email}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
              padding: "4px 12px",
              borderRadius: 20,
              background: "rgba(255,255,255,.05)",
              border: "1px solid rgba(255,255,255,.1)",
              fontSize: 12,
              color: "rgba(255,255,255,.7)"
            }}
          >
            <User size={11} />
            {a.email}
            <span
              style={{
                padding: "1px 7px",
                borderRadius: 8,
                background: a.status === "connected" ? "#27ae6030" : "#e67e2230",
                color: a.status === "connected" ? "#2ecc71" : "#e67e22",
                fontSize: 10,
                fontWeight: 600,
                textTransform: "uppercase",
                letterSpacing: ".5px"
              }}
            >
              {a.status}
            </span>
            <span style={{ opacity: 0.5 }}>{a.label}</span>
          </span>
        ))}
      </div>

      {/* ── Stage transitions strip ───────────────── */}
      {transitions.length > 0 && (
        <div
          style={{
            display: "flex",
            gap: 8,
            flexWrap: "wrap",
            padding: "10px 0"
          }}
        >
          <span
            style={{
              fontSize: 11,
              textTransform: "uppercase",
              letterSpacing: ".6px",
              color: "rgba(255,255,255,.4)",
              alignSelf: "center",
              marginRight: 4
            }}
          >
            <TrendingUp size={12} style={{ verticalAlign: -2, marginRight: 4 }} />
            Stage moves
          </span>
          {transitions.map((t, i) => (
            <span
              key={`${t.brand}-${i}`}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 5,
                padding: "4px 10px",
                borderRadius: 14,
                background: "rgba(142,68,173,.12)",
                border: "1px solid rgba(142,68,173,.25)",
                fontSize: 12,
                color: "rgba(255,255,255,.85)"
              }}
            >
              <strong>{t.brand}</strong>
              <span
                style={{
                  padding: "1px 6px",
                  borderRadius: 4,
                  background: STAGE_COLORS[t.from]
                    ? `${STAGE_COLORS[t.from]}30`
                    : "rgba(255,255,255,.08)",
                  color: STAGE_COLORS[t.from] || "rgba(255,255,255,.6)",
                  fontSize: 10,
                  fontWeight: 600
                }}
              >
                {t.from}
              </span>
              <ArrowRight size={10} style={{ opacity: 0.5 }} />
              <span
                style={{
                  padding: "1px 6px",
                  borderRadius: 4,
                  background: STAGE_COLORS[t.to]
                    ? `${STAGE_COLORS[t.to]}30`
                    : "rgba(255,255,255,.08)",
                  color: STAGE_COLORS[t.to] || "rgba(255,255,255,.6)",
                  fontSize: 10,
                  fontWeight: 600
                }}
              >
                {t.to}
              </span>
            </span>
          ))}
        </div>
      )}

      {/* ── Heat filter ───────────────────────────── */}
      <div className="intel-tabs" style={{ marginBottom: 8 }}>
        {filterButtons.map((f) => (
          <button
            key={f.id}
            type="button"
            className={`intel-tab${filter === f.id ? " is-active" : ""}`}
            onClick={() => setFilter(f.id)}
          >
            {f.id !== "all" && (
              <span style={{ marginRight: 4 }}>
                {f.id === "hot" ? "\uD83D\uDD25" : f.id === "warm" ? "\uD83D\uDFE1" : "\uD83D\uDD35"}
              </span>
            )}
            {f.label}
            <span className="intel-tab-count">{f.count}</span>
          </button>
        ))}
      </div>

      {/* ── Brand cards grid ──────────────────────── */}
      <div className="insight-grid" style={{ gridTemplateColumns: "repeat(3, 1fr)" }}>
        {filtered.map((b) => (
          <div className="panel" key={b.brand} style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {/* Top row: brand + heat */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
              <div>
                <h3 style={{ margin: 0, fontSize: 17 }}>{b.brand}</h3>
                <span style={{ fontSize: 12, color: "rgba(255,255,255,.5)" }}>
                  {b.category} &middot; {b.segment} &middot; {b.markets.join(", ")}
                </span>
              </div>
              <span
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 4,
                  padding: "3px 10px",
                  borderRadius: 12,
                  fontSize: 12,
                  fontWeight: 600,
                  background:
                    b.heat === "hot"
                      ? "rgba(231,76,60,.15)"
                      : b.heat === "warm"
                      ? "rgba(241,196,15,.15)"
                      : "rgba(52,152,219,.15)",
                  color:
                    b.heat === "hot"
                      ? "#e74c3c"
                      : b.heat === "warm"
                      ? "#f1c40f"
                      : "#3498db"
                }}
              >
                {heatIcon(b.heat)} {heatLabel(b.heat)}
              </span>
            </div>

            {/* Stage badge */}
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <span
                style={{
                  padding: "2px 10px",
                  borderRadius: 6,
                  fontSize: 12,
                  fontWeight: 700,
                  background: STAGE_COLORS[b.stage]
                    ? `${STAGE_COLORS[b.stage]}25`
                    : "rgba(255,255,255,.08)",
                  color: STAGE_COLORS[b.stage] || "#ccc",
                  border: `1px solid ${STAGE_COLORS[b.stage] || "rgba(255,255,255,.12)"}40`
                }}
              >
                {b.stage}
              </span>
              {b.prevStage && b.prevStage !== b.stage && (
                <span style={{ fontSize: 11, color: "rgba(255,255,255,.4)" }}>
                  &uarr; from {b.prevStage}
                </span>
              )}
            </div>

            {/* Summary */}
            <p style={{ fontSize: 13, lineHeight: 1.55, color: "rgba(255,255,255,.75)", margin: 0 }}>
              {b.summary}
            </p>

            {/* Next step */}
            <div
              style={{
                padding: "6px 10px",
                borderRadius: 6,
                background: "rgba(230,126,34,.08)",
                border: "1px solid rgba(230,126,34,.2)",
                fontSize: 12,
                color: "#e67e22"
              }}
            >
              <strong>Next:</strong> {b.nextStep}
            </div>

            {/* Footer: activity + owner */}
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginTop: "auto",
                paddingTop: 6,
                borderTop: "1px solid rgba(255,255,255,.06)"
              }}
            >
              <span style={{ fontSize: 11, color: "rgba(255,255,255,.4)" }}>
                <Clock size={10} style={{ verticalAlign: -1, marginRight: 3 }} />
                {daysAgo(b.lastActivity)}
              </span>
              <span style={{ fontSize: 11, color: "rgba(255,255,255,.4)" }}>
                <User size={10} style={{ verticalAlign: -1, marginRight: 3 }} />
                {b.owner}
              </span>
            </div>
          </div>
        ))}
      </div>

      {/* ── How it works ────────────────────────────── */}
      <div
        className="panel"
        style={{
          marginTop: 12,
          padding: "28px 32px",
          border: "1px dashed rgba(255,255,255,.12)"
        }}
      >
        <div style={{ display: "flex", alignItems: "flex-start", gap: 24 }}>
          <Shield size={28} style={{ color: "rgba(255,255,255,.3)", flexShrink: 0, marginTop: 2 }} />
          <div style={{ flex: 1 }}>
            <h3 style={{ margin: "0 0 8px" }}>How Email Sync Works</h3>
            <p className="subdued" style={{ fontSize: 13, lineHeight: 1.6, margin: "0 0 16px" }}>
              Each team member connects their Gmail to Claude (via MCP). When they ask Claude to
              &quot;refresh brand tracker&quot;, it reads their email threads, extracts brand deal
              updates, and pushes the data to this dashboard automatically.
            </p>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12, marginBottom: 16 }}>
              {[
                { step: "01", title: "Connect Gmail in Claude", desc: "Manager & VP add Gmail MCP connector to their Claude workspace" },
                { step: "02", title: "Claude reads emails", desc: "AI scans brand deal threads — NDAs, term sheets, proposals, meetings" },
                { step: "03", title: "Data pushed to Lumara", desc: "Extracted intel appears here with stage, summary, next steps, contacts" }
              ].map(s => (
                <div key={s.step} style={{ padding: "14px 16px", borderRadius: 10, background: "rgba(255,255,255,.04)", border: "1px solid rgba(255,255,255,.08)" }}>
                  <div style={{ fontSize: 20, fontWeight: 700, color: "#e67e22", marginBottom: 6 }}>{s.step}</div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: "rgba(255,255,255,.85)", marginBottom: 4 }}>{s.title}</div>
                  <div style={{ fontSize: 11, color: "rgba(255,255,255,.45)", lineHeight: 1.5 }}>{s.desc}</div>
                </div>
              ))}
            </div>
            <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
              {data.accounts.map(a => (
                <span key={a.email} style={{
                  display: "inline-flex", alignItems: "center", gap: 6,
                  padding: "6px 14px", borderRadius: 8,
                  border: `1px solid ${a.status === "connected" ? "rgba(39,174,96,.4)" : "rgba(230,126,34,.3)"}`,
                  background: a.status === "connected" ? "rgba(39,174,96,.1)" : "rgba(230,126,34,.08)",
                  color: a.status === "connected" ? "#2ecc71" : "#e67e22",
                  fontSize: 12, fontWeight: 600
                }}>
                  <Link2 size={12} />
                  {a.email}
                  <span style={{ opacity: 0.6, fontWeight: 400 }}>({a.label})</span>
                  <span style={{
                    padding: "1px 6px", borderRadius: 6, fontSize: 10,
                    background: a.status === "connected" ? "rgba(39,174,96,.2)" : "rgba(255,255,255,.08)",
                    color: a.status === "connected" ? "#2ecc71" : "rgba(255,255,255,.4)"
                  }}>
                    {a.status === "connected" ? "LIVE" : "PENDING"}
                  </span>
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
