import {
  CategoryBreakdown,
  DashboardAudit,
  DashboardPayload,
  KpiMetric,
  PerformanceRow,
  TrendPoint
} from "../types/domain";

const EXCLUDED_BRANDS = new Set(["Giordano", "Wishlist from Retailers"]);
const REQUIRED_FIELDS = [
  "BRAND",
  "CATEGORY",
  "SEGMENT",
  "COUNTRY",
  "COUNTRY FOR LAUNCH",
  "DISCUSSION START DATE",
  "STATUS"
] as const;

function trimText(value: unknown) {
  return String(value ?? "").trim();
}

function normalizeHeader(value: string) {
  return value.replace(/\s+/g, " ").trim().toUpperCase();
}

function normalizeCategory(value: string) {
  const category = trimText(value);
  if (category === "Mens Grooming") {
    return "Mens' Grooming";
  }
  return category;
}

function parseNumber(value: string) {
  const text = trimText(value);
  if (!text || text.toLowerCase() === "hold") {
    return undefined;
  }
  const numeric = Number(text);
  return Number.isFinite(numeric) ? numeric : undefined;
}

function parseDate(value: string) {
  const text = trimText(value);
  if (!text) {
    return null;
  }

  const candidates = [
    /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/,
    /^(\d{1,2})-(\d{1,2})-(\d{4})$/,
    /^(\d{4})-(\d{2})-(\d{2})$/
  ];

  for (const matcher of candidates) {
    const match = text.match(matcher);
    if (!match) {
      continue;
    }

    if (matcher === candidates[2]) {
      const date = new Date(`${match[1]}-${match[2]}-${match[3]}T00:00:00Z`);
      return Number.isNaN(date.getTime()) ? null : date;
    }

    const [, part1, part2, year] = match;
    const month = matcher === candidates[0] ? part1 : part2;
    const day = matcher === candidates[0] ? part2 : part1;
    const date = new Date(`${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}T00:00:00Z`);
    if (!Number.isNaN(date.getTime())) {
      return date;
    }
  }

  const serial = Number(text);
  if (Number.isFinite(serial) && serial > 1000) {
    const base = new Date("1899-12-30T00:00:00Z");
    base.setUTCDate(base.getUTCDate() + Math.floor(serial));
    return base;
  }

  return null;
}

function formatDate(date: Date | null) {
  if (!date) {
    return undefined;
  }
  return date.toISOString().slice(0, 10);
}

function daysSince(date: Date | null) {
  if (!date) {
    return 0;
  }
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  return Math.max(0, Math.floor(diff / 86400000));
}

function progressFromStatus(status: string, progress: string) {
  const normalized = normalizeHeader(progress || status);
  const progressMap: Record<string, number> = {
    NEW: 14,
    LEAD: 34,
    LEADS: 34,
    MQL: 56,
    SQL: 72,
    COMMERCIALS: 92,
    OD: 96,
    CONTRACT: 98,
    "ON BOARDING": 100,
    ONBOARDING: 100,
    "ON HOLD": 24,
    HOLD: 24,
    REJECTED: 8,
    REJECT: 8
  };

  return progressMap[normalized] ?? progressMap[normalizeHeader(status)] ?? 0;
}

function buildHeaderIndex(headers: string[]) {
  return headers.reduce<Record<string, number>>((map, header, index) => {
    map[normalizeHeader(header)] = index;
    return map;
  }, {});
}

function getCell(row: string[], indexMap: Record<string, number>, header: string) {
  const index = indexMap[normalizeHeader(header)];
  return index === undefined ? "" : trimText(row[index]);
}

function isCleanOpportunity(row: string[], indexMap: Record<string, number>) {
  const brand = getCell(row, indexMap, "BRAND");
  if (!brand || EXCLUDED_BRANDS.has(brand)) {
    return false;
  }

  return REQUIRED_FIELDS.every((field) => getCell(row, indexMap, field));
}

