import type { Handler } from "@netlify/functions";
import { AutomationConfig } from "../../src/types/domain";
import { getStoredAutomation, json, saveStoredAutomation, saveStoredSource } from "./shared";

export const handler: Handler = async (event) => {
  if (event.httpMethod === "GET") {
    return json(200, getStoredAutomation());
  }

  const body = event.body ? (JSON.parse(event.body) as AutomationConfig) : getStoredAutomation();
  saveStoredAutomation(body);
  saveStoredSource(body.sheet);
  return json(200, { ok: true });
};

