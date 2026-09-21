# load_cre.ps1 — load C:\cre_hrp.txt into this process env (no values echoed).
# Selection rule per Tier 0: pick URL by (user, hostname) tuple, not by line order.
# Required tuples:
#   STAGING_ADMIN  = neondb_owner     @ ep-empty-forest-azlhfyo9.c-...
#   STAGING_WRITER = app_user_writer  @ ep-empty-forest-azlhfyo9.c-...
#   PROD_ADMIN     = neondb_owner     @ ep-shy-tree-az32as2c.c-...   (REFUSE if accidentally used)
# Plus non-URL fields:
#   NEON_PROJECT_ID  (label "Project ID:" then the value on next line)
#   NEON_API_KEY     (label "API Key:" then the value on next line)

$ErrorActionPreference = 'Stop'
$credPath = 'C:\cre_hrp.txt'
if (-not (Test-Path -LiteralPath $credPath)) { throw "cred file not found: $credPath" }

# Clear any prior values (defense-in-depth: don't inherit from parent env).
foreach ($k in @('STAGING_ADMIN_URL','STAGING_WRITER_URL','PROD_ADMIN_URL',
                'NEON_API_KEY','NEON_PROJECT_ID','NEON_EXPECTED_BRANCH_NAME')) {
  Remove-Item -Path "Env:$k" -ErrorAction SilentlyContinue
}

$lines = Get-Content -LiteralPath $credPath

# Parse URL lines.
$found = @{
  'neondb_owner|ep-empty-forest-azlhfyo9'  = $null
  'app_user_writer|ep-empty-forest-azlhfyo9' = $null
  'neondb_owner|ep-shy-tree-az32as2c'      = $null
}
foreach ($line in $lines) {
  if ([string]::IsNullOrWhiteSpace($line)) { continue }
  if ($line -notmatch '://') { continue }
  if ($line -notmatch '://(?<u>[^:]+):(?<p>[^@]+)@(?<h>[^/:?]+)') { continue }
  $u = $Matches.u
  $h = $Matches.h
  foreach ($hx in @('ep-empty-forest-azlhfyo9','ep-shy-tree-az32as2c')) {
    if ($h -like "$hx.*") {
      $key = "$u|$hx"
      if ($found.ContainsKey($key)) {
        if ($found[$key]) { throw "duplicate URL match for $key in $credPath" }
        $found[$key] = $line.Trim()
      }
    }
  }
}

# Verify required tuples present.
$stgAdmin = $found['neondb_owner|ep-empty-forest-azlhfyo9']
$stgWriter = $found['app_user_writer|ep-empty-forest-azlhfyo9']
$prodAdmin = $found['neondb_owner|ep-shy-tree-az32as2c']

if (-not $stgAdmin)  { throw "MISSING: staging admin URL (neondb_owner @ ep-empty-forest-azlhfyo9) not found in $credPath" }
if (-not $stgWriter) { throw "MISSING: staging writer URL (app_user_writer @ ep-empty-forest-azlhfyo9) not found in $credPath" }
if (-not $prodAdmin) { Write-Warning "prod admin URL not found in $credPath (acceptable if Tier 0 omitted)" }

# Required: project id and api key — labeled lines.
$idx = 0
while ($idx -lt $lines.Count - 1) {
  $label = $lines[$idx].Trim()
  $nextLine = $lines[$idx + 1].Trim()
  if ($label -eq 'Project ID:') {
    Set-Item -Path 'Env:NEON_PROJECT_ID' -Value $nextLine
  }
  if ($label -eq 'API Key:') {
    Set-Item -Path 'Env:NEON_API_KEY' -Value $nextLine
  }
  $idx += 1
}

if (-not (Test-Path -Path 'Env:NEON_PROJECT_ID')) { throw "MISSING: NEON_PROJECT_ID label/value not found in $credPath" }
if (-not (Test-Path -Path 'Env:NEON_API_KEY')) { throw "MISSING: NEON_API_KEY label/value not found in $credPath" }

# Stage expected branch per Tier 0 directive.
Set-Item -Path 'Env:NEON_EXPECTED_BRANCH_NAME' -Value 'hrp_mp2_test'
Set-Item -Path 'Env:NEON_PROD_BRANCH_NAME' -Value 'main'   # heuristic; the gate script below resolves primary branch via API

# Set staging URLs into env.
Set-Item -Path 'Env:STAGING_ADMIN_URL' -Value $stgAdmin
Set-Item -Path 'Env:STAGING_WRITER_URL' -Value $stgWriter
if ($prodAdmin) { Set-Item -Path 'Env:PROD_ADMIN_URL' -Value $prodAdmin }

# Verify select criteria (Tier 0 mapping rule).
function _check($url, $expUser, $expHostPrefix) {
  if ($url -notmatch "://(?<u>[^:]+):[^@]+@(?<h>[^/:?]+)") { throw "malformed url" }
  $u = $Matches.u
  $h = $Matches.h
  if ($u -ne $expUser) { throw "expected user $expUser but got $u" }
  if ($h -notlike "$expHostPrefix.*") { throw "expected host $expHostPrefix.* but got $h" }
}

_check $stgAdmin  'neondb_owner'     'ep-empty-forest-azlhfyo9'
_check $stgWriter 'app_user_writer'  'ep-empty-forest-azlhfyo9'
if ($prodAdmin) { _check $prodAdmin 'neondb_owner' 'ep-shy-tree-az32as2c' }

# Hard refusal: staging URLs must NOT be the prod cluster.
if ($stgAdmin  -match 'ep-shy-tree-az32as2c') { throw "REFUSE: staging admin resolved to prod host" }
if ($stgWriter -match 'ep-shy-tree-az32as2c') { throw "REFUSE: staging writer resolved to prod host" }

# Summary (no values).
Write-Output "[OK] cred loaded into process env"
Write-Output "  STAGING_ADMIN_URL     -> user=neondb_owner          host=ep-empty-forest-azlhfyo9.c-3.ap-southeast-1.aws.neon.tech"
Write-Output "  STAGING_WRITER_URL    -> user=app_user_writer       host=ep-empty-forest-azlhfyo9.c-3.ap-southeast-1.aws.neon.tech"
if ($prodAdmin) {
  Write-Output "  PROD_ADMIN_URL        -> user=neondb_owner          host=ep-shy-tree-az32as2c.c-3.ap-southeast-1.aws.neon.tech   [REFUSE-IF-USED]"
}
$npid = [Environment]::GetEnvironmentVariable('NEON_PROJECT_ID')
Write-Output ("  NEON_PROJECT_ID       -> len={0} prefix={1}" -f $npid.Length, $npid.Substring(0, [Math]::Min(8, $npid.Length)))
$ak = [Environment]::GetEnvironmentVariable('NEON_API_KEY')
Write-Output ("  NEON_API_KEY          -> len={0} prefix={1}" -f $ak.Length, $ak.Substring(0, [Math]::Min(8, $ak.Length)))
Write-Output "  NEON_EXPECTED_BRANCH  -> hrp_mp2_test"
