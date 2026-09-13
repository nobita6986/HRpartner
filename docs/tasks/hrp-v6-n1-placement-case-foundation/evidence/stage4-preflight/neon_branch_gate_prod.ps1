# neon_branch_gate_prod.ps1 -- N1 Stage 4 production gate (hrp-live)
#
# Purpose: BEFORE STEP 3 (prisma migrate deploy) on `hrp-live`, this
# script queries Neon's control plane and confirms that BOTH
# endpoint-ids (admin/writer) belong to the SAME branch whose name
# is EXACTLY "hrp-live" (case-sensitive, 8 chars).
#
# This is the production counterpart of neon_branch_gate.ps1 (which is
# for the test branch hrp_mp2_test). The two scripts differ:
#
#   Test gate (neon_branch_gate.ps1):
#     - NEON_EXPECTED_BRANCH_NAME default = "hrp_mp2_test"
#     - REJECTS primary branch (exit 14) -- test branch must be non-primary
#
#   Prod gate (THIS script):
#     - Branch name is HARD-CODED to "hrp-live" (no env override).
#     - Reads ONLY env vars that match prisma/schema.prisma:
#         DATABASE_URL_ADMIN    (directUrl -- what Prisma CLI/migration uses
#                                to open a non-pooled connection to apply DDL)
#         DATABASE_URL          (writer URL -- runtime/CLI default)
#       NO fallback to HRP_LIVE_URL_* (would allow gate to read one URL
#       while Prisma migrate deploy reads a different URL, defeating
#       the gate's purpose).
#     - NO -Url1/-Url2 parameters (would let the operator bypass env
#       mismatch by passing URLs on the command line).
#     - Mock Neon API (NEON_API_BASE) is ONLY accepted when -TestMode
#       switch is passed, AND in test mode the gate NEVER emits the
#       production deploy signal `gate=PASS` with exit 0. Test mode
#       emits `gate=TEST_PASS` with exit 19 instead. This prevents
#       an operator from running `pwsh gate.ps1 -TestMode` and
#       having a deploy script interpret exit 0 as "ready to deploy".
#     - DOES NOT reject primary -- hrp-live MAY BE primary branch.
#     - Case-sensitive exact match on branch name (hrp-live is 8 chars).
#
# Exit codes:
#   0  -> PRODUCTION PREFLIGHT PASS. Real Neon API was queried, both
#         endpoint-ids from DATABASE_URL_ADMIN / DATABASE_URL map to
#         the SAME branch of NEON_PROJECT_ID, AND that branch's name
#         is EXACTLY "hrp-live" (case-sensitive).
#         Operator may proceed to STEP 3 (prisma migrate deploy).
#         This exit code is ONLY emitted when no test mode flag is
#         active and NEON_API_BASE is not overridden.
#   10 -> DATABASE_URL or DATABASE_URL_ADMIN or NEON_API_KEY or
#         NEON_PROJECT_ID not set. HARD STOP on a real prod run.
#   11 -> HTTP error fetching branches or endpoints.
#   12 -> endpoint-id not found in any branch of NEON_PROJECT_ID
#         (URL points at a different Neon project entirely).
#   13 -> DATABASE_URL_ADMIN and DATABASE_URL point to DIFFERENT
#         endpoint-ids (i.e. two different branches of the same
#         project). Refuse BEFORE hitting the API.
#   16 -> branch name != "hrp-live" (case-sensitive EXACT match failed).
#   17 -> Mock API base (NEON_API_BASE) was provided WITHOUT -TestMode
#         switch. Production gate refuses to use any URL other than
#         the real Neon API.
#   19 -> TEST PASS. -TestMode (and/or NEON_ALLOW_MOCK_API=1) is
#         active. The gate's logic ran end-to-end and the URLs would
#         have produced a production PASS, but this is NOT a
#         production preflight. Deploy scripts must NOT treat
#         exit 19 as deploy-ready.
#
# Audit reference:
#   - Test gate: docs/tasks/hrp-v6-n1-placement-case-foundation/evidence/
#     stage3-self-test/neon_branch_gate.ps1 (commit 03fecc2 batch 5)
#   - Dossier: docs/investigations/n1-stage4-readonly-prod-state-check-2026-09-13/
#     DOSSIER.md section 4

[CmdletBinding()]
param(
  # No -Url1 / -Url2 parameters. Gate reads ONLY env vars matching
  # prisma/schema.prisma (DATABASE_URL, DATABASE_URL_ADMIN). Allowing
  # command-line URL overrides would let the operator pass different
  # URLs to the gate than the URLs Prisma migrate deploy will use.
  [switch]$TestMode
)

# HARDCODED branch name for production gate. Production deploys MUST
# target hrp-live; override via env would defeat the gate's purpose.
$ExpectedBranchName = 'hrp-live'

