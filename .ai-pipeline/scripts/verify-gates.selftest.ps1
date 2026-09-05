<#
.SYNOPSIS
Red/green self-test for the three pipeline gates.

Every RED case reproduces a defect that really happened in this repository and
really cost at least one round, and asserts that the gate now rejects it with a
named check id. Every GREEN case asserts a clean artifact still passes, so the
gates cannot be made strict by simply failing everything.

Fixtures live in a throwaway git repo under $env:TEMP. Nothing is written inside
this repository: its working tree is an audit surface and must stay clean.

    .\.ai-pipeline\scripts\verify-gates.selftest.ps1
    .\.ai-pipeline\scripts\verify-gates.selftest.ps1 -KeepFixtures

Exit codes: 0 = every case behaved as expected, 2 = at least one case did not.
#>
[CmdletBinding()]
param(
    [switch]$KeepFixtures,
    [switch]$Verbose2
)

$ErrorActionPreference = 'Stop'
$scriptsDir = $PSScriptRoot
$slug = 'fixture-gate-selftest'

# ===========================================================================
# Fixture content - a small but fully compliant task
# ===========================================================================

$baseTask = @'
# TASK: fixture-gate-selftest

## 0. Control

| Field | Value |
|---|---|
| Task slug | `fixture-gate-selftest` |
| Work type | `CODE` |
| Audit mode | `CODE_AUDIT` |
| Spec version | `v1.0` |
| Status | `READY_FOR_EXECUTION` |
| Baseline | `deadbeef` |
| Current execution round | `1` |
| Current audit round | `1` |
| Next gate | `TIER_2_EXECUTION` |

## 1. Outcome

Hàm formatVnd phải trả về chuỗi có dấu phân cách nghìn.

## 2. Evidence

| ID | Fact | Source |
|---|---|---|
| `EV-01` | Hàm đang trả về số thô | `src/demo.ts:3` |

## 3. Decisions

| ID | Decision |
|---|---|
| `DEC-01` | Dùng Intl.NumberFormat với locale vi-VN |

## 4. Contract

| ID | Requirement |
|---|---|
| `RQ-01` | formatVnd trả về chuỗi có dấu phân cách nghìn |

## 5. Execution Plan

| STEP | Action |
|---|---|
| `STEP-01` | Sửa `src/demo.ts` và thêm unit test |

## 6. Acceptance

| AC | Measurement | Expected |
|---|---|---|
| `AC-01` | `npm run test:unit` | exit 0, toàn bộ test xanh |
| `AC-02` | `git status --porcelain` chỉ chứa `src/demo.ts` và `docs/tasks/fixture-gate-selftest/` | đúng tập file |

### Traceability

| RQ | STEP | AC |
|---|---|---|
| `RQ-01` | `STEP-01` | `AC-01`, `AC-02` |

## 7. Risk

| ID | Risk | Mitigation |
|---|---|---|
| `RSK-01` | Đổi định dạng có thể vỡ snapshot | Chạy lại toàn bộ unit lane |

## 8. Open Questions

Không có.

## 9. Planner Resolution

| Round | Finding | Decision |
|---|---|---|
| `1` | `None` | `ACCEPT` |

## 10. Revision Log

| Version | Change |
|---|---|
| `v1.0` | Bản đầu tiên |
'@

$baseHandoff = @'
# HANDOFF: fixture-gate-selftest

## 0. Control

| Field | Value |
|---|---|
| Task slug | `fixture-gate-selftest` |
| Work type | `CODE` |
| Audit mode (phải khớp TASK) | `CODE_AUDIT` |
| Spec version | `v1.0` |
| Execution round | `1` |
| Current audit round | `0` |
| Executor | `Tier 2` |
| Baseline | `deadbeef` |
| Status | `READY_FOR_AUDIT` |
| Started/updated | `2026-09-03 12:00 +07` |

## 1. Outcome Summary

Đã sửa `src/demo.ts` và bổ sung unit test cho formatVnd.

## 2. Execution Trace

| STEP | RQ | File/artifact/symbol | Result | Deviation từ TASK |
|---|---|---|---|---|
| `STEP-01` | `RQ-01` | `src/demo.ts` | `DONE` | `None` |

## 3. Acceptance Evidence

| AC | Command/check | Exit/result | Evidence summary/link | Limitation |
|---|---|---|---|---|
| — | `verify-task.ps1 -TaskPath docs/tasks/fixture-gate-selftest/TASK.md` | `RESULT: PASS` | `contract hợp lệ` | `None` |
| `AC-01` | `npm run test:unit` | `exit 0` | `1472 passed` — `evidence/unit.txt` | `None` |
| `AC-02` | `git status --porcelain` | `exit 0` | `hai đường dẫn, đúng tập file` | `None` |

## 4. Changed Deliverables

- **Source/artifact changed:** `src/demo.ts`.
- **Dependency:** None.
- **Schema/migration:** None.
- **Environment/config:** None.
- **Git diff/commit:** `git diff --cached --numstat` cho một file.

## 5. Deviations, Limitations và Blockers

