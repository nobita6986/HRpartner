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
- **T0 R0–R7 verdicts applied**:
  - R0: discovery baseline
  - R1: status sync; HANDOFF.md; Q7 authority record; Q9b classification; Q2 timezone layering; V6 P1 initial evidence
  - R2: V6 P1 corrected (filesystem); Q7 beneficiaryUserId required + SYSTEM FK + invariant; Q9b tightened; Q6 immutable
  - R3: NULLS NOT DISTINCT, advisory lock, actorType/actorUserId + CHECK, UNRESOLVED typed result, immutable/mutable split (referral only), exclusive next-day, Holiday out of scope, COMPLETE/READY_FOR_MERGE, PR #4
  - R4: 7 blockers fixed (DDL syntax, transaction-scoped advisory lock, multi-layer attribution immutability, off-by-one helper removed, reproducible evidence commands, CommissionBeneficiaryDecision immutable/mutable split + correction vs reversal, permission codes reconciled to 5+implicit-self + WITH CHECK)
  - R5: 5 directives applied — drop write-once CHECK; trigger owns write-once; CHECK = current state; WITH CHECK not DELETE protection; default-deny DELETE; four beneficiary commands; REVERSED→SUPERSEDED forbidden; supersede link direction fixed; role-scoped RLS; explicit UPDATE USING/WITH CHECK; LIVE RLS matrix required; evidence pinned to full SHA; git ls-tree; no placeholders; PR body clean.
  - R6: 6 contract defects fixed — branch sync; CREATE/CORRECT split; RLS team-scope on both rows; ReferralAttribution DB contract complete; state diagram corrected; full-SHA evidence.
  - **R7 (this)**: 6 executable blockers fixed — (1) RLS expressions corrected to valid PostgreSQL (no NEW./OLD. prefixes in policy USING/WITH CHECK); (2) CORRECT ordering fixed (lock→lookup→UPDATE→INSERT→link→commit); (3) idempotency identity clarified (decidedAt out, canonical JSON deep-equal); (4) N2-1 RLS simplified (ADMIN/referrer own-view + engine INSERT/UPDATE only, no external table refs); (5) app_engine_writer contract fixed (no BYPASSRLS, explicit policies TO app_engine_writer, current_setting check, valid set_config syntax, LIVE isolation tests); (6) Layer 1 trigger does NOT check labor_profile_id (Layer 1b sole authority); write-once LIVE test cases defined.
- All 4 docs synced to COMPLETE / READY_FOR_MERGE
- PR #4 opened as docs-only
- Branch synced with main; PR diff still scoped to 4 N2 docs files

---

## 2. Scope

### 2.1 In Scope

- Read prisma/schema.prisma and all migrations (against pinned baseline full SHA)
- Read placement-case, intake-writer, labor-profile, referral-guard, commission engine, transfer services
- Read docs/V6/aff_plan.md
- Produce DISCOVERY.md with evidence-backed answers
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
- No PLANNER_HANDOVER.md modification
- No docs/TIER0_SHIFT_HANDOVER.md modification
- No PR #3 / P2 file changes
- No N4 implementation
- No new policy decisions (R7 is correction-only)
- No mutable origin/main references (evidence pinned)

---

## 3. RQ → STEP → AC

