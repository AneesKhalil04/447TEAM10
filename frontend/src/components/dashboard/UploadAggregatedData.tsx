import { useEffect, useRef, useState } from "react";
import type { UploadResponse } from "../../types/upload";
import { REQUIRED_COLUMNS, TEMPLATE_CSV, validateCsv, type CsvPreview } from "./uploadCsv";

interface UploadProps {
  onLoad?: (response: UploadResponse) => void;
}

const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL || "http://localhost:8000").replace(/\/$/, "");

function UploadAggregatedData({ onLoad }: UploadProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const readerRef = useRef<FileReader | null>(null);
  const [preview, setPreview] = useState<(CsvPreview & { filename: string }) | null>(null);
  const [error, setError] = useState("");
  const [reading, setReading] = useState(false);
  const fileRef = useRef<File | null>(null);
  const requestRef = useRef<AbortController | null>(null);
  const [loading, setLoading] = useState(false);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => () => {
    readerRef.current?.abort();
    requestRef.current?.abort();
  }, []);

  function clear() {
    requestRef.current?.abort();
    requestRef.current = null;
    fileRef.current = null;
    setLoading(false);
    setLoaded(false);
    readerRef.current?.abort();
    readerRef.current = null;
    setPreview(null);
    setError("");
    setReading(false);
    if (inputRef.current) inputRef.current.value = "";
  }

  function selectFile(file: File | undefined) {
    clear();
    if (!file) return;
    if (!/\.csv$/i.test(file.name)) {
      setError("Please select a .csv file. Excel files must be exported as CSV first.");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setError("The CSV must be 5 MB or smaller.");
      return;
    }
    setReading(true);
    const reader = new FileReader();
    readerRef.current = reader;
    reader.onload = () => {
      if (readerRef.current !== reader) return;
      setReading(false);
      try {
        setPreview({ ...validateCsv(String(reader.result)), filename: file.name });
        fileRef.current = file;
      } catch (cause) {
        setError(cause instanceof Error ? cause.message : "Unable to preview this CSV.");
      }
    };
    reader.onerror = () => {
      if (readerRef.current !== reader) return;
      setReading(false);
      setError("This file could not be read. Please select it again.");
    };
    reader.readAsText(file);
  }

  async function validateAndLoad() {
    if (!fileRef.current || loading) return;
    const controller = new AbortController();
    requestRef.current = controller;
    const body = new FormData();
    body.append("file", fileRef.current);
    setLoading(true);
    setLoaded(false);
    setError("");
    try {
      const response = await fetch(`${API_BASE_URL}/api/uploads/validate`, {
        method: "POST", body, signal: controller.signal,
      });
      const result = await response.json();
      if (controller.signal.aborted) return;
      if (!response.ok) {
        const errors = result.errors as { row: number | null; message: string }[] | undefined;
        setError(errors?.map((item) => `${item.row ? `CSV row ${item.row}: ` : ""}${item.message}`).join("\n")
          || "The server could not validate this CSV. Please check the file and try again.");
        return;
      }
      const accepted = result as UploadResponse;
      if (!Array.isArray(accepted.records) || accepted.row_count !== accepted.records.length || !accepted.row_count) {
        throw new Error("Unexpected server response");
      }
      onLoad?.(accepted);
      setLoaded(true);
    } catch {
      if (!controller.signal.aborted) {
        setError("Unable to validate the file. Check that the backend is running and try again. Dashboard data has not changed.");
      }
    } finally {
      if (requestRef.current === controller) {
        requestRef.current = null;
        setLoading(false);
      }
    }
  }

  return (
    <section className="dash-card upload-section" aria-labelledby="upload-heading">
      <h2 id="upload-heading" className="card-title">Upload Aggregated Data</h2>
      <p id="upload-help" className="card-note">
        Preview before submission: selecting a file does not send it or change the dashboard.
        Choose Validate and Load Dashboard to send it to the backend for validation.
        Accepted data is loaded only for the current session and is not saved to the database.
        Select aggregated data only, without personal information. CSV only, maximum 5 MB.
      </p>
      <p className="card-note">Required columns: {REQUIRED_COLUMNS.join(", ")}.</p>
      <div className="upload-actions">
        <label htmlFor="aggregated-csv">Select a CSV file</label>
        <input
          ref={inputRef}
          id="aggregated-csv"
          type="file"
          accept=".csv,text/csv"
          aria-describedby="upload-help"
          onChange={(event) => selectFile(event.target.files?.[0])}
        />
        <a
          className="reset-button upload-template"
          href={`data:text/csv;charset=utf-8,${encodeURIComponent(TEMPLATE_CSV)}`}
          download="aggregated_data_template.csv"
        >Download Template</a>
        <button type="button" className="reset-button" onClick={clear}>Clear</button>
      </div>
      {reading && <p role="status">Reading CSV…</p>}
      {loading && <p role="status">Validating with the backend…</p>}
      {loaded && <p role="status">Accepted data loaded for this session only. Not saved to the database.</p>}
      {error && <p role="alert" className="upload-error">{error}</p>}
      {preview && (
        <div>
          <p role="status">Preview ready: {preview.filename} — Total rows: {preview.rowCount}</p>
          <button type="button" className="reset-button" disabled={loading} onClick={validateAndLoad}>
            {loading ? "Validating…" : "Validate and Load Dashboard"}
          </button>
          <div className="upload-preview-scroll" tabIndex={0} role="region" aria-label="CSV preview">
            <table className="office-table">
              <caption>Preview before submission — first {preview.rows.length} data rows (up to five)</caption>
              <thead><tr>{preview.headers.map((header) => <th scope="col" key={header}>{header}</th>)}</tr></thead>
              <tbody>{preview.rows.map((row, index) => (
                <tr key={index}>{row.map((value, column) => <td key={column}>{value}</td>)}</tr>
              ))}</tbody>
            </table>
          </div>
        </div>
      )}
    </section>
  );
}

export default UploadAggregatedData;
