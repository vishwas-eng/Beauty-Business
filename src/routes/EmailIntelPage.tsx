import { useEffect, useState } from "react";
import {
  Mail,
  RefreshCw,
  ArrowUpRight,
  Clock,
  User,
  TrendingUp,
  Flame,
  Zap,
  Target,
  Users,
  Calendar,
  ChevronRight,
  ExternalLink,
  Globe,
  Briefcase,
  Activity,
  BarChart3,
  AlertCircle
} from "lucide-react";

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

const STAGE_ORDER = ["Leads", "MQL", "SQL", "Commercials", "OD", "Contract", "Onboarding"];

const STAGE_CONFIG: Record<string, { color: string; bg: string; border: string }> = {
  Leads:       { color: "#60a5fa", bg: "rgba(96,165,250,.12)",  border: "rgba(96,165,250,.25)" },
  MQL:         { color: "#38bdf8", bg: "rgba(56,189,248,.12)",  border: "rgba(56,189,248,.25)" },
  SQL:         { color: "#a78bfa", bg: "rgba(167,139,250,.12)", border: "rgba(167,139,250,.25)" },
  Commercials: { color: "#fb923c", bg: "rgba(251,146,60,.12)",  border: "rgba(251,146,60,.25)" },
  OD:          { color: "#f97316", bg: "rgba(249,115,22,.12)",  border: "rgba(249,115,22,.25)" },
  Contract:    { color: "#34d399", bg: "rgba(52,211,153,.12)",  border: "rgba(52,211,153,.25)" },
  Onboarding:  { color: "#22c55e", bg: "rgba(34,197,94,.12)",   border: "rgba(34,197,94,.25)" },
  Hold:        { color: "#94a3b8", bg: "rgba(148,163,184,.12)", border: "rgba(148,163,184,.25)" },
  Reject:      { color: "#f87171", bg: "rgba(248,113,113,.12)", border: "rgba(248,113,113,.25)" },
  Active:      { color: "#2dd4bf", bg: "rgba(45,212,191,.12)", border: "rgba(45,212,191,.25)" },
};

function getStageStyle(stage: string) {
  return STAGE_CONFIG[stage] || { color: "#94a3b8", bg: "rgba(148,163,184,.1)", border: "rgba(148,163,184,.2)" };
}

const HEAT_CONFIG = {
  hot:  { color: "#f97316", bg: "rgba(249,115,22,.1)", icon: Flame, label: "Hot" },
  warm: { color: "#eab308", bg: "rgba(234,179,8,.1)",  icon: Zap,   label: "Warm" },
  cold: { color: "#60a5fa", bg: "rgba(96,165,250,.1)", icon: Target, label: "Cold" },
};

function daysAgo(dateStr: string): string {
  const diff = Math.floor(
    (Date.now() - new Date(dateStr).getTime()) / (1000 * 60 * 60 * 24)
  );
  if (diff <= 0) return "Today";
  if (diff === 1) return "Yesterday";
  return `${diff}d ago`;
}

function stageIndex(stage: string) {
  const i = STAGE_ORDER.indexOf(stage);
  return i >= 0 ? i : -1;
}

/* ── Fallback data for local dev ───────────────────────── */

