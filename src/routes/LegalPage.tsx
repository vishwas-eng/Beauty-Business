import { useEffect, useState } from "react";
import { fetchDashboard, runNdaWorkflow } from "../lib/api";
import { useAuth } from "../lib/auth";
import { formatDateTime } from "../lib/format";
import { LegalWorkflowPanel } from "../components/LegalWorkflowPanel";
import { DashboardPayload } from "../types/domain";

export function LegalPage() {
  const { session } = useAuth();
  const [payload, setPayload] = useState<DashboardPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [selectedLegalId, setSelectedLegalId] = useState("");
  const [message, setMessage] = useState("");

  useEffect(() => {
    setLoading(true);
    void fetchDashboard("mtd")
      .then(setPayload)
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (!payload?.legalQueue.length) {
      return;
    }

    setSelectedLegalId((current) =>
      current && payload.legalQueue.some((item) => item.id === current)
        ? current
        : payload.legalQueue[0].id
    );
  }, [payload]);

  async function handleNdaAction(action: "prepare" | "send", brandId = selectedLegalId) {
    if (!brandId) {
      return;
    }

    setBusy(true);
    setMessage("");

    try {
      const response = await runNdaWorkflow(
        brandId,
        action,
        session?.email ?? "vishwas@opptra.com"
      );
      setPayload(response.dashboard);
      setMessage(
        action === "send"
          ? "Review approved and routed to the legal recipient flow."
          : "Review draft prepared. Open the review copy and verify the fields before sending."
      );
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "NDA workflow could not be completed.");
    } finally {
      setBusy(false);
    }
  }

  if (loading || !payload) {
    return <div className="page-loader">Preparing legal workflow...</div>;
  }

  return (
    <div className="page-stack">
      <section className="automation-banner">
        <div className="automation-copy">
          <div className="eyebrow">Legal workflow</div>
          <strong>Latest sync {formatDateTime(payload.lastSyncedAt)}</strong>
          <p className="subdued">
            Trial routing is pointed to {session?.email ?? "vishwas@opptra.com"} until live legal sending is enabled.
          </p>
        </div>
        <div className={`run-state state-${payload.automation.lastRunState}`}>
          {payload.legalQueue.length} items
        </div>
      </section>

      <LegalWorkflowPanel
        items={payload.legalQueue}
        selectedId={selectedLegalId}
        packet={payload.activeNdaPacket}
        busy={busy}
        message={message}
        trialRecipientEmail={session?.email ?? "vishwas@opptra.com"}
        onSelect={setSelectedLegalId}
        onPrepare={(id) => {
          setSelectedLegalId(id);
          void handleNdaAction("prepare", id);
        }}
        onSend={(id) => {
          setSelectedLegalId(id);
          void handleNdaAction("send", id);
        }}
      />
    </div>
  );
}
