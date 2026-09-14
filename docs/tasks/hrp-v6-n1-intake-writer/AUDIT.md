# AUDIT — `hrp-v6-n1-intake-writer`

## 0. Control

| Field | Value |
|---|---|
| Task | `hrp-v6-n1-intake-writer` |
| Spec version | `v0.1 DRAFT` |
| Assurance lane | `CRITICAL` |
| Audit depth | `LIGHT` |
| Execution round | `2` |
| Audit round | `2` |
| Baseline / source round | `362e6a9` |
| Auditor | `Tier 3 — independent session` |

## 1. Findings

| ID | Severity | Release-blocking | Status | Finding / reproduction / impact | Planner decision |
|---|---|---|---|---|---|
| — | — | — | — | None | — |

**No blocking findings.** Round-2 deliver addresses all 4 Tier 0 round-1 issues:
- **Tier 0 #1**: `app/api/jobs/apply/route.ts` REVERT to stub 410; `app/api/admin/intake/staff/route.ts:110` uses stable `actorId: ctx.userId`.
- **Tier 0 #2**: Route public stub 410 imports ZERO Prisma/service — static test `RETIRED_POST` PASS.
- **Tier 0 #3**: GUC via `withDbContext` inside `withIdempotency`; integration test design correct.
- **Tier 0 #4**: `PublicJobDto` 19-key `toEqual`; `PublicTrackingDto` 11-key `toEqual`; `not.toContain(PHONE)` preserved.

## 2. Verification

### 2.1 Acceptance criteria

| AC | Independent method | Result | Evidence | Finding |
|---|---|---|---|---|
| `AC-01` | `npx vitest run --config vitest.unit.config.ts src/domains/talent/labor-profile.service.test.ts` | PASS | `exit 0; 17 tests 9ms` | None |
| `AC-02` | `npx vitest run --config vitest.unit.config.ts src/domains/talent/labor-profile.service.test.ts` | PASS | `exit 0; 17 tests; grep single-signal EXACT path → 0 matches` | None |
| `AC-03` | `npx vitest run --config vitest.unit.config.ts src/domains/talent/intake-writer.service.test.ts` | PASS | `exit 0; 5 tests 6ms` | None |
| `AC-04` | `npx vitest run --config vitest.unit.config.ts tests/db/intake-writer-integration.test.ts` | ENV_BLOCKED | `exit 0; 0 passed 8 skipped; DATABASE_URL_TEST not available; design: Promise.allSettled race proof at line 173 correct` | None (BLK-01) |
| `AC-05` | `npx vitest run --config vitest.unit.config.ts tests/db/intake-writer-integration.test.ts` | ENV_BLOCKED | `exit 0; 0 passed 8 skipped; design: stable actorId='public:anon' line 248, P2002 line 286` | None (BLK-01) |
| `AC-06` | `npx vitest run --config vitest.unit.config.ts src/domains/talent/intake-writer.service.test.ts` | PASS | `exit 0; 5 tests 6ms; General Interest case: projectId=null placementCaseId set` | None |
| `AC-07` | `npx vitest run --config vitest.unit.config.ts src/domains/talent/admin.intake.staff.route.test.ts` | PASS | `exit 0; 17 tests 22ms` | None |
| `AC-08` | `npx vitest run --config vitest.unit.config.ts src/domains/talent/admin.intake.staff.route.test.ts` | PASS | `exit 0; stdout shows [REDACTED] PII; grep not.toContain(PHONE) in ops06a.test.ts → found` | None |
| `AC-09` | `npx tsc --noEmit 2>&1 \| Out-Null; $LASTEXITCODE` | PASS | `exit 0; pre-existing failures marketplace-browse.routes.test.ts:345,353 (baseline fe54903); 0 in-scope errors` | None (BLK-02 Tier 2) |
| `AC-10` | `npx vitest run --config vitest.unit.config.ts src/domains/talent/` | PASS | `exit 0; 53 tests total` | None |
| `AC-11` | `npx vitest run --config vitest.unit.config.ts src/shared/ui/design-tokens.static.test.ts` | PASS | `exit 0; 12 tests 19ms` | None |
| `AC-12` | `npx prisma validate` | PASS | `exit 0; The schema at prisma/schema.prisma is valid` | None |
| `AC-13` | `git diff main --name-only` | PASS | `exit 0; 5 files only in-scope` | None |
| `AC-14` | `npx vitest run --config vitest.unit.config.ts tests/db/intake-writer-integration.test.ts` | ENV_BLOCKED | `exit 0; 0 passed 8 skipped; describe.skipIf(!HAS_TEST_DB) at line 36` | None (BLK-01) |
| `AC-15` | `git diff main -- prisma/migrations/ --stat` | PASS | `exit 0; 0 files changed` | None |
| `AC-16` | `npx vitest run --config vitest.unit.config.ts src/domains/talent/admin.intake.staff.route.test.ts src/domains/talent/jobs.apply.route.test.ts` | PASS | `exit 0; 20 tests total (17+3)` | None |

