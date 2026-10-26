import { useEffect, useState } from "react";
import { fetchDashboardSummary, type DashboardFilters } from "../../api/dashboard";
import type { DashboardSummary } from "../../types/dashboard";
import DashboardFiltersBar from "./DashboardFiltersBar";
import KpiCard from "./KpiCard";
import OfficeBreakdownTable from "./OfficeBreakdownTable";
import PoundsChart from "./PoundsChart";
import TrendChart from "./TrendChart";
import UploadPanel from "../upload/UploadPanel";
import "./Dashboard.css";
import { formatFullDate } from "./utils";

interface DashboardProps {
  fetchSummary?: (filters: DashboardFilters, signal?: AbortSignal) => Promise<DashboardSummary>;
}

const EMPTY_FILTERS: DashboardFilters = { officeId: null, start: null, end: null };

function Dashboard({ fetchSummary = fetchDashboardSummary }: DashboardProps) {
  const [filters, setFilters] = useState<DashboardFilters>(EMPTY_FILTERS);
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);
  const [showUpload, setShowUpload] = useState(false);

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
  // With nothing uploaded yet, the upload form is the only useful thing on the page.
  const uploadOpen = showUpload || summary?.data_range === null;

  return (
    <main className="dash-page">
      <header className="dash-header">
        <p className="dash-eyebrow">Dean of Students &middot; Basic Needs Impact</p>
        <div className="dash-header-row">
          <h1>Retriever Essentials Impact Dashboard</h1>
          <button
            type="button"
            className="primary-button"
            aria-expanded={uploadOpen}
            onClick={() => setShowUpload((open) => !open)}
          >
            {uploadOpen ? "Close upload" : "Upload data"}
          </button>
        </div>
        {summary && <p className="dash-takeaway">{takeaway(summary, filters)}</p>}
      </header>

      {uploadOpen && <UploadPanel onUploaded={retry} />}

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

      {summary && (
        <div className="dash-body" aria-busy={loading}>
          <DashboardFiltersBar
            offices={summary.offices}
            filters={filters}
            minDate={summary.data_range?.start ?? ""}
            maxDate={summary.data_range?.end ?? ""}
            onChange={setFilters}
            onReset={() => setFilters(EMPTY_FILTERS)}
          />
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
              <div className="card-title">Weekly visits &amp; students served</div>
              <div className="card-note">One point per calendar week, for the office and date range selected above.</div>
              <TrendChart data={summary.weeks} />
            </div>
            <div className="dash-card">
              <div className="card-title">Pounds distributed per week</div>
              <div className="card-note">Food pantry weight logged for the office and date range selected above.</div>
              <PoundsChart data={summary.weeks} />
            </div>
          </div>

          <div className="dash-card">
            <div className="card-title">Office breakdown &mdash; all uploaded data</div>
            <div className="card-note">
              Totals across every upload, independent of the filters above, to compare offices.
            </div>
            {summary.office_breakdown.length > 0 ? (
              <OfficeBreakdownTable totals={summary.office_breakdown} />
            ) : (
              <p className="chart-empty">No data has been uploaded yet.</p>
            )}
          </div>
        </div>
      )}

      <footer className="dash-footnote">
        Figures are aggregated totals from uploaded weekly files; no individual student records are shown. Login and
        role-based access control are not part of this preview yet.
      </footer>
    </main>
  );
}

function windowLabel(filters: DashboardFilters): string {
  if (!filters.start && !filters.end) return "all uploaded weeks";
  return `${filters.start ? formatFullDate(filters.start) : "start"} to ${filters.end ? formatFullDate(filters.end) : "now"}`;
}

function takeaway(summary: DashboardSummary, filters: DashboardFilters): string {
  if (!summary.data_range) return "No data has been uploaded yet. Upload a weekly file to see totals here.";
  const office = summary.offices.find((option) => option.id === filters.officeId)?.name ?? "all offices";
  if (summary.weeks.length === 0) return `No weeks match this filter for ${office}.`;
  const { visits, students_served, pounds_distributed } = summary.totals;
  return `${visits.toLocaleString()} visits served ${students_served.toLocaleString()} students and moved ${pounds_distributed.toLocaleString()} lb of food across ${office}, ${windowLabel(filters)}.`;
}

export default Dashboard;
