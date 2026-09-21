# Smoke test: full HTTP round-trip via local dev server with staging DB.
# Workflow:
#   1. Load cred into env.
#   2. Move .env aside (production-targeting) — verified by SHA256 hash pre/post.
#   3. Kill any leftover next dev / node processes.
#   4. Start next dev with staging DATABASE_URL exported via process env.
#   5. Wait for "Ready", then send a smoke POST.
#   6. Stop server.
#   7. Restore .env, verify hash preserved.
$ErrorActionPreference = 'Continue'
& (Join-Path $PSScriptRoot 'load_cre.ps1') *>&1 | Out-Null

$repoRoot = (Resolve-Path (Join-Path $PSScriptRoot '..\..\..\..')).Path
$envFile  = Join-Path $repoRoot '.env'
$disabled = Join-Path $repoRoot '.env.disabled-preflight'
$writer   = [Environment]::GetEnvironmentVariable('STAGING_WRITER_URL')
$admin   = [Environment]::GetEnvironmentVariable('STAGING_ADMIN_URL')

if (Test-Path -LiteralPath $disabled) { throw "REFUSE: .env.disabled-preflight already present; restore manually first" }

# Kill any process holding port 3000 (don't kill this smoke process itself).
$self = $PID
$portProc = Get-NetTCPConnection -LocalPort 3000 -ErrorAction SilentlyContinue | Select-Object -First 1
if ($portProc -and $portProc.OwningProcess -ne $self) {
  Write-Output "[port] killing pid=$($portProc.OwningProcess) holding port 3000"
  Stop-Process -Id $portProc.OwningProcess -Force -ErrorAction SilentlyContinue
  Start-Sleep -Seconds 2
}
# Kill any leftover next dev node processes.
Get-Process -Name 'node' -ErrorAction SilentlyContinue | ForEach-Object {
  if ($_.Id -ne $self -and $_.CommandLine -match 'next') {
    Write-Output "[kill] stopping leftover next dev pid=$($_.Id)"
    Stop-Process -Id $_.Id -Force -ErrorAction SilentlyContinue
  }
}
Start-Sleep -Seconds 2

$preHash = (Get-FileHash -LiteralPath $envFile -Algorithm SHA256).Hash
Move-Item -LiteralPath $envFile -Destination $disabled -Force

