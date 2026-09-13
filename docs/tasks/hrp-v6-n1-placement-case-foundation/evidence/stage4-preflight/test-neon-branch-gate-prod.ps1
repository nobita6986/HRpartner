# test-neon-branch-gate-prod.ps1 -- Tier 1 self-test for neon_branch_gate_prod.ps1
#
# Purpose: prove the prod gate exits with the correct code in 5 scenarios:
#   1) test-pass-hrp-live    -- both URLs map to hrp-live (primary); expect 19
#                              (TEST_PASS in test mode, NOT production PASS).
#   2) test-refuse-name      -- both URLs map to hrp_mp2_test; gate hardcodes
#                              hrp-live so we expect 16 (case-sensitive name
#                              mismatch). Proves override is dead.
#   3) test-refuse-empty     -- URL points to an endpoint-id that does NOT
#                              exist in any branch; expect 12.
#   4) test-wrong-branch     -- DATABASE_URL_ADMIN points to hrp-live but
#                              DATABASE_URL points to hrp_mp2_test (or vice
#                              versa). Gate must refuse with 13 BEFORE hitting
#                              the API. Proves the gate cannot be tricked
#                              into PASS when Prisma migrate deploy targets
#                              a different branch than the gate's URLs.
#   5) prod-mock-without-testmode -- run prod gate WITHOUT -TestMode and
#                              with NEON_API_BASE set to a fake server.
#                              Expect 17. Proves that production deploys
#                              cannot be spoofed via a fake API server.
#                              The fake API in this scenario is intentionally
#                              set up so that, if the gate had no mock guard,
#                              it would return 0. With the guard it returns 17.
#
# Plus one safety check:
#   6) test-hrp-live-url-only -- only HRP_LIVE_URL_* set (no DATABASE_URL*).
#                              Gate refuses 10 (no fallback to HRP_LIVE_URL_*).
#                              Even with -TestMode the gate refuses because
#                              gate logic does NOT read HRP_LIVE_URL_* at all.
#                              Test mode does not enable fallback env vars.
#
# Run:
#   powershell -File docs/tasks/hrp-v6-n1-placement-case-foundation/evidence/stage4-preflight/test-neon-branch-gate-prod.ps1
#
# Exit code: 0 if all scenarios behave as expected, 1 otherwise.

param(
  [string]$EvidenceDir = 'docs/tasks/hrp-v6-n1-placement-case-foundation/evidence/stage4-preflight'
)

$ErrorActionPreference = 'Continue'

$RepoRoot = (git rev-parse --show-toplevel).Trim()
$EvidenceDirAbs = Join-Path $RepoRoot $EvidenceDir
$GateScript = Join-Path $EvidenceDirAbs 'neon_branch_gate_prod.ps1'
$FakeApi = Join-Path $EvidenceDirAbs 'fake_neon_api.js'

if (-not (Test-Path $GateScript)) { throw "Gate script not found: $GateScript" }
if (-not (Test-Path $FakeApi))    { throw "Fake API not found: $FakeApi" }

$Port = 4567 + (Get-Random -Max 100)
$results = New-Object System.Collections.Generic.List[object]

function Reset-Env {
  foreach ($k in @('NEON_API_KEY','NEON_PROJECT_ID','NEON_API_BASE','NEON_ALLOW_MOCK_API',
                   'DATABASE_URL','DATABASE_URL_ADMIN',
                   'HRP_LIVE_URL_ADMIN','HRP_LIVE_URL_WRITER',
                   'NEON_EXPECTED_BRANCH_NAME',
                   'TEST_DATABASE_URL_ADMIN','TEST_DATABASE_URL_WRITER')) {
    Remove-Item "Env:\$k" -ErrorAction SilentlyContinue
  }
}

