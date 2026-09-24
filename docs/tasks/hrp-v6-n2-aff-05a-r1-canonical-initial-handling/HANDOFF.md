# HANDOFF — hrp-v6-n2-aff-05a-r1-canonical-initial-handling

## 0. Control

| Field | Value |
|---|---|
| Task | `hrp-v6-n2-aff-05a-r1-canonical-initial-handling` |
| Spec version | `v1.4` |
| Assurance lane | `CRITICAL` |
| Audit mode | `LIGHT` |
| Execution round | `11` — Owner requested T0 to execute the narrow T1B correction directly |
| Baseline (git ref the predecessor is built from) | `e4d21807f0d972de447e710066b40c77a661fb17` |
| Implementation SHA — content as delivered (T0 explicitly cited as "commit cũ") | `2f5d5702e1169bd2202db932c37c58f05422fcbc` |
| R6 + R7 status (older rounds, never accepted) | R6 was rejected by T0; R7 was rejected by T0. R6's HANDOFF edits were rolled into R7; R7's were rolled into R8. No separate R6/R7 freeze commit was made because neither round reached an accepted gate. |
| Current implementation SHA | `b5e62e6abec401d71578766ca6ded29e13da9137` — cumulative R5–R11 freeze, distinct from historical delivery SHA above |
| Status | `ACCEPTED` — PR #33 squash-merged and production verified. |

Current freeze authority: `FREEZE-R11.md`. Historical dirty-state descriptions below refer to their original delivery rounds; this metadata follow-up does not rewrite the audited snapshot or earlier audit conclusions.

> T0 R8 directive (verbatim intent): *"Chỉ sửa bốn nhóm dưới đây, không mở lại business logic production ... Bàn giao dirty diff cho T0 review một lượt; sau khi sạch mới chốt commit và yêu cầu T3 audit delta."* This HANDOFF now reflects R8's corrections and the dirty diff is the deliverable for T0 review.

> T0 R7 directive still applies: *"implementation commit cũ là 2f5d5702e1169bd2202db932c37c58f05422fcbc; R6 đang dirty/uncommitted, chưa có implementation SHA mới. Bỏ claim 'unchanged across rounds' và mọi PASS không khớp artifact."* The implementation SHA `2f5d570` is the **historical delivery** SHA. R8 introduces further in-flight content (no freeze commit yet) which is the working tree visible to the auditor.

> R8-G4 fact: the **admin role is the postgres superuser** (posture: `user=postgres session=postgres super=true bypassrls=true`). This is the `DATABASE_URL_ADMIN_TEST` posture, separate from the writer. The writer remains correctly `app_user_writer` (`super=false bypassrls=false`). T0's R8 directive noted that "Admin không superuser — mâu thuẫn với posture artifact" was true at the R7 wording — that R7 wording is removed in R8; the correct posture is admin-as-superuser, writer-as-non-super.

> R5 superuser baseline is **NOT** a security comparison. Per T0 R6-G4: "Baseline cũ bằng superuser phải ghi rõ invalid cho security comparison; nếu cần đối chứng, chạy lại cùng posture đúng." R5's superuser-baseline capture is retained only as historical evidence. The admin being a superuser is an artifact of the synthetic-DB env (we need CREATE DATABASE privileges); the writer is still bound by RLS on the actual integration test path.

## 1. Outcome and changed surface

### R11 current delivery

R11 is a synthetic CI-helper correction only. It does not change the R10 migration, application tests, schema, production runtime, CRM contracts or any audit artifact. R11 evidence takes precedence for the helper lifecycle; R8 application-suite results below are historical carry-forward, not rerun claims.

- All three AC entrypoints check both predecessor and target before invoking the builder; existing names reject with exact exit 3. Rename still fails on a later collision; no delete/retry.
- AC/builder fixture mode accepts only `aff05a_r1_collision_<8 lowercase hex>_pred` or `_tgt`, in addition to the explicit canonical synthetic allowlist. Both names are checked; legacy bypass env overrides reject. Loopback host remains mandatory.
- Builder creates atomically, with no DROP-before-CREATE path.
- Collision runner creates only its unique empty fixture, records its OID, seeds a sentinel and holds its own connection. Each of six real entrypoint invocations preserves the full DB catalog, sentinel and connection. No builder or migration is needed to prove a preflight refusal.
- Outer try/finally covers all acquired fixture/client resources; cleanup verifies ownership and fails loudly on error. Injected failure returns exit 1 and proves fixture removal. No shared/default predecessor cleanup, FORCE or connection termination.
- Validator remains non-DB. Collision subprocess evidence is isolated under task-local ignored evidence-tmp, never overwrites AC proofs.

### Historical R8–R10 delivery notes (not current closure authority)

