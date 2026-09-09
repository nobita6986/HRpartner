$content = Get-Content docs/tasks/hrp-portal-m9-affiliate-vendor/TASK.md -Raw -Encoding UTF8
$content = $content -replace 'RQ-01, RQ-02 \| STEP-01, STEP-02', "RQ-01        | STEP-01          | AC-01`n| RQ-02        | STEP-02          | AC-01"
$content = $content -replace 'RQ-03, RQ-04 \| STEP-03, STEP-04', "RQ-03        | STEP-03          | AC-02`n| RQ-04        | STEP-04          | AC-02"
Set-Content docs/tasks/hrp-portal-m9-affiliate-vendor/TASK.md -Value $content -Encoding UTF8
