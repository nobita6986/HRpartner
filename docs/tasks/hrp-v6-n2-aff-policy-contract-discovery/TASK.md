# Task: N2 AFF Policy & Contract Discovery

**Slug:** `hrp-v6-n2-aff-policy-contract-discovery`
**Status:** `DONE` — discovery complete, awaiting T0 policy decisions
**Type:** READ-ONLY — no production code changes
**Baseline:** `origin/main` `b91a33f948aed224a88f3e8e7c9847006f33e97f`

---

## 1. Outcome (delivered)

- ✅ Surveyed codebase for all 10 N2 policy questions
- ✅ Documented evidence with file:line references
- ✅ Proposed 5 vertical slices with dependency graph
- ✅ Identified 10 unresolved decisions for T0
- ✅ Recommended options for each decision with rationale

---

## 2. Scope

### 2.1 In Scope

- Read `prisma/schema.prisma` and all migrations
- Read placement-case, intake-writer, labor-profile, referral-guard, commission engine, transfer services
- Read `docs/V6/aff_plan.md` (design authority)
- Produce `DISCOVERY.md` with evidence-backed answers
- Identify gaps between design intent and current codebase
- Propose decomposition into implementable slices

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

---

## 3. RQ → STEP → AC

### RQ-01 (Q1): AFF clock type
- **AC:** Recommended calendar days vs business days with rationale

### RQ-02 (Q2): Timezone canonical + cut-off
- **AC:** Recommended TIMESTAMPTZ Asia/Bangkok with cut-off time proposal

### RQ-03 (Q3): Holiday calendar authority + unconfigured behavior
- **AC:** Recommended HR Admin owner + calendar fallback behavior

### RQ-04 (Q4): Clock start event
- **AC:** Recommended `PlacementCase.openedAt` as canonical anchor

### RQ-05 (Q5): Pause/reset semantics
- **AC:** Recommended clock RUNNING always, assignment expires (no pause)

### RQ-06 (Q6): ReferralAttribution immutability
- **AC:** Documented immutability rules + RLS enforcement

### RQ-07 (Q7): CommissionBeneficiaryDecision separation
- **AC:** Recommended additive `beneficiaryUserId` + handling assignment resolution

### RQ-08 (Q8): Role/permission/data-scope matrix
- **AC:** Proposed 5 permission codes + RLS policy skeleton

### RQ-09 (Q9): Inventory reuse + N2 conflicts
- **AC:** Component inventory with reuse vs conflict assessment

### RQ-10 (Q10): Vertical slice decomposition
- **AC:** 5 slices with dependency graph + migration/test gates per slice

---

## 4. Evidence Index

See `DISCOVERY.md` for full evidence. Summary:

- `DISCOVERY.md` — Main document (this task's deliverable)
- `evidence/codebase-survey-summary.md` — Survey findings
- `evidence/migration-inventory.md` — Relevant migrations

---

## 5. Open Decisions for T0

See `DISCOVERY.md §3` — 10 decisions require T0/Founder input before N2-1 implementation:

1. Clock type (calendar vs business days)
2. Timezone canonical
3. Holiday calendar owner + unconfigured fallback
4. Clock start event confirmation
5. Pause/reset semantics
6. No-handler-assignment = no commission?
7. Permission codes for handling
8. RPC change acceptability for N2-3
9. V6 Phase 1 merge status confirmation
10. N2-3 dependency on V6 LaborProfile

---

## 6. Next Steps

**T0 action:**
1. Review `DISCOVERY.md` recommendations
2. Chốt the 10 open decisions
3. Authorize Tier 1 to create `hrp-v6-n2-aff-01-attribution-foundation` task (N2-1)

**Tier 1 action (after T0):**
- Create N2-1 TASK with full RQ → STEP → AC, baseline, dependencies, test gates
- Do not start implementation until §20 DoR in `aff_plan.md` is satisfied