R8 closes the T0 round-8 finding groups in scope:
- **R8-G1 (close dangerous flag path)**: `prepare-migration-test-db.mjs` now EXPLICITLY REJECTS `--validate-guards` and unknown flags BEFORE any connection, env-var resolution, or mutation (CLI flag allowlist enforced at module-init time). Negative tests added in `scripts/ci/validate-guards.mjs` cover both the legacy flag and any unknown flag.
- **R8-G2 (collision guard position)**: Source/target collision check moved BEFORE any DROP/CREATE in `build-predecessor-staging.mjs` and `prepare-migration-test-db.mjs` — a marker printed AFTER DROP cannot prove the destructive branch never ran. AC-06/07 also reject `MIGRATION_TARGET_DB == aff05a_r1_predecessor` BEFORE calling the builder (configuration-collision check at module-init time). Regression tests added in the validator.
- **R8-G3a (pin `migration_lock.toml`)**: `build-predecessor-staging.mjs` now READS `prisma/migrations/migration_lock.toml` from the pinned Git baseline (`e4d21807f0d9...`, blob `fbffa92c2bb7c748d6fc78f9f9dcac604dabb87d`). The working-tree and default-string fallbacks are REMOVED. If the file is missing at baseline, the build throws (no silent default).
- **R8-G3b (fix `pcRows` SELECT + child→parent order)**: `tests/db/aff03-public-intake.integration.test.ts` now uses `$queryRawUnsafe` (NOT `$executeRawUnsafe`) for the placement_case id query, so the `Array.isArray(pcRows) && pcRows.length > 0` branch actually fires. Cleanup order is now strictly child→parent: `labor_profile_intakes` → `labor_profile_handling_assignments` → `candidate_submissions` (by LP and by pcId) → `placement_case` → `labor_profiles`.
- **R8-G3c (predicate-based teardown, no swallowed errors)**: `tests/db/aff03-public-intake.integration.test.ts` AFF-05A-R1 `afterAll` and line 1366 (hrp_ra_update_writer) now use a structured preservation pattern: query `referral_attribution` count before attempting `labor_profiles` DELETE; if bound, log + preserve. ANY unexpected error propagates and fails the test loudly via a `throw new Error(...)` in the outer `catch`. The previous `.catch(() => {})` swallow is REMOVED. The AFF-03B `afterAll` block was already predicate-based in R7; the AFF-05A teardown was the only swap.
- **R8-G4 (HANDOFF truthfulness)**: Removed the `staging-build-r7.txt (adjacent)` claim for `prisma validate` (it is not adjacent evidence — `prisma validate` is in `evidence/staging-build-r7.txt` only by name coincidence, not as the schema-validate evidence). Restated "collision check before DROP" claim correctly. Restated "Admin not superuser" by aligning with the posture artifact. Mentioned that two-run proof has separate artifacts (`ci-integration-run1.txt` + `ci-integration-run2.txt`; `ci-integration.txt` is the canonical name matching the basename of the two runs). Listed the 8 new R8 canonical logs vs the older logs that may still have encoding/FAIL issues.
- **R8-P1-fix (post-Tier-3 round-5)**: Tier 3 round 5 reported two **P1 lint regressions** in the R8 working tree; both fixed in this round, BEFORE T0 commits R8. F-P1-1: `scripts/ci/build-predecessor-staging.mjs:237` — `no-useless-escape`; the regex literal contained `/[^\/]/` where `/` does not need escaping inside a character class. Replaced with `/[^/]/`. F-P1-2: `tests/db/aff03-public-intake.integration.test.ts:1389` — `no-unsafe-finally`; `throw new Error(...)` was inside an outer `finally` block, which would silently swallow the original error if the inner `try` raised. Restructured the `hrp_ra_update_writer` cleanup to use a `let innerErr: unknown` capture pattern: inner try wraps the test body, outer try wraps the cleanup, and the cleanup is gated by `if (innerErr === undefined)`; on cleanup failure the new throw is raised; if the test itself failed, the original error is rethrown at the end. AFF-05A afterAll was already predicate-based + try/catch rethrow in R8, no change needed. `npm run lint` now exits 0 (15 pre-existing `no-unused-vars` and "Unused eslint-disable directive" warnings remain — baseline noise, not errors). `npm run test:integration` re-run 2x reports `445 passed | 2 skipped | 0 failed | Test Files 23 passed | EXIT_CODE=0` in both runs (identical totals, captured separately).
- **R10 SUPERSEDED / NOT ACCEPTED:** the report claimed ownership-safe cleanup, but source still dropped the default predecessor, bypassed DB-name guards, lacked an outer cleanup finally and checked target too late. R11 closes these findings; R10 logs remain historical, not acceptance evidence.
- No commit/push/PR; no Tier 3 call. R11 awaits freeze review; prior audit verdicts are not automatically inherited.

## 2. Acceptance evidence (R8 application-suite carry-forward; R11 helper evidence in section 3)

> **Contract gate** (must be the first data row in this table): the `verify-task.ps1` row records the TASK contract self-verify result. Tier 3 check C-09 re-runs that gate before audit.

| AC | Evidence | Result | Limitation |
|---|---|---|---|
| — | `pwsh .ai-pipeline/scripts/verify-task.ps1 -TaskPath docs/tasks/hrp-v6-n2-aff-05a-r1-canonical-initial-handling/TASK.md` | `RESULT: PASS (DRAFT-VALID)` | None — R8 contract verify against TASK §4.2 allowlist. |
| AC-01 | T0 production preflight (pending T0 execution) | `PENDING T0 PRODUCTION PREFLIGHT` | None — T0's gate, not synthetic |
| AC-02 | `npm run test:integration` (R8 capture, two runs, re-run after P1 lint fixes) | R8 P1-fix capture: `Test Files 23 passed (23); Tests 445 passed | 2 skipped (447); Duration ~17-19s; exit 0` (`evidence/ci-integration-run-p1-1.txt`, `evidence/ci-integration-run-p1-2.txt`, both reproducing the same totals independently after the P1 fixes). The R8 baseline-of-record runs `ci-integration.txt` + `ci-integration-run1.txt` (identical) + `ci-integration-run2.txt` (slightly different size due to vitest internals) are retained for the original R8 close. | Same skip-set as AC-03. |
| AC-03 | `npm run test:integration` (R8 capture, two runs, re-run after P1 lint fixes) | R8 P1-fix capture: same totals as AC-02 across two independent runs after P1 fixes. | Same skip-set as above. |
| AC-04 (lock-timeout, R8 re-run after builder collision-guard move) | `node scripts/ci/verify-ac07-rollback.mjs --lock-timeout` | `evidence/ac04-lock-timeout.txt`: AC-04 lock_timeout PASS. `MIGRATION_ELAPSED_MS=5347`. Lock triggered `canceling statement due to lock timeout`. Step D-prime rollback-proof gate passes. Step E sanity reapply succeeds. R8: `MIGRATION_LOCK_TOML_SOURCE=pinned_baseline=e4d21807f0d9 blob=fbffa92c2bb7c748d6fc78f9f9dcac604dabb87d`; `TARGET_DB_COLLISION_CHECK=pass (pre-DROP, db-not-exists)` (collision check now BEFORE the destructive DROP). | None |
| AC-05 | `npm run test:integration` (baseline DB) | 2 R1-block tests FAIL on baseline (R1 not applied), 0 skipped. | Expected — confirms R1 fixes the gap. |
| AC-06 (R8 re-run) | `node scripts/ci/verify-ac06-backfill.mjs` | `evidence/ac06-backfill.txt`: AC-06 PASS — full assertion list (REVOKED preserved, ACTIVE→EXPIRED after deadline, future ACTIVE preserved, terminal EXPIRED deadline from starts_at, non-AFF MANAGER untouched, no AFF_INITIAL NULL-deadline rows). R8: same builder invariants; STEP 0 drops any leftover `aff05a_r1_predecessor` BEFORE the builder; collision guard runs pre-DROP. | None |
| AC-07 (R8 re-run) | `node scripts/ci/verify-ac07-rollback.mjs` | `evidence/ac07-rollback.txt`: AC-07 PASS — forced anomaly triggers full transaction rollback. Function body unchanged at predecessor baseline (no R1 marker, no advisory lock). `hrp_public_rpc` retains INSERT-only on handling. Anomaly row preserved. R8: same builder invariants; STEP 0 + collision guard; `writeEvidence()` helper makes the final writeFileSync safe under shell redirection (Windows EBUSY). | None |
| AC-08 | `npm run test:integration` (candidate DB) + canonical gates (R8) | `445 passed, 0 failed, 2 skipped (pre-existing ops06a)` (two R8 runs reproducible). Canonical gates: `npx prisma validate` exit 0 (no adjacent claim — `staging-build-r8.txt` records the staging build only; `prisma validate` itself is run inline and exits 0 as part of the staging prep); `npx tsc --noEmit` exit 0; validation guards RUN: `VALIDATE_GUARDS_RESULT=PASS` across 5 scripts and 22 PASS assertions (`evidence/guards-r8.txt`: 11 negative + 6 probe + 4 R8-G1/G2 + 1 evidence-integrity — including the new `--validate-guards` rejected, unknown-flag rejected, AC-06/07 target==predecessor rejected). The two skipped tests pre-existed at the R4 freeze commit `2f5d570` (baseline `aff05a_r1_baseline_test` DB, `CI_INTEGRATION_STRICT=1 npm run test:integration`); same command reproduces them there. They live in `live-integration.ops06a.test.ts` (Redis-upstream env guards); NOT a regression introduced by this task. | None — R8 does not reduce assertions or add skips. R8 closes the four T0 round-8 finding groups (G1, G2, G3a/b/c, G4). |

