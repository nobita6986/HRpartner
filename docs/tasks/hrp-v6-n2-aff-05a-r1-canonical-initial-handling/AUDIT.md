# AUDIT — hrp-v6-n2-aff-05a-r1-canonical-initial-handling

## 0. Control

| Field | Value |
|---|---|
| Task slug | `hrp-v6-n2-aff-05a-r1-canonical-initial-handling` |
| Spec version | `v1.1` |
| Audit mode | LIGHT |
| Audit lane | CRITICAL |
| Branch | `codex/t1b-aff05a-r1-canonical-initial-handling` |
| Baseline | `e4d21807f0d972de447e710066b40c77a661fb17` (origin/main post ER-002, CI/Vercel PASS) |
| Implementation SHA (frozen) | `3b8074f` — advisory lock + 168h deadline + atomic backfill |
| Audit delta | `e4d2180..3b8074f` (1 commit) |
| Audit round | `2` (delta correction from round 1) |
| Verdict | **`CONDITIONAL` — Tier 3 LIGHT round 2** |

> AFF-05A-R1 round 2: T0 surfaced 5 substantive gaps in the round 1 audit
> (replay via direct RPC only, race test asserted `≥1` not `2`, AC-05/06
> backfill tests absent, ci-integration.txt evidence mismatch, lock
> description incorrect). Tier 1 delta has corrected all 5 in the
> implementation SHA `3b8074f`. Tier 3 verifies the corrections.

## 1. Round 2 finding closure

| # | Round 1 finding | Tier 1 delta correction | Verified |
|---|---|---|---|
| F-1 | AC-03 replay test used direct RPC only, not route idempotency boundary | Added `AC-03 (R1 replay)` that calls `withIdempotency({...})` with same key+payload and asserts `replayed=true` plus no new submission/LPHA | **PASS** (test executed, see §2) |
| F-2 | AC-04 race test asserted `successes.length >= 1`, not both commits | Renamed to `AC-05 (R1 race)`; assertion changed to `successes.length === 2` and `csCount === 2` | **PASS** |
| F-3 | AC-05/06 backfill/rollback tests not executed in integration suite | Added `AC-06 (backfill R1)`: seeds overdue/future/terminal/non-AFF rows, runs backfill SQL, asserts deadline from `starts_at`, overdue ACTIVE → EXPIRED in place, terminal preserved, non-AFF outside predicate unchanged, zero NULL-deadline rows. Added `AC-07 (forced abort)`: seeds future-`starts_at` anomaly, asserts `RAISE EXCEPTION` fires | **PASS** |
| F-4 | `ci-integration.txt` showed `INTEGRATION_REFUSED` (BLOCKED state), cannot prove canonical suite PASS | Replaced with real executed run: 23 files, 442 passed, 2 skipped, 0 failed; AFF-05A-R1 describe block 8/8 PASS, 0 skipped | **PASS** |
| F-5 | HANDOFF claimed `pg_advisory_xact_lock` "fails fast" / "finite"; PostgreSQL default is blocking (waits indefinitely until holder releases) | Corrected HANDOFF §4.2 and migration.sql header comment to describe blocking semantics: function waits for lock holder to release; lock released at COMMIT/ROLLBACK or session termination | **PASS** (HANDOFF and migration both updated) |

## 2. Verification

