# Step B3 — prisma migrate status on staging.
# Move .env aside, set DATABASE_URL=STAGING_ADMIN_URL explicitly, run prisma, restore .env.
$ErrorActionPreference = 'Stop'
& (Join-Path $PSScriptRoot 'load_cre.ps1') *>&1 | Out-Null

$admin = [Environment]::GetEnvironmentVariable('STAGING_ADMIN_URL')
if (-not $admin) { throw "STAGING_ADMIN_URL missing" }
if ($admin -match 'ep-shy-tree-az32as2c') { throw "REFUSE prod cluster" }

$repoRoot = (Resolve-Path (Join-Path $PSScriptRoot '..\..\..\..')).Path
$envFile  = Join-Path $repoRoot '.env'
$disabled = Join-Path $repoRoot '.env.disabled-preflight'

# Pre-flight safety.
if (-not (Test-Path -LiteralPath $envFile)) {
  if (Test-Path -LiteralPath $disabled) { throw "REFUSE: prior .env.disabled-preflight present; restore manually first" }
  throw ".env not found at $envFile"
}
if (Test-Path -LiteralPath $disabled) { throw "REFUSE: .env.disabled-preflight already present; restore manually first" }

$envContent = Get-Content -LiteralPath $envFile -Raw
if ($envContent -notmatch 'ep-shy-tree-az32as2c') {
  throw "REFUSE: .env does NOT contain prod cluster; aborting (was previously a prod-pointing file)"
}

# Hash for content-preservation check.
$preHash = (Get-FileHash -LiteralPath $envFile -Algorithm SHA256).Hash

# Temporarily rename .env.
Move-Item -LiteralPath $envFile -Destination $disabled -Force

try {
  # Set DATABASE_URL and DATABASE_URL_ADMIN for the child prisma process.
  # Schema requires both: url = DATABASE_URL (pooled), directUrl = DATABASE_URL_ADMIN (direct).
  $env:DATABASE_URL = $admin
  $env:DATABASE_URL_ADMIN = $admin
  # Also override for our env so a follow-up step in same script would use it.
  # Run prisma migrate status from worktree root so it finds prisma/schema.prisma.
  Push-Location $repoRoot
  try {
    & npx prisma migrate status 2>&1 | Tee-Object -LiteralPath (Join-Path $PSScriptRoot 'migrate-status-pre.txt') | Out-Null
    $ec = $LASTEXITCODE
  } finally {
    Pop-Location
  }
} finally {
  # Restore .env unconditionally.
  Move-Item -LiteralPath $disabled -Destination $envFile -Force
}

# Verify hash unchanged.
$postHash = (Get-FileHash -LiteralPath $envFile -Algorithm SHA256).Hash
if ($postHash -ne $preHash) {
  throw ".env content hash changed! pre=$preHash post=$postHash"
}
Write-Output "[migrate status] exit=$ec, .env hash preserved"
Write-Output "  saved -> evidence/migrate-status-pre.txt"
exit $ec
