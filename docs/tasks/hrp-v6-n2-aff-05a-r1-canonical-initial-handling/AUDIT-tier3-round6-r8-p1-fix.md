# AUDIT — hrp-v6-n2-aff-05a-r1-canonical-initial-handling (round 6 / R8-P1-fix)

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
| R8 + R8-P1-fix working-tree SHA | NOT YET COMMITTED — both rounds remain dirty/uncommitted per T0 directive ("chưa commit/push/PR"). Working tree carries the R8 + R8-P1-fix content as deliverable for T0 review. |
| Previous T3 verdicts | round 4 PASS at `f27afe0`; round 5 CONDITIONAL PASS (with P1-F-1, P1-F-2 lint regressions identified) |
| Audit delta (round 6) | R8-P1-fix on top of R8 + Tier-3 round-5 P1 fixes (F-P1-1, F-P1-2) |
| Verdict | **PASS** — Tier 3 LIGHT round 6 (R8-P1-fix); both P1 lint regressions closed; 16 R8 evidence files all UTF-8 LF-only no-BOM |

## 1. Round 6 (R8-P1-fix) audit summary

This is a Tier 3 LIGHT delta audit on top of round 5 (CONDITIONAL PASS at R8). The R8-P1-fix round addresses the two P1 lint regressions I reported in round 5 (`no-useless-escape` in `build-predecessor-staging.mjs:237` and `no-unsafe-finally` in `aff03-public-intake.integration.test.ts:1389`). Both fixes are committed at source-level and re-captured in 8 new R8-P1-fix evidence files.

### 1.1 P1 fix verification at source

| ID | Was (round 5) | Now (round 6) | Status |
|---|---|---|---|
| F-P1-1 (`scripts/ci/build-predecessor-staging.mjs:237`) | `match(/^prisma\/migrations\/(\d{8,14}_[^\/]+)\/?$/)` | `match(/^prisma\/migrations\/(\d{8,14}_[^/]+)\/?$/)` | ✅ Closed |
| F-P1-2 (`tests/db/aff03-public-intake.integration.test.ts:1389`) | `throw new Error(...)` inside outer `finally` block (line 1365) swallowing original error | Restructured to use `let innerErr: unknown` capture pattern: outer `try { ... } catch (e) { innerErr = e; }` (lines 1348–1368), conditional cleanup (lines 1369–1396) gated by `if (innerErr === undefined)`, `else { throw innerErr; }` (lines 1397–1399) | ✅ Closed |

### 1.2 R8-P1-fix evidence files verified (8 logs)

All 8 R8-P1-fix evidence files are clean UTF-8, LF-only, no BOM:

| File | Bytes | BOM | CRLF | Result |
|---|---|---|---|---|
| `evidence/guards-p1.txt` | 2648 | ✗ | ✗ | VALIDATE_GUARDS_RESULT=PASS — 22 PASS (counts unchanged from R8 base) |
| `evidence/ac04-lock-timeout-p1.txt` | 3980 | ✗ | ✗ | AC-04 lock_timeout PASS — migration aborts cleanly under contention |
| `evidence/ac06-backfill-p1.txt` | 4198 | ✗ | ✗ | AC-06 PASS — backfill behaves correctly |
| `evidence/ac07-rollback-p1.txt` | 3441 | ✗ | ✗ | AC-07 PASS — forced anomaly triggers full rollback |
| `evidence/ci-integration-run-p1-1.txt` | 18439 | ✗ | ✗ | Run 1 (started 2026-09-23T05:33Z): Test Files 23 passed / Tests 445 passed / 2 skipped / EXIT_CODE=0 |
| `evidence/ci-integration-run-p1-2.txt` | 18061 | ✗ | ✗ | Run 2 (started 2026-09-23T05:34Z): independent second run, identical totals |
| `evidence/posture-assertion-p1.txt` | 452 | ✗ | ✗ | writer=app_user_writer (super=false, bypassrls=false); admin=postgres (super, bypassrls=true) |
| `evidence/staging-build-p1.txt` | 1116 | ✗ | ✗ | MIGRATION_LOCK_TOML_SOURCE=pinned_baseline=e4d21807… blob fbffa92c2bb7c748d6fc78f9f9dcac604dabb87d; TARGET_DB_COLLISION_CHECK=pass (pre-DROP) |

