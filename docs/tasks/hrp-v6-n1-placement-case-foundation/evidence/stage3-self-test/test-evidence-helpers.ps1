# test-evidence-helpers.ps1 — exercise write_ndjson_evidence.ps1 and
# copy_stderr_trace.ps1 across PASS + every fail-closed exit code.
#
# Audit fix 2026-09-12 22:45 (Tier-0-block round 5): Tier 0 asked for
# proof that the helpers correctly handle:
#   - NDJSON happy path (30 JSON lines, parses cleanly)
#   - NDJSON broken path (line wrapping → exit 21)
#   - NDJSON zero lines (empty file → exit 22)
#   - NDJSON channel-mix (n1-trace: lines in source → exit 23)
#   - stderr trace happy path (created + deleted lines preserved)
#   - stderr trace empty path (no n1-trace: lines → exit 31)
#   - stderr trace channel-mix (n1-trace + JSON → exit 32)
#   - stderr trace missing source → exit 30
#
# Usage:
#   powershell -NoProfile -File test-evidence-helpers.ps1
#
# Exit code: 0 if every assertion passes; non-zero otherwise.
#
# Implementation note: we call each helper via `&` (operator) inside
# the SAME shell — PowerShell preserves `$LASTEXITCODE` reliably that
# way, and avoids a nested `powershell -File` invocation that
# silently swallowed some exit codes during testing.

$ErrorActionPreference = 'Continue'

$ndjsonHelper = 'C:\CodeApp\HrP\docs\tasks\hrp-v6-n1-placement-case-foundation\evidence\stage3-self-test\write_ndjson_evidence.ps1'
$stderrHelper = 'C:\CodeApp\HrP\docs\tasks\hrp-v6-n1-placement-case-foundation\evidence\stage3-self-test\copy_stderr_trace.ps1'

function Run-Script([string]$scriptPath, [string]$src, [string]$dst) {
  $env:NEON_API_KEY = $null  # ensure helpers don't accidentally pick up creds
  & $scriptPath -Src $src -Dst $dst 2>&1 | Out-Null
  $code = $LASTEXITCODE
  return $code
}

function Parse-Lines([string]$path) {
  $raw = Get-Content $path -Raw -ErrorAction SilentlyContinue
  if (-not $raw) { return @() }
  $lines = $raw -split "`n"
  $out = @()
  foreach ($l in $lines) {
    $trimmed = $l.TrimEnd("`r")
    if ($trimmed.Length -gt 0) { $out += $trimmed }
  }
  return ,$out
}

function AllParseable([string[]]$lines) {
  foreach ($l in $lines) {
    try { $null = $l | ConvertFrom-Json -ErrorAction Stop } catch { return $false }
  }
  return $true
}

$results = @()
$log = @()

# --------------- NDJSON HELPER ---------------
$log += "=== NDJSON helper (write_ndjson_evidence.ps1) ==="

# (1) NDJSON happy path → exit 0
$dst = 'C:\Users\Admin\pg-probe\out-ndjson-good.txt'
$code = Run-Script $ndjsonHelper 'C:\Users\Admin\pg-probe\fake-good-30.ndjson' $dst
$lines = Parse-Lines $dst
$allOk = AllParseable $lines
$ok = ($code -eq 0) -and ($lines.Count -eq 30) -and $allOk
$results += [PSCustomObject]@{ Name = 'ndjson-good  -> exit 0, 30 parseable lines'; Ok = $ok }
$log += "[PASS_OR_FAIL] $('ndjson-good  -> exit 0, 30 parseable lines') (code=$code, lines=$($lines.Count) parseable=$allOk)"

# (2) NDJSON broken (line wrap) → exit 21
$dst = 'C:\Users\Admin\pg-probe\out-ndjson-bad.txt'
$code = Run-Script $ndjsonHelper 'C:\Users\Admin\pg-probe\fake-bad-wrap.ndjson' $dst
$ok = ($code -eq 21)
$results += [PSCustomObject]@{ Name = 'ndjson-bad   -> exit 21'; Ok = $ok }
$log += "[PASS_OR_FAIL] $('ndjson-bad   -> exit 21') (code=$code)"

# (3) NDJSON empty → exit 22
$dst = 'C:\Users\Admin\pg-probe\out-ndjson-empty.txt'
$code = Run-Script $ndjsonHelper 'C:\Users\Admin\pg-probe\fake-empty.ndjson' $dst
$ok = ($code -eq 22)
$results += [PSCustomObject]@{ Name = 'ndjson-empty -> exit 22'; Ok = $ok }
$log += "[PASS_OR_FAIL] $('ndjson-empty -> exit 22') (code=$code)"

