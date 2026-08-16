<#
.SYNOPSIS
Checks required files for the three-tier AI pipeline on Windows.
#>
[CmdletBinding()]
param(
    [string]$PipelineRoot = (Split-Path $PSScriptRoot -Parent)
)

$ErrorActionPreference = "Stop"
$failCount = 0

function Test-RequiredFolder {
    param([string]$Path, [string]$Name)

    if (Test-Path -LiteralPath $Path -PathType Container) {
        Write-Host "  [OK] Folder exists: $Name" -ForegroundColor Green
        return
    }

    Write-Host "  [FAIL] Missing folder: $Name ($Path)" -ForegroundColor Red
    $script:failCount++
}

function Test-RequiredFile {
    param([string]$Path, [string]$Name)

    if (Test-Path -LiteralPath $Path -PathType Leaf) {
        Write-Host "  [OK] File exists: $Name" -ForegroundColor Green
        return
    }

    Write-Host "  [FAIL] Missing file: $Name ($Path)" -ForegroundColor Red
    $script:failCount++
}

function Test-OptionalCli {
    param([string]$Tool)

    if (Get-Command $Tool -ErrorAction SilentlyContinue) {
        Write-Host "  [OK] Optional CLI available: $Tool" -ForegroundColor Green
    } else {
        Write-Host "  [WARN] Optional CLI unavailable: $Tool" -ForegroundColor Yellow
    }
}

try {
    $resolvedPipelineRoot = (Resolve-Path -LiteralPath $PipelineRoot).Path
    $projectRoot = Split-Path $resolvedPipelineRoot -Parent

    Write-Host "AI PIPELINE 3-TIER HEALTH CHECK" -ForegroundColor Cyan

    Test-RequiredFolder -Path (Join-Path $resolvedPipelineRoot "rules") -Name "rules"
    Test-RequiredFolder -Path (Join-Path $resolvedPipelineRoot "skills") -Name "skills"
    Test-RequiredFolder -Path (Join-Path $resolvedPipelineRoot "templates") -Name "templates"
    Test-RequiredFolder -Path (Join-Path $resolvedPipelineRoot "scripts") -Name "scripts"

    Test-RequiredFile -Path (Join-Path $resolvedPipelineRoot "tier1.md") -Name "Tier 1 manifest"
    Test-RequiredFile -Path (Join-Path $resolvedPipelineRoot "tier2.md") -Name "Tier 2 manifest"
    Test-RequiredFile -Path (Join-Path $resolvedPipelineRoot "tier3.md") -Name "Tier 3 manifest"
    Test-RequiredFile -Path (Join-Path $resolvedPipelineRoot "agents\planner.md") -Name "Planner agent (Cursor YAML)"
    Test-RequiredFile -Path (Join-Path $resolvedPipelineRoot "agents\engineer.md") -Name "Engineer agent (Cursor YAML)"
    Test-RequiredFile -Path (Join-Path $resolvedPipelineRoot "agents\auditor.md") -Name "Auditor agent (Cursor YAML)"
    Test-RequiredFile -Path (Join-Path $resolvedPipelineRoot "agents\CROSS-COMPAT.md") -Name "Cross-compat mapping"
    Test-RequiredFile -Path (Join-Path $resolvedPipelineRoot "rules\00-global-rules.md") -Name "Global rules"
    Test-RequiredFile -Path (Join-Path $resolvedPipelineRoot "rules\01-planner-rules.md") -Name "Planner rules"
    Test-RequiredFile -Path (Join-Path $resolvedPipelineRoot "rules\02-engineer-rules.md") -Name "Coder rules"
    Test-RequiredFile -Path (Join-Path $resolvedPipelineRoot "rules\03-auditor-rules.md") -Name "Auditor rules"
    Test-RequiredFile -Path (Join-Path $resolvedPipelineRoot "skills\code\SKILL.md") -Name "Coder skill"
    Test-RequiredFile -Path (Join-Path $resolvedPipelineRoot "skills\audit\SKILL.md") -Name "Auditor skill"
    Test-RequiredFile -Path (Join-Path $resolvedPipelineRoot "templates\TASK.template.md") -Name "TASK template"
    Test-RequiredFile -Path (Join-Path $resolvedPipelineRoot "templates\HANDOFF.template.md") -Name "HANDOFF template"
    Test-RequiredFile -Path (Join-Path $resolvedPipelineRoot "templates\AUDIT.template.md") -Name "AUDIT template"
    Test-RequiredFile -Path (Join-Path $resolvedPipelineRoot "scripts\verify-task.ps1") -Name "TASK contract validator"
    Test-RequiredFile -Path (Join-Path $resolvedPipelineRoot "scripts\init-project.ps1") -Name "Bootstrap wrapper generator"

    Write-Host ""
    Test-OptionalCli -Tool "node"
    Test-OptionalCli -Tool "npm"
    Test-OptionalCli -Tool "npx"
    Test-OptionalCli -Tool "codegraph"
    Test-OptionalCli -Tool "repomix"

    Write-Host ""
    if ($failCount -gt 0) {
        Write-Host "RESULT: FAIL ($failCount required artifact(s) missing)." -ForegroundColor Red
        exit 2
    }

    Write-Host "RESULT: PASS. Three-tier, three-artifact contract is present." -ForegroundColor Green
    exit 0
}
catch {
    Write-Host "RESULT: FAIL. $($_.Exception.Message)" -ForegroundColor Red
    exit 2
}
