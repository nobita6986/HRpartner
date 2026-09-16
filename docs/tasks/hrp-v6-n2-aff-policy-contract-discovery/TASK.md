# Task: N2 AFF Policy & Contract Discovery

**Slug:** `hrp-v6-n2-aff-policy-contract-discovery`
**Status:** `OPEN / REVISION_REQUIRED` (T0 verdict after R7 → R8 → R9 → R10)
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
- **T0 R0–R10 verdicts applied** (R10 closes 4 P1 + 2 P2 blockers):

### R0–R7: prior rounds
- R0: discovery baseline
- R1: status sync; HANDOFF.md; Q7 authority record; Q9b classification; Q2 timezone layering; V6 P1 initial evidence
- R2: V6 P1 corrected (filesystem); Q7 beneficiaryUserId required + SYSTEM FK + invariant; Q9b tightened
- R3: NULLS NOT DISTINCT, advisory lock, actorType/actorUserId + CHECK, UNRESOLVED typed result, immutable/mutable split (referral only), exclusive next-day, Holiday out of scope, COMPLETE/READY_FOR_MERGE, PR #4
- R4: 7 blockers fixed (DDL syntax, transaction-scoped advisory lock, multi-layer attribution immutability, off-by-one helper removed, reproducible evidence commands, CommissionBeneficiaryDecision immutable/mutable split + correction vs reversal, permission codes reconciled to 5+implicit-self + WITH CHECK)
- R5: 5 directives applied — drop write-once CHECK; trigger owns write-once; CHECK = current state; WITH CHECK not DELETE protection; default-deny DELETE; four beneficiary commands; REVERSED→SUPERSEDED forbidden; supersede link direction fixed; role-scoped RLS; explicit UPDATE USING/WITH CHECK; LIVE RLS matrix required; evidence pinned to full SHA; git ls-tree; no placeholders; PR body clean
- R6: 6 contract defects fixed — branch sync; CREATE/CORRECT split; RLS team-scope on both rows; ReferralAttribution DB contract complete; state diagram corrected; full-SHA evidence
- R7: 6 executable blockers — RLS valid PostgreSQL; CORRECT ordering fixed; idempotency identity clarified; N2-1 RLS simplified; app_engine_writer separate DB principal; Layer 1/1b separation; matrix self-release removed

### R8: 4 P1 executable-contract blockers
- CBD RLS scope (qualified outer column); cross-profile denial LIVE test
- app_engine_writer executable contract (idempotent provisioning, explicit grants, REVOKE DELETE, three policies, 12 LIVE tests E-01..E-12)
- set_config(..., true) only; LIVE tests prove context cleared after COMMIT/ROLLBACK/pooled reuse
- Recursive canonical JSON; 10 LIVE tests K-01..K-10

### R9: 4 P1 + 4 P2 blockers
1. **app_engine_writer runtime (R9)** — dedicated LOGIN role + dedicated engine DSN/connection pool (`HRPARTNER_ENGINE_URL`); runtime test confirms `current_user='app_engine_writer'`; no SET ROLE assumption; pool/credential boundary via `pg_stat_activity`
2. **link-capture + RETURNING (R9)** — SELECT policy now permits `link-capture` so Prisma `INSERT ... RETURNING` works; LIVE test E-17 with exact Prisma statement
3. **Canonical JSON K-08/K-09 alignment (R9)** — `1.0 ↔ 1` and `-0 ↔ 0` return `true` (align with `JSON.stringify` and PostgreSQL `jsonb` numeric normalization)
4. **`isJsonValue` reject vectors (R9)** — 10 LIVE rejection vectors K-11..K-20

P2 corrections:
5. **L-01..L-06 (R9)** — CBD INSERT WITH CHECK isolation tests
6. **COALESCE (R9)** — all engine policies use `COALESCE(current_setting('hrp.engine_context', true), '')` to guard against NULL when GUC never set
7. **Posture converge (R9)** — `ALTER ROLE` converges to `NOSUPERUSER NOBYPASSRLS NOINHERIT NOREPLICATION`
8. **Status sync (R9)** — `OPEN / REVISION_REQUIRED` in all 4 docs

