import type { VercelRequest, VercelResponse } from "@vercel/node";
import {
  getStoredAutomation,
  getStoredAutomationStatus,
  getStoredDashboard,
  getStoredNotionItems,
  mergeAutomationIntoDashboard,
  saveStoredAutomationStatus,
  saveStoredDashboard
} from "./_lib/shared";
import { createInsights } from "./_lib/claude";

export default async function handler(_req: VercelRequest, res: VercelResponse) {
  const payload = getStoredDashboard();
  const automation = getStoredAutomation();
  const notionItems = getStoredNotionItems();
  const insights = await createInsights(payload, notionItems, automation);
  const status = {
    ...getStoredAutomationStatus(),
    lastClaudeRunAt: new Date().toISOString(),
    lastRunState: "success" as const,
    mode: process.env.ANTHROPIC_API_KEY ? ("live" as const) : ("demo" as const)
  };
  saveStoredAutomationStatus(status);

  const next = mergeAutomationIntoDashboard({ ...payload, insights }, status, notionItems);
  saveStoredDashboard(next);

  return res.status(200).json({ insights });
}
