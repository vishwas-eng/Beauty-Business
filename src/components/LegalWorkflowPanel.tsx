import { CheckCircle2, FileText, Mail, Send } from "lucide-react";
import { FilledNdaPacket, LegalQueueItem } from "../types/domain";

interface LegalWorkflowPanelProps {
  items: LegalQueueItem[];
  selectedId: string;
  packet: FilledNdaPacket | null;
  busy: boolean;
  message: string;
  trialRecipientEmail: string;
  onSelect(id: string): void;
  onPrepare(id: string): void;
  onSend(id: string): void;
}

function getStatusTone(status: LegalQueueItem["ndaStatus"]) {
  switch (status) {
    case "Sent for legal review":
      return "status-green";
    case "Ready to send":
      return "status-blue";
    case "Ready to prepare":
      return "status-orange";
    default:
      return "status-neutral";
  }
}

export function LegalWorkflowPanel({
  items,
  selectedId,
  packet,
  busy,
  message,
  trialRecipientEmail,
  onSelect,
  onPrepare,
  onSend
}: LegalWorkflowPanelProps) {
  const selected = items.find((item) => item.id === selectedId) ?? items[0];

  if (!selected) {
    return null;
  }

  const isReadyForDraft =
    Boolean(selected.entityName) &&
    Boolean(selected.signatoryName) &&
    Boolean(selected.signatoryTitle) &&
    Boolean(selected.signatoryEmail) &&
    Boolean(
      selected.registeredAddress ||
        selected.sourceFields.find((field) => field.label.toLowerCase().includes("address"))?.value
    );
  const reviewPacket = packet && packet.brandId === selected.id ? packet : null;
  const isReviewReady = Boolean(reviewPacket?.readyForReview);

  function escapeHtml(value: string) {
    return value
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  function openReviewCopy() {
    if (!packet || packet.brandId !== selected.id) {
      return;
    }

    const reviewWindow = window.open("", "_blank", "noopener,noreferrer,width=900,height=1000");
    if (!reviewWindow) {
      return;
    }

    const fieldsMarkup = packet.filledFields
      .map(
        (field) =>
          `<div class="field"><span>${escapeHtml(field.label)}</span><strong>${escapeHtml(field.value)}</strong></div>`
      )
      .join("");

    const bodyMarkup = packet.body
      .split("\n")
      .map((line) => `<p>${escapeHtml(line || " ")}</p>`)
      .join("");

    reviewWindow.document.write(`<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <title>${escapeHtml(packet.attachmentName)}</title>
    <style>
      body { font-family: Arial, sans-serif; background: #f6f3ed; color: #2f3a36; margin: 0; padding: 32px; }
      .page { max-width: 820px; margin: 0 auto; background: #fffdf9; border: 1px solid #ddd7cc; border-radius: 20px; padding: 32px; }
      h1 { margin: 0 0 8px; font-size: 28px; }
      .meta { color: #6f7b74; margin-bottom: 24px; }
      .actions { display: flex; gap: 12px; margin-bottom: 24px; }
      .actions button, .actions a { border: 0; border-radius: 999px; padding: 12px 18px; font-weight: 600; cursor: pointer; text-decoration: none; }
      .primary { background: #6e8b78; color: white; }
      .secondary { background: #ece6da; color: #2f3a36; }
      .grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 12px; margin-bottom: 28px; }
      .field { border: 1px solid #e5ded2; border-radius: 14px; padding: 14px; background: #faf7f1; }
      .field span { display: block; font-size: 12px; color: #6f7b74; margin-bottom: 6px; text-transform: uppercase; letter-spacing: .04em; }
      .field strong { display: block; font-size: 15px; }
      .section-title { margin: 28px 0 10px; font-size: 16px; text-transform: uppercase; letter-spacing: .04em; color: #6f7b74; }
      .body { border-top: 1px solid #e5ded2; padding-top: 18px; }
      .body p { margin: 0 0 12px; line-height: 1.55; }
      @media print {
        body { background: white; padding: 0; }
        .page { border: 0; border-radius: 0; max-width: none; padding: 0; }
        .actions { display: none; }
      }
    </style>
  </head>
  <body>
    <div class="page">
      <h1>NDA Review Draft</h1>
      <div class="meta">${escapeHtml(selected.templateName)} · ${escapeHtml(packet.attachmentName)}</div>
      <div class="actions">
        <button class="primary" onclick="window.print()">Print / Save as PDF</button>
        ${
          selected.templateSourceUrl
            ? `<a class="secondary" href="${escapeHtml(selected.templateSourceUrl)}" target="_blank" rel="noreferrer">Open source draft</a>`
            : ""
        }
      </div>
      <div class="grid">${fieldsMarkup}</div>
      <div class="section-title">Prepared message</div>
      <div class="body">${bodyMarkup}</div>
    </div>
  </body>
</html>`);
    reviewWindow.document.close();
  }

  return (
    <section className="content-grid">
      <div className="panel content-span-2">
        <div className="panel-header">
          <div>
            <h2>Legal Queue</h2>
            <p>Brands that need NDA preparation or legal follow-through.</p>
          </div>
        </div>

        <div className="legal-queue">
          {items.map((item) => (
            <button
              key={item.id}
              className={item.id === selected.id ? "legal-row is-active" : "legal-row"}
              onClick={() => onSelect(item.id)}
            >
              <div className="legal-row-main">
                <div className="legal-row-title">
                  <strong>{item.brand}</strong>
                  <span className={`status-pill ${getStatusTone(item.ndaStatus)}`}>{item.ndaStatus}</span>
                </div>
                <p>{item.lastEmailSummary}</p>
                <div className="legal-row-meta">
                  <span>{item.market}</span>
                  <span>{item.stage}</span>
                  <span>{item.termSheetStatus}</span>
                </div>
              </div>
              <div className="legal-row-side">
                <span>{item.signatoryName || "Details pending"}</span>
                <span>{item.owner}</span>
              </div>
            </button>
          ))}
        </div>
      </div>

      <div className="panel mini-panel">
        <div className="panel-header">
          <div>
            <h2>NDA Draft Review</h2>
            <p>Fill the same NDA draft, review it here, then send it to legal. Trial send is pointed to your own inbox.</p>
          </div>
        </div>

        <div className="nda-summary">
          <div className="nda-summary-row">
            <span>Brand</span>
            <strong>{selected.brand}</strong>
          </div>
          <div className="nda-summary-row">
            <span>Recipient</span>
            <strong>{trialRecipientEmail}</strong>
          </div>
          <div className="nda-summary-row">
            <span>Template</span>
            <strong>{selected.templateName}</strong>
          </div>
          <div className="nda-summary-row">
            <span>Template status</span>
            <strong>{selected.templateStatus ?? "ready template"}</strong>
          </div>
          <div className="nda-summary-row">
            <span>Signatory</span>
            <strong>{selected.signatoryName || "Waiting for brand reply"}</strong>
          </div>
          <div className="nda-summary-row">
            <span>Registered address</span>
            <strong>{selected.registeredAddress || "Waiting for brand reply"}</strong>
          </div>
          <div className="nda-summary-row">
            <span>Extraction confidence</span>
            <strong>{selected.extractionConfidence ?? "Needs review"}</strong>
          </div>
        </div>

        {selected.templateSourceUrl ? (
          <a
            className="template-link"
            href={selected.templateSourceUrl}
            target="_blank"
            rel="noreferrer"
          >
            Open source NDA draft
          </a>
        ) : null}

        <div className="nda-field-grid">
          {selected.sourceFields.map((field) => (
            <div key={`${selected.id}-${field.label}`} className="nda-field-card">
              <span>{field.label}</span>
              <strong>{field.value}</strong>
            </div>
          ))}
        </div>

        <div className="nda-email-card">
          <div className="context-card-title">
            <Mail size={16} />
            <strong>Latest extracted email details</strong>
          </div>
          <p>{selected.lastEmailSummary}</p>
        </div>

        <div className="nda-email-card">
          <div className="context-card-title">
            <FileText size={16} />
            <strong>Draft fill logic</strong>
          </div>
          <p>
            The agent fills the same NDA draft with the brand entity, signatory name, designation,
            email, market, and any registered-address details available from email and tracker data.
          </p>
        </div>

        {reviewPacket?.missingFields.length ? (
          <div className="nda-email-card">
            <div className="context-card-title">
              <FileText size={16} />
              <strong>Missing before draft generation</strong>
            </div>
            <p>{reviewPacket.missingFields.join(", ")}</p>
          </div>
        ) : null}

        <div className="button-row">
          <button
            className="secondary-button"
            onClick={() => onPrepare(selected.id)}
            disabled={busy || !isReadyForDraft}
          >
            <FileText size={16} />
            {busy ? "Preparing..." : "Prepare review draft"}
          </button>
          <button
            className="primary-button"
            onClick={() => onSend(selected.id)}
            disabled={busy || !isReadyForDraft || !isReviewReady || !reviewPacket?.readyToSend}
          >
            <Send size={16} />
            {busy ? "Sending..." : "Approve and send to legal"}
          </button>
          <button
            className="ghost-button"
            onClick={openReviewCopy}
            disabled={!isReviewReady}
          >
            Open review copy
          </button>
        </div>

        {message ? <p className="status-note">{message}</p> : null}

        {!isReadyForDraft ? (
          <p className="status-note">
            Waiting for the brand to share entity name, authorized signatory, title, email, and registered address.
          </p>
        ) : !isReviewReady ? (
          <p className="status-note">
            Prepare the review draft first, then approve it before routing it to legal.
          </p>
        ) : null}

        {reviewPacket ? (
          <div className="nda-packet-card">
            <div className="context-card-title">
              <CheckCircle2 size={16} />
              <strong>{reviewPacket.status === "sent" ? "Draft sent to legal" : "Draft review ready"}</strong>
            </div>
            <div className="nda-packet-meta">
              <span>{reviewPacket.subject}</span>
              <span>{reviewPacket.attachmentName}</span>
            </div>
            <p className="status-note">
              Review copy generated from the NDA draft before sending. The filled values below are the
              exact details the agent is applying.
            </p>
            <div className="nda-packet-fields">
              {reviewPacket.filledFields.map((field) => (
                <div key={`${reviewPacket.brandId}-${field.label}`} className="nda-packet-field">
                  <span>{field.label}</span>
                  <strong>{field.value}</strong>
                </div>
              ))}
            </div>
            <pre className="nda-email-preview">{reviewPacket.body}</pre>
          </div>
        ) : null}
      </div>
    </section>
  );
}
