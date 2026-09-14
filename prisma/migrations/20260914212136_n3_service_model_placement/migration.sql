-- Migration: N3 — ServiceModel + Placement (DEC-01..DEC-14)
--
-- Scope:
--   1) ServiceModel enum (4 nghiệp vụ; NULL cho legacy).
--   2) PlacementStatus enum (SELECTED|CONFIRMED|EFFECTIVE|FAILED|CANCELLED).
--   3) job_openings.service_model: ADD COLUMN nullable (DEC-01).
--   4) placements: CREATE TABLE + FK chain + indexes.
--   5) placements_active_unique: unique partial index chống race (DEC-04a).
--      Dùng COALESCE(job_opening_id, '__NONE__') để enforce cả NULL rows.
--   6) project_assignments.placement_id: ADD COLUMN nullable FK (V6P-013;
--      populate thuộc N4). Tạo SAU placements để FK constraint resolve.
--   7) RLS policy theo pattern N1 placement_case (DEC-14):
--      hrp_session_role() IN ('ADMIN','HR_MANAGER','HR_STAFF') OR
--      row-level labor_profile_id predicate qua placement_case.
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
-- 3) placements table (DEC-03) — tạo TRƯỚC để FK references resolve được
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
-- 4) DEC-04a — unique partial index chống race
--    Chỉ 1 SELECTED hoặc CONFIRMED cho cùng (case, opening) tại một thời điểm.
--    job_opening_id nullable → dùng COALESCE để enforce cả NULL (legacy).
--    Khi placement chuyển FAILED/CANCELLED/EFFECTIVE, partial index giải phóng slot.
-- ═══════════════════════════════════════════════════════════════════════════
CREATE UNIQUE INDEX "placements_active_unique"
  ON "placements"("placement_case_id", COALESCE("job_opening_id", '__NONE__'))
  WHERE "status" IN ('SELECTED', 'CONFIRMED');

-- ═══════════════════════════════════════════════════════════════════════════
-- 5) project_assignments.placement_id (V6P-013) — nullable FK, không populate
--    Tạo SAU khi bảng placements đã tồn tại để FK constraint resolve.
-- ═══════════════════════════════════════════════════════════════════════════
ALTER TABLE "project_assignments" ADD COLUMN "placement_id" TEXT;

ALTER TABLE "project_assignments"
  ADD CONSTRAINT "project_assignments_placement_id_fkey"
  FOREIGN KEY ("placement_id") REFERENCES "placements"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

CREATE INDEX "project_assignments_placement_id_idx" ON "project_assignments"("placement_id");

-- ═══════════════════════════════════════════════════════════════════════════
-- 6) DEC-14 — RLS policy theo pattern N1 placement_case
--
-- RLS for placements: rows visible to app_user_writer/app_user if:
--   (a) role-based short-circuit: HR_MANAGER | HR_STAFF | ADMIN can see all rows,
--       AND
--   (b) row-level predicate: the placement's labor_profile_id matches
--       the labor_profile_id of the owning placement_case.
--
-- Predicate chain:
--   placement.placement_case_id → placement_case.labor_profile_id
--   → LaborProfile of the person this placement belongs to.
--   Admin/HR can short-circuit (see all); HR_STAFF sees only placements
--   belonging to cases whose LaborProfile they have access to.
--
-- Note: unlike placement_case which is purely role-based (any HR can see any case),
-- Placement adds the row-level labor_profile_id join because a placement is
-- always about a specific person's case — the N1 foundation invariant is that
-- each PlacementCase belongs to exactly one LaborProfile.
-- ═══════════════════════════════════════════════════════════════════════════
ALTER TABLE "placements" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "placements" FORCE ROW LEVEL SECURITY;

CREATE POLICY "hrp_placements_scope" ON "placements"
  AS PERMISSIVE FOR ALL
  TO app_user_writer, app_user
  USING (
    -- Role-based short-circuit: ADMIN / HR_MANAGER / HR_STAFF can see all placements.
    hrp_session_role() IN ('ADMIN', 'HR_MANAGER', 'HR_STAFF')
    OR
    -- Row-level predicate: placement's labor_profile_id must match the
    -- labor_profile_id of the owning placement_case.
    -- This enforces the N1 invariant that each case belongs to exactly one LaborProfile.
    -- A placement always belongs to a specific person through its case.
    EXISTS (
      SELECT 1 FROM "placement_case"
      WHERE "placement_case"."id" = "placements"."placement_case_id"
        AND "placement_case"."labor_profile_id" = "placements"."labor_profile_id"
    )
  )
  WITH CHECK (
    hrp_session_role() IN ('ADMIN', 'HR_MANAGER', 'HR_STAFF')
    OR
    EXISTS (
      SELECT 1 FROM "placement_case"
      WHERE "placement_case"."id" = "placements"."placement_case_id"
        AND "placement_case"."labor_profile_id" = "placements"."labor_profile_id"
    )
  );

-- ═══════════════════════════════════════════════════════════════════════════
-- 7) GRANT CRUD cho runtime write role
-- ═══════════════════════════════════════════════════════════════════════════
GRANT SELECT, INSERT, UPDATE, DELETE ON "placements" TO app_user_writer;