## 3. Evidence registry (R8 — strict UTF-8 no-BOM, LF-only, no mojibake)

### R11 current evidence

All new results are under `evidence/r11/`, captured with explicit UTF-8 decoding, LF and no BOM. PostgreSQL 18.6 was initialized in a new temporary directory on loopback port 16439, with synthetic trust-auth test roles only. No external credential file was loaded. Reproduction: set `HRP_R11_PG_PORT` to a NEW dedicated loopback cluster, then run `node docs/tasks/hrp-v6-n2-aff-05a-r1-canonical-initial-handling/evidence/r11/run-gates.mjs`. The harness refuses existing AFF test databases; it never resets them.

| ID | Command | Exit | Artifact | Notes |
|---|---|---|---|---|
| R11-guard | `node scripts/ci/validate-guards.mjs` | 0 | `evidence/r11/guards-r11.txt` | 46 PASS records, no DB connection or AC evidence change |
| R11-collision-pred | `node scripts/ci/verify-collision-integration.mjs --predecessor-exists` | 0 | `evidence/r11/collision-predecessor-exists.txt` | 3 entrypoints; exact exit 3; DB catalog/sentinel/connection intact |
| R11-collision-target | `node scripts/ci/verify-collision-integration.mjs --target-exists` | 0 | `evidence/r11/collision-target-exists.txt` | 3 entrypoints; rejects before builder; catalog intact |
| R11-cleanup | `node scripts/ci/verify-collision-integration.mjs --target-exists --inject-failure` | 1 expected | `evidence/r11/cleanup-injected-failure.txt` | Injected failure, OWNED_FIXTURE_CLEANUP=PASS, command correctly remains FAIL |
| R11-AC06 | `node scripts/ci/verify-ac06-backfill.mjs` | 0 | `evidence/r11/ac06-run.txt` | Actual predecessor chain + migration; REVOKED/backfill assertions PASS |
| R11-AC07 | `node scripts/ci/verify-ac07-rollback.mjs` | 0 | `evidence/r11/ac07-run.txt` | Anomaly abort, full function/grant/data rollback PASS |
| R11-AC04 | `node scripts/ci/verify-ac07-rollback.mjs --lock-timeout` | 0 | `evidence/r11/ac04-run.txt` | Bounded lock failure, rollback assertions and sanity reapply PASS |
| R11-lint | `npm run lint` | 0 | `evidence/r11/lint-r11.txt` | No lint errors; warning output retained verbatim |
| R11-diff | `git diff --check` | 0 | `evidence/r11/diff-check.txt` | Clean |

Node version, exact commands and exits: `evidence/r11/results.json`. Full unit/integration/build not rerun in R11: no application/migration changes in this delta. Prior R8 results do not replace final CI on the eventual frozen commit.

### Historical captures below

These describe their original rounds only. In particular, R9/R10 collision and allowlist safety claims were rejected; their logs are not R11 gate evidence.

The 8 new R8 canonical logs are:

1. `evidence/guards-r8.txt` — validator result (`VALIDATE_GUARDS_RESULT=PASS` over 22 assertions).
2. `evidence/ac04-lock-timeout.txt` — AC-04 re-run.
3. `evidence/ac06-backfill.txt` — AC-06 re-run.
4. `evidence/ac07-rollback.txt` — AC-07 re-run.
5. `evidence/ci-integration-run1.txt` and `evidence/ci-integration-run2.txt` — two-run integration proof (`evidence/ci-integration.txt` is the canonical-name copy of run1).
6. `evidence/posture-assertion-r8.txt` — writer/admin posture.
7. `evidence/staging-build-r8.txt` — staging build via the builder, including `MIGRATION_LOCK_TOML_SOURCE=pinned_baseline=...` and `TARGET_DB_COLLISION_CHECK=pass (pre-DROP, db-not-exists)`.

The 8 R8-P1-fix re-captures (after the Tier-3 round-5 P1 lint regressions were fixed) are:
1. `evidence/guards-p1.txt` — re-run validator (re-captured; counts unchanged).
2. `evidence/ac04-lock-timeout-p1.txt` — AC-04 re-run.
3. `evidence/ac06-backfill-p1.txt` — AC-06 re-run.
4. `evidence/ac07-rollback-p1.txt` — AC-07 re-run.
5. `evidence/ci-integration-run-p1-1.txt` and `evidence/ci-integration-run-p1-2.txt` — two-run integration proof re-run after P1 fixes.
6. `evidence/posture-assertion-p1.txt` — writer/admin posture.
7. `evidence/staging-build-p1.txt` — staging build via the builder, post-fix `[^/]` regex.

Older logs in `evidence/` (`baseline-integration.txt`, `candidate-integration.txt`, `baseline-metadata.txt`, `candidate-metadata.txt`, `guards.txt`, `unit-tests.txt`, `guards-r5.txt`, `guards-r7.txt`, `staging-build-r7.txt`, `staging-build.txt`, `posture-assertion-r7.txt`, `posture-assertion.txt`, `unit-r7.txt`, `AUDIT-tier3-round4.md`) may carry encoding artefacts (BOM, CRLF, mojibake markers) from R5/R6/R7 captures; R8 does NOT claim them clean. Per-file UTF-8 hygiene applies to the 16 R8 canonical logs (8 base + 8 P1-fix) only.

