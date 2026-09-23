# AUDIT — hrp-v6-n2-aff-05a-r1-canonical-initial-handling (round 5 / R8)

## 0. Control

| Field | Value |
|---|---|
| Task slug | `hrp-v6-n2-aff-05a-r1-canonical-initial-handling` |
| Spec version | `v1.1` |
| Audit mode | LIGHT |
| Audit lane | CRITICAL |
| Branch | `codex/t1b-aff05a-r1-canonical-initial-handling` |
| Baseline | `e4d21807f0d972de447e710066b40c77a661fb17` (origin/main post ER-002) |
| Implementation SHA (committed frozen) | `2f5d5702e1169bd2202db932c37c58f05422fcbc` (round 4 — closes 5 finding groups G1–G5) |
| Doc freeze SHAs | `3a33c2f` (round 4 SHA freeze), `ae652d0` (HEAD — round 4 HEAD SHA freeze) |
| HEAD | `ae652d014145b5f92b2f4b285dc670ebae0b59c8` |
| R8 working-tree SHA | NOT YET COMMITTED — R8 is dirty/uncommitted per T0 directive ("chưa commit/push/PR"). Working tree carries the R8 content as deliverable for T0 review. |
| Previous T3 verdict (round 4) | PASS at `f27afe0` (G1–G7 closed) |
| Audit delta (round 5) | R8 corrections on top of `2f5d570`; covers R8-G1, R8-G2, R8-G3a/b/c, R8-G4 |
| Verdict | **CONDITIONAL PASS** — R8 finding groups R8-G1, R8-G2, R8-G3a, R8-G4 closed at content-level; **R8-G3c has a P1 lint regression** (`no-unsafe-finally`) requiring Tier 1 follow-up before T0 commits. R8 overall business logic correct; minor cleanup code defect. |

## 1. Round 5 (R8) audit summary

This is a Tier 3 LIGHT delta audit on top of the round 4 PASS at `2f5d570`. The R8 round addresses T0 round-8 directives (R8-G1 through R8-G4). The R8 content lives in the working tree (uncommitted) at HEAD `ae652d0`.

### 1.1 Audit scope

- **Implementation SHA**: `2f5d570` (round 4 committed); R8 uncommitted content also reviewed.
- **R8-G1**: `prepare-migration-test-db.mjs` rejects `--validate-guards` and any unknown flag at module-init time (BEFORE env-var reads).
- **R8-G2**: `build-predecessor-staging.mjs` and `prepare-migration-test-db.mjs` perform source/target collision check BEFORE destructive DROP/CREATE.
- **R8-G3a**: `build-predecessor-staging.mjs` reads `prisma/migrations/migration_lock.toml` from pinned Git baseline `e4d21807…` (blob `fbffa92c2bb7c748d6fc78f9f9dcac604dabb87d`). Working-tree and default-string fallbacks REMOVED.
- **R8-G3b**: `tests/db/aff03-public-intake.integration.test.ts::cleanupLaborProfile` uses `$queryRawUnsafe` (returns rows) — NOT `$executeRawUnsafe` (returns count). Cleanup order strictly child→parent.
- **R8-G3c**: AFF-05A `afterAll` and line 1366 cleanup use predicate-based preservation with `throw new Error(...)` in a `try { ... } catch (e) { throw ... }` NESTED inside a `finally` block.
- **R8-G4**: HANDOFF.md fully rewritten — removed wrong "collision check before DROP" claim (now correctly stated as pre-DROP), removed "integration preflight calls prepare" (source shows posture only), removed "admin not superuser" (posture artifact shows admin IS postgres superuser), removed "diff zero vs 2f5d570" (actual diff is +12 lines from R6 SET LOCAL placement). Listed 8 new R8 canonical logs separately from older logs.

### 1.2 R8 evidence files verified (9 canonical R8 logs)

All 9 R8 canonical logs are clean UTF-8, LF-only, no BOM:

