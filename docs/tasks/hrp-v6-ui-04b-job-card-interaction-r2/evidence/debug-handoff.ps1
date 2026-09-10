$h = Get-Content 'c:\CodeApp\HrP\docs\tasks\hrp-v6-ui-04b-job-card-interaction-r2\HANDOFF.md' -Raw
if ($h -match '\|\s*Execution round\s*\|\s*(\d+)\s*\|') {
    Write-Output "FOUND: Execution round = $($Matches[1])"
} else {
    Write-Output "NOT FOUND for Execution round"
}
if ($h -match '\|\s*Spec version\s*\|\s*([^\|\r\n]+)\s*\|') {
    Write-Output "Spec: $($Matches[1].Trim())"
}
# Check round number parsing
if ($h -match 'Execution round[^|]*\|\s*(\d+)') {
    Write-Output "Execution round alt: $($Matches[1])"
}
