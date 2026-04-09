import { useMemo, useState } from "react";
import { loadStoredDashboard } from "../lib/storage";
import { computeBrandScore, findCompetitiveOverlaps, scoreTone } from "../lib/scoring";
import { queryAgent } from "../lib/api";
import { PerformanceRow } from "../types/domain";
import { Brain, ChevronRight, Copy, Sparkles, Target, TrendingUp, X } from "lucide-react";

const ACTIVE_STATUSES = new Set(["Leads", "Lead", "MQL", "SQL", "Commercials", "OD", "Contract", "Onboarding"]);

// ── Fit Score ────────────────────────────────────────────────────────────────
function computeFitScore(
  brand: string,
  market: string,
  rows: PerformanceRow[]
): { score: number; breakdown: { label: string; value: number; max: number; note: string }[] } {
  const activeRows = rows.filter(r => ACTIVE_STATUSES.has(r.status));

  // Competitive pressure: how many other brands in same category × market
  const brandRow = rows.find(r => r.brand === brand);
  const category = brandRow?.category ?? "";
  const competitors = activeRows.filter(
    r => r.launchMarket === market && r.category === category && r.brand !== brand
  ).length;
  const competitiveScore = Math.max(0, 30 - competitors * 8);

  // Market demand: how many brands are targeting this market (more = proven demand)
  const marketCount = activeRows.filter(r => r.launchMarket === market).length;
  const demandScore = marketCount >= 6 ? 25 : marketCount >= 3 ? 20 : marketCount >= 1 ? 12 : 5;

  // Brand pipeline health
  const pipelineScore = brandRow ? Math.round(computeBrandScore(brandRow) * 0.25) : 10;

  // Segment premium bonus
  const segmentScore = brandRow?.segment === "Premium" ? 10 : brandRow?.segment === "Masstige" ? 6 : 3;

  // White space: category is under-represented in market
  const catInMarket = activeRows.filter(r => r.launchMarket === market && r.category === category).length;
  const whiteSpaceScore = catInMarket === 0 ? 15 : catInMarket === 1 ? 8 : 0;

  const total = Math.min(100, competitiveScore + demandScore + pipelineScore + segmentScore + whiteSpaceScore);

  return {
    score: total,
    breakdown: [
      { label: "Market Demand", value: demandScore, max: 25, note: `${marketCount} brands targeting ${market}` },
      { label: "Competitive Room", value: competitiveScore, max: 30, note: `${competitors} direct competitors in ${category} × ${market}` },
      { label: "Pipeline Health", value: pipelineScore, max: 25, note: brandRow ? `Brand score: ${computeBrandScore(brandRow)}/100` : "No pipeline entry found" },
      { label: "White Space", value: whiteSpaceScore, max: 15, note: catInMarket === 0 ? "Category unexplored in this market" : `${catInMarket} brands already in category` },
      { label: "Segment Value", value: segmentScore, max: 10, note: brandRow?.segment ?? "Segment unknown" },
    ],
  };
}

// ── Gap Map helpers ───────────────────────────────────────────────────────────
const GAP_MARKETS = ["India", "SEA", "GCC", "Global", "Under Discussion"] as const;
const GAP_CATEGORIES = ["Makeup", "Skincare", "Perfumes", "Haircare", "Men's Grooming", "Sunscreen"] as const;

function gapColor(count: number): string {
  if (count === 0) return "#22c55e";
  if (count === 1) return "#f59e0b";
  if (count <= 3) return "#f97316";
  return "#ef4444";
}

function gapLabel(count: number): string {
  if (count === 0) return "White Space";
  if (count === 1) return "Early";
  if (count <= 3) return "Moderate";
  return "Saturated";
}