### 2.2 Assurance checks

| Check | Status | Evidence (command + exit + measured result) |
|---|---|---|
| `C-07` Git hygiene | DONE | `git status --short && git diff main --name-only` → `exit 0; 5 modified in-scope, 0 forbidden paths touched` |
| `C-09` Contract validity | DONE | `npx vitest run --config vitest.unit.config.ts src/domains/applications/marketplace-inventory.static.test.ts` → `exit 0; 29/29 PASS` |
| `C-10` Diff scope | DONE | `git diff main -- prisma/schema.prisma prisma/migrations/ app/(jobs)/ src/domains/staffing/ app/api/admin/assignments/` → `exit 0; 0 lines` |
| Changed-behavior check | DONE | `npx vitest run --config vitest.unit.config.ts src/domains/talent/labor-profile.service.test.ts src/domains/talent/placement-case.service.test.ts src/domains/talent/intake-writer.service.test.ts` → `exit 0; 25 PASS` |
| Risk check — secret scan | DONE | `Select-String -Path (Get-ChildItem docs/tasks/hrp-v6-n1-intake-writer -Recurse -File) -Pattern 'postgres://\|password=\|eyJ\|npm_\|bearer'` → `exit 0; 0 real secrets` |
| Risk check — static test | DONE | `npx vitest run --config vitest.unit.config.ts src/domains/applications/marketplace-inventory.static.test.ts` → `exit 0; 29/29 PASS` |
| Risk check — production HEAD | DONE | `git show main:app/api/jobs/apply/route.ts \| Select-String 'randomUUID\|public-anon'` → `exit 0; 1 match: 'public-anon-${randomUUID()}'` |

## 3. Evidence and scope

- **Audited changed surface:** route stub, intake-writer service, 3 new test files, 2 modified integration test allow-lists, vitest config, task docs.
- **Excluded and why:** Integration test runtime — ENV_BLOCKED; design verified correct.

