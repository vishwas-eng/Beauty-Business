import type { VercelRequest, VercelResponse } from "@vercel/node";
import { DashboardPayload, SourceConfig } from "../src/types/domain";
import { liveDashboard } from "../src/lib/liveSnapshot";
import {
  getStoredAutomationStatus,
  getStoredDashboard,
  getStoredNotionItems,
  getStoredSource,
  mergeAutomationIntoDashboard,
  saveStoredAutomationStatus,
  saveStoredDashboard,
  saveStoredSource
} from "./_lib/shared";
import { buildDashboardFromGoogleSheet, hasLiveSheetSource } from "./_lib/sheets";

function updateDashboardSnapshot(existing: DashboardPayload, sourceStatus: DashboardPayload["sourceStatus"]) {
  return {
    ...existing,
    generatedAt: new Date().toISOString(),
    lastSyncedAt: new Date().toISOString(),
    sourceStatus
  };
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const body = req.body as { source?: SourceConfig } | undefined;
  if (body?.source) {
    saveStoredSource(body.source);
  }

  const source = body?.source ?? getStoredSource();

  const status = {
    ...getStoredAutomationStatus(),
    lastSheetsSyncAt: new Date().toISOString(),
    lastRunState: "success" as const,
    mode: hasLiveSheetSource() ? ("live" as const) : ("demo" as const)
  };
  saveStoredAutomationStatus(status);

  const currentDashboard = getStoredDashboard() ?? liveDashboard;
  const liveSheetDashboard = source.enabled
    ? await buildDashboardFromGoogleSheet(currentDashboard, source)
    : null;
  const nextSourceStatus =
    liveSheetDashboard?.performance?.length
      ? ("live" as const)
      : hasLiveSheetSource()
        ? ("stale" as const)
        : ("demo" as const);

  const next = mergeAutomationIntoDashboard(
    updateDashboardSnapshot(liveSheetDashboard ?? currentDashboard, nextSourceStatus),
    status,
    getStoredNotionItems()
  );
  saveStoredDashboard(next);

  return res.status(200).json(next);
}