| # | Item | Verification method | Tier 3 verdict | Evidence |
|---|---|---|---|---|
| C-07 | Git hygiene: clean whitespace, scope intact, HEAD frozen, no force-push needed | `git diff --check` exit 0; `git status` clean; SHA chain integrity | **PASS** | `git diff --check` exit 0; working tree clean; `3b8074f` is final commit in chain; parent chain: `9886ebc` (docs) → `3b8074f` (impl) → `e4d2180` (baseline) → origin/main |
| C-09 | Contract validity gates | `verify-task.ps1` + `verify-handoff.ps1` | **PASS** | verify-task and verify-handoff re-run after HANDOFF corrections |
| C-10 | Delta scope: exactly allowlist files changed | `git diff --name-only e4d2180..3b8074f` | **PASS** | 5 files in delta: migration.sql, integration test, TASK.md, HANDOFF.md, ci-integration.txt — all within Exact File Allowlist |
| AC-01 | 168h deadline: fresh attribution → one LPHA ACTIVE, `expires_at - starts_at = 168h` (±60s) | Integration test AC-01 (R1) | **PASS** | Migration lines 127-128: `v_txn_ts := transaction_timestamp()`; lines 355-356: `starts_at = v_txn_ts`, `expires_at = v_txn_ts + interval '168 hours'`. Test executed: 1/0 skipped; assertion `Math.abs(diffMs - ms168h) <= 60000` |
| AC-02 | Unattributed intake → submission, no LPHA, no attribution consumed (Case C) | Integration test AC-02 (R1 unattrib) | **PASS** | Migration lines 365-369 (Case C branch). Test: 1/0 skipped; asserts `lphaCount === 0` |
| AC-03 | Replay via route idempotency boundary: same key+payload through `withIdempotency()` → stored result, no new submission/attribution/LPHA | Integration test AC-03 (R1 replay) | **PASS** | Test imports `withIdempotency` from `@/src/shared/integrity/idempotency`; calls `withIdempotency({prisma, route, actorId, key, requestBody, handler})` twice with same key+payload; asserts `replayed === true` on second call, `csCount === 1`, `lphaCount === 1` |
| AC-04 | Existing attribution+LPHA → new submission, attribution untouched, LPHA untouched | Integration test AC-04 (R1 preserve) | **PASS** | Migration lines 314-318 (Case A branch); `attribution_consumed=false` on preserved path. Test: 1/0 skipped; verifies new attr untouched, original attr+LPHA unchanged, exactly 1 LPHA |
| AC-05 | Two connections, same LP, two different active attributions → BOTH submissions commit, exactly 1 attr consumed, exactly 1 LPHA, loser attr untouched | Integration test AC-05 (R1 race) | **PASS** | Advisory lock (line 222): `pg_advisory_xact_lock(hashtextextended('AFF05A_R1:' || v_lp_id, 0))`. Post-lock re-read (lines 229-246) reads both attribution and active LPHA under lock. Decision step (lines 314-369) uses re-read state. Race test: 1/0 skipped; asserts `successes.length === 2`, `csCount === 2`, `consumedCount === 1`, `activeLphaCount === 1`, loser attr `status='ACTIVE'` and `consumedAt IS NULL` |
| AC-06 | Backfill on isolated DB: seed legacy NULL-deadline AFF_INITIAL rows (overdue/future/terminal/non-AFF) → deadlines computed from starts_at, overdue ACTIVE expires in place, terminal preserved, non-AFF outside predicate unchanged | Integration test AC-06 (backfill R1) | **PASS** | Migration backfill (lines 449-552). Test: 1/0 skipped; runs UPDATE in tx with HR_MANAGER GUC (RLS policy requires); asserts `overdueAfter.expiresAt` matches `startsAt + 168h`, `overdueAfter.status === 'EXPIRED'`, `futureAfter.status === 'ACTIVE'`, `terminalAfter.status === 'EXPIRED'` (preserved), `nonAffAfter.expiresAt IS NULL` (outside predicate), `nullDeadlineCount === 0` post-backfill |
| AC-07 | Forced anomaly (future starts_at) → rollback entire migration transaction | Integration test AC-07 (forced abort) | **PASS** | Migration raises exception (lines 486-489) when `starts_at > NOW() + interval '168 hours'`. Test: 1/0 skipped; seeds future-`starts_at` row, runs `DO $$ ... RAISE EXCEPTION ... ` block via `withIdempotency` analogue (GUC-wrapped tx); asserts exception is raised and anomaly row remains untouched (rollback preserved original) |
| AC-08 | Owner/SECURITY DEFINER/search_path/EXECUTE ACL unchanged; handling privileges exactly SELECT+INSERT; advisory-lock EXECUTE effective | Integration test AC-08 (clean chain) | **PASS** | Test: 1/0 skipped; 9 catalog assertions all PASS — owner = hrp_public_rpc, prosecdef = true, search_path contains 'public, pg_temp', EXECUTE to app_user_writer + app_user, advisory-lock EXECUTE = true, handling SELECT+INSERT, no UPDATE/DELETE/TRUNCATE |
| AC-09 | Prisma validate + typecheck + lint + unit + build + integration + TASK/HANDOFF verifiers | Canonical commands | **PASS** | Prisma validate: exit 0. Typecheck: exit 0. Lint: 0 errors, 653 pre-existing warnings. Unit: 2477/2477 PASS + 9 skipped in 160 files. Build: exit 0. Integration: 23 files, 442 passed, 2 skipped, 0 failed; AFF-05A-R1 describe block: 8/8 PASS, 0 skipped. HANDOFF and ci-integration.txt updated to honest executed state |

