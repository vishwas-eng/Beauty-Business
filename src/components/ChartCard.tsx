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
  Leads: "#b7aca0",
  MQL: "#8ea79a",
  SQL: "#9faf86",
  Commercials: "#6e8b78",
  Hold: "#c59a63",
  Reject: "#b87474",
  New: "#d9d2c7",
  Unclassified: "#d9d2c7"
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
            <CartesianGrid stroke="#e3ddd3" vertical={false} />
            <XAxis dataKey="label" stroke="#7b8076" />
            <YAxis yAxisId="left" stroke="#7b8076" tickFormatter={formatNumber} />
            <YAxis yAxisId="right" orientation="right" stroke="#7b8076" />
            <Tooltip
              contentStyle={{ borderRadius: 16, border: "1px solid #d9d2c7", background: "#fffdf9" }}
              formatter={(value: number) => formatNumber(value)}
            />
            <Legend />
            <Area
              yAxisId="right"
              dataKey="secondary"
              name="Working days"
              type="monotone"
              stroke="#c8c2b5"
              fill="#f3efe7"
              fillOpacity={1}
            />
            <Line
              yAxisId="left"
              type="monotone"
              dataKey="primary"
              name="Rows"
              stroke="#738774"
              strokeWidth={2.5}
              dot={{ r: 3, fill: "#738774" }}
            />
            <Line
              yAxisId="left"
              type="monotone"
              dataKey="tertiary"
              name="Avg transition days"
              stroke="#a28669"
              strokeWidth={2}
              dot={{ r: 2.5, fill: "#a28669" }}
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
  keyName
}: {
  title: string;
  subtitle: string;
  data: CategoryBreakdown[];
  keyName: "revenue" | "inventoryValue";
}) {
  const colors = ["#7f9482", "#9eae96", "#b8c2ab", "#cdbfa9", "#ddd4c7", "#b7aca0"];

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
            <CartesianGrid stroke="#eee8dd" horizontal={false} />
            <XAxis type="number" stroke="#7b8076" />
            <YAxis type="category" dataKey="category" width={96} stroke="#7b8076" tick={{ fontSize: 11 }} />
            <Tooltip
              contentStyle={{ borderRadius: 16, border: "1px solid #d9d2c7", background: "#fffdf9" }}
              formatter={(value: number) => formatNumber(value)}
            />
            <Bar dataKey={keyName} radius={[0, 12, 12, 0]}>
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
            <CartesianGrid stroke="#eee8dd" horizontal={false} />
            <XAxis dataKey="brand" stroke="#7b8076" tick={{ fontSize: 11 }} />
            <YAxis stroke="#7b8076" domain={[0, 100]} />
            <Tooltip
              contentStyle={{ borderRadius: 16, border: "1px solid #d9d2c7", background: "#fffdf9" }}
              formatter={(value: number) => `${formatNumber(value)}%`}
            />
            <Line
              type="monotone"
              dataKey="progress"
              name="Readiness"
              stroke="#7b8f7c"
              strokeWidth={2.5}
              dot={{ r: 4, fill: "#7b8f7c" }}
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
            <CartesianGrid stroke="#eee8dd" vertical={false} />
            <XAxis dataKey="brand" stroke="#7b8076" tick={{ fontSize: 11 }} />
            <YAxis stroke="#7b8076" />
            <Tooltip
              contentStyle={{ borderRadius: 16, border: "1px solid #d9d2c7", background: "#fffdf9" }}
              formatter={(value: number) => `${formatNumber(value)} days`}
            />
            <Area
              type="monotone"
              dataKey="workingDays"
              stroke="#b38f6f"
              fill="#f1e8dc"
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
            <CartesianGrid stroke="#eee8dd" vertical={false} />
            <XAxis dataKey="name" stroke="#7b8076" tick={{ fontSize: 11 }} />
            <YAxis stroke="#7b8076" />
            <Tooltip
              contentStyle={{ borderRadius: 16, border: "1px solid #d9d2c7", background: "#fffdf9" }}
            />
            <Legend />
            {stages.map((stage) => (
              <Bar key={stage} dataKey={stage} stackId="stage" fill={stagePalette[stage]} radius={stage === "New" ? [6, 6, 0, 0] : 0} />
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
  data
}: {
  title: string;
  subtitle: string;
  data: CategoryBreakdown[];
}) {
  const colors = ["#6e8b78", "#c59a63", "#b87474", "#d9d2c7", "#8ea79a"];

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
            <Tooltip
              contentStyle={{ borderRadius: 16, border: "1px solid #d9d2c7", background: "#fffdf9" }}
              formatter={(value: number) => formatNumber(value)}
            />
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
                    background: `rgba(110, 139, 120, ${0.14 + intensity * 0.5})`
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
