import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import type { DashboardFilters } from "../../api/dashboard";
import type { DashboardSummary } from "../../types/dashboard";
import Dashboard from "./Dashboard";

const offices = [
  { id: 1, name: "Emergency Aid Program" },
  { id: 2, name: "Retriever Essentials" },
];
const breakdown = [
  { office_id: 2, office: "Retriever Essentials", visits: 220, students_served: 150, pounds_distributed: 2200 },
  { office_id: 1, office: "Emergency Aid Program", visits: 25, students_served: 20, pounds_distributed: 0 },
];

function summary(overrides: Partial<DashboardSummary> = {}): DashboardSummary {
  return {
    offices,
    // Uploads go back further than the two weeks returned, so preset ranges are not clamped.
    data_range: { start: "2025-06-02", end: "2026-01-12" },
    totals: { visits: 245, students_served: 170, pounds_distributed: 2200 },
    weeks: [
      { week_start: "2026-01-05", visits: 110, students_served: 78, pounds_distributed: 1000 },
      { week_start: "2026-01-12", visits: 135, students_served: 92, pounds_distributed: 1200 },
    ],
    previous_period: null,
    previous_totals: null,
    office_breakdown: breakdown,
    ...overrides,
  };
}

// The latest week in summary() is 2026-01-12, so the default 12 weeks start 11 weeks earlier.
const LAST_12_WEEKS = { start: "2025-10-27", end: "2026-01-12" };

function kpiValues(container: HTMLElement): string[] {
  return Array.from(container.querySelectorAll(".kpi-value")).map((el) => el.textContent ?? "");
}

