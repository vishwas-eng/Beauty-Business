import { useMemo, useState } from "react";
import { loadStoredDashboard } from "../lib/storage";
import { queryAgent } from "../lib/api";
import { AlertTriangle, Brain, Copy, TrendingDown, TrendingUp, X } from "lucide-react";

// ── Mock revenue data keyed by region × category ──────────────────────────────
const REVENUE_DATA = {
  regions: ["India", "SEA", "GCC", "Global"],
  categories: ["Makeup", "Skincare", "Perfumes", "Haircare", "Men's Grooming", "Sunscreen"],
  byRegion: {
    India:          { revenue: 4_820_000, growth: 18,  brands: 14, topCategory: "Makeup" },
    SEA:            { revenue: 6_340_000, growth: 34,  brands: 9,  topCategory: "Skincare" },
    GCC:            { revenue: 3_110_000, growth: 8,   brands: 7,  topCategory: "Perfumes" },
    Global:         { revenue: 1_280_000, growth: -4,  brands: 4,  topCategory: "Haircare" },
  },
  byCategory: {
    Makeup:          { revenue: 3_920_000, growth: 22,  units: 184_000, returns: 3.1 },
    Skincare:        { revenue: 4_450_000, growth: 29,  units: 201_000, returns: 2.8 },
    Perfumes:        { revenue: 2_640_000, growth: 11,  units: 88_000,  returns: 4.2 },
    Haircare:        { revenue: 1_850_000, growth: 5,   units: 96_000,  returns: 3.6 },
    "Men's Grooming":{ revenue: 1_120_000, growth: 41,  units: 74_000,  returns: 2.1 },
    Sunscreen:       { revenue: 570_000,   growth: -8,  units: 31_000,  returns: 5.9 },
  },
  topSkus: [
    { brand: "Nudestix",   sku: "Nudestix Nudies Blush",           region: "SEA",   revenue: 880_000, growth: 28, units: 42_000 },
    { brand: "Deconstruct",sku: "Deconstruct Brightening Serum",   region: "India", revenue: 720_000, growth: 44, units: 58_000 },
    { brand: "Beardo",     sku: "Beardo Beard Oil Bundle",         region: "India", revenue: 640_000, growth: 61, units: 49_000 },
    { brand: "Anastasia B",sku: "ABH Brow Freeze",                 region: "SEA",   revenue: 590_000, growth: 19, units: 28_000 },
    { brand: "Just Herbs", sku: "Just Herbs Silky Sheen Serum",    region: "India", revenue: 530_000, growth: 33, units: 44_000 },
    { brand: "Ajmal",      sku: "Ajmal Evoke Perfume",             region: "GCC",   revenue: 480_000, growth: 12, units: 19_000 },
    { brand: "Pixi",       sku: "Pixi Glow Tonic",                 region: "SEA",   revenue: 420_000, growth: 21, units: 31_000 },
    { brand: "Elf Beauty", sku: "Elf Power Grip Primer",           region: "SEA",   revenue: 390_000, growth: 15, units: 37_000 },
  ],
  alerts: [
    { region: "Global",     category: "Haircare",   type: "dip",    message: "Revenue down 4% MoM. Low SEO reach in Global market." },
    { region: "India",      category: "Sunscreen",  type: "dip",    message: "Sunscreen sales -8% QoQ — consumers buying summer vs year-round." },
    { region: "GCC",        category: "Makeup",     type: "gap",    message: "GCC Makeup has only 2 active brands but strong category demand signal." },
    { region: "SEA",        category: "Skincare",   type: "surge",  message: "Skincare surging in SEA. +29% growth — opportunity to push more SKUs." },
    { region: "India",      category: "Men's Grooming", type: "surge", message: "Men's Grooming fastest growing segment in India at +41%." },
  ],
};

type Period = "MTD" | "QTD" | "YTD";
const PERIOD_MULTIPLIERS: Record<Period, number> = { MTD: 0.08, QTD: 0.25, YTD: 1 };

function fmt(n: number) {
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `$${(n / 1_000).toFixed(0)}K`;
  return `$${n}`;
}

function fmtUnits(n: number) {
  if (n >= 1000) return `${(n / 1000).toFixed(1)}K`;
  return `${n}`;
}

function GrowthBadge({ growth }: { growth: number }) {
  const up = growth >= 0;
  return (
    <span className={`revenue-growth-badge ${up ? "rev-up" : "rev-down"}`}>
      {up ? <TrendingUp size={11} /> : <TrendingDown size={11} />}
      {up ? "+" : ""}{growth}%
    </span>
  );
}

