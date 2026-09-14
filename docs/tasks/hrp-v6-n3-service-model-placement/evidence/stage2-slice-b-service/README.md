# Stage 2 — Slice B (Service Layer + Resolution + Errors)

**Status**: PASS — gate Slice B đạt.

## Steps B-01..B-07

| File | Description |
|---|---|
| `src/domains/talent/placement.errors.ts` | 4 domain errors: `PlacementValidationError`, `InvalidStateTransitionError`, `PlacementNotFoundError`, `PlacementIdempotencyConflictError`. Mỗi error có `code` field cho caller. |
| `src/domains/talent/placement.resolution.ts` | `assertClassifiedJobOpening` (DEC-10) + `resolveClientCompanyIdForJobOpening` (DEC-06). |
| `src/domains/talent/placement.resolution.test.ts` | 10 unit tests PASS (assert + 2 FK chain rejects + happy + 5 broken chain rejects). |
| `src/domains/talent/placement.service.ts` | 5 authority commands: `createPlacement` (P2002 path qua SAVEPOINT), `confirmPlacement`, `markPlacementEffective` (HRP reject + CLIENT evidence), `failPlacement`, `cancelPlacement`. Tất cả transitions dùng conditional UPDATE `WHERE id = ? AND status = ?`. |
| `src/domains/talent/placement.service.test.ts` | 14 unit tests PASS (mock Prisma tx). |

## Gate Slice B

| Gate | Command | Result |
|---|---|---|
| Unit — resolution | `npx vitest run --config vitest.unit.config.ts src/domains/talent/placement.resolution.test.ts` | 10/10 PASS |
| Unit — service | `npx vitest run --config vitest.unit.config.ts src/domains/talent/placement.service.test.ts` | 14/14 PASS |
| Unit — Talent lane | `npx vitest run --config vitest.unit.config.ts src/domains/talent/` | 9 files / 103 tests PASS (47 N3 + 56 pre-existing) |
| Typecheck | `npx tsc --noEmit` | 0 new errors |

## DEC mapping

- DEC-06 ✅ FK chain resolve bắt buộc; chain broken → REJECT.
- DEC-07 ✅ HRP-managed markPlacementEffective REJECT (unit test PASS).
- DEC-08 ✅ Client-managed EFFECTIVE yêu cầu evidence (unit test PASS).
- DEC-09 ✅ Idempotency: SELECTED qua (laborProfileId, placementCaseId, jobOpeningId); các command khác qua placementId + conditional UPDATE.
- DEC-12 ✅ Conditional UPDATE `WHERE id = ? AND status = ?` (database-level invariant) — KHÔNG read-modify-write trong app.

## Idempotency strategy chi tiết

| Command | Idempotency mechanism |
|---|---|
| `createPlacement` | `findActivePlacement` SELECT trước INSERT → replay nếu đã có. INSERT dùng SAVEPOINT/ROLLBACK TO để catch P2002 (DEC-04a) mà không phá transaction state. Sau P2002 → SELECT lại existing → replay. |
| `confirmPlacement`, `markPlacementEffective`, `failPlacement`, `cancelPlacement` | `findPlacementForTransition` SELECT đầu (same state → no-op return). Sau đó `updateMany WHERE id = ? AND status = <current>` — nếu count = 0 (race) → SELECT lại + idempotent return. |