describe("Dashboard", () => {
  it("shows a loading message, then the totals from the API", async () => {
    const fetchSummary = vi.fn().mockResolvedValue(summary());
    const { container } = render(<Dashboard fetchSummary={fetchSummary} />);

    expect(screen.getByRole("status")).toHaveTextContent("Loading dashboard");
    await waitFor(() => expect(kpiValues(container)).toEqual(["245", "170", "2,200"]));
    expect(fetchSummary).toHaveBeenCalledWith({ officeId: null, start: null, end: null }, expect.any(AbortSignal));
  });

  it("opens on the last 12 uploaded weeks", async () => {
    const fetchSummary = vi.fn().mockResolvedValue(summary());
    render(<Dashboard fetchSummary={fetchSummary} />);

    expect(
      await screen.findByText(/^In the last 12 weeks \(Oct 27, 2025 to Jan 12, 2026; only 2 of those weeks have data/),
    ).toBeInTheDocument();
    expect(fetchSummary).toHaveBeenLastCalledWith({ officeId: null, ...LAST_12_WEEKS }, expect.any(AbortSignal));
    expect(screen.getByRole("button", { name: "Last 12 weeks" })).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByLabelText("From")).toHaveValue("2025-10-27");
    expect(screen.getByText("last 12 weeks")).toBeInTheDocument();
  });

  it("starts the range at the first uploaded week and says when fewer weeks have data", async () => {
    const fetchSummary = vi.fn().mockResolvedValue(summary({ data_range: { start: "2026-01-05", end: "2026-01-12" } }));
    render(<Dashboard fetchSummary={fetchSummary} />);

    expect(
      await screen.findByText(
        /^In the last 12 weeks \(Jan 5, 2026 to Jan 12, 2026; only 2 of those weeks have data so far\)/,
      ),
    ).toBeInTheDocument();
    expect(fetchSummary).toHaveBeenLastCalledWith(
      { officeId: null, start: "2026-01-05", end: "2026-01-12" },
      expect.any(AbortSignal),
    );
  });

  it("switches between the range buttons, custom dates and back", async () => {
    const fetchSummary = vi.fn().mockResolvedValue(summary());
    render(<Dashboard fetchSummary={fetchSummary} />);
    await screen.findByText(/^In the last 12 weeks/);

    fireEvent.click(screen.getByRole("button", { name: "Last 4 weeks" }));
    await waitFor(() =>
      expect(fetchSummary).toHaveBeenLastCalledWith(
        { officeId: null, start: "2025-12-22", end: "2026-01-12" },
        expect.any(AbortSignal),
      ),
    );

    fireEvent.click(screen.getByRole("button", { name: "All time" }));
    await waitFor(() =>
      expect(fetchSummary).toHaveBeenLastCalledWith({ officeId: null, start: null, end: null }, expect.any(AbortSignal)),
    );
    expect(await screen.findByText(/all uploaded weeks\.$/)).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText("From"), { target: { value: "2026-01-05" } });
    for (const name of ["Last 4 weeks", "Last 12 weeks", "All time"]) {
      expect(screen.getByRole("button", { name })).toHaveAttribute("aria-pressed", "false");
    }

    fireEvent.click(screen.getByRole("button", { name: "Reset filters" }));
    expect(screen.getByRole("button", { name: "Last 12 weeks" })).toHaveAttribute("aria-pressed", "true");
    await waitFor(() =>
      expect(fetchSummary).toHaveBeenLastCalledWith({ officeId: null, ...LAST_12_WEEKS }, expect.any(AbortSignal)),
    );
  });

  it("asks the API again when the office filter changes", async () => {
    const fetchSummary = vi.fn((filters: DashboardFilters) =>
      Promise.resolve(
        filters.officeId === 1
          ? summary({ totals: { visits: 25, students_served: 20, pounds_distributed: 0 } })
          : summary(),
      ),
    );
    const { container } = render(<Dashboard fetchSummary={fetchSummary} />);
    await screen.findByLabelText("Office");

    fireEvent.change(screen.getByLabelText("Office"), { target: { value: "1" } });
    await waitFor(() => expect(kpiValues(container)).toEqual(["25", "20", "0"]));
    // Changing the office keeps the date range.
    expect(fetchSummary).toHaveBeenLastCalledWith({ officeId: 1, ...LAST_12_WEEKS }, expect.any(AbortSignal));
    expect(screen.getByText(/across Emergency Aid Program/)).toBeInTheDocument();
  });

  it("compares against the previous 12 weeks when the API returns them", async () => {
    const fetchSummary = vi.fn().mockResolvedValue(
      summary({
        previous_period: { start: "2025-12-22", end: "2025-12-29" },
        previous_totals: { visits: 200, students_served: 170, pounds_distributed: 2200 },
      }),
    );
    render(<Dashboard fetchSummary={fetchSummary} />);
    expect(await screen.findByText("+45 (+23%) vs previous 12 weeks")).toBeInTheDocument();
  });

  it("lists every office in the breakdown table", async () => {
    render(<Dashboard fetchSummary={vi.fn().mockResolvedValue(summary())} />);
    const table = await screen.findByRole("table");
    expect(table).toHaveTextContent("Retriever Essentials");
    expect(table).toHaveTextContent("Emergency Aid Program");
  });

  it("explains when nothing has been uploaded yet", async () => {
    const empty = summary({
      data_range: null,
      totals: { visits: 0, students_served: 0, pounds_distributed: 0 },
      weeks: [],
      office_breakdown: [],
    });
    const onGoToUpload = vi.fn();
    render(<Dashboard fetchSummary={vi.fn().mockResolvedValue(empty)} onGoToUpload={onGoToUpload} />);
    expect(await screen.findByText("No data yet")).toBeInTheDocument();
    expect(screen.queryByRole("table")).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Go to Upload data" }));
    expect(onGoToUpload).toHaveBeenCalled();
  });

  it("shows the error and recovers when the user retries", async () => {
    const fetchSummary = vi
      .fn()
      .mockRejectedValueOnce(new Error("Could not reach the server. Check that the API is running."))
      .mockResolvedValue(summary());
    const { container } = render(<Dashboard fetchSummary={fetchSummary} />);

    expect(await screen.findByRole("alert")).toHaveTextContent("Could not reach the server");
    fireEvent.click(screen.getByRole("button", { name: "Try again" }));
    await waitFor(() => expect(kpiValues(container)).toEqual(["245", "170", "2,200"]));
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });

  it("switches the charts between weekly and monthly", async () => {
    render(<Dashboard fetchSummary={vi.fn().mockResolvedValue(summary())} />);
    expect(await screen.findByText("Visits & students served per week")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Weekly" })).toHaveAttribute("aria-pressed", "true");

    fireEvent.click(screen.getByRole("button", { name: "Monthly" }));
    expect(screen.getByText("Pounds of food distributed per month")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Monthly" })).toHaveAttribute("aria-pressed", "true");
  });
});
