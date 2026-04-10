import type { VercelRequest, VercelResponse } from "@vercel/node";
export default function handler(_req: VercelRequest, res: VercelResponse) {
  return res.status(200).json({ ok: true, ts: new Date().toISOString(), env: { hasKey: Boolean(process.env.ANTHROPIC_API_KEY) } });
}
