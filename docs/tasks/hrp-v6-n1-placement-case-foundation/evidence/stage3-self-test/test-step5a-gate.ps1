# test-step5a-gate.ps1 — exercise the STEP 5a real-run guard against
# synthesized NDJSON summary rows. Audit fix 2026-09-12 23:30
# (Tier-0-block round 7).
#
# The previous real-run guard at runbook STEP 5a was:
#
#   if (-not ($summary.PSObject.Properties.Name -contains 'stage3_real_pass') -or $summary.stage3_real_pass) {
#     throw "REAL RUN: summary.stage3_real_pass is not true. ..."
#   }
#
# Truth table:
#
#   | field present? | field value | old behaviour       | required behaviour
#   |----------------|-------------|---------------------|-------------------
#   | no             | n/a         | throws (correct)    | throws
#   | yes            | $true       | throws (BUG)        | accept (real PASS)
#   | yes            | $false      | accept (BUG)        | throw
#   | yes            | other       | throws (over-strict)| throw
#
# The buggy guard `... -or $stage3_real_pass` accepted only the false
# case and rejected the true case — exactly inverted from the real-run
# semantic. This test exercises both the true and false cases against
# synthesized NDJSON files to PROVE the fix works.
#
# Implementation note: this test does NOT spawn a child powershell to
# re-run the runbook inline; the runbook is a Markdown file, not a
# callable .ps1. Instead we embed the EXACT pre-fix and post-fix guard
# expressions and exercise them against the same ConvertFrom-Json
# pipeline the runbook uses. The two functions
# `Invoke-RealRunGuardV0` (the buggy one) and `Invoke-RealRunGuardV1`
# (the fixed one) are seeded into the local scope; the test calls
# each in turn with a synthesized summary object and asserts the
# return value (throw vs return). This gives us the same truth-table
# behaviour without depending on parser semantics of the Markdown.
#
# Usage:
#   powershell -NoProfile -File test-step5a-gate.ps1
#
# Exit code: 0 if all assertions pass; non-zero otherwise.

$ErrorActionPreference = 'Continue'

$evidenceDir = 'C:\CodeApp\HrP\docs\tasks\hrp-v6-n1-placement-case-foundation\evidence\stage3-self-test'

# ----- BUGGY (pre-fix) guard -----
# Returns: $true if the guard ACCEPTS the summary; $false if it REJECTS.
# In other words: $true means "the runbook would NOT throw", $false
# means "the runbook WOULD throw". To match real semantics, this is
# the negation of the throw predicate.
function Invoke-RealRunGuardV0([hashtable]$summary) {
  # Mimic the original buggy line:
  #   if (-not ($summary.PSObject.Properties.Name -contains 'stage3_real_pass') -or $summary.stage3_real_pass) {
  #     throw "..."
  #   }
  # When the predicate is true → throws → reject. When false → pass.
  # In PowerShell, $summary.stage3_real_pass coerces $true to true,
  # $false to false, $null to false, anything else per ToBoolean rules.
  $fieldPresent = $summary.ContainsKey('stage3_real_pass')
  $fieldValue   = if ($fieldPresent) { $summary['stage3_real_pass'] } else { $null }
  # PowerShell's `-or` uses truthy semantics. We mirror that.
  $throwPredicate = (-not $fieldPresent) -or [bool]$fieldValue
  return -not $throwPredicate   # invert: true = pass, false = reject
}

