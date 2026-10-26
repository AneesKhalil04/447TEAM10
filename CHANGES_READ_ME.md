# Changes on the faseeh branch

This document records work completed on `faseeh`. Add an entry here when making future changes. Planned items below are suggestions, not completed features.

Entries describe each increment at the time it was built. The server-validation increment below
extends the earlier local-only preview; its behavior is the current behavior.

## October 25, 2026 — Frontend aggregated CSV preview

Added the first frontend increment toward the Retriever Essentials MVP: an **Upload Aggregated Data** section in the existing dashboard.

### What staff can do

- Select a `.csv` file containing aggregated office data.
- Download a CSV template with the required headers and one row clearly marked **EXAMPLE ONLY**.
- See the filename, total data-row count, and the first five data rows after validation.
- Clear the selected file, preview, and validation messages.

### Validation

- Requires `office`, `period_start`, `period_end`, `visits`, `students_served`, and `pounds_distributed`.
- Rejects non-CSV filenames and missing required columns.
- Rejects personal-data headers: `student_id`, `student_name`, `name`, `email`, `phone`, and `address`. Header matching ignores case and normalizes spaces and hyphens to underscores.
- Rejects empty data, duplicate or empty headers, malformed quoting, and rows with a different field count than the header.
- Supports quoted commas, escaped quotes, multiline fields, common line endings, and a byte-order mark in the first header.
- Shows user-friendly validation messages and removes stale previews when another file is selected.

This increment validates CSV structure and headers. It does not yet validate date values, numeric values, or business rules, and header checks cannot establish that every cell is free of personal information.

### Scope and behavior

The interface explicitly labels the result as a **preview before submission**. File contents are read locally for the preview; no submission or persistence is implemented. There is no submit button.

The backend, database, existing sample dashboard calculations, filters, and charts were not changed. Previewed data does not feed the dashboard. Styling follows the existing plain CSS and UMBC gold-and-black design.

### Files changed

| File | Change |
|---|---|
| `frontend/src/components/dashboard/Dashboard.tsx` | Adds the upload section to the dashboard. |
| `frontend/src/components/dashboard/Dashboard.css` | Adds upload controls, messages, and scrollable preview styling. |
| `frontend/src/components/dashboard/UploadAggregatedData.tsx` | New file-selection, local-preview, clear, and template-download component. |
| `frontend/src/components/dashboard/uploadCsv.ts` | New CSV parser, header validation, and template contents. |
| `frontend/src/components/dashboard/UploadAggregatedData.test.tsx` | Adds 19 automated tests for valid and invalid files, preview limits, clearing, replacement files, and template contents. |
| `CHANGES_READ_ME.md` | Documents branch changes and provides a place for future entries. |

No dependencies were added.

### Verification performed for the implementation

| Command (run from `frontend/`) | Result |
|---|---|
| `npm.cmd test` | Passed: 23 tests across 3 files, including 19 new upload tests. |
| `npm.cmd run lint` | Passed. |
| `npm.cmd run build` | Passed, with a warning that a minified bundle exceeds 500 kB. |

`git diff --check` also passed for the implementation. PowerShell blocked `npm.ps1`, so checks used `npm.cmd`; tests and build ran outside the sandbox after sandbox access errors. These are the implementation's recorded results, not a claim that checks have been rerun after every future edit.

## October 25, 2026 — FastAPI validation and session dashboard loading

### What changed

- Kept local CSV preview, Clear, and template download. Added a matching 5 MiB file limit.
- Added **Validate and Load Dashboard**, sending the original file using browser-generated
  multipart FormData to `POST /api/uploads/validate`.
- Added loading, readable backend row errors, network-error messages, and cancellation of stale
  requests when clearing, replacing files, or restoring samples. Failures leave dashboard data intact.
- Added independent backend checks for required/prohibited headers, non-empty required fields,
  exact valid dates and period ordering, non-negative integer counts, finite non-negative pounds,
  encoding, CSV structure, empty files, and file size/type.
- Rejected files return only errors; no partially accepted records are returned or saved.
- Successful responses include `row_count` and normalized `records`. The dashboard maps
  `period_start` to `week_start`, replaces active data, and resets filters. Existing calculation
  functions and chart components remain unchanged and receive the accepted data.
- Added **Restore Sample Data**, session-only notices, environment configuration, startup
  instructions, and an eight-row synthetic demo file.

### Files changed in this increment

