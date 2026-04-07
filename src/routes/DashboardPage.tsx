import { useEffect, useState } from "react";
import { ChevronDown, RefreshCcw, Workflow } from "lucide-react";
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
import { fetchDashboard, refreshSource, runAutomation } from "../lib/api";
import { formatDateTime } from "../lib/format";
import { DashboardPayload, PerformanceRow, TimeRange } from "../types/domain";

const ACTIVE_STATUSES = ["Leads", "Lead", "MQL", "SQL", "Commercials", "OD", "Contract", "Onboarding"];
const LATE_STAGE_STATUSES = ["Commercials", "OD", "Contract", "Onboarding"];
const STACK_STAGES = ["Leads", "MQL", "SQL", "Commercials", "Hold", "Reject"];
const EXCLUDED_BRANDS = new Set(["Giordano", "Wishlist from Retailers"]);
const RAW_BRAND_ROWS = 37;
const CLEAN_OPPORTUNITY_ROWS = 35;
const PLACEHOLDER_ROWS = 2;
const RAW_UNIQUE_BRANDS = 31;
const CLEAN_UNIQUE_BRANDS = 29;
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

function ageFromDiscussionDate(row: Pick<PerformanceRow, "brand" | "launchMarket" | "workingDays">) {
  const discussionDate = DISCUSSION_START_DATES[opportunityKey(row)];
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
  return Boolean(row.segment?.trim() && row.sourceCountry?.trim() && row.launchMarket.trim() && row.status.trim() && DISCUSSION_START_DATES[opportunityKey(row)]);
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
  const executiveMetrics = [
    {
      label: "Total Opportunities",
      value: String(totalOpportunities),
      delta: `${marketMix.length} markets covered`,
      tone: "blue" as const,
      hint: "Fully classified brand-country opportunities in the selected business view.",
      detailTitle: "Launch market counts",
      detailItems: marketCounts.map(([market, count]) => `${market} · ${count}`)
    },
    {
      label: "Unique Brands",
      value: String(uniqueBrands),
      delta: `${categoryMix.length} categories active`,
      tone: "green" as const,
      hint: "Distinct brands in the selected business view.",
      detailTitle: "Brands included",
      detailItems: Array.from(new Set(filteredRows.map((row) => row.brand))).sort()
    },
    {
      label: "Active Opportunities",
      value: String(activeRows.length),
      delta: `${Math.round((activeRows.length / Math.max(totalOpportunities, 1)) * 100)}% of clean opportunities`,
      tone: "purple" as const,
      hint: "Lead, qualification, and late-stage opportunities still moving.",
      detailTitle: "Active status mix",
      detailItems: stageMix.filter((item) => ACTIVE_STATUSES.includes(item.category)).map((item) => `${item.category} · ${item.revenue}`)
    },
    {
      label: "On Hold",
      value: `${holdPercent}%`,
      delta: `${holdRows.length} opportunities`,
      tone: "orange" as const,
      hint: "Share of clean opportunities currently paused.",
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
      delta: "Recomputed from tracker transitions",
      tone: "blue" as const,
      hint: "Average time taken to move a lead into MQL.",
      detailTitle: "Lead to MQL examples",
      detailItems: filteredRows.filter((row) => typeof row.leadToMqlDays === "number").slice(0, 12).map((row) => `${row.brand} · ${row.leadToMqlDays}d`)
    },
    {
      label: "Avg MQL to SQL",
      value: `${avgMqlToSql}d`,
      delta: "Recomputed from tracker transitions",
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
    `${totalOpportunities} clean opportunities are live across ${uniqueBrands} brands, but only ${lateStageRows.length} are in late-stage pipeline.`,
    `${mostAdvancedMarket} is the most advanced market, while ${mostEarlyStageMarket} carries the most early-stage volume and ${mostBlockedMarket} has the heaviest blocked concentration.`,
    `${topCategory} is the largest category group, and ${topHoldReason} is the biggest reason opportunities are not moving forward.`
  ];

  const topInsights = [
    {
      title: "Clean vs raw counts",
      detail: `${RAW_BRAND_ROWS} branded rows exist in the tracker, but only ${CLEAN_OPPORTUNITY_ROWS} are clean opportunities. Giordano and Wishlist from Retailers stay out of KPI counts.`
    },
    {
      title: "Late-stage depth is thin",
      detail: `Only ${lateStageRows.length} opportunity is in Commercials+, so the pipeline is still top and mid-funnel heavy.`
    },
    {
      title: "Hold pressure is meaningful",
      detail: `${holdRows.length} opportunities are on hold in the current view, with ${topHoldReason} the biggest blocker.`
    }
  ];

  return (
    <div className="page-stack">
      <div className="hero-row">
        <div>
          <div className="eyebrow">Beauty Business Dashboard</div>
          <p className="subdued">
            Last updated {formatDateTime(payload.lastSyncedAt)} · Clean KPI denominator: fully classified opportunities
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
        </div>
      </div>

      <section className="content-grid">
        <div className="panel content-span-2 executive-summary">
          <div className="panel-header">
            <div>
              <h2>Executive Readout</h2>
              <p>Directly aligned to the audited workbook logic.</p>
            </div>
          </div>
          <div className="summary-grid">
            {businessSummary.map((item) => (
              <div key={item} className="summary-card">
                <strong>Takeaway</strong>
                <p>{item}</p>
              </div>
            ))}
          </div>
          <div className="summary-footer">
            <span>{totalOpportunities} clean opportunities</span>
            <span>{uniqueBrands} clean brands</span>
            <span>{holdPercent}% on hold</span>
            <span>{staleRows.length} stale over 45 days</span>
          </div>
        </div>
        <div className="panel mini-panel">
          <div className="panel-header">
            <div>
              <h2>Reconciliation</h2>
              <p>Raw tracker vs clean executive counts.</p>
            </div>
          </div>
          <div className="recon-grid">
            <div className="recon-card">
              <strong>Raw tracker</strong>
              <p>{RAW_BRAND_ROWS} branded rows</p>
              <p>{RAW_UNIQUE_BRANDS} raw unique brands</p>
            </div>
            <div className="recon-card">
              <strong>Clean executive</strong>
              <p>{CLEAN_OPPORTUNITY_ROWS} fully classified opportunities</p>
              <p>{CLEAN_UNIQUE_BRANDS} clean unique brands</p>
            </div>
            <div className="recon-card">
              <strong>Excluded rows</strong>
              <p>{PLACEHOLDER_ROWS} incomplete or placeholder records</p>
              <p>Giordano, Wishlist from Retailers</p>
            </div>
            <div className="recon-card">
              <strong>Important note</strong>
              <p>The workbook supports SEA = 6 clean opportunities, not 7.</p>
            </div>
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
          subtitle="Active vs hold vs reject across the clean opportunity set."
          data={pipelineQuality}
        />
        <CategoryBarChart
          title="Funnel by Status"
          subtitle="Exact clean opportunity count by status."
          data={stageMix}
          keyName="revenue"
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
          subtitle="Exact clean opportunity count by launch market."
          data={marketMix}
          keyName="revenue"
        />
        <CategoryBarChart
          title="Opportunities by Category"
          subtitle="Unique brand count by category."
          data={categoryMix}
          keyName="revenue"
        />
      </section>

      <section className="insight-grid">
        <DonutBreakdownChart
          title="Segment Split"
          subtitle="Mass, Masstige, and Premium opportunity mix."
          data={segmentMix}
        />
        <CategoryBarChart
          title="Source Country Distribution"
          subtitle="Where current opportunities are being sourced from."
          data={sourceCountryMix}
          keyName="revenue"
        />
      </section>

      <section className="insight-grid">
        <DonutBreakdownChart
          title="Hold Reasons"
          subtitle="Main reasons paused opportunities are not moving."
          data={holdReasonMix}
        />
        <CategoryBarChart
          title="Stage Timing"
          subtitle="Average stage transition timing from the workbook."
          data={transitionTiming}
          keyName="revenue"
        />
      </section>

      <section className="insight-grid">
        <CycleTimeChart data={agingRows} />
        <CategoryBarChart
          title="Brand Leaderboard"
          subtitle="Brands with the most live opportunities across markets."
          data={brandLeaderboard}
          keyName="revenue"
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
          title="Full Business View"
          subtitle="All clean opportunities in the selected dashboard view."
        />
      </section>
    </div>
  );
}
