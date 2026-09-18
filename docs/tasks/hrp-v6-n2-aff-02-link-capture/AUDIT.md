# AUDIT: hrp-v6-n2-aff-02-link-capture

## Meta
- **Audit Target HEAD:** `874256c442557b4e726b4641b23d5567ca802301`
- **Base:** `e798af80fd4111b5c41688abc1b9b9362b3b7727`
- **PR:** #16
- **Review Mode:** LIGHT
- **Date:** 2026-09-18

## Verdict
**PASS**

## Findings
*(No unresolved findings)*

## Checks Verified
- **Scope & Constraints:** 
  - Verified untouched `prisma/schema.prisma`, `prisma/migrations/**`, and `src/domains/talent/**`. 
  - Implementation is fully restricted to `app/api/public/referrals/**` and `src/domains/referrals/**` plus required tests.
- **Engine Security & Context:** 
  - `writeAttributionViaEngine` correctly binds `hrp.engine_context = 'link-capture'` dynamically within a transaction boundary.
  - Asserted no global leaks or `set_config(..., false)` violations were introduced.
  - Fail-closed engine URL handling (`getEnginePrisma()` wrapper throws 503 cleanly if the connection isn't configured).
- **Concurrency & Rate Limits:** 
  - `Idempotency-Key` and `pg_advisory_xact_lock` are effectively implemented to resolve concurrent insert collisions with `409 RACE_RESOLVED`.
  - Rate-limit implements the DUAL bucket logic securely (IP + canonicalized `affCode` HMAC digest), returning `429` as expected before any DB access.
- **Privacy & Logging:** 
  - Raw PII (`affCode`, client IP) is hashed out of scope before being included in the public actor derivation.
- **Tests & Pre-flight:** 
  - Test scopes (`npm run typecheck`, `npm run lint`, `npm run test:unit`) yield 0 errors. 
  - 8 new container-DB integration tests successfully verify the exact boundary logic.

## Evidence
- `verify-task.ps1` returns `PASS`.
- `verify-handoff.ps1` returns `PASS`.
- Diff verification passed seamlessly.
- CI pipeline quality runs verified as cleanly queued/completed.
