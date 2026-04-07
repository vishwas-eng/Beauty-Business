import { TimeRange } from "../types/domain";

const labels: Record<TimeRange, string> = {
  "7d": "Last 7 Days",
  mtd: "Month to Date",
  all: "All Time"
};

export function TimeRangeTabs({
  value,
  onChange
}: {
  value: TimeRange;
  onChange(value: TimeRange): void;
}) {
  return (
    <div className="tab-row">
      {(Object.keys(labels) as TimeRange[]).map((range) => (
        <button
          key={range}
          className={range === value ? "tab-pill is-active" : "tab-pill"}
          onClick={() => onChange(range)}
        >
          {labels[range]}
        </button>
      ))}
    </div>
  );
}
