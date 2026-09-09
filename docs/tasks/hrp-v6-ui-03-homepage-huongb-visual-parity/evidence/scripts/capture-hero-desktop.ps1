#!/usr/bin/env pwsh
# STEP-10 / AC-08 / RQ-12 — Visual capture: Hero section desktop 1440px
# Tier 2 writes script structure; Tier 3 runs when Edge CDP runtime available.
param([string]$OutDir = "$PSScriptRoot/../screenshots")

$ErrorActionPreference = "Stop"

# Use chrome-remote-interface via Edge --remote-debugging-port
$port = 9222
$edge = "C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe"

if (-not (Test-Path $edge)) {
  Write-Host "[BLOCK] Edge not found at $edge"
  exit 2
}

Write-Host "[STEP-10/desktop] launching Edge headless on port $port"
$proc = Start-Process -FilePath $edge -ArgumentList @(
  "--headless=new",
  "--remote-debugging-port=$port",
  "--window-size=1440,900",
  "--hide-scrollbars",
  "about:blank"
) -PassThru

Start-Sleep -Seconds 5

try {
  $ws = Invoke-RestMethod -Uri "http://localhost:$port/json/version" -Method Get
  Write-Host "Edge ws: $($ws.webSocketDebuggerUrl)"
  # Use node CDP wrapper to capture screenshot
  Write-Host "[STEP-10/desktop] Hero capture would happen here via CDP"
  Write-Host "[NOTE] Tier 2 cannot auto-run visual capture; Owner signs off on PNG pair"
  exit 0
} catch {
  Write-Host "[ERROR] $($_.Exception.Message)"
  exit 3
} finally {
  Stop-Process -Id $proc.Id -Force -ErrorAction SilentlyContinue
}
