import { describe, expect, it } from "vitest";
import { formatPeriodLabel, formatPeriodTick, groupByMonth } from "./utils";

describe("groupByMonth", () => {
  it("adds up each month's weeks, by the month each week starts in", () => {
    const months = groupByMonth([
      { week_start: "2026-10-26", visits: 3, students_served: 2, pounds_distributed: 0.1 },
      { week_start: "2026-09-28", visits: 1, students_served: 1, pounds_distributed: 10 },
      { week_start: "2026-10-05", visits: 5, students_served: 4, pounds_distributed: 0.2 },
    ]);
    expect(months).toEqual([
      { week_start: "2026-09-01", visits: 1, students_served: 1, pounds_distributed: 10 },
      { week_start: "2026-10-01", visits: 8, students_served: 6, pounds_distributed: 0.3 },
    ]);
  });
});

describe("period labels", () => {
  it("names weeks by their start date and months by name", () => {
    expect(formatPeriodLabel("2026-10-12", "week")).toBe("Week of Oct 12, 2026");
    expect(formatPeriodLabel("2026-10-01", "month")).toBe("October 2026");
    expect(formatPeriodTick("2026-10-01", "month")).toBe("Oct 2026");
  });
});
