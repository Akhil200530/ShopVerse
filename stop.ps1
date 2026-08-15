# Stops ShopVerse localhost processes started by .\start.ps1
$root = Split-Path -Parent $MyInvocation.MyCommand.Path

foreach ($id in @("backend", "frontend")) {
  $pidFile = Join-Path $root ".sv-$id.pid"
  if (Test-Path $pidFile) {
    $procId = Get-Content $pidFile
    $proc = Get-Process -Id $procId -ErrorAction SilentlyContinue
    if ($proc) {
      Stop-Process -Id $procId -Force -ErrorAction SilentlyContinue
      Write-Host "[$id] stopped (pid $procId)"
    } else {
      Write-Host "[$id] not running"
    }
    Remove-Item $pidFile -Force
  }
}