| File | Bytes | BOM | CRLF | Notes |
|---|---|---|---|---|
| `evidence/guards-r8.txt` | 2648 | ✗ | ✗ | VALIDATE_GUARDS_RESULT=PASS — 22 assertions (11 negative + 6 probe + 4 R8-G1/G2 + 1 evidence-integrity) |
| `evidence/ac04-lock-timeout.txt` | 4003 | ✗ | ✗ | AC-04 lock_timeout PASS — `MIGRATION_ELAPSED_MS=5347` |
| `evidence/ac06-backfill.txt` | 4300 | ✗ | ✗ | AC-06 PASS — full assertion list |
| `evidence/ac07-rollback.txt` | 3519 | ✗ | ✗ | AC-07 PASS — forced anomaly triggers full rollback |
| `evidence/ci-integration.txt` | 19494 | ✗ | ✗ | Canonical-name copy of run1 (byte-identical) |
| `evidence/ci-integration-run1.txt` | 19494 | ✗ | ✗ | Run 1: 23 files / 445 passed / 0 failed / 2 skipped (ops06a) |
| `evidence/ci-integration-run2.txt` | 19217 | ✗ | ✗ | Run 2: identical totals (two-run proof) |
| `evidence/posture-assertion-r8.txt` | 526 | ✗ | ✗ | writer=app_user_writer (non-super); admin=postgres (super) |
| `evidence/staging-build-r8.txt` | 1482 | ✗ | ✗ | `MIGRATION_LOCK_TOML_SOURCE=pinned_baseline=e4d21807…` blob `fbffa92c2bb7c748d6fc78f9f9dcac604dabb87d`; `TARGET_DB_COLLISION_CHECK=pass (pre-DROP, db-not-exists)` |

Note: `evidence/staging-build.txt` (older non-R8 file) has CRLF (1452 bytes), but R8 does NOT claim this file is clean. Per-file UTF-8 hygiene applies to the 9 R8 canonical logs only.

## 2. Gate re-run at working tree (R8)

| Gate | Command | Result | Source |
|---|---|---|---|
| `git diff --check` | (all tracked) | exit 0 (clean) | shell |
| `npx tsc --noEmit` | typecheck | exit 0 | shell |
| `npm run lint` | lint | **exit 1 (2 errors, 672 warnings)** | **REGRESSION** — see §3 |
| `npm run build` | build | ✓ Compiled successfully in 9.0s | shell |
| `verify-task.ps1` | TASK contract | DRAFT-VALID (2 non-blocking warnings: T-02 cited non-existent file, A-04 status placeholder) | powershell |
| `verify-handoff.ps1` | HANDOFF substance | **PASS** (all 13 OK, 0 warnings) | powershell |
| `npx prisma validate` | schema (with DATABASE_URL + DATABASE_URL_ADMIN set) | exit 0 — "schema is valid 🚀" | shell |
| `validate-guards.mjs` | non-mutating guard validator | exit 0 — `VALIDATE_GUARDS_RESULT=PASS` (22 PASS) | re-ran locally |
| `git ls-tree e4d21807 prisma/migrations/20260922160000_aff05a_r1_initial_handling_window/` | R1 in predecessor? | empty (R1 not in baseline) | git |
| `git ls-tree e4d21807 prisma/migrations/migration_lock.toml` | blob verification | `100644 blob fbffa92c2bb7c748d6fc78f9f9dcac604dabb87d` matches R8 evidence | git |
| `git diff 2f5d570 -- prisma/migrations/.../migration.sql` | migration delta | +12 lines (SET LOCAL lock_timeout moved to IMMEDIATELY after BEGIN, BEFORE all operations) | git |
| Test count | `it(...)` count in test file | 26 in both R4 and R8 — no `.skip` added, counts unchanged | grep |
| Working tree | `git status` | 19 modified + 14 untracked; not committed; not pushed; no PR | git |

## 3. Findings

### 3.1 P1 — Lint regression introduced by R8 (2 errors)

**Severity**: P1 — lint exit non-zero (regression from R4 clean state). Source-code defects; business logic unaffected, but clean-lint gate is part of the R8 closure.

#### 3.1.1 F-P1-1: `scripts/ci/build-predecessor-staging.mjs:237:57` — `no-useless-escape`

```
237 |     const m = n.match(/^prisma\/migrations\/(\d{8,14}_[^\/]+)\/?$/);
                                                                  ^
237:57  error  Unnecessary escape character: \/  no-useless-escape
```

**Location**: line 237, column 57. The `\/` escape inside the character class `[^\/]` is unnecessary; should be `[^/]`.

**Introduced**: R8 (new file). Line 237 in R4 is at a different location (different file content). This is a new R8 defect.

**Fix**: change `[^\/]` to `[^/]` (the unescaped `/` is valid inside a character class).

#### 3.1.2 F-P1-2: `tests/db/aff03-public-intake.integration.test.ts:1389:9` — `no-unsafe-finally`

