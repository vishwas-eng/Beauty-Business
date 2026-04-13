import { useEffect, useState } from "react";
import { Check, ChevronDown, Copy, Download, RefreshCcw, Sparkles, X, Zap } from "lucide-react";
import {
  CategoryBarChart,
  CycleTimeChart,
  DonutBreakdownChart,
  HeatmapChart,
  StageStackedChart
} from "../components/ChartCard";
import { KpiCard } from "../components/KpiCard";
import { PerformanceTable } from "../components/PerformanceTable";
import { TimeRangeTabs } from "../components/TimeRangeTabs";
import { fetchDashboard, queryAgent, refreshSource } from "../lib/api";
import { formatDateTime } from "../lib/format";
import { DashboardPayload, PerformanceRow, TimeRange } from "../types/domain";

type Vertical = "beauty" | "fashion" | "all";

const ACTIVE_STATUSES = ["Leads", "Lead", "MQL", "SQL", "Commercials", "OD", "Contract", "Onboarding"];
const LATE_STAGE_STATUSES = ["Commercials", "OD", "Contract", "Onboarding"];
const STACK_STAGES = ["Leads", "MQL", "SQL", "Commercials", "Hold", "Reject"];
const EXCLUDED_BRANDS = new Set(["Giordano", "Wishlist from Retailers"]);
const AS_OF_DATE = new Date("2026-04-07T00:00:00Z");

const DISCUSSION_START_DATES: Record<string, string> = {
  "Nudestix||SEA": "2026-01-14",
  "Nudestix||India": "2026-01-14",
  "Nudestix||GCC": "2026-01-14",
  "Ajmal||SEA": "2026-01-15",
  "Ajmal||India": "2026-01-15",
  "Ajmal||GCC": "2026-01-15",
  "Toni & Guy||India": "2025-12-15",
  "Brylcreem||India": "2025-12-15",
  "Elf Beauty||Under Discussion": "2026-02-24",
  "Pixi||Under Discussion": "2026-02-26",
  "Anastasia Beverley Hills||SEA": "2026-02-26",
  "Honasa||Under Discussion": "2026-01-05",
  "Inde Wild||Under Discussion": "2026-02-17",
  "D'You||Under Discussion": "2026-02-17",
  "Deconstruct||Under Discussion": "2026-02-17",
  "Paula's Choice||Under Discussion": "2026-02-25",
  "Maxiblock||Under Discussion": "2026-01-28",
  "Yardley||Under Discussion": "2026-02-25",
  "Dermafora||Under Discussion": "2026-01-13",
  "Sugar Cosmetics||Under Discussion": "2026-01-13",
  "Love Child by Masaba||Under Discussion": "2026-02-17",
  "Renee Cosmetics||Under Discussion": "2026-01-13",
  "Mars Cosmetics||Under Discussion": "2026-01-13",
  "Mor Boutique||India": "2025-12-01",
  "Beardo||SEA": "2026-03-17",
  "Beardo||GCC": "2026-03-17",
  "Just Herbs||SEA": "2026-03-17",
  "Just Herbs||GCC": "2026-03-17",
  "Oh so Heavenly||SEA": "2026-03-18",
  "Lancome||India": "2026-03-18",
  "YSL||India": "2026-03-18",
  "US Polo||India": "2026-03-20",
  "Azzaro||India": "2026-03-18",
  "Jeanne Arthes||India": "2026-03-25",
  "Solinotes||India": "2026-03-25"
};

function normalizeCategory(category?: string) {
  const value = (category ?? "").trim();
  if (value === "Mens Grooming") return "Mens' Grooming";
  return value;
}

function isFashionRow(row: PerformanceRow) {
  return normalizeCategory(row.category).startsWith("Fashion");
}

function opportunityKey(row: Pick<PerformanceRow, "brand" | "launchMarket">) {
  return `${row.brand.trim()}||${row.launchMarket.trim()}`;
}

