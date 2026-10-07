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

The integration harness is `vitest.integration.config.ts` / `scripts/ci/integration-preflight.mjs`; the new test is first in `vitest.integration-files.ts` and requires the fresh migrated CI container to start with zero active ADMIN rows. This worktree has neither `DATABASE_URL_TEST` nor `DATABASE_URL_ADMIN_TEST`, so the targeted local invocation is explicitly skipped; PR CI Integration must execute it before merge. Do not substitute development or production database URLs.

## Delta audit

- Corrected frozen implementation SHA: `54e8b22eedcec5d478ad05f420848cf089970668`.
- Local evidence after the final source edit: full unit 320 files / 5,112 passed / 9 skipped; typecheck PASS; changed-file ESLint 0 errors (17 warnings); build PASS; verify-encoding PASS (11 changed text files); `git diff --check` PASS.
- PostgreSQL concurrency test is registered in the CI integration inventory. It is skipped locally because neither `DATABASE_URL_TEST` nor `DATABASE_URL_ADMIN_TEST` is configured; no non-test database was used.
- CI status: pending on the corrected PR head.
- T3 DELTA verdict: pending review of that exact SHA.
- Merge gate: do not merge PR #119 until T3 accepts the delta and all required CI checks are green on that SHA.
