# N2 Discovery Evidence Index

This folder contains supporting evidence for the N2 AFF Policy Discovery task.

---

## Files in This Task

| File | Lines | Purpose |
|---|---|---|
| `../DISCOVERY.md` | 711 | Main document — 10 questions, evidence, 18 T0 decisions |
| `../TASK.md` | 151 | RQ → STEP → AC, scope, boundary |
| `../HANDOFF.md` | 191 | Status + handoff to T0 |
| `OVERVIEW.md` (this) | ~151 | Survey summary, aff_plan.md affinity, migration inventory |

**Total: 4 files, ~1204 lines. Zero code changes.**

---

## V6 Phase 1A — Evidence of Capability in origin/main (CORRECTED R2)

```
$ git ls-tree origin/main prisma/migrations/ | Select-String "phase1a"
  prisma/migrations/20260908150000_v6_phase1a_labor_profile_schema/
  prisma/migrations/20260908150001_v6_phase1a_labor_profile_rls/
```

### Migration Contents

**20260908150000_v6_phase1a_labor_profile_schema/migration.sql:**
```sql
ALTER TABLE "candidate_submissions" ADD COLUMN "labor_profile_id" TEXT;
CREATE TABLE "labor_profiles" (...);
CREATE TABLE "labor_profile_intakes" (...);
CREATE TABLE "employment_episodes" (...);
```

**20260908150001_v6_phase1a_labor_profile_rls/migration.sql:**
```sql
ALTER TABLE labor_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE labor_profiles FORCE ROW LEVEL SECURITY;
CREATE POLICY hrp_labor_profile_scope ON labor_profiles ...;
ALTER TABLE labor_profile_intakes ENABLE ROW LEVEL SECURITY;
ALTER TABLE labor_profile_intakes FORCE ROW LEVEL SECURITY;
CREATE POLICY hrp_labor_profile_intake_scope ON labor_profile_intakes ...;
```

### Capability Summary

| Capability | Status | Evidence |
|---|---|---|
| `LaborProfile` table | ✅ Available | `schema.prisma:1393` + migration |
| `LaborProfileIntake` table | ✅ Available | `schema.prisma:1421` + migration |
| `EmploymentEpisode` table | ✅ Available | `schema.prisma:1431` + migration |
| `CandidateSubmission.laborProfileId` FK | ✅ Available | Migration ADD COLUMN |
| RLS policies | ✅ Applied | `_rls` migration |

**Conclusion:** V6 Phase 1A is already in origin/main at b91a33f. No merge dependency for N2.

---

## Migration Inventory (relevant to N2)

| Migration | Date | Tables | N2 Relevance | In origin/main? |
|---|---|---|---|---|
| `20260908150000_v6_phase1a_labor_profile_schema` | 20260908150000 | labor_profiles, labor_profile_intakes, employment_episodes | N2-3, N2-4 FK | ✅ YES |
| `20260908150001_v6_phase1a_labor_profile_rls` | 20260908150001 | RLS on above | N2-3, N2-4 RLS | ✅ YES |
| `20260912140411_n1_placement_case_foundation` | 20260912140411 | placement_case | N2 clock anchor | ✅ YES |
| `20260912140412_n1_placement_case_rls` | 20260912140412 | RLS on placement_case | N2 RLS | ✅ YES |
| `20260819083254_p2_commission_schema` | 20260819083254 | commission_policies, commission_ledger, commission_debts | N2-6 base | ✅ YES |
| `20260819104700_p2_commission_rls` | 20260819104700 | RLS on commission tables | N2-6 RLS | ✅ YES |

---

## Affinity to aff_plan.md Decisions

All 18 `AFF-DEC-*` decisions are LOCKED. Discovery confirms no conflicts with these.

| `AFF-DEC-*` | Topic | Status |
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

## Open Decisions (18 — awaiting T0)

See `DISCOVERY.md §3` for full list.

| Category | Count | Key decisions |
|---|---|---|
| Clock/Time | 5 | Q1, Q2a/b/c, Q3a/b |
| Lifecycle | 2 | Q4, Q5 |
| Beneficiary Decision (R2) | 5 | Q7a/b/c/d/e — major revision |
| Permissions | 1 | Q8 |
| Migration/Compat (R2) | 3 | Q9a, Q9b (tightened), Q10 |
| **Total** | **18** | |

---

## T0-R2 Revisions Applied

| # | Change | Reason |
|---|---|---|
| R2-1 | V6 P1: migrations in main confirmed | T0 correction |
| R2-2 | Q7: beneficiaryUserId required, UNRESOLVED, SYSTEM=valid User | T0 directive |
| R2-3 | Q7: Invariant contract for max one ACTIVE per key | T0 directive |
| R2-4 | Q6: Attribution cardinality + immutable facts clarified | T0 directive |
| R2-5 | Q9b: EXACT_SAFE tightened — provenance + writer required | T0 directive |
| R2-6 | All 4 docs synced, HEAD and file count accurate | T0 directive |
