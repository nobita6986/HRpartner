<#
.SYNOPSIS
Validates the portable AI Delivery Pipeline structure on Windows.
#>
[CmdletBinding()]
param(
    [string]$PipelineRoot = ""
)

$ErrorActionPreference = "Stop"
if ([string]::IsNullOrWhiteSpace($PipelineRoot)) {
    $PipelineRoot = Split-Path $PSScriptRoot -Parent
}
$failCount = 0
$warnCount = 0

function Test-RequiredFolder {
    param([string]$Path, [string]$Name)
    if (Test-Path -LiteralPath $Path -PathType Container) {
        Write-Host "  [OK] Folder: $Name" -ForegroundColor Green
    } else {
        Write-Host "  [FAIL] Missing folder: $Name ($Path)" -ForegroundColor Red
        $script:failCount++
    }
}

function Test-RequiredFile {
    param([string]$Path, [string]$Name)
    if (Test-Path -LiteralPath $Path -PathType Leaf) {
        Write-Host "  [OK] File: $Name" -ForegroundColor Green
    } else {
        Write-Host "  [FAIL] Missing file: $Name ($Path)" -ForegroundColor Red
        $script:failCount++
    }
}

function Test-OptionalCli {
    param([string]$Tool)
    if (Get-Command $Tool -ErrorAction SilentlyContinue) {
        Write-Host "  [OK] Optional CLI: $Tool" -ForegroundColor Green
    } else {
        Write-Host "  [WARN] Optional CLI unavailable: $Tool" -ForegroundColor Yellow
        $script:warnCount++
    }
}

try {
    $resolvedPipelineRoot = (Resolve-Path -LiteralPath $PipelineRoot).Path
    Write-Host "AI DELIVERY PIPELINE HEALTH CHECK" -ForegroundColor Cyan

    foreach ($folder in @("rules", "skills", "templates", "scripts")) {
        Test-RequiredFolder -Path (Join-Path $resolvedPipelineRoot $folder) -Name $folder
    }

    $requiredFiles = @(
        @("README.md", "single onboarding entrypoint"),
        @("PIPELINE-GUIDE.md", "operating guide"),
        @("tier0.md", "Tier 0 manifest"),
        @("tier1.md", "Tier 1 manifest"),
        @("tier2.md", "Tier 2 manifest"),
        @("tier3.md", "Tier 3 manifest"),
        @("rules\00-global-rules.md", "global rules"),
        @("rules\01-planner-rules.md", "legacy Planner pointer"),
        @("rules\02-engineer-rules.md", "legacy Engineer pointer"),
        @("rules\03-auditor-rules.md", "legacy Auditor pointer"),
        @("skills\README.md", "skill map"),
        @("skills\task-authoring\SKILL.md", "Planner core skill"),
        @("skills\code\SKILL.md", "Engineer core skill"),
        @("skills\audit\SKILL.md", "Auditor core skill"),
        @("skills\anti-hallucination\SKILL.md", "evidence skill"),
        @("templates\TASK.template.md", "TASK template"),
        @("templates\HANDOFF.template.md", "HANDOFF template"),
        @("templates\AUDIT.template.md", "AUDIT template"),
        @("templates\DOMAIN-KNOWLEDGE.template.md", "domain template"),
        @("scripts\gate-lib.ps1", "gate library"),
        @("scripts\verify-task.ps1", "TASK validator"),
        @("scripts\verify-handoff.ps1", "HANDOFF validator"),
        @("scripts\verify-audit.ps1", "AUDIT validator"),
        @("scripts\verify-delivery-presence.ps1", "delivery presence validator"),
        @("scripts\verify-gates.selftest.ps1", "gate self-test"),
        @("scripts\verify-pipeline.ps1", "pipeline health check")
    )
    foreach ($entry in $requiredFiles) {
        Test-RequiredFile -Path (Join-Path $resolvedPipelineRoot $entry[0]) -Name $entry[1]
    }

    $forbiddenNames = @("role_secrets.txt", "secrets.txt", ".env", ".env.local")
    foreach ($name in $forbiddenNames) {
        $candidate = Join-Path $resolvedPipelineRoot $name
        if (Test-Path -LiteralPath $candidate -PathType Leaf) {
            Write-Host "  [FAIL] Local secret must not live in portable kit: $name" -ForegroundColor Red
            $failCount++
        }
    }

    $allowedTopFiles = @(
        ".gitignore", "README.md", "PIPELINE-GUIDE.md",
        "tier0.md", "tier1.md", "tier2.md", "tier3.md"
    )
    Get-ChildItem -LiteralPath $resolvedPipelineRoot -File -Force | ForEach-Object {
        if ($allowedTopFiles -notcontains $_.Name) {
            Write-Host "  [WARN] Unexpected top-level file: $($_.Name)" -ForegroundColor Yellow
            $warnCount++
        }
    }

    Write-Host ""
    foreach ($tool in @("node", "npm", "npx", "codegraph")) {
        Test-OptionalCli -Tool $tool
    }

    Write-Host ""
    if ($failCount -gt 0) {
        Write-Host "RESULT: FAIL ($failCount required/portable rule failure(s), $warnCount warning(s))." -ForegroundColor Red
        exit 2
    }

    Write-Host "RESULT: PASS. Portable pipeline is coherent ($warnCount warning(s))." -ForegroundColor Green
    exit 0
}
catch {
    Write-Host "RESULT: FAIL. $($_.Exception.Message)" -ForegroundColor Red
    exit 2
}
