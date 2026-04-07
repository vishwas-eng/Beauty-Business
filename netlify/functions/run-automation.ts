import type { Handler } from "@netlify/functions";
import { AutomationConfig, SourceConfig } from "../../src/types/domain";
import {
  getStoredAutomation,
  getStoredDashboard,
  getStoredSource,
  json,
  mapNotionResults,
  mergeAutomationIntoDashboard,
  saveStoredAutomation,
  saveStoredAutomationStatus,
  saveStoredDashboard,
  saveStoredNotionItems,
  saveStoredSource
} from "./shared";
import { createInsights } from "./claude";
import { fetchBeautyTrackerValues, hasLiveSheetSource } from "./sheets";

async function fetchSheetRows(source: SourceConfig) {
  return fetchBeautyTrackerValues(source);
}

async function fetchNotionResults(config: AutomationConfig) {
  const token = process.env.NOTION_ACCESS_TOKEN;
  const notionVersion = process.env.NOTION_VERSION ?? "2022-06-28";
  const databaseId = config.notion.databaseId;

  if (!token || !databaseId || !config.notion.enabled) {
    return null;
  }

  const baseHeaders = {
    "Content-Type": "application/json",
    Authorization: `Bearer ${token}`,
    "Notion-Version": notionVersion
  };

  const attemptUrls = [
    `https://api.notion.com/v1/databases/${databaseId}/query`,
    `https://api.notion.com/v1/data_sources/${databaseId}/query`
  ];

  for (const url of attemptUrls) {
    const response = await fetch(url, {
      method: "POST",
      headers: baseHeaders,
      body: JSON.stringify({
        page_size: 25
      })
    });

    if (response.ok) {
      return (await response.json()) as { results?: any[] };
    }
  }

  return null;
}

export const handler: Handler = async (event) => {
  const body = event.body ? (JSON.parse(event.body) as { config?: AutomationConfig }) : {};
  const config = body.config ?? getStoredAutomation();

  saveStoredAutomation(config);
  saveStoredSource(config.sheet);

  const notionResponse = await fetchNotionResults(config);
  const notionItems = notionResponse?.results
    ? mapNotionResults(notionResponse.results, config)
    : getStoredDashboard().notionContext;
  saveStoredNotionItems(notionItems);

  await fetchSheetRows(config.sheet ?? getStoredSource());

  const status = {
    mode: process.env.NOTION_ACCESS_TOKEN || hasLiveSheetSource() || process.env.ANTHROPIC_API_KEY ? ("live" as const) : ("demo" as const),
    scheduleMinutes: config.scheduleMinutes,
    lastRunState: "success" as const,
    lastSheetsSyncAt: new Date().toISOString(),
    lastNotionSyncAt: new Date().toISOString(),
    lastClaudeRunAt: process.env.ANTHROPIC_API_KEY ? new Date().toISOString() : null,
    notionItems: notionItems.length
  };
  saveStoredAutomationStatus(status);

  const current = getStoredDashboard();
  const insights = config.claude.enabled
    ? await createInsights(current, notionItems, config)
    : current.insights;
  const next = mergeAutomationIntoDashboard({ ...current, insights }, status, notionItems);
  saveStoredDashboard(next);

  return json(200, {
    ok: true,
    status,
    notionItems
  });
};
