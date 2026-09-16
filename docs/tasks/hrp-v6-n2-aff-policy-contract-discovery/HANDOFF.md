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
| T0 verdict applied | ✅ All R0–R4 decisions applied |
| Locked decisions | ✅ All operational decisions LOCKED |
| 6-slice plan | ✅ Ready |
| R4 corrections | ✅ 7 blockers fixed across 4 artifacts |
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

### V6 P1 in origin/main (R4 reproducible)

```
$ git ls-tree origin/main prisma/migrations/ | Select-String "phase1a"
  040000 tree 613b6fe6... prisma/migrations/20260908150000_v6_phase1a_labor_profile_schema/
  040000 tree a399344c... prisma/migrations/20260908150001_v6_phase1a_labor_profile_rls/

$ git ls-tree origin/main prisma/migrations/ | Select-String "n1_placement_case"
  040000 tree <hash>...   prisma/migrations/20260912140411_n1_placement_case_foundation/
```

V6 P1 capability: `LaborProfile`, `LaborProfileIntake`, `EmploymentEpisode` tables, `CandidateSubmission.laborProfileId` FK, RLS — all in main.

---

## 4. Locked Decisions Summary (R4 final)

### Clock & Time
- Calendar days (no business days)
- Storage: TIMESTAMPTZ UTC
- Business clock: Asia/Bangkok
- Day boundary: exclusive next-day `[start, nextDayStart)` (helper removed; N2-1 owns)
- Holiday: OUT OF N2 SCOPE

### Lifecycle
- Clock start: `PlacementCase.openedAt`
- Pause: none (clock RUNNING always); assignment has expiresAt

### Attribution (Q6)
- Immutable facts vs mutable lifecycle metadata split
- Multi-layer enforcement: DB trigger + write-once CHECK + RLS USING + RLS WITH CHECK; application is convenience, not authority
- `laborProfileId` write-once (NULL → value, never back)
- Separate clocks: 7d handling, 30d attribution

### Beneficiary Decision (Q7)
- Authority record; immutable facts vs mutable lifecycle metadata split (R4)
- **Invariant**: max one ACTIVE per `(laborProfileId, assignmentId, milestone)`
- **Nullable-safe SQL** (R4 corrected): `NULLS NOT DISTINCT` immediately after column list, before `WHERE status = 'ACTIVE'`
- **Concurrency** (R4 corrected): interactive transaction contract — `pg_advisory_xact_lock` + lookup + supersede + insert in single `prisma.$transaction`
- **Actor model**: `actorType USER|SYSTEM` + `actorUserId nullable` + CHECK constraint (XOR)
- **UNRESOLVED**: typed result + outbox event (no decision row created)
- **Correction vs Reversal** (R4): distinct commands; reversal does NOT create replacement ACTIVE row by default
- **Correction/reversal history**: SUPERSEDED/REVERSED preserved forever

### Migration & Compat
- RPC signature change accepted for N2-3 with LIVE test plan
- EXACT_SAFE classification: FK + provenance + writer semantics + no conflict + audit
- V6 P1 capability in main — no merge dep

### Permissions (Q8 — R4 corrected)
- **5 explicit permission codes** + implicit self-view
- ADMIN/HR_MANAGER for beneficiary decisions
- HR_STAFF = visibility only, no beneficiary override
- System engine path is internal capability, not a human permission
- RLS USING = read visibility; WITH CHECK = write-path policy; service-layer is authorization authority

---

## 5. 6 Slice Plan

| Slice | Slug | Schema scope | Migration risk | Test gate |
|---|---|---|---|---|
| N2-1 | `hrp-v6-n2-aff-01-attribution-foundation` | `ReferralAttribution` immutable facts + lifecycle metadata split; trigger + write-once CHECK on `laborProfileId`; partial unique on laborProfileId; RLS USING + WITH CHECK | Low | Immutability trigger, lifecycle transitions, RLS read + write |
| N2-2 | `hrp-v6-n2-aff-02-link-capture` | None (pure app logic) | Zero | Race, forged code |
| N2-3 | `hrp-v6-n2-aff-03-apply-attribution` | Additive columns + RPC signature change | HIGH | RPC migration test |
| N2-4 | `hrp-v6-n2-aff-04-handling-assignment` | `labor_profile_handling_assignments` with partial unique; RLS USING + WITH CHECK | Medium | Race to assign, expiry |
| N2-5 | `hrp-v6-n2-aff-05-beneficiary-decision` | `CommissionBeneficiaryDecision` with NULLS NOT DISTINCT (R4 syntax) + CHECK + CHECK actor XOR + immutable-fact trigger; interactive transaction per R4 | Medium | Invariant, UNRESOLVED typed result, correction vs reversal split, transaction scope |
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
- ✅ R4 is correction-only — no new policy, no new survey

---

## 7. T0 Final Verdict Applied (R0–R4)

| Round | Files affected | Major changes |
|---|---|---|
| R0 | All 4 | Discovery baseline — 10 questions answered |
| R1 | All 4 | Status sync; HANDOFF.md added; Q7 (authority record); Q9b (legacy); Q2 (timezone); V6 P1 initial |
| R2 | All 4 | V6 P1 corrected; Q7 R2 (beneficiaryUserId required + SYSTEM FK + invariant + UNRESOLVED); Q9b tightened; Q6 immutable |
| R3 | All 4 | NULLS NOT DISTINCT, advisory lock, actorType/CHECK, outcome removed, UNRESOLVED typed, immutable/mutable split (referral only), exclusive next-day, Holiday OUT, COMPLETE/READY_FOR_MERGE |
| **R4** | All 4 | **7 blockers fixed**: DDL syntax fix, transaction-scoped advisory lock, multi-layer attribution immutability, off-by-one helper removed, reproducible evidence commands, CommissionBeneficiaryDecision immutable/mutable split + correction vs reversal, permission codes reconciled to 5+implicit-self + WITH CHECK |

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
