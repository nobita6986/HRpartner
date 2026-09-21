# Step E — run AFF-03B integration tests against staging writer (simplified).
$ErrorActionPreference = 'Continue'
& (Join-Path $PSScriptRoot 'load_cre.ps1') *>&1 | Out-Null

$writer = [Environment]::GetEnvironmentVariable('STAGING_WRITER_URL')
$admin = [Environment]::GetEnvironmentVariable('STAGING_ADMIN_URL')
if (-not $writer -or -not $admin) { throw "missing URLs after load_cre" }
if ($writer -match 'ep-shy-tree-az32as2c') { throw "REFUSE prod cluster" }

$repoRoot = (Resolve-Path (Join-Path $PSScriptRoot '..\..\..\..')).Path
$envFile  = Join-Path $repoRoot '.env'
$disabled = Join-Path $repoRoot '.env.disabled-preflight'

if (Test-Path -LiteralPath $disabled) { throw "REFUSE: .env.disabled-preflight present; restore manually first" }

$preHash = (Get-FileHash -LiteralPath $envFile -Algorithm SHA256).Hash
Move-Item -LiteralPath $envFile -Destination $disabled -Force

try {
  $env:DATABASE_URL_TEST = $writer
  $env:DATABASE_URL_ADMIN_TEST = $admin
  $env:DATABASE_URL = $writer
  $env:DATABASE_URL_ADMIN = $admin
  Push-Location $repoRoot
  try {
    $out = & npx vitest run tests/db/aff03-public-intake.integration.test.ts --config vitest.integration.config.ts --reporter=basic 2>&1
    $ec = $LASTEXITCODE
    $out | Out-File -LiteralPath (Join-Path $PSScriptRoot 'integration-aff03b-staging.txt') -Encoding UTF8
    $out | Select-Object -First 80 | ForEach-Object { Write-Output $_ }
    Write-Output ""
    Write-Output "[vitest] exit=$ec"
  } finally {
    Pop-Location
  }
} finally {
  Move-Item -LiteralPath $disabled -Destination $envFile -Force
}

$postHash = (Get-FileHash -LiteralPath $envFile -Algorithm SHA256).Hash
if ($postHash -ne $preHash) { throw ".env hash changed post=$postHash pre=$preHash" }
Write-Output "[done] .env hash preserved"
exit $ec
