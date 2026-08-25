-- MP-3C (RQ-01 / DEC-02): assignment placement links.
--
-- Additive and backfill-safe. Both columns stay NULL for every existing row —
-- legacy and transfer-created assignments are NOT guessed into a slot/submission
-- (RISK-04). Only a Marketplace placement that starts from a CONVERTED
-- CandidateSubmission fills them.
--
-- Backstops created here:
--   * unique(submission_id)  -> at most ONE initial assignment per submission
--                               (RQ-04 `ASSIGNMENT_EXISTS`; the DB half of the
--                               idempotency guarantee in DEC-08).
--   * FK submission_id       -> the source submission must exist.
--   * FK staffing_order_slot_id + index(slot, status)
--                            -> slots_filled is a projection of ACTIVE
--                               assignments carrying that slot link (DEC-06),
--                               and AC-10 can reconcile counter vs row count.
--
-- The pre-existing partial unique index `one_active_assignment(worker_id)
-- WHERE status='ACTIVE'` (migration 20260815084134_g22_security) is left
-- untouched and remains the 1-ACTIVE DB backstop.
--
-- ROLLBACK (reviewed, pre-deploy only — never run against a database that
-- already stores Marketplace placements, it drops the links):
--   ALTER TABLE "project_assignments"
--     DROP CONSTRAINT IF EXISTS "project_assignments_staffing_order_slot_id_fkey",
--     DROP CONSTRAINT IF EXISTS "project_assignments_submission_id_fkey";
--   DROP INDEX IF EXISTS "project_assignments_staffing_order_slot_id_status_idx";
--   DROP INDEX IF EXISTS "project_assignments_submission_id_key";
--   ALTER TABLE "project_assignments"
--     DROP COLUMN IF EXISTS "staffing_order_slot_id",
--     DROP COLUMN IF EXISTS "submission_id";

ALTER TABLE "project_assignments"
  ADD COLUMN "submission_id" TEXT,
  ADD COLUMN "staffing_order_slot_id" TEXT;

CREATE UNIQUE INDEX "project_assignments_submission_id_key"
  ON "project_assignments"("submission_id");

CREATE INDEX "project_assignments_staffing_order_slot_id_status_idx"
  ON "project_assignments"("staffing_order_slot_id", "status");

ALTER TABLE "project_assignments"
  ADD CONSTRAINT "project_assignments_submission_id_fkey"
  FOREIGN KEY ("submission_id") REFERENCES "candidate_submissions"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "project_assignments"
  ADD CONSTRAINT "project_assignments_staffing_order_slot_id_fkey"
  FOREIGN KEY ("staffing_order_slot_id") REFERENCES "staffing_order_slots"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;
