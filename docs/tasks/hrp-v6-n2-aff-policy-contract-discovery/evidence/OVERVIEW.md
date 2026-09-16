# N2 Discovery Evidence Index

This folder contains supporting evidence for the N2 AFF Policy Discovery task.

**Status:** OPEN / REVISION_REQUIRED (T0 verdict after R7 → R8 → R9)

---

## Files in This Task

| File | Purpose |
|---|---|
| ../DISCOVERY.md | Main document — locked decisions, schema sketches, invariant contracts, 6-slice plan |
| ../TASK.md | RQ → STEP → AC, scope, boundary |
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

## Locked Decisions (T0 R9 Verdict)

| Q | Decision | Value |
|---|---|---|
| Q1 | Clock type | Calendar days |
| Q2a | Storage timezone | TIMESTAMPTZ UTC |
| Q2b | Business clock | Asia/Bangkok |
| Q2c | Day boundary | Exclusive next-day [start, nextDayStart) |
| Q3 | Holiday | OUT OF N2 SCOPE |
| Q4 | Clock start | PlacementCase.openedAt |
| Q5 | Pause/reset | Clock RUNNING always |
| Q6 | Attribution | Layer 1 (immutables incl. created_at, NO labor_profile_id); Layer 1b (NULL→value write-once — sole authority); Layer 1c (lifecycle); Layer 2 (CHECK current state); N2-1 RLS (ADMIN/referrer/engine); N2-4 adds team policies; default-deny DELETE |
| Q7 | BeneficiaryDecision | R9: separate CREATE/CORRECT functions; CREATE three typed outcomes; CORRECT lock→lookup→UPDATE→INSERT→link→commit; idempotency excludes decidedAt; canonicalJson validated by isJsonValue (rejects undefined/NaN/±Infinity/exotic); aligned with JSON.stringify + jsonb semantics (K-01..K-20 LIVE tests) |
| Q8 | Permissions | R9: 5 explicit codes + implicit self-view; team-scope BOTH rows; HR_STAFF UPDATE denied; N2-1 RLS simplified; app_engine_writer dedicated LOGIN + connection pool `HRPARTNER_ENGINE_URL` (no SET ROLE assumption; posture converge `NOSUPERUSER NOBYPASSRLS NOINHERIT NOREPLICATION`; REVOKE DELETE; COALESCE current_setting gate; set_config(..., true) only; 18 LIVE tests E-01..E-18); CBD RLS qualified outer column; L-01..L-06 isolation tests |

---

## T0 R9 Revisions Applied — 8 Blockers

### P1 (4 blockers)
| # | Directive | Implementation |
|---|---|---|
| 1 | app_engine_writer cannot be used by current runtime | Dedicated LOGIN role + dedicated connection pool `HRPARTNER_ENGINE_URL`; runtime test E-14 confirms `current_user='app_engine_writer'`; E-15 verifies pool/credential boundary via `pg_stat_activity`; E-16 verifies credential boundary; explicit posture assertion raises if forced attributes don't match |
| 2 | Link-capture INSERT...RETURNING fails | SELECT policy for `referral_attributions` now permits `link-capture`; LIVE test E-17 with exact Prisma `INSERT ... RETURNING` statement |
| 3 | Canonical JSON K-08/K-09 false vs JSON.stringify + jsonb | `canonicalJson` now aligns with `JSON.stringify` and PostgreSQL `jsonb` semantics — `1.0 ↔ 1` and `-0 ↔ 0` return true (R9 LIVE test E-18) |
| 4 | canonicalJson coerces undefined/NaN/Infinity/exotic | `isJsonValue` validator rejects all non-JSON-value inputs before canonicalization; 10 LIVE rejection vectors K-11..K-20 |

### P2 (4 blockers)
| # | Directive | Implementation |
|---|---|---|
| 5 | CBD cross-profile UPDATE blocked by USING on OLD row (didn't test WITH CHECK) | L-01..L-06 isolation tests; L-01 INSERTs out-of-team `labor_profile_id` (tests INSERT WITH CHECK); L-03 UPDATEs from in-team to out-of-team with triggers bypassed; L-05 verifies non-team-modifying updates allowed |
| 6 | Context-clear test not strict about NULL | All engine policies use `COALESCE(current_setting('hrp.engine_context', true), '')` so absent-or-not-in-allowlist is denied; LIVE test E-13 confirms |
| 7 | Role provisioning not state-idempotent | `DO $$` posture assertion raises explicit error if existing role has wrong attributes; `ALTER ROLE ... NOSUPERUSER NOBYPASSRLS NOINHERIT NOREPLICATION` converges |
| 8 | DISCOVERY.md status still says COMPLETE/READY_FOR_MERGE | DISCOVERY.md status now `OPEN / REVISION_REQUIRED`; all 4 docs synced |

---

## Round-by-Round Summary

| Round | Major changes |
|---|---|
| R0–R7 | Prior rounds (branch sync, CREATE/CORRECT split + ordering, RLS valid PostgreSQL, N2-1 RLS simplified, app_engine_writer contract, Layer 1/1b separation, matrix self-release) |
| R8 | CBD RLS scope fix; app_engine_writer executable contract; set_config(..., true) only; recursive canonical JSON; status CHANGED to OPEN / REVISION_REQUIRED |
| **R9** | **app_engine_writer runtime (dedicated LOGIN + connection pool `HRPARTNER_ENGINE_URL`; posture converge; explicit assertion); link-capture + RETURNING (SELECT policy permits link-capture; E-17 LIVE test); Canonical JSON K-08/K-09 alignment (1.0↔1 and -0↔0 true; aligns with JSON.stringify and jsonb); isJsonValue reject vectors (K-11..K-20, 10 inputs); L-01..L-06 CBD INSERT WITH CHECK isolation tests; COALESCE engine policies; ALTER ROLE posture converge; status sync (DISCOVERY.md status changed)** |