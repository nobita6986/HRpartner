<#
.SYNOPSIS
Shared helpers for the three-tier pipeline gates (PowerShell 5.1 compatible).

Dot-source it:
    . (Join-Path $PSScriptRoot 'gate-lib.ps1')

Design rule: a gate must fail CLOSED and must fail on SUBSTANCE, not only on shape.
Every check implemented here exists because the same defect already cost this
project at least one round. IDs referenced in comments are real findings recorded
in docs/tasks/*/AUDIT.md or docs/tasks/*/TASK.md section 9.
#>

Set-StrictMode -Off

# ---------------------------------------------------------------------------
# Context and reporting
# ---------------------------------------------------------------------------

function New-GateContext {
    param([string]$Title, [string]$Subject)
    $ctx = New-Object psobject
    $ctx | Add-Member -MemberType NoteProperty -Name Title    -Value $Title
    $ctx | Add-Member -MemberType NoteProperty -Name Subject  -Value $Subject
    $ctx | Add-Member -MemberType NoteProperty -Name Errors   -Value (New-Object System.Collections.ArrayList)
    $ctx | Add-Member -MemberType NoteProperty -Name Warnings -Value (New-Object System.Collections.ArrayList)
    $ctx | Add-Member -MemberType NoteProperty -Name Passed   -Value (New-Object System.Collections.ArrayList)
    Write-Host $Title -ForegroundColor Cyan
    if ($Subject) { Write-Host "  subject: $Subject" -ForegroundColor Cyan }
    Write-Host ""
    return $ctx
}

function Add-GateError {
    param($Ctx, [string]$Id, [string]$Message)
    [void]$Ctx.Errors.Add("$Id $Message")
    Write-Host "  [FAIL] $Id $Message" -ForegroundColor Red
}

function Add-GateWarn {
    param($Ctx, [string]$Id, [string]$Message)
    [void]$Ctx.Warnings.Add("$Id $Message")
    Write-Host "  [WARN] $Id $Message" -ForegroundColor Yellow
}

function Add-GateOk {
    param($Ctx, [string]$Id, [string]$Message)
    [void]$Ctx.Passed.Add("$Id $Message")
    Write-Host "  [OK]   $Id $Message" -ForegroundColor Green
}

function Close-GateContext {
    param($Ctx, [string]$PassMessage, [string]$FailMessage)
    Write-Host ""
    $e = $Ctx.Errors.Count
    $w = $Ctx.Warnings.Count
    if ($e -gt 0) {
        Write-Host "RESULT: FAIL ($e error(s), $w warning(s))." -ForegroundColor Red
        if ($FailMessage) { Write-Host $FailMessage -ForegroundColor Red }
        return 2
    }
    if ($w -gt 0) {
        Write-Host "RESULT: PASS WITH WARNINGS ($w warning(s))." -ForegroundColor Yellow
        if ($PassMessage) { Write-Host $PassMessage -ForegroundColor Yellow }
        return 0
    }
    Write-Host "RESULT: PASS." -ForegroundColor Green
    if ($PassMessage) { Write-Host $PassMessage -ForegroundColor Green }
    return 0
}

# ---------------------------------------------------------------------------
# Paths and git
# ---------------------------------------------------------------------------

function Get-RepoRoot {
    param([string]$ScriptRoot)
    # <repo>/.ai-pipeline/scripts -> <repo>
    return (Split-Path (Split-Path $ScriptRoot -Parent) -Parent)
}

