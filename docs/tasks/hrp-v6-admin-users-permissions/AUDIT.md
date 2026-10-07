# T3 Audit — `hrp-v6-admin-users-permissions`

## Original frozen implementation

- Audited SHA: `3a08b088940a7aeed235f382fad26295c6b5b5d9` (original PR #119 frozen head).
- Original verdict: correction required; PR must not merge until findings are resolved.
- P1 — Last-admin protection had a count-then-update race: transaction isolation was not SERIALIZABLE and no active-admin predicate/row lock was acquired.
- P2 — User mutation audit reason was optional at API/service boundaries, allowing audit rows without an operator reason.
- P2 — POST idempotency request fingerprint included name/phone/role but omitted vendorId and reason, so semantically different requests could share a fingerprint.

## Correction batch (Tier 1 response)

| Finding | Correction | Evidence planned |
|---|---|---|
| P1 | All user mutation routes use an RLS-bound PostgreSQL SERIALIZABLE transaction. Admin demotion/deactivation locks active ADMIN rows in stable id order with `SELECT ... FOR UPDATE` before counting. No automatic retry; Prisma `P2034` maps to explicit retryable `409 CONCURRENT_MODIFICATION`. | Service unit lock-order/transaction tests, route P2034 test, real two-connection PostgreSQL integration test in `tests/db/admin-user-last-admin-concurrency.integration.test.ts`, final CI Integration check. |
| P2 audit reason | Create/update/deactivate/reactivate require trimmed non-empty reason (maximum 500 chars) at API, service, and UI boundaries; reason is persisted to AuditLog. | Service + route + UI tests and final gates. |
| P2 idempotency | Request fingerprint includes the validated name, phone, role, nullable vendorId, and trimmed required reason. | Route idempotency test asserts the complete fingerprint. |

## PostgreSQL mapping and integration-test boundary

`prisma/schema.prisma` maps `User` to table `users`, `isActive` to `is_active`, and `role` to the PostgreSQL `SystemRole` enum. The lock query casts `role::text` to avoid coupling the SQL literal to enum type naming. No schema or migration changed.

The integration harness is `vitest.integration.config.ts` / `scripts/ci/integration-preflight.mjs`; the test is first in `vitest.integration-files.ts`. The first CI run showed that the fresh migrated container includes one seeded active ADMIN, invalidating the test's initial empty-set assumption before the concurrency assertions ran. The fixture now snapshots active ADMIN IDs using `DATABASE_URL_ADMIN_TEST`, temporarily deactivates them in the disposable CI DB, creates the two test admins, and restores prior active states in `afterAll` even when assertions fail. No production/non-test URL is used. The worktree has neither `DATABASE_URL_TEST` nor `DATABASE_URL_ADMIN_TEST`, so local execution is skipped; rerun CI Integration on the final head is mandatory.

## Delta audit

- Corrected frozen implementation SHA: `4d2a4d9b800390d5ba59f93e26fb9e963ffb541b`.
- Local evidence: full unit 320 files / 5,112 passed / 9 skipped before the final fixture-only edit; typecheck PASS and targeted ESLint PASS after it; targeted integration file self-skips locally because test DB URLs are absent; verify-encoding PASS and `git diff --check` PASS.
- PostgreSQL concurrency test is registered in the CI integration inventory. It is skipped locally because neither `DATABASE_URL_TEST` nor `DATABASE_URL_ADMIN_TEST` is configured; no non-test database was used.
- CI status: prior run `37591166920` failed only because the original fixture expected zero seeded active admins; that run was superseded. Rerun on the corrected final head is pending.
- T3 DELTA verdict: pending review of that exact SHA.
- Merge gate: do not merge PR #119 until T3 accepts the delta and all required CI checks are green on that SHA.