| File | Purpose |
|---|---|
| `backend/app/main.py` | Registers the upload router; retains existing localhost CORS and health endpoint. |
| `backend/app/routers/uploads.py` | Multipart route, filename/size limit, structured error responses, file closure. |
| `backend/app/services/uploads.py` | Standard-library CSV parsing and atomic row validation. |
| `backend/app/schemas/uploads.py` | Pydantic record, success, and error response schemas. |
| `backend/requirements.txt` | Adds pinned `python-multipart==0.0.32`. |
| `backend/tests/test_uploads.py` | Endpoint, validation, size, CORS, atomic rejection, and demo-data tests. |
| `frontend/src/components/dashboard/UploadAggregatedData.tsx` | Original-file submission, request state/errors/cancellation, session notices. |
| `frontend/src/components/dashboard/Dashboard.tsx` | Active accepted data, filter reset, sample restoration, source labels. |
| `frontend/src/components/dashboard/Dashboard.css` | Preserves line breaks in backend error messages. |
| `frontend/src/components/dashboard/UploadAggregatedData.test.tsx` | Updates help-text expectation for the server workflow. |
| `frontend/src/components/dashboard/UploadWorkflow.test.tsx` | API success/failure, network/loading, dashboard replacement/filtering/restoration, stale-response tests. |
| `frontend/src/types/upload.ts` | TypeScript API record and response types. |
| `frontend/.env.example` | Documents `VITE_API_BASE_URL=http://localhost:8000`. |
| `docs/demo-dashboard-data.csv` | Eight synthetic aggregate rows across two offices and four weekly periods. |
| `README.md` | Startup, environment, endpoint contract, demo, and verification instructions. |
| `CHANGES_READ_ME.md` | Records this increment and updates future work. |

The earlier frontend parser (`uploadCsv.ts`) is retained without changes in this increment.
The backend `.env.example`, development requirements, Compose file, database code, and authentication
were not changed because this workflow does not use them. A local ignored `backend/.venv` was
created for verification; it is not a source change.

### Verification and commands

Run backend commands from `backend/` and frontend commands from `frontend/`:

| Command | Result / purpose |
|---|---|
| `python -m pip --version` | Checked available installer. |
| `python -m pytest --version` | Initial system interpreter had no pytest. |
| `python -m ruff --version` | Checked available system Ruff (0.15.15). |
| `python -c "import fastapi, multipart; print(fastapi.__version__)"` | Inspected existing system dependencies. |
| `python -m venv .venv --system-site-packages` | Initial local test environment. |
| `.\.venv\Scripts\python.exe -m pip install -r requirements-dev.txt` | Initial sandbox network failure; retried with approval and installed dependencies. |
| `python -m venv .venv` | Reconfigured the environment to isolate it from global packages. |
| `.\.venv\Scripts\python.exe -m pip install -r requirements-dev.txt` | Completed installation in the isolated environment, resolving inherited dependency warnings. |
| `python -m ruff check .` | Initial run identified three long lines; these were fixed. |
| `.\.venv\Scripts\python.exe -m pytest` | Final: 34 tests passed. |
| `.\.venv\Scripts\python.exe -m ruff check .` | Final: all checks passed. |
| `.\.venv\Scripts\python.exe -m pip check` | Final: no broken requirements. |
| `npm.cmd test` | Final: 28 tests passed across four files. |
| `npm.cmd run lint` | Passed. |
| `npm.cmd run build` | Passed; Vite warns that the minified JavaScript bundle exceeds 500 kB. |
| `git diff --check` | Passed. |

Checks were repeated after fixes. Intermediate backend runs included a dependency-installation
timing error and a demo expected-total typo, both resolved before the final run. Verification used
Python 3.13.7 on this machine; the repository's Docker/CI configuration still uses Python 3.12.
The isolated environment's Starlette emits a deprecation warning for its existing httpx-based
TestClient; the tests still pass. Frontend tests mock fetch; backend tests exercise real multipart
requests through FastAPI TestClient. No manual browser end-to-end run is claimed.

Read-only inspection also used PowerShell `Get-Content`, `Get-ChildItem`, `Get-Command`,
`rg --files`, and Git status/diff commands. Git commands used a command-scoped `safe.directory`
override for the sandbox ownership difference; no global Git settings were changed.

### Current limitations

- Accepted data lives only in React memory; refresh/restoration discards it. No PostgreSQL
  persistence, authentication, permissions, or Excel processing is implemented.
- Charts/date filters use period start dates, not period-end overlap. Use weekly periods for
  this dashboard; student-count sums cannot establish unique students across periods/offices.
- Header checks do not inspect every cell for personal information. Use synthetic/aggregated data.
- The file-content limit is enforced after FastAPI's multipart parser receives the request;
  no reverse-proxy or whole-request transport limit is configured.

## Possible future work — not implemented

- Confirm the upload format and metric definitions with the team and stakeholder.
- Add agreed business rules such as duplicate/overlapping-period handling.
- Add Excel processing and database storage as separate increments.
- Connect persisted data to dashboard API endpoints.
- Add login and enforce role-based permissions in the backend.

## Future change entry template

Copy this block for each completed change, keeping planned work separate:

```text
## YYYY-MM-DD — Change title

What changed:
- Describe the user-visible behavior.

Files changed:
- List affected files and their purpose.

Verification:
- Record commands actually run and their results.

Limitations or follow-up:
- Record anything still incomplete.
```
