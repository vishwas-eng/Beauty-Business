import { useEffect, useState } from "react";
import { Check, ChevronDown, Copy, Download, RefreshCcw, Sparkles, Workflow, X, Zap } from "lucide-react";
import {
  CategoryBarChart,
  CycleTimeChart,
  DonutBreakdownChart,
  HeatmapChart,
  RevenueTrendChart,
  StageStackedChart
} from "../components/ChartCard";
import { KpiCard } from "../components/KpiCard";
import { PerformanceTable } from "../components/PerformanceTable";
import { TimeRangeTabs } from "../components/TimeRangeTabs";
import { fetchDashboard, queryAgent, refreshSource, runAutomation } from "../lib/api";
import { formatDateTime } from "../lib/format";
import { findCompetitiveOverlaps } from "../lib/scoring";
import { DashboardPayload, PerformanceRow, TimeRange } from "../types/domain";

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
  if (value === "Mens Grooming") {
    return "Mens' Grooming";
  }
  return value;
}

function opportunityKey(row: Pick<PerformanceRow, "brand" | "launchMarket">) {
  return `${row.brand.trim()}||${row.launchMarket.trim()}`;
}

function ageFromDiscussionDate(row: Pick<PerformanceRow, "brand" | "launchMarket" | "workingDays" | "discussionStartDate">) {
  const discussionDate =
    "discussionStartDate" in row && typeof row.discussionStartDate === "string" && row.discussionStartDate
      ? row.discussionStartDate
      : DISCUSSION_START_DATES[opportunityKey(row)];
  if (!discussionDate) {
    return row.workingDays;
  }
  const diff = AS_OF_DATE.getTime() - new Date(`${discussionDate}T00:00:00Z`).getTime();
  return Math.max(0, Math.round(diff / 86400000));
}

