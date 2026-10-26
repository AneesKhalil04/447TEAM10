# 447TEAM10

## Retriever Essentials Basic Needs Impact Dashboard

A secure, web-based dashboard for UMBC's Retriever Essentials (housed under the Dean of Students Office) that brings service data from several campus offices into one place.

This is the semester project for CMSC 447.

## Project Idea

Several offices at UMBC do important basic-needs work, but they mostly operate in silos and track their numbers in separate spreadsheets. There is no central way to see the combined impact of that work.

Our proposed solution is a Basic Needs Impact Dashboard that:

- Combines data from multiple offices in one place
- Replaces manual spreadsheet tracking
- Protects sensitive student information with role-based access control
- Shows service and program impact through clear charts and summaries
- Gives staff and university leadership data-driven insight into how basic needs support helps student success

### Initial Scope

- **Pilot:** Retriever Essentials, designed so other Dean of Students offices can be added later.
- **Data intake (MVP):** Offices submit standardized CSV/Excel files on a weekly or monthly schedule. The dashboard refreshes after each processed upload. Live, real-time updates are a stretch goal.
- **Core MVP features:**
  1. CSV/Excel upload with validation
  2. Dashboard charts and summaries
  3. Role-based login
- **Metrics:** Service and program impact, shown in aggregated form. Retention and graduation views are deferred.

## Tech Stack (Proposed)

| Area | Choice |
|---|---|
| Frontend | React (Vite), Recharts for charts |
| Backend | Python, FastAPI, SQLAlchemy, Alembic |
| Database | PostgreSQL |
| Data ingestion | pandas and openpyxl for CSV/Excel validation |
| API | REST with JSON, documented through FastAPI's OpenAPI/Swagger |
| Auth and security | Password hashing, token or session-based login, role-based access control |
| Deployment | Docker; frontend on Vercel or Netlify; backend and database on a free or low-cost host (to be decided) |
| CI/CD | GitHub Actions (linting and tests must pass before merging) |
| Testing | pytest, Vitest, React Testing Library |
| Team tools | Git and GitHub, Jira, Discord, MS Teams |

The architecture is a three-tier web app: React single-page app, FastAPI REST API, and a PostgreSQL database.

## Planned Repository Layout

```
frontend/          React + Vite app
backend/           FastAPI app (routers, models, schemas, services, tests)
docs/              Requirements and design documents
.github/workflows/ CI configuration
```

## Team Workflow

- Feature branches and pull requests; no direct commits to `main`
- At least one teammate reviews each pull request
- CI must pass before merging

## Run locally: CSV validation and session dashboard

This increment supports CSV preview, server validation, and loading accepted records into the
dashboard for the current browser session. It does not save data to PostgreSQL or provide
authentication or Excel uploads. Selecting a file previews it locally; **Validate and Load
Dashboard** sends the original file to FastAPI. Invalid uploads leave the current dashboard intact.

From the repository directory, start the backend in PowerShell (Python 3.12 recommended):

```powershell
cd backend
py -3.12 -m venv .venv
.\.venv\Scripts\python.exe -m pip install -r requirements-dev.txt
.\.venv\Scripts\python.exe -m uvicorn app.main:app --reload --port 8000
```

In a second terminal, from the repository directory:

```powershell
cd frontend
npm.cmd ci
npm.cmd run dev -- --port 5173 --strictPort
```

Open `http://localhost:5173`. API documentation is at `http://localhost:8000/docs`.
The backend currently allows this exact frontend origin through CORS. No database is needed
for validation. Alternatively, `docker compose up --build backend` starts the API and its configured
database dependency; the frontend still runs separately.

The frontend uses `VITE_API_BASE_URL`, defaulting to `http://localhost:8000`. To override it,
copy `frontend/.env.example` to `frontend/.env`, edit the URL, and restart Vite. A different
frontend origin also requires updating the backend CORS allowlist. The backend `.env.example`
contains future database/auth settings; neither is required for this workflow.

### Demo and upload contract

Select `docs/demo-dashboard-data.csv` (eight synthetic rows, two offices, four weekly periods),
check the local preview, then click **Validate and Load Dashboard**. Expected unfiltered totals:
555 visits, 379 summed students served, and 4,800.5 pounds. Use **Restore Sample Data** to return
to the original dashboard, or refresh the page to discard accepted session data.

`POST /api/uploads/validate` accepts a multipart field named `file`, with a `.csv` filename,
UTF-8 encoding, and a maximum file content size of 5 MiB (5,242,880 bytes). Required columns:
`office`, `period_start`, `period_end`, `visits`, `students_served`, `pounds_distributed`.
Headers ignore case and normalize spaces/hyphens to underscores. Personal-data headers
(`student_id`, `student_name`, `name`, `email`, `phone`, `address`) are rejected.

Every required field must be populated. Dates must be valid `YYYY-MM-DD` values with start
no later than end. Visit/student counts must be non-negative integers; pounds must be finite
and non-negative. Extra non-prohibited columns are allowed but are not returned. Blank lines
are ignored. Errors return an `errors` array with `row` and `message`; row numbers are CSV
physical line numbers (header is row 1, multiline records refer to their starting line).
Any validation error rejects the entire file with no accepted records. Valid responses contain
`row_count` and `records` with normalized dates and numeric values. Nothing is persisted.

The existing dashboard maps `period_start` to `week_start`; `period_end` is validated but is
not used by chart grouping or date filtering. Use weekly periods for the demo. Student counts
are summed across records and do not establish unique students across offices or weeks.

### Checks

From `backend/`: `.\.venv\Scripts\python.exe -m pytest` and
`.\.venv\Scripts\python.exe -m ruff check .`.
From `frontend/`: `npm.cmd test`, `npm.cmd run lint`, and `npm.cmd run build`.
