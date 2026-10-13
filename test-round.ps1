$h = Get-Content 'C:\CodeApp\HrP-t1b-public-theme-picker-contrast\docs\tasks\hrp-t1b-public-theme-picker-contrast\HANDOFF.md' -Raw
$re = [regex]::Match($h, '\|\s*Execution round\s*\|([^|\r\n]*)\|')
Write-Host ('match=' + $re.Success)
Write-Host ('val=' + $re.Groups[1].Value)

. 'C:\CodeApp\HrP-t1b-public-theme-picker-contrast\.ai-pipeline\scripts\gate-lib.ps1'
$cf = Get-ControlField -Text $h -FieldName 'Execution round'
Write-Host ('cf=' + $cf)
