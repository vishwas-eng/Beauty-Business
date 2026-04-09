import { useEffect, useMemo, useState } from "react";
import { loadStoredDashboard } from "../lib/storage";
import { computeBrandScore, scoreTone } from "../lib/scoring";
import {
  advanceMosaicStatus,
  loadMosaicStatuses,
  MOSAIC_STATUS_COLOR,
  MOSAIC_STATUS_LABELS,
  MOSAIC_STATUS_ORDER,
  MOSAIC_STATUS_PROGRESS,
  MosaicBrandStatus,
  MosaicStatus,
  pushToMosaic,
} from "../lib/mosaic";
import { ArrowRight, Check, ChevronRight, Package, Rocket, Zap } from "lucide-react";
import { PerformanceRow } from "../types/domain";

const LATE_STAGE = new Set(["Commercials", "OD", "Contract", "Onboarding"]);

function statusIcon(status: MosaicStatus) {
  if (status === "live") return <Check size={12} />;
  if (status === "verified") return <Check size={12} />;
  return null;
}

function MosaicProgressBar({ status }: { status: MosaicStatus }) {
  const pct = MOSAIC_STATUS_PROGRESS[status];
  const color = MOSAIC_STATUS_COLOR[status];
  return (
    <div className="mosaic-progress-wrap">
      <div className="mosaic-progress-track">
        <div className="mosaic-progress-fill" style={{ width: `${pct}%`, background: color }} />
      </div>
      <span className="mosaic-progress-pct" style={{ color }}>{pct}%</span>
    </div>
  );
}

function MosaicStatusPill({ status }: { status: MosaicStatus }) {
  const color = MOSAIC_STATUS_COLOR[status];
  return (
    <span className="mosaic-status-pill" style={{ color, background: `${color}18`, border: `1px solid ${color}35` }}>
      {statusIcon(status)}
      {MOSAIC_STATUS_LABELS[status]}
    </span>
  );
}