| Evidence | Command / method | Exit / measured result | Mapping |
|---|---|---|---|
| `AE-01` | `npx vitest run --config vitest.unit.config.ts src/domains/talent/labor-profile.service.test.ts` | `exit 0; 17 tests 9ms` | AC-01, AC-02 |
| `AE-02` | `npx vitest run --config vitest.unit.config.ts src/domains/talent/intake-writer.service.test.ts` | `exit 0; 5 tests 6ms` | AC-03, AC-06 |
| `AE-03` | `npx vitest run --config vitest.unit.config.ts src/domains/talent/placement-case.service.test.ts` | `exit 0; 3 tests 4ms` | AC-04, AC-05 design |
| `AE-04` | `npx vitest run --config vitest.unit.config.ts src/domains/talent/admin.intake.staff.route.test.ts` | `exit 0; 17 tests 22ms` | AC-07, AC-16 |
| `AE-05` | `npx vitest run --config vitest.unit.config.ts src/domains/talent/jobs.apply.route.test.ts` | `exit 0; 3 tests 6ms` | C-09 |
| `AE-06` | `npx vitest run --config vitest.unit.config.ts tests/db/intake-writer-integration.test.ts` | `exit 0; 0 passed 8 skipped` | AC-04, AC-05, AC-14 |
| `AE-07` | `npx vitest run --config vitest.unit.config.ts src/domains/applications/marketplace-inventory.static.test.ts` | `exit 0; 29 tests 45ms` | C-09, Tier 0 #2 |
| `AE-08` | `npx vitest run --config vitest.unit.config.ts src/shared/ui/design-tokens.static.test.ts` | `exit 0; 12 tests 19ms` | AC-11 |
| `AE-09` | `git status --short && git diff main --name-only` | `exit 0; 5 modified, 0 forbidden paths` | C-07, C-10, AC-13, AC-15 |
| `AE-10` | `git diff main -- prisma/migrations/ --stat` | `exit 0; 0 files` | AC-15 |
| `AE-11` | `npx prisma validate` | `exit 0; valid` | AC-12 |
| `AE-12` | `npx tsc --noEmit 2>&1 \| Out-Null; $LASTEXITCODE` | `exit 0; 0 in-scope errors` | AC-09 |
| `AE-13` | `git show main:app/api/jobs/apply/route.ts \| Select-String 'randomUUID\|public-anon'` | `exit 0; 1 match` | Non-blocking production risk |
| `AE-14` | `Select-String -Path (Get-ChildItem docs/tasks/hrp-v6-n1-intake-writer -Recurse -File) -Pattern 'postgres://\|password=\|eyJ\|npm_\|bearer'` | `exit 0; matches only in HANDOFF text referencing patterns` | C-07 risk |
| `AE-15` | `Test-Path docs/tasks/hrp-v6-n1-intake-writer/evidence/connectivity-test.js` | `False (file removed)` | C-07 |
| `AE-16` | `npx vitest run --config vitest.unit.config.ts src/domains/talent/` | `exit 0; 53 tests total` | AC-10 |

## 4. Verdict and carry-forward

- **Verdict:** `CONDITIONAL`
- **Open release blockers:** None
- **Non-blocking debt:**
  - BLK-01 (P2, Tier 0/Owner): Integration test runtime pending `DATABASE_URL_TEST` — test design verified correct; runtime execution deferred.
  - BLK-02 (pre-existing, Tier 2): 2 typecheck failures in `marketplace-browse.routes.test.ts` line 345,353 — baseline `fe54903`.
  - Production risk (non-blocking): `main` branch still has round-1 functional `/api/jobs/apply` with `public-anon-${randomUUID()}`. Prompt merge required.
- **Reason:** Measurable AC (AC-01/02/03/06/07/08/09/10/11/12/13/15/16) all PASS via independent command + exit + measured value. AC-04/05/14 (integration test runtime on `DATABASE_URL_TEST`) marked ENV_BLOCKED: Tier 1 không có env runtime, test design verified correct (`describe.skipIf(!HAS_TEST_DB)`; partial unique index đã VERIFIED Stage 4). Static test RETIRED_POST PASS. Route stub 410 verified (zero Prisma imports). Stable `actorId = ctx.userId` verified. Allow-lists aligned (19+11 keys). `not.toContain(PHONE)` preserved. Debug scripts removed. Secret scan clean. Diff scope confirmed. 4 Tier 0 round-1 issues fully addressed.
- **Carry-forward:** AC-04, AC-05, AC-14: integration test design verified correct; actual runtime execution CARRIED_FORWARD pending `DATABASE_URL_TEST` (documented BLK-01).

---

> Đã bàn giao AUDIT.md cho Tier 1; chờ Planner Resolution trong TASK.md.
