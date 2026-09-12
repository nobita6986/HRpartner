-- Migration: N1 PlacementCase Foundation
-- DEC-N1-01: enum OPEN | IN_PROGRESS | READY_TO_PLACE | CLOSED
-- DEC-N1-02: partial unique index for max 1 ACTIVE case per LaborProfile
-- DEC-N1-03: nullable FK CandidateSubmission.placementCaseId ON DELETE RESTRICT
-- DEC-N1-04: LaborProfile 1 -> N PlacementCase, FK REQUIRED
-- DEC-N1-05: closeReason TEXT nullable (catalog deferred)
--
-- ADD-only: CREATE TABLE, CREATE INDEX, CREATE UNIQUE INDEX (partial), ADD COLUMN, ADD CONSTRAINT FK.
-- No DROP / RENAME / ALTER COLUMN TYPE.
--
-- Migration preview (evidence/migration-preview.sql) is the source of truth for the base SQL;
-- this file overrides:
--   (a) Submission FK: ON DELETE RESTRICT (DEC-N1-03; preview default SET NULL is rejected)
--   (b) Partial unique index: not first-class in Prisma schema -> hand-written below

-- CreateEnum
CREATE TYPE "PlacementCaseStatus" AS ENUM ('OPEN', 'IN_PROGRESS', 'READY_TO_PLACE', 'CLOSED');

-- CreateTable placement_case
CREATE TABLE "placement_case" (
    "id" TEXT NOT NULL,
    "labor_profile_id" TEXT NOT NULL,
    "status" "PlacementCaseStatus" NOT NULL DEFAULT 'OPEN',
    "opened_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "closed_at" TIMESTAMP(3),
    "close_reason" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "placement_case_pkey" PRIMARY KEY ("id")
);

-- CreateIndex (non-unique btree; query patterns from N0 contract audit)
CREATE INDEX "placement_case_labor_profile_id_idx" ON "placement_case"("labor_profile_id");
CREATE INDEX "placement_case_status_opened_at_idx" ON "placement_case"("status", "opened_at");

-- CreateUniqueIndex PARTIAL (DEC-N1-02): max 1 ACTIVE case per LaborProfile
-- ACTIVE_STATUSES = ('OPEN', 'IN_PROGRESS', 'READY_TO_PLACE')
-- CLOSED is excluded (case đã đóng -> cho phép mở case mới cùng LaborProfile)
CREATE UNIQUE INDEX "placement_case_labor_profile_id_active_unique"
    ON "placement_case"("labor_profile_id")
    WHERE "status" IN ('OPEN', 'IN_PROGRESS', 'READY_TO_PLACE');

-- AlterTable candidate_submissions (ADD-only; nullable FK)
ALTER TABLE "candidate_submissions" ADD COLUMN "placement_case_id" TEXT;

-- AddForeignKey: PlacementCase -> LaborProfile (DEC-N1-04; FK REQUIRED, RESTRICT)
ALTER TABLE "placement_case"
    ADD CONSTRAINT "placement_case_labor_profile_id_fkey"
    FOREIGN KEY ("labor_profile_id") REFERENCES "labor_profiles"("id")
    ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey: CandidateSubmission -> PlacementCase (DEC-N1-03; nullable FK, RESTRICT)
-- Note: Prisma preview emits ON DELETE SET NULL — we override to RESTRICT.
-- Rationale (DEC-N1-03): case is business history; close by status, do not delete case to
-- preserve submission links. Legacy rows remain NULL; backfill in next task.
ALTER TABLE "candidate_submissions"
    ADD CONSTRAINT "candidate_submissions_placement_case_id_fkey"
    FOREIGN KEY ("placement_case_id") REFERENCES "placement_case"("id")
    ON DELETE RESTRICT ON UPDATE CASCADE;

-- Index for back-relation lookup
CREATE INDEX "candidate_submissions_placement_case_id_idx"
    ON "candidate_submissions"("placement_case_id");
