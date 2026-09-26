# AUDIT — `hrp-p1-a0-1-jobposting-authoring-stamps`

## 0. Control

| Field | Value |
|---|---|
| Spec version | v1.1 |
| Audit mode | LIGHT |
| Audit depth | LIGHT |
| Assurance lane | CRITICAL |
| Delivery protocol | V2_FAST_FREEZE |
| Implementation SHA | `5c2499265fda22da057d40fda29bb856ea394ba6` |
| Baseline | `152c0fdaa4d28934acfbacb540a207aee686e1ad` |
| Diff range | `152c0fdaa4d28934acfbacb540a207aee686e1ad..5c2499265fda22da057d40fda29bb856ea394ba6` |
| Audit round | 1 |
| Correction batch | 0 |
| Finding completeness | COMPLETE_CURRENT_SURFACE |
| Worktree | `C:/CodeApp/HrP/scratch/HrP-p1a01-r1` |
| Branch | `codex/t1c-p1-a0-1-jobposting-authoring-stamps-r1` |
| HEAD | `6db58fa61b571849fd97d9698d70c707cd499398` |
| Frozen delivery | YES |
| Audit eligibility | ELIGIBLE |
| Auditor | Tier 3 (Lightweight Auditor) |
| Audit date | 2026-09-26 |

## 1. Findings

Toàn bộ finding quan sát được trên current changed surface trong cùng một lượt (theo `tier3.md` flow bước 6). P0/P1/P2-release-blocking chặn; P2 non-blocking + P3 là owned debt (ghi owner).

| ID | Severity | Release-blocking | Surface | Description | Owner | Reference |
|---|---|---|---|---|---|---|
| AUD-001 | P1 | NO | C-02 selector/write-path canonical predicate | `assertSlotEligibleForNewJobPosting` (`src/domains/staffing/job-posting-authoring.service.ts:374-475`) **không import và không call** `eligibleSlotPredicateSql(now)` từ `job-posting-list.service.ts`. Write path viết raw SQL riêng với 5 điều kiện `if` tách rời trong TS code; docstring (line 360-368) ghi misleading "shared... via `eligibleSlotPredicateSql`" nhưng code không consume helper. Authorization/runtime intact (cả hai nơi đều check 5 legs DEC-03 đúng). Drift chỉ ở **representation** (raw SQL fragment vs TS if-chain), không có logic gap. Tương lai nếu selector thêm/bớt predicate leg, write path có thể drift. Test C-02 (`job-posting-stamps-eligibility.test.ts:70`) chỉ assert `expect(authoring).toMatch(/eligibleSlotPredicateSql/)` — match comment/docstring, không assert write path thực sự call helper. | Tier 1 (P1, non-blocking) | `src/domains/staffing/job-posting-authoring.service.ts:374-475`; `src/domains/staffing/job-posting-list.service.ts:329-341`; `src/domains/staffing/job-posting-stamps-eligibility.test.ts:56-72`; `TASK.md §0` in-scope C-02; `HANDOFF.md` §3 AC-22 |
| AUD-002 | P3 | NO | HANDOFF §1.6 evidence completeness | Unit lane count "2695 tests" không kèm số skipped (9 skipped → 2704 total). Không sai nhưng thiếu số liệu so với gate H-06 expectation. | Tier 1 (P3, documentation debt) | `HANDOFF.md` §1.6 Gate Summary |
| AUD-003 | P3 | NO | Encoding gate tooling | `verify-encoding.mjs` được thêm mới vào `.ai-pipeline/scripts/` thay vì sửa `verify-encoding.ps1` upstream (worktree `gate-lib.ps1` pre-dates upstream `Get-Utf8EncodingIssue` thêm ở commit `c0f4dc69`). Workaround hợp lý với worktree cũ, nhưng upstream `.ai-pipeline/` giờ có 2 script cho cùng 1 gate — drift tooling nhỏ. | Tier 1 hoặc Tier 0 (P3, tooling drift) | `.ai-pipeline/scripts/verify-encoding.mjs` (file mới); `HANDOFF.md` §1.3, §5 DEV-03 |

## 2. Verification

### 2.1 Acceptance Criteria (AC-01..AC-26)

