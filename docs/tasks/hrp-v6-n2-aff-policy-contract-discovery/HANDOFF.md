# N2 AFF Discovery — HANDOFF

**Task:** `hrp-v6-n2-aff-policy-contract-discovery`
**Status:** `COMPLETE` / `READY_FOR_MERGE`
**Audit:** `NONE`
**Lane:** STANDARD (no implementation in this task)
**Type:** READ-ONLY Discovery
**Baseline:** `origin/main` `b91a33f948aed224a88f3e8e7c9847006f33e97f`
**Branch:** `hrp-v6-n2-aff-policy-contract-discovery`
**PR:** [#4](https://github.com/nobita6986/HRpartner/pull/4)

---

## 1. Final Status

| Item | State |
|---|---|
| Survey scope | ✅ Complete |
| Evidence gathering | ✅ Complete (file:line + filesystem migration evidence) |
| T0 verdict applied | ✅ All R0–R3 decisions applied |
| Locked decisions | ✅ All operational decisions LOCKED |
| 6-slice plan | ✅ Ready |
| Implementation gate | ⏸️ LOCKED until PR #4 merges (Tier 1 unlocks N2-1 separately) |

**Task is COMPLETE — ready for review and merge.**

---

## 2. Deliverables

4 files. Zero code.

| File | Purpose |
|---|---|
| `DISCOVERY.md` | Locked decisions, schema sketches, invariant contracts, 6-slice plan |
| `TASK.md` | RQ → STEP → AC, scope, boundary |
| `HANDOFF.md` | Status + handoff to Tier 1 / Tier 0 reviewer |
| `evidence/OVERVIEW.md` | Migration inventory + aff_plan.md affinity + V6 P1 status |

---

## 3. Critical Evidence

### V6 P1 in origin/main

```
$ git ls-tree origin/main prisma/migrations/ | Select-String "phase1a"
  prisma/migrations/20260908150000_v6_phase1a_labor_profile_schema/
  prisma/migrations/20260912140411_n1_placement_case_foundation
  prisma/migrations/20260908150001_v6_phase1a_labor_profile_rls/
```

V6 P1 capability: `LaborProfile`, `LaborProfileIntake`, `EmploymentEpisode` tables, `CandidateSubmission.laborProfileId` FK, RLS — all in main.

---

## 4. Locked Decisions Summary

### Clock & Time
- Calendar days (no business days)
- Storage: TIMESTAMPTZ UTC
- Business clock: Asia/Bangkok
- Day boundary: exclusive next-day `[start, nextDayStart)`
- Holiday: OUT OF N2 SCOPE

### Lifecycle
- Clock start: `PlacementCase.openedAt`
- Pause: none (clock RUNNING always); assignment has expiresAt

### Attribution
- Immutable source; separate clocks (7d handling, 30d attribution)
- Immutable facts vs mutable lifecycle metadata split

### Beneficiary Decision (Q7 — Critical)
- Authority record, immutable
- **Invariant**: max one ACTIVE per `(laborProfileId, assignmentId, milestone)`
- **Nullable-safe**: PG15+ `NULLS NOT DISTINCT` OR COALESCE sentinel partial unique
- **Advisory lock**: normalized tuple with sentinel delimiter
- **Actor model**: `actorType USER|SYSTEM` + `actorUserId nullable` + `CHECK` constraint
- **UNRESOLVED**: typed result + outbox event (no decision row created)
- **Correction/reversal**: SUPERSEDED/REVERSED history preserved

### Migration & Compat
- RPC signature change accepted for N2-3 with LIVE test plan
- EXACT_SAFE classification: FK + provenance + writer semantics + no conflict + audit
- V6 P1 capability in main — no merge dep

### Permissions
- 6 codes per proposal in DISCOVERY.md §2.6
- RLS policy skeleton ready

---

## 5. 6 Slice Plan

| Slice | Slug | Schema scope | Migration risk | Test gate |
|---|---|---|---|---|
| N2-1 | `hrp-v6-n2-aff-01-attribution-foundation` | `ReferralAttribution` immutable table | Low | Immutability + RLS |
| N2-2 | `hrp-v6-n2-aff-02-link-capture` | None (pure app logic) | Zero | Race, forged code |
| N2-3 | `hrp-v6-n2-aff-03-apply-attribution` | Additive columns + RPC signature change | HIGH | RPC migration test |
| N2-4 | `hrp-v6-n2-aff-04-handling-assignment` | `labor_profile_handling_assignments` with partial unique | Medium | Race to assign, expiry |
| N2-5 | `hrp-v6-n2-aff-05-beneficiary-decision` | `CommissionBeneficiaryDecision` with NULLS NOT DISTINCT + CHECK + advisory lock | Medium | Invariant, UNRESOLVED typed result |
| N2-6 | `hrp-v6-n2-aff-06-commission-beneficiary` | Additive `beneficiary_user_id` + EXACT_SAFE-only backfill + engine update | Medium | EXACT_SAFE classification |

---

## 6. Boundary Compliance

- ✅ No schema/migration/source changes
- ✅ No production DB writes
- ✅ No `PLANNER_HANDOVER.md` / `TIER0_SHIFT_HANDOVER.md` modifications
- ✅ No PR #3 / P2 file changes
- ✅ No N4 implementation
- ✅ No N2 implementation
- ✅ Docs-only PR
- ✅ Read-only research on existing codebase

---

## 7. T0 Final Verdict Applied

**Round-by-round changes:**

| Round | Files affected | Major changes |
|---|---|---|
| R0 | All 4 | Discovery baseline — 10 questions answered |
| R1 | All 4 | Status sync; HANDOFF.md added; Q7 (CommissionBeneficiaryDecision as authority); Q9b (legacy classification); Q2 (timezone layer); V6 P1 (initial wrong evidence) |
| R2 | All 4 | V6 P1 corrected (filesystem evidence); Q7 R2 (beneficiaryUserId required, SYSTEM = valid User FK, invariant contract, UNRESOLVED outcome); Q9b tightened; Q6 immutable facts |
| **R3** | All 4 | T0 final verdict — NULLS NOT DISTINCT, advisory lock with sentinel, **actorType/actorUserId + CHECK** (no SYSTEM user), outcome removed, UNRESOLVED = typed result only, immutable/mutable split, exclusive next-day boundary, Holiday OUT OF SCOPE, status COMPLETE/READY_FOR_MERGE, PR #4 audit facts |

---

## 8. What's Next

### Reviewer path
1. Open [PR #4](https://github.com/nobita6986/HRpartner/pull/4)
2. Review 4 docs files (zero code risk)
3. Approve → merge to `main`

### After merge
1. Tier 1 reads `DISCOVERY.md` §2 (locked decisions) as the contract
2. Tier 1 creates `hrp-v6-n2-aff-01-attribution-foundation` task
3. Implementation starts under separate task in separate branch

### Out of PR scope
- ❌ No N2-1 implementation in this PR
- ❌ No schema changes
- ❌ No migration

---

**Handoff complete. Status: COMPLETE / READY_FOR_MERGE. PR #4 ready for review.**
