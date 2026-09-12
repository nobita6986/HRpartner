# write_ndjson_evidence.ps1 — copy a JSON-only NDJSON stream to an
# evidence path with raw bytes (no PowerShell-side line wrapping).
#
# Purpose: replaces the old STEP 5b `Out-File -Encoding utf8` which
# wrapped JSON objects across multiple lines on PowerShell console width
# (the cause of the 2026-09-12 21:30 NDJSON file corruption that
# Tier-0 caught with `ConvertFrom-Json` per-line parse — only 10 of 30
# lines were valid).
#
# Audit fix 2026-09-12 22:45 (Tier-0-block round 5): this helper is now
# STRICTLY for NDJSON streams (one JSON object per line, lines starting
# with `{`). It refuses to write ANY line that doesn't start with `{`.
# For the stderr trace stream (`n1-trace: created/deleted`), use the
# SEPARATE helper `copy_stderr_trace.ps1` — that helper requires the
# stream to contain n1-trace lines and refuses if it doesn't, so we
# never accidentally write an empty trace file (which would defeat the
# recovery channel).
#
# This script:
#   1. Reads the source via [System.IO.File]::ReadAllText (UTF-8 no
#      BOM, no console transformation). Strips trailing CR defensively.
#   2. Parses each line with ConvertFrom-Json in a per-line try/catch.
#   3. Counts lines starting with `{` (NDJSON rows) AND lines NOT
#      starting with `{` (refused banners, REFUSED messages, ...).
#   4. Exits non-zero if any `{`-line is unparseable (broken NDJSON),
#      OR if the file has zero JSON lines at all.
#   5. Writes the cleaned NDJSON via [System.IO.File]::WriteAllText
#      (raw bytes, UTF-8 no BOM, LF only).
#
# Usage:
#   powershell -File write_ndjson_evidence.ps1 `
#     -Src run-YYYYMMDD-HHMMSS.ndjson `
#     -Dst docs/tasks/.../evidence/.../embedded-pg18-ndjson-rerun-YYYY-MM-DD-HH-MM.txt
#
# Exit codes:
#   0  → NDJSON OK, file written.
#   20 → source file not found.
#   21 → NDJSON had unparseable JSON lines (broken NDJSON — refuse).
#   22 → NDJSON had ZERO `{`-starting lines (refuse — probably wrong file).
#   23 → source file has no `n1-trace` content (looks like an NDJSON
#        file but no trace lines; caller probably passed a trace file
#        to the wrong helper; for safety this is refused too).
#   24 → destination directory creation failed.

[CmdletBinding()]
param(
  [Parameter(Mandatory=$true)][string]$Src,
  [Parameter(Mandatory=$true)][string]$Dst
)

# Audit fix 2026-09-12 22:45: $ErrorActionPreference=Stop + Write-Error
# turns refusal into a terminating exception, which overrides our
# `exit N` with $LASTEXITCODE=1. Use Continue + [Console]::Error so
# the runbook's `$LASTEXITCODE -eq 21` checks (etc.) actually see
# the intended exit code.
$ErrorActionPreference = 'Continue'

if (-not (Test-Path $Src)) {
  [Console]::Error.WriteLine("Source NDJSON not found: $Src")
  exit 20
}

# Read source via [System.IO.File]::ReadAllText (UTF-8 no BOM, no
# console transformation). Strip trailing CR.
$raw = [System.IO.File]::ReadAllText($Src, [System.Text.UTF8Encoding]::new($false))
$lines = $raw -split "`n" | ForEach-Object { $_.TrimEnd("`r") }

# Strict-NDJSON filter: keep ONLY lines that start with `{` AND parse
# as valid JSON. Banners / REFUSED lines / trace lines are skipped.
$jsonLines = 0
$badLines  = 0
$badIdx    = @()
$clean     = New-Object System.Text.StringBuilder

for ($i = 0; $i -lt $lines.Count; $i++) {
  $l = $lines[$i]
  if ($l.Length -gt 0 -and $l[0] -eq '{') {
    try {
      $null = $l | ConvertFrom-Json -ErrorAction Stop
      [void]$clean.AppendLine($l)
      $jsonLines++
    } catch {
      $badLines++
      $badIdx += ($i + 1)
    }
  }
}

if ($badLines -gt 0) {
  [Console]::Error.WriteLine("NDJSON parse FAILED on $badLines line(s); indices (1-based): $($badIdx -join ','). Do NOT use this as evidence.")
  exit 21
}
if ($jsonLines -eq 0) {
  [Console]::Error.WriteLine("Source contains ZERO lines starting with '{'. Refusing to write an empty NDJSON. Wrong source file?")
  exit 22
}

# Safety: NDJSON file should NOT have n1-trace lines (those belong to
# the stderr channel, written via copy_stderr_trace.ps1). If we see
# them here, the operator probably passed a stderr file by mistake —
# refuse loudly.
$traceLinesInNdjson = ($lines | Where-Object { $_ -match '^n1-trace:' }).Count
if ($traceLinesInNdjson -gt 0) {
  [Console]::Error.WriteLine("Source contains $traceLinesInNdjson 'n1-trace:' line(s). That stream belongs to the STDERR helper (copy_stderr_trace.ps1). Refusing to mix channels.")
  exit 23
}

# Write cleaned NDJSON via [System.IO.File]::WriteAllText (UTF-8 no
# BOM, LF only). AppendLine semantics preserve the LF the probe emitted.
$dstDir = Split-Path -Parent $Dst
if ($dstDir -and -not (Test-Path $dstDir)) {
  New-Item -ItemType Directory -Path $dstDir -Force -ErrorAction Stop | Out-Null
}
[System.IO.File]::WriteAllText($Dst, $clean.ToString(), [System.Text.UTF8Encoding]::new($false))

Write-Output "NDJSON OK: src_lines=$($lines.Count) json_lines=$jsonLines bad_lines=$badLines -> $Dst"
exit 0