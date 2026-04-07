import { formatNumber } from "../lib/format";
import { PerformanceRow } from "../types/domain";

export function PerformanceTable({
  rows,
  title = "Priority Business",
  subtitle = "Current opportunity view for the selected business filters."
}: {
  rows: PerformanceRow[];
  title?: string;
  subtitle?: string;
}) {
  return (
    <section className="panel">
      <div className="panel-header">
        <div>
          <h2>{title}</h2>
          <p>{subtitle}</p>
        </div>
      </div>

      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Brand</th>
              <th>Category</th>
              <th>Market</th>
              <th>Stage</th>
              <th>Cycle Time</th>
              <th>Readiness</th>
              <th>Milestone</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={`${row.brand}-${row.launchMarket}-${row.status}`}>
                <td>{row.brand}</td>
                <td>{row.category}</td>
                <td>{row.launchMarket}</td>
                <td>{row.status}</td>
                <td>{formatNumber(row.workingDays)}</td>
                <td>
                  <div className="progress-cell">
                    <span>{formatNumber(row.progress)}%</span>
                    <div className="progress-track">
                      <div
                        className="progress-fill"
                        style={{ width: `${Math.min(row.progress, 100)}%` }}
                      />
                    </div>
                  </div>
                </td>
                <td>{row.nextStep}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