# ----- FIXED (post-fix) guard -----
# The correction matches the runbook's real-run semantics: accept iff
# the field is PRESENT AND its value is EXACTLY the boolean $true
# (not truthy — so $null, $false, the string "true", the integer 1
# all reject).
#
# IMPORTANT: a naive `$x -eq $true` is NOT strict enough — PowerShell
# considers the string "true" equal to the boolean `$true`. Empirical
# check (probe-bool.ps1, 2026-09-12 23:35):
#
#   | value          | -eq $true | [bool] | comment
#   |----------------|-----------|--------|---------
#   | $true (bool)   | True      | True   | pass
#   | $false (bool)  | False     | False  | reject
#   | 'true' (str)   | True      | True   | would falsely accept
#   | 'false' (str)  | False     | True   | would falsely reject too
#   | 1 (int)        | True      | True   | would falsely accept
#   | 0 (int)        | False     | False  | would falsely accept
#   | $null          | False     | False  | reject (correct)
#
# The robust check is `-is [bool] -and -eq $true`. This requires the
# value to be the actual boolean type. Everything else rejects.
function Invoke-RealRunGuardV1([hashtable]$summary) {
  $fieldPresent = $summary.ContainsKey('stage3_real_pass')
  if (-not $fieldPresent) { return $false }   # reject: missing field
  $v = $summary['stage3_real_pass']
  if ($v -isnot [bool]) { return $false }     # reject: not a boolean
  return ($v -eq $true)                       # accept only when bool true
}

# ----- synthesize summary NDJSON rows -----
# Each row is a single-line JSON object, written via raw bytes to avoid
# any console line-wrapping. Use the same ConvertFrom-Json step the
# runbook uses at STEP 5a: parse the line and read PSObject.Properties.
function Write-SyntheticSummary([string]$path, [hashtable]$summary) {
  $json = $summary | ConvertTo-Json -Compress
  [System.IO.File]::WriteAllText($path, $json + "`n", [System.Text.UTF8Encoding]::new($false))
}

function Read-SyntheticSummary([string]$path) {
  $line = (Get-Content $path -TotalCount 1 -ErrorAction SilentlyContinue)
  if (-not $line) { return $null }
  return ($line | ConvertFrom-Json)
}

$results = @()

# Build 4 cases:
#  (A) real-pass  : stage3_real_pass = $true   → expected: ACCEPT (V1)
#  (B) real-fail  : stage3_real_pass = $false  → expected: REJECT (V1)
#  (C) missing    : field absent                → expected: REJECT (V1)
#  (D) string-true: stage3_real_pass = "true"   → expected: REJECT (V1)
#       (defends against a future regression where someone uses [bool]
#       coercion again and accidentally accepts the string.)
#
# For each case we ALSO compute the V0 (buggy) result so we can prove
# that V0 inverts (A) and (B) — i.e. that the bug existed and that
# V1 fixes it. The test asserts:
#   - V1(A) = ACCEPT, V0(A) = REJECT  (inversion proof)
#   - V1(B) = REJECT, V0(B) = ACCEPT  (inversion proof)
#   - V1(C) = REJECT (matches V0(C))
#   - V1(D) = REJECT (V0 was REJECT here too — V1 is strictly stricter)

# Case (A)
$pathA = Join-Path $evidenceDir 'tmp-step5a-caseA.ndjson'
Write-SyntheticSummary $pathA @{ kind = 'summary'; total = 28; passed = 28; failed = 0; stage3_real_pass = $true }
$sumA = Read-SyntheticSummary $pathA
$v0A  = Invoke-RealRunGuardV0 @{ stage3_real_pass = $sumA.stage3_real_pass }
$v1A  = Invoke-RealRunGuardV1 @{ stage3_real_pass = $sumA.stage3_real_pass }
$okA1 = ($v1A -eq $true)                  # V1 accepts real PASS
$okA2 = ($v0A -eq $false)                 # V0 rejected real PASS (the bug)
$results += [PSCustomObject]@{ Name = 'case-A (real PASS):  V1 accepts, V0 rejects (inversion)'; Ok = ($okA1 -and $okA2) }

# Case (B)
$pathB = Join-Path $evidenceDir 'tmp-step5a-caseB.ndjson'
Write-SyntheticSummary $pathB @{ kind = 'summary'; total = 28; passed = 28; failed = 0; stage3_real_pass = $false }
$sumB = Read-SyntheticSummary $pathB
$v0B  = Invoke-RealRunGuardV0 @{ stage3_real_pass = $sumB.stage3_real_pass }
$v1B  = Invoke-RealRunGuardV1 @{ stage3_real_pass = $sumB.stage3_real_pass }
$okB1 = ($v1B -eq $false)                 # V1 rejects real FAIL
$okB2 = ($v0B -eq $true)                  # V0 accepted real FAIL (the bug)
$results += [PSCustomObject]@{ Name = 'case-B (real FAIL):  V1 rejects, V0 accepts (inversion)'; Ok = ($okB1 -and $okB2) }

