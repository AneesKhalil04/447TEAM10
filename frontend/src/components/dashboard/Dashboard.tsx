import { useMemo, useState } from "react";
import { sampleServiceUsage } from "../../data/sampleServiceUsage";
import type { ServiceUsageRow } from "../../types/serviceUsage";
import DashboardFiltersBar from "./DashboardFiltersBar";
import KpiCard from "./KpiCard";
import OfficeBreakdownTable from "./OfficeBreakdownTable";
import PoundsChart from "./PoundsChart";
import TrendChart from "./TrendChart";
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

function Dashboard({ rows = sampleServiceUsage }: DashboardProps) {
  const [filters, setFilters] = useState<DashboardFilters>(EMPTY_FILTERS);

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
      : "full sample period";
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
        <div className="card-title">Office breakdown &mdash; full sample period</div>
        <div className="card-note">
          Totals across the whole sample, independent of the filters above, to compare offices. Only Retriever
          Essentials is part of the current pilot; Emergency Aid Program is shown to illustrate how a second office
          looks once the data model is extended.
        </div>
        <OfficeBreakdownTable totals={breakdown} />
      </div>

      <footer className="dash-footnote">
        Sample data for design review, generated to match the planned Service_Usage upload columns (office, week,
        visits, students served, pounds distributed). It is not connected to a real office upload yet, and the
        login and role-based access control screens are not part of this preview.
      </footer>
    </main>
  );
}

export default Dashboard;
