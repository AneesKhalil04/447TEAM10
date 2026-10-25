// Mirrors backend/app/schemas/dashboard.py.

export interface Totals {
  visits: number;
  students_served: number;
  pounds_distributed: number;
}

export interface WeeklyTotal extends Totals {
  week_start: string;
}

export interface OfficeTotal extends Totals {
  office_id: number;
  office: string;
}

export interface OfficeOption {
  id: number;
  name: string;
}

export interface DateRange {
  start: string;
  end: string;
}

export interface DashboardSummary {
  offices: OfficeOption[];
  data_range: DateRange | null;
  totals: Totals;
  weeks: WeeklyTotal[];
  previous_period: DateRange | null;
  previous_totals: Totals | null;
  office_breakdown: OfficeTotal[];
}
