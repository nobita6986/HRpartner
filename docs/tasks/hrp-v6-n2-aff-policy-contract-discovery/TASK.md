# Task: N2 AFF Policy & Contract Discovery

**Slug:** `hrp-v6-n2-aff-policy-contract-discovery`
**Status:** `READY_FOR_T0_DECISION`
**Type:** READ-ONLY Discovery — no production code changes
**Baseline:** `origin/main` `b91a33f948aed224a88f3e8e7c9847006f33e97f`
**Branch:** `hrp-v6-n2-aff-policy-contract-discovery`
**HEAD:** see `git log -1`

---

## 1. Outcome (delivered)

- ✅ Surveyed codebase for all 10 N2 policy questions
- ✅ Documented evidence with file:line references
- ✅ Proposed 6 vertical slices with dependency graph (revised per T0 R1)
- ✅ Identified 15 unresolved decisions for T0 (revised per T0 R1)
- ✅ Recommended options for each decision with rationale
- ✅ **Revised Q7** per T0: CommissionBeneficiaryDecision as authority record (not dynamic handler read)
- ✅ **Timezone layer separation**: Storage UTC / Business clock Asia/Bangkok
- ✅ **Legacy ctvId classification**: EXACT_SAFE vs UNRESOLVED
- ✅ **V6 Phase 1 merge status verified with evidence** (NOT in origin/main)

---

## 2. Scope

### 2.1 In Scope

- Read `prisma/schema.prisma` and all migrations
- Read placement-case, intake-writer, labor-profile, referral-guard, commission engine, transfer services
- Read `docs/V6/aff_plan.md` (design authority)
- Produce `DISCOVERY.md` with evidence-backed answers
- Identify gaps between design intent and current codebase
- Propose decomposition into implementable slices
- Verify V6 Phase 1 merge status with git evidence

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

### RQ-01 (Q1): AFF clock type
- **AC:** Recommended calendar days vs business days with rationale

### RQ-02 (Q2): Timezone canonical + cut-off
- **AC:** Storage = TIMESTAMPTZ UTC; Business clock = Asia/Bangkok; cut-off = 23:59:59.999 VN

### RQ-03 (Q3): Holiday calendar authority + unconfigured behavior
- **AC:** Recommended HR Admin owner + calendar fallback behavior

### RQ-04 (Q4): Clock start event
- **AC:** Recommended `PlacementCase.openedAt` as canonical anchor

### RQ-05 (Q5): Pause/reset semantics
- **AC:** Recommended clock RUNNING always, assignment expires (no pause)

### RQ-06 (Q6): ReferralAttribution immutability + cardinality
- **AC:** Immutable source; attribution does NOT change when handling changes/expires; handling clock (7d) and attribution clock (30d) are separate

### RQ-07 (Q7): CommissionBeneficiaryDecision separation — REVISED
- **AC:** Decision as authority record (NOT dynamic handler read); handlingAssignmentId nullable (evidence only); decision snapshots beneficiary, reason, source, evidence, decidedAt, actor; engine reads decision not active handler

### RQ-08 (Q8): Role/permission/data-scope matrix
- **AC:** 6 permission codes (incl. CAN_CREATE_BENEFICIARY_DECISION) + RLS policy skeleton

### RQ-09 (Q9): Inventory reuse + N2 conflicts + legacy classification
- **AC:** Component inventory with reuse vs conflict assessment; legacy ctvId backfill requires EXACT_SAFE / UNRESOLVED classification (NO blanket backfill)

### RQ-10 (Q10): Vertical slice decomposition
- **AC:** 6 slices with dependency graph; V6 Phase 1A merge required for N2-3/4 (verified NOT yet merged)

---

## 4. Evidence Index

- `DISCOVERY.md` — Main document (this task's deliverable)
- `HANDOFF.md` — Status and handoff summary
- `evidence/OVERVIEW.md` — Survey findings + aff_plan.md affinity

---

## 5. T0 Decision Required Before N2 Implementation

See `DISCOVERY.md §3` for full list. Summary of **15 decisions**:

1. Q1: Clock type (calendar vs business days)
2. Q2a: Storage timezone (TIMESTAMPTZ UTC)
3. Q2b: Business clock timezone (Asia/Bangkok)
4. Q2c: Cut-off time
5. Q3a: Holiday calendar owner
6. Q3b: Unconfigured fallback
7. Q4: Clock start event confirmation
8. Q5: Pause/reset semantics
9. Q7a: CommissionBeneficiaryDecision as authority (T0 revised)
10. Q7b: handlingAssignmentId nullable (T0 revised)
11. Q7c: No handler = skip credit or create decision?
12. Q8: Permission codes for handling
13. Q9a: RPC change acceptability for N2-3
14. Q9b: Legacy ctvId backfill classification (T0 revised)
15. Q10: N2-1/N2-2 can run before V6 P1 merge?

---

## 6. V6 Phase 1 Dependency Status

**Verified evidence:**
```
$ git merge-base --is-ancestor 3a33212 origin/main
# exit 1: V6 P1 schema commit NOT in origin/main (b91a33f)
```

**Impact on N2 slices:**
- N2-1 (Attribution Foundation): **No V6 P1 dep** → can start after T0 unlocks
- N2-2 (Link Capture): **No V6 P1 dep** → can start after T0 unlocks
- N2-3 (Apply Attribution): **REQUIRES V6 P1 merge** → blocked
- N2-4 (Handling Assignment): **REQUIRES V6 P1 merge** → blocked
- N2-5 (Beneficiary Decision): Requires N2-4 → blocked
- N2-6 (Commission Beneficiary): Requires N2-5 → blocked

**T0 should consider:** Allow N2-1/N2-2 to proceed in parallel with V6 P1 merge preparation.

---

## 7. Next Steps

**T0 action:**
1. Review `DISCOVERY.md` recommendations
2. Chốt the 15 open decisions
3. Authorize Tier 1 to create N2-1 task (with N2-2 in parallel)

**Tier 1 action (after T0 unlock):**
- Create N2-1 TASK with full RQ → STEP → AC, baseline, dependencies, test gates
- Create N2-2 TASK in parallel (no schema dependency on N2-1)
- Do not start implementation until §20 DoR in `aff_plan.md` is satisfied
- Track V6 P1 merge status; N2-3/N2-4 cannot start before merge

**Branch status:** Awaiting T0 unlock.
