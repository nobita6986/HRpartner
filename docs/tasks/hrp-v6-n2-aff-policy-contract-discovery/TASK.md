# Task: N2 AFF Policy & Contract Discovery

**Slug:** `hrp-v6-n2-aff-policy-contract-discovery`
**Status:** `OPEN / FINAL_R11_DELTA_REQUIRED` (T0 verdict after R7 → R8 → R9 → R10 → R11 → R11 delta)
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
- **T0 R0–R11 verdicts + R11 delta applied** (R11 delta closes 6 surgical corrections)

### R0–R8: prior rounds
- R0: discovery baseline
- R1: status sync; HANDOFF.md; Q7 authority record; Q9b classification; Q2 timezone layering; V6 P1 initial evidence
- R2: V6 P1 corrected (filesystem); Q7 beneficiaryUserId required + SYSTEM FK + invariant; Q9b tightened
- R3: NULLS NOT DISTINCT, advisory lock, actorType/actorUserId + CHECK, UNRESOLVED typed result, immutable/mutable split (referral only), exclusive next-day, Holiday out of scope, COMPLETE/READY_FOR_MERGE, PR #4
- R4: 7 blockers fixed (DDL syntax, transaction-scoped advisory lock, multi-layer attribution immutability, off-by-one helper removed, reproducible evidence commands, CommissionBeneficiaryDecision immutable/mutable split + correction vs reversal, permission codes reconciled to 5+implicit-self + WITH CHECK)
- R5: 5 directives applied — drop write-once CHECK; trigger owns write-once; CHECK = current state; WITH CHECK not DELETE protection; default-deny DELETE; four beneficiary commands; REVERSED→SUPERSEDED forbidden; supersede link direction fixed; role-scoped RLS; explicit UPDATE USING/WITH CHECK; LIVE RLS matrix required; evidence pinned to full SHA; git ls-tree; no placeholders; PR body clean
- R6: 6 contract defects fixed — branch sync; CREATE/CORRECT split; RLS team-scope on both rows; ReferralAttribution DB contract complete; state diagram corrected; full-SHA evidence
- R7: 6 executable blockers — RLS valid PostgreSQL; CORRECT ordering fixed; idempotency identity clarified; N2-1 RLS simplified; app_engine_writer separate DB principal; Layer 1/1b separation; matrix self-release removed
- R8: 4 P1 executable-contract blockers — CBD RLS scope; app_engine_writer executable contract; set_config(..., true) only; recursive canonical JSON

### R9: 4 P1 + 4 P2 blockers
1. app_engine_writer runtime — dedicated LOGIN + dedicated engine DSN/connection pool
2. link-capture + RETURNING — SELECT policy permits link-capture; LIVE test E-17
3. Canonical JSON K-08/K-09 alignment — 1.0↔1 and -0↔0 return true
4. isJsonValue reject vectors — 10 LIVE rejection vectors K-11..K-20

P2: L-01..L-06 isolation; COALESCE; posture converge; status sync

### R10: 4 P1 + 2 P2 blockers
P1: cycle detection (WeakSet); membership/ownership lock; N2-1/CBD slice ordering; L-01..L-06 corrected.
P2: posture AFTER ALTER; jsonb parity scope.

### R11: 6 blockers
P1: membership SQL fixed (FOR LOOP in DO $$, pg_auth_members join); per-slice privilege allowlist + pg_namespace.nspowner; L-03 exact-trigger + admin-before-role-switch; L-05 updatedAt.
P2: L-02 split (L-02a/L-02b); jsonb parity corrected (no IEEE-754).

### R11 delta (this): 6 surgical corrections
1. **D1**: Removed blanket ALL SEQUENCES revoke (RA uses UUID; no application sequence needed)
2. **D2**: `public` schema now checked in ownership assertion (only `information_schema` and `pg_%` excluded)
3. **D3**: Removed unsupported full-grant-scan claim; added E-19 N2-5 privilege-survival LIVE vector
4. **D4**: L-02a is admin/bypass-RLS schema-only SQLSTATE 23502 test (NOT an RLS test)
5. **D5**: L-03 strengthened with current_user, rolsuper, schema/table privilege assertions and RLS-diagnostic on denial; calls app_user_writer the **human writer principal**
6. **D6**: Removed IEEE-754/DOUBLE_PRECISION claim; numeric parity limited to two specific vectors (`1.0=1`, `-0=0`); all stale R0-R9/R10 references synced to R11

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
- No new policy decisions (R11 delta is correction-only)
- No mutable origin/main references (evidence pinned)

---

## 3. RQ → STEP → AC