function ageFromDiscussionDate(row: Pick<PerformanceRow, "brand" | "launchMarket" | "workingDays" | "discussionStartDate">) {
  const discussionDate =
    "discussionStartDate" in row && typeof row.discussionStartDate === "string" && row.discussionStartDate
      ? row.discussionStartDate
      : DISCUSSION_START_DATES[opportunityKey(row)];
  if (!discussionDate) return row.workingDays;
  const diff = AS_OF_DATE.getTime() - new Date(`${discussionDate}T00:00:00Z`).getTime();
  return Math.max(0, Math.round(diff / 86400000));
}

function isExecutiveOpportunity(row: PerformanceRow) {
  const brand = row.brand.trim();
  if (!brand || EXCLUDED_BRANDS.has(brand)) return false;
  const cat = normalizeCategory(row.category);
  if (!cat || cat === "Unassigned") return false;
  const isFashion = cat.startsWith("Fashion");
  return Boolean(
    row.segment?.trim() &&
    row.sourceCountry?.trim() &&
    row.launchMarket.trim() &&
    row.status.trim() &&
    (isFashion || row.discussionStartDate || DISCUSSION_START_DATES[opportunityKey(row)])
  );
}

function normalizeRow(row: PerformanceRow): PerformanceRow {
  return {
    ...row,
    brand: row.brand.trim(),
    category: normalizeCategory(row.category),
    segment: row.segment?.trim(),
    company: row.company?.trim(),
    sourceCountry: row.sourceCountry?.trim(),
    launchMarket: row.launchMarket.trim(),
    status: row.status.trim(),
    nextStep: row.nextStep.trim(),
    holdReason: row.holdReason?.trim(),
    followUpStatus: row.followUpStatus?.trim(),
    warning: row.warning?.trim(),
    workingDays: ageFromDiscussionDate(row)
  };
}

function countUniqueBrands(rows: PerformanceRow[]) {
  return new Set(rows.map((row) => row.brand)).size;
}

function summarizeCountsByOpportunity(rows: PerformanceRow[], selector: (row: PerformanceRow) => string) {
  return Array.from(
    rows.reduce((map, row) => {
      const key = selector(row) || "Unclassified";
      map.set(key, (map.get(key) ?? 0) + 1);
      return map;
    }, new Map<string, number>())
  );
}

function summarizeCountsByUniqueBrand(rows: PerformanceRow[], selector: (row: PerformanceRow) => string) {
  return Array.from(
    rows.reduce((map, row) => {
      const key = selector(row) || "Unclassified";
      const brands = map.get(key) ?? new Set<string>();
      brands.add(row.brand);
      map.set(key, brands);
      return map;
    }, new Map<string, Set<string>>())
  ).map(([key, brands]) => [key, brands.size] as const);
}

function buildStageStack(
  rows: PerformanceRow[],
  groupBy: (row: PerformanceRow) => string
) {
  const grouped = new Map<string, Record<string, number>>();
  rows.forEach((row) => {
    const group = groupBy(row) || "Unclassified";
    const stage = STACK_STAGES.includes(row.status) ? row.status : "Reject";
    if (!grouped.has(group)) grouped.set(group, {});
    const stageMap = grouped.get(group)!;
    stageMap[stage] = (stageMap[stage] ?? 0) + 1;
  });
  return Array.from(grouped.entries())
    .map(([name, value]) => {
      const base: Record<string, string | number> = { name };
      STACK_STAGES.forEach((stage) => { base[stage] = value[stage] ?? 0; });
      return base;
    })
    .sort((a, b) =>
      Number(b.Leads) + Number(b.MQL) + Number(b.Commercials) -
      (Number(a.Leads) + Number(a.MQL) + Number(a.Commercials))
    );
}

