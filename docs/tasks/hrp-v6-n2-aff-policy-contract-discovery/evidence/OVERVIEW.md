# N2 Discovery Evidence Index

This folder contains supporting evidence for the N2 AFF Policy Discovery task.

**Status:** OPEN / FINAL_R11_DELTA_REQUIRED (T0 verdict after R7 → R8 → R9 → R10 → R11 → R11 delta)

---

## Files in This Task

| File | Purpose |
|---|---|
| ../DISCOVERY.md | Main document — locked decisions, schema sketches, invariant contracts, 6-slice plan |
| ../TASK.md | RQ -> STEP -> AC, scope, boundary |
| ../HANDOFF.md | Status + handoff summary |
| OVERVIEW.md (this) | Survey summary, aff_plan.md affinity, migration inventory |

**Total: 4 files. Zero code changes.**

---

## V6 Phase 1A — Evidence of Capability in Pinned Baseline

> **Evidence rule:** pinned to commit `b91a33f948aed224a88f3e8e7c9847006f33e97f` (full SHA, no shortened hash, no `<hash>` placeholder). Evidence commands use `git ls-tree -r --name-only -- <path>` (recursive, full names; `--` separator).

### Reproducible evidence commands

```
$ git ls-tree -r --name-only b91a33f948aed224a88f3e8e7c9847006f33e97f -- prisma/migrations | Select-String phase1a
prisma/migrations/20260908150000_v6_phase1a_labor_profile_schema/migration.sql
prisma/migrations/20260908150001_v6_phase1a_labor_profile_rls/migration.sql

$ git ls-tree -r --name-only b91a33f948aed224a88f3e8e7c9847006f33e97f -- prisma/migrations | Select-String n1_placement
prisma/migrations/20260912140411_n1_placement_case_foundation/migration.sql
prisma/migrations/20260912140412_n1_placement_case_rls/migration.sql
```

---

## Migration Inventory (relevant to N2)

| Migration | Tables | N2 Relevance | In pinned baseline |
|---|---|---|---|
| 20260908150000_v6_phase1a_labor_profile_schema | labor_profiles, labor_profile_intakes, employment_episodes | N2-3/4 FK | YES |
| 20260908150001_v6_phase1a_labor_profile_rls | RLS on above | N2-3/4 RLS | YES |
| 20260912140411_n1_placement_case_foundation | placement_case | N2 clock anchor | YES |
| 20260912140412_n1_placement_case_rls | RLS on placement_case | N2 RLS | YES |
| 20260819083254_p2_commission_schema | commission_policies, commission_ledger, commission_debts | N2-6 base | YES |
| 20260819104700_p2_commission_rls | RLS on commission tables | N2-6 RLS | YES |

---

## Affinity to aff_plan.md Decisions

All 18 AFF-DEC-* decisions in aff_plan.md v2.3 are LOCKED.

---

## Locked Decisions (T0 R11 delta Verdict)

| Q | Decision | Value |
|---|---|---|
| Q1 | Clock type | Calendar days |
| Q2a | Storage timezone | TIMESTAMPTZ UTC |
| Q2b | Business clock | Asia/Bangkok |
| Q2c | Day boundary | Exclusive next-day [start, nextDayStart) |
| Q3 | Holiday | OUT OF N2 SCOPE |
| Q4 | Clock start | PlacementCase.openedAt |
| Q5 | Pause/reset | Clock RUNNING always |
| Q6 | Attribution | Layer 1 (created_at + immutable; NO labor_profile_id); Layer 1b (NULL->value write-once — sole authority); Layer 1c (lifecycle); Layer 2 (CHECK current state); N2-1 RLS (ADMIN/referrer/engine); N2-4 adds team policies; default-deny DELETE |
| Q7 | BeneficiaryDecision | R11 delta: separate CREATE/CORRECT functions; CREATE three typed outcomes; CORRECT lock->lookup->UPDATE->INSERT->link->commit; idempotency excludes decidedAt; canonicalJson validated by isJsonValue (WeakSet cycle detection; rejects undefined/NaN/±Infinity/exotic) and aligned with JSON.stringify + jsonb semantics (K-01..K-20 LIVE tests; numeric parity limited to two specific vectors `1.0=1`, `-0=0`) |
| Q8 | Permissions | R11 delta: 5 explicit codes + implicit self-view; team-scope BOTH rows; HR_STAFF UPDATE denied; N2-1 RLS simplified; app_engine_writer dedicated LOGIN + connection pool `HRPARTNER_ENGINE_URL` (no SET ROLE assumption; posture converge `NOSUPERUSER NOBYPASSRLS NOINHERIT NOREPLICATION`; per-slice privilege allowlist no blanket ALL SEQUENCES; membership/ownership lock R11 (FOR LOOP in DO $$ with CURSOR, pg_auth_members joined via pg_roles on roleid=oid, pg_namespace.nspowner covering `public`); REVOKE DELETE; COALESCE current_setting gate; set_config(..., true) only; 19 LIVE tests E-01..E-19); CBD RLS qualified outer column; L-01..L-06 isolation tests (R11 delta corrected — L-02a admin/bypass-RLS schema-only; L-03 strengthened with privilege/visibility preconditions + RLS-diagnostic) |

