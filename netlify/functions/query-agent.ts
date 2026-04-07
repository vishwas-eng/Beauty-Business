import type { Handler } from "@netlify/functions";
import { buildAgentContext, runLocalAgentQuery } from "../../src/lib/agent";
import { getStoredDashboard, json } from "./shared";

async function rewriteAnswerWithOpenAI(query: string, answer: string, rows: unknown[], audit: unknown, context: unknown) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return null;
  }

  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      model: process.env.OPENAI_MODEL ?? "gpt-4o-mini",
      temperature: 0.2,
      response_format: { type: "json_object" },
      messages: [
        {
          role: "system",
          content: [
            "You are an analytics copilot for a beauty business dashboard.",
            "Answer only from the provided dashboard data.",
            "Be concise, factual, and business-friendly.",
            "If the user asks for something not present in the data, say that clearly.",
            "Return strict JSON with keys: answer, suggestions."
          ].join(" ")
        },
        {
          role: "user",
          content: JSON.stringify({
            query,
            current_answer: answer,
            rows,
            audit,
            dashboard_context: context
          })
        }
      ]
    })
  });

  if (!response.ok) {
    return null;
  }

  const data = (await response.json()) as {
    choices?: Array<{
      message?: {
        content?: string;
      };
    }>;
  };

  const content = data.choices?.[0]?.message?.content?.trim();
  if (!content) {
    return null;
  }

  try {
    const parsed = JSON.parse(content) as { answer?: string; suggestions?: string[] };
    return {
      answer: parsed.answer?.trim() ?? null,
      suggestions: Array.isArray(parsed.suggestions) ? parsed.suggestions.slice(0, 4) : null
    };
  } catch {
    return {
      answer: content,
      suggestions: null
    };
  }
}

export const handler: Handler = async (event) => {
  const body = event.body ? (JSON.parse(event.body) as { query?: string }) : {};
  const dashboard = getStoredDashboard();
  const baseResponse = runLocalAgentQuery(dashboard, body.query ?? "");
  const enhanced = await rewriteAnswerWithOpenAI(
    body.query ?? "",
    baseResponse.answer,
    baseResponse.rows,
    dashboard.audit ?? null,
    buildAgentContext(dashboard)
  );

  return json(200, {
    ...baseResponse,
    answer: enhanced?.answer ?? baseResponse.answer,
    suggestions: enhanced?.suggestions?.length ? enhanced.suggestions : baseResponse.suggestions
  });
};