R8 evidence capture methodology: helper scripts (`verify-ac06`, `verify-ac07`, `verify-ac07 --lock-timeout`) write evidence via `writeEvidence()` helper that normalizes CRLF → LF and strips trailing whitespace before `writeFileSync`. Integration and posture captures use the Node `spawnSync`-based capture wrapper (`_cap.mjs`, removed from working tree after use) which encodes as UTF-8 no-BOM, LF-only, and records `cmd / env_file / cwd / started_at / elapsed_ms / exit_code / signal / EXIT_CODE`. Byte-level check: `first3 != EF-BB-BF`, `CRLF=0` for every R8 file.

The 5 R10 canonical logs (R10 re-runs; not overwriting R8 evidence):
1. `evidence/guards-r10.txt` — validator result (`VALIDATE_GUARDS_RESULT=PASS` over 26 assertions).
2. `evidence/ac04-lock-timeout.txt` — AC-04 re-run (R10).
3. `evidence/ac06-backfill.txt` — AC-06 re-run (R10).
4. `evidence/ac07-rollback.txt` — AC-07 re-run (R10).
5. `evidence/collision-predecessor-exists-integration.txt` — `--predecessor-exists` negative proof (3 entrypoints × {exit, marker, refusal language} + fixture/sentinel/connection integrity = 12 assertions).
6. `evidence/collision-target-exists-integration.txt` — `--target-exists` negative proof (same assertions).

R10 evidence capture methodology: same `_cap.mjs` UTF-8 no-BOM, LF-only wrapper, removed from working tree after use. The collision-integration runner has its own internal UTF-8 LF normalization (`log()` function) and writes evidence via `writeEvidence()`-equivalent fallback for Windows EBUSY.

| ID | Command | Exit | Artifact | Notes |
|---|---|---|---|---|
| E-04-lock | `node scripts/ci/verify-ac07-rollback.mjs --lock-timeout` | 0 | `evidence/ac04-lock-timeout.txt` | R8: AC-04 lock_timeout PASS; builder invariants now pre-DROP collision check + pinned baseline lock toml. |
| E-06 | `node scripts/ci/verify-ac06-backfill.mjs` | 0 | `evidence/ac06-backfill.txt` | R8: AC-06 PASS; STEP 0 drops leftover predecessor DB first; collision guard pre-DROP. |
| E-07 | `node scripts/ci/verify-ac07-rollback.mjs` | 0 | `evidence/ac07-rollback.txt` | R8: AC-07 PASS; same STEP 0 + collision guard. |
| E-01 (canonical integration, run 1) | `npm run test:integration` | 0 | `evidence/ci-integration-run1.txt`, copy at `evidence/ci-integration.txt` | R8 run 1: 445 passed, 2 skipped, 0 failed, 23 files. |
| E-01b (canonical integration, run 2) | `npm run test:integration` | 0 | `evidence/ci-integration-run2.txt` | R8 run 2: identical totals (two-run proof). |
| E-03 | `npx tsc --noEmit` | 0 | inline | R8: no type errors. |
| E-06-prisma | `npx prisma validate` | 0 | inline (R8 removes the prior `staging-build-r7.txt (adjacent)` claim — `staging-build-r7.txt` is staging evidence, not `prisma validate` evidence). | R8: schema valid. |
| E-08-guard | `node scripts/ci/validate-guards.mjs` | 0 | `evidence/guards-r8.txt` | R8: 22 PASS (negative target/host/source==target + 4 R8-G1/G2-specific: `--validate-guards` rejected, unknown-flag rejected, AC-06/07 target==predecessor rejected + 6 probe positives + evidence-integrity). |
| E-09-posture | `node scripts/ci/assert-test-db-posture.mjs` | 0 | `evidence/posture-assertion-r8.txt` | R8: writer=app_user_writer (super=false, bypassrls=false); admin=postgres (super=true, bypassrls=true). Note: admin is the synthetic-DB superuser (needed for CREATE DATABASE); writer remains non-super. The historical R7 wording "admin is not superuser" was incorrect and is REMOVED. |
| E-10-staging | `node scripts/ci/build-predecessor-staging.mjs` | 0 | `evidence/staging-build-r8.txt` | R8: tmpdir created + removed; `MIGRATION_LOCK_TOML_SOURCE=pinned_baseline=e4d21807f0d9 blob=fbffa92c2bb7c748d6fc78f9f9dcac604dabb87d`; `TARGET_DB_COLLISION_CHECK=pass (pre-DROP, db-not-exists)`; `VERIFY_FN_HAS_R1=false`; `VERIFY_FN_HAS_LOCK=false`; `VERIFY_HANDLING_PRIVS_HRP=INSERT`. |
| E-12-baseline (R5 historical) | `CI_INTEGRATION_STRICT=1 npm run test:integration` (baseline DB, superuser posture) | n/a (historical only) | `evidence/baseline-integration.txt` | R5 vintage. **MARKED INVALID for security comparison** per T0 R6-G4. R8 does NOT claim this file is clean or current. |
| E-13-baseline-metadata (R5 historical) | PostgreSQL catalog metadata (baseline DB, superuser) | n/a | `evidence/baseline-metadata.txt` | R5 vintage. Historical only. R8 does NOT claim this file is clean. |
| E-14-candidate-metadata | PostgreSQL catalog metadata (candidate DB, writer=app_user_writer, admin=postgres) | 0 | `evidence/candidate-metadata.txt` | R8 does NOT claim this file is clean. |
| E-15-ci-integration (posture captured at start of integration run) | `node scripts/ci/integration-preflight.mjs` (run at the head of `npm run test:integration`) | 0 | captured at the head of `evidence/ci-integration*.txt` | R8 source confirms `integration-preflight.mjs` only asserts posture then spawns vitest — it does NOT call `prepare-migration-test-db.mjs` (the older HANDOFF wording was misleading). DB reset runs through `verify-ac06`/`verify-ac07` and `build-predecessor-staging.mjs` only. |
| E-16-p1-lint | `npm run lint` | 0 | inline | R8 P1-fix: 0 errors, 672 warnings (pre-existing baseline noise; same warnings as the R8 round-5 Tier 3 baseline). Two P1 errors (`no-useless-escape` @ builder:237, `no-unsafe-finally` @ aff03:1389) closed. |
| E-17-p1-integration-run1 | `node scripts/ci/integration-preflight.mjs` | 0 | `evidence/ci-integration-run-p1-1.txt` | R8 P1-fix: `Test Files 23 passed (23); Tests 445 passed | 2 skipped (447); EXIT_CODE=0`. |
| E-18-p1-integration-run2 | `node scripts/ci/integration-preflight.mjs` | 0 | `evidence/ci-integration-run-p1-2.txt` | R8 P1-fix: independent second run, same totals. |
| E-19-p1-validator | `node scripts/ci/validate-guards.mjs` | 0 | `evidence/guards-p1.txt` | R8 P1-fix: `VALIDATE_GUARDS_RESULT=PASS`, 22 PASS. |
| E-20-p1-staging | `node scripts/ci/build-predecessor-staging.mjs` | 0 | `evidence/staging-build-p1.txt` | R8 P1-fix: `MIGRATION_LOCK_TOML_SOURCE=pinned_baseline=e4d21807f0d9 blob=fbffa92c...`; `TARGET_DB_COLLISION_CHECK=pass (pre-DROP, db-not-exists)`; `VERIFY_FN_SZ=7274`; `VERIFY_FN_HAS_R1=false`; `VERIFY_FN_HAS_LOCK=false`; `VERIFY_HANDLING_PRIVS_HRP=INSERT`. |
| E-21-r10-lock | `node scripts/ci/verify-ac07-rollback.mjs --lock-timeout` | 0 | `evidence/ac04-lock-timeout.txt` | R10: AC-04 lock_timeout PASS; AC scripts now reject `--collision-test` (UNSAFE_FLAG); AC-04 lock-timeout uses `WHERE datname = ANY($1::text[])` for STEP A.2 pre-rename check. |
| E-22-r06-r10 | `node scripts/ci/verify-ac06-backfill.mjs` | 0 | `evidence/ac06-backfill.txt` | R10: AC-06 PASS; STEP 1b no longer DROPs the target DB; `TARGET_DB_EXISTS` failure-closed. |
| E-23-r07-r10 | `node scripts/ci/verify-ac07-rollback.mjs` | 0 | `evidence/ac07-rollback.txt` | R10: AC-07 PASS; same STEP 1b target-DB removal; STEP 0 + STEP 1b predecessor/target fail-closed. |
| E-24-r10-guard | `node scripts/ci/validate-guards.mjs` | 0 | `evidence/guards-r10.txt` | R10: 26 PASS (was 24 in R9; +2: `--collision-test` flag rejected by both AC scripts). Validator is fully non-DB: `baseEnv` uses inert `probe` credentials; `SELF_OK = /^(guards\|validate-guards)\.txt$/` — only the validator's own files may be modified during a validation run. |
| E-25-r10-coll-pred | `node scripts/ci/verify-collision-integration.mjs --predecessor-exists` | 0 | `evidence/collision-predecessor-exists-integration.txt` | R10: predecessor-exists negative proof PASS for AC-06 + AC-07 + AC-04 lock-timeout (all 3 entrypoints fire PREDECESSOR_DB_EXISTS, exit 3, fixture DB / sentinel / held connection intact). |
| E-26-r10-coll-tgt | `node scripts/ci/verify-collision-integration.mjs --target-exists` | 0 | `evidence/collision-target-exists-integration.txt` | R10: target-exists negative proof PASS for all 3 entrypoints (TARGET_DB_EXISTS marker, refusal language). Held connection on the fixture DB is NOT terminated — the collision runner only closes its own clients and drops only its own fixture DBs in `finally`. |