---

## T0 R11 delta Revisions Applied — 6 Surgical Corrections

| # | Directive | Implementation |
|---|---|---|
| D1 | Blanket ALL SEQUENCES revoke breaks slice ordering | Removed `REVOKE ALL PRIVILEGES ON ALL SEQUENCES`; RA uses UUID; CBD sequences belong to N2-5 |
| D2 | `public` schema excluded from ownership check | Ownership assertion now excludes only `information_schema` and `pg_%`; `public` is checked |
| D3 | Full grant scan claim unsupported; need CBD survival evidence | Removed "full catalog scan" claim; added E-19 N2-5 privilege-survival LIVE vector with `has_table_privilege` assertions |
| D4 | L-02a needs admin/bypass-RLS ordering | L-02a runs under test-admin/table-owner with `SET LOCAL row_security = OFF`, expects SQLSTATE 23502; explicitly NOT an RLS test |
| D5 | L-03 needs privilege/visibility preconditions | L-03 asserts current_user, rolsuper, schema/table privileges, OLD P1 row visibility before UPDATE; SQLSTATE 42501 + RLS-diagnostic on denial; calls app_user_writer the **human writer principal** |
| D6 | IEEE-754/DOUBLE_PRECISION claim wrong; R0-R9/R10 stale refs | Removed IEEE-754/DOUBLE_PRECISION; numeric parity limited to two specific vectors (`1.0=1`, `-0=0`); all R0-R9/R10 status text synced to R11 |

---

## Round-by-Round Summary

| Round | Major changes |
|---|---|
| R0–R8 | Prior rounds (branch sync, CREATE/CORRECT split + ordering, RLS valid PostgreSQL, N2-1 RLS simplified, app_engine_writer contract, Layer 1/1b separation) |
| R9 | app_engine_writer runtime (LOGIN + dedicated pool); link-capture + RETURNING; K-08/K-09 alignment; isJsonValue reject vectors; L-01..L-06 isolation; COALESCE; posture converge; status sync |
| R10 | cycle detection (WeakSet); membership/ownership lock; N2-1/CBD slice ordering; L-01..L-06 corrected; posture AFTER ALTER; jsonb parity scope |
| R11 | P1-1 membership SQL fixed (FOR LOOP in DO $$, pg_auth_members join); P1-2 per-slice privilege allowlist + pg_namespace.nspowner; P1-3 L-03 exact-trigger + admin-before-role-switch; P1-4 L-05 updatedAt; P2-1 L-02 split (L-02a/L-02b); P2-2 jsonb parity corrected (no IEEE-754) |
| **R11 delta** | **D1 blanket ALL SEQUENCES revoke removed; D2 public schema now checked; D3 full-grant-scan claim removed + E-19 N2-5 privilege-survival LIVE; D4 L-02a admin/bypass-RLS schema-only; D5 L-03 privilege/visibility preconditions + RLS-diagnostic; D6 removed IEEE-754/DOUBLE_PRECISION + stale R0-R9/R10 refs synced** |