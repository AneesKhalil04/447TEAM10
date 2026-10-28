import { useEffect, useState } from "react";
import { fetchDashboardSummary, type DashboardFilters } from "../../api/dashboard";
import type { DashboardSummary } from "../../types/dashboard";
import DashboardFiltersBar from "./DashboardFiltersBar";
import KpiCard from "./KpiCard";
import OfficeBreakdownTable from "./OfficeBreakdownTable";
import PoundsChart from "./PoundsChart";
import TrendChart from "./TrendChart";
import "./Dashboard.css";
import { formatFullDate, groupByMonth, type Period } from "./utils";

interface DashboardProps {
  fetchSummary?: (filters: DashboardFilters, signal?: AbortSignal) => Promise<DashboardSummary>;
  onGoToUpload?: () => void;
}

const EMPTY_FILTERS: DashboardFilters = { officeId: null, start: null, end: null };

function Dashboard({ fetchSummary = fetchDashboardSummary, onGoToUpload }: DashboardProps) {
  const [filters, setFilters] = useState<DashboardFilters>(EMPTY_FILTERS);
  const [period, setPeriod] = useState<Period>("week");
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError(null);
    fetchSummary(filters, controller.signal)
      .then((data) => {
        setSummary(data);
        setLoading(false);
      })
      .catch((reason: unknown) => {
        if (controller.signal.aborted) return;
        setError(reason instanceof Error ? reason.message : "Something went wrong.");
        setLoading(false);
      });
    // A newer filter change cancels the request still in flight.
    return () => controller.abort();
  }, [fetchSummary, filters, attempt]);

  const retry = () => setAttempt((count) => count + 1);
  const series = summary ? (period === "month" ? groupByMonth(summary.weeks) : summary.weeks) : [];
  const per = period === "month" ? "month" : "week";

  return (
    <>
      {error && (
        <div className="dash-alert" role="alert">
          <span>{summary ? `Could not refresh the dashboard. ${error}` : error}</span>
          <button type="button" className="reset-button" onClick={retry}>
            Try again
          </button>
        </div>
      )}

      {!summary && loading && (
        <p className="dash-status" role="status">
          Loading dashboard&hellip;
        </p>
      )}

      {summary && !summary.data_range && (
        <div className="dash-card dash-empty">
          <div className="card-title">No data yet</div>
          <p className="card-note">Upload a weekly or monthly file to see totals and charts here.</p>
          {onGoToUpload && (
            <button type="button" className="primary-button" onClick={onGoToUpload}>
              Go to Upload data
            </button>
          )}
        </div>
      )}

      {summary?.data_range && (
        <div className="dash-body" aria-busy={loading}>
          <p className="dash-takeaway">{takeaway(summary, filters)}</p>

          <div className="dash-toolbar">
            <DashboardFiltersBar
              offices={summary.offices}
              filters={filters}
              minDate={summary.data_range.start}
              maxDate={summary.data_range.end}
              onChange={setFilters}
              onReset={() => setFilters(EMPTY_FILTERS)}
            />
            <div className="period-toggle" role="group" aria-label="Show by">
              {(["week", "month"] as const).map((option) => (
                <button
                  key={option}
                  type="button"
                  aria-pressed={period === option}
                  onClick={() => setPeriod(option)}
                >
                  {option === "week" ? "Weekly" : "Monthly"}
                </button>
              ))}
            </div>
          </div>
          {loading && (
            <p className="dash-status" role="status">
              Updating&hellip;
            </p>
          )}

          <div className="dash-kpis">
            <KpiCard
              label="Visits"
              value={summary.totals.visits}
              previousValue={summary.previous_totals?.visits ?? null}
              window={windowLabel(filters)}
            />
            <KpiCard
              label="Students served"
              value={summary.totals.students_served}
              previousValue={summary.previous_totals?.students_served ?? null}
            />
            <KpiCard
              label="Pounds distributed"
              value={summary.totals.pounds_distributed}
              previousValue={summary.previous_totals?.pounds_distributed ?? null}
            />
          </div>

          <div className="dash-grid">
            <div className="dash-card">
              <div className="card-title">Visits &amp; students served per {per}</div>
              <TrendChart data={series} period={period} />
            </div>
            <div className="dash-card">
              <div className="card-title">Pounds of food distributed per {per}</div>
              <PoundsChart data={series} period={period} />
            </div>
          </div>

          {summary.offices.length > 1 && (
            <div className="dash-card">
              <div className="card-title">Totals by office &mdash; all uploaded data</div>
              <OfficeBreakdownTable totals={summary.office_breakdown} />
            </div>
          )}

          <p className="dash-footnote">
            Aggregated totals only; no individual student records are shown. &ldquo;Students served&rdquo; adds up
            each week&rsquo;s count, so a student who visits every week is counted each week.
          </p>
        </div>
      )}
    </>
  );
}

function windowLabel(filters: DashboardFilters): string {
  if (!filters.start && !filters.end) return "all uploaded weeks";
  return `${filters.start ? formatFullDate(filters.start) : "start"} to ${filters.end ? formatFullDate(filters.end) : "now"}`;
}

function takeaway(summary: DashboardSummary, filters: DashboardFilters): string {
  const office = summary.offices.find((option) => option.id === filters.officeId)?.name ?? "all offices";
  if (summary.weeks.length === 0) return `No weeks match this filter for ${office}.`;
  const { visits, students_served, pounds_distributed } = summary.totals;
  return `${visits.toLocaleString()} visits served ${students_served.toLocaleString()} students and moved ${pounds_distributed.toLocaleString()} lb of food across ${office}, ${windowLabel(filters)}.`;
}

export default Dashboard;
