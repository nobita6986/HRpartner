# TASK — hrp-v6-w5-handling-assignment-safety

## 0. Control

| Field | Value |
|---|---|
| Task slug | `hrp-v6-w5-handling-assignment-safety` |
| Work type | `CODE` |
| Assurance lane | `CRITICAL` |
| Audit mode | `LIGHT` |
| Audit reason | RLS, forward-only migration, and HandlingAssignment lifecycle transitions protect recruiting responsibility and downstream commission evidence. |
| Spec version | `v1.0` |
| Status | `ACCEPTED` |
| Planner | `Tier 1` |
| Baseline | `a49ceaa83ffa986bf939823a4e9f2c803a0649d6` (post-rebase; checkpoint at `b707936` on `t1b-w5-checkpoint` branch) |
| Implementation SHA | `5f4569e8183ca61fff9550f007ac0a1d2c0d10a2` |
| Tier 3 LIGHT verdict | `PASS` (round 1; findings none) |
| Current execution round | `1` |
| Current audit round | `1` |
| Next gate | `NONE — task ACCEPTED` |

## 1. Outcome

### 1.1 User-visible outcome

- Reassigning a profile whose persisted `ACTIVE` assignment is already past `expiresAt` succeeds without a false P2002 conflict and records the old row as `EXPIRED`.
- Manual release records `REVOKED`, preserving the distinction from natural expiry.
- `labor_profile_handling_assignments` is protected by forced RLS: managers administer assignments, assignees can read only their own rows, and missing/unrelated context is denied.

### 1.2 Non-goals

- No UI/API/auth refactor, scheduler, commission/beneficiary logic, optimistic locking, placement-case remodel, or production migration/deploy.
- No change to public AFF RPC ownership or anonymous grants.

## 2. Evidence

| ID | Evidence | Why it matters |
|---|---|---|
| `EV-01` | Owner brief plus current `handling-assignment.service.ts` and AFF-05A migration | Confirms the three defects against the latest main baseline without importing T1A discovery docs. |
| `EV-02` | `handling-assignment.service.ts` manager/release call path | Shows lazy read expiry currently returns null without changing the unique-index predicate row. |
| `EV-03` | `20260918000000_aff05a_labor_profile_handling_assignment/migration.sql` | Shows partial unique index on persisted `status='ACTIVE'` and no RLS. |
| `EV-04` | AFF-03B/C container integration precedent | Establishes dedicated-test-DB, runtime-role, negative-boundary, and no-production-DB evidence pattern. |

## 3. Decisions

| ID | Decision | Status |
|---|---|---|
| `DEC-01` | Close F-1/F-2/F-3 in one bounded slice because they share one table/service and one DB integration fixture. | `CHOSEN` |
| `DEC-02` | Materialize elapsed rows with `ACTIVE → EXPIRED` inside the same transaction before assign/release; keep partial unique index unchanged. | `CHOSEN` |
| `DEC-03` | Manual release uses `ACTIVE → REVOKED`; transfer remains `ACTIVE → TRANSFERRED`. | `CHOSEN` |
| `DEC-04` | RLS SELECT: `ADMIN/HR_MANAGER` all rows; `HR_STAFF/CTV` only rows where `assignee_user_id = app.user_id`. INSERT/UPDATE: `ADMIN/HR_MANAGER` only. No DELETE policy. | `CHOSEN` |
| `DEC-05` | Existing `hrp_public_rpc` remains unchanged; its current `BYPASSRLS` authority and explicit INSERT grant preserve public intake. | `CHOSEN` |

## 4. Contract

### 4.1 Requirements

| ID | Requirement |
|---|---|
| `RQ-01` | Add a forward-only migration that enables and forces RLS, grants only required table privileges, and creates least-privilege policies for current manager and assignee semantics. |
| `RQ-02` | Before manager assign/release, persist all elapsed `ACTIVE` rows for the profile as `EXPIRED` using server time. |
| `RQ-03` | Manager assign transfers a still-valid active row or creates after expiry without false P2002; history links to the valid transferred row only. |
| `RQ-04` | Manual release persists `REVOKED`; naturally elapsed rows remain `EXPIRED`. |
| `RQ-05` | Unit/static and dedicated-DB integration tests prove lifecycle and RLS positive/negative cases without production credentials or PII. |

### 4.2 Scope boundaries

- **In:** HandlingAssignment service/tests, one additive migration, one W5 DB integration test and its registration, own task artifacts.
- **Out:** routes/UI, other domains, shared auth, production apply, deployment, merge, planner/discovery/CRM docs.
- **Allowed task artifacts:** `docs/tasks/hrp-v6-w5-handling-assignment-safety/**`.

### 4.3 Domain boundaries

