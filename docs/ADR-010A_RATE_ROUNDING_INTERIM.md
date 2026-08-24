# ADR-010A — Interim rate rounding for statements

- Status: Accepted interim
- Date: 2026-08-24
- Owner: Planner under Founder waiver
- Revisit owner: Accounting + Planner before production statement locking

## Context

Statement generation rounded total hours to an integer before multiplying by a BigInt VND rate. This changed 7.5 hours into 8 hours and overpaid/overbilled.

## Decision

- Keep hours as Prisma Decimal through aggregation.
- Multiply the exact scaled decimal quantity by the BigInt VND rate in money.ts.
- Truncate only a remainder smaller than 1 VND after multiplication.
- Reject negative and scientific-notation quantities at the helper boundary.
- Apply the same helper to vendor and client statements.

## Consequences

7.5 hours at 50,000 VND/hour is 375,000 VND. Existing integer-hour statements retain the same totals. Accounting may replace TRUNCATE with another approved sub-VND policy later, but the rule must remain centralized and must never round hours before multiplication.