# $ErrorActionPreference must stay 'Continue' so explicit `exit N` codes
# are preserved (audit fix from test gate round 5).
$ErrorActionPreference = 'Continue'

function Refuse([int]$code, [string]$message) {
  [Console]::Error.WriteLine($message)
  exit $code
}

# ----- guards -----
if (-not $env:NEON_API_KEY)         { Refuse 10 'NEON_API_KEY is not set. On a real hrp-live run, request Tier 0 to supply credentials via the secure channel.' }
if (-not $env:NEON_PROJECT_ID)      { Refuse 10 'NEON_PROJECT_ID is not set. On a real hrp-live run, request Tier 0 to supply credentials via the secure channel.' }

# Gate reads ONLY DATABASE_URL_ADMIN and DATABASE_URL -- matching what
# prisma/schema.prisma reads (directUrl = DATABASE_URL_ADMIN, url =
# DATABASE_URL). NO fallback to HRP_LIVE_URL_*: that fallback would
# let the gate read one set of URLs while Prisma migrate deploy reads
# another, defeating the purpose of the gate.
if (-not $env:DATABASE_URL_ADMIN) {
  Refuse 10 'DATABASE_URL_ADMIN is not set. Production gate requires this env var to match prisma/schema.prisma (directUrl).'
}
if (-not $env:DATABASE_URL) {
  Refuse 10 'DATABASE_URL is not set. Production gate requires this env var to match prisma/schema.prisma (url).'
}

$Url1 = $env:DATABASE_URL_ADMIN
$Url2 = $env:DATABASE_URL

# ----- mock API guard -----
# A mock Neon API may ONLY be used when -TestMode switch is passed.
# NEON_ALLOW_MOCK_API=1 is no longer accepted: it is a process-level
# env var that an operator could leave set from an earlier session.
# The only way to enable mock mode is the per-invocation -TestMode
# switch, which is logged in the gate output and never used by a
# production deploy script.
$mockApiRequested = $false
if ($env:NEON_API_BASE) {
  if ($TestMode) {
    $mockApiRequested = $true
  } else {
    Refuse 17 'NEON_API_BASE was set but -TestMode switch was not provided. Production gate will not use any API base other than the real Neon endpoint.'
  }
}

# In test mode, the gate runs the full logic but emits a different
# verdict and exit code so deploy scripts cannot accidentally treat
# a test-mode PASS as production PASS.
$testModeActive = [bool]$TestMode

if ($testModeActive) {
  [Console]::Error.WriteLine('NOTICE: gate running in -TestMode. Verdict will be TEST_PASS (exit 19), NOT PASS (exit 0). Production deploy scripts must not interpret exit 19 as deploy-ready.')
}
if ($mockApiRequested) {
  [Console]::Error.WriteLine('NOTICE: mock Neon API in use (NEON_API_BASE=' + $env:NEON_API_BASE + '). Production gate MUST NOT use this mode.')
}

# ----- endpoint-id extraction (mirror of probe.mjs endpointIdOf) -----
# Accept both direct (ep-<id>.<region>.aws.neon.tech) and pooler
# (ep-<id>-pooler.<region>.aws.neon.tech) hostnames. Strip the `ep-`
# prefix and the trailing `-pooler` suffix. The id may contain hyphens
# (e.g. 'shy-tree-az32as2c'); we take the full first segment.
function EndpointIdOf([string]$url) {
  $h = ([Uri]$url).Host
  if (-not $h) { return '' }
  $first = ($h.Split('.')[0])
  if (-not $first.StartsWith('ep-')) { return '' }
  $rest = $first.Substring(3)
  if ($rest.EndsWith('-pooler')) { $rest = $rest.Substring(0, $rest.Length - 7) }
  return $rest.ToLower()
}

$Ep1 = EndpointIdOf $Url1
$Ep2 = EndpointIdOf $Url2
if (-not $Ep1 -or -not $Ep2) {
  [Console]::Error.WriteLine("Could not extract endpoint-id from URL(s). url1=$Ep1 url2=$Ep2")
  exit 12
}

# Quick same-endpoint check up front -- if even the two URLs the gate is
# given disagree, refuse with code 13 BEFORE we hit the API. This
# catches the failure mode where someone configures DATABASE_URL_ADMIN
# and DATABASE_URL to point at two different branches: the gate refuses
# immediately without making a single Neon API call.
if ($Ep1 -ne $Ep2) {
  $verdict = [ordered]@{
    url1_endpoint_id      = $Ep1
    url2_endpoint_id      = $Ep2
    expected_branch_name  = $ExpectedBranchName
    same_endpoint         = $false
    same_branch           = $null
    branch_name_matches   = $null
    gate                  = 'REFUSE_admin_writer_endpoint_mismatch'
    test_mode             = $testModeActive
  }
  [Console]::Error.WriteLine("Endpoint-ids from DATABASE_URL_ADMIN and DATABASE_URL differ. Gate refuses to proceed -- Prisma migrate deploy would target only one branch, and the other URL is irrelevant or pointing elsewhere. Verdict: $($verdict | ConvertTo-Json -Compress)")
  exit 13
}

