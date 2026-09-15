# N2 AFF Discovery — HANDOFF

**Task:** `hrp-v6-n2-aff-policy-contract-discovery`
**Status:** `READY_FOR_T0_DECISION`
**Type:** READ-ONLY Discovery
**Lane:** STANDARD (no implementation in this task)
**Audit:** NONE (read-only docs-only branch)

---

## 1. Final Status

| Item | State |
|---|---|
| Survey scope | ✅ Complete (10 policy questions) |
| Evidence gathering | ✅ Complete (file:line + migration filesystem evidence) |
| Recommendations | ✅ Complete (18 decisions with options + recommendation) |
| Slice decomposition | ✅ Complete (6 slices with dependency graph) |
| V6 P1 capability verified | ✅ Yes — migrations in main@prisma/migrations/ |
| T0 decisions requested | ✅ Yes (18 decisions) |
| Implementation gate | ⏸️ **BLOCKED — awaiting T0** |

---

## 2. Deliverables

| File | Lines | Purpose | Status |
|---|---|---|---|
| `DISCOVERY.md` | 711 | 10 questions + evidence + 18 T0 decisions | ✅ R2 updated |
| `TASK.md` | 151 | RQ → STEP → AC, scope, boundary | ✅ R2 synced |
| `HANDOFF.md` | 191 | Status + handoff to T0 | ✅ R2 updated |
| `evidence/OVERVIEW.md` | 151 | aff_plan.md affinity, migration inventory, V6 P1 status | ✅ R2 synced |
| **Total** | **1204** | **4 files, zero code** | ✅ |

---

## 3. Critical Evidence: V6 Phase 1A in origin/main (CORRECTED R2)

```
$ git ls-tree origin/main prisma/migrations/ | Select-String "phase1a"
  prisma/migrations/20260908150000_v6_phase1a_labor_profile_schema/
  prisma/migrations/20260908150001_v6_phase1a_labor_profile_rls/
```

**Capability available:**
- `LaborProfile` table: CREATE TABLE ✅
- `LaborProfileIntake` table: CREATE TABLE ✅
- `EmploymentEpisode` table: CREATE TABLE ✅
- `CandidateSubmission.laborProfileId` nullable FK: ADD COLUMN ✅
- RLS policies on all three tables: APPLIED ✅

**Dependency impact:**
- N2-1 (Attribution Foundation): No V6 P1 dep → can start immediately
- N2-2 (Link Capture): No V6 P1 dep → can start immediately
- N2-3 (Apply Attribution): LaborProfile FK available → can start
- N2-4 (Handling Assignment): LaborProfile FK available → can start
- N2-5 (Beneficiary Decision): Requires N2-4 → sequential
- N2-6 (Commission Beneficiary): Requires N2-5 → sequential

**No merge dependency.** V6 P1 capability is in origin/main at b91a33f.

---

## 4. T0 Decision Summary (18 decisions)

See `DISCOVERY.md §3` for full list. Summary:

| # | Decision | Recommendation |
|---|---|---|
| Q1 | Clock type | **Calendar** |
| Q2a | Storage timezone | **TIMESTAMPTZ UTC** |
| Q2b | Business clock timezone | **Asia/Bangkok** |
| Q2c | Cut-off time | **23:59:59.999 VN** |
| Q3a | Holiday owner | **HR Admin** |
| Q3b | Unconfigured fallback | **Calendar days** |
| Q4 | Clock start | **`openedAt`** |
| Q5 | Pause/reset | **Clock RUNNING always** |
| Q7a | Decision as authority | **YES, immutable record** |
| Q7b | beneficiaryUserId for ACTIVE | **Required (not nullable)** |
| Q7c | UNRESOLVED outcome | **No active decision with null beneficiary** |
| Q7d | SYSTEM actor | **Valid User FK (not magic string)** |
| Q7e | Invariant: max one ACTIVE per key | **Yes, partial unique index + advisory lock** |
| Q8 | Permission codes | **6 codes per proposal** |
| Q9a | RPC change for N2-3 | **Yes, with LIVE test plan** |
| Q9b | Legacy ctvId classification | **EXACT_SAFE = FK + provenance + writer + no conflict + audit** |
| Q10 | V6 P1 capability | **Confirmed in main — no dependency** |

---

## 5. T0-R2 Key Changes

### Q7 — CommissionBeneficiaryDecision (R2 MAJOR REVISION)

**Changes from R1:**
- `beneficiaryUserId` is **REQUIRED** for ACTIVE decision (not nullable)
- No handler/no beneficiary → typed `UNRESOLVED` outcome; **no active decision** created with `beneficiaryUserId = null`
- Actor SYSTEM must be **valid `User` row** (pre-created system service account); not a magic string
- Invariant contract: **max one ACTIVE decision per (laborProfileId, assignmentId, milestone)** — enforced by partial unique index + advisory lock
- Correction/reversal preserves SUPERSEDED/REVERSED history (never delete)

### Q9b — Legacy ctvId (R2 TIGHTENED)

**Changes from R1:**
- Valid `User` FK alone is **NOT sufficient** for EXACT_SAFE
- EXACT_SAFE requires ALL of: valid FK + provenance + writer semantics + no conflict + audit trail
- UNRESOLVED rows must be manually reviewed, not blindly backfilled

### Q6 — Attribution Cardinality (R2 CLARIFIED)

- Attribution does NOT change when handling assignment changes or expires
- Two separate clocks: attribution TTL (30d) and handling protected window (7d)
- Attribution survives assignment expiry and handler transfer

### V6 Phase 1 (R2 CORRECTED)

- **Migrations already in `origin/main@prisma/migrations/`**
- **No merge dependency**
- **Capability-based dependency**: N2-3/4 can start because LaborProfile FK is available in main

---

## 6. Branch State

**Branch:** `hrp-v6-n2-aff-policy-contract-discovery`
**Base:** `origin/main` b91a33f
**HEAD (R2):** `fd56ea` (R2 revision — pending push)
**Diff vs origin/main:** 4 files, +1204 lines (docs only)
**R2 changes:** DISCOVERY.md, TASK.md, HANDOFF.md, evidence/OVERVIEW.md updated

---

## 7. What T0 Should Do

1. Read `DISCOVERY.md` end-to-end
2. Review §3 (18 decisions) — confirm or override each recommendation
3. Sign off on:
   - Q7 R2 revisions (biggest design changes)
   - Q9b R2 tightening (EXACT_SAFE criteria)
   - V6 P1 capability (already in main)
4. Authorize Tier 1 to create N2-1 + N2-2 tasks

---

## 8. Boundary Compliance

- ✅ No schema/migration/source changes
- ✅ No production DB writes
- ✅ No `PLANNER_HANDOVER.md` / `TIER0_SHIFT_HANDOVER.md` modifications
- ✅ No PR #3 / P2 file changes
- ✅ No N4 implementation
- ✅ No N2 implementation (locked by T0 decisions)

---

## 9. Final Note

This is a **decision package**, not an implementation artifact.

The 18 decisions in `DISCOVERY.md §3` are the bottleneck for N2. Once T0 chốt:
1. Tier 1 creates N2-1 + N2-2 tasks (parallel)
2. Tier 1 tracks N2-3/4 (no V6 dependency — can start)
3. Tier 1 plans N2-5/6 sequentially

No further S1 survey needed before T0 decisions.

---

**Handoff complete. Awaiting T0.**
