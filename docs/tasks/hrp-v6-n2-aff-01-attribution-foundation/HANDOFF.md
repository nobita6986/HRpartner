# N2 AFF Attribution Foundation - Tier 1 Handoff

## 0. Control

| Field | Value |
|---|---|
| Task | hrp-v6-n2-aff-01-attribution-foundation |
| Spec version | 1.0 |
| Assurance lane | CRITICAL |
| Audit mode | LIGHT |
| Execution round | 1 |
| Baseline | b91a33f948aed224a88f3e8e7c9847006f33e97f |
| Status | READY_FOR_AUDIT |

## 1. Outcome Summary

- Delivered: `src/db/engine-client.ts`, `src/shared/utils/date-boundary.ts`, `schema.prisma` mapping for ReferralAttribution, migration file for triggers and policies.
- Not delivered: None
- Lane escalation: No

## 2. Execution Trace

- Checked baseline and environment credentials.
- Verified TASK.md.
- Wrote `engine-client.ts` with strict URL requirements.
- Wrote `date-boundary.ts` for timezone helpers.
- Added `ReferralAttribution` model to `schema.prisma` and generated offline migration script for Layer 1b and 1c triggers.
- Updated RLS policies according to DISCOVERY.md.
- Passed `npm run test:integration`.

## 3. Acceptance Evidence

| AC | Evidence | Result | Limitation |
|---|---|---|---|
| — | `verify-task.ps1` | `RESULT: PASS` | `None` |
| `E-01..E-17` | `npm run test:integration` | `RESULT: PASS` | `None` |

## 4. Changed Deliverables

- `src/db/engine-client.ts`
- `src/shared/utils/date-boundary.ts`
- `prisma/schema.prisma`
- `prisma/migrations/20260917000000_referral_attribution_foundation/migration.sql`
- `tests/db/referral-attribution-foundation.integration.test.ts`
- `vitest.integration-files.ts`

## 5. Deviations

| ID | Type | Description / evidence | Decision needed |
|---|---|---|---|
| — | — | None | No |

## 6. Evidence Index

| Evidence | Command / method | Exit / measured result | Artifact |
|---|---|---|---|
| `E-01..E-17` | `npx vitest run tests/db/referral-attribution-foundation.integration.test.ts` | `Exit 0 / 13 passed` | `inline` |

## 7. Execution Round History

| Round | Date | Author | Outcome |
|---|---|---|---|
| 1 | 2026-09-17 | Tier 1 | Completed implementation and passed tests. |

> Handoff status: READY_FOR_AUDIT
