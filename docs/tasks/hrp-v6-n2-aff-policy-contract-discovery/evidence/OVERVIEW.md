# N2 Discovery Evidence Index

This folder contains supporting evidence for the N2 AFF Policy Discovery task.

**Status:** OPEN / REVISION_REQUIRED (T0 verdict after R7 → R8 in progress)

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

## Locked Decisions (T0 R8 Verdict)

| Q | Decision | Value |
|---|---|---|
| Q1 | Clock type | Calendar days |
| Q2a | Storage timezone | TIMESTAMPTZ UTC |
| Q2b | Business clock | Asia/Bangkok |
| Q2c | Day boundary | Exclusive next-day [start, nextDayStart) |
| Q3 | Holiday | OUT OF N2 SCOPE |
| Q4 | Clock start | PlacementCase.openedAt |
| Q5 | Pause/reset | Clock RUNNING always |
| Q6 | Attribution | Layer 1 (immutables incl. created_at, NO labor_profile_id); Layer 1b (NULL→value write-once — sole authority); Layer 1c (lifecycle); Layer 2 (CHECK current state); RLS N2-1 (ADMIN/referrer/engine); N2-4 adds team policies; default-deny DELETE |
| Q7 | BeneficiaryDecision | R8: separate CREATE/CORRECT functions; CREATE three typed outcomes; CORRECT lock→lookup→UPDATE→INSERT→link→commit; idempotency excludes decidedAt; recursive canonicalJson or DB-layer jsonb = (must agree); 10 LIVE tests K-01..K-10 for canonical JSON |
| Q8 | Permissions | R8: 5 explicit codes + implicit self-view; team-scope BOTH rows; HR_STAFF UPDATE denied; N2-1 RLS simplified; app_engine_writer contract (NO BYPASSRLS, REVOKE DELETE, three policies, current_setting context gate, set_config(..., true) only); 12 LIVE tests E-01..E-12; cross-profile denial LIVE test (R8) |
| Q9a | RPC change | Yes, LIVE test plan |
| Q9b | EXACT_SAFE | FK + provenance + writer + no conflict + audit |
| Q10 | V6 P1 dep | Capability in pinned baseline (full SHA) — no merge dep |

---

## T0 R8 Revisions Applied — 4 P1 Executable-Contract Blockers

| # | Directive | Implementation |
|---|---|---|
| 1 | CBD RLS scope bypass | Bare `labor_profile_id` in WITH CHECK subqueries replaced with qualified `commission_beneficiary_decisions.labor_profile_id` (CBD INSERT + UPDATE); cross-profile denial LIVE test added |
| 2 | app_engine_writer executable contract | DISCOVERY §2.6.3: idempotent provisioning (`DO $$` with `pg_roles` lookup), explicit grants + REVOKE DELETE, three per-table policies (SELECT for consume flow, INSERT/UPDATE gated by `current_setting('hrp.engine_context', true)`); 12 LIVE contract tests E-01..E-12 (role attributes, grants, context absent/invalid/valid) |
| 3 | `set_config(..., false)` wrong isolation | Application contract mandates `set_config('hrp.engine_context', '<value>', true)` only; LIVE tests E-06/E-07 prove context cleared after COMMIT / ROLLBACK / pooled-connection reuse; lint blocks `set_config(..., false)` |
| 4 | Canonical JSON only sorts top-level | `canonicalJson` recursive helper covers nested objects, arrays, null, primitives; 10 LIVE tests K-01..K-10 (key-order, nested objects, array order, null, edge cases); optional DB-layer `jsonb =` backup option |

---

## Round-by-Round Summary

| Round | Major changes |
|---|---|
| R0–R6 | Prior rounds (branch sync, CREATE/CORRECT split, RLS team-scope, ReferralAttribution DB contract, state diagram, full-SHA evidence) |
| R7 | RLS expressions corrected (valid PostgreSQL, no NEW./OLD.); CORRECT ordering fixed; idempotency identity clarified; N2-1 RLS simplified; app_engine_writer contract; Layer 1 labor_profile_id removed; matrix self-release removed |
| **R8** | **CBD RLS scope fix (qualified outer column); app_engine_writer executable contract (idempotent provisioning, explicit grants + REVOKE DELETE, three per-table policies, 12 LIVE tests E-01..E-12); set_config(..., true) only with isolation LIVE tests; recursive canonical JSON with 10 LIVE tests K-01..K-10; PR status CHANGED to OPEN / REVISION_REQUIRED** |