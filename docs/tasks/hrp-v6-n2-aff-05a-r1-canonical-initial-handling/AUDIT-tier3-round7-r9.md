# AUDIT — hrp-v6-n2-aff-05a-r1-canonical-initial-handling (round 7 / R9)

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
| R8 + R9 working-tree SHA | NOT YET COMMITTED — both rounds remain dirty/uncommitted per T0 directive ("chưa commit/push/PR"). Working tree carries R8 + R9 content as deliverable for T0 review. |
| Previous T3 verdicts | round 4 PASS at `f27afe0`; round 5 CONDITIONAL PASS (P1 regressions); round 6 PASS (R8-P1-fix) |
| Audit delta (round 7) | R9 on top of R8 + R8-P1-fix; closes T0 round-9 finding (caller bypass of collision guard) |
| Verdict | **CONDITIONAL PASS** — R9 code changes (fail-closed predecessor check, collision-test mode) verified; `ac07-collision-test.txt` is STALE (credential error at 07:13Z) — authoritative evidence is `guards-r9.txt` (07:04Z, 32 PASS including collision-test PASS); T0 must address stale evidence before T3 freeze |

## 1. Round 7 (R9) audit summary

This is a Tier 3 LIGHT delta audit on top of round 6 (R8-P1-fix PASS). The R9 round addresses the T0 round-9 finding: the AC entrypoints (`verify-ac06-backfill.mjs`, `verify-ac07-rollback.mjs`, and the lock-timeout mode in AC-07) each had a STEP 0 block that ran `DROP DATABASE IF EXISTS aff05a_r1_predecessor WITH (FORCE)`, silently bypassing the builder's own pre-DROP collision guard. R9 removes all three auto-DROP blocks and replaces them with a fail-closed existence check.

### 1.1 R9 finding interpretation

The T0 R9 finding was about the **predecessor DB auto-DROP**, not the target-DB drop. The distinction:
- **Predecessor DB** (`aff05a_r1_predecessor`): built by `build-predecessor-staging.mjs` and owned by the operator; another run may be connected to it. Auto-DROP here would bypass the builder's collision guard and forcibly terminate other runs' connections.
- **Target DB** (`aff05a_r1_migration_test` / `aff05a_r1_test`): the AC's own synthetic DB, created and owned by the AC script. Dropping it before rename is part of the AC's own lifecycle — acceptable because `WITH (FORCE)` only terminates connections that this script itself opened.

HANDOFF §7 row 4 (R9) explicitly confirms this interpretation: the drop-target path still uses `WITH (FORCE)`, which is correct.

### 1.2 R9 code changes verified at source

| Location | Before (R8) | After (R9) | Status |
|---|---|---|---|
| `verify-ac06-backfill.mjs` STEP 0 | `DROP DATABASE IF EXISTS aff05a_r1_predecessor WITH (FORCE)` | `SELECT 1 FROM pg_database WHERE datname = $1` → exits 3 `PREDECESSOR_DB_EXISTS` | ✅ Closed |
| `verify-ac07-rollback.mjs` default STEP 0 | same auto-DROP | same fail-closed check | ✅ Closed |
| `verify-ac07-rollback.mjs` lock-timeout Step A.0 | same auto-DROP | same fail-closed check | ✅ Closed |
| `WITH (FORCE)` occurrences | multiple (predecessor + target) | only target-DB paths (line 264 in AC-06, line 284/510 in AC-07) | ✅ Correct scope |
| `pg_terminate_backend` | only in collision-test teardown (lines 676, 812) | same; teardown-only | ✅ Correct scope |

### 1.3 R9 collision-test negative proof

`verify-ac07-rollback.mjs` now has a `--collision-test` mode that:
1. Cleans up any stale predecessor DB (collision-test setup)
2. Builds predecessor via `build-predecessor-staging.mjs`
3. Inserts sentinel row
4. Holds live connection on predecessor DB
5. Invokes the AC-07 entrypoint via subprocess with predecessor already existing
6. Asserts: exit 3 + `PREDECESSOR_DB_EXISTS` + DB intact + sentinel intact + held connection still alive

Validator `validate-guards.mjs` covers this as a positive proof (lines 278–301).

## 2. Critical P2 finding: stale evidence file

### 2.1 F-P2-1: `ac07-collision-test.txt` is stale — overwritten by credential-less re-run

