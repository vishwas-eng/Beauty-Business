import {
  defaultAutomationConfig,
  defaultSourceConfig,
  initialAutomationStatus,
  liveDashboard,
  liveLegalQueue,
  liveNdaPacket,
  snapshotContextItems
} from "../../src/lib/liveSnapshot";
import {
  AutomationConfig,
  AutomationStatus,
  DashboardPayload,
  FilledNdaPacket,
  InsightItem,
  LegalQueueItem,
  NormalizedRow,
  NotionContextItem,
  SourceConfig
} from "../../src/types/domain";

const memoryStore = {
  dashboard: liveDashboard,
  source: defaultSourceConfig,
  automation: defaultAutomationConfig,
  automationStatus: initialAutomationStatus,
  notionItems: snapshotContextItems,
  rows: [] as NormalizedRow[],
  legalQueue: liveLegalQueue,
  activeNdaPacket: liveNdaPacket
};

export function getStoredDashboard(): DashboardPayload {
  if (!memoryStore.dashboard.performance?.length) {
    memoryStore.dashboard = liveDashboard;
  }
  return memoryStore.dashboard;
}

export function saveStoredDashboard(payload: DashboardPayload) {
  memoryStore.dashboard = payload;
}

export function getStoredSource(): SourceConfig {
  return memoryStore.source;
}

export function saveStoredSource(config: SourceConfig) {
  memoryStore.source = config;
}

export function getStoredAutomation(): AutomationConfig {
  return memoryStore.automation;
}

export function saveStoredAutomation(config: AutomationConfig) {
  memoryStore.automation = config;
}

export function getStoredAutomationStatus(): AutomationStatus {
  return memoryStore.automationStatus;
}

export function saveStoredAutomationStatus(status: AutomationStatus) {
  memoryStore.automationStatus = status;
}

export function getStoredNotionItems(): NotionContextItem[] {
  return memoryStore.notionItems;
}

export function saveStoredNotionItems(items: NotionContextItem[]) {
  memoryStore.notionItems = items;
}

export function saveRows(rows: NormalizedRow[]) {
  memoryStore.rows = rows;
}

export function getStoredLegalQueue(): LegalQueueItem[] {
  return memoryStore.legalQueue;
}

export function saveStoredLegalQueue(items: LegalQueueItem[]) {
  memoryStore.legalQueue = items;
}

export function getStoredNdaPacket(): FilledNdaPacket | null {
  return memoryStore.activeNdaPacket;
}

export function saveStoredNdaPacket(packet: FilledNdaPacket | null) {
  memoryStore.activeNdaPacket = packet;
}

function extractTextProperty(value: any): string {
  if (!value) return "";
  if (value.type === "title" || value.type === "rich_text") {
    return (value[value.type] ?? []).map((item: { plain_text?: string }) => item.plain_text ?? "").join("").trim();
  }
  if (value.type === "select") return value.select?.name ?? "";
  if (value.type === "multi_select") return (value.multi_select ?? []).map((item: { name: string }) => item.name).join(", ");
  if (value.type === "status") return value.status?.name ?? "";
  if (value.type === "people") return (value.people ?? []).map((item: { name?: string }) => item.name ?? "").join(", ");
  if (value.type === "formula") return value.formula?.string ?? String(value.formula?.number ?? "");
  if (value.type === "number") return String(value.number ?? "");
  return "";
}

export function mapNotionResults(results: any[], automation: AutomationConfig): NotionContextItem[] {
  const config = automation.notion;
  return results.map((result, index) => {
    const properties = result.properties ?? {};
    return {
      id: result.id ?? `notion-${index}`,
      title: extractTextProperty(properties[config.titleField]) || extractTextProperty(properties.Name) || "Untitled context",
      category: extractTextProperty(properties[config.categoryField]) || extractTextProperty(properties.Category) || "General",
      priority: extractTextProperty(properties[config.priorityField]) || extractTextProperty(properties.Priority) || "Normal",
      notes: extractTextProperty(properties[config.notesField]) || extractTextProperty(properties.Notes) || "No notes provided."
    };
  });
}

