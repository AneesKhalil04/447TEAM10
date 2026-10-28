import type { WeeklyTotal } from "../../types/dashboard";

export function formatWeekLabel(weekStart: string): string {
  const date = new Date(`${weekStart}T00:00:00Z`);
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "UTC" });
}

export function formatFullDate(weekStart: string): string {
  const date = new Date(`${weekStart}T00:00:00Z`);
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric", timeZone: "UTC" });
}

export type Period = "week" | "month";

/** Roll weekly totals up into calendar months, keyed by the first day of the month a week starts in. */
export function groupByMonth(weeks: WeeklyTotal[]): WeeklyTotal[] {
  const months = new Map<string, WeeklyTotal>();
  for (const week of weeks) {
    const key = `${week.week_start.slice(0, 7)}-01`;
    const month = months.get(key) ?? { week_start: key, visits: 0, students_served: 0, pounds_distributed: 0 };
    month.visits += week.visits;
    month.students_served += week.students_served;
    month.pounds_distributed = Math.round((month.pounds_distributed + week.pounds_distributed) * 100) / 100;
    months.set(key, month);
  }
  return [...months.values()].sort((a, b) => a.week_start.localeCompare(b.week_start));
}

export function formatPeriodTick(start: string, period: Period): string {
  if (period === "week") return formatWeekLabel(start);
  const date = new Date(`${start}T00:00:00Z`);
  return date.toLocaleDateString("en-US", { month: "short", year: "numeric", timeZone: "UTC" });
}

export function formatPeriodLabel(start: string, period: Period): string {
  if (period === "week") return `Week of ${formatFullDate(start)}`;
  const date = new Date(`${start}T00:00:00Z`);
  return date.toLocaleDateString("en-US", { month: "long", year: "numeric", timeZone: "UTC" });
}
