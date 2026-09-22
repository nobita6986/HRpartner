# HANDOFF — hrp-v6-n2-aff-05a-r1-canonical-initial-handling

## 0. Control

| Field | Value |
|---|---|
| Task | `hrp-v6-n2-aff-05a-r1-canonical-initial-handling` |
| Spec version | `v1.1` |
| Assurance lane | `CRITICAL` |
| Audit mode | `LIGHT` |
| Execution round | `4` |
| Baseline | `e4d21807f0d972de447e710066b40c77a661fb17` |
| Implementation SHA | `2f5d5702e1169bd2202db932c37c58f05422fcbc` |
| Status | `READY_FOR_AUDIT` |

## 1. Outcome and changed surface

- **Delivered:** Round-4 T0 corrections: (G1) baseline/candidate comparison on two clean synthetic DBs; (G2) REVOKED-overdue fixture added to AC-06; (G3) synthetic-only guard enforcement across all 4 helper scripts; (G4) bounded `lock_timeout = '5s'` in migration + two-connection evidence; (G5) TASK allowlist synchronized.
- **Not delivered:** None.
- **Changed:** `prisma/migrations/20260922160000_aff05a_r1_initial_handling_window/migration.sql` (+bounded lock_timeout), `scripts/ci/prepare-migration-test-db.mjs` (+target/host/source guards, --validate-guards, correct predecessor-chain prep), `scripts/ci/verify-ac06-backfill.mjs` (+REVOKED fixture), `scripts/ci/verify-ac07-rollback.mjs` (+--lock-timeout mode), `docs/tasks/.../TASK.md` (allowlist sync), evidence files updated.
- **Lane escalation:** No.

## 2. Acceptance evidence

| AC | Evidence | Result | Limitation |
|---|---|---|---|
| — | `pwsh verify-task.ps1 -TaskPath docs/tasks/hrp-v6-n2-aff-05a-r1-canonical-initial-handling/TASK.md` | `RESULT: PASS (DRAFT-VALID, 2 non-blocking warnings)` | None |
| `AC-01` | T0 production preflight (pending T0 execution) | `PENDING T0 PRODUCTION PREFLIGHT` | None — this is T0's gate, not synthetic |
| `AC-02` | `CI_INTEGRATION_STRICT=1 npm run test:integration` (AFF-05A-R1 block, candidate DB) | `7 tests PASS, 0 skipped` | None |
| `AC-03` | `CI_INTEGRATION_STRICT=1 npm run test:integration` (AFF-05A-R1 block, candidate DB) | `7 tests PASS, 0 skipped` | None |
| `AC-04` | Two-connection race via `CI_INTEGRATION_STRICT=1 npm run test:integration` | `PASS — both submissions committed, exactly one attribution consumed/bound` | Non-participating writers outside guarantee |
| `AC-05` | `CI_INTEGRATION_STRICT=1 npm run test:integration` (AFF-05A-R1 block, baseline DB) | `2 R1-block tests FAIL on baseline (R1 not applied), 0 skipped` | Expected — confirms R1 fixes the gap |
| `AC-06` | `node scripts/ci/verify-ac06-backfill.mjs` | `PASS — backfill preserves REVOKED, derives deadline from starts_at, no AFF_INITIAL NULL-deadline rows remain` | None |
| `AC-07` | `node scripts/ci/verify-ac07-rollback.mjs` | `PASS — forced anomaly triggers full transaction rollback` | None |
| `AC-08` | `CI_INTEGRATION_STRICT=1 npm run test:integration` (candidate DB) + canonical gates | `328 passed, 117 failed (pre-existing, identical to baseline e4d21807 — see E-02 for reproduction), 2 skipped; prisma validate + typecheck + lint + build PASS` | None |

## 3. Evidence registry

| Evidence | Command / method | Exit / measured result | Artifact |
|---|---|---|---|
| `E-00` | `pwsh verify-task.ps1` | `RESULT: PASS (DRAFT-VALID, 2 warnings non-blocking)` | `inline` |
| `E-01` | `CI_INTEGRATION_STRICT=1 npm run test:integration` (candidate `aff05a_r1_test` DB, R1 applied) | `exit 1 (pre-existing env failures); 328 passed, 117 failed, 2 skipped; 23 files` | `evidence/candidate-integration.txt` |
| `E-02` | `CI_INTEGRATION_STRICT=1 npm run test:integration` (baseline `aff05a_r1_baseline_test` DB, predecessor only) | `exit 1 (pre-existing env failures); 326 passed, 119 failed, 2 skipped; 23 files` | `evidence/baseline-integration.txt` |
| `E-03` | `npx tsc --noEmit` | `exit 0` | `inline` |
| `E-04` | `npm run lint` | `exit 0; 670 warnings` | `inline` |
| `E-05` | `npm run build` | `exit 0` | `inline` |
| `E-06` | `npx prisma validate` | `The schema at prisma/schema.prisma is valid` | `inline` |
| `E-07` | `npm run test:unit` | `exit 0; 2477 passed, 9 skipped; 160 files` | `evidence/unit-tests.txt` |
| `E-08` | `pwsh verify-handoff.ps1` | `RESULT: PASS (round-4)` | `inline` |
| `E-09` | `node scripts/ci/verify-ac06-backfill.mjs` | `AC-06 PASS; evidence written` | `evidence/ac06-backfill.txt` |
| `E-10` | `node scripts/ci/verify-ac07-rollback.mjs` | `AC-07 PASS; evidence written` | `evidence/ac07-rollback.txt` |
| `E-11` | `node scripts/ci/prepare-migration-test-db.mjs --validate-guards` | `VALIDATE_GUARDS_RESULT=PASS — all 4 scripts reject unsafe configs` | `evidence/guards.txt` |
| `E-12` | `node scripts/ci/verify-ac07-rollback.mjs --lock-timeout` | `AC-04 lock_timeout PASS — migration aborts in ~5s with 'canceling statement due to lock timeout'` | `evidence/ac04-lock-timeout.txt` |
| `E-13` | PostgreSQL catalog metadata (baseline `aff05a_r1_baseline_test`) | Roles, RLS, privileges, function body captured | `evidence/baseline-metadata.txt` |
| `E-14` | PostgreSQL catalog metadata (candidate `aff05a_r1_test`) | Roles, RLS, privileges, function body captured | `evidence/candidate-metadata.txt` |

