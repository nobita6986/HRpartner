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

    $isReady = $content -match "\| Status \| `?READY_FOR_EXECUTION`? \|"
    if ($isReady) {
        if ($content -match "NEED_USER_DECISION") {
            Add-Error "READY_FOR_EXECUTION task still contains NEED_USER_DECISION."
        }
        if ($content -match "<[^>]+>" -or $content -match "\bTBD\b" -or $content -match "\bTODO\b") {
            Add-Error "READY_FOR_EXECUTION task still contains placeholders/TBD/TODO."
        }
    } else {
        Add-Warning "Task is not READY_FOR_EXECUTION; placeholder checks are non-blocking."
    }

    $backtickPattern = [regex]::Escape([string][char]96)
    $normalizedContent = $content -replace $backtickPattern, ""
    $rqIds = [regex]::Matches($normalizedContent, "RQ-\d{2,}") | ForEach-Object { $_.Value } | Sort-Object -Unique
    foreach ($rqId in $rqIds) {
        $tracePattern = "\|\s*$([regex]::Escape($rqId))\s*\|\s*STEP-\d{2,}\s*\|\s*AC-\d{2,}\s*\|"
        if ($normalizedContent -notmatch $tracePattern) {
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