function RevenueBar({ value, max, color }: { value: number; max: number; color: string }) {
  return (
    <div className="rev-bar-wrap">
      <div className="rev-bar-track">
        <div className="rev-bar-fill" style={{ width: `${(value / max) * 100}%`, background: color }} />
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
export function RevenuePage() {
  const dashboard = useMemo(() => loadStoredDashboard(), []);
  const rows = dashboard.performance ?? [];

  const [period, setPeriod] = useState<Period>("YTD");
  const [tab, setTab] = useState<"regional" | "category" | "skus" | "loop">("regional");
  const [loopText, setLoopText] = useState("");
  const [loopLoading, setLoopLoading] = useState(false);
  const [showLoopModal, setShowLoopModal] = useState(false);
  const [loopCopied, setLoopCopied] = useState(false);

  const multiplier = PERIOD_MULTIPLIERS[period];

  const maxRegionRevenue = Math.max(
    ...Object.values(REVENUE_DATA.byRegion).map(r => r.revenue * multiplier)
  );

  const maxCatRevenue = Math.max(
    ...Object.values(REVENUE_DATA.byCategory).map(c => c.revenue * multiplier)
  );

  const totalRevenue = Object.values(REVENUE_DATA.byRegion).reduce(
    (sum, r) => sum + r.revenue * multiplier, 0
  );

  const regionColors: Record<string, string> = {
    SEA: "#3b82f6",
    India: "#22c55e",
    GCC: "#f59e0b",
    Global: "#8b5cf6",
  };

  const catColors = ["#6366f1", "#14b8a6", "#f59e0b", "#ec4899", "#3b82f6", "#f97316"];

  async function runStrategyLoop() {
    setLoopLoading(true);
    setShowLoopModal(true);

    const alerts = REVENUE_DATA.alerts;
    const dips = alerts.filter(a => a.type === "dip");
    const surges = alerts.filter(a => a.type === "surge");

    const prompt = `You are a strategic revenue analyst for Opptra, an omnichannel beauty operator managing brands across India, SEA, and GCC.

Current performance snapshot:
- Total ${period} Revenue: ${fmt(totalRevenue)}
- Top region: SEA at ${fmt(REVENUE_DATA.byRegion.SEA.revenue * multiplier)} (+34%)
- Underperforming: Global at ${fmt(REVENUE_DATA.byRegion.Global.revenue * multiplier)} (-4%)
- Fastest growing category: Men's Grooming +41%
- Declining category: Sunscreen -8%

Revenue dips detected:
${dips.map(d => `• ${d.region} ${d.category}: ${d.message}`).join("\n")}

Surge opportunities:
${surges.map(s => `• ${s.region} ${s.category}: ${s.message}`).join("\n")}

Pipeline context:
- ${rows.length} active brand opportunities
- Top brands by revenue: Nudestix (SEA), Deconstruct (India), Beardo (India)

As a strategy consultant, provide:
1. "IMMEDIATE PIVOTS" (2-3 specific actions to reverse the dips this quarter)
2. "DOUBLE DOWN" (2-3 areas where we should accelerate investment based on surges)
3. "MOSAIC ASSET UPDATES" (specific product content changes to recommend to the Mosaic team to support the pivots)

Be specific, quantified where possible, and executive-ready.`;

    const res = await queryAgent(prompt);
    setLoopText(res.answer);
    setLoopLoading(false);
  }

  function copyLoop() {
    navigator.clipboard.writeText(loopText);
    setLoopCopied(true);
    setTimeout(() => setLoopCopied(false), 2000);
  }

  return (
    <div className="revenue-page">
      {/* Header */}
      <div className="revenue-header">
        <div>
          <div className="strategy-breadcrumb">Revenue Suite</div>
          <h2 className="strategy-title">Performance & Sales Intelligence</h2>
          <p className="strategy-subtitle">
            Regional revenue velocity, category breakdown, SKU performance, and AI-powered strategy pivots.
          </p>
        </div>
        <div className="rev-period-selector">
          {(["MTD", "QTD", "YTD"] as Period[]).map(p => (
            <button
              key={p}
              className={`rev-period-btn ${period === p ? "is-active" : ""}`}
              onClick={() => setPeriod(p)}
            >{p}</button>
          ))}
        </div>
      </div>

      {/* Top KPIs */}
      <div className="revenue-kpi-row">
        <div className="revenue-kpi">
          <span className="rev-kpi-label">Total Revenue</span>
          <span className="rev-kpi-value">{fmt(totalRevenue)}</span>
          <GrowthBadge growth={19} />
        </div>
        <div className="revenue-kpi">
          <span className="rev-kpi-label">Top Region</span>
          <span className="rev-kpi-value rev-kpi-blue">SEA</span>
          <GrowthBadge growth={34} />
        </div>
        <div className="revenue-kpi">
          <span className="rev-kpi-label">Top Category</span>
          <span className="rev-kpi-value rev-kpi-teal">Skincare</span>
          <GrowthBadge growth={29} />
        </div>
        <div className="revenue-kpi">
          <span className="rev-kpi-label">Fastest Growing</span>
          <span className="rev-kpi-value rev-kpi-green">Men's</span>
          <GrowthBadge growth={41} />
        </div>
        <div className="revenue-kpi rev-kpi-alert">
          <span className="rev-kpi-label">Needs Attention</span>
          <span className="rev-kpi-value rev-kpi-red">Sunscreen</span>
          <GrowthBadge growth={-8} />
        </div>
      </div>

      {/* Tabs */}
      <div className="intel-tabs">
        <button className={`intel-tab ${tab === "regional" ? "is-active" : ""}`} onClick={() => setTab("regional")}>Regional Velocity</button>
        <button className={`intel-tab ${tab === "category" ? "is-active" : ""}`} onClick={() => setTab("category")}>Category Breakdown</button>
        <button className={`intel-tab ${tab === "skus" ? "is-active" : ""}`} onClick={() => setTab("skus")}>Top SKUs</button>
        <button className={`intel-tab ${tab === "loop" ? "is-active" : ""}`} onClick={() => setTab("loop")}>
          <Brain size={13} /> Strategy Loop
          <span className="intel-tab-count" style={{ background: "#ef4444" }}>
            {REVENUE_DATA.alerts.filter(a => a.type === "dip").length}
          </span>
        </button>
      </div>

      {/* ── Regional Velocity ── */}
      {tab === "regional" && (
        <div className="panel rev-panel">
          <div className="panel-header">
            <h3>Revenue by Region — {period}</h3>
            <p>Comparing launch market performance across {Object.keys(REVENUE_DATA.byRegion).length} regions.</p>
          </div>
          <div className="rev-region-list">
            {Object.entries(REVENUE_DATA.byRegion)
              .sort((a, b) => b[1].revenue - a[1].revenue)
              .map(([region, data]) => (
                <div key={region} className="rev-region-row">
                  <div className="rev-region-info">
                    <div className="rev-region-name">{region}</div>
                    <div className="rev-region-meta">{data.brands} brands · Top: {data.topCategory}</div>
                  </div>
                  <div className="rev-region-bar-wrap">
                    <RevenueBar
                      value={data.revenue * multiplier}
                      max={maxRegionRevenue}
                      color={regionColors[region] ?? "#6366f1"}
                    />
                  </div>
                  <div className="rev-region-numbers">
                    <span className="rev-region-revenue">{fmt(data.revenue * multiplier)}</span>
                    <GrowthBadge growth={data.growth} />
                  </div>
                </div>
              ))}
          </div>

          {/* Region share donut-style legend */}
          <div className="rev-region-share">
            {Object.entries(REVENUE_DATA.byRegion).map(([region, data]) => {
              const pct = Math.round((data.revenue / Object.values(REVENUE_DATA.byRegion).reduce((s, r) => s + r.revenue, 0)) * 100);
              return (
                <div key={region} className="rev-share-item">
                  <div className="rev-share-bar" style={{ height: `${pct * 1.2}px`, background: regionColors[region] ?? "#6366f1" }} />
                  <span className="rev-share-label">{region}</span>
                  <span className="rev-share-pct">{pct}%</span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── Category Breakdown ── */}
      {tab === "category" && (
        <div className="panel rev-panel">
          <div className="panel-header">
            <h3>Revenue by Category — {period}</h3>
            <p>Product category performance with growth signals and return rates.</p>
          </div>
          <div className="rev-cat-table">
            <div className="rev-cat-header">
              <span>Category</span>
              <span>Revenue</span>
              <span>Growth</span>
              <span>Units Sold</span>
              <span>Return Rate</span>
              <span>Bar</span>
            </div>
            {Object.entries(REVENUE_DATA.byCategory)
              .sort((a, b) => b[1].revenue - a[1].revenue)
              .map(([cat, data], i) => (
                <div key={cat} className="rev-cat-row">
                  <div className="rev-cat-name">
                    <span className="rev-cat-dot" style={{ background: catColors[i] }} />
                    {cat}
                  </div>
                  <span className="rev-cat-val">{fmt(data.revenue * multiplier)}</span>
                  <GrowthBadge growth={data.growth} />
                  <span className="rev-cat-units">{fmtUnits(Math.round(data.units * multiplier))}</span>
                  <span className={`rev-cat-returns ${data.returns > 5 ? "rev-down" : ""}`}>{data.returns}%</span>
                  <RevenueBar value={data.revenue * multiplier} max={maxCatRevenue} color={catColors[i]} />
                </div>
              ))}
          </div>
        </div>
      )}

      {/* ── Top SKUs ── */}
      {tab === "skus" && (
        <div className="panel rev-panel">
          <div className="panel-header">
            <h3>Top Performing SKUs — {period}</h3>
            <p>Best-selling products from your live brand portfolio.</p>
          </div>
          <div className="rev-sku-table">
            <div className="rev-sku-header">
              <span>#</span>
              <span>Brand</span>
              <span>SKU</span>
              <span>Region</span>
              <span>Revenue</span>
              <span>Units</span>
              <span>Growth</span>
            </div>
            {REVENUE_DATA.topSkus.map((sku, i) => (
              <div key={sku.sku} className="rev-sku-row">
                <span className="rev-sku-rank">#{i + 1}</span>
                <span className="rev-sku-brand">{sku.brand}</span>
                <span className="rev-sku-name">{sku.sku}</span>
                <span className="rev-sku-region" style={{ color: regionColors[sku.region] ?? "#64748b" }}>{sku.region}</span>
                <span className="rev-sku-revenue">{fmt(sku.revenue * multiplier)}</span>
                <span className="rev-sku-units">{fmtUnits(Math.round(sku.units * multiplier))}</span>
                <GrowthBadge growth={sku.growth} />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Strategy Loop ── */}
      {tab === "loop" && (
        <div className="rev-loop-wrap">
          <div className="panel rev-loop-alerts">
            <div className="panel-header">
              <h3>Revenue Signals</h3>
              <p>AI-detected performance anomalies and surge opportunities.</p>
            </div>
            {REVENUE_DATA.alerts.map((alert, i) => (
              <div key={i} className={`rev-alert-row rev-alert-${alert.type}`}>
                <AlertTriangle size={14} className="rev-alert-icon" />
                <div>
                  <div className="rev-alert-title">
                    {alert.region} · {alert.category}
                    <span className={`rev-alert-badge rev-badge-${alert.type}`}>
                      {alert.type === "dip" ? "Dip" : alert.type === "surge" ? "Surge" : "Gap"}
                    </span>
                  </div>
                  <div className="rev-alert-msg">{alert.message}</div>
                </div>
              </div>
            ))}
          </div>

          <div className="rev-loop-cta panel">
            <div className="rev-loop-icon"><Brain size={28} /></div>
            <h3>Strategy Loop</h3>
            <p>Claude analyzes the revenue signals above and generates concrete pivot recommendations — including asset changes to feed back into Mosaic.</p>
            <button className="btn-primary rev-loop-btn" onClick={runStrategyLoop} disabled={loopLoading}>
              <Brain size={15} /> {loopLoading ? "Analyzing..." : "Run Strategy Loop"}
            </button>
          </div>
        </div>
      )}

      {/* Strategy Loop Modal */}
      {showLoopModal && (
        <div className="brief-modal-overlay" onClick={() => setShowLoopModal(false)}>
          <div className="brief-modal" onClick={e => e.stopPropagation()}>
            <div className="brief-modal-header">
              <div>
                <h3>Strategy Loop — Revenue Pivot Recommendations</h3>
                <p style={{ color: "#64748b", fontSize: "0.8rem", margin: 0 }}>AI-generated · {period} data · Powered by Claude</p>
              </div>
              <div style={{ display: "flex", gap: 8 }}>
                {loopText && (
                  <button className="btn-secondary" onClick={copyLoop} style={{ gap: 6 }}>
                    <Copy size={13} />{loopCopied ? "Copied!" : "Copy"}
                  </button>
                )}
                <button className="btn-ghost" onClick={() => setShowLoopModal(false)}><X size={16} /></button>
              </div>
            </div>
            <div className="brief-body">
              {loopLoading ? (
                <div className="brief-loading"><div className="brief-spinner" /><p>Running strategy analysis...</p></div>
              ) : (
                <div className="brief-text">{loopText}</div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
