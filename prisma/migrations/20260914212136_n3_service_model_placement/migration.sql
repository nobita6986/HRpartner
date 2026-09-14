-- Migration: N3 — ServiceModel + Placement (DEC-01..DEC-14)
--
-- Scope:
--   1) ServiceModel enum (4 nghiệp vụ; NULL cho legacy).
--   2) PlacementStatus enum (SELECTED|CONFIRMED|EFFECTIVE|FAILED|CANCELLED).
--   3) job_openings.service_model: ADD COLUMN nullable (DEC-01).
--   4) project_assignments.placement_id: ADD COLUMN nullable FK (V6P-013; populate thuộc N4).
--   5) placements: CREATE TABLE + FK chain + indexes.
--   6) placements_active_unique: unique partial index chống race (DEC-04a).
--      Dùng COALESCE(job_opening_id, '__NONE__') để enforce cả NULL rows.
--   7) RLS policy theo pattern N1 placement_case (DEC-14):
--      hrp_session_role() IN ('ADMIN','HR_MANAGER','HR_STAFF'),
--      TO app_user_writer, app_user; FORCE ROW LEVEL SECURITY.
--   8) GRANT CRUD trên placements cho app_user_writer.
--
-- ADD-only: không DROP/RENAME/ALTER data hiện có.
-- Pattern: ref N1 migration `20260912140411_n1_placement_case_foundation`
-- + RLS pattern `20260912140412_n1_placement_case_rls`.

-- ═══════════════════════════════════════════════════════════════════════════
-- 1) ENUMS
-- ═══════════════════════════════════════════════════════════════════════════
CREATE TYPE "ServiceModel" AS ENUM (
  'STAFFING_SUPPLY',
  'LABOR_LEASING',
  'RECRUITMENT_SERVICE',
  'REFERRAL_SERVICE'
);

CREATE TYPE "PlacementStatus" AS ENUM (
  'SELECTED',
  'CONFIRMED',
  'EFFECTIVE',
  'FAILED',
  'CANCELLED'
);

-- ═══════════════════════════════════════════════════════════════════════════
-- 2) job_openings.service_model (DEC-01) — nullable, không sentinel
-- ═══════════════════════════════════════════════════════════════════════════
ALTER TABLE "job_openings" ADD COLUMN "service_model" "ServiceModel";

-- Index cho query theo taxonomy
CREATE INDEX "job_openings_service_model_idx" ON "job_openings"("service_model");

-- ═══════════════════════════════════════════════════════════════════════════
-- 3) project_assignments.placement_id (V6P-013) — nullable FK, không populate
-- ═══════════════════════════════════════════════════════════════════════════
ALTER TABLE "project_assignments" ADD COLUMN "placement_id" TEXT;

ALTER TABLE "project_assignments"
  ADD CONSTRAINT "project_assignments_placement_id_fkey"
  FOREIGN KEY ("placement_id") REFERENCES "placements"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

CREATE INDEX "project_assignments_placement_id_idx" ON "project_assignments"("placement_id");

-- ═══════════════════════════════════════════════════════════════════════════
-- 4) placements table (DEC-03)
-- ═══════════════════════════════════════════════════════════════════════════
CREATE TABLE "placements" (
  "id" TEXT NOT NULL,
  "placement_case_id" TEXT NOT NULL,
  "labor_profile_id" TEXT NOT NULL,
  "job_opening_id" TEXT,
  "client_company_id" TEXT,
  "project_id" TEXT,
  "service_model_snapshot" "ServiceModel",
  "status" "PlacementStatus" NOT NULL DEFAULT 'SELECTED',
  "selected_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "confirmed_at" TIMESTAMP(3),
  "effective_at" TIMESTAMP(3),
  "failure_reason" TEXT,
  "source_candidate_submission_id" TEXT,
  "created_by_user_id" TEXT,
  "version" INTEGER NOT NULL DEFAULT 1,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "placements_pkey" PRIMARY KEY ("id")
);