function buildAudit(rows: string[][], indexMap: Record<string, number>): DashboardAudit {
  const brandedRows = rows.filter((row) => getCell(row, indexMap, "BRAND"));
  const cleanRows = brandedRows.filter((row) => isCleanOpportunity(row, indexMap));
  const rawUniqueBrands = new Set(brandedRows.map((row) => getCell(row, indexMap, "BRAND")));
  const cleanUniqueBrands = new Set(cleanRows.map((row) => getCell(row, indexMap, "BRAND")));

  return {
    rawBrandRows: brandedRows.length,
    cleanOpportunityRows: cleanRows.length,
    placeholderRows: brandedRows.length - cleanRows.length,
    rawUniqueBrands: rawUniqueBrands.size,
    cleanUniqueBrands: cleanUniqueBrands.size
  };
}

function buildPerformanceRows(rows: string[][], indexMap: Record<string, number>) {
  return rows
    .filter((row) => isCleanOpportunity(row, indexMap))
    .map<PerformanceRow>((row) => {
      const discussionStartDate = parseDate(getCell(row, indexMap, "DISCUSSION START DATE"));
      const providedWorkingDays = parseNumber(getCell(row, indexMap, "Working Days"));
      const progress = getCell(row, indexMap, "PROGRESS");
      const status = getCell(row, indexMap, "STATUS");

      return {
        brand: getCell(row, indexMap, "BRAND"),
        category: normalizeCategory(getCell(row, indexMap, "CATEGORY")),
        segment: getCell(row, indexMap, "SEGMENT"),
        company: getCell(row, indexMap, "COMPANY") || undefined,
        sourceCountry: getCell(row, indexMap, "COUNTRY"),
        discussionStartDate: formatDate(discussionStartDate),
        launchMarket: getCell(row, indexMap, "COUNTRY FOR LAUNCH"),
        quadrant: getCell(row, indexMap, "QUADRANT") || undefined,
        status,
        workingDays: providedWorkingDays ?? daysSince(discussionStartDate),
        progress: progressFromStatus(status, progress),
        nextStep: getCell(row, indexMap, "Next  Steps") || getCell(row, indexMap, "Next Steps"),
        followUpStatus: getCell(row, indexMap, "FOLLOW UP") || undefined,
        holdReason: getCell(row, indexMap, "REASON IF ON HOLD") || undefined,
        warning: getCell(row, indexMap, "WARNING") || undefined,
        leadToMqlDays: parseNumber(getCell(row, indexMap, "Lead→MQL")),
        mqlToSqlDays: parseNumber(getCell(row, indexMap, "MQL→SQL")),
        sqlToCommercialsDays: parseNumber(getCell(row, indexMap, "SQL→COMMERCIALS")),
        commercialsToOdDays: parseNumber(getCell(row, indexMap, "COMMERCIALS→OD"))
      };
    });
}

function buildCategoryMix(rows: PerformanceRow[]): CategoryBreakdown[] {
  const groups = rows.reduce((map, row) => {
    const brands = map.get(row.category) ?? new Set<string>();
    brands.add(row.brand);
    map.set(row.category, brands);
    return map;
  }, new Map<string, Set<string>>());

  return Array.from(groups.entries())
    .map(([category, brands]) => ({
      category,
      revenue: brands.size,
      inventoryValue: Math.max(1, Math.round(brands.size / 2))
    }))
    .sort((left, right) => right.revenue - left.revenue);
}

function buildMarketMix(rows: PerformanceRow[]): CategoryBreakdown[] {
  const groups = rows.reduce((map, row) => {
    map.set(row.launchMarket, (map.get(row.launchMarket) ?? 0) + 1);
    return map;
  }, new Map<string, number>());

  return Array.from(groups.entries())
    .map(([category, revenue]) => ({
      category,
      revenue,
      inventoryValue: Math.max(1, Math.round(revenue / 2))
    }))
    .sort((left, right) => right.revenue - left.revenue);
}