function Run-Scenario(
  [string]$Name,
  [string]$Scenario,
  [string]$Url1,
  [string]$Url2,
  [int]$ExpectedExit,
  [switch]$TestMode,
  [switch]$StartFakeApi,
  [switch]$OnlyHrpLiveFallback
) {
  Write-Host "=== Scenario: $Name (expect exit=$ExpectedExit) ===" -ForegroundColor Cyan

  if ($StartFakeApi) {
    $api = Start-Process -FilePath 'node' -ArgumentList $FakeApi,'--scenario',$Scenario,'--port',"$Port" -PassThru -NoNewWindow -RedirectStandardOutput "$EvidenceDirAbs/fake-api-$Name.stdout.log" -RedirectStandardError "$EvidenceDirAbs/fake-api-$Name.stderr.log"
    Start-Sleep -Milliseconds 800
  }

  Reset-Env

  $env:NEON_API_KEY = 'fake-key'
  $env:NEON_PROJECT_ID = 'proj-test-001'
  if ($StartFakeApi -or $TestMode) {
    $env:NEON_API_BASE = "http://127.0.0.1:$Port"
  }
  if ($OnlyHrpLiveFallback) {
    # Set ONLY HRP_LIVE_URL_* -- the old names. Production gate must NOT
    # accept these as fallback.
    $env:HRP_LIVE_URL_ADMIN = $Url1
    $env:HRP_LIVE_URL_WRITER = $Url2
  } else {
    $env:DATABASE_URL_ADMIN = $Url1
    $env:DATABASE_URL        = $Url2
  }

  $stdoutFile = "$EvidenceDirAbs/gate-$Name.stdout.log"
  $stderrFile = "$EvidenceDirAbs/gate-$Name.stderr.log"
  Remove-Item $stdoutFile,$stderrFile -ErrorAction SilentlyContinue

  $gateArgs = @('-NoProfile','-ExecutionPolicy','Bypass','-File',$GateScript)
  if ($TestMode) { $gateArgs += '-TestMode' }

  & powershell @gateArgs 1> $stdoutFile 2> $stderrFile
  $exitCode = $LASTEXITCODE

  if ($StartFakeApi) {
    Stop-Process -Id $api.Id -Force -ErrorAction SilentlyContinue
    Start-Sleep -Milliseconds 200
  }

  $ok = ($exitCode -eq $ExpectedExit)
  $stdoutLast = if (Test-Path $stdoutFile) { (Get-Content $stdoutFile -Tail 1 -ErrorAction SilentlyContinue) } else { '' }
  $stdoutLastStr = if ($stdoutLast -is [array]) { ($stdoutLast -join "`n") } elseif ($null -eq $stdoutLast) { '' } else { [string]$stdoutLast }
  $stderrLast = if (Test-Path $stderrFile) { (Get-Content $stderrFile -Tail 1 -ErrorAction SilentlyContinue) } else { '' }
  $stderrLastStr = if ($stderrLast -is [array]) { ($stderrLast -join "`n") } elseif ($null -eq $stderrLast) { '' } else { [string]$stderrLast }
  $results.Add([pscustomobject]@{
    scenario      = $Name
    expected_exit = $ExpectedExit
    actual_exit   = $exitCode
    pass          = $ok
    stdout_tail   = $stdoutLastStr
    stderr_tail   = $stderrLastStr
  }) | Out-Null

  Write-Host "  expected=$ExpectedExit actual=$exitCode pass=$ok"
}

# Endpoint hostnames
$hrpLiveEp = 'ep-shy-tree-az32as2c'
$hrpMp2Ep  = 'ep-empty-forest-azlhfyo9'

$hrpLiveUrl = "postgres://neondb_owner:secret@${hrpLiveEp}.ap-southeast-1.aws.neon.tech/neondb?sslmode=require"
$hrpMp2Url  = "postgres://neondb_owner:secret@${hrpMp2Ep}.ap-southeast-1.aws.neon.tech/neondb?sslmode=require"
$bogusUrl   = 'postgres://neondb_owner:secret@ep-nope-nope-nope.ap-southeast-1.aws.neon.tech/neondb?sslmode=require'

# Case 1: TEST_PASS -- both URLs map to hrp-live. Test mode -> exit 19 (NOT 0).
Run-Scenario 'test-pass-hrp-live' 'pass-hrp-live' $hrpLiveUrl $hrpLiveUrl 19 -TestMode -StartFakeApi

# Case 2: REFUSE -- both URLs map to hrp_mp2_test; gate hardcodes hrp-live.
Run-Scenario 'test-refuse-name' 'pass-hrp-mp2' $hrpMp2Url $hrpMp2Url 16 -TestMode -StartFakeApi

# Case 3: REFUSE -- URL points to a non-existent endpoint-id.
Run-Scenario 'test-refuse-empty' 'pass-hrp-live' $bogusUrl $bogusUrl 12 -TestMode -StartFakeApi

# Case 4: REFUSE -- DATABASE_URL_ADMIN and DATABASE_URL disagree on branch.
Run-Scenario 'test-wrong-branch' 'wrong-branch' $hrpLiveUrl $hrpMp2Url 13 -TestMode -StartFakeApi

# Case 5: PRODUCTION mode with mock API base, no -TestMode. Fake API would
# return PASS data if the gate had no guard. Expect 17.
Run-Scenario 'prod-mock-without-testmode' 'pass-hrp-live' $hrpLiveUrl $hrpLiveUrl 17 -StartFakeApi

# Case 6: Only HRP_LIVE_URL_* set, no DATABASE_URL*. Gate must refuse 10
# (no fallback to HRP_LIVE_URL_*). Even with -TestMode the gate refuses
# because gate logic does NOT read HRP_LIVE_URL_* at all.
Run-Scenario 'test-hrp-live-url-only' 'pass-hrp-live' $hrpLiveUrl $hrpLiveUrl 10 -TestMode -StartFakeApi -OnlyHrpLiveFallback

$summary = [pscustomobject]@{
  gate_script  = 'neon_branch_gate_prod.ps1'
  tested_at    = (Get-Date -Format 'o')
  node_version = (node --version)
  pwsh_version = ($PSVersionTable.PSVersion.ToString())
  results      = $results
  all_pass     = ($results | Where-Object { -not $_.pass }).Count -eq 0
}
$summaryFile = Join-Path $EvidenceDirAbs 'gate-prod-test-summary.json'
$summary | ConvertTo-Json -Depth 6 | Out-File -FilePath $summaryFile -Encoding utf8
Write-Host "Summary written to $summaryFile"

if ($summary.all_pass) {
  Write-Host "ALL SCENARIOS PASS" -ForegroundColor Green
  exit 0
} else {
  Write-Host "ONE OR MORE SCENARIOS FAILED" -ForegroundColor Red
  exit 1
}