```
1385 |       } else {
1386 |         await admin.laborProfile.deleteMany({ where: { id: lp.id } });
1387 |       }
1388 |     } catch (e) {
1389 |       throw new Error(
1390 |         `hrp_ra_update_writer LP cleanup failed unexpectedly: ${(e as Error).message}`,
1391 |       );
1392 |     }
1393 |   }  // ← END OF OUTER finally BLOCK (line 1365)
```

**Location**: line 1389. The `throw new Error(...)` is INSIDE an outer `finally` block (line 1365). When the outer `try` (lines 1347–1364) throws ANY error, the cleanup's `throw` will swallow the original error and override it with a generic "cleanup failed" message.

**Introduced**: R8-G3c. R4 had no `try/finally/throw` cleanup at this location (it was an entirely different test). This is a new R8 defect introduced when implementing the predicate-based preservation pattern.

**Risk**: The R8-G3c intent (predicate-based preservation + loud failure) is correct, but the placement is unsafe. If the original `try` block (the test body) ever throws, the original test failure is replaced by the cleanup's "hrp_ra_update_writer LP cleanup failed unexpectedly" message — masking the real test failure.

**Fix**: move the `try { ... } catch (e) { throw ... }` OUTSIDE the outer `finally` block. The cleanup should run as a separate phase (e.g., in `afterAll`) rather than as part of the test's finally. Alternatively, restructure so the cleanup is not in a `finally` block (e.g., use a try/catch around the test body and call cleanup in the `catch` and rethrow the original error).

### 3.2 P2 — HANDOFF §0 Control field drift (carry-forward non-blocking)

**Severity**: P3 — non-blocking; HANDOFF itself documents this drift.

The HANDOFF §0 Control states:
- `Implementation SHA — content as delivered (T0 explicitly cited as "commit cũ") | 2f5d570`
- `R8 implementation SHA (delivery of R8) | NOT YET COMMITTED — R8 is dirty/uncommitted per T0 directive`

This is internally consistent — HANDOFF correctly identifies the historical SHA as `2f5d570` and the R8 content as uncommitted. The artifact also notes "Bàn giao dirty diff cho T0 review một lượt; sau khi sạch mới chốt commit và yêu cầu T3 audit delta." This is a T0-managed workflow, not a T3 finding.

**Carry-forward**: when T0 commits R8, the implementation SHA should be updated to the new R8 commit SHA. The HANDOFF phrasing already accommodates this.

### 3.3 P3 — TASK.md §4.2 allowlist sync verified

**Severity**: P3 — non-blocking; verified in working tree.

TASK.md §4.2 now lists 11 files:
1. `prisma/migrations/20260922160000_aff05a_r1_initial_handling_window/migration.sql`
2. `tests/db/aff03-public-intake.integration.test.ts`
3. `docs/tasks/hrp-v6-n2-aff-05a-r1-canonical-initial-handling/**`
4. `scripts/ci/prepare-migration-test-db.mjs`
5. `scripts/ci/apply-r1-migration.mjs`
6. `scripts/ci/verify-ac06-backfill.mjs`
7. `scripts/ci/verify-ac07-rollback.mjs`
8. `scripts/ci/integration-preflight.mjs`
9. `scripts/ci/assert-test-db-posture.mjs` (R6)
10. `scripts/ci/build-predecessor-staging.mjs` (R8)
11. `scripts/ci/validate-guards.mjs` (R7)

All 3 new R8 scripts (9, 10, 11) are explicitly listed in the allowlist. ✅ Working tree modifications and untracked files are within the allowlist — no scope creep.

### 3.4 P3 — Older evidence files not claimed clean by R8 (carry-forward)

**Severity**: P3 — non-blocking; HANDOFF correctly excludes them from R8's cleanliness claim.

HANDOFF §3 (R8 — strict UTF-8 no-BOM, LF-only, no mojibake) explicitly excludes older logs from the R8 cleanliness claim:

> Older logs in `evidence/` (`baseline-integration.txt`, `candidate-integration.txt`, `baseline-metadata.txt`, `candidate-metadata.txt`, `guards.txt`, `unit-tests.txt`, `guards-r5.txt`, `guards-r7.txt`, `staging-build-r7.txt`, `staging-build.txt`, `posture-assertion-r7.txt`, `posture-assertion.txt`, `unit-r7.txt`, `AUDIT-tier3-round4.md`) may carry encoding artefacts (BOM, CRLF, mojibake markers) from R5/R6/R7 captures; R8 does NOT claim them clean.

