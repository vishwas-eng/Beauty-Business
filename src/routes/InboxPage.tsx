import { useEffect, useState } from "react";
import { fetchDashboard } from "../lib/api";
import { DashboardPayload } from "../types/domain";
import { formatDateTime } from "../lib/format";

export function InboxPage() {
  const [payload, setPayload] = useState<DashboardPayload | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    void fetchDashboard("mtd")
      .then(setPayload)
      .finally(() => setLoading(false));
  }, []);

  if (loading || !payload) {
    return <div className="page-loader">Preparing inbox updates...</div>;
  }

  return (
    <div className="page-stack">
      <section className="panel">
        <div className="panel-header">
          <div>
            <h2>Inbox Updates</h2>
            <p>Real brand movement extracted from Gmail threads and recent follow-ups.</p>
          </div>
        </div>

        <div className="context-list">
          {payload.inboxUpdates.map((item) => (
            <div key={item.id} className="context-card">
              <div className="legal-row-title">
                <strong>{item.brand}</strong>
                <span className={`status-pill ${item.status === "unread" ? "status-orange" : item.status === "done" ? "status-green" : "status-blue"}`}>
                  {item.status}
                </span>
              </div>
              <p>{item.subject}</p>
              <p>{item.summary}</p>
              <div className="context-meta">
                <span>{item.sender}</span>
                <span>{formatDateTime(item.timestamp)}</span>
              </div>
              <p className="status-note">{item.actionNeeded}</p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