# ----- API fetch -----
$headers = @{ Authorization = "Bearer $env:NEON_API_KEY" ; 'Content-Type' = 'application/json' }
$apiBase = if ($mockApiRequested) { $env:NEON_API_BASE } else { 'https://console.neon.tech' }

try {
  $branchesResp = Invoke-RestMethod -Method Get -Uri "$apiBase/api/v2/projects/$env:NEON_PROJECT_ID/branches?limit=200" -Headers $headers -TimeoutSec 15
} catch {
  [Console]::Error.WriteLine("GET /branches failed: $($_.Exception.Message)")
  exit 11
}

$branches = @($branchesResp.branches)
$primary  = $branches | Where-Object { $_.primary -eq $true } | Select-Object -First 1

# Map endpoint-ids to branches. We only need to look up the SINGLE
# endpoint-id (since $Ep1 == $Ep2 was already verified). We still
# record branch1_id and branch2_id so the verdict shows both came
# from the same branch lookup.
$branch1 = $null
foreach ($b in $branches) {
  try {
    $epResp = Invoke-RestMethod -Method Get -Uri "$apiBase/api/v2/projects/$env:NEON_PROJECT_ID/branches/$($b.id)/endpoints?limit=50" -Headers $headers -TimeoutSec 15
  } catch { continue }
  foreach ($ep in @($epResp.endpoints)) {
    if (-not $ep.host) { continue }
    $apiEp = EndpointIdOf("https://$($ep.host)/x")
    if (-not $apiEp) { continue }
    if ($apiEp -eq $Ep1) { $branch1 = $b; break }
  }
  if ($branch1) { break }
}

if (-not $branch1) {
  $verdict = [ordered]@{
    url1_endpoint_id      = $Ep1
    url2_endpoint_id      = $Ep2
    expected_branch_name  = $ExpectedBranchName
    branch1_id            = $null
    branch1_name          = $null
    primary_branch_id     = if ($primary) { $primary.id   } else { $null }
    primary_branch_name   = if ($primary) { $primary.name } else { $null }
    same_branch           = $false
    branch_name_matches   = $false
    gate                  = 'REFUSE_endpoint_not_found'
    test_mode             = $testModeActive
  }
  [Console]::Error.WriteLine("ENDPOINT NOT FOUND in any branch of NEON_PROJECT_ID. Verdict: $($verdict | ConvertTo-Json -Compress)")
  exit 12
}

# Same endpoint-id, same branch (since $Ep1 == $Ep2 and we found the
# endpoint in one branch).
$verdict = [ordered]@{
  url1_endpoint_id      = $Ep1
  url2_endpoint_id      = $Ep2
  expected_branch_name  = $ExpectedBranchName
  branch1_id            = $branch1.id
  branch1_name          = $branch1.name
  primary_branch_id     = if ($primary) { $primary.id   } else { $null }
  primary_branch_name   = if ($primary) { $primary.name } else { $null }
  same_branch           = $true
  branch_name_matches   = ($branch1.name -ceq $ExpectedBranchName)
  gate                  = 'unknown'
  test_mode             = $testModeActive
}

# PROD gate does NOT reject primary. hrp-live MAY BE primary by
# design (production Neon plans typically mark hrp-live as primary).
# If hrp-live happens to be non-primary (e.g. another branch was
# promoted), that is still PASS as long as name matches exactly.

# CASE-SENSITIVE exact match on branch name. hrp-live is 8 chars;
# case-sensitive distinguishes from "HRP-LIVE", "hrp_Live", "hrp-live ",
# "hrp-live-", etc.
if ($branch1.name -ceq $ExpectedBranchName) {
  # In test mode, emit TEST_PASS / exit 19 -- never PASS / exit 0.
  # A deploy script reading exit code must distinguish these two.
  if ($testModeActive) {
    $verdict.gate = 'TEST_PASS'
    Write-Output "Neon production gate TEST_PASS (NOT a production preflight):"
    Write-Output ($verdict | ConvertTo-Json -Compress)
    exit 19
  } else {
    $verdict.gate = 'PASS'
    Write-Output "Neon production gate PASS (hrp-live):"
    Write-Output ($verdict | ConvertTo-Json -Compress)
    exit 0
  }
} else {
  $verdict.gate = 'REFUSE_branch_name_mismatch_CASE_SENSITIVE'
  [Console]::Error.WriteLine("Branch name '$($branch1.name)' does not case-sensitively equal expected '$ExpectedBranchName'. Verdict: $($verdict | ConvertTo-Json -Compress)")
  exit 16
}
