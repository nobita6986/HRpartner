<#
.SYNOPSIS
Validates HANDOFF.md against TASK.md before Tier 2 hands the round to Tier 3.

Run by:
- Tier 2: last step of every execution round (mandatory, before writing
  `Handoff status: READY_FOR_AUDIT`).
- Tier 3: at preflight, to reject a malformed handoff without spending an audit.
- Tier 1: at /resolve when no AUDIT exists yet.

WHY THIS SCRIPT EXISTS
There was no gate on HANDOFF.md at all. Everything Tier 2 wrote reached Tier 3
unchecked, and Tier 3 spent whole rounds reporting defects a regex finds in
milliseconds: three wrong numbers (go-live-08 AUD-005), test counts later
contradicted by an independent run (go-live-09/10/12), plaintext TEST
credentials (m1-07a PLN-04, closed by Owner waiver instead of rotation),
undeclared deviations (go-live-02 DEV-01/DEV-02, go-live-08 AUD-002), and a
non-canonical test lane that reads production DATABASE_URL (go-live-01 BLK-01).

Exit codes: 0 = PASS (possibly with warnings), 2 = FAIL.
#>
[CmdletBinding()]
param(
    [Parameter(Mandatory = $true)]
    [string]$TaskPath,
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
    $slug    = Split-Path $taskDir -Leaf
    if ([string]::IsNullOrWhiteSpace($HandoffPath)) { $HandoffPath = Join-Path $taskDir "HANDOFF.md" }

    $repoRoot = $RepoRoot
    if ([string]::IsNullOrWhiteSpace($repoRoot)) { $repoRoot = Get-RepoRoot -ScriptRoot $PSScriptRoot }
    $ctx = New-GateContext -Title "HANDOFF SUBSTANCE GATE" -Subject "$HandoffPath (against $TaskPath)"

    # -- H-01 Artifact integrity ---------------------------------------------
    if (-not (Test-Path -LiteralPath $HandoffPath -PathType Leaf)) {
        Add-GateError $ctx 'H-01' "HANDOFF file not found: $HandoffPath"
        exit (Close-GateContext $ctx '' 'Tier 3 MUST NOT audit without HANDOFF.md.')
    }
    $item = Get-Item -LiteralPath $HandoffPath
    if ($item.Length -lt 600) {
        Add-GateError $ctx 'H-01' "HANDOFF.md is $($item.Length) bytes - below the 600-byte floor (truncation to 0 bytes has happened five times in this repo)."
    } else {
        Add-GateOk $ctx 'H-01' "HANDOFF.md size $($item.Length) bytes."
    }
    $rel = Get-RelativeRepoPath -FullPath $HandoffPath -RepoRoot $repoRoot
    $tracked = Test-GitTracked -RepoRoot $repoRoot -RelPath $rel
    $staged  = @(Get-GitStagedPaths -RepoRoot $repoRoot) -contains $rel
    if (-not $tracked -and -not $staged) {
        Add-GateWarn $ctx 'H-01' "HANDOFF.md is neither tracked nor staged - an editor save-over would lose it unrecoverably. Stage it now."
    } else {
        Add-GateOk $ctx 'H-01' "HANDOFF.md is recoverable from git (tracked=$tracked staged=$staged)."
    }

    $task    = Get-Content -LiteralPath $TaskPath    -Raw -Encoding UTF8
    $handoff = Get-Content -LiteralPath $HandoffPath -Raw -Encoding UTF8
    $hLines  = $handoff -split "`r?`n"

    # -- H-02 Required sections ----------------------------------------------
    $requiredSections = @(
        "## 0. Control",
        "## 1. Outcome Summary",
        "## 2. Execution Trace",
        "## 3. Acceptance Evidence",
        "## 4. Changed Deliverables",
        "## 5. Deviations",
        "## 6. Evidence Index",
        "## 7. Execution Round History"
    )
    $missing = 0
    foreach ($s in $requiredSections) {
        if ($handoff -notmatch [regex]::Escape($s)) {
            Add-GateError $ctx 'H-02' "missing section: $s"
            $missing++
        }
    }
    if ($missing -eq 0) { Add-GateOk $ctx 'H-02' "all 8 required sections present." }

    # -- H-03 Control fields must agree with TASK ----------------------------
    $taskSpec = Get-ControlField -Text $task    -FieldName 'Spec version'
    $hSpec    = Get-ControlField -Text $handoff -FieldName 'Spec version'
    if ($hSpec -eq '') {
        Add-GateError $ctx 'H-03' "HANDOFF section 0 has no Spec version."
    } elseif ($taskSpec -ne $hSpec) {
        Add-GateError $ctx 'H-03' "spec version mismatch: TASK=$taskSpec vs HANDOFF=$hSpec. A round executed against a stale contract cannot be audited."
    } else {
        Add-GateOk $ctx 'H-03' "spec version $hSpec matches TASK."
    }
    $taskMode = Get-ControlField -Text $task -FieldName 'Audit mode'
    $hMode    = Get-ControlField -Text $handoff -FieldName 'Audit mode (phải khớp TASK)'
    if ($hMode -eq '') { $hMode = Get-ControlField -Text $handoff -FieldName 'Audit mode' }
    if ($taskMode -ne '' -and $hMode -ne '' -and $taskMode -ne $hMode) {
        Add-GateError $ctx 'H-03' "audit mode mismatch: TASK=$taskMode vs HANDOFF=$hMode."
    }
    $execRound = Get-ControlRoundNumber -Text $handoff -Kind 'Execution'
    if ($execRound -le 0) {
        Add-GateError $ctx 'H-03' "HANDOFF section 0 states no execution round number (expected a field 'Execution round')."
    }

    # -- Section bodies ------------------------------------------------------
    $h2 = Get-MarkdownSection -Lines $hLines -HeadingPattern '^##\s*2\.'
    $h3 = Get-MarkdownSection -Lines $hLines -HeadingPattern '^##\s*3\.'
    $h5 = Get-MarkdownSection -Lines $hLines -HeadingPattern '^##\s*5\.'
    $h7 = Get-MarkdownSection -Lines $hLines -HeadingPattern '^##\s*7\.'
    foreach ($n in @('h2','h3','h5','h7')) {
        if ($null -eq (Get-Variable -Name $n -ValueOnly)) { Set-Variable -Name $n -Value '' }
    }

    $h3Tables = Get-MarkdownTables -Text $h3
    $evTable = $null
    foreach ($t in $h3Tables) { if ($t.Rows.Count -gt 0) { $evTable = $t; break } }
    $evRows = New-Object System.Collections.ArrayList
    $evCol  = -1
    $limCol = -1
    $resCol = -1
    if ($null -ne $evTable) {
        $evCol  = Get-ColumnIndex -Header $evTable.Header -Pattern '(?i)evidence|summary|link'
        $limCol = Get-ColumnIndex -Header $evTable.Header -Pattern '(?i)limitation|hạn chế|han che'
        $resCol = Get-ColumnIndex -Header $evTable.Header -Pattern '(?i)exit|result|kết quả|ket qua'
        foreach ($row in $evTable.Rows) {
            $first = Clear-MdDecoration $row.Cells[0]
            # Data rows only: `AC-xx`, or the em-dash row that carries the contract gate.
            if ($first -match '^AC-\d' -or $first -match '^(\u2014|\u2013|-{1,2})$') { [void]$evRows.Add($row) }
        }
    }

    # -- H-04 The contract gate result must be in section 3 ------------------
    # HANDOFF.template.md section 3 and tier3.md C-09 both require it; the
    # template puts it first, but presence is the substance.
    if ($evRows.Count -eq 0) {
        Add-GateError $ctx 'H-04' "section 3 Acceptance Evidence has no rows."
    } else {
        $gateRow = $null
        $gateIndex = -1
        for ($i = 0; $i -lt $evRows.Count; $i++) {
            if (($evRows[$i].Cells -join ' ') -match 'verify-task\.ps1') { $gateRow = $evRows[$i]; $gateIndex = $i; break }
        }
        if ($null -eq $gateRow) {
            Add-GateError $ctx 'H-04' "section 3 has no verify-task.ps1 row. Tier 3 check C-09 re-runs that gate; a round executed against an unverified contract cannot be audited."
        } elseif (-not (Test-GateRowPassed -Row $gateRow -ResultColumn $resCol)) {
            Add-GateError $ctx 'H-04' "the verify-task.ps1 row does not record 'RESULT: PASS' in its result column. A round must not be executed against a contract that fails its own gate."
        } elseif ($gateIndex -ne 0) {
            Add-GateWarn $ctx 'H-04' "the verify-task.ps1 row is at position $($gateIndex + 1); the template puts it first."
        } else {
            Add-GateOk $ctx 'H-04' "section 3 opens with verify-task.ps1 RESULT: PASS."
        }
    }

    # -- H-05 Every TASK AC needs an evidence row ----------------------------
    $taskACs = [regex]::Matches($task, "AC-\d{2,}") | ForEach-Object { $_.Value } | Sort-Object -Unique
    $acRowMap = @{}
    foreach ($row in $evRows) {
        $first = Clear-MdDecoration $row.Cells[0]
        $m = [regex]::Match($first, '^(AC-\d{2,})')
        if ($m.Success) { $acRowMap[$m.Groups[1].Value] = $row }
    }
    $missingAc = @($taskACs | Where-Object { -not $acRowMap.ContainsKey($_) })
    if ($missingAc.Count -gt 0) {
        Add-GateError $ctx 'H-05' "$($missingAc.Count) AC have no evidence row: $(($missingAc | Select-Object -First 8) -join ', ')."
    } elseif ($taskACs.Count -gt 0) {
        Add-GateOk $ctx 'H-05' "all $($taskACs.Count) AC have an evidence row."
    }

    # -- H-06/H-07/H-08/H-11 Evidence substance ------------------------------
    $problems = 0
    foreach ($acId in $acRowMap.Keys) {
        $row = $acRowMap[$acId]
        $cells = $row.Cells
        $limitation = ''
        if ($limCol -ge 0 -and $cells.Count -gt $limCol) { $limitation = Clear-MdDecoration $cells[$limCol] }
        $hasLimitation = ($limitation -ne '' -and $limitation -notmatch '(?i)^(none|không|khong|n/?a|-)$')
        $joined = ''
        for ($i = 1; $i -lt $cells.Count; $i++) { $joined = $joined + ' ' + $cells[$i] }

        if (-not $hasLimitation) {
            if (-not (Test-CellHasCommand $joined)) {
                Add-GateError $ctx 'H-06' "$acId names no command. Tier 3 re-runs these exact commands - prose is not re-runnable."
                $problems++
            }
            if (-not (Test-CellHasResult $joined) -and -not (Test-CellHasNumber $joined)) {
                Add-GateError $ctx 'H-06' "$acId carries neither an exit code nor a measured value."
                $problems++
            }
        }
        if ($evCol -ge 0 -and $cells.Count -gt $evCol) {
            if (Test-CellIsFakePath $cells[$evCol]) {
                Add-GateError $ctx 'H-07' "$acId evidence location is '$((Clear-MdDecoration $cells[$evCol]))'. Write evidence/<file> or file:line - 'Console Output' is not an artifact."
                $problems++
            }
        }
        if (Test-CellUsesNonCanonicalLane $joined $repoRoot) {
            Add-GateError $ctx 'H-08' "$acId ran a bare 'npx vitest run' while vitest.config.ts at the repo root does not pin the DB variable to a fixed value, so that lane can still reach a live database. Fix either side: use 'npm run test:unit', pass --config, or lock the DB variable in vitest.config.ts."
            $problems++
        }
        if (Test-CellClaimsPreExistingWithoutBaseline $joined) {
            Add-GateError $ctx 'H-11' "$acId excuses a failure as pre-existing without pinning a baseline commit AND the command that reproduced it there."
            $problems++
        }
    }
    if ($problems -eq 0 -and $acRowMap.Count -gt 0) {
        Add-GateOk $ctx 'H-06' "every AC row carries a re-runnable command and a result."
    }

    # -- H-07b Referenced evidence artifacts must exist ----------------------
    $refPaths = New-Object 'System.Collections.Generic.HashSet[string]'
    foreach ($m in [regex]::Matches($handoff, '(?i)(?<![\w\-\./\\])(evidence/[\w\-\./]*\.(?:txt|log|md|json|csv|sql|png|html))')) {
        [void]$refPaths.Add($m.Groups[1].Value)
    }
    $missingRefs = New-Object System.Collections.ArrayList
    foreach ($p in $refPaths) {
        if (-not (Test-Path -LiteralPath (Join-Path $taskDir $p))) { [void]$missingRefs.Add($p) }
    }
    if ($missingRefs.Count -gt 0) {
        Add-GateError $ctx 'H-07' "evidence file(s) referenced but absent: $(($missingRefs | Select-Object -First 5) -join ', ')."
    } elseif ($refPaths.Count -gt 0) {
        Add-GateOk $ctx 'H-07' "$($refPaths.Count) referenced evidence file(s) exist."
    }

    # -- H-09 Secret scan ----------------------------------------------------
    Add-SecretFindings -Ctx $ctx -CheckId 'H-09' -Text $handoff -Label 'HANDOFF.md'

    # -- H-10 Status and closing line ----------------------------------------
    $hStatus = Get-ControlField -Text $handoff -FieldName 'Status'
    $allowed = @('READY_FOR_AUDIT', 'BLOCKED', 'IN_PROGRESS')
    $statusHead = ''
    $mS = [regex]::Match($hStatus, '^[A-Z_]+')
    if ($mS.Success) { $statusHead = $mS.Value }
    if ($allowed -notcontains $statusHead) {
        Add-GateError $ctx 'H-10' "HANDOFF status '$hStatus' is not one of READY_FOR_AUDIT|BLOCKED|IN_PROGRESS."
    }
    $closing = [regex]::Match($handoff, '(?i)Handoff status:\s*`?([A-Z_]+)`?')
    if (-not $closing.Success) {
        Add-GateError $ctx 'H-10' "missing the mandatory last line 'Handoff status: READY_FOR_AUDIT' or 'Handoff status: BLOCKED'."
    } else {
        $closingStatus = $closing.Groups[1].Value.ToUpper()
        if (@('READY_FOR_AUDIT','BLOCKED') -notcontains $closingStatus) {
            Add-GateError $ctx 'H-10' "closing line says '$closingStatus'; tier2.md allows only READY_FOR_AUDIT or BLOCKED."
        } elseif ($statusHead -ne '' -and $statusHead -ne $closingStatus) {
            Add-GateError $ctx 'H-10' "section 0 Status is '$statusHead' but the closing line says '$closingStatus'."
        } else {
            Add-GateOk $ctx 'H-10' "status $closingStatus is consistent between section 0 and the closing line."
        }
        if ($closingStatus -eq 'BLOCKED') {
            $blkRows = @(Get-TableRows -Text $h5 | Where-Object { (Clear-MdDecoration $_.Cells[0]) -match '^(BLK|LIM|DEV)-\d' })
            if ($blkRows.Count -eq 0) {
                Add-GateError $ctx 'H-10' "status BLOCKED but section 5 lists no BLK-xx row stating what blocks and what decision Tier 1 must make."
            }
        }
    }

    # -- H-12 Execution trace must cover every STEP --------------------------
    $taskSteps = [regex]::Matches($task, "STEP-\d{2,}") | ForEach-Object { $_.Value } | Sort-Object -Unique
    $tracedSteps = New-Object 'System.Collections.Generic.HashSet[string]'
    foreach ($row in (Get-TableRows -Text $h2)) {
        foreach ($m in [regex]::Matches((Clear-MdDecoration $row.Cells[0]), 'STEP-\d{2,}')) { [void]$tracedSteps.Add($m.Value) }
    }
    $untraced = @($taskSteps | Where-Object { -not $tracedSteps.Contains($_) })
    if ($untraced.Count -gt 0) {
        Add-GateWarn $ctx 'H-12' "$($untraced.Count) STEP have no row in section 2 Execution Trace: $(($untraced | Select-Object -First 8) -join ', ')."
    } elseif ($taskSteps.Count -gt 0) {
        Add-GateOk $ctx 'H-12' "all $($taskSteps.Count) STEP appear in the execution trace."
    }

    # -- H-13 A deviation in section 2 must be declared in section 5 ---------
    # go-live-02 DEV-01/DEV-02 and go-live-08 AUD-002: real deviations reached
    # the auditor undeclared, so the auditor spent the round finding them.
    $deviationCells = 0
    $h2Tables = Get-MarkdownTables -Text $h2
    foreach ($t in $h2Tables) {
        $devCol = Get-ColumnIndex -Header $t.Header -Pattern '(?i)deviation|sai lệch|sai lech'
        if ($devCol -lt 0) { continue }
        foreach ($row in $t.Rows) {
            if ($row.Cells.Count -le $devCol) { continue }
            $dev = Clear-MdDecoration $row.Cells[$devCol]
            if ($dev -eq '' -or $dev -match '(?i)^(none|không|khong|n/?a|-)$') { continue }
            $deviationCells++
        }
    }
    $declaredIds = @(Get-TableRows -Text $h5 | Where-Object { (Clear-MdDecoration $_.Cells[0]) -match '^(BLK|LIM|DEV)-\d' })
    if ($deviationCells -gt 0 -and $declaredIds.Count -eq 0) {
        Add-GateError $ctx 'H-13' "section 2 records $deviationCells deviation(s) from TASK but section 5 declares none. An undeclared deviation costs a full audit round."
    } elseif ($deviationCells -gt 0) {
        Add-GateOk $ctx 'H-13' "$deviationCells deviation(s) in section 2, $($declaredIds.Count) declared in section 5."
    }

    # -- H-14 Round history must contain the current round -------------------
    $roundNum = $execRound
    if ($roundNum -gt 0) {
        $historyRounds = New-Object System.Collections.ArrayList
        foreach ($row in (Get-TableRows -Text $h7)) {
            $first = Clear-MdDecoration $row.Cells[0]
            if ($first -match '^\d+$') { [void]$historyRounds.Add([int]$first) }
        }
        if ($historyRounds -notcontains $roundNum) {
            Add-GateError $ctx 'H-14' "section 7 Execution Round History has no row for the current round $roundNum."
        } else {
            Add-GateOk $ctx 'H-14' "section 7 records round $roundNum."
        }
        $bogus = @($historyRounds | Where-Object { $_ -gt $roundNum -or $_ -lt 1 })
        if ($bogus.Count -gt 0) {
            Add-GateError $ctx 'H-14' "section 7 invents round(s) $($bogus -join ', ') outside the real range 1..$roundNum."
        }
    }

    # -- H-15 Tier 2 must not write Tier 1 fields ----------------------------
    # go-live-13 F-01 and hotfix-02 F-04: Status, Next gate, round counters and a
    # whole section 9 Planner Resolution were written into TASK.md by another tier.
    $taskRel = Get-RelativeRepoPath -FullPath $TaskPath -RepoRoot $repoRoot
    $taskHead = Get-GitFileAtHead -RepoRoot $repoRoot -RelPath $taskRel
    if ($null -ne $taskHead -and $taskHead.Trim() -ne '') {
        $changed = New-Object System.Collections.ArrayList
        foreach ($f in @('Status', 'Current audit round', 'Next gate', 'Spec version')) {
            if ((Get-ControlField -Text $task -FieldName $f) -ne (Get-ControlField -Text $taskHead -FieldName $f)) { [void]$changed.Add($f) }
        }
        if ($changed.Count -gt 0) {
            Add-GateWarn $ctx 'H-15' "TASK.md control field(s) differ from HEAD: $($changed -join ', '). If Tier 2 changed them, revert - those fields belong to Tier 1."
        } else {
            Add-GateOk $ctx 'H-15' "TASK.md control fields untouched by this round."
        }
    }

    exit (Close-GateContext $ctx `
        'HANDOFF.md is re-runnable; Tier 3 may open an audit round on it.' `
        'Do NOT write "Handoff status: READY_FOR_AUDIT" until these fail items are fixed.')
}
catch {
    Write-Host "RESULT: FAIL. $($_.Exception.Message)" -ForegroundColor Red
    Write-Host $_.ScriptStackTrace -ForegroundColor DarkGray
    exit 2
}
