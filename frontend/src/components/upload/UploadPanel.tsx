import { useEffect, useRef, useState, type FormEvent } from "react";
import { fetchDataSources, uploadFile } from "../../api/uploads";
import type { DataSource, UploadOutcome } from "../../types/upload";
import { formatFullDate } from "../dashboard/utils";
import "./UploadPanel.css";

interface UploadPanelProps {
  onUploaded: () => void;
  loadDataSources?: (signal?: AbortSignal) => Promise<DataSource[]>;
  sendFile?: (file: File, dataSourceId: number, replace?: boolean) => Promise<UploadOutcome>;
}

function UploadPanel({ onUploaded, loadDataSources = fetchDataSources, sendFile = uploadFile }: UploadPanelProps) {
  const [sources, setSources] = useState<DataSource[]>([]);
  const [sourceId, setSourceId] = useState<number | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [outcome, setOutcome] = useState<UploadOutcome | null>(null);
  const [error, setError] = useState<string | null>(null);
  const fileInput = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const controller = new AbortController();
    loadDataSources(controller.signal)
      .then((list) => {
        setSources(list);
        setSourceId(list[0]?.id ?? null);
      })
      .catch((reason: unknown) => {
        if (!controller.signal.aborted) setError(reason instanceof Error ? reason.message : "Something went wrong.");
      });
    return () => controller.abort();
  }, [loadDataSources]);

  const send = async (replace: boolean) => {
    if (!file || sourceId === null) return;
    setBusy(true);
    setError(null);
    try {
      const next = await sendFile(file, sourceId, replace);
      setOutcome(next);
      if (next.kind === "saved") {
        setFile(null);
        if (fileInput.current) fileInput.current.value = "";
        onUploaded();
      }
    } catch (reason) {
      setOutcome(null);
      setError(reason instanceof Error ? reason.message : "Something went wrong.");
    } finally {
      setBusy(false);
    }
  };

  const submit = (event: FormEvent) => {
    event.preventDefault();
    void send(false);
  };

  return (
    <section className="dash-card upload-panel" aria-labelledby="upload-title">
      <div className="card-title" id="upload-title">
        Upload a file
      </div>
      <div className="card-note">CSV or Excel (.xlsx), up to 5 MB. If any row has a problem, nothing is saved.</div>

      <form className="upload-form" onSubmit={submit}>
        {sources.length > 1 && (
          <div className="field">
            <label htmlFor="upload-source">Data source</label>
            <select id="upload-source" value={sourceId ?? ""} onChange={(e) => setSourceId(Number(e.target.value))}>
              {sources.map((source) => (
                <option key={source.id} value={source.id}>
                  {source.office} &middot; {source.name}
                </option>
              ))}
            </select>
          </div>
        )}
        {sources.length === 1 && (
          <p className="upload-source-name">
            Uploading to <strong>{sources[0].office}</strong> &middot; {sources[0].name}
          </p>
        )}
        <div className="field">
          <label htmlFor="upload-file">File</label>
          <input
            id="upload-file"
            ref={fileInput}
            type="file"
            accept=".csv,.xlsx"
            onChange={(e) => {
              setFile(e.target.files?.[0] ?? null);
              setOutcome(null);
              setError(null);
            }}
          />
        </div>
        <button type="submit" className="primary-button" disabled={!file || sourceId === null || busy}>
          {busy ? "Uploading…" : "Upload"}
        </button>
      </form>

      {error && (
        <div className="dash-alert" role="alert">
          {error}
        </div>
      )}

      {outcome?.kind === "saved" && (
        <div className="upload-result upload-success" role="status">
          Saved {outcome.result.row_count} week{outcome.result.row_count === 1 ? "" : "s"} from{" "}
          <strong>{outcome.result.filename}</strong> ({formatFullDate(outcome.result.first_week)} to{" "}
          {formatFullDate(outcome.result.last_week)})
          {outcome.result.replaced_rows > 0 && `, replacing ${outcome.result.replaced_rows} earlier week(s)`}.
        </div>
      )}

      {outcome?.kind === "invalid" && (
        <div className="upload-result" role="alert">
          <p className="upload-result-title">{outcome.message}</p>
          <table className="office-table upload-errors">
            <thead>
              <tr>
                <th className="num">Row</th>
                <th>Column</th>
                <th>Problem</th>
              </tr>
            </thead>
            <tbody>
              {outcome.errors.map((rowError, index) => (
                <tr key={index}>
                  <td className="num">{rowError.row}</td>
                  <td>{rowError.column ?? "—"}</td>
                  <td>{rowError.message}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {outcome?.kind === "conflict" && (
        <div className="upload-result" role="alert">
          <p className="upload-result-title">You already uploaded some of these weeks. Replace them?</p>
          <ul className="upload-conflicts">
            {outcome.conflicts.map((conflict) => (
              <li key={`${conflict.upload_batch_id}-${conflict.service ?? ""}`}>
                {conflict.weeks.map(formatFullDate).join(", ")} from <strong>{conflict.filename}</strong>
                {conflict.service && ` (${conflict.service})`}
              </li>
            ))}
          </ul>
          <p className="card-note">Only these weeks are replaced. Other weeks from earlier uploads are kept.</p>
          <div className="upload-actions">
            <button type="button" className="primary-button" disabled={busy} onClick={() => void send(true)}>
              {busy ? "Replacing…" : "Replace these weeks"}
            </button>
            <button type="button" className="reset-button" disabled={busy} onClick={() => setOutcome(null)}>
              Cancel
            </button>
          </div>
        </div>
      )}
    </section>
  );
}

export default UploadPanel;
