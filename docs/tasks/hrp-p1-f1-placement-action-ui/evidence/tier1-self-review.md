# Tier 1 self-review — `hrp-p1-f1-placement-action-ui` (round 2)

This is a Tier 1 internal self-review only. It is NOT the authoritative
audit evidence; the Tier 3 AUDIT.md is the authoritative artifact.

## What this round changed

- C2-01 — single canonical `makeSubmission` helper in the DB integration test;
  every `CandidateSubmission` (incl. legacy slot=null) routes through it;
  tracked-id push is unconditional. The round-1 `F1-DB05` direct
  `admin.candidateSubmission.create` was deleted.
- C2-02 — `F1-DB09` now invokes the canonical F0 `POST /api/admin/placements`
  + `/actions/confirm` route handlers with real `x-idempotency-key` UUID
  v4. No direct `placement.create` / `placement.update` remains in the F1
  proof.
- C2-03 — `F1-DB10` now creates + confirms via canonical F0 routes and
  invokes the real `/actions/effective` route with valid evidence
  against an HRP-managed `CONFIRMED` placement. The canonical 400
  `PLACEMENT_VALIDATION_ERROR` comes from the real service, NOT from a
  manual throw inside the test.
- C2-04 — `EFFECTIVE_EVIDENCE_SCHEMA` is exported from
  `recruiter-workbench.placement-actions.states.ts`. The form imports the
  same value; the test deletes its duplicate Zod object and adds
  component-level invalid-timestamp + onSubmit-wiring assertions against
  the production form.
- C2-05 — TASK.md §0..§10 V2 contract structure restored. HANDOFF.md uses
  compact §0..§5. AUDIT.md kept empty for Tier 3. Controls are truthful
  `BLOCKED / NOT_ELIGIBLE`, `Correction batches used: 2`, explicit `BLK-01`.
- C2-06 — Range-aware `.ai-pipeline/scripts/verify-encoding-range.mjs` added
  (Node, fatal UTF-8 decoder + BOM + NUL + U+FFFD + CRLF + Latin-1
  mojibake streak checks). Run on `fabeda29..HEAD`: 22/22 PASS, 0 violations.

## Local verification (Tier 1 side, before handback)

| Gate | Result |
|---|---|
| Targeted F1 tests | PASS — 163 tests across 5 files |
| `npm run test:unit` | PASS — 196 files / 3228 tests + 9 skipped |
| typecheck | PASS — 0 errors |
| lint | PASS — 0 errors (warnings unchanged) |
| build | PASS |
| `git diff --check` | empty (LF only) |
| range-aware encoding scan `fabeda29..HEAD` | PASS — 22/22, 0 violations |
| verify-task | PASS (truthful BLOCKED warnings) |
| verify-handoff | PASS (truthful BLOCKED warnings) |
| forbidden-path audit | clean |

## Honest limitations

- Tier 1 did NOT execute `T0_CI_SYNTHETIC_DB_GATE`; that's T0's job.
- Tier 1 did NOT call Tier 3.
- The `db05` teardown previously failing was caused by the un-tracked
  direct `admin.candidateSubmission.create`; round 2 closes that hole.
