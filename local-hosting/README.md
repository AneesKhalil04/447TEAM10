# Local hosting

Everything needed to run the dashboard on one machine for a live demo.

| File | Use it for |
|---|---|
| [LAPTOP_SETUP.md](LAPTOP_SETUP.md) | Checking and installing the required software on a new machine |
| [DEMO_COMMANDS.md](DEMO_COMMANDS.md) | Every command to start the demo, in order, typed by hand |
| `start_demo.ps1` | One-shot start script for Windows PowerShell |
| `start_demo.sh` | The same script for Git Bash or macOS/Linux |
| [DEMO_SCRIPT.md](DEMO_SCRIPT.md) | What to show and say, about 5 minutes |
| `demo_files/` | Seven CSV files to upload during the demo |

## What runs where

The app is three pieces. Two run in Docker containers; the website runs on the machine itself.

| Piece | Runs in | Address | What it does |
|---|---|---|---|
| **db** | Docker container (`postgres:16` image) | `localhost:5432` | The PostgreSQL database. Stores offices, uploads and the weekly numbers. Its data is kept in the Docker volume `447team10_pgdata`, so it survives restarts. |
| **backend** | Docker container (built from `backend/Dockerfile`) | `localhost:8000` | The FastAPI server. Checks uploaded files, saves good rows to the database, and answers the dashboard's requests. Applies database migrations each time it starts. API docs at `/docs`. |
| **frontend** | Node.js on the machine (`npm run dev`) | `localhost:5173` | The React website people click on. It gets all of its numbers from the backend. |

Flow: browser (5173) → backend (8000) → database (5432).

## Quick start

```powershell
powershell -ExecutionPolicy Bypass -File local-hosting\start_demo.ps1
```

or from Git Bash:

```bash
bash local-hosting/start_demo.sh
```

Both scripts start the containers, wait for the API, reset the data to the 52 sample weeks, start the website and open it in the browser. Press Ctrl+C in that window to stop the website; the containers keep running until `docker compose down`.
