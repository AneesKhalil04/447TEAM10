import type { UploadHistoryItem } from "../../types/upload";
import { formatWeekRange } from "../dashboard/utils";

interface UploadHistoryProps {
  items: UploadHistoryItem[];
}

function formatUploadedAt(timestamp: string): string {
  return new Date(timestamp).toLocaleString("en-US", { dateStyle: "medium", timeStyle: "short" });
}

function weeksCovered(item: UploadHistoryItem): string {
  if (!item.first_week || !item.last_week) return "All weeks replaced by later uploads";
  return formatWeekRange(item.first_week, item.last_week);
}

function UploadHistory({ items }: UploadHistoryProps) {
  if (items.length === 0) {
    return <p className="chart-empty">No files have been uploaded yet.</p>;
  }

  return (
    <div className="table-scroll">
      <table className="office-table">
        <thead>
          <tr>
            <th>File</th>
            <th>Office</th>
            <th>Weeks covered</th>
            <th className="num">Weeks</th>
            <th>Uploaded</th>
            <th>By</th>
          </tr>
        </thead>
        <tbody>
          {items.map((item) => (
            <tr key={item.upload_batch_id}>
              <td>{item.filename}</td>
              <td>{item.office}</td>
              <td>{weeksCovered(item)}</td>
              <td className="num">
                {item.weeks_kept}
                {item.weeks_kept < item.row_count && (
                  <span className="muted"> of {item.row_count} (rest replaced)</span>
                )}
              </td>
              <td className="nowrap">{formatUploadedAt(item.uploaded_at)}</td>
              <td>{item.uploaded_by ?? <span className="muted">Unknown</span>}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default UploadHistory;
