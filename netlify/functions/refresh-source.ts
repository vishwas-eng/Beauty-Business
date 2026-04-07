import type { Handler } from "@netlify/functions";
import { DashboardPayload, SourceConfig } from "../../src/types/domain";
import { liveDashboard } from "../../src/lib/liveSnapshot";
import {
  getStoredAutomationStatus,
  getStoredDashboard,
  getStoredNotionItems,
  json,
  mergeAutomationIntoDashboard,
  saveStoredAutomationStatus,
  saveStoredDashboard,
  saveStoredSource
} from "./shared";

async function fetchSheetRows(source: SourceConfig) {
  const apiKey = process.env.GOOGLE_SHEETS_API_KEY;
  if (!apiKey || !source.sheetId) {
    return null;
  }

  const range = encodeURIComponent(`${source.tabName}!${source.range}`);
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${source.sheetId}/values/${range}?key=${apiKey}`;
  const response = await fetch(url);

  if (!response.ok) {
    return null;
  }

  return (await response.json()) as { values?: string[][] };
}

function updateDashboardSnapshot(existing: DashboardPayload) {
  return {
    ...existing,
    generatedAt: new Date().toISOString(),
    lastSyncedAt: new Date().toISOString(),
    sourceStatus: "live" as const
  };
}

export const handler: Handler = async (event) => {
  const body = event.body ? (JSON.parse(event.body) as { source?: SourceConfig }) : {};
  if (body.source) {
    saveStoredSource(body.source);
  }

  if (body.source?.enabled) {
    await fetchSheetRows(body.source);
  }

  const status = {
    ...getStoredAutomationStatus(),
    lastSheetsSyncAt: new Date().toISOString(),
    lastRunState: "success" as const,
    mode: process.env.GOOGLE_SHEETS_API_KEY ? ("live" as const) : ("demo" as const)
  };
  saveStoredAutomationStatus(status);

  const next = mergeAutomationIntoDashboard(
    updateDashboardSnapshot(getStoredDashboard() ?? liveDashboard),
    status,
    getStoredNotionItems()
  );
  saveStoredDashboard(next);

  return json(200, next);
};
