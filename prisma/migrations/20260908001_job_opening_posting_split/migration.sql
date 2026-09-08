-- Created by Tier 2 Engineer for hrp-v6-p1-job-opening-posting-split
-- Migration: 20260908001_job_opening_posting_split
-- Date: 2026-09-08
-- Scope: ADD JobOpening + JobPosting models; ADD jobOpeningId to StaffingOrderSlot
-- ADD-ONLY: no DROP statements

-- Create job_openings table
CREATE TABLE "job_openings" (
    "id" TEXT NOT NULL,
    "staffing_order_id" TEXT NOT NULL,
    "staffing_order_slot_id" TEXT,
    "status" TEXT NOT NULL DEFAULT E'DRAFT',
    "opened_at" TIMESTAMP(3),
    "closed_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL
);

COMMENT ON TABLE "job_openings" IS E'JobOpening: nhu cau tuyen noi bo (loai vi tri can N nguoi)';

-- Create job_postings table
CREATE TABLE "job_postings" (
    "id" TEXT NOT NULL,
    "job_opening_id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "revision" INTEGER NOT NULL DEFAULT 1,
    "status" TEXT NOT NULL DEFAULT E'DRAFT',
    "published_at" TIMESTAMP(3),
    "archived_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL
);

COMMENT ON TABLE "job_postings" IS E'JobPosting: hinh chieu cong khai cua dung MOT JobOpening';

-- Add job_opening_id column to staffing_order_slots
ALTER TABLE "staffing_order_slots" ADD COLUMN "job_opening_id" TEXT;

-- Create primary keys
ALTER TABLE "job_openings" ADD CONSTRAINT "job_openings_pkey" PRIMARY KEY ("id");
ALTER TABLE "job_postings" ADD CONSTRAINT "job_postings_pkey" PRIMARY KEY ("id");

-- Add foreign keys
ALTER TABLE "job_openings" ADD CONSTRAINT "job_openings_staffing_order_id_fkey"
    FOREIGN KEY ("staffing_order_id") REFERENCES "staffing_orders"("id")
    ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "job_openings" ADD CONSTRAINT "job_openings_staffing_order_slot_id_fkey"
    FOREIGN KEY ("staffing_order_slot_id") REFERENCES "staffing_order_slots"("id")
    ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "job_postings" ADD CONSTRAINT "job_postings_job_opening_id_fkey"
    FOREIGN KEY ("job_opening_id") REFERENCES "job_openings"("id")
    ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "staffing_order_slots" ADD CONSTRAINT "staffing_order_slots_job_opening_id_fkey"
    FOREIGN KEY ("job_opening_id") REFERENCES "job_openings"("id")
    ON DELETE SET NULL ON UPDATE CASCADE;

-- Create indexes
CREATE UNIQUE INDEX "job_postings_job_opening_id_key" ON "job_postings"("job_opening_id");
CREATE INDEX "job_openings_staffing_order_id_idx" ON "job_openings"("staffing_order_id");
CREATE INDEX "job_openings_staffing_order_slot_id_idx" ON "job_openings"("staffing_order_slot_id");
CREATE INDEX "staffing_order_slots_job_opening_id_idx" ON "staffing_order_slots"("job_opening_id");

-- ═══════════════════════════════════════════════════════════════════════════
-- RLS for job_openings — scope qua staffing_orders.project_id (họ staffing)
-- ═══════════════════════════════════════════════════════════════════════════
ALTER TABLE "job_openings" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "job_openings" FORCE ROW LEVEL SECURITY FOR ROLE "app_user_writer";

CREATE POLICY "job_openings_select" ON "job_openings" FOR SELECT
  USING (hrp_project_visible_for(
    (SELECT "project_id" FROM "staffing_orders" WHERE "id" = "staffing_order_id")
  ));

CREATE POLICY "job_openings_insert" ON "job_openings" FOR INSERT
  WITH CHECK (hrp_project_writable(
    (SELECT "project_id" FROM "staffing_orders" WHERE "id" = "staffing_order_id")
  ));

CREATE POLICY "job_openings_update" ON "job_openings" FOR UPDATE
  USING (hrp_project_writable(
    (SELECT "project_id" FROM "staffing_orders" WHERE "id" = "staffing_order_id")
  ));

CREATE POLICY "job_openings_delete" ON "job_openings" FOR DELETE
  USING (hrp_project_writable(
    (SELECT "project_id" FROM "staffing_orders" WHERE "id" = "staffing_order_id")
  ));

GRANT SELECT, INSERT, UPDATE, DELETE ON "job_openings" TO app_user_writer;

-- ═══════════════════════════════════════════════════════════════════════════
-- RLS for job_postings — scope qua job_openings → staffing_orders.project_id
-- ═══════════════════════════════════════════════════════════════════════════
ALTER TABLE "job_postings" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "job_postings" FORCE ROW LEVEL SECURITY FOR ROLE "app_user_writer";

CREATE POLICY "job_postings_select" ON "job_postings" FOR SELECT
  USING (hrp_project_visible_for(
    (SELECT "project_id" FROM "staffing_orders" WHERE "id" =
      (SELECT "staffing_order_id" FROM "job_openings" WHERE "id" = "job_opening_id"))
  ));

CREATE POLICY "job_postings_insert" ON "job_postings" FOR INSERT
  WITH CHECK (hrp_project_writable(
    (SELECT "project_id" FROM "staffing_orders" WHERE "id" =
      (SELECT "staffing_order_id" FROM "job_openings" WHERE "id" = "job_opening_id"))
  ));

CREATE POLICY "job_postings_update" ON "job_postings" FOR UPDATE
  USING (hrp_project_writable(
    (SELECT "project_id" FROM "staffing_orders" WHERE "id" =
      (SELECT "staffing_order_id" FROM "job_openings" WHERE "id" = "job_opening_id"))
  ));

CREATE POLICY "job_postings_delete" ON "job_postings" FOR DELETE
  USING (hrp_project_writable(
    (SELECT "project_id" FROM "staffing_orders" WHERE "id" =
      (SELECT "staffing_order_id" FROM "job_openings" WHERE "id" = "job_opening_id"))
  ));

GRANT SELECT, INSERT, UPDATE, DELETE ON "job_postings" TO app_user_writer;
