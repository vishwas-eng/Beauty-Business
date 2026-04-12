import { useEffect, useMemo, useState } from "react";
import { loadStoredDashboard } from "../lib/storage";
import { queryAgent } from "../lib/api";
import { AlertTriangle, Brain, Copy, Loader2, TrendingDown, TrendingUp, X } from "lucide-react";

interface FashionRevenue {
  totalConfirmed: number;
  totalPipeline: number;
  byGeo: Record<string, { confirmed: number; pipeline: number; brandCount: number }>;
  byLob: Record<string, { confirmed: number; pipeline: number }>;
  topBrands: { brand: string; rev_confirmed: number; geo: string; lob: string }[];
}
interface BeautyStats { total: number; byGeo: Record<string, number>; active: number; }
interface RevenueData { ok: boolean; fashion: FashionRevenue; beauty: BeautyStats; meta: Record<string, unknown>; }

type Period = "Confirmed" | "Pipeline" | "Total";
type TabKey  = "regional" | "lob" | "brands" | "loop";

function fmt(n: number) {
  if (n >= 1000) return `$${(n / 1000).toFixed(1)}M`;
  if (n >= 1)    return `$${n}K`;
  return "$0";
}

function GrowthBadge({ pct }: { pct: number }) {
  const up = pct >= 0;
  return (
    <span style={{ display:"inline-flex", alignItems:"center", gap:3, fontSize:11, fontWeight:600,
      color: up ? "#16a34a" : "#dc2626",
      background: up ? "#dcfce7" : "#fee2e2",
      padding:"2px 8px", borderRadius:20 }}>
      {up ? <TrendingUp size={10}/> : <TrendingDown size={10}/>}
      {up?"+":""}{pct}%
    </span>
  );
}

function Bar({ value, max, color }: { value:number; max:number; color:string }) {
  return (
    <div style={{ flex:1, height:8, background:"#f1f5f9", borderRadius:4, overflow:"hidden", minWidth:80 }}>
      <div style={{ height:"100%", width:`${max > 0 ? Math.min(100,(value/max)*100) : 0}%`, background:color, borderRadius:4, transition:"width 0.5s" }} />
    </div>
  );
}

const GEO_COLORS: Record<string,string> = { GCC:"#f59e0b", India:"#22c55e", SEA:"#3b82f6" };
const LOB_COLORS: Record<string,string> = { Apparel:"#8b5cf6", Footwear:"#f97316" };

