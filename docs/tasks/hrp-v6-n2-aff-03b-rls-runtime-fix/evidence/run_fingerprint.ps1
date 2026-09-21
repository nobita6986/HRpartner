# Step A — read-only fingerprint of staging DB.
# Loads cred into env, then runs a small set of read-only queries against
# STAGING_ADMIN_URL via psql to verify identity (no creds printed).
$ErrorActionPreference = 'Stop'
& (Join-Path $PSScriptRoot 'load_cre.ps1') *>&1 | Out-Null

$admin = [Environment]::GetEnvironmentVariable('STAGING_ADMIN_URL')
if (-not $admin) { throw "STAGING_ADMIN_URL missing after load_cre" }

# Sanity: refuse prod.
if ($admin -match 'ep-shy-tree-az32as2c') { throw "REFUSE: staging URL resolved to prod cluster" }

# Locate psql.
$psql = (Get-Command psql.exe -ErrorAction SilentlyContinue).Source
if (-not $psql) {
  $fallback = 'C:\Program Files\PostgreSQL\18\bin\psql.exe'
  if (Test-Path -LiteralPath $fallback) { $psql = $fallback }
}
if (-not $psql) { throw "psql.exe not found in PATH or fallback path" }
Write-Output "[psql] $psql"

# Read-only fingerprint queries (Tier 0 expects current_database + version +
# pg_class lookup for AFF-03/AFF-03B presence).
$sqlBlock = @"
SELECT current_database() AS db,
       inet_server_addr()::text AS server_ip,
       inet_server_port() AS server_port,
       current_user AS session_user,
       version() AS pg_version,
       (SELECT count(*) FROM _prisma_migrations) AS prisma_migrations_count,
       (SELECT count(*) FROM pg_proc WHERE proname IN ('hrp_public_intake_submission','hrp_score_labor_profile','hrp_normalize_phone','hrp_normalize_full_name')) AS aff03b_fn_count,
       (SELECT count(*) FROM pg_roles WHERE rolname = 'hrp_public_rpc') AS hrp_public_rpc_exists,
       (SELECT count(*) FROM pg_policies WHERE schemaname='public' AND tablename='referral_attributions' AND policyname IN ('hrp_ra_select_writer','hrp_ra_update_writer')) AS aff03_policies_count;
"@

# We need to scrub the URL password from any output. Use env var PGPASSWORD + connection via URI
# so the password doesn't appear in argv. Wrap psql with --no-psqlrc and -A -t for clean output.
$out = & $psql "$admin" --no-psqlrc -A -t -c $sqlBlock 2>&1
$ec = $LASTEXITCODE

$fp = @"
[fp-result]
exit_code=$ec
$(if ($ec -eq 0) { $out } else { "STDERR/STDIN: $out" })
"@
$fp | Out-File -LiteralPath (Join-Path $PSScriptRoot 'fingerprint.txt') -Encoding UTF8

# Also pretty-print line by line.
if ($ec -eq 0) {
  Write-Output "[fingerprint] exit=$ec"
  $out -split "`n" | ForEach-Object { Write-Output ("  $_") }
} else {
  Write-Output "[fingerprint] FAIL exit=$ec"
  Write-Output $out
}
exit $ec
