$repo = "c:\CodeApp\HrP"
$pattern = "['" + "']['" + "a-zA-Z0-9!@#$%^_* -]{8,}['" + "']['" + "']"
Write-Host "Pattern: $pattern"
$result = & git -C $repo grep -nE $pattern prisma/seed.mjs 2>&1
Write-Host "Exit code: $LASTEXITCODE"
Write-Host "Output:"
Write-Host $result