Verified: only `evidence/staging-build.txt` has CRLF among the older files; all others are clean. R8 does not over-claim.

## 4. Verdict

**Verdict: CONDITIONAL PASS** — Tier 3 LIGHT round 5 (R8)

R8 closes 4 of 4 T0 round-8 finding groups at the content level:
- **R8-G1** ✅ `prepare-migration-test-db.mjs` rejects `--validate-guards` and unknown flags at module-init time (`ALLOWED_FLAGS = new Set(['--dry-run', '--probe'])` at line 75, BEFORE env-var reads). Validator confirms with 2 new negative tests.
- **R8-G2** ✅ Source/target collision check (`pg_stat_activity` + `pg_database`) now runs BEFORE destructive DROP/CREATE in `build-predecessor-staging.mjs` (line 271) and `prepare-migration-test-db.mjs`. AC-06/07 reject `MIGRATION_TARGET_DB == aff05a_r1_predecessor` BEFORE the builder call. Validator confirms with 2 new negative tests.
- **R8-G3a** ✅ `build-predecessor-staging.mjs` reads `migration_lock.toml` from pinned Git baseline `e4d21807…` (blob `fbffa92c…`). Verified: `git ls-tree e4d21807 prisma/migrations/migration_lock.toml` returns `100644 blob fbffa92c2bb7c748d6fc78f9f9dcac604dabb87d` matching R8 evidence.
- **R8-G3b** ✅ `tests/db/aff03-public-intake.integration.test.ts::cleanupLaborProfile` uses `$queryRawUnsafe` (NOT `$executeRawUnsafe`) for placement_case id query. Cleanup order strictly child→parent.
- **R8-G3c** ⚠️ predicate-based preservation pattern is CORRECT in intent, but the placement in a `finally` block introduces a `no-unsafe-finally` lint error (F-P1-2). Business logic is correct; this is a code-cleanliness defect. Recommended fix: move cleanup out of `finally` block (e.g., to `afterAll` or wrap test body in try/catch with rethrow of original error).
- **R8-G4** ✅ HANDOFF fully rewritten — all 7 sections reflect R8 reality (not R6/R7). Removed wrong claims about collision-check position, integration-preflight scope, admin posture, prisma validate evidence, two-run artifacts, and selective evidence-cleanliness.

**Other R8 closures verified**:
- 9 R8 canonical evidence files are clean UTF-8 LF-only no-BOM.
- `validate-guards.mjs` produces 22 PASS (including 4 new R8-G1/G2 negatives and 1 evidence-integrity check).
- Integration tests: 445 passed / 0 failed / 2 skipped (ops06a pre-existing, R4 baseline reproduced). Two independent runs (run1 + run2) confirm reproducibility.
- Posture: writer=`app_user_writer` (non-super, non-bypassrls); admin=`postgres` (super, bypassrls). This is the synthetic-DB admin role (needs CREATE DATABASE); writer is bound by RLS on actual integration test path. R5 superuser baseline remains marked INVALID for security comparison (per T0 R6-G4).
- Staging build: `MIGRATION_LOCK_TOML_SOURCE=pinned_baseline=e4d21807…` blob matches. `VERIFY_FN_SZ=7274`, `VERIFY_FN_HAS_R1=false`, `VERIFY_FN_HAS_LOCK=false`, `VERIFY_HANDLING_PRIVS_HRP=INSERT` — confirms true predecessor state.
- Migration delta vs `2f5d570`: +12 lines, the R6 SET LOCAL placement change (`SET LOCAL lock_timeout = '5s'` moved to immediately after BEGIN, before all operations including ALTER FUNCTION, GRANT/REVOKE, table lock). Functionally equivalent; earlier placement is safer.
- Test counts unchanged (26 `it(...)` blocks in both R4 and R8); no `.skip` added.
- AUDIT-tier3-round4.md preserved as untracked, untouched by R8.
- `.gitignore` updated to ignore R8 hygiene items (`docs/tasks/*/evidence-tmp/`, `evidence-*.txt`, `test.txt`, `_cap.mjs`, `fix_planner.js`, `.env-prepare*`, `.env-prisma*`).
- No production credentials or production data used; no commit/push/PR/merge performed; branch clean and frozen for T0 review.

## 5. Tier 1 follow-up (before T0 commits R8)

### F-P1-1 — Fix `no-useless-escape` in `build-predecessor-staging.mjs:237`

