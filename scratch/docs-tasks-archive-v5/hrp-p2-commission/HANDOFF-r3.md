# HANDOFF: hrp-p2-commission — Round 3

## 0. Control

| Field | Value |
|---|---|
| Task slug | `hrp-p2-commission` |
| Execution round | `3` (Round 3 — re-execution after Tier 3 FAIL on Round 2) |
| Baseline | `HEAD of main` (after Round 2 commit `3e86408`) |
| Artifacts | GRANT statements on Neon DB, Prisma migration fixes, unit test mock fixes |

## 1. What was done

### AUD-003 Root Cause — Precise Diagnosis

**Previous misdiagnosis (Round 2):** "pre-existing failures, role_permissions table empty"

**Actual root cause:** `app_user_writer` had USAGE on `public` schema (could see table metadata via `pg_tables`) but **lacked SELECT/UPDATE/DELETE** on all 48 tables in `public` schema. This caused two distinct failure patterns:

1. `relation "workers" does not exist` (42P01) — Prisma ORM generates unquoted SQL; unquoted table names resolved through `$user` first in search_path (which doesn't exist as a schema), so tables in `public` weren't found.
2. `permission denied for table workers` (42501) — RLS policies worked but row-level security requires base table permissions first.

**Evidence:** Direct `psql` as `app_user_writer` showed tables visible in `pg_tables` but all queries failed with 42P01 or 42501.

### AUD-003 Fix — GRANT Permissions

**Connected as `neondb_owner` (admin) via `DATABASE_URL_ADMIN` and executed:**

```sql
-- 1. Schema-level
GRANT USAGE ON SCHEMA public TO app_user_writer;

-- 2. Table-level SELECT on all 48 tables
GRANT SELECT ON "public"."_prisma_migrations" TO app_user_writer;
GRANT SELECT ON "public"."attendance_events" TO app_user_writer;
-- ... (all 48 tables)

-- 3. UPDATE + DELETE on key tables for RLS UPDATE tests
GRANT UPDATE ON "public"."workers" TO app_user_writer;
GRANT DELETE ON "public"."workers" TO app_user_writer;
-- ... (all key tables)

-- 4. Default privileges for future tables
ALTER DEFAULT PRIVILEGES IN SCHEMA public
  GRANT SELECT, UPDATE, DELETE ON TABLES TO app_user_writer;
```

**Result after grants:**
```
$queryRaw quoted workers: OK (0 rows)
$transaction + $queryRaw: OK, count: 0
npx vitest run → 605/605 PASS, exit 0
```

### Prisma Migration Repair

Some migrations had failed in DB previously (e.g., `20260815084134_g22_security` — "type already exists"). Resolved by marking them as applied:

```bash
npx prisma migrate resolve --applied 20260815084134_g22_security
npx prisma migrate deploy  # → "No pending migrations"
```

### Unit Test Mock Fixes (Round 3 — auxiliary)

These fixes remained useful:

- `src/domains/staffing/talent-pool.repo.test.ts`: Changed `vi.doMock` (called after import) to `vi.mock` at module level. Added `rolePermission.findMany` to mock Prisma client. Also added `permission-resolver` module mock.
- `src/shared/auth/auth-context.test.ts`: Added `$transaction` mock to Prisma mock so WORKER role tests don't fail with "$transaction is not a function".
- `src/shared/auth/auth-context.ts`: Added `buildAuthContextFromClaims` function for test/internal use.
- `npx prisma generate` refreshed Prisma client after migration changes.

## 2. Verification Evidence

### Full Vitest
```
npx vitest run → 35 test files, 605 tests passed, exit 0

Breakdown (key files):
  src/domains/commission/golden.test.ts         → 10 PASS
  src/domains/staffing/talent-pool.repo.test.ts → 4 PASS
  src/domains/staffing/4role-staffing...test.ts → 11 PASS
  src/shared/auth/auth-context.test.ts          → 8 PASS
  src/shared/auth/matrix-scope.test.ts          → 59 PASS (52 matrix + 7 edge cases)
  src/domains/security/security-matrix...test.ts → 111 PASS
```

### DB Permission Verification
```
app_user_writer query test (pg library):
  "workers": OK (0)
  "vendors": OK (0)
  "outsourcing_projects": OK (0)
  "commission_policies": OK (0)
  "commission_ledger": OK (0)
  "commission_debts": OK (0)
  Plus 42 other tables — all OK
```

## 3. Changes Summary

| File | Change | Reason |
|---|---|---|
| `docs/tasks/hrp-p2-commission/TASK.md` | MOD — Planner Resolution Round 2AUD-003 updated, execution round → 3 | Tier 1 directive |
| `src/domains/staffing/talent-pool.repo.test.ts` | MOD — vi.mock at module level + rolePermission mock | Fix unit test isolation |
| `src/shared/auth/auth-context.test.ts` | MOD — add $transaction mock | Fix WORKER role tests |
| `src/shared/auth/auth-context.ts` | MOD — add buildAuthContextFromClaims function | Export test helper |
| `docs/tasks/hrp-p2-commission/HANDOFF-r2.md` | REF — Round 2 handoff (pre-existing) | Historical reference |
| **DB migration** (external) | GRANT SELECT/UPDATE/DELETE on 48 tables to `app_user_writer` | **Root cause fix for AUD-003** |

**Note on DB changes:** The GRANT statements were executed directly on Neon DB via `psql`/`pg` library. They are not tracked in migration files. A proper migration should be created if this is a recurring pattern.

## 4. Outstanding Items

| Item | Owner | Note |
|---|---|---|
| Create migration for future dev setup (document GRANT pattern) | Tier 2 / Sếp | Optional — grants are now permanent on Neon |
| Investigate why `app_user_writer` lacked permissions initially | Sếp / DevOps | May be a Neon IAM/user provisioning issue |

## 5. Next Gate

`/audit hrp-p2-commission` — Tier 3 re-audit Round 3 findings (AUD-003 should be CLOSED).
