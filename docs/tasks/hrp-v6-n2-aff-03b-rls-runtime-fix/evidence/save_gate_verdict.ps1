# Save full gate verdict (no creds) into JSON for evidence.
$ErrorActionPreference = 'Stop'
& (Join-Path $PSScriptRoot 'load_cre.ps1') *>&1 | Out-Null

$admin  = [Environment]::GetEnvironmentVariable('STAGING_ADMIN_URL')
$writer = [Environment]::GetEnvironmentVariable('STAGING_WRITER_URL')

function EndpointIdOf([string]$u) {
  $h = ([Uri]$u).Host
  if (-not $h) { return '' }
  $first = ($h.Split('.')[0])
  if (-not $first.StartsWith('ep-')) { return '' }
  $rest = $first.Substring(3)
  if ($rest.EndsWith('-pooler')) { $rest = $rest.Substring(0, $rest.Length - 7) }
  return $rest.ToLower()
}

# Call the Neon API once, save the canonical gate verdict into a JSON file
# (no credentials, no API key leakage).
$npid = [Environment]::GetEnvironmentVariable('NEON_PROJECT_ID')
$nkey = [Environment]::GetEnvironmentVariable('NEON_API_KEY')
$headers = @{ Authorization = "Bearer $nkey"; 'Content-Type'='application/json' }

$branchesResp = Invoke-RestMethod -Method Get -Uri "https://console.neon.tech/api/v2/projects/$npid/branches?limit=200" -Headers $headers -TimeoutSec 15
$branches = @($branchesResp.branches)
$primary = $branches | Where-Object { $_.primary -eq $true } | Select-Object -First 1

$adminEp  = EndpointIdOf $admin
$writerEp = EndpointIdOf $writer
$adminBranch = $null
$writerBranch = $null
foreach ($b in $branches) {
  $epResp = Invoke-RestMethod -Method Get -Uri "https://console.neon.tech/api/v2/projects/$npid/branches/$($b.id)/endpoints?limit=50" -Headers $headers -TimeoutSec 15
  foreach ($ep in @($epResp.endpoints)) {
    if (-not $ep.host) { continue }
    $apiEp = EndpointIdOf("https://$($ep.host)/x")
    if ($apiEp -eq $adminEp -and -not $adminBranch)  { $adminBranch = $b }
    if ($apiEp -eq $writerEp -and -not $writerBranch) { $writerBranch = $b }
  }
  if ($adminBranch -and $writerBranch) { break }
}

$verdict = [ordered]@{
  admin_endpoint_id        = $adminEp
  writer_endpoint_id       = $writerEp
  expected_branch_name     = 'hrp_mp2_test'
  admin_branch_id          = if ($adminBranch)  { $adminBranch.id  } else { $null }
  writer_branch_id         = if ($writerBranch) { $writerBranch.id } else { $null }
  admin_branch_name        = if ($adminBranch)  { $adminBranch.name } else { $null }
  writer_branch_name       = if ($writerBranch) { $writerBranch.name } else { $null }
  primary_branch_id        = if ($primary) { $primary.id   } else { $null }
  primary_branch_name      = if ($primary) { $primary.name } else { $null }
  same_branch              = ($adminBranch.id -eq $writerBranch.id)
  branch_is_primary        = ($adminBranch.primary -eq $true)
  branch_name_matches      = ($adminBranch.name.ToLower() -eq 'hrp_mp2_test')
  prod_refused_endpoint_id = 'shy-tree-az32as2c'
  prod_refused_branch_name = if ($primary) { $primary.name } else { $null }
}
$verdict.gate = if ($verdict.same_branch -and -not $verdict.branch_is_primary -and $verdict.branch_name_matches) { 'PASS' }
                elseif ($verdict.branch_is_primary) { 'REFUSE_branch_is_primary_PROD_GUARD' }
                elseif (-not $verdict.same_branch) { 'REFUSE_different_branches' }
                elseif (-not $verdict.branch_name_matches) { 'REFUSE_branch_name_mismatch' }
                else { 'REFUSE_unknown' }

$out = Join-Path $PSScriptRoot 'branch-gate-verdict-full.json'
$verdict | ConvertTo-Json -Depth 5 | Set-Content -LiteralPath $out -Encoding UTF8

Write-Output "[GATE] $($verdict.gate)"
Write-Output "       admin_ep=$($verdict.admin_endpoint_id) writer_ep=$($verdict.writer_endpoint_id)"
Write-Output "       branch=$($verdict.admin_branch_name) (id=$($verdict.admin_branch_id))"
Write-Output "       primary=$($verdict.primary_branch_name) (id=$($verdict.primary_branch_id))"
Write-Output "       saved -> evidence/branch-gate-verdict-full.json"
$ec = if ($verdict.gate -eq 'PASS') { 0 } else { 99 }
exit $ec
