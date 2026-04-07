import { ArrowDownRight, ArrowUpRight, Info } from "lucide-react";
import { KpiMetric } from "../types/domain";

export function KpiCard({ metric }: { metric: KpiMetric }) {
  const positive = !metric.delta.startsWith("-");

  return (
    <article className={`kpi-card tone-${metric.tone}`}>
      <div className="kpi-headline">
        <p className="kpi-label">{metric.label}</p>
        {metric.detailItems?.length ? (
          <div className="kpi-detail-wrap">
            <button className="kpi-info-button" type="button" aria-label={`Details for ${metric.label}`}>
              <Info size={14} />
            </button>
            <div className="kpi-detail-popover">
              <strong>{metric.detailTitle ?? "Included in this metric"}</strong>
              <ul className="kpi-detail-list">
                {metric.detailItems.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </div>
          </div>
        ) : null}
      </div>
      <div className="kpi-value-row">
        <h3>{metric.value}</h3>
        <span className={positive ? "delta positive" : "delta negative"}>
          {positive ? <ArrowUpRight size={14} /> : <ArrowDownRight size={14} />}
          {metric.delta}
        </span>
      </div>
      <p className="kpi-hint">{metric.hint}</p>
    </article>
  );
}