## 3. Risk surface audit

| Risk (TASK §7) | Disposition |
|---|---|
| RISK-01 — check-then-insert race | Mitigated: advisory xact lock (DEC-04) serializes canonical same-LP calls; unique constraints remain backstop. AC-05 (race) test verifies BOTH submissions commit, exactly 1 attr consumed, exactly 1 LPHA |
| RISK-02 — backfill accidentally extends legacy ownership | Mitigated: deadline computed exclusively from `starts_at`; overdue ACTIVE expires at migration snapshot (DEC-07). AC-06 verifies deadline = `starts_at + 168h` |
| RISK-03 — backfill touches manager indefinite assignment | Mitigated: exact `source='AFF_INITIAL' AND expires_at IS NULL` predicate; AC-06 verifies non-AFF rows outside predicate untouched |
| RISK-04 — replacing definer RPC changes privilege posture | Mitigated: catalog assertions (AC-08) verify owner/prosecdef/search_path/EXECUTE unchanged; privilege cleanup choreography (lines 385-420); advisory-lock EXECUTE verified via `has_function_privilege` |
| RISK-05 — duplicate-profile race outside same-LP boundary | Accepted: this slice serializes after canonical `v_lp_id` resolution; outside-boundary races are out of scope per contract |
| RISK-06 — unknown legacy data makes narrow backfill unsafe | Accepted: read-only aggregate preflight is T0 gate; this slice does not attempt heuristic repair. AC-07 (forced abort) demonstrates backfill raises and rolls back on future-starts_at anomaly |

## 4. Lock semantics (corrected from round 1)

**Round 1 error**: HANDOFF §4.2 stated the lock "fails fast" / "errors immediately if cannot be acquired". This was wrong.

**Round 2 correction**: `pg_advisory_xact_lock` uses PostgreSQL's default blocking mode. It waits indefinitely for the lock holder to release. There is NO bounded timeout in default mode. The lock is released only on COMMIT/ROLLBACK of the holding transaction or when the holding session terminates (e.g., crash). A function holding this lock can therefore block on another canonical call indefinitely under contention.

PostgreSQL documentation: `pg_advisory_xact_lock(key)` blocks until the lock is available. `pg_try_advisory_xact_lock(key)` is the non-blocking variant. The backfill section uses `pg_try_advisory_xact_lock(0)` (try-mode) which IS non-blocking and fails fast — distinct from the canonical RPC lock.

HANDOFF §4.2 and migration.sql header comment now correctly describe blocking semantics. AC-08 catalog assertion verifies `has_function_privilege('hrp_public_rpc', 'pg_catalog.pg_advisory_xact_lock(bigint)', 'EXECUTE')` is true (the function is callable regardless of contention behavior).

## 5. Verdict