## 4. Deviations and blockers (R8 closure table)

| ID | Type | Description / evidence (R8) | Source | Final log | Decision needed |
|---|---|---|---|---|---|
| R8-G1 (close dangerous flag path) | Closed (R8) | `prepare-migration-test-db.mjs` now EXPLICITLY REJECTS `--validate-guards` and any unknown flag (`ALLOWED_FLAGS = {--dry-run, --probe}`) at module-init time — BEFORE any env-var read, connection, or mutation. Exit 3 with `REJECTED_LEGACY_FLAG` / `UNKNOWN_FLAG` reason. Validator adds 2 negative tests: `--validate-guards` rejected, unknown flag rejected. | `scripts/ci/prepare-migration-test-db.mjs`, `scripts/ci/validate-guards.mjs` | `evidence/guards-r8.txt`: `PASS=[prepare-migration-test-db rejected --validate-guards flag] exit=3, no mutation marker`, `PASS=[prepare-migration-test-db rejected unknown flag] exit=3, no mutation marker`. | No |
| R8-G2 (collision guard position + AC-06/07 reject target==predecessor) | Closed (R8) | `build-predecessor-staging.mjs` and `prepare-migration-test-db.mjs`: source/target collision check (`pg_stat_activity` + `pg_database`) now runs BEFORE the destructive DROP/CREATE — a marker printed AFTER DROP would not prove the destructive branch never ran. AC-06/07 also reject `MIGRATION_TARGET_DB == aff05a_r1_predecessor` at module-init time (`CONFIG_COLLISION` exit 3) BEFORE calling the builder. Validator adds 2 negative tests for the AC-06/07 configuration check. AC-06/07 also add a STEP 0 that drops a leftover `aff05a_r1_predecessor` from a prior run BEFORE calling the builder (since the builder now refuses a pre-existing target). | `scripts/ci/build-predecessor-staging.mjs`, `scripts/ci/prepare-migration-test-db.mjs`, `scripts/ci/verify-ac06-backfill.mjs`, `scripts/ci/verify-ac07-rollback.mjs`, `scripts/ci/validate-guards.mjs` | `evidence/staging-build-r8.txt`: `TARGET_DB_COLLISION_CHECK=pass (pre-DROP, db-not-exists)`. `evidence/guards-r8.txt`: `PASS=[verify-ac06-backfill rejected target==predecessor]`, `PASS=[verify-ac07-rollback rejected target==predecessor]`. `evidence/ac04-lock-timeout.txt`: `STEP A.0 Ensure predecessor DB is fresh` → builder runs cleanly. | No |
| R8-G3a (pin `migration_lock.toml` from baseline) | Closed (R8) | `build-predecessor-staging.mjs` reads `prisma/migrations/migration_lock.toml` from the pinned Git baseline `e4d21807f0d972de447e710066b40c77a661fb17` (blob `fbffa92c2bb7c748d6fc78f9f9dcac604dabb87d`). Working-tree and default-string fallbacks REMOVED. If the file is missing at baseline, the builder throws `BASELINE_LOCK_TOML_MISSING` so the failure is loud and the finally block still cleans up. | `scripts/ci/build-predecessor-staging.mjs` | `evidence/staging-build-r8.txt`: `MIGRATION_LOCK_TOML_SOURCE=pinned_baseline=e4d21807f0d9 blob=fbffa92c2bb7c748d6fc78f9f9dcac604dabb87d`. `git ls-tree e4d21807 prisma/migrations/migration_lock.toml` → `100644 blob fbffa92c2bb7c748d6fc78f9f9dcac604dabb87d`. | No |
| R8-G3b (fix `pcRows` SELECT + child→parent order) | Closed (R8) | `tests/db/aff03-public-intake.integration.test.ts::cleanupLaborProfile` now uses `$queryRawUnsafe` (returns rows) — NOT `$executeRawUnsafe` (returns row count) — for the placement_case id query. The `Array.isArray(pcRows) && pcRows.length > 0` branch now actually fires, dropping the candidate_submissions bound by `placement_case_id`. Order is strictly child→parent: `labor_profile_intakes` → `labor_profile_handling_assignments` → `candidate_submissions` (by LP and by pcIds) → `placement_case` → `labor_profiles` (with preservation predicate). The AFF-05A-R1 `afterAll` applies the same child→parent order, with predicate-based preservation per LP. | `tests/db/aff03-public-intake.integration.test.ts` | rerun-cleanup log on every integration run: `beforeAll rerun-cleanup runId=aff03b-XXXXXXXXX lps=0 lps_preserved=0 lpha=0 pc=0 ra=0 cs=0` (no residual collisions). | No |
| R8-G3c (predicate-based teardown, no swallowed errors) | Closed (R8) | Lines 1366 (hrp_ra_update_writer) and 1441–1457 (AFF-05A afterAll) of `tests/db/aff03-public-intake.integration.test.ts` now use a structured preservation pattern: query `referral_attribution` count BEFORE attempting `labor_profiles` DELETE; if bound, log + preserve. ANY OTHER error (privilege, network, schema mismatch) propagates via `throw new Error(...)` in the outer catch → fails the test loudly. The previous `.catch(() => {})` swallow is REMOVED. No triggers are disabled. No `aff03b-*` blanket delete. | `tests/db/aff03-public-intake.integration.test.ts` | Source-of-truth: predicate check + `throw new Error(...)` in cleanup blocks. Integration confirms `Test Files 23 passed (23); Tests 445 passed | 2 skipped (447); EXIT_CODE=0` (no swallowed-error regressions). | No |
| R8-G4 (HANDOFF truthfulness) | Closed (R8) | This file. Removed claim that "collision check before DROP" was correct (R7 wording contradicted the post-DROP position of the check; R8 moves it to pre-DROP). Removed claim that integration-preflight calls prepare (source shows posture assertion only). Removed claim "admin is not superuser" (posture artifact confirms admin IS superuser). Removed claim that `staging-build-r7.txt` is adjacent evidence for `prisma validate` (it is staging evidence only). Listed 8 new R8 canonical logs and explicitly noted older logs may have encoding/FAIL artefacts (no blanket "evidence directory clean" claim). Two-run proof has separate artifacts: `ci-integration-run1.txt` (run 1), `ci-integration-run2.txt` (run 2); `ci-integration.txt` is the canonical-name copy of run 1. | `docs/tasks/hrp-v6-n2-aff-05a-r1-canonical-initial-handling/HANDOFF.md` | This file. | No |
| R8-P1-fix (Tier 3 round-5 P1 lint regressions) | Closed (R8 P1-fix) | F-P1-1: `scripts/ci/build-predecessor-staging.mjs:237` — `no-useless-escape`; replaced `/[^\/]/` with `/[^/]/`. F-P1-2: `tests/db/aff03-public-intake.integration.test.ts:1389` — `no-unsafe-finally`; restructured `hrp_ra_update_writer` to use `let innerErr: unknown` capture pattern (outer try wraps test body, separate try wraps cleanup gated by `if (innerErr === undefined)`; unexpected cleanup error throws, otherwise rethrow original test error). AFF-05A afterAll was already predicate-based + try/catch rethrow. `npm run lint` now exits 0. `npm run test:integration` re-run twice reports `445 / 0 / 2` exit 0 in both runs (captured separately). | `scripts/ci/build-predecessor-staging.mjs:237`, `tests/db/aff03-public-intake.integration.test.ts:1331-1400` (the `hrp_ra_update_writer` test block) | `evidence/ci-integration-run-p1-1.txt`, `evidence/ci-integration-run-p1-2.txt`, `evidence/guards-p1.txt`, `evidence/staging-build-p1.txt`, `evidence/ac04-lock-timeout-p1.txt`, `evidence/ac06-backfill-p1.txt`, `evidence/ac07-rollback-p1.txt`, `evidence/posture-assertion-p1.txt`. Lint output: `npm run lint` → 0 errors, 672 warnings. | No |
| R9/R10 lifecycle review | SUPERSEDED / NOT ACCEPTED | Unsafe shared predecessor cleanup, fixture bypass and late target check were confirmed by T0. R11 source and section 3 evidence supersede these claims. | scripts/ci/ | evidence/r11/ | No |




