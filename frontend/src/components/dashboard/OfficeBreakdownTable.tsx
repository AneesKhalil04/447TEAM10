import type { OfficeTotal } from "./utils";

interface OfficeBreakdownTableProps {
  totals: OfficeTotal[];
}

const numberFormatter = new Intl.NumberFormat("en-US");

function OfficeBreakdownTable({ totals }: OfficeBreakdownTableProps) {
  return (
    <table className="office-table">
      <thead>
        <tr>
          <th>Office</th>
          <th className="num">Visits</th>
          <th className="num">Students served</th>
          <th className="num">Pounds distributed</th>
        </tr>
      </thead>
      <tbody>
        {totals.map((row) => (
          <tr key={row.office}>
            <td>{row.office}</td>
            <td className="num">{numberFormatter.format(row.visits)}</td>
            <td className="num">{numberFormatter.format(row.students_served)}</td>
            <td className="num">{numberFormatter.format(row.pounds_distributed)}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

export default OfficeBreakdownTable;
