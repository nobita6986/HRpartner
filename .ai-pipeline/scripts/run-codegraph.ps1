<#
.SYNOPSIS
Runs CodeGraph when the real CLI is available. Never creates mocked evidence.
#>
[CmdletBinding()]
param(
    [Parameter(Mandatory = $true)]
    [string]$SourcePath,
    [Parameter(Mandatory = $true)]
    [string]$OutputPath,
    [ValidateSet("baseline", "diff")]
    [string]$Mode = "baseline"
)

$ErrorActionPreference = "Stop"

try {
    if (-not (Get-Command "codegraph" -ErrorAction SilentlyContinue)) {
        Write-Host "CodeGraph CLI is not available. No evidence file was created." -ForegroundColor Yellow
        exit 3
    }

    if (-not (Test-Path -LiteralPath $SourcePath)) {
        Write-Host "Source path not found: $SourcePath" -ForegroundColor Red
        exit 2
    }

    if ($Mode -eq "baseline") {
        codegraph analyze $SourcePath --output $OutputPath
    } else {
        codegraph impact $SourcePath --output $OutputPath
    }

    if ($LASTEXITCODE -ne 0) {
        exit $LASTEXITCODE
    }

    Write-Host "CodeGraph evidence created: $OutputPath" -ForegroundColor Green
    exit 0
}
catch {
    Write-Host "CodeGraph failed: $($_.Exception.Message)" -ForegroundColor Red
    exit 2
}
