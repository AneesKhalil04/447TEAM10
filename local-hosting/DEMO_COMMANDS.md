# Starting the demo by hand

Every command, in order. These are written for **Windows PowerShell**. Where Git Bash or macOS differs, the alternative is shown underneath.

The one-shot scripts (`start_demo.ps1` / `start_demo.sh`) run steps 3 to 8 for you.

## 1. Start Docker Desktop

Open Docker Desktop from the Start menu and wait until the bottom-left corner says **Engine running**. Then confirm from a terminal:

```powershell
docker info --format "{{.ServerVersion}}"
```

A version number means Docker is ready. An error means it is still starting; wait and try again.

## 2. Go to the repo and get the latest code

```powershell
cd C:\path\to\447TEAM10
git fetch
git switch Anees-feature/local-hosting
git pull
```

## 3. Build and start the containers

```powershell
docker compose up -d --build
```

This starts **db** (PostgreSQL) and **backend** (FastAPI). The first run downloads images and takes a few minutes; after that it takes seconds.

## 4. Check that both containers are up

```powershell
docker compose ps
```

You should see `447team10-db-1` with status `(healthy)` and `447team10-backend-1` with status `Up`.

## 5. Check that the API answers

```powershell
curl.exe http://localhost:8000/health
```

Expected: `{"status":"ok"}`. If you get "connection refused", the backend is still applying migrations; wait five seconds and try again. To see what it is doing: `docker compose logs backend`.

(Git Bash / macOS: `curl http://localhost:8000/health`)

## 6. Load the sample data

This deletes everything uploaded and loads the 52 sample weeks (Oct 13, 2025 to Oct 5, 2026). It also creates the Retriever Essentials office if it does not exist yet.

```powershell
Invoke-RestMethod -Method Post -Uri http://localhost:8000/testing/reset -ContentType "application/json" -Body '{"load_sample": true}'
```

Expected: `loaded_rows : 52`.

(Git Bash / macOS: `curl -X POST http://localhost:8000/testing/reset -H "Content-Type: application/json" -d '{"load_sample": true}'`)

You can also do this later from the website: **Testing** tab, then **Reset to sample data**.

## 7. Start the website

```powershell
cd frontend
npm install
npm run dev
```

`npm install` is only needed the first time or after the dependencies change. Leave this window open; the website stops when it closes.

## 8. Open the dashboard

Go to **http://localhost:5173** in the browser.

Use `localhost`, not `127.0.0.1`; the backend only accepts requests from `http://localhost:5173`.

## 9. Optional: look inside the database

In a second terminal, from the repo folder:

```powershell
docker compose exec db psql -U postgres -d retriever_essentials
```

Then try:

```sql
\dt
SELECT * FROM upload_batch ORDER BY id;
SELECT week_start, visits, students_served, pounds_distributed FROM service_usage ORDER BY week_start DESC LIMIT 10;
\q
```

Or use DBeaver with host `localhost`, port `5432`, database `retriever_essentials`, user `postgres`, password `postgres`.

## Stopping

| What | Command |
|---|---|
| Stop the website | `Ctrl+C` in the `npm run dev` window |
| Stop the containers, keep the data | `docker compose down` |
| Stop the containers and delete all data | `docker compose down -v` |

## If something goes wrong

| Problem | Fix |
|---|---|
| `docker: error during connect` or `cannot find the file specified` | Docker Desktop is not running yet. Start it and wait for "Engine running". |
| `port is already allocated` for 5432 | Another PostgreSQL is installed and running on the laptop. Stop it (Services app, "postgresql-x64-..." service) and run step 3 again. |
| `Port 5173 is in use` | The website is already running in another window. Use that one, or close it first. |
| Dashboard says it cannot reach the API | Run steps 4 and 5. Check `docker compose logs backend` for errors. |
| Blank white page | Stop the website with Ctrl+C, run `npm run dev` again and refresh the browser with Ctrl+F5. |
| No Testing tab | The backend was started without `ENABLE_TEST_TOOLS`. Use the repo's `docker-compose.yml` and run step 3 again. |
| `running scripts is disabled on this system` | Start the script with `powershell -ExecutionPolicy Bypass -File local-hosting\start_demo.ps1`. |
