import { fireEvent, render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import UploadAggregatedData from "./UploadAggregatedData";

const headers = "office,period_start,period_end,visits,students_served,pounds_distributed";
const exampleRow = "Retriever Essentials,2026-10-01,2026-10-07,100,70,1000";
const validCsv = `${headers}\n${exampleRow}`;

function selectFile(content: string, filename = "usage.csv") {
  fireEvent.change(screen.getByLabelText("Select a CSV file"), {
    target: { files: [new File([content], filename, { type: "text/csv" })] },
  });
}

describe("UploadAggregatedData", () => {
  it("shows the filename, total row count, and only the first five data rows", async () => {
    render(<UploadAggregatedData />);
    selectFile(`${headers}\n${Array.from({ length: 6 }, (_, i) =>
      `Office ${i + 1},2026-10-01,2026-10-07,100,70,1000`,
    ).join("\n")}`);
    expect(await screen.findByText(/Preview ready: usage.csv/)).toHaveTextContent("Total rows: 6");
    const table = screen.getByRole("table");
    expect(within(table).getAllByRole("row")).toHaveLength(6);
    expect(table).toHaveTextContent("Office 5");
    expect(table).not.toHaveTextContent("Office 6");
    expect(screen.getByText(/selecting a file does not send it/)).toBeInTheDocument();
  });

  it("rejects missing required columns", async () => {
    render(<UploadAggregatedData />);
    selectFile("office,visits\nRetriever Essentials,100");
    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Missing required columns: period_start, period_end, students_served, pounds_distributed",
    );
    expect(screen.queryByRole("table")).not.toBeInTheDocument();
  });

  it("rejects non-CSV files even when they contain CSV text", () => {
    render(<UploadAggregatedData />);
    selectFile(validCsv, "usage.xlsx");
    expect(screen.getByRole("alert")).toHaveTextContent("Please select a .csv file");
    expect(screen.queryByRole("table")).not.toBeInTheDocument();
  });

  it.each(["student_id", "student_name", "name", "email", "phone", "address", " Student Name ", "EMAIL"])(
    "rejects the personal-data header %s without displaying its values", async (header) => {
      render(<UploadAggregatedData />);
      selectFile(`${headers},${header}\n${exampleRow},PRIVATE VALUE`);
      expect(await screen.findByRole("alert")).toHaveTextContent("Remove personal-data columns");
      expect(screen.queryByText(/PRIVATE VALUE/)).not.toBeInTheDocument();
      expect(screen.queryByRole("table")).not.toBeInTheDocument();
    },
  );

  it("clears the file and preview, and allows selecting the same file again", async () => {
    render(<UploadAggregatedData />);
    selectFile(validCsv);
    await screen.findByRole("table");
    fireEvent.click(screen.getByRole("button", { name: "Clear" }));
    expect(screen.getByLabelText("Select a CSV file")).toHaveValue("");
    expect(screen.queryByRole("table")).not.toBeInTheDocument();
    expect(screen.queryByRole("status")).not.toBeInTheDocument();
    selectFile(validCsv);
    expect(await screen.findByRole("table")).toHaveTextContent("Retriever Essentials");
  });

  it("removes the previous preview when a replacement file is invalid and clears errors", async () => {
    render(<UploadAggregatedData />);
    selectFile(validCsv);
    await screen.findByRole("table");
    selectFile("office\nExample");
    await screen.findByRole("alert");
    expect(screen.queryByRole("table")).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Clear" }));
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });

  it("handles quoted commas, escaped quotes, multiline fields, BOM, and CRLF", async () => {
    render(<UploadAggregatedData />);
    selectFile(`\uFEFF${headers}\r\n"Office, ""Pantry""\nServices",2026-10-01,2026-10-07,100,70,1000\r\n\r\n`);
    expect(await screen.findByRole("table")).toHaveTextContent('Office, "Pantry" Services');
    expect(screen.getByRole("status")).toHaveTextContent("Total rows: 1");
  });

  it.each([
    [headers, "no data rows"],
    [`${headers}\n"Unclosed`, "invalid quoting"],
    [`${headers}\nOffice,2026-10-01`, "different number of fields"],
    [`${headers},office\n${exampleRow},Other`, "unique header"],
  ])("rejects malformed or empty CSV: %s", async (csv, message) => {
    render(<UploadAggregatedData />);
    selectFile(csv);
    expect(await screen.findByRole("alert")).toHaveTextContent(message);
  });

  it("downloads a reusable template with required headers and a marked example row", async () => {
    render(<UploadAggregatedData />);
    const link = screen.getByRole("link", { name: "Download Template" });
    expect(link).toHaveAttribute("download", "aggregated_data_template.csv");
    const csv = decodeURIComponent(link.getAttribute("href")!.split(",").slice(1).join(","));
    expect(csv.split("\r\n")[0]).toBe(headers);
    expect(csv).toContain("EXAMPLE ONLY - replace with your office");
    selectFile(csv, "aggregated_data_template.csv");
    expect(await screen.findByText(/Preview ready:/)).toHaveTextContent("Total rows: 1");
  });
});