| RQ | Question | AC |
|---|---|---|
| RQ-01 | Q1: Clock type | **Calendar days** |
| RQ-02 | Q2: Timezone | **Storage TIMESTAMPTZ UTC; Business Asia/Bangkok; exclusive next-day boundary** |
| RQ-03 | Q3: Holiday | **OUT OF N2 SCOPE** |
| RQ-04 | Q4: Clock start | **PlacementCase.openedAt** |
| RQ-05 | Q5: Pause/reset | **Clock RUNNING always, assignment has expiresAt** |
| RQ-06 | Q6: Attribution | **Layer 1+1b+1c triggers; N2-1 RLS = ADMIN/referrer/engine (no LHA/team refs); Layer 1b NULL→value write-once; CHECK current state only; default-deny DELETE** |
| RQ-07 | Q7: BeneficiaryDecision | **Authority record; CREATE/CORRECT separate functions; CREATE three typed outcomes; CORRECT lock→lookup→UPDATE→INSERT→link→commit ordering; four commands; idempotency identity excludes decidedAt; canonicalJson validated by isJsonValue (WeakSet cycle detection; rejects undefined, NaN, ±Infinity, exotic objects) and aligned with JSON.stringify + jsonb semantics (K-01..K-20 LIVE tests)** |
| RQ-08 | Q8: Permissions | **5 explicit codes + implicit self-view; role-scoped RLS; team-scope on BOTH old/new rows (USING + WITH CHECK); HR_STAFF UPDATE denied; N2-1 RLS simplified; system engine app_engine_writer (dedicated LOGIN role + dedicated connection pool `HRPARTNER_ENGINE_URL`, no SET ROLE assumption, posture converge `NOSUPERUSER NOBYPASSRLS NOINHERIT NOREPLICATION`, per-slice privilege allowlist R11, REVOKE DELETE, explicit policies with COALESCE current_setting context gate, set_config(..., true) only, membership/ownership lock R11, 18 LIVE tests E-01..E-18, E-19 N2-5 privilege-survival R11-delta); LIVE RLS matrix tests (L-01..L-06 isolation R11-delta)** |
| RQ-09 | Q9: Inventory reuse | **Component inventory + conflicts** |
| RQ-09b | Q9b: Legacy ctvId | **EXACT_SAFE = FK + provenance + writer + no conflict + audit** |
| RQ-10 | Q10: Slices | **6 slices; V2 P1 capability in pinned baseline, no merge dep** |

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

## 5. R11 delta Corrections (this revision)

| # | Directive | Implementation |
|---|---|---|
| D1 | Blanket ALL SEQUENCES revoke breaks slice ordering | DISCOVERY §2.6.3: removed blanket `REVOKE ALL PRIVILEGES ON ALL SEQUENCES`. RA uses UUID; CBD sequences belong to N2-5 |
| D2 | `public` schema excluded from ownership check | DISCOVERY §2.6.3 Step 4: ownership assertion now excludes only `information_schema` and `pg_%`; `public` is checked |
| D3 | Full grant scan claim unsupported; need CBD survival evidence | DISCOVERY §2.6.3 removed "full catalog scan" claim; added E-19 N2-5 privilege-survival LIVE vector with `has_table_privilege` assertions |
| D4 | L-02a needs admin/bypass-RLS ordering | DISCOVERY §2.6.4: L-02a runs under test-admin/table-owner with `SET LOCAL row_security = OFF`, expects SQLSTATE 23502; explicitly NOT an RLS test |
| D5 | L-03 needs privilege/visibility preconditions | DISCOVERY §2.6.4: L-03 asserts current_user, rolsuper, schema/table privileges, OLD P1 row visibility before UPDATE; SQLSTATE 42501 + RLS-diagnostic on denial; calls app_user_writer the **human writer principal** |
| D6 | IEEE-754/DOUBLE_PRECISION claim wrong; R0-R9/R10 stale refs | DISCOVERY §2.5.4: removed IEEE-754/DOUBLE_PRECISION; numeric parity limited to two specific vectors; all R0-R9/R10 status text synced to R11 |

---

## 6. Branch State

**Branch:** `hrp-v6-n2-aff-policy-contract-discovery`
**Base (post-sync):** `0d7f8a1099bc9f1a41767aefe5bd3bc149de84d2` (origin/main)
**PR:** [Pull Request #4](https://github.com/nobita6986/HRpartner/pull/4)
**History preserved:** R0-R11 commits + R11 delta corrections
**Status:** `OPEN / FINAL_R11_DELTA_REQUIRED` — waiting for T0 final authorization

---

## 7. Status

**OPEN / FINAL_R11_DELTA_REQUIRED**

PR #4 remains docs-only, no production code changes. Branch ahead of main; merge to main awaits T0 final authorization.

**This task is in FINAL_R11_DELTA_REQUIRED state. N2-1 is a separate task T0 will unlock via Tier 1.**