# Task: N2 AFF Policy & Contract Discovery

**Slug:** `hrp-v6-n2-aff-policy-contract-discovery`
**Status:** `RESOLVED_MERGED`
**Audit:** `NONE`
**Type:** READ-ONLY Discovery — no production code changes
**Baseline (pinned):** `b91a33f948aed224a88f3e8e7c9847006f33e97f` (full SHA)
**Branch:** `hrp-v6-n2-aff-policy-contract-discovery`
**PR:** [#4](https://github.com/nobita6986/HRpartner/pull/4) (Merged via commit 17a8487/9f180f5)

---

## 1. Outcome (delivered so far)

- Surveyed codebase for all 10 N2 policy questions
- Documented evidence with file:line references (full SHA pinning)
- Proposed 6 vertical slices with dependency graph
- **T0 R0–R11 verdicts + R11 delta + R11 micro-delta applied**

### R0–R8: prior rounds
- R0–R8 covered discovery baseline, status sync, evidence, blockers, contract defects, executable blockers, executable-contract blockers

### R9: 4 P1 + 4 P2 blockers
app_engine_writer runtime; link-capture + RETURNING; K-08/K-09 alignment; isJsonValue reject vectors; L-01..L-06; COALESCE; posture converge; status sync

### R10: 4 P1 + 2 P2 blockers
cycle detection (WeakSet); membership/ownership lock; N2-1/CBD slice ordering; L-01..L-06 corrected; posture AFTER ALTER; jsonb parity scope

### R11: 6 blockers
membership SQL fixed (FOR LOOP in DO $$, pg_auth_members join); per-slice privilege allowlist + pg_namespace.nspowner; L-03 exact-trigger + admin-before-role-switch; L-05 updatedAt; L-02 split (L-02a/L-02b); jsonb parity corrected (no IEEE-754)

### R11 delta: 6 surgical corrections
D1 blanket ALL SEQUENCES revoke removed; D2 public schema now checked; D3 full-grant-scan claim removed + E-19 N2-5 privilege-survival LIVE; D4 L-02a admin/bypass-RLS schema-only; D5 L-03 privilege/visibility preconditions + RLS-diagnostic; D6 removed IEEE-754/DOUBLE_PRECISION + stale R0-R9/R10 refs synced

### R11 micro-delta (this): 3 surgical corrections
1. **D4-fix**: `SET LOCAL row_security = OFF` is NOT a bypass. Replaced L-02a with executable Path A (test principal with `rolbypassrls=true` or `rolsuper=true`) or Path B (transactional `ALTER TABLE ... NO FORCE ROW LEVEL SECURITY` with FORCE RLS re-asserted after ROLLBACK).
2. **D3-fix**: E-19 rerun limited to idempotent role/privilege convergence sub-block; `CREATE POLICY` DDL excluded because PostgreSQL has no `CREATE POLICY IF NOT EXISTS`.
3. **D6-fix**: removed three remaining stale statements (canonicalJson/jsonb both reject, R0-R9 status, must both reject).

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
- No new policy decisions (R11 micro-delta is correction-only)
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
| RQ-06 | Q6: Attribution | **Layer 1+1b+1c triggers; N2-1 RLS = ADMIN/referrer/engine; Layer 1b NULL→value write-once; CHECK current state only; default-deny DELETE** |
| RQ-07 | Q7: BeneficiaryDecision | **Authority record; CREATE/CORRECT separate functions; CREATE three typed outcomes; CORRECT lock→lookup→UPDATE→INSERT→link→commit; four commands; idempotency identity excludes decidedAt; canonicalJson validated by isJsonValue (WeakSet cycle detection; rejects undefined, NaN, ±Infinity, exotic objects) and aligned with JSON.stringify + jsonb semantics (K-01..K-20 LIVE tests)** |
| RQ-08 | Q8: Permissions | **5 explicit codes + implicit self-view; role-scoped RLS; team-scope on BOTH old/new rows; HR_STAFF UPDATE denied; N2-1 RLS simplified; system engine app_engine_writer (dedicated LOGIN + dedicated connection pool `HRPARTNER_ENGINE_URL`, posture converge, per-slice privilege allowlist, REVOKE DELETE, COALESCE current_setting context gate, set_config(..., true) only, membership/ownership lock, E-19 N2-5 privilege-survival); LIVE RLS matrix tests (L-01..L-06 isolation R11 micro-delta corrected)** |
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

## 5. R11 micro-delta Corrections (this revision)

| # | Directive | Implementation |
|---|---|---|
| D4-fix | `SET LOCAL row_security = OFF` is NOT a bypass; table owners are subject to FORCE RLS | DISCOVERY §2.6.4 L-02a replaced with two executable paths: Path A — test principal with `rolbypassrls=true` or `rolsuper=true` (asserted before INSERT); Path B — under table-owner in a test-only transaction, assert FORCE RLS is enabled, run `ALTER TABLE ... NO FORCE ROW LEVEL SECURITY` (transactional), attempt INSERT NULL, expect SQLSTATE 23502, ROLLBACK, re-assert FORCE RLS is enabled |
| D3-fix | E-19 rerun including CREATE POLICY fails because PostgreSQL has no `CREATE POLICY IF NOT EXISTS` | DISCOVERY §2.6.3 E-19: rerun limited to the idempotent role/privilege convergence sub-block (Steps 1, 2, 3, 4, 5 RA-specific REVOKE/GRANT); CREATE POLICY DDL is excluded |
| D6-fix | Three stale statements remained: `canonicalJson/jsonb both reject`, R0-R9 status, `must both reject` | DISCOVERY §2.5.4 + end-of-file: rewritten to say `isJsonValue` rejects JS-specific values before serialization; PostgreSQL receives only serialized valid JSON; operational decisions: R0–R11 + R11 delta + R11 micro-delta |

---

## 6. Branch State

**Branch:** `hrp-v6-n2-aff-policy-contract-discovery`
**Base (post-sync):** `0d7f8a1099bc9f1a41767aefe5bd3bc149de84d2` (origin/main)
**PR:** [Pull Request #4](https://github.com/nobita6986/HRpartner/pull/4)
**History preserved:** R0-R11 + R11 delta + R11 micro-delta
**Status:** `RESOLVED_MERGED`

---

## 7. Status

**RESOLVED_MERGED / RESOLVED_MERGED**

PR #4 remains docs-only, no production code changes. ; merge to main awaits T0 final authorization.

**This task is in RESOLVED_MERGED state. N2-1 is a separate task T0 will unlock via Tier 1.**