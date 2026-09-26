# AUDIT — `hrp-p1-f0-placement-command-api`

> **Status: NOT ELIGIBLE.** Round 2 (v1.2) is `BLOCKED`. Canonical integration
> `ENV_BLOCKED/PENDING` (DATABASE_URL_TEST + DATABASE_URL_ADMIN_TEST not
> provisioned in sandbox). Tier 3 MUST NOT audit.

This file is the AUDIT scaffold only — it carries the audit-eligibility
contract and the placeholder for the audit body. The actual Tier 3 audit
body is intentionally NOT generated. When canonical integration PASSes
and T0 re-evaluates the round to `Frozen delivery: YES`, the Tier 3
auditor will populate this file.

## Audit eligibility

| Field | Value |
|---|---|
| Spec version | `v1.2` |
| Status | `BLOCKED` |
| Frozen delivery | `NO` (pending canonical integration) |
| Canonical integration | `ENV_BLOCKED/PENDING` |
| Audit eligibility | `NOT_ELIGIBLE` |
| Audit mode (per TASK) | `LIGHT` |
| Assurance lane | `CRITICAL` |
| Tier 3 called | `NO` (explicitly prohibited until canonical integration PASS) |

## Audit body (placeholder)

The audit body is NOT generated for this round because the round is
pre-freeze. Once T0 provisions synthetic DB and the round re-evaluates:

1. Run `npm run test:integration -- tests/db/p1f0-placement-command-api.integration.test.ts`
   with both URLs set.
2. Confirm canonical integration PASS.
3. Re-evaluate `Status`, `Frozen delivery`, `Audit eligibility`.
4. Set `Frozen delivery: YES` and `Canonical gates: PASS`.
5. Tier 3 auditor runs C-01..C-09 audit checklist; populates this file.

## Cross-references

- TASK: `docs/tasks/hrp-p1-f0-placement-command-api/TASK.md` (v1.2)
- HANDOFF: `docs/tasks/hrp-p1-f0-placement-command-api/HANDOFF.md`
- Evidence registry: `docs/tasks/hrp-p1-f0-placement-command-api/evidence/`
- C-01..C-06 evidence: `docs/tasks/hrp-p1-f0-placement-command-api/evidence/corrections/`
- Gate evidence: `docs/tasks/hrp-p1-f0-placement-command-api/evidence/gates/`

Round: 2 (v1.2)
