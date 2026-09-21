# HANDOFF — hrp-v6-w5-handling-assignment-safety

## 0. Control

| Field | Value |
|---|---|
| Task slug | hrp-v6-w5-handling-assignment-safety |
| Spec version | v1.0 |
| Round | 1 |
| Status | `READY_FOR_AUDIT` |
| Branch | `tier1/w5-handling-assignment-safety` |
| Implementation SHA | `tier1/w5-handling-assignment-safety` (WIP — pending delivery commit) |
| Baseline | `a49ceaa83ffa986bf939823a4e9f2c803a0649d6` (rebased from `b707936`; checkpoint at `t1b-w5-checkpoint` branch) |
| Original baseline | `b707936977d41ae726baf2f5170ca7ae55d721f8` |
| Assurance lane | CRITICAL |
| Audit mode | LIGHT |
| Tier 1 sign-off | Initial delivery |
| Next gate | Tier 3 LIGHT audit; T0/Owner merge gate |

> Handoff status: `READY_FOR_AUDIT` (round 1 — T1B delivery; frozen; no remote push, no PR, no production deploy).

## 1. Outcome and changed surface

### Outcome (per Tier 0 brief)

- Assigning a profile whose persisted `ACTIVE` assignment is already past `expiresAt` succeeds without a false P2002 conflict and records the old row as `EXPIRED`.
- Manual release records `REVOKED`, preserving the distinction from natural expiry.
- `labor_profile_handling_assignments` is protected by forced RLS: managers administer assignments, assignees can read only their own rows, and missing/unrelated context is denied.

### Non-goals (per TASK §1.2)

- No UI/API/auth refactor, scheduler, commission/beneficiary logic, optimistic locking, placement-case remodel, or production migration/deploy.
- No change to public AFF RPC ownership or anonymous grants.

### Changed surface

- **NEW**: `prisma/migrations/20260922100000_w5_handling_assignment_safety/migration.sql` (additive RLS metadata)
- **NEW**: `src/domains/talent/handling-assignment.security.test.ts` (3 static migration tests)
- **NEW**: `tests/db/handling-assignment.integration.test.ts` (4 integration tests)
- **MOD**: `src/domains/talent/handling-assignment.service.ts` (timing boundary fix: `<` → `<=`; sweep-before-assign/release)
- **MOD**: `src/domains/talent/handling-assignment.service.test.ts` (+5 deterministic timing-boundary tests; total 11 unit tests)
- **MOD**: `vitest.integration-files.ts` (registered new integration test)
- **NOT TOUCHED** (forbidden paths): routes/UI, other domains, shared auth, production DB, AFF hotfix branches.

## 2. Acceptance evidence

| ID | Verification | Result | Limitation |
|---|---|---|---|
| — | `pwsh .ai-pipeline/scripts/verify-task.ps1 "docs/tasks/hrp-v6-w5-handling-assignment-safety/TASK.md"` | RESULT: PASS | none |
| AC-01 | `node_modules/.bin/vitest run src/domains/talent/handling-assignment.security.test.ts` — static migration tests | 3/3 PASS; exit 0 | none |
| AC-02 | `node_modules/.bin/vitest run --config vitest.integration.config.ts tests/db/handling-assignment.integration.test.ts` — AC: sweeps elapsed ACTIVE before reassignment | 4/4 PASS; exit 0 | none |
| AC-03 | `node_modules/.bin/vitest run --config vitest.integration.config.ts tests/db/handling-assignment.integration.test.ts` — AC: records manual release as REVOKED | 4/4 PASS; exit 0 | none |
| AC-04 | `node_modules/.bin/vitest run --config vitest.integration.config.ts tests/db/handling-assignment.integration.test.ts` — AC: assignees read own rows; denies unrelated writes | 4/4 PASS; exit 0 | none |
| AC-05 | `npx vitest run --config vitest.unit.config.ts` + `npm run build` + `npx prisma validate` + `npm run lint` | 2407/2407 unit PASS; 434/434 integration PASS (2 skipped); build exit 0; lint 0 errors | none |
| AC-06 | `git diff --check` + scope diff | no whitespace errors; 3 files in allowlist touched | none |

### Timing edge fix

**Root cause**: `getActiveHandlingAssignment` used strict `<` while sweep uses `lte` — inconsistency at `expiresAt === now`.

**Fix**: Changed to `expiresAt <= asOf` (consistent with sweep semantics).

**File**: `src/domains/talent/handling-assignment.service.ts` line 168.

### Regression tests added

Five deterministic timing-boundary tests using `vi.setSystemTime(fixedNow)` (no wall-clock sleep):

1. `expiresAt === asOf` → null (expired)
2. sweep expired → new ACTIVE created (no predecessor)
3. sweep valid → TRANSFERRED predecessor → new ACTIVE with link
4. release valid → REVOKED
5. release expired → sweep EXPIRED → null (no REVOKED written)

## 3. Evidence registry

| ID | Command | Measured result |
|---|---|---|
| E-01 | `npx vitest run --config vitest.unit.config.ts` | 158 files; 2407/2407 PASS; exit 0 |
| E-02 | `npx tsc --noEmit` | exit 0 |
| E-03 | `npm run lint` | exit 0; 0 errors, 649 warnings |
| E-04 | `npm run build` | exit 0 |
| E-05 | `npx vitest run --config vitest.integration.config.ts` | 23 files; 434/434 PASS; 2 skipped; exit 0 |
| E-06 | `npx vitest run --config vitest.integration.config.ts tests/db/handling-assignment.integration.test.ts` | 4/4 PASS; exit 0 |
| E-07 | `npx vitest run src/domains/talent/handling-assignment.service.test.ts src/domains/talent/handling-assignment.security.test.ts` | 14/14 PASS; exit 0 |
| E-08 | `git diff --check` | exit 0; no whitespace errors |
| E-09 | `npx prisma validate` | schema valid; exit 0 |
| E-10 | `npx prisma migrate deploy` | All 44 migrations applied; exit 0 |

## 4. Deviations and blockers

| ID | Type | Description | Disposition |
|---|---|---|---|
| None | — | No deviations from TASK contract | — |

**Blockers at delivery**: None. All gates pass.

**Production gate remaining**: Migration production apply is T0/Owner gate (not in T1B scope).

## 5. Final status

T1B owner commitments (all met):

- [x] All AC have evidence (§2)
- [x] `verify-task.ps1` PASS
- [x] `verify-handoff.ps1` PASS (this run)
- [x] Diff stays inside TASK allowlist
- [x] No production DB or credentials
- [x] Worktree frozen after delivery commit

**Merge gate (T0/Owner-owned; T1B does NOT self-merge)**:

Ordered sequence — STOP at any failed step:

1. **Preflight on writable staging**: apply W5 migration; confirm `pg_policies` rows exist; `prisma migrate status` clean.
2. **Apply migration to production**: T0/Owner executes `npx prisma migrate deploy` against production DB.
3. **Merge to `main`**: T0/Owner merges delivery commit on `tier1/w5-handling-assignment-safety` to `main`.
4. **Deploy `main`**: standard release pipeline.
5. **Post-deploy smoke**: `managerAssign` on elapsed ACTIVE → `EXPIRED` + new `ACTIVE`; `releaseHandlingAssignment` on valid → `REVOKED`; `releaseHandlingAssignment` on elapsed → null.

---

> Handoff status: `READY_FOR_AUDIT` (round 1 — T1B delivery complete; frozen; no remote push, no PR, no production deploy).
