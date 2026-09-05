<#
.SYNOPSIS
Delivery-presence gate: every path a contract declares as delivered must exist in
BOTH the working tree and the git index, and must be non-empty in both.

.DESCRIPTION
Why this check exists. Task hrp-v5-rf-05-tsc-program-boundary declared exactly two
delivered files, one of them tsconfig.json. Partway through a LATER round that path
left the working tree AND the git index at the same time. Every gate in this repo
stayed green, because no gate had ever asked the one question that mattered: is the
thing this contract says it delivered still there? The cost was two audit rounds and
one blocked task, spent discovering by hand what one measurement answers in a second.

The index half is the half that hides. A path dropped from the index but left on disk
looks entirely normal to the eye, to every editor, and to a build; only `git ls-files`
can see the difference. That is why absence at EITHER of the two places is an alarm on
its own, and why the two absences are printed under different labels: someone reading
the output has to be able to tell "gone from disk" from "gone from the index".

Usage:
    powershell -NoProfile -File .\.ai-pipeline\scripts\verify-delivery-presence.ps1 -TaskPath docs/tasks/<slug>/TASK.md

    -RepoRoot            root the declared paths resolve against. Defaults to the repo
                         this script lives in (<repo>/.ai-pipeline/scripts -> <repo>).
                         Point it at a fixture repo to exercise the alarm branches
                         without needing a real delivery to be broken.
    -IncludeStepOutputs  also read the 'Output' column of the execution-plan table.
                         OFF by default: those artifacts are produced DURING the round,
                         so checking them while the round is still open reports the
                         round's own progress as a defect. Their paths resolve against
                         the contract's own directory, not the repo root.

Exit codes follow the house convention of the other gates:
    0  RESULT: PASS, or RESULT: PASS WITH WARNINGS
    2  RESULT: FAIL      - at least one declared delivery is missing or empty
    3  the contract or the repository could not be read at all

This script is deliberately self-contained: it does not dot-source gate-lib.ps1 and it
is not wired into verify-pipeline.ps1 (gate-03 DEC-07). It must stay runnable against a
fixture repo under a temp directory, where the <repo>/.ai-pipeline/scripts layout that
gate-lib.ps1 assumes does not hold.
#>

param(
    [Parameter(Mandatory = $true)]
    [string]$TaskPath,
    [string]$RepoRoot = "",
    [switch]$IncludeStepOutputs
)

Set-StrictMode -Off
$ErrorActionPreference = 'Continue'

$script:Errors   = New-Object System.Collections.ArrayList
$script:Warnings = New-Object System.Collections.ArrayList

function Add-Err {
    param([string]$Id, [string]$Message)
    [void]$script:Errors.Add("$Id $Message")
    Write-Host "  [FAIL] $Id $Message" -ForegroundColor Red
}

function Add-Warn {
    param([string]$Id, [string]$Message)
    [void]$script:Warnings.Add("$Id $Message")
    Write-Host "  [WARN] $Id $Message" -ForegroundColor Yellow
}

function Add-Ok {
    param([string]$Id, [string]$Message)
    Write-Host "  [OK]   $Id $Message" -ForegroundColor Green
}

function Clear-Decoration {
    param([string]$Value)
    if ($null -eq $Value) { return '' }
    $bt = [string][char]96
    $out = $Value -replace $bt, ''
    $out = $out -replace '\*\*', ''
    return $out.Trim()
}

# ---------------------------------------------------------------------------
# Reading the contract
# ---------------------------------------------------------------------------

# Control rows look like:  | Modules | `a/b.ts`, `c.json` |
# Returns the value cell of every control row whose field name matches $Pattern.
function Get-ControlValues {
    param([string[]]$Lines, [string]$Pattern)
    $out = New-Object System.Collections.ArrayList
    foreach ($line in $Lines) {
        $t = $line.Trim()
        if (-not $t.StartsWith('|')) { continue }
        $cells = @()
        foreach ($p in (($t.Trim('|')) -split '\|')) { $cells += $p.Trim() }
        if ($cells.Count -lt 2) { continue }
        if ((Clear-Decoration $cells[0]) -match $Pattern) { [void]$out.Add($cells[1]) }
    }
    return $out
}

# The 'Output' column of the execution-plan table. Located by header, not by section
# number, because the section numbering is not stable across contract templates.
function Get-StepOutputValues {
    param([string[]]$Lines)
    $out = New-Object System.Collections.ArrayList
    $col = -1
    for ($i = 0; $i -lt $Lines.Count; $i++) {
        $t = $Lines[$i].Trim()
        if (-not $t.StartsWith('|')) { if ($col -ge 0) { $col = -1 }; continue }
        $cells = @()
        foreach ($p in (($t.Trim('|')) -split '\|')) { $cells += $p.Trim() }
        if ($t -match '^\|[\s:\-\|]+\|$') { continue }
        if ($col -lt 0) {
            for ($c = 0; $c -lt $cells.Count; $c++) {
                if ((Clear-Decoration $cells[$c]) -match '(?i)^outputs?$') { $col = $c; break }
            }
            continue
        }
        if ($cells.Count -gt $col) { [void]$out.Add($cells[$col]) }
    }
    return $out
}