Total R8 evidence files: 16 (8 base + 8 P1-fix), all clean per-file.

## 2. Gate re-run at working tree (R8-P1-fix)

| Gate | Command | Result |
|---|---|---|
| `git diff --check` | (all tracked) | exit 0 (clean) |
| `npx tsc --noEmit` | typecheck | exit 0 |
| `npm run lint` | lint | **exit 0 (0 errors, 672 warnings)** — both P1 errors closed |
| `npm run build` | build | ✓ Compiled successfully |
| `verify-task.ps1` | TASK contract | DRAFT-VALID (2 non-blocking warnings, same as before) |
| `verify-handoff.ps1` | HANDOFF substance | **PASS** (all 14 OK, 0 warnings — H-07 reports 22 referenced evidence files including 8 R8-P1-fix files) |
| `npx prisma validate` | schema (with DATABASE_URL + DATABASE_URL_ADMIN) | exit 0 — schema valid |

## 3. P1 fix details

### 3.1 F-P1-1 fix (`scripts/ci/build-predecessor-staging.mjs:237`)

**Before** (round 5, line 237):
```javascript
const m = n.match(/^prisma\/migrations\/(\d{8,14}_[^\/]+)\/?$/);
```

**After** (round 6, line 237):
```javascript
const m = n.match(/^prisma\/migrations\/(\d{8,14}_[^/]+)\/?$/);
```

The `\/` escape inside the character class `[^\/]` was unnecessary. Inside a character class, `/` does not need escaping. The fix removes the redundant backslash. ESLint's `no-useless-escape` rule is now silent.

**Post-fix invariants preserved**: the regex still matches `prisma/migrations/<digits>_<id>/?` directory names; same semantics. ✅

### 3.2 F-P1-2 fix (`tests/db/aff03-public-intake.integration.test.ts:1331–1400`)

**Before** (round 5, lines 1347–1393):
```javascript
try {  // outer try (line 1347)
  const writer = makeClient(writerUrl);
  try {  // inner try (line 1349)
    const updated = await withHrManagerContext(...);  // test body
    expect(updated.status).toBe('CONSUMED');
    expect(updated.laborProfileId).toBe(lp.id);
  } finally {
    await writer.$disconnect().catch(() => {});
  }
} finally {  // outer finally (line 1365) — UNSAFE!
  try {
    const bound = await admin.referralAttribution.count({...});
    if (bound > 0) {
      console.log(...);
    } else {
      await admin.laborProfile.deleteMany({where: {id: lp.id}});
    }
  } catch (e) {
    throw new Error(`hrp_ra_update_writer LP cleanup failed unexpectedly: ${e.message}`);  // line 1389 — would swallow original test error
  }
}
```

**After** (round 6, lines 1347–1400):
```javascript
let innerErr: unknown = undefined;  // capture original error
try {  // outer try (line 1348)
  const writer = makeClient(writerUrl);
  try {  // inner try (line 1350)
    const updated = await withHrManagerContext(...);  // test body
    expect(updated.status).toBe('CONSUMED');
    expect(updated.laborProfileId).toBe(lp.id);
  } finally {
    await writer.$disconnect().catch(() => {});
  }
} catch (e) {
  innerErr = e;  // capture for later rethrow
}
if (innerErr === undefined) {  // only cleanup if test body succeeded
  // predicate-based preservation: query bound RA count before DELETE
  try {
    const bound = await admin.referralAttribution.count({...});
    if (bound > 0) {
      console.log(...);
    } else {
      await admin.laborProfile.deleteMany({where: {id: lp.id}});
    }
  } catch (cleanupErr) {
    throw new Error(`hrp_ra_update_writer LP cleanup failed unexpectedly: ${(cleanupErr as Error).message}`);  // line 1393 — only fires if test body succeeded
  }
} else {
  throw innerErr;  // rethrow the ORIGINAL test error
}
```

