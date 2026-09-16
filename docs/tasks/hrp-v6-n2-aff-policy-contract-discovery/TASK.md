# Task: N2 AFF Policy & Contract Discovery

**Slug:** `hrp-v6-n2-aff-policy-contract-discovery`
**Status:** `COMPLETE` / `READY_FOR_MERGE`
**Audit:** `NONE`
**Type:** READ-ONLY Discovery — no production code changes
**Baseline (pinned):** `b91a33f948aed224a88f3e8e7c9847006f33e97f`
**Branch:** `hrp-v6-n2-aff-policy-contract-discovery`
**PR:** [#4](https://github.com/nobita6986/HRpartner/pull/4)

---

## 1. Outcome (delivered)

- Surveyed codebase for all 10 N2 policy questions
- Documented evidence with file:line references
- Proposed 6 vertical slices with dependency graph
- **T0 R0–R5 verdicts applied**:
  - R0: discovery baseline
  - R1: status sync; HANDOFF.md; Q7 authority record; Q9b classification; Q2 timezone layering; V6 P1 initial evidence
  - R2: V6 P1 corrected (filesystem); Q7 beneficiaryUserId required + SYSTEM FK + invariant; Q9b tightened; Q6 immutable
  - R3: NULLS NOT DISTINCT, advisory lock, actorType/actorUserId + CHECK, UNRESOLVED typed result, immutable/mutable split (referral only), exclusive next-day, Holiday out of scope, COMPLETE/READY_FOR_MERGE, PR #4
  - R4: 7 blockers fixed (DDL syntax, transaction-scoped advisory lock, multi-layer attribution immutability, off-by-one helper removed, reproducible evidence commands, CommissionBeneficiaryDecision immutable/mutable split + correction vs reversal, permission codes reconciled to 5+implicit-self + WITH CHECK)
  - **R5 (this)**: 5 directives applied — (A) drop write-once CHECK; trigger owns write-once; CHECK = current state; WITH CHECK not DELETE protection; default-deny DELETE. (B) four beneficiary commands (CREATE/CORRECT/REVERSE/REDECIDE_AFTER_REVERSAL); REVERSED→SUPERSEDED forbidden; supersede link direction fixed. (C) RLS role-scoped; HR_MANAGER team scope; HR_STAFF assigned-only; explicit UPDATE USING/WITH CHECK; LIVE RLS matrix required. (D) Evidence pinned to b91a33f; `git ls-tree -r --name-only`; no placeholders. (E) PR body clean.
- All 4 docs synced to COMPLETE / READY_FOR_MERGE
- PR #4 opened as docs-only

---

## 2. Scope

### 2.1 In Scope

- Read `prisma/schema.prisma` and all migrations (against pinned baseline b91a33f)
- Read placement-case, intake-writer, labor-profile, referral-guard, commission engine, transfer services
- Read `docs/V6/aff_plan.md`
- Produce `DISCOVERY.md` with evidence-backed answers
- Identify gaps between design intent and current codebase
- Propose decomposition into implementable slices
- Verify V6 Phase 1 capability via filesystem evidence (pinned commit)

### 2.2 Out of Scope (boundary)

- No schema changes
- No migration
- No source/test changes
- No production DB writes
- No backfill
- No N2-1 implementation
- No `PLANNER_HANDOVER.md` modification
- No `docs/TIER0_SHIFT_HANDOVER.md` modification
- No PR #3 / P2 file changes
- No N4 implementation
- No new policy decisions (R5 is correction-only)
- No mutable origin/main references (evidence pinned)

---

## 3. RQ → STEP → AC

| RQ | Question | AC |
|---|---|---|
| RQ-01 | Q1: Clock type | **Calendar days** |
| RQ-02 | Q2: Timezone | **Storage TIMESTAMPTZ UTC; Business Asia/Bangkok; exclusive next-day boundary (helper removed — N2-1 owns concrete implementation; acceptance vector locked)** |
| RQ-03 | Q3: Holiday | **OUT OF N2 SCOPE** |
| RQ-04 | Q4: Clock start | **`PlacementCase.openedAt`** |
| RQ-05 | Q5: Pause/reset | **Clock RUNNING always, assignment has expiresAt** |
| RQ-06 | Q6: Attribution cardinality | **Immutable facts vs mutable lifecycle metadata; trigger BEFORE UPDATE owns immutables; trigger BEFORE INSERT/UPDATE owns laborProfileId NULL→value write-once; CHECK inspects current state only; RLS USING + WITH CHECK per command; default-deny DELETE under FORCE RLS** |
| RQ-07 | Q7: BeneficiaryDecision | **Authority record; four commands (CREATE idempotent on exact-match ACTIVE, CORRECT = supersede + replacement, REVERSE = REVERSED no replacement, REDECIDE_AFTER_REVERSAL); REVERSED→SUPERSEDED forbidden; supersede link = old.supersededById → replacement (single direction); NULLS NOT DISTINCT partial unique; interactive transaction; actorType/actorUserId CHECK; UNRESOLVED = typed result + outbox** |
| RQ-08 | Q8: Permissions | **5 explicit permission codes + implicit self-view; ADMIN/HR_MANAGER only for beneficiary decisions; HR_STAFF = assigned-rows visibility (NOT override); system engine = internal capability; role-scoped RLS; explicit UPDATE USING/WITH CHECK for transfer/release/supersede/correction/reversal; LIVE RLS matrix tests required** |
| RQ-09 | Q9: Inventory reuse | **Component inventory + conflicts; Holiday out of scope** |
| RQ-09b | Q9b: Legacy ctvId | **EXACT_SAFE = FK + provenance + writer semantics + no conflict + audit** |
| RQ-10 | Q10: Slices | **6 slices; V6 P1 capability in pinned baseline, no merge dep** |

---

## 4. Deliverables

4 files. Zero code. Pure docs.

| File | Purpose |
|---|---|
| `DISCOVERY.md` | Main document — locked decisions, schema sketches, invariant contracts, slice plan |
| `TASK.md` | This file — RQ → STEP → AC, scope, boundary |
| `HANDOFF.md` | Status + handoff summary |
| `evidence/OVERVIEW.md` | Migration inventory + aff_plan.md affinity + V6 P1 evidence (pinned) |

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
| Q6 | Immutable facts vs mutable metadata split; trigger owns write-once; CHECK current-state only; RLS per role; default-deny DELETE |

### Beneficiary Decision
| Decision | Value |
|---|---|
| Q7a | Authority record (immutable facts vs mutable metadata split) |
| Q7b | max one ACTIVE per `(laborProfileId, assignmentId, milestone)` |
| Q7c | NULLS NOT DISTINCT (PG 15+) corrected syntax OR COALESCE sentinel + sentinel-domain CHECK |
| Q7d | Interactive transaction: lock + lookup + supersede + insert in single `prisma.$transaction` |
| Q7e | actorType USER/SYSTEM + actorUserId nullable + CHECK |
| Q7f | UNRESOLVED = typed result + outbox (no decision row) |
| Q7g | **Four explicit commands**: CREATE (idempotent on exact-match ACTIVE), CORRECT (supersede + replacement), REVERSE (REVERSED, no replacement), REDECIDE_AFTER_REVERSAL |
| Q7h | Supersede link direction: `old.supersededById → replacement` (single direction) |

### Migration & Compat
| Decision | Value |
|---|---|
| Q9b | EXACT_SAFE = FK + provenance + writer semantics + no conflict + audit |
| Q10 | V6 P1 capability in pinned baseline b91a33f — no merge dep |

### Permissions
| Decision | Value |
|---|---|
| Q8 | **5 explicit codes + implicit self-view**; role-scoped RLS; UPDATE USING/WITH CHECK for all write commands; LIVE RLS matrix tests |

---

## 6. R5 Blocker Corrections (this revision)

| # | Directive | Implementation |
|---|---|---|
| A | Drop "write-once CHECK" concept; trigger owns write-once; CHECK = current state; WITH CHECK ≠ DELETE protection; default-deny DELETE | DISCOVERY §2.4.2: Layer 1 trigger for immutable columns; Layer 1b trigger for laborProfileId NULL→value; Layer 2 CHECK current state only; Layer 5 default-deny DELETE under FORCE RLS with optional BEFORE DELETE trigger defense-in-depth |
| B | Four beneficiary commands; CREATE idempotent on exact-match ACTIVE; REVERSED→SUPERSEDED forbidden; single supersede link direction | DISCOVERY §2.5.5: full command table; §2.5.1 supersede link = `old.supersededById → replacement` only |
| C | Drop role-only policies; HR_MANAGER team scope; HR_STAFF assigned-only; UPDATE USING/WITH CHECK contract for all commands; system engine = internal capability; service-layer authorization authority; LIVE RLS matrix tests required | DISCOVERY §2.6: 5 codes + implicit self-view; §2.6.3 RLS matrix with explicit UPDATE USING/WITH CHECK; §2.6.4 LIVE RLS matrix test gate |
| D | Pin evidence to b91a33f; use `git ls-tree -r --name-only`; no hash placeholders or shortened hashes | DISCOVERY §1.1, §6.2 + OVERVIEW: pinned baseline; full migration filenames with no placeholders |
| E | PR body: remove R3 stale claims + control characters; 5 explicit permission codes + implicit self-view | gh pr edit #4 body — clean |

---

## 7. Branch State

**Branch:** `hrp-v6-n2-aff-policy-contract-discovery`
**Base:** `b91a33f948aed224a88f3e8e7c9847006f33e97f` (pinned)
**PR:** [Pull Request #4](https://github.com/nobita6986/HRpartner/pull/4)

---

## 8. What's Required for Tier 1 to Open N2-1

After this discovery merged:
1. Tier 1 reads `DISCOVERY.md` §2 (Locked Decisions) as contract
2. Tier 1 creates `hrp-v6-n2-aff-01-attribution-foundation` task
3. TASK must include:
   - `ReferralAttribution` schema per §2.4.1
   - Layer 1 + Layer 1b triggers per §2.4.2
   - Layer 2 CHECK current state only
   - RLS USING + WITH CHECK per §2.6.3
   - Default-deny DELETE under FORCE RLS (Layer 5)
   - Idempotency test for `consume()` method
   - LIVE RLS matrix tests per §2.6.4
   - §20 DoR from `aff_plan.md` satisfiable

---

## 9. Status

**COMPLETE / READY_FOR_MERGE**

PR #4 is docs-only, no production code changes. Reviewer can:
- Approve → merge to main
- Request changes → open follow-up revisions

**This task is done after merge. N2-1 is a separate task T0 will unlock via Tier 1.**
