# Task: N2 AFF Policy & Contract Discovery

**Slug:** `hrp-v6-n2-aff-policy-contract-discovery`
**Status:** `OPEN / REVISION_REQUIRED` (T0 verdict after R7 → R8 in progress)
**Audit:** `NONE`
**Type:** READ-ONLY Discovery — no production code changes
**Baseline (pinned):** `b91a33f948aed224a88f3e8e7c9847006f33e97f` (full SHA)
**Branch:** `hrp-v6-n2-aff-policy-contract-discovery`
**PR:** [#4](https://github.com/nobita6986/HRpartner/pull/4)

---

## 1. Outcome (delivered so far)

- Surveyed codebase for all 10 N2 policy questions
- Documented evidence with file:line references (full SHA pinning)
- Proposed 6 vertical slices with dependency graph
- **T0 R0–R8 verdicts applied** (R8 closes 4 P1 executable-contract blockers from R7):
  - R0–R7: previous rounds
  - **R8 (this)**:
    1. **CBD RLS scope fix** — bare `labor_profile_id` in WITH CHECK subqueries replaced with qualified `commission_beneficiary_decisions.labor_profile_id` to avoid self-comparison; cross-profile denial LIVE test added.
    2. **app_engine_writer executable contract** — idempotent provisioning (`DO $$` block with `pg_roles` lookup), explicit least-privilege grants + `REVOKE DELETE`, three policies per table (SELECT for consume flow, INSERT/UPDATE gated by `current_setting('hrp.engine_context', true)`); 12 LIVE contract tests (E-01..E-12) for role attributes, grants, context absent/invalid/valid.
    3. **`set_config(..., true)` semantics** — `set_config(setting, value, false)` is FORBIDDEN; only transaction-local (`is_local = true`) is allowed; LIVE tests prove context cleared after COMMIT / ROLLBACK / pooled-connection reuse.
    4. **Recursive canonical JSON** — top-level `Object.keys().sort()` replaced with recursive helper handling nested objects and arrays; 10 LIVE tests (K-01..K-10); optional DB-layer `jsonb =` backup option.

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
- No new policy decisions (R8 is correction-only)
- No mutable origin/main references (evidence pinned)

---

## 3. RQ -> STEP -> AC

| RQ | Question | AC |
|---|---|---|
| RQ-01 | Q1: Clock type | **Calendar days** |
| RQ-02 | Q2: Timezone | **Storage TIMESTAMPTZ UTC; Business Asia/Bangkok; exclusive next-day boundary** |
| RQ-03 | Q3: Holiday | **OUT OF N2 SCOPE** |
| RQ-04 | Q4: Clock start | **PlacementCase.openedAt** |
| RQ-05 | Q5: Pause/reset | **Clock RUNNING always, assignment has expiresAt** |
| RQ-06 | Q6: Attribution | **Layer 1+1b+1c triggers; RLS N2-1 = ADMIN/referrer/engine; Layer 1b NULL→value write-once; CHECK current state only; default-deny DELETE; LIVE write-once tests (R8 K-01..K-10-style matrix for triggers)** |
| RQ-07 | Q7: BeneficiaryDecision | **Authority record; CREATE/CORRECT separate functions; CREATE three typed outcomes; CORRECT lock→lookup→UPDATE→INSERT→link→commit ordering; four commands; idempotency identity excludes decidedAt; canonical Json recursive (R8 K-01..K-10) OR DB-layer jsonb comparison; NULLS NOT DISTINCT; interactive transaction; actorType/actorUserId CHECK; UNRESOLVED typed result + outbox** |
| RQ-08 | Q8: Permissions | **5 explicit codes + implicit self-view; role-scoped RLS; team-scope on BOTH old/new rows (USING + WITH CHECK); HR_STAFF UPDATE denied; N2-1 RLS simplified (no LHA/team refs); system engine app_engine_writer (no BYPASSRLS, REVOKE DELETE, explicit policies with current_setting context gate, set_config(..., true) ONLY, LIVE isolation tests E-01..E-12); LIVE RLS matrix tests required (incl. cross-profile denial R8)** |
| RQ-09 | Q9: Inventory reuse | **Component inventory + conflicts** |
| RQ-09b | Q9b: Legacy ctvId | **EXACT_SAFE = FK + provenance + writer + no conflict + audit** |
| RQ-10 | Q10: Slices | **6 slices; V6 P1 capability in pinned baseline, no merge dep** |

---

## 4. Deliverables

4 files. Zero code. Pure docs.

| File | Purpose |
|---|---|
| DISCOVERY.md | Main document — locked decisions, schema sketches, invariant contracts, slice plan |
| TASK.md | This file — RQ -> STEP -> AC, scope, boundary |
| HANDOFF.md | Status + handoff summary |
| evidence/OVERVIEW.md | Migration inventory + aff_plan.md affinity + V6 P1 evidence (pinned) |

---

## 5. R8 Blocker Corrections (this revision)

| # | Directive | Implementation |
|---|---|---|
| 1 | CBD RLS scope bypass — bare `labor_profile_id` self-compares | Both CBD INSERT and UPDATE policies now use `commission_beneficiary_decisions.labor_profile_id` (qualified); cross-profile denial LIVE test added to §2.6.4 |
| 2 | app_engine_writer missing executable contract | DISCOVERY §2.6.3 now includes: idempotent provisioning (`DO $$` with `pg_roles` check), explicit grants + `REVOKE DELETE`, three per-table policies (SELECT/INSERT/UPDATE) with `current_setting('hrp.engine_context', true)` gate; 12 LIVE contract tests (E-01..E-12) assert role attributes, grants, context absent/invalid/valid |
| 3 | `set_config(..., false)` wrong isolation semantics | Application contract now mandates `set_config('hrp.engine_context', '<value>', true)` only; LIVE tests E-06/E-07 prove context cleared after COMMIT / ROLLBACK / pooled-connection reuse; static lint blocks `set_config(..., false)` |
| 4 | Canonical JSON only sorts top-level keys | `canonicalJson` replaced with recursive helper covering nested objects, arrays, null, primitives; 10 LIVE tests (K-01..K-10) cover key-order, nested objects, array order, null, edge cases; optional DB-layer `jsonb =` comparison documented |

---

## 6. Branch State

**Branch:** `hrp-v6-n2-aff-policy-contract-discovery`
**Base (post-sync):** `0d7f8a1099bc9f1a41767aefe5bd3bc149de84d2` (origin/main)
**PR:** [Pull Request #4](https://github.com/nobita6986/HRpartner/pull/4)
**History preserved:** R0-R7 commits + R8 corrections
**Status:** `OPEN / REVISION_REQUIRED` — waiting for T0 final authorization

---

## 7. Status

**OPEN / REVISION_REQUIRED**

PR #4 remains docs-only, no production code changes. Branch ahead of main; merge to main awaits T0 final authorization.

**This task is in REVISION_REQUIRED state. N2-1 is a separate task T0 will unlock via Tier 1.**