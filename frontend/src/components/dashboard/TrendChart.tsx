import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { WeeklyTotal } from "../../types/dashboard";
import { formatPeriodLabel, formatPeriodTick, type Period } from "./utils";

interface TrendChartProps {
  data: WeeklyTotal[];
  period: Period;
}

function TrendChart({ data, period }: TrendChartProps) {
  if (data.length === 0) {
    return <p className="chart-empty">No data in this range.</p>;
  }

  return (
    <ResponsiveContainer width="100%" height={260}>
      <LineChart data={data} margin={{ top: 8, right: 16, bottom: 0, left: 0 }}>
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
          width={44}
          allowDecimals={false}
        />
        <Tooltip
          labelFormatter={(label) => formatPeriodLabel(String(label), period)}
          contentStyle={{
            background: "var(--panel-bg)",
            border: "1px solid var(--border-line)",
            borderRadius: 6,
            fontSize: 13,
          }}
        />
        <Legend wrapperStyle={{ fontSize: 13 }} />
        <Line type="monotone" dataKey="visits" name="Visits" stroke="var(--umbc-gold)" strokeWidth={2} dot={false} />
        <Line
          type="monotone"
          dataKey="students_served"
          name="Students served"
          stroke="var(--chart-accent-2)"
          strokeWidth={2}
          dot={false}
        />
      </LineChart>
    </ResponsiveContainer>
  );
}

export default TrendChart;