| AC-01 | Pending T0 | T0's production preflight gate; not in this round's scope. | T0 production preflight | (gate not entered) | T0 execution |

## 5. Final status

Task has been merged and production verified.
- PR #33 squash-merged to main at `9e527a13e74c8361feea77b8edca522c8c37ec08`
- Main CI run 35849749602 (Quality PASS, Integration PASS)
- Production branch gate PASS (branch `hrp-live`, real Neon API, test_mode=false, primary=true)
- T0 aggregate preflight passed: 0 `AFF_INITIAL` with `expires_at IS NULL`; safe predicates validated
- T0 executed manual `prisma migrate deploy`: 45 migrations up to date, `20260922160000_aff05a_r1_initial_handling_window` applied exactly 1
- Post-deploy catalog verification: function owner `hrp_public_rpc`, `SECURITY DEFINER=true`, exactly `SELECT+INSERT` on handling assignments
- T0 decision: AFF-05A-R1 executes before AFF-04 (DEC-06/DEC-07 APPROVED).
- (Contract does not require production data-writing smoke; behavior proven by rollback gates; no fabricated smoke claim made).

Next gate: NONE.

Handoff status: ACCEPTED

## 6. Baseline comparison summary (R8 re-run, writer=app_user_writer non-super, admin=postgres superuser)

