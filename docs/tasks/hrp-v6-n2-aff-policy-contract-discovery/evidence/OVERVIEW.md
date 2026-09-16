# N2 Discovery Evidence Index

This folder contains supporting evidence for the N2 AFF Policy Discovery task.

---

## Files in This Task

| File | Purpose |
|---|---|
| `../DISCOVERY.md` | Main document — locked decisions, schema sketches, invariant contracts, 6-slice plan |
| `../TASK.md` | RQ → STEP → AC, scope, boundary |
| `../HANDOFF.md` | Status + handoff summary |
| `OVERVIEW.md` (this) | Survey summary, aff_plan.md affinity, migration inventory |

**Total: 4 files. Zero code changes.**

---

## V6 Phase 1A — Evidence of Capability in Pinned Baseline (R6 full-SHA reproducible)

> **R5 evidence rule + R6 full-SHA rule:** pinned to commit `b91a33f948aed224a88f3e8e7c9847006f33e97f` (full SHA, no shortened hash, no `<hash>` placeholder). Evidence commands use `git ls-tree -r --name-only -- <path>` (recursive, full names; `--` separator guards against accidental path interpretation).

### Reproducible evidence commands (R6)

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
| `LaborProfile` table | Available |
| `LaborProfileIntake` table | Available |
| `EmploymentEpisode` table | Available |
| `CandidateSubmission.laborProfileId` FK | Available |
| RLS policies | Applied |

---

## Migration Inventory (relevant to N2)

| Migration | Tables | N2 Relevance | In pinned baseline (full SHA `b91a33f948aed224a88f3e8e7c9847006f33e97f`) |
|---|---|---|---|
| `20260908150000_v6_phase1a_labor_profile_schema` | labor_profiles, labor_profile_intakes, employment_episodes | N2-3/4 FK | YES |
| `20260908150001_v6_phase1a_labor_profile_rls` | RLS on above | N2-3/4 RLS | YES |
| `20260912140411_n1_placement_case_foundation` | placement_case | N2 clock anchor | YES |
| `20260912140412_n1_placement_case_rls` | RLS on placement_case | N2 RLS | YES |
| `20260819083254_p2_commission_schema` | commission_policies, commission_ledger, commission_debts | N2-6 base | YES |
| `20260819104700_p2_commission_rls` | RLS on commission tables | N2-6 RLS | YES |

---

## Affinity to aff_plan.md Decisions

All 18 `AFF-DEC-*` decisions in `aff_plan.md v2.3` are LOCKED. No conflicts.

| DEC | Topic | Status |
|---|---|---|
| `AFF-DEC-001` | All Users eligible | LOCKED |
| `AFF-DEC-002` | Standalone design | LOCKED |
| `AFF-DEC-003` | Reuse `User.affCode` | LOCKED |
| `AFF-DEC-004` | Generic User identity | LOCKED |
| `AFF-DEC-005` | Public client no raw userId | LOCKED |
| `AFF-DEC-006` | Versioned policy + milestone | LOCKED |
| `AFF-DEC-007` | Analytics ≠ attribution | LOCKED |
| `AFF-DEC-008` | Attribution immutable + handling separate | LOCKED |
| `AFF-DEC-009` | Dispute → Ticket/Case | LOCKED |
| `AFF-DEC-010` | Cookie TTL 30d, first-click | LOCKED |
| `AFF-DEC-011` | 7d protected window | LOCKED |
| `AFF-DEC-012` | Expiry → pool | LOCKED |
| `AFF-DEC-013` | Referrer ≠ beneficiary | LOCKED |
| `AFF-DEC-014` | Ticket in window | LOCKED |
| `AFF-DEC-015` | HR preserve attribution | LOCKED |
| `AFF-DEC-016` | Actor ≠ referrer | LOCKED |
| `AFF-DEC-017` | Direct channel | LOCKED |
| `AFF-DEC-018` | Attribution on LaborProfile | LOCKED |

---

## Locked Decisions (T0 R6 Verdict)

| Q | Decision | Value |
|---|---|---|
| Q1 | Clock type | Calendar days |
| Q2a | Storage timezone | TIMESTAMPTZ UTC |
| Q2b | Business clock | Asia/Bangkok |
| Q2c | Day boundary | Exclusive next-day `[start, nextDayStart)`; helper removed; N2-1 owns implementation against acceptance vector |
| Q3 | Holiday | OUT OF N2 SCOPE |
| Q4 | Clock start | `PlacementCase.openedAt` |
| Q5 | Pause/reset | Clock RUNNING always |
| Q6 | Attribution | R6: trigger BEFORE UPDATE for immutables (incl. `created_at`); trigger BEFORE INSERT/UPDATE for laborProfileId NULL→value; trigger BEFORE UPDATE Layer 1c for transition matrix; CHECK current state only; RLS per role per-command (SELECT/INSERT/UPDATE) in §2.4.3; default-deny DELETE |
| Q7a | BeneficiaryDecision | Authority record; immutable facts vs mutable metadata split |
| Q7b | Invariant | Max one ACTIVE per business key |
| Q7c | Nullable-safe SQL | `NULLS NOT DISTINCT` after column list, before `WHERE`; OR COALESCE sentinel + sentinel-domain CHECK |
| Q7d | Concurrency | Single `prisma.$transaction` containing lock + lookup + supersede + insert |
| Q7e | Actor model | `actorType USER/SYSTEM` + `actorUserId nullable` + CHECK XOR |
| Q7f | UNRESOLVED | Typed result + outbox (no decision row) |
| Q7g | Four commands | CREATE (idempotent on exact-match ACTIVE); CORRECT (supersede + replacement); REVERSE (REVERSED, no replacement); REDECIDE_AFTER_REVERSAL |
| Q7h | Supersede link | `old.supersededById → replacement` (single direction) |
| Q7i | Forbidden | REVERSED→SUPERSEDED; SUPERSEDED→REVERSED; any resurrection |
| Q7j (R6) | CREATE/CORRECT split | CREATE has typed `CONFLICT_EXISTING_ACTIVE` (no auto-supersede, no second ACTIVE insert); exact-match across all authoritative immutable facts; CORRECT is separate function with typed `NO_ACTIVE` outcome |
| Q8 | Permissions | R6: 5 explicit codes + implicit self-view; role-scoped RLS; team-scope on BOTH old (USING) and new (WITH CHECK) rows for HR_MANAGER INSERT/UPDATE on LHA and CBD; HR_STAFF UPDATE denied; manager cannot reassign out-of-team; system engine `app_engine_writer` separate DB principal; LIVE RLS matrix required (expanded per-table) |
| Q9a | RPC change | Yes, with LIVE test plan |
| Q9b | EXACT_SAFE | FK + provenance + writer + no conflict + audit |
| Q10 | V6 P1 dep | Capability in pinned baseline (full SHA) — no merge dep |

