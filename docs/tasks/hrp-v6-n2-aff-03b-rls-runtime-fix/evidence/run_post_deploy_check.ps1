# Step D — post-deploy verification.
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

$psql = 'C:\Program Files\PostgreSQL\18\bin\psql.exe'

# Fingerprint after deploy.
$sqlBlock = @"
SELECT current_database() AS db,
       inet_server_addr()::text AS server_ip,
       current_user AS session_user,
       (SELECT count(*) FROM _prisma_migrations) AS prisma_migrations_count,
       (SELECT count(*) FROM pg_proc WHERE proname IN ('hrp_public_intake_submission','hrp_score_labor_profile','hrp_normalize_phone','hrp_normalize_full_name')) AS aff03b_fn_count,
       (SELECT count(*) FROM pg_roles WHERE rolname = 'hrp_public_rpc') AS hrp_public_rpc_exists,
       (SELECT count(*) FROM pg_policies WHERE schemaname='public' AND tablename='referral_attributions' AND policyname IN ('hrp_ra_select_writer','hrp_ra_update_writer')) AS aff03_policies_count,
       (SELECT count(*) FROM pg_proc WHERE proname='hrp_public_intake_submission' AND prosecdef = true) AS aff03b_rpc_security_definer,
       (SELECT array_agg(p.proname ORDER BY p.proname) FROM pg_proc p JOIN pg_namespace n ON p.pronamespace=n.oid WHERE n.nspname='public' AND p.proname LIKE 'hrp_%') AS hrp_fn_list;
"@

$fpOut = & $psql "$admin" --no-psqlrc -A -t -c $sqlBlock 2>&1
$fpEc = $LASTEXITCODE

# Save and echo.
$fpOut | Out-File -LiteralPath (Join-Path $PSScriptRoot 'fingerprint-post.txt') -Encoding UTF8
Write-Output "[fingerprint-post] exit=$fpEc"
if ($fpEc -eq 0) {
  $fpOut -split "`n" | ForEach-Object { Write-Output ("  $_") }
} else {
  Write-Output $fpOut
}

# Also run prisma migrate status to confirm 0 pending.
$preHash = (Get-FileHash -LiteralPath $envFile -Algorithm SHA256).Hash
Move-Item -LiteralPath $envFile -Destination $disabled -Force
try {
  $env:DATABASE_URL = $admin
  $env:DATABASE_URL_ADMIN = $admin
  Push-Location $repoRoot
  try {
    & npx prisma migrate status 2>&1 | Tee-Object -LiteralPath (Join-Path $PSScriptRoot 'migrate-status-post.txt') | Out-Null
    $msEc = $LASTEXITCODE
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
Write-Output "[migrate status post-deploy] exit=$msEc, .env hash preserved"
exit ($fpEc + $msEc)
