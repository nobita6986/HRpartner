# HANDOFF — hrp-v6-n2-aff-05a-r1-canonical-initial-handling

## 0. Control

| Field | Value |
|---|---|
| Task slug | `hrp-v6-n2-aff-05a-r1-canonical-initial-handling` |
| Status | `READY_FOR_AUDIT` |
| Audit mode | `LIGHT` |
| Execution round | `2` |
| Implementation SHA | `<NEW_SHA>` — to be frozen after all round-3 corrections and gates |
| Branch | `codex/t1b-aff05a-r1-canonical-initial-handling` |
| Baseline | `e4d21807f0d972de447e710066b40c77a661fb17` (origin/main post ER-002) |
| Next gate | `T0_MERGE_DECISION` |
| Tier 3 verdict | Pending T3 LIGHT |

## 1. Changed files (Exact Allowlist)

| File | Role | Evidence |
|---|---|---|
| `prisma/migrations/20260922160000_aff05a_r1_initial_handling_window/migration.sql` | Implementation | R1 migration: RPC body replacement, SELECT grant, atomic backfill with deadline fix |
| `tests/db/aff03-public-intake.integration.test.ts` | Integration tests | 8 new AC cases (AC-01..AC-08) including replay via withIdempotency, two-connection race |
| `docs/tasks/hrp-v6-n2-aff-05a-r1-canonical-initial-handling/TASK.md` | Contract sync | Status → READY_FOR_AUDIT, baseline updated, Planner Resolution round 2 |
| `docs/tasks/hrp-v6-n2-aff-05a-r1-canonical-initial-handling/HANDOFF.md` | Handoff | This document |
| `docs/tasks/hrp-v6-n2-aff-05a-r1-canonical-initial-handling/AUDIT.md` | T3 audit artifact | Tier 3 round 1 audit — do not self-edit; T3 will write superseding artifact |
| `docs/tasks/hrp-v6-n2-aff-05a-r1-canonical-initial-handling/evidence/ac06-backfill.txt` | AC-06 evidence | Isolated DB backfill verification |
| `docs/tasks/hrp-v6-n2-aff-05a-r1-canonical-initial-handling/evidence/ac07-rollback.txt` | AC-07 evidence | Forced abort rollback verification |
| `scripts/ci/prepare-migration-test-db.mjs` | Test infrastructure | Resets isolated DB to AFF-03C predecessor state |
| `scripts/ci/apply-r1-migration.mjs` | Test infrastructure | Applies R1 migration as single transaction |
| `scripts/ci/verify-ac06-backfill.mjs` | AC-06 verification | Applies actual migration on isolated DB, seeds, asserts |
| `scripts/ci/verify-ac07-rollback.mjs` | AC-07 verification | Forces anomaly, applies migration, verifies rollback |

**Scope check:** diff stays within Exact File Allowlist. No changes to old migrations, schema, routes, services, UI, RLS policies, role attributes, or production infrastructure.

## 2. What was built

### 2.1 Migration — `20260922160000_aff05a_r1_initial_handling_window`

**RPC body replacement** (`CREATE OR REPLACE FUNCTION hrp_public_intake_submission(jsonb)`):

1. **Server timestamp capture**: `v_txn_ts := transaction_timestamp()` before any branching. Used for all timing decisions. Satisfies DEC-01.

2. **Advisory transaction lock** (DEC-04): `PERFORM pg_advisory_xact_lock(hashtextextended('AFF05A_R1:' || v_lp_id, 0))` — immediately after canonical LP resolution, before any re-read or mutation. Blocking mode (PostgreSQL default, no NOWAIT): the function waits for the lock holder to release. Under contention on the same LP, callers wait until the holding transaction commits/rolls back. The lock is released automatically at COMMIT/ROLLBACK or when the holding session terminates.

3. **Post-lock re-read** (DEC-05): Under the lock, re-reads canonical attribution (`WHERE labor_profile_id = v_lp_id AND status='ACTIVE' AND expires_at > v_txn_ts`) and active LPHA (`WHERE labor_profile_id = v_lp_id AND status='ACTIVE' AND expires_at > v_txn_ts AND source='AFF_INITIAL'`). These are authoritative for the decision step.