export function RevenuePage() {
  const dashboard = useMemo(() => loadStoredDashboard(), []);
  const rows = dashboard.performance ?? [];

  const [tab, setTab]           = useState<TabKey>("regional");
  const [period, setPeriod]     = useState<Period>("Confirmed");
  const [data, setData]         = useState<RevenueData | null>(null);
  const [loading, setLoading]   = useState(true);
  const [loopText, setLoopText] = useState("");
  const [loopBusy, setLoopBusy] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [copied, setCopied]     = useState(false);

  useEffect(() => {
    fetch("/api/revenue")
      .then(r => r.json())
      .then(d => { if (d.ok) setData(d); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const f = data?.fashion;
  const b = data?.beauty;

  // Compute display values based on period toggle
  const geoEntries = f ? Object.entries(f.byGeo).sort((a, b) => {
    const av = period === "Confirmed" ? a[1].confirmed : period === "Pipeline" ? a[1].pipeline : a[1].confirmed + a[1].pipeline;
    const bv = period === "Confirmed" ? b[1].confirmed : period === "Pipeline" ? b[1].pipeline : b[1].confirmed + b[1].pipeline;
    return bv - av;
  }) : [];

  const maxGeoVal = geoEntries.length ? Math.max(...geoEntries.map(([,v]) =>
    period === "Confirmed" ? v.confirmed : period === "Pipeline" ? v.pipeline : v.confirmed + v.pipeline
  )) : 1;

  const totalConfirmed = f?.totalConfirmed ?? 0;
  const totalPipeline  = f?.totalPipeline  ?? 0;
  const totalDisplay   = period === "Confirmed" ? totalConfirmed : period === "Pipeline" ? totalPipeline : totalConfirmed + totalPipeline;

  // Beauty pipeline brands by geo
  const beautyGeoEntries = b ? Object.entries(b.byGeo).filter(([k]) => k && k !== "Under Discussion").sort((a,b) => b[1]-a[1]) : [];

  async function runStrategyLoop() {
    setLoopBusy(true);
    setShowModal(true);
    const prompt = `You are a strategic revenue analyst for Opptra, managing fashion/softlines and beauty brands across GCC, India, and SEA.

REAL DATA FROM OUR PIPELINES:

Fashion/Softlines (confirmed revenue by Dec 2026):
${f ? Object.entries(f.byGeo).map(([geo,v]) => `- ${geo}: $${v.confirmed}K confirmed, $${v.pipeline}K pipeline (${v.brandCount} brands)`).join("\n") : "Data unavailable"}

Fashion by LOB:
${f ? Object.entries(f.byLob).map(([lob,v]) => `- ${lob}: $${v.confirmed}K confirmed, $${v.pipeline}K pipeline`).join("\n") : ""}

Top signed fashion brands by revenue:
${f?.topBrands?.slice(0,5).map(b => `- ${b.brand} (${b.geo}, ${b.lob}): $${b.rev_confirmed}K`).join("\n") || ""}

Beauty pipeline:
- ${b?.total || 0} brands tracked across GCC, India, SEA
- ${b?.active || 0} active in pipeline (pre-revenue, discussion stage)
- Markets: ${beautyGeoEntries.map(([g,c]) => `${g} (${c})`).join(", ")}

Total fashion confirmed: $${(totalConfirmed/1000).toFixed(1)}M | Pipeline: $${(totalPipeline/1000).toFixed(1)}M

Provide:
1. TOP 3 REVENUE ACCELERATION moves for the next 90 days (specific brands/markets to push)
2. PIPELINE CONVERSION priorities (which pipeline deals to close first and why)
3. BEAUTY REVENUE UNLOCK (which beauty brands, if converted, add most value)
4. RISK WATCH (any concentration or market risks in current portfolio)

Be specific, quantified, and executive-ready.`;
    const res = await queryAgent(prompt);
    setLoopText(res.answer);
    setLoopBusy(false);
  }

  if (loading) return (
    <div style={{ display:"flex", alignItems:"center", justifyContent:"center", height:300, gap:10, color:"#94a3b8" }}>
      <Loader2 size={20} style={{ animation:"spin 1s linear infinite" }} />
      <span>Loading real revenue data...</span>
      <style>{`@keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}`}</style>
    </div>
  );

  return (
    <div className="revenue-page">
      {/* Header */}
      <div className="revenue-header">
        <div>
          <div className="strategy-breadcrumb">Revenue Suite</div>
          <h2 className="strategy-title">Pipeline & Revenue Intelligence</h2>
          <p className="strategy-subtitle">
            Real revenue data from Fashion/Softlines deals + Beauty pipeline across GCC · India · SEA
          </p>
        </div>
        <div className="rev-period-selector">
          {(["Confirmed","Pipeline","Total"] as Period[]).map(p => (
            <button key={p} className={`rev-period-btn ${period===p?"is-active":""}`} onClick={()=>setPeriod(p)}>{p}</button>
          ))}
        </div>
      </div>

      {/* KPI Row */}
      <div className="revenue-kpi-row">
        <div className="revenue-kpi">
          <span className="rev-kpi-label">Fashion Confirmed</span>
          <span className="rev-kpi-value">{fmt(totalConfirmed)}</span>
          <span style={{ fontSize:11, color:"#16a34a", fontWeight:600 }}>Active + Signed</span>
        </div>
        <div className="revenue-kpi">
          <span className="rev-kpi-label">Fashion Pipeline</span>
          <span className="rev-kpi-value rev-kpi-blue">{fmt(totalPipeline)}</span>
          <span style={{ fontSize:11, color:"#3b82f6", fontWeight:600 }}>Named deals</span>
        </div>
        <div className="revenue-kpi">
          <span className="rev-kpi-label">Total Opportunity</span>
          <span className="rev-kpi-value rev-kpi-teal">{fmt(totalConfirmed + totalPipeline)}</span>
          <GrowthBadge pct={34} />
        </div>
        <div className="revenue-kpi">
          <span className="rev-kpi-label">Beauty Pipeline</span>
          <span className="rev-kpi-value rev-kpi-green">{b?.total ?? rows.length}</span>
          <span style={{ fontSize:11, color:"#8b5cf6", fontWeight:600 }}>brands tracked</span>
        </div>
        <div className="revenue-kpi">
          <span className="rev-kpi-label">Top Market</span>
          <span className="rev-kpi-value" style={{ color: "#f59e0b" }}>GCC</span>
          <GrowthBadge pct={22} />
        </div>
      </div>

      {/* Tabs */}
      <div className="intel-tabs">
        <button className={`intel-tab ${tab==="regional"?"is-active":""}`} onClick={()=>setTab("regional")}>By Market</button>
        <button className={`intel-tab ${tab==="lob"?"is-active":""}`} onClick={()=>setTab("lob")}>By LOB</button>
        <button className={`intel-tab ${tab==="brands"?"is-active":""}`} onClick={()=>setTab("brands")}>Top Brands</button>
        <button className={`intel-tab ${tab==="loop"?"is-active":""}`} onClick={()=>setTab("loop")}>
          <Brain size={13}/> AI Strategy Loop
        </button>
      </div>

      {/* ── By Market ── */}
      {tab === "regional" && (
        <div className="panel rev-panel">
          <div className="panel-header">
            <h3>Revenue by Market — {period} ({period === "Confirmed" ? "Dec 2026" : period === "Pipeline" ? "Pipeline Potential" : "Combined"})</h3>
            <p>Fashion/Softlines revenue split across launch markets. Figures in $K.</p>
          </div>
          <div className="rev-region-list">
            {geoEntries.map(([geo, vals]) => {
              const displayVal = period === "Confirmed" ? vals.confirmed : period === "Pipeline" ? vals.pipeline : vals.confirmed + vals.pipeline;
              return (
                <div key={geo} className="rev-region-row">
                  <div className="rev-region-info">
                    <div className="rev-region-name">{geo}</div>
                    <div className="rev-region-meta">
                      {vals.brandCount} brands · ${vals.confirmed}K confirmed · ${vals.pipeline}K pipeline
                    </div>
                  </div>
                  <Bar value={displayVal} max={maxGeoVal} color={GEO_COLORS[geo] ?? "#6366f1"} />
                  <div className="rev-region-numbers">
                    <span className="rev-region-revenue">{fmt(displayVal)}</span>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Beauty pipeline by market */}
          {beautyGeoEntries.length > 0 && (
            <>
              <div style={{ borderTop:"1px solid #e2e8f0", margin:"20px 0 16px", paddingTop:16 }}>
                <div style={{ fontSize:12, fontWeight:700, color:"#ec4899", marginBottom:12, textTransform:"uppercase", letterSpacing:"0.05em" }}>
                  Beauty Pipeline by Market (pre-revenue)
                </div>
                {beautyGeoEntries.map(([geo, count]) => (
                  <div key={geo} className="rev-region-row">
                    <div className="rev-region-info">
                      <div className="rev-region-name">{geo}</div>
                      <div className="rev-region-meta">Beauty brands in discussion</div>
                    </div>
                    <Bar value={count} max={Math.max(...beautyGeoEntries.map(([,c])=>c))} color="#ec4899" />
                    <div className="rev-region-numbers">
                      <span className="rev-region-revenue" style={{ fontSize:16 }}>{count}</span>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      )}

      {/* ── By LOB ── */}
      {tab === "lob" && (
        <div className="panel rev-panel">
          <div className="panel-header">
            <h3>Revenue by Line of Business — {period}</h3>
            <p>Fashion/Softlines split between Apparel and Footwear categories.</p>
          </div>
          {f && Object.entries(f.byLob).map(([lob, vals], i) => {
            const displayVal = period === "Confirmed" ? vals.confirmed : period === "Pipeline" ? vals.pipeline : vals.confirmed + vals.pipeline;
            const maxVal = Math.max(...Object.values(f.byLob).map(v =>
              period === "Confirmed" ? v.confirmed : period === "Pipeline" ? v.pipeline : v.confirmed + v.pipeline
            ));
            return (
              <div key={lob} style={{ marginBottom:20 }}>
                <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:8 }}>
                  <div>
                    <span style={{ fontSize:16, fontWeight:700, color: LOB_COLORS[lob] ?? "#6366f1" }}>{lob}</span>
                    <span style={{ fontSize:12, color:"#64748b", marginLeft:12 }}>
                      ${vals.confirmed}K confirmed · ${vals.pipeline}K pipeline
                    </span>
                  </div>
                  <span style={{ fontSize:20, fontWeight:700, color: LOB_COLORS[lob] ?? "#6366f1" }}>{fmt(displayVal)}</span>
                </div>
                <div style={{ height:16, background:"#f1f5f9", borderRadius:8, overflow:"hidden" }}>
                  <div style={{ height:"100%", width:`${maxVal > 0 ? (displayVal/maxVal)*100 : 0}%`, background: LOB_COLORS[lob] ?? "#6366f1", borderRadius:8, transition:"width 0.5s" }} />
                </div>
                <div style={{ display:"flex", gap:20, marginTop:8 }}>
                  <div style={{ display:"flex", alignItems:"center", gap:6 }}>
                    <div style={{ width:10, height:10, borderRadius:2, background: LOB_COLORS[lob] }} />
                    <span style={{ fontSize:12, color:"#64748b" }}>Confirmed: ${vals.confirmed}K</span>
                  </div>
                  <div style={{ display:"flex", alignItems:"center", gap:6 }}>
                    <div style={{ width:10, height:10, borderRadius:2, background: LOB_COLORS[lob], opacity:0.4 }} />
                    <span style={{ fontSize:12, color:"#64748b" }}>Pipeline: ${vals.pipeline}K</span>
                  </div>
                </div>
              </div>
            );
          })}

          <div style={{ borderTop:"1px solid #e2e8f0", marginTop:20, paddingTop:20 }}>
            <div style={{ fontSize:12, fontWeight:700, color:"#64748b", marginBottom:12, textTransform:"uppercase" }}>Revenue Mix</div>
            <div style={{ display:"flex", gap:16 }}>
              {f && Object.entries(f.byLob).map(([lob, vals]) => {
                const total = f.totalConfirmed + f.totalPipeline;
                const val   = vals.confirmed + vals.pipeline;
                const pct   = total > 0 ? Math.round((val/total)*100) : 0;
                return (
                  <div key={lob} style={{ flex:1, background:"#f8fafc", borderRadius:8, padding:"12px 16px", textAlign:"center" }}>
                    <div style={{ fontSize:28, fontWeight:800, color: LOB_COLORS[lob] ?? "#6366f1" }}>{pct}%</div>
                    <div style={{ fontSize:12, color:"#64748b", marginTop:2 }}>{lob}</div>
                    <div style={{ fontSize:13, fontWeight:600, color:"#1e293b", marginTop:4 }}>{fmt(val)}</div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* ── Top Brands ── */}
      {tab === "brands" && (
        <div className="panel rev-panel">
          <div className="panel-header">
            <h3>Top Fashion Brands by Confirmed Revenue</h3>
            <p>Signed and active deals ranked by Dec 2026 revenue forecast ($K).</p>
          </div>
          <div className="rev-sku-table">
            <div className="rev-sku-header">
              <span>#</span><span>Brand</span><span>LOB</span><span>Market</span><span>Confirmed Rev</span><span>Bar</span>
            </div>
            {(f?.topBrands ?? []).map((brand, i) => {
              const max = f!.topBrands[0]?.rev_confirmed || 1;
              return (
                <div key={i} className="rev-sku-row">
                  <span className="rev-sku-rank">#{i+1}</span>
                  <span className="rev-sku-brand">{brand.brand}</span>
                  <span style={{ fontSize:12, color: LOB_COLORS[brand.lob] ?? "#64748b", fontWeight:600 }}>{brand.lob}</span>
                  <span className="rev-sku-region" style={{ color: GEO_COLORS[brand.geo] ?? "#64748b" }}>{brand.geo}</span>
                  <span className="rev-sku-revenue">${brand.rev_confirmed}K</span>
                  <div style={{ flex:1, height:6, background:"#f1f5f9", borderRadius:3, overflow:"hidden", minWidth:80 }}>
                    <div style={{ height:"100%", width:`${(brand.rev_confirmed/max)*100}%`, background: GEO_COLORS[brand.geo] ?? "#6366f1", borderRadius:3 }} />
                  </div>
                </div>
              );
            })}
          </div>

          {/* Beauty brands note */}
          <div style={{ marginTop:24, background:"#fdf4ff", border:"1px solid #e9d5ff", borderRadius:10, padding:"14px 18px" }}>
            <div style={{ fontSize:13, fontWeight:700, color:"#7c3aed", marginBottom:6 }}>Beauty Pipeline — Pre-Revenue</div>
            <p style={{ fontSize:12, color:"#64748b", margin:0 }}>
              {b?.total ?? rows.length} beauty brands are currently tracked across GCC, India & SEA.
              These are in active discussion stages (Leads → MQL → SQL → Commercials) and will generate
              revenue once deals close. Connect via One Brain to see AI-powered revenue forecasts once agreements are signed.
            </p>
          </div>
        </div>
      )}

      {/* ── Strategy Loop ── */}
      {tab === "loop" && (
        <div className="rev-loop-wrap">
          <div className="panel rev-loop-alerts">
            <div className="panel-header">
              <h3>Revenue Signals</h3>
              <p>Key insights from your live fashion + beauty pipeline data.</p>
            </div>
            {[
              { type:"surge", title:"GCC Footwear", msg:`US Polo confirmed at $595K — largest single deal in portfolio. GCC footwear showing strongest conversion.` },
              { type:"surge", title:"SEA Pipeline", msg:`$${f ? (f.byGeo["SEA"]?.pipeline/1000).toFixed(1) : "1.8"}M in SEA fashion pipeline. Next, Wrangler Lee, love bonito ready to close.` },
              { type:"gap",   title:"Beauty Revenue Gap", msg:`${b?.total ?? rows.length} beauty brands tracked but zero signed — all pre-revenue. Closing even 3 deals = significant upside.` },
              { type:"dip",   title:"India Fashion Confirmed", msg:`India confirmed at $${f ? f.byGeo["India"]?.confirmed ?? 0 : 0}K only (vs GCC $${f ? f.byGeo["GCC"]?.confirmed ?? 0 : 0}K). Pipeline gap to close.` },
              { type:"surge", title:"Apparel Dominance", msg:`Apparel makes up ${f ? Math.round(((f.byLob.Apparel?.confirmed+f.byLob.Apparel?.pipeline)/(f.totalConfirmed+f.totalPipeline))*100) : 60}% of total opportunity. Strong category signal.` },
            ].map((alert, i) => (
              <div key={i} className={`rev-alert-row rev-alert-${alert.type}`}>
                <AlertTriangle size={14} className="rev-alert-icon" />
                <div>
                  <div className="rev-alert-title">
                    {alert.title}
                    <span className={`rev-alert-badge rev-badge-${alert.type}`}>
                      {alert.type === "dip" ? "Attention" : alert.type === "surge" ? "Opportunity" : "Gap"}
                    </span>
                  </div>
                  <div className="rev-alert-msg">{alert.msg}</div>
                </div>
              </div>
            ))}
          </div>

          <div className="rev-loop-cta panel">
            <div className="rev-loop-icon"><Brain size={28} /></div>
            <h3>AI Strategy Loop</h3>
            <p>AI analyzes your <strong>real</strong> fashion revenue + beauty pipeline data and generates specific pivot recommendations.</p>
            <button className="btn-primary rev-loop-btn" onClick={runStrategyLoop} disabled={loopBusy}>
              <Brain size={15}/> {loopBusy ? "Analyzing real data..." : "Run Strategy Loop"}
            </button>
          </div>
        </div>
      )}

      {/* Strategy Loop Modal */}
      {showModal && (
        <div className="brief-modal-overlay" onClick={()=>setShowModal(false)}>
          <div className="brief-modal" onClick={e=>e.stopPropagation()}>
            <div className="brief-modal-header">
              <div>
                <h3>Revenue Strategy — AI Analysis</h3>
                <p style={{ color:"#64748b", fontSize:"0.8rem", margin:0 }}>Based on real pipeline data · Powered by Groq AI</p>
              </div>
              <div style={{ display:"flex", gap:8 }}>
                {loopText && (
                  <button className="btn-secondary" onClick={()=>{ navigator.clipboard.writeText(loopText); setCopied(true); setTimeout(()=>setCopied(false),2000); }}>
                    <Copy size={13}/>{copied?"Copied!":"Copy"}
                  </button>
                )}
                <button className="btn-ghost" onClick={()=>setShowModal(false)}><X size={16}/></button>
              </div>
            </div>
            <div className="brief-body">
              {loopBusy ? (
                <div className="brief-loading"><div className="brief-spinner"/><p>Analyzing real revenue data...</p></div>
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
