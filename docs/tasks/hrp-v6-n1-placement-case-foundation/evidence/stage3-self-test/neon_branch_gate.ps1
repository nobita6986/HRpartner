# powerline_check_neon_branch.ps1 — N1 Stage 3 gate
#
# Purpose: BEFORE STEP 2 (migrate status) and STEP 3 (migrate deploy),
# this script queries Neon's control plane and confirms that BOTH
# endpoint-ids (admin, writer) belong to the SAME branch of NEON_PROJECT_ID
# AND that branch's name equals $env:NEON_EXPECTED_BRANCH_NAME
# (default 'hrp_mp2_test').
#
# Exit codes:
#   0  → both endpoint-ids map to the SAME branch of NEON_PROJECT_ID,
#        that branch's name equals NEON_EXPECTED_BRANCH_NAME,
#        that branch is NOT primary.
#        Operator may proceed to STEP 2 / STEP 3.
#   10 → NEON_API_KEY or NEON_PROJECT_ID not set. On a real hrp_mp2_test
#        run this is a HARD STOP — credentials were not supplied via the
#        secure channel. On a Tier-0-authorised offline run, escalate.
#   11 → HTTP error fetching branches or endpoints.
#   12 → endpoint-id not found in any branch of NEON_PROJECT_ID
#        (URL points at a different Neon project entirely).
#   13 → endpoint-ids map to DIFFERENT branches of NEON_PROJECT_ID
#        (admin and writer are not on the same compute).
#   14 → branch is the project's primary branch (prod guard).
#   15 → branch name != NEON_EXPECTED_BRANCH_NAME (wrong test branch).
#
# This script is sourced from the runbook STEP 1.5 — it sits BETWEEN
# the URL/DB-side checks (STEP 1) and migrate status (STEP 2). It is
# the AUTHORITATIVE stage-3 branch gate: when it exits 0 the operator
# may proceed; otherwise STOP.
#
# The probe.mjs control-plane row is a belt-and-braces check at STEP 4,
# NOT the primary gate. The primary gate is THIS script.

[CmdletBinding()]
param(
  [string]$AdminUrl  = $env:TEST_DATABASE_URL_ADMIN,
  [string]$WriterUrl = $env:TEST_DATABASE_URL_WRITER,
  [string]$ExpectedBranchName = $(if ($env:NEON_EXPECTED_BRANCH_NAME) { $env:NEON_EXPECTED_BRANCH_NAME } else { 'hrp_mp2_test' })
)

# Audit fix 2026-09-12 22:45: $ErrorActionPreference=Stop would turn
# `Write-Error` into a terminating exception, which PowerShell then
# catches and overrides our explicit `exit N` with $LASTEXITCODE=1.
# Use `Continue` + `[Console]::Error.WriteLine` so the gate's exit
# code is preserved AND a clear refusal message lands on stderr.
$ErrorActionPreference = 'Continue'

function Refuse([int]$code, [string]$message) {
  [Console]::Error.WriteLine($message)
  exit $code
}

# ----- guards -----
if (-not $env:NEON_API_KEY)    { Refuse 10 'NEON_API_KEY is not set. On a real hrp_mp2_test run, request Tier 0 to supply credentials via the secure channel.' }
if (-not $env:NEON_PROJECT_ID) { Refuse 10 'NEON_PROJECT_ID is not set. On a real hrp_mp2_test run, request Tier 0 to supply credentials via the secure channel.' }
if (-not $AdminUrl -or -not $WriterUrl) { Refuse 10 'TEST_DATABASE_URL_ADMIN / TEST_DATABASE_URL_WRITER not set.' }

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

$AdminEp  = EndpointIdOf $AdminUrl
$WriterEp = EndpointIdOf $WriterUrl
if (-not $AdminEp -or -not $WriterEp) {
  [Console]::Error.WriteLine("Could not extract endpoint-id from URL(s). admin=$AdminEp writer=$WriterEp")
  exit 12
}

# ----- API fetch -----
$headers = @{ Authorization = "Bearer $env:NEON_API_KEY" ; 'Content-Type' = 'application/json' }

# Default to the production Neon API base; allow override for offline
# testing against a fake server (e.g. fake_neon_api.js).
$apiBase = if ($env:NEON_API_BASE) { $env:NEON_API_BASE } else { 'https://console.neon.tech' }

try {
  $branchesResp = Invoke-RestMethod -Method Get -Uri "$apiBase/api/v2/projects/$env:NEON_PROJECT_ID/branches?limit=200" -Headers $headers -TimeoutSec 15
} catch {
  [Console]::Error.WriteLine("GET /branches failed: $($_.Exception.Message)")
  exit 11
}

$branches = @($branchesResp.branches)
$primary  = $branches | Where-Object { $_.primary -eq $true } | Select-Object -First 1

