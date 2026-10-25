# Sample data

`service_usage_sample.csv` is generated placeholder data, not real Retriever Essentials numbers. It follows the column layout the dashboard and upload pipeline are being built against: one row per office per week, with visit counts, unique students served, and pounds of food distributed.

It exists so the frontend dashboard and the future upload pipeline have something realistic to run against before the client provides real sample data (see the open question in `docs/requirements-draft.md`). Replace it once real data is available.

`upload_sample.csv` holds just the Retriever Essentials rows from that file, ready to upload after running `python -m app.seed`. Uploads are checked against the data source's office, so the full sample file, which also has Emergency Aid Program rows, is rejected with row-level errors.

## Upload template

Required columns: `week_start`, `visits`, `students_served`, `pounds_distributed`. Optional columns: `office`, which must match the data source's office if present, and `service`, which must be an existing service of that office. Any other columns are kept in the row's `extra` field. Column names are matched case-insensitively, and spaces count as underscores.

- `week_start`: a date as `YYYY-MM-DD` or `MM/DD/YYYY`, or an Excel date cell.
- `visits`, `students_served`: whole numbers, 0 or more.
- `pounds_distributed`: a number, 0 or more, with at most two decimal places.

If any row is invalid, nothing is saved and every problem is reported with its spreadsheet row number. If a file includes weeks that were already uploaded, nothing is saved and the API returns the earlier uploads (409). Sending the file again with `replace=true` replaces only those weeks.