- **Data/state:** `ACTIVE → EXPIRED` only when `expiresAt <= now`; `ACTIVE → REVOKED` only for manual release; `ACTIVE → TRANSFERRED` for reassignment.
- **Permission/security:** deny by default without valid GUC; managers administer; assignees read only their rows; no anonymous policy.
- **Interface/API:** no response or route contract changes.
- **Migration/rollback:** forward-only metadata/policy migration, no row rewrite; rollback before production is branch revert, after apply requires a separately reviewed compensating migration. Owner applies production migration only after merge/go-live gate.

## 5. Execution Plan

| Step | Target | Intent | Verify | Stop condition |
|---|---|---|---|---|
| `STEP-01` | migration + static test | Add forced RLS and exact policies/grants. | `AC-01`, `AC-05` | Stop if current runtime principal or public RPC would lose required access. |
| `STEP-02` | service + unit tests | Sweep elapsed state and correct release semantics. | `AC-02`, `AC-03` | Stop if state authority contradicts V7 canonical rules. |
| `STEP-03` | DB integration test | Prove RLS isolation and expired-reassign/release behavior on dedicated DB. | `AC-04`, `AC-05` | `ENV_BLOCKED` if dedicated test DB is absent; never fall back to dev/prod. |
| `STEP-04` | task handoff/audit | Run gates, write HANDOFF, request independent LIGHT audit, resolve findings. | `AC-06` | No commit/push/PR until blocking findings are resolved. |

## 6. Acceptance

### 6.1 Acceptance criteria

| AC | Pass condition | Verification method |
|---|---|---|
| `AC-01` | Migration contains ENABLE+FORCE RLS, explicit grants, manager write policies, assignee-scoped SELECT, and no public/DELETE policy. | Static boundary test + SQL review. |
| `AC-02` | Assign with an elapsed persisted ACTIVE row marks it EXPIRED then creates one ACTIVE row without P2002. | Unit + dedicated DB integration test. |
| `AC-03` | Manual release changes a valid ACTIVE row to REVOKED; elapsed release marks EXPIRED and returns null. | Unit + dedicated DB integration test. |
| `AC-04` | ADMIN/HR_MANAGER can manage; own HR_STAFF/CTV can SELECT; unrelated/missing context cannot read or mutate. | Dedicated DB integration test using writer role and transaction-local GUCs. |
| `AC-05` | Prisma validation, typecheck, lint, full unit, build, and integration lane complete or integration is explicitly ENV_BLOCKED. | Canonical repo commands recorded in HANDOFF. |
| `AC-06` | Diff stays inside allowlist; TASK/HANDOFF verify; independent Tier 3 LIGHT audit has no blocking finding. | Scope command + pipeline scripts + AUDIT.md. |

### 6.2 Traceability

| Requirement | Step | Acceptance |
|---|---|---|
| `RQ-01` | `STEP-01` | `AC-01`, `AC-04` |
| `RQ-02` | `STEP-02`, `STEP-03` | `AC-02`, `AC-03` |
| `RQ-03` | `STEP-02`, `STEP-03` | `AC-02` |
| `RQ-04` | `STEP-02`, `STEP-03` | `AC-03` |
| `RQ-05` | `STEP-01`, `STEP-02`, `STEP-03`, `STEP-04` | `AC-04`, `AC-05`, `AC-06` |

## 7. Risk

| ID | Risk | Mitigation / rollback |
|---|---|---|
| `RISK-01` | FORCE RLS breaks an existing write path. | Integration exercises writer+GUC manager path; public RPC remains BYPASSRLS and unchanged; production apply is Owner gate. |
| `RISK-02` | Concurrent manager assign still races. | Existing partial unique index remains final arbiter; losing request deterministically receives existing P2002/409 behavior. |
| `RISK-03` | Enabling RLS changes visibility for future assignee UI. | Own-row SELECT policy supports HR_STAFF/CTV and denies cross-assignee access. |

## 8. Open Questions

- None.

## 9. Planner Resolution

| Round | Decision | Reason |
|---|---|---|
| 1 | Tier 3 LIGHT verdict: PASS, findings none | AUDIT.md v1.1 synchronized; implementation SHA `5f4569e` unchanged; T0/Owner authorizes follow-up commit + push + PR |

## 10. Revision Log

| Spec version | Date | Change | Reason |
|---|---|---|---|
| `v1.0` | `2026-09-22` | Initial contract | W5 F-1/F-2/F-3 safety slice from latest main. |
| `v1.1` | `2026-09-22` | Status `READY_FOR_PR`; Implementation SHA recorded; Tier 3 LIGHT verdict PASS round 1; next gate `PUSH_AND_OPEN_PR → CI → T0_STAGING_PREFLIGHT`; Planner Resolution round 1 entry added | Tier 3 audit round 1 PASS, findings none; AUDIT.md v1.1 in place; implementation commit unchanged. |
