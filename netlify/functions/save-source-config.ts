import type { Handler } from "@netlify/functions";
import { SourceConfig } from "../../src/types/domain";
import { getStoredSource, json, saveStoredSource } from "./shared";

export const handler: Handler = async (event) => {
  if (event.httpMethod === "GET") {
    return json(200, getStoredSource());
  }

  const body = event.body ? (JSON.parse(event.body) as SourceConfig) : getStoredSource();
  saveStoredSource(body);
  return json(200, { ok: true });
};