function isExecutiveOpportunity(row: PerformanceRow) {
  const brand = row.brand.trim();
  if (!brand || EXCLUDED_BRANDS.has(brand)) {
    return false;
  }
  if (!normalizeCategory(row.category) || normalizeCategory(row.category) === "Unassigned") {
    return false;
  }
  return Boolean(
    row.segment?.trim() &&
      row.sourceCountry?.trim() &&
      row.launchMarket.trim() &&
      row.status.trim() &&
      (row.discussionStartDate || DISCUSSION_START_DATES[opportunityKey(row)])
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
  groupBy: (row: PerformanceRow) => string,
  countMode: "opportunity" | "brand"
) {
  const grouped = new Map<string, Record<string, number> | Map<string, Set<string>>>();

  rows.forEach((row) => {
    const group = groupBy(row) || "Unclassified";
    const stage = STACK_STAGES.includes(row.status) ? row.status : "Reject";

    if (!grouped.has(group)) {
      grouped.set(group, countMode === "brand" ? new Map<string, Set<string>>() : {});
    }

    if (countMode === "brand") {
      const stageMap = grouped.get(group) as Map<string, Set<string>>;
      const brands = stageMap.get(stage) ?? new Set<string>();
      brands.add(row.brand);
      stageMap.set(stage, brands);
    } else {
      const stageMap = grouped.get(group) as Record<string, number>;
      stageMap[stage] = (stageMap[stage] ?? 0) + 1;
    }
  });

  return Array.from(grouped.entries())
    .map(([name, value]) => {
      const base: Record<string, string | number> = { name };
      STACK_STAGES.forEach((stage) => {
        if (countMode === "brand") {
          base[stage] = (value as Map<string, Set<string>>).get(stage)?.size ?? 0;
        } else {
          base[stage] = (value as Record<string, number>)[stage] ?? 0;
        }
      });
      return base;
    })
    .sort(
      (left, right) =>
        Number(right.Leads) + Number(right.MQL) + Number(right.Commercials) - (Number(left.Leads) + Number(left.MQL) + Number(left.Commercials))
    );
}

export function DashboardPage() {
  const [range, setRange] = useState<TimeRange>("mtd");
  const [payload, setPayload] = useState<DashboardPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [automationBusy, setAutomationBusy] = useState(false);
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
    void fetchDashboard(range)
      .then(setPayload)
      .finally(() => setLoading(false));
  }, [range]);

  async function handleRefresh() {
    setRefreshing(true);
    const next = await refreshSource(range);
    setPayload(next);
    setRefreshing(false);
  }

  async function handleAutomationRun() {
    setAutomationBusy(true);
    await runAutomation(range);
    const next = await fetchDashboard(range);
    setPayload(next);
    setAutomationBusy(false);
  }

  async function generateBrief() {
    setBriefOpen(true);
    setBriefLoading(true);
    setBriefText("");
    const res = await queryAgent(
      "Generate a concise weekly executive brief for our beauty brand pipeline. Write as a senior analyst briefing a VP before a Monday meeting. Include: 1) One-line pipeline snapshot with key numbers, 2) Top 2 risks or blockers with specific brand/market examples, 3) Late-stage pipeline update, 4) 3 recommended actions for this week. Under 200 words. Be direct and specific."
    );
    setBriefText(res.answer);
    setBriefLoading(false);
  }

  function copyBrief() {
    void navigator.clipboard.writeText(briefText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  async function scanOpportunities() {
    setOppsLoading(true);
    setOppsText("");
    const res = await queryAgent(
      "Scan the pipeline and identify 3-5 proactive opportunities we are missing or should act on urgently. Look for: open market slots with no brand in that category yet, brands that are close to closing with no next step set, categories that are underrepresented in a key market, and any quick wins we could unlock this week. Be specific — name actual brands and markets. Format as a numbered list."
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

  const cleanRows = payload.performance.filter(isExecutiveOpportunity).map(normalizeRow);
  const filteredRows = cleanRows.filter((row) => {
    const matchesMarket = marketFilter === "all" || row.launchMarket === marketFilter;
    const matchesCategory = categoryFilter === "all" || row.category === categoryFilter;
    return matchesMarket && matchesCategory;
  });

  const marketCounts = summarizeCountsByOpportunity(cleanRows, (row) => row.launchMarket).sort(([left], [right]) =>
    left.localeCompare(right)
  );
  const categoryCounts = summarizeCountsByUniqueBrand(cleanRows, (row) => row.category).sort(([left], [right]) =>
    left.localeCompare(right)
  );
  const availableMarkets = marketCounts.map(([market]) => market);
  const availableCategories = categoryCounts.map(([category]) => category);

  const activeRows = filteredRows.filter((row) => ACTIVE_STATUSES.includes(row.status));
  const holdRows = filteredRows.filter((row) => row.status === "Hold");
  const rejectRows = filteredRows.filter((row) => row.status === "Reject");
  const lateStageRows = filteredRows.filter((row) => LATE_STAGE_STATUSES.includes(row.status));
  const staleRows = filteredRows.filter((row) => row.workingDays > 45);

  const priorityRows = [...filteredRows].sort((left, right) => right.workingDays - left.workingDays).slice(0, 8);
  const agingRows = [...filteredRows]
    .filter((row) => ACTIVE_STATUSES.includes(row.status) || row.status === "Hold")
    .sort((left, right) => right.workingDays - left.workingDays)
    .slice(0, 8)
    .map((row) => ({
      brand: `${row.brand} · ${row.launchMarket}`,
      workingDays: row.workingDays
    }));

  const categoryMix = summarizeCountsByUniqueBrand(filteredRows, (row) => row.category)
    .map(([category, count]) => ({ category, revenue: count, inventoryValue: Math.max(1, Math.round(count / 2)) }))
    .sort((left, right) => right.revenue - left.revenue);
  const marketMix = summarizeCountsByOpportunity(filteredRows, (row) => row.launchMarket)
    .map(([category, count]) => ({ category, revenue: count, inventoryValue: Math.max(1, Math.round(count / 2)) }))
    .sort((left, right) => right.revenue - left.revenue);
  const segmentMix = summarizeCountsByOpportunity(filteredRows, (row) => row.segment || "Unassigned")
    .map(([category, count]) => ({ category, revenue: count, inventoryValue: Math.max(1, Math.round(count / 2)) }))
    .sort((left, right) => right.revenue - left.revenue);
  const sourceCountryMix = summarizeCountsByOpportunity(filteredRows, (row) => row.sourceCountry || "Unassigned")
    .map(([category, count]) => ({ category, revenue: count, inventoryValue: Math.max(1, Math.round(count / 2)) }))
    .sort((left, right) => right.revenue - left.revenue);
  const brandLeaderboard = summarizeCountsByOpportunity(filteredRows, (row) => row.brand)
    .map(([category, count]) => ({ category, revenue: count, inventoryValue: count }))
    .sort((left, right) => right.revenue - left.revenue || left.category.localeCompare(right.category))
    .slice(0, 12);
  const stageMix = summarizeCountsByOpportunity(filteredRows, (row) => row.status)
    .map(([category, count]) => ({ category, revenue: count, inventoryValue: count }))
    .sort((left, right) => right.revenue - left.revenue);
  const transitionTiming = [
    {
      category: "Lead to MQL",
      values: filteredRows.filter((item) => typeof item.leadToMqlDays === "number").map((item) => item.leadToMqlDays ?? 0)
    },
    {
      category: "MQL to SQL",
      values: filteredRows.filter((item) => typeof item.mqlToSqlDays === "number").map((item) => item.mqlToSqlDays ?? 0)
    },
    {
      category: "SQL to Commercials",
      values: filteredRows.filter((item) => typeof item.sqlToCommercialsDays === "number").map((item) => item.sqlToCommercialsDays ?? 0)
    },
    {
      category: "Commercials to OD",
      values: filteredRows.filter((item) => typeof item.commercialsToOdDays === "number").map((item) => item.commercialsToOdDays ?? 0)
    }
  ]
    .map(({ category, values }) => ({
      category,
      revenue: values.length ? Math.round((values.reduce((sum, value) => sum + value, 0) / values.length) * 10) / 10 : 0,
      inventoryValue: 0
    }))
    .filter((item) => item.revenue > 0);
  const avgLeadToMql = transitionTiming.find((item) => item.category === "Lead to MQL")?.revenue ?? 0;
  const avgMqlToSql = transitionTiming.find((item) => item.category === "MQL to SQL")?.revenue ?? 0;
  const stageVelocityData = ["Leads", "MQL", "SQL", "Commercials", "Hold", "Reject"].map((stage) => {
    const rows = filteredRows.filter((row) => row.status === stage);
    const transitionLookup: Record<string, number> = {
      Leads: avgLeadToMql,
      MQL: avgMqlToSql,
      SQL: transitionTiming.find((item) => item.category === "SQL to Commercials")?.revenue ?? 0,
      Commercials: transitionTiming.find((item) => item.category === "Commercials to OD")?.revenue ?? 0,
      Hold: holdRows.length ? Math.round(holdRows.reduce((sum, row) => sum + row.workingDays, 0) / holdRows.length) : 0,
      Reject: rejectRows.length ? Math.round(rejectRows.reduce((sum, row) => sum + row.workingDays, 0) / rejectRows.length) : 0
    };
    return {
      label: stage,
      primary: rows.length,
      secondary: rows.length ? Math.round(rows.reduce((sum, row) => sum + row.workingDays, 0) / rows.length) : 0,
      tertiary: transitionLookup[stage] ?? 0
    };
  });
  const holdReasonMix = summarizeCountsByOpportunity(
    filteredRows.filter((item) => item.status === "Hold" && item.holdReason),
    (row) => row.holdReason || "Other"
  )
    .map(([category, count]) => ({ category, revenue: count, inventoryValue: count }))
    .sort((left, right) => right.revenue - left.revenue);
  const pipelineQuality = [
    { category: "Active", revenue: activeRows.length, inventoryValue: activeRows.length },
    { category: "Hold", revenue: holdRows.length, inventoryValue: holdRows.length },
    { category: "Reject", revenue: rejectRows.length, inventoryValue: rejectRows.length }
  ].filter((item) => item.revenue > 0);

  const marketStageData = buildStageStack(filteredRows, (row) => row.launchMarket, "opportunity");
  const categoryStageData = buildStageStack(filteredRows, (row) => row.category, "opportunity");
  const heatmapRows = categoryMix.map((item) => item.category);
  const heatmapColumns = ["Under Discussion", "India", "SEA", "GCC"].filter((market) =>
    filteredRows.some((row) => row.launchMarket === market)
  );
  const heatmapValues = filteredRows.reduce<Record<string, Record<string, number>>>((acc, row) => {
    const category = row.category;
    const market = row.launchMarket;
    acc[category] ??= {};
    acc[category][market] = (acc[category][market] ?? 0) + 1;
    return acc;
  }, {});

  const totalOpportunities = filteredRows.length;
  const uniqueBrands = countUniqueBrands(filteredRows);
  const holdPercent = totalOpportunities ? Math.round((holdRows.length / totalOpportunities) * 100) : 0;
  const competitiveOverlaps = findCompetitiveOverlaps(filteredRows);
  const rowsWithNextStep = filteredRows.filter((row) => row.nextStep?.trim()).length;
  const healthScore = Math.round(
    Math.min((activeRows.length / Math.max(totalOpportunities, 1)) * 30, 30) +
    (lateStageRows.length > 0 ? 20 : 0) +
    Math.min((1 - holdRows.length / Math.max(totalOpportunities, 1)) * 20, 20) +
    Math.min((1 - Math.min(staleRows.length / Math.max(totalOpportunities, 1), 1)) * 15, 15) +
    Math.min((rowsWithNextStep / Math.max(totalOpportunities, 1)) * 15, 15)
  );
  const healthTone = healthScore >= 75 ? "green" : healthScore >= 50 ? "orange" : "danger";
  const healthLabel = healthScore >= 75 ? "Healthy" : healthScore >= 50 ? "Needs attention" : "At risk";
  const executiveMetrics = [
    {
      label: "Total Opportunities",
      value: String(totalOpportunities),
      delta: `${marketMix.length} markets covered`,
      tone: "blue" as const,
      hint: "Current opportunities in this view.",
      detailTitle: "Launch market counts",
      detailItems: marketCounts.map(([market, count]) => `${market} · ${count}`)
    },
    {
      label: "Unique Brands",
      value: String(uniqueBrands),
      delta: `${categoryMix.length} categories active`,
      tone: "green" as const,
      hint: "Distinct brands in this view.",
      detailTitle: "Brands included",
      detailItems: Array.from(new Set(filteredRows.map((row) => row.brand))).sort()
    },
    {
      label: "Active Opportunities",
      value: String(activeRows.length),
      delta: `${Math.round((activeRows.length / Math.max(totalOpportunities, 1)) * 100)}% of total`,
      tone: "purple" as const,
      hint: "Opportunities that are still moving.",
      detailTitle: "Active status mix",
      detailItems: stageMix.filter((item) => ACTIVE_STATUSES.includes(item.category)).map((item) => `${item.category} · ${item.revenue}`)
    },
    {
      label: "On Hold",
      value: `${holdPercent}%`,
      delta: `${holdRows.length} opportunities`,
      tone: "orange" as const,
      hint: "Share of opportunities currently paused.",
      detailTitle: "Hold reasons",
      detailItems: holdReasonMix.map((item) => `${item.category} · ${item.revenue}`)
    },
    {
      label: "Commercials+",
      value: String(lateStageRows.length),
      delta: lateStageRows.length ? "Late-stage pipeline present" : "No late-stage depth yet",
      tone: "green" as const,
      hint: "Commercials, OD, contract, or onboarding-stage opportunities.",
      detailTitle: "Late-stage opportunities",
      detailItems: lateStageRows.length ? lateStageRows.map((row) => `${row.brand} · ${row.launchMarket}`) : ["No late-stage opportunities"]
    },
    {
      label: "Avg Lead to MQL",
      value: `${avgLeadToMql}d`,
      delta: "Based on current stage movement",
      tone: "blue" as const,
      hint: "Average time taken to move a lead into MQL.",
      detailTitle: "Lead to MQL examples",
      detailItems: filteredRows.filter((row) => typeof row.leadToMqlDays === "number").slice(0, 12).map((row) => `${row.brand} · ${row.leadToMqlDays}d`)
    },
    {
      label: "Avg MQL to SQL",
      value: `${avgMqlToSql}d`,
      delta: "Based on current stage movement",
      tone: "purple" as const,
      hint: "Average time taken to move MQL opportunities toward SQL.",
      detailTitle: "MQL to SQL examples",
      detailItems: filteredRows.filter((row) => typeof row.mqlToSqlDays === "number").slice(0, 12).map((row) => `${row.brand} · ${row.mqlToSqlDays}d`)
    },
    {
      label: "Stale >45 Days",
      value: String(staleRows.length),
      delta: "Based on discussion start date",
      tone: "orange" as const,
      hint: "Older opportunities likely needing escalation, closure, or re-qualification.",
      detailTitle: "Oldest open opportunities",
      detailItems: [...staleRows].sort((left, right) => right.workingDays - left.workingDays).slice(0, 12).map((row) => `${row.brand} · ${row.launchMarket} · ${row.workingDays}d`)
    }
  ];

  const mostAdvancedMarket = marketStageData.find((item) => Number(item.Commercials) > 0)?.name ?? "SEA";
  const mostEarlyStageMarket =
    [...marketStageData].sort((left, right) => Number(right.Leads) - Number(left.Leads))[0]?.name ?? "India";
  const mostBlockedMarket =
    [...marketStageData].sort(
      (left, right) => Number(right.Hold) + Number(right.Reject) - (Number(left.Hold) + Number(left.Reject))
    )[0]?.name ?? "Under Discussion";
  const topCategory = categoryMix[0]?.category ?? "Makeup";
  const topHoldReason = holdReasonMix[0]?.category ?? "Too small";

  const businessSummary = [
    {
      title: "Pipeline",
      detail: `${totalOpportunities} opportunities are live across ${uniqueBrands} brands, with ${activeRows.length} still active and ${lateStageRows.length} in late-stage progress.`
    },
    {
      title: "Region",
      detail: `${mostAdvancedMarket} is furthest ahead, ${mostEarlyStageMarket} has the most early-stage activity, and ${mostBlockedMarket} has the highest paused concentration.`
    },
    {
      title: "Category",
      detail: `${topCategory} has the highest volume, while ${topHoldReason} is the biggest reason progress is slowing.`
    }
  ];

  const topInsights = [
    {
      title: "Pipeline balance",
      detail: `${activeRows.length} opportunities are active, ${holdRows.length} are paused, and ${rejectRows.length} have been closed out from the current view.`
    },
    {
      title: "Late-stage pipeline",
      detail: `Only ${lateStageRows.length} opportunity is in Commercials+, so the pipeline is still top and mid-funnel heavy.`
    },
    {
      title: "Main blocker",
      detail: `${holdRows.length} opportunities are on hold in the current view, with ${topHoldReason} the biggest blocker.`
    }
  ];

  return (
    <div className="page-stack">
      <div className="hero-row">
        <div>
          <div className="eyebrow">Beauty</div>
          <p className="subdued">
            Last updated {formatDateTime(payload.lastSyncedAt)}
          </p>
        </div>
        <div className="action-row">
          <label className="filter-select">
            <span>Market</span>
            <select value={marketFilter} onChange={(event) => setMarketFilter(event.target.value)}>
              <option value="all">{`All markets (${availableMarkets.length})`}</option>
              {marketCounts.map(([market, count]) => (
                <option key={market} value={market}>
                  {`${market} (${count})`}
                </option>
              ))}
            </select>
            <ChevronDown size={14} />
          </label>
          <label className="filter-select">
            <span>Category</span>
            <select value={categoryFilter} onChange={(event) => setCategoryFilter(event.target.value)}>
              <option value="all">{`All categories (${availableCategories.length})`}</option>
              {categoryCounts.map(([category, count]) => (
                <option key={category} value={category}>
                  {`${category} (${count})`}
                </option>
              ))}
            </select>
            <ChevronDown size={14} />
          </label>
          <TimeRangeTabs value={range} onChange={setRange} />
          <button className="secondary-button" onClick={handleRefresh} disabled={refreshing}>
            <RefreshCcw size={16} />
            {refreshing ? "Refreshing..." : "Refresh now"}
          </button>
          <button className="secondary-button" onClick={() => void handleAutomationRun()} disabled={automationBusy}>
            <Workflow size={16} />
            {automationBusy ? "Running automation..." : "Run automation"}
          </button>
          <button className="primary-button" onClick={() => void generateBrief()} type="button">
            <Sparkles size={15} />
            Weekly Brief
            <span className="beta-badge" style={{ marginLeft: 2 }}>BETA</span>
          </button>
          <button className="secondary-button" onClick={exportPipeline} type="button" title="Export pipeline as PDF">
            <Download size={15} />
            Export
          </button>
        </div>
      </div>

      <section>
        <div className="panel executive-summary">
          <div className="panel-header">
            <div>
              <h2>Summary</h2>
              <p>Key highlights from the current business view.</p>
            </div>
          </div>
          <div className="summary-grid">
            {businessSummary.map((item) => (
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
            <span>{staleRows.length} stale over 45 days</span>
          </div>
          <div className="health-score-row">
            <div className="health-score-info">
              <span>Pipeline Health</span>
              <span className="beta-badge">BETA</span>
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

      <section className="kpi-grid">
        {executiveMetrics.map((metric) => (
          <KpiCard key={metric.label} metric={metric} />
        ))}
      </section>

      <section className="insight-notes">
        {topInsights.map((item) => (
          <div key={item.title} className="insight-note">
            <strong>{item.title}</strong>
            <p>{item.detail}</p>
          </div>
        ))}
      </section>

      <section className="insight-grid">
        <DonutBreakdownChart
          title="Pipeline Quality"
          subtitle="Current mix of active, on hold, and rejected opportunities."
          data={pipelineQuality}
          valueLabel="Opportunities"
        />
        <CategoryBarChart
          title="Funnel by Status"
          subtitle="Opportunity count by stage."
          data={stageMix}
          keyName="revenue"
          valueLabel="Opportunities"
        />
      </section>

      <section className="insight-grid">
        <StageStackedChart
          title="Launch Market by Status"
          subtitle="How each target market is distributed across the current stages."
          data={marketStageData}
        />
        <StageStackedChart
          title="Category by Status"
          subtitle="How categories are progressing, pausing, or dropping out."
          data={categoryStageData}
        />
      </section>

      <section className="insight-grid">
        <CategoryBarChart
          title="Opportunities by Launch Market"
          subtitle="Opportunity count by launch market."
          data={marketMix}
          keyName="revenue"
          valueLabel="Opportunities"
        />
        <CategoryBarChart
          title="Opportunities by Category"
          subtitle="Unique brand count by category."
          data={categoryMix}
          keyName="revenue"
          valueLabel="Brands"
        />
      </section>

      <section className="insight-grid">
        <DonutBreakdownChart
          title="Segment Split"
          subtitle="Mass, Masstige, and Premium opportunity mix."
          data={segmentMix}
          valueLabel="Opportunities"
        />
        <CategoryBarChart
          title="Source Country Distribution"
          subtitle="Where current opportunities are being sourced from."
          data={sourceCountryMix}
          keyName="revenue"
          valueLabel="Opportunities"
        />
      </section>

      <section className="insight-grid">
        <DonutBreakdownChart
          title="Hold Reasons"
          subtitle="Main reasons paused opportunities are not moving."
          data={holdReasonMix}
          valueLabel="Opportunities"
        />
        <CategoryBarChart
          title="Stage Timing"
          subtitle="Average time spent moving between stages."
          data={transitionTiming}
          keyName="revenue"
          valueLabel="Days"
        />
      </section>

      <section className="insight-grid">
        <CycleTimeChart data={agingRows} />
        <CategoryBarChart
          title="Brand Leaderboard"
          subtitle="Brands with the most live opportunities across markets."
          data={brandLeaderboard}
          keyName="revenue"
          valueLabel="Opportunities"
        />
      </section>

      <section className="insight-grid">
        <HeatmapChart
          title="Category by Launch Market"
          subtitle="Where category concentration is strongest across target markets."
          rows={heatmapRows}
          columns={heatmapColumns}
          values={heatmapValues}
        />
        <RevenueTrendChart data={stageVelocityData} />
      </section>

      <section>
        <PerformanceTable
          rows={priorityRows}
          title="Management Attention"
          subtitle="Oldest open or held opportunities that likely need an intervention or a decision."
        />
      </section>

      <section>
        <PerformanceTable
          rows={filteredRows}
          title="Opportunity List"
          subtitle="All opportunities in the current view."
        />
      </section>

      {competitiveOverlaps.length > 0 && (
        <section className="panel">
          <div className="panel-header">
            <div>
              <div className="title-row">
                <h2>Competitive Overlaps</h2>
                <span className="beta-badge">BETA</span>
              </div>
              <p>{competitiveOverlaps.length} category–market combinations with multiple active brands competing for the same slot.</p>
            </div>
          </div>
          <div className="overlap-grid">
            {competitiveOverlaps.map((overlap) => (
              <div key={`${overlap.category}||${overlap.market}`} className="overlap-card">
                <div className="overlap-header">
                  <strong>{overlap.category}</strong>
                  <span className="overlap-market">{overlap.market}</span>
                  <span className="overlap-count">{overlap.brands.length} brands</span>
                </div>
                <div className="overlap-brands">
                  {overlap.brands.map((b) => (
                    <span key={b.brand} className="overlap-brand-chip">{b.brand} · {b.status}</span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      <section className="panel">
        <div className="panel-header">
          <div>
            <div className="title-row">
              <h2>Proactive Opportunities</h2>
              <span className="beta-badge">BETA</span>
            </div>
            <p>AI scans the pipeline for gaps, quick wins, and untapped market slots.</p>
          </div>
          <button className="primary-button" onClick={() => void scanOpportunities()} disabled={oppsLoading} type="button">
            <Zap size={15} />
            {oppsLoading ? "Scanning..." : "Scan Now"}
          </button>
        </div>
        {oppsLoading && (
          <div className="brief-loading" style={{ marginTop: 16 }}>
            <div className="brief-spinner" />
            Scanning pipeline for opportunities...
          </div>
        )}
        {oppsText && !oppsLoading && (
          <div className="brief-text opps-text" style={{ marginTop: 16 }}>{oppsText}</div>
        )}
        {!oppsText && !oppsLoading && (
          <p className="subdued" style={{ marginTop: 12 }}>Click Scan Now to get AI-powered opportunity recommendations based on current pipeline gaps.</p>
        )}
      </section>

      {briefOpen ? (
        <div className="brief-modal-overlay" onClick={() => setBriefOpen(false)}>
          <div className="brief-modal" onClick={(e) => e.stopPropagation()}>
            <div className="brief-modal-header">
              <div className="brief-modal-title">
                <strong>AI Weekly Brief</strong>
                <span className="beta-badge">BETA</span>
              </div>
              <button className="ghost-button agent-close-button" onClick={() => setBriefOpen(false)} type="button">
                <X size={16} />
              </button>
            </div>
            {briefLoading ? (
              <div className="brief-loading">
                <div className="brief-spinner" />
                Generating your brief...
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
      ) : null}
    </div>
  );
}
