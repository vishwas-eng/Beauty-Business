import { PerformanceRow } from "../types/domain";

const STAGE_SCORES: Record<string, number> = {
  Onboarding: 85,
  Contract: 80,
  OD: 75,
  Commercials: 65,
  SQL: 50,
  MQL: 35,
  Leads: 20,
  Lead: 20,
  Hold: 10,
  Reject: 0
};

export function computeBrandScore(row: PerformanceRow): number {
  let score = STAGE_SCORES[row.status] ?? 20;

  // Freshness bonus/penalty
  if (row.workingDays < 30) score += 20;
  else if (row.workingDays < 45) score += 12;
  else if (row.workingDays < 60) score += 4;
  else if (row.workingDays < 90) score -= 8;
  else score -= 20;

  // Has a concrete next step
  if (row.nextStep?.trim()) score += 10;

  // Premium segment worth more
  if (row.segment === "Premium") score += 5;

  return Math.max(0, Math.min(100, Math.round(score)));
}

export function scoreTone(score: number): "green" | "blue" | "orange" | "red" {
  if (score >= 70) return "green";
  if (score >= 50) return "blue";
  if (score >= 30) return "orange";
  return "red";
}

export function scoreLabel(score: number): string {
  if (score >= 70) return "Hot";
  if (score >= 50) return "Warm";
  if (score >= 30) return "Cooling";
  return "At Risk";
}

const ACTIVE_STATUSES = new Set([
  "Leads", "Lead", "MQL", "SQL", "Commercials", "OD", "Contract", "Onboarding"
]);

/** Brand is active but has been in pipeline a long time with no late-stage progress */
export function isGoingCold(row: PerformanceRow): boolean {
  return ACTIVE_STATUSES.has(row.status) && row.workingDays > 35 &&
    !["Commercials", "OD", "Contract", "Onboarding"].includes(row.status);
}

export interface Overlap {
  category: string;
  market: string;
  brands: PerformanceRow[];
}

export function findCompetitiveOverlaps(rows: PerformanceRow[]): Overlap[] {
  const active = rows.filter(r => ACTIVE_STATUSES.has(r.status));
  const groups = new Map<string, PerformanceRow[]>();

  for (const row of active) {
    const key = `${row.category}||${row.launchMarket}`;
    const group = groups.get(key) ?? [];
    group.push(row);
    groups.set(key, group);
  }

  return Array.from(groups.entries())
    .filter(([, brands]) => brands.length > 1)
    .map(([key, brands]) => {
      const [category, market] = key.split("||");
      return { category, market, brands };
    })
    .sort((a, b) => b.brands.length - a.brands.length);
}
