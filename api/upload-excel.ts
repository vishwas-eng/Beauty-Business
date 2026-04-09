import type { VercelRequest, VercelResponse } from "@vercel/node";
import { NormalizedRow } from "../src/types/domain";
import { saveRows } from "./_lib/shared";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const body = req.body as { rows?: NormalizedRow[] } | undefined;
  const rows = body?.rows ?? [];
  saveRows(rows);
  return res.status(200).json({ ok: true, imported: rows.length });
}