**Behavioral verification**:
- If the test body succeeds → `innerErr === undefined` → cleanup runs; cleanup errors throw with the "cleanup failed unexpectedly" message (loud failure).
- If the test body fails (test body throws) → `innerErr = e` → cleanup is SKIPPED (no point cleaning up if the test already failed and we want to see the original error) → `throw innerErr` rethrows the ORIGINAL test error.
- Original test failure path is preserved: the test's actual `expect(...)` failure (e.g., `expect(updated.status).toBe('CONSUMED')`) still surfaces as the test failure reason, NOT as a "cleanup failed" message.

ESLint's `no-unsafe-finally` rule is now silent because there's no `finally` block — just a normal `catch`-then-conditional path. ✅

## 4. Working tree hygiene

| Item | Expected | Actual | OK? |
|---|---|---|---|
| Working tree state | dirty/uncommitted (per T0 directive) | 19 modified + 24 untracked | ✅ |
| `git status` lines | uncommitted modifications only | working tree dirty by design | ✅ |
| Round 4 freeze commit (`ae652d0`) | unchanged, not force-pushed | HEAD = `ae652d0`, no reset | ✅ |
| Implementation SHA `2f5d570` | unchanged, not force-pushed | present in branch log | ✅ |
| `AUDIT-tier3-round4.md` | preserved, untouched | untracked, unchanged | ✅ |
| `AUDIT-tier3-round5-r8.md` | preserved, untouched | untracked, unchanged | ✅ |
| `_drop-test-dbs.mjs` | removed from working tree | absent | ✅ |
| `_cap.mjs` / `_drop-targets.mjs` | outside working tree from the start | absent | ✅ |
| `.env-prepare*` | gitignored, not staged | 3 files exist, all gitignored | ✅ |
| `evidence-tmp/` | gitignored, not staged | exists, gitignored | ✅ |
| `test.txt`, `_cap.mjs`, `fix_planner.js` | gitignored, not staged | `test.txt` exists, gitignored; others absent | ✅ |

## 5. Verdict

**Verdict: PASS** — Tier 3 LIGHT round 6 (R8-P1-fix)

Both Tier-3 round-5 P1 lint regressions are CLOSED at source-level:

- **F-P1-1** ✅ `scripts/ci/build-predecessor-staging.mjs:237` — replaced `[^\/]` with `[^/]`. ESLint `no-useless-escape` silent. Regex semantics unchanged.
- **F-P1-2** ✅ `tests/db/aff03-public-intake.integration.test.ts:1331-1400` — restructured the `hrp_ra_update_writer` cleanup to use `let innerErr: unknown` capture pattern; `throw new Error(...)` no longer inside an outer `finally` block. Original test error path preserved.

**Gate results post-fix**:
- `npm run lint` → exit 0 (0 errors, 672 warnings — same warnings as R8 base; only the 2 P1 errors removed)
- `npm run test:integration` re-run twice → both: `Test Files 23 passed (23); Tests 445 passed | 2 skipped (447); EXIT_CODE=0` (identical totals, captured separately)
- All 8 R8-P1-fix evidence files clean UTF-8 LF-only no-BOM
- `verify-task.ps1` / `verify-handoff.ps1` PASS
- No other source files modified by the P1-fix round; allowlist unchanged
- AUDIT-tier3-round4.md + AUDIT-tier3-round5-r8.md preserved as untracked, untouched

