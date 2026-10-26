export const REQUIRED_COLUMNS = [
  "office", "period_start", "period_end", "visits", "students_served", "pounds_distributed",
];

const PERSONAL_COLUMNS = new Set([
  "student_id", "student_name", "name", "email", "phone", "address",
]);

export const TEMPLATE_CSV = `${REQUIRED_COLUMNS.join(",")}\r\nEXAMPLE ONLY - replace with your office,2026-10-01,2026-10-07,100,70,1000\r\n`;

export interface CsvPreview {
  headers: string[];
  rows: string[][];
  rowCount: number;
}

/** Read CSV fields, including quoted commas, escaped quotes, and multiline values. */
export function validateCsv(text: string): CsvPreview {
  const records: string[][] = [];
  let row: string[] = [];
  let field = "";
  let quoted = false;
  let closedQuote = false;
  const malformed = () => new Error("This CSV has invalid quoting. Please export it as CSV again.");

  for (let i = 0; i < text.length; i += 1) {
    const char = text[i];
    if (quoted) {
      if (char === '"' && text[i + 1] === '"') {
        field += '"';
        i += 1;
      } else if (char === '"') {
        quoted = false;
        closedQuote = true;
      } else {
        field += char;
      }
    } else if (char === "," || char === "\n" || char === "\r") {
      row.push(field);
      field = "";
      closedQuote = false;
      if (char !== ",") {
        if (row.some((value) => value.trim())) records.push(row);
        row = [];
        if (char === "\r" && text[i + 1] === "\n") i += 1;
      }
    } else if (char === '"') {
      if (field || closedQuote) throw malformed();
      quoted = true;
    } else {
      if (closedQuote) throw malformed();
      field += char;
    }
  }
  if (quoted) throw malformed();
  row.push(field);
  if (row.some((value) => value.trim())) records.push(row);

  const headers = (records.shift() ?? []).map((header) =>
    header.replace(/^\uFEFF/, "").trim().toLowerCase().replace(/[\s-]+/g, "_"),
  );
  const prohibited = headers.filter((header) => PERSONAL_COLUMNS.has(header));
  if (prohibited.length) {
    throw new Error(`Remove personal-data columns before previewing: ${prohibited.join(", ")}. Use aggregated data only.`);
  }
  const missing = REQUIRED_COLUMNS.filter((header) => !headers.includes(header));
  if (missing.length) throw new Error(`Missing required columns: ${missing.join(", ")}. Download the template to get started.`);
  if (headers.some((header) => !header) || new Set(headers).size !== headers.length) {
    throw new Error("Each column must have a non-empty, unique header.");
  }
  if (!records.length) throw new Error("This CSV has no data rows. Add at least one aggregated data row.");
  const invalidRow = records.findIndex((record) => record.length !== headers.length);
  if (invalidRow !== -1) {
    throw new Error(`Data row ${invalidRow + 1} has a different number of fields than the headers. Check its commas and quotes.`);
  }
  return { headers, rows: records.slice(0, 5), rowCount: records.length };
}