**Severity**: P2 — stale evidence claim; authoritative proof lives in `guards-r9.txt`

**Evidence timeline**:
- `guards-r9.txt`: captured at `2026-09-23T07:04:29.598Z` with credentials set (`.env-prepare*` present)
  - Lines 32–33: `PASS=[--collision-test verify-ac07-rollback.mjs] exit=0 — predecessor exists + connection: entrypoint refused, DB intact` + `PASS=[--collision-test DB integrity] predecessor DB intact after collision test`
  - `VALIDATE_GUARDS_RESULT=PASS — guards truly non-mutating, exit codes exact` (32 PASS assertions)
- `ac07-collision-test.txt`: captured at `2026-09-23T07:13:44.680Z` (9 minutes after `guards-r9.txt`)
  - `MODE=collision-test`
  - `FATAL error: password authentication failed for user "postgres"` at STEP 0 (credential cleanup step)
  - No `AC-07 collision-test PASS` marker
  - Exit: 1 (error, not 0)

**Root cause**: The collision-test mode's STEP 0 cleans up any stale predecessor DB using `pg_terminate_backend` via `ADMIN_URL` (postgres superuser). When the validator re-ran the collision test without `DATABASE_URL_ADMIN_TEST` in the environment, `ADMIN_URL` was empty, causing `new URL('')` to throw or the connection to fail with authentication error. The evidence file was overwritten.

**Authoritative evidence**: `guards-r9.txt` (07:04Z, with credentials) proves the collision test PASSES when credentials are set. The authoritative collision-test proof is captured inside `guards-r9.txt`, not in `ac07-collision-test.txt`.

**HANDOFF §3 and §7 claim**: "Evidence: `evidence/ac07-collision-test.txt`" — this file is now stale. The authoritative evidence is in `guards-r9.txt` (or a re-capture of `ac07-collision-test.txt` with credentials set).

**Fix needed**: Either:
1. **Re-run the collision test with credentials** and overwrite the stale `ac07-collision-test.txt` with a fresh capture showing `AC-07 collision-test PASS`, OR
2. **Update the HANDOFF** to reference `guards-r9.txt` (lines 32–33) as the authoritative collision-test evidence instead of `ac07-collision-test.txt`

HANDOFF §7 R9 closure row 3 already has a note about the drop-target interpretation, which confirms the T0 finding interpretation. But the stale evidence file must be resolved before T3 freeze.

## 3. Gate re-run at working tree (R9)

| Gate | Command | Result |
|---|---|---|
| `git diff --check` | (all tracked) | exit 0 (clean) |
| `npx tsc --noEmit` | typecheck | exit 0 |
| `npm run lint` | lint | **exit 0 (0 errors, 672 warnings)** — same as R8-P1-fix |
| `verify-task.ps1` | TASK contract | DRAFT-VALID (2 non-blocking warnings, same as before) |
| `verify-handoff.ps1` | HANDOFF substance | **PASS** (all 14 OK, 0 warnings — H-07 reports 24 evidence files) |
| `npx prisma validate` | schema (with DATABASE_URL + DATABASE_URL_ADMIN set) | exit 0 — schema valid |
| `validate-guards.mjs` (credentialed run) | R9 re-run with credentials | `VALIDATE_GUARDS_RESULT=PASS` — 32 PASS (including collision-test PASS at 07:04Z) |

Note: a local credential-less re-run of the validator produces `VALIDATE_GUARDS_RESULT=FAIL` (collision-test exit 1, credential error), but the authoritative run at 07:04Z was credentialed and produced 32 PASS.

## 4. Verdict

**Verdict: CONDITIONAL PASS** — Tier 3 LIGHT round 7 (R9)

R9 code changes verified correct at source:
- Three auto-DROP blocks REMOVED (AC-06 STEP 0, AC-07 default STEP 0, AC-07 lock-timeout Step A.0) ✅
- Fail-closed predecessor existence check added with `SELECT 1 FROM pg_database WHERE datname = $1` ✅
- `WITH (FORCE)` retained only in target-DB drop paths ✅
- `pg_terminate_backend` only in collision-test teardown (not in the main entrypoint path) ✅
- `--collision-test` mode provides end-to-end negative proof ✅
- Validator covers collision-test as positive proof (32 PASS) ✅
- Drop-target interpretation confirmed: target DB is AC-owned, dropping before rename is acceptable ✅
- `npm run lint` → 0 errors, 672 warnings (no new lint errors introduced by R9) ✅
- All 24 evidence files referenced in HANDOFF H-07 exist ✅

