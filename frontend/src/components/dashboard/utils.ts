import type { ServiceUsageRow } from "../../types/serviceUsage";

export interface DashboardFilters {
  office: string | null;
  start: string | null;
  end: string | null;
}

export interface WeeklyTotal {
  week_start: string;
  visits: number;
  students_served: number;
  pounds_distributed: number;
}

export interface OfficeTotal {
  office: string;
  visits: number;
  students_served: number;
  pounds_distributed: number;
}

export function listOffices(rows: ServiceUsageRow[]): string[] {
  return Array.from(new Set(rows.map((row) => row.office))).sort();
}

export function filterRows(rows: ServiceUsageRow[], filters: DashboardFilters): ServiceUsageRow[] {
  return rows
    .filter((row) => !filters.office || row.office === filters.office)
    .filter((row) => !filters.start || row.week_start >= filters.start)
    .filter((row) => !filters.end || row.week_start <= filters.end)
    .slice()
    .sort((a, b) => a.week_start.localeCompare(b.week_start));
}

export function weeklyTotals(rows: ServiceUsageRow[]): WeeklyTotal[] {
  const byWeek = new Map<string, WeeklyTotal>();
  for (const row of rows) {
    const existing = byWeek.get(row.week_start);
    if (existing) {
      existing.visits += row.visits;
      existing.students_served += row.students_served;
      existing.pounds_distributed += row.pounds_distributed;
    } else {
      byWeek.set(row.week_start, { ...row });
    }
  }
  return Array.from(byWeek.values()).sort((a, b) => a.week_start.localeCompare(b.week_start));
}

export function officeTotals(rows: ServiceUsageRow[]): OfficeTotal[] {
  const byOffice = new Map<string, OfficeTotal>();
  for (const row of rows) {
    const existing = byOffice.get(row.office);
    if (existing) {
      existing.visits += row.visits;
      existing.students_served += row.students_served;
      existing.pounds_distributed += row.pounds_distributed;
    } else {
      byOffice.set(row.office, { ...row });
    }
  }
  return Array.from(byOffice.values()).sort((a, b) => b.visits - a.visits);
}

const DAY_MS = 24 * 60 * 60 * 1000;

/** Rows from the equal-length period immediately before the filtered range, for the same office, used for the "vs prior period" deltas. */
export function previousPeriodRows(
  allRows: ServiceUsageRow[],
  filteredRows: ServiceUsageRow[],
  office: string | null,
): ServiceUsageRow[] {
  if (filteredRows.length === 0) return [];
  const weeks = Array.from(new Set(filteredRows.map((row) => row.week_start))).sort();
  const firstWeek = new Date(`${weeks[0]}T00:00:00Z`);
  const lastWeek = new Date(`${weeks[weeks.length - 1]}T00:00:00Z`);
  const spanMs = lastWeek.getTime() - firstWeek.getTime() + 7 * DAY_MS;

  const priorEnd = new Date(firstWeek.getTime() - 7 * DAY_MS);
  const priorStart = new Date(priorEnd.getTime() - spanMs + 7 * DAY_MS);
  const toIso = (date: Date) => date.toISOString().slice(0, 10);

  return allRows
    .filter((row) => !office || row.office === office)
    .filter((row) => row.week_start >= toIso(priorStart) && row.week_start <= toIso(priorEnd));
}

export function sum(rows: ServiceUsageRow[], key: keyof Pick<ServiceUsageRow, "visits" | "students_served" | "pounds_distributed">): number {
  return rows.reduce((total, row) => total + row[key], 0);
}

export function formatWeekLabel(weekStart: string): string {
  const date = new Date(`${weekStart}T00:00:00Z`);
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "UTC" });
}

export function formatFullDate(weekStart: string): string {
  const date = new Date(`${weekStart}T00:00:00Z`);
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric", timeZone: "UTC" });
}
