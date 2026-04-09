import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis
} from "recharts";
import { CategoryBreakdown, TrendPoint } from "../types/domain";
import { formatNumber } from "../lib/format";

const stagePalette: Record<string, string> = {
  Leads: "#3b82f6",
  MQL: "#14b8a6",
  SQL: "#22c55e",
  Commercials: "#6366f1",
  Hold: "#f59e0b",
  Reject: "#ef4444",
  New: "#94a3b8",
  Unclassified: "#94a3b8"
};

const tooltipStyle = {
  borderRadius: 10,
  border: "1px solid #e5e7eb",
  background: "#ffffff",
  boxShadow: "0 4px 12px rgba(0,0,0,0.08)"
};

export function RevenueTrendChart({ data }: { data: TrendPoint[] }) {
  return (
    <section className="panel">
      <div className="panel-header">
        <div>
          <h2>Stage Velocity</h2>
          <p>Opportunity volume, cycle time, and stage aging across the current operating funnel.</p>
        </div>
      </div>
      <div className="chart-wrap">
        <ResponsiveContainer width="100%" height={280}>
          <AreaChart data={data}>
            <CartesianGrid stroke="#e5e7eb" vertical={false} />
            <XAxis dataKey="label" stroke="#6b7280" tick={{ fontSize: 11 }} />
            <YAxis yAxisId="left" stroke="#6b7280" tickFormatter={formatNumber} />
            <YAxis yAxisId="right" orientation="right" stroke="#6b7280" />
            <Tooltip contentStyle={tooltipStyle} formatter={(value: number, name: string) => [formatNumber(value), name]} />
            <Legend />
            <Area
              yAxisId="right"
              dataKey="secondary"
              name="Working days"
              type="monotone"
              stroke="#94a3b8"
              fill="#f1f5f9"
              fillOpacity={0.8}
            />
            <Line
              yAxisId="left"
              type="monotone"
              dataKey="primary"
              name="Opportunities"
              stroke="#3b82f6"
              strokeWidth={2.5}
              dot={{ r: 3, fill: "#3b82f6" }}
            />
            <Line
              yAxisId="left"
              type="monotone"
              dataKey="tertiary"
              name="Avg transition days"
              stroke="#f59e0b"
              strokeWidth={2}
              dot={{ r: 2.5, fill: "#f59e0b" }}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </section>
  );
}

