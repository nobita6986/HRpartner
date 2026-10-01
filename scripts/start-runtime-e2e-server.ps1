#!/usr/bin/env pwsh
# Start Next.js server in background for runtime E2E.
# NODE_ENV=development + RATE_LIMIT_BYPASS=1 allow synthetic local E2E.
$ErrorActionPreference = 'Stop'
$root = 'C:\CodeApp\HrP-t1c-p1a05-runtime-e2e-r2'
Set-Location $root
$env:NODE_ENV = 'development'
$env:VERCEL_ENV = 'production'
$env:RATE_LIMIT_BYPASS = '1'
# Load .env into current process
Get-Content .env | ForEach-Object {
  if ($_ -match '^\s*#') { return }
  if ($_ -match '^\s*$') { return }
  $kv = $_ -split '=', 2
  $k = $kv[0].Trim()
  $v = $kv[1].Trim().Trim('"').Trim("'")
  Set-Item -Path "Env:$k" -Value $v
}
$logPath = Join-Path $root 'runtime-e2e-server.log'
$proc = Start-Process -FilePath 'npx.cmd' `
  -ArgumentList 'next', 'start', '-p', '3100' `
  -WorkingDirectory $root `
  -RedirectStandardOutput $logPath `
  -RedirectStandardError "$logPath.err" `
  -PassThru -NoNewWindow
Write-Output "[start] pid=$($proc.Id) log=$logPath"