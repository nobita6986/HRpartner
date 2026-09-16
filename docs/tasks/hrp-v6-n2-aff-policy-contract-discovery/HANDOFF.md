# N2 AFF Discovery — HANDOFF

**Task:** `hrp-v6-n2-aff-policy-contract-discovery`
**Status:** `OPEN / FINAL_R11_DELTA_REQUIRED`
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
| Evidence gathering | Complete (full SHA pinning) |
| T0 verdict applied | R0-R11 + R11 delta applied |
| R11 delta corrections | 6 surgical corrections applied |
| Implementation gate | LOCKED until PR #4 merges (Tier 1 unlocks N2-1 separately) |
| **PR #4 status** | **OPEN / FINAL_R11_DELTA_REQUIRED** |

**Task is OPEN / FINAL_R11_DELTA_REQUIRED — waiting for T0 final authorization.**

---

## 2. Deliverables

4 files. Zero code.

| File | Purpose |
|---|---|
| DISCOVERY.md | Locked decisions, schema sketches, invariant contracts, 6-slice plan (status OPEN / FINAL_R11_DELTA_REQUIRED) |
| TASK.md | RQ -> STEP -> AC, scope, boundary |
| HANDOFF.md | Status + handoff summary (status OPEN / FINAL_R11_DELTA_REQUIRED) |
| evidence/OVERVIEW.md | Migration inventory + aff_plan.md affinity + V6 P1 evidence (pinned) |

---

## 3. Locked Decisions Summary (R11 delta final)

### Clock and Time
- Calendar days; storage TIMESTAMPTZ UTC; business Asia/Bangkok
- Day boundary: exclusive next-day [start, nextDayStart)
- Holiday: OUT OF N2 SCOPE

### Lifecycle
- Clock start: PlacementCase.openedAt
- Pause: none; assignment has expiresAt

### Attribution (Q6 — R11 delta final)
- Layer 1 (created_at + immutable; NO labor_profile_id)
- Layer 1b (NULL->value write-once sole authority)
- Layer 1c (lifecycle transition trigger)
- Layer 2 (CHECK current state only)
- Layer 3 (N2-1 RLS = ADMIN/referrer/engine; no external table refs)
- Layer 5 (default-deny DELETE)

### Beneficiary Decision (Q7 — R11 delta final)
- CREATE/CORRECT separate functions; CREATE three typed outcomes; CORRECT lock->lookup->UPDATE->INSERT->link->commit
- Idempotency identity excludes decidedAt; canonicalJson validated by isJsonValue (WeakSet cycle detection; rejects undefined/NaN/±Infinity/exotic) and aligned with JSON.stringify + jsonb semantics (K-01..K-20 LIVE tests; numeric parity limited to two specific vectors `1.0=1`, `-0=0`)

### Permissions (Q8 — R11 delta final)
- 5 explicit codes + implicit self-view; HR_STAFF UPDATE denied; team-scope on BOTH rows
- System engine app_engine_writer: dedicated LOGIN role + dedicated connection pool `HRPARTNER_ENGINE_URL`; no SET ROLE assumption; posture converge `NOSUPERUSER NOBYPASSRLS NOINHERIT NOREPLICATION`; per-slice privilege allowlist (no blanket ALL SEQUENCES revoke — only exact sequence if needed); membership/ownership lock (FOR LOOP in DO $$ with CURSOR, pg_auth_members joined via pg_roles on roleid=oid, pg_namespace.nspowner check covering `public`); REVOKE DELETE; COALESCE current_setting gate; set_config(..., true) only; 19 LIVE tests E-01..E-19 (E-19 N2-5 privilege-survival)
- CBD RLS scope: qualified outer column; L-01..L-06 isolation tests (R11 delta corrected — L-02a admin/bypass-RLS schema-only; L-03 strengthened with privilege/visibility preconditions)

---

## 4. 6 Slice Plan