| ID | Type | Evidence | Impact | Decision needed from Planner |
|---|---|---|---|---|
| `None` | `None` | `None` | `None` | `None` |

## 6. Evidence Index

| Evidence | Path | Proves |
|---|---|---|
| `E-01` | `evidence/unit.txt` | `AC-01` |

## 7. Execution Round History

| Round | Spec version | Status | Summary |
|---|---|---|---|
| `1` | `v1.0` | `READY_FOR_AUDIT` | `Sửa formatVnd và thêm test` |

> Handoff status: `READY_FOR_AUDIT`
'@

$baseAudit = @'
# AUDIT: fixture-gate-selftest

## 0. Audit Control

| Field | Value |
|---|---|
| Task slug | `fixture-gate-selftest` |
| Work/Audit type | `CODE/CODE_AUDIT` |
| Spec version | `v1.0` |
| Execution round | `1` |
| Audit round | `1` |
| Round opened by | `HANDOFF round 1` |
| Round closes when | `verdict PASS và Planner Resolution ACCEPTED` |
| Auditor/context | `Tier 3 phiên độc lập` |
| Baseline/diff/artifacts | `deadbeef..worktree` |
| Independence | `Confirmed` |
| Audit time | `2026-09-03 13:20 +07` |

## 1. Findings

Không có finding.

## 2. Acceptance Verification

| AC | Independent method | Result | Evidence | Finding |
|---|---|---|---|---|
| `AC-01` | `npm run test:unit` | `PASS` | exit 0, 1476 passed, 102 files, 4.85 s — `evidence/audit-unit.txt` | `None` |
| `AC-02` | `git status --porcelain` | `PASS` | exit 0, 31 dòng, không có file ngoài phạm vi | `None` |

### Mandatory Checks (Deep Audit — C-01..C-10)

| Check | Status | Evidence (command + exit + output) |
|---|---|---|
| `C-01` Regression | `DONE` | `npm run test:unit` exit 0, 1476 passed |
| `C-02` Build | `DONE` | `npm run build` exit 0 |
| `C-03` Route handlers đọc từng dòng | `DONE` | `Get-Content src/demo.ts` đọc hết 5 dòng, không có route mới |
| `C-04` Prisma vs schema | `DONE` | `npx prisma validate` exit 0 |
| `C-05` POST/PATCH mới | `DONE` | `Select-String -Pattern export` exit 0, 0 route mới |
| `C-06` Migration/RLS | `DONE` | `Test-Path prisma/migrations` exit 0, 0 migration mới |
| `C-07` Git hygiene | `DONE` | `git status --porcelain` exit 0, 31 dòng trong phạm vi |
| `C-08` Test coverage | `DONE` | `npm run test:unit` exit 0, 102 files phủ file đã sửa |
| `C-09` Contract gate | `DONE` | `verify-task.ps1` RESULT: PASS |
| `C-10` Diff scope | `DONE` | `git diff --name-only deadbeef..HEAD` exit 0, 1 file |

## 3. Scope và Impact

- **Deliverables in scope:** đúng một file nguồn.
- **Out-of-scope changes:** None.
- **Blast radius/callers/affected flows:** formatVnd chỉ được gọi trong `src/demo.ts`.
- **Data/security/migration/operations:** N/A, không có migration.

## 4. Independent Evidence

| Check/command | Exit/result | Summary | Evidence path/limitation |
|---|---|---|---|
| `npm run test:unit` | `exit 0` | 1476 passed, 102 files | `evidence/audit-unit.txt` |
| `npm run build` | `exit 0` | build xanh | `evidence/audit-build.txt` |
| `npx prisma validate` | `exit 0` | schema hợp lệ | `evidence/audit-prisma.txt` |
| `git diff --name-only deadbeef..HEAD` | `exit 0` | 1 file | `evidence/audit-diff.txt` |
| `git status --porcelain` | `exit 0` | 31 dòng | `evidence/audit-status.txt` |

## 5. Coverage Gaps

- None.

## 6. Verdict và Planner Questions

- **Verdict:** `PASS`. Mọi AC bắt buộc PASS, không có finding mở, C-01..C-10 đều DONE.
- **Reason:** hai AC đo lại độc lập đều khớp.
- **Planner decisions required:** None.

## 7. Re-audit Trace

| Audit round | Finding ID | Previous status | Current status | Closure evidence |
|---|---|---|---|---|
| `1` | `None` | `None` | `None` | `evidence/audit-unit.txt` |

> Đã bàn giao AUDIT.md cho Tier 1; chờ Planner Resolution trong TASK.md.
'@

# ===========================================================================
# Scaffold a throwaway git repo
# ===========================================================================