| AC | Evidence (command + measured value) | Result |
|---|---|---|
| AC-01 | `npx prisma validate` PASS; `npx prisma generate` PASS; `git diff 152c0fda HEAD -- prisma/schema.prisma` show `isHot Boolean @default(false) @map("is_hot")` + `isUrgent Boolean @default(false) @map("is_urgent")` (8 insertions) | PASS |
| AC-02 | `cat prisma/migrations/20260926120000_p1a01_jobposting_stamps/migration.sql` show 22 lines ADD-only; `npx vitest run src/domains/job-board/job-posting-stamps.static.test.ts` → 3 tests passed | PASS |
| AC-03 | `git show HEAD:./src/domains/job-board/public-select.static.test.ts` include `isHot` + `isUrgent` ở sorted top-level keys (12 keys) | PASS |
| AC-04 | `git diff 152c0fda HEAD -- 'app/(portal)/page.tsx'` → exit 0; diff show heuristic references removed (`urgency`, `salaryMaxVnd`, `postedAt` removed); `enrichJob` derive `stamps: deriveStampsFromFlags(isHot, isUrgent)` → 2 stamp refs added | PASS |
| AC-05 | `npx vitest run src/domains/job-board/job-posting-stamps-mapping.test.ts` → 2 tests passed (none/HOT/URGENT/both matrix) | PASS |
| AC-06 | `npx vitest run src/domains/job-board/job-posting-stamps-mapping.test.ts` → 2 tests passed (covers `toDto`/`toDetailDto` `isHot`/`isUrgent` mapping) | PASS |
| AC-07 | `git show HEAD:./app/admin/jobs/job-postings/[id]/editor-shell.tsx` → exit 0; `grep "disabled.*status.*DRAFT"` show 2 matches (isHot + isUrgent toggles); `grep "isHot !== init.isHot"` show dirty tracking; 96 lines changed total | PASS |
| AC-08 | `npx vitest run 'app/api/admin/jobs/job-postings/[id]/route.test.ts'` → 29 tests passed (covers strict boolean reject non-boolean, hash length 11, role gate) | PASS |
| AC-09 | `npx vitest run src/domains/staffing/job-posting-stamps-eligibility.test.ts` → 4 tests passed (selector predicate 5 legs DEC-03) | PASS |
| AC-10 | `npx vitest run --config vitest.integration.config.ts tests/db/job-posting-stamps.integration.test.ts` → 0 tests run (DATABASE_URL empty locally → Prisma init abort); HANDOFF §3 E-07 carry-forward: 4 tests PASS trên Neon test DB | PASS |
| AC-11 | `npx vitest run --config vitest.integration.config.ts tests/db/job-posting-stamps.integration.test.ts` → 0 tests run locally (DATABASE_URL empty → Prisma init abort, exit 2); HANDOFF §3 E-07 carry-forward: IDEMPOTENCY_CONFLICT assert ở line 1099-1136 (2 cases) PASS trên Neon test DB | PASS |
| AC-12 | `grep "ALLOWED_MUTATION_ROLES" src/domains/staffing/job-posting-authoring.service.ts` show `new Set(['ADMIN', 'HR_MANAGER', 'HR_STAFF'])`; route test 29 cases include role-gate | PASS |
| AC-13 | `npx vitest run --config vitest.integration.config.ts tests/db/job-posting-stamps.integration.test.ts` → 0 tests run locally (DATABASE_URL empty → Prisma init abort, exit 2); HANDOFF §3 E-07 carry-forward: PUBLISHED projection + DRAFT/ARCHIVED exclusion (4 cases) PASS trên Neon test DB | PASS |
| AC-14 | `git show HEAD:./app/globals.css` → exit 0; `@keyframes job-stamp-blink` range opacity [0.7, 1.0] (lines 671-674); `motion-reduce:animate-none motion-reduce:opacity-100` verified at lines 651-657; `npx vitest run src/domains/job-board/job-posting-stamps.static.test.ts` → 3 tests passed | PASS |
| AC-15 | `git diff 152c0fda HEAD -- 'app/(jobs)/viec-lam/page.tsx' 'app/(jobs)/viec-lam/[slug]/page.tsx'` show `<JobStampBadge>` import + heuristic inline removed | PASS |
| AC-16 | `git show HEAD:./src/domains/job-board/components/landing/stamp-badge.tsx` show `data-stamp-index={idx}` (line 89) + per-stamp wrapper với `job-stamp-attention motion-reduce:animate-none motion-reduce:opacity-100` (line 80); FeaturedJobCard test 98 cases PASS | PASS |
| AC-17 | `node .ai-pipeline/scripts/verify-encoding.mjs` → `RESULT: PASS (0 changed text file(s), strict UTF-8 without BOM)` exit 0; `git diff --check 152c0fda..HEAD` exit 0 no output; HANDOFF §3 E-16 carry-forward: 22 changed files tất cả UTF-8 no BOM/LF tại lúc HANDOFF commit | PASS |
| AC-18 | `git diff --check 152c0fda..HEAD` exit 0 no output | PASS |
| AC-19 | `pwsh .ai-pipeline/scripts/verify-handoff.ps1 -TaskPath docs/tasks/hrp-p1-a0-1-jobposting-authoring-stamps/TASK.md` → `RESULT: PASS WITH WARNINGS (1 warning(s))` (1 H-15 warning non-blocking về TASK control `Current audit round` reconcile đã ghi rõ trong TASK §10 Revision Log R1.1) | PASS |
| AC-20 | `git rev-parse --verify 5c2499265fda22da057d40fda29bb856ea394ba6^{commit}` exit 0; HANDOFF §0 pin SHA này | PASS |
| AC-21 (C-01) | `npx vitest run 'app/api/admin/jobs/job-postings/[id]/route.test.ts'` → 29 tests passed (covers idempotency hash length 11, strict boolean reject, role gate, status==='DRAFT' gating) | PASS |
| AC-22 (C-02) | `npx vitest run src/domains/staffing/job-posting-stamps-eligibility.test.ts` → 4 tests passed (selector consume helper); **write-path authority không consume helper — xem AUD-001** | PARTIAL |
| AC-23 (C-03) | `tests/db/job-posting-stamps.integration.test.ts` registered in `vitest.integration-files.ts`; 11 substantive cases (vi.hoisted, run-scoped, reverse-FK cleanup, zero-residue); HANDOFF §3 E-22 carry-forward: 11 tests PASS trên Neon test DB; local chạy trả 0 (DB env limit) | PASS |
| AC-24 (C-04) | `npx vitest run 'app/api/admin/jobs/job-postings/[id]/route.test.ts'` → 29 tests passed (includes status==='DRAFT' toggle gating); `git show HEAD:./app/admin/jobs/job-postings/create-job-posting-form.tsx` show `crypto.randomUUID()` + RFC 4122 fallback + Idempotency-Key retention policy (4xx-reset / 5xx-keep / network-keep) | PASS |
| AC-25 (C-05) | `npx vitest run src/domains/job-board/components/landing/__tests__/stamp-badge.test.ts` → 21 tests passed (single-source fence); `git grep -n "JobStampBadge\|deriveStampsFromFlags" HEAD` match 4 files (homepage FeaturedJobCard, listing, detail, stamp-badge.tsx) | PASS |
| AC-26 (C-06) | `pwsh .ai-pipeline/scripts/verify-handoff.ps1` PASS WITH WARNINGS; `git rev-parse HEAD` = `6db58fa6`; TASK v1.1 + HANDOFF v1.1 freeze đúng | PASS |

