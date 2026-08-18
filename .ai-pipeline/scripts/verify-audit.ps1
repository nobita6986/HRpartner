<#
.SYNOPSIS
Validates AUDIT.md against TASK.md for the three-tier pipeline.

Run by:
- Tier 3: truoc khi ban giao AUDIT.md (bat buoc - dan ket qua vao AUDIT §4).
- Tier 1: tai /resolve (gate nhe - thay cho re-audit toan bo).

Cost: vai giay, khong dung token AI. Kiem tra cau truc + tinh day du + mau thuan
may-moc giua AUDIT.md va TASK.md (AC coverage, mandatory checks C-01..C-10,
evidence rows, verdict).
#>
[CmdletBinding()]
param(
    [Parameter(Mandatory = $true)]
    [string]$TaskPath,
    [string]$AuditPath = ""
)

$ErrorActionPreference = "Stop"
$errors = 0
$warnings = 0

function Add-Error {
    param([string]$Message)
    Write-Host "  [FAIL] $Message" -ForegroundColor Red
    $script:errors++
}

function Add-Warning {
    param([string]$Message)
    Write-Host "  [WARN] $Message" -ForegroundColor Yellow
    $script:warnings++
}

try {
    if (-not (Test-Path -LiteralPath $TaskPath -PathType Leaf)) {
        Add-Error "TASK file not found: $TaskPath"
        exit 2
    }

    if ([string]::IsNullOrWhiteSpace($AuditPath)) {
        $AuditPath = Join-Path (Split-Path $TaskPath -Parent) "AUDIT.md"
    }

    if (-not (Test-Path -LiteralPath $AuditPath -PathType Leaf)) {
        Add-Error "AUDIT file not found: $AuditPath"
        exit 2
    }

    $task  = Get-Content -LiteralPath $TaskPath  -Raw -Encoding UTF8
    $audit = Get-Content -LiteralPath $AuditPath -Raw -Encoding UTF8

    Write-Host "AUDIT CONTRACT CHECK: $AuditPath" -ForegroundColor Cyan
    Write-Host "  against TASK       : $TaskPath" -ForegroundColor Cyan
    Write-Host ""

    $backtick = [regex]::Escape([string][char]96)

    # -- 1. Sections ---------------------------------------------------------
    $requiredSections = @(
        "## 0. Audit Control",
        "## 1. Findings",
        "## 2. Acceptance Verification",
        "## 3. Scope",
        "## 4. Independent Evidence",
        "## 5. Coverage Gaps",
        "## 6. Verdict",
        "## 7. Re-audit Trace"
    )
    foreach ($section in $requiredSections) {
        if ($audit -notmatch [regex]::Escape($section)) {
            Add-Error "Missing section: $section"
        }
    }

    # -- 2. Spec version match TASK ------------------------------------------
    $taskSpec  = [regex]::Match($task,  "\|\s*Spec version\s*\|\s*([^|]+)\|").Groups[1].Value.Trim()
    $auditSpec = [regex]::Match($audit, "\|\s*Spec version\s*\|\s*([^|]+)\|").Groups[1].Value.Trim()
    $taskSpecN  = ($taskSpec  -replace $backtick, "").Trim()
    $auditSpecN = ($auditSpec -replace $backtick, "").Trim()
    if ($auditSpecN -eq "") {
        Add-Error "AUDIT section 0 missing Spec version."
    } elseif ($taskSpecN -ne $auditSpecN) {
        Add-Error "Spec version mismatch: TASK=$taskSpecN vs AUDIT=$auditSpecN."
    }

    # -- 3. AC coverage: every TASK AC needs a verdict row in AUDIT ----------
    $taskACs = [regex]::Matches($task, "AC-\d{2,}") | ForEach-Object { $_.Value } | Sort-Object -Unique
    if ($taskACs.Count -eq 0) {
        Add-Error "TASK has no AC-xx IDs."
    }
    foreach ($acId in $taskACs) {
        # Row: | `AC-01` | method | PASS | evidence | finding |
        # NOTE: \x60 = backtick trong regex; KHONG dung $backtick? trong chuoi
        # double-quoted vi PS 5.1 nuot "?..." vao ten bien ($backtick?C = $null).
        $acRow = "\|\s*\x60?" + $acId + "\x60?\s*\|\s*[^|\n]*\|\s*(PASS|FAIL|PARTIAL|BLOCKED|N/A)\s*\|"
        if ($audit -notmatch $acRow) {
            Add-Error "$acId has no verdict row in AUDIT section 2 (format: | AC | method | PASS/FAIL/... | evidence |)."
        }
    }

    # -- 4. Mandatory checks C-01..C-10 --------------------------------------
    $mandatoryChecks = @(
        "C-01", "C-02", "C-03", "C-04", "C-05",
        "C-06", "C-07", "C-08", "C-09", "C-10"
    )
    $failedMandatory = @()
    foreach ($checkId in $mandatoryChecks) {
        $checkRow = "\|\s*\x60?" + $checkId + "\x60?\s*\|\s*(DONE|SKIP|FAIL)\s*\|"
        if ($audit -notmatch $checkRow) {
            Add-Error "Mandatory check $checkId missing in AUDIT (Deep Audit Checklist table, status DONE|SKIP|FAIL)."
            continue
        }
        if ([regex]::Match($audit, $checkRow).Groups[1].Value -eq "FAIL") {
            $failedMandatory += $checkId
        }
    }

    # -- 5. Verdict ----------------------------------------------------------
    $verdict = [regex]::Match($audit, "\*\*Verdict:\*\*\s*\x60?(PASS|CONDITIONAL|FAIL|BLOCKED)\x60?")
    if (-not $verdict.Success) {
        Add-Error "No verdict found in AUDIT section 6 (expected: **Verdict:** PASS|CONDITIONAL|FAIL|BLOCKED)."
    } else {
        $verdictValue = $verdict.Groups[1].Value
        Write-Host "  [OK] Verdict: $verdictValue" -ForegroundColor Green
        if ($failedMandatory.Count -gt 0 -and $verdictValue -in @("PASS", "CONDITIONAL")) {
            Add-Error "Contradiction: verdict=$verdictValue but mandatory check FAIL: $($failedMandatory -join ', ')."
        }
        if ($failedMandatory.Count -eq 0 -and $verdictValue -eq "FAIL") {
            Add-Warning "Verdict=FAIL but no mandatory check FAIL - verify verdict reason (P0/P1 findings?)."
        }
    }

    # -- 6. Independent Evidence section 4: at least 5 full rows --------------
    $evidenceRows = [regex]::Matches($audit, "\|\s*[^|\n]+\|\s*[^|\n]+\|\s*[^|\n]+\|\s*[^|\n]+\|")
    if ($evidenceRows.Count -lt 5) {
        Add-Error "AUDIT section 4 needs at least 5 evidence rows (command + exit + summary + path); found $($evidenceRows.Count)."
    }

    # -- 7. Closing handoff line ---------------------------------------------
    if ($audit -notmatch "AUDIT\.md cho Tier 1") {
        Add-Error "Missing handoff line: '... AUDIT.md cho Tier 1 ...'"
    }

    Write-Host ""
    if ($errors -gt 0) {
        Write-Host "RESULT: FAIL ($errors error(s), $warnings warning(s))." -ForegroundColor Red
        Write-Host "Tier 1 MUST NOT resolve on this AUDIT.md - request Tier 3 to fix/supplement." -ForegroundColor Red
        exit 2
    }
    if ($warnings -gt 0) {
        Write-Host "RESULT: PASS WITH WARNINGS ($warnings warning(s))." -ForegroundColor Yellow
        exit 0
    }

    Write-Host "RESULT: PASS. AUDIT.md has enough evidence for Tier 1 to resolve (no full re-audit needed)." -ForegroundColor Green
    exit 0
}
catch {
    Write-Host "RESULT: FAIL. $($_.Exception.Message)" -ForegroundColor Red
    exit 2
}
