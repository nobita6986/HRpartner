# TASK — hrp-v6-n2-aff-05a-r2-bounded-manager-assignment

## 0. Control

| Field | Value |
|---|---|
| Task slug | `hrp-v6-n2-aff-05a-r2-bounded-manager-assignment` |
| Assurance lane | `CRITICAL` |
| Audit mode | `LIGHT` |
| Audit reason | Forward-only production migration plus route/service validation at the HandlingAssignment ownership boundary. |
| Work type | `FEATURE_EXPANSION` |
| Spec version | `v1.1` |
| Status | `READY_FOR_AUDIT` |
| Planner | `Tier 1A`; T0 substantive correction/approval |
| Execution owner | `Tier 1B` |
| Baseline | `825f763929e4a3026fc7b5d50436e216ef66da8c` (`origin/main`, post-#40 admin-managed phone link; `1e1895d1` is no longer main) |
| Authority | `docs/V6/aff_plan.md` v2.5; `docs/discovery/realignment/AFF05A_RESIDUAL_RECONCILIATION.md`; accepted W5 and AFF-05A-R1 evidence |
| In-scope roots | Exact File Allowlist at §4.5 |
| Forbidden paths | Every path outside §4.5; especially `docs/PLANNER_HANDOVER.md`, CRM, ER-003, dispute/case, `Ticket`, AFF-05B/commission, auth/global RLS, package/config and existing migrations |
| Required gates | `VERIFY_TASK`, `VERIFY_HANDOFF`, canonical quality/integration gates, migration clean/upgrade proof, `TIER3_LIGHT_AUDIT`, T0 production gate |
| Next gate | `TIER3_LIGHT_AUDIT` |
| Current execution round | `1` |
| Current audit round | `0` |
| Frozen implementation SHA | see HANDOFF §0 `Implementation SHA` (semantic commit on `codex/t1b-aff05a-r2-bounded-manager-assignment`) |

## 1. Outcome

Make every `MANAGER_ASSIGNMENT` finite and server-controlled: minimum 1 day, default 7 days, maximum 30 days. Preserve Company Pool as the derived state "no assignment effective at server time", preserve assignment history, and add a database backstop so direct SQL cannot create an indefinite manager assignment.

This slice does not create a Company Pool table, dispute/case model, commission behavior, or new authorization surface.

## 2. Evidence

### 2.1 Current source

| ID | Evidence | Finding |
|---|---|---|
| `EV-01` | `src/domains/talent/handling-assignment.service.ts` — `ManagerAssignInput`, `managerAssign`, `getActiveHandlingAssignment` | `days` is nullable and a falsy value produces `expiresAt = null`; server-clock expiry already treats a deadline equal to or earlier than `asOf` as inactive. |
| `EV-02` | `app/api/admin/labor-profiles/[id]/handling-assignments/route.ts` | Route currently coerces `days` through `Number()` and collapses missing, zero and explicit null into the same value. |
| `EV-03` | `app/admin/labor-profiles/[id]/handling-assignment-manager.tsx` | UI defaults to 7 but only declares `min=1`; UI validation is not authority. |
| `EV-04` | W5 and AFF-05A-R1 accepted evidence | RLS, at-most-one-active backstop, expiry semantics and initial 7-day assignment already exist and must not be reopened. |

### 2.2 T0 production read-only preflight — 2026-09-24

- Neon Control Plane mapped endpoint `ep-shy-tree-az32as2c` to primary branch `hrp-live` (`br-icy-dew-azbrgthw`); gate exit `0`.
- Credential inventory contained only the production admin tuple, so the gate used the same production endpoint for both URL inputs. This proves branch identity, not independent writer-credential posture. The full deploy gate must be rerun from the deployment environment before production migration.
- Aggregate query ran inside `BEGIN READ ONLY` as `neondb_owner`; no PII or row identifiers were returned.

| Predicate | Count |
|---|---:|
| `MANAGER_ASSIGNMENT AND expires_at IS NULL` | `0` |
| target rows with `status = ACTIVE` | `0` |
| active target rows overdue at `starts_at + 7 days` | `0` |
| active target rows not yet due | `0` |
| terminal target rows | `0` |
| null `starts_at` anomaly | `0` |
| future `starts_at` anomaly | `0` |
| unknown status anomaly | `0` |

The zero-row snapshot authorizes implementation and synthetic migration proof. It is not an immutable production snapshot and does not authorize merge/deploy without a fresh T0 preflight.

## 3. Decisions

| ID | Decision | Status |
|---|---|---|
| `AFF05A-R2-DEC-01` | Manager assignment duration is integer days: min `1`, default `7`, max `30`. | `OWNER_APPROVED` |
| `AFF05A-R2-DEC-02` | Missing `days` property uses server default `7`; explicit `null`, strings, booleans, non-finite numbers, fractions, zero, negative and values above 30 are rejected without coercion. | `T0_APPROVED` |
| `AFF05A-R2-DEC-03` | Release to Company Pool remains a distinct action selected by absence of a valid `newAssigneeUserId`; it never creates a manager assignment. | `T0_APPROVED` |
| `AFF05A-R2-DEC-04` | Legacy target deadline is `starts_at + interval '7 days'`; only overdue `ACTIVE` rows become `EXPIRED`; terminal status/history remain unchanged. | `T0_APPROVED` |
| `AFF05A-R2-DEC-05` | Conditional DB CHECK uses `source IS DISTINCT FROM 'MANAGER_ASSIGNMENT' OR expires_at IS NOT NULL`. Prisma field remains nullable because this slice does not redefine other assignment sources. | `T0_APPROVED` |
| `AFF05A-R2-DEC-06` | Company Pool remains a query/projection, not a persisted pool state or table. | `T0_APPROVED` |

## 4. Contract

### 4.1 Route and service boundary

- Route constructs a manual allowlisted command object. Client input cannot set `startsAt`, `expiresAt`, `source`, status, actor, history links or previous assignment.
- For manager assignment, detect property presence rather than truthiness:
  - property absent → normalized duration `7`;
  - property present → value must be a finite integer in the inclusive range `1..30`;
  - no `Number()`, `parseInt` or silent clamping at the route/service boundary.
- Service independently validates the normalized duration and throws a typed domain error. Route maps duration validation to HTTP `400`; concurrency conflict remains HTTP `409`; unexpected errors remain generic and do not expose SQL/stack/data.
- Use one server `now` snapshot for expiry sweep, active lookup, transfer history and new `startsAt`/`expiresAt` calculation.
- Release remains `releaseHandlingAssignment`; release payload does not need `days` and cannot reach `managerAssign`.

### 4.2 Company Pool and concurrency

- A deadline equal to or earlier than server `now` is ineffective immediately even if the sweep job is late.
- Reassignment keeps `previousAssignmentId` and terminalizes the prior active row as `TRANSFERRED` in the same transaction.
- Existing at-most-one-active DB protection remains unchanged. Concurrent manager commands produce one active winner; the loser returns a typed conflict and must not leave duplicate active/history side effects.
- Existing Company Pool/read-service behavior is carry-forward evidence; production read-service code is not modified in this slice.

### 4.3 Forward-only migration

- Add exactly one new migration; never edit historical migrations.
- Run in an explicit transaction with a bounded lock timeout before lock-waiting operations.
- Revalidate current rows under the migration lock; the earlier aggregate preflight is impact evidence only.
- Fail closed before mutation if a target has null/future `starts_at`, unknown status, invalid cardinality/history, or another condition outside the safe predicate.
- Narrow target predicate:

```sql
source = 'MANAGER_ASSIGNMENT'
AND expires_at IS NULL
AND starts_at IS NOT NULL
```

- Set `expires_at = starts_at + interval '7 days'` for every target.
- Change status only when `status = 'ACTIVE'` and the derived deadline is elapsed; then set `EXPIRED`. Preserve `COMPLETED`, `REVOKED`, `TRANSFERRED` and already terminal history.
- Add and validate the conditional CHECK from `AFF05A-R2-DEC-05`; assert zero remaining indefinite manager rows.
- Do not change RLS, grants, roles, default privileges, SECURITY DEFINER functions, other source rows or Prisma nullability.

### 4.4 Non-goals

- No AFF-05A-R3 dispute/case and no `Ticket` change.
- No AFF-05B/commission or CRM/ER-003 change.
- No Company Pool table/state, scheduler, new permission, or global auth/RLS work.
- Real CCCD upload is not a coding gate and no real PII is used in development evidence.

### 4.5 Exact Implementation File Allowlist

1. `src/domains/talent/handling-assignment.service.ts`
2. `src/domains/talent/handling-assignment.service.test.ts`
3. `app/api/admin/labor-profiles/[id]/handling-assignments/route.ts`
4. `app/api/admin/labor-profiles/[id]/handling-assignments/route.test.ts` (new)
5. `app/admin/labor-profiles/[id]/handling-assignment-manager.tsx`
6. `prisma/migrations/20260924170000_aff05a_r2_bounded_manager_assignment/migration.sql` (new; main already has 20260924150000 + 20260924160000, so 20260924140000 is invalid as a forward-only timestamp)
7. `tests/db/aff05a-r2-bounded-manager-assignment.integration.test.ts` (new)
8. `vitest.integration-files.ts`
9. `docs/tasks/hrp-v6-n2-aff-05a-r2-bounded-manager-assignment/**`

`prisma/schema.prisma`, package/config files, existing migrations and every other path are forbidden unless T0 approves a named delta before the edit.

## 5. Execution Plan

| Step | Work | Stop condition |
|---|---|---|
| `STEP-01` | Reconfirm baseline, current partial unique index, route/service call path and production-free synthetic DB posture. | Stop on drift that changes the decisions or requires an out-of-allowlist path. |
| `STEP-02` | Implement typed duration validation, exact route normalization, single-time snapshot and UI min/default/max. | Stop if authorization/RLS/global error framework must change. |
| `STEP-03` | Add the one forward-only migration and fail-closed clean/upgrade-path evidence. | Stop on any legacy row outside the safe predicate; do not broaden the update. |
| `STEP-04` | Add route/service/DB/concurrency regressions and run all canonical gates. | No skipped target test; missing/refused DB is BLOCKED. |
| `STEP-05` | Freeze implementation SHA, write HANDOFF and request Tier 3 LIGHT audit. | No push/PR/merge/deploy before audit PASS and T0 authorization. |

## 6. Acceptance

### 6.1 Requirements

| ID | Requirement |
|---|---|
| `RQ-01` | Manager duration is server-normalized to integer `1..30`, default `7` only when absent, with no coercion. |
| `RQ-02` | Release and Company Pool semantics remain separate and server-clock correct. |
| `RQ-03` | Legacy indefinite manager rows are upgraded narrowly and safely; terminal history is preserved. |
| `RQ-04` | DB rejects every new indefinite `MANAGER_ASSIGNMENT` without changing other sources or security posture. |
| `RQ-05` | Concurrent manager assignments leave exactly one active winner and complete history. |
| `RQ-06` | Diff and evidence remain inside the exact allowlist and pass canonical gates. |

### 6.2 Acceptance criteria

| AC | RQ | Pass condition | Verification method |
|---|---|---|---|
| `AC-01` | `RQ-01` | Route and service accept `1`, absent→`7`, `30`; reject explicit null, string, boolean, NaN/Infinity, fraction, zero, negative and `31`; route returns typed `400`. | `npx vitest run --config vitest.unit.config.ts "app/api/admin/labor-profiles/[id]/handling-assignments/route.test.ts" src/domains/talent/handling-assignment.service.test.ts` |
| `AC-02` | `RQ-02` | Release never enters manager assignment; elapsed assignment is ineffective once its deadline is equal to or earlier than `now`; Company Pool carry-forward remains green. | Targeted unit command above plus `npx vitest run --config vitest.unit.config.ts src/domains/talent/labor-profile.read-service.test.ts` |
| `AC-03` | `RQ-03` | Predecessor→candidate upgrade sets exact 7-day deadline, expires only overdue ACTIVE, preserves all terminal/non-target rows, and fails/rolls back on anomaly. | `$env:CI_INTEGRATION_STRICT='1'; npm run test:integration`; inspect the isolated predecessor/rollback assertions emitted by `tests/db/aff05a-r2-bounded-manager-assignment.integration.test.ts`. |
| `AC-04` | `RQ-04` | Catalog shows validated CHECK; violating manager insert fails; permitted non-manager nullable deadline remains unchanged; RLS/grants/index posture has zero drift. | `$env:CI_INTEGRATION_STRICT='1'; npm run test:integration`; inspect catalog/negative SQL assertions from the task DB file. |
| `AC-05` | `RQ-05` | Two independent connections racing on one LaborProfile yield one active winner, one typed conflict and no duplicate side effect/history corruption. | `$env:CI_INTEGRATION_STRICT='1'; npm run test:integration`; inspect the two-connection case and committed-row counts. |
| `AC-06` | `RQ-06` | Clean chain and upgrade chain pass; targeted tests have zero skip/fail; changed paths equal §4.5. | `CI_INTEGRATION_STRICT=1 npm run test:integration` in CI plus explicit migration-chain and changed-path evidence in HANDOFF. |
| `AC-07` | `RQ-01`–`RQ-06` | Prisma validate, typecheck, lint, full unit, build, canonical integration, task/handoff verification and whitespace/scope gates all pass or disclose baseline-equivalent warnings exactly. | Run the §6.4 commands, including `git diff --check 825f763929e4a3026fc7b5d50436e216ef66da8c..HEAD`, and record exit codes/counts in HANDOFF. |

### 6.3 Traceability

| Requirement | Steps | Acceptance |
|---|---|---|
| `RQ-01` | `STEP-02`, `STEP-04` | `AC-01`, `AC-07` |
| `RQ-02` | `STEP-02`, `STEP-04` | `AC-02`, `AC-07` |
| `RQ-03` | `STEP-03`, `STEP-04` | `AC-03`, `AC-06` |
| `RQ-04` | `STEP-03`, `STEP-04` | `AC-04`, `AC-06` |
| `RQ-05` | `STEP-02`, `STEP-04` | `AC-05`, `AC-06` |
| `RQ-06` | all | `AC-06`, `AC-07` |

### 6.4 Canonical verification commands

Lanes are explicitly partitioned so the operator never confuses Quality with
Integration. `npm run build` belongs to the Quality lane; the Integration lane
runs only `npx vitest run --config vitest.integration.config.ts` (via
`scripts/ci/integration-preflight.mjs`) and never `next build`. All commands
must be run from the worktree root.

Quality lane (no DB):

```powershell
npx prisma validate
npx prisma generate
npx tsc --noEmit
npm run lint
npm run build
npx vitest run --config vitest.unit.config.ts
```

Integration lane (DB-touching, fail-closed; requires dedicated test DB):

```powershell
$env:CI_INTEGRATION_STRICT = '1'; npm run test:integration
```

Documentation and scope gates:

```powershell
& .\.ai-pipeline\scripts\verify-task.ps1 -TaskPath docs/tasks/hrp-v6-n2-aff-05a-r2-bounded-manager-assignment/TASK.md
& .\.ai-pipeline\scripts\verify-handoff.ps1 -TaskPath docs/tasks/hrp-v6-n2-aff-05a-r2-bounded-manager-assignment/TASK.md -HandoffPath docs/tasks/hrp-v6-n2-aff-05a-r2-bounded-manager-assignment/HANDOFF.md
git diff --check 825f763929e4a3026fc7b5d50436e216ef66da8c..HEAD
git diff --name-only 825f763929e4a3026fc7b5d50436e216ef66da8c..HEAD
```

## 7. Risk

| Risk | Control |
|---|---|
| Input coercion reintroduces indefinite or unintended duration | Property-presence check, strict number/integer/range validation at route and service, conditional DB CHECK. |
| Preflight becomes stale before deploy | Re-run production gate/aggregate after CI/Tier 3 and revalidate under migration lock. |
| Concurrent managers corrupt history | Same transaction, existing unique backstop, two-connection regression and typed conflict. |
| Migration updates unrelated rows | Exact predicate, anomaly guards, post-assertions and rollback proof. |
| Lock blocks production | Bounded lock timeout and T0-only deploy window. |

## 8. Open Questions

None. Production deployment remains a gate, not an open design decision.

## 9. Planner Resolution

| Round | Decision | Reason |
|---|---|---|
| 1 | `PROPOSED_ONLY` | Tier 1A initial contract draft. |
| 2 | `READY_FOR_EXECUTION` | T0 corrected exact input semantics, migration predicate/backstop, allowlist, concurrency evidence and production-gate wording. Owner policy `1/7/30` is resolved; production aggregate preflight returned zero target/anomaly rows. |

## 10. Revision Log

| Spec | Date | Change |
|---|---|---|
| `v1.1` | 2026-09-24 | T0 substantive correction and execution approval; exact allowlist/AC, strict no-coercion boundary, migration safety and read-only production preflight evidence. |
| (T0 alignment) | 2026-09-24 | T0 alignment correction at execution start (semantic contract 1/7/30 unchanged): baseline `1e1895d1` -> `825f7639` (origin/main post-#40); migration directory `20260924140000` -> `20260924170000` because main already has `20260924150000` + `20260924160000`. Re-aligned allowlist and Revision Log row. No business-semantics change. |
| (T0 correction batch) | 2026-09-24 | T0 correction batch after review of HEAD `f5136080a468389eeeffe99cc8d2ad6004b43f8d` (semantic contract 1/7/30 unchanged): (a) TASK.md mojibake restored (`—` `→` `"` `"` `–` `§`); (b) `pg_constraint` lookups in migration AND integration test bind `conrelid = 'public.labor_profile_handling_assignments'::regclass AND contype = 'c'` with negative scoping test; (c) integration test rewrites upgrade-path to a real predecessor (pruned migrations tree, NOT apply-all + DROP); (d) AC-05 race added as a real two-connection test (one ACTIVE winner, typed conflict on loser, no duplicate row, no orphan history); (e) AC-03 evidence uses exact 7-day deadline measurement; (f) AC-07 scope command pins baseline `825f7639`; (g) Status `READY_FOR_EXECUTION` -> `READY_FOR_AUDIT`, Next gate `T1B_IMPLEMENTATION` -> `TIER3_LIGHT_AUDIT`, Current execution round `0` -> `1` (these control field changes require §9/10 entry per T-07). No business-semantics change. |
| `v1.0` | 2026-09-24 | Tier 1A initial `PROPOSED_ONLY` contract. |
