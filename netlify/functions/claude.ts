import { AutomationConfig, DashboardPayload, InsightItem, NotionContextItem } from "../../src/types/domain";
import { buildHeuristicInsights } from "./shared";

export async function fetchClaudeInsights(
  systemPrompt: string,
  prompt: string,
  model: string,
  maxTokens: number
) {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return null;
  }

  const response = await fetch("https://api.anthropic.com/v1/messages", {
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
      messages: [
        {
          role: "user",
          content: prompt
        }
      ]
    })
  });

  if (!response.ok) {
    return null;
  }

  const data = (await response.json()) as {
    content?: Array<{
      type?: string;
      text?: string;
    }>;
  };

  const text = data.content?.find((item) => item.type === "text")?.text;
  return text ? JSON.parse(text) : null;
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
