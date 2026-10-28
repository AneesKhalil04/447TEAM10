# Starts the whole app for a live demo: containers, sample data, website.
# Run from anywhere:
#   powershell -ExecutionPolicy Bypass -File local-hosting\start_demo.ps1
# Add -KeepData to skip resetting the database to the sample year.
param([switch]$KeepData)

# Native commands are checked through $LASTEXITCODE; "Stop" would treat their stderr as fatal in Windows PowerShell 5.1.
$ErrorActionPreference = "Continue"
$RepoRoot = Split-Path -Parent $PSScriptRoot
Set-Location $RepoRoot

function Step($message) { Write-Host "`n==> $message" -ForegroundColor Cyan }
function Fail($message) { Write-Host "`nERROR: $message" -ForegroundColor Red; exit 1 }

Step "Checking required tools"
foreach ($tool in "docker", "node", "npm") {
    if (-not (Get-Command $tool -ErrorAction SilentlyContinue)) {
        Fail "$tool is not installed or not on PATH. See local-hosting\LAPTOP_SETUP.md."
    }
}

Step "Checking that Docker is running"
docker info *> $null
if ($LASTEXITCODE -ne 0) {
    $desktop = Join-Path $env:ProgramFiles "Docker\Docker\Docker Desktop.exe"
    if (-not (Test-Path $desktop)) { Fail "Docker is not running. Start Docker Desktop and run this script again." }
    Write-Host "Starting Docker Desktop..."
    Start-Process $desktop
    $deadline = (Get-Date).AddMinutes(3)
    do {
        Start-Sleep -Seconds 3
        docker info *> $null
    } until ($LASTEXITCODE -eq 0 -or (Get-Date) -gt $deadline)
    if ($LASTEXITCODE -ne 0) { Fail "Docker did not start within 3 minutes. Open Docker Desktop, wait for 'Engine running', then rerun." }
}

Step "Building and starting the db and backend containers"
docker compose up -d --build
if ($LASTEXITCODE -ne 0) { Fail "docker compose up failed. See the messages above." }

Step "Waiting for the API at http://localhost:8000"
$deadline = (Get-Date).AddMinutes(2)
$ready = $false
while (-not $ready -and (Get-Date) -lt $deadline) {
    try {
        Invoke-RestMethod -Uri "http://localhost:8000/health" -TimeoutSec 3 | Out-Null
        $ready = $true
    } catch {
        Start-Sleep -Seconds 2
    }
}
if (-not $ready) { Fail "The API did not answer. Check: docker compose logs backend" }

if ($KeepData) {
    Step "Keeping the existing data (-KeepData)"
} else {
    Step "Resetting the database to the 52 sample weeks"
    try {
        $result = Invoke-RestMethod -Method Post -Uri "http://localhost:8000/testing/reset" `
            -ContentType "application/json" -Body '{"load_sample": true}'
    } catch {
        Fail "Reset failed: $($_.Exception.Message)"
    }
    Write-Host "Loaded $($result.loaded_rows) weeks."
}

Set-Location (Join-Path $RepoRoot "frontend")
if (-not (Test-Path "node_modules")) {
    Step "Installing website dependencies (first run only)"
    npm install
    if ($LASTEXITCODE -ne 0) { Fail "npm install failed. See the messages above." }
}

if (Get-NetTCPConnection -LocalPort 5173 -State Listen -ErrorAction SilentlyContinue) {
    Step "The website is already running; opening it"
    Start-Process "http://localhost:5173"
    exit 0
}

Step "Starting the website at http://localhost:5173 (Ctrl+C to stop)"
npm run dev -- --port 5173 --strictPort --open
