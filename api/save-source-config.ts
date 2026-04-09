import type { VercelRequest, VercelResponse } from "@vercel/node";
import { SourceConfig } from "../src/types/domain";
import { getStoredSource, saveStoredSource } from "./_lib/shared";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method === "GET") {
    return res.status(200).json(getStoredSource());
  }

  const body = (req.body as SourceConfig | undefined) ?? getStoredSource();
  saveStoredSource(body);
  return res.status(200).json({ ok: true });
}
