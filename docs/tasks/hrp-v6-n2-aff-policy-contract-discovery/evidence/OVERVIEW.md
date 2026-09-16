# N2 Discovery Evidence Index

This folder contains supporting evidence for the N2 AFF Policy Discovery task.

---

## Files in This Task

| File | Purpose |
|---|---|
| ../DISCOVERY.md | Main document — locked decisions, schema sketches, invariant contracts, 6-slice plan |
| ../TASK.md | RQ → STEP → AC, scope, boundary |
| ../HANDOFF.md | Status + handoff summary |
| OVERVIEW.md (this) | Survey summary, aff_plan.md affinity, migration inventory |

**Total: 4 files. Zero code changes.**

---

## V6 Phase 1A — Evidence of Capability in Pinned Baseline (R7 full-SHA reproducible)

> **Evidence rule:** pinned to commit `b91a33f948aed224a88f3e8e7c9847006f33e97f` (full SHA, no shortened hash, no `<hash>` placeholder). Evidence commands use `git ls-tree -r --name-only -- <path>` (recursive, full names; `--` separator guards against accidental path interpretation).

### Reproducible evidence commands

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

### Migration Contents (real, not claimed)

**`prisma/migrations/20260908150000_v6_phase1a_labor_profile_schema/migration.sql`**:
```sql
ALTER TABLE "candidate_submissions" ADD COLUMN "labor_profile_id" TEXT;
CREATE TABLE "labor_profiles" (...);
CREATE TABLE "labor_profile_intakes" (...);
CREATE TABLE "employment_episodes" (...);
```

**`prisma/migrations/20260908150001_v6_phase1a_labor_profile_rls/migration.sql`**:
```sql
ALTER TABLE labor_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE labor_profiles FORCE ROW LEVEL SECURITY;
CREATE POLICY hrp_labor_profile_scope ON labor_profiles ...;
```

**`prisma/migrations/20260912140411_n1_placement_case_foundation/migration.sql`**:
- Provides `placement_case` and supporting indexes for N2 clock anchor.

**`prisma/migrations/20260912140412_n1_placement_case_rls/migration.sql`**:
- RLS policies on `placement_case`.

### Capability Summary

| Capability | Status |
|---|---|
| LaborProfile table | Available |
| LaborProfileIntake table | Available |
| EmploymentEpisode table | Available |
| CandidateSubmission.laborProfileId FK | Available |
| RLS policies | Applied |

---

## Migration Inventory (relevant to N2)

| Migration | Tables | N2 Relevance | In pinned baseline |
|---|---|---|---|
| 20260908150000_v6_phase1a_labor_profile_schema | labor_profiles, labor_profile_intakes, employment_episodes | N2-3/4 FK | YES |
| 20260908150001_v6_phase1a_labor_profile_rls | RLS on above | N2-3/4 RLS | YES |
| 20260912140411_n1_placement_case_foundation | placement_case | N2 clock anchor | YES |
| 20260912140412_n1_placement_case_rls | RLS on placement_case | N2 RLS | YES |
| 20260819083254_p2_commission_schema | commission_policies, commission_ledger, commission_debts | N2-6 base | YES |
| 20260819104700_p2_commission_rls | RLS on commission tables | N2-6 RLS | YES |

---

## Affinity to aff_plan.md Decisions

All 18 AFF-DEC-* decisions in aff_plan.md v2.3 are LOCKED. No conflicts.

| DEC | Topic | Status |
|---|---|---|
| AFF-DEC-001 | All Users eligible | LOCKED |
| AFF-DEC-002 | Standalone design | LOCKED |
| AFF-DEC-003 | Reuse User.affCode | LOCKED |
| AFF-DEC-004 | Generic User identity | LOCKED |
| AFF-DEC-005 | Public client no raw userId | LOCKED |
| AFF-DEC-006 | Versioned policy + milestone | LOCKED |
| AFF-DEC-007 | Analytics ≠ attribution | LOCKED |
| AFF-DEC-008 | Attribution immutable + handling separate | LOCKED |
| AFF-DEC-009 | Dispute → Ticket/Case | LOCKED |
| AFF-DEC-010 | Cookie TTL 30d, first-click | LOCKED |
| AFF-DEC-011 | 7d protected window | LOCKED |
| AFF-DEC-012 | Expiry → pool | LOCKED |
| AFF-DEC-013 | Referrer ≠ beneficiary | LOCKED |
| AFF-DEC-014 | Ticket in window | LOCKED |
| AFF-DEC-015 | HR preserve attribution | LOCKED |
| AFF-DEC-016 | Actor ≠ referrer | LOCKED |
| AFF-DEC-017 | Direct channel | LOCKED |
| AFF-DEC-018 | Attribution on LaborProfile | LOCKED |

---

## Locked Decisions (T0 R7 Verdict)

