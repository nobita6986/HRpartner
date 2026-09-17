# N2 Discovery Evidence Index

This folder contains supporting evidence for the N2 AFF Policy Discovery task.

**Status:** `RESOLVED_MERGED`

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

## Locked Decisions (T0 R11 micro-delta Verdict)

| Q | Decision | Value |
|---|---|---|
| Q1 | Clock type | Calendar days |
| Q2a | Storage timezone | TIMESTAMPTZ UTC |
| Q2b | Business clock | Asia/Bangkok |
| Q2c | Day boundary | Exclusive next-day [start, nextDayStart) |
| Q3 | Holiday | OUT OF N2 SCOPE |
| Q4 | Clock start | PlacementCase.openedAt |
| Q5 | Pause/reset | Clock RUNNING always |
| Q6 | Attribution | Layer 1; Layer 1b; Layer 1c; Layer 2; N2-1 RLS; N2-4 adds team policies; default-deny DELETE |
| Q7 | BeneficiaryDecision | R11 micro-delta: separate CREATE/CORRECT functions; CREATE three typed outcomes; CORRECT lock->lookup->UPDATE->INSERT->link->commit; idempotency excludes decidedAt; canonicalJson validated by isJsonValue (WeakSet cycle detection; rejects undefined/NaN/±Infinity/exotic) and aligned with JSON.stringify + jsonb semantics (K-01..K-20 LIVE tests; numeric parity limited to two specific vectors `1.0=1`, `-0=0`); isJsonValue rejects JS-specific values before serialization; PostgreSQL receives only serialized valid JSON |
| Q8 | Permissions | R11 micro-delta: 5 explicit codes + implicit self-view; team-scope BOTH rows; HR_STAFF UPDATE denied; N2-1 RLS simplified; app_engine_writer dedicated LOGIN + connection pool `HRPARTNER_ENGINE_URL` (posture converge; per-slice privilege allowlist; membership/ownership lock; REVOKE DELETE; COALESCE current_setting gate; set_config(..., true) only; 19 LIVE tests E-01..E-19 with E-19 sub-block rerun); CBD RLS qualified outer column; L-01..L-06 isolation tests (R11 micro-delta corrected — L-02a Path A/B executable; L-03 strengthened with privilege/visibility preconditions) |

---

## T0 R11 micro-delta Revisions Applied — 3 Surgical Corrections

| # | Directive | Implementation |
|---|---|---|
| D4-fix | `SET LOCAL row_security = OFF` is NOT a bypass; table owners are subject to FORCE RLS | L-02a replaced with two executable paths: Path A — test principal with `rolbypassrls=true` or `rolsuper=true` (asserted before INSERT); Path B — under table-owner in a test-only transaction, assert FORCE RLS is enabled, run `ALTER TABLE ... NO FORCE ROW LEVEL SECURITY` (transactional), attempt INSERT NULL, expect SQLSTATE 23502, ROLLBACK, re-assert FORCE RLS is enabled |
| D3-fix | E-19 rerun including CREATE POLICY fails because PostgreSQL has no `CREATE POLICY IF NOT EXISTS` | E-19 rerun limited to the idempotent role/privilege convergence sub-block (Steps 1, 2, 3, 4, 5 RA-specific REVOKE/GRANT); CREATE POLICY DDL is excluded |
| D6-fix | Three stale statements remained | `isJsonValue` rejects JS-specific values before serialization; PostgreSQL receives only serialized valid JSON; operational decisions: R0–R11 + R11 delta + R11 micro-delta |

---

## Round-by-Round Summary

| Round | Major changes |
|---|---|
| R0–R8 | Prior rounds |
| R9 | app_engine_writer runtime; link-capture + RETURNING; K-08/K-09 alignment; isJsonValue reject vectors; L-01..L-06 isolation; COALESCE; posture converge; status sync |
| R10 | cycle detection (WeakSet); membership/ownership lock; N2-1/CBD slice ordering; L-01..L-06 corrected; posture AFTER ALTER; jsonb parity scope |
| R11 | membership SQL fixed; per-slice privilege allowlist + pg_namespace.nspowner; L-03 exact-trigger + admin-before-role-switch; L-05 updatedAt; L-02 split; jsonb parity corrected |
| R11 delta | D1–D6 surgical corrections |
| **R11 micro-delta** | **D4-fix row_security=off replaced with Path A/B executable; D3-fix E-19 rerun limited to idempotent sub-block; D6-fix three stale JSON/R0-R9 statements removed** |