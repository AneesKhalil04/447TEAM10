import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
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
    data_range: { start: "2026-01-05", end: "2026-01-12" },
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

function kpiValues(container: HTMLElement): string[] {
  return Array.from(container.querySelectorAll(".kpi-value")).map((el) => el.textContent ?? "");
}

describe("Dashboard", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("shows a loading message, then the totals from the API", async () => {
    const fetchSummary = vi.fn().mockResolvedValue(summary());
    const { container } = render(<Dashboard fetchSummary={fetchSummary} />);

    expect(screen.getByRole("status")).toHaveTextContent("Loading dashboard");
    await waitFor(() => expect(kpiValues(container)).toEqual(["245", "170", "2,200"]));
    expect(fetchSummary).toHaveBeenCalledWith({ officeId: null, start: null, end: null }, expect.any(AbortSignal));
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
    expect(fetchSummary).toHaveBeenLastCalledWith({ officeId: 1, start: null, end: null }, expect.any(AbortSignal));
    expect(screen.getByText(/across Emergency Aid Program/)).toBeInTheDocument();
  });

  it("shows the prior-period comparison when the API returns one", async () => {
    const fetchSummary = vi.fn().mockResolvedValue(
      summary({
        previous_period: { start: "2025-12-22", end: "2025-12-29" },
        previous_totals: { visits: 200, students_served: 170, pounds_distributed: 2200 },
      }),
    );
    render(<Dashboard fetchSummary={fetchSummary} />);
    expect(await screen.findByText("+45 (+23%) vs prior period")).toBeInTheDocument();
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
    render(<Dashboard fetchSummary={vi.fn().mockResolvedValue(empty)} />);
    expect(await screen.findByText(/No data has been uploaded yet\. Upload a weekly file/)).toBeInTheDocument();
    expect(screen.queryByRole("table")).not.toBeInTheDocument();
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

  it("says how the totals changed after an upload", async () => {
    const source = { id: 1, name: "Weekly service usage", office_id: 2, office: "Retriever Essentials" };
    vi.stubGlobal(
      "fetch",
      vi.fn<typeof fetch>((input) =>
        Promise.resolve(
          String(input).endsWith("/data-sources")
            ? new Response(JSON.stringify([source]), { status: 200 })
            : new Response(
                JSON.stringify({
                  upload_batch_id: 2,
                  filename: "week.csv",
                  data_source_id: 1,
                  office: "Retriever Essentials",
                  row_count: 1,
                  replaced_rows: 0,
                  first_week: "2026-01-19",
                  last_week: "2026-01-19",
                  uploaded_at: "2026-01-20T10:00:00Z",
                }),
                { status: 201 },
              ),
        ),
      ),
    );
    const fetchSummary = vi
      .fn()
      .mockResolvedValueOnce(summary())
      .mockResolvedValue(summary({ totals: { visits: 345, students_served: 170, pounds_distributed: 2700 } }));
    const { container } = render(<Dashboard fetchSummary={fetchSummary} />);

    fireEvent.click(await screen.findByRole("button", { name: "Upload data" }));
    await screen.findByText(/Uploading to/);
    fireEvent.change(screen.getByLabelText("File"), { target: { files: [new File(["x"], "week.csv")] } });
    fireEvent.click(screen.getByRole("button", { name: "Upload" }));

    expect(await screen.findByText(/Dashboard updated from your upload/)).toHaveTextContent(
      "Visits 245 → 345 (+100) · Pounds distributed 2,200 → 2,700 (+500)",
    );
    expect(kpiValues(container)).toEqual(["345", "170", "2,700"]);
  });
});
