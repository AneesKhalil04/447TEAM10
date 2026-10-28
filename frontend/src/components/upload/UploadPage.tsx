import { useCallback, useEffect, useState } from "react";
import { fetchDashboardSummary } from "../../api/dashboard";
import { TEMPLATE_URL, fetchDataSources, fetchUploadHistory, uploadFile } from "../../api/uploads";
import type { Totals } from "../../types/dashboard";
import type { DataSource, UploadHistoryItem, UploadOutcome } from "../../types/upload";
import UploadChangeNote from "./UploadChangeNote";
import UploadHistory from "./UploadHistory";
import UploadPanel from "./UploadPanel";
import "./UploadPanel.css";

interface UploadPageProps {
  onViewDashboard?: () => void;
  loadTotals?: () => Promise<Totals>;
  loadHistory?: (signal?: AbortSignal) => Promise<UploadHistoryItem[]>;
  loadDataSources?: (signal?: AbortSignal) => Promise<DataSource[]>;
  sendFile?: (file: File, dataSourceId: number, replace?: boolean) => Promise<UploadOutcome>;
}

async function allTimeTotals(): Promise<Totals> {
  return (await fetchDashboardSummary({ officeId: null, start: null, end: null })).totals;
}

function UploadPage({
  onViewDashboard,
  loadTotals = allTimeTotals,
  loadHistory = fetchUploadHistory,
  loadDataSources = fetchDataSources,
  sendFile = uploadFile,
}: UploadPageProps) {
  const [totals, setTotals] = useState<Totals | null>(null);
  const [change, setChange] = useState<{ before: Totals; after: Totals } | null>(null);
  const [history, setHistory] = useState<UploadHistoryItem[] | null>(null);
  const [historyError, setHistoryError] = useState<string | null>(null);

  const refreshHistory = useCallback(
    (signal?: AbortSignal) =>
      loadHistory(signal)
        .then((items) => {
          setHistory(items);
          setHistoryError(null);
        })
        .catch((reason: unknown) => {
          if (!signal?.aborted) setHistoryError(reason instanceof Error ? reason.message : "Something went wrong.");
        }),
    [loadHistory],
  );

  useEffect(() => {
    const controller = new AbortController();
    void refreshHistory(controller.signal);
    loadTotals()
      .then((current) => {
        if (!controller.signal.aborted) setTotals(current);
      })
      .catch(() => {});
    return () => controller.abort();
  }, [refreshHistory, loadTotals]);

  const handleUploaded = async () => {
    void refreshHistory();
    try {
      const after = await loadTotals();
      if (totals) setChange({ before: totals, after });
      setTotals(after);
    } catch {
      setChange(null);
    }
  };

  return (
    <div className="upload-page">
      <section className="dash-card upload-steps" aria-labelledby="how-title">
        <div className="card-title" id="how-title">
          How uploading works
        </div>
        <ol>
          <li>
            Download the <a href={TEMPLATE_URL}>upload template</a>.
          </li>
          <li>
            Add <strong>one row per week</strong>: the date the week starts, visits, students served, and pounds of
            food distributed.
          </li>
          <li>
            Upload <strong>every week</strong> (one row) or <strong>once a month</strong> (that month&rsquo;s 4 or 5
            rows in one file). Uploading a week again asks before replacing it.
          </li>
        </ol>
      </section>

      <UploadPanel onUploaded={() => void handleUploaded()} loadDataSources={loadDataSources} sendFile={sendFile} />

      {change && (
        <div className="upload-change-row">
          <UploadChangeNote before={change.before} after={change.after} onDismiss={() => setChange(null)} />
          {onViewDashboard && (
            <button type="button" className="primary-button" onClick={onViewDashboard}>
              View dashboard
            </button>
          )}
        </div>
      )}

      <section className="dash-card" aria-labelledby="history-title">
        <div className="card-title" id="history-title">
          Recent uploads
        </div>
        <div className="card-note">Newest first. Every saved file is recorded here.</div>
        {historyError && (
          <div className="dash-alert" role="alert">
            {historyError}
          </div>
        )}
        {history && <UploadHistory items={history} />}
      </section>
    </div>
  );
}

export default UploadPage;