$stamp = (Get-Date -Format 'yyyyMMdd-HHmmss') + '-' + (Get-Random -Maximum 99999)
$root = Join-Path $env:TEMP ("hrp-gate-selftest-" + $stamp)
$taskDir = Join-Path $root ("docs\tasks\" + $slug)
$evDir = Join-Path $taskDir 'evidence'
New-Item -ItemType Directory -Path $evDir -Force | Out-Null
New-Item -ItemType Directory -Path (Join-Path $root 'src') -Force | Out-Null

$taskFile    = Join-Path $taskDir 'TASK.md'
$handoffFile = Join-Path $taskDir 'HANDOFF.md'
$auditFile   = Join-Path $taskDir 'AUDIT.md'

@'
export function formatVnd(v: number): string {
  return new Intl.NumberFormat('vi-VN').format(v);
}
export const CURRENCY = 'VND';
export default formatVnd;
'@ | Set-Content -LiteralPath (Join-Path $root 'src\demo.ts') -Encoding UTF8

@'
{
  "name": "hrp-gate-selftest-fixture",
  "private": true,
  "scripts": {
    "build": "next build",
    "typecheck": "tsc --noEmit",
    "lint": "eslint .",
    "test:unit": "vitest run --config vitest.unit.config.ts",
    "test:integration": "node scripts/ci/integration-preflight.mjs"
  }
}
'@ | Set-Content -LiteralPath (Join-Path $root 'package.json') -Encoding UTF8

# gate-02 RQ-01/RQ-02/RQ-03: the lane predicate now READS the default test config
# at the repo root, so the fixture needs one. Two shapes are kept here: the LOCKED
# shape rf-06 introduced in the real repo (DB variable pinned to a fixed value), and
# the UNLOCKED shape the check must still redden (DB variable left on the ambient
# value). A case can also set VitestConfig to '' to delete the file, which is the
# fail-closed branch of DEC-03. Both strings are fixture text invented here; neither
# carries a real credential.
$vitestConfigFile = Join-Path $root 'vitest.config.ts'

$vitestConfigLocked = @'
const BLOCKED_DB_URL = 'gate-selftest-blocked-unreachable-value';
export default {
  test: {
    environment: 'node',
    env: { DATABASE_URL: BLOCKED_DB_URL, DATABASE_URL_ADMIN: '' },
  },
};
'@

$vitestConfigUnlocked = @'
export default {
  test: {
    environment: 'node',
    env: { DATABASE_URL: process.env.DATABASE_URL },
  },
};
'@

$baseVitestConfig = $vitestConfigLocked
$baseVitestConfig | Set-Content -LiteralPath $vitestConfigFile -Encoding UTF8

foreach ($n in @('unit.txt', 'audit-unit.txt', 'audit-build.txt', 'audit-prisma.txt', 'audit-diff.txt', 'audit-status.txt')) {
    "placeholder evidence for the gate self-test" | Set-Content -LiteralPath (Join-Path $evDir $n) -Encoding UTF8
}

$baseTask    | Set-Content -LiteralPath $taskFile    -Encoding UTF8
$baseHandoff | Set-Content -LiteralPath $handoffFile -Encoding UTF8
$baseAudit   | Set-Content -LiteralPath $auditFile   -Encoding UTF8

Push-Location -LiteralPath $root
try {
    $prevEap = $ErrorActionPreference
    $ErrorActionPreference = 'Continue'
    git init --quiet *> $null
    git config core.autocrlf false *> $null
    git config user.email "selftest@local" *> $null
    git config user.name  "gate selftest" *> $null
    git config commit.gpgsign false *> $null
    git add -A *> $null
    git commit --quiet -m "baseline" *> $null
    $ErrorActionPreference = $prevEap
} finally {
    Pop-Location
}

Write-Host "GATE SELF-TEST" -ForegroundColor Cyan
Write-Host "  fixture repo: $root"
Write-Host ""

# ===========================================================================
# Case runner
# ===========================================================================

$cases = @()
function Add-Case {
    param(
        [string]$Name,
        [ValidateSet('task', 'handoff', 'audit')][string]$Gate,
        [ValidateSet('PASS', 'FAIL')][string]$Expect,
        [string]$Token = '',
        # -Token asserts a line '[FAIL] <id>'. A check that is deliberately a
        # WARNING can therefore not be asserted with it. -WarnToken asserts the
        # two halves of a threshold claim together: the id IS printed as a
        # warning, and the same id is NOT printed as an error.
        [string]$WarnToken = '',
        [string]$Why = '',
        [scriptblock]$Mutate = $null
    )
    $script:cases += ,(New-Object psobject -Property @{
        Name = $Name; Gate = $Gate; Expect = $Expect; Token = $Token; WarnToken = $WarnToken; Why = $Why; Mutate = $Mutate
    })
}

function Invoke-Gate {
    param([string]$Gate)
    $gateFile = switch ($Gate) {
        'task'    { Join-Path $scriptsDir 'verify-task.ps1' }
        'handoff' { Join-Path $scriptsDir 'verify-handoff.ps1' }
        'audit'   { Join-Path $scriptsDir 'verify-audit.ps1' }
    }
    $gateArgs = @('-NoProfile', '-NonInteractive', '-ExecutionPolicy', 'Bypass', '-File', $gateFile, '-TaskPath', $taskFile, '-RepoRoot', $root)
    $prevEap = $ErrorActionPreference
    $ErrorActionPreference = 'Continue'
    $out = & powershell.exe @gateArgs 2>&1
    $code = $LASTEXITCODE
    $ErrorActionPreference = $prevEap
    return (New-Object psobject -Property @{ Output = ($out | Out-String); Code = $code })
}

# ---------------------------------------------------------------------------
# GREEN - a clean artifact must still pass
# ---------------------------------------------------------------------------
Add-Case -Name 'green: clean TASK'    -Gate task    -Expect PASS -Why 'contract hợp lệ vẫn phải xanh'
Add-Case -Name 'green: clean HANDOFF' -Gate handoff -Expect PASS -Why 'handoff hợp lệ vẫn phải xanh'
Add-Case -Name 'green: clean AUDIT'   -Gate audit   -Expect PASS -Why 'audit có phép đo thật vẫn phải xanh'

# ---------------------------------------------------------------------------
# RED - AUDIT gate
# ---------------------------------------------------------------------------
Add-Case -Name 'S-01 AUDIT.md bị cắt về 0 byte' -Gate audit -Expect FAIL -Token 'S-01' `
    -Why 'hotfix-01: AUDIT.md 0 byte trong 44 phút; go-live-11/13/14 mất hẳn file' `
    -Mutate { param($c) $c.Audit = '' }

Add-Case -Name 'S-02 ô AC kết luận bằng văn xuôi' -Gate audit -Expect FAIL -Token 'S-02' `
    -Why 'go-live-05 F-03, go-live-10 F-01: 9-10 ô AC là văn xuôi, không có lệnh' `
    -Mutate { param($c)
        $c.Audit = $c.Audit.Replace(
            '| `AC-02` | `git status --porcelain` | `PASS` | exit 0, 31 dòng, không có file ngoài phạm vi | `None` |',
            '| `AC-02` | Đã kiểm tra bằng mắt | `PASS` | Đúng như HANDOFF mô tả | `None` |') }

Add-Case -Name 'S-03 đường dẫn evidence ghi "Console Output"' -Gate audit -Expect FAIL -Token 'S-03' `
    -Why 'hotfix-02 F-01, go-live-12 F-04: mọi ô §4 ghi Console Output' `
    -Mutate { param($c) $c.Audit = $c.Audit.Replace('`evidence/audit-status.txt`', '`Console Output`') }

Add-Case -Name 'S-04 ô AC lấy C-10 làm bằng chứng' -Gate audit -Expect FAIL -Token 'S-04' `
    -Why 'go-live-15 audit round 1: 13/15 ô AC dẫn C-10 làm evidence' `
    -Mutate { param($c)
        $c.Audit = $c.Audit.Replace(
            '| `AC-02` | `git status --porcelain` | `PASS` | exit 0, 31 dòng, không có file ngoài phạm vi | `None` |',
            '| `AC-02` | `C-10` | `PASS` | `C-10` | `None` |') }

Add-Case -Name 'S-07 §5 nói None trong khi có AC BLOCKED' -Gate audit -Expect FAIL -Token 'S-07' `
    -Why 'go-live-09 PLN-20 (hai vòng liền), go-live-11 PLN-12, go-live-13, go-live-15' `
    -Mutate { param($c)
        $c.Audit = $c.Audit.Replace('| `PASS` | exit 0, 31 dòng, không có file ngoài phạm vi |', '| `BLOCKED` | không chạy được |')
        $c.Audit = $c.Audit.Replace('**Verdict:** `PASS`', '**Verdict:** `CONDITIONAL`') }

Add-Case -Name 'S-08 AC PASS trong khi HANDOFF khai ENV_BLOCKED' -Gate audit -Expect FAIL -Token 'S-08' `
    -Why 'go-live-09 PLN-13, go-live-13 F-03, mp3c AC-08: đóng limitation của Tier 2 là quyền Tier 1' `
    -Mutate { param($c)
        $c.Handoff = $c.Handoff.Replace(
            '| `None` | `None` | `None` | `None` | `None` |',
            '| `LIM-01` | `Limitation` | `AC-02` ENV_BLOCKED: không có DATABASE_URL_TEST | `AC-02` không đo được | `Tier 1 quyết định waiver` |') }

Add-Case -Name 'S-09 §4 giống hệt byte vòng trước' -Gate audit -Expect FAIL -Token 'S-09' `
    -Why 'go-live-15 audit round 2: §4 giống hệt round 1 nên không có lệnh nào chạy mới' `
    -Mutate { param($c)
        $c.Audit = $c.Audit.Replace('| Audit round | `1` |', '| Audit round | `2` |')
        $c.Audit = $c.Audit.Replace(
            '| `1` | `None` | `None` | `None` | `evidence/audit-unit.txt` |',
            "| ``1`` | ``None`` | ``None`` | ``None`` | ``evidence/audit-unit.txt`` |`n| ``2`` | ``None`` | ``None`` | ``None`` | ``evidence/audit-unit.txt`` |") }

Add-Case -Name 'S-10 mọi con số đều copy từ TASK/HANDOFF' -Gate audit -Expect FAIL -Token 'S-10' `
    -Why 'go-live-15: "con số được SAO chứ không được ĐO"; go-live-09/10/12 chép test count của HANDOFF' `
    -Mutate { param($c)
        $c.Audit = $c.Audit.Replace('1476 passed, 102 files, 4.85 s', '1472 passed')
        $c.Audit = $c.Audit.Replace('1476 passed, 102 files', '1472 passed')
        $c.Audit = $c.Audit.Replace('1476 passed', '1472 passed')
        $c.Audit = $c.Audit.Replace('102 files', '')
        $c.Audit = $c.Audit.Replace('31 dòng', '')
        $c.Audit = $c.Audit.Replace('4.85 s', '') }

Add-Case -Name 'S-11 lane tran duoc THA khi vitest.config.ts khoa bien DB' -Gate audit -Expect PASS `
    -Why 'gate-02 RQ-01, DEC-04: rf-06 da khoa bien DB trong cau hinh mac dinh, nen lane tran khong con voi tay troi DB that; giu ky vong FAIL o day la khoa cung mot tien de da bi bac' `
    -Mutate { param($c) $c.Audit = $c.Audit.Replace('| `AC-01` | `npm run test:unit` |', '| `AC-01` | `npx vitest run` |') }

Add-Case -Name 'S-12 viện cớ pre-existing không ghim baseline' -Gate audit -Expect FAIL -Token 'S-12' `
    -Why 'm1-07a PLN-03, m1-06d PLN-01, m1-07b PLN-03: bị bác ba lần vì thiếu baseline ghim' `
    -Mutate { param($c)
        $c.Audit = $c.Audit.Replace(
            '| `AC-01` | `npm run test:unit` | `PASS` | exit 0, 1476 passed, 102 files, 4.85 s — `evidence/audit-unit.txt` | `None` |',
            '| `AC-01` | `npm run test:unit` | `PASS` | exit 1, 1476 passed / 3 failed — lỗi pre-existing, không thuộc phạm vi | `None` |') }

Add-Case -Name 'S-13 §7 bịa một audit round chưa từng có' -Gate audit -Expect FAIL -Token 'S-13' `
    -Why 'go-live-05 F-02: §7 bịa hẳn một round 1 với status FAIL không tồn tại' `
    -Mutate { param($c)
        $c.Audit = $c.Audit.Replace(
            '| `1` | `None` | `None` | `None` | `evidence/audit-unit.txt` |',
            '| `3` | `AUD-001` | `OPEN` | `RESOLVED` | `evidence/audit-unit.txt` |') }

Add-Case -Name 'S-14 credential thật nằm trong AUDIT.md' -Gate audit -Expect FAIL -Token 'S-14' `
    -Why 'go-live-05 F-04 (P0) và m1-07a PLN-04: credential thật bị dán vào artifact' `
    -Mutate { param($c)
        $c.Audit = $c.Audit.Replace(
            '- **Deliverables in scope:** đúng một file nguồn.',
            '- **Deliverables in scope:** đã probe bằng postgresql://neondb_owner:npg_A1b2C3d4E5f6G7h8@ep-x.neon.tech/hrp.') }

Add-Case -Name 'S-15 dẫn evidence file không tồn tại' -Gate audit -Expect FAIL -Token 'S-15' `
    -Why 'không có file thì không ai kiểm lại được phép đo' `
    -Mutate { param($c) $c.Audit = $c.Audit.Replace('`evidence/audit-diff.txt`', '`evidence/audit-khong-ton-tai.txt`') }

Add-Case -Name 'A-05 verdict PASS trong khi một C-check FAIL' -Gate audit -Expect FAIL -Token 'A-05' `
    -Why 'mâu thuẫn nội tại: tier3.md yêu cầu PASS chỉ khi mọi C-check DONE' `
    -Mutate { param($c) $c.Audit = $c.Audit.Replace('| `C-02` Build | `DONE` |', '| `C-02` Build | `FAIL` |') }

Add-Case -Name 'S-05 C-check DONE nhưng không có lệnh' -Gate audit -Expect FAIL -Token 'S-05' `
    -Why 'go-live-03: C-01 xanh "(giả định, theo Handoff)"; go-live-12/13 C-check là văn xuôi' `
    -Mutate { param($c) $c.Audit = $c.Audit.Replace('| `C-06` Migration/RLS | `DONE` | `Test-Path prisma/migrations` exit 0, 0 migration mới |', '| `C-06` Migration/RLS | `DONE` | Không có migration nào, theo Handoff |') }

Add-Case -Name 'S-18 ba hàng AC là một hàng copy' -Gate audit -Expect FAIL -Token 'S-18' `
    -Why 'rf-06 audit round 1: AC-01..AC-09 là chín bản sao của cùng một hàng - cùng method, cùng Result, cùng Evidence, cùng Finding' `
    -Mutate { param($c)
        $c.Audit = $c.Audit.Replace(
            '| `AC-02` | `git status --porcelain` | `PASS` | exit 0, 31 dòng, không có file ngoài phạm vi | `None` |',
            "| ``AC-02`` | ``npm run test:unit`` | ``PASS`` | exit 0, 1476 passed, 102 files, 4.85 s — ``evidence/audit-unit.txt`` | ``None`` |`n| ``AC-03`` | ``npm run test:unit`` | ``PASS`` | exit 0, 1476 passed, 102 files, 4.85 s — ``evidence/audit-unit.txt`` | ``None`` |`n| ``AC-04`` | ``npm run test:unit`` | ``PASS`` | exit 0, 1476 passed, 102 files, 4.85 s — ``evidence/audit-unit.txt`` | ``None`` |") }

Add-Case -Name 'S-18 ngưỡng: đúng HAI hàng giống nhau thì WARN chứ không ERROR' -Gate audit -Expect PASS -WarnToken 'S-18' `
    -Why 'DEC-04: hai AC có thể thật sự dùng chung một lệnh, chín thì không. Ngưỡng phải đo được trong selftest, không phải lời văn' `
    -Mutate { param($c)
        $c.Audit = $c.Audit.Replace(
            '| `AC-02` | `git status --porcelain` | `PASS` | exit 0, 31 dòng, không có file ngoài phạm vi | `None` |',
            '| `AC-02` | `npm run test:unit` | `PASS` | exit 0, 1476 passed, 102 files, 4.85 s — `evidence/audit-unit.txt` | `None` |') }

Add-Case -Name 'S-19 ô Result là một từ verdict, không phải phép đo' -Gate audit -Expect FAIL -Token 'S-19' `
    -Why 'rf-06 audit round 1: chín hàng lấy BLOCKED làm kết quả đo - không mã thoát, không trị số, không artifact; $isUnmeasured làm S-02 ngoảnh đi đúng các hàng đó' `
    -Mutate { param($c)
        $c.Audit = $c.Audit.Replace(
            '| `AC-02` | `git status --porcelain` | `PASS` | exit 0, 31 dòng, không có file ngoài phạm vi | `None` |',
            '| `AC-02` | `git status --porcelain` | `BLOCKED` | không đọc được trạng thái | `None` |') }

# GREEN inside the red block, on purpose: the pair above and this case are the
# two halves of S-19. A row whose Result is a verdict word is only a defect when
# the row measures nothing at all; a real command reported as having returned
# nothing has measured something. Measured on three live rows: go-live-05 AC-05
# and AC-18, go-live-14 AC-07.
Add-Case -Name 'S-19 lệnh có thật khai output rỗng thì KHÔNG bị coi là verdict-only' -Gate audit -Expect PASS `
    -Why 'go-live-05 AC-05/AC-18 và go-live-14 AC-07: hàng nêu lệnh thật rồi khai output rỗng. gate-lib đã nhận `0 dòng` và `0 rows` là mã kết quả; chữ rỗng là đúng câu ấy viết bằng chữ' `
    -Mutate { param($c)
        $c.Audit = $c.Audit.Replace(
            '| `AC-02` | `git status --porcelain` | `PASS` | exit 0, 31 dòng, không có file ngoài phạm vi | `None` |',
            '| `AC-02` | `git status --porcelain` | `PASS` | 1 lệnh, kết quả rỗng | `None` |') }

# ---------------------------------------------------------------------------
# RED - TASK gate (dry-run)
# ---------------------------------------------------------------------------
Add-Case -Name 'T-01 contract gọi npm script không tồn tại' -Gate task -Expect FAIL -Token 'T-01' `
    -Why 'go-live-08 AUD-003: RQ-15/AC-15 đòi `npm run diff-check`, không có trong package.json' `
    -Mutate { param($c) $c.Task = $c.Task.Replace('`npm run test:unit`', '`npm run diff-check`') }

Add-Case -Name 'T-02 contract dẫn file:line không tồn tại' -Gate task -Expect FAIL -Token 'T-02' `
    -Why 'go-live-08 AUD-002: điểm chèn "sau dòng 297" đã cũ, rơi vào khối CSS chết' `
    -Mutate { param($c) $c.Task = $c.Task.Replace('`src/demo.ts:3`', '`src/khong-ton-tai.ts:297`') }

Add-Case -Name 'T-03 AC chứng minh phạm vi bằng git diff trần' -Gate task -Expect FAIL -Token 'T-03' `
    -Why 'go-live-15 AC-10: git diff trần in rỗng sau khi Tier 2 stage nên PASS sai' `
    -Mutate { param($c) $c.Task = $c.Task.Replace('`git status --porcelain` chỉ chứa', '`git diff` chỉ chứa') }

Add-Case -Name 'T-04 AC giới hạn tập file mà không cho phép artifact của chính task' -Gate task -Expect FAIL -Token 'T-04' `
    -Why 'go-live-15 AC-15: không handoff hợp lệ nào thoả được, vì HANDOFF buộc nằm trong docs/tasks/<slug>' `
    -Mutate { param($c) $c.Task = $c.Task.Replace(' và `docs/tasks/fixture-gate-selftest/`', '') }

Add-Case -Name 'T-05 AC không nêu phương pháp đo nào' -Gate task -Expect FAIL -Token 'T-05' `
    -Why 'go-live-08 AUD-006: 12 AC đòi giá trị browser-computed trong repo không có browser runner' `
    -Mutate { param($c) $c.Task = $c.Task.Replace('| `AC-01` | `npm run test:unit` | exit 0, toàn bộ test xanh |', '| `AC-01` | Giao diện trông cân đối và chuyên nghiệp | đạt |') }

Add-Case -Name 'T-06 credential thật nằm trong TASK.md' -Gate task -Expect FAIL -Token 'T-06' `
    -Why 'quy tắc chung §3 cấm secret trong mọi artifact của một round' `
    -Mutate { param($c) $c.Task = $c.Task.Replace('| Baseline | `deadbeef` |', '| Baseline | `deadbeef`, probe bằng REDIS_TOKEN=AX8sASQgYzY5NmQ2NmQtZmZmZi00' + 'MjQ2LWE2NmMtMTIzNDU2Nzg5MGFi |') }

Add-Case -Name 'T-07 tầng khác sửa Status của TASK.md' -Gate task -Expect FAIL -Token 'T-07' `
    -Why 'go-live-13 F-01 và hotfix-02 F-04: tầng khác ghi Status/round counter vào TASK.md' `
    -Mutate { param($c) $c.Task = $c.Task.Replace('| Status | `READY_FOR_EXECUTION` |', '| Status | `ACCEPTED` |') }

# ---------------------------------------------------------------------------
# RED - HANDOFF gate
# ---------------------------------------------------------------------------
Add-Case -Name 'H-04 dòng đầu §3 không phải verify-task.ps1' -Gate handoff -Expect FAIL -Token 'H-04' `
    -Why 'template §3 và C-09 của Tier 3 đều buộc dòng đầu là kết quả contract gate' `
    -Mutate { param($c) $c.Handoff = $c.Handoff.Replace('`verify-task.ps1 -TaskPath docs/tasks/fixture-gate-selftest/TASK.md`', '`đã đọc lại TASK`') }

Add-Case -Name 'H-06 ô AC không có lệnh chạy lại được' -Gate handoff -Expect FAIL -Token 'H-06' `
    -Why 'Tier 3 chạy lại đúng các lệnh này; văn xuôi thì không chạy lại được' `
    -Mutate { param($c) $c.Handoff = $c.Handoff.Replace('| `AC-02` | `git status --porcelain` | `exit 0` | `hai đường dẫn, đúng tập file` | `None` |', '| `AC-02` | Đã tự kiểm tra | `OK` | Đúng phạm vi | `None` |') }

Add-Case -Name 'H-08 lane tran duoc THA khi vitest.config.ts khoa bien DB' -Gate handoff -Expect PASS `
    -Why 'gate-02 RQ-01, EV-08, DEC-04: case nay truoc round khoa cung tien de cu; ban giao nhac lane tran ma cau hinh mac dinh da khoa thi khong con la vet do' `
    -Mutate { param($c) $c.Handoff = $c.Handoff.Replace('| `AC-01` | `npm run test:unit` |', '| `AC-01` | `npx vitest run` |') }

Add-Case -Name 'H-08 lane tran + vitest.config.ts KHONG khoa bien DB thi VAN DO' -Gate handoff -Expect FAIL -Token 'H-08' `
    -Why 'gate-02 RQ-02, RISK-02: nua con lai cua mach kiem. Phep tha phai CO DIEU KIEN, neu khong thi mach kiem mat han hieu luc' `
    -Mutate { param($c)
        $c.Handoff = $c.Handoff.Replace('| `AC-01` | `npm run test:unit` |', '| `AC-01` | `npx vitest run` |')
        $c.VitestConfig = $vitestConfigUnlocked }

Add-Case -Name 'H-08 lane tran + VANG tep vitest.config.ts thi VAN DO (fail-closed)' -Gate handoff -Expect FAIL -Token 'H-08' `
    -Why 'gate-02 RQ-03, DEC-03: khong doc duoc cau hinh thi nghieng ve phia CHAN, khong nghieng ve phia tha' `
    -Mutate { param($c)
        $c.Handoff = $c.Handoff.Replace('| `AC-01` | `npm run test:unit` |', '| `AC-01` | `npx vitest run` |')
        $c.VitestConfig = '' }

Add-Case -Name 'H-09 credential thật nằm trong HANDOFF.md' -Gate handoff -Expect FAIL -Token 'H-09' `
    -Why 'm1-07a PLN-04: credential TEST admin/writer ghi thẳng vào HANDOFF, đóng bằng waiver' `
    -Mutate { param($c) $c.Handoff = $c.Handoff.Replace('- **Environment/config:** None.', '- **Environment/config:** đã dùng postgresql://admin_test:Str0ngP4ssw0rd99@ep-y.neon.tech/hrp_test.') }

Add-Case -Name 'H-10 thiếu dòng Handoff status cuối file' -Gate handoff -Expect FAIL -Token 'H-10' `
    -Why 'tier2.md buộc dòng cuối là Handoff status: READY_FOR_AUDIT hoặc BLOCKED' `
    -Mutate { param($c) $c.Handoff = $c.Handoff.Replace('> Handoff status: `READY_FOR_AUDIT`', '> Xong.') }

Add-Case -Name 'H-13 §2 có deviation nhưng §5 khai None' -Gate handoff -Expect FAIL -Token 'H-13' `
    -Why 'go-live-02 DEV-01/DEV-02 và go-live-08 AUD-002: deviation không khai, auditor mất cả vòng để tìm' `
    -Mutate { param($c) $c.Handoff = $c.Handoff.Replace('| `src/demo.ts` | `DONE` | `None` |', '| `src/demo.ts` | `DONE` | Đã thêm một export mới ngoài TASK |') }

Add-Case -Name 'H-14 §7 bịa một execution round' -Gate handoff -Expect FAIL -Token 'H-14' `
    -Why 'cùng họ với go-live-05 F-02 nhưng ở phía Tier 2' `
    -Mutate { param($c) $c.Handoff = $c.Handoff.Replace('| `1` | `v1.0` | `READY_FOR_AUDIT` | `Sửa formatVnd và thêm test` |', '| `4` | `v1.0` | `READY_FOR_AUDIT` | `Sửa formatVnd và thêm test` |') }

Add-Case -Name 'H-03 spec version lệch TASK' -Gate handoff -Expect FAIL -Token 'H-03' `
    -Why 'một round thực thi trên contract cũ thì không audit được' `
    -Mutate { param($c) $c.Handoff = $c.Handoff.Replace('| Spec version | `v1.0` |', '| Spec version | `v1.1` |') }

# ===========================================================================
# Run
# ===========================================================================

$failures = 0
$rows = @()
foreach ($case in $cases) {
    $c = @{ Task = $baseTask; Handoff = $baseHandoff; Audit = $baseAudit; VitestConfig = $baseVitestConfig }
    if ($null -ne $case.Mutate) { & $case.Mutate $c }

    $c.Task    | Set-Content -LiteralPath $taskFile    -Encoding UTF8 -NoNewline
    $c.Handoff | Set-Content -LiteralPath $handoffFile -Encoding UTF8 -NoNewline
    if ($c.Audit -eq '') {
        Set-Content -LiteralPath $auditFile -Value '' -Encoding UTF8 -NoNewline
    } else {
        $c.Audit | Set-Content -LiteralPath $auditFile -Encoding UTF8 -NoNewline
    }
    if ($c.VitestConfig -eq '') {
        if (Test-Path -LiteralPath $vitestConfigFile) { Remove-Item -LiteralPath $vitestConfigFile -Force }
    } else {
        $c.VitestConfig | Set-Content -LiteralPath $vitestConfigFile -Encoding UTF8 -NoNewline
    }

    $run = Invoke-Gate -Gate $case.Gate
    $actual = 'PASS'
    if ($run.Code -ne 0) { $actual = 'FAIL' }
    $tokenSeen = $true
    if ($case.Token -ne '') {
        $tokenSeen = ($run.Output -match ('\[FAIL\]\s+' + [regex]::Escape($case.Token)))
    }
    $warnSeen = $true
    if ($case.WarnToken -ne '') {
        $warnAsWarn  = ($run.Output -match ('\[WARN\]\s+' + [regex]::Escape($case.WarnToken)))
        $warnAsError = ($run.Output -match ('\[FAIL\]\s+' + [regex]::Escape($case.WarnToken)))
        $warnSeen = ($warnAsWarn -and -not $warnAsError)
    }
    $ok = (($actual -eq $case.Expect) -and $tokenSeen -and $warnSeen)
    if (-not $ok) { $failures++ }

    $mark = '  ok  '
    $colour = 'Green'
    if (-not $ok) { $mark = ' MISS '; $colour = 'Red' }
    Write-Host ("[{0}] {1,-7} {2,-4} {3}" -f $mark, $case.Gate, $actual, $case.Name) -ForegroundColor $colour
    if (-not $ok) {
        Write-Host "        expected=$($case.Expect) token=$($case.Token) tokenSeen=$tokenSeen warnToken=$($case.WarnToken) warnSeen=$warnSeen exit=$($run.Code)" -ForegroundColor Red
        Write-Host ($run.Output -split "`n" | Where-Object { $_ -match '\[(FAIL|WARN)\]' } | Select-Object -First 12 | Out-String) -ForegroundColor DarkGray
    }
    if ($Verbose2) { Write-Host $run.Output -ForegroundColor DarkGray }
    $rows += ,(New-Object psobject -Property @{ Case = $case.Name; Gate = $case.Gate; Expect = $case.Expect; Actual = $actual; Ok = $ok; Why = $case.Why })
}

Write-Host ""
$green = @($rows | Where-Object { $_.Expect -eq 'PASS' }).Count
$red   = @($rows | Where-Object { $_.Expect -eq 'FAIL' }).Count
Write-Host "cases: $($rows.Count) total ($green green, $red red), failures: $failures"

if (-not $KeepFixtures) {
    Remove-Item -LiteralPath $root -Recurse -Force -ErrorAction SilentlyContinue
    Write-Host "  fixture repo removed."
} else {
    Write-Host "  fixture repo kept at $root"
}

Write-Host ""
if ($failures -gt 0) {
    Write-Host "RESULT: FAIL ($failures case(s) did not behave as specified)." -ForegroundColor Red
    exit 2
}
Write-Host "RESULT: PASS. Every gate rejects the historical defect it was written for, and still accepts a clean artifact." -ForegroundColor Green
exit 0