**F-P2-1 (P2 — stale evidence file)**: `ac07-collision-test.txt` is stale (credential error at 07:13Z), but authoritative collision-test proof is in `guards-r9.txt` (32 PASS at 07:04Z). T0 must resolve stale evidence before T3 freeze.

## 5. Tier 1 / T0 follow-up (before T3 freeze)

### F-P2-1 fix

T0 or Tier 1 must either:
1. Re-run `--collision-test` with credentials set (`DATABASE_URL_ADMIN_TEST` pointing to a postgres-superuser connection) and overwrite `ac07-collision-test.txt` with a clean capture showing `AC-07 collision-test PASS`, OR
2. Update HANDOFF §3 (E-21 row) and §7 (R9 row 3) to reference `guards-r9.txt` as the authoritative collision-test evidence instead of `ac07-collision-test.txt`.

After fix, re-run `validate-guards.mjs` to confirm `VALIDATE_GUARDS_RESULT=PASS` with the refreshed evidence.

## 6. Carry-forward rule

Tier 3 round 6 verdict (R8-P1-fix PASS) remains valid. This round 7 verdict supersedes round 6 on the R9 finding group. Tier 0 may now authorize T3 to perform a final round 8 audit on the committed R8 + R9 SHA, or at T0's discretion, this round 7 CONDITIONAL PASS at the working tree may be considered sufficient if F-P2-1 is resolved.

## 7. Files reviewed

- `docs/tasks/hrp-v6-n2-aff-05a-r1-canonical-initial-handling/HANDOFF.md` (R9 sections 0–7 updated; H-07 = 24 evidence files)
- `docs/tasks/hrp-v6-n2-aff-05a-r1-canonical-initial-handling/TASK.md` (no R9 changes)
- `scripts/ci/verify-ac06-backfill.mjs` (STEP 0 changed from auto-DROP to fail-closed check; target-DB drop retained)
- `scripts/ci/verify-ac07-rollback.mjs` (STEP 0 + Step A.0 changed; new `--collision-test` mode; target-DB drop retained)
- `scripts/ci/validate-guards.mjs` (collision-test positive proof added; 32 PASS total)
- `scripts/ci/{build-predecessor-staging,prepare-migration-test-db,assert-test-db-posture,integration-preflight,apply-r1-migration}.mjs` (R8 source, unchanged in R9)
- `prisma/migrations/20260922160000_aff05a_r1_initial_handling_window/migration.sql` (R8 +12-line SET LOCAL, unchanged)
- `tests/db/aff03-public-intake.integration.test.ts` (R8 + R8-P1-fix, unchanged)
- `docs/tasks/.../evidence/guards-r9.txt` (32 PASS; authoritative collision-test proof)
- `docs/tasks/.../evidence/ac07-collision-test.txt` (STALE — credential error; authoritative proof is in guards-r9.txt)
- `docs/tasks/.../evidence/{ac04-lock-timeout,ac06-backfill,ac07-rollback}-p1.txt` (R8-P1-fix)
- `docs/tasks/.../evidence/{ci-integration-run-p1-1,ci-integration-run-p1-2}.txt` (R8-P1-fix)
- `AUDIT-tier3-round4.md`, `AUDIT-tier3-round5-r8.md`, `AUDIT-tier3-round6-r8-p1-fix.md` (preserved as untracked)

## 8. Audit conclusion

**Tier 3 LIGHT round 7 verdict: CONDITIONAL PASS** — R9 code changes correct; `npm run lint` 0 errors; validator 32 PASS (credentialed run at 07:04Z); `ac07-collision-test.txt` is stale (credential error); authoritative collision-test proof is in `guards-r9.txt`. F-P2-1 must be resolved before T3 freeze.

**Recommendation to T0**:
1. Resolve F-P2-1 (stale evidence): re-run collision test with credentials or update HANDOFF to reference `guards-r9.txt`
2. Re-run `validate-guards.mjs` to confirm `VALIDATE_GUARDS_RESULT=PASS` with fresh evidence
3. T0 commits R8 + R9 as a single Implementation SHA (or two commits at T0's discretion)
4. After commit, T3 may open audit round 8 to confirm freeze artifact matches working tree

No production credentials or data used. No commit/push/PR/merge performed by Tier 3.
