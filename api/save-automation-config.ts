import type { VercelRequest, VercelResponse } from "@vercel/node";
import { AutomationConfig } from "../src/types/domain";
import { getStoredAutomation, saveStoredAutomation, saveStoredSource } from "./_lib/shared";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method === "GET") {
    return res.status(200).json(getStoredAutomation());
  }

  const body = (req.body as AutomationConfig | undefined) ?? getStoredAutomation();
  saveStoredAutomation(body);
  saveStoredSource(body.sheet);
  return res.status(200).json({ ok: true });
}