// ─────────────────────────────────────────────────────────────────────────────
export function StrategyPage() {
  const dashboard = useMemo(() => loadStoredDashboard(), []);
  const rows = dashboard.performance ?? [];
  const activeRows = rows.filter(r => ACTIVE_STATUSES.has(r.status));

  const [tab, setTab] = useState<"gap" | "fit" | "whitespace">("gap");

  // Fit score state
  const brands = useMemo(() => [...new Set(rows.map(r => r.brand))].sort(), [rows]);
  const [selectedBrand, setSelectedBrand] = useState(brands[0] ?? "");
  const [selectedMarket, setSelectedMarket] = useState<string>(GAP_MARKETS[0]);
  const [fitResult, setFitResult] = useState<ReturnType<typeof computeFitScore> | null>(null);
  const [pitchText, setPitchText] = useState("");
  const [pitchLoading, setPitchLoading] = useState(false);
  const [pitchCopied, setPitchCopied] = useState(false);
  const [showPitchModal, setShowPitchModal] = useState(false);

  // Gap map
  const gapMap = useMemo(() => {
    const map: Record<string, Record<string, PerformanceRow[]>> = {};
    for (const cat of GAP_CATEGORIES) {
      map[cat] = {};
      for (const mkt of GAP_MARKETS) {
        map[cat][mkt] = activeRows.filter(r => r.category === cat && r.launchMarket === mkt);
      }
    }
    return map;
  }, [activeRows]);

  // White spaces
  const whiteSpaces = useMemo(() => {
    const result: { category: string; market: string; score: number }[] = [];
    for (const cat of GAP_CATEGORIES) {
      for (const mkt of GAP_MARKETS) {
        const count = (gapMap[cat]?.[mkt] ?? []).length;
        if (count <= 1) {
          const score = count === 0 ? 100 : 65;
          result.push({ category: cat, market: mkt, score });
        }
      }
    }
    return result.sort((a, b) => b.score - a.score);
  }, [gapMap]);

  const overlaps = useMemo(() => findCompetitiveOverlaps(rows), [rows]);

  function runFitScore() {
    const result = computeFitScore(selectedBrand, selectedMarket, rows);
    setFitResult(result);
    setPitchText("");
  }

  async function generatePitch() {
    if (!fitResult) return;
    setPitchLoading(true);
    setShowPitchModal(true);
    const brandRow = rows.find(r => r.brand === selectedBrand);
    const prompt = `You are a strategic business development consultant for Opptra, an omnichannel beauty operator.
Generate a compelling strategic pitch narrative for onboarding ${selectedBrand} into the ${selectedMarket} market.
Brand context: Category: ${brandRow?.category ?? "Beauty"}, Segment: ${brandRow?.segment ?? "Unknown"}, Current stage: ${brandRow?.status ?? "Prospecting"}.
Fit score: ${fitResult.score}/100.
Key factors: ${fitResult.breakdown.map(b => `${b.label}: ${b.value}/${b.max} (${b.note})`).join("; ")}.
Write a 3-paragraph executive pitch covering: (1) Why this brand fits Opptra's ${selectedMarket} strategy, (2) The market opportunity and white space, (3) Recommended first steps and timeline. Keep it sharp, data-driven, and executive-ready.`;
    const res = await queryAgent(prompt);
    setPitchText(res.answer);
    setPitchLoading(false);
  }

  function copyPitch() {
    navigator.clipboard.writeText(pitchText);
    setPitchCopied(true);
    setTimeout(() => setPitchCopied(false), 2000);
  }

  return (
    <div className="strategy-page">
      {/* Header */}
      <div className="strategy-header">
        <div>
          <div className="strategy-breadcrumb">Strategy</div>
          <h2 className="strategy-title">Market Opportunity Mapper</h2>
          <p className="strategy-subtitle">
            Identify white spaces, score brand-market fit, and generate AI-powered pitch narratives.
          </p>
        </div>
        <div className="strategy-meta-badges">
          <span className="strategy-badge strategy-badge-green">{whiteSpaces.filter(w => w.score === 100).length} White Spaces</span>
          <span className="strategy-badge strategy-badge-orange">{overlaps.length} Competitive Conflicts</span>
          <span className="strategy-badge strategy-badge-blue">{activeRows.length} Active Brands</span>
        </div>
      </div>

      {/* Tabs */}
      <div className="intel-tabs">
        <button className={`intel-tab ${tab === "gap" ? "is-active" : ""}`} onClick={() => setTab("gap")}>
          <Target size={14} /> Gap Map
        </button>
        <button className={`intel-tab ${tab === "fit" ? "is-active" : ""}`} onClick={() => setTab("fit")}>
          <TrendingUp size={14} /> Fit Score
        </button>
        <button className={`intel-tab ${tab === "whitespace" ? "is-active" : ""}`} onClick={() => setTab("whitespace")}>
          <Sparkles size={14} />
          White Space <span className="intel-tab-count">{whiteSpaces.filter(w => w.score === 100).length}</span>
        </button>
      </div>

      {/* ── Gap Map ── */}
      {tab === "gap" && (
        <div className="panel strategy-gap-panel">
          <div className="panel-header">
            <h3>Category × Market Density Map</h3>
            <p>Each cell shows active brands competing for that category-market slot. Green = opportunity. Red = saturated.</p>
          </div>
          <div className="gap-map-wrap">
            <div className="gap-map-grid" style={{ gridTemplateColumns: `160px repeat(${GAP_MARKETS.length}, 1fr)` }}>
              {/* Header row */}
              <div className="gap-map-corner" />
              {GAP_MARKETS.map(mkt => (
                <div key={mkt} className="gap-map-col-header">{mkt}</div>
              ))}
              {/* Data rows */}
              {GAP_CATEGORIES.map(cat => (
                <>
                  <div key={`row-${cat}`} className="gap-map-row-label">{cat}</div>
                  {GAP_MARKETS.map(mkt => {
                    const count = (gapMap[cat]?.[mkt] ?? []).length;
                    const color = gapColor(count);
                    const label = gapLabel(count);
                    return (
                      <div
                        key={`${cat}-${mkt}`}
                        className="gap-map-cell"
                        style={{ background: `${color}18`, borderColor: `${color}40` }}
                        title={`${cat} × ${mkt}: ${count} brand${count !== 1 ? "s" : ""}`}
                      >
                        <span className="gap-cell-count" style={{ color }}>{count}</span>
                        <span className="gap-cell-label" style={{ color }}>{label}</span>
                      </div>
                    );
                  })}
                </>
              ))}
            </div>
          </div>
          {/* Legend */}
          <div className="gap-legend">
            {[
              { color: "#22c55e", label: "White Space (0 brands)" },
              { color: "#f59e0b", label: "Early Entry (1 brand)" },
              { color: "#f97316", label: "Moderate (2–3 brands)" },
              { color: "#ef4444", label: "Saturated (4+ brands)" },
            ].map(l => (
              <span key={l.label} className="gap-legend-item">
                <span className="gap-legend-dot" style={{ background: l.color }} />
                {l.label}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* ── Fit Score ── */}
      {tab === "fit" && (
        <div className="strategy-fit-wrap">
          <div className="panel strategy-fit-controls">
            <div className="panel-header">
              <h3>Brand-Market Fit Score</h3>
              <p>Select a brand and target market to compute an AI-derived opportunity score.</p>
            </div>
            <div className="fit-selectors">
              <div className="fit-selector-group">
                <label>Brand</label>
                <select className="fit-select" value={selectedBrand} onChange={e => setSelectedBrand(e.target.value)}>
                  {brands.map(b => <option key={b}>{b}</option>)}
                </select>
              </div>
              <div className="fit-selector-group">
                <label>Target Market</label>
                <select className="fit-select" value={selectedMarket} onChange={e => setSelectedMarket(e.target.value)}>
                  {GAP_MARKETS.map(m => <option key={m}>{m}</option>)}
                </select>
              </div>
              <button className="btn-primary fit-calc-btn" onClick={runFitScore}>
                <Target size={15} /> Calculate Fit
              </button>
            </div>

            {fitResult && (
              <div className="fit-result">
                <div className="fit-score-display">
                  <div
                    className="fit-score-circle"
                    style={{
                      background: `conic-gradient(${
                        fitResult.score >= 70 ? "#22c55e" : fitResult.score >= 50 ? "#3b82f6" : fitResult.score >= 30 ? "#f59e0b" : "#ef4444"
                      } ${fitResult.score * 3.6}deg, #1e293b 0deg)`
                    }}
                  >
                    <span className="fit-score-value">{fitResult.score}</span>
                    <span className="fit-score-max">/100</span>
                  </div>
                  <div className="fit-score-meta">
                    <div className="fit-score-label">
                      {fitResult.score >= 70 ? "🟢 Strong Fit" : fitResult.score >= 50 ? "🔵 Good Fit" : fitResult.score >= 30 ? "🟡 Moderate Fit" : "🔴 Weak Fit"}
                    </div>
                    <p className="fit-score-desc">
                      {selectedBrand} × {selectedMarket} — {
                        fitResult.score >= 70 ? "High strategic priority. Recommend fast-tracking." :
                        fitResult.score >= 50 ? "Solid opportunity. Worth progressing with differentiation." :
                        fitResult.score >= 30 ? "Moderate. Requires market positioning work before pitch." :
                        "Challenging. Review competitive density before committing resources."
                      }
                    </p>
                    <button className="btn-secondary fit-pitch-btn" onClick={generatePitch}>
                      <Brain size={14} /> Generate AI Pitch
                    </button>
                  </div>
                </div>

                <div className="fit-breakdown">
                  {fitResult.breakdown.map(b => (
                    <div key={b.label} className="fit-breakdown-row">
                      <div className="fit-breakdown-label">
                        <span>{b.label}</span>
                        <span className="fit-breakdown-note">{b.note}</span>
                      </div>
                      <div className="fit-breakdown-bar-wrap">
                        <div
                          className="fit-breakdown-bar"
                          style={{
                            width: `${(b.value / b.max) * 100}%`,
                            background: b.value / b.max >= 0.7 ? "#22c55e" : b.value / b.max >= 0.4 ? "#3b82f6" : "#ef4444"
                          }}
                        />
                      </div>
                      <span className="fit-breakdown-score">{b.value}/{b.max}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── White Space ── */}
      {tab === "whitespace" && (
        <div className="panel strategy-ws-panel">
          <div className="panel-header">
            <h3>White Space Opportunities</h3>
            <p>Category-market combinations with zero or one active brand — highest strategic upside.</p>
          </div>
          <div className="ws-grid">
            {whiteSpaces.map(ws => (
              <div key={`${ws.category}-${ws.market}`} className={`ws-card ${ws.score === 100 ? "ws-card-prime" : "ws-card-early"}`}>
                <div className="ws-card-top">
                  <span className="ws-score-pill" style={{ background: ws.score === 100 ? "#22c55e20" : "#f59e0b20", color: ws.score === 100 ? "#22c55e" : "#f59e0b", border: ws.score === 100 ? "1px solid #22c55e40" : "1px solid #f59e0b40" }}>
                    {ws.score === 100 ? "White Space" : "Early Entry"}
                  </span>
                  <ChevronRight size={14} className="ws-arrow" />
                </div>
                <div className="ws-category">{ws.category}</div>
                <div className="ws-market">{ws.market}</div>
                <div className="ws-count">
                  {gapMap[ws.category as typeof GAP_CATEGORIES[number]]?.[ws.market]?.length ?? 0} brand{(gapMap[ws.category as typeof GAP_CATEGORIES[number]]?.[ws.market]?.length ?? 0) !== 1 ? "s" : ""} active
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* AI Pitch Modal */}
      {showPitchModal && (
        <div className="brief-modal-overlay" onClick={() => setShowPitchModal(false)}>
          <div className="brief-modal" onClick={e => e.stopPropagation()}>
            <div className="brief-modal-header">
              <div>
                <h3>Strategic Pitch — {selectedBrand} × {selectedMarket}</h3>
                <p style={{ color: "#64748b", fontSize: "0.8rem", margin: 0 }}>AI-generated narrative · Fit Score {fitResult?.score}/100</p>
              </div>
              <div style={{ display: "flex", gap: 8 }}>
                {pitchText && (
                  <button className="btn-secondary" onClick={copyPitch} style={{ gap: 6 }}>
                    <Copy size={13} />{pitchCopied ? "Copied!" : "Copy"}
                  </button>
                )}
                <button className="btn-ghost" onClick={() => setShowPitchModal(false)}><X size={16} /></button>
              </div>
            </div>
            <div className="brief-body">
              {pitchLoading ? (
                <div className="brief-loading"><div className="brief-spinner" /><p>Generating strategic narrative...</p></div>
              ) : (
                <div className="brief-text">{pitchText}</div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