$serverJob = $null
try {
  $env:DATABASE_URL = $writer
  $env:DATABASE_URL_ADMIN = $admin

  $nextCmd = Join-Path $repoRoot 'node_modules\.bin\next.cmd'
  if (-not (Test-Path -LiteralPath $nextCmd)) { throw "next.cmd not found at $nextCmd" }

  $serverJob = Start-Process -FilePath $nextCmd -ArgumentList 'dev','-p','3000' -WorkingDirectory $repoRoot -PassThru -NoNewWindow `
    -RedirectStandardOutput (Join-Path $PSScriptRoot 'dev-server-out.txt') `
    -RedirectStandardError (Join-Path $PSScriptRoot 'dev-server-err.txt')

  Write-Output "[server] started pid=$($serverJob.Id), waiting up to 40s for 'Ready'..."
  $ready = $false
  for ($i = 0; $i -lt 40; $i++) {
    Start-Sleep -Seconds 1
    if ($serverJob.HasExited) {
      Write-Output "[server] EXITED early, exit=$($serverJob.ExitCode)"
      break
    }
    $readyOut = Get-Content -LiteralPath (Join-Path $PSScriptRoot 'dev-server-out.txt') -Raw -ErrorAction SilentlyContinue
    if ($readyOut -and $readyOut -match 'Ready') { $ready = $true; Write-Output "[server] Ready"; break }
  }
  if (-not $ready) {
    Write-Output "[server] NOT Ready after 40s; tail of out:"
    Get-Content -LiteralPath (Join-Path $PSScriptRoot 'dev-server-out.txt') -ErrorAction SilentlyContinue | Select-Object -Last 20
    throw "dev server failed to become Ready"
  }

  # Allow route to compile.
  Start-Sleep -Seconds 3

  # Smoke test 1: NO cookie (anonymous, no attribution). Valid body shape.
  $smokeUrl = 'http://localhost:3000/api/public/intake'
  $smokeBody = @{
    fullName       = 'Smoke Test No Cookie'
    phone          = '0935000001'
    consent        = $true
    consentAt      = (Get-Date).ToUniversalTime().ToString('o')
    intent         = 'GENERAL_INTEREST'
    jobOpeningId   = $null
    projectId      = $null
    idempotencyKey = [guid]::NewGuid().ToString()
  } | ConvertTo-Json -Compress
  Write-Output "[smoke 1] POST $smokeUrl (no cookie)"
  $headers1 = @{
    'Content-Type'     = 'application/json'
    'Idempotency-Key'  = [guid]::NewGuid().ToString()
  }
  try {
    $r1 = Invoke-WebRequest -Uri $smokeUrl -Method POST -Body $smokeBody -Headers $headers1 -TimeoutSec 30 -UseBasicParsing -ErrorAction Continue
    Write-Output "[smoke 1] status=$($r1.StatusCode)"
    Write-Output "[smoke 1] body=$($r1.Content.Substring(0, [Math]::Min(400, $r1.Content.Length)))"
  } catch {
    Write-Output "[smoke 1] error: $($_.Exception.Message)"
  }

  # Smoke test 2: FORGED cookie.
  $forgedHeaders = @{
    'Content-Type'     = 'application/json'
    'Cookie'           = 'hrp_aff=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJhZmZDb2RlIjoiVEVTVCIsImxvY2F0aW9uIjoiaG9jaG1pbWkiLCJpYXQiOjE3MzAwMDAwMDAsImV4cCI6MjAwMDAwMDAwMH0.deadbeef_forged_signature_not_valid'
    'Idempotency-Key'  = [guid]::NewGuid().ToString()
  }
  $smokeBody2 = @{
    fullName       = 'Smoke Test Forged Cookie'
    phone          = '0935000002'
    consent        = $true
    consentAt      = (Get-Date).ToUniversalTime().ToString('o')
    intent         = 'GENERAL_INTEREST'
    jobOpeningId   = $null
    projectId      = $null
    idempotencyKey = [guid]::NewGuid().ToString()
  } | ConvertTo-Json -Compress
  Write-Output "[smoke 2] POST $smokeUrl (FORGED cookie)"
  try {
    $r2 = Invoke-WebRequest -Uri $smokeUrl -Method POST -Body $smokeBody2 -Headers $forgedHeaders -TimeoutSec 30 -UseBasicParsing -ErrorAction Continue
    Write-Output "[smoke 2] status=$($r2.StatusCode)"
    Write-Output "[smoke 2] body=$($r2.Content.Substring(0, [Math]::Min(400, $r2.Content.Length)))"
  } catch {
    Write-Output "[smoke 2] error: $($_.Exception.Message)"
  }

} finally {
  # Stop server.
  if ($serverJob -and -not $serverJob.HasExited) {
    Write-Output "[server] stopping pid=$($serverJob.Id)"
    Stop-Process -Id $serverJob.Id -Force -ErrorAction SilentlyContinue
    Start-Sleep -Seconds 2
    if (-not $serverJob.HasExited) { Stop-Process -Id $serverJob.Id -Force -ErrorAction SilentlyContinue }
  }
  # Restore .env.
  Move-Item -LiteralPath $disabled -Destination $envFile -Force
}

$postHash = (Get-FileHash -LiteralPath $envFile -Algorithm SHA256).Hash
if ($postHash -ne $preHash) { throw ".env hash changed post=$postHash pre=$preHash" }
Write-Output "[done] .env hash preserved"