# For every branch, fetch its endpoints. Find which branch owns
# AdminEp and which owns WriterEp.
#
# Audit fix 2026-09-12 22:45 (Tier-0-block round 5):
#   - The previous `host.Contains(endpointId)` was a SUBSTRING match.
#     It would falsely accept `endpointId='shy'` against a host like
#     `ep-shy-tree-az32as2c-pooler...` (matching the first 4 chars of a
#     different endpoint-id). It would also falsely accept suffix
#     overlap (`ep-shrub-pooler...` for endpointId=`hrub-`). We now
#     require EXACT endpoint-id equality on the normalized first
#     segment of the host, mirroring `EndpointIdOf` above.
#   - The previous code accessed `$adminBranch.id` without a null guard.
#     When NEON_PROJECT_ID has branches but none of them contain the
#     endpoint-id, both `$adminBranch` and `$writerBranch` are $null
#     and the access throws a runtime error before exit-code 12 can
#     be set. We now null-check BEFORE touching any property.
$adminBranch  = $null
$writerBranch = $null
foreach ($b in $branches) {
  try {
    $epResp = Invoke-RestMethod -Method Get -Uri "$apiBase/api/v2/projects/$env:NEON_PROJECT_ID/branches/$($b.id)/endpoints?limit=50" -Headers $headers -TimeoutSec 15
  } catch { continue }
  foreach ($ep in @($epResp.endpoints)) {
    if (-not $ep.host) { continue }
    # Normalize the API-returned host the SAME way we normalize the
    # input URL: split on '.', take the first segment, strip the 'ep-'
    # prefix and optional '-pooler' suffix, lowercase. Then require
    # EXACT equality with the URL-derived endpoint-id.
    $apiEp = EndpointIdOf("https://$($ep.host)/x")
    if (-not $apiEp) { continue }
    if ($apiEp -eq $AdminEp  -and -not $adminBranch)  { $adminBranch  = $b }
    if ($apiEp -eq $WriterEp -and -not $writerBranch) { $writerBranch = $b }
  }
  if ($adminBranch -and $writerBranch) { break }
}

# ----- result evaluation -----
# Audit fix 2026-09-12 22:45: null-guard BEFORE any property access.
if (-not $adminBranch -or -not $writerBranch) {
  $verdict = [ordered]@{
    admin_endpoint_id        = $AdminEp
    writer_endpoint_id       = $WriterEp
    expected_branch_name     = $ExpectedBranchName
    admin_branch_id          = if ($adminBranch)  { $adminBranch.id  } else { $null }
    writer_branch_id         = if ($writerBranch) { $writerBranch.id } else { $null }
    admin_branch_name        = if ($adminBranch)  { $adminBranch.name } else { $null }
    writer_branch_name       = if ($writerBranch) { $writerBranch.name } else { $null }
    primary_branch_id        = if ($primary)      { $primary.id      } else { $null }
    primary_branch_name      = if ($primary)      { $primary.name    } else { $null }
    same_branch              = $false
    branch_is_primary        = $false
    branch_name_matches      = $false
    gate                     = 'REFUSE_endpoint_not_found'
  }
  $verdict.gate = 'REFUSE_endpoint_not_found'
  [Console]::Error.WriteLine("ENDPOINT NOT FOUND in any branch of NEON_PROJECT_ID. Verdict: $($verdict | ConvertTo-Json -Compress)")
  exit 12
}

$verdict = [ordered]@{
  admin_endpoint_id        = $AdminEp
  writer_endpoint_id       = $WriterEp
  expected_branch_name     = $ExpectedBranchName
  admin_branch_id          = $adminBranch.id
  writer_branch_id         = $writerBranch.id
  admin_branch_name        = $adminBranch.name
  writer_branch_name       = $writerBranch.name
  primary_branch_id        = if ($primary) { $primary.id   } else { $null }
  primary_branch_name      = if ($primary) { $primary.name } else { $null }
  same_branch              = ($adminBranch.id -eq $writerBranch.id)
  branch_is_primary        = ($adminBranch.primary -eq $true)
  branch_name_matches      = ($adminBranch.name.ToLower() -eq $ExpectedBranchName.ToLower())
  gate                     = 'unknown'
}

if ($adminBranch.id -ne $writerBranch.id) {
  $verdict.gate = 'REFUSE_different_branches'
  [Console]::Error.WriteLine("Endpoint-ids map to DIFFERENT branches. Verdict: $($verdict | ConvertTo-Json -Compress)")
  exit 13
}
if ($adminBranch.primary -eq $true) {
  $verdict.gate = 'REFUSE_branch_is_primary_PROD_GUARD'
  [Console]::Error.WriteLine("Branch is the PROJECT PRIMARY (production). STOP. Verdict: $($verdict | ConvertTo-Json -Compress)")
  exit 14
}
if ($adminBranch.name.ToLower() -ne $ExpectedBranchName.ToLower()) {
  $verdict.gate = 'REFUSE_branch_name_mismatch'
  [Console]::Error.WriteLine("Branch name '$($adminBranch.name)' does not match expected '$ExpectedBranchName'. Verdict: $($verdict | ConvertTo-Json -Compress)")
  exit 15
}

$verdict.gate = 'PASS'
Write-Output "Neon control-plane branch-membership gate PASS:"
Write-Output ($verdict | ConvertTo-Json -Compress)
exit 0