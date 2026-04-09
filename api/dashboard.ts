import type { VercelRequest, VercelResponse } from "@vercel/node";
import { liveDashboard } from "../src/lib/liveSnapshot";
import { buildDashboardFromGoogleSheet } from "./_lib/sheets";
import { getStoredDashboard, getStoredSource, saveStoredDashboard } from "./_lib/shared";

export default async function handler(_req: VercelRequest, res: VercelResponse) {
  const stored = getStoredDashboard() ?? liveDashboard;
  const source = getStoredSource();

  if (!source.enabled) {
    return res.status(200).json(stored);
  }

  const liveSheetDashboard = await buildDashboardFromGoogleSheet(stored, source);
  if (liveSheetDashboard) {
    saveStoredDashboard(liveSheetDashboard);
    return res.status(200).json(liveSheetDashboard);
  }

  return res.status(200).json(stored);
}
