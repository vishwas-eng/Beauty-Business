import { AutomationConfig, DashboardPayload, InsightItem, NotionContextItem } from "../../src/types/domain";
import { buildHeuristicInsights } from "./shared";
import { fetchWithRetry, logger } from "./production";

export async function fetchClaudeInsights(
  systemPrompt: string,
  prompt: string,
  model: string,
  maxTokens: number
) {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    logger.warn("ANTHROPIC_API_KEY not configured");
    return null;
  }

  try {
    const response = await fetchWithRetry("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01"
      },
      body: JSON.stringify({
        model,
        max_tokens: maxTokens,
        system: systemPrompt,
        messages: [{ role: "user", content: prompt }]
      }),
      retries: 2,
      timeout: 60000
    });

    if (!response.ok) {
      const errorText = await response.text();
      logger.error("Claude API request failed", new Error(errorText), { status: response.status });
      return null;
    }

    const data = (await response.json()) as {
      content?: Array<{ type?: string; text?: string }>;
    };

    const text = data.content?.find((item) => item.type === "text")?.text;
    if (!text) {
      logger.warn("No text content in Claude response");
      return null;
    }

    try {
      return JSON.parse(text);
    } catch (parseError) {
      logger.error("Failed to parse Claude response", parseError as Error, { textLength: text.length });
      return null;
    }
  } catch (error) {
    logger.error("Claude API request failed", error as Error);
    return null;
  }
}

export async function createInsights(
  payload: DashboardPayload,
  notionItems: NotionContextItem[],
  automation: AutomationConfig
): Promise<InsightItem[]> {
  const prompt = `You are generating 3 concise insight cards for a softlines operations dashboard.
Return JSON like {"insights":[{"id":"1","title":"...","summary":"...","priority":"high"}]}.
Use only the following dashboard data: ${JSON.stringify(payload)}
Use this synced Notion operating context: ${JSON.stringify(notionItems)}`;

  const generated = await fetchClaudeInsights(
    automation.claude.systemPrompt,
    prompt,
    process.env.ANTHROPIC_MODEL ?? automation.claude.model,
    automation.claude.maxTokens
  );

  return generated?.insights ?? buildHeuristicInsights(payload);
}