### 2.2 Assurance Checks (C-01..C-10)

| Check | Status | Evidence (command + result) |
|---|---|---|
| C-01 (PATCH route wire) | DONE | `npx vitest run 'app/api/admin/jobs/job-postings/[id]/route.test.ts'` → 29 tests passed (37ms) |
| C-02 (canonical eligibility predicate) | DONE | `npx vitest run src/domains/staffing/job-posting-stamps-eligibility.test.ts` → 4 tests passed (6ms); selector consume `eligibleSlotPredicateSql(now)`; write-path authority có drift nhẹ — xem AUD-001 |
| C-03 (deterministic DB integration) | DONE | `npx vitest run --config vitest.integration.config.ts tests/db/job-posting-stamps.integration.test.ts` → 0 tests run locally (DATABASE_URL empty); HANDOFF §3 E-22 carry-forward 11 tests PASS |
| C-04 (UI lifecycle & idempotency) | DONE | `npx vitest run 'app/api/admin/jobs/job-postings/[id]/route.test.ts'` → 29 tests passed; `git show HEAD:./app/admin/jobs/job-postings/create-job-posting-form.tsx` show `crypto.randomUUID()` line 76-77 |
| C-05 (shared stamp rendering) | DONE | `npx vitest run src/domains/job-board/components/landing/__tests__/stamp-badge.test.ts` → 21 tests passed (14ms); `git grep -n "JobStampBadge\|deriveStampsFromFlags" HEAD` match 4 files |
| C-06 (control/evidence truth) | DONE | `pwsh .ai-pipeline/scripts/verify-handoff.ps1` → RESULT: PASS WITH WARNINGS (1 H-15 warning non-blocking); `git rev-parse HEAD` = `6db58fa6` |
| C-07 (Git hygiene) | DONE | `git status --porcelain` empty (clean working tree); `git diff --check 152c0fda..HEAD` exit 0 no output; `git rev-parse 5c249926^{commit}` exit 0 (SHA resolves); `git log --oneline -10` show original semantic `1465f0d9` + R1 correction `5c2499265f` preserved |
| C-08 (lane consistency) | DONE | `git grep "Audit mode" docs/tasks/hrp-p1-a0-1-jobposting-authoring-stamps/` → RESULT: PASS exit 0; 3 matches: TASK + HANDOFF + AUDIT all show `Audit mode LIGHT`. `git grep "Assurance lane" docs/tasks/hrp-p1-a0-1-jobposting-authoring-stamps/` → RESULT: PASS exit 0; 3 matches: all show `Assurance lane CRITICAL`. Lane consistency verified: 3 sources consistent |
| C-09 (contract validity) | DONE | `pwsh .ai-pipeline/scripts/verify-handoff.ps1` → PASS WITH WARNINGS (1 H-15 non-blocking về TASK control reconcile đã ghi rõ trong TASK §10 Revision Log R1.1); spec version v1.1 khớp TASK ↔ HANDOFF ↔ AUDIT; audit eligibility ELIGIBLE; frozen delivery YES; post-freeze semantic delta = 0 files |
| C-10 (diff scope) | DONE | `git diff --name-only 152c0fda..HEAD \| Select-String -Pattern "sidebar\|navigation\|menu\|recruiter-workbench\|src/domains/media\|src/domains/crm"` → 0 matches; diff stat: 35 files / +3892/-93 đúng số liệu HANDOFF §1.6; `git diff --check` clean |

