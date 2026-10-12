import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import Dashboard from "./Dashboard";
import type { ServiceUsageRow } from "../../types/serviceUsage";

const fixtureRows: ServiceUsageRow[] = [
  { office: "Retriever Essentials", week_start: "2026-01-05", visits: 100, students_served: 70, pounds_distributed: 1000 },
  { office: "Retriever Essentials", week_start: "2026-01-12", visits: 120, students_served: 80, pounds_distributed: 1200 },
  { office: "Emergency Aid Program", week_start: "2026-01-05", visits: 10, students_served: 8, pounds_distributed: 0 },
  { office: "Emergency Aid Program", week_start: "2026-01-12", visits: 15, students_served: 12, pounds_distributed: 0 },
];

function kpiValues(container: HTMLElement): string[] {
  return Array.from(container.querySelectorAll(".kpi-value")).map((el) => el.textContent ?? "");
}

describe("Dashboard", () => {
  it("shows totals across every office by default", () => {
    const { container } = render(<Dashboard rows={fixtureRows} />);
    expect(kpiValues(container)).toEqual(["245", "170", "2,200"]);
  });

  it("recalculates totals when the office filter changes", () => {
    const { container } = render(<Dashboard rows={fixtureRows} />);
    fireEvent.change(screen.getByLabelText("Office"), { target: { value: "Emergency Aid Program" } });
    expect(kpiValues(container)).toEqual(["25", "20", "0"]);
  });

  it("lists both offices in the full-period breakdown table", () => {
    render(<Dashboard rows={fixtureRows} />);
    const table = screen.getByRole("table");
    expect(table).toHaveTextContent("Retriever Essentials");
    expect(table).toHaveTextContent("Emergency Aid Program");
  });
});
