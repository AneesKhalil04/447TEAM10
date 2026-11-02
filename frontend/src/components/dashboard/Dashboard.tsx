import { useEffect, useRef, useState } from "react";
import { fetchDashboardSummary, type DashboardFilters } from "../../api/dashboard";
import type { DashboardSummary, DateRange } from "../../types/dashboard";
import DashboardFiltersBar from "./DashboardFiltersBar";
import KpiCard from "./KpiCard";
import OfficeBreakdownTable from "./OfficeBreakdownTable";
import PoundsChart from "./PoundsChart";
import TrendChart from "./TrendChart";
import "./Dashboard.css";
import { formatFullDate, groupByMonth, shiftWeeks, type Period } from "./utils";

interface DashboardProps {
  fetchSummary?: (filters: DashboardFilters, signal?: AbortSignal) => Promise<DashboardSummary>;
  onGoToUpload?: () => void;
}

const EMPTY_FILTERS: DashboardFilters = { officeId: null, start: null, end: null };

/** A number of recent weeks, "all" uploaded weeks, or null once the user picks their own dates. */
type RangePreset = number | "all" | null;

const RANGE_OPTIONS: { preset: RangePreset; label: string }[] = [
  { preset: 4, label: "Last 4 weeks" },
  { preset: 12, label: "Last 12 weeks" },
  { preset: "all", label: "All time" },
];
const DEFAULT_PRESET = 12;

/**
 * Dates for a preset, counting back from the latest uploaded week (not today, so late uploads
 * still show) and never starting before the first uploaded week.
 */
function datesFor(preset: RangePreset, uploaded: DateRange): Pick<DashboardFilters, "start" | "end"> {
  if (typeof preset !== "number") return { start: null, end: null };
  const start = shiftWeeks(uploaded.end, 1 - preset);
  return { start: start < uploaded.start ? uploaded.start : start, end: uploaded.end };
}

function Dashboard({ fetchSummary = fetchDashboardSummary, onGoToUpload }: DashboardProps) {
  const [filters, setFilters] = useState<DashboardFilters>(EMPTY_FILTERS);
  const [preset, setPreset] = useState<RangePreset>(DEFAULT_PRESET);
  // The first request only learns the latest uploaded week; the default range is applied after it.
  const applyDefaultRange = useRef(true);
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
        if (applyDefaultRange.current) {
          applyDefaultRange.current = false;
          if (data.data_range) {
            setFilters((current) => ({ ...current, ...datesFor(DEFAULT_PRESET, data.data_range!) }));
            return; // the filter change fetches the default range
          }
        }
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
  const uploaded = summary?.data_range ?? null;
  const choosePreset = (next: RangePreset) => {
    setPreset(next);
    if (uploaded) setFilters((current) => ({ ...current, ...datesFor(next, uploaded) }));
  };
  const changeFilters = (next: DashboardFilters) => {
    // Typing a date makes it a custom range; changing only the office keeps the preset.
    if (next.start !== filters.start || next.end !== filters.end) setPreset(null);
    setFilters(next);
  };
  const comparedTo = typeof preset === "number" ? `previous ${preset} weeks` : undefined;
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
          <p className="dash-takeaway">{takeaway(summary, filters, preset)}</p>

          <div className="range-presets" role="group" aria-label="Date range">
            {RANGE_OPTIONS.map((option) => (
              <button
                key={option.label}
                type="button"
                aria-pressed={preset === option.preset}
                onClick={() => choosePreset(option.preset)}
              >
                {option.label}
              </button>
            ))}
          </div>

          <div className="dash-toolbar">
            <DashboardFiltersBar
              offices={summary.offices}
              filters={filters}
              minDate={summary.data_range.start}
              maxDate={summary.data_range.end}
              onChange={changeFilters}
              onReset={() => {
                setFilters({ ...EMPTY_FILTERS, ...(uploaded ? datesFor(DEFAULT_PRESET, uploaded) : {}) });
                setPreset(DEFAULT_PRESET);
              }}
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
              window={windowLabel(filters, preset)}
              comparedTo={comparedTo}
            />
            <KpiCard
              label="Students served"
              value={summary.totals.students_served}
              previousValue={summary.previous_totals?.students_served ?? null}
              comparedTo={comparedTo}
            />
            <KpiCard
              label="Pounds distributed"
              value={summary.totals.pounds_distributed}
              previousValue={summary.previous_totals?.pounds_distributed ?? null}
              comparedTo={comparedTo}
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

function datesLabel(filters: DashboardFilters): string {
  return `${filters.start ? formatFullDate(filters.start) : "start"} to ${filters.end ? formatFullDate(filters.end) : "now"}`;
}

function windowLabel(filters: DashboardFilters, preset: RangePreset): string {
  if (typeof preset === "number") return `last ${preset} weeks`;
  if (!filters.start && !filters.end) return "all uploaded weeks";
  return datesLabel(filters);
}

function takeaway(summary: DashboardSummary, filters: DashboardFilters, preset: RangePreset): string {
  const office = summary.offices.find((option) => option.id === filters.officeId)?.name ?? "all offices";
  if (summary.weeks.length === 0) return `No weeks match this filter for ${office}.`;
  const { visits, students_served, pounds_distributed } = summary.totals;
  const numbers = `${visits.toLocaleString()} visits served ${students_served.toLocaleString()} students and moved ${pounds_distributed.toLocaleString()} lb of food across ${office}`;
  if (typeof preset === "number") {
    const shortfall =
      summary.weeks.length < preset ? `; only ${summary.weeks.length} of those weeks have data so far` : "";
    return `In the last ${preset} weeks (${datesLabel(filters)}${shortfall}), ${numbers}.`;
  }
  return `${numbers}, ${windowLabel(filters, preset)}.`;
}

export default Dashboard;
