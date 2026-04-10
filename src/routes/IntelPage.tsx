import React, { useEffect, useState } from "react";
import { Flame, FlaskConical, Snowflake } from "lucide-react";
import { fetchDashboard } from "../lib/api";
import { computeBrandScore, findCompetitiveOverlaps, isGoingCold, scoreLabel, scoreTone } from "../lib/scoring";
import { DashboardPayload, PerformanceRow } from "../types/domain";
import { ResearchLabPage } from "./ResearchLabPage";

const ACTIVE_STATUSES = ["Leads", "Lead", "MQL", "SQL", "Commercials", "OD", "Contract", "Onboarding"];
const STAGE_ORDER = ["Leads", "MQL", "SQL", "Commercials", "OD", "Contract", "Onboarding", "Hold", "Reject"];

type Tab = "priority" | "overlaps" | "cold" | "velocity" | "research";

function normalizeCategory(c?: string) {
  return (c ?? "").trim() === "Mens Grooming" ? "Mens' Grooming" : (c ?? "").trim();
}

function normalize(row: PerformanceRow): PerformanceRow {
  return { ...row, brand: row.brand.trim(), category: normalizeCategory(row.category), status: row.status.trim() };
}

function isExecutive(row: PerformanceRow) {
  return (
    row.brand &&
    row.category &&
    row.category !== "Unassigned" &&
    row.segment?.trim() &&
    row.sourceCountry?.trim() &&
    row.launchMarket.trim() &&
    row.status.trim()
  );
}

