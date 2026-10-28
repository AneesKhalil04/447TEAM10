import type { Totals } from "../../types/dashboard";

interface UploadChangeNoteProps {
  before: Totals;
  after: Totals;
  onDismiss: () => void;
}

const LABELS: [keyof Totals, string][] = [
  ["visits", "Visits"],
  ["students_served", "Students served"],
  ["pounds_distributed", "Pounds distributed"],
];

const numberFormatter = new Intl.NumberFormat("en-US", { maximumFractionDigits: 2 });

/** Spells out how the totals on screen moved after an upload, since a few new weeks are easy to miss. */
function UploadChangeNote({ before, after, onDismiss }: UploadChangeNoteProps) {
  const changed = LABELS.filter(([key]) => before[key] !== after[key]);

  return (
    <div className="upload-change" role="status">
      {changed.length === 0 ? (
        <span>
          The dashboard totals did not change: this file held the same numbers as the weeks it replaced.
        </span>
      ) : (
        <span>
          Dashboard totals updated:{" "}
          {changed
            .map(([key, label]) => {
              const diff = after[key] - before[key];
              const sign = diff > 0 ? "+" : "";
              return `${label} ${numberFormatter.format(before[key])} → ${numberFormatter.format(after[key])} (${sign}${numberFormatter.format(diff)})`;
            })
            .join(" · ")}
        </span>
      )}
      <button type="button" className="reset-button" onClick={onDismiss}>
        Dismiss
      </button>
    </div>
  );
}

export default UploadChangeNote;