# Case (C) — missing field. We mimic ConvertFrom-Json behaviour:
# a parsed JSON object whose source had no `stage3_real_pass` key has
# no PSObject.Properties.Name 'stage3_real_pass'. In our local
# hashtable model that means the key is absent.
$sumC = @{ kind = 'summary'; total = 28; passed = 28; failed = 0 }
$v0C  = Invoke-RealRunGuardV0 $sumC
$v1C  = Invoke-RealRunGuardV1 $sumC
$okC  = ($v0C -eq $false) -and ($v1C -eq $false)
$results += [PSCustomObject]@{ Name = 'case-C (field missing): both V0 and V1 reject'; Ok = $okC }

# Case (D) — string "true". Both V0 and V1 reject this — but for
# different reasons. V0's predicate is `(-not $fieldPresent) -or
# [bool]$fieldValue`. When `$fieldValue` is the string "true",
# `[bool]'true'` is `$true` in PowerShell (any non-empty string is
# truthy AND the literal "true" additionally parses to True), so
# `[bool]'true' -or $true` makes the throw predicate TRUE → reject.
# V1's predicate is `$fieldValue -eq $true`, which uses the equality
# operator. The string "true" is NOT equal to the boolean `$true`
# in PowerShell (different types), so V1 returns $false → reject.
# The test asserts both reject — V1 must not be MORE permissive than
# V0. Note: in practice this distinction is academic because both
# reject; the load-bearing assertions are cases (A) and (B), where
# the buggy V0 inverts the truth.
$sumD = @{ stage3_real_pass = 'true' }
$v0D  = Invoke-RealRunGuardV0 $sumD
$v1D  = Invoke-RealRunGuardV1 $sumD
$okD  = ($v0D -eq $false) -and ($v1D -eq $false)
$results += [PSCustomObject]@{ Name = 'case-D (string "true"): both V0 and V1 reject'; Ok = $okD }

# ----- end-to-end: parse the runbook block as a real harness would -----
# Read the runbook file, find the corrected guard line, and verify the
# literal text matches the corrected expression. This catches an
# accidental edit that re-introduces the original bug. The test does
# NOT execute the Markdown; it only verifies that the corrected
# expression is present in the file.
$runbookPath = 'C:\CodeApp\HrP\docs\tasks\hrp-v6-n1-placement-case-foundation\evidence\stage3-hrp-mp2-test-runbook.md'
$runbookText = Get-Content $runbookPath -Raw -ErrorAction SilentlyContinue
$hasFixedGuard = $runbookText -match '\$srp\s+-isnot\s+\[bool\]'
$hasBuggyGuard  = $runbookText -match '\$summary\.stage3_real_pass\)\s+-or\s+\$summary\.stage3_real_pass'
$okE = $hasFixedGuard -and (-not $hasBuggyGuard)
$results += [PSCustomObject]@{ Name = 'case-E (runbook file): fixed guard present, buggy guard absent'; Ok = $okE }

# ----- cleanup tmp files -----
Remove-Item $pathA -ErrorAction SilentlyContinue
Remove-Item $pathB -ErrorAction SilentlyContinue

# ----- report -----
$fail = ($results | Where-Object { -not $_.Ok }).Count
Write-Host ""
Write-Host "=== STEP 5a real-run guard tests ==="
foreach ($r in $results) {
  $tag = if ($r.Ok) { 'PASS' } else { 'FAIL' }
  Write-Host "[$tag] $($r.Name)"
}
Write-Host ""
if ($fail -gt 0) {
  Write-Host "$fail assertion(s) FAILED:" -ForegroundColor Red
  $results | Where-Object { -not $_.Ok } | ForEach-Object { Write-Host "  - $($_.Name)" -ForegroundColor Red }
  exit 1
}
Write-Host "All STEP 5a guard assertions PASSED." -ForegroundColor Green
exit 0
