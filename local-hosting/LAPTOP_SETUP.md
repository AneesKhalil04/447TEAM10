# Laptop setup checklist

What a machine needs to run the demo, how to check for each item, and how to install anything that is missing. Work through it top to bottom. Do this **the day before** the demo: Docker and WSL may need a restart, and the first build downloads around 1 GB.

Commands are for Windows (PowerShell). macOS alternatives use [Homebrew](https://brew.sh).

## Required software

| # | Software | Version | Check | Install on Windows | Install on macOS |
|---|---|---|---|---|---|
| 1 | Git | any recent | `git --version` | `winget install --id Git.Git -e` | `brew install git` |
| 2 | WSL 2 (Windows only, needed by Docker) | WSL 2 | `wsl --status` | `wsl --install` in an **Administrator** PowerShell, then restart | not needed |
| 3 | Docker Desktop (includes Docker Compose) | 4.x or newer; `docker compose` v2 | `docker --version` and `docker compose version` | `winget install --id Docker.DockerDesktop -e`, then restart and open Docker Desktop once to finish setup | `brew install --cask docker`, then open Docker once |
| 4 | Node.js (includes npm) | 20 or newer | `node -v` and `npm -v` | `winget install --id OpenJS.NodeJS.LTS -e` | `brew install node@20` |

After installing anything with winget, **close and reopen the terminal** so the new commands are on PATH.

Notes:
- Docker Desktop needs hardware virtualization turned on. If it reports that virtualization is disabled, it has to be enabled in the BIOS/UEFI settings.
- Python and PostgreSQL do **not** need to be installed on the laptop; both run inside Docker. A PostgreSQL that is already installed and running locally will block port 5432 and must be stopped first.

## Optional software

| Software | Why | Check | Install on Windows | Install on macOS |
|---|---|---|---|---|
| DBeaver Community | Browsing the database tables during the demo | Look for DBeaver in the Start menu | `winget install --id DBeaver.DBeaver.Community -e` | `brew install --cask dbeaver-community` |
| Python 3.12 | Only for running backend tests outside Docker | `python --version` | `winget install --id Python.Python.3.12 -e` | `brew install python@3.12` |

## Get the code

```powershell
git clone https://github.com/AneesKhalil04/447TEAM10.git
cd 447TEAM10
git switch Anees-feature/local-hosting
```

If the repo is already cloned: `git fetch` then `git switch Anees-feature/local-hosting` and `git pull`.

## Download everything ahead of time

So the demo does not depend on the room's Wi-Fi, with Docker Desktop running and from the repo folder:

```powershell
docker compose pull db
docker compose build
cd frontend
npm install
cd ..
```

## Check the ports are free

The app uses ports 5432, 8000 and 5173.

```powershell
netstat -ano | findstr ":5432 :8000 :5173"
```

No output means all three are free. (macOS: `lsof -i :5432 -i :8000 -i :5173`)

## Final test

```powershell
powershell -ExecutionPolicy Bypass -File local-hosting\start_demo.ps1
```

The browser should open http://localhost:5173 showing the dashboard with **8,325 visits, 5,469 students served and 109,811 lb** distributed, and three tabs: Dashboard, Upload data and Testing. Then stop everything with `Ctrl+C` and `docker compose down`.

## Summary checklist

- [ ] `git --version` works
- [ ] `wsl --status` shows WSL 2 (Windows)
- [ ] `docker compose version` works and Docker Desktop shows "Engine running"
- [ ] `node -v` is 20 or newer
- [ ] Repo cloned and on `Anees-feature/local-hosting`
- [ ] `docker compose build` and `npm install` finished
- [ ] Ports 5432, 8000, 5173 free
- [ ] Start script opens the dashboard with 8,325 visits
