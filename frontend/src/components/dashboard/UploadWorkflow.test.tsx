import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import Dashboard from "./Dashboard";

const csv = "office,period_start,period_end,visits,students_served,pounds_distributed\nCampus Pantry,2026-10-05,2026-10-11,12,8,90";
const accepted = {
  row_count: 2,
  records: [
    { office: "Campus Pantry", period_start: "2026-10-05", period_end: "2026-10-11", visits: 12, students_served: 8, pounds_distributed: 90 },
    { office: "Campus Aid", period_start: "2026-10-12", period_end: "2026-10-18", visits: 3, students_served: 2, pounds_distributed: 0 },
  ],
};

async function selectAndSubmit() {
  const file = new File([csv], "usage.csv", { type: "text/csv" });
  fireEvent.change(screen.getByLabelText("Select a CSV file"), { target: { files: [file] } });
  fireEvent.click(await screen.findByRole("button", { name: "Validate and Load Dashboard" }));
  return file;
}

function totals(container: HTMLElement) {
  return Array.from(container.querySelectorAll(".kpi-value")).map((node) => node.textContent);
}

afterEach(() => vi.unstubAllGlobals());

describe("CSV server validation workflow", () => {
  it("sends the original file as FormData and updates all dashboard views, then restores samples", async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, json: async () => accepted });
    vi.stubGlobal("fetch", fetchMock);
    const { container } = render(<Dashboard />);
    const originalTotals = totals(container);
    fireEvent.change(screen.getByLabelText("Office"), { target: { value: "Retriever Essentials" } });
    const file = await selectAndSubmit();
    await screen.findByRole("button", { name: "Restore Sample Data" });
    const [url, options] = fetchMock.mock.calls[0];
    expect(url).toBe("http://localhost:8000/api/uploads/validate");
    expect(options.method).toBe("POST");
    expect(options.body).toBeInstanceOf(FormData);
    expect(options.body.get("file")).toBe(file);
    expect(options.headers).toBeUndefined();
    expect(totals(container)).toEqual(["15", "10", "90"]);
    expect(screen.getByLabelText("Office")).toHaveValue("");
    expect(within(screen.getByLabelText("Office")).getByRole("option", { name: "Campus Aid" })).toBeInTheDocument();
    expect(screen.getByLabelText("From")).toHaveAttribute("min", "2026-10-05");
    expect(screen.getByLabelText("To")).toHaveAttribute("max", "2026-10-12");
    const officeTable = screen.getAllByRole("table").find((table) => !table.querySelector("caption"))!;
    expect(officeTable).toHaveTextContent("Campus Pantry");
    expect(officeTable).not.toHaveTextContent("Emergency Aid Program");
    expect(screen.getByText(/Dashboard source: accepted CSV/)).toHaveTextContent("Not saved to the database");
    fireEvent.change(screen.getByLabelText("Office"), { target: { value: "Campus Aid" } });
    expect(totals(container)).toEqual(["3", "2", "0"]);
    fireEvent.click(screen.getByRole("button", { name: "Restore Sample Data" }));
    expect(totals(container)).toEqual(originalTotals);
    expect(screen.getByLabelText("Office")).toHaveValue("");
    expect(screen.queryByText(/Preview ready:/)).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Restore Sample Data" })).not.toBeInTheDocument();
  });

  it("shows backend row errors without replacing dashboard data", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({
      ok: false, json: async () => ({ errors: [{ row: 2, message: "visits must be a non-negative integer." }] }),
    }));
    const { container } = render(<Dashboard />);
    const before = totals(container);
    await selectAndSubmit();
    expect(await screen.findByRole("alert")).toHaveTextContent("CSV row 2: visits must be a non-negative integer.");
    expect(totals(container)).toEqual(before);
    expect(screen.queryByRole("button", { name: "Restore Sample Data" })).not.toBeInTheDocument();
  });

  it("shows a network failure without changing the dashboard", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new TypeError("Failed to fetch")));
    const { container } = render(<Dashboard />);
    const before = totals(container);
    await selectAndSubmit();
    expect(await screen.findByRole("alert")).toHaveTextContent("Check that the backend is running");
    expect(totals(container)).toEqual(before);
  });

  it("shows loading and prevents duplicate submissions until the response arrives", async () => {
    let resolve!: (value: unknown) => void;
    const pending = new Promise((done) => { resolve = done; });
    const fetchMock = vi.fn().mockReturnValue(pending);
    vi.stubGlobal("fetch", fetchMock);
    render(<Dashboard />);
    await selectAndSubmit();
    expect(screen.getByText("Validating with the backend…")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Validating…" })).toBeDisabled();
    expect(fetchMock).toHaveBeenCalledTimes(1);
    resolve({ ok: true, json: async () => accepted });
    await screen.findByRole("button", { name: "Restore Sample Data" });
    await waitFor(() => expect(screen.queryByText("Validating with the backend…")).not.toBeInTheDocument());
  });

  it("ignores an in-flight response after Clear", async () => {
    let resolve!: (value: unknown) => void;
    vi.stubGlobal("fetch", vi.fn().mockReturnValue(new Promise((done) => { resolve = done; })));
    const { container } = render(<Dashboard />);
    const before = totals(container);
    await selectAndSubmit();
    fireEvent.click(screen.getByRole("button", { name: "Clear" }));
    resolve({ ok: true, json: async () => accepted });
    await waitFor(() => expect(screen.queryByText("Validating with the backend…")).not.toBeInTheDocument());
    expect(totals(container)).toEqual(before);
    expect(screen.queryByRole("button", { name: "Restore Sample Data" })).not.toBeInTheDocument();
  });
});
