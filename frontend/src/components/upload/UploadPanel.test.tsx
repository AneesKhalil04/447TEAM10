import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import type { DataSource, UploadOutcome } from "../../types/upload";
import UploadPanel from "./UploadPanel";

const sources: DataSource[] = [{ id: 1, name: "Weekly service usage", office_id: 1, office: "Retriever Essentials" }];
const csv = new File(["office,week_start,visits,students_served,pounds_distributed\n"], "week.csv", {
  type: "text/csv",
});

async function renderPanel(sendFile: (file: File, id: number, replace?: boolean) => Promise<UploadOutcome>) {
  const onUploaded = vi.fn();
  render(<UploadPanel onUploaded={onUploaded} loadDataSources={() => Promise.resolve(sources)} sendFile={sendFile} />);
  await screen.findByText("Retriever Essentials");
  fireEvent.change(screen.getByLabelText("File"), { target: { files: [csv] } });
  fireEvent.click(screen.getByRole("button", { name: "Upload" }));
  return onUploaded;
}

describe("UploadPanel", () => {
  it("keeps Upload disabled until a file is chosen", async () => {
    render(<UploadPanel onUploaded={vi.fn()} loadDataSources={() => Promise.resolve(sources)} sendFile={vi.fn()} />);
    await screen.findByText("Retriever Essentials");
    expect(screen.getByRole("button", { name: "Upload" })).toBeDisabled();
  });

  it("reports a saved upload and refreshes the dashboard", async () => {
    const sendFile = vi.fn().mockResolvedValue({
      kind: "saved",
      result: {
        upload_batch_id: 3,
        filename: "week.csv",
        data_source_id: 1,
        office: "Retriever Essentials",
        row_count: 3,
        replaced_rows: 0,
        first_week: "2026-10-12",
        last_week: "2026-10-26",
        uploaded_at: "2026-10-26T16:00:00Z",
      },
    });
    const onUploaded = await renderPanel(sendFile);

    expect(await screen.findByText(/Saved 3 weeks from/)).toBeInTheDocument();
    expect(sendFile).toHaveBeenCalledWith(csv, 1, false);
    expect(onUploaded).toHaveBeenCalledTimes(1);
  });

  it("lists every row error and saves nothing", async () => {
    const onUploaded = await renderPanel(() =>
      Promise.resolve({
        kind: "invalid",
        message: "Nothing was saved. Fix the 2 problem(s) below and upload again.",
        errors: [
          { row: 3, column: "week_start", message: "'2026-13-09' is not a date." },
          { row: 4, column: "visits", message: "Cannot be negative." },
        ],
      }),
    );

    expect(await screen.findByText(/Nothing was saved/)).toBeInTheDocument();
    expect(screen.getByText("Cannot be negative.")).toBeInTheDocument();
    expect(screen.getAllByRole("row")).toHaveLength(3);
    expect(onUploaded).not.toHaveBeenCalled();
  });

  it("asks before replacing weeks that were already uploaded", async () => {
    const sendFile = vi
      .fn()
      .mockResolvedValueOnce({
        kind: "conflict",
        message: "Some of these weeks were already uploaded.",
        conflicts: [
          {
            upload_batch_id: 3,
            filename: "earlier.csv",
            uploaded_at: "2026-10-26T16:00:00Z",
            service: null,
            weeks: ["2026-10-26"],
          },
        ],
      })
      .mockResolvedValueOnce({
        kind: "saved",
        result: {
          upload_batch_id: 4,
          filename: "week.csv",
          data_source_id: 1,
          office: "Retriever Essentials",
          row_count: 1,
          replaced_rows: 1,
          first_week: "2026-10-26",
          last_week: "2026-10-26",
          uploaded_at: "2026-10-26T16:05:00Z",
        },
      });
    const onUploaded = await renderPanel(sendFile);

    expect(await screen.findByText(/already uploaded some of these weeks/)).toBeInTheDocument();
    expect(screen.getByText("earlier.csv")).toBeInTheDocument();
    expect(onUploaded).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole("button", { name: "Replace these weeks" }));
    expect(await screen.findByText(/replacing 1 earlier week/)).toBeInTheDocument();
    expect(sendFile).toHaveBeenLastCalledWith(csv, 1, true);
    expect(onUploaded).toHaveBeenCalledTimes(1);
  });

  it("shows an error when the server rejects the file", async () => {
    await renderPanel(() => Promise.reject(new Error("Upload a .csv or .xlsx file.")));
    expect(await screen.findByRole("alert")).toHaveTextContent("Upload a .csv or .xlsx file.");
  });
});
