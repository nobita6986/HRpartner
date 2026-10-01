#!/usr/bin/env pwsh
# Orchestrate ONE P1 final runtime E2E run end-to-end, capturing evidence.
# Run from the clean worktree root.

param(
  [Parameter(Mandatory = $true)][int]$RunNumber,
  [Parameter(Mandatory = $true)][string]$EvidenceDir
)

$ErrorActionPreference = 'Stop'

$wt = 'C:\CodeApp\HrP-t1c-p1-final-release-safety-closeout'

Write-Host "=== P1 final runtime E2E — Run $RunNumber ===" -ForegroundColor Cyan

# Provision creds.
$secureLines = Get-Content -LiteralPath 'C:\cre_hrp.txt'
$env:HRP_RUNTIME_E2E_AUTHORIZED        = '1'
$env:HRP_RUNTIME_E2E_ADMIN_DATABASE_URL = $secureLines[0].Trim()
$env:HRP_RUNTIME_E2E_WRITER_DATABASE_URL = $secureLines[2].Trim()

$runLog = Join-Path $EvidenceDir ("run-$RunNumber.log")
$stamp = (Get-Date).ToUniversalTime().ToString('yyyy-MM-ddTHH:mm:ssZ')

function Run-Logged {
  param([string]$Title, [string]$Cmd)
  Write-Host "`n--- $Title ---" -ForegroundColor Yellow
  Write-Host "[$stamp] $Cmd" | Out-File -FilePath $runLog -Append -Encoding utf8NoBOM
  $out = & pwsh -NoProfile -Command "cd '$wt'; $cmd" 2>&1
  $out | Out-File -FilePath $runLog -Append -Encoding utf8NoBOM
  return $LASTEXITCODE
}

# 1) Integration posture preflight.
$rc = Run-Logged '(posture)' "node scripts/runtime/db-posture-preflight.mjs"
if ($rc -ne 0) {
  Write-Host "[FAIL] posture preflight exited $rc" -ForegroundColor Red
  Remove-Item Env:\HRP_RUNTIME_E2E_AUTHORIZED -ErrorAction SilentlyContinue
  Remove-Item Env:\HRP_RUNTIME_E2E_ADMIN_DATABASE_URL -ErrorAction SilentlyContinue
  Remove-Item Env:\HRP_RUNTIME_E2E_WRITER_DATABASE_URL -ErrorAction SilentlyContinue
  exit $rc
}

# 2) Bootstrap synthetic fixture.
$fixtureLog = Join-Path $EvidenceDir ("run-$RunNumber-fixture.json")
$rc = Run-Logged '(fixture)' "node scripts/runtime/synthetic-fixture.mjs > '$fixtureLog'"
if ($rc -ne 0) {
  Write-Host "[FAIL] fixture bootstrap exited $rc" -ForegroundColor Red
  Remove-Item Env:\HRP_RUNTIME_E2E_AUTHORIZED -ErrorAction SilentlyContinue
  Remove-Item Env:\HRP_RUNTIME_E2E_ADMIN_DATABASE_URL -ErrorAction SilentlyContinue
  Remove-Item Env:\HRP_RUNTIME_E2E_WRITER_DATABASE_URL -ErrorAction SilentlyContinue
  exit $rc
}

# Read fixture file path from JSON.
$fixtureInfo = Get-Content -Raw $fixtureLog | ConvertFrom-Json
$fixturePath = $fixtureInfo.fixtureFile
Write-Host "[info] fixture path = $fixturePath" -ForegroundColor Green
"fixtureFile=$fixturePath" | Out-File -FilePath $runLog -Append -Encoding utf8NoBOM

# 3) Canonical runtime UI/HTTP E2E.
$rc = Run-Logged '(e2e)' "node scripts/runtime/p1-final-runtime-e2e.mjs '$fixturePath'"
$e2eExitCode = $rc
if ($rc -ne 0) {
  Write-Host "[FAIL] e2e exited $rc (continuing to teardown for zero-residue)" -ForegroundColor Red
}

# 4) Exact-ID reverse-FK teardown + zero-residue assertion.
$rc = Run-Logged '(teardown)' "node scripts/runtime/exact-id-teardown.mjs '$fixturePath'"
$teardownExitCode = $rc
if ($rc -ne 0) {
  Write-Host "[FAIL] teardown exited $rc" -ForegroundColor Red
}

# Cleanup env.
Remove-Item Env:\HRP_RUNTIME_E2E_AUTHORIZED -ErrorAction SilentlyContinue
Remove-Item Env:\HRP_RUNTIME_E2E_ADMIN_DATABASE_URL -ErrorAction SilentlyContinue
Remove-Item Env:\HRP_RUNTIME_E2E_WRITER_DATABASE_URL -ErrorAction SilentlyContinue

if ($e2eExitCode -eq 0 -and $teardownExitCode -eq 0) {
  Write-Host "`n[OK] Run $RunNumber COMPLETE — posture OK / e2e OK / teardown OK / zero-residue OK" -ForegroundColor Green
  exit 0
} else {
  Write-Host "`n[FAIL] Run $RunNumber — e2eExit=$e2eExitCode teardownExit=$teardownExitCode" -ForegroundColor Red
  exit 1
}