$h = Get-Content 'c:\CodeApp\HrP\docs\tasks\hrp-v6-ui-04b-job-card-interaction-r2\HANDOFF.md' -Raw
# Check what the actual line looks like
$lines = $h -split "`r?`n"
foreach ($l in $lines) {
    if ($l -match 'Execution') {
        Write-Output "Line with 'Execution': '$l'"
    }
    if ($l -match 'Execution round') {
        Write-Output "Line with 'Execution round': '$l'"
        Write-Output "Line bytes: $([System.Text.Encoding]::UTF8.GetBytes($l) | ForEach-Object { '{0:X2}' -f $_ })"
    }
}
# Check if |Execution round| is on one line or broken
Write-Output "---"
Write-Output "Raw section 0:"
$inSection0 = $false
foreach ($l in $lines) {
    if ($l -match '## 0\. Control') { $inSection0 = $true; continue }
    if ($inSection0 -and $l -match '## ') { break }
    if ($inSection0) { Write-Output $l }
}