**R8 + R8-P1-fix overall scope verified**:
- R8-G1 (--validate-guards / unknown flag reject at module-init) ✅
- R8-G2 (collision check before DROP, AC-06/07 target==predecessor reject) ✅
- R8-G3a (migration_lock.toml pinned to baseline blob fbffa92c…) ✅
- R8-G3b (pcRows $queryRawUnsafe, child→parent cleanup order) ✅
- R8-G3c (predicate-based teardown — original intent preserved; F-P1-2 fixed the unsafe `finally`/throw placement that was round 5's regression) ✅
- R8-G4 (HANDOFF truthfulness — 7 sections rewritten, round 6 added 16 R8 evidence files, 4 new closure rows) ✅
- F-P1-1 (no-useless-escape @ builder:237) ✅
- F-P1-2 (no-unsafe-finally @ aff03:1389) ✅

## 6. Carry-forward rule

Tier 3 round 4 (PASS at `f27afe0`) and round 5 (CONDITIONAL PASS) verdicts remain valid as historical records. This round 6 verdict supersedes both on the closure of R8 + R8-P1-fix finding groups. Tier 0 may now authorize the commit of R8 + R8-P1-fix as a single commit (or as two commits if T0 prefers to keep R8 and the P1-fix separate). The new commit SHA would become the official Implementation SHA replacing `2f5d570`.

## 7. Files reviewed

- `docs/tasks/hrp-v6-n2-aff-05a-r1-canonical-initial-handling/HANDOFF.md` (H-07 = 22 referenced evidence files; all sections 0–7 updated for R8-P1-fix)
- `docs/tasks/hrp-v6-n2-aff-05a-r1-canonical-initial-handling/TASK.md` (allowlist 11 files — no change from round 5)
- `docs/tasks/hrp-v6-n2-aff-05a-r1-canonical-initial-handling/evidence/{guards-p1,ac04-lock-timeout-p1,ac06-backfill-p1,ac07-rollback-p1,ci-integration-run-p1-1,ci-integration-run-p1-2,posture-assertion-p1,staging-build-p1}.txt` (8 new R8-P1-fix evidence files)
- `docs/tasks/hrp-v6-n2-aff-05a-r1-canonical-initial-handling/evidence/{guards-r8,ac04-lock-timeout,ac06-backfill,ac07-rollback,ci-integration,ci-integration-run1,ci-integration-run2,posture-assertion-r8,staging-build-r8}.txt` (8 R8 base evidence files)
- `scripts/ci/build-predecessor-staging.mjs:237` (F-P1-1 source fix: `[^\/]` → `[^/]`)
- `tests/db/aff03-public-intake.integration.test.ts:1331-1400` (F-P1-2 source fix: `let innerErr: unknown` capture pattern)
- `scripts/ci/{prepare-migration-test-db,validate-guards,assert-test-db-posture,integration-preflight,apply-r1-migration,verify-ac06-backfill,verify-ac07-rollback}.mjs` (R8 source, unchanged in R8-P1-fix)
- `prisma/migrations/20260922160000_aff05a_r1_initial_handling_window/migration.sql` (R8 +12-line SET LOCAL placement, unchanged in R8-P1-fix)
- `.gitignore` (R8 hygiene additions, unchanged in R8-P1-fix)
- `AUDIT-tier3-round4.md` (preserved as untracked)
- `AUDIT-tier3-round5-r8.md` (preserved as untracked)

## 8. Audit conclusion

**Tier 3 LIGHT round 6 verdict: PASS** — R8 + R8-P1-fix both closed; 16 R8 evidence files all clean UTF-8 LF-only no-BOM; all gates green; no production credentials or data used; no commit/push/PR/merge performed by Tier 3.

**Recommendation to T0**:
- T0 may now authorize the commit of R8 + R8-P1-fix as a single Implementation SHA or as two separate commits (R8 first, then R8-P1-fix as a separate `docs(...)` or `fix(...)` commit).
- T0 should update the HANDOFF.md §0 Control row to fill in the new Implementation SHA(s) and update the Status field to reflect R8 + R8-P1-fix PASS.
- After T0 commits, T3 may open an audit round 7 on the committed SHA(s) to confirm the freeze artifact matches the working-tree content (or, at T0's discretion, this round 6 PASS at the working tree may be considered final since T0's commit is a freeze-only operation with no semantic change).

No production credentials or data used. No commit/push/PR/merge performed by Tier 3.