# A declared path is a backticked token. Anything not in backticks is prose: the
# Modules cell of a real contract carries notes such as "(tep MOI)" next to the path,
# and prose must never be probed as a file name.
function Get-PathTokens {
    param([string]$Cell)
    $out = New-Object System.Collections.ArrayList
    if ([string]::IsNullOrEmpty($Cell)) { return $out }
    $bt = [string][char]96
    foreach ($m in [regex]::Matches($Cell, $bt + '([^' + $bt + ']+)' + $bt)) {
        $tok = $m.Groups[1].Value.Trim()
        if ($tok -eq '') { continue }
        if ($tok -notmatch '^[A-Za-z0-9_./\-]+$') { continue }   # globs, spaces, prose out
        if ($tok -match '^v?\d+(\.\d+)+$') { continue }          # v1.2 is a version, not a file
        if ($tok.EndsWith('/')) { continue }                     # a directory, not a delivery
        $hasDir = $tok.Contains('/')
        $hasExt = ($tok -match '\.[A-Za-z][A-Za-z0-9]{0,9}$')
        if (-not ($hasDir -or $hasExt)) { continue }
        [void]$out.Add($tok)
    }
    return $out
}

# ---------------------------------------------------------------------------
# git probes (read-only: ls-files and cat-file only)
# ---------------------------------------------------------------------------

function Invoke-Git {
    param([string]$Root, [string[]]$GitArgs)
    $all = @('-C', $Root) + $GitArgs
    $out = @()
    try {
        $out = & git @all 2>$null
        $script:GitExit = $LASTEXITCODE
    } catch {
        $script:GitExit = 127
    }
    if ($null -eq $out) { return @() }
    return @($out)
}

function Test-InIndex {
    param([string]$Root, [string]$Rel)
    [void](Invoke-Git -Root $Root -GitArgs @('ls-files', '--error-unmatch', '--', $Rel))
    return ($script:GitExit -eq 0)
}

# Size of the blob the index holds for $Rel. Measured, not inferred from the working
# tree: under core.autocrlf the two sizes legitimately differ, and a delivery can be
# non-empty on disk while the staged blob is empty.
function Get-IndexSize {
    param([string]$Root, [string]$Rel)
    $lines = Invoke-Git -Root $Root -GitArgs @('cat-file', '-s', ":$Rel")
    if ($script:GitExit -ne 0) { return -1 }
    $v = ($lines -join '').Trim()
    if ($v -match '^\d+$') { return [long]$v }
    return -1
}

# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------

Write-Host "DELIVERY PRESENCE GATE" -ForegroundColor Cyan

$root = $RepoRoot
if ([string]::IsNullOrWhiteSpace($root)) {
    $root = (Split-Path (Split-Path $PSScriptRoot -Parent) -Parent)
}
try { $root = (Resolve-Path -LiteralPath $root -ErrorAction Stop).Path } catch {
    Write-Host "  repo root not found: $root" -ForegroundColor Red
    Write-Host ""
    Write-Host "RESULT: FAIL (unreadable repository)." -ForegroundColor Red
    exit 3
}

[void](Invoke-Git -Root $root -GitArgs @('rev-parse', '--git-dir'))
if ($script:GitExit -ne 0) {
    Write-Host "  not a git repository (or git unavailable): $root" -ForegroundColor Red
    Write-Host ""
    Write-Host "RESULT: FAIL (unreadable repository)." -ForegroundColor Red
    exit 3
}

$taskFull = ''
foreach ($cand in @($TaskPath, (Join-Path $root $TaskPath))) {
    if (Test-Path -LiteralPath $cand -PathType Leaf) {
        $taskFull = (Resolve-Path -LiteralPath $cand).Path
        break
    }
}
if ($taskFull -eq '') {
    Write-Host "  contract not found: $TaskPath" -ForegroundColor Red
    Write-Host ""
    Write-Host "RESULT: FAIL (unreadable contract)." -ForegroundColor Red
    exit 3
}

