import { useEffect, useMemo, useState } from "react";
import { ChevronDown } from "lucide-react";
import { fetchDashboard } from "../lib/api";
import { DashboardPayload } from "../types/domain";
import { formatDateTime } from "../lib/format";

export function BrandPage() {
  const [payload, setPayload] = useState<DashboardPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedBrand, setSelectedBrand] = useState("");

  useEffect(() => {
    setLoading(true);
    void fetchDashboard("mtd")
      .then(setPayload)
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (!payload?.brandProfiles.length) {
      return;
    }

    setSelectedBrand((current) =>
      current && payload.brandProfiles.some((item) => item.id === current)
        ? current
        : payload.brandProfiles[0].id
    );
  }, [payload]);

  const profile = useMemo(
    () => payload?.brandProfiles.find((item) => item.id === selectedBrand) ?? payload?.brandProfiles[0],
    [payload, selectedBrand]
  );

  if (loading || !payload || !profile) {
    return <div className="page-loader">Preparing brand view...</div>;
  }

  const relatedUpdates = payload.inboxUpdates.filter((item) => item.brand === profile.brand);
  const relatedActions = payload.actionItems.filter((item) => item.brand === profile.brand);

  return (
    <div className="page-stack">
      <section className="hero-row">
        <div>
          <p className="subdued">Brand 360 pulls tracker status, emails, legal state, and key documents into one record.</p>
        </div>
        <label className="filter-select">
          <span>Brand</span>
          <select value={profile.id} onChange={(event) => setSelectedBrand(event.target.value)}>
            {payload.brandProfiles.map((item) => (
              <option key={item.id} value={item.id}>
                {item.brand}
              </option>
            ))}
          </select>
          <ChevronDown size={14} />
        </label>
      </section>

      <section className="content-grid">
        <div className="panel content-span-2">
          <div className="panel-header">
            <div>
              <h2>{profile.brand}</h2>
              <p>{profile.summary}</p>
            </div>
          </div>

          <div className="nda-field-grid">
            <div className="nda-field-card">
              <span>Market</span>
              <strong>{profile.market}</strong>
            </div>
            <div className="nda-field-card">
              <span>Stage</span>
              <strong>{profile.stage}</strong>
            </div>
            <div className="nda-field-card">
              <span>Owner</span>
              <strong>{profile.owner}</strong>
            </div>
            <div className="nda-field-card">
              <span>Legal status</span>
              <strong>{profile.legalStatus}</strong>
            </div>
            <div className="nda-field-card">
              <span>Next step</span>
              <strong>{profile.nextStep}</strong>
            </div>
            <div className="nda-field-card">
              <span>Last update</span>
              <strong>{formatDateTime(profile.lastUpdate)}</strong>
            </div>
          </div>
        </div>

        <div className="panel mini-panel">
          <div className="panel-header">
            <div>
              <h2>Contacts</h2>
              <p>People currently relevant to this brand.</p>
            </div>
          </div>
          <div className="context-list">
            {profile.keyContacts.map((contact) => (
              <div key={contact} className="context-card">
                <strong>{contact}</strong>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="content-grid">
        <div className="panel content-span-2">
          <div className="panel-header">
            <div>
              <h2>Inbox Updates</h2>
              <p>Latest email signals tied to this brand.</p>
            </div>
          </div>
          <div className="context-list">
            {relatedUpdates.map((item) => (
              <div key={item.id} className="context-card">
                <div className="context-card-title">
                  <strong>{item.subject}</strong>
                </div>
                <p>{item.summary}</p>
                <div className="context-meta">
                  <span>{item.sender}</span>
                  <span>{item.actionNeeded}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="panel mini-panel">
          <div className="panel-header">
            <div>
              <h2>Documents</h2>
              <p>Drafts and files linked to this brand.</p>
            </div>
          </div>
          <div className="context-list">
            {profile.documents.map((document) => (
              <div key={document.id} className="context-card">
                <strong>{document.title}</strong>
                <p>{document.status}</p>
                {document.url ? (
                  <a className="template-link" href={document.url} target="_blank" rel="noreferrer">
                    Open document
                  </a>
                ) : null}
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="panel">
        <div className="panel-header">
          <div>
            <h2>Open Actions</h2>
            <p>What needs to happen next for this brand.</p>
          </div>
        </div>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Title</th>
                <th>Owner</th>
                <th>Priority</th>
                <th>Status</th>
                <th>Due</th>
                <th>Source</th>
              </tr>
            </thead>
            <tbody>
              {relatedActions.map((item) => (
                <tr key={item.id}>
                  <td>{item.title}</td>
                  <td>{item.owner}</td>
                  <td>{item.priority}</td>
                  <td>{item.status}</td>
                  <td>{item.dueLabel}</td>
                  <td>{item.source}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
