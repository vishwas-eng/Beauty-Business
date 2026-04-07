import type { Handler } from "@netlify/functions";
import { NormalizedRow } from "../../src/types/domain";
import { json, saveRows } from "./shared";

export const handler: Handler = async (event) => {
  const body = event.body ? (JSON.parse(event.body) as { rows?: NormalizedRow[] }) : {};
  const rows = body.rows ?? [];
  saveRows(rows);
  return json(200, { ok: true, imported: rows.length });
};