$taskDir  = Split-Path $taskFull -Parent
$rootPfx  = $root
if (-not $rootPfx.EndsWith('\')) { $rootPfx = $rootPfx + '\' }
$taskRel  = $taskFull
if ($taskFull.ToLower().StartsWith($rootPfx.ToLower())) {
    $taskRel = ($taskFull.Substring($rootPfx.Length) -replace '\\', '/')
}

Write-Host "  subject: $taskRel"
Write-Host "  repo   : $root"
$lines = @(Get-Content -LiteralPath $taskFull -Encoding UTF8)

# source 1: the control field that names what the round delivers
$declared = New-Object System.Collections.ArrayList   # repo-relative
$sources  = New-Object System.Collections.ArrayList
foreach ($cell in (Get-ControlValues -Lines $lines -Pattern '(?i)^(modules|deliverables?|delivered files|deliverable files)$')) {
    foreach ($tok in (Get-PathTokens -Cell $cell)) {
        if (-not $declared.Contains($tok)) { [void]$declared.Add($tok); [void]$sources.Add('control') }
    }
}
$fromControl = $declared.Count

# source 2 (opt-in): the Output column, whose paths are relative to the contract folder
if ($IncludeStepOutputs) {
    foreach ($cell in (Get-StepOutputValues -Lines $lines)) {
        foreach ($tok in (Get-PathTokens -Cell $cell)) {
            $full = Join-Path $taskDir $tok
            $rel  = $tok
            if ($full.ToLower().StartsWith($rootPfx.ToLower())) {
                $rel = ($full.Substring($rootPfx.Length) -replace '\\', '/')
            }
            if (-not $declared.Contains($rel)) { [void]$declared.Add($rel); [void]$sources.Add('step-output') }
        }
    }
}

$srcLabel = "control field (Modules/Deliverables)"
if ($IncludeStepOutputs) { $srcLabel = $srcLabel + " + execution-plan Output column" }
Write-Host "  source : $srcLabel"
Write-Host ""

if ($declared.Count -eq 0) {
    Add-Err 'D-01' "the contract declares no deliverable path. Nothing can be verified, so this gate fails closed: give the control table a Modules or Deliverables row naming each delivered path in backticks."
} else {
    Add-Ok 'D-01' "contract declares $($declared.Count) deliverable path(s) ($fromControl from the control field)."
}

# The three states this gate exists to tell apart. MISSING_INDEX and MISSING_BOTH are
# printed under deliberately different labels: rf-05 lost a delivery from both places at
# once, but the index-only loss is the one a human cannot see, so the reader must never
# have to guess which of the two happened.
for ($i = 0; $i -lt $declared.Count; $i++) {
    $rel  = $declared[$i]
    $src  = $sources[$i]
    $full = Join-Path $root ($rel -replace '/', '\')

    $inTree  = Test-Path -LiteralPath $full -PathType Leaf
    $isDir   = Test-Path -LiteralPath $full -PathType Container
    $inIndex = Test-InIndex -Root $root -Rel $rel
    $idxSize = -1
    if ($inIndex) { $idxSize = Get-IndexSize -Root $root -Rel $rel }
    $wtSize  = -1
    if ($inTree) { try { $wtSize = (New-Object System.IO.FileInfo($full)).Length } catch { $wtSize = -1 } }

    $note = ''
    if ($src -eq 'step-output') { $note = ' [step-output]' }

    if ($isDir -and -not $inTree) {
        Add-Warn 'D-02' "$rel names a DIRECTORY, not a file, so presence of a delivered file cannot be decided from it$note."
        continue
    }

    if ($inTree -and $inIndex) {
        if ($wtSize -eq 0 -or $idxSize -eq 0) {
            Add-Err 'D-03' "$rel EMPTY: worktree $wtSize byte(s), index $idxSize byte(s). A tracked path that is 0 bytes is the shape a delivery takes when an empty editor buffer is saved over it$note."
        } else {
            Add-Ok 'D-02' "$rel PRESENT in worktree AND index (worktree $wtSize B, index $idxSize B)$note."
        }
        continue
    }

    if ((-not $inTree) -and (-not $inIndex)) {
        Add-Err 'D-02' "$rel MISSING_BOTH: absent from the working tree AND absent from the index. The contract declares it delivered; nothing at this path is delivered$note."
        continue
    }

    if ($inTree -and (-not $inIndex)) {
        Add-Err 'D-02' "$rel MISSING_INDEX: present in the working tree but absent from the index. Nothing looks wrong on disk, so this is the loss no one sees; 'git add' the path or drop it from the declaration$note."
        continue
    }

    Add-Err 'D-02' "$rel MISSING_WORKTREE: present in the index but absent from the working tree (index blob $idxSize byte(s)). The staged bytes still exist, so recover with 'git checkout -- $rel' before anything prunes them$note."
}

Write-Host ""
$e = $script:Errors.Count
$w = $script:Warnings.Count
if ($e -gt 0) {
    Write-Host "RESULT: FAIL ($e error(s), $w warning(s))." -ForegroundColor Red
    Write-Host "A path this contract declares as delivered is missing or empty." -ForegroundColor Red
    exit 2
}
if ($w -gt 0) {
    Write-Host "RESULT: PASS WITH WARNINGS ($w warning(s))." -ForegroundColor Yellow
    Write-Host "Every declared delivery that could be decided is present in both places." -ForegroundColor Yellow
    exit 0
}
Write-Host "RESULT: PASS." -ForegroundColor Green
Write-Host "Every path this contract declares as delivered is present in the working tree and in the index." -ForegroundColor Green
exit 0
