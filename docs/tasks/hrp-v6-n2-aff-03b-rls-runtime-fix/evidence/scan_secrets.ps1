# Scan evidence folder for leaked secrets.
$ErrorActionPreference = 'SilentlyContinue'
$root = 'docs\tasks\hrp-v6-n2-aff-03b-rls-runtime-fix\evidence'

# Patterns of secrets that MUST NOT appear in evidence files.
$patterns = @(
  'hrp_wr_[A-Za-z0-9]+',    # writer password
  'npg_[A-Za-z0-9]+',       # neon owner password
  'wk89jpDi[A-Za-z0-9]+',   # JWT_SECRET
  'hrp_etl_[A-Za-z0-9]+',   # etl password
  'napi_v54[A-Za-z0-9]+'    # API key prefix
)

$leaks = 0
Get-ChildItem -LiteralPath $root -Recurse -File | ForEach-Object {
  $content = Get-Content -LiteralPath $_.FullName -Raw -ErrorAction SilentlyContinue
  if (-not $content) { return }
  foreach ($p in $patterns) {
    $m = [regex]::Match($content, $p)
    if ($m.Success) {
      Write-Output ("LEAK: " + $_.Name + " pattern=" + $p + " match=" + $m.Value.Substring(0, [Math]::Min(20, $m.Value.Length)))
      $leaks++
    }
  }
}
if ($leaks -eq 0) {
  Write-Output "[scan] clean: no leaked credentials in evidence"
}
