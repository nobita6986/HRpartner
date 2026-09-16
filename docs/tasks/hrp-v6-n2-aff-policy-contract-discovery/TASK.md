# Task: N2 AFF Policy & Contract Discovery

**Slug:** `hrp-v6-n2-aff-policy-contract-discovery`
**Status:** `COMPLETE` / `READY_FOR_MERGE`
**Audit:** `NONE`
**Type:** READ-ONLY Discovery — no production code changes
**Baseline (pinned):** `b91a33f948aed224a88f3e8e7c9847006f33e97f` (full SHA)
**Branch:** `hrp-v6-n2-aff-policy-contract-discovery`
**PR:** [#4](https://github.com/nobita6986/HRpartner/pull/4)

---

## 1. Outcome (delivered)

- Surveyed codebase for all 10 N2 policy questions
- Documented evidence with file:line references (full SHA pinning)
- Proposed 6 vertical slices with dependency graph
- **T0 R0–R6 verdicts applied**:
  - R0: discovery baseline
  - R1: status sync; HANDOFF.md; Q7 authority record; Q9b classification; Q2 timezone layering; V6 P1 initial evidence
  - R2: V6 P1 corrected (filesystem); Q7 beneficiaryUserId required + SYSTEM FK + invariant; Q9b tightened; Q6 immutable
  - R3: NULLS NOT DISTINCT, advisory lock, actorType/actorUserId + CHECK, UNRESOLVED typed result, immutable/mutable split (referral only), exclusive next-day, Holiday out of scope, COMPLETE/READY_FOR_MERGE, PR #4
  - R4: 7 blockers fixed (DDL syntax, transaction-scoped advisory lock, multi-layer attribution immutability, off-by-one helper removed, reproducible evidence commands, CommissionBeneficiaryDecision immutable/mutable split + correction vs reversal, permission codes reconciled to 5+implicit-self + WITH CHECK)
  - R5: 5 directives applied — drop write-once CHECK; trigger owns write-once; CHECK = current state; WITH CHECK not DELETE protection; default-deny DELETE; four beneficiary commands; REVERSED→SUPERSEDED forbidden; supersede link direction fixed; role-scoped RLS; explicit UPDATE USING/WITH CHECK; LIVE RLS matrix required; evidence pinned to full SHA; `git ls-tree -r --name-only`; no placeholders; PR body clean.
  - **R6 (this)**: 5 contract defects fixed — (1) Branch synced with origin/main `0d7f8a1099bc9f1a41767aefe5bd3bc149de84d2`; (2) CREATE/CORRECT pseudocode split into two functions with typed `CONFLICT_EXISTING_ACTIVE` / `NO_ACTIVE` outcomes; exact-match across all authoritative immutable facts (not only beneficiaryUserId); CREATE never auto-supersedes; (3) RLS team-scope enforced on BOTH old (USING) and new (WITH CHECK) rows for HR_MANAGER INSERT/UPDATE on both LHA and CBD; HR_STAFF UPDATE explicitly denied; manager cannot reassign assignee to out-of-team; (4) ReferralAttribution DB contract completed — Layer 1 trigger now covers `created_at`; Layer 1c lifecycle transition trigger enforces allowed transitions and rejects terminal-state resurrection; per-command RLS SELECT/INSERT/UPDATE policies in §2.4.3; default-deny DELETE; LIVE matrix cases for own/non-own/team/system consume; (5) State diagram redrawn without forbidden transition arrows (REVERSED does NOT transition to ACTIVE; REDECIDE_AFTER_REVERSAL is INSERT of new row). Evidence command uses full SHA `b91a33f948aed224a88f3e8e7c9847006f33e97f` with `--` separator and two separate `Select-String` calls.
- All 4 docs synced to COMPLETE / READY_FOR_MERGE
- PR #4 opened as docs-only
- Branch synced with main; PR diff still scoped to 4 N2 docs files

---

## 2. Scope

### 2.1 In Scope

- Read `prisma/schema.prisma` and all migrations (against pinned baseline full SHA)
- Read placement-case, intake-writer, labor-profile, referral-guard, commission engine, transfer services
- Read `docs/V6/aff_plan.md`
- Produce `DISCOVERY.md` with evidence-backed answers
- Identify gaps between design intent and current codebase
- Propose decomposition into implementable slices
- Verify V6 Phase 1 capability via filesystem evidence (pinned commit, full SHA)

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
- No new policy decisions (R6 is correction-only)
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
| RQ-06 | Q6: Attribution cardinality | **Immutable facts vs mutable lifecycle metadata; trigger BEFORE UPDATE owns immutables (incl. created_at); trigger BEFORE INSERT/UPDATE owns laborProfileId NULL→value write-once; trigger BEFORE UPDATE (Layer 1c) enforces allowed transition matrix; CHECK inspects current state only; RLS USING + WITH CHECK per command; default-deny DELETE under FORCE RLS** |
| RQ-07 | Q7: BeneficiaryDecision | **Authority record; CREATE and CORRECT are SEPARATE commands with separate pseudocode (R6); CREATE has three typed outcomes (CREATED / IDEMPOTENT_REPLAY / CONFLICT_EXISTING_ACTIVE); exact-match across all authoritative immutable facts; CORRECT has two typed outcomes (CORRECTED / NO_ACTIVE); four explicit commands (CREATE/CORRECT/REVERSE/REDECIDE_AFTER_REVERSAL); REVERSED→SUPERSEDED forbidden; supersede link = old.supersededById → replacement (single direction); NULLS NOT DISTINCT partial unique; interactive transaction; actorType/actorUserId CHECK; UNRESOLVED = typed result + outbox** |
| RQ-08 | Q8: Permissions | **5 explicit permission codes + implicit self-view; ADMIN/HR_MANAGER only for beneficiary decisions; HR_STAFF = assigned-rows visibility (NOT override); system engine uses separate DB principal (app_engine_writer) bypass via role separation; RLS USING (OLD row) and WITH CHECK (NEW row) both enforce team-scope for HR_MANAGER INSERT/UPDATE on both LHA and CBD; HR_STAFF UPDATE explicitly denied on both tables; explicit UPDATE USING/WITH CHECK for transfer/release/supersede/correction/reversal; LIVE RLS matrix tests required (expanded per-table in §2.6.4)** |
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
| Q6 | Immutable facts vs mutable metadata split; trigger owns write-once; trigger covers created_at; Layer 1c transition matrix; CHECK current-state only; RLS per role; default-deny DELETE |

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
| Q7i (R6) | CREATE and CORRECT are SEPARATE functions; CREATE has typed `CONFLICT_EXISTING_ACTIVE` for nonmatching ACTIVE; CREATE never auto-supersedes or inserts second ACTIVE |

### Migration & Compat
| Decision | Value |
|---|---|
| Q9b | EXACT_SAFE = FK + provenance + writer semantics + no conflict + audit |
| Q10 | V6 P1 capability in pinned baseline (full SHA) — no merge dep |

### Permissions
| Decision | Value |
|---|---|
| Q8 | **5 explicit codes + implicit self-view**; role-scoped RLS; UPDATE USING (OLD row) + WITH CHECK (NEW row) both enforce team-scope for HR_MANAGER; HR_STAFF UPDATE denied; system engine uses separate DB principal (app_engine_writer); LIVE RLS matrix tests |

---

## 6. R6 Blocker Corrections (this revision)

| # | Directive | Implementation |
|---|---|---|
| 1 | Branch sync with origin/main `0d7f8a1` (no force-push) | Merge commit `97f639f524eef7c97ee35996d615fcdfcad3a3eb`; preserve PR #4 history |
| 2 | CREATE pseudocode split from CORRECT; typed CONFLICT_EXISTING_ACTIVE; no auto-supersede or second ACTIVE insert | DISCOVERY §2.5.4: `createBeneficiaryDecision` with three typed outcomes + exact-match across all authoritative immutable facts; `correctBeneficiaryDecision` is a separate function with two typed outcomes |
| 3 | RLS team-scope on BOTH old and new rows; HR_STAFF UPDATE denied; manager cannot reassign out-of-team; system engine DB principal tested LIVE | DISCOVERY §2.6.3: USING checks OLD row team-scope, WITH CHECK verifies NEW row team-scope for HR_MANAGER INSERT/UPDATE on both LHA and CBD; HR_STAFF UPDATE removed from USING and WITH CHECK; explicit `app_engine_writer` separate DB principal; LIVE isolation tests in §2.6.4 |
| 4 | ReferralAttribution DB contract complete (trigger covers created_at; transition matrix trigger; per-command RLS; default-deny DELETE; LIVE cases) | DISCOVERY §2.4.2 Layer 1 (added `created_at` immutability), Layer 1c lifecycle transition trigger; §2.4.3 per-command RLS policies; §2.6.4 expanded LIVE matrix for referral_attributions (own/non-own/team/system consume); default-deny DELETE confirmed |
| 5 | State diagram with two direct branches only; REDECIDE_AFTER_REVERSAL is INSERT, not transition from REVERSED | DISCOVERY §2.5.5: diagram redrawn with ACTIVE -> SUPERSEDED (via CORRECT), ACTIVE -> REVERSED (via REVERSE), and REVERSED -> NEW ACTIVE (separate row via REDECIDE_AFTER_REVERSAL); no arrow from REVERSED to ACTIVE; explicit clarification added |
| 6 | Evidence command uses full SHA `b91a33f948aed224a88f3e8e7c9847006f33e97f` (no shortened hash, no `<hash>` placeholder) | DISCOVERY §1.1, §6.2 + HANDOFF §3 + OVERVIEW: full-SHA command with `--` separator and two separate `Select-String` calls |

---

## 7. Branch State

**Branch:** `hrp-v6-n2-aff-policy-contract-discovery`
**Base (R6 post-sync):** `0d7f8a1099bc9f1a41767aefe5bd3bc149de84d2` (origin/main)
**Merge-base (post-sync):** `0d7f8a1099bc9f1a41767aefe5bd3bc149de84d2`
**PR:** [Pull Request #4](https://github.com/nobita6986/HRpartner/pull/4)
**History preserved:** R0-R5 commits (dae91d9, fd56eaa, 0341a43, 9da23f7, c9509ec, c4e4819, a46034d) plus main sync (97f639f) plus R6 corrections

---

## 8. What's Required for Tier 1 to Open N2-1

After this discovery merged:
1. Tier 1 reads `DISCOVERY.md` §2 (Locked Decisions) as contract
2. Tier 1 creates `hrp-v6-n2-aff-01-attribution-foundation` task
3. TASK must include:
   - `ReferralAttribution` schema per §2.4.1 (incl. `created_at` immutability)
   - Layer 1 + Layer 1b + Layer 1c triggers per §2.4.2
   - Layer 2 CHECK current state only
   - Per-command RLS policies per §2.4.3
   - Default-deny DELETE under FORCE RLS (Layer 5)
   - LIVE RLS matrix tests per §2.6.4 (own/non-own/team/system consume)
   - System engine isolation tests (`app_user_writer` denied INSERT, `app_engine_writer` allowed)
   - Idempotency test for `consume()` method
   - §20 DoR from `aff_plan.md` satisfiable

---

## 9. Status

**COMPLETE / READY_FOR_MERGE**

PR #4 is docs-only, no production code changes. Reviewer can:
- Approve → merge to main
- Request changes → open follow-up revisions

**This task is done after merge. N2-1 is a separate task T0 will unlock via Tier 1.**