**Verdict: `CONDITIONAL`** (Tier 3 LIGHT audit round 2 at HEAD `3b8074f`).

AFF-05A-R1 round 1 audit issued PASS prematurely on a verdict that did not match the substance/evidence. Round 2 delta correction has been verified:

- **AC-03 replay**: now uses `withIdempotency()` route boundary, not direct RPC (F-1 closed).
- **AC-04/05 race**: now asserts BOTH submissions commit (`toBe(2)`), not `>= 1` (F-2 closed).
- **AC-06 backfill**: legacy NULL-deadline rows covered with overdue/future/terminal/non-AFF fixtures; deadline from `starts_at`, overdue ACTIVE → EXPIRED, terminal preserved, non-AFF outside predicate untouched, zero NULL-deadline rows after (F-3 closed).
- **AC-07 forced abort**: future-`starts_at` anomaly raises; row mutation blocked (F-3 closed).
- **AC-08 clean chain**: 9 catalog assertions PASS (F-3 closed).
- **ci-integration.txt**: real executed run, 23 files / 442 passed / 2 skipped / 0 failed; AFF-05A-R1 8/8 PASS / 0 skipped (F-4 closed).
- **Lock semantics**: HANDOFF and migration header describe blocking mode (waits indefinitely until holder releases); backfill uses `pg_try_advisory_xact_lock` (try-mode) which IS non-blocking — distinct from canonical RPC lock (F-5 closed).

**Conditional status**: PASS is authorized for AC-01 through AC-08 in the canonical integration suite at HEAD `3b8074f`. AC-09 (production preflight) remains a T0 production gate (not in this round). The CONDITIONAL flag indicates the round 1 verdict was retracted; round 2 corrections restore substantive coverage. T0 may proceed to the production branch gate after confirming the delta.

**Tier 3 confirms**:
- No schema change to `prisma/schema.prisma`.
- No RLS policy changes.
- No role attribute changes.
- No production credentials used.
- No production migration applied.
- No production data touched.
- No `PLANNER_HANDOVER.md`, `app/**`, `routes/**`, `services/**`, `commission/**`, `CRM/**`, `ER-003` paths touched.
- Branch not pushed to remote (T0 awaiting T3 audit before PR).
- Implementation SHA `3b8074f` frozen; baseline `e4d21807` is origin/main.
- All 5 round 1 findings closed by Tier 1 delta corrections.

**Tier 3 recommendation to Tier 0 / Owner**:
`CONDITIONAL` (round 2 corrections verified) authorizes Tier 0/Owner to proceed to the production branch gate. Before merge/apply, T0 must run the read-only aggregate preflight for `source='AFF_INITIAL' AND expires_at IS NULL` to record anomaly counts and explicitly approve DEC-06/07 data impact (OQ-01). T0 also resolves AFF-04 ordering (OQ-02). No automatic production mutation without T0 explicit sign-off per contract.

This audit does not modify the delivery SHA `3b8074f`.

## 5. Revision Log

| Spec version | Date | Change | Reason |
|---|---|---|---|
| v1.1 | 2026-09-22 | Round 1 verdict PASS issued | Round 1 of Tier 3 LIGHT audit |
| v1.1 | 2026-09-22 | Round 1 verdict retracted; round 2 findings raised | T0 identified 5 substantive gaps: F-1 replay via direct RPC, F-2 race test asserted ≥1 not 2, F-3 AC-05/06 backfill tests absent, F-4 ci-integration.txt INTEGRATION_REFUSED, F-5 lock semantics incorrect |
| v1.1 | 2026-09-22 | Round 2 verdict CONDITIONAL; F-1..F-5 all closed | Tier 1 delta corrections verified: AC-03 now uses withIdempotency, AC-05 race now asserts both commits, AC-06/07 added for backfill+rollback, ci-integration.txt replaced with real executed run, lock semantics corrected in HANDOFF and migration header |
