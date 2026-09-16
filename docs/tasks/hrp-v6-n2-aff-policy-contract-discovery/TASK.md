# Task: N2 AFF Policy & Contract Discovery

**Slug:** `hrp-v6-n2-aff-policy-contract-discovery`
**Status:** `COMPLETE` / `READY_FOR_MERGE`
**Audit:** `NONE`
**Type:** READ-ONLY Discovery — no production code changes
**Baseline:** `origin/main` `b91a33f948aed224a88f3e8e7c9847006f33e97f`
**Branch:** `hrp-v6-n2-aff-policy-contract-discovery`
**PR:** [#4](https://github.com/nobita6986/HRpartner/pull/4)

---

## 1. Outcome (delivered)

- ✅ Surveyed codebase for all 10 N2 policy questions
- ✅ Documented evidence with file:line references
- ✅ Proposed 6 vertical slices with dependency graph
- ✅ **T0 R0–R4 verdicts applied**:
  - R0: discovery baseline
  - R1: status sync; HANDOFF.md; Q7 authority record; Q9b classification; Q2 timezone layering; V6 P1 initial evidence
  - R2: V6 P1 corrected (filesystem); Q7 beneficiaryUserId required + SYSTEM FK + invariant; Q9b tightened; Q6 immutable
  - R3: NULLS NOT DISTINCT, advisory lock, actorType/actorUserId + CHECK, UNRESOLVED typed result, immutable/mutable split (referral only), exclusive next-day, Holiday out of scope, COMPLETE/READY_FOR_MERGE, PR #4
  - **R4 (this)**: 7 blocker corrections applied — SQL syntax fix, transaction-scoped advisory lock, immutable/mutable split for CommissionBeneficiaryDecision, correction vs reversal semantics, off-by-one helper removed, permission codes reconciled to 5+implicit-self + WITH CHECK, evidence commands reproducible
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
- ❌ No new policy decisions (R4 is correction-only)

---

## 3. RQ → STEP → AC

| RQ | Question | AC |
|---|---|---|
| RQ-01 | Q1: Clock type | **Calendar days** |
| RQ-02 | Q2: Timezone | **Storage TIMESTAMPTZ UTC; Business Asia/Bangkok; exclusive next-day boundary (helper removed — N2-1 owns concrete implementation; acceptance vector locked)** |
| RQ-03 | Q3: Holiday | **OUT OF N2 SCOPE** |
| RQ-04 | Q4: Clock start | **`PlacementCase.openedAt`** |
| RQ-05 | Q5: Pause/reset | **Clock RUNNING always, assignment có expiresAt** |
| RQ-06 | Q6: Attribution cardinality | **Immutable facts (referrer, snapshot, click, expires, laborProfileId write-once) vs mutable lifecycle metadata (status, consumedAt); multi-layer enforcement (trigger + write-once CHECK + RLS USING + RLS WITH CHECK), not RLS alone; application service is convenience, not authority** |
| RQ-07 | Q7: BeneficiaryDecision | **Authority record; immutable facts (business key, beneficiary, source, reason, evidence, decidedAt, actor, handling-snapshot) vs mutable lifecycle metadata (status, supersededById, updatedAt); invariant: max one ACTIVE per business key with NULLS NOT DISTINCT (R4 corrected SQL syntax); interactive transaction contract for advisory lock; actorType USER/SYSTEM + actorUserId nullable + CHECK; UNRESOLVED = typed result + outbox (no decision row); correction vs reversal semantics split (R4)** |
| RQ-08 | Q8: Permissions | **5 explicit permission codes + implicit self-view; ADMIN/HR_MANAGER only for beneficiary decisions; HR_STAFF not for override; system engine is internal capability, not human permission; RLS USING = read visibility, WITH CHECK = write-path policy** |
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
| Q2c | Exclusive next-day `[start, nextDayStart)` (helper removed; N2-1 owns) |
| Q3 | Holiday OUT OF N2 SCOPE |

### Lifecycle
| Decision | Value |
|---|---|
| Q4 | `PlacementCase.openedAt` |
| Q5 | Clock RUNNING always |

### Attribution
| Decision | Value |
|---|---|
| Q6 | Immutable facts vs mutable metadata split; multi-layer enforcement (trigger + write-once CHECK + RLS USING + RLS WITH CHECK); application is convenience, not authority |

### Beneficiary Decision
| Decision | Value |
|---|---|
| Q7a | Authority record (immutable facts vs mutable lifecycle metadata split per R4) |
| Q7b | max one ACTIVE per `(laborProfileId, assignmentId, milestone)` |
| Q7c | NULLS NOT DISTINCT (PG 15+) with R4-corrected syntax OR COALESCE sentinel + sentinel-domain CHECK |
| Q7d | Interactive transaction contract: lock + lookup + supersede + insert in single `prisma.$transaction` |
| Q7e | actorType USER/SYSTEM + actorUserId nullable + CHECK |
| Q7f | UNRESOLVED = typed result + outbox (no decision row) |
| Q7g | Correction (supersede + new ACTIVE) vs Reversal (REVERSED, no replacement by default) — distinct commands |

### Migration & Compat
| Decision | Value |
|---|---|
| Q9b | EXACT_SAFE = FK + provenance + writer semantics + no conflict + audit |
| Q10 | V6 P1 capability in main — no merge dep |

### Permissions
| Decision | Value |
|---|---|
| Q8 | **5 explicit codes + implicit self-view** (corrected from earlier 6-code table) |

---

## 6. R4 Blocker Corrections (this revision)

| # | Blocker | Correction |
|---|---|---|
| 1 | DDL `NULLS NOT DISTINCT` placed after `WHERE` — invalid PostgreSQL syntax | `NULLS NOT DISTINCT` placed **immediately after column list**, before `WHERE status = 'ACTIVE'` |
| 2 | Advisory lock not in transaction — `pg_advisory_xact_lock` releases on statement end | **Interactive transaction** contract: lock + lookup + supersede + insert all in single `prisma.$transaction(async tx => ...)`; uses `hashtextextended(key, 0)` |
| 3 | Attribution immutability contract self-contradictory (RLS no UPDATE vs lifecycle needs UPDATE) | **Multi-layer model**: DB trigger rejects UPDATE to immutable columns + write-once CHECK on `laborProfileId`; scoped UPDATE allowed only for lifecycle columns; RLS USING + RLS WITH CHECK on top; no single layer is authority |
| 4 | `nextDayStart(addDays(openedAt, 7))` off-by-one (would yield +8 days) | Helper **removed** from discovery; acceptance vector locked: `openedAt=2026-09-10T07:00:00Z` → `expiresAt=2026-09-16T17:00:00Z`; N2-1 owns concrete implementation |
| 5 | Evidence command `Select-String "phase1a"` cannot match `n1_placement_case_foundation` — non-reproducible | Split into two reproducible commands (one per migration family); no fake tree hashes |
| 6 | CommissionBeneficiaryDecision called "immutable" without immutable/mutable split | **Split**: business key + beneficiary + source + reason + evidence + decidedAt + actor + handlingAssignmentId are immutable; status + supersededById + updatedAt are mutable lifecycle metadata |
| 7 | Permission contract didn't match T0 decision (5 codes claimed as 6; HR vs HR_MANAGER; missing WITH CHECK) | Reconciled to **5 explicit codes + implicit self-view**; ADMIN/HR_MANAGER for beneficiary decisions; HR_STAFF only visibility; SYSTEM engine path is internal capability, not human permission; added RLS WITH CHECK clauses |

---

## 7. Branch State

**Branch:** `hrp-v6-n2-aff-policy-contract-discovery`
**Base:** `origin/main` b91a33f
**PR:** [Pull Request #4](https://github.com/nobita6986/HRpartner/pull/4)

---

## 8. What's Required for Tier 1 to Open N2-1

After this discovery merged:
1. Tier 1 reads `DISCOVERY.md` §2 (Locked Decisions) as contract
2. Tier 1 creates `hrp-v6-n2-aff-01-attribution-foundation` task
3. TASK must include:
   - `ReferralAttribution` schema per §2.4.1 immutable/mutable split
   - DB trigger + write-once CHECK on `laborProfileId` per §2.4.2
   - RLS USING + RLS WITH CHECK per §2.6
   - Idempotency test for `consume()` method
   - §20 DoR from `aff_plan.md` satisfiable

---

## 9. Status

✅ **COMPLETE / READY_FOR_MERGE**

PR #4 is docs-only, no production code changes. Reviewer can:
- Approve → merge to main
- Request changes → open follow-up revisions

**This task is done after merge. N2-1 is a separate task T0 will unlock via Tier 1.**
