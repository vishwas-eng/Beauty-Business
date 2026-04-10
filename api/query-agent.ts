import type { VercelRequest, VercelResponse } from "@vercel/node";
import { getStoredDashboard } from "./_lib/shared";
import { DashboardPayload } from "../src/types/domain";

function buildPipelineContext(payload: DashboardPayload): string {
  const rows = payload.performance;

  const stageCounts = rows.reduce<Record<string, number>>((acc, r) => {
    acc[r.status] = (acc[r.status] ?? 0) + 1;
    return acc;
  }, {});

  const holdReasons = rows
    .filter(r => r.status === "Hold" && r.holdReason)
    .reduce<Record<string, number>>((acc, r) => {
      const reason = r.holdReason!;
      acc[reason] = (acc[reason] ?? 0) + 1;
      return acc;
    }, {});

  const categoryCount = rows.reduce<Record<string, number>>((acc, r) => {
    acc[r.category] = (acc[r.category] ?? 0) + 1;
    return acc;
  }, {});

  const marketCount = rows.reduce<Record<string, number>>((acc, r) => {
    acc[r.launchMarket] = (acc[r.launchMarket] ?? 0) + 1;
    return acc;
  }, {});

  const staleBrands = rows
    .filter(r => r.workingDays > 45 && r.status !== "Reject")
    .sort((a, b) => b.workingDays - a.workingDays)
    .map(r => `${r.brand} (${r.launchMarket}, ${r.status}, ${r.workingDays} days)`)
    .slice(0, 10);

  const allRows = rows.map(r =>
    `${r.brand} | ${r.category} | ${r.segment ?? ""} | ${r.launchMarket} | ${r.status} | ${r.workingDays}d | next: ${r.nextStep || "none"} | hold: ${r.holdReason || "n/a"}`
  ).join("\n");

  return `
BEAUTY BRAND PIPELINE — LIVE DATA
Last synced: ${payload.lastSyncedAt}

SUMMARY
Total opportunities: ${rows.length}
Unique brands: ${new Set(rows.map(r => r.brand)).size}
Stage breakdown: ${JSON.stringify(stageCounts)}
Hold reasons: ${JSON.stringify(holdReasons)}
By category: ${JSON.stringify(categoryCount)}
By launch market: ${JSON.stringify(marketCount)}

STALE OPPORTUNITIES (>45 days, not rejected):
${staleBrands.join("\n") || "None"}

ALL PIPELINE ROWS (Brand | Category | Segment | Market | Status | Days | Next Step | Hold Reason):
${allRows}
`.trim();
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return res.status(200).json({
      ok: true,
      query: "",
      answer: "AI chat is not configured. Add ANTHROPIC_API_KEY to your Vercel environment variables to enable free-form questions. Make sure you are using the Vercel deployment at lumara-opptra.vercel.app",
      suggestions: [],
      rows: [],
      sqlPreview: "",
      resultType: "overview"
    });
  }

  const body = req.body as { query?: string } | undefined;
  const query = body?.query?.trim();
  if (!query) {
    return res.status(400).json({ error: "query is required" });
  }

  const payload = getStoredDashboard();
  const context = buildPipelineContext(payload);

  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01"
    },
    body: JSON.stringify({
      model: process.env.ANTHROPIC_MODEL ?? "claude-3-5-sonnet-latest",
      max_tokens: 1000,
      system: `You are a senior data analyst and business advisor embedded inside Opptra's beauty brand pipeline tracker.
You have real-time access to their complete brand pipeline data below.

Your job:
- Answer ANY question the user asks about the pipeline, brands, stages, performance, risks, or strategy
- Be specific: name actual brands, cite actual numbers, reference actual next steps from the data
- Be action-oriented: always end with a clear recommendation or next action
- If a question is not about the pipeline data, still help — you are a general business analyst who happens to have this pipeline context
- Keep answers concise but complete. Use short paragraphs, not bullet overload
- Never say "I don't have access to" — you have the full data below

LIVE PIPELINE DATA:
${context}`,
      messages: [{ role: "user", content: query }]
    })
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error("Claude API error:", errorText);
    return res.status(200).json({
      ok: false,
      query,
      answer: "Could not reach AI. Check your ANTHROPIC_API_KEY in Vercel environment variables at vercel.com/beauty-business/lumara-opptra/settings/environment-variables",
      suggestions: [],
      rows: [],
      sqlPreview: "",
      resultType: "overview"
    });
  }

  const data = await response.json() as {
    content?: Array<{ type?: string; text?: string }>
  };

  const answer = data.content?.find(c => c.type === "text")?.text ?? "No response";

  return res.status(200).json({
    ok: true,
    query,
    answer,
    suggestions: [],
    rows: [],
    sqlPreview: "",
    resultType: "overview"
  });
}
