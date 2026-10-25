# Baseline Tech Stack (PROPOSED)

**Status:** Proposed baseline, pending confirmation by the whole team. It reflects that the team is strongest in Python, wants a React frontend, PostgreSQL, and free or low-cost cloud hosting. Updated after the client meeting: the MVP uses scheduled batch CSV/Excel uploads (weekly or monthly). Real-time updates are a stretch goal only.

## Architecture

Three-tier layered web app: **React SPA (presentation), FastAPI REST API (business logic, RBAC, upload pipeline), PostgreSQL (data)**. Offices submit standardized CSV/Excel batches and the dashboards refresh after each processed upload.

## Stack

| Area | Choice | Why |
|---|---|---|
| Frontend | React (Vite), Recharts (or Chart.js / Apache ECharts), UI kit such as MUI or Tailwind. UMBC gold and black styling. | Strong ecosystem for dashboards, and components can be reused across role-based views |
| Backend | Python, FastAPI (Pydantic validation, SQLAlchemy ORM, Alembic migrations) | Team's strongest language, auto-generated OpenAPI docs, easy to add pandas for aggregation |
| Database | PostgreSQL | Relational fit for the model (Office, Service, Service_Usage, Staff_User, Role, Upload_Batch, Data_Source, and others), with constraints and foreign keys |
| API | REST with JSON, documented through FastAPI's OpenAPI/Swagger. MVP refreshes after each batch upload. Stretch: WebSockets or SSE for live updates. | Real-time pulling from all offices is unrealistic this semester |
| Data ingestion | Weekly or monthly batch CSV/Excel upload with a standard template and validation (openpyxl and Python's csv module) | Replaces manual spreadsheet tracking. Pantrysoft can export CSV/Excel. |
| Auth and security | Password hashing (argon2 or bcrypt), JWT or session cookies, RBAC enforced in the API layer, audit log, HTTPS, aggregated-by-default views. UMBC SSO (SAML/OIDC) is a stretch goal to confirm with the client. No direct PeopleSoft integration. | Sensitive student data and FERPA concerns |
| Hosting and deployment | Local host or Docker first (hosting is decided later). Then frontend on Vercel or Netlify, backend and managed Postgres on Render or Railway. | Quick setup with CI/CD from GitHub. Production would need UMBC-approved hosting. |
| CI/CD | GitHub Actions: lint (ruff, eslint), tests (pytest, Vitest), block merge on failure | Matches the team working agreement |
| Testing | pytest (API and unit), Vitest and React Testing Library (UI), optional Playwright (end-to-end) | Supports testable tasks and the Definition of Done |
| Dev tooling | Git and GitHub (feature branches, PRs), Jira, MS Teams, Discord, Docker Compose (local Postgres and API) | Team tools |

## Repository layout

`/frontend` (React + Vite) · `/backend` (FastAPI app: `routers/`, `models/`, `schemas/`, `services/`, `tests/`) · `/docs` · `.github/workflows` (CI)

## Decisions made

- Scope: Retriever Essentials pilot, designed to be extensible to other Dean of Students offices.
- MVP is batch upload. Real-time is a stretch goal.
- MVP metrics are service and program impact. Retention and graduation views are deferred (aggregated only). A separate grant-funded dashboard already covers engagement versus graduation.
- Database: PostgreSQL over MongoDB, because a strict schema is a benefit. Validate uploads, with an optional JSONB column for flexible extra fields.

## Hosting notes

- Render's free Postgres expires 30 days after creation (14-day grace period, 1 GB, no backups), and free web services sleep after 15 minutes idle.
- Railway has a one-time $5 trial, then $5 per month on the Hobby plan.
- Vercel and Netlify frontend hosting is free.
- The backend and database will likely need a small paid plan or a workaround, so the plan is "free or low-cost" hosting.
- Docker keeps the app portable to whatever host UMBC chooses.

## Open decisions

- Auth approach (own login or UMBC SSO), and which data sources and offices must be integrated.
- TypeScript or plain JavaScript on the frontend.
- Final hosting choice.
- Confirmation of the whole stack by all teammates.