### R10 (this): 4 P1 + 2 P2 blockers
1. **P1-1: Cycle detection (R10)** — `isJsonValue` uses WeakSet with add-before-descend/delete-after-unwind pattern; K-15 now throws TypeError for cyclic objects
2. **P1-2: Membership/ownership lock (R10)** — `REVOKE ALL PRIVILEGES ON ALL TABLES/SCHEMAS/SEQUENCES`; `pg_auth_members` check for unexpected memberships; `pg_class` ownership check; post-assert raises explicit error if engine owns any application objects
3. **P1-3: Slice ordering (R10)** — N2-1 = RA grants/policies only; CBD grants deferred to N2-5; CBD table does not exist at N2-1 time
4. **P1-4: L-01..L-06 matrix (R10)** — L-02 deny (NOT NULL, not RLS); L-03 ALTER TRIGGER disable + dedicated test DB + non-superuser (no `session_replication_role = replica`); L-05 mutable outcomeNote (not immutable reason)

P2 corrections:
5. **P2-1: Posture assert AFTER ALTER (R10)** — ALTER first, then post-assert; fail-loud on drift
6. **P2-2: jsonb parity scope (R10)** — application validator runs first; DB `jsonb =` equality is secondary backup only, applied to confirmed-JSON values

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
- No new policy decisions (R10 is correction-only)
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
| RQ-06 | Q6: Attribution | **Layer 1+1b+1c triggers; N2-1 RLS = ADMIN/referrer/engine (no LHA/team refs); Layer 1b NULL→value write-once; CHECK current state only; default-deny DELETE; write-once LIVE test cases** |
| RQ-07 | Q7: BeneficiaryDecision | **Authority record; CREATE/CORRECT separate functions; CREATE three typed outcomes; CORRECT lock→lookup→UPDATE→INSERT→link→commit ordering; four commands; idempotency identity excludes decidedAt; canonicalJson validated by isJsonValue (WeakSet cycle detection; rejects undefined, NaN, ±Infinity, exotic objects) and aligned with JSON.stringify + jsonb semantics (K-01..K-20 LIVE tests)** |
| RQ-08 | Q8: Permissions | **5 explicit codes + implicit self-view; role-scoped RLS; team-scope on BOTH old/new rows (USING + WITH CHECK); HR_STAFF UPDATE denied; N2-1 RLS simplified; system engine app_engine_writer (dedicated LOGIN role + dedicated connection pool `HRPARTNER_ENGINE_URL`, no SET ROLE assumption, posture converge `NOSUPERUSER NOBYPASSRLS NOINHERIT NOREPLICATION`, REVOKE DELETE, explicit policies with COALESCE current_setting context gate, set_config(..., true) only, 18 LIVE tests E-01..E-18, membership/ownership lock R10); LIVE RLS matrix tests (incl. L-01..L-06 isolation R10)** |
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

## 5. R10 Blocker Corrections (this revision)

| # | Directive | Implementation |
|---|---|---|
| P1-1 | isJsonValue() cycle causes RangeError not TypeError | DISCOVERY §2.5.4 `isJsonValue` now uses WeakSet with add-before-descend/delete-after-unwind pattern; cyclic object K-15 throws TypeError |
| P1-2 | Engine membership/ownership not locked | DISCOVERY §2.6.3 provisioning: `REVOKE ALL PRIVILEGES ON ALL TABLES/SCHEMAS/SEQUENCES`; `pg_auth_members` membership check; `pg_class` ownership check; post-assert raises explicit error |
| P1-3 | N2-1 grants/policies reference CBD table not yet created | DISCOVERY §2.6.3: N2-1 scope = RA grants/policies only; CBD grants deferred to N2-5; CBD table created by N2-5 migration |
| P1-4 | L-01..L-06 matrix not executable | DISCOVERY §2.6.4: L-02 deny (NOT NULL); L-03 ALTER TRIGGER disable + dedicated test DB + non-superuser (no blanket session_replication_role); L-05 mutable outcomeNote |
| P2-1 | Posture assert before ALTER instead of after | DISCOVERY §2.6.3: ALTER first, then post-assert; fail-loud on drift |
| P2-2 | jsonb parity claim too broad | DISCOVERY §2.5.4: application validator runs first; DB `jsonb =` equality is secondary backup applied only to confirmed-JSON values |

---

## 6. Branch State

**Branch:** `hrp-v6-n2-aff-policy-contract-discovery`
**Base (post-sync):** `0d7f8a1099bc9f1a41767aefe5bd3bc149de84d2` (origin/main)
**PR:** [Pull Request #4](https://github.com/nobita6986/HRpartner/pull/4)
**History preserved:** R0-R9 commits + R10 corrections
**Status:** `OPEN / REVISION_REQUIRED` — waiting for T0 final authorization

---

## 7. Status

**OPEN / REVISION_REQUIRED**

PR #4 remains docs-only, no production code changes. Branch ahead of main; merge to main awaits T0 final authorization.

**This task is in REVISION_REQUIRED state. N2-1 is a separate task T0 will unlock via Tier 1.**