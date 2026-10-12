interface KpiCardProps {
  label: string;
  value: number;
  previousValue: number | null;
  window?: string;
}

const numberFormatter = new Intl.NumberFormat("en-US");

function formatDelta(current: number, previous: number): { text: string; direction: "good" | "bad" | "flat" } {
  const diff = current - previous;
  if (previous === 0) {
    return { text: "no prior period to compare", direction: "flat" };
  }
  const pct = diff / previous;
  const sign = diff > 0 ? "+" : "";
  const direction = diff > 0 ? "good" : diff < 0 ? "bad" : "flat";
  return {
    text: `${sign}${numberFormatter.format(diff)} (${sign}${(pct * 100).toFixed(0)}%) vs prior period`,
    direction,
  };
}

function KpiCard({ label, value, previousValue, window }: KpiCardProps) {
  const delta = previousValue === null ? null : formatDelta(value, previousValue);

  return (
    <div className="dash-card kpi-card">
      <div className="kpi-top">
        <span className="kpi-label">{label}</span>
        {window && <span className="kpi-window">{window}</span>}
      </div>
      <div className="kpi-value">{numberFormatter.format(value)}</div>
      <div className={`kpi-delta ${delta?.direction ?? "flat"}`}>
        {delta?.text ?? "no prior period to compare"}
      </div>
    </div>
  );
}

export default KpiCard;
