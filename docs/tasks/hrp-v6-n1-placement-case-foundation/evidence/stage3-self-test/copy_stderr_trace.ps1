# copy_stderr_trace.ps1 — copy a stderr trace stream (n1-trace: created /
# deleted / ... lines) to an evidence path with raw bytes, AND verify
# the trace is actually present (refuses to write an empty trace file).
#
# Audit fix 2026-09-12 22:45 (Tier-0-block round 5): the previous design
# reused `write_ndjson_evidence.ps1` for both stdout NDJSON and stderr
# trace, but the NDJSON helper filters with `if ($l[0] -eq '{')` — which
# silently DROPS every `n1-trace:` line on stderr. The result was an
# empty trace evidence file even when stderr had data. Tier-0 caught
# this and blocked batch 5.
#
# This helper is the dedicated companion to write_ndjson_evidence.ps1:
#   - Reads the source via [System.IO.File]::ReadAllText (UTF-8 no BOM,
#     no console transformation).
#   - Keeps ONLY lines starting with `n1-trace:` (the probe's stderr
#     trace channel). Other stderr content (Node's own diagnostic
#     output, runtime errors, etc.) is dropped — the evidence file is
#     meant to be diffable (created vs deleted).
#   - Refuses to write if zero `n1-trace:` lines are found. This is the
#     critical safety property: an empty trace file silently defeats
#     the recovery channel; we MUST refuse rather than tolerate it.
#   - Verifies `created` and `deleted` counts are EQUAL (parity) — the
#     operator's recovery contract is "every created ID was deleted on
#     the success path". On the failure path parity fails and the
#     recovery list is exactly `created - deleted`. Either case is
#     recorded as evidence; the helper does NOT refuse on parity
#     failure (that's a probe finding, not an evidence-format error).
#
# Usage:
#   powershell -File copy_stderr_trace.ps1 `
#     -Src run-YYYYMMDD-HHMMSS-stderr.log `
#     -Dst docs/tasks/.../evidence/.../embedded-pg18-stderr-rerun-YYYY-MM-DD-HH-MM.txt
#
# Exit codes:
#   0  → trace file written; counts reported.
#   30 → source file not found.
#   31 → source contains ZERO `n1-trace:` lines (refuse — wrong file or
#        trace channel was never written).
#   32 → source has `n1-trace:` lines but ALSO `{`-starting JSON lines
#        (refuse — operator probably passed the NDJSON file here;
#        channels would be silently mixed).
#   33 → destination directory creation failed.

[CmdletBinding()]
param(
  [Parameter(Mandatory=$true)][string]$Src,
  [Parameter(Mandatory=$true)][string]$Dst
)

$ErrorActionPreference = 'Continue'

if (-not (Test-Path $Src)) {
  [Console]::Error.WriteLine("Source stderr trace not found: $Src")
  exit 30
}

# Read source via [System.IO.File]::ReadAllText (UTF-8 no BOM, no
# console transformation). Strip trailing CR defensively.
$raw = [System.IO.File]::ReadAllText($Src, [System.Text.UTF8Encoding]::new($false))
$lines = $raw -split "`n" | ForEach-Object { $_.TrimEnd("`r") }

# Channel-isolation safety: if the file has JSON-shaped lines, the
# operator probably mis-routed the wrong file here. Refuse loudly
# rather than silently mix channels.
$jsonLeak = ($lines | Where-Object { $_.Length -gt 0 -and $_[0] -eq '{' }).Count
if ($jsonLeak -gt 0) {
  [Console]::Error.WriteLine("Source has $jsonLeak '{'-starting JSON line(s). That belongs to the NDJSON helper (write_ndjson_evidence.ps1), not stderr. Refusing to mix channels.")
  exit 32
}

# Strict-trace filter: keep ONLY lines starting with `n1-trace:`.
$traceLines = $lines | Where-Object { $_ -match '^n1-trace:' }

if ($traceLines.Count -eq 0) {
  [Console]::Error.WriteLine("Source contains ZERO 'n1-trace:' lines. Refusing to write an empty trace file. Wrong source? Was the probe run with `2> stderr.log`?")
  exit 31
}

# Parse the kind (created / deleted / unknown).
$createdCount = ($traceLines | Where-Object { $_ -match '^n1-trace: created ' }).Count
$deletedCount = ($traceLines | Where-Object { $_ -match '^n1-trace: deleted ' }).Count
$unknownCount = $traceLines.Count - $createdCount - $deletedCount

# Build the sanitized trace file: each `n1-trace:` line on its own row,
# plus a short header line as a comment-style prefix. The header is
# itself a non-JSON line; downstream tools MUST filter `^n1-trace:` to
# extract records. We do NOT prepend `{# ...}` JSON5-style comments —
# that would silently violate NDJSON parsing if a downstream tool
# mistakes the trace file for NDJSON.
$clean = New-Object System.Text.StringBuilder
[void]$clean.AppendLine("# n1-trace evidence file (audit fix 2026-09-12 22:45)")
[void]$clean.AppendLine("# created=$createdCount deleted=$deletedCount unknown=$unknownCount")
[void]$clean.AppendLine("# recover uncleaned IDs: diff created - deleted = (this trace's `created` lines) - (this trace's `deleted` lines)")
[void]$clean.AppendLine("# operator recovery path (NO LIKE, NO time range, exact IN-list only):")
[void]$clean.AppendLine("#   DELETE FROM candidate_submissions WHERE id IN (...);")
[void]$clean.AppendLine("#   DELETE FROM placement_case       WHERE id IN (...);")
[void]$clean.AppendLine("#   DELETE FROM labor_profiles       WHERE id IN (...);")
foreach ($l in $traceLines) { [void]$clean.AppendLine($l) }

# Write via [System.IO.File]::WriteAllText (UTF-8 no BOM, LF only).
$dstDir = Split-Path -Parent $Dst
if ($dstDir -and -not (Test-Path $dstDir)) {
  New-Item -ItemType Directory -Path $dstDir -Force -ErrorAction Stop | Out-Null
}
[System.IO.File]::WriteAllText($Dst, $clean.ToString(), [System.Text.UTF8Encoding]::new($false))

if ($createdCount -ne $deletedCount) {
  Write-Warning "Trace parity mismatch: created=$createdCount deleted=$deletedCount. The uncleaned IDs are exactly: (created) - (deleted). See header in evidence file."
} else {
  Write-Output "Trace OK: src_lines=$($lines.Count) trace_lines=$($traceLines.Count) created=$createdCount deleted=$deletedCount -> $Dst"
}
exit 0