export function mergeAutomationIntoDashboard(
  dashboard: DashboardPayload,
  status: AutomationStatus,
  notionItems: NotionContextItem[]
): DashboardPayload {
  return {
    ...dashboard,
    automation: status,
    notionContext: notionItems,
    legalQueue: memoryStore.legalQueue,
    activeNdaPacket: memoryStore.activeNdaPacket,
    generatedAt: new Date().toISOString(),
    lastSyncedAt: status.lastSheetsSyncAt ?? dashboard.lastSyncedAt
  };
}

export function buildNdaPacket(
  item: LegalQueueItem,
  recipientEmail: string,
  recipientName = "Palak Legal Review",
  mode: "drafted" | "sent" = "drafted"
): FilledNdaPacket {
  const registeredAddress =
    item.registeredAddress ||
    item.sourceFields.find((field) => field.label.toLowerCase().includes("address"))?.value ||
    "";

  const missingFields = [
    !item.entityName ? "Entity name" : "",
    !item.signatoryName ? "Authorized signatory" : "",
    !item.signatoryTitle ? "Signatory title" : "",
    !item.signatoryEmail ? "Signatory email" : "",
    !registeredAddress ? "Registered address" : ""
  ].filter(Boolean);

  const filledFields = [
    { label: "Brand", value: item.brand },
    { label: "Entity name", value: item.entityName || "Pending from brand" },
    { label: "Launch market", value: item.market },
    { label: "Authorized signatory", value: item.signatoryName || "Pending from brand" },
    { label: "Signatory title", value: item.signatoryTitle || "Pending from brand" },
    { label: "Signatory email", value: item.signatoryEmail || "Pending from brand" },
    { label: "Registered address", value: registeredAddress || "Pending from brand" },
    { label: "Current stage", value: item.stage },
    { label: "Requested action", value: item.requestedAction }
  ];

  return {
    brandId: item.id,
    brand: item.brand,
    recipientName,
    recipientEmail,
    subject: `Filled NDA packet review: ${item.brand} | ${item.market}`,
    body: [
      `Hi ${recipientName.replace(" Legal Review", "")},`,
      "",
      `Please review the filled NDA packet for ${item.brand}.`,
      "",
      ...filledFields.map((field) => `${field.label}: ${field.value}`),
      "",
      "Latest email context:",
      item.lastEmailSummary,
      "",
      "Please confirm once reviewed.",
      "",
      "Thanks"
    ].join("\n"),
    attachmentName: `${item.brand.replace(/\s+/g, "_")}_${item.templateName.replace(/\s+/g, "_")}.pdf`,
    preparedAt: new Date().toISOString(),
    sentAt: mode === "sent" ? new Date().toISOString() : null,
    status: mode,
    filledFields,
    missingFields,
    readyForReview: missingFields.length === 0,
    readyToSend: missingFields.length === 0,
    sourceDocumentUrl: item.templateSourceUrl,
    generatedDocumentType: "review-html"
  };
}

export function buildHeuristicInsights(payload: DashboardPayload): InsightItem[] {
  const oldestBrand = [...payload.performance].sort((a, b) => b.workingDays - a.workingDays)[0];
  const mostAdvanced = payload.performance.find((row) => row.status.toLowerCase() === "commercials");

  return [
    {
      id: "heuristic-1",
      title: `${oldestBrand.brand} is the most aged active row`,
      summary: `${oldestBrand.brand} has been open for ${oldestBrand.workingDays} working days, so it deserves immediate follow-through on the listed next step.`,
      priority: "high"
    },
    {
      id: "heuristic-2",
      title: mostAdvanced
        ? `${mostAdvanced.brand} is the clearest near-term win`
        : "Top-of-funnel momentum needs conversion",
      summary: mostAdvanced
        ? `${mostAdvanced.brand} is already in ${mostAdvanced.status} and has the strongest chance to convert if the next step lands on time.`
        : "The tracker has healthy MQL volume, but there is no movement into later stages yet, so conversion discipline is the biggest gap.",
      priority: "medium"
    },
    {
      id: "heuristic-3",
      title: "Category concentration is visible",
      summary: "Makeup and skincare dominate the tracker, so leadership reviews should focus there first before deep-diving smaller categories.",
      priority: "low"
    }
  ];
}
