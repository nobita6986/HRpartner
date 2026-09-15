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

## V6 Phase 1A — Evidence of Capability in origin/main

```
$ git ls-tree origin/main prisma/migrations/ | Select-String "phase1a"
  prisma/migrations/20260908150000_v6_phase1a_labor_profile_schema/
  prisma/migrations/20260912140411_n1_placement_case_foundation
  prisma/migrations/20260908150001_v6_phase1a_labor_profile_rls/
```

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

## Locked Decisions (T0 R3 Verdict)

| Q | Decision | Value |
|---|---|---|
| Q1 | Clock type | Calendar days |
| Q2a | Storage timezone | TIMESTAMPTZ UTC |
| Q2b | Business clock | Asia/Bangkok |
| Q2c | Day boundary | Exclusive next-day `[start, nextDayStart)` |
| Q3 | Holiday | OUT OF N2 SCOPE |
| Q4 | Clock start | `PlacementCase.openedAt` |
| Q5 | Pause/reset | Clock RUNNING always |
| Q6 | Attribution | Immutable; separate clocks; immutable facts vs mutable metadata split |
| Q7a | BeneficiaryDecision | Authority record (immutable) |
| Q7b | Invariant | Max one ACTIVE per business key |
| Q7c | Nullable-safe | PG15+ `NULLS NOT DISTINCT` OR COALESCE sentinel |
| Q7d | Concurrency | Advisory lock with normalized tuple + sentinel |
| Q7e | Actor model | `actorType USER/SYSTEM` + `actorUserId nullable` + CHECK |
| Q7f | UNRESOLVED | Typed result + outbox (no decision row) |
| Q7g | Correction history | SUPERSEDED/REVERSED preserved |
| Q8 | Permissions | 6 codes + RLS proposal |
| Q9a | RPC change | Yes, with LIVE test plan |
| Q9b | EXACT_SAFE | FK + provenance + writer + no conflict + audit |
| Q10 | V6 P1 dep | Capability in main — no merge dep |

---

## T0 R3 Revisions Applied

| # | Directive | Implementation |
|---|---|---|
| R3-1 | Active unique invariant nullable-safe | NULLS NOT DISTINCT (PG15+) OR COALESCE sentinel; SQL migration is authority |
| R3-2 | Advisory lock with delimiter/sentinel | Normalized tuple using RS (0x1E) delimiter and `__NONE__` for null |
| R3-3 | No SYSTEM user; use actorType + actorUserId + CHECK | Schema: two-field actor; SQL CHECK enforces XOR |
| R3-4 | UNRESOLVED = typed result + outbox | No decision row; outbox event BENEFICIARY_DECISION_UNRESOLVED |
| R3-5 | Immutable vs mutable | Split documented; immutable source vs mutable lifecycle metadata |
| R3-6 | Exclusive next-day boundary | Half-open `[start, nextDayStart)` |
| R3-7 | Holiday out of N2 scope | Removed from N2 implementation |
| R3-8 | Sync PR #4 audited facts | PR #4, HEAD 0341a43 → R3 revision on same branch, 4 files |
| R3-9 | Status COMPLETE / READY_FOR_MERGE | All 4 docs synced; Audit NONE |
| R3-10 | Push to PR #4 (no new PR) | R3 changes commit on same branch |