## 4. Deviations and blockers

| ID | Type | Description / evidence | Decision needed |
|---|---|---|---|
| G1 | Closed | Baseline vs. candidate comparison on two clean synthetic DBs. Baseline (`aff05a_r1_baseline_test`): 326 passed / 119 failed. Candidate (`aff05a_r1_test`): 328 passed / 117 failed. Delta = +2 R1 tests pass; no collateral damage. Predecessor chain verification via `prepare-migration-test-db.mjs` proves FN size 7274 (predecessor) vs 11111 (R1). | No |
| G2 | Closed | REVOKED-overdue fixture added to AC-06. `verify-ac06-backfill.mjs` seeds 5 rows (overdue ACTIVE, future ACTIVE, terminal EXPIRED, REVOKED-overdue, non-AFF). Assertions: (a) overdue ACTIVE→EXPIRED; (b) future ACTIVE preserved; (c) terminal EXPIRED preserved; (c2) REVOKED status preserved (not flipped); deadline derives from starts_at for all. | No |
| G3 | Closed | Synthetic-only guards in all 4 helper scripts. `prepare-migration-test-db.mjs --validate-guards` proves: all scripts exit 3 on unsafe target names, unsafe hosts (non-loopback), source==target — no mutation occurs. | No |
| G4 | Closed | Bounded `SET LOCAL lock_timeout = '5s'` added to migration.sql DO block. Two-connection test (`verify-ac07-rollback.mjs --lock-timeout`): connection A holds SHARE ROW EXCLUSIVE lock; connection B migration aborts in ~5.2s with `canceling statement due to lock timeout`; exits non-zero; sanity re-run without contention succeeds. | No |
| G5 | Closed | TASK.md §4.2 allowlist synchronized to explicitly list 4 helper scripts. HANDOFF updated with correct AC list, SHAs, test counts, evidence paths. AC-01 correctly marked PENDING T0 production preflight. | No |

## 5. Final status

All 5 T0 round-4 finding groups (G1–G5) are resolved. The implementation SHA `2f5d5702e1169bd2202db932c37c58f05422fcbc` is ready for T0 to request an independent Tier 3 LIGHT audit delta. AC-01 remains PENDING T0 production preflight per TASK §6.1.

> Handoff status: `READY_FOR_AUDIT`
> T0 review required before requesting Tier 3 LIGHT delta audit.

## 6. Baseline comparison summary

Baseline (`e4d2180` predecessor, `aff05a_r1_baseline_test`):
- Function size: 7274 bytes (no R1 marker, no advisory lock)
- Handling grants for `hrp_public_rpc`: INSERT only (no SELECT)
- Integration: 326 passed / 119 failed / 2 skipped / 23 files
- Root cause of 119 baseline failures: 117 pre-existing environment failures (same on both baseline and candidate) + 2 R1-specific tests that fail without R1

Candidate (`2f5d5702e1169bd2202db932c37c58f05422fcbc`, `aff05a_r1_test`):
- Function size: 11111 bytes (R1 marker + advisory lock present)
- Handling grants for `hrp_public_rpc`: INSERT, SELECT
- Integration: 328 passed / 117 failed / 2 skipped / 23 files
- Delta: +2 R1 tests pass; no collateral failures introduced

> Note: The 117 pre-existing failures are environment/DB-bootstrap related
> issues unrelated to AFF-05A-R1. They appear identically on both baseline
> and candidate databases (same bootstrap, same test code). The root cause
> is in source code outside the AFF-05A-R1 scope, and per T0 directive they
> are not to be fixed in this task. The R1-affected tests pass on candidate
> and fail on baseline, confirming R1 is the correct, scoped change.

> Note on "predecessor-chain proof" wording: the baseline-integration.txt
> evidence file represents a TRUE predecessor state derived by applying the
> migration chain up to (but excluding) AFF-05A-R1, not a schema-restored
> snapshot. This distinction is required by T0 round-4.
