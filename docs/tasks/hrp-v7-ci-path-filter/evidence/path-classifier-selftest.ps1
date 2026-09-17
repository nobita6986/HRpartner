# Self-test script (PowerShell) — reproduces the bash `case` classification
# logic used in .github/workflows/ci.yml "Detect changed paths" step.
#
# Mirrors the YAML case statement:
#   case "$f" in
#     docs/*|*.md|scratch/*|.gitignore|README*|.env.example) SKIP ;;
#     *) RUN ;;
#   esac

$ErrorActionPreference = "Stop"

# Glob matcher: returns $true if path matches pattern.
# Mirrors bash's case glob semantics (case-sensitive).
function Test-PathMatch([string]$path, [string]$pattern) {
    # Convert glob to regex: * -> .*, ? -> ., escape other regex chars
    $regex = [regex]::Escape($pattern).Replace('\?', '.').Replace('\*', '.*')
    return $path -match "^$regex$"
}

function Should-Skip([string]$f) {
    foreach ($p in @('docs/*', '*.md', 'scratch/*', '.gitignore', 'README*', '.env.example')) {
        if (Test-PathMatch $f $p) { return $true }
    }
    return $false
}

function Decide-Itegration([string[]]$files) {
    foreach ($f in $files) {
        if (-not (Should-Skip $f)) { return "RUN" }
    }
    return "SKIP"
}

function Assert-Decision([string]$label, [string]$expected, [string[]]$files) {
    $actual = Decide-Itegration $files
    if ($actual -eq $expected) {
        Write-Host "  PASS: $label  expected=$expected actual=$actual"
        $script:PASS++
    } else {
        Write-Host "  FAIL: $label  expected=$expected actual=$actual (files: $($files -join ', '))"
        $script:FAIL++
    }
}

$script:PASS = 0
$script:FAIL = 0

Write-Host "Path-classifier self-test (4 fixtures)"
Write-Host "======================================="

# Fixture A: docs-only PR (should SKIP)
Assert-Decision "A. docs-only (docs/**)" "SKIP" @(
    "docs/tasks/hrp-v7-ci-path-filter/TASK.md",
    "docs/V8/V8_MASTER_PLAN.md"
)

# Fixture B: markdown files at repo root (should SKIP)
Assert-Decision "B. *.md at root" "SKIP" @(
    "README.md",
    "CONTRIBUTING.md",
    "CHANGELOG.md"
)

# Fixture C: .gitignore only (should SKIP)
Assert-Decision "C. .gitignore only" "SKIP" @(
    ".gitignore"
)

# Fixture D: mixed docs + package.json (should RUN — fail-safe)
Assert-Decision "D. mixed docs + package.json (fail-safe RUN)" "RUN" @(
    "docs/V8/V8_MASTER_PLAN.md",
    "package.json"
)

Write-Host "---------------------------------------"
Write-Host "Results: PASS=$script:PASS FAIL=$script:FAIL"

if ($script:FAIL -gt 0) {
    Write-Host "REGRESSION - fix classifier before commit."
    exit 1
}
Write-Host "OK - classifier matches expected behavior."
exit 0
