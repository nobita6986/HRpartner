-- MP-3B: canonical CandidateSubmission -> Worker conversion link and accepted
-- source-claim invariant per converted submission.
ALTER TABLE "candidate_submissions"
  ADD COLUMN "worker_id" TEXT;

CREATE INDEX "candidate_submissions_worker_id_idx"
  ON "candidate_submissions"("worker_id");

ALTER TABLE "candidate_submissions"
  ADD CONSTRAINT "candidate_submissions_worker_id_fkey"
  FOREIGN KEY ("worker_id") REFERENCES "workers"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;

-- Existing one_accepted_source protects one accepted claim per worker. This
-- second backstop makes a converted submission point to at most one accepted
-- source even if future code creates additional non-accepted claims.
CREATE UNIQUE INDEX "one_accepted_source_per_submission"
  ON "source_claims"("submission_id")
  WHERE "accepted" = true AND "submission_id" IS NOT NULL;