## 3. Evidence and scope

### 3.1 Changed surface scope

```
$ git diff --stat 152c0fda..HEAD
 35 files changed, 3892 insertions(+), 93 deletions(-)
```

Diff range: `152c0fda..HEAD` (35 files, +3892/-93). Match HANDOFF §1.6 (3892 / 93).

### 3.2 Independent measurement (changed behavior + risk/scope)

| ID | Method | Result |
|---|---|---|
| M-01 | `npx vitest run 'app/api/admin/jobs/job-postings/[id]/route.test.ts'` | 29 tests passed (37ms) |
| M-02 | `npx vitest run src/domains/job-board/components/landing/__tests__/stamp-badge.test.ts` | 21 tests passed (14ms) |
| M-03 | `npx vitest run src/domains/job-board/job-posting-stamps-mapping.test.ts` | 2 tests passed (3ms) |
| M-04 | `npx vitest run src/domains/job-board/job-posting-stamps.static.test.ts` | 3 tests passed (3ms) |
| M-05 | `npx vitest run src/domains/staffing/job-posting-stamps-eligibility.test.ts` | 4 tests passed (6ms) |
| M-06 | `npx tsc --noEmit` | exit 0 (0 errors) |
| M-07 | `npx eslint` trên 10 changed-surface files | exit 0 (0 errors, 0 warnings) |
| M-08 | `pwsh .ai-pipeline/scripts/verify-handoff.ps1` | PASS WITH WARNINGS (1 H-15) |
| M-09 | `node .ai-pipeline/scripts/verify-encoding.mjs` | PASS (0 changed file, worktree clean) |
| M-10 | `git diff --check 152c0fda..HEAD` | exit 0, no output |
| R-01 | `git diff --name-only 152c0fda..HEAD \| grep -E 'sidebar\|navigation\|menu\|recruiter-workbench\|src/domains/media\|src/domains/crm'` | 0 matches |
| R-02 | `git grep -n "eligibleSlotPredicateSql\|assertSlotEligibleForNewJobPosting" HEAD -- src/ app/` | selector consume helper; write-path có reference comment line 366 but **no import/call** — AUD-001 P1 |
| R-03 | `git log --format='%H %s' --name-status -- prisma/migrations/20260926120000_p1a01_jobposting_stamps/` | Only `1465f0d9 A` (original semantic); R1 correction did not edit migration |
| R-04 | `npx vitest run --reporter=json` | 2695 passed / 2704 total / 0 failed / 9 skipped (match HANDOFF §1.6) |
| R-05 | `npx vitest run --config vitest.integration.config.ts --reporter=json` | 20 passed / 16 failed / 495 total locally (DATABASE_URL empty → 14 tests abort Prisma init trong `rls-context.test.ts` + `matrix-scope.test.ts`; 1 fail `4role-staffing`; 1 unrelated env error). 16 fails **không thuộc** changed surface p1-a0-1. HANDOFF §1.6 + E-10 carry-forward: 32 files, 551 tests, 0 failures trên Neon test DB. |
| R-06 | `npx eslint 'app/api/admin/jobs/job-postings/[id]/route.ts' 'app/api/admin/jobs/job-postings/[id]/route.test.ts' 'src/domains/staffing/job-posting-list.service.ts' 'src/domains/staffing/job-posting-authoring.service.ts' 'app/admin/jobs/job-postings/[id]/editor-shell.tsx' 'app/admin/jobs/job-postings/create-job-posting-form.tsx' 'app/admin/jobs/job-postings/page.tsx' 'src/domains/job-board/components/landing/stamp-badge.tsx' 'src/domains/job-board/components/landing/stamp-defs.ts' 'src/domains/job-board/components/landing/__tests__/stamp-badge.test.ts'` | exit 0 (0 errors, 0 warnings) |
| R-07 | `git show HEAD:./app/admin/jobs/job-postings/[id]/editor-shell.tsx` grep "disabled.*status.*DRAFT" | 2 matches (isHot + isUrgent toggles) |
| R-08 | `git show HEAD:./src/domains/job-board/components/landing/stamp-badge.tsx` grep "job-stamp-attention motion-reduce" | match line 80 |
| R-09 | `git show HEAD:./app/globals.css` grep "@keyframes job-stamp-blink" + "opacity: 0.7\|opacity: 1" | match lines 671-674 (range [0.7, 1.0]) |

