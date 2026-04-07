import type { Handler } from "@netlify/functions";
import { DashboardPayload, SourceConfig } from "../../src/types/domain";
import { liveDashboard } from "../../src/lib/liveSnapshot";
import {
  getStoredAutomationStatus,
  getStoredDashboard,
  getStoredNotionItems,
  getStoredSource,
  json,
  mergeAutomationIntoDashboard,
  saveStoredAutomationStatus,
  saveStoredDashboard,
  saveStoredSource
} from "./shared";
import { buildDashboardFromGoogleSheet } from "./sheets";

function updateDashboardSnapshot(existing: DashboardPayload, sourceStatus: DashboardPayload["sourceStatus"]) {
  return {
    ...existing,
    generatedAt: new Date().toISOString(),
    lastSyncedAt: new Date().toISOString(),
    sourceStatus
  };
}

export const handler: Handler = async (event) => {
  const body = event.body ? (JSON.parse(event.body) as { source?: SourceConfig }) : {};
  if (body.source) {
    saveStoredSource(body.source);
  }

  const source = body.source ?? getStoredSource();

  const status = {
    ...getStoredAutomationStatus(),
    lastSheetsSyncAt: new Date().toISOString(),
    lastRunState: "success" as const,
    mode:
      process.env.GOOGLE_SHEETS_API_KEY || process.env.GOOGLE_REFRESH_TOKEN
        ? ("live" as const)
        : ("demo" as const)
  };
  saveStoredAutomationStatus(status);

  const currentDashboard = getStoredDashboard() ?? liveDashboard;
  const liveSheetDashboard = source.enabled
    ? await buildDashboardFromGoogleSheet(currentDashboard, source)
    : null;
  const nextSourceStatus =
    liveSheetDashboard?.performance?.length
      ? ("live" as const)
      : process.env.GOOGLE_SHEETS_API_KEY || process.env.GOOGLE_REFRESH_TOKEN
        ? ("stale" as const)
        : ("demo" as const);

  const next = mergeAutomationIntoDashboard(
    updateDashboardSnapshot(liveSheetDashboard ?? currentDashboard, nextSourceStatus),
    status,
    getStoredNotionItems()
  );
  saveStoredDashboard(next);

  return json(200, next);
};