export function CategoryBarChart({
  title,
  subtitle,
  data,
  keyName,
  valueLabel = "Count"
}: {
  title: string;
  subtitle: string;
  data: CategoryBreakdown[];
  keyName: "revenue" | "inventoryValue";
  valueLabel?: string;
}) {
  const colors = ["#3b82f6", "#14b8a6", "#8b5cf6", "#f59e0b", "#22c55e", "#ec4899"];

  return (
    <section className="panel">
      <div className="panel-header">
        <div>
          <h2>{title}</h2>
          <p>{subtitle}</p>
        </div>
      </div>
      <div className="chart-wrap">
        <ResponsiveContainer width="100%" height={260}>
          <BarChart data={data} layout="vertical">
            <CartesianGrid stroke="#e5e7eb" horizontal={false} />
            <XAxis type="number" stroke="#6b7280" />
            <YAxis type="category" dataKey="category" width={96} stroke="#6b7280" tick={{ fontSize: 11 }} />
            <Tooltip contentStyle={tooltipStyle} formatter={(value: number) => [formatNumber(value), valueLabel]} />
            <Bar dataKey={keyName} name={valueLabel} radius={[0, 8, 8, 0]}>
              {data.map((item, index) => (
                <Cell key={item.category} fill={colors[index % colors.length]} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </section>
  );
}

export function BrandReadinessChart({
  data
}: {
  data: Array<{ brand: string; progress: number }>;
}) {
  return (
    <section className="panel">
      <div className="panel-header">
        <div>
          <h2>Readiness by Brand</h2>
          <p>Which opportunities are closest to the next commercial milestone.</p>
        </div>
      </div>
      <div className="chart-wrap">
        <ResponsiveContainer width="100%" height={250}>
          <LineChart data={data}>
            <CartesianGrid stroke="#e5e7eb" horizontal={false} />
            <XAxis dataKey="brand" stroke="#6b7280" tick={{ fontSize: 11 }} />
            <YAxis stroke="#6b7280" domain={[0, 100]} />
            <Tooltip contentStyle={tooltipStyle} formatter={(value: number) => `${formatNumber(value)}%`} />
            <Line
              type="monotone"
              dataKey="progress"
              name="Readiness"
              stroke="#6366f1"
              strokeWidth={2.5}
              dot={{ r: 4, fill: "#6366f1" }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </section>
  );
}

export function CycleTimeChart({
  data
}: {
  data: Array<{ brand: string; workingDays: number }>;
}) {
  return (
    <section className="panel">
      <div className="panel-header">
        <div>
          <h2>Cycle Time Pressure</h2>
          <p>Which opportunities are aging most and may need intervention.</p>
        </div>
      </div>
      <div className="chart-wrap">
        <ResponsiveContainer width="100%" height={250}>
          <AreaChart data={data}>
            <CartesianGrid stroke="#e5e7eb" vertical={false} />
            <XAxis dataKey="brand" stroke="#6b7280" tick={{ fontSize: 11 }} />
            <YAxis stroke="#6b7280" />
            <Tooltip contentStyle={tooltipStyle} formatter={(value: number) => `${formatNumber(value)} days`} />
            <Area
              type="monotone"
              dataKey="workingDays"
              stroke="#ef4444"
              fill="rgba(239, 68, 68, 0.1)"
              fillOpacity={1}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </section>
  );
}

export function StageStackedChart({
  title,
  subtitle,
  data
}: {
  title: string;
  subtitle: string;
  data: Array<Record<string, string | number>>;
}) {
  const stages = ["Leads", "MQL", "SQL", "Commercials", "Hold", "Reject", "New"];

  return (
    <section className="panel">
      <div className="panel-header">
        <div>
          <h2>{title}</h2>
          <p>{subtitle}</p>
        </div>
      </div>
      <div className="chart-wrap">
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={data}>
            <CartesianGrid stroke="#e5e7eb" vertical={false} />
            <XAxis dataKey="name" stroke="#6b7280" tick={{ fontSize: 11 }} />
            <YAxis stroke="#6b7280" />
            <Tooltip contentStyle={tooltipStyle} />
            <Legend />
            {stages.map((stage) => (
              <Bar key={stage} dataKey={stage} stackId="stage" fill={stagePalette[stage]} radius={stage === "New" ? [4, 4, 0, 0] : 0} />
            ))}
          </BarChart>
        </ResponsiveContainer>
      </div>
    </section>
  );
}

export function DonutBreakdownChart({
  title,
  subtitle,
  data,
  valueLabel = "Count"
}: {
  title: string;
  subtitle: string;
  data: CategoryBreakdown[];
  valueLabel?: string;
}) {
  const colors = ["#3b82f6", "#f59e0b", "#ef4444", "#14b8a6", "#8b5cf6", "#ec4899", "#22c55e"];

  return (
    <section className="panel">
      <div className="panel-header">
        <div>
          <h2>{title}</h2>
          <p>{subtitle}</p>
        </div>
      </div>
      <div className="chart-wrap">
        <ResponsiveContainer width="100%" height={280}>
          <PieChart>
            <Pie
              data={data}
              dataKey="revenue"
              nameKey="category"
              innerRadius={72}
              outerRadius={102}
              paddingAngle={2}
            >
              {data.map((entry, index) => (
                <Cell key={entry.category} fill={colors[index % colors.length]} />
              ))}
            </Pie>
            <Tooltip contentStyle={tooltipStyle} formatter={(value: number) => [formatNumber(value), valueLabel]} />
            <Legend />
          </PieChart>
        </ResponsiveContainer>
      </div>
    </section>
  );
}

export function HeatmapChart({
  title,
  subtitle,
  rows,
  columns,
  values
}: {
  title: string;
  subtitle: string;
  rows: string[];
  columns: string[];
  values: Record<string, Record<string, number>>;
}) {
  const maxValue = Math.max(
    1,
    ...rows.flatMap((row) => columns.map((column) => values[row]?.[column] ?? 0))
  );

  return (
    <section className="panel">
      <div className="panel-header">
        <div>
          <h2>{title}</h2>
          <p>{subtitle}</p>
        </div>
      </div>
      <div className="heatmap">
        <div className="heatmap-row heatmap-header">
          <div className="heatmap-corner" />
          {columns.map((column) => (
            <div key={column} className="heatmap-header-cell">
              {column}
            </div>
          ))}
        </div>
        {rows.map((row) => (
          <div key={row} className="heatmap-row">
            <div className="heatmap-label">{row}</div>
            {columns.map((column) => {
              const value = values[row]?.[column] ?? 0;
              const intensity = value / maxValue;
              return (
                <div
                  key={`${row}-${column}`}
                  className="heatmap-cell"
                  style={{
                    background: `rgba(99, 102, 241, ${0.08 + intensity * 0.45})`
                  }}
                  title={`${row} · ${column}: ${value}`}
                >
                  {value}
                </div>
              );
            })}
          </div>
        ))}
      </div>
    </section>
  );
}
