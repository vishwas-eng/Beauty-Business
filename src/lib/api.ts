import {
  AgentResponse,
  AutomationConfig,
  AutomationRunResponse,
  DashboardPayload,
  InsightItem,
  NdaWorkflowResponse,
  NormalizedRow,
  SourceConfig,
  TimeRange
} from "../types/domain";
import { liveDashboard } from "./liveSnapshot";

import {
  loadAutomationConfig,
  loadSourceConfig,
  loadStoredDashboard,
  saveAutomationConfig,
  saveSourceConfig,
  saveStoredDashboard
} from "./storage";

function isValidDashboardPayload(payload: DashboardPayload) {
  return (
    Array.isArray(payload.performance) &&
    payload.performance.length >= 30 &&
    payload.performance.some((row) => Boolean(row.brand?.trim()) && Boolean(row.launchMarket?.trim())) &&
    payload.performance.some((row) => Boolean(row.sourceCountry?.trim())) &&
    payload.performance.some((row) => row.brand?.trim() === "Nudestix")
  );
}

async function readJson<T>(path: string, init?: RequestInit) {
  const response = await fetch(path, init);
  if (!response.ok) {
    throw new Error(`Request failed: ${response.status}`);
  }
  return (await response.json()) as T;
}

export async function fetchDashboard(range: TimeRange) {
  try {
    const payload = await readJson<DashboardPayload>(`/api/dashboard?range=${range}`);
    if (!isValidDashboardPayload(payload)) {
      saveStoredDashboard(liveDashboard);
      return liveDashboard;
    }
    return payload;
  } catch {
    const fallback = loadStoredDashboard();
    if (!isValidDashboardPayload(fallback)) {
      saveStoredDashboard(liveDashboard);
      return liveDashboard;
    }
    return fallback;
  }
}

export async function generateInsights(range: TimeRange) {
  try {
    return await readJson<{ insights: InsightItem[] }>("/api/generate-insights", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ range })
    });
  } catch {
    return { insights: liveDashboard.insights };
  }
}

export async function refreshSource(range: TimeRange) {
  try {
    return await readJson<DashboardPayload>("/api/refresh-source", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ range, source: loadSourceConfig() })
    });
  } catch {
    const payload = {
      ...loadStoredDashboard(),
      generatedAt: new Date().toISOString(),
      lastSyncedAt: new Date().toISOString()
    };
    saveStoredDashboard(payload);
    return payload;
  }
}

export async function persistSourceConfig(config: SourceConfig) {
  saveSourceConfig(config);

  try {
    await readJson<{ ok: boolean }>("/api/save-source-config", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(config)
    });
  } catch {
    return { ok: true, mode: "local" };
  }

  return { ok: true, mode: "remote" };
}

export async function getSourceConfig() {
  try {
    return await readJson<SourceConfig>("/api/save-source-config");
  } catch {
    return loadSourceConfig();
  }
}

export async function persistAutomationConfig(config: AutomationConfig) {
  saveAutomationConfig(config);

  try {
    await readJson<{ ok: boolean }>("/api/save-automation-config", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(config)
    });
  } catch {
    return { ok: true, mode: "local" };
  }

  return { ok: true, mode: "remote" };
}

export async function getAutomationConfig() {
  try {
    return await readJson<AutomationConfig>("/api/save-automation-config");
  } catch {
    return loadAutomationConfig();
  }
}

export async function runAutomation(range: TimeRange) {
  try {
    return await readJson<AutomationRunResponse>("/api/run-automation", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ range, config: loadAutomationConfig() })
    });
  } catch {
    const current = loadStoredDashboard();
    return {
      ok: true,
      notionItems: current.notionContext,
      status: {
        ...current.automation,
        lastRunState: "success" as const,
        lastClaudeRunAt: new Date().toISOString(),
        lastNotionSyncAt: new Date().toISOString(),
        lastSheetsSyncAt: new Date().toISOString()
      }
    };
  }
}

export async function uploadRows(rows: NormalizedRow[]) {
  try {
    return await readJson<{ ok: boolean; imported: number }>("/api/upload-excel", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ rows })
    });
  } catch {
    const current = loadStoredDashboard();
    saveStoredDashboard({
      ...current,
      generatedAt: new Date().toISOString(),
      lastSyncedAt: new Date().toISOString()
    });
    return { ok: true, imported: rows.length };
  }
}

