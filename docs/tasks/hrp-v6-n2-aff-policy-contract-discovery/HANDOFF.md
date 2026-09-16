# N2 AFF Discovery — HANDOFF

**Task:** `hrp-v6-n2-aff-policy-contract-discovery`
**Status:** `COMPLETE` / `READY_FOR_MERGE`
**Audit:** `NONE`
**Lane:** STANDARD (no implementation in this task)
**Type:** READ-ONLY Discovery
**Baseline (pinned):** `b91a33f948aed224a88f3e8e7c9847006f33e97f` (full SHA)
**Branch:** `hrp-v6-n2-aff-policy-contract-discovery`
**PR:** [#4](https://github.com/nobita6986/HRpartner/pull/4)

---

## 1. Final Status

| Item | State |
|---|---|
| Survey scope | Complete |
| Evidence gathering | Complete (file:line + filesystem migration evidence pinned to full SHA) |
| T0 verdict applied | All R0–R7 decisions applied |
| Locked decisions | All operational decisions LOCKED |
| 6-slice plan | Ready |
| R4 corrections | 7 blockers fixed |
| R5 corrections | 5 directives applied (A/B/C/D/E) |
| R6 corrections | 6 contract defects fixed |
| R7 corrections | 6 executable blockers fixed (RLS syntax, CORRECT ordering, N2-1 simplification, engine contract, Layer 1 fix, matrix + idempotency) |
| Implementation gate | LOCKED until PR #4 merges (Tier 1 unlocks N2-1 separately) |

**Task is COMPLETE — ready for review and merge.**

---

## 2. Deliverables

4 files. Zero code.

| File | Purpose |
|---|---|
| DISCOVERY.md | Locked decisions, schema sketches, invariant contracts, 6-slice plan |
| TASK.md | RQ → STEP → AC, scope, boundary |
| HANDOFF.md | Status + handoff summary |
| evidence/OVERVIEW.md | Migration inventory + aff_plan.md affinity + V6 P1 evidence (pinned) |

---

## 3. Critical Evidence (R5/R6/R7 — pinned to full SHA)

```
$ git ls-tree -r --name-only `
>>   b91a33f948aed224a88f3e8e7c9847006f33e97f `
>>   -- prisma/migrations `
>>   | Select-String "phase1a"
prisma/migrations/20260908150000_v6_phase1a_labor_profile_schema/migration.sql
prisma/migrations/20260908150001_v6_phase1a_labor_profile_rls/migration.sql

$ git ls-tree -r --name-only `
>>   b91a33f948aed224a88f3e8e7c9847006f33e97f `
>>   -- prisma/migrations `
>>   | Select-String "n1_placement"
prisma/migrations/20260912140411_n1_placement_case_foundation/migration.sql
prisma/migrations/20260912140412_n1_placement_case_rls/migration.sql
```

---

## 4. Locked Decisions Summary (R7 final)

### Clock & Time
- Calendar days (no business days)
- Storage: TIMESTAMPTZ UTC
- Business clock: Asia/Bangkok
- Day boundary: exclusive next-day [start, nextDayStart)
- Holiday: OUT OF N2 SCOPE

### Lifecycle
- Clock start: PlacementCase.openedAt
- Pause: none; assignment has expiresAt

### Attribution (Q6 — R7 final)
- Immutable facts vs mutable lifecycle metadata split
- **Multi-layer enforcement**:
  - Layer 1: Trigger BEFORE UPDATE rejects UPDATE on immutable columns (INCLUDING created_at); NO labor_profile_id check (Layer 1b is sole authority)
  - Layer 1b: Trigger BEFORE INSERT/UPDATE enforces laborProfileId NULL→value write-once (sole authority for this column)
  - Layer 1c (R6): Trigger BEFORE UPDATE enforces lifecycle transition matrix (terminal states cannot resurrect; only ACTIVE -> CONSUMED|EXPIRED|REVOKED|SUPERSEDED)
  - Layer 2: CHECK constraints inspect **current state only** (not write-once, not transitions)
  - Layer 3: RLS per-command policies — N2-1: ADMIN/referrer SELECT, app_engine_writer INSERT (current_setting gate), ADMIN UPDATE; N2-4 adds team policies for handler visibility
  - Layer 4: Application service = convenience, not authority
  - Layer 5: Default-deny DELETE under FORCE RLS; optional BEFORE DELETE trigger defense-in-depth

### Beneficiary Decision (Q7 — R7 final)
- Authority record; immutable facts vs mutable lifecycle metadata split
- **Invariant**: max one ACTIVE per (laborProfileId, assignmentId, milestone)
- **Nullable-safe SQL**: PG15+ NULLS NOT DISTINCT after column list, before WHERE; OR COALESCE sentinel
- **Concurrency**: single prisma.$transaction (lock + lookup + supersede + insert)
- **Actor model**: actorType USER/SYSTEM + actorUserId nullable + CHECK (XOR)
- **UNRESOLVED**: typed result + outbox event (no decision row)
- **CREATE/CORRECT split (R7)**:
  - CREATE: three typed outcomes — CREATED | IDEMPOTENT_REPLAY (exact-match ACTIVE across all authoritative immutable facts) | CONFLICT_EXISTING_ACTIVE (nonmatching ACTIVE). Exact-match excludes decidedAt (same decision made at different timestamps is still same decision); uses canonical JSON deep-equal (sorted keys, no raw JSON.stringify). CREATE never auto-supersedes and never inserts a second ACTIVE row.
  - CORRECT: SEPARATE function. Five-step ordering: (1) acquire advisory lock, (2) lookup old ACTIVE, (3) UPDATE old ACTIVE → SUPERSEDED, (4) INSERT replacement ACTIVE, (5) SET supersededById on old SUPERSEDED. Typed outcomes: CORRECTED | NO_ACTIVE. Rollback on any step failure.
- **REVERSE / REDECIDE_AFTER_REVERSAL**: REDECIDE_AFTER_REVERSAL is INSERT of a NEW row; the REVERSED row stays terminal and is not transitioned.
- **Forbidden**: REVERSED→SUPERSEDED, SUPERSEDED→REVERSED, any resurrection
- **Supersede link**: old.supersededById → replacement (single direction; replacement has no back-pointer)

### Permissions (Q8 — R7 final)
- **5 explicit permission codes** + implicit self-view
- ADMIN/HR_MANAGER for beneficiary decisions
- HR_STAFF = visibility only, no beneficiary override
- **System engine** uses app_engine_writer DB principal (NOT a human permission; NOT BYPASSRLS; explicit INSERT/UPDATE policies TO app_engine_writer; current_setting(hrp.engine_context) gate; no DELETE grant; LIVE isolation tests)
- **Valid PostgreSQL RLS syntax (R7)**: policy expressions use column names directly (no NEW./OLD. prefixes); WITH CHECK evaluates resulting row by column name
- **Team-scope on BOTH rows (R7)**: USING checks OLD row team-scope; WITH CHECK verifies NEW row team-scope for HR_MANAGER INSERT/UPDATE on both LHA and CBD
- **HR_STAFF UPDATE denied (R7)**: removed from USING and WITH CHECK on both tables
- **N2-1 RLS simplified (R7)**: ADMIN/referrer own-view + engine INSERT/UPDATE; no labor_profile_handling_assignments/hr_team_members refs (tables not available at N2-1 time); N2-4 owns team source
- Service layer = authorization authority
- **LIVE RLS matrix tests** required as hard test gate (expanded per-table; self-release row removed)

---

## 5. 6 Slice Plan

| Slice | Schema scope | Migration risk | Test gate |
|---|---|---|---|
| N2-1 | ReferralAttribution + Layer 1+1b+1c+2+5 + N2-1 RLS (ADMIN/referrer/engine; no external table refs) | Low | Immutability, write-once, lifecycle transition, N2-1 RLS (engine context), team source (N2-4) |
| N2-2 | None (pure app, runs as app_engine_writer) | Zero | Race, forged code, engine isolation |
| N2-3 | Additive columns + RPC signature change | HIGH (RPC) | RPC migration test |
| N2-4 | labor_profile_handling_assignments + hr_team_members source + N2-4 RLS + additive handler/team RLS for ReferralAttribution | Medium | Race to assign, team scope on both rows, HR_STAFF UPDATE denied, team source test |
| N2-5 | CommissionBeneficiaryDecision + NULLS NOT DISTINCT + CREATE/CORRECT split ordering + N2-5 RLS (team scope on both rows, HR_STAFF denied) | Medium | Invariant, command matrix, CORRECT ordering, CONFLICT_EXISTING_ACTIVE, LIVE RLS |
| N2-6 | Additive beneficiary_user_id + EXACT_SAFE-only backfill + engine update | Medium | EXACT_SAFE classification |

---

## 6. Boundary Compliance

- No schema/migration/source changes
- No production DB writes
- No PLANNER_HANDOVER / TIER0_SHIFT_HANDOVER modifications
- No PR #3 / P2 file changes
- No N4 implementation
- No N2 implementation
- Docs-only PR
- Read-only research against pinned baseline
- R7 is correction-only — no new policy, no new survey
- Branch synced with origin/main (HEAD 0d7f8a1) before R6 corrections

---

## 7. T0 Final Verdict Applied (R0–R7)

| Round | Files affected | Major changes |
|---|---|---|
| R0 | All 4 | Discovery baseline — 10 questions answered |
| R1 | All 4 | Status sync; HANDOFF.md; Q7 (authority record); Q9b (legacy); Q2 (timezone); V6 P1 initial |
| R2 | All 4 | V6 P1 corrected; Q7 R2 (beneficiaryUserId required + SYSTEM FK + invariant + UNRESOLVED); Q9b tightened; Q6 immutable |
| R3 | All 4 | NULLS NOT DISTINCT, advisory lock, actorType/CHECK, outcome removed, UNRESOLVED typed, immutable/mutable split (referral only), exclusive next-day, Holiday OUT, COMPLETE/READY_FOR_MERGE |
| R4 | All 4 | 7 blockers fixed (DDL syntax, transaction-scoped advisory lock, multi-layer immutability, off-by-one helper, reproducible evidence, decision immutable/mutable split + correction vs reversal, permission codes) |
| R5 | All 4 | drop write-once CHECK; trigger owns write-once; CHECK = current state; default-deny DELETE; four beneficiary commands; supersede link direction fixed; role-scoped RLS; UPDATE USING/WITH CHECK; LIVE RLS matrix; evidence pinned to full SHA; PR body clean |
| R6 | All 4 | branch sync; CREATE/CORRECT split with typed CONFLICT_EXISTING_ACTIVE; RLS team-scope on both rows; ReferralAttribution DB contract complete; state diagram corrected; full-SHA evidence |
| **R7** | All 4 | **RLS expressions corrected (no NEW./OLD. prefixes in policy USING/WITH CHECK); CORRECT ordering fixed (lock→lookup→UPDATE→INSERT→link→commit); idempotency identity clarified (decidedAt out, canonical JSON deep-equal); N2-1 RLS simplified (ADMIN/referrer/engine only, no external table refs); app_engine_writer contract fixed (no BYPASSRLS, explicit policies TO app_engine_writer, current_setting gate, valid syntax, LIVE isolation tests); Layer 1 does NOT check labor_profile_id (Layer 1b sole authority); write-once LIVE test cases defined; matrix self-release removed** |

---

## 8. Whats Next

### Reviewer path
1. Open PR #4
2. Review 4 docs files (zero code risk)
3. Approve → merge to main

### After merge
1. Tier 1 reads DISCOVERY.md section 2 (locked decisions) as the contract
2. Tier 1 creates hrp-v6-n2-aff-01-attribution-foundation task
3. Implementation starts under separate task in separate branch

### Out of PR scope
- No N2-1 implementation in this PR
- No schema changes
- No migration

---

**Handoff complete. Status: COMPLETE / READY_FOR_MERGE. PR #4 ready for review.**