---

## T0 R6 Revisions Applied — 6 Directives

| # | Directive | Implementation |
|---|---|---|
| R6-1 | Branch sync with origin/main `0d7f8a1` (no force-push) | Merge commit `97f639f524eef7c97ee35996d615fcdfcad3a3eb`; PR #4 history preserved; merge-base = `0d7f8a1` |
| R6-2 | CREATE pseudocode split from CORRECT; typed CONFLICT_EXISTING_ACTIVE; no auto-supersede or second ACTIVE insert | DISCOVERY §2.5.4: `createBeneficiaryDecision` with three typed outcomes (CREATED / IDEMPOTENT_REPLAY / CONFLICT_EXISTING_ACTIVE) + exact-match across all authoritative immutable facts (beneficiaryUserId, source, reason, evidence deep-equal, handlingAssignmentId, actorType, actorUserId); `correctBeneficiaryDecision` is a separate function with two typed outcomes (CORRECTED / NO_ACTIVE) |
| R6-3 | RLS team-scope on BOTH old and new rows; HR_STAFF UPDATE denied; manager cannot reassign out-of-team; system engine DB principal tested LIVE | DISCOVERY §2.6.3: USING checks OLD row team-scope; WITH CHECK verifies NEW row team-scope for HR_MANAGER INSERT/UPDATE on both LHA and CBD; HR_STAFF UPDATE removed from USING and WITH CHECK on both tables; explicit `app_engine_writer` separate DB principal; LIVE isolation tests in §2.6.4 |
| R6-4 | ReferralAttribution DB contract complete | DISCOVERY §2.4.2 Layer 1 (added `created_at` immutability), Layer 1c lifecycle transition trigger; §2.4.3 per-command RLS policies (SELECT/INSERT/UPDATE); default-deny DELETE; §2.6.4 expanded LIVE matrix for referral_attributions (own/non-own/team/system consume) |
| R6-5 | State diagram with two direct branches only; REDECIDE_AFTER_REVERSAL is INSERT, not transition from REVERSED | DISCOVERY §2.5.5: diagram redrawn with ACTIVE -> SUPERSEDED (via CORRECT), ACTIVE -> REVERSED (via REVERSE), and REVERSED -> NEW ACTIVE (separate row via REDECIDE_AFTER_REVERSAL); no arrow from REVERSED to ACTIVE; explicit clarification added |
| R6-6 | Evidence command uses full SHA `b91a33f948aed224a88f3e8e7c9847006f33e97f` | DISCOVERY §1.1, §6.2 + HANDOFF §3 + OVERVIEW: full-SHA command with `--` separator and two separate `Select-String` calls (one for phase1a, one for n1_placement) |

---

## Round-by-Round Summary

| Round | Major changes |
|---|---|
| R0 | Discovery baseline — 10 questions answered with codebase evidence |
| R1 | Status sync; HANDOFF.md; Q7 authority record; Q9b classification; Q2 timezone layering; V6 P1 initial |
| R2 | V6 P1 corrected (filesystem); Q7 beneficiaryUserId required + SYSTEM FK + invariant; Q9b tightened |
| R3 | NULLS NOT DISTINCT, advisory lock, actorType/CHECK, UNRESOLVED typed, immutable/mutable (referral), exclusive next-day, Holiday OUT, COMPLETE/READY_FOR_MERGE |
| R4 | 7 blockers fixed (DDL syntax, transaction-scoped advisory lock, multi-layer immutability, off-by-one helper, reproducible evidence, decision immutable/mutable split + correction vs reversal, permission codes) |
| R5 | drop write-once CHECK; trigger owns write-once; CHECK = current state; default-deny DELETE; four beneficiary commands; supersede link direction fixed; role-scoped RLS; LIVE RLS matrix; evidence pinned to full SHA; PR body clean |
| **R6** | **Branch synced with origin/main; CREATE/CORRECT split with typed CONFLICT_EXISTING_ACTIVE / NO_ACTIVE; exact-match across all authoritative immutable facts; RLS team-scope on BOTH old and new rows; HR_STAFF UPDATE denied; manager cannot reassign out-of-team; system engine `app_engine_writer` separate DB principal; ReferralAttribution DB contract complete (Layer 1 covers `created_at`; Layer 1c transition trigger; per-command RLS in §2.4.3); state diagram redrawn with two direct branches; evidence command uses full SHA with `--` separator** |