# (4) NDJSON channel-mix (n1-trace: lines in source) → exit 23
$mixSrc = 'C:\Users\Admin\pg-probe\fake-trace-mixed-as-ndjson.ndjson'
# Write via [System.IO.File]::WriteAllText to avoid PowerShell's
# Out-File encoding-validator snag.
[System.IO.File]::WriteAllText($mixSrc, "n1-trace: created id=x kind=placement_case`n{`"kind`":`"summary`",`"total`":1}`n", [System.Text.UTF8Encoding]::new($false))
$dst = 'C:\Users\Admin\pg-probe\out-ndjson-mix.txt'
$code = Run-Script $ndjsonHelper $mixSrc $dst
$ok = ($code -eq 23)
$results += [PSCustomObject]@{ Name = 'ndjson-mix-trace -> exit 23'; Ok = $ok }
$log += "[PASS_OR_FAIL] $('ndjson-mix-trace -> exit 23') (code=$code)"
Remove-Item $mixSrc -ErrorAction SilentlyContinue

# --------------- STDERR HELPER ---------------
$log += ""
$log += "=== Stderr helper (copy_stderr_trace.ps1) ==="

# (5) stderr trace happy path → exit 0; n1-trace: lines preserved.
$dst = 'C:\Users\Admin\pg-probe\out-trace-good.txt'
$code = Run-Script $stderrHelper 'C:\Users\Admin\pg-probe\fake-trace-good.log' $dst
$rawOut = Get-Content $dst -Raw -ErrorAction SilentlyContinue
$createdMatches = ([regex]::Matches($rawOut, '(?m)^n1-trace: created ')).Count
$deletedMatches = ([regex]::Matches($rawOut, '(?m)^n1-trace: deleted ')).Count
$ok = ($code -eq 0) -and ($createdMatches -eq 5) -and ($deletedMatches -eq 5)
$results += [PSCustomObject]@{ Name = 'trace-good   -> exit 0, 5 created + 5 deleted'; Ok = $ok }
$log += "[PASS_OR_FAIL] $('trace-good   -> exit 0, 5 created + 5 deleted') (code=$code, created=$createdMatches deleted=$deletedMatches)"

# (6) stderr trace empty (no n1-trace: lines) → exit 31
$dst = 'C:\Users\Admin\pg-probe\out-trace-empty.txt'
$code = Run-Script $stderrHelper 'C:\Users\Admin\pg-probe\fake-trace-empty.log' $dst
$ok = ($code -eq 31)
$results += [PSCustomObject]@{ Name = 'trace-empty  -> exit 31'; Ok = $ok }
$log += "[PASS_OR_FAIL] $('trace-empty  -> exit 31') (code=$code)"

# (7) stderr trace channel-mix (n1-trace + JSON) → exit 32
$dst = 'C:\Users\Admin\pg-probe\out-trace-mix.txt'
$code = Run-Script $stderrHelper 'C:\Users\Admin\pg-probe\fake-trace-mixed.log' $dst
$ok = ($code -eq 32)
$results += [PSCustomObject]@{ Name = 'trace-mix-json -> exit 32'; Ok = $ok }
$log += "[PASS_OR_FAIL] $('trace-mix-json -> exit 32') (code=$code)"

# (8) missing source → exit 30
$dst = 'C:\Users\Admin\pg-probe\out-trace-missing.txt'
$code = Run-Script $stderrHelper 'C:\Users\Admin\pg-probe\does-not-exist.log' $dst
$ok = ($code -eq 30)
$results += [PSCustomObject]@{ Name = 'trace-missing -> exit 30'; Ok = $ok }
$log += "[PASS_OR_FAIL] $('trace-missing -> exit 30') (code=$code)"

# Print results with PASS / FAIL labels.
$log | ForEach-Object {
  $line = $_
  if ($line -match '^\[PASS_OR_FAIL\] (?<name>.+?) \(code=(?<code>\d+)(?<detail>.*)\)$') {
    $name = $matches['name']
    $actualCode = [int]$matches['code']
    $detail = $matches['detail']
    $actualResult = $results | Where-Object { $_.Name -eq $name } | Select-Object -First 1
    $pass = if ($actualResult) { $actualResult.Ok } else { $false }
    $tag = if ($pass) { 'PASS' } else { 'FAIL' }
    Write-Host "[$tag] $name (code=$actualCode$detail)"
  } else {
    Write-Host $line
  }
}

$fail = ($results | Where-Object { -not $_.Ok }).Count
Write-Host ""
if ($fail -gt 0) {
  Write-Host "$fail assertion(s) FAILED:" -ForegroundColor Red
  $results | Where-Object { -not $_.Ok } | ForEach-Object { Write-Host "  - $($_.Name)" -ForegroundColor Red }
  exit 1
}
Write-Host "All helper assertions PASSED." -ForegroundColor Green
exit 0