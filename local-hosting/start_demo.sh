#!/usr/bin/env bash
# Starts the whole app for a live demo: containers, sample data, website.
# Run from anywhere (Git Bash on Windows, or macOS/Linux):
#   bash local-hosting/start_demo.sh
# Add --keep-data to skip resetting the database to the sample year.
# Also creates (or restores) the demo accounts admin, staff and dean.
set -euo pipefail

cd "$(dirname "$0")/.."
REPO_ROOT="$(pwd)"
KEEP_DATA=false
[ "${1:-}" = "--keep-data" ] && KEEP_DATA=true

step() { printf '\n==> %s\n' "$1"; }
fail() { printf '\nERROR: %s\n' "$1" >&2; exit 1; }

step "Checking required tools"
for tool in docker node npm curl; do
  command -v "$tool" >/dev/null 2>&1 || fail "$tool is not installed or not on PATH. See local-hosting/LAPTOP_SETUP.md."
done

step "Checking that Docker is running"
if ! docker info >/dev/null 2>&1; then
  if [ -f "/c/Program Files/Docker/Docker/Docker Desktop.exe" ]; then
    echo "Starting Docker Desktop..."
    "/c/Program Files/Docker/Docker/Docker Desktop.exe" >/dev/null 2>&1 &
  elif [ "$(uname)" = "Darwin" ]; then
    echo "Starting Docker Desktop..."
    open -a Docker
  else
    fail "Docker is not running. Start Docker Desktop and run this script again."
  fi
  for _ in $(seq 60); do
    docker info >/dev/null 2>&1 && break
    sleep 3
  done
  docker info >/dev/null 2>&1 || fail "Docker did not start within 3 minutes. Open Docker Desktop, wait for 'Engine running', then rerun."
fi

step "Building and starting the db and backend containers"
docker compose up -d --build

step "Waiting for the API at http://localhost:8000"
for _ in $(seq 60); do
  curl -sf http://localhost:8000/health >/dev/null && break
  sleep 2
done
curl -sf http://localhost:8000/health >/dev/null || fail "The API did not answer. Check: docker compose logs backend"

step "Creating the demo accounts (admin, staff, dean)"
docker compose exec -T backend python -m app.demo_users || fail "Could not create the demo accounts."

if [ "$KEEP_DATA" = true ]; then
  step "Keeping the existing data (--keep-data)"
else
  step "Resetting the database to the 52 sample weeks"
  # Resetting is admin-only, so sign in as the demo admin first.
  COOKIES="$(mktemp)"
  trap 'rm -f "$COOKIES"' EXIT
  curl -sf -c "$COOKIES" -o /dev/null http://localhost:8000/auth/login \
    -H "Content-Type: application/json" -d '{"username": "admin", "password": "demo-admin-pass"}' \
    || fail "Could not sign in as the demo admin."
  curl -sf -b "$COOKIES" -X POST http://localhost:8000/testing/reset \
    -H "Content-Type: application/json" -d '{"load_sample": true}' || fail "Reset failed."
  echo
fi

cd "$REPO_ROOT/frontend"
if [ ! -d node_modules ]; then
  step "Installing website dependencies (first run only)"
  npm install
fi

if curl -s -o /dev/null http://localhost:5173; then
  step "The website is already running; opening it"
  case "$(uname)" in
    Darwin) open http://localhost:5173 ;;
    Linux) xdg-open http://localhost:5173 >/dev/null 2>&1 || true ;;
    *) cmd //c start "" http://localhost:5173 ;;
  esac
  exit 0
fi

printf '\nSign in with one of the demo accounts:\n'
echo "  admin / demo-admin-pass   (everything, including Users and Testing)"
echo "  staff / demo-staff-pass   (uploads for Retriever Essentials)"
echo "  dean  / demo-dean-pass    (leadership: view only)"

step "Starting the website at http://localhost:5173 (Ctrl+C to stop)"
npm run dev -- --port 5173 --strictPort --open