function Get-RelativeRepoPath {
    param([string]$FullPath, [string]$RepoRoot)
    $full = $FullPath
    try { $full = (Resolve-Path -LiteralPath $FullPath).Path } catch { }
    $root = $RepoRoot
    if (-not $root.EndsWith('\')) { $root = $root + '\' }
    if ($full.ToLower().StartsWith($root.ToLower())) {
        return ($full.Substring($root.Length) -replace '\\', '/')
    }
    return ($full -replace '\\', '/')
}

function Invoke-GitLines {
    param([string]$RepoRoot, [string[]]$GitArgs)
    $out = @()
    $prev = $ErrorActionPreference
    $ErrorActionPreference = 'Continue'
    try {
        Push-Location -LiteralPath $RepoRoot
        $out = & git @GitArgs 2>$null
        $script:LastGitExit = $LASTEXITCODE
    } catch {
        $script:LastGitExit = 1
    } finally {
        Pop-Location
        $ErrorActionPreference = $prev
    }
    if ($null -eq $out) { return @() }
    return @($out)
}

function Test-GitTracked {
    param([string]$RepoRoot, [string]$RelPath)
    [void](Invoke-GitLines -RepoRoot $RepoRoot -GitArgs @('ls-files', '--error-unmatch', $RelPath))
    return ($script:LastGitExit -eq 0)
}

function Get-GitFileAtHead {
    param([string]$RepoRoot, [string]$RelPath)
    $lines = Invoke-GitLines -RepoRoot $RepoRoot -GitArgs @('show', "HEAD:$RelPath")
    if ($script:LastGitExit -ne 0) { return $null }
    return ($lines -join "`n")
}

function Get-GitStagedPaths {
    param([string]$RepoRoot)
    return (Invoke-GitLines -RepoRoot $RepoRoot -GitArgs @('diff', '--cached', '--name-only'))
}

# ---------------------------------------------------------------------------
# Markdown helpers
# ---------------------------------------------------------------------------

function Get-MarkdownSection {
    param([string[]]$Lines, [string]$HeadingPattern)
    $start = -1
    for ($i = 0; $i -lt $Lines.Count; $i++) {
        if ($Lines[$i] -match $HeadingPattern) { $start = $i; break }
    }
    if ($start -lt 0) { return $null }
    $body = New-Object System.Collections.ArrayList
    for ($i = $start + 1; $i -lt $Lines.Count; $i++) {
        if ($Lines[$i] -match '^##\s') { break }
        [void]$body.Add($Lines[$i])
    }
    return ($body.ToArray() -join "`n")
}

function Get-TableRows {
    param([string]$Text)
    $rows = New-Object System.Collections.ArrayList
    if ([string]::IsNullOrEmpty($Text)) { return $rows }
    foreach ($line in ($Text -split "`n")) {
        $t = $line.Trim()
        if (-not $t.StartsWith('|')) { continue }
        if ($t -match '^\|[\s:\-\|]+\|$') { continue }
        $row = New-Object psobject
        $row | Add-Member -MemberType NoteProperty -Name Cells -Value (Split-MdRow $t)
        $row | Add-Member -MemberType NoteProperty -Name Raw   -Value $t
        [void]$rows.Add($row)
    }
    return $rows
}

function Split-MdRow {
    param([string]$Line)
    $cells = New-Object System.Collections.ArrayList
    foreach ($p in (($Line.Trim().Trim('|')) -split '\|')) { [void]$cells.Add($p.Trim()) }
    return $cells
}

# Header-aware table reader. Needed because a blanket per-cell check produces
# false positives: a "Finding" or "Limitation" column legitimately says "None",
# which must never be read as a bad evidence path.
function Get-MarkdownTables {
    param([string]$Text)
    $tables = New-Object System.Collections.ArrayList
    if ([string]::IsNullOrEmpty($Text)) { return $tables }
    $lines = $Text -split "`n"
    $i = 0
    while ($i -lt ($lines.Count - 1)) {
        $a = $lines[$i].Trim()
        $b = $lines[$i + 1].Trim()
        if ((-not $a.StartsWith('|')) -or ($b -notmatch '^\|[\s:\-\|]+\|$')) { $i++; continue }
        $rows = New-Object System.Collections.ArrayList
        $j = $i + 2
        while ($j -lt $lines.Count) {
            $t = $lines[$j].Trim()
            if (-not $t.StartsWith('|')) { break }
            if ($t -match '^\|[\s:\-\|]+\|$') { $j++; continue }
            $row = New-Object psobject
            $row | Add-Member -MemberType NoteProperty -Name Cells -Value (Split-MdRow $t)
            $row | Add-Member -MemberType NoteProperty -Name Raw   -Value $t
            [void]$rows.Add($row)
            $j++
        }
        $tbl = New-Object psobject
        $tbl | Add-Member -MemberType NoteProperty -Name Header -Value (Split-MdRow $a)
        $tbl | Add-Member -MemberType NoteProperty -Name Rows   -Value $rows
        [void]$tables.Add($tbl)
        $i = $j
    }
    return $tables
}

function Get-ColumnIndex {
    param($Header, [string]$Pattern)
    if ($null -eq $Header) { return -1 }
    for ($i = 0; $i -lt $Header.Count; $i++) {
        if ((Clear-MdDecoration $Header[$i]) -match $Pattern) { return $i }
    }
    return -1
}

# Returns the first table whose data rows start with $Pattern, plus the index of
# its evidence/path column (-1 when the table has none).
function Find-MarkdownTable {
    param($Tables, [string]$FirstCellPattern)
    foreach ($t in $Tables) {
        foreach ($r in $t.Rows) {
            if ((Clear-MdDecoration $r.Cells[0]) -match $FirstCellPattern) { return $t }
        }
    }
    return $null
}


function Clear-MdDecoration {
    param([string]$Value)
    if ($null -eq $Value) { return '' }
    $bt = [string][char]96
    $out = $Value -replace $bt, ''
    $out = $out -replace '\*\*', ''
    return $out.Trim()
}

function Get-ControlField {
    param([string]$Text, [string]$FieldName)
    $m = [regex]::Match($Text, '\|\s*' + [regex]::Escape($FieldName) + '\s*\|([^|\r\n]*)\|')
    if (-not $m.Success) { return '' }
    return (Clear-MdDecoration $m.Groups[1].Value)
}

# Round counters appear in several shapes across this repo's history:
#   | Audit round | 2 |             (current template)
#   | Current audit round | 2 |
#   | Execution/Audit round | 1/1 | (older audits, one combined cell)
# Returns 0 when no round number can be read at all.
function Get-ControlRoundNumber {
    param([string]$Text, [ValidateSet('Audit', 'Execution')][string]$Kind)
    foreach ($f in @("$Kind round", "Current $Kind round")) {
        $m = [regex]::Match((Get-ControlField -Text $Text -FieldName $f), '\d+')
        if ($m.Success) { return [int]$m.Value }
    }
    foreach ($f in @('Execution/Audit round', 'Round')) {
        $v = Get-ControlField -Text $Text -FieldName $f
        if ($v -eq '') { continue }
        $ms = [regex]::Matches($v, '\d+')
        if ($ms.Count -eq 0) { continue }
        if ($ms.Count -eq 1) { return [int]$ms[0].Value }
        if ($Kind -eq 'Execution') { return [int]$ms[0].Value }
        return [int]$ms[1].Value
    }
    return 0
}

# ---------------------------------------------------------------------------
# Evidence substance
# ---------------------------------------------------------------------------

# A cell counts as carrying a command when it names a real executable/verb.
# gate-02 Q-03: `git hash-object` is the command every gate-0* contract uses to
# pin a blob fingerprint, but the list only knew `git cat-file`, so an evidence
# cell built on it read as "no command" to T-05 and H-06.
$script:GateCommandPattern = '(npm\s+run|npm\s+ci|npx\s|node\s|pwsh|powershell|\.ps1|\.mjs|\.cjs|psql|prisma|curl\s|Invoke-WebRequest|Invoke-RestMethod|git\s+(diff|show|status|log|ls-files|rev-parse|stash|cat-file|hash-object)|Select-String|Get-Content|Test-Path|Measure-Object|rg\s|grep\s|awk\s|sed\s|vitest|tsc\s|eslint|docker\s|redis-cli|SELECT\s|\bawk\b|\bdiff\b)'

# A cell counts as carrying a result when it names an exit code or a gate verdict.
$script:GateExitPattern = '(exit\s*(code)?\s*[:=]?\s*\d|RESULT:\s*(PASS|FAIL|DRAFT-VALID)|_EXIT\s*=\s*\d|\bexit\b\s*\d|\bpassed\b|\bfailed\b|\bok\b\s*\(|\b0 dòng\b|\b0 rows?\b)'

function Test-CellHasCommand {
    param([string]$Cell)
    return ([regex]::IsMatch($Cell, $script:GateCommandPattern, 'IgnoreCase'))
}

function Test-CellHasResult {
    param([string]$Cell)
    return ([regex]::IsMatch($Cell, $script:GateExitPattern, 'IgnoreCase'))
}

function Test-CellHasNumber {
    param([string]$Cell)
    return ([regex]::IsMatch($Cell, '\d'))
}

# go-live-15 audit round 1: 13 of 15 AC cells cited `C-10`, a checklist cell,
# as their evidence. A checklist id is not a measurement.
function Test-CellIsChecklistReference {
    param([string]$Cell)
    $v = Clear-MdDecoration $Cell
    return ([regex]::IsMatch($v, '^C-\d{2}([\s,\.]|$)') -and -not (Test-CellHasCommand $v))
}

# go-live-16 execution round 1: the HANDOFF quoted the sentence "the template
# requires RESULT: PASS" inside the Limitation cell of its verify-task.ps1 row,
# while the Exit/result cell truthfully read "RESULT: FAIL". Joining every cell
# of the row before matching made H-04 pass on a round whose contract gate had
# failed - a gate that opens on prose about itself is worse than no gate.
# Read the result column alone; fall back to the whole row only when the table
# has no recognisable result column, and never let a FAIL verdict slip through.
function Test-GateRowPassed {
    param([Parameter(Mandatory = $true)]$Row, [int]$ResultColumn = -1)
    $cells = $Row.Cells
    if ($ResultColumn -ge 0 -and $cells.Count -gt $ResultColumn) {
        $scope = Clear-MdDecoration $cells[$ResultColumn]
    } else {
        $scope = Clear-MdDecoration ($cells -join ' ')
    }
    if ([regex]::IsMatch($scope, 'RESULT:\s*FAIL', 'IgnoreCase')) { return $false }
    return ([regex]::IsMatch($scope, 'RESULT:\s*PASS', 'IgnoreCase'))
}

# hotfix-02 F-01, go-live-03/12/13 F-04: every evidence path read "Console Output".
$script:GateFakePathPattern = '^\s*(`)?\s*(console\s*output|console|terminal|stdout|stderr|inline|n/?a|none|-{1,3}|see\s+above|nhu\s+tren|như\s+trên)\s*(`)?\s*$'

function Test-CellIsFakePath {
    param([string]$Cell)
    return ([regex]::IsMatch((Clear-MdDecoration $Cell), $script:GateFakePathPattern, 'IgnoreCase'))
}

# go-live-01 BLK-01 and go-live-13 F-04: a bare vitest run with no --config used to
# land on a default config that fell back to the ambient DATABASE_URL, so the lane
# could open the DEV/PROD database, and component tests died on the classic JSX
# runtime.
#
# rf-06 CLOSED that hole in the default config itself (gate-02 EV-04, EV-05): the
# default lane now forces the DB var to an unreachable sentinel, blanks every live
# opt-in var, and collects the same files as the unit lane. The old premise - "the
# bare lane always reaches a real database" - is therefore no longer true of this
# repo, and a check that asserts it unconditionally reddens a correct cell
# (gate-02 EV-01, EV-02, EV-03, debt PLN-46).
#
# So this predicate now READS the default config at the repo root and forgives the
# bare lane only when that file locks the DB var (gate-02 DEC-02). Fail-closed
# (DEC-03): config missing, unreadable, empty, or lock pattern absent -> still
# non-canonical. It only reads text - it never runs a test lane, never opens a
# connection, and never reads an environment file (DEC-08).
#
# How strict the lock pattern should be is deferred debt (gate-02 Q-01, RISK-02).
# Today it is deliberately narrow: the test env block assigns the DB var to a
# quoted literal or to an UPPER_SNAKE local constant, i.e. not to an ambient
# lookup. A locking config written some other way is rejected, not forgiven.
$script:GateBareLanePattern        = 'npx\s+vitest\s+run'
$script:GateLaneConfigFlagPattern  = '--config'
$script:GateDefaultLaneConfigFile  = 'vitest.config.ts'
$script:GateDefaultLaneLockPattern = 'env\s*:\s*\{[^}]*\bDATABASE_URL\s*:\s*(?:''[^'']*''|"[^"]*"|[A-Z][A-Z0-9_]{2,})'

function Test-CellUsesNonCanonicalLane {
    param([string]$Cell, [string]$RepoRoot = '')
    if (-not [regex]::IsMatch($Cell, $script:GateBareLanePattern, 'IgnoreCase')) { return $false }
    if ([regex]::IsMatch($Cell, $script:GateLaneConfigFlagPattern, 'IgnoreCase')) { return $false }
    $root = $RepoRoot
    if ([string]::IsNullOrWhiteSpace($root)) { $root = Get-RepoRoot -ScriptRoot $PSScriptRoot }
    $configPath = Join-Path $root $script:GateDefaultLaneConfigFile
    if (-not (Test-Path -LiteralPath $configPath -PathType Leaf)) { return $true }
    $configText = ''
    try { $configText = Get-Content -LiteralPath $configPath -Raw -ErrorAction Stop } catch { return $true }
    if ([string]::IsNullOrWhiteSpace($configText)) { return $true }
    return (-not [regex]::IsMatch($configText, $script:GateDefaultLaneLockPattern))
}

# m1-07a PLN-03, m1-06d PLN-01, m1-07b PLN-03: a red gate excused as
# "pre-existing" three separate times without a pinned-baseline reproduction.
function Test-CellClaimsPreExistingWithoutBaseline {
    param([string]$Cell)
    $claims = '(pre-?\s?existing|preexisting|baseline-identical|có sẵn từ trước|đã đỏ từ trước|tồn tại trước)'
    if (-not [regex]::IsMatch($Cell, $claims, 'IgnoreCase')) { return $false }
    # A legitimate claim pins a commit and shows the command that reproduced it.
    $hasSha = [regex]::IsMatch($Cell, '\b[0-9a-f]{7,40}\b')
    return (-not ($hasSha -and (Test-CellHasCommand $Cell)))
}

function Get-NumericLiterals {
    param([string]$Text)
    $set = New-Object 'System.Collections.Generic.HashSet[string]'
    if ([string]::IsNullOrEmpty($Text)) { return $set }
    # Identifiers, versions, dates, clock times and commit shas are not
    # measurements. Counting them would let an audit look independent merely by
    # numbering its own checklist rows C-01..C-10.
    $clean = $Text
    $clean = [regex]::Replace($clean, '(?i)\b[A-Z]{1,6}-\d{1,4}\b', ' ')
    $clean = [regex]::Replace($clean, '(?i)\bv\d+(?:\.\d+)+\b', ' ')
    $clean = [regex]::Replace($clean, '\b\d{4}-\d{2}-\d{2}\b', ' ')
    $clean = [regex]::Replace($clean, '\b\d{1,2}:\d{2}(?::\d{2})?\b', ' ')
    $clean = [regex]::Replace($clean, '\b(?=[0-9a-f]{0,39}[a-f])[0-9a-f]{7,40}\b', ' ')
    foreach ($m in [regex]::Matches($clean, '\d+(?:[\.,]\d+)+|\b\d{2,}\b')) {
        [void]$set.Add(($m.Value -replace ',', '.'))
    }
    return $set
}

# ---------------------------------------------------------------------------
# Secret scan (global rules section 3: no secret in any artifact of a round)
# ---------------------------------------------------------------------------

function Get-SecretHits {
    param([string]$Text, [string]$Label)
    $hits = New-Object System.Collections.ArrayList
    if ([string]::IsNullOrEmpty($Text)) { return $hits }
    $patterns = @(
        @{ Id = 'DB_URL_WITH_PASSWORD'; Rx = '(postgres(?:ql)?|mysql|mongodb(?:\+srv)?|redis|rediss)://[^\s:/@]+:[^\s@`''"]{3,}@' },
        @{ Id = 'NEON_PASSWORD';        Rx = '\bnpg_[A-Za-z0-9]{12,}' },
        @{ Id = 'JWT';                  Rx = '\beyJ[A-Za-z0-9_\-]{10,}\.[A-Za-z0-9_\-]{10,}' },
        @{ Id = 'AWS_KEY';              Rx = '\bAKIA[0-9A-Z]{16}\b' },
        @{ Id = 'BEARER';               Rx = '\bBearer\s+[A-Za-z0-9_\-\.]{20,}' },
        @{ Id = 'ASSIGNED_SECRET';      Rx = '(?i)\b[\w]*(?:password|passwd|pwd|secret|api[_-]?key|token|credential)[\w]*\b\s*[:=]\s*["'']?[^\s"''`,;|<>]{12,}' }
    )
    $redacted = '(\*{3,}|x{5,}|REDACTED|redacted|<[^>]*>|\$env:|\$\{|process\.env|ENV\[|placeholder|example|CHANGE_?ME|\.\.\.)'
    foreach ($p in $patterns) {
        foreach ($m in [regex]::Matches($Text, $p.Rx)) {
            if ([regex]::IsMatch($m.Value, $redacted)) { continue }
            $shown = $m.Value
            if ($shown.Length -gt 24) { $shown = $shown.Substring(0, 12) + '...(cut)' }
            $item = New-Object psobject
            $item | Add-Member -MemberType NoteProperty -Name Id      -Value $p.Id
            $item | Add-Member -MemberType NoteProperty -Name Label   -Value $Label
            $item | Add-Member -MemberType NoteProperty -Name Excerpt -Value $shown
            [void]$hits.Add($item)
        }
    }
    return $hits
}

function Add-SecretFindings {
    param($Ctx, [string]$CheckId, [string]$Text, [string]$Label)
    $hits = Get-SecretHits -Text $Text -Label $Label
    if ($hits.Count -eq 0) {
        Add-GateOk $Ctx $CheckId "no plaintext secret in $Label."
        return
    }
    $seen = New-Object 'System.Collections.Generic.HashSet[string]'
    foreach ($h in $hits) {
        if ($seen.Add($h.Id)) {
            Add-GateError $Ctx $CheckId "possible secret in $($h.Label): kind=$($h.Id) sample=[$($h.Excerpt)]. Global rules section 3 forbids it; redact and rotate."
        }
    }
}

# ---------------------------------------------------------------------------
# Verdict / status helpers
# ---------------------------------------------------------------------------

function Get-AuditVerdict {
    param([string]$Text)
    $m = [regex]::Match($Text, '(?i)\*\*Verdict:?\*\*\s*`?([A-Z_]+)`?')
    if ($m.Success) { return $m.Groups[1].Value.ToUpper() }
    $m = [regex]::Match($Text, '(?i)^\s*[-*]?\s*\*\*Verdict:?\*\*\s*`?([A-Z_]+)`?', 'Multiline')
    if ($m.Success) { return $m.Groups[1].Value.ToUpper() }
    return ''
}

function Test-SectionSaysNone {
    param([string]$Text)
    if ([string]::IsNullOrWhiteSpace($Text)) { return $false }
    $stripped = ($Text -split "`n" | Where-Object { $_.Trim() -ne '' }) -join ' '
    $stripped = Clear-MdDecoration $stripped
    if ($stripped.Length -eq 0) { return $false }
    return ([regex]::IsMatch($stripped, '(?i)^\s*[-*]?\s*(none|no gap|no coverage gap|không có|khong co|không|khong)\b'))
}
