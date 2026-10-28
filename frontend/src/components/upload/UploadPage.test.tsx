import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import type { UploadHistoryItem } from "../../types/upload";
import UploadPage from "./UploadPage";

const source = { id: 1, name: "Weekly service usage", office_id: 1, office: "Retriever Essentials" };
const firstUpload: UploadHistoryItem = {
  upload_batch_id: 1,
  filename: "upload_sample.csv",
  office: "Retriever Essentials",
  uploaded_at: "2026-10-26T16:00:00Z",
  row_count: 52,
  weeks_kept: 51,
  first_week: "2025-10-13",
  last_week: "2026-10-05",
};
const secondUpload: UploadHistoryItem = {
  ...firstUpload,
  upload_batch_id: 2,
  filename: "october.csv",
  row_count: 3,
  weeks_kept: 3,
  first_week: "2026-10-12",
  last_week: "2026-10-26",
};

describe("UploadPage", () => {
  it("explains weekly and monthly uploads and lists earlier files", async () => {
    render(
      <UploadPage
        loadTotals={() => Promise.resolve({ visits: 1, students_served: 1, pounds_distributed: 1 })}
        loadHistory={() => Promise.resolve([firstUpload])}
        loadDataSources={() => Promise.resolve([source])}
        sendFile={vi.fn()}
      />,
    );
    expect(screen.getByText(/once a month/)).toBeInTheDocument();
    expect(await screen.findByText("upload_sample.csv")).toBeInTheDocument();
    expect(screen.getByText(/of 52 \(rest replaced\)/)).toBeInTheDocument();
  });

  it("shows how the totals moved and refreshes the history after a save", async () => {
    const loadTotals = vi
      .fn()
      .mockResolvedValueOnce({ visits: 8325, students_served: 5469, pounds_distributed: 109811 })
      .mockResolvedValue({ visits: 9114, students_served: 5981, pounds_distributed: 109811 });
    const loadHistory = vi.fn().mockResolvedValueOnce([firstUpload]).mockResolvedValue([secondUpload, firstUpload]);
    const onViewDashboard = vi.fn();
    render(
      <UploadPage
        onViewDashboard={onViewDashboard}
        loadTotals={loadTotals}
        loadHistory={loadHistory}
        loadDataSources={() => Promise.resolve([source])}
        sendFile={() =>
          Promise.resolve({
            kind: "saved",
            result: {
              upload_batch_id: 2,
              filename: "october.csv",
              data_source_id: 1,
              office: "Retriever Essentials",
              row_count: 3,
              replaced_rows: 0,
              first_week: "2026-10-12",
              last_week: "2026-10-26",
              uploaded_at: "2026-10-26T17:00:00Z",
            },
          })
        }
      />,
    );
    await screen.findByText("upload_sample.csv");
    fireEvent.change(screen.getByLabelText("File"), { target: { files: [new File(["x"], "october.csv")] } });
    fireEvent.click(screen.getByRole("button", { name: "Upload" }));

    expect(await screen.findByText(/Dashboard totals updated/)).toHaveTextContent(
      "Visits 8,325 → 9,114 (+789) · Students served 5,469 → 5,981 (+512)",
    );
    expect(await screen.findByRole("cell", { name: "october.csv" })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "View dashboard" }));
    expect(onViewDashboard).toHaveBeenCalled();
  });
});
