# N2 AFF Discovery — HANDOFF

**Task:** `hrp-v6-n2-aff-policy-contract-discovery`
**Status:** `OPEN / REVISION_REQUIRED`
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
| Evidence gathering | Complete (full SHA pinning) |
| T0 verdict applied | All R0-R8 decisions applied |
| R4 corrections | 7 blockers fixed |
| R5 corrections | 5 directives applied |
| R6 corrections | 6 contract defects fixed |
| R7 corrections | 6 executable blockers fixed |
| R8 corrections | 4 P1 executable-contract blockers fixed |
| Implementation gate | LOCKED until PR #4 merges (Tier 1 unlocks N2-1 separately) |
| **PR #4 status** | **OPEN / REVISION_REQUIRED** |

**Task is OPEN / REVISION_REQUIRED — waiting for T0 final authorization after R8.**

---

## 2. Deliverables

4 files. Zero code.

| File | Purpose |
|---|---|
| DISCOVERY.md | Locked decisions, schema sketches, invariant contracts, 6-slice plan |
| TASK.md | RQ -> STEP -> AC, scope, boundary |
| HANDOFF.md | Status + handoff summary |
| evidence/OVERVIEW.md | Migration inventory + aff_plan.md affinity + V6 P1 evidence (pinned) |

---

## 3. Critical Evidence (pinned to full SHA)

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

## 4. Locked Decisions Summary (R8 final)

### Clock & Time
- Calendar days; storage TIMESTAMPTZ UTC; business Asia/Bangkok
- Exclusive next-day [start, nextDayStart); Holiday OUT OF N2 SCOPE

### Lifecycle
- Clock start: PlacementCase.openedAt; pause none; assignment has expiresAt

### Attribution (Q6 — R8 final)
- Immutable facts vs mutable metadata split; multi-layer enforcement:
  - Layer 1: Trigger BEFORE UPDATE rejects UPDATE on immutable columns incl. created_at; NO labor_profile_id check (Layer 1b sole authority)
  - Layer 1b: NULL→value write-once (sole authority); write-once LIVE test cases defined
  - Layer 1c: lifecycle transition trigger (terminal cannot resurrect)
  - Layer 2: CHECK current state only
  - Layer 3: RLS N2-1 = ADMIN/referrer/engine (no external table refs)
  - Layer 5: default-deny DELETE under FORCE RLS
- N2-4 adds additive handler/team RLS

### Beneficiary Decision (Q7 — R8 final)
- Authority record; max one ACTIVE per business key
- NULLS NOT DISTINCT (PG15+) after column list
- Interactive transaction (lock + lookup + supersede + insert)
- actorType USER/SYSTEM + actorUserId nullable + CHECK XOR
- UNRESOLVED typed result + outbox
- CREATE/CORRECT separate functions:
  - CREATE: CREATED | IDEMPOTENT_REPLAY | CONFLICT_EXISTING_ACTIVE. Idempotency excludes decidedAt; uses recursive canonicalJson (R8 K-01..K-10) OR DB-layer jsonb = (must agree).
  - CORRECT: lock→lookup→UPDATE→INSERT→link→commit. Partial unique invariant satisfied throughout.
- REVERSE / REDECIDE_AFTER_REVERSAL; REVERSED→SUPERSEDED forbidden
- Supersede link: old.supersededById → replacement (single direction)

### Permissions (Q8 — R8 final)
- 5 explicit codes + implicit self-view
- ADMIN/HR_MANAGER only for beneficiary decisions
- HR_STAFF = assigned-rows visibility; HR_STAFF UPDATE denied
- System engine = app_engine_writer (NO BYPASSRLS, REVOKE DELETE, explicit policies with current_setting context gate, set_config(..., true) only); 12 LIVE contract tests E-01..E-12
- Team-scope on BOTH rows for HR_MANAGER; valid PostgreSQL RLS syntax (no NEW./OLD. prefixes, qualified outer column for WITH CHECK)
- LIVE RLS matrix required (cross-profile denial test added R8)

### Migration & Compat
- RPC signature change OK for N2-3 with LIVE test
- EXACT_SAFE classification; V6 P1 capability in pinned baseline (full SHA)