function buildTrend(rows: PerformanceRow[]): TrendPoint[] {
  const stages = ["Leads", "MQL", "SQL", "Commercials", "Hold", "Reject"];
  const transitions: Record<string, number> = {
    Leads: average(rows.flatMap((row) => (typeof row.leadToMqlDays === "number" ? [row.leadToMqlDays] : []))),
    MQL: average(rows.flatMap((row) => (typeof row.mqlToSqlDays === "number" ? [row.mqlToSqlDays] : []))),
    SQL: average(rows.flatMap((row) => (typeof row.sqlToCommercialsDays === "number" ? [row.sqlToCommercialsDays] : []))),
    Commercials: average(rows.flatMap((row) => (typeof row.commercialsToOdDays === "number" ? [row.commercialsToOdDays] : []))),
    Hold: average(rows.filter((row) => row.status === "Hold").map((row) => row.workingDays)),
    Reject: average(rows.filter((row) => row.status === "Reject").map((row) => row.workingDays))
  };

  return stages.map((stage) => {
    const stageRows = rows.filter((row) => row.status === stage);
    return {
      label: stage,
      primary: stageRows.length,
      secondary: average(stageRows.map((row) => row.workingDays)),
      tertiary: transitions[stage] || 0
    };
  });
}

function average(values: number[]) {
  if (!values.length) {
    return 0;
  }
  return Math.round((values.reduce((sum, value) => sum + value, 0) / values.length) * 10) / 10;
}

function buildMetrics(rows: PerformanceRow[]): KpiMetric[] {
  const uniqueBrands = new Set(rows.map((row) => row.brand)).size;
  const holdCount = rows.filter((row) => row.status === "Hold").length;
  const lateStageCount = rows.filter((row) => ["Commercials", "OD", "Contract", "Onboarding"].includes(row.status)).length;

  return [
    {
      label: "Total Opportunities",
      value: String(rows.length),
      delta: `${uniqueBrands} brands`,
      tone: "blue",
      hint: "Current opportunities",
      detailTitle: "Brands",
      detailItems: Array.from(new Set(rows.map((row) => row.brand))).sort()
    },
    {
      label: "On Hold",
      value: String(holdCount),
      delta: `${Math.round((holdCount / Math.max(rows.length, 1)) * 100)}% of total`,
      tone: "orange",
      hint: "Paused opportunities",
      detailTitle: "Hold reasons",
      detailItems: Array.from(
        rows.reduce((map, row) => {
          if (row.status === "Hold" && row.holdReason) {
            map.set(row.holdReason, (map.get(row.holdReason) ?? 0) + 1);
          }
          return map;
        }, new Map<string, number>())
      ).map(([reason, count]) => `${reason} · ${count}`)
    },
    {
      label: "Commercials+",
      value: String(lateStageCount),
      delta: lateStageCount ? "Late-stage pipeline present" : "No late-stage depth yet",
      tone: "green",
      hint: "Late-stage opportunities",
      detailTitle: "Late-stage list",
      detailItems: rows.filter((row) => ["Commercials", "OD", "Contract", "Onboarding"].includes(row.status)).map((row) => `${row.brand} · ${row.launchMarket}`)
    }
  ];
}

export function parseBeautyTrackerSheet(values: string[][]) {
  if (!values.length) {
    return null;
  }

  const headers = values[0].map((header) => trimText(header));
  const dataRows = values.slice(1).filter((row) => row.some((cell) => trimText(cell)));
  const indexMap = buildHeaderIndex(headers);
  const audit = buildAudit(dataRows, indexMap);
  const performance = buildPerformanceRows(dataRows, indexMap);

  return {
    headers,
    audit,
    performance,
    metrics: buildMetrics(performance),
    trend: buildTrend(performance),
    categoryMix: buildCategoryMix(performance),
    inventoryHealth: buildMarketMix(performance)
  };
}

export function mergeSheetDataIntoDashboard(
  base: DashboardPayload,
  values: string[][],
  syncedAt = new Date().toISOString()
): DashboardPayload {
  const parsed = parseBeautyTrackerSheet(values);
  if (!parsed) {
    return {
      ...base,
      sourceStatus: "stale",
      lastSyncedAt: syncedAt,
      generatedAt: syncedAt
    };
  }

  return {
    ...base,
    generatedAt: syncedAt,
    lastSyncedAt: syncedAt,
    sourceStatus: "live",
    audit: parsed.audit,
    sheetHeaders: parsed.headers,
    performance: parsed.performance,
    metrics: parsed.metrics,
    trend: parsed.trend,
    categoryMix: parsed.categoryMix,
    inventoryHealth: parsed.inventoryHealth
  };
}