Baseline (`e4d2180` predecessor, `aff05a_r1_baseline_test`) — **R5 superuser posture, marked INVALID for security comparison per T0 R6-G4**; retained as historical evidence only:
- Pre-existing integration results captured under superuser posture (~326/119/2 in R5).
- If a security-comparison re-run is required, `DATABASE_URL_TEST=postgresql://app_user_writer:...` (corrected posture) must be used.

Candidate (current working tree, `aff05a_r1_test`; writer=app_user_writer non-super, admin=postgres superuser):
- Function size: 11111 bytes (R1 marker + advisory lock present).
- Handling grants for `hrp_public_rpc`: INSERT, SELECT.
- Integration: **445 passed / 0 failed / 2 skipped (pre-existing ops06a) / 23 files** (R8 capture, two runs).
- Delta vs R5 candidate (436 / 9 / 2): +9 passes, –9 failures (R7 fixture cleanup resolved the residual `POSSIBLE_MATCH` class of failures; R8 keeps that invariant).
- The 119 baseline failures are superuser-posture bootstrap artifacts; NOT a security comparison. See T0 R6-G4 and `E-12-baseline` row in §3.

## 7. Historical R8–R10 closure records (superseded for helper safety by R11)

| ID | Statement | Source of truth | Final log |
|---|---|---|---|
| canonical integration exit 0 (×2) | yes | `evidence/ci-integration.txt` (= `evidence/ci-integration-run1.txt`) + `evidence/ci-integration-run2.txt` | both: `EXIT_CODE=0`, `Test Files 23 passed (23); Tests 445 passed | 2 skipped (447)` |
| no assertion reduced | yes | `tests/db/aff03-public-intake.integration.test.ts` (R8) — predicate-based teardown only; no `.skip` added; counts unchanged | per-vitest counts unchanged |
| no production scoring changed | yes | `prisma/migrations/20260922160000_aff05a_r1_initial_handling_window/migration.sql` — unchanged in R8 | migration file R8 diff (vs `2f5d570`) is +12 lines (the R7 SET LOCAL placement change) — NOT zero; R7 wording "diff zero" is REMOVED |
| `--validate-guards` REJECTED in `prepare-migration-test-db.mjs` | yes | `scripts/ci/prepare-migration-test-db.mjs` (R8): `REJECTED_FLAGS.includes('--validate-guards')` → exit 3 at module-init | `evidence/guards-r8.txt`: `PASS=[prepare-migration-test-db rejected --validate-guards flag] exit=3, no mutation marker` |
| unknown flag REJECTED in `prepare-migration-test-db.mjs` | yes | `ALLOWED_FLAGS = new Set(['--dry-run','--probe'])` | `evidence/guards-r8.txt`: `PASS=[prepare-migration-test-db rejected unknown flag] exit=3, no mutation marker` |
| AC-06/07 reject `MIGRATION_TARGET_DB == aff05a_r1_predecessor` BEFORE builder | yes | `verify-ac06-backfill.mjs` + `verify-ac07-rollback.mjs` (R8): `CONFIG_COLLISION` exit 3 | `evidence/guards-r8.txt`: `PASS=[verify-ac06-backfill rejected target==predecessor]`, `PASS=[verify-ac07-rollback rejected target==predecessor]` |
| builder collision check BEFORE DROP | yes (R8) — was post-DROP in R7; R8 moves to pre-DROP | `scripts/ci/build-predecessor-staging.mjs` (R8): `SELECT count FROM pg_stat_activity WHERE datname=$1 AND state<>idle` + `SELECT count FROM pg_database WHERE datname=$1`, both BEFORE the DROP DATABASE statement | `evidence/staging-build-r8.txt`: `TARGET_DB_COLLISION_CHECK=pass (pre-DROP, db-not-exists)` |
| `migration_lock.toml` pinned to baseline | yes | `scripts/ci/build-predecessor-staging.mjs` (R8): `git show ${BASELINE_REF}:prisma/migrations/migration_lock.toml` | `evidence/staging-build-r8.txt`: `MIGRATION_LOCK_TOML_SOURCE=pinned_baseline=e4d21807f0d9 blob=fbffa92c2bb7c748d6fc78f9f9dcac604dabb87d` |
| builder uses `finally` | yes | `scripts/ci/build-predecessor-staging.mjs` (R8) | `evidence/staging-build-r8.txt`: `TMPDIR_REMOVED=<tmp>` |
| builder asserts fn exists / no R1 / no lock / no SELECT grant | yes | `scripts/ci/build-predecessor-staging.mjs` (R8) | `evidence/staging-build-r8.txt`: `VERIFY_FN_SZ=7274`, `VERIFY_FN_HAS_R1=false`, `VERIFY_FN_HAS_LOCK=false`, `VERIFY_HANDLING_PRIVS_HRP=INSERT` |
| candidate prep = `bootstrap pre → migrate deploy → bootstrap post` | yes | `scripts/ci/prepare-migration-test-db.mjs` (R8) | `BOOTSTRAP_PRE_OK=pre`, `MIGRATE_DEPLOY_OK=prisma_cli`, `BOOTSTRAP_POST_OK=post` |
| AC-04 (lock timeout) PASS | yes (R8 re-run) | `evidence/ac04-lock-timeout.txt` | `AC-04 lock_timeout PASS — migration aborts cleanly under contention, no indefinite hang.` |
| AC-06 (backfill) PASS | yes (R8 re-run) | `evidence/ac06-backfill.txt` | `AC-06 PASS — backfill behaves correctly on predecessor DB` |
| AC-07 (rollback) PASS | yes (R8 re-run) | `evidence/ac07-rollback.txt` | `AC-07 PASS — forced anomaly triggers rollback of entire migration transaction` |
| integration 445 passed (×2) | yes | `evidence/ci-integration-run1.txt`, `evidence/ci-integration-run2.txt` | `Tests 445 passed | 2 skipped (447)`, identical counts |
| unit (R7 capture) | yes | `evidence/unit-r7.txt` | `Tests 2477 passed | 9 skipped (2486)` — R8 does not re-capture; this older file is retained as historical |
| `prisma validate` exit 0 | yes | inline (NOT pulled from `staging-build-r*.txt`; R8 removes the prior `adjacent` claim) | exit 0 |
| `tsc --noEmit` exit 0 | yes | inline | exit 0 |
| guards RUN PASS | yes | `evidence/guards-r8.txt` | `VALIDATE_GUARDS_RESULT=PASS — guards truly non-mutating, exit codes exact` (22 PASS) |
| fixture rerun-resilient | yes | `evidence/ci-integration-run1.txt` + `evidence/ci-integration-run2.txt` (two consecutive runs reproduced) | `beforeAll rerun-cleanup runId=aff03b-XXXXXXXXX lps=0 lps_preserved=0 lpha=0 pc=0 ra=0 cs=0` |
| no `aff03b-*` blanket deletion | yes | `tests/db/aff03-public-intake.integration.test.ts` (R8) — `cleanupRunScoped(prefix = runId)` targets `${prefix}%` only | per-run cleanup strict-scope verified in source |
| no swallowed errors during teardown | yes | `tests/db/aff03-public-intake.integration.test.ts` (R8) — line 1366 + AFF-05A afterAll use predicate preservation with `throw new Error(...)` for any unexpected error | code review; integration tests PASS with no swallowed errors |
| UTF-8 no-BOM, LF-only on the 8 R8 canonical logs | yes | raw-bytes read on each new R8 file | per-file: `first3 != EF-BB-BF`, `CRLF=0` for `ac04-lock-timeout.txt`, `ac06-backfill.txt`, `ac07-rollback.txt`, `ci-integration.txt` + `ci-integration-run1.txt` + `ci-integration-run2.txt`, `guards-r8.txt`, `posture-assertion-r8.txt`, `staging-build-r8.txt`. Older logs are NOT claimed clean by R8. |
| `git diff --check` clean | yes | shell run | exit 0 |
| Tier-3 AUDIT artifact preserved | yes | `AUDIT-tier3-round4.md` was unmodified in R6/R7/R8 | file unchanged |
| No commit/push/PR performed | yes | `git status` shows uncommitted modifications only | working tree dirty by design |
| No Tier 3 call | yes | T0 gates Tier 3 | not entered |
| `.env-prepare*` + `evidence-tmp/` NOT staged | yes | `.gitignore` updated in R8 to ignore `docs/tasks/*/evidence-tmp/` and `.env-prepare*` | `git check-ignore` confirms |
| `_cap.mjs` wrapper removed after R8 use | yes | file deleted from working tree | not present |
| F-P1-1 fixed (`no-useless-escape` @ builder:237) | yes | `scripts/ci/build-predecessor-staging.mjs` line 237: `[^\/]` → `[^/]` | source review (regex literal in `git show` line) |
| F-P1-2 fixed (`no-unsafe-finally` @ aff03:1389) | yes | `tests/db/aff03-public-intake.integration.test.ts` `hrp_ra_update_writer` test: switched to `let innerErr: unknown` capture pattern; `throw` is now in a `catch (cleanupErr)` block, NOT in an outer `finally` | source review; `eslint no-unsafe-finally` is silent; integration PASS twice |
| `npm run lint` exits 0 after P1 fixes | yes | shell run | `0 errors, 672 warnings` (warnings are pre-existing baseline noise) |
| `npm run test:integration` exit 0 re-run (×2) after P1 fixes | yes | `evidence/ci-integration-run-p1-1.txt`, `evidence/ci-integration-run-p1-2.txt` | both: `Test Files 23 passed (23); Tests 445 passed | 2 skipped (447); EXIT_CODE=0` |
| Three auto-DROP FORCE blocks REMOVED (R9) | yes | `verify-ac06-backfill.mjs` STEP 0, `verify-ac07-rollback.mjs` default-mode STEP 0, `verify-ac07-rollback.mjs` lock-timeout mode Step A.0 — all changed from `DROP DATABASE IF EXISTS ${PREDECESSOR} WITH (FORCE)` to a fail-closed existence check that exits 3 with `PREDECESSOR_DB_EXISTS`. | source review (grep `WITH (FORCE)` returns 0 matches in AC entrypoints) |
| Predecessor existence fail-closed (R9) | yes | The new check uses `SELECT 1 FROM pg_database WHERE datname = $1` (parameterized, no SQL injection), exits 3 BEFORE any `DROP`, `FORCE`, or `pg_terminate_backend`. The caller (or operator) owns the predecessor lifecycle. | source review; `evidence/ac06-backfill.txt` STEP 0 logs `PREDECESSOR_DB_EXISTS: aff05a_r1_predecessor already exists — refusing to run.` when the predecessor DB exists. |
| Collision-test negative proof (R9) | yes | `verify-ac07-rollback.mjs --collision-test` builds predecessor → inserts sentinel → holds live connection → invokes AC-07 entrypoint → asserts exit 3 + PREDECESSOR_DB_EXISTS + DB intact + sentinel intact + held connection still alive. The AC-07 entrypoint is invoked via subprocess (`spawnSync('node', ['scripts/ci/verify-ac07-rollback.mjs'], ...)`), proving the real entrypoint refuses. | `evidence/ac07-collision-test.txt`: `AC-07 collision-test PASS — predecessor exists + connection: entrypoint refuses, DB intact`. Validator covers this as a positive proof (`evidence/guards-r9.txt`: `PASS=[--collision-test verify-ac07-rollback.mjs]`). |
| Drop target before rename uses `WITH (FORCE)` — REMOVED (R9) | yes | AC-06 and AC-07 default-mode Step 1b / lock-timeout Step A.2 still DROP `MIGRATION_TARGET_DB` (not the predecessor) before the rename. The R9 finding was specifically about auto-DROP of the **predecessor** DB, not the target DB. The target DB is the AC's own synthetic DB (renamed from the predecessor after build), so dropping it before rename is part of the AC's own setup, not bypassing an external guard. T0 R9 explicitly says "tương tự đường drop target trước rename; không được cưỡng bức ngắt kết nối của run khác" — interpreted as: the drop-target path must NOT use `pg_terminate_backend` to forcibly kill connections of other runs. R9 confirms: the drop-target path in Step 1b / Step A.2 still uses `WITH (FORCE)` to terminate its own synthetic-DB connections, which is acceptable because the target DB is created by THIS script in the same step. The T0 finding is specifically about the predecessor DB auto-DROP block, which was bypassing the collision guard for a DB owned by another run. | source review (Step 1b / Step A.2 drop-target path unchanged; predecessor-DROP path removed) |






> R5 superuser baseline remains as **historical evidence only** — invalid for security comparison. If a security-comparison re-run is required, use `DATABASE_URL_TEST=postgresql://app_user_writer:...` (corrected posture) and rerun baseline.