function MosaicTimeline({ status }: { status: MosaicStatus }) {
  const currentIdx = MOSAIC_STATUS_ORDER.indexOf(status);
  return (
    <div className="mosaic-timeline">
      {MOSAIC_STATUS_ORDER.filter(s => s !== "not_pushed").map((s, i) => {
        const idx = MOSAIC_STATUS_ORDER.indexOf(s);
        const done = idx <= currentIdx;
        const active = idx === currentIdx;
        const color = MOSAIC_STATUS_COLOR[s];
        return (
          <div key={s} className="mosaic-timeline-step">
            <div
              className={`mosaic-timeline-dot ${done ? "is-done" : ""} ${active ? "is-active" : ""}`}
              style={done ? { background: color, borderColor: color } : {}}
            >
              {done && <Check size={8} />}
            </div>
            <span className="mosaic-timeline-label" style={active ? { color, fontWeight: 600 } : {}}>
              {MOSAIC_STATUS_LABELS[s]}
            </span>
            {i < MOSAIC_STATUS_ORDER.length - 2 && (
              <div className={`mosaic-timeline-line ${done && idx < currentIdx ? "is-done" : ""}`} />
            )}
          </div>
        );
      })}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
export function MosaicBridgePage() {
  const dashboard = useMemo(() => loadStoredDashboard(), []);
  const rows = dashboard.performance ?? [];

  const [tab, setTab] = useState<"ready" | "production" | "live">("ready");
  const [statuses, setStatuses] = useState<MosaicBrandStatus[]>([]);
  const [pushing, setPushing] = useState<string | null>(null);
  const [advancing, setAdvancing] = useState<string | null>(null);

  useEffect(() => {
    setStatuses(loadMosaicStatuses());
  }, []);

  function reload() {
    setStatuses(loadMosaicStatuses());
  }

  // Late-stage brands not yet pushed
  const readyBrands = useMemo(() => {
    const pushedKeys = new Set(statuses.map(s => s.brandKey));
    return rows
      .filter(r => LATE_STAGE.has(r.status))
      .reduce<PerformanceRow[]>((acc, r) => {
        const key = `${r.brand}-${r.launchMarket}`.toLowerCase().replace(/[^a-z0-9]+/g, "-");
        if (!pushedKeys.has(key)) acc.push(r);
        return acc;
      }, [])
      .sort((a, b) => computeBrandScore(b) - computeBrandScore(a));
  }, [rows, statuses]);

  const inProduction = statuses.filter(s => s.status !== "not_pushed" && s.status !== "live");
  const liveStatuses = statuses.filter(s => s.status === "live");

  function handlePush(row: PerformanceRow) {
    const key = `${row.brand}-${row.launchMarket}`.toLowerCase().replace(/[^a-z0-9]+/g, "-");
    setPushing(key);
    setTimeout(() => {
      pushToMosaic(row.brand, row.launchMarket, row.category);
      reload();
      setPushing(null);
      setTab("production");
    }, 900);
  }

  function handleAdvance(brandKey: string) {
    setAdvancing(brandKey);
    setTimeout(() => {
      advanceMosaicStatus(brandKey);
      reload();
      setAdvancing(null);
    }, 600);
  }

  const summary = {
    ready: readyBrands.length,
    production: inProduction.length,
    live: liveStatuses.length,
  };

  return (
    <div className="mosaic-page">
      {/* Header */}
      <div className="mosaic-header">
        <div className="mosaic-header-left">
          <div className="mosaic-logo-block">
            <Package size={20} />
            <span className="mosaic-logo-text">Mosaic</span>
            <span className="mosaic-logo-by">Production Bridge</span>
          </div>
          <p className="mosaic-subtitle">
            Hand off late-stage brands to Mosaic for AI cataloging and SKU generation. Monitor production status from Lumara.
          </p>
        </div>
        <div className="mosaic-summary-stats">
          <div className="mosaic-stat">
            <span className="mosaic-stat-value mosaic-stat-orange">{summary.ready}</span>
            <span className="mosaic-stat-label">Ready to Push</span>
          </div>
          <div className="mosaic-stat">
            <span className="mosaic-stat-value mosaic-stat-blue">{summary.production}</span>
            <span className="mosaic-stat-label">In Production</span>
          </div>
          <div className="mosaic-stat">
            <span className="mosaic-stat-value mosaic-stat-green">{summary.live}</span>
            <span className="mosaic-stat-label">Live</span>
          </div>
        </div>
      </div>

      {/* Pipeline Bridge visual */}
      <div className="mosaic-pipeline-bridge">
        <div className="bridge-block bridge-lumara">
          <Zap size={16} />
          <div>
            <div className="bridge-name">Lumara</div>
            <div className="bridge-desc">Strategy · Pipeline · Relationships</div>
          </div>
        </div>
        <div className="bridge-arrow">
          <ArrowRight size={18} />
          <span>Brand Lifecycle</span>
          <ArrowRight size={18} />
        </div>
        <div className="bridge-block bridge-mosaic">
          <Package size={16} />
          <div>
            <div className="bridge-name">Mosaic</div>
            <div className="bridge-desc">Cataloging · SKUs · PIM · Go-Live</div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="intel-tabs">
        <button className={`intel-tab ${tab === "ready" ? "is-active" : ""}`} onClick={() => setTab("ready")}>
          <Rocket size={14} /> Ready to Push <span className="intel-tab-count">{summary.ready}</span>
        </button>
        <button className={`intel-tab ${tab === "production" ? "is-active" : ""}`} onClick={() => setTab("production")}>
          <Package size={14} /> In Production <span className="intel-tab-count">{summary.production}</span>
        </button>
        <button className={`intel-tab ${tab === "live" ? "is-active" : ""}`} onClick={() => setTab("live")}>
          <Check size={14} /> Live <span className="intel-tab-count">{summary.live}</span>
        </button>
      </div>

      {/* ── Ready to Push ── */}
      {tab === "ready" && (
        <div className="mosaic-card-grid">
          {readyBrands.length === 0 ? (
            <div className="mosaic-empty">
              <Check size={32} color="#22c55e" />
              <p>All late-stage brands have been pushed to Mosaic.</p>
            </div>
          ) : (
            readyBrands.map(row => {
              const key = `${row.brand}-${row.launchMarket}`.toLowerCase().replace(/[^a-z0-9]+/g, "-");
              const score = computeBrandScore(row);
              const tone = scoreTone(score);
              return (
                <div key={key} className="mosaic-brand-card">
                  <div className="mosaic-card-top">
                    <div>
                      <div className="mosaic-card-brand">{row.brand}</div>
                      <div className="mosaic-card-meta">{row.category} · {row.launchMarket}</div>
                    </div>
                    <div className={`score-badge score-badge-${tone}`}>{score}</div>
                  </div>
                  <div className="mosaic-card-stage">
                    <span className={`stage-pill stage-${row.status.toLowerCase()}`}>{row.status}</span>
                    {row.nextStep && <span className="mosaic-card-nextstep">{row.nextStep}</span>}
                  </div>
                  <button
                    className="mosaic-push-btn"
                    onClick={() => handlePush(row)}
                    disabled={pushing === key}
                  >
                    {pushing === key ? (
                      <><span className="mosaic-pushing-dot" /> Pushing to Mosaic...</>
                    ) : (
                      <><ArrowRight size={14} /> Push to Mosaic</>
                    )}
                  </button>
                </div>
              );
            })
          )}
        </div>
      )}

      {/* ── In Production ── */}
      {tab === "production" && (
        <div>
          {inProduction.length === 0 ? (
            <div className="mosaic-empty panel">
              <Package size={32} color="#6366f1" />
              <p>No brands currently in production. Push a late-stage brand to get started.</p>
            </div>
          ) : (
            inProduction.map(item => (
              <div key={item.brandKey} className="mosaic-production-card panel">
                <div className="mosaic-prod-header">
                  <div>
                    <div className="mosaic-card-brand">{item.brand}</div>
                    <div className="mosaic-card-meta">{item.category} · {item.market}</div>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                    <MosaicStatusPill status={item.status} />
                    {item.status !== "verified" && item.status !== "live" && (
                      <button
                        className="mosaic-advance-btn"
                        onClick={() => handleAdvance(item.brandKey)}
                        disabled={advancing === item.brandKey}
                      >
                        {advancing === item.brandKey ? "Updating..." : <><ChevronRight size={13} /> Advance</>}
                      </button>
                    )}
                  </div>
                </div>

                <MosaicTimeline status={item.status} />
                <MosaicProgressBar status={item.status} />

                <div className="mosaic-prod-stats">
                  <div className="mosaic-prod-stat">
                    <span className="mosaic-prod-stat-value">{item.skuCount}</span>
                    <span className="mosaic-prod-stat-label">Total SKUs</span>
                  </div>
                  <div className="mosaic-prod-stat">
                    <span className="mosaic-prod-stat-value" style={{ color: "#22c55e" }}>{item.verifiedSkus}</span>
                    <span className="mosaic-prod-stat-label">Verified</span>
                  </div>
                  <div className="mosaic-prod-stat">
                    <span className="mosaic-prod-stat-value" style={{ color: "#f59e0b" }}>
                      {item.skuCount - item.verifiedSkus}
                    </span>
                    <span className="mosaic-prod-stat-label">Remaining</span>
                  </div>
                  <div className="mosaic-prod-stat">
                    <span className="mosaic-prod-stat-value" style={{ fontSize: "0.8rem", color: "#64748b" }}>
                      {item.pushedAt ? new Date(item.pushedAt).toLocaleDateString("en-IN", { day: "numeric", month: "short" }) : "—"}
                    </span>
                    <span className="mosaic-prod-stat-label">Pushed</span>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* ── Live ── */}
      {tab === "live" && (
        <div className="mosaic-card-grid">
          {liveStatuses.length === 0 ? (
            <div className="mosaic-empty panel">
              <Rocket size={32} color="#22c55e" />
              <p>No brands live yet. Advance brands through production to go live.</p>
            </div>
          ) : (
            liveStatuses.map(item => (
              <div key={item.brandKey} className="mosaic-brand-card mosaic-brand-card-live">
                <div className="mosaic-live-badge"><Check size={12} /> Live on Mosaic</div>
                <div className="mosaic-card-brand">{item.brand}</div>
                <div className="mosaic-card-meta">{item.category} · {item.market}</div>
                <div className="mosaic-live-stats">
                  <span><strong>{item.skuCount}</strong> SKUs</span>
                  <span><strong>{item.verifiedSkus}</strong> Verified</span>
                </div>
                <MosaicProgressBar status="live" />
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}
