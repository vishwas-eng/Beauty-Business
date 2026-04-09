import { Flame, Snowflake } from "lucide-react";
import { formatNumber } from "../lib/format";
import { computeBrandScore, isGoingCold, scoreLabel, scoreTone } from "../lib/scoring";
import { PerformanceRow } from "../types/domain";

function ScoreBadge({ row }: { row: PerformanceRow }) {
  const score = computeBrandScore(row);
  const tone = scoreTone(score);
  const label = scoreLabel(score);
  return (
    <span className={`score-badge score-badge-${tone}`} title={label}>
      {tone === "green" ? <Flame size={10} /> : null}
      {score}
    </span>
  );
}

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
              <th>Score</th>
              <th>Cycle Time</th>
              <th>Readiness</th>
              <th>Milestone</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => {
              const cold = isGoingCold(row);
              return (
                <tr key={`${row.brand}-${row.launchMarket}-${row.status}`}>
                  <td>
                    <span className="brand-cell-name">{row.brand}</span>
                    {cold && (
                      <span className="going-cold-badge" title="Going cold — no recent activity">
                        <Snowflake size={10} />
                        Cold
                      </span>
                    )}
                  </td>
                  <td>{row.category}</td>
                  <td>{row.launchMarket}</td>
                  <td>
                    <span className={`stage-pill stage-${row.status.toLowerCase().replace(/\s+/g, "-")}`}>
                      {row.status}
                    </span>
                  </td>
                  <td><ScoreBadge row={row} /></td>
                  <td>{formatNumber(row.workingDays)}d</td>
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
                  <td className="milestone-cell">{row.nextStep || <span className="no-next-step">—</span>}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </section>
  );
}
