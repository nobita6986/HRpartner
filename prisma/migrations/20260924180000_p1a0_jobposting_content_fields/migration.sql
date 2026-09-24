-- P1-A0: additive content fields for JobPosting (hrp-p1-a0-jobposting-authoring-publish).
--
-- Adds title (display), salaryDisplay (free-form), four rich-content JSON columns
-- (description/requirements/benefits/applicationInstructions) and contentSchemaVersion.
--
-- RULES (contract DEC-06 / OD-P1A-05):
--   - ADD-only: every column is NULLable; existing/draft rows keep their value.
--   - No DROP / RENAME / ALTER COLUMN TYPE.
--   - No backfill from Project.isPublic — Admin authors fresh content.
--   - contentSchemaVersion defaults to 1 for all existing rows so the validator
--     accepts legacy DRAFT rows until Admin edits them.
--   - Index on status helps the admin list filter; slug unique is unchanged.

ALTER TABLE "job_postings"
  ADD COLUMN "title" TEXT;

ALTER TABLE "job_postings"
  ADD COLUMN "salary_display" TEXT;

ALTER TABLE "job_postings"
  ADD COLUMN "description_json" JSONB;

ALTER TABLE "job_postings"
  ADD COLUMN "requirements_json" JSONB;

ALTER TABLE "job_postings"
  ADD COLUMN "benefits_json" JSONB;

ALTER TABLE "job_postings"
  ADD COLUMN "application_instructions_json" JSONB;

ALTER TABLE "job_postings"
  ADD COLUMN "content_schema_version" INTEGER NOT NULL DEFAULT 1;

-- Filter index for admin list (status filter is common).
CREATE INDEX IF NOT EXISTS "job_postings_status_idx" ON "job_postings" ("status");
