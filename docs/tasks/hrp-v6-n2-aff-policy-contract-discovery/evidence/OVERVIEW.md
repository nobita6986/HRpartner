# N2 Discovery Evidence Index

This folder contains supporting evidence for the N2 AFF Policy Discovery task.

**Status:** OPEN / REVISION_REQUIRED (T0 verdict after R7 → R8 → R9 → R10)

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

## Locked Decisions (T0 R10 Verdict)

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
| Q7 | BeneficiaryDecision | R10: separate CREATE/CORRECT functions; CREATE three typed outcomes; CORRECT lock->lookup->UPDATE->INSERT->link->commit; idempotency excludes decidedAt; canonicalJson validated by isJsonValue (WeakSet cycle detection; rejects undefined/NaN/±Infinity/exotic) and aligned with JSON.stringify + jsonb semantics (K-01..K-20 LIVE tests) |
| Q8 | Permissions | R10: 5 explicit codes + implicit self-view; team-scope BOTH rows; HR_STAFF UPDATE denied; N2-1 RLS simplified; app_engine_writer dedicated LOGIN + connection pool `HRPARTNER_ENGINE_URL` (no SET ROLE assumption; posture converge `NOSUPERUSER NOBYPASSRLS NOINHERIT NOREPLICATION`; membership/ownership lock; REVOKE DELETE; COALESCE current_setting gate; set_config(..., true) only; 18 LIVE tests E-01..E-18); CBD RLS qualified outer column; L-01..L-06 isolation tests (R10 corrected) |

---

## T0 R10 Revisions Applied — 6 Blockers

### P1 (4 blockers)
| # | Directive | Implementation |
|---|---|---|
| P1-1 | isJsonValue() cycle causes RangeError not TypeError | `isJsonValue` uses WeakSet with add-before-descend/delete-after-unwind pattern; K-15 throws TypeError for cyclic objects |
| P1-2 | Engine membership/ownership not locked | `REVOKE ALL PRIVILEGES ON ALL TABLES/SCHEMAS/SEQUENCES`; `pg_auth_members` membership check; `pg_class` ownership check; post-assert raises explicit error |
| P1-3 | N2-1 grants/policies reference CBD table not yet created | N2-1 = RA grants/policies only; CBD grants deferred to N2-5 |
| P1-4 | L-01..L-06 matrix not executable | L-02 deny (NOT NULL); L-03 ALTER TRIGGER disable + dedicated test DB + non-superuser (no blanket session_replication_role); L-05 mutable outcomeNote (not immutable reason) |

### P2 (2 blockers)
| # | Directive | Implementation |
|---|---|---|
| P2-1 | Posture assert before ALTER instead of after | ALTER first, then post-assert; fail-loud on drift |
| P2-2 | jsonb parity claim too broad | Application validator runs first; DB `jsonb =` equality is secondary backup only, applied to confirmed-JSON values |

---

## Round-by-Round Summary

| Round | Major changes |
|---|---|
| R0–R7 | Prior rounds (branch sync, CREATE/CORRECT split + ordering, RLS valid PostgreSQL, N2-1 RLS simplified, app_engine_writer contract, Layer 1/1b separation, matrix self-release) |
| R8 | CBD RLS scope fix; app_engine_writer executable contract; set_config(..., true) only; recursive canonical JSON; status CHANGED to OPEN / REVISION_REQUIRED |
| R9 | app_engine_writer runtime (dedicated LOGIN + connection pool `HRPARTNER_ENGINE_URL`); link-capture + RETURNING (SELECT policy permits link-capture; E-17 LIVE test); Canonical JSON K-08/K-09 alignment (1.0↔1 and -0↔0 true; aligns with JSON.stringify and jsonb); isJsonValue reject vectors (K-11..K-20, 10 inputs); L-01..L-06 CBD INSERT WITH CHECK isolation tests; COALESCE engine policies; ALTER ROLE posture converge; status sync (DISCOVERY.md status changed) |
| **R10** | **P1-1 cycle detection (WeakSet add-before-descend/delete-after-unwind, K-15 throws TypeError); P1-2 membership/ownership lock (REVOKE ALL + pg_auth_members + pg_class + post-assert); P1-3 N2-1 scope = RA only, CBD grants deferred to N2-5; P1-4 L-01..L-06 corrected (L-02 deny NOT NULL, L-03 ALTER TRIGGER disable + dedicated test DB + non-superuser, L-05 mutable outcomeNote); P2-1 posture assert AFTER ALTER (fail-loud); P2-2 jsonb parity only after JSON-value validation** |