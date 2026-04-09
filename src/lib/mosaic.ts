// Mosaic Integration Bridge — localStorage-backed production tracker

const MOSAIC_KEY = "lumara-mosaic-status-v1";

export type MosaicStatus =
  | "not_pushed"
  | "briefed"
  | "cataloging"
  | "sku_gen"
  | "qa"
  | "verified"
  | "live";

export interface MosaicBrandStatus {
  brandKey: string;
  brand: string;
  market: string;
  category: string;
  status: MosaicStatus;
  pushedAt?: string;
  catalogProgress: number; // 0–100
  skuCount: number;
  verifiedSkus: number;
  goLiveDate?: string;
  notes?: string;
  updatedAt: string;
}

export function loadMosaicStatuses(): MosaicBrandStatus[] {
  try {
    const raw = localStorage.getItem(MOSAIC_KEY);
    return raw ? (JSON.parse(raw) as MosaicBrandStatus[]) : [];
  } catch {
    return [];
  }
}

export function saveMosaicStatuses(statuses: MosaicBrandStatus[]) {
  localStorage.setItem(MOSAIC_KEY, JSON.stringify(statuses));
}

export function getMosaicStatus(brandKey: string): MosaicBrandStatus | null {
  return loadMosaicStatuses().find(s => s.brandKey === brandKey) ?? null;
}

export function pushToMosaic(brand: string, market: string, category: string): MosaicBrandStatus {
  const brandKey = `${brand}-${market}`.toLowerCase().replace(/[^a-z0-9]+/g, "-");
  const all = loadMosaicStatuses();
  const existing = all.find(s => s.brandKey === brandKey);

  const entry: MosaicBrandStatus = {
    ...(existing ?? {}),
    brandKey,
    brand,
    market,
    category,
    status: "briefed",
    pushedAt: new Date().toISOString(),
    catalogProgress: 0,
    skuCount: Math.floor(Math.random() * 180) + 40,
    verifiedSkus: 0,
    updatedAt: new Date().toISOString(),
  };

  saveMosaicStatuses(
    existing ? all.map(s => (s.brandKey === brandKey ? entry : s)) : [...all, entry]
  );
  return entry;
}

export function advanceMosaicStatus(brandKey: string) {
  const all = loadMosaicStatuses();
  const item = all.find(s => s.brandKey === brandKey);
  if (!item) return;

  const idx = MOSAIC_STATUS_ORDER.indexOf(item.status);
  if (idx < 0 || idx >= MOSAIC_STATUS_ORDER.length - 1) return;

  const next = MOSAIC_STATUS_ORDER[idx + 1];
  const progress = MOSAIC_STATUS_PROGRESS[next];
  const verifiedSkus =
    next === "verified" || next === "live" ? item.skuCount : Math.round((progress / 100) * item.skuCount);

  saveMosaicStatuses(
    all.map(s =>
      s.brandKey === brandKey
        ? { ...s, status: next, catalogProgress: progress, verifiedSkus, updatedAt: new Date().toISOString() }
        : s
    )
  );
}

export const MOSAIC_STATUS_LABELS: Record<MosaicStatus, string> = {
  not_pushed: "Not Started",
  briefed: "Briefed",
  cataloging: "Cataloging",
  sku_gen: "SKU Generation",
  qa: "QA Review",
  verified: "Verified",
  live: "Live",
};

export const MOSAIC_STATUS_PROGRESS: Record<MosaicStatus, number> = {
  not_pushed: 0,
  briefed: 12,
  cataloging: 35,
  sku_gen: 60,
  qa: 80,
  verified: 95,
  live: 100,
};

export const MOSAIC_STATUS_COLOR: Record<MosaicStatus, string> = {
  not_pushed: "#64748b",
  briefed: "#6366f1",
  cataloging: "#f59e0b",
  sku_gen: "#3b82f6",
  qa: "#8b5cf6",
  verified: "#14b8a6",
  live: "#22c55e",
};

export const MOSAIC_STATUS_ORDER: MosaicStatus[] = [
  "not_pushed",
  "briefed",
  "cataloging",
  "sku_gen",
  "qa",
  "verified",
  "live",
];
