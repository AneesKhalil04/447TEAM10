import { useMemo, useState } from "react";
import { sampleServiceUsage } from "../../data/sampleServiceUsage";
import type { ServiceUsageRow } from "../../types/serviceUsage";
import type { UploadResponse } from "../../types/upload";
import DashboardFiltersBar from "./DashboardFiltersBar";
import KpiCard from "./KpiCard";
import OfficeBreakdownTable from "./OfficeBreakdownTable";
import PoundsChart from "./PoundsChart";
import TrendChart from "./TrendChart";
import UploadAggregatedData from "./UploadAggregatedData";
import "./Dashboard.css";
import {
  filterRows,
  formatFullDate,
  listOffices,
  officeTotals,
  previousPeriodRows,
  sum,
  weeklyTotals,
  type DashboardFilters,
} from "./utils";

interface DashboardProps {
  rows?: ServiceUsageRow[];
}

const EMPTY_FILTERS: DashboardFilters = { office: null, start: null, end: null };

function Dashboard({ rows: initialRows = sampleServiceUsage }: DashboardProps) {
  const [uploadedRows, setUploadedRows] = useState<ServiceUsageRow[] | null>(null);
  const [uploadKey, setUploadKey] = useState(0);
  const rows = uploadedRows ?? initialRows;
  const [filters, setFilters] = useState<DashboardFilters>(EMPTY_FILTERS);

  function loadDashboard(response: UploadResponse) {
    setUploadedRows(response.records.map((record) => ({
      office: record.office,
      week_start: record.period_start,
      visits: record.visits,
      students_served: record.students_served,
      pounds_distributed: record.pounds_distributed,
    })));
    setFilters(EMPTY_FILTERS);
  }

  function restoreSampleData() {
    setUploadedRows(null);
    setFilters(EMPTY_FILTERS);
    setUploadKey((key) => key + 1);
  }

  const offices = useMemo(() => listOffices(rows), [rows]);
  const sortedWeeks = useMemo(() => Array.from(new Set(rows.map((row) => row.week_start))).sort(), [rows]);
  const minDate = sortedWeeks[0] ?? "";
  const maxDate = sortedWeeks[sortedWeeks.length - 1] ?? "";

  const filtered = useMemo(() => filterRows(rows, filters), [rows, filters]);
  const trend = useMemo(() => weeklyTotals(filtered), [filtered]);
  const breakdown = useMemo(() => officeTotals(rows), [rows]);
  const previous = useMemo(() => previousPeriodRows(rows, filtered, filters.office), [rows, filtered, filters.office]);

  const visits = sum(filtered, "visits");
  const studentsServed = sum(filtered, "students_served");
  const poundsDistributed = sum(filtered, "pounds_distributed");

  const hasPrevious = previous.length > 0;
  const previousVisits = hasPrevious ? sum(previous, "visits") : null;
  const previousStudents = hasPrevious ? sum(previous, "students_served") : null;
  const previousPounds = hasPrevious ? sum(previous, "pounds_distributed") : null;

  const windowLabel =
    filters.start || filters.end
      ? `${filters.start ? formatFullDate(filters.start) : "start"} to ${filters.end ? formatFullDate(filters.end) : "now"}`
      : uploadedRows ? "full uploaded period" : "full sample period";
  const officeLabel = filters.office ?? "all offices";
  const takeaway = filtered.length
    ? `${visits.toLocaleString()} visits served ${studentsServed.toLocaleString()} students and moved ${poundsDistributed.toLocaleString()} lb of food across ${officeLabel}, ${windowLabel}.`
    : `No weeks match this filter for ${officeLabel}.`;

  return (
    <main className="dash-page">
      <header className="dash-header">
        <p className="dash-eyebrow">Dean of Students &middot; Basic Needs Impact</p>
        <h1>Retriever Essentials Impact Dashboard</h1>
        <p className="dash-takeaway">{takeaway}</p>
      </header>

      <UploadAggregatedData key={uploadKey} onLoad={loadDashboard} />
      {uploadedRows && (
        <div>
          <p>Dashboard source: accepted CSV data for this session only. Not saved to the database.</p>
          <p className="card-note">Charts and date filters use period start dates. Students served totals may count repeat students across periods or offices.</p>
          <button type="button" className="reset-button" onClick={restoreSampleData}>Restore Sample Data</button>
        </div>
      )}

      <DashboardFiltersBar
        offices={offices}
        filters={filters}
        minDate={minDate}
        maxDate={maxDate}
        onChange={setFilters}
        onReset={() => setFilters(EMPTY_FILTERS)}
      />

      <div className="dash-kpis">
        <KpiCard label="Visits" value={visits} previousValue={previousVisits} window={windowLabel} />
        <KpiCard label="Students served" value={studentsServed} previousValue={previousStudents} />
        <KpiCard label="Pounds distributed" value={poundsDistributed} previousValue={previousPounds} />
      </div>

      <div className="dash-grid">
        <div className="dash-card">
          <div className="card-title">Weekly visits &amp; students served</div>
          <div className="card-note">One point per calendar week, for the office and date range selected above.</div>
          <TrendChart data={trend} />
        </div>
        <div className="dash-card">
          <div className="card-title">Pounds distributed per week</div>
          <div className="card-note">Food pantry weight logged for the office and date range selected above.</div>
          <PoundsChart data={trend} />
        </div>
      </div>

      <div className="dash-card">
        <div className="card-title">Office breakdown &mdash; {uploadedRows ? "full uploaded period" : "full sample period"}</div>
        <div className="card-note">
          Totals across the {uploadedRows ? "accepted upload" : "whole sample"}, independent of the filters above, to compare offices. {!uploadedRows && <>Only Retriever
          Essentials is part of the current pilot; Emergency Aid Program is shown to illustrate how a second office
          looks once the data model is extended.</>}
        </div>
        <OfficeBreakdownTable totals={breakdown} />
      </div>

      <footer className="dash-footnote">
        {uploadedRows ? "Accepted CSV data is loaded for this session only and is not saved to the database. Login and role-based access control are not implemented." : <>Sample data for design review, generated to match the planned Service_Usage upload columns (office, week,
        visits, students served, pounds distributed). Select an aggregated CSV above to validate and load your
        own session data. Login and role-based access control are not implemented.</>}
      </footer>
    </main>
  );
}

export default Dashboard;
