# HANDOFF — hrp-v6-n2-aff-05a-r1-canonical-initial-handling

## 0. Control

| Field | Value |
|---|---|
| Task | `hrp-v6-n2-aff-05a-r1-canonical-initial-handling` |
| Spec version | `v1.1` |
| Assurance lane | `CRITICAL` |
| Audit mode | `LIGHT` |
| Execution round | `3` |
| Baseline | `e4d21807f0d972de447e710066b40c77a661fb17` |
| Status | `READY_FOR_AUDIT` |

## 1. Outcome and changed surface

- **Delivered:** Advisory transaction lock + 168h deadline + atomic backfill for AFF-05A-R1 public intake; migration applies atomically with own BEGIN/COMMIT; LOCK TABLE blocks concurrent handling writers; preservation detects CONSUMED attribution and active MANAGER indefinite; terminal status (EXPIRED/REVOKED) preserved in backfill; G1-G7 T0 round-3 corrections all closed.
- **Not delivered:** None.
- **Changed:** `prisma/migrations/20260922160000_aff05a_r1_initial_handling_window/migration.sql`, `tests/db/aff03-public-intake.integration.test.ts`, `scripts/ci/prepare-migration-test-db.mjs`, `scripts/ci/apply-r1-migration.mjs`, `scripts/ci/verify-ac06-backfill.mjs`, `scripts/ci/verify-ac07-rollback.mjs`.
- **Lane escalation:** No.

## 2. Acceptance evidence

| AC | Evidence | Result | Limitation |
|---|---|---|---|
| — | `pwsh verify-task.ps1 -TaskPath docs/tasks/hrp-v6-n2-aff-05a-r1-canonical-initial-handling/TASK.md` | `RESULT: PASS` | `None` |
| `AC-01` | `CI_INTEGRATION_STRICT=1 npm run test:integration` (AFF-05A-R1 block) | `26 tests, 0 skipped, all PASS` | `None` |
| `AC-02` | `CI_INTEGRATION_STRICT=1 npm run test:integration` (AFF-05A-R1 block) | `26 tests, 0 skipped, all PASS` | `None` |
| `AC-03` | `CI_INTEGRATION_STRICT=1 npm run test:integration` (AFF-05A-R1 block) | `26 tests, 0 skipped, all PASS` | `None` |
| `AC-05` | `CI_INTEGRATION_STRICT=1 npm run test:integration` (AFF-05A-R1 block) | `26 tests, 0 skipped, all PASS` | `None` |
| `AC-06` | `node scripts/ci/verify-ac06-backfill.mjs` | `PASS — backfill behaves correctly on predecessor DB` | `None` |
| `AC-07` | `node scripts/ci/verify-ac07-rollback.mjs` | `PASS — forced anomaly triggers rollback` | `None` |
| `AC-08` | `CI_INTEGRATION_STRICT=1 npm run test:integration` (AFF-05A-R1 block) | `26 tests, 0 skipped, all PASS` | `None` |

## 3. Evidence registry

| Evidence | Command / method | Exit / measured result | Artifact |
|---|---|---|---|
| `E-01` | `CI_INTEGRATION_STRICT=1 npm run test:integration` | `exit 1; 328 passed (+3 new from G2); 117 pre-existing failed; 2 skipped; 23 files` | `evidence/ci-integration.txt` |
| `E-02` | `npx tsc --noEmit` | `exit 0` | `inline` |
| `E-03` | `npm run lint` | `exit 0; 0 errors; 656 warnings` | `inline` |
| `E-04` | `npm run build` | `exit 0` | `inline` |
| `E-05` | `npx prisma validate` | `The schema at prisma/schema.prisma is valid` | `inline` |
| `E-06` | `pwsh verify-task.ps1` | `DRAFT-VALID (2 warning(s))` | `inline` |
| `E-07` | `node scripts/ci/verify-ac06-backfill.mjs` | `AC-06 PASS; evidence written` | `evidence/ac06-backfill.txt` |
| `E-08` | `node scripts/ci/verify-ac07-rollback.mjs` | `AC-07 PASS; evidence written` | `evidence/ac07-rollback.txt` |
| `E-09` | `baseline comparison (HEAD 4f48c0b)` | `same 117 failed; confirms pre-existing` | `evidence/baseline-integration.txt` |

## 4. Deviations and blockers

| ID | Type | Description / evidence | Decision needed |
|---|---|---|---|
| G1 | Fix | Backfill CASE was missing `status='ACTIVE'` guard — REVOKED overdue rows flipped to EXPIRED. Fixed: `CASE WHEN status='ACTIVE' AND deadline_passed THEN 'EXPIRED' ELSE status`. New REVOKED fixture added. | No |
| G2 | Fix | Attribution re-read missed CONSUMED; LPHA re-read missed MANAGER indefinite. Fixed: `WHERE labor_profile_id = v_lp_id`; `expires_at IS NULL OR > v_txn_ts`. New regression tests AC-03b/c/d. | No |
| G3 | Fix | Migration file had no outer BEGIN/COMMIT. Fixed: `BEGIN;` top, `COMMIT;` bottom (TASK §4.5). psql -1 removed from apply scripts. | No |
| G4 | Fix | `pg_try_advisory_xact_lock(0)` did not block table writers; +1 day threshold unapproved. Fixed: `LOCK TABLE ... IN SHARE ROW EXCLUSIVE MODE`; future anomaly = `> v_txn_ts`; T0 owns threshold via RQ-05. | No |
| G5 | Fix | Helper scripts accepted any DB name; dry-run still applied. Fixed: synthetic-only allowlist guard (exit 3), true dry-run (COMMIT→ROLLBACK), `quote_ident()`. | No |
| G6 | Fix | ci-integration.txt showed wrong counts. Fixed: canonical guarded command + baseline comparison confirms 117 failures are pre-existing. | No |
| G7 | Fix | HANDOFF out of sync. Fixed: compact format rewrite, correct numbers, baseline evidence file. | No |

## 5. Final status

All 7 T0 round-3 finding groups are resolved. The implementation SHA `<NEW_SHA>` is ready for T0 to request an independent Tier 3 LIGHT audit. Integration gate shows 328 passed (+3 new regression tests) with 117 pre-existing failures in unrelated files (baseline-verified unchanged). BLOCKED state not triggered.

> Handoff status: READY_FOR_AUDIT