export function IntelPage() {
  const [payload, setPayload] = useState<DashboardPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<Tab>("priority");

  useEffect(() => {
    setLoading(true);
    void fetchDashboard("mtd").then(setPayload).finally(() => setLoading(false));
  }, []);

  if (loading || !payload) {
    return <div className="page-loader">Loading intelligence data...</div>;
  }

  const rows = payload.performance.filter(isExecutive).map(normalize);

  // Priority Queue: all brands ranked by score
  const priorityQueue = [...rows]
    .map(row => ({ row, score: computeBrandScore(row) }))
    .sort((a, b) => b.score - a.score);

  // Competitive Overlaps
  const overlaps = findCompetitiveOverlaps(rows);

  // Going Cold: active brands with workingDays > 35, not late-stage
  const goingCold = rows
    .filter(isGoingCold)
    .sort((a, b) => b.workingDays - a.workingDays);

  // Deal Velocity: avg days per stage
  const stageVelocity = STAGE_ORDER.map(stage => {
    const stageRows = rows.filter(r => r.status === stage);
    const avg = stageRows.length
      ? Math.round(stageRows.reduce((sum, r) => sum + r.workingDays, 0) / stageRows.length)
      : 0;
    const maxAvg = 90;
    return { stage, count: stageRows.length, avg, pct: Math.min(Math.round((avg / maxAvg) * 100), 100) };
  }).filter(s => s.count > 0);

  const tabs: { id: Tab; label: string; count?: number; icon?: React.ReactNode }[] = [
    { id: "priority", label: "Priority Queue", count: priorityQueue.length },
    { id: "overlaps", label: "Competitive Overlaps", count: overlaps.length },
    { id: "cold", label: "Going Cold", count: goingCold.length },
    { id: "velocity", label: "Deal Velocity", count: stageVelocity.length },
    { id: "research", label: "Research Lab", icon: <FlaskConical size={13} /> }
  ];

  return (
    <div className="page-stack">
      <div className="hero-row">
        <div>
          <div className="eyebrow">Intelligence</div>
          <p className="subdued">AI-powered signals, scores, and risks across the full pipeline.</p>
        </div>
      </div>

      <div className="intel-tabs">
        {tabs.map(t => (
          <button
            key={t.id}
            className={`intel-tab${tab === t.id ? " is-active" : ""}`}
            onClick={() => setTab(t.id)}
            type="button"
          >
            {t.icon && t.icon}
            {t.label}
            {t.count !== undefined && (
              <span className="intel-tab-count">{t.count}</span>
            )}
          </button>
        ))}
      </div>

      {tab === "priority" && (
        <section className="panel">
          <div className="panel-header">
            <div>
              <h2>Brand Priority Queue</h2>
              <p>All brands ranked by AI-computed score — stage progress, freshness, next-step coverage, and segment value.</p>
            </div>
          </div>
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>#</th>
                  <th>Brand</th>
                  <th>Market</th>
                  <th>Stage</th>
                  <th>Score</th>
                  <th>Signal</th>
                  <th>Days</th>
                  <th>Next Step</th>
                </tr>
              </thead>
              <tbody>
                {priorityQueue.map(({ row, score }, i) => {
                  const tone = scoreTone(score);
                  const slabel = scoreLabel(score);
                  const cold = isGoingCold(row);
                  return (
                    <tr key={`${row.brand}-${row.launchMarket}-${i}`}>
                      <td className="rank-cell">#{i + 1}</td>
                      <td>
                        <strong>{row.brand}</strong>
                      </td>
                      <td>{row.launchMarket}</td>
                      <td>
                        <span className={`stage-pill stage-${row.status.toLowerCase().replace(/\s+/g, "-")}`}>
                          {row.status}
                        </span>
                      </td>
                      <td>
                        <span className={`score-badge score-badge-${tone}`}>
                          {tone === "green" ? <Flame size={10} /> : null}
                          {score}
                        </span>
                      </td>
                      <td>
                        <span className={`signal-label signal-${tone}`}>
                          {cold ? <><Snowflake size={10} /> Going cold</> : slabel}
                        </span>
                      </td>
                      <td>{row.workingDays}d</td>
                      <td className="milestone-cell">{row.nextStep || <span className="no-next-step">—</span>}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {tab === "overlaps" && (
        <section className="panel">
          <div className="panel-header">
            <div>
              <h2>Competitive Overlaps</h2>
              <p>Multiple active brands competing for the same category–market slot. Consider prioritising one or differentiating the pitch.</p>
            </div>
          </div>
          {overlaps.length === 0 ? (
            <p className="subdued" style={{ marginTop: 12 }}>No overlaps detected in the current pipeline.</p>
          ) : (
            <div className="overlap-grid" style={{ marginTop: 16 }}>
              {overlaps.map(overlap => (
                <div key={`${overlap.category}||${overlap.market}`} className="overlap-card">
                  <div className="overlap-header">
                    <strong>{overlap.category}</strong>
                    <span className="overlap-market">{overlap.market}</span>
                    <span className="overlap-count">{overlap.brands.length} brands</span>
                  </div>
                  <div className="overlap-brands">
                    {overlap.brands.map(b => (
                      <div key={b.brand} className="overlap-brand-row">
                        <span className="overlap-brand-chip">{b.brand}</span>
                        <span className={`score-badge score-badge-${scoreTone(computeBrandScore(b))}`}>{computeBrandScore(b)}</span>
                        <span className={`stage-pill stage-${b.status.toLowerCase().replace(/\s+/g, "-")}`}>{b.status}</span>
                        <span className="overlap-days">{b.workingDays}d</span>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      )}

      {tab === "cold" && (
        <section className="panel">
          <div className="panel-header">
            <div>
              <h2>Going Cold</h2>
              <p>Active deals with no stage progression, stuck for more than 35 days. These need attention or a decision.</p>
            </div>
          </div>
          {goingCold.length === 0 ? (
            <p className="subdued" style={{ marginTop: 12 }}>No brands going cold. Pipeline is moving well.</p>
          ) : (
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Brand</th>
                    <th>Market</th>
                    <th>Stage</th>
                    <th>Days Stale</th>
                    <th>Score</th>
                    <th>Hold Reason</th>
                    <th>Next Step</th>
                  </tr>
                </thead>
                <tbody>
                  {goingCold.map(row => (
                    <tr key={`${row.brand}-${row.launchMarket}`}>
                      <td>
                        <strong>{row.brand}</strong>
                        <span className="going-cold-badge" style={{ marginLeft: 8 }}>
                          <Snowflake size={10} /> Cold
                        </span>
                      </td>
                      <td>{row.launchMarket}</td>
                      <td>
                        <span className={`stage-pill stage-${row.status.toLowerCase().replace(/\s+/g, "-")}`}>
                          {row.status}
                        </span>
                      </td>
                      <td><strong style={{ color: "var(--danger)" }}>{row.workingDays}d</strong></td>
                      <td>
                        <span className={`score-badge score-badge-${scoreTone(computeBrandScore(row))}`}>
                          {computeBrandScore(row)}
                        </span>
                      </td>
                      <td>{row.holdReason ?? "—"}</td>
                      <td className="milestone-cell">{row.nextStep || <span className="no-next-step">—</span>}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      )}

      {tab === "velocity" && (
        <section className="panel">
          <div className="panel-header">
            <div>
              <h2>Deal Velocity</h2>
              <p>Average days brands have spent at each pipeline stage. Longer bars indicate bottlenecks.</p>
            </div>
          </div>
          <div className="velocity-list" style={{ marginTop: 20 }}>
            {stageVelocity.map(({ stage, count, avg, pct }) => (
              <div key={stage} className="velocity-row">
                <span className="velocity-stage">{stage}</span>
                <div className="velocity-bar-wrap">
                  <div
                    className="velocity-bar"
                    style={{
                      width: `${pct}%`,
                      background: pct > 70 ? "var(--danger)" : pct > 40 ? "var(--orange)" : "var(--blue)"
                    }}
                  />
                </div>
                <span className="velocity-avg">{avg}d avg</span>
                <span className="velocity-count">{count} brands</span>
              </div>
            ))}
          </div>
          <div className="velocity-legend">
            <span className="legend-item"><span className="legend-dot" style={{ background: "var(--blue)" }} />Fast (&lt;40% of max)</span>
            <span className="legend-item"><span className="legend-dot" style={{ background: "var(--orange)" }} />Moderate</span>
            <span className="legend-item"><span className="legend-dot" style={{ background: "var(--danger)" }} />Bottleneck (&gt;70% of max)</span>
          </div>
        </section>
      )}

      {tab === "research" && (
        <ResearchLabPage />
      )}
    </div>
  );
}
