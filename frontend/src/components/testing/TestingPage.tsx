import { useState } from "react";
import { resetData, type ResetResult } from "../../api/testing";
import "../upload/UploadPanel.css";

type Choice = "sample" | "empty";

interface TestingPageProps {
  reset?: (loadSample: boolean) => Promise<ResetResult>;
}

const CHOICES: { id: Choice; title: string; description: string }[] = [
  {
    id: "sample",
    title: "Reset to sample data",
    description: "Deletes every upload, then loads one year of made-up sample weeks (Oct 2025 to Oct 2026).",
  },
  {
    id: "empty",
    title: "Clear everything",
    description: "Deletes every upload so the dashboard starts empty.",
  },
];

function TestingPage({ reset = resetData }: TestingPageProps) {
  const [confirming, setConfirming] = useState<Choice | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const run = async (choice: Choice) => {
    setBusy(true);
    setError(null);
    setMessage(null);
    try {
      const result = await reset(choice === "sample");
      setMessage(
        `Deleted ${result.deleted_uploads} upload(s) and ${result.deleted_rows} week(s) of data.` +
          (result.loaded_rows > 0 ? ` Loaded ${result.loaded_rows} sample weeks.` : " The dashboard is now empty."),
      );
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Something went wrong.");
    } finally {
      setBusy(false);
      setConfirming(null);
    }
  };

  return (
    <div className="upload-page">
      <section className="dash-card testing-warning">
        <div className="card-title">Testing tools</div>
        <p className="card-note">
          For demos and development only. This tab appears only when the server has test tools turned on, and is
          never shown in a real deployment.
        </p>
      </section>

      {CHOICES.map((choice) => (
        <section key={choice.id} className="dash-card testing-action" aria-labelledby={`reset-${choice.id}`}>
          <div>
            <div className="card-title" id={`reset-${choice.id}`}>
              {choice.title}
            </div>
            <p className="card-note">{choice.description}</p>
          </div>
          {confirming === choice.id ? (
            <div className="upload-actions">
              <span className="testing-confirm">This cannot be undone. Continue?</span>
              <button type="button" className="danger-button" disabled={busy} onClick={() => void run(choice.id)}>
                {busy ? "Working…" : "Yes, delete"}
              </button>
              <button type="button" className="reset-button" disabled={busy} onClick={() => setConfirming(null)}>
                Cancel
              </button>
            </div>
          ) : (
            <button type="button" className="reset-button" disabled={busy} onClick={() => setConfirming(choice.id)}>
              {choice.title}
            </button>
          )}
        </section>
      ))}

      {message && (
        <div className="upload-result upload-success" role="status">
          {message}
        </div>
      )}
      {error && (
        <div className="dash-alert" role="alert">
          {error}
        </div>
      )}
    </div>
  );
}

export default TestingPage;
