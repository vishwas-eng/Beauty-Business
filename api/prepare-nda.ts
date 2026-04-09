import type { VercelRequest, VercelResponse } from "@vercel/node";
import { NdaWorkflowResponse } from "../src/types/domain";
import {
  buildNdaPacket,
  getStoredDashboard,
  getStoredLegalQueue,
  saveStoredDashboard,
  saveStoredLegalQueue,
  saveStoredNdaPacket
} from "./_lib/shared";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const body = req.body as {
    brandId?: string;
    action?: "prepare" | "send";
    recipientEmail?: string;
  } | undefined;

  const brandId = body?.brandId;
  const action = body?.action ?? "prepare";
  const recipientEmail = body?.recipientEmail ?? process.env.TRIAL_LEGAL_EMAIL ?? "vishwas@opptra.com";

  if (!brandId) {
    return res.status(400).json({ ok: false, message: "brandId is required" });
  }

  const legalQueue = getStoredLegalQueue();
  const target = legalQueue.find((item) => item.id === brandId);

  if (!target) {
    return res.status(404).json({ ok: false, message: "Brand legal item not found" });
  }

  const registeredAddress =
    target.registeredAddress ||
    target.sourceFields.find((field) => field.label.toLowerCase().includes("address"))?.value ||
    "";

  if (!target.signatoryName || !target.signatoryTitle || !target.signatoryEmail || !target.entityName || !registeredAddress) {
    return res.status(400).json({
      ok: false,
      message: "Entity, signatory, title, email, and registered address must all be available before preparing the NDA draft"
    });
  }

  const packet = buildNdaPacket(target, recipientEmail, "Palak Legal Review", action === "send" ? "sent" : "drafted");
  const nextQueue = legalQueue.map((item) =>
    item.id === brandId
      ? { ...item, ndaStatus: action === "send" ? ("Sent for legal review" as const) : ("Ready to send" as const) }
      : item
  );

  saveStoredLegalQueue(nextQueue);
  saveStoredNdaPacket(packet);

  const current = getStoredDashboard();
  const nextDashboard = {
    ...current,
    generatedAt: new Date().toISOString(),
    lastSyncedAt: new Date().toISOString(),
    legalQueue: nextQueue,
    activeNdaPacket: packet
  };
  saveStoredDashboard(nextDashboard);

  const response: NdaWorkflowResponse = { ok: true, dashboard: nextDashboard, packet };
  return res.status(200).json(response);
}
