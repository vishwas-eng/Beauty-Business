import type { Handler } from "@netlify/functions";
import { runLocalAgentQuery } from "../../src/lib/agent";
import { getStoredDashboard, json } from "./shared";

async function rewriteAnswerWithOpenAI(query: string, answer: string, rows: unknown[], audit: unknown) {
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
      messages: [
        {
          role: "system",
          content:
            "You answer business questions using only the provided dashboard data. Be concise, factual, and do not invent missing details."
        },
        {
          role: "user",
          content: JSON.stringify({
            query,
            current_answer: answer,
            rows,
            audit
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

  return data.choices?.[0]?.message?.content?.trim() ?? null;
}

export const handler: Handler = async (event) => {
  const body = event.body ? (JSON.parse(event.body) as { query?: string }) : {};
  const dashboard = getStoredDashboard();
  const baseResponse = runLocalAgentQuery(dashboard, body.query ?? "");
  const enhancedAnswer = await rewriteAnswerWithOpenAI(
    body.query ?? "",
    baseResponse.answer,
    baseResponse.rows,
    dashboard.audit ?? null
  );

  return json(200, {
    ...baseResponse,
    answer: enhancedAnswer ?? baseResponse.answer
  });
};
