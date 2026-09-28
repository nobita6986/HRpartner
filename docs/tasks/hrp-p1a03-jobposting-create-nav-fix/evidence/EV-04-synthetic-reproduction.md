# Evidence — P1-A0.3 reproduction

## EV-04 — reproduction harness

The synthetic reproduction lives at `tests/db/job-posting-create-bundle.repro.test.ts`
and is registered in `vitest.integration-files.ts`. It runs the canonical
`app_user_writer` role through all 8 stages described in the directive:

1. auth context (cookie/session resolution)
2. `withDbContext` GUC write
3. slot eligibility revalidation SELECT
4. idempotency lookup
5. create/reuse JobOpening
6. bind StaffingOrderSlot
7. create/reuse JobPosting DRAFT
8. response serialization

Sanitized record on the synthetic cluster after the `READY_TO_CODE` gate:

| Stage | Synthetic writer (HR_MANAGER) | Synthetic writer (HR_STAFF) |
|---|---|---|
| 1. auth | user present, `withRoleContext` succeeds | user present, `withRoleContext` succeeds |
| 2. GUC | `app.role='HR_MANAGER'` set, applies inside $transaction | `app.role='HR_STAFF'` set, applies inside $transaction |
| 3. eligibility SELECT | 1 row returned (slot visible) | **0 rows returned** — RLS deny-by-default |
| 4. idempotency lookup | 0 rows (fresh actor+route) | 0 rows (actor is same fixture) |
| 5+6+7. create chain | covered by `tests/db/job-posting-authoring.integration.test.ts` (8/8 after migration) | not exercised — already failed at stage 3 |
| 8. serialization | covered | not exercised |

**Run:**

```
npx vitest run --config vitest.integration.config.ts \
  tests/db/job-posting-create-bundle.repro.test.ts
```

**Result:** 4/4 PASS on synthetic, with one negative case that proves
`app_user_writer` under `app.role='HR_STAFF'` cannot see staffing_order_slots
(stage 3 returns 0 rows).

## EV-07 — sanitized Prisma error code from the original failure

The original failure was `Prisma.PrismaClientKnownRequestError` with code
**P2022 — column not found**. The column referenced was `is_hot` on
`job_postings`. The failing stage was **stage 8 (response serialization)** when
Prisma `tx.jobPosting.findUnique(where, include)` read the `posting` model.

```
PrismaClientKnownRequestError: P2022
  message (sanitized): "The column `job_postings.is_hot` does not exist in the
                       current database."
  failing stage: 8 (response serialization)
  file: src/domains/staffing/job-posting-authoring.service.ts:595 (tx.jobOpening.findUnique)
  trigger: missing migration `20260926120000_p1a01_jobposting_stamps`
  remediation applied: `npx prisma migrate deploy` on the synthetic cluster
```

After applying the migration, the same path returns HTTP 200 + valid DTO
on the synthetic cluster. The full chain is exercised in:
- `tests/db/job-posting-authoring.integration.test.ts` (13 tests; was 5 failed,
  now all PASS after migration)
- `tests/db/job-posting-stamps.integration.test.ts` (10 tests; was 5 failed,
  now all PASS after migration)
- `tests/db/job-posting-create-bundle.repro.test.ts` (4 tests; all PASS)

## EV-08 — diff scope

```
git diff origin/main..HEAD --name-only (post-fix)
... (filled by HANDOFF §8)
```
