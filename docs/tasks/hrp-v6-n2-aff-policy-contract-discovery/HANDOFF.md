# N2 AFF Discovery — HANDOFF

**Task:** `hrp-v6-n2-aff-policy-contract-discovery`
**Status:** `COMPLETE` / `READY_FOR_MERGE`
**Audit:** `NONE`
**Lane:** STANDARD (no implementation in this task)
**Type:** READ-ONLY Discovery
**Baseline (pinned):** `b91a33f948aed224a88f3e8e7c9847006f33e97f` (full SHA)
**Branch:** `hrp-v6-n2-aff-policy-contract-discovery`
**PR:** [#4](https://github.com/nobita6986/HRpartner/pull/4)

---

## 1. Final Status

| Item | State |
|---|---|
| Survey scope | Complete |
| Evidence gathering | Complete (file:line + filesystem migration evidence pinned to full SHA) |
| T0 verdict applied | All R0–R6 decisions applied |
| Locked decisions | All operational decisions LOCKED |
| 6-slice plan | Ready |
| R4 corrections | 7 blockers fixed |
| R5 corrections | 5 directives applied (A/B/C/D/E) |
| R6 corrections | 6 directives applied (branch sync + 5 contract defects) |
| Implementation gate | LOCKED until PR #4 merges (Tier 1 unlocks N2-1 separately) |

**Task is COMPLETE — ready for review and merge.**

---

## 2. Deliverables

4 files. Zero code.

| File | Purpose |
|---|---|
| `DISCOVERY.md` | Locked decisions, schema sketches, invariant contracts, 6-slice plan |
| `TASK.md` | RQ → STEP → AC, scope, boundary |
| `HANDOFF.md` | Status + handoff to Tier 1 / Tier 0 reviewer |
| `evidence/OVERVIEW.md` | Migration inventory + aff_plan.md affinity + V6 P1 status (pinned) |

---

## 3. Critical Evidence (R5/R6 — pinned to full SHA)

### V6 Phase 1A in pinned baseline (full SHA, R6 reproducibility)

```
$ git ls-tree -r --name-only `
>>   b91a33f948aed224a88f3e8e7c9847006f33e97f `
>>   -- prisma/migrations `
>>   | Select-String "phase1a"
prisma/migrations/20260908150000_v6_phase1a_labor_profile_schema/migration.sql
prisma/migrations/20260908150001_v6_phase1a_labor_profile_rls/migration.sql

$ git ls-tree -r --name-only `
>>   b91a33f948aed224a88f3e8e7c9847006f33e97f `
>>   -- prisma/migrations `
>>   | Select-String "n1_placement"
prisma/migrations/20260912140411_n1_placement_case_foundation/migration.sql
prisma/migrations/20260912140412_n1_placement_case_rls/migration.sql
```

V6 P1 capability: `LaborProfile`, `LaborProfileIntake`, `EmploymentEpisode` tables, `CandidateSubmission.laborProfileId` FK, RLS — all in pinned baseline.

---

## 4. Locked Decisions Summary (R6 final)

### Clock & Time
- Calendar days (no business days)
- Storage: TIMESTAMPTZ UTC
- Business clock: Asia/Bangkok
- Day boundary: exclusive next-day `[start, nextDayStart)` (helper removed; N2-1 owns)
- Holiday: OUT OF N2 SCOPE

### Lifecycle
- Clock start: `PlacementCase.openedAt`
- Pause: none (clock RUNNING always); assignment has expiresAt

### Attribution (Q6 — R6 final)
- Immutable facts vs mutable lifecycle metadata split
- **Multi-layer enforcement**:
  - Layer 1: Trigger BEFORE UPDATE rejects UPDATE on immutable columns (INCLUDING `created_at`)
  - Layer 1b: Trigger BEFORE INSERT/UPDATE enforces laborProfileId NULL→value write-once
  - **Layer 1c (R6)**: Trigger BEFORE UPDATE enforces lifecycle transition matrix (terminal states cannot resurrect; only ACTIVE -> CONSUMED|EXPIRED|REVOKED|SUPERSEDED)
  - Layer 2: CHECK constraints inspect **current state only** (not write-once, not transitions)
  - Layer 3: RLS USING (read visibility) + WITH CHECK (write-path policy) — per-command policies in §2.4.3
  - Layer 4: Application service = convenience, not authority
  - Layer 5: Default-deny DELETE under FORCE RLS; optional BEFORE DELETE trigger defense-in-depth
- Separate clocks: 7d handling, 30d attribution

### Beneficiary Decision (Q7 — R6 final)
- Authority record; immutable facts vs mutable lifecycle metadata split
- **Invariant**: max one ACTIVE per `(laborProfileId, assignmentId, milestone)`
- **Nullable-safe SQL**: `NULLS NOT DISTINCT` after column list, before `WHERE status = 'ACTIVE'`
- **Concurrency**: interactive transaction contract — `pg_advisory_xact_lock` + lookup + supersede + insert in single `prisma.$transaction`
- **Actor model**: `actorType USER|SYSTEM` + `actorUserId nullable` + CHECK (XOR)
- **UNRESOLVED**: typed result + outbox event (no decision row created)
- **CREATE/CORRECT split (R6)**:
  - **CREATE**: three typed outcomes — `CREATED` | `IDEMPOTENT_REPLAY` (exact-match ACTIVE) | `CONFLICT_EXISTING_ACTIVE` (nonmatching ACTIVE — caller must use CORRECT or surface to human review). CREATE never auto-supersedes and never inserts a second ACTIVE row.
  - **CORRECT**: separate function. Two typed outcomes — `CORRECTED` (old ACTIVE -> SUPERSEDED + new ACTIVE) | `NO_ACTIVE` (no ACTIVE for business key — caller must use CREATE first).
  - Exact-match across all authoritative immutable facts: beneficiaryUserId, source, reason, evidence (deep-equal), handlingAssignmentId, actorType, actorUserId — not only beneficiaryUserId.
- **REVERSE / REDECIDE_AFTER_REVERSAL** (R6 clarification): REDECIDE_AFTER_REVERSAL is INSERT of a NEW row; the REVERSED row stays terminal and is not transitioned. There is no UPDATE on REVERSED that flips its status.
- **Forbidden**: REVERSED→SUPERSEDED, SUPERSEDED→REVERSED, any resurrection
- **Supersede link**: `old.supersededById → replacement` (single direction; replacement has no back-pointer)

### Migration & Compat
- RPC signature change accepted for N2-3 with LIVE test plan
- EXACT_SAFE classification: FK + provenance + writer semantics + no conflict + audit
- V6 P1 capability in pinned baseline (full SHA) — no merge dep

### Permissions (Q8 — R6 final)
- **5 explicit permission codes** + implicit self-view
- ADMIN/HR_MANAGER for beneficiary decisions
- HR_STAFF = visibility only, no beneficiary override
- **System engine** uses a separate DB principal `app_engine_writer` (NOT a human permission; bypasses RLS via role separation, not permission code)
- **Role-scoped RLS** (no role-only opens all rows)
- **Team-scope on BOTH rows (R6)**: USING checks OLD row team-scope; WITH CHECK verifies NEW row team-scope for HR_MANAGER INSERT/UPDATE on both `labor_profile_handling_assignments` and `commission_beneficiary_decisions`
- **HR_STAFF UPDATE denied (R6)**: removed from USING and WITH CHECK on both tables; matrix requires HR_STAFF UPDATE = denied
- **Manager cannot reassign assignee to out-of-team (R6)**: WITH CHECK verifies the resulting row's `assignee_user_id` is still in the manager's team
- Service layer = authorization authority
- **LIVE RLS matrix tests** required as hard test gate (expanded per-table in §2.6.4 including own/non-own/team/system consume cases)

---

## 5. 6 Slice Plan

| Slice | Slug | Schema scope | Migration risk | Test gate |
|---|---|---|---|---|
| N2-1 | `hrp-v6-n2-aff-01-attribution-foundation` | `ReferralAttribution` immutable facts + lifecycle metadata split; Layer 1 (incl. `created_at`) + Layer 1b write-once + Layer 1c transition trigger; Layer 2 CHECK current state; per-command RLS policies in §2.4.3; default-deny DELETE; system engine isolation | Low | Immutability triggers, transition matrix test, role-scoped LIVE RLS matrix (own/non-own/team/system consume) |
| N2-2 | `hrp-v6-n2-aff-02-link-capture` | None (pure app logic); runs as `app_engine_writer` | Zero | Race, forged code, system engine isolation |
| N2-3 | `hrp-v6-n2-aff-03-apply-attribution` | Additive columns + RPC signature change | HIGH | RPC migration test |
| N2-4 | `hrp-v6-n2-aff-04-handling-assignment` | `labor_profile_handling_assignments` with partial unique; team-scope USING + WITH CHECK (R6); HR_STAFF UPDATE denied | Medium | Race to assign, transfer/release WITH CHECK (no out-of-team assignee), expiry, LIVE RLS matrix |
| N2-5 | `hrp-v6-n2-aff-05-beneficiary-decision` | `CommissionBeneficiaryDecision` with NULLS NOT DISTINCT + CHECK + CHECK actor XOR + immutable-fact trigger; CREATE/CORRECT split (R6 typed outcomes); interactive transaction; four commands; team-scope USING + WITH CHECK (R6); HR_STAFF UPDATE denied | Medium | Invariant, command lifecycle matrix, four-command test, state-machine test (no forbidden transitions), CREATE/CORRECT split typed outcomes test, LIVE RLS matrix |
| N2-6 | `hrp-v6-n2-aff-06-commission-beneficiary` | Additive `beneficiary_user_id` + EXACT_SAFE-only backfill + engine update | Medium | EXACT_SAFE classification |

---

## 6. Boundary Compliance

- No schema/migration/source changes
- No production DB writes
- No `PLANNER_HANDOVER.md` / `TIER0_SHIFT_HANDOVER.md` modifications
- No PR #3 / P2 file changes
- No N4 implementation
- No N2 implementation
- Docs-only PR
- Read-only research against pinned baseline
- R6 is correction-only — no new policy, no new survey
- Branch synced with origin/main (HEAD `0d7f8a1`) before R6 corrections

---

## 7. T0 Final Verdict Applied (R0–R6)

| Round | Files affected | Major changes |
|---|---|---|
| R0 | All 4 | Discovery baseline — 10 questions answered |
| R1 | All 4 | Status sync; HANDOFF.md added; Q7 (authority record); Q9b (legacy); Q2 (timezone); V6 P1 initial |
| R2 | All 4 | V6 P1 corrected; Q7 R2 (beneficiaryUserId required + SYSTEM FK + invariant + UNRESOLVED); Q9b tightened; Q6 immutable |
| R3 | All 4 | NULLS NOT DISTINCT, advisory lock, actorType/CHECK, outcome removed, UNRESOLVED typed, immutable/mutable split (referral only), exclusive next-day, Holiday OUT, COMPLETE/READY_FOR_MERGE |
| R4 | All 4 | 7 blockers fixed (DDL syntax, transaction-scoped advisory lock, multi-layer immutability, off-by-one helper, reproducible evidence, decision immutable/mutable split + correction vs reversal, permission codes) |
| R5 | All 4 | drop write-once CHECK; trigger owns write-once; CHECK = current state; default-deny DELETE; four beneficiary commands; REVERSED→SUPERSEDED forbidden; supersede link direction fixed; role-scoped RLS; UPDATE USING/WITH CHECK for all commands; LIVE RLS matrix required; evidence pinned to full SHA; `git ls-tree -r --name-only`; no placeholders; PR body clean |
| **R6** | All 4 | **Branch synced with origin/main `0d7f8a1` (merge `97f639f`); CREATE/CORRECT split with typed `CONFLICT_EXISTING_ACTIVE` / `NO_ACTIVE`; exact-match across all authoritative immutable facts; RLS team-scope on BOTH old (USING) and new (WITH CHECK) rows for HR_MANAGER INSERT/UPDATE on both LHA and CBD; HR_STAFF UPDATE explicitly denied; manager cannot reassign out-of-team; system engine `app_engine_writer` separate DB principal with LIVE isolation tests; ReferralAttribution DB contract complete (Layer 1 covers `created_at`; Layer 1c transition trigger; per-command RLS in §2.4.3); state diagram redrawn with two direct branches; evidence command uses full SHA with `--` separator and two separate `Select-String` calls** |

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
- No N2-1 implementation in this PR
- No schema changes
- No migration

---

**Handoff complete. Status: COMPLETE / READY_FOR_MERGE. PR #4 ready for review.**