const FALLBACK_DATA: EmailIntelPayload = {
  brands: [
    { brand: "Nudestix", category: "Makeup", segment: "Premium", markets: ["SEA"], stage: "Commercials", prevStage: "SQL", heat: "hot", lastActivity: "2026-03-26", summary: "Term sheet updated & shared. Christopher Taylor (Regional Brand Director) responded positively. Item master sheet sent to operations team. Deal advancing toward final alignment.", nextStep: "Await Sigalit/team alignment on term sheet", contacts: [{ name: "Christopher Taylor", role: "Regional Brand Director", company: "Nudestix" }, { name: "Pooja Dhawan", role: "VP Beauty", company: "Opptra" }], threadId: "19d28adddae66f3e", owner: "Richa Gupta" },
    { brand: "Ajmal", category: "Perfumes", segment: "Masstige", markets: ["SEA"], stage: "OD", prevStage: "Commercials", heat: "hot", lastActivity: "2026-04-12", summary: "NDA details requested from Biswarup Bhattacharya (Ajmal). Richa sent NDA for priority signing. Deal gaining momentum.", nextStep: "Finalize NDA signing, advance to commercials", contacts: [{ name: "Biswarup Bhattacharya", role: "Business Development", company: "Ajmal" }, { name: "Richa Gupta", role: "Manager", company: "Opptra" }], threadId: "19d7f9ac1c508c81", owner: "Richa Gupta" },
    { brand: "D'You", category: "Skincare", segment: "Premium", markets: ["SEA", "GCC", "India"], stage: "SQL", prevStage: "MQL", heat: "hot", lastActivity: "2026-04-16", summary: "NDA signed Mar 3. Brand details shared Apr 8 via Parmeet Kaur (Intl Growth). Proposal presented Apr 15 at 5PM meeting. Deck sent to Parmeet Apr 16. Awaiting brand's response.", nextStep: "Follow up on proposal — awaiting D'You response", contacts: [{ name: "Parmeet Kaur", role: "International Growth & Expansion", company: "D'You" }, { name: "Vitika Agrawal", role: "Co-founder", company: "D'You" }], threadId: "19c99868e18743ed", owner: "Richa Gupta" },
    { brand: "Beardo", category: "Mens' Grooming", segment: "Masstige", markets: ["SEA", "GCC"], stage: "SQL", prevStage: "MQL", heat: "hot", lastActivity: "2026-04-17", summary: "NDA being finalized. Proposal ready. Apr 17: Marico's Ankit Mittal proposed meeting slots — Apr 23 after 6:30 PM or Apr 24 before 10:30 AM.", nextStep: "Confirm meeting slot (Apr 23/24) with Marico", contacts: [{ name: "Ankit Mittal", role: "VP - Modern Trade & Exports", company: "Marico/Beardo" }, { name: "Ankit Porwal", role: "VP", company: "Marico" }], threadId: "19d1ebf4aa14324e", owner: "Richa Gupta" },
    { brand: "Just Herbs", category: "Skincare (Ayurveda)", segment: "Masstige", markets: ["SEA", "GCC"], stage: "SQL", prevStage: "MQL", heat: "hot", lastActivity: "2026-04-17", summary: "Same Marico thread as Beardo — proposal ready, meeting slots proposed for Apr 23/24. Brand deck received via WeTransfer Apr 6.", nextStep: "Confirm meeting slot (Apr 23/24) with Marico", contacts: [{ name: "Ankit Mittal", role: "VP - Modern Trade & Exports", company: "Marico" }, { name: "Siddhartha Roy", role: "Business Head", company: "Marico" }], threadId: "19d1ebf4aa14324e", owner: "Richa Gupta" },
    { brand: "Inde Wild", category: "Skincare", segment: "Premium", markets: ["SEA", "GCC", "India"], stage: "SQL", prevStage: "MQL", heat: "warm", lastActivity: "2026-04-15", summary: "NDA redline version received Apr 15 from Mahesh Panse (inde wild) with legal team comments. Richa asked Vishwas to send to Palak for legal review.", nextStep: "Review NDA redline with Palak, schedule proposal meeting", contacts: [{ name: "Mahesh Panse", role: "Business Head", company: "inde wild" }, { name: "Oleg Kossov", role: "Co-founder", company: "inde wild" }], threadId: "19d9055ec09368b1", owner: "Richa Gupta" },
  ],
  accounts: [
    { email: "richa@opptra.com", role: "Manager", status: "connected", label: "Beauty BD Manager" },
    { email: "pooja@opptra.com", role: "VP", status: "connected", label: "VP Beauty" }
  ],
  lastRefreshed: "2026-04-20T10:00:00Z",
  meta: { total: 6, hot: 5, warm: 1, cold: 0 }
};

