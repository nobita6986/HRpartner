# Stage 1 — Slice A (Schema + Migration + Pure Lifecycle)

**Status**: PASS — gate Slice A đạt.

## Step A-01..A-04: schema changes

| File | Change |
|---|---|
| `prisma/schema.prisma` | + `enum ServiceModel` (4 giá trị); + `enum PlacementStatus` (5 giá trị); + `JobOpening.serviceModel` nullable; + `Placement` model + 7 back-relations (PlacementCase, LaborProfile, JobOpening, ClientCompany, Project, CandidateSubmission, ProjectAssignment); + `ProjectAssignment.placementId` nullable FK; + index `job_openings_service_model_idx` |

## Step A-05: migration (ADD-only)

Path: `prisma/migrations/20260914212136_n3_service_model_placement/migration.sql`

Nội dung (tóm tắt):
- CREATE TYPE `ServiceModel` (4 giá trị nghiệp vụ).
- CREATE TYPE `PlacementStatus` (5 giá trị).
- ALTER TABLE `job_openings` ADD COLUMN `service_model`.
- ALTER TABLE `project_assignments` ADD COLUMN `placement_id` + FK to `placements(id)`.
- CREATE TABLE `placements` (15 columns) + 6 FK (RESTRICT cho placement_case/labor_profile, SET NULL cho các FK nullable).
- CREATE 7 indexes cho query patterns.
- **CREATE UNIQUE INDEX `placements_active_unique`** trên `(placement_case_id, COALESCE(job_opening_id, '__NONE__'))` WHERE `status IN ('SELECTED','CONFIRMED')` — DEC-04a chống race ở DB.
- **ALTER TABLE `placements` ENABLE + FORCE ROW LEVEL SECURITY** + **CREATE POLICY `hrp_placements_scope`** (`hrp_session_role() IN ('ADMIN','HR_MANAGER','HR_STAFF')`, `TO app_user_writer, app_user`).
- **GRANT SELECT/INSERT/UPDATE/DELETE ON `placements` TO `app_user_writer`** — DEC-14.

## Step A-06..A-07: pure lifecycle + tests

| File | Description |
|---|---|
| `src/domains/talent/placement.lifecycle.ts` | Pure state machine: `computeManagementMode`, `canTransition`, `isActivePlacement`, `isTerminalPlacement`, `allowedTransitions` |
| `src/domains/talent/placement.lifecycle.test.ts` | 23 unit tests PASS (5 managementMode + 5 happy + 5 sad + 2 isActive/isTerminal + 5 allowedTransitions + 1 SELECTED→EFFECTIVE HRP guard) |

## Gate Slice A

| Gate | Command | Result |
|---|---|---|
| `prisma validate` | `npx prisma validate` | PASS |
| `prisma generate` | `npx prisma generate` | PASS |
| Pure unit test | `npx vitest run --config vitest.unit.config.ts src/domains/talent/placement.lifecycle.test.ts` | 23/23 PASS |
| Typecheck | `npx tsc --noEmit` | 0 new errors (2 errors pre-existing baseline) |

## DEC mapping

- DEC-01 ✅ ServiceModel enum 4 giá trị, nullable column.
- DEC-02 ✅ computeManagementMode pure.
- DEC-03 ✅ Placement model FK chain + snapshot nullable.
- DEC-04 ✅ PlacementCase → N Placement (một LaborProfile per case).
- DEC-04a ✅ Unique partial index trên `(placement_case_id, COALESCE(job_opening_id,'__NONE__')) WHERE status IN ('SELECTED','CONFIRMED')`.
- DEC-05 ✅ Lifecycle state machine trong pure module.
- DEC-10 ✅ serviceModelSnapshot chỉ set khi JobOpening.serviceModel ≠ NULL.
- DEC-11 ✅ ProjectAssignment.placementId nullable column added.
- DEC-14 ✅ RLS/GRANT trong cùng migration (không để cuối).
