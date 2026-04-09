const ACTIVITY_KEY = "opptra-activity-log-v1";
const NOTES_KEY = "opptra-brand-notes-v1";

export type ActivityType =
  | "note"
  | "stage_change"
  | "email_draft"
  | "deck_prep"
  | "region_research"
  | "meeting_ingested";

export interface ActivityEntry {
  id: string;
  brandKey: string;
  type: ActivityType;
  text: string;
  timestamp: string;
}

export function loadActivityLog(): ActivityEntry[] {
  try {
    return JSON.parse(localStorage.getItem(ACTIVITY_KEY) ?? "[]") as ActivityEntry[];
  } catch {
    return [];
  }
}

export function addActivity(entry: Omit<ActivityEntry, "id" | "timestamp">): ActivityEntry {
  const log = loadActivityLog();
  const newEntry: ActivityEntry = {
    ...entry,
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    timestamp: new Date().toISOString()
  };
  log.unshift(newEntry);
  localStorage.setItem(ACTIVITY_KEY, JSON.stringify(log.slice(0, 500)));
  return newEntry;
}

export function getActivitiesForBrand(brandKey: string): ActivityEntry[] {
  return loadActivityLog().filter(e => e.brandKey === brandKey);
}

export interface BrandNote {
  brandKey: string;
  text: string;
  updatedAt: string;
}

export function loadBrandNote(brandKey: string): string {
  try {
    const all = JSON.parse(localStorage.getItem(NOTES_KEY) ?? "{}") as Record<string, BrandNote>;
    return all[brandKey]?.text ?? "";
  } catch {
    return "";
  }
}

export function saveBrandNote(brandKey: string, text: string) {
  try {
    const all = JSON.parse(localStorage.getItem(NOTES_KEY) ?? "{}") as Record<string, BrandNote>;
    all[brandKey] = { brandKey, text, updatedAt: new Date().toISOString() };
    localStorage.setItem(NOTES_KEY, JSON.stringify(all));
  } catch {
    // ignore
  }
}

export const ACTIVITY_LABELS: Record<ActivityType, string> = {
  note: "Note added",
  stage_change: "Stage changed",
  email_draft: "Email drafted",
  deck_prep: "Deck prepared",
  region_research: "Region researched",
  meeting_ingested: "Meeting notes ingested"
};

export const ACTIVITY_COLORS: Record<ActivityType, string> = {
  note: "var(--blue)",
  stage_change: "var(--green)",
  email_draft: "var(--indigo)",
  deck_prep: "var(--purple)",
  region_research: "var(--teal)",
  meeting_ingested: "var(--orange)"
};
