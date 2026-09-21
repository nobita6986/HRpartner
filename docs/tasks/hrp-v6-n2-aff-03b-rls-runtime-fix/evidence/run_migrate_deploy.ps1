# Step C — apply AFF-03B migration on staging.
# Same .env-move-aside technique. After deploy, run migrate status again
# to verify 0 pending.
$ErrorActionPreference = 'Stop'
& (Join-Path $PSScriptRoot 'load_cre.ps1') *>&1 | Out-Null

$admin = [Environment]::GetEnvironmentVariable('STAGING_ADMIN_URL')
if (-not $admin) { throw "STAGING_ADMIN_URL missing" }
if ($admin -match 'ep-shy-tree-az32as2c') { throw "REFUSE prod cluster" }

$repoRoot = (Resolve-Path (Join-Path $PSScriptRoot '..\..\..\..')).Path
$envFile  = Join-Path $repoRoot '.env'
$disabled = Join-Path $repoRoot '.env.disabled-preflight'

if (-not (Test-Path -LiteralPath $envFile)) {
  if (Test-Path -LiteralPath $disabled) { throw "REFUSE: prior .env.disabled-preflight present; restore manually first" }
  throw ".env not found at $envFile"
}
if (Test-Path -LiteralPath $disabled) { throw "REFUSE: .env.disabled-preflight already present; restore manually first" }

$envContent = Get-Content -LiteralPath $envFile -Raw
if ($envContent -notmatch 'ep-shy-tree-az32as2c') {
  throw "REFUSE: .env does NOT contain prod cluster; aborting"
}

$preHash = (Get-FileHash -LiteralPath $envFile -Algorithm SHA256).Hash
Move-Item -LiteralPath $envFile -Destination $disabled -Force

try {
  $env:DATABASE_URL = $admin
  $env:DATABASE_URL_ADMIN = $admin
  Push-Location $repoRoot
  try {
    & npx prisma migrate deploy 2>&1 | Tee-Object -LiteralPath (Join-Path $PSScriptRoot 'migrate-deploy.txt') | Out-Null
    $ec = $LASTEXITCODE
  } finally {
    Pop-Location
  }
} finally {
  Move-Item -LiteralPath $disabled -Destination $envFile -Force
}

$postHash = (Get-FileHash -LiteralPath $envFile -Algorithm SHA256).Hash
if ($postHash -ne $preHash) {
  throw ".env content hash changed! pre=$preHash post=$postHash"
}
Write-Output "[migrate deploy] exit=$ec, .env hash preserved"
Write-Output "  saved -> evidence/migrate-deploy.txt"
exit $ec