function buildPipelineContext(rows: PerformanceRow[], vertical: Vertical): string {
  const label = vertical === "all" ? "All Verticals" : vertical === "fashion" ? "Fashion / Softlines" : "Beauty";
  const active = rows.filter(r => ACTIVE_STATUSES.includes(r.status));
  const onHold = rows.filter(r => r.status === "Hold");
  const lateStage = rows.filter(r => LATE_STAGE_STATUSES.includes(r.status));
  const stale = rows.filter(r => r.workingDays > 45);

  const markets = summarizeCountsByOpportunity(rows, r => r.launchMarket)
    .sort((a, b) => b[1] - a[1]).map(([m, c]) => `${m}: ${c}`).join(", ");
  const stages = summarizeCountsByOpportunity(rows, r => r.status)
    .sort((a, b) => b[1] - a[1]).map(([s, c]) => `${s}: ${c}`).join(", ");
  const categories = summarizeCountsByUniqueBrand(rows, r => r.category)
    .sort((a, b) => b[1] - a[1]).slice(0, 8).map(([c, n]) => `${c}: ${n} brands`).join(", ");
  const topBrands = summarizeCountsByOpportunity(rows, r => r.brand)
    .sort((a, b) => b[1] - a[1]).slice(0, 10).map(([b, c]) => `${b} (${c})`).join(", ");
  const latePipeline = lateStage.slice(0, 8).map(r => `${r.brand} – ${r.launchMarket} (${r.status})`).join("; ");
  const staleList = stale.slice(0, 6).map(r => `${r.brand} (${r.workingDays}d, ${r.status})`).join("; ");
  const holdList = onHold.slice(0, 6).map(r => `${r.brand}: ${r.holdReason || "no reason"}`).join("; ");

  return [
    `=== LIVE PIPELINE DATA (${label}) ===`,
    `Total: ${rows.length} opportunities | ${countUniqueBrands(rows)} brands`,
    `Active: ${active.length} | On Hold: ${onHold.length} | Commercials+: ${lateStage.length} | Stale >45d: ${stale.length}`,
    `Markets: ${markets || "none"}`,
    `Stage breakdown: ${stages || "none"}`,
    `Top categories: ${categories || "none"}`,
    `Top brands: ${topBrands || "none"}`,
    `Late-stage pipeline: ${latePipeline || "none"}`,
    `Stale opportunities: ${staleList || "none"}`,
    `On hold: ${holdList || "none"}`
  ].join("\n");
}

const VERTICAL_LABELS: Record<Vertical, string> = {
  beauty: "Beauty",
  fashion: "Fashion",
  all: "All"
};

