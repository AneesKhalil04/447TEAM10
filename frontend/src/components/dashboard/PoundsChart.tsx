import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import type { WeeklyTotal } from "../../types/dashboard";
import { formatPeriodLabel, formatPeriodTick, type Period } from "./utils";

interface PoundsChartProps {
  data: WeeklyTotal[];
  period: Period;
}

function PoundsChart({ data, period }: PoundsChartProps) {
  if (data.length === 0) {
    return <p className="chart-empty">No data in this range.</p>;
  }

  return (
    <ResponsiveContainer width="100%" height={260}>
      <BarChart data={data} margin={{ top: 8, right: 16, bottom: 0, left: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="var(--chart-grid)" vertical={false} />
        <XAxis
          dataKey="week_start"
          tickFormatter={(start) => formatPeriodTick(String(start), period)}
          stroke="var(--chart-axis)"
          tick={{ fill: "var(--chart-label)", fontSize: 12 }}
          minTickGap={24}
        />
        <YAxis
          stroke="var(--chart-axis)"
          tick={{ fill: "var(--chart-label)", fontSize: 12 }}
          width={48}
          allowDecimals={false}
        />
        <Tooltip
          labelFormatter={(label) => formatPeriodLabel(String(label), period)}
          formatter={(value) => [`${Number(value).toLocaleString()} lb`, "Pounds distributed"]}
          contentStyle={{
            background: "var(--panel-bg)",
            border: "1px solid var(--border-line)",
            borderRadius: 6,
            fontSize: 13,
          }}
        />
        <Bar dataKey="pounds_distributed" name="Pounds distributed" fill="var(--umbc-black)" radius={[3, 3, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}

export default PoundsChart;
