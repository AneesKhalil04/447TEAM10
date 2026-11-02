import type { AuditEntry } from "../../types/auth";
import { formatFullDate } from "../dashboard/utils";

interface AuditLogTableProps {
  entries: AuditEntry[];
}

function weeks({ details }: AuditEntry): string {
  const { rows = 0, first_week, last_week } = details;
  const count = `${rows} week${rows === 1 ? "" : "s"}`;
  if (!first_week || !last_week) return count;
  if (first_week === last_week) return `${count} (${formatFullDate(first_week)})`;
  return `${count} (${formatFullDate(first_week)} to ${formatFullDate(last_week)})`;
}

function AuditLogTable({ entries }: AuditLogTableProps) {
  if (entries.length === 0) {
    return <p className="chart-empty">No uploads have been recorded yet.</p>;
  }

  return (
    <div className="table-scroll">
      <table className="office-table">
        <thead>
          <tr>
            <th>When</th>
            <th>Who</th>
            <th>What</th>
            <th>File</th>
            <th>Office</th>
          </tr>
        </thead>
        <tbody>
          {entries.map((entry) => (
            <tr key={entry.id}>
              <td>
                {new Date(entry.created_at).toLocaleString("en-US", { dateStyle: "medium", timeStyle: "short" })}
              </td>
              <td>{entry.username}</td>
              <td>
                {entry.action === "replace" ? "Uploaded and replaced earlier weeks" : "Uploaded"}: {weeks(entry)}
                {entry.details.replaced_files && entry.details.replaced_files.length > 0 && (
                  <div className="muted">Replaced weeks from {entry.details.replaced_files.join(", ")}</div>
                )}
              </td>
              <td>{entry.filename}</td>
              <td>{entry.office}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default AuditLogTable;
