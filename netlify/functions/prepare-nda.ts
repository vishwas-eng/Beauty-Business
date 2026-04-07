import type { Handler } from "@netlify/functions";
import { NdaWorkflowResponse } from "../../src/types/domain";
import {
  buildNdaPacket,
  getStoredDashboard,
  getStoredLegalQueue,
  json,
  saveStoredDashboard,
  saveStoredLegalQueue,
  saveStoredNdaPacket
} from "./shared";

export const handler: Handler = async (event) => {
  const body = event.body
    ? (JSON.parse(event.body) as {
        brandId?: string;
        action?: "prepare" | "send";
        recipientEmail?: string;
      })
    : {};

  const brandId = body.brandId;
  const action = body.action ?? "prepare";
  const recipientEmail = body.recipientEmail ?? process.env.TRIAL_LEGAL_EMAIL ?? "vishwas@opptra.com";

  if (!brandId) {
    return json(400, { ok: false, message: "brandId is required" });
  }

  const legalQueue = getStoredLegalQueue();
  const target = legalQueue.find((item) => item.id === brandId);

  if (!target) {
    return json(404, { ok: false, message: "Brand legal item not found" });
  }

  const registeredAddress =
    target.registeredAddress ||
    target.sourceFields.find((field) => field.label.toLowerCase().includes("address"))?.value ||
    "";

  if (!target.signatoryName || !target.signatoryTitle || !target.signatoryEmail || !target.entityName || !registeredAddress) {
    return json(400, {
      ok: false,
      message: "Entity, signatory, title, email, and registered address must all be available before preparing the NDA draft"
    });
  }

  const packet = buildNdaPacket(target, recipientEmail, "Palak Legal Review", action === "send" ? "sent" : "drafted");
  const nextQueue = legalQueue.map((item) =>
    item.id === brandId
      ? {
          ...item,
          ndaStatus: action === "send" ? ("Sent for legal review" as const) : ("Ready to send" as const)
        }
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

  const response: NdaWorkflowResponse = {
    ok: true,
    dashboard: nextDashboard,
    packet
  };

  return json(200, response);
};