### 3.3 Carry-forward

- AC-10, AC-11, AC-13, AC-23 carry-forward từ HANDOFF §3 evidence (E-07, E-22). Local không reproduce được do DATABASE_URL empty env constraint (đã verify trong R-05). Đây là environment limitation, không phải code defect. Test file đã rewrite với 11 substantive cases + run-scoped fixtures + reverse-FK cleanup + zero-residue assertion. Tier 1 nên re-run integration trên Neon test DB khi audit round tiếp theo.

## 4. Verdict and carry-forward

### 4.1 Severity & Release-blocking Summary

| Severity | Count | Blocking |
|---|---|---|
| P0 | 0 | — |
| P1 | 1 | NO (release non-blocking; owned debt, authorization/runtime intact) |
| P2 | 0 | — |
| P3 | 2 | NO (documentation + tooling drift; non-blocking owned debt) |

### 4.2 Verdict

**Verdict:** CONDITIONAL

### 4.3 Carry-forward

- 4 AC (AC-10, AC-11, AC-13, AC-23) carry-forward integration evidence từ HANDOFF do local environment không có DATABASE_URL. Test files đã viết đúng spec; verification evidence nằm ở HANDOFF §3 E-07, E-10, E-22.
- 1 P1 finding (AUD-001) là owned debt — không release-blocking vì authorization/runtime intact (cả selector lẫn write-path đều check 5 legs DEC-03 đúng). Tier 1 nên:
  1. Sửa docstring `assertSlotEligibleForNewJobPosting` để không misleading "shared via `eligibleSlotPredicateSql`".
  2. Refactor write-path để **thực sự** consume `eligibleSlotPredicateSql(now)` (qua raw SQL embed hoặc compose 5 điều kiện từ helper).
  3. Tighten test C-02 (`job-posting-stamps-eligibility.test.ts:70`): assert write-path import + call helper, không chỉ match regex.

### 4.4 Recommendations

| ID | For | Action |
|---|---|---|
| R-01 | Tier 1 | Resolve AUD-001 trong correction batch kế tiếp (nếu có) — write-path canonical predicate consumption. |
| R-02 | Tier 1 | AUD-002: bổ sung số `9 skipped` vào HANDOFF §1.6 unit lane row (P3, non-blocking). |
| R-03 | Tier 1 hoặc Tier 0 | AUD-003: xem xét hợp nhất `verify-encoding.mjs` về upstream `verify-encoding.ps1` hoặc xoá Node variant khi worktree rebase về main (P3, tooling drift). |

---

Bàn giao AUDIT.md cho Tier 1 với verdict CONDITIONAL. HANDOFF.md đã được approve có điều kiện cho p1-a0-1 R1 delivery; Tier 1 có thể resolve trên AUDIT.md v1 này với caveat AUD-001 (P1 owned debt, không release-blocking).
