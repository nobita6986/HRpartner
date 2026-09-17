# AUDIT: hrp-v6-n2-aff-01-attribution-foundation

## Meta
- **Audit Target HEAD:** `9778cf0b51c6fa8311da622a340cde1f541c61b8`
- **Base:** `30a204743a2478e16e33adfe9da95d9f2fcd03dc`
- **PR:** #10
- **Review Mode:** LIGHT
- **Date:** 2026-09-17

## Verdict
**REVISION_REQUIRED**

## Findings

### 1. F-01: Redundant Engine Policy without COALESCE [P2]
- **File:** `prisma/migrations/20260917000000_referral_attribution_foundation/migration.sql`
- **Description:** There are two duplicate `INSERT` policies for `app_engine_writer`: `hrp_ra_insert` and `hrp_ra_insert_engine`. The first policy (`hrp_ra_insert`) uses `current_setting('hrp.engine_context', true)` without the `COALESCE` guard. This explicitly violates DISCOVERY rule R9 which mandates that all engine policies use `COALESCE(current_setting(...), '')` to fail-closed safely when the GUC is unset.
- **Remediation:** Remove the redundant `hrp_ra_insert` policy and ensure only `hrp_ra_insert_engine` (which correctly implements the `COALESCE` guard) remains.

### 2. F-02: Implementation HEAD Mismatch in Evidence [P3]
- **File:** `docs/tasks/hrp-v6-n2-aff-01-attribution-foundation/HANDOFF.md`
- **Description:** The `Implementation HEAD` recorded in `HANDOFF.md` is `89208e2698251d4f8dfd26a66ee1afe38fedf0c4`, but the actual HEAD presented for audit is `9778cf0b51c6fa8311da622a340cde1f541c61b8`. Evidence integrity requirement expects accurately labeled HEADs.
- **Remediation:** Update `HANDOFF.md` to record the exact implementation HEAD being handed off.

## Checks Verified
- **Migration Safety:** One additive migration. No DROP/ALTER TYPE. FK actions and CHECKs match requirements.
- **Trigger Invariants:** Layer 1, 1b, and 1c implemented correctly.
- **Role/Privilege:** `app_engine_writer` provisioned correctly with strict `NOINHERIT`, `NOSUPERUSER`, `NOREPLICATION`, `LOGIN`. No unexpected schema/object ownership.
- **Test Quality:** E-01..E-17 tests implemented. N2-1 has zero skipped tests. Static test E-11 explicitly guards against `set_config(..., false)`.
- **Date Boundary:** Valid implementation in `src/shared/utils/date-boundary.ts`, independent of local timezone, exact +7 days midnight mapping.

## Evidence
- **Terminal CI Run:** [35226532068](https://github.com/nobita6986/HRpartner/actions/runs/35226532068)
- **Quality Job ID:** `105219448267` (SUCCESS)
- **Integration Job ID:** `105219448521` (SUCCESS)
- **Integration Isolation:** Valid