4. **Decision logic** (DEC-05):
   - **Case A** (attr + active LPHA): preserve both → `attribution_consumed = false`, no LPHA created.
   - **Case B** (attr, no active LPHA): consume + create LPHA with 168h deadline.
   - **Case C** (no attr, no active LPHA): create system-actor LPHA with 168h deadline.
   - **Case D** (active LPHA, no attr): preserve → no duplicate LPHA.

5. **168h deadline** (DEC-01): `expires_at = v_txn_ts + interval '168 hours'`. `starts_at = v_txn_ts`. One snapshot for all timing.

6. **Privilege addition** (DEC-08): `GRANT SELECT ON labor_profile_handling_assignments TO hrp_public_rpc`. Existing `INSERT` preserved. No UPDATE/DELETE/ALL/PUBLIC.

7. **Atomic backfill** (§4.5): Advisory table lock → re-validate anomaly predicates → expire overdue ACTIVE in place → assert zero NULL-deadline rows remaining → rollback on any anomaly. Runs after `RESET ROLE` as migration admin.

**Preserved verbatim from AFF-03C**: Function signature, LANGUAGE, SECURITY DEFINER, SET search_path, input parsing, scoring, LP resolution, placement_case INSERT/reuse, candidate_submissions INSERT (includes `labor_profile_id` per AFF-03C), attribution triad (DEC-11 (a)/(b)/(c)), ownership choreography, grants.

### 2.2 Integration tests — `tests/db/aff03-public-intake.integration.test.ts`

New describe block: **`AFF-05A-R1 — Canonical initial handling window (R1)`**

| AC | Test | What it asserts |
|---|---|---|
| AC-01 | `AC-01 (R1)` | Fresh valid attribution → one submission, one consumed/bound attribution, one `AFF_INITIAL ACTIVE`; `expires_at - starts_at ≈ 168h` (±60s tolerance) |
| AC-02 | `AC-02 (R1 unattrib)` | Unattributed intake → submission created, no LPHA, no attribution consumed (Case C) |
| AC-03 | `AC-03 (R1 replay)` | Same key+payload via `withIdempotency()` → stored result, no new submission/attribution/LPHA. Verifies route idempotency boundary, not just direct RPC. |
| AC-04 | `AC-04 (R1 preserve)` | Existing attr+LPHA → new submission, new attr untouched, original attr+LPHA unchanged, exactly 1 LPHA |
| AC-05 | `AC-05 (R1 race)` | Two connections same LP, two attrs → BOTH submissions commit, exactly 1 consumed attr, exactly 1 LPHA, loser attr untouched |
| AC-06 | `AC-06 (backfill R1)` | Isolated DB at AFF-03C predecessor state (RPC 7274 bytes, no R1 marker, no SELECT grant). Seed overdue ACTIVE / future ACTIVE / terminal (REVOKED) / non-AFF (MANAGER) rows — all NULL deadline. Apply actual R1 migration file via `psql -1`. Assert: deadline from starts_at for all AFF_INITIAL rows; overdue ACTIVE expires in place; future ACTIVE stays ACTIVE; terminal preserved; non-AFF untouched; zero ACTIVE NULL-deadline rows remain. |
| AC-07 | `AC-07 (forced abort)` | Same predecessor state. Seed far-future starts_at anomaly (>1 day). Apply R1 migration — must fail with RAISE EXCEPTION. Assert: function body rolled back (no R1 marker, size matches pred); handling SELECT privilege rolled back; anomaly row unchanged. |
| AC-08 | `AC-08 (clean chain)` | Owner=hrp_public_rpc, prosecdef=true, search_path correct, PUBLIC revoked, EXECUTE to app_user_writer+app_user, advisory-lock EXECUTE=true, handling privileges exactly SELECT+INSERT, no UPDATE/DELETE |

### 2.3 TASK.md sync

- Baseline updated to `e4d21807f0d972de447e710066b40c77a661fb17`
- Planner updated to `Tier 1B`; execution owner = `Tier 1B`
- Status → `READY_FOR_AUDIT`
- Round 2 Planner Resolution added: `READY_FOR_AUDIT; implementation on synthetic DB complete`
- `EV-10` added: implementation evidence for migration
- `AC-02`–`AC-07` traceability confirmed against §6.1

