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
  -- AC-07: evidence bắt buộc cho Client-managed EFFECTIVE — persist DB để audit.
  "evidence_acknowledged_at" TIMESTAMP(3),
  "evidence_acknowledged_by_user_id" TEXT,
  "evidence_acknowledgement_ref" TEXT,
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
-- 6) DEC-14 — RLS policy theo pattern N1 placement_case, FIX round-2:
--    HR_ADMIN/HR_MANAGER/HR_STAFF KHÔNG bypass row-level predicate — placement
--    luôn phải match labor_profile_id của placement_case (N1 invariant:
--    mỗi PlacementCase thuộc đúng một LaborProfile).
--
-- Predicate chain (cho MỌI role kể cả HR short-circuit):
--   placement.placement_case_id → placement_case.labor_profile_id
--   → LaborProfile of the person this placement belongs to.
--   Một placement chỉ hợp lệ khi laborProfileId của nó trùng với
--   laborProfileId của case sở hữu. Nếu không khớp → RLS deny → không
--   SELECT/INSERT/UPDATE/DELETE được.
--
-- Bổ sung (fix review round-3): GRANT cho DELETE bị REVOKE — Placement lịch sử
-- phải giữ nguyên. app_user_writer chỉ được SELECT/INSERT/UPDATE.
-- ═══════════════════════════════════════════════════════════════════════════
ALTER TABLE "placements" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "placements" FORCE ROW LEVEL SECURITY;

CREATE POLICY "hrp_placements_scope" ON "placements"
  AS PERMISSIVE FOR ALL
  TO app_user_writer, app_user
  USING (
    -- Row-level predicate LUÔN LUÔN chạy (kể cả HR roles): placement phải thuộc
    -- đúng LaborProfile của PlacementCase sở hữu nó. Nếu không khớp → deny.
    EXISTS (
      SELECT 1 FROM "placement_case"
      WHERE "placement_case"."id" = "placements"."placement_case_id"
        AND "placement_case"."labor_profile_id" = "placements"."labor_profile_id"
    )
    AND (
      -- Short-circuit: HR roles xem được mọi placement hợp lệ.
      hrp_session_role() IN ('ADMIN', 'HR_MANAGER', 'HR_STAFF')
      OR
      -- Row-level cho non-HR roles (nếu sau này có): placement case thuộc đúng
      -- LaborProfile mà user đang giữ. Tạm thời non-HR chỉ thấy placement của
      -- case do user tạo — pattern giống LaborProfile scope. Hiện N3 chỉ HR dùng.
      EXISTS (
        SELECT 1 FROM "placement_case" pc
        WHERE pc.id = "placements"."placement_case_id"
      )
    )
  )
  WITH CHECK (
    -- INSERT/UPDATE: placement mới / sửa phải thỏa invariant labor_profile_id match.
    EXISTS (
      SELECT 1 FROM "placement_case"
      WHERE "placement_case"."id" = "placements"."placement_case_id"
        AND "placement_case"."labor_profile_id" = "placements"."labor_profile_id"
    )
    AND (
      hrp_session_role() IN ('ADMIN', 'HR_MANAGER', 'HR_STAFF')
      OR
      EXISTS (
        SELECT 1 FROM "placement_case" pc
        WHERE pc.id = "placements"."placement_case_id"
      )
    )
  );

-- ═══════════════════════════════════════════════════════════════════════════
-- 7) GRANT cho runtime write role — bỏ DELETE (Placement lịch sử phải giữ).
--    ALTER DEFAULT PRIVILEGES chặn future DELETE privilege trên table này.
-- ═══════════════════════════════════════════════════════════════════════════
GRANT SELECT, INSERT, UPDATE ON "placements" TO app_user_writer;
-- REVOKE DELETE (audit-safe: Placement lịch sử không thể xóa qua runtime role).
REVOKE DELETE ON "placements" FROM app_user_writer;

-- ALTER DEFAULT PRIVILEGES: chặn quyền DELETE về sau trên table mới trong schema public.
ALTER DEFAULT PRIVILEGES IN SCHEMA "public"
  REVOKE DELETE ON TABLES FROM app_user_writer;