-- FKs (ON DELETE RESTRICT cho case/labor profile — giữ lịch sử)
ALTER TABLE "placements"
  ADD CONSTRAINT "placements_placement_case_id_fkey"
  FOREIGN KEY ("placement_case_id") REFERENCES "placement_case"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "placements"
  ADD CONSTRAINT "placements_labor_profile_id_fkey"
  FOREIGN KEY ("labor_profile_id") REFERENCES "labor_profiles"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;

-- FKs nullable: SET NULL khi target bị xóa (placement lịch sử vẫn còn)
ALTER TABLE "placements"
  ADD CONSTRAINT "placements_job_opening_id_fkey"
  FOREIGN KEY ("job_opening_id") REFERENCES "job_openings"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "placements"
  ADD CONSTRAINT "placements_client_company_id_fkey"
  FOREIGN KEY ("client_company_id") REFERENCES "client_companies"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "placements"
  ADD CONSTRAINT "placements_project_id_fkey"
  FOREIGN KEY ("project_id") REFERENCES "outsourcing_projects"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "placements"
  ADD CONSTRAINT "placements_source_candidate_submission_id_fkey"
  FOREIGN KEY ("source_candidate_submission_id") REFERENCES "candidate_submissions"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

-- Indexes (query patterns từ DEC-12 + service layer)
CREATE INDEX "placements_placement_case_id_idx" ON "placements"("placement_case_id");
CREATE INDEX "placements_labor_profile_id_idx" ON "placements"("labor_profile_id");
CREATE INDEX "placements_job_opening_id_idx" ON "placements"("job_opening_id");
CREATE INDEX "placements_client_company_id_idx" ON "placements"("client_company_id");
CREATE INDEX "placements_project_id_idx" ON "placements"("project_id");
CREATE INDEX "placements_status_selected_at_idx" ON "placements"("status", "selected_at");
CREATE INDEX "placements_source_candidate_submission_id_idx" ON "placements"("source_candidate_submission_id");

-- ═══════════════════════════════════════════════════════════════════════════
-- 5) DEC-04a — unique partial index chống race
--    Chỉ 1 SELECTED hoặc CONFIRMED cho cùng (case, opening) tại một thời điểm.
--    job_opening_id nullable → dùng COALESCE để enforce cả NULL (legacy).
--    Khi placement chuyển FAILED/CANCELLED/EFFECTIVE, partial index giải phóng slot.
-- ═══════════════════════════════════════════════════════════════════════════
CREATE UNIQUE INDEX "placements_active_unique"
  ON "placements"("placement_case_id", COALESCE("job_opening_id", '__NONE__'))
  WHERE "status" IN ('SELECTED', 'CONFIRMED');

-- ═══════════════════════════════════════════════════════════════════════════
-- 6) DEC-14 — RLS policy theo pattern N1 placement_case
--    Runtime roles: app_user_writer (write), app_user (read).
--    Predicate: hrp_session_role() IN ('ADMIN','HR_MANAGER','HR_STAFF').
--    FORCE RLS — kể cả owner của table cũng phải qua policy.
-- ═══════════════════════════════════════════════════════════════════════════
ALTER TABLE "placements" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "placements" FORCE ROW LEVEL SECURITY;

CREATE POLICY "hrp_placements_scope" ON "placements"
  AS PERMISSIVE FOR ALL
  TO app_user_writer, app_user
  USING (
    hrp_session_role() IN ('ADMIN', 'HR_MANAGER', 'HR_STAFF')
  )
  WITH CHECK (
    hrp_session_role() IN ('ADMIN', 'HR_MANAGER', 'HR_STAFF')
  );

-- ═══════════════════════════════════════════════════════════════════════════
-- 7) GRANT CRUD cho runtime write role
-- ═══════════════════════════════════════════════════════════════════════════
GRANT SELECT, INSERT, UPDATE, DELETE ON "placements" TO app_user_writer;
