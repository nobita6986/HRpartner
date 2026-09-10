# AC-11 regression check: compares our round's changes against working-tree-before.txt
# Pre-existing dirty files (marked by other agents before this round) are excluded.
$changes = (git diff --name-only HEAD 2>$null)
$allowlist = @(
    'app/(portal)/page.tsx',
    'src/domains/applications/marketplace-inventory.static.test.ts',
    'src/domains/job-board/components/landing/best-jobs-section.tsx',
    'src/domains/job-board/components/landing/featured-job-card.tsx'
)
# Pre-existing modified files from working-tree-before.txt
$preExisting = @(
    'docs/tasks/hrp-v6-ui-04-homepage-huongb-refinement/evidence/field-matrix.md',
    'docs/tasks/hrp-v6-ui-04-homepage-huongb-refinement/evidence/plan-admin-v6.md',
    'docs/tasks/hrp-v6-ui-04-homepage-huongb-refinement/evidence/plan-overview.md',
    'docs/tasks/hrp-v6-ui-04-homepage-huongb-refinement/evidence/skeleton-B-C-D.md'
)
$outOfScope = @()
foreach ($f in $changes) {
    $foundAllow = $false
    foreach ($a in $allowlist) {
        if ($f -eq $a) { $foundAllow = $true; break }
    }
    $foundPre = $false
    foreach ($p in $preExisting) {
        if ($f -eq $p) { $foundPre = $true; break }
    }
    # Allow if in allowlist OR in pre-existing dirty set
    if (-not $foundAllow -and -not $foundPre) {
        $outOfScope += $f
    }
}
if ($outOfScope.Count -eq 0) {
    Write-Output "AC-11: 0 out-of-scope files (PASS)"
    "AC-11: 0 out-of-scope files (PASS) -- all changed files are in allowlist or pre-existing dirty set" | Out-File -FilePath "docs/tasks/hrp-v6-ui-04b-job-card-interaction-r2/evidence/ac11-regression.txt" -Encoding utf8
} else {
    Write-Output "AC-11: $($outOfScope.Count) out-of-scope file(s)"
    $outOfScope | Out-File -FilePath "docs/tasks/hrp-v6-ui-04b-job-card-interaction-r2/evidence/ac11-regression.txt" -Encoding utf8
}
