# ShopVerse localhost deploy (no Docker needed)
# Usage:  .\start.ps1   |   .\stop.ps1
$ErrorActionPreference = "Stop"

$root = Split-Path -Parent $MyInvocation.MyCommand.Path
$py = Join-Path $root ".venv\Scripts\python.exe"
$npm = (Get-Command npm.cmd -ErrorAction SilentlyContinue).Source

if (-not (Test-Path $py)) { Write-Error "venv not found. Run: python -m venv .venv ; .venv\Scripts\pip install -r backend\requirements.txt" }
if (-not $npm) { Write-Error "npm not found" }

function New-Background($id, $cmd, $argList, $workdir, $log) {
  $proc = Start-Process -FilePath $cmd -ArgumentList $argList -WorkingDirectory $workdir -WindowStyle Hidden -PassThru -RedirectStandardOutput $log -RedirectStandardError "$log.err"
  Set-Content -Path (Join-Path $root ".sv-$id.pid") -Value $proc.Id
  Write-Host "[$id] started (pid $($proc.Id), log: $log)"
}

# backend: uvicorn on :8001 (SQLite by default, seeded on startup)
New-Background "backend" $py @("-m", "uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8001") (Join-Path $root "backend") (Join-Path $root "backend-server.log")

# frontend: production preview on :8080 (proxies /api -> :8000)
New-Background "frontend" $npm @("run", "preview") (Join-Path $root "frontend") (Join-Path $root "frontend-server.log")

Start-Sleep -Seconds 3
Write-Host ""
Write-Host "ShopVerse is running:"
Write-Host "  Store:      http://localhost:8080"
Write-Host "  API docs:   http://localhost:8001/docs"
Write-Host "  Admin:      http://localhost:8080/admin  (admin@shopverse.com / admin123)"
Write-Host "Stop with:   .\stop.ps1"