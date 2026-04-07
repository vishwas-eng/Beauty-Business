import type { Handler } from "@netlify/functions";
import { liveDashboard } from "../../src/lib/liveSnapshot";
import { buildDashboardFromGoogleSheet } from "./sheets";
import { getStoredDashboard, getStoredSource, json, saveStoredDashboard } from "./shared";

export const handler: Handler = async () => {
  const stored = getStoredDashboard() ?? liveDashboard;
  const source = getStoredSource();

  if (!source.enabled) {
    return json(200, stored);
  }

  const liveSheetDashboard = await buildDashboardFromGoogleSheet(stored, source);
  if (liveSheetDashboard) {
    saveStoredDashboard(liveSheetDashboard);
    return json(200, liveSheetDashboard);
  }

  return json(200, stored);
};