| RQ | Question | AC |
|---|---|---|
| RQ-01 | Q1: Clock type | **Calendar days** |
| RQ-02 | Q2: Timezone | **Storage TIMESTAMPTZ UTC; Business Asia/Bangkok; exclusive next-day boundary (helper removed — N2-1 owns concrete implementation; acceptance vector locked)** |
| RQ-03 | Q3: Holiday | **OUT OF N2 SCOPE** |
| RQ-04 | Q4: Clock start | **PlacementCase.openedAt** |
| RQ-05 | Q5: Pause/reset | **Clock RUNNING always, assignment has expiresAt** |
| RQ-06 | Q6: Attribution cardinality | **Immutable facts vs mutable lifecycle metadata; trigger BEFORE UPDATE owns immutables (incl. created_at); trigger BEFORE INSERT/UPDATE owns laborProfileId NULL→value write-once; trigger BEFORE UPDATE (Layer 1c) enforces allowed transition matrix; CHECK inspects current state only; RLS per role per-command (N2-1: ADMIN/referrer/engine; N2-4 adds team policies); default-deny DELETE under FORCE RLS** |
| RQ-07 | Q7: BeneficiaryDecision | **Authority record; CREATE and CORRECT are SEPARATE commands with separate pseudocode; CREATE has three typed outcomes (CREATED / IDEMPOTENT_REPLAY / CONFLICT_EXISTING_ACTIVE); exact-match across all authoritative immutable facts (decidedAt NOT in idempotency identity; canonical JSON deep-equal for evidence); CORRECT has two typed outcomes (CORRECTED / NO_ACTIVE); CORRECT ordering: lock→lookup→UPDATE old SUPERSEDED→INSERT replacement ACTIVE→SET supersededById→commit; four explicit commands (CREATE/CORRECT/REVERSE/REDECIDE_AFTER_REVERSAL); REVERSED→SUPERSEDED forbidden; supersede link = old.supersededById → replacement (single direction); NULLS NOT DISTINCT partial unique; interactive transaction; actorType/actorUserId CHECK; UNRESOLVED = typed result + outbox** |
| RQ-08 | Q8: Permissions | **5 explicit permission codes + implicit self-view; ADMIN/HR_MANAGER only for beneficiary decisions; HR_STAFF = assigned-rows visibility (NOT override); system engine uses app_engine_writer DB principal (no BYPASSRLS, explicit policies TO app_engine_writer, current_setting gate); RLS USING (OLD row) and WITH CHECK (NEW row) both enforce team-scope for HR_MANAGER INSERT/UPDATE on both LHA and CBD; HR_STAFF UPDATE denied on both tables; explicit UPDATE USING/WITH CHECK for transfer/release/supersede/correction/reversal; LIVE RLS matrix tests required (expanded per-table)** |
| RQ-09 | Q9: Inventory reuse | **Component inventory + conflicts; Holiday out of scope** |
| RQ-09b | Q9b: Legacy ctvId | **EXACT_SAFE = FK + provenance + writer semantics + no conflict + audit** |
| RQ-10 | Q10: Slices | **6 slices; V6 P1 capability in pinned baseline, no merge dep** |

---

## 4. Deliverables

4 files. Zero code. Pure docs.

| File | Purpose |
|---|---|
| DISCOVERY.md | Main document — locked decisions, schema sketches, invariant contracts, slice plan |
| TASK.md | This file — RQ → STEP → AC, scope, boundary |
| HANDOFF.md | Status + handoff summary |
| evidence/OVERVIEW.md | Migration inventory + aff_plan.md affinity + V6 P1 evidence (pinned) |

---

## 5. Locked Decisions Quick Reference

### Clock & Time
| Decision | Value |
|---|---|
| Q1 | Calendar days |
| Q2a | TIMESTAMPTZ UTC |
| Q2b | Asia/Bangkok business |
| Q2c | Exclusive next-day [start, nextDayStart) (helper removed; N2-1 owns) |
| Q3 | Holiday OUT OF N2 SCOPE |

### Lifecycle
| Decision | Value |
|---|---|
| Q4 | PlacementCase.openedAt |
| Q5 | Clock RUNNING always |

### Attribution
| Decision | Value |
|---|---|
| Q6 | Immutable facts vs mutable metadata split; Layer 1 (immutable cols incl. created_at, NO labor_profile_id check); Layer 1b (NULL→value write-once — Layer 1b sole authority); Layer 1c (lifecycle transition trigger); CHECK current-state only; RLS per N2-1 (ADMIN/referrer/engine); N2-4 adds team policies; default-deny DELETE |

### Beneficiary Decision
| Decision | Value |
|---|---|
| Q7a | Authority record; immutable facts vs mutable metadata split |
| Q7b | max one ACTIVE per (laborProfileId, assignmentId, milestone) |
| Q7c | NULLS NOT DISTINCT (PG 15+) corrected syntax OR COALESCE sentinel + sentinel-domain CHECK |
| Q7d | Interactive transaction: lock + lookup + supersede + insert in single prisma.$transaction |
| Q7e | actorType USER/SYSTEM + actorUserId nullable + CHECK |
| Q7f | UNRESOLVED = typed result + outbox (no decision row) |
| Q7g | Four explicit commands: CREATE (idempotent on exact-match ACTIVE; decidedAt NOT in idempotency; canonical JSON deep-equal); CORRECT (lock→lookup→UPDATE→INSERT→link→commit); REVERSE (REVERSED, no replacement); REDECIDE_AFTER_REVERSAL |
| Q7h | Supersede link direction: old.supersededById → replacement (single direction) |
| Q7i | Forbidden: REVERSED→SUPERSEDED; SUPERSEDED→REVERSED; any resurrection |
| Q7j | CREATE/CORRECT are SEPARATE functions; CREATE has typed CONFLICT_EXISTING_ACTIVE; CORRECT has typed NO_ACTIVE |