| Slice | Schema scope | Test gate |
|---|---|---|
| N2-1 | ReferralAttribution + Layer 1+1b+1c+2+5 + N2-1 RLS + app_engine_writer runtime (LOGIN + dedicated pool + per-slice privilege + membership/ownership lock) | Immutability, write-once (K-01..K-20), lifecycle, engine contract (E-01..E-19) |
| N2-2 | None (pure app, runs as app_engine_writer via dedicated pool) | Engine isolation, race, forged code |
| N2-3 | Additive columns + RPC signature | RPC migration test |
| N2-4 | labor_profile_handling_assignments + hr_team_members + N2-4 RLS + additive handler/team RLS | Race to assign, L-01..L-06, team scope, HR_STAFF UPDATE denied |
| N2-5 | CommissionBeneficiaryDecision + CORRECT ordering + CREATE/CORRECT split + N2-5 RLS (CBD grants/policies added here) + E-19 privilege-survival LIVE | Invariant, command matrix, CORRECT ordering, CONFLICT_EXISTING_ACTIVE, L-01..L-06 isolation, LIVE RLS |
| N2-6 | Additive beneficiary_user_id + EXACT_SAFE-only backfill + engine update | EXACT_SAFE classification |

---

## 5. Boundary Compliance

- No schema/migration/source changes
- No production DB writes
- No PLANNER_HANDOVER / TIER0_SHIFT_HANDOVER modifications
- No PR #3 / P2 file changes
- No N2-1 implementation; No N4 implementation
- Docs-only PR
- Read-only research against pinned baseline
- R11 delta is correction-only — no new policy, no new survey
- Branch synced with origin/main (HEAD 0d7f8a1) before R6; preserved through R7-R11-delta

---

## 6. T0 Verdict Applied (R0–R11 + R11 delta)

| Round | Major changes |
|---|---|
| R0 | Discovery baseline — 10 questions answered |
| R1 | Status sync; HANDOFF.md; Q7 authority record; Q9b classification; Q2 timezone; V6 P1 initial |
| R2 | V6 P1 corrected; Q7 beneficiaryUserId required + SYSTEM FK + invariant; Q9b tightened |
| R3 | NULLS NOT DISTINCT, advisory lock, actorType/CHECK, UNRESOLVED typed, immutable/mutable, exclusive next-day, Holiday OUT |
| R4 | 7 blockers fixed |
| R5 | 5 directives applied |
| R6 | branch sync; CREATE/CORRECT split; RLS team-scope; ReferralAttribution DB contract; state diagram; full-SHA evidence |
| R7 | RLS valid PostgreSQL; CORRECT ordering fixed; idempotency identity clarified; N2-1 RLS simplified; app_engine_writer contract; Layer 1/1b separation |
| R8 | CBD RLS scope; app_engine_writer executable contract; set_config(..., true) only; recursive canonical JSON |
| R9 | app_engine_writer runtime (LOGIN + dedicated pool); link-capture + RETURNING; K-08/K-09 alignment; isJsonValue reject vectors; L-01..L-06 isolation; COALESCE; posture converge; status sync |
| R10 | cycle detection (WeakSet); membership/ownership lock; N2-1/CBD slice ordering; L-01..L-06 corrected; posture AFTER ALTER; jsonb parity scope |
| R11 | P1-1 membership SQL fixed (FOR LOOP in DO $$, pg_auth_members join); P1-2 per-slice privilege allowlist + pg_namespace.nspowner; P1-3 L-03 exact-trigger + admin-before-role-switch; P1-4 L-05 updatedAt; P2-1 L-02 split (L-02a/L-02b); P2-2 jsonb parity corrected (no IEEE-754) |
| **R11 delta** | **D1 blanket ALL SEQUENCES revoke removed; D2 public schema now checked; D3 full-grant-scan claim removed + E-19 N2-5 privilege-survival LIVE; D4 L-02a admin/bypass-RLS schema-only; D5 L-03 privilege/visibility preconditions + RLS-diagnostic; D6 removed IEEE-754/DOUBLE_PRECISION + stale R0-R9/R10 refs synced** |

---

## 7. Whats Next

### Reviewer path
1. Open PR #4
2. Review 4 docs files (zero code risk)
3. Approve -> merge to main -> Tier 1 unlocks N2-1 task using DISCOVERY.md as contract.
4. OR open follow-up revision (NOT recommended — R11 delta is the final R11 closure)

### After merge
1. Tier 1 reads DISCOVERY.md section 2 (locked decisions) as the contract
2. Tier 1 creates `hrp-v6-n2-aff-01-attribution-foundation` task
3. Implementation starts under separate task in separate branch

### Out of PR scope
- No N2-1 implementation in this PR
- No schema changes
- No migration

---

**Handoff state: OPEN / FINAL_R11_DELTA_REQUIRED. PR #4 ready for T0 final review (R11 delta corrections applied).**