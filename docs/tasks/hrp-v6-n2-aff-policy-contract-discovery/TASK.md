# Task: N2 AFF Policy & Contract Discovery

**Slug:** `hrp-v6-n2-aff-policy-contract-discovery`
**Status:** `READY_FOR_T0_DECISION`
**Type:** READ-ONLY Discovery — no production code changes
**Baseline:** `origin/main` `b91a33f948aed224a88f3e8e7c9847006f33e97f`
**Branch:** `hrp-v6-n2-aff-policy-contract-discovery`
**HEAD (R2):** `fd56ea` (R2 revision pending push)

---

## 1. Outcome (delivered)

- ✅ Surveyed codebase for all 10 N2 policy questions
- ✅ Documented evidence with file:line references
- ✅ Proposed 6 vertical slices with dependency graph (R1 revised)
- ✅ Identified 18 unresolved decisions for T0 (R2 updated)
- ✅ Recommended options for each decision with rationale
- ✅ **R2: Q7 fully revised** — beneficiaryUserId required, UNRESOLVED outcome, SYSTEM actor valid User, invariant contract
- ✅ **R2: Q9b tightened** — EXACT_SAFE requires valid FK + provenance + writer semantics + no conflict + audit
- ✅ **R2: V6 P1 corrected** — migrations already in main, no merge dependency, capability-based dependency
- ✅ **R2: Attribution cardinality clarified** — immutable, separate clocks
- ✅ **R2: All 4 docs synced**

---

## 2. Scope

### 2.1 In Scope

- Read `prisma/schema.prisma` and all migrations
- Read placement-case, intake-writer, labor-profile, referral-guard, commission engine, transfer services
- Read `docs/V6/aff_plan.md` (design authority)
- Produce `DISCOVERY.md` with evidence-backed answers
- Identify gaps between design intent and current codebase
- Propose decomposition into implementable slices
- Verify V6 Phase 1 capability in origin/main via filesystem (not commit ancestry)

### 2.2 Out of Scope (boundary)

- ❌ No schema changes
- ❌ No migration
- ❌ No source/test changes
- ❌ No production DB writes
- ❌ No backfill
- ❌ No policy decisions (T0's job)
- ❌ No `PLANNER_HANDOVER.md` modification
- ❌ No `docs/TIER0_SHIFT_HANDOVER.md` modification
- ❌ No PR #3 / P2 file changes
- ❌ No N4 implementation
- ❌ No N2-1 implementation until T0 unlocks

---

## 3. RQ → STEP → AC

| RQ | Question | AC |
|---|---|---|
| RQ-01 | Q1: Clock type | Recommended calendar days |
| RQ-02 | Q2: Storage = TIMESTAMPTZ UTC; Business = Asia/Bangkok; cut-off 23:59:59.999 VN | Recommended |
| RQ-03 | Q3: Holiday owner + fallback | HR Admin + calendar fallback |
| RQ-04 | Q4: Clock start | `openedAt` |
| RQ-05 | Q5: Pause/reset | Clock RUNNING always |
| RQ-06 | Q6: Attribution immutability | Immutable source, separate clocks |
| RQ-07 | Q7: BeneficiaryDecision | R2: authority record, beneficiaryUserId required, UNRESOLVED outcome, SYSTEM=valid User, max one ACTIVE per key |
| RQ-08 | Q8: Permissions | 6 codes + RLS proposal |
| RQ-09 | Q9: Inventory reuse | Component inventory + conflicts |
| RQ-09b | Q9b: Legacy ctvId | R2: EXACT_SAFE = FK + provenance + writer + no conflict + audit |
| RQ-10 | Q10: Slices | 6 slices; V6 P1 capability in main |

---

## 4. Evidence Index

| File | Purpose | Status |
|---|---|---|
| `DISCOVERY.md` | Main document — 10 questions, evidence, recommendations, 18 T0 decisions | ✅ R2 updated |
| `TASK.md` | This file — RQ → STEP → AC, scope, boundary | ✅ R2 synced |
| `HANDOFF.md` | Status + handoff to T0 | ✅ R2 updated |
| `evidence/OVERVIEW.md` | Affinity to aff_plan.md, migration inventory, V6 P1 status | ✅ R2 synced |

---

## 5. V6 Phase 1A — Corrected (R2)

**V6 Phase 1A migrations are in `prisma/migrations/` of origin/main. No merge dependency.**

Evidence:
```
$ git ls-tree origin/main prisma/migrations/ | Select-String "phase1a"
  prisma/migrations/20260908150000_v6_phase1a_labor_profile_schema/
  prisma/migrations/20260908150001_v6_phase1a_labor_profile_rls/
```

Capability available: `LaborProfile`, `LaborProfileIntake`, `EmploymentEpisode` tables, `CandidateSubmission.laborProfileId` FK, RLS policies.

Implication: N2-3 and N2-4 are not blocked by V6 P1 merge.

---

## 6. T0 Decision Summary (18 decisions)

Full list in `DISCOVERY.md §3`. Summary:

| Category | Count | Key changes |
|---|---|---|
| Clock/Time | 5 | Q1, Q2a/b/c, Q3a/b |
| Lifecycle | 2 | Q4, Q5 |
| Beneficiary Decision | 5 | Q7a/b/c/d/e (R2 major revision) |
| Permissions | 1 | Q8 |
| Migration/Compat | 3 | Q9a, Q9b (R2 tightened), Q10 |
| **Total** | **18** | |

---

## 7. Next Steps

**T0 action:**
1. Review `DISCOVERY.md`
2. Chốt 18 open decisions
3. Authorize Tier 1 to create N2-1 + N2-2

**Tier 1 action (after T0 unlock):**
- Create N2-1 TASK
- Create N2-2 TASK (parallel)
- Do not start N2-3/4/5/6 until prior slices complete

**Branch status:** R2 revision committed, push + PR pending.