### Migration & Compat
| Decision | Value |
|---|---|
| Q9b | EXACT_SAFE = FK + provenance + writer semantics + no conflict + audit |
| Q10 | V6 P1 capability in pinned baseline (full SHA) — no merge dep |

### Permissions
| Decision | Value |
|---|---|
| Q8 | **5 explicit codes + implicit self-view**; role-scoped RLS; UPDATE USING (OLD row) + WITH CHECK (NEW row) both enforce team-scope for HR_MANAGER; HR_STAFF UPDATE denied on both tables; app_engine_writer (no BYPASSRLS, explicit policies TO app_engine_writer, current_setting gate); LIVE RLS matrix tests (expanded per-table) |

---

## 6. R7 Blocker Corrections (this revision)

| # | Directive | Implementation |
|---|---|---|
| 1 | RLS expressions use valid PostgreSQL syntax (no NEW./OLD. prefixes in policy USING/WITH CHECK) | All policy expressions now use column names directly; trigger bodies still use NEW./OLD. (valid SQL) |
| 2 | Layer 1 trigger does NOT check labor_profile_id; Layer 1b is sole authority | Layer 1 labor_profile_id check removed; write-once LIVE test cases defined |
| 3 | N2-1 RLS simplified: ADMIN/referrer own-view + engine INSERT/UPDATE; no external table refs | N2-1 RLS: ADMIN/referrer SELECT, app_engine_writer INSERT (current_setting gate), ADMIN UPDATE; no LHA/team refs |
| 4 | app_engine_writer contract fixed: no BYPASSRLS, explicit policies TO app_engine_writer, current_setting check, valid set_config syntax, LIVE isolation tests | app_engine_writer has no BYPASSRLS, INSERT/UPDATE grants TO app_engine_writer, DELETE denied, current_setting gate, valid set_config/set_local, LIVE role-attribute and context tests |
| 5 | CORRECT ordering fixed: lock→lookup→UPDATE→INSERT→link→commit | CORRECT pseudocode: 1.acquire lock, 2.lookup old ACTIVE, 3.UPDATE old ACTIVE→SUPERSEDED, 4.INSERT replacement ACTIVE, 5.SET supersededById on old, 6.audit events, 7.commit |
| 6 | Matrix self-release removed; idempotency identity clarified (decidedAt out, canonical JSON deep-equal) | Matrix: self-release row removed; exactMatch uses canonicalJson (sorted keys) and excludes decidedAt |

---

## 7. Branch State

**Branch:** `hrp-v6-n2-aff-policy-contract-discovery`
**Base (R7 post-sync):** `0d7f8a1099bc9f1a41767aefe5bd3bc149de84d2` (origin/main)
**Merge-base (post-sync):** `0d7f8a1099bc9f1a41767aefe5bd3bc149de84d2`
**PR:** [Pull Request #4](https://github.com/nobita6986/HRpartner/pull/4)
**History preserved:** R0-R6 commits + main sync + R7 corrections

---

## 8. What is Required for Tier 1 to Open N2-1

After this discovery merged:
1. Tier 1 reads DISCOVERY.md section 2 (Locked Decisions) as contract
2. Tier 1 creates hrp-v6-n2-aff-01-attribution-foundation task
3. TASK must include:
   - ReferralAttribution schema per section 2.4.1 (incl. created_at immutability)
   - Layer 1 + Layer 1b + Layer 1c triggers per section 2.4.2
   - Layer 2 CHECK current state only
   - N2-1 RLS policies per section 2.6.3 (ADMIN/referrer/engine; no external table refs)
   - Default-deny DELETE under FORCE RLS (Layer 5)
   - WRITE-ONCE LIVE test cases: NULL→value allowed once, value→same allowed, value→other denied, value→NULL denied
   - LIFECYCLE TRANSITION LIVE test cases: terminal→ACTIVE denied, ACTIVE→terminal allowed
   - ENGINE ISOLATION LIVE tests: role attributes, grants, context absent/invalid/valid
   - section 20 DoR from aff_plan.md satisfiable

---

## 9. Status

**COMPLETE / READY_FOR_MERGE**

PR #4 is docs-only, no production code changes.

**This task is done after merge. N2-1 is a separate task T0 will unlock via Tier 1.**