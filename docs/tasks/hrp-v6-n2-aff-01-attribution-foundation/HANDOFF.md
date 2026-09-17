# N2 AFF Attribution Foundation - Tier 1 Handoff

## 0. Control

| Field | Value |
|---|---|
| Task | hrp-v6-n2-aff-01-attribution-foundation |
| Spec version | v1.4 |
| Assurance lane | CRITICAL |
| Audit mode | LIGHT |
| Execution round | 2 |
| Baseline | 30a204743a2478e16e33adfe9da95d9f2fcd03dc |
| Status | READY_FOR_AUDIT |

## 1. Outcome Summary

- Delivered: `src/db/engine-client.ts`, `src/shared/utils/date-boundary.ts`, `schema.prisma` mapping for ReferralAttribution, migration file for triggers and policies. Static and unit tests created.
- Not delivered: None
- Lane escalation: No
- **Implementation HEAD**: 89208e2698251d4f8dfd26a66ee1afe38fedf0c4
- **N2-1 result**: 15 passed, 0 skipped
- **Total integration result**: 20 files, 402 passed, 2 skipped
- **ENV_BLOCKED**: 0
- **Test Environment & Recoveries**: `npx prisma migrate reset --force` was run as a dedicated-test-DB-only recovery action to resolve state corruption from an older migration. hrp-live and production were not touched. No `_prisma_migrations` rows were edited manually. The conflicting migration `20260917170735_n2_aff_01_attribution_foundation` was removed before final verification and exactly one N2-1 migration remains.

## 2. Execution Trace

- STEP-01: Added `ReferralAttribution` model to `prisma/schema.prisma` matching the exact contract.
- STEP-02: Generated migration in `prisma/migrations/` and implemented exact schema/trigger/constraint/RLS SQL logic.
- STEP-03: Created `src/db/engine-client.ts` with strict URL requirements and fail-closed behavior.
- STEP-04: Created `src/shared/utils/date-boundary.ts` for timezone helpers.
- STEP-05: Provisioned `app_engine_writer` role and applied `referral_attributions` policies.
- STEP-06: Wrote tests to satisfy E-01..E-17 requirements in `tests/db/referral-attribution-foundation.integration.test.ts`.
- STEP-07: Registered integration test in `vitest.integration-files.ts`.

## 3. Acceptance Evidence

| AC | Evidence | Result | Limitation |
|---|---|---|---|
| — | `verify-task.ps1` | `RESULT: PASS` | `None` |
| `AC-01` | `npx prisma validate` | `RESULT: PASS` | `None` |
| `AC-02` | `npm run test:integration` | `RESULT: PASS` | `None` |
| `AC-03` | `npm run test:integration` | `RESULT: PASS` | `None` |
| `AC-04` | `npm run test:integration` | `RESULT: PASS` | `None` |
| `AC-05` | `npm run test:integration` | `RESULT: PASS` | `None` |
| `AC-06` | `npm run test:integration` | `RESULT: PASS` | `None` |
| `AC-07` | `npm run test:unit` | `RESULT: PASS` | `None` |
| `AC-08` | `npm run test:integration` | `RESULT: PASS` | `None` |
| `AC-09` | `npm run test:integration` | `RESULT: PASS` | `None` |
| `AC-10` | `npm run test:integration` | `RESULT: PASS` | `None` |
| `AC-11` | `npm run test:integration` | `RESULT: PASS` | `None` |
| `AC-12` | `npm run test:integration` | `RESULT: PASS` | `None` |
| `AC-13` | `npm run test:integration` | `RESULT: PASS` | `None` |
| `AC-14` | `npm run test:integration` | `RESULT: PASS` | `None` |
| `AC-15` | `git diff --check` | `RESULT: PASS` | `None` |
| `AC-16` | `npm run test:unit` | `RESULT: PASS` | `None` |
| `AC-17` | `git diff --check` | `RESULT: PASS` | `None` |
| `AC-18` | `npm run typecheck; npm run lint; npm run test:unit; npm run build` | `RESULT: PASS` | `None` |
| `AC-19` | `git diff --check` | `RESULT: PASS` | `None` |

## 4. Changed Deliverables

- `docs/tasks/hrp-v6-n2-aff-01-attribution-foundation/HANDOFF.md`
- `docs/tasks/hrp-v6-n2-aff-01-attribution-foundation/TASK.md`
- `prisma/migrations/20260917000000_referral_attribution_foundation/migration.sql`
- `prisma/referral-attribution-migration.static.test.ts`
- `src/db/engine-client.test.ts`
- `src/db/engine-client.ts`
- `src/db/engine-set-config.static.test.ts`
- `src/shared/utils/date-boundary.test.ts`
- `src/shared/utils/date-boundary.ts`
- `tests/db/referral-attribution-foundation.integration.test.ts`
- `vitest.integration-files.ts`

## 5. Deviations

| ID | Type | Description / evidence | Decision needed |
|---|---|---|---|
| — | — | None | No |

## 6. Evidence Index

| Evidence | Command / method | Exit / measured result | Artifact |
|---|---|---|---|
| `AC-01` | `npx prisma validate` | `Exit 0 / passed` | `inline` |
| `AC-07` | `npm run test:unit` | `Exit 0 / passed` | `inline` |
| `AC-16` | `npm run test:unit` | `Exit 0 / passed` | `inline` |
| `AC-18` | `npm run typecheck; npm run lint; npm run test:unit; npm run build` | `Exit 0 / passed` | `inline` |
| `AC-15` | `git diff --check` | `Exit 0 / passed` | `inline` |
| `AC-17` | `git diff --check` | `Exit 0 / passed` | `inline` |
| `AC-19` | `git diff --check` | `Exit 0 / passed` | `inline` |
| `AC-02..AC-14` | `CI_INTEGRATION_STRICT=1 npm run test:integration` | `Exit 0 / passed` | `inline` |

## 7. Execution Round History

| Round | Date | Author | Outcome |
|---|---|---|---|
| 1 | 2026-09-17 | Tier 1 | Completed implementation. REVISION_REQUIRED by T0. |
| 2 | 2026-09-17 | Tier 1 | Revised RLS policies, dates, static tests, and test isolations. |

> Handoff status: READY_FOR_AUDIT
