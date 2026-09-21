# Wrapper: load cred, then run Neon branch gate with the staging URLs.
# All in one process so env vars persist. No credential values printed.
$ErrorActionPreference = 'Stop'

# Step 1 — load cred into this process env.
& (Join-Path $PSScriptRoot 'load_cre.ps1') *>&1 | Out-Null
# load_cre.ps1 always exits 0 on success; a throw would have terminated the script.

# Step 2 — pick staging URLs (already selected by user+hostname in loader).
$admin  = [Environment]::GetEnvironmentVariable('STAGING_ADMIN_URL')
$writer = [Environment]::GetEnvironmentVariable('STAGING_WRITER_URL')
if (-not $admin -or -not $writer) { throw "missing staging URLs in env after load_cre" }

# Step 3 — sanity: refuse if either URL accidentally points to prod cluster.
foreach ($u in @($admin, $writer)) {
  if ($u -match 'ep-shy-tree-az32as2c') {
    throw "REFUSE: a staging URL resolved to prod cluster ep-shy-tree-az32as2c"
  }
}

# Step 4 — execute gate.
$gateScript = Join-Path $PSScriptRoot 'neon_branch_gate.ps1'
& $gateScript -AdminUrl $admin -WriterUrl $writer -ExpectedBranchName 'hrp_mp2_test'
$gateExit = $LASTEXITCODE

# Step 5 — capture verdict JSON to evidence file (NO cred values).
$verdictPath = Join-Path $PSScriptRoot 'branch-gate-verdict.json'
# Re-run a tiny inline query to also dump endpoint-id summary we can keep.
# (The gate script itself already exited; we re-extract for evidence only.)
function EndpointIdOf([string]$u) {
  $h = ([Uri]$u).Host
  if (-not $h) { return '' }
  $first = ($h.Split('.')[0])
  if (-not $first.StartsWith('ep-')) { return '' }
  $rest = $first.Substring(3)
  if ($rest.EndsWith('-pooler')) { $rest = $rest.Substring(0, $rest.Length - 7) }
  return $rest.ToLower()
}
$obj = [ordered]@{
  admin_endpoint_id  = EndpointIdOf $admin
  writer_endpoint_id = EndpointIdOf $writer
  expected_branch    = 'hrp_mp2_test'
  prod_refused_id    = 'shy-tree-az32as2c'
  gate_exit_code     = $gateExit
  gate_pass          = ($gateExit -eq 0)
}
$obj | ConvertTo-Json -Depth 4 | Set-Content -LiteralPath $verdictPath -Encoding UTF8

if ($gateExit -eq 0) {
  Write-Output ""
  Write-Output "[GATE] PASS — verdict saved to evidence/branch-gate-verdict.json"
} else {
  Write-Output ""
  Write-Output "[GATE] REFUSE exit=$gateExit — verdict saved (refused). STOP."
}
exit $gateExit
