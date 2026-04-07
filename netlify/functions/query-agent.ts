import type { Handler } from "@netlify/functions";
import { runLocalAgentQuery } from "../../src/lib/agent";
import { getStoredDashboard, json } from "./shared";

export const handler: Handler = async (event) => {
  const body = event.body ? (JSON.parse(event.body) as { query?: string }) : {};
  return json(200, runLocalAgentQuery(getStoredDashboard(), body.query ?? ""));
};
