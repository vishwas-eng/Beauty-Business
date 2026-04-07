import type { Handler } from "@netlify/functions";
import {
  getStoredAutomation,
  getStoredAutomationStatus,
  getStoredDashboard,
  getStoredNotionItems,
  json,
  mergeAutomationIntoDashboard,
  saveStoredAutomationStatus,
  saveStoredDashboard
} from "./shared";
import { createInsights } from "./claude";

export const handler: Handler = async () => {
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

  return json(200, { insights });
};