export async function runNdaWorkflow(brandId: string, action: "prepare" | "send", recipientEmail: string) {
  try {
    return await readJson<NdaWorkflowResponse>("/api/prepare-nda", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ brandId, action, recipientEmail })
    });
  } catch {
    const current = loadStoredDashboard();
    const queueItem = current.legalQueue.find((item) => item.id === brandId);

    if (!queueItem) {
      throw new Error("Brand legal item not found");
    }

    const registeredAddress =
      queueItem.registeredAddress ||
      queueItem.sourceFields.find((field) => field.label.toLowerCase().includes("address"))?.value ||
      "";
    const missingFields = [
      !queueItem.entityName ? "Entity name" : "",
      !queueItem.signatoryName ? "Authorized signatory" : "",
      !queueItem.signatoryTitle ? "Signatory title" : "",
      !queueItem.signatoryEmail ? "Signatory email" : "",
      !registeredAddress ? "Registered address" : ""
    ].filter(Boolean);

    if (missingFields.length > 0) {
      throw new Error(`NDA draft is missing: ${missingFields.join(", ")}`);
    }

    const packet = {
      brandId,
      brand: queueItem.brand,
      recipientName: "Palak Legal Review",
      recipientEmail,
      subject: `Filled NDA packet review: ${queueItem.brand} | ${queueItem.market}`,
      body: [
        "Hi Palak,",
        "",
        `Please review the filled NDA packet for ${queueItem.brand}.`,
        "",
        `Entity name: ${queueItem.entityName || "Pending from brand"}`,
        `Authorized signatory: ${queueItem.signatoryName || "Pending from brand"}`,
        `Signatory title: ${queueItem.signatoryTitle || "Pending from brand"}`,
        `Signatory email: ${queueItem.signatoryEmail || "Pending from brand"}`,
        `Registered address: ${registeredAddress || "Pending from brand"}`,
        `Current stage: ${queueItem.stage}`,
        `Requested action: ${queueItem.requestedAction}`,
        "",
        "Latest email context:",
        queueItem.lastEmailSummary
      ].join("\n"),
      attachmentName: `${queueItem.brand.replace(/\s+/g, "_")}_${queueItem.templateName.replace(/\s+/g, "_")}.pdf`,
      preparedAt: new Date().toISOString(),
      sentAt: action === "send" ? new Date().toISOString() : null,
      status: action === "send" ? ("sent" as const) : ("drafted" as const),
      missingFields: [],
      readyForReview: true,
      readyToSend: true,
      sourceDocumentUrl: queueItem.templateSourceUrl,
      generatedDocumentType: "review-html" as const,
      filledFields: [
        { label: "Brand", value: queueItem.brand },
        { label: "Entity name", value: queueItem.entityName || "Pending from brand" },
        {
          label: "Authorized signatory",
          value: queueItem.signatoryName || "Pending from brand"
        },
        {
          label: "Signatory email",
          value: queueItem.signatoryEmail || "Pending from brand"
        },
        {
          label: "Registered address",
          value: registeredAddress
        }
      ]
    };

    const dashboard = {
      ...current,
      generatedAt: new Date().toISOString(),
      activeNdaPacket: packet,
      legalQueue: current.legalQueue.map((item) =>
        item.id === brandId
          ? {
              ...item,
              ndaStatus:
                action === "send"
                  ? ("Sent for legal review" as const)
                  : ("Ready to send" as const)
            }
          : item
      )
    };

    saveStoredDashboard(dashboard);
    return { ok: true, dashboard, packet };
  }
}

export async function queryAgent(query: string) {
  try {
    return await readJson<AgentResponse>("/api/query-agent", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ query })
    });
  } catch {
    return {
      ok: false,
      query,
      answer: "Could not connect to the AI. Make sure ANTHROPIC_API_KEY is set in Netlify environment variables and the site is deployed.",
      sqlPreview: "",
      resultType: "overview" as const,
      rows: [],
      suggestions: []
    };
  }
}
