<#
.SYNOPSIS
Validates the single TASK contract used by the three-tier pipeline.

Run by:
- Tier 1: before setting Status to READY_FOR_EXECUTION (mandatory).
- Tier 1: again at implementation preflight and as the first evidence row of HANDOFF.
- Tier 3: as assurance check C-09 for STANDARD/CRITICAL.

WHAT CHANGED (dry-run gate)
Shape checks alone previously let unsatisfiable acceptance criteria, nonexistent
commands, stale insertion lines and staged-blind diff checks reach implementation. The
`T-` checks below run the contract against reality before execution.

Strictness follows Status: a contract about to be executed
(READY_FOR_EXECUTION / REVISION_REQUIRED) is failed; a closed contract
(ACCEPTED / CANCELLED) only warns, so re-running C-09 on history stays green.
#>
[CmdletBinding()]
param(
    [Parameter(Mandatory = $true)]
    [string]$TaskPath,
    [string]$RepoRoot = "",
    [switch]$Incremental
)

$ErrorActionPreference = "Stop"
. (Join-Path $PSScriptRoot 'gate-lib.ps1')

try {
    if (-not (Test-Path -LiteralPath $TaskPath -PathType Leaf)) {
        Write-Host "RESULT: FAIL. TASK file not found: $TaskPath" -ForegroundColor Red
        exit 2
    }

    $repoRoot = $RepoRoot
    if ([string]::IsNullOrWhiteSpace($repoRoot)) { $repoRoot = Get-RepoRoot -ScriptRoot $PSScriptRoot }
    $taskDir  = Split-Path $TaskPath -Parent
    $slug     = Split-Path $taskDir -Leaf

    # -- Incremental: skip if inputs unchanged --------------------------------
    if ($Incremental) {
        $gateCheck = Test-GateInputsUnchanged -GateName 'verify-task.ps1' -TaskDir $taskDir -InputFiles @($TaskPath) -RepoRoot $repoRoot
        $changed = -not $gateCheck
        if (-not $changed) {
            Write-Host ""
            $state = Get-GateState -TaskDir $taskDir
            $prev = $state['gates']['verify-task.ps1']
            $cachedResult = $prev.result
            Write-GateIncrementalSkip -GateName 'verify-task.ps1' -CachedResult $cachedResult
            # Restore cache to make exit code match
            $hashes = Get-FileHashes -FilePaths @($TaskPath) -RepoRoot $repoRoot
            Save-GateState -TaskDir $taskDir -GateName 'verify-task.ps1' -Result $cachedResult -ExitCode $prev.exitCode -InputHashes $hashes
            Write-Host "RESULT: $cachedResult." -ForegroundColor $(if ($cachedResult -eq 'PASS' -or $cachedResult -eq 'DRAFT-VALID') { 'Green' } else { 'Red' })
            exit [int]($prev.exitCode)
        }
    }

    $content  = Get-Content -LiteralPath $TaskPath -Raw -Encoding UTF8
    $lines    = $content -split "`r?`n"
    $bt       = [string][char]96
    $plain    = $content -replace $bt, ''

    $ctx = New-GateContext -Title "TASK CONTRACT GATE" -Subject $TaskPath

    $status = (Get-ControlField -Text $content -FieldName 'Status')
    $statusHead = ''
    $mStatus = [regex]::Match($status, '^[A-Z_]+')
    if ($mStatus.Success) { $statusHead = $mStatus.Value }
    $isReady    = ($statusHead -eq 'READY_FOR_EXECUTION' -or $statusHead -eq 'REVISION_REQUIRED')
    $isClosed   = ($statusHead -eq 'ACCEPTED' -or $statusHead -eq 'CANCELLED')
    $dryRunHard = $isReady
    $laneRaw = Get-ControlField -Text $content -FieldName 'Assurance lane'
    $lane = ''
    $mLane = [regex]::Match($laneRaw.ToUpper(), '^(FAST|STANDARD|CRITICAL)$')
    if ($mLane.Success) { $lane = $mLane.Value }

    function Add-DryRunFinding {
        param([string]$Id, [string]$Message)
        if ($script:dryRunHard) { Add-GateError $script:ctx $Id $Message }
        else { Add-GateWarn $script:ctx $Id $Message }
    }

    # -- A-01 Required sections ----------------------------------------------
    $requiredSections = @(
        "## 0. Control",
        "## 1. Outcome",
        "## 2. Evidence",
        "## 3. Decisions",
        "## 4. Contract",
        "## 5. Execution Plan",
        "## 6. Acceptance",
        "## 7. Risk",
        "## 8. Open Questions",
        "## 9. Planner Resolution",
        "## 10. Revision Log"
    )
    $missing = 0
    foreach ($section in $requiredSections) {
        if ($content -notmatch [regex]::Escape($section)) {
            Add-GateError $ctx 'A-01' "missing section: $section"
            $missing++
        }
    }
    if ($missing -eq 0) { Add-GateOk $ctx 'A-01' "all 11 required sections present." }

    # -- A-02 Control fields -------------------------------------------------
    $missingFields = 0
    foreach ($field in @("Task slug", "Work type", "Spec version", "Status", "Baseline")) {
        if ($content -notmatch [regex]::Escape($field)) {
            Add-GateError $ctx 'A-02' "missing control field: $field"
            $missingFields++
        }
    }
    if ($missingFields -eq 0) { Add-GateOk $ctx 'A-02' "control fields present (status: $statusHead)." }
    if ([string]::IsNullOrWhiteSpace($laneRaw)) {
        Add-GateWarn $ctx 'A-02' "Assurance lane is absent; legacy-safe default CRITICAL applies. New contracts must declare FAST|STANDARD|CRITICAL."
        $lane = 'CRITICAL'
    } elseif ($lane -eq '') {
        Add-DryRunFinding 'A-02' "Assurance lane '$laneRaw' is invalid; expected FAST|STANDARD|CRITICAL."
    } else {
        Add-GateOk $ctx 'A-02' "assurance lane: $lane."
    }
    if (-not [string]::IsNullOrWhiteSpace($laneRaw)) {
        foreach ($field in @('In-scope roots', 'Required gates')) {
            $v = Get-ControlField -Text $content -FieldName $field
            if ([string]::IsNullOrWhiteSpace($v)) {
                Add-DryRunFinding 'A-02' "lane-aware contract is missing control field '$field'."
            }
        }
        $auditMode = (Get-ControlField -Text $content -FieldName 'Audit mode').ToUpper()
        if ($auditMode -notmatch '^(NONE|LIGHT|FOCUSED|DEEP|DELTA|FULL|CODE_AUDIT)$') {
            Add-DryRunFinding 'A-02' "Audit mode '$auditMode' is invalid; new contracts use NONE or LIGHT."
        } elseif ($auditMode -match '^(FOCUSED|DEEP|DELTA|FULL|CODE_AUDIT)$') {
            Add-GateWarn $ctx 'A-02' "Audit mode '$auditMode' is legacy-compatible; new contracts use LIGHT."
        } else {
            Add-GateOk $ctx 'A-02' "audit mode: $auditMode."
        }
        if ($auditMode -match '^(NONE|LIGHT)$') {
            $auditReason = Get-ControlField -Text $content -FieldName 'Audit reason'
            if ([string]::IsNullOrWhiteSpace($auditReason)) {
                Add-GateWarn $ctx 'A-02' "Audit reason is absent. New contracts should record one sentence so selective audit is reviewable."
            } else {
                Add-GateOk $ctx 'A-02' "audit selection has a recorded reason."
            }
        }
    }

    # -- T-08 Lane cannot understate an obviously critical surface -----------
    # This is intentionally conservative and only reads Control fields/paths,
    # not prose in non-goals (where words such as auth/RLS often appear).
    if ($lane -eq 'FAST') {
        $workType = (Get-ControlField -Text $content -FieldName 'Work type').ToUpper()
        $scopeRoots = Get-ControlField -Text $content -FieldName 'In-scope roots'
        $criticalPath = '(?i)(^|[/\\])(prisma|migrations|middleware|auth|security|payments?|payroll|infra|\.github)([/\\]|$)|schema\.prisma|next\.config|tsconfig|package(-lock)?\.json'
        if ($workType -match 'INFRA' -or $scopeRoots -match $criticalPath) {
            Add-DryRunFinding 'T-08' "FAST lane targets an obviously critical/control-plane surface (work type=$workType, roots=$scopeRoots). Raise to STANDARD/CRITICAL or narrow the scope."
        } else {
            Add-GateOk $ctx 'T-08' "FAST lane does not declare an obvious critical/control-plane root."
        }
    }

    # -- A-03 Identifiers ----------------------------------------------------
    foreach ($pair in @(@('RQ-\d{2,}', 'requirement (RQ-01)'), @('STEP-\d{2,}', 'execution step (STEP-01)'), @('AC-\d{2,}', 'acceptance (AC-01)'))) {
        if ($content -notmatch $pair[0]) { Add-GateError $ctx 'A-03' "no $($pair[1]) id found." }
    }

    # -- A-04 Placeholders on a contract about to be executed ----------------
    if ($isReady) {
        if ($content -match "NEED_USER_DECISION") {
            Add-GateError $ctx 'A-04' "$statusHead contract still contains NEED_USER_DECISION."
        }
        if ($content -match "<[^>]+>" -or $content -match "\bTBD\b" -or $content -match "\bTODO\b(?!\s*\()") {
            Add-GateError $ctx 'A-04' "$statusHead contract still contains placeholders / TBD / TODO."
        }
    } elseif (-not $isClosed) {
        Add-GateWarn $ctx 'A-04' "status is '$statusHead' - placeholder and dry-run checks are non-blocking."
    }

    # -- A-05 RQ -> STEP -> AC traceability ----------------------------------
    $rqIds = [regex]::Matches($plain, "RQ-\d{2,}") | ForEach-Object { $_.Value } | Sort-Object -Unique
    $stepToken = "(?:STEP-\d{2,}(?:\.\.\d{1,})?|all)"
    $acToken   = "AC-\d{2,}(?:\.\.\d{1,})?"
    $noteToken = "(?:\s*\([^|)]*\))?"
    $traceMissing = 0
    foreach ($rqId in $rqIds) {
        $tracePattern = "\|\s*$([regex]::Escape($rqId))\s*\|\s*${stepToken}(?:\s*,\s*${stepToken})*${noteToken}\s*\|\s*${acToken}(?:\s*,\s*${acToken})*${noteToken}\s*\|"
        if ($plain -notmatch $tracePattern) {
            Add-GateError $ctx 'A-05' "requirement $rqId has no direct RQ -> STEP -> AC traceability row."
            $traceMissing++
        }
    }
    if ($traceMissing -eq 0 -and $rqIds.Count -gt 0) {
        Add-GateOk $ctx 'A-05' "$($rqIds.Count) requirement(s) traceable to STEP and AC."
    }

    # -- Acceptance rows -----------------------------------------------------
    $sec6 = Get-MarkdownSection -Lines $lines -HeadingPattern '^##\s*6\.'
    if ($null -eq $sec6) { $sec6 = '' }
    $acRows = New-Object System.Collections.ArrayList
    foreach ($row in (Get-TableRows -Text $sec6)) {
        if ((Clear-MdDecoration $row.Cells[0]) -match '^AC-\d{2,}') { [void]$acRows.Add($row) }
    }

    # -- T-01 Every `npm run X` referenced must exist -------------------------
    # go-live-08 AUD-003: RQ-15/AC-15 required `npm run diff-check`, absent from
    # package.json, so the AC could never be satisfied.
    $pkgPath = Join-Path $repoRoot 'package.json'
    if (Test-Path -LiteralPath $pkgPath) {
        $pkg = Get-Content -LiteralPath $pkgPath -Raw -Encoding UTF8 | ConvertFrom-Json
        $scriptNames = @()
        if ($pkg.scripts) { $scriptNames = @($pkg.scripts.PSObject.Properties.Name) }
        $referenced = [regex]::Matches($plain, 'npm\s+run\s+([A-Za-z0-9:_\-]+)') | ForEach-Object { $_.Groups[1].Value } | Sort-Object -Unique
        $unknown = @($referenced | Where-Object { $scriptNames -notcontains $_ })
        if ($unknown.Count -gt 0) {
            Add-DryRunFinding 'T-01' "contract references npm script(s) that do not exist in package.json: $($unknown -join ', ')."
        } elseif ($referenced.Count -gt 0) {
            Add-GateOk $ctx 'T-01' "$($referenced.Count) referenced npm script(s) all exist."
        }
    }

    # -- T-02 file:line references must resolve ------------------------------
    # go-live-08 AUD-002: the "after line 297" insertion point was stale and
    # landed inside a dead CSS block.
    $fileLineRefs = @{}
    foreach ($m in [regex]::Matches($plain, '(?<![\w\-\./\\])(?<path>(?:src|app|prisma|tests|scripts|docs|public|middleware|packages)[\w\-\./\[\]\(\)]*\.(?:tsx|ts|jsx|js|mjs|cjs|css|sql|prisma|json|md|ps1|html)):(?<line>\d{1,5})')) {
        $key = $m.Groups['path'].Value + ':' + $m.Groups['line'].Value
        if (-not $fileLineRefs.ContainsKey($key)) { $fileLineRefs[$key] = $m }
    }
    $badRefs = New-Object System.Collections.ArrayList
    $staleRefs = New-Object System.Collections.ArrayList
    foreach ($key in $fileLineRefs.Keys) {
        $parts = $key -split ':'
        $rel = $parts[0]
        $lineNo = [int]$parts[1]
        $full = Join-Path $repoRoot ($rel -replace '/', '\')
        if (-not (Test-Path -LiteralPath $full -PathType Leaf)) { [void]$badRefs.Add($key); continue }
        $count = (Get-Content -LiteralPath $full | Measure-Object).Count
        if ($lineNo -gt $count) { [void]$staleRefs.Add("$key (file has $count lines)") }
    }
    if ($badRefs.Count -gt 0) {
        Add-DryRunFinding 'T-02' "contract cites line numbers in file(s) that do not exist: $(($badRefs | Select-Object -First 5) -join ', ')."
    }
    if ($staleRefs.Count -gt 0) {
        Add-GateWarn $ctx 'T-02' "line reference(s) beyond end of file: $(($staleRefs | Select-Object -First 5) -join ', ')."
    }
    if ($badRefs.Count -eq 0 -and $staleRefs.Count -eq 0 -and $fileLineRefs.Count -gt 0) {
        Add-GateOk $ctx 'T-02' "$($fileLineRefs.Count) file:line reference(s) resolve."
    }

    # -- T-03 A scope AC must not be measured with a bare `git diff` ---------
    # go-live-15 AC-10 and go-live-09 PLN-14: bare `git diff` prints nothing
    # once Tier 1 has staged, and `--stat` is blind to untracked files.
    $bareDiff = New-Object System.Collections.ArrayList
    foreach ($row in $acRows) {
        $joined = ($row.Cells -join ' ')
        foreach ($m in [regex]::Matches($joined, 'git\s+diff(?<args>[^|`]*)')) {
            $a = $m.Groups['args'].Value
            if ($a -match '(--cached|--staged|HEAD|\.\.|:)') { continue }
            [void]$bareDiff.Add((Clear-MdDecoration $row.Cells[0]))
            break
        }
        if ($joined -match 'git\s+diff\s+--stat' -and $joined -notmatch '(untracked|--others|status\s+--porcelain|ls-files)') {
            Add-GateWarn $ctx 'T-03' "$((Clear-MdDecoration $row.Cells[0])) measures scope with 'git diff --stat', which is blind to untracked files (go-live-09 PLN-21: 8 tracked vs 10 real)."
        }
    }
    if ($bareDiff.Count -gt 0) {
        Add-DryRunFinding 'T-03' "AC $(($bareDiff | Select-Object -Unique) -join ', ') proves scope with a bare 'git diff'. Use --cached, HEAD, or git status --porcelain."
    } else {
        Add-GateOk $ctx 'T-03' "no AC proves scope with a bare 'git diff'."
    }

    # -- T-04 A changed-file AC must allow the task's own artifacts ----------
    # go-live-15 AC-15 was unsatisfiable by ANY compliant handoff: the pipeline
    # forces HANDOFF + evidence into docs/tasks/<slug>/, which the AC excluded.
    $scopeAcs = New-Object System.Collections.ArrayList
    foreach ($row in $acRows) {
        $joined = ($row.Cells -join ' ')
        if ($joined -match '(?i)(porcelain|--name-only|changed file|danh sách file|danh sach file|tập con|tap con|subset)') {
            [void]$scopeAcs.Add((Clear-MdDecoration $row.Cells[0]))
        }
    }
    if ($scopeAcs.Count -gt 0) {
        $allowsOwnArtifacts = ($plain -match [regex]::Escape("docs/tasks/$slug")) -or ($plain -match '(?i)(HANDOFF\.md|evidence/)[^|]{0,80}(cho phép|duoc phep|được phép|allowed|nhóm|nhom|group)')
        if (-not $allowsOwnArtifacts) {
            Add-DryRunFinding 'T-04' "AC $(($scopeAcs | Select-Object -Unique) -join ', ') constrain the changed-file set but the contract never allows docs/tasks/$slug/** - unsatisfiable, because the pipeline forces HANDOFF and evidence to live there."
        } else {
            Add-GateOk $ctx 'T-04' "changed-file AC explicitly account for docs/tasks/$slug/**."
        }
    }

    # -- T-05 Every AC must name a measurable method -------------------------
    # go-live-08 AUD-006: 12 AC demanded browser-computed values in a repo with
    # zero browser runners. go-live-13 BLK-01: a synthetic code can only 404.
    # A LIVE/UAT contract legitimately names a method class ("HTTP", "Document
    # review") rather than a shell command, so those count as explicit methods.
    $manualMethod = '(?i)(đọc|doc\b|read|inspect|visual|manual|thủ công|thu cong|screenshot|mắt|mat thuong|Figma|' +
                    'HTTP|curl|Postman|browser|DevTools|\bUI\b|\bAPI\b|document review|runbook|dashboard|console|' +
                    'psql|SQL|Studio|Vercel|Neon|Supabase|smoke|UAT|checklist|ký|sign-?off|screen recording)'
    $noMethod = New-Object System.Collections.ArrayList
    foreach ($row in $acRows) {
        $joined = ($row.Cells -join ' ')
        if (Test-CellHasCommand $joined) { continue }
        if ($joined -match $manualMethod) { continue }
        [void]$noMethod.Add((Clear-MdDecoration $row.Cells[0]))
    }
    if ($noMethod.Count -gt 0) {
        Add-DryRunFinding 'T-05' "AC $(($noMethod | Select-Object -Unique) -join ', ') name neither a command nor an explicit manual method - an executor cannot produce evidence for them."
    } elseif ($acRows.Count -gt 0) {
        Add-GateOk $ctx 'T-05' "all $($acRows.Count) AC row(s) name a measurable method."
    }

    # -- T-06 Secret scan ----------------------------------------------------
    Add-SecretFindings -Ctx $ctx -CheckId 'T-06' -Text $content -Label 'TASK.md'

    # -- T-07 Status and round counters require a recorded Tier 1 decision ---
    # go-live-13 F-01 and hotfix-02 F-04: another tier wrote Status, Next gate
    # and the audit-round counter straight into TASK.md.
    $rel = Get-RelativeRepoPath -FullPath $TaskPath -RepoRoot $repoRoot
    $head = Get-GitFileAtHead -RepoRoot $repoRoot -RelPath $rel
    if ($null -ne $head -and $head.Trim() -ne '') {
        $headLines = $head -split "`r?`n"
        $fields = @('Status', 'Current execution round', 'Current audit round', 'Spec version')
        $changedFields = New-Object System.Collections.ArrayList
        foreach ($f in $fields) {
            $now = Get-ControlField -Text $content -FieldName $f
            $was = Get-ControlField -Text $head    -FieldName $f
            if ($now -ne $was) { [void]$changedFields.Add($f) }
        }
        if ($changedFields.Count -gt 0) {
            $secNow = Get-MarkdownSection -Lines $lines     -HeadingPattern '^##\s*9\.'
            $secWas = Get-MarkdownSection -Lines $headLines -HeadingPattern '^##\s*9\.'
            $logNow = Get-MarkdownSection -Lines $lines     -HeadingPattern '^##\s*10\.'
            $logWas = Get-MarkdownSection -Lines $headLines -HeadingPattern '^##\s*10\.'
            $justified = (($secNow -ne $secWas) -or ($logNow -ne $logWas))
            if (-not $justified) {
                Add-GateError $ctx 'T-07' "control field(s) changed without any Planner Resolution or Revision Log entry: $($changedFields -join ', '). Only Tier 1 moves Status, Spec version and round counters, and only with a written reason."
            } else {
                Add-GateOk $ctx 'T-07' "control field change ($($changedFields -join ', ')) is accompanied by a section 9/10 entry."
            }
        } else {
            Add-GateOk $ctx 'T-07' "control fields unchanged against HEAD."
        }
    }

    # -- Close ---------------------------------------------------------------
    Write-Host ""
    $e = $ctx.Errors.Count
    $w = $ctx.Warnings.Count
    if ($e -gt 0) {
        Write-Host "RESULT: FAIL ($e error(s), $w warning(s))." -ForegroundColor Red
        $result = "FAIL ($e error(s), $w warning(s))"
        $exitCode = 2
    } elseif ($w -gt 0 -and -not $isReady) {
        Write-Host "RESULT: DRAFT-VALID ($w warning(s))." -ForegroundColor Yellow
        $result = "DRAFT-VALID ($w warning(s))"
        $exitCode = 0
    } elseif ($w -gt 0) {
        Write-Host "RESULT: PASS ($w warning(s)). TASK contract is ready for execution." -ForegroundColor Yellow
        $result = "PASS ($w warning(s))"
        $exitCode = 0
    } else {
        Write-Host "RESULT: PASS. TASK contract is ready for execution." -ForegroundColor Green
        $result = "PASS"
        $exitCode = 0
    }

    # Save state cache
    if ($Incremental) {
        $hashes = Get-FileHashes -FilePaths @($TaskPath) -RepoRoot $repoRoot
        Save-GateState -TaskDir $taskDir -GateName 'verify-task.ps1' -Result $result -ExitCode $exitCode -InputHashes $hashes
    }

    exit $exitCode
}
catch {
    Write-Host "RESULT: FAIL. $($_.Exception.Message)" -ForegroundColor Red
    Write-Host $_.ScriptStackTrace -ForegroundColor DarkGray
    exit 2
}
