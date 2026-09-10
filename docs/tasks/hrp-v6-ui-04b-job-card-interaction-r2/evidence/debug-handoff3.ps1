# Load gate-lib functions
. 'c:\CodeApp\HrP\.ai-pipeline\scripts\gate-lib.ps1'

$h = Get-Content 'c:\CodeApp\HrP\docs\tasks\hrp-v6-ui-04b-job-card-interaction-r2\HANDOFF.md' -Raw

$field = Get-ControlField -Text $h -FieldName 'Execution round'
Write-Output "Get-ControlField('Execution round') = '$field'"

$round = Get-ControlRoundNumber -Text $h -Kind 'Execution'
Write-Output "Get-ControlRoundNumber = $round"

# Check the actual value extraction
if ($h -match '\|\s*Execution round\s*\|\s*([^\|\r\n]*)\|') {
    $raw = $Matches[1]
    Write-Output "Raw captured: '$raw'"
    $clean = Clear-MdDecoration $raw
    Write-Output "After Clear-MdDecoration: '$clean'"
}

# Check H-04: verify-task.ps1 row
$evRows = New-Object System.Collections.ArrayList
$hLines = $h -split "`r?`n"
# Find section 2 (Acceptance Evidence)
$inSec2 = $false
$sec2Lines = @()
foreach ($l in $hLines) {
    if ($l -match '^##\s*2\.') { $inSec2 = $true; continue }
    if ($inSec2 -and $l -match '^## ') { break }
    if ($inSec2) { $sec2Lines += $l }
}
Write-Output "--- Section 2 lines ---"
foreach ($l in $sec2Lines) {
    if ($l -match 'verify-task') {
        Write-Output "Found verify-task row: $l"
    }
}

# Check what the gate function sees for h3 (section 2)
$tables = Get-MarkdownTables -Text ($sec2Lines -join "`n")
Write-Output "Tables found in section 2: $($tables.Count)"
foreach ($t in $tables) {
    Write-Output "Table header: $($t.Header -join ' | ')"
    foreach ($row in $t.Rows) {
        $joined = $row.Cells -join ' | '
        if ($joined -match 'verify-task') {
            Write-Output "VERIFY-TASK ROW: $joined"
        }
    }
}