/* ── Component ─────────────────────────────────────────── */

export function EmailIntelPage() {
  const [data, setData] = useState<EmailIntelPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState<HeatFilter>("all");
  const [expandedBrand, setExpandedBrand] = useState<string | null>(null);

  async function load() {
    try {
      const res = await fetch(API_URL);
      const ct = res.headers.get("content-type") || "";
      if (ct.includes("application/json")) {
        const json: EmailIntelPayload = await res.json();
        setData(json);
      } else {
        // Fallback for local dev where API isn't running
        setData(FALLBACK_DATA);
      }
    } catch {
      setData(FALLBACK_DATA);
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
    } catch { /* noop */ }
    finally { setRefreshing(false); }
  }

  useEffect(() => { void load(); }, []);

  if (loading || !data) {
    return (
      <div className="ei-page">
        <div className="ei-loader">
          <div className="ei-loader-pulse" />
          <span>Loading email intelligence...</span>
        </div>
      </div>
    );
  }

  const transitions = data.brands
    .filter((b) => b.prevStage && b.prevStage !== b.stage)
    .map((b) => ({ brand: b.brand, from: b.prevStage, to: b.stage }));

  const filtered =
    filter === "all" ? data.brands : data.brands.filter((b) => b.heat === filter);

  const allContacts = data.brands.flatMap(b => b.contacts);
  const uniqueCompanies = new Set(allContacts.map(c => c.company)).size;

  // Stage distribution for mini chart
  const stageDistribution = STAGE_ORDER.map(s => ({
    stage: s,
    count: data.brands.filter(b => b.stage === s).length
  })).filter(s => s.count > 0);

  return (
    <div className="ei-page">
      {/* ── Header ──────────────────────────────────────── */}
      <div className="ei-header">
        <div className="ei-header-left">
          <div className="ei-logo-row">
            <div className="ei-logo-icon">
              <Mail size={20} />
            </div>
            <div>
              <h1 className="ei-title">Email Intelligence</h1>
              <p className="ei-subtitle">AI-extracted brand deal insights from connected accounts</p>
            </div>
          </div>
        </div>
        <div className="ei-header-right">
          <div className="ei-last-updated">
            <Clock size={12} />
            <span>Updated {new Date(data.lastRefreshed).toLocaleDateString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}</span>
          </div>
          <button className="ei-refresh-btn" onClick={handleRefresh} disabled={refreshing} type="button">
            <RefreshCw size={14} className={refreshing ? "ei-spin" : ""} />
            {refreshing ? "Syncing..." : "Sync"}
          </button>
        </div>
      </div>

      {/* ── Connected Accounts Strip ────────────────────── */}
      <div className="ei-accounts-strip">
        {data.accounts.map((a) => (
          <div key={a.email} className={`ei-account-chip ${a.status}`}>
            <div className="ei-account-dot" />
            <span className="ei-account-email">{a.email}</span>
            <span className="ei-account-role">{a.label}</span>
          </div>
        ))}
      </div>

      {/* ── KPI Row ─────────────────────────────────────── */}
      <div className="ei-kpi-row">
        <div className="ei-kpi">
          <div className="ei-kpi-icon" style={{ background: "rgba(99,102,241,.12)", color: "#818cf8" }}>
            <BarChart3 size={18} />
          </div>
          <div className="ei-kpi-body">
            <span className="ei-kpi-value">{data.meta.total}</span>
            <span className="ei-kpi-label">Active Brands</span>
          </div>
        </div>
        <div className="ei-kpi">
          <div className="ei-kpi-icon" style={{ background: "rgba(249,115,22,.12)", color: "#fb923c" }}>
            <Flame size={18} />
          </div>
          <div className="ei-kpi-body">
            <span className="ei-kpi-value">{data.meta.hot}</span>
            <span className="ei-kpi-label">Hot Deals</span>
          </div>
        </div>
        <div className="ei-kpi">
          <div className="ei-kpi-icon" style={{ background: "rgba(34,197,94,.12)", color: "#4ade80" }}>
            <TrendingUp size={18} />
          </div>
          <div className="ei-kpi-body">
            <span className="ei-kpi-value">{transitions.length}</span>
            <span className="ei-kpi-label">Stage Moves</span>
          </div>
        </div>
        <div className="ei-kpi">
          <div className="ei-kpi-icon" style={{ background: "rgba(56,189,248,.12)", color: "#38bdf8" }}>
            <Users size={18} />
          </div>
          <div className="ei-kpi-body">
            <span className="ei-kpi-value">{uniqueCompanies}</span>
            <span className="ei-kpi-label">Companies</span>
          </div>
        </div>
      </div>

      {/* ── Pipeline Funnel ─────────────────────────────── */}
      <div className="ei-funnel">
        <div className="ei-funnel-label">
          <Activity size={12} />
          Pipeline Distribution
        </div>
        <div className="ei-funnel-bar">
          {stageDistribution.map(s => {
            const style = getStageStyle(s.stage);
            const pct = Math.max((s.count / data.meta.total) * 100, 8);
            return (
              <div
                key={s.stage}
                className="ei-funnel-segment"
                style={{ width: `${pct}%`, background: style.color }}
                title={`${s.stage}: ${s.count}`}
              >
                <span className="ei-funnel-segment-label">{s.stage}</span>
                <span className="ei-funnel-segment-count">{s.count}</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* ── Stage Transitions ───────────────────────────── */}
      {transitions.length > 0 && (
        <div className="ei-transitions">
          <div className="ei-transitions-label">
            <TrendingUp size={13} />
            Recent Stage Moves
          </div>
          <div className="ei-transitions-list">
            {transitions.map((t, i) => {
              const fromStyle = getStageStyle(t.from);
              const toStyle = getStageStyle(t.to);
              const isUpgrade = stageIndex(t.to) > stageIndex(t.from);
              return (
                <div key={`${t.brand}-${i}`} className="ei-transition-chip">
                  <span className="ei-transition-brand">{t.brand}</span>
                  <span className="ei-stage-pill" style={{ color: fromStyle.color, background: fromStyle.bg, borderColor: fromStyle.border }}>{t.from}</span>
                  <ChevronRight size={12} style={{ opacity: 0.4 }} />
                  <span className="ei-stage-pill" style={{ color: toStyle.color, background: toStyle.bg, borderColor: toStyle.border }}>{t.to}</span>
                  {isUpgrade && <ArrowUpRight size={12} style={{ color: "#4ade80" }} />}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── Heat Filter ─────────────────────────────────── */}
      <div className="ei-filter-row">
        {(["all", "hot", "warm", "cold"] as HeatFilter[]).map(f => {
          const count = f === "all" ? data.meta.total : data.meta[f];
          const isActive = filter === f;
          const cfg = f !== "all" ? HEAT_CONFIG[f] : null;
          return (
            <button
              key={f}
              type="button"
              className={`ei-filter-btn ${isActive ? "active" : ""} ${f}`}
              onClick={() => setFilter(f)}
            >
              {cfg && <cfg.icon size={13} />}
              <span>{f === "all" ? "All Brands" : cfg!.label}</span>
              <span className="ei-filter-count">{count}</span>
            </button>
          );
        })}
      </div>

      {/* ── Brand Cards ─────────────────────────────────── */}
      <div className="ei-cards-grid">
        {filtered.map((b) => {
          const heatCfg = HEAT_CONFIG[b.heat];
          const stageCfg = getStageStyle(b.stage);
          const isExpanded = expandedBrand === b.brand;
          const HeatIcon = heatCfg.icon;

          return (
            <div
              key={b.brand}
              className={`ei-brand-card ${b.heat} ${isExpanded ? "expanded" : ""}`}
              onClick={() => setExpandedBrand(isExpanded ? null : b.brand)}
            >
              {/* Card Header */}
              <div className="ei-card-header">
                <div className="ei-card-title-row">
                  <h3 className="ei-card-brand">{b.brand}</h3>
                  <div className="ei-heat-badge" style={{ color: heatCfg.color, background: heatCfg.bg }}>
                    <HeatIcon size={12} />
                    {heatCfg.label}
                  </div>
                </div>
                <div className="ei-card-meta">
                  <span><Briefcase size={11} /> {b.category}</span>
                  <span className="ei-meta-dot" />
                  <span>{b.segment}</span>
                  <span className="ei-meta-dot" />
                  <span><Globe size={11} /> {b.markets.join(", ")}</span>
                </div>
              </div>

              {/* Stage */}
              <div className="ei-card-stage-row">
                <span
                  className="ei-stage-badge"
                  style={{ color: stageCfg.color, background: stageCfg.bg, borderColor: stageCfg.border }}
                >
                  {b.stage}
                </span>
                {b.prevStage && b.prevStage !== b.stage && (
                  <span className="ei-stage-move">
                    <ArrowUpRight size={11} />
                    from {b.prevStage}
                  </span>
                )}
              </div>

              {/* AI Summary */}
              <div className="ei-card-summary">
                <p>{b.summary}</p>
              </div>

              {/* Next Step */}
              <div className="ei-card-nextstep">
                <AlertCircle size={12} />
                <span><strong>Next:</strong> {b.nextStep}</span>
              </div>

              {/* Expanded: Contacts */}
              {isExpanded && (
                <div className="ei-card-contacts">
                  <div className="ei-contacts-label">
                    <Users size={12} />
                    Key Contacts
                  </div>
                  {b.contacts.map((c, ci) => (
                    <div key={ci} className="ei-contact-row">
                      <div className="ei-contact-avatar">{c.name[0]}</div>
                      <div className="ei-contact-info">
                        <span className="ei-contact-name">{c.name}</span>
                        <span className="ei-contact-role">{c.role} at {c.company}</span>
                      </div>
                    </div>
                  ))}
                  <div className="ei-thread-link">
                    <ExternalLink size={11} />
                    Thread ID: {b.threadId}
                  </div>
                </div>
              )}

              {/* Footer */}
              <div className="ei-card-footer">
                <span className="ei-card-date">
                  <Calendar size={11} />
                  {daysAgo(b.lastActivity)}
                </span>
                <span className="ei-card-owner">
                  <User size={11} />
                  {b.owner}
                </span>
                <span className="ei-card-expand-hint">
                  {isExpanded ? "Less" : "Details"} <ChevronRight size={11} className={isExpanded ? "ei-chevron-down" : ""} />
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {/* ── How It Works ────────────────────────────────── */}
      <div className="ei-how-section">
        <h3 className="ei-how-title">
          <Zap size={16} />
          How Email Intelligence Works
        </h3>
        <div className="ei-how-steps">
          {[
            { num: "01", title: "Connect Gmail in Claude", desc: "Team members add Gmail MCP connector to their Claude workspace", icon: Mail },
            { num: "02", title: "AI Extracts Deal Intel", desc: "Claude reads email threads — NDAs, term sheets, proposals, meetings — and structures the data", icon: Activity },
            { num: "03", title: "Insights Appear Here", desc: "Brand stage, contacts, next steps, and AI summaries update in real-time", icon: BarChart3 },
          ].map(s => (
            <div key={s.num} className="ei-how-step">
              <div className="ei-how-step-num">{s.num}</div>
              <s.icon size={20} className="ei-how-step-icon" />
              <h4>{s.title}</h4>
              <p>{s.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