Change:
```javascript
const m = n.match(/^prisma\/migrations\/(\d{8,14}_[^\/]+)\/?$/);
```
to:
```javascript
const m = n.match(/^prisma\/migrations\/(\d{8,14}_[^/]+)\/?$/);
```

### F-P1-2 — Fix `no-unsafe-finally` in `aff03-public-intake.integration.test.ts:1389`

Restructure the cleanup so the `try { ... } catch (e) { throw ... }` is NOT inside a `finally` block. Options:
1. Move the predicate-based cleanup to a separate `afterAll` hook at the suite level, where it runs in its own try/catch (no swallowing of original error).
2. Refactor the test body to wrap the entire test logic in a try/catch, with cleanup in the catch and rethrow of the original error:
   ```javascript
   try {
     // test body
   } catch (originalError) {
     // predicate-based cleanup
     try { /* cleanup */ } catch (cleanupError) {
       // log but don't throw — original error is more important
       console.error('[aff03-public-intake] cleanup also failed:', cleanupError);
     }
     throw originalError;
   }
   ```

After fixes, re-run `npm run lint` to confirm 0 errors, and re-run `npm run test:integration` to confirm 445/0/2 unchanged.

## 6. Carry-forward rule

Tier 3 round 4 (PASS at `f27afe0`) verdict remains valid. This round 5 verdict supersedes round 4 only on the R8 delta items. Tier 0 must authorize a re-audit only if F-P1-1 and F-P1-2 require further review after fixes.

## 7. Files reviewed

- `docs/tasks/hrp-v6-n2-aff-05a-r1-canonical-initial-handling/HANDOFF.md` (round 5 full rewrite)
- `docs/tasks/hrp-v6-n2-aff-05a-r1-canonical-initial-handling/TASK.md` (allowlist updated)
- `docs/tasks/hrp-v6-n2-aff-05a-r1-canonical-initial-handling/evidence/{guards-r8,ac04-lock-timeout,ac06-backfill,ac07-rollback,ci-integration,ci-integration-run1,ci-integration-run2,posture-assertion-r8,staging-build-r8}.txt` (9 R8 canonical logs)
- `prisma/migrations/20260922160000_aff05a_r1_initial_handling_window/migration.sql` (+12 lines vs R4)
- `scripts/ci/prepare-migration-test-db.mjs` (R8-G1 + R8-G2)
- `scripts/ci/build-predecessor-staging.mjs` (R8-G2 + R8-G3a; new R8 file)
- `scripts/ci/integration-preflight.mjs` (R5-G1 posture assertion hook)
- `scripts/ci/assert-test-db-posture.mjs` (new R6 file)
- `scripts/ci/validate-guards.mjs` (new R7 file; 22 PASS)
- `scripts/ci/verify-ac06-backfill.mjs` (R8-G2 config-collision reject)
- `scripts/ci/verify-ac07-rollback.mjs` (R8-G2 config-collision reject + R8-G4 lock-timeout re-run)
- `tests/db/aff03-public-intake.integration.test.ts` (R8-G3b + R8-G3c cleanup)
- `.gitignore` (R8 hygiene additions)
- `AUDIT-tier3-round4.md` (preserved as untracked, untouched)

## 8. Audit conclusion

**Tier 3 LIGHT round 5 verdict: CONDITIONAL PASS** — R8 finding groups R8-G1, R8-G2, R8-G3a, R8-G4 are closed at content level. **R8-G3c has a P1 lint regression** (`no-unsafe-finally` — `throw` inside `finally` swallows original error) requiring Tier 1 follow-up before T0 commits R8. R8-G3b has a separate lint error (`no-useless-escape` in `build-predecessor-staging.mjs:237`). Business logic is correct across all R8 changes; the P1 issues are code-cleanliness defects that don't affect runtime behavior in the current synthetic-DB test lane (the cleanup `try` only fires on FK RESTRICT errors which are already logged+preserved; the actual test failures would still surface in the test body's `expect()` calls). However, the cleanup pattern is unsafe for future use cases and must be fixed.

**Recommendation**: T0 should ask Tier 1 to fix F-P1-1 and F-P1-2 before T0 commits R8. After fixes, re-run lint (expect 0 errors) and integration tests (expect 445/0/2 unchanged). Then T0 can commit R8 and update the Implementation SHA in HANDOFF §0. Final T3 LIGHT re-audit on the committed R8 SHA is recommended to confirm the P1 fixes do not introduce regressions.

No production credentials or data used. No commit/push/PR/merge performed by Tier 3.