export function DashboardPage() {
  const [range, setRange] = useState<TimeRange>("mtd");
  const [payload, setPayload] = useState<DashboardPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [vertical, setVertical] = useState<Vertical>("beauty");
  const [marketFilter, setMarketFilter] = useState("all");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [briefOpen, setBriefOpen] = useState(false);
  const [briefText, setBriefText] = useState("");
  const [briefLoading, setBriefLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [oppsText, setOppsText] = useState("");
  const [oppsLoading, setOppsLoading] = useState(false);

  useEffect(() => {
    setLoading(true);
    void fetchDashboard(range).then(setPayload).finally(() => setLoading(false));
  }, [range]);

  // Reset sub-filters when vertical changes
  function handleVerticalChange(v: Vertical) {
    setVertical(v);
    setMarketFilter("all");
    setCategoryFilter("all");
  }

  async function handleRefresh() {
    setRefreshing(true);
    const next = await refreshSource(range);
    setPayload(next);
    setRefreshing(false);
  }

  async function generateBrief(context: string) {
    setBriefOpen(true);
    setBriefLoading(true);
    setBriefText("");
    const res = await queryAgent(
      `${context}\n\nUsing ONLY the pipeline data above, generate a concise executive brief (under 200 words). Write as a senior analyst briefing a VP before a Monday meeting. Include: 1) One-line pipeline snapshot with exact numbers from the data, 2) Top 2 risks or blockers with specific brand/market examples from the data, 3) Late-stage pipeline update with actual brand names, 4) 3 recommended actions for this week. Be direct and specific — only reference brands and numbers from the data provided.`
    );
    setBriefText(res.answer);
    setBriefLoading(false);
  }

  function copyBrief() {
    void navigator.clipboard.writeText(briefText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  async function scanOpportunities(context: string) {
    setOppsLoading(true);
    setOppsText("");
    const res = await queryAgent(
      `${context}\n\nUsing ONLY the pipeline data above, identify 3-5 proactive opportunities we should act on urgently. Look for: brands close to late-stage with no momentum, markets with thin coverage, categories underrepresented in key markets, quick wins this week. Name actual brands and markets from the data. Format as a numbered list.`
    );
    setOppsText(res.answer);
    setOppsLoading(false);
  }

  function exportPipeline() {
    window.print();
  }

  if (loading || !payload) {
    return <div className="page-loader">Preparing analytics...</div>;
  }

  // Step 1: quality filter
  const cleanRows = payload.performance.filter(isExecutiveOpportunity).map(normalizeRow);

  // Step 2: vertical filter (Beauty / Fashion / All)
  const verticalRows = cleanRows.filter(row => {
    if (vertical === "all") return true;
    return vertical === "fashion" ? isFashionRow(row) : !isFashionRow(row);
  });

  // Step 3: market + category filter
  const marketCounts = summarizeCountsByOpportunity(verticalRows, r => r.launchMarket)
    .sort(([a], [b]) => a.localeCompare(b));
  const categoryCounts = summarizeCountsByUniqueBrand(verticalRows, r => r.category)
    .sort(([a], [b]) => a.localeCompare(b));
  const availableMarkets = marketCounts.map(([m]) => m);
  const availableCategories = categoryCounts.map(([c]) => c);

  const filteredRows = verticalRows.filter(row => {
    const matchesMarket = marketFilter === "all" || row.launchMarket === marketFilter;
    const matchesCategory = categoryFilter === "all" || row.category === categoryFilter;
    return matchesMarket && matchesCategory;
  });

  // Derived rows
  const activeRows = filteredRows.filter(r => ACTIVE_STATUSES.includes(r.status));
  const holdRows = filteredRows.filter(r => r.status === "Hold");
  const rejectRows = filteredRows.filter(r => r.status === "Reject");
  const lateStageRows = filteredRows.filter(r => LATE_STAGE_STATUSES.includes(r.status));
  const staleRows = filteredRows.filter(r => r.workingDays > 45);

  const totalOpportunities = filteredRows.length;
  const uniqueBrands = countUniqueBrands(filteredRows);
  const holdPercent = totalOpportunities ? Math.round((holdRows.length / totalOpportunities) * 100) : 0;

  // Chart data
  const categoryMix = summarizeCountsByUniqueBrand(filteredRows, r => r.category)
    .map(([c, n]) => ({ category: c, revenue: n, inventoryValue: Math.max(1, Math.round(n / 2)) }))
    .sort((a, b) => b.revenue - a.revenue);

  const stageMix = summarizeCountsByOpportunity(filteredRows, r => r.status)
    .map(([s, n]) => ({ category: s, revenue: n, inventoryValue: n }))
    .sort((a, b) => b.revenue - a.revenue);

  const holdReasonMix = summarizeCountsByOpportunity(
    filteredRows.filter(r => r.status === "Hold" && r.holdReason),
    r => r.holdReason || "Other"
  )
    .map(([c, n]) => ({ category: c, revenue: n, inventoryValue: n }))
    .sort((a, b) => b.revenue - a.revenue);

  const brandLeaderboard = summarizeCountsByOpportunity(filteredRows, r => r.brand)
    .map(([b, n]) => ({ category: b, revenue: n, inventoryValue: n }))
    .sort((a, b) => b.revenue - a.revenue || a.category.localeCompare(b.category))
    .slice(0, 12);

  const marketStageData = buildStageStack(filteredRows, r => r.launchMarket);

  const transitionTiming = [
    { category: "Lead → MQL", values: filteredRows.filter(r => typeof r.leadToMqlDays === "number").map(r => r.leadToMqlDays ?? 0) },
    { category: "MQL → SQL", values: filteredRows.filter(r => typeof r.mqlToSqlDays === "number").map(r => r.mqlToSqlDays ?? 0) },
    { category: "SQL → Commercials", values: filteredRows.filter(r => typeof r.sqlToCommercialsDays === "number").map(r => r.sqlToCommercialsDays ?? 0) },
    { category: "Commercials → OD", values: filteredRows.filter(r => typeof r.commercialsToOdDays === "number").map(r => r.commercialsToOdDays ?? 0) }
  ]
    .map(({ category, values }) => ({
      category,
      revenue: values.length ? Math.round(values.reduce((s, v) => s + v, 0) / values.length * 10) / 10 : 0,
      inventoryValue: 0
    }))
    .filter(item => item.revenue > 0);

  const avgLeadToMql = transitionTiming.find(t => t.category === "Lead → MQL")?.revenue ?? 0;
  const avgMqlToSql = transitionTiming.find(t => t.category === "MQL → SQL")?.revenue ?? 0;

  const agingRows = [...filteredRows]
    .filter(r => ACTIVE_STATUSES.includes(r.status) || r.status === "Hold")
    .sort((a, b) => b.workingDays - a.workingDays)
    .slice(0, 8)
    .map(r => ({ brand: `${r.brand} · ${r.launchMarket}`, workingDays: r.workingDays }));

  const heatmapRows = categoryMix.map(c => c.category);
  const heatmapColumns = ["Under Discussion", "India", "SEA", "GCC"].filter(m =>
    filteredRows.some(r => r.launchMarket === m)
  );
  const heatmapValues = filteredRows.reduce<Record<string, Record<string, number>>>((acc, row) => {
    acc[row.category] ??= {};
    acc[row.category][row.launchMarket] = (acc[row.category][row.launchMarket] ?? 0) + 1;
    return acc;
  }, {});

  const priorityRows = [...filteredRows].sort((a, b) => b.workingDays - a.workingDays).slice(0, 8);

  // Health score
  const rowsWithNextStep = filteredRows.filter(r => r.nextStep?.trim()).length;
  const healthScore = Math.round(
    Math.min((activeRows.length / Math.max(totalOpportunities, 1)) * 30, 30) +
    (lateStageRows.length > 0 ? 20 : 0) +
    Math.min((1 - holdRows.length / Math.max(totalOpportunities, 1)) * 20, 20) +
    Math.min((1 - Math.min(staleRows.length / Math.max(totalOpportunities, 1), 1)) * 15, 15) +
    Math.min((rowsWithNextStep / Math.max(totalOpportunities, 1)) * 15, 15)
  );
  const healthTone = healthScore >= 75 ? "green" : healthScore >= 50 ? "orange" : "danger";
  const healthLabel = healthScore >= 75 ? "Healthy" : healthScore >= 50 ? "Needs attention" : "At risk";

  const kpiMetrics = [
    {
      label: "Total Opportunities",
      value: String(totalOpportunities),
      delta: `${marketMix(filteredRows).length} markets`,
      tone: "blue" as const,
      hint: "All opportunities in the current view.",
      detailTitle: "By market",
      detailItems: marketCounts.map(([m, c]) => `${m} · ${c}`)
    },
    {
      label: "Unique Brands",
      value: String(uniqueBrands),
      delta: `${categoryMix.length} categories`,
      tone: "green" as const,
      hint: "Distinct brands in current view.",
      detailTitle: "Brand list",
      detailItems: Array.from(new Set(filteredRows.map(r => r.brand))).sort()
    },
    {
      label: "Active",
      value: String(activeRows.length),
      delta: `${Math.round((activeRows.length / Math.max(totalOpportunities, 1)) * 100)}% of total`,
      tone: "purple" as const,
      hint: "Opportunities still moving through the pipeline.",
      detailTitle: "Active by stage",
      detailItems: stageMix.filter(s => ACTIVE_STATUSES.includes(s.category)).map(s => `${s.category} · ${s.revenue}`)
    },
    {
      label: "On Hold",
      value: `${holdPercent}%`,
      delta: `${holdRows.length} opportunities`,
      tone: "orange" as const,
      hint: "Share of pipeline currently paused.",
      detailTitle: "Hold reasons",
      detailItems: holdReasonMix.map(h => `${h.category} · ${h.revenue}`)
    },
    {
      label: "Commercials+",
      value: String(lateStageRows.length),
      delta: lateStageRows.length ? "Late-stage pipeline active" : "No late-stage yet",
      tone: "green" as const,
      hint: "Commercials, OD, Contract, or Onboarding stage.",
      detailTitle: "Late-stage opportunities",
      detailItems: lateStageRows.length ? lateStageRows.map(r => `${r.brand} · ${r.launchMarket}`) : ["None yet"]
    },
    {
      label: "Stale >45 Days",
      value: String(staleRows.length),
      delta: "Need escalation or close",
      tone: "orange" as const,
      hint: "Open opportunities with no movement in 45+ days.",
      detailTitle: "Oldest opportunities",
      detailItems: [...staleRows].sort((a, b) => b.workingDays - a.workingDays).slice(0, 12).map(r => `${r.brand} · ${r.launchMarket} · ${r.workingDays}d`)
    },
    {
      label: "Avg Lead → MQL",
      value: avgLeadToMql ? `${avgLeadToMql}d` : "—",
      delta: "Stage transition speed",
      tone: "blue" as const,
      hint: "Average days to move from Lead to MQL.",
      detailTitle: "Examples",
      detailItems: filteredRows.filter(r => typeof r.leadToMqlDays === "number").slice(0, 12).map(r => `${r.brand} · ${r.leadToMqlDays}d`)
    },
    {
      label: "Avg MQL → SQL",
      value: avgMqlToSql ? `${avgMqlToSql}d` : "—",
      delta: "Stage transition speed",
      tone: "purple" as const,
      hint: "Average days to move from MQL to SQL.",
      detailTitle: "Examples",
      detailItems: filteredRows.filter(r => typeof r.mqlToSqlDays === "number").slice(0, 12).map(r => `${r.brand} · ${r.mqlToSqlDays}d`)
    }
  ];

  const mostAdvancedMarket = marketStageData.find(m => Number(m.Commercials) > 0)?.name ?? "—";
  const topCategory = categoryMix[0]?.category ?? "—";
  const topHoldReason = holdReasonMix[0]?.category ?? "—";
  const verticalLabel = VERTICAL_LABELS[vertical];

  const businessSummary = [
    { title: "Pipeline", detail: `${totalOpportunities} opportunities across ${uniqueBrands} brands — ${activeRows.length} active, ${lateStageRows.length} in late-stage.` },
    { title: "Momentum", detail: `${mostAdvancedMarket !== "—" ? `${mostAdvancedMarket} leads in Commercials+.` : "No market in Commercials+ yet."} ${topCategory} is the top category by brand count.` },
    { title: "Blockers", detail: `${holdRows.length} opportunities paused (${holdPercent}% of pipeline). Top reason: ${topHoldReason}. ${staleRows.length} entries are stale over 45 days.` }
  ];

  // Build context for AI (uses filteredRows, not cleanRows)
  const pipelineContext = buildPipelineContext(filteredRows, vertical);

  return (
    <div className="page-stack">
      {/* ── Header ── */}
      <div className="hero-row">
        <div>
          <div className="eyebrow">{verticalLabel} Pipeline</div>
          <p className="subdued">Last updated {formatDateTime(payload.lastSyncedAt)}</p>
        </div>
        <div className="action-row">
          {/* Vertical toggle */}
          <div className="vertical-toggle">
            {(["beauty", "fashion", "all"] as Vertical[]).map(v => (
              <button
                key={v}
                className={`vertical-toggle-btn${vertical === v ? " active" : ""}`}
                onClick={() => handleVerticalChange(v)}
                type="button"
              >
                {v === "beauty" ? "💄 Beauty" : v === "fashion" ? "👗 Fashion" : "🌐 All"}
              </button>
            ))}
          </div>

          {/* Market filter */}
          <label className="filter-select">
            <span>Market</span>
            <select value={marketFilter} onChange={e => setMarketFilter(e.target.value)}>
              <option value="all">All markets ({availableMarkets.length})</option>
              {marketCounts.map(([m, c]) => <option key={m} value={m}>{m} ({c})</option>)}
            </select>
            <ChevronDown size={14} />
          </label>

          {/* Category filter */}
          <label className="filter-select">
            <span>Category</span>
            <select value={categoryFilter} onChange={e => setCategoryFilter(e.target.value)}>
              <option value="all">All categories ({availableCategories.length})</option>
              {categoryCounts.map(([c, n]) => <option key={c} value={c}>{c} ({n})</option>)}
            </select>
            <ChevronDown size={14} />
          </label>

          <TimeRangeTabs value={range} onChange={setRange} />
          <button className="secondary-button" onClick={handleRefresh} disabled={refreshing}>
            <RefreshCcw size={16} />
            {refreshing ? "Refreshing..." : "Refresh"}
          </button>
          <button className="primary-button" onClick={() => void generateBrief(pipelineContext)} type="button">
            <Sparkles size={15} />
            Weekly Brief
          </button>
          <button className="secondary-button" onClick={exportPipeline} type="button">
            <Download size={15} />
            Export
          </button>
        </div>
      </div>

      {/* ── Summary Card ── */}
      <section>
        <div className="panel executive-summary">
          <div className="panel-header">
            <div>
              <h2>Summary — {verticalLabel}</h2>
              <p>Key highlights from the current view.</p>
            </div>
          </div>
          <div className="summary-grid">
            {businessSummary.map(item => (
              <div key={item.title} className="summary-card">
                <strong>{item.title}</strong>
                <p>{item.detail}</p>
              </div>
            ))}
          </div>
          <div className="summary-footer">
            <span>{totalOpportunities} opportunities</span>
            <span>{uniqueBrands} brands</span>
            <span>{holdPercent}% on hold</span>
            <span>{staleRows.length} stale &gt;45d</span>
          </div>
          <div className="health-score-row">
            <div className="health-score-info">
              <span>Pipeline Health</span>
              <span className="beta-badge">SCORE</span>
            </div>
            <div className="health-score-track">
              <div
                className="health-score-fill"
                style={{
                  width: `${healthScore}%`,
                  background: healthTone === "green" ? "var(--green)" : healthTone === "orange" ? "var(--orange)" : "var(--danger)"
                }}
              />
            </div>
            <span className={`health-score-value health-score-${healthTone}`}>{healthScore}/100</span>
            <span className="health-score-label-value">{healthLabel}</span>
          </div>
        </div>
      </section>

      {/* ── KPI Cards ── */}
      <section className="kpi-grid">
        {kpiMetrics.map(metric => <KpiCard key={metric.label} metric={metric} />)}
      </section>

      {/* ── Stage Funnel + Market Pipeline ── */}
      <section className="insight-grid">
        <CategoryBarChart
          title="Pipeline by Stage"
          subtitle={`${verticalLabel} opportunities at each funnel stage.`}
          data={stageMix}
          keyName="revenue"
          valueLabel="Opportunities"
        />
        <StageStackedChart
          title="Market Stage Distribution"
          subtitle={`How each target market is distributed across funnel stages.`}
          data={marketStageData}
        />
      </section>

      {/* ── Category Breakdown + Brand Leaderboard ── */}
      <section className="insight-grid">
        <CategoryBarChart
          title="Brands by Category"
          subtitle={`Unique brand count per category in ${verticalLabel.toLowerCase()} pipeline.`}
          data={categoryMix}
          keyName="revenue"
          valueLabel="Brands"
        />
        <CategoryBarChart
          title="Brand Leaderboard"
          subtitle="Brands with the most live opportunities across markets."
          data={brandLeaderboard}
          keyName="revenue"
          valueLabel="Opportunities"
        />
      </section>

      {/* ── Hold Reasons + Aging Pipeline ── */}
      <section className="insight-grid">
        <DonutBreakdownChart
          title="Hold Reasons"
          subtitle="Main reasons paused opportunities are not moving."
          data={holdReasonMix}
          valueLabel="Opportunities"
        />
        <CycleTimeChart data={agingRows} />
      </section>

      {/* ── Heatmap ── */}
      {heatmapRows.length > 0 && heatmapColumns.length > 0 && (
        <section>
          <HeatmapChart
            title="Category × Market Heatmap"
            subtitle={`Where ${verticalLabel.toLowerCase()} category concentration is strongest across target markets.`}
            rows={heatmapRows}
            columns={heatmapColumns}
            values={heatmapValues}
          />
        </section>
      )}

      {/* ── Stage Timing ── */}
      {transitionTiming.length > 0 && (
        <section>
          <CategoryBarChart
            title="Stage Transition Timing"
            subtitle="Average days to move between pipeline stages."
            data={transitionTiming}
            keyName="revenue"
            valueLabel="Days"
          />
        </section>
      )}

      {/* ── Management Attention ── */}
      <section>
        <PerformanceTable
          rows={priorityRows}
          title="Management Attention"
          subtitle="Oldest open or paused opportunities — likely need a decision or escalation."
        />
      </section>

      {/* ── Full Pipeline ── */}
      <section>
        <PerformanceTable
          rows={filteredRows}
          title={`${verticalLabel} Opportunity List`}
          subtitle={`All ${filteredRows.length} opportunities in the current view.`}
        />
      </section>

      {/* ── Proactive Opportunities (Ask AI) ── */}
      <section className="panel">
        <div className="panel-header">
          <div>
            <div className="title-row">
              <h2>Ask AI — Pipeline Intelligence</h2>
              <span className="beta-badge">AI</span>
            </div>
            <p>AI analyses your live {verticalLabel.toLowerCase()} pipeline data to surface gaps, risks, and quick wins.</p>
          </div>
          <button className="primary-button" onClick={() => void scanOpportunities(pipelineContext)} disabled={oppsLoading} type="button">
            <Zap size={15} />
            {oppsLoading ? "Scanning..." : "Scan Now"}
          </button>
        </div>
        {oppsLoading && (
          <div className="brief-loading" style={{ marginTop: 16 }}>
            <div className="brief-spinner" />
            Analysing {filteredRows.length} opportunities...
          </div>
        )}
        {oppsText && !oppsLoading && (
          <div className="brief-text opps-text" style={{ marginTop: 16 }}>{oppsText}</div>
        )}
        {!oppsText && !oppsLoading && (
          <p className="subdued" style={{ marginTop: 12 }}>
            Click Scan Now — AI will analyse the {filteredRows.length} {verticalLabel.toLowerCase()} opportunities currently shown and give you specific, actionable recommendations.
          </p>
        )}
      </section>

      {/* ── Weekly Brief Modal ── */}
      {briefOpen && (
        <div className="brief-modal-overlay" onClick={() => setBriefOpen(false)}>
          <div className="brief-modal" onClick={e => e.stopPropagation()}>
            <div className="brief-modal-header">
              <div className="brief-modal-title">
                <strong>AI Weekly Brief — {verticalLabel}</strong>
                <span className="beta-badge">AI</span>
              </div>
              <button className="ghost-button agent-close-button" onClick={() => setBriefOpen(false)} type="button">
                <X size={16} />
              </button>
            </div>
            {briefLoading ? (
              <div className="brief-loading">
                <div className="brief-spinner" />
                Generating brief from {filteredRows.length} opportunities...
              </div>
            ) : (
              <>
                <div className="brief-text">{briefText}</div>
                <div className="brief-footer">
                  <button className="secondary-button" onClick={copyBrief} type="button">
                    {copied ? <Check size={14} /> : <Copy size={14} />}
                    {copied ? "Copied!" : "Copy to clipboard"}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// Helper needed in kpiMetrics (to avoid repetition)
function marketMix(rows: PerformanceRow[]) {
  return Array.from(new Set(rows.map(r => r.launchMarket).filter(Boolean)));
}
