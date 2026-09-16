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

## V6 Phase 1A — Evidence of Capability in origin/main (R4 reproducible)

### Reproducible evidence commands

```
$ git ls-tree origin/main prisma/migrations/ | Select-String "phase1a"
  040000 tree 613b6fe6... prisma/migrations/20260908150000_v6_phase1a_labor_profile_schema/
  040000 tree a399344c... prisma/migrations/20260908150001_v6_phase1a_labor_profile_rls/

$ git ls-tree origin/main prisma/migrations/ | Select-String "n1_placement_case"
  040000 tree <hash>...   prisma/migrations/20260912140411_n1_placement_case_foundation/
```

(R4 removed the previously combined `Select-String "phase1a"` filter that implicitly assumed `n1_placement_case_foundation` matched the same pattern; commands are now split to ensure each pattern matches its own migration family and the output is reproducible.)

### Migration Contents

**`20260908150000_v6_phase1a_labor_profile_schema/migration.sql`**:
```sql
ALTER TABLE "candidate_submissions" ADD COLUMN "labor_profile_id" TEXT;
CREATE TABLE "labor_profiles" (...);
CREATE TABLE "labor_profile_intakes" (...);
CREATE TABLE "employment_episodes" (...);
```

**`20260908150001_v6_phase1a_labor_profile_rls/migration.sql`**:
```sql
ALTER TABLE labor_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE labor_profiles FORCE ROW LEVEL SECURITY;
CREATE POLICY hrp_labor_profile_scope ON labor_profiles ...;
```

**`20260912140411_n1_placement_case_foundation/migration.sql`**:
- Provides `placement_case` and supporting indexes for N2 clock anchor.

### Capability Summary

| Capability | Status |
|---|---|
| `LaborProfile` table | ✅ Available |
| `LaborProfileIntake` table | ✅ Available |
| `EmploymentEpisode` table | ✅ Available |
| `CandidateSubmission.laborProfileId` FK | ✅ Available |
| RLS policies | ✅ Applied |

---

## Migration Inventory (relevant to N2)

| Migration | Tables | N2 Relevance | In origin/main |
|---|---|---|---|
| `20260908150000_v6_phase1a_labor_profile_schema` | labor_profiles, labor_profile_intakes, employment_episodes | N2-3/4 FK | ✅ YES |
| `20260908150001_v6_phase1a_labor_profile_rls` | RLS on above | N2-3/4 RLS | ✅ YES |
| `20260912140411_n1_placement_case_foundation` | placement_case | N2 clock anchor | ✅ YES |
| `20260912140412_n1_placement_case_rls` | RLS on placement_case | N2 RLS | ✅ YES |
| `20260819083254_p2_commission_schema` | commission_policies, commission_ledger, commission_debts | N2-6 base | ✅ YES |
| `20260819104700_p2_commission_rls` | RLS on commission tables | N2-6 RLS | ✅ YES |

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

## Locked Decisions (T0 R4 Verdict)

| Q | Decision | Value |
|---|---|---|
| Q1 | Clock type | Calendar days |
| Q2a | Storage timezone | TIMESTAMPTZ UTC |
| Q2b | Business clock | Asia/Bangkok |
| Q2c | Day boundary | Exclusive next-day `[start, nextDayStart)`; helper removed; N2-1 owns implementation against acceptance vector |
| Q3 | Holiday | OUT OF N2 SCOPE |
| Q4 | Clock start | `PlacementCase.openedAt` |
| Q5 | Pause/reset | Clock RUNNING always |
| Q6 | Attribution | Immutable facts vs mutable metadata split; multi-layer enforcement; application is convenience |
| Q7a | BeneficiaryDecision | Authority record; immutable facts vs mutable metadata split |
| Q7b | Invariant | Max one ACTIVE per business key |
| Q7c | Nullable-safe SQL | R4: `NULLS NOT DISTINCT` after column list, before `WHERE`; OR COALESCE sentinel + sentinel-domain CHECK |
| Q7d | Concurrency | R4: single `prisma.$transaction` containing lock + lookup + supersede + insert |
| Q7e | Actor model | `actorType USER/SYSTEM` + `actorUserId nullable` + CHECK XOR |
| Q7f | UNRESOLVED | Typed result + outbox (no decision row) |
| Q7g | Correction vs Reversal | R4: distinct commands; reversal does NOT auto-create replacement |
| Q8 | Permissions | R4: 5 explicit codes + implicit self-view; ADMIN/HR_MANAGER for beneficiary; HR_STAFF = visibility only; system engine = internal capability |
| Q9a | RPC change | Yes, with LIVE test plan |
| Q9b | EXACT_SAFE | FK + provenance + writer + no conflict + audit |
| Q10 | V6 P1 dep | Capability in main — no merge dep |

---

## T0 R4 Revisions Applied — 7 Blockers

| # | Directive | Implementation |
|---|---|---|
| R4-1 | DDL `NULLS NOT DISTINCT` syntax fix | `NULLS NOT DISTINCT` placed **after column list, before `WHERE status = 'ACTIVE'`** in DISCOVERY §2.5.3 |
| R4-2 | Advisory lock must be in interactive transaction | §2.5.4 now mandates `prisma.$transaction(async tx => ...)` containing lock + lookup + supersede + insert; uses `hashtextextended(key, 0)` |
| R4-3 | Attribution immutability multi-layer (not RLS-only) | §2.4.2 lays out DB trigger + write-once CHECK + RLS USING + RLS WITH CHECK; explicit that scoped UPDATE is allowed only for lifecycle columns; application service is convenience, not authority |
| R4-4 | `nextDayStart()` off-by-one helper removed | §4.1 helper deleted; acceptance vector locked; N2-1 owns concrete implementation |
| R4-5 | Reproducible evidence commands | §1.2, §6.2, OVERVIEW split into two reproducible `Select-String` commands (one per migration family) |
| R4-6 | CommissionBeneficiaryDecision immutable/mutable split + correction vs reversal | §2.5.2 splits immutable facts (business key, beneficiary, source, reason, evidence, decidedAt, actor, handlingAssignmentId) from mutable (status, supersededById, updatedAt); §2.5.7 separates correction (supersede + new ACTIVE) from reversal (REVERSED, no replacement by default) |
| R4-7 | Permission contract reconciled | §2.6 = 5 explicit codes + implicit self-view; ADMIN/HR_MANAGER for beneficiary decisions; HR_STAFF = visibility only; system engine = internal capability; RLS USING + WITH CHECK clauses added; service layer is authorization authority |

---

## Round-by-Round Summary

| Round | Major changes |
|---|---|
| R0 | Discovery baseline — 10 questions answered with codebase evidence |
| R1 | Status sync; HANDOFF.md; Q7 authority record; Q9b classification; Q2 timezone layering; V6 P1 initial |
| R2 | V6 P1 corrected (filesystem); Q7 beneficiaryUserId required + SYSTEM FK + invariant; Q9b tightened |
| R3 | NULLS NOT DISTINCT, advisory lock, actorType/CHECK, UNRESOLVED typed, immutable/mutable (referral), exclusive next-day, Holiday OUT, COMPLETE/READY_FOR_MERGE |
| **R4** | **7 blockers fixed** (this round — correction only, no new policy) |
