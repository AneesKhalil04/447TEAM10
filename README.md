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
