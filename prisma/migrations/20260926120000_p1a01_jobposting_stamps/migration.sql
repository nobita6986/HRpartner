-- P1-A0.1: stamp flags for JobPosting (hrp-p1-a0-1-jobposting-authoring-stamps).
--
-- Adds two canonical boolean columns for the public marketplace stamp:
--   - is_hot     → "Hot" stamp on featured card + listing + detail
--   - is_urgent  → "Tuyển gấp" stamp on featured card + listing + detail
--
-- RULES (DEC-01 / DEC-04, locked by T0 directive 2026-09-26):
--   - ADD-only: NOT NULL DEFAULT false; existing rows keep value (false, not backfilled).
--   - No DROP / RENAME / ALTER COLUMN TYPE.
--   - No heuristic backfill from Project.isPublic, Project.urgency, salary range,
--     postedAt, hash, or any legacy derivation.
--   - Public surface renders exactly these two flags for status='PUBLISHED' rows;
--     DRAFT / ARCHIVED JobPosting never project to public (P1-A1 invariant).
--   - Editable via the canonical PATCH draft update path; no separate route.
--
-- Pattern parity with P1-A0 migration `20260924180000_p1a0_jobposting_content_fields`.

ALTER TABLE "job_postings"
  ADD COLUMN "is_hot" BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE "job_postings"
  ADD COLUMN "is_urgent" BOOLEAN NOT NULL DEFAULT false;
