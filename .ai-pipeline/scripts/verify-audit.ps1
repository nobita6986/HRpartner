<#
.SYNOPSIS
Validates AUDIT.md against TASK.md (and HANDOFF.md when present) for the
three-tier pipeline.

Run by:
- Tier 3: before handing over AUDIT.md (mandatory - paste the result into AUDIT section 4).
- Tier 1: at /resolve (light gate instead of a full re-audit).

Cost: a few seconds, no AI tokens.

WHAT CHANGED (substance gate)
Until now this script only checked SHAPE: sections present, one row per AC, a
status token per C-check, at least five evidence rows. Two fabricated audits of
`hrp-v5-go-live-15-public-contrast-aa` both returned `RESULT: PASS` exit 0 -
recorded by Tier 1 in that TASK.md section 9.1: "that gate checks structure, not
measurement". Every check below with an `S-` id closes a defect class that has
already cost this project at least one round.
#>
[CmdletBinding()]
param(
    [Parameter(Mandatory = $true)]
    [string]$TaskPath,
    [string]$AuditPath = "",
    [string]$HandoffPath = "",
    [string]$RepoRoot = ""
)

$ErrorActionPreference = "Stop"
. (Join-Path $PSScriptRoot 'gate-lib.ps1')

try {
    if (-not (Test-Path -LiteralPath $TaskPath -PathType Leaf)) {
        Write-Host "RESULT: FAIL. TASK file not found: $TaskPath" -ForegroundColor Red
        exit 2
    }
    $taskDir = Split-Path $TaskPath -Parent
    if ([string]::IsNullOrWhiteSpace($AuditPath))   { $AuditPath   = Join-Path $taskDir "AUDIT.md" }
    if ([string]::IsNullOrWhiteSpace($HandoffPath)) { $HandoffPath = Join-Path $taskDir "HANDOFF.md" }

    $repoRoot = $RepoRoot
    if ([string]::IsNullOrWhiteSpace($repoRoot)) { $repoRoot = Get-RepoRoot -ScriptRoot $PSScriptRoot }
    $ctx = New-GateContext -Title "AUDIT SUBSTANCE GATE" -Subject "$AuditPath (against $TaskPath)"

    # -- S-01 Artifact integrity ---------------------------------------------
    # hotfix-01, go-live-11, go-live-12, go-live-13, go-live-14: AUDIT.md was
    # truncated to 0 bytes after the gate had already passed on it; untracked
    # copies were unrecoverable. go-live-10 F-04: left untracked for ~3 hours.
    if (-not (Test-Path -LiteralPath $AuditPath -PathType Leaf)) {
        Add-GateError $ctx 'S-01' "AUDIT file not found: $AuditPath"
        exit (Close-GateContext $ctx '' 'Tier 1 MUST NOT resolve without AUDIT.md.')
    }
    $auditItem = Get-Item -LiteralPath $AuditPath
    if ($auditItem.Length -lt 800) {
        Add-GateError $ctx 'S-01' "AUDIT.md is $($auditItem.Length) bytes - below the 800-byte floor. A truncated or empty audit is not resolvable (hotfix-01: 0 bytes for 44 min)."
    } else {
        Add-GateOk $ctx 'S-01' "AUDIT.md size $($auditItem.Length) bytes."
    }
    $auditRel = Get-RelativeRepoPath -FullPath $AuditPath -RepoRoot $repoRoot
    if (Test-GitTracked -RepoRoot $repoRoot -RelPath $auditRel) {
        Add-GateOk $ctx 'S-01' "AUDIT.md is tracked by git (recoverable)."
    } else {
        Add-GateError $ctx 'S-01' "AUDIT.md is NOT tracked by git ($auditRel). Stage it the moment it is written - go-live-14 round 2 lost an untracked 6358-byte audit."
    }

    $task    = Get-Content -LiteralPath $TaskPath  -Raw -Encoding UTF8
    $audit   = Get-Content -LiteralPath $AuditPath -Raw -Encoding UTF8
    $auditLines = $audit -split "`r?`n"
    $handoff = ''
    if (Test-Path -LiteralPath $HandoffPath -PathType Leaf) {
        $handoff = Get-Content -LiteralPath $HandoffPath -Raw -Encoding UTF8
    }

    # -- A-01 Required sections ----------------------------------------------
    $requiredSections = @(
        "## 0. Audit Control",
        "## 1. Findings",
        "## 2. Acceptance Verification",
        "## 3. Scope",
        "## 4. Independent Evidence",
        "## 5. Coverage Gaps",
        "## 6. Verdict",
        "## 7. Re-audit Trace"
    )
    $missingSections = 0
    foreach ($section in $requiredSections) {
        if ($audit -notmatch [regex]::Escape($section)) {
            Add-GateError $ctx 'A-01' "missing section: $section"
            $missingSections++
        }
    }
    if ($missingSections -eq 0) { Add-GateOk $ctx 'A-01' "all 8 required sections present." }

    # -- A-02 Spec version must match TASK -----------------------------------
    $taskSpec  = Get-ControlField -Text $task  -FieldName 'Spec version'
    $auditSpec = Get-ControlField -Text $audit -FieldName 'Spec version'
    if ($auditSpec -eq '') {
        Add-GateError $ctx 'A-02' "AUDIT section 0 has no Spec version."
    } elseif ($taskSpec -ne $auditSpec) {
        Add-GateError $ctx 'A-02' "spec version mismatch: TASK=$taskSpec vs AUDIT=$auditSpec."
    } else {
        Add-GateOk $ctx 'A-02' "spec version $auditSpec matches TASK."
    }

    # -- Section bodies ------------------------------------------------------
    $sec2 = Get-MarkdownSection -Lines $auditLines -HeadingPattern '^##\s*2\.'
    $sec4 = Get-MarkdownSection -Lines $auditLines -HeadingPattern '^##\s*4\.'
    $sec5 = Get-MarkdownSection -Lines $auditLines -HeadingPattern '^##\s*5\.'
    $sec7 = Get-MarkdownSection -Lines $auditLines -HeadingPattern '^##\s*7\.'
    if ($null -eq $sec2) { $sec2 = '' }
    if ($null -eq $sec4) { $sec4 = '' }
    if ($null -eq $sec5) { $sec5 = '' }
    if ($null -eq $sec7) { $sec7 = '' }

    $acStatus = @{}   # AC id -> result token
    $sec2Tables = Get-MarkdownTables -Text $sec2
    $acTable    = Find-MarkdownTable -Tables $sec2Tables -FirstCellPattern '^AC-\d{2,}'
    $checkTable = Find-MarkdownTable -Tables $sec2Tables -FirstCellPattern '^C-\d{2}'
    $acRows    = New-Object System.Collections.ArrayList
    $checkRows = New-Object System.Collections.ArrayList
    $acEvidenceCol = -1
    $acResultCol = -1
    $checkEvidenceCol = -1
    if ($null -ne $acTable) {
        $acEvidenceCol = Get-ColumnIndex -Header $acTable.Header -Pattern '(?i)evidence|bằng chứng|bang chung'
        # Result column header varies across this repo's audits: Result, Kết quả,
        # PASS/FAIL. Resolved here exactly the way $acEvidenceCol is resolved,
        # so S-19 reads the same cell the auditor wrote the verdict into.
        $acResultCol = Get-ColumnIndex -Header $acTable.Header -Pattern '(?i)^(pass\s*/\s*fail|result|verdict|kết\s*quả|ket\s*qua|kết\s*luận|ket\s*luan)\b'
        foreach ($r in $acTable.Rows) { if ((Clear-MdDecoration $r.Cells[0]) -match '^AC-\d{2,}') { [void]$acRows.Add($r) } }
    }
    if ($null -ne $checkTable) {
        $checkEvidenceCol = Get-ColumnIndex -Header $checkTable.Header -Pattern '(?i)evidence|bằng chứng|bang chung'
        foreach ($r in $checkTable.Rows) { if ((Clear-MdDecoration $r.Cells[0]) -match '^C-\d{2}') { [void]$checkRows.Add($r) } }
    }

    # -- A-03 Every TASK AC needs a verdict row ------------------------------
    $taskACs = [regex]::Matches($task, "AC-\d{2,}") | ForEach-Object { $_.Value } | Sort-Object -Unique
    if ($taskACs.Count -eq 0) { Add-GateError $ctx 'A-03' "TASK has no AC-xx ids." }
    $validResults = @('PASS', 'FAIL', 'PARTIAL', 'BLOCKED', 'ENV_BLOCKED', 'N/A', 'NA')
    $missingAc = 0
    foreach ($acId in $taskACs) {
        $row = $acRows | Where-Object { (Clear-MdDecoration $_.Cells[0]) -match ('^' + $acId + '(\D|$)') } | Select-Object -First 1
        if ($null -eq $row) {
            Add-GateError $ctx 'A-03' "$acId has no verdict row in AUDIT section 2."
            $missingAc++
            continue
        }
        $result = ''
        foreach ($cell in $row.Cells) {
            $v = (Clear-MdDecoration $cell).ToUpper()
            if ($validResults -contains $v) { $result = $v; break }
        }
        if ($result -eq '') {
            Add-GateError $ctx 'A-03' "$acId row carries no result token (PASS/FAIL/PARTIAL/BLOCKED/N/A): $($row.Raw)"
            $missingAc++
            continue
        }
        $acStatus[$acId] = $result
    }
    if ($missingAc -eq 0 -and $taskACs.Count -gt 0) {
        Add-GateOk $ctx 'A-03' "$($taskACs.Count) AC all carry a result row."
    }

    # The vocabulary a verdict is written in. Kept local to this script:
    # gate-lib.ps1 is outside gate-01's scope (DEC-03).
    $verdictOnlyPattern = '^(PASS|FAIL|PARTIAL|BLOCKED|ENV_BLOCKED|CONDITIONAL|OK|SKIP|N/A|NA)$'
    # -- S-02/S-03/S-04/S-11/S-12 Evidence substance per AC row --------------
    # go-live-02/03/05/09/10/15, hotfix-02: cells concluded in prose, cited a
    # checklist id, or named "Console Output" as their evidence path.
    $substanceProblems = 0
    foreach ($row in $acRows) {
        $acId = Clear-MdDecoration $row.Cells[0]
        $rest = @()
        for ($i = 1; $i -lt $row.Cells.Count; $i++) { $rest += $row.Cells[$i] }
        $joined = ($rest -join ' ')

        # Skip rows the auditor honestly could not measure - they are handled by
        # the coverage-gap cross-check (S-07) instead of being failed twice.
        $declared = ''
        if ($acStatus.ContainsKey($acId)) { $declared = $acStatus[$acId] }
        $isUnmeasured = ($declared -eq 'BLOCKED' -or $declared -eq 'ENV_BLOCKED' -or $declared -eq 'N/A' -or $declared -eq 'NA')

        if (-not $isUnmeasured) {
            if (-not (Test-CellHasCommand $joined)) {
                Add-GateError $ctx 'S-02' "$acId concluded without naming a command. An independent method must be a runnable command, not prose."
                $substanceProblems++
            }
            if (-not (Test-CellHasNumber $joined)) {
                Add-GateError $ctx 'S-02' "$acId evidence contains no measured value at all."
                $substanceProblems++
            }
            if (Test-CellIsChecklistReference $joined) {
                Add-GateError $ctx 'S-04' "$acId cites a checklist id (C-xx) as its evidence. go-live-15 audit round 1 did this for 13 of 15 AC."
                $substanceProblems++
            }
        }
        foreach ($cell in $rest) {
            if ($acEvidenceCol -lt 0) { break }
            if ($row.Cells.Count -le $acEvidenceCol) { break }
            $evCell = $row.Cells[$acEvidenceCol]
            if (Test-CellIsFakePath $evCell) {
                Add-GateError $ctx 'S-03' "$acId evidence path is '$((Clear-MdDecoration $evCell))' - not an artifact path. Write evidence/<file> or file:line."
                $substanceProblems++
            }
            break
        }
        if (Test-CellUsesNonCanonicalLane $joined $repoRoot) {
            Add-GateError $ctx 'S-11' "$acId used a bare 'npx vitest run' while vitest.config.ts at the repo root does not pin the DB variable to a fixed value, so that lane can still reach a live database - use 'npm run test:unit', pass --config, or lock the DB variable in vitest.config.ts."
            $substanceProblems++
        }
        if (Test-CellClaimsPreExistingWithoutBaseline $joined) {
            Add-GateError $ctx 'S-12' "$acId excuses a red result as pre-existing without pinning a baseline commit AND a reproduction command (m1-07a PLN-03, m1-06d PLN-01, m1-07b PLN-03 were all rejected for this)."
            $substanceProblems++
        }

        # -- S-19 A verdict word is not a measured result --------------------
        # rf-06 audit round 1: nine rows read "| AC-0x | Get-Content HANDOFF.md
        # | BLOCKED | 1 status read |". The Result cell carried the verdict
        # itself as the finding, and the $isUnmeasured skip above makes S-02
        # look away from exactly those rows, so nothing asked what had been
        # attempted. DEC-05: red only when the Result cell holds nothing but
        # verdict vocabulary AND the row shows no exit code and no measured
        # value. RQ-07 tightening, measured on go-live-16 AC-04 and AC-06: a
        # ratio (3:1) is a measurement, and an artifact path in the Evidence
        # cell is a re-checkable pointer - neither of those is red.
        $resultCell = ''
        if ($acResultCol -ge 0 -and $row.Cells.Count -gt $acResultCol) {
            $resultCell = Clear-MdDecoration $row.Cells[$acResultCol]
        } else {
            # STEP-03 fallback: no Result column resolved for this row (an
            # escaped pipe inside a cell shifts the row's own indices). Then any
            # cell that is nothing but a verdict word is the result cell.
            foreach ($cell in $rest) {
                $v = Clear-MdDecoration $cell
                if ($v -match $verdictOnlyPattern) { $resultCell = $v; break }
            }
        }
        if ($resultCell -match $verdictOnlyPattern) {
            $strippedCells = @()
            foreach ($cell in $rest) { $strippedCells += (Clear-MdDecoration $cell) }
            $strippedRow = ($strippedCells -join ' ')
            $hasExit     = (Test-CellHasResult $strippedRow)
            $hasValue    = ((Get-NumericLiterals -Text $strippedRow).Count -gt 0)
            $hasRatio    = [regex]::IsMatch($strippedRow, '\d+\s*[:/]\s*\d+')
            $hasArtifact = $false
            if ($acEvidenceCol -ge 0 -and $row.Cells.Count -gt $acEvidenceCol) {
                $hasArtifact = [regex]::IsMatch((Clear-MdDecoration $row.Cells[$acEvidenceCol]), '[\w\-\.]+[\\/][\w\-\./\\]*\.\w{2,5}')
            }
            # RQ-07 tightening 2, measured on go-live-05 AC-05 and AC-18 and
            # on go-live-14 AC-07: a named command reported as having returned
            # nothing IS a measurement. gate-lib already accepts '0 dong' and
            # '0 rows' as a result token, and the Vietnamese word for empty is
            # that same sentence written in words. Only the spellings carrying
            # diacritics are listed, on purpose: the bare ASCII foldings are
            # ordinary Vietnamese words and would rescue almost every row.
            $emptyOutPattern = '(?i)(rỗng|trống|empty|no match|no output|không có dòng nào)'
            $hasEmptyOut = ((Test-CellHasCommand $strippedRow) -and [regex]::IsMatch($strippedRow, $emptyOutPattern))
            if (-not ($hasExit -or $hasValue -or $hasRatio -or $hasArtifact -or $hasEmptyOut)) {
                Add-GateError $ctx 'S-19' "$acId uses the verdict word '$resultCell' as its measured result: the row carries no exit code, no measured value and no artifact path. A verdict is the conclusion of a measurement, not the measurement itself (rf-06 audit round 1 shipped nine such rows)."
                $substanceProblems++
            }
        }
    }
    if ($substanceProblems -eq 0 -and $acRows.Count -gt 0) {
        Add-GateOk $ctx 'S-02' "every measured AC row carries a command and a value."
    }

    # DEC-02: S-17 stays decimal-only on purpose. Widening '\d+[\.,]\d+' to
    # bare integers would fire on nearly every row of nearly every audit,
    # because the exit codes 0 and 1 are integers legitimately repeated across
    # all AC - "mot cong keu o moi hang thi khong ai doc nua". The whole-row
    # duplicate case is covered by S-18 below instead, without moving this
    # threshold. The residual hole - Test-CellHasNumber accepting one
    # meaningless digit (gate-lib.ps1 291-294) - is deferred debt, gate-01
    # RISK-03 / Q-01, and DEC-03 forbids changing that helper from here.
    # -- S-17 One measurement cannot prove several different AC --------------
    # go-live-15: the ratio 5.578:1 was presented as the result for AC-04, AC-05,
    # AC-06 and AC-07 - four different surfaces on four different backgrounds.
    $valueRows = @{}
    foreach ($row in $acRows) {
        $acId = Clear-MdDecoration $row.Cells[0]
        $rest = ''
        for ($i = 1; $i -lt $row.Cells.Count; $i++) { $rest = $rest + ' ' + $row.Cells[$i] }
        # A threshold is not a measurement: drop numbers introduced by >= or <=.
        $body = [regex]::Replace($rest, '(?:>=|<=|=>|=<|>|<|\u2265|\u2264)\s*\d+(?:[\.,]\d+)*', ' ')
        foreach ($m in [regex]::Matches($body, '\d+[\.,]\d+')) {
            $v = $m.Value -replace ',', '.'
            if (-not $valueRows.ContainsKey($v)) { $valueRows[$v] = New-Object 'System.Collections.Generic.HashSet[string]' }
            [void]$valueRows[$v].Add($acId)
        }
    }
    $reused = @()
    foreach ($v in $valueRows.Keys) {
        if ($valueRows[$v].Count -ge 3) { $reused += ($v + ' -> ' + ((@($valueRows[$v]) | Sort-Object) -join ', ')) }
    }
    if ($reused.Count -gt 0) {
        Add-GateWarn $ctx 'S-17' "one value is presented as the measurement of three or more different AC: $($reused -join '; '). Each AC measures a different surface, so each needs its own number."
    } elseif ($acRows.Count -gt 0) {
        Add-GateOk $ctx 'S-17' "no measured value is reused across three or more AC."
    }

    # -- S-18 Three AC rows cannot be one row copied -------------------------
    # rf-06 audit round 1: AC-01..AC-09 were nine copies of a single row - same
    # method, same Result, same Evidence, same Finding. S-09 only compares
    # section 4 ACROSS rounds, so a round-1 audit could ship nine identical
    # verdicts with nothing to catch it. DEC-04: three or more identical rows is
    # an error, exactly two is a warning - two AC can honestly share one
    # command, nine cannot.
    $rowGroups = New-Object 'System.Collections.Generic.Dictionary[string, System.Collections.Generic.HashSet[string]]'
    $rowSep = [string][char]31   # unit separator: never appears inside a cell
    foreach ($row in $acRows) {
        $acId = Clear-MdDecoration $row.Cells[0]
        $sig = @()
        for ($i = 1; $i -lt $row.Cells.Count; $i++) { $sig += (Clear-MdDecoration $row.Cells[$i]) }
        $key = ($sig -join $rowSep)
        if (($key -replace $rowSep, '').Trim() -eq '') { continue }
        if (-not $rowGroups.ContainsKey($key)) { $rowGroups[$key] = New-Object 'System.Collections.Generic.HashSet[string]' }
        [void]$rowGroups[$key].Add($acId)
    }
    $dupErrGroups = @()
    $dupWarnGroups = @()
    foreach ($key in $rowGroups.Keys) {
        $ids = @($rowGroups[$key] | Sort-Object)
        if ($ids.Count -ge 3) { $dupErrGroups += ($ids -join ', ') } elseif ($ids.Count -eq 2) { $dupWarnGroups += ($ids -join ', ') }
    }
    foreach ($g in $dupErrGroups) {
        Add-GateError $ctx 'S-18' "these AC share one row, identical cell for cell: $g ($($dupErrGroups.Count) such group(s) in section 2). One row copied over several AC measures none of them."
    }
    foreach ($g in $dupWarnGroups) {
        Add-GateWarn $ctx 'S-18' "$g carry an identical row, cell for cell ($($dupWarnGroups.Count) such pair(s)). Two AC may share one command, but each still needs its own measured value."
    }
    if ($dupErrGroups.Count -eq 0 -and $dupWarnGroups.Count -eq 0 -and $acRows.Count -gt 0) {
        Add-GateOk $ctx 'S-18' "$($acRows.Count) AC rows are pairwise distinct."
    }

    # -- A-04/S-05 Mandatory checks C-01..C-10 -------------------------------
    # The template puts the checklist in section 2, but several real audits put
    # it under section 7. Placement is a warning; a missing status is an error.
    if ($null -eq $checkTable) {
        $checkTable = Find-MarkdownTable -Tables (Get-MarkdownTables -Text $audit) -FirstCellPattern '^C-\d{2}'
        if ($null -ne $checkTable) {
            Add-GateWarn $ctx 'A-04' "the Deep Audit Checklist table is not under section 2 Acceptance Verification, where AUDIT.template.md puts it."
            $checkEvidenceCol = Get-ColumnIndex -Header $checkTable.Header -Pattern '(?i)evidence|bằng chứng|bang chung'
            foreach ($r in $checkTable.Rows) { if ((Clear-MdDecoration $r.Cells[0]) -match '^C-\d{2}') { [void]$checkRows.Add($r) } }
        }
    }
    $mandatory = @('C-01','C-02','C-03','C-04','C-05','C-06','C-07','C-08','C-09','C-10')
    $failedMandatory = @()
    $skippedNoReason = @()
    $skipped = @()
    # A status-only checklist ("| C-01 | DONE |") records no command for any
    # check. Say that once instead of ten times.
    $checklistHasEvidence = $true
    if ($null -ne $checkTable) {
        $maxCells = 0
        foreach ($r in $checkTable.Rows) { if ($r.Cells.Count -gt $maxCells) { $maxCells = $r.Cells.Count } }
        if ($maxCells -lt 3) {
            $checklistHasEvidence = $false
            Add-GateError $ctx 'S-05' "the Deep Audit Checklist records a bare status for C-01..C-10 with no evidence column. tier3.md requires DONE to carry command + exit + output, and SKIP to carry a reason."
        }
    }
    foreach ($checkId in $mandatory) {
        $row = $checkRows | Where-Object { (Clear-MdDecoration $_.Cells[0]) -match ('^' + $checkId + '(\D|$)') } | Select-Object -First 1
        if ($null -eq $row) {
            Add-GateError $ctx 'A-04' "mandatory check $checkId missing from the Deep Audit Checklist table."
            continue
        }
        $status = ''
        foreach ($cell in $row.Cells) {
            $v = (Clear-MdDecoration $cell).ToUpper()
            if ($v -match '^(DONE|SKIP|FAIL)') { $status = $v.Substring(0, 4).TrimEnd(')'); break }
        }
        $evidence = ''
        if ($checkEvidenceCol -ge 0 -and $row.Cells.Count -gt $checkEvidenceCol) {
            $evidence = $row.Cells[$checkEvidenceCol]
        } elseif ($row.Cells.Count -ge 3) {
            $evidence = $row.Cells[($row.Cells.Count - 1)]
        }
        switch -regex ($status) {
            '^FAIL' { $failedMandatory += $checkId }
            '^SKIP' {
                $skipped += $checkId
                # A reason must be written in the evidence cell, not inferred
                # from row length: "| C-03 | SKIP | No route |" is a valid reason.
                $reason = Clear-MdDecoration $evidence
                if ($checklistHasEvidence -and ($reason -eq '' -or $reason -match '(?i)^(skip|skipped|n/?a|-{1,2}|none)$' -or $reason.Length -lt 4)) {
                    $skippedNoReason += $checkId
                }
            }
            '^DONE' {
                # go-live-03: "C-01 green (assumed, per Handoff)"; go-live-12/13:
                # C-checks concluded in prose. DONE must show a command result.
                if (-not $checklistHasEvidence) {
                    # already reported once for the whole table
                } elseif (-not (Test-CellHasCommand $evidence)) {
                    Add-GateError $ctx 'S-05' "$checkId is DONE but its evidence names no command: [$((Clear-MdDecoration $evidence))]"
                } elseif (-not (Test-CellHasResult $evidence) -and -not (Test-CellHasNumber $evidence)) {
                    Add-GateError $ctx 'S-05' "$checkId is DONE but its evidence carries no exit code and no measured value."
                }
                if (Test-CellUsesNonCanonicalLane $evidence $repoRoot) {
                    Add-GateError $ctx 'S-11' "$checkId used a bare 'npx vitest run' and vitest.config.ts at the repo root does not pin the DB variable - use the canonical lane or lock that variable."
                }
            }
            default {
                Add-GateError $ctx 'A-04' "mandatory check $checkId has no DONE|SKIP|FAIL status."
            }
        }
    }
    foreach ($c in $skippedNoReason) {
        Add-GateError $ctx 'S-05' "$c is SKIP without a stated reason. tier3.md requires SKIP(reason)."
    }

    # -- A-05 Verdict --------------------------------------------------------
    $verdict = Get-AuditVerdict -Text $audit
    $allowedVerdicts = @('PASS', 'CONDITIONAL', 'FAIL', 'BLOCKED')
    if ($verdict -eq '') {
        Add-GateError $ctx 'A-05' "no verdict in AUDIT section 6 (expected **Verdict:** PASS|CONDITIONAL|FAIL|BLOCKED)."
    } elseif ($allowedVerdicts -notcontains $verdict) {
        Add-GateError $ctx 'A-05' "verdict '$verdict' is not one of PASS|CONDITIONAL|FAIL|BLOCKED (go-live-05 DEC-17: the gate accepts BLOCKED, not ENV_BLOCKED)."
    } else {
        Add-GateOk $ctx 'A-05' "verdict: $verdict"
        if ($failedMandatory.Count -gt 0 -and @('PASS','CONDITIONAL') -contains $verdict) {
            Add-GateError $ctx 'A-05' "contradiction: verdict=$verdict but mandatory check FAIL: $($failedMandatory -join ', ')."
        }
        if ($verdict -eq 'PASS' -and $skipped.Count -gt 0) {
            Add-GateWarn $ctx 'S-06' "verdict PASS with SKIP checks ($($skipped -join ', ')). tier3.md allows it only with a stated reason - go-live-05 R-A and go-live-15 were rejected here."
        }
        if ($verdict -eq 'PASS') {
            $nonPass = @()
            foreach ($k in $acStatus.Keys) { if ($acStatus[$k] -ne 'PASS' -and $acStatus[$k] -ne 'N/A' -and $acStatus[$k] -ne 'NA') { $nonPass += "$k=$($acStatus[$k])" } }
            if ($nonPass.Count -gt 0) {
                Add-GateError $ctx 'A-05' "verdict PASS while AC rows are not all PASS: $($nonPass -join ', ')."
            }
        }
    }

    # -- S-07 Coverage Gaps must not contradict the AC table -----------------
    # go-live-09 (two rounds running), go-live-11, go-live-13, go-live-15,
    # m1-06c PLN-02: section 5 said "none" while cells read BLOCKED.
    $nonPassList = @()
    foreach ($k in $acStatus.Keys) {
        if (@('FAIL','PARTIAL','BLOCKED','ENV_BLOCKED') -contains $acStatus[$k]) { $nonPassList += "$k=$($acStatus[$k])" }
    }
    if ((Test-SectionSaysNone -Text $sec5) -and ($nonPassList.Count -gt 0)) {
        Add-GateError $ctx 'S-07' "section 5 Coverage Gaps says none, but section 2 has unmeasured or failing AC: $($nonPassList -join ', ')."
    } elseif ((Test-SectionSaysNone -Text $sec5) -and ($verdict -eq 'BLOCKED' -or $verdict -eq 'FAIL')) {
        Add-GateError $ctx 'S-07' "section 5 says no coverage gap while the verdict is $verdict."
    } else {
        Add-GateOk $ctx 'S-07' "section 5 is consistent with the AC table."
    }

    # -- S-08 An AC the executor declared ENV_BLOCKED cannot be PASSed -------
    # go-live-09 PLN-13, go-live-13 F-03, mp3c AC-08.
    if ($handoff -ne '') {
        $blockedByHandoff = New-Object 'System.Collections.Generic.HashSet[string]'
        foreach ($line in ($handoff -split "`r?`n")) {
            if ($line -match '(?i)(ENV_BLOCKED|không thể chạy|khong the chay|no LIVE|chưa có môi trường)') {
                foreach ($m in [regex]::Matches($line, 'AC-\d{2,}')) { [void]$blockedByHandoff.Add($m.Value) }
            }
        }
        $violations = @()
        foreach ($acId in $blockedByHandoff) {
            if ($acStatus.ContainsKey($acId) -and $acStatus[$acId] -eq 'PASS') { $violations += $acId }
        }
        if ($violations.Count -gt 0) {
            Add-GateError $ctx 'S-08' "these AC are PASS in AUDIT but declared ENV_BLOCKED in HANDOFF: $($violations -join ', '). Closing an executor limitation is the Planner's act, not the auditor's."
        } else {
            Add-GateOk $ctx 'S-08' "no AC passed over a HANDOFF ENV_BLOCKED declaration."
        }
    }

    # -- A-06 Independent Evidence needs at least 5 real rows ----------------
    $sec4Tables = Get-MarkdownTables -Text $sec4
    $sec4Table = $null
    foreach ($t in $sec4Tables) { if ($t.Rows.Count -gt 0) { $sec4Table = $t; break } }
    $sec4Rows = New-Object System.Collections.ArrayList
    $sec4PathCol = -1
    if ($null -ne $sec4Table) {
        $sec4PathCol = Get-ColumnIndex -Header $sec4Table.Header -Pattern '(?i)evidence|path|artifact|đường dẫn'
        foreach ($row in $sec4Table.Rows) { if ($row.Cells.Count -ge 3) { [void]$sec4Rows.Add($row) } }
    }
    if ($sec4Rows.Count -lt 5) {
        # go-live-15 wrote section 4 as a fenced transcript instead of a table.
        # That is a format deviation, not an absence of evidence: accept it when
        # the block really contains commands with their output.
        $blockCmds = 0
        $blockResults = 0
        foreach ($m in [regex]::Matches($sec4, '(?s)```[a-zA-Z]*\r?\n(.*?)```')) {
            foreach ($bl in ($m.Groups[1].Value -split "`r?`n")) {
                $bl = $bl.Trim().TrimStart('#').Trim()
                if ($bl -eq '') { continue }
                if (Test-CellHasCommand $bl) { $blockCmds++; continue }
                if ((Test-CellHasResult $bl) -or (Test-CellHasNumber $bl)) { $blockResults++ }
            }
        }
        if ($blockCmds -ge 3 -and $blockResults -ge 3) {
            Add-GateWarn $ctx 'A-06' "section 4 is a fenced transcript ($blockCmds command line(s), $blockResults output line(s)) instead of the template table. Substance accepted; convert to the table so each row can be re-run."
        } else {
            Add-GateError $ctx 'A-06' "section 4 carries no independent evidence: $($sec4Rows.Count) table row(s), $blockCmds command line(s) in code blocks. The template requires at least 5 rows of command + exit + summary + path."
        }
    } else {
        Add-GateOk $ctx 'A-06' "section 4 has $($sec4Rows.Count) evidence rows."
    }
    $sec4Bad = 0
    foreach ($row in $sec4Rows) {
        $joined = ($row.Cells -join ' ')
        if (-not (Test-CellHasCommand $joined)) {
            Add-GateError $ctx 'S-02' "section 4 row names no command: $($row.Raw)"
            $sec4Bad++
        }
        if (-not (Test-CellHasResult $joined) -and -not (Test-CellHasNumber $joined)) {
            Add-GateError $ctx 'S-02' "section 4 row carries no exit code and no value: $($row.Raw)"
            $sec4Bad++
        }
        if ($sec4PathCol -ge 0 -and $row.Cells.Count -gt $sec4PathCol) {
            if (Test-CellIsFakePath $row.Cells[$sec4PathCol]) {
                Add-GateError $ctx 'S-03' "section 4 evidence path is '$((Clear-MdDecoration $row.Cells[$sec4PathCol]))' - hotfix-02 F-01 and go-live-12 F-04 were rejected for exactly this."
                $sec4Bad++
            }
        }
    }
    if ($sec4Bad -eq 0 -and $sec4Rows.Count -ge 5) { Add-GateOk $ctx 'S-02' "section 4 rows all carry command + result." }

    # -- S-09 Section 4 must not be byte-identical to the previous round -----
    # go-live-15 audit round 2: section 4 was byte-identical to round 1, so no
    # new command had run, yet four AC gained numbers. Only compared ACROSS
    # rounds - iterating inside one round legitimately leaves section 4 alone.
    $prevAudit = Get-GitFileAtHead -RepoRoot $repoRoot -RelPath $auditRel
    $roundNow = Get-ControlRoundNumber -Text $audit -Kind 'Audit'
    if ($null -ne $prevAudit -and $prevAudit.Trim() -ne '') {
        $roundPrev = Get-ControlRoundNumber -Text $prevAudit -Kind 'Audit'
        if ($roundNow -gt $roundPrev -and $roundPrev -gt 0) {
            $prevLines = $prevAudit -split "`r?`n"
            $prevSec4 = Get-MarkdownSection -Lines $prevLines -HeadingPattern '^##\s*4\.'
            if ($null -ne $prevSec4 -and $prevSec4.Trim() -ne '' -and $sec4.Trim() -ne '') {
                if ($prevSec4.Trim() -eq $sec4.Trim()) {
                    Add-GateError $ctx 'S-09' "audit round $roundNow has a section 4 byte-identical to round $roundPrev's committed version. No new command was run in this round, so no AC can change verdict."
                } else {
                    Add-GateOk $ctx 'S-09' "section 4 differs from round $roundPrev's committed version."
                }
            }
        }
    }

    # -- S-10 Independence by numbers ----------------------------------------
    # An independent measurement must produce at least some value that is not
    # already printed in TASK.md or HANDOFF.md. go-live-15 round 2 pasted the
    # contract's own floor number; go-live-09/10/12 quoted HANDOFF test counts.
    $auditNums = Get-NumericLiterals -Text ($sec2 + "`n" + $sec4)
    $sourceNums = Get-NumericLiterals -Text ($task + "`n" + $handoff)
    $fresh = New-Object System.Collections.ArrayList
    foreach ($n in $auditNums) { if (-not $sourceNums.Contains($n)) { [void]$fresh.Add($n) } }
    if ($auditNums.Count -eq 0) {
        Add-GateError $ctx 'S-10' "sections 2 and 4 contain no numeric value at all - nothing was measured."
    } elseif ($fresh.Count -eq 0) {
        Add-GateError $ctx 'S-10' "every number in sections 2 and 4 already appears in TASK.md or HANDOFF.md - the audit copied values instead of measuring them (go-live-15 signature: 'numbers were COPIED, not MEASURED')."
    } elseif ($fresh.Count -le 2) {
        Add-GateWarn $ctx 'S-10' "only $($fresh.Count) number(s) in this audit are not already in TASK/HANDOFF: $(( $fresh | Select-Object -First 3 ) -join ', '). Independence is thin."
    } else {
        Add-GateOk $ctx 'S-10' "$($fresh.Count) measured values are new relative to TASK/HANDOFF."
    }

    # -- S-13 Re-audit trace round numbering ---------------------------------
    # go-live-05 F-02 invented an audit round 1 with status FAIL that never
    # existed; go-live-09 PLN-22 and go-live-10 F-10 misrecorded round 1.
    $currentRound = Get-ControlRoundNumber -Text $audit -Kind 'Audit'
    if ($currentRound -le 0) {
        Add-GateError $ctx 'S-13' "section 0 states no audit round number (expected a field 'Audit round' or 'Execution/Audit round')."
    } else {
        $badRounds = @()
        foreach ($row in (Get-TableRows -Text $sec7)) {
            $first = Clear-MdDecoration $row.Cells[0]
            $m = [regex]::Match($first, '^\d+$')
            if (-not $m.Success) { continue }
            $r = [int]$m.Value
            if ($r -lt 1 -or $r -gt $currentRound) { $badRounds += $r }
        }
        if ($badRounds.Count -gt 0) {
            Add-GateError $ctx 'S-13' "section 7 references audit round(s) $($badRounds -join ', ') outside the real range 1..$currentRound."
        } else {
            Add-GateOk $ctx 'S-13' "section 7 round numbering is within 1..$currentRound."
        }
        if ($currentRound -gt 1 -and (Get-TableRows -Text $sec7).Count -eq 0) {
            Add-GateError $ctx 'S-13' "audit round $currentRound has an empty section 7 Re-audit Trace."
        }
    }

    # -- S-14 Secret scan ----------------------------------------------------
    # go-live-05 F-04 (P0) and m1-07a PLN-04: credentials pasted into artifacts.
    Add-SecretFindings -Ctx $ctx -CheckId 'S-14' -Text $audit -Label 'AUDIT.md'

    # -- S-15 Referenced evidence artifacts must exist -----------------------
    $refPaths = New-Object 'System.Collections.Generic.HashSet[string]'
    foreach ($m in [regex]::Matches($audit, '(?i)(?<![\w\-\./\\])((?:evidence|docs|src|app|prisma|tests|scripts)[\w\-\./]*\.(?:tsx|ts|txt|log|md|json|csv|sql|png|css|prisma|mjs|cjs|ps1)(?![\w]))')) {
        [void]$refPaths.Add($m.Groups[1].Value)
    }
    $missingRefs = New-Object System.Collections.ArrayList
    foreach ($p in $refPaths) {
        $candidates = @((Join-Path $taskDir $p), (Join-Path $repoRoot $p))
        $found = $false
        foreach ($c in $candidates) { if (Test-Path -LiteralPath $c) { $found = $true; break } }
        if (-not $found) { [void]$missingRefs.Add($p) }
    }
    if ($missingRefs.Count -gt 0) {
        Add-GateError $ctx 'S-15' "referenced artifact(s) do not exist: $(($missingRefs | Select-Object -First 5) -join ', ')."
    } elseif ($refPaths.Count -gt 0) {
        Add-GateOk $ctx 'S-15' "$($refPaths.Count) referenced artifact path(s) exist."
    }

    # -- S-16 Auditor independence in the index ------------------------------
    # ops-06a round 3: one commit carried AUDIT.md together with the LIVE test
    # file the auditor claimed to have fixed.
    $slug = Split-Path $taskDir -Leaf
    $staged = @(Get-GitStagedPaths -RepoRoot $repoRoot)
    $foreign = @($staged | Where-Object { $_ -and ($_ -notlike "docs/tasks/$slug/*") })
    if ($foreign.Count -gt 0) {
        Add-GateWarn $ctx 'S-16' "$($foreign.Count) staged path(s) lie outside docs/tasks/$slug/ (e.g. $(($foreign | Select-Object -First 3) -join ', ')). Tier 3 must never commit source or test files with its audit."
    }

    # -- A-07 Closing handoff line -------------------------------------------
    if ($audit -notmatch "AUDIT\.md cho Tier 1") {
        Add-GateError $ctx 'A-07' "missing closing line '... AUDIT.md cho Tier 1 ...'"
    } else {
        Add-GateOk $ctx 'A-07' "closing handoff line present."
    }

    exit (Close-GateContext $ctx `
        'AUDIT.md carries measured evidence; Tier 1 may resolve on it.' `
        'Tier 1 MUST NOT resolve on this AUDIT.md - send it back to Tier 3.')
}
catch {
    Write-Host "RESULT: FAIL. $($_.Exception.Message)" -ForegroundColor Red
    Write-Host $_.ScriptStackTrace -ForegroundColor DarkGray
    exit 2
}
