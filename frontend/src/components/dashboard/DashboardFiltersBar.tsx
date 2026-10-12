import type { DashboardFilters } from "./utils";

interface DashboardFiltersBarProps {
  offices: string[];
  filters: DashboardFilters;
  minDate: string;
  maxDate: string;
  onChange: (filters: DashboardFilters) => void;
  onReset: () => void;
}

function DashboardFiltersBar({ offices, filters, minDate, maxDate, onChange, onReset }: DashboardFiltersBarProps) {
  return (
    <div className="dash-filters" role="group" aria-label="Filters">
      <div className="field">
        <label htmlFor="office-filter">Office</label>
        <select
          id="office-filter"
          value={filters.office ?? ""}
          onChange={(event) => onChange({ ...filters, office: event.target.value || null })}
        >
          <option value="">All offices</option>
          {offices.map((office) => (
            <option key={office} value={office}>
              {office}
            </option>
          ))}
        </select>
      </div>
      <div className="field">
        <label htmlFor="start-filter">From</label>
        <input
          id="start-filter"
          type="date"
          min={minDate}
          max={maxDate}
          value={filters.start ?? ""}
          onChange={(event) => onChange({ ...filters, start: event.target.value || null })}
        />
      </div>
      <div className="field">
        <label htmlFor="end-filter">To</label>
        <input
          id="end-filter"
          type="date"
          min={minDate}
          max={maxDate}
          value={filters.end ?? ""}
          onChange={(event) => onChange({ ...filters, end: event.target.value || null })}
        />
      </div>
      <button type="button" className="reset-button" onClick={onReset}>
        Reset filters
      </button>
    </div>
  );
}

export default DashboardFiltersBar;
