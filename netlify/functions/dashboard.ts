import type { Handler } from "@netlify/functions";
import { getStoredDashboard, json } from "./shared";

export const handler: Handler = async () => {
  return json(200, getStoredDashboard());
};
