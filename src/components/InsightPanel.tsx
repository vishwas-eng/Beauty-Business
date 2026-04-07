import { BrainCircuit, RefreshCcw } from "lucide-react";
import { InsightItem } from "../types/domain";

export function InsightPanel({
  insights,
  onRefresh,
  busy
}: {
  insights: InsightItem[];
  onRefresh(): void;
  busy: boolean;
}) {
  return (
    <section className="panel insight-panel">
      <div className="panel-header">
        <div>
          <h2>AI Insights</h2>
          <p>Plain-English takeaways generated from the current dashboard range.</p>
        </div>
        <button className="secondary-button" onClick={onRefresh} disabled={busy}>
          <RefreshCcw size={16} />
          {busy ? "Refreshing..." : "Generate fresh insights"}
        </button>
      </div>

      <div className="insight-list">
        {insights.map((item) => (
          <article key={item.id} className={`insight-card priority-${item.priority}`}>
            <div className="insight-title">
              <BrainCircuit size={18} />
              <h3>{item.title}</h3>
            </div>
            <p>{item.summary}</p>
          </article>
        ))}
      </div>
    </section>
  );
}
