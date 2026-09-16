# Task: N2 AFF Policy & Contract Discovery

**Slug:** `hrp-v6-n2-aff-policy-contract-discovery`
**Status:** `COMPLETE` / `READY_FOR_MERGE`
**Audit:** `NONE`
**Type:** READ-ONLY Discovery — no production code changes
**Baseline:** `origin/main` `b91a33f948aed224a88f3e8e7c9847006f33e97f`
**Branch:** `hrp-v6-n2-aff-policy-contract-discovery`
**PR:** [#4](https://github.com/nobita6986/HRpartner/pull/4)
**Audited prior commit on PR #4:** `0341a43` (R2 revision)

---

## 1. Outcome (delivered)

- ✅ Surveyed codebase for all 10 N2 policy questions
- ✅ Documented evidence with file:line references
- ✅ Proposed 6 vertical slices with dependency graph
- ✅ **T0 R3 verdict applied**: nullable-safe invariant (NULLS NOT DISTINCT), advisory lock with sentinel, actorType/actorUserId model, UNRESOLVED as typed result (no decision row), exclusive next-day boundary, Holiday out of scope
- ✅ All 4 docs synced to COMPLETE / READY_FOR_MERGE
- ✅ PR #4 opened as docs-only

---

## 2. Scope

### 2.1 In Scope

- Read `prisma/schema.prisma` and all migrations
- Read placement-case, intake-writer, labor-profile, referral-guard, commission engine, transfer services
- Read `docs/V6/aff_plan.md`
- Produce `DISCOVERY.md` with evidence-backed answers
- Identify gaps between design intent and current codebase
- Propose decomposition into implementable slices
- Verify V6 Phase 1 capability via filesystem evidence

### 2.2 Out of Scope (boundary)

- ❌ No schema changes
- ❌ No migration
- ❌ No source/test changes
- ❌ No production DB writes
- ❌ No backfill
- ❌ No N2-1 implementation
- ❌ No `PLANNER_HANDOVER.md` modification
- ❌ No `docs/TIER0_SHIFT_HANDOVER.md` modification
- ❌ No PR #3 / P2 file changes
- ❌ No N4 implementation

---

## 3. RQ → STEP → AC

| RQ | Question | AC |
|---|---|---|
| RQ-01 | Q1: Clock type | **Calendar days** |
| RQ-02 | Q2: Timezone | **Storage TIMESTAMPTZ UTC; Business Asia/Bangkok; exclusive next-day boundary** |
| RQ-03 | Q3: Holiday | **OUT OF N2 SCOPE** |
| RQ-04 | Q4: Clock start | **`PlacementCase.openedAt`** |
| RQ-05 | Q5: Pause/reset | **Clock RUNNING always, assignment có expiresAt** |
| RQ-06 | Q6: Attribution cardinality | **Immutable; separate clocks (7d handling, 30d attribution); immutable facts vs mutable lifecycle metadata split** |
| RQ-07 | Q7: BeneficiaryDecision | **Authority record; invariant: max one ACTIVE per `(laborProfileId, assignmentId, milestone)` with NULLS NOT DISTINCT; actorType USER/SYSTEM + actorUserId nullable + CHECK; UNRESOLVED = typed result + outbox (no decision row); correction/reversal history preserved** |
| RQ-08 | Q8: Permissions | **6 codes + RLS proposal** |
| RQ-09 | Q9: Inventory reuse | **Component inventory + conflicts; Holiday out of scope** |
| RQ-09b | Q9b: Legacy ctvId | **EXACT_SAFE = FK + provenance + writer semantics + no conflict + audit** |
| RQ-10 | Q10: Slices | **6 slices; V6 P1 capability in main, no merge dep** |

---

## 4. Deliverables

4 files. Zero code. Pure docs.

| File | Purpose |
|---|---|
| `DISCOVERY.md` | Main document — locked decisions, schema sketches, invariant contracts, slice plan |
| `TASK.md` | This file — RQ → STEP → AC, scope, boundary |
| `HANDOFF.md` | Status + handoff summary |
| `evidence/OVERVIEW.md` | Migration inventory + aff_plan.md affinity + V6 P1 evidence |

---

## 5. Locked Decisions Quick Reference

### Clock & Time
| Decision | Value |
|---|---|
| Q1 | Calendar days |
| Q2a | TIMESTAMPTZ UTC |
| Q2b | Asia/Bangkok business |
| Q2c | Exclusive next-day `[start, nextDayStart)` |
| Q3 | Holiday OUT OF N2 SCOPE |

### Lifecycle
| Decision | Value |
|---|---|
| Q4 | `PlacementCase.openedAt` |
| Q5 | Clock RUNNING always |

### Attribution
| Decision | Value |
|---|---|
| Q6 | Immutable; separate clocks (7d handling, 30d attribution) |

### Beneficiary Decision
| Decision | Value |
|---|---|
| Q7a | Authority record (immutable) |
| Q7b | max one ACTIVE per `(laborProfileId, assignmentId, milestone)` |
| Q7c | NULLS NOT DISTINCT (PG 15+) OR COALESCE sentinel partial unique |
| Q7d | advisory lock with normalized tuple + sentinel |
| Q7e | actorType USER/SYSTEM + actorUserId nullable + CHECK |
| Q7f | UNRESOLVED = typed result + outbox (no decision row) |
| Q7g | Correction/reversal preserves SUPERSEDED/REVERSED history |

### Migration & Compat
| Decision | Value |
|---|---|
| Q9b | EXACT_SAFE = FK + provenance + writer semantics + no conflict + audit |
| Q10 | V6 P1 capability in main — no merge dep |

---

## 6. Branch State

**Branch:** `hrp-v6-n2-aff-policy-contract-discovery`
**Base:** `origin/main` b91a33f
**Diff:** 4 files (R2 baseline; R3 additions to invariant contract, actor model, day boundary, scope)
**PR:** [Pull Request #4](https://github.com/nobita6986/HRpartner/pull/4)

---

## 7. What's Required for Tier 1 to Open N2-1

After this discovery merged:
1. Tier 1 reads `DISCOVERY.md` §2 (Locked Decisions) as contract
2. Tier 1 creates `hrp-v6-n2-aff-01-attribution-foundation` task
3. TASK must include:
   - `ReferralAttribution` schema per §2.4 immutable facts / mutable lifecycle
   - Idempotency test for `consume()` method
   - RLS enforcement tests
   - §20 DoR from `aff_plan.md` satisfiable

---

## 8. Status

✅ **COMPLETE / READY_FOR_MERGE**

PR #4 is docs-only, no production code changes. Reviewer can:
- Approve → merge to main
- Request changes → open follow-up revisions

**This task is done after merge. N2-1 is a separate task T0 will unlock via Tier 1.**
