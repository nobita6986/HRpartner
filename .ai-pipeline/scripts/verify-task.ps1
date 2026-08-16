<#
.SYNOPSIS
Validates the single TASK contract used by the three-tier pipeline.
#>
[CmdletBinding()]
param(
    [Parameter(Mandatory = $true)]
    [string]$TaskPath
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

    $content = Get-Content -LiteralPath $TaskPath -Raw -Encoding UTF8
    Write-Host "TASK CONTRACT CHECK: $TaskPath" -ForegroundColor Cyan

    $requiredSections = @(
        "## 0. Control",
        "## 1. Outcome",
        "## 2. Evidence",
        "## 3. Decisions",
        "## 4. Contract",
        "## 5. Execution Plan",
        "## 6. Acceptance",
        "## 7. Risk",
        "## 8. Open Questions",
        "## 9. Planner Resolution",
        "## 10. Revision Log"
    )

    foreach ($section in $requiredSections) {
        if ($content -notmatch [regex]::Escape($section)) {
            Add-Error "Missing section: $section"
        }
    }

    $requiredFields = @(
        "Task slug",
        "Work type",
        "Spec version",
        "Status",
        "Baseline"
    )

    foreach ($field in $requiredFields) {
        if ($content -notmatch [regex]::Escape($field)) {
            Add-Error "Missing control field: $field"
        }
    }

    if ($content -notmatch "RQ-\d{2,}") {
        Add-Error "No requirement ID found (expected RQ-01 or higher)."
    }
    if ($content -notmatch "STEP-\d{2,}") {
        Add-Error "No execution step ID found (expected STEP-01 or higher)."
    }
    if ($content -notmatch "AC-\d{2,}") {
        Add-Error "No acceptance ID found (expected AC-01 or higher)."
    }

    $backtickPattern = [regex]::Escape([string][char]96)
    $statusNormalized = $content -replace $backtickPattern, ""

    # Status cell may carry an annotation after the value (e.g. "READY_FOR_EXECUTION — chờ sếp giao").
    $isReady = $statusNormalized -match "\|\s*Status\s*\|\s*READY_FOR_EXECUTION"
    if ($isReady) {
        if ($content -match "NEED_USER_DECISION") {
            Add-Error "READY_FOR_EXECUTION task still contains NEED_USER_DECISION."
        }
        # "TODO(" = reference to an existing code TODO (e.g. TODO(V4 F24)) — not a placeholder.
        if ($content -match "<[^>]+>" -or $content -match "\bTBD\b" -or $content -match "\bTODO\b(?!\s*\()") {
            Add-Error "READY_FOR_EXECUTION task still contains placeholders/TBD/TODO."
        }
    } elseif ($statusNormalized -notmatch "\|\s*Status\s*\|\s*ACCEPTED") {
        Add-Warning "Task is not READY_FOR_EXECUTION; placeholder checks are non-blocking."
    }

    $rqIds = [regex]::Matches($statusNormalized, "RQ-\d{2,}") | ForEach-Object { $_.Value } | Sort-Object -Unique
    # A trace row may map one RQ to several STEPs and/or several ACs, incl. ranges:
    #   | RQ-03 | STEP-03, STEP-06 | AC-03 |
    #   | RQ-06 | STEP-07 | AC-02, AC-04, AC-05, AC-06 |
    #   | RQ-10 | STEP-01..10 | AC-10 |
    #   | RQ-10 | all | AC-08 |                       (alias: all = every step)
    #   | RQ-06 | STEP-04 | AC-02 (case deny) |       (annotation in parens)
    $stepToken = "(?:STEP-\d{2,}(?:\.\.\d{1,})?|all)"
    $acToken   = "AC-\d{2,}(?:\.\.\d{1,})?"
    $noteToken = "(?:\s*\([^|)]*\))?"
    foreach ($rqId in $rqIds) {
        $tracePattern = "\|\s*$([regex]::Escape($rqId))\s*\|\s*${stepToken}(?:\s*,\s*${stepToken})*${noteToken}\s*\|\s*${acToken}(?:\s*,\s*${acToken})*${noteToken}\s*\|"
        if ($statusNormalized -notmatch $tracePattern) {
            Add-Error "Requirement $rqId has no direct RQ -> STEP -> AC traceability row."
        }
    }

    Write-Host ""
    if ($errors -gt 0) {
        Write-Host "RESULT: FAIL ($errors error(s), $warnings warning(s))." -ForegroundColor Red
        exit 2
    }
    if ($warnings -gt 0) {
        Write-Host "RESULT: DRAFT-VALID ($warnings warning(s))." -ForegroundColor Yellow
        exit 0
    }

    Write-Host "RESULT: PASS. TASK contract is ready for execution." -ForegroundColor Green
    exit 0
}
catch {
    Write-Host "RESULT: FAIL. $($_.Exception.Message)" -ForegroundColor Red
    exit 2
}