---

## 5. 6 Slice Plan

| Slice | Schema scope | Test gate |
|---|---|---|
| N2-1 | ReferralAttribution + Layer 1+1b+1c+2+5 + N2-1 RLS + app_engine_writer executable contract (R8) | Immutability, write-once (K-01..K-10), lifecycle, engine contract (E-01..E-12) |
| N2-2 | None (pure app, runs as app_engine_writer) | Engine isolation, race, forged code |
| N2-3 | Additive columns + RPC signature | RPC migration test |
| N2-4 | labor_profile_handling_assignments + hr_team_members + N2-4 RLS + additive handler/team RLS | Race to assign, cross-profile denial (R8), team scope, HR_STAFF UPDATE denied |
| N2-5 | CommissionBeneficiaryDecision + CORRECT ordering + CREATE/CORRECT split + N2-5 RLS (no scope bypass R8) | Invariant, command matrix, CORRECT ordering, CONFLICT_EXISTING_ACTIVE, cross-profile denial (R8), LIVE RLS |
| N2-6 | Additive beneficiary_user_id + EXACT_SAFE-only backfill + engine update | EXACT_SAFE classification |

---

## 6. Boundary Compliance

- No schema/migration/source changes
- No production DB writes
- No PLANNER_HANDOVER / TIER0_SHIFT_HANDOVER modifications
- No PR #3 / P2 file changes
- No N4 implementation; No N2 implementation
- Docs-only PR
- Read-only research against pinned baseline
- R8 is correction-only — no new policy, no new survey
- Branch synced with origin/main (HEAD 0d7f8a1) before R6; preserved through R7/R8

---

## 7. T0 Verdict Applied (R0–R8)

| Round | Major changes |
|---|---|
| R0 | Discovery baseline — 10 questions answered |
| R1 | Status sync; HANDOFF.md; Q7 authority record; Q9b classification; Q2 timezone; V6 P1 initial |
| R2 | V6 P1 corrected; Q7 beneficiaryUserId required + SYSTEM FK + invariant; Q9b tightened |
| R3 | NULLS NOT DISTINCT, advisory lock, actorType/CHECK, UNRESOLVED typed, immutable/mutable, exclusive next-day, Holiday OUT, COMPLETE/READY_FOR_MERGE |
| R4 | 7 blockers fixed (DDL syntax, transaction-scoped advisory lock, multi-layer immutability, off-by-one helper, reproducible evidence, decision immutable/mutable split, permission codes) |
| R5 | drop write-once CHECK; trigger owns write-once; CHECK = current state; default-deny DELETE; four beneficiary commands; supersede link direction; role-scoped RLS; LIVE RLS matrix; full-SHA evidence; PR body clean |
| R6 | branch sync; CREATE/CORRECT split; RLS team-scope on both rows; ReferralAttribution DB contract complete; state diagram corrected; full-SHA evidence |
| R7 | RLS expressions corrected (no NEW./OLD. prefixes); CORRECT ordering fixed; idempotency identity clarified; N2-1 RLS simplified; app_engine_writer contract; Layer 1 labor_profile_id removed; matrix self-release removed |
| **R8** | **CBD RLS scope fix (qualified outer column); app_engine_writer executable contract (idempotent provisioning, explicit grants + REVOKE DELETE, three per-table policies, set_config(..., true) only, 12 LIVE tests E-01..E-12); set_config(..., false) FORBIDDEN; recursive canonical JSON + 10 LIVE tests K-01..K-10; status CHANGED to OPEN / REVISION_REQUIRED** |

---

## 8. Whats Next

### Reviewer path
1. Open PR #4
2. Review 4 docs files (zero code risk)
3. Approve -> merge to main
4. OR open follow-up revision

### After merge
1. Tier 1 reads DISCOVERY.md section 2 (locked decisions) as the contract
2. Tier 1 creates hrp-v6-n2-aff-01-attribution-foundation task
3. Implementation starts under separate task in separate branch

### Out of PR scope
- No N2-1 implementation in this PR
- No schema changes
- No migration

---

**Handoff state: OPEN / REVISION_REQUIRED. PR #4 ready for T0 review.**