| Q | Decision | Value |
|---|---|---|
| Q1 | Clock type | Calendar days |
| Q2a | Storage timezone | TIMESTAMPTZ UTC |
| Q2b | Business clock | Asia/Bangkok |
| Q2c | Day boundary | Exclusive next-day [start, nextDayStart); helper removed; N2-1 owns implementation |
| Q3 | Holiday | OUT OF N2 SCOPE |
| Q4 | Clock start | PlacementCase.openedAt |
| Q5 | Pause/reset | Clock RUNNING always |
| Q6 | Attribution | R7: Layer 1 (immutable cols incl. created_at, NO labor_profile_id check); Layer 1b (NULL→value write-once — sole authority); Layer 1c (lifecycle transition trigger); CHECK current state only; RLS per N2-1 (ADMIN/referrer/engine); N2-4 adds team policies; default-deny DELETE |
| Q7a | BeneficiaryDecision | Authority record; immutable facts vs mutable metadata split |
| Q7b | Invariant | Max one ACTIVE per business key |
| Q7c | Nullable-safe SQL | NULLS NOT DISTINCT after column list, before WHERE; OR COALESCE sentinel |
| Q7d | Concurrency | Single prisma.$transaction (lock + lookup + supersede + insert) |
| Q7e | Actor model | actorType USER/SYSTEM + actorUserId nullable + CHECK XOR |
| Q7f | UNRESOLVED | Typed result + outbox (no decision row) |
| Q7g | Four commands | R7: CREATE (idempotent on exact-match ACTIVE; decidedAt NOT in idempotency; canonical JSON deep-equal); CORRECT (lock→lookup→UPDATE→INSERT→link→commit); REVERSE; REDECIDE_AFTER_REVERSAL |
| Q7h | Supersede link | old.supersededById → replacement (single direction) |
| Q7i | Forbidden | REVERSED→SUPERSEDED; SUPERSEDED→REVERSED; any resurrection |
| Q7j | CREATE/CORRECT split | R7: separate functions; CREATE typed CONFLICT_EXISTING_ACTIVE; CORRECT typed NO_ACTIVE; CORRECT ordering: lock→lookup→UPDATE→INSERT→link→commit |
| Q8 | Permissions | R7: 5 explicit codes + implicit self-view; role-scoped RLS; UPDATE USING (OLD) + WITH CHECK (NEW) both team-scope for HR_MANAGER; HR_STAFF UPDATE denied; app_engine_writer (no BYPASSRLS, explicit policies TO app_engine_writer, current_setting gate); LIVE RLS matrix required (expanded per-table, self-release removed) |
| Q9a | RPC change | Yes, with LIVE test plan |
| Q9b | EXACT_SAFE | FK + provenance + writer + no conflict + audit |
| Q10 | V6 P1 dep | Capability in pinned baseline (full SHA) — no merge dep |

---

## T0 R7 Revisions Applied — 6 Directives

| # | Directive | Implementation |
|---|---|---|
| 1 | RLS expressions use valid PostgreSQL syntax | No NEW./OLD. prefixes in policy USING/WITH CHECK; column names used directly; trigger bodies still use NEW./OLD. (valid SQL) |
| 2 | Layer 1 trigger does NOT check labor_profile_id; Layer 1b is sole authority | Layer 1 labor_profile_id check removed; write-once LIVE test cases defined |
| 3 | N2-1 RLS simplified | N2-1 RLS: ADMIN/referrer SELECT, app_engine_writer INSERT (current_setting gate), ADMIN UPDATE; no LHA/team refs |
| 4 | app_engine_writer contract fixed | no BYPASSRLS, INSERT/UPDATE grants TO app_engine_writer, DELETE denied, current_setting gate, valid set_config syntax, LIVE isolation tests |
| 5 | CORRECT ordering fixed | lock→lookup→UPDATE→INSERT→link→commit; partial unique invariant satisfied throughout |
| 6 | Matrix self-release removed; idempotency clarified | Matrix: self-release row removed; exactMatch: decidedAt NOT in idempotency identity; canonicalJson (sorted keys) |

---

## Round-by-Round Summary

| Round | Major changes |
|---|---|
| R0 | Discovery baseline — 10 questions answered with codebase evidence |
| R1 | Status sync; HANDOFF.md; Q7 authority record; Q9b classification; Q2 timezone; V6 P1 initial |
| R2 | V6 P1 corrected (filesystem); Q7 beneficiaryUserId required + SYSTEM FK + invariant; Q9b tightened |
| R3 | NULLS NOT DISTINCT, advisory lock, actorType/CHECK, UNRESOLVED typed, immutable/mutable (referral), exclusive next-day, Holiday OUT, COMPLETE/READY_FOR_MERGE |
| R4 | 7 blockers fixed (DDL syntax, transaction-scoped advisory lock, multi-layer immutability, off-by-one helper, reproducible evidence, decision immutable/mutable split + correction vs reversal, permission codes) |
| R5 | drop write-once CHECK; trigger owns write-once; CHECK = current state; default-deny DELETE; four beneficiary commands; supersede link direction fixed; role-scoped RLS; LIVE RLS matrix; evidence pinned to full SHA; PR body clean |
| R6 | branch sync; CREATE/CORRECT split with typed CONFLICT_EXISTING_ACTIVE; RLS team-scope on both rows; ReferralAttribution DB contract complete; state diagram corrected; full-SHA evidence |
| **R7** | **RLS expressions corrected (valid PostgreSQL, no NEW./OLD. in policies); CORRECT ordering fixed; idempotency identity clarified (decidedAt out, canonical JSON deep-equal); N2-1 RLS simplified (ADMIN/referrer/engine only, no external table refs); app_engine_writer contract fixed; Layer 1 labor_profile_id check removed; write-once LIVE test cases; matrix self-release removed** |