import { useEffect, useState } from "react";
import { fetchDashboard } from "../lib/api";
import { DashboardPayload } from "../types/domain";

export function ActionCenterPage() {
  const [payload, setPayload] = useState<DashboardPayload | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    void fetchDashboard("mtd")
      .then(setPayload)
      .finally(() => setLoading(false));
  }, []);

  if (loading || !payload) {
    return <div className="page-loader">Preparing action center...</div>;
  }

  return (
    <div className="page-stack">
      <section className="panel">
        <div className="panel-header">
          <div>
            <h2>Action Center</h2>
            <p>Everything that needs follow-through across tracker, inbox, meetings, and legal.</p>
          </div>
        </div>

        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Brand</th>
                <th>Action</th>
                <th>Owner</th>
                <th>Priority</th>
                <th>Status</th>
                <th>Due</th>
                <th>Source</th>
              </tr>
            </thead>
            <tbody>
              {payload.actionItems.map((item) => (
                <tr key={item.id}>
                  <td>{item.brand}</td>
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
