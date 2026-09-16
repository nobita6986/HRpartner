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

## V6 Phase 1A — Evidence of Capability in Pinned Baseline (R5)

> **R5 evidence rule:** pinned to commit `b91a33f948aed224a88f3e8e7c9847006f33e97f`. Evidence commands use `git ls-tree -r --name-only` (recursive, full names); no hash placeholders or shortened hashes.

### Reproducible evidence commands

```
$ git ls-tree -r --name-only b91a33f prisma/migrations/ | Select-String "phase1a|n1_placement"
prisma/migrations/20260908150000_v6_phase1a_labor_profile_schema/migration.sql
prisma/migrations/20260908150001_v6_phase1a_labor_profile_rls/migration.sql
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

| Migration | Tables | N2 Relevance | In pinned baseline |
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

## Locked Decisions (T0 R5 Verdict)

| Q | Decision | Value |
|---|---|---|
| Q1 | Clock type | Calendar days |
| Q2a | Storage timezone | TIMESTAMPTZ UTC |
| Q2b | Business clock | Asia/Bangkok |
| Q2c | Day boundary | Exclusive next-day `[start, nextDayStart)`; helper removed; N2-1 owns implementation against acceptance vector |
| Q3 | Holiday | OUT OF N2 SCOPE |
| Q4 | Clock start | `PlacementCase.openedAt` |
| Q5 | Pause/reset | Clock RUNNING always |
| Q6 | Attribution | R5: trigger BEFORE UPDATE for immutables; trigger BEFORE INSERT/UPDATE for laborProfileId NULL→value; CHECK current state only; RLS per role; default-deny DELETE |
| Q7a | BeneficiaryDecision | Authority record; immutable facts vs mutable metadata split |
| Q7b | Invariant | Max one ACTIVE per business key |
| Q7c | Nullable-safe SQL | `NULLS NOT DISTINCT` after column list, before `WHERE`; OR COALESCE sentinel + sentinel-domain CHECK |
| Q7d | Concurrency | Single `prisma.$transaction` containing lock + lookup + supersede + insert |
| Q7e | Actor model | `actorType USER/SYSTEM` + `actorUserId nullable` + CHECK XOR |
| Q7f | UNRESOLVED | Typed result + outbox (no decision row) |
| Q7g | Four commands | CREATE (idempotent on exact-match ACTIVE); CORRECT (supersede + replacement); REVERSE (REVERSED, no replacement); REDECIDE_AFTER_REVERSAL |
| Q7h | Supersede link | `old.supersededById → replacement` (single direction) |
| Q7i | Forbidden | REVERSED→SUPERSEDED; SUPERSEDED→REVERSED; any resurrection |
| Q8 | Permissions | R5: 5 explicit codes + implicit self-view; role-scoped RLS; UPDATE USING/WITH CHECK for all commands; LIVE RLS matrix required |
| Q9a | RPC change | Yes, with LIVE test plan |
| Q9b | EXACT_SAFE | FK + provenance + writer + no conflict + audit |
| Q10 | V6 P1 dep | Capability in pinned baseline b91a33f — no merge dep |

---

## T0 R5 Revisions Applied — 5 Directives

| # | Directive | Implementation |
|---|---|---|
| R5-A | Drop write-once CHECK concept; trigger owns write-once; CHECK = current state only; WITH CHECK ≠ DELETE protection; default-deny DELETE under FORCE RLS; optional BEFORE DELETE trigger defense-in-depth | DISCOVERY §2.4.2 layered model: Layer 1 trigger BEFORE UPDATE for immutable columns; Layer 1b trigger BEFORE INSERT/UPDATE for `laborProfileId` NULL→value; Layer 2 CHECK inspects current state; Layer 5 default-deny DELETE under FORCE RLS |
| R5-B | Four beneficiary commands (CREATE/CORRECT/REVERSE/REDECIDE_AFTER_REVERSAL); CREATE idempotent on exact-match ACTIVE; REVERSED→SUPERSEDED forbidden; single supersede link direction | DISCOVERY §2.5.1 link direction (`old.supersededById → replacement`); §2.5.5 command matrix with preconditions, effects, audit events; §2.5.5 forbidden transitions list |
| R5-C | Drop role-only policies; HR_MANAGER team scope; HR_STAFF assigned-only; UPDATE USING/WITH CHECK contract for transfer/release/supersede/correction/reversal; system engine = internal capability; service-layer authorization authority; LIVE RLS matrix tests required | DISCOVERY §2.6.2 role semantics; §2.6.3 RLS matrix with explicit UPDATE USING/WITH CHECK; §2.6.4 LIVE RLS matrix test gate |
| R5-D | Pin evidence to b91a33f; use `git ls-tree -r --name-only`; no hash placeholders or shortened hashes | DISCOVERY §1.1, §6.2 + OVERVIEW uses pinned baseline; `git ls-tree -r --name-only b91a33f prisma/migrations/ \| Select-String "phase1a\|n1_placement"` |
| R5-E | PR body: remove R3 stale claims + control characters; 5 explicit permission codes + implicit self-view | gh pr edit #4 body — clean, no control characters, 5 codes + implicit self-view stated |

---

## Round-by-Round Summary

| Round | Major changes |
|---|---|
| R0 | Discovery baseline — 10 questions answered with codebase evidence |
| R1 | Status sync; HANDOFF.md; Q7 authority record; Q9b classification; Q2 timezone layering; V6 P1 initial |
| R2 | V6 P1 corrected (filesystem); Q7 beneficiaryUserId required + SYSTEM FK + invariant; Q9b tightened |
| R3 | NULLS NOT DISTINCT, advisory lock, actorType/CHECK, UNRESOLVED typed, immutable/mutable (referral), exclusive next-day, Holiday OUT, COMPLETE/READY_FOR_MERGE |
| R4 | 7 blockers fixed (DDL syntax, transaction-scoped advisory lock, multi-layer immutability, off-by-one helper, reproducible evidence, decision immutable/mutable split + correction vs reversal, permission codes) |
| **R5** | **5 directives applied**: (A) trigger owns write-once; CHECK = current state; default-deny DELETE; (B) four beneficiary commands; supersede link direction fixed; (C) role-scoped RLS with UPDATE USING/WITH CHECK; LIVE RLS matrix; (D) evidence pinned to b91a33f; `git ls-tree -r --name-only`; no placeholders; (E) PR body clean |
