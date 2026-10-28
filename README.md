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
| Data ingestion | openpyxl and Python's csv module for CSV/Excel validation |
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

## Running the Backend Locally

Start Postgres and the API with Docker. Migrations run automatically when the API container starts.

```
docker compose up --build
```

To run the API outside Docker, start only the database and apply migrations yourself:

```
docker compose up -d db
cd backend
python -m venv .venv
.venv/Scripts/activate        # macOS/Linux: source .venv/bin/activate
pip install -r requirements-dev.txt
cp .env.example .env
alembic upgrade head
uvicorn app.main:app --reload
```

To load the pilot office and try an upload:

```
docker compose exec backend python -m app.seed
curl -F data_source_id=1 -F file=@backend/sample_data/upload_sample.csv localhost:8000/uploads
```

Interactive API docs are at http://localhost:8000/docs. `GET /uploads/template` returns the blank upload template.

The local `docker-compose.yml` sets `ENABLE_TEST_TOOLS=true`, which adds a **Testing** tab to the frontend for resetting all uploaded data to the sample year or clearing it. It is off by default; never enable it in a shared or hosted deployment.

After changing a model in `backend/app/models/`, generate a migration with `alembic revision --autogenerate -m "describe the change"`, review the generated file, and commit it with the model change. `pytest` fails if the models and migrations are out of sync.

## Running the Frontend Locally

The dashboard reads its numbers from the API, so start the backend first (see above) and load some data with the seed and upload commands.

```
cd frontend
npm install
npm run dev
```

Open http://localhost:5173. The API address defaults to `http://localhost:8000`. To point at a different API, copy `frontend/.env.example` to `frontend/.env.local` and change `VITE_API_URL`.

## Team Workflow

- Feature branches and pull requests; no direct commits to `main`
- At least one teammate reviews each pull request
- CI must pass before merging
