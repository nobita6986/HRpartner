-- ============================================================================
-- Migration: 20261022150000_project_shifts_attendance
-- Purpose:   Project shift definitions (`project_shifts`) and default shift
--            binding on `project_assignments.shift_code` for shift-based
--            attendance calculation across projects.
-- ============================================================================

CREATE TABLE IF NOT EXISTS "project_shifts" (
  "id" TEXT NOT NULL,
  "project_id" TEXT NOT NULL,
  "code" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "start_time" TEXT NOT NULL,
  "end_time" TEXT NOT NULL,
  "is_overnight" BOOLEAN NOT NULL DEFAULT false,
  "break_minutes" INTEGER NOT NULL DEFAULT 60,
  "standard_hours" DECIMAL(4,2) NOT NULL DEFAULT 8.00,
  "grace_late_minutes" INTEGER NOT NULL DEFAULT 15,
  "grace_early_minutes" INTEGER NOT NULL DEFAULT 15,
  "is_active" BOOLEAN NOT NULL DEFAULT true,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "project_shifts_pkey" PRIMARY KEY ("id")
);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'project_shifts_project_id_fkey'
      AND conrelid = 'project_shifts'::regclass
  ) THEN
    ALTER TABLE "project_shifts"
      ADD CONSTRAINT "project_shifts_project_id_fkey"
      FOREIGN KEY ("project_id") REFERENCES "outsourcing_projects"("id")
      ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'project_shifts_project_id_code_key'
      AND conrelid = 'project_shifts'::regclass
  ) THEN
    ALTER TABLE "project_shifts"
      ADD CONSTRAINT "project_shifts_project_id_code_key"
      UNIQUE ("project_id", "code");
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS "project_shifts_project_id_is_active_idx"
  ON "project_shifts"("project_id", "is_active");

ALTER TABLE "project_assignments"
  ADD COLUMN IF NOT EXISTS "shift_code" TEXT;

-- Enable & Force RLS on project_shifts (child of outsourcing_projects)
ALTER TABLE "project_shifts" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "project_shifts" FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "hrp_project_shift_scope" ON "project_shifts";
CREATE POLICY "hrp_project_shift_scope" ON "project_shifts"
  AS PERMISSIVE FOR ALL
  TO app_user_writer, app_user
  USING (
    hrp_session_role() IN ('ADMIN', 'HR_MANAGER', 'HR_STAFF', 'ACCOUNTANT', 'DIRECTOR')
    OR hrp_project_visible_for("project_id")
  )
  WITH CHECK (
    hrp_project_writable("project_id")
    OR (hrp_session_role() = 'PM' AND hrp_project_visible_for("project_id"))
  );

GRANT SELECT, INSERT, UPDATE, DELETE ON "project_shifts" TO app_user_writer, app_user;

-- Final assertion
DO $$
DECLARE
  v_table int;
  v_fk int;
  v_uniq int;
  v_force boolean;
  v_col int;
BEGIN
  SELECT count(*) INTO v_table
  FROM information_schema.tables
  WHERE table_schema = current_schema() AND table_name = 'project_shifts';
  IF v_table <> 1 THEN
    RAISE EXCEPTION 'project_shifts table missing';
  END IF;

  SELECT count(*) INTO v_fk
  FROM pg_constraint
  WHERE conname = 'project_shifts_project_id_fkey'
    AND conrelid = 'project_shifts'::regclass
    AND contype = 'f';
  IF v_fk <> 1 THEN
    RAISE EXCEPTION 'project_shifts_project_id_fkey missing';
  END IF;

  SELECT count(*) INTO v_uniq
  FROM pg_constraint
  WHERE conname = 'project_shifts_project_id_code_key'
    AND conrelid = 'project_shifts'::regclass
    AND contype = 'u';
  IF v_uniq <> 1 THEN
    RAISE EXCEPTION 'project_shifts_project_id_code_key missing';
  END IF;

  SELECT c.relrowsecurity AND c.relforcerowsecurity INTO v_force
  FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
  WHERE n.nspname = current_schema() AND c.relname = 'project_shifts';
  IF v_force IS DISTINCT FROM true THEN
    RAISE EXCEPTION 'project_shifts must have ENABLE and FORCE ROW LEVEL SECURITY';
  END IF;

  SELECT count(*) INTO v_col
  FROM information_schema.columns
  WHERE table_schema = current_schema()
    AND table_name = 'project_assignments'
    AND column_name = 'shift_code';
  IF v_col <> 1 THEN
    RAISE EXCEPTION 'project_assignments.shift_code missing';
  END IF;
END $$;