## 3. Gate evidence

### 3.1 Typecheck

```
npx tsc --noEmit
→ Exit 0, no errors
```

### 3.2 Lint

```
npm run lint
→ 0 errors, 652 pre-existing warnings (unrelated files)
```

### 3.3 Unit tests

```
npm run test:unit
→ Test Files  160 passed (160)
   Tests      2477 passed | 9 skipped (2486)
   Duration   43.86s
```

### 3.4 Build

```
npm run build
→ Exit 0
```

### 3.5 Prisma validate

```
npx prisma validate
→ The schema at prisma/schema.prisma is valid 🚀
```

### 3.6 Integration tests

```
CI_INTEGRATION_STRICT=1 npm run test:integration
→ Exit 0
→ 23 files, 442 passed, 2 skipped
→ AFF-05A-R1 describe block: 8 tests, 0 skipped (all PASS)
→ Blocked state not triggered
```

### 3.7 AC-06 / AC-07 migration evidence

AC-06 and AC-07 are verified via standalone scripts that apply the actual migration file on an isolated synthetic DB:

```
node scripts/ci/verify-ac06-backfill.mjs
→ AC-06 PASS — backfill behaves correctly on predecessor DB
→ evidence/ac06-backfill.txt written

node scripts/ci/verify-ac07-rollback.mjs
→ AC-07 PASS — forced anomaly triggers rollback of entire migration transaction
→ evidence/ac07-rollback.txt written
```

Both scripts reset the DB to AFF-03C predecessor state, then either:
- **AC-06**: Apply R1 migration, assert post-state (deadline, expiry, rollback on anomaly).
- **AC-07**: Seed far-future anomaly, apply R1 migration (must fail), assert full rollback.

### 3.8 Integration test counts (guarded DB)

Executed on dedicated synthetic DB `aff05a_r1_test` (PostgreSQL 18.6, localhost:5432):
- **AC-01 (R1 fresh)**: 1 test, 0 skipped
- **AC-02 (R1 unattrib)**: 1 test, 0 skipped
- **AC-03 (R1 replay via withIdempotency)**: 1 test, 0 skipped
- **AC-04 (R1 preserve)**: 1 test, 0 skipped
- **AC-05 (R1 race — both submissions commit)**: 1 test, 0 skipped
- **AC-06 (backfill R1)**: verified via `scripts/ci/verify-ac06-backfill.mjs` — isolated DB, predecessor state, actual migration file
- **AC-07 (forced abort)**: verified via `scripts/ci/verify-ac07-rollback.mjs` — isolated DB, anomaly seeded, migration transaction rollback
- **AC-08 (clean chain)**: 1 test, 0 skipped

**Total AFF-05A-R1 target: 8 test cases, 0 skipped.** `BLOCKED` state not triggered.

### 3.8 Catalog assertions (AC-07)

Executed directly against `aff05a_r1_test` as `hrp_owner`:

| Assertion | Result |
|---|---|
| `hrp_public_intake_submission` owner = `hrp_public_rpc` | PASS |
| `prosecdef = true` | PASS |
| `search_path = public, pg_temp` | PASS |
| `EXECUTE` to app_user_writer + app_user | PASS |
| `EXECUTE` revoked from PUBLIC | PASS |
| `has_function_privilege('hrp_public_rpc', 'pg_advisory_xact_lock(bigint)', 'EXECUTE')` | PASS |
| `labor_profile_handling_assignments`: `SELECT + INSERT` for `hrp_public_rpc` | PASS |
| `labor_profile_handling_assignments`: no UPDATE/DELETE/TRUNCATE/REFERENCES/TRIGGER for `hrp_public_rpc` | PASS |

## 4. Security posture

### 4.1 Effective privileges delta (DEC-08)

| Table | hrp_public_rpc before | hrp_public_rpc after |
|---|---|---|
| `labor_profiles` | SELECT, INSERT | SELECT, INSERT (unchanged) |
| `candidate_submissions` | INSERT | INSERT (unchanged) |
| `placement_case` | SELECT, INSERT | SELECT, INSERT (unchanged) |
| `referral_attributions` | SELECT, UPDATE | SELECT, UPDATE (unchanged) |
| `labor_profile_handling_assignments` | INSERT only | **SELECT, INSERT** (added: SELECT) |

