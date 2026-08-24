-- MP-3A: typed CandidateSubmission lifecycle + optimistic transition version.
CREATE TYPE "CandidateSubmissionStatus" AS ENUM (
  'NEW',
  'NEEDS_INFO',
  'SCREENING',
  'QUALIFIED',
  'REJECTED',
  'WITHDRAWN',
  'CONVERTED',
  'MERGED'
);

-- The MP-2 partial index stores text casts in its predicate. Rebuild it around
-- the type conversion so PostgreSQL never compares the new enum with text.
DROP INDEX "uq_candidate_active_slot_phone";

ALTER TABLE "candidate_submissions"
  ALTER COLUMN "status" DROP DEFAULT,
  ALTER COLUMN "status" TYPE "CandidateSubmissionStatus"
    USING ("status"::"CandidateSubmissionStatus"),
  ALTER COLUMN "status" SET DEFAULT 'NEW',
  ADD COLUMN "version" INTEGER NOT NULL DEFAULT 0;

CREATE UNIQUE INDEX "uq_candidate_active_slot_phone"
  ON "candidate_submissions"("slot_id", "normalized_phone")
  WHERE "status" NOT IN (
    'REJECTED'::"CandidateSubmissionStatus",
    'WITHDRAWN'::"CandidateSubmissionStatus"
  )
  AND "slot_id" IS NOT NULL
  AND "normalized_phone" IS NOT NULL;