No UPDATE/DELETE/ALL/PUBLIC/TRIGGER/REFERENCES/TRUNCATE on any table for `hrp_public_rpc`. No RLS policy changes. No role-attribute changes. Advisory lock: `pg_advisory_xact_lock(hashtextextended(...))` — only this RPC takes it; other writers are outside the guarantee.

### 4.2 Advisory lock semantics

- **Mode**: transaction-scoped (`pg_advisory_xact_lock`) — auto-releases at commit/rollback.
- **Key**: `hashtextextended('AFF05A_R1:' || v_lp_id, 0)` — fixed key prefix + LP ID.
- **Blocking semantics**: `pg_advisory_xact_lock` waits indefinitely for the lock if a competing session already holds it. PostgreSQL does NOT default to NOWAIT or a bounded timeout. The lock is released only on COMMIT/ROLLBACK of the holding transaction or a crash. A function holding this lock can therefore block on another canonical call indefinitely under contention.
- **EXECUTE**: confirmed effective via `has_function_privilege` query (PostgreSQL built-in, always available to all roles).
- **Non-participating writers**: manager tools, staff intake, old function versions, and any writer that does not explicitly take this lock are outside the serialization guarantee. Unique constraints remain the backstop.
- **Crash recovery**: if a connection crashes mid-transaction without a clean ROLLBACK, the advisory lock can be held until the session terminates and PostgreSQL cleans up. The backfill lock uses `pg_try_advisory_xact_lock(0)` (try-mode) to fail fast on contention rather than block the migration.

### 4.3 What was NOT changed

- `prisma/schema.prisma` — unchanged.
- No RLS policies added/modified on any table.
- No role attributes changed (BYPASSRLS, LOGIN, etc.).
- No new roles created.
- No production credentials used; synthetic DB only.
- No production migration applied; migration file ships, T0 applies separately.

## 5. Known limits and BLOCKED states

| Condition | Result | Reason |
|---|---|---|
| `DATABASE_URL_TEST` absent | `ENV_BLOCKED` (CI_INTEGRATION_STRICT=1 → exit 1) | Guarded by `integration-preflight.mjs` |
| `DATABASE_URL_TEST` = dev/prod URL | `INTEGRATION_REFUSED` | Same guard |
| All AFF-05A-R1 target tests skipped | `BLOCKED`, not PASS | Per RQ-08 |
| Advisory-lock EXECUTE absent | STOP — not authorized by this contract | Per §4.4 |

## 6. Dedication and attribution

- **Synthetic DB**: `aff05a_r1_test` on PostgreSQL 18.6 (localhost:5432). Created by T1B for this task. Never connects to dev/prod.
- **No production data**: all identities are synthetic (`${runId}`, `${randomUUID().slice(0,8)}`).
- **No PII**: zero real names, phones, or CCCDs in fixtures or logs.

## 7. Handoff to T0

**T0 action required**: Run independent Tier 3 LIGHT audit on the implementation SHA.

**Tier 3 LIGHT scope** (per TASK §0):
- Migration body: advisory lock, 168h deadline, preservation logic, atomic backfill.
- Privilege delta: exactly SELECT added on handling table.
- Integration tests: AC-01 through AC-07, verify non-skipped.
- Clean chain: catalog assertions.
- Diff: stays in allowlist.
- No production credentials or data used.

**Not in scope for T3 LIGHT**:
- Production preflight/merge/apply (separate T0 gate after T3).
- AFF-04 ordering (separate decision).

## 8. Production gate reminder

Per TASK §4.5 and RQ-05: production aggregate preflight (read-only, no PII) runs as a separate T0 gate after Tier 3 LIGHT and before merge/apply. T0 reviews:
- Total `source='AFF_INITIAL' AND expires_at IS NULL` count.
- Breakdown by status.
- Overdue/not-yet-due from `starts_at + 168h`.
- NULL/future starts, inconsistent history.
- T0 explicitly approves data impact before merge/apply.

T0 also resolves `OQ-01` (DEC-06/07 approval) and `OQ-02` (AFF-04